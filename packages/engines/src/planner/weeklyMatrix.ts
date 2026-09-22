import { SubjectId, Chapter } from '../types/index';
import { getLocalDateKey } from './PlannerEngine';

export interface WeeklyBlock {
  id: string;
  dayIndex: number;
  dayName: string;
  timeSlot: string;
  subject: SubjectId | 'break' | 'revision';
  chapterId: string;
  chapterName: string;
  unit: string;
  activity: string;
  taskType: 'Watch Lecture' | 'Solve DPP' | 'Solve PYQs' | 'Revise Formulas' | 'Review Mistakes' | 'Break';
  durationMinutes: number;
  completed: boolean;
  priorityScore: number;
  reasoning: {
    whySelected: string;
    dependentChapters: string[];
    rankingRationale: string;
    longTermImpact: string;
    postponeRisk: string;
    targetAccuracy: string;
  };
  isManualOverride?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
}

export const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function generateWeeklyMatrix(
  splitStrategy: '1_a_day_alternating' | '2_a_day_alternating' | '3_a_day',
  chapters: Chapter[] = [],
  todayMissions: any[] | null = null,
  plannerWeekly: any[] | null = null,
  currentDayIndex: number = 0,
  twoDaySplitConfig?: [SubjectId[], SubjectId[], SubjectId[]],
  deletedMissionIds: string[] = [],
  scheduleOverrides: Record<string, { dayIndex?: number; timeSlot?: string; scheduledDate?: string; scheduledTime?: string }> = {},
  dayStartTime: string = "07:00",
  dayEndTime: string = "22:30",
  settings?: any
): WeeklyBlock[] {
  // Format morning slot dynamically based on dayStartTime
  const formatMorningSlot = (startTime: string = "07:00"): string => {
    const parts = startTime.split(':');
    const h = parseInt(parts[0], 10) || 7;
    const m = parseInt(parts[1], 10) || 0;
    const totalMins = h * 60 + m;
    const endTotalMins = totalMins + 150;
    const endH = Math.floor((endTotalMins % 1440) / 60);
    const endM = endTotalMins % 60;
    const sStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    const eStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    return `Morning (${sStr} - ${eStr})`;
  };

  // Dynamic break duration based on preceding session length
  const getBreakDuration = (sessionDurationMins: number): number => {
    if (sessionDurationMins <= 30) return 5;
    if (sessionDurationMins <= 60) return 10;
    if (sessionDurationMins <= 90) return 15;
    return 20;
  };

  // Only schedule chapters the user has explicitly started and that are NOT on hold.
  // NEVER auto-schedule unstarted chapters.
  const activeChaps = chapters.filter(c => 
    !c.chapterOnHold && 
    ((c.currentLecture && c.currentLecture > 0) || 
     c.theoryComplete || c.dppComplete || 
     (c.solvedQuestions && c.solvedQuestions > 0)) &&
    c.completion < 100
  );

  const getUniqueChap = (subj: SubjectId, offset: number): Chapter | null => {
    const subjActive = activeChaps.filter(c => c.subject === subj);
    if (subjActive.length > offset) return subjActive[offset];
    if (subjActive.length > 0) return subjActive[offset % subjActive.length];
    // No active in-progress non-on-hold chapter for this subject — schedule nothing.
    return null;
  };

  let blocks: WeeklyBlock[] = [];
  let idCounter = 1;

  daysOfWeek.forEach((dayName, dayIndex) => {
    const isToday = dayIndex === currentDayIndex;

    if (isToday && todayMissions && todayMissions.length > 0) {
      const todayDateObj = new Date();
      todayDateObj.setHours(0,0,0,0);
      const todayDateStr = getLocalDateKey(todayDateObj);

      const parseTimeVal = (val: string | undefined, fallback: number) => {
        const p = parseInt(val || '', 10);
        return isNaN(p) ? fallback : p;
      };

      const dayStartHour = parseTimeVal(dayStartTime.split(':')[0], 7);
      const dayStartMin = parseTimeVal(dayStartTime.split(':')[1], 0);
      const dayStartMins = dayStartHour * 60 + dayStartMin;

      const getTimeMins = (tStr: string) => {
        const parts = (tStr || '').split(':');
        let h = parseTimeVal(parts[0], 23);
        const m = parseTimeVal(parts[1], 0);
        if (h < dayStartHour) h += 24;
        return h * 60 + m;
      };

      let effectiveEndTime = dayEndTime;
      if (settings?.sessionExtensionDate === todayDateStr && settings?.sessionExtensionEnd) {
        const extEnd = settings.sessionExtensionEnd;
        if (getTimeMins(extEnd) > getTimeMins(dayEndTime)) {
          effectiveEndTime = extEnd;
        }
      }

      const now = new Date();
      let logicalRealCurrentHour = now.getHours();
      if (logicalRealCurrentHour < dayStartHour) {
        logicalRealCurrentHour += 24;
      }
      const realNowMins = logicalRealCurrentHour * 60 + now.getMinutes();

      // Start today's uncompleted schedule from whichever is later: normal day start or current real time
      const effectiveStartMins = Math.max(dayStartMins, realNowMins);
      let currentHour = Math.floor((effectiveStartMins % 1440) / 60);
      let currentMinute = effectiveStartMins % 60;

      let endMinsTotal = getTimeMins(effectiveEndTime);

      let pushToTomorrow = false;
      let forcePushToTomorrow = realNowMins > endMinsTotal;

      // Filter out auto-generated breaks from incoming todayMissions.
      // Auto-breaks are dynamically regenerated and interleaved between study blocks below.
      // Explicit manual breaks (user-scheduled custom breaks) are preserved.
      const candidateMissions = todayMissions.filter(m => 
        !(m.subject === 'break' && (m.id.startsWith('break-') || m.id.startsWith('today-break-')) && !m.isManualOverride)
      );

      // Sort todayMissions to enforce sequential lecture order within the same chapter.
      // Uses a strictly transitive total comparator so V8 Timsort never scrambles lectures or breaks.
      const getLecNum = (name: string): number => {
        const match = (name || '').match(/Lecture\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
      };
      const sortedTodayMissions = [...candidateMissions].sort((a, b) => {
        // 1. Completed tasks stay first (preserve their actual completed time slots)
        if (a.completed !== b.completed) return a.completed ? -1 : 1;
        // 2. Dismissed tasks stay last
        if (a.dismissed !== b.dismissed) return a.dismissed ? 1 : -1;

        // 3. For same-chapter lecture tasks, strictly sort by lecture number ascending
        // (Academic integrity: Lecture 8 must ALWAYS precede Lecture 10, regardless of any manual override)
        const sameChapter = (a.chapter || '').toLowerCase() === (b.chapter || '').toLowerCase();
        const aIsLec = (a.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(a.taskName || ''));
        const bIsLec = (b.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(b.taskName || ''));
        if (sameChapter && aIsLec && bIsLec) {
          const diff = getLecNum(a.taskName) - getLecNum(b.taskName);
          if (diff !== 0) return diff;
        }

        // 4. Manual overrides with explicit timeSlots keep their position (between different chapters)
        if (a.isManualOverride && !b.isManualOverride) return -1;
        if (!a.isManualOverride && b.isManualOverride) return 1;

        // 5. If timeSlot is present on both, sort chronologically
        const getSlotMins = (slot: string | undefined): number => {
          if (!slot) return 9999;
          const match = slot.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);
          if (!match) return 9999;
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const meridiem = match[3]?.toLowerCase();
          if (meridiem === 'pm' && h < 12) h += 12;
          if (meridiem === 'am' && h === 12) h = 0;
          if (h < dayStartHour) h += 24;
          return h * 60 + m;
        };
        const minA = getSlotMins(a.timeSlot);
        const minB = getSlotMins(b.timeSlot);
        if (minA !== minB) return minA - minB;

        // 6. Priority score descending
        const prioDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
        if (prioDiff !== 0) return prioDiff;

        // 7. Stable tie-breaker by ID
        return (a.id || '').localeCompare(b.id || '');
      });

      const maxDailyStudyMins = settings?.effectiveDailyStudyHours !== undefined
        ? Math.round(settings.effectiveDailyStudyHours * 60)
        : (settings?.energyLevel === 'Low' ? 120 : settings?.energyLevel === 'High' ? 360 : 240);
      let accumulatedTodayStudyMins = 0;

      sortedTodayMissions.forEach((m) => {
        const chap = chapters.find(c => c.name.toLowerCase() === (m.chapter || '').toLowerCase());
        
        let pendingBreakBlock: any = null;
        let timeSlot = m.timeSlot;
        let duration = m.duration || 60;
        let isManualOverride = m.isManualOverride;

        // Strip timeSlot if pushed from yesterday
        if (!m.completed && m.scheduledDate && m.scheduledDate < todayDateStr) {
          timeSlot = null;
          isManualOverride = false;
        }

        // Force cascade for uncompleted, non-manual missions to prevent stale time slot clashes
        if (!m.completed && !isManualOverride) {
          timeSlot = null;
        }
        
        if (!timeSlot || timeSlot.includes('Morning') || timeSlot.includes('Afternoon') || timeSlot.includes('Evening') || timeSlot.includes('Night')) {
          let logicalCurrentHour = currentHour;
          if (logicalCurrentHour < (parseInt(dayStartTime.split(':')[0]) || 7)) {
            logicalCurrentHour += 24;
          }
          let startMins = logicalCurrentHour * 60 + currentMinute;
          let newEndMins = startMins + duration;

          const exceedsDailyBudget = !m.completed && !isManualOverride && (accumulatedTodayStudyMins + duration > maxDailyStudyMins) && accumulatedTodayStudyMins > 0;

          if (newEndMins > endMinsTotal || forcePushToTomorrow || exceedsDailyBudget) {
            pushToTomorrow = true;
            forcePushToTomorrow = false;
            // Next day starts at dayStartTime
            currentHour = parseInt(dayStartTime.split(':')[0]) || 7;
            currentMinute = parseInt(dayStartTime.split(':')[1]) || 0;
            startMins = currentHour * 60 + currentMinute;
            newEndMins = startMins + duration;
          } else if (!pushToTomorrow) {
            accumulatedTodayStudyMins += duration;
          }

          const startStr = `${(currentHour % 24).toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          
          currentMinute += duration;
          while (currentMinute >= 60) {
            currentHour += 1;
            currentMinute -= 60;
          }
          const endStr = `${(currentHour % 24).toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          timeSlot = `${startStr} - ${endStr}`;
          
          const hasExistingBreak = candidateMissions.some(tm => tm.id === `break-${m.id}` || tm.id === `today-break-${m.id}`);

          if (m.subject !== 'break' && !hasExistingBreak) {
            const breakStartStr = `${(currentHour % 24).toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
            const breakDuration = getBreakDuration(duration);
            currentMinute += breakDuration;
            let tempHour = currentHour;
            let tempMinute = currentMinute;
            while (tempMinute >= 60) {
              tempHour += 1;
              tempMinute -= 60;
            }
            const breakEndStr = `${(tempHour % 24).toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}`;
            
            const isPushedBreak = pushToTomorrow && !m.completed && !isManualOverride;
            pendingBreakBlock = {
              id: `today-break-${m.id}`,
              dayIndex: isPushedBreak ? (dayIndex + 1) % 7 : dayIndex,
              dayName: isPushedBreak ? daysOfWeek[(dayIndex + 1) % 7] : dayName,
              timeSlot: `${breakStartStr} - ${breakEndStr}`,
              subject: 'break',
              chapterId: m.chapterId || 'break',
              chapterName: m.chapter || m.chapterName || 'Recharge',
              unit: 'Break',
              activity: `${breakDuration}m Break`,
              taskType: 'Break' as any,
              durationMinutes: breakDuration,
              completed: false,
              priorityScore: 0,
              parentTaskId: m.id,
              reasoning: {
                whySelected: 'Pacing out your study blocks reduces cognitive fatigue and maximizes retention.',
                dependentChapters: [],
                rankingRationale: 'Scheduled rest interval.',
                longTermImpact: 'Maintains stamina over long sessions.',
                postponeRisk: 'Burnout risk increases.',
                targetAccuracy: 'N/A'
              }
            };

            currentHour = tempHour;
            currentMinute = tempMinute;
          }
        } else {
          // Time slot was preserved. We MUST update currentHour and currentMinute to the end of this slot
          // so that subsequent tasks don't get scheduled on top of it (causing clashes).
          const match = timeSlot.match(/[-–]\s*(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);
          if (match) {
            let h = parseInt(match[1], 10);
            const parsedMin = parseInt(match[2], 10);
            const ampm = match[3];
            if (ampm) {
              const isPM = ampm.toLowerCase() === 'pm';
              if (isPM && h !== 12) h += 12;
              if (!isPM && h === 12) h = 0;
            }
            
            currentHour = h;
            currentMinute = parsedMin;
            
            // Note: If the parsed time was after midnight (e.g. 00:37), currentHour becomes 0.
            // Our logical tracking above (logicalCurrentHour) will handle the +24 adjustment cleanly.
            
            // Also add a 15-minute break offset logically, so the next un-timeslotted task starts after a break
            if (m.subject !== 'break') {
              const breakStartStr = `${(currentHour % 24).toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
              
              const breakDuration = getBreakDuration(duration);
              currentMinute += breakDuration;
              let tempHour = currentHour;
              let tempMinute = currentMinute;
              while (tempMinute >= 60) {
                tempHour += 1;
                tempMinute -= 60;
              }
              const breakEndStr = `${(tempHour % 24).toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}`;
              
              const hasExistingBreak = candidateMissions.some(tm => tm.id === `break-${m.id}` || tm.id === `today-break-${m.id}`);
              
              if (!hasExistingBreak) {
                pendingBreakBlock = {
                  id: `today-break-${m.id}`,
                  dayIndex: dayIndex,
                  dayName: dayName,
                  timeSlot: `${breakStartStr} - ${breakEndStr}`,
                  subject: 'break',
                  chapterId: m.chapterId || 'break',
                  chapterName: m.chapter || m.chapterName || 'Recharge',
                  unit: 'Break',
                  activity: `${breakDuration}m Break`,
                  taskType: 'Break' as any,
                  durationMinutes: breakDuration,
                  completed: false,
                  priorityScore: 0,
                  parentTaskId: m.id,
                  reasoning: {
                    whySelected: 'Pacing out your study blocks reduces cognitive fatigue and maximizes retention.',
                    dependentChapters: [],
                    rankingRationale: 'Scheduled rest interval.',
                    longTermImpact: 'Maintains stamina over long sessions.',
                    postponeRisk: 'Burnout risk increases.',
                    targetAccuracy: 'N/A'
                  }
                };
              }
              
              currentHour = tempHour;
              currentMinute = tempMinute;
            }
          }
        }

        const isPushed = pushToTomorrow && !m.completed && !isManualOverride;

        blocks.push({
          id: `today-${m.id}`,
          dayIndex: isPushed ? (dayIndex + 1) % 7 : dayIndex,
          dayName: isPushed ? daysOfWeek[(dayIndex + 1) % 7] : dayName,
          timeSlot: timeSlot,
          subject: m.subject || 'physics',
          chapterId: chap?.id || 'p1',
          chapterName: m.chapter || m.taskName,
          unit: chap?.unit || 'Core Module',
          activity: m.taskName,
          taskType: (m.type as any) || 'Solve PYQs',
          durationMinutes: duration,
          completed: m.completed,
          priorityScore: m.priorityScore || 94,
          reasoning: {
            whySelected: m.reasoning?.whySelected || m.whyThisTaskExists || `High leverage task prioritized by PlannerEngine.`,
            dependentChapters: m.futureDependencies || [],
            rankingRationale: m.reasoning?.rankingRationale || `Ranked Tier 1 Priority by PlannerScoringEngine.`,
            longTermImpact: m.expectedJeeImpact || `+${m.expectedMarksGain || 8} Marks in JEE Main`,
            postponeRisk: m.reasoning?.postponeRisk || `Delaying shifts target completion velocity.`,
            targetAccuracy: `${m.confidenceGainPercent || 85}% Target Benchmark`
          }
        });

        if (pendingBreakBlock) {
          blocks.push(pendingBreakBlock);
        }
      });
    } else if (plannerWeekly && plannerWeekly[dayIndex] && plannerWeekly[dayIndex].length > 0) {
      // When tasks are pushed from prior day, preserve tomorrow's lookahead schedule without visual clashing or duplicates
      const existingBlocksForDay = blocks.filter(b => b.dayIndex === dayIndex);
      const existingNonBreakCount = existingBlocksForDay.filter(b => (b.taskType as any) !== 'Break').length;
      const standardSlots = [
        formatMorningSlot(dayStartTime),
        'Afternoon (14:00 - 16:00)',
        'Evening (17:30 - 19:30)',
        'Night (21:30 - 22:30)'
      ];
      
      plannerWeekly[dayIndex].forEach((t: any, tIdx: number) => {
        // Skip duplicate tasks if identical chapter and activity were already pushed into this day
        const isDuplicate = existingBlocksForDay.some(b => 
          b.chapterId === t.chapterId && (b.activity === t.taskName || b.activity === t.name)
        );
        if (isDuplicate) return;

        const chap = chapters.find(c => c.id === t.chapterId);
        const stableKey = `${t.chapterId}-${t.taskName.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const slotIdx = Math.min(tIdx + existingNonBreakCount, standardSlots.length - 1);

        blocks.push({
          id: `plan-${dayIndex}-${stableKey}`,
          dayIndex,
          dayName,
          timeSlot: standardSlots[slotIdx],
          subject: (t.subject?.toLowerCase() || 'physics') as SubjectId,
          chapterId: t.chapterId || 'p1',
          chapterName: t.chapterName || chap?.name || t.name,
          unit: chap?.unit || 'Core Module',
          activity: t.taskName || t.name,
          taskType: (t.type as any) || 'Solve DPP',
          durationMinutes: t.duration || 60,
          completed: dayIndex < currentDayIndex,
          priorityScore: t.priorityScore || 85,
          reasoning: {
            whySelected: t.reasoning?.whySelected || `Lookahead session scheduled for ${dayName}.`,
            dependentChapters: t.futureDependencies || [],
            rankingRationale: t.reasoning?.rankingRationale || `Sequenced according to weekly learning matrix.`,
            longTermImpact: t.expectedJeeImpact || `+6 Marks in JEE Main`,
            postponeRisk: t.reasoning?.postponeRisk || `Shifts study cadence for this chapter.`,
            targetAccuracy: `80% Target Benchmark`
          }
        });
      });
    } else {
      // In live plan mode (todayMissions is active), future days without plannerWeekly tasks
      // must not fabricate dummy unstarted missions.
      if (todayMissions && todayMissions.length > 0) {
        return;
      }

      // Procedural generation fallback
      const physChap = getUniqueChap('physics', Math.floor(dayIndex / 2));
      const chemChap = getUniqueChap('chemistry', Math.floor(dayIndex / 2));
      const mathChap = getUniqueChap('maths', Math.floor(dayIndex / 2));

      if (splitStrategy === '1_a_day_alternating') {
        const targetSubj: SubjectId = dayIndex % 3 === 0 ? 'physics' : dayIndex % 3 === 1 ? 'chemistry' : 'maths';
        const chap = targetSubj === 'physics' ? physChap : targetSubj === 'chemistry' ? chemChap : mathChap;
        const subjName = targetSubj.charAt(0).toUpperCase() + targetSubj.slice(1);

        if (chap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: formatMorningSlot(dayStartTime),
            subject: targetSubj,
            chapterId: chap.id,
            chapterName: chap.name,
            unit: chap.unit || 'Core Module',
            activity: `Deep-Dive Theory & Core Concept Mastery in ${chap.name}`,
            taskType: 'Watch Lecture',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 95 - dayIndex,
            reasoning: {
              whySelected: `1-Subject Focus day dedicated to intensive concept mastery in ${chap.name}.`,
              dependentChapters: [`Advanced Problem Solving in ${chap.name}`],
              rankingRationale: `Single-subject immersion maximizes cognitive focus and depth of understanding.`,
              longTermImpact: `Mastery of this core high-weightage chapter yields +8 Marks in JEE Main.`,
              postponeRisk: `Delaying will disrupt the structured single-subject alternating rhythm.`,
              targetAccuracy: `85% Conceptual Accuracy`
            }
          });

          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Afternoon (14:00 - 16:00)',
            subject: targetSubj,
            chapterId: chap.id,
            chapterName: chap.name,
            unit: chap.unit || 'Core Module',
            activity: `Solve 20 DPP Problems in ${chap.name}`,
            taskType: 'Solve DPP',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 91 - dayIndex,
            reasoning: {
              whySelected: `Same-day application drill to solidify theoretical concepts learned in the morning.`,
              dependentChapters: [`PYQ Solving for ${chap.name}`],
              rankingRationale: `Applying concepts immediately after theory locks in synaptic pathways.`,
              longTermImpact: `Builds numerical problem-solving confidence and speed for ${chap.name}.`,
              postponeRisk: `Concept retention decays significantly if practice is separated from theory.`,
              targetAccuracy: `80% Problem Solving Accuracy`
            }
          });

          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Evening (17:30 - 19:30)',
            subject: targetSubj,
            chapterId: chap.id,
            chapterName: chap.name,
            unit: chap.unit || 'Core Module',
            activity: `Solve 15 Past JEE Main PYQs (2020-2024) in ${chap.name}`,
            taskType: 'Solve PYQs',
            durationMinutes: 75,
            completed: dayIndex < currentDayIndex,
            priorityScore: 88 - dayIndex,
            reasoning: {
              whySelected: `Authentic exam calibration: Testing ${chap.name} concepts against actual JEE questions.`,
              dependentChapters: [`Full Syllabus Mocks`],
              rankingRationale: `Direct past paper practice provides the highest correlation with final exam score.`,
              longTermImpact: `Familiarity with JEE question patterns directly eliminates exam surprises.`,
              postponeRisk: `Without PYQ practice, difficulty blind spots remain unaddressed.`,
              targetAccuracy: `75% Authentic Exam Accuracy`
            }
          });

          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Night (21:30 - 22:30)',
            subject: 'revision',
            chapterId: 'rev-all',
            chapterName: `${subjName} Formula Revision & Mistakes Review`,
            unit: 'Recall Engine',
            activity: `Review Formulas & Past Mistakes in ${subjName}`,
            taskType: 'Revise Formulas',
            durationMinutes: 45,
            completed: dayIndex < currentDayIndex,
            priorityScore: 82 - dayIndex,
            reasoning: {
              whySelected: `Night-time consolidation: Reviewing formulas and error logs right before sleep boosts memory consolidation.`,
              dependentChapters: [`All ${subjName} Chapters`],
              rankingRationale: `Active formula recall prevents standard memory decay.`,
              longTermImpact: `Ensures instant formula recall under exam time pressure.`,
              postponeRisk: `Unreviewed errors are likely to be repeated in subsequent problem sets.`,
              targetAccuracy: `95% Formula Recall`
            }
          });
        }
      } else if (splitStrategy === '2_a_day_alternating') {
        const twoDaySplit = normalizeTwoDaySplitConfig(twoDaySplitConfig);
        const dayPair = twoDaySplit[dayIndex % 3];
        const morningSubj = dayPair[0];
        const eveningSubj = dayPair[1];

        const morningChap = morningSubj === 'physics' ? physChap : morningSubj === 'chemistry' ? chemChap : mathChap;
        const eveningChap = eveningSubj === 'physics' ? physChap : eveningSubj === 'chemistry' ? chemChap : mathChap;

        if (morningChap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: formatMorningSlot(dayStartTime),
            subject: morningSubj,
            chapterId: morningChap.id,
            chapterName: morningChap.name,
            unit: morningChap.unit || 'Core Module',
            activity: `Watch 2 Lectures + Notes for ${morningChap.name}`,
            taskType: 'Watch Lecture',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 94 - dayIndex,
            reasoning: {
              whySelected: `High priority lecture session scheduled during morning peak focus window.`,
              dependentChapters: [`Advanced Problems in ${morningChap.name}`],
              rankingRationale: `Theory coverage prerequisite for subsequent problem-solving drills.`,
              longTermImpact: `Advances ${morningSubj} syllabus completion towards 100% readiness.`,
              postponeRisk: `Pushes entire ${morningSubj} module schedule back by one rotation cycle.`,
              targetAccuracy: `85% Conceptual Mastery`
            }
          });
        }

        if (eveningChap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Afternoon (14:00 - 16:00)',
            subject: eveningSubj,
            chapterId: eveningChap.id,
            chapterName: eveningChap.name,
            unit: eveningChap.unit || 'Core Module',
            activity: `Solve 15 DPP Problems in ${eveningChap.name}`,
            taskType: 'Solve DPP',
            durationMinutes: 75,
            completed: dayIndex < currentDayIndex,
            priorityScore: 90 - dayIndex,
            reasoning: {
              whySelected: `Same-day problem drill to solidify theory learned in ${eveningChap.name}.`,
              dependentChapters: [`PYQ Practice`],
              rankingRationale: `Immediate practice cements procedural problem-solving techniques.`,
              longTermImpact: `Boosts speed from 3.0 min/Q to 2.0 min/Q in ${eveningChap.name}.`,
              postponeRisk: `Retention drops by 40% if DPP practice is delayed beyond 24 hours.`,
              targetAccuracy: `80% Problem Solving Accuracy`
            }
          });
        }

        if (morningChap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Evening (17:30 - 19:30)',
            subject: morningSubj,
            chapterId: morningChap.id,
            chapterName: morningChap.name,
            unit: morningChap.unit || 'Core Module',
            activity: `Solve 20 Past JEE Main PYQs (2019-2024) in ${morningChap.name}`,
            taskType: 'Solve PYQs',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 92 - dayIndex,
            reasoning: {
              whySelected: `High-yield authentic exam problem practice for ${morningChap.name}.`,
              dependentChapters: [`Full Syllabus Mocks`],
              rankingRationale: `PYQs carry the highest statistical weight for predicting JEE Main score gains.`,
              longTermImpact: `Directly contributes to +8 Marks in ${morningSubj} during mock exams.`,
              postponeRisk: `Omitting PYQs leaves real exam question traps undetected.`,
              targetAccuracy: `85% PYQ Accuracy Target`
            }
          });
        }

        blocks.push({
          id: `wb-${idCounter++}`,
          dayIndex,
          dayName,
          timeSlot: 'Night (21:30 - 22:30)',
          subject: 'revision',
          chapterId: 'rev-all',
          chapterName: `Formula Revision & Mistakes Review (${eveningSubj})`,
          unit: 'Recall Engine',
          activity: `Review Formulas & Past Mistakes`,
          taskType: 'Review Mistakes',
          durationMinutes: 45,
          completed: dayIndex < currentDayIndex,
          priorityScore: 84 - dayIndex,
          reasoning: {
            whySelected: `Active recall drill targeting recent error patterns in ${eveningSubj}.`,
            dependentChapters: [`All ${eveningSubj} Chapters`],
            rankingRationale: `Targeted revision stops recurring error patterns in their tracks.`,
            longTermImpact: `Reduces negative marking in ${eveningSubj} by 60%.`,
            postponeRisk: `Unreviewed errors recur with 70% probability in next mock test.`,
            targetAccuracy: `90% Formula Recall`
          }
        });
      } else {
        // 3_a_day
        const morningSubj: SubjectId = dayIndex % 3 === 0 ? 'physics' : dayIndex % 3 === 1 ? 'chemistry' : 'maths';
        const morningChap = morningSubj === 'physics' ? physChap : morningSubj === 'chemistry' ? chemChap : mathChap;

        if (morningChap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: formatMorningSlot(dayStartTime),
            subject: morningSubj,
            chapterId: morningChap.id,
            chapterName: morningChap.name,
            unit: morningChap.unit || 'Mechanics',
            activity: `Watch 2 Lectures + Notes for ${morningChap.name}`,
            taskType: 'Watch Lecture',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 95 - dayIndex,
            reasoning: {
              whySelected: `Scheduled as prime morning deep-work block due to high cognitive demand of new theory.`,
              dependentChapters: [`Rotational Dynamics`, `Work Power Energy`],
              rankingRationale: `Fundamental prerequisite for solving advanced JEE Main numericals.`,
              longTermImpact: `Mastery of this chapter directly unlocks 12 Marks in Physics Paper 1.`,
              postponeRisk: `Delaying will cascade into delays for 3 downstream mechanics chapters.`,
              targetAccuracy: `85% Concept Check Accuracy`
            }
          });
        }

        const afternoonSubj: SubjectId = dayIndex % 3 === 0 ? 'chemistry' : dayIndex % 3 === 1 ? 'maths' : 'physics';
        const afternoonChap = afternoonSubj === 'chemistry' ? chemChap : afternoonSubj === 'maths' ? mathChap : physChap;

        if (afternoonChap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Afternoon (14:00 - 16:00)',
            subject: afternoonSubj,
            chapterId: afternoonChap.id,
            chapterName: afternoonChap.name,
            unit: afternoonChap.unit || 'Organic Chemistry',
            activity: `Solve 15 DPP Problems in ${afternoonChap.name}`,
            taskType: 'Solve DPP',
            durationMinutes: 75,
            completed: dayIndex < currentDayIndex,
            priorityScore: 89 - dayIndex,
            reasoning: {
              whySelected: `Timed problem-solving drill to reinforce theory learned in ${afternoonChap.name}.`,
              dependentChapters: [`Advanced ${afternoonChap.name} Problems`],
              rankingRationale: `Essential for converting theoretical understanding into numerical speed.`,
              longTermImpact: `Increases problem-solving velocity from 2.5 min/Q to 1.8 min/Q.`,
              postponeRisk: `Concept retention drops by 35% if DPP is delayed beyond 24 hours of lecture.`,
              targetAccuracy: `80% DPP Accuracy`
            }
          });
        }

        const eveningSubj: SubjectId = dayIndex % 3 === 0 ? 'maths' : dayIndex % 3 === 1 ? 'physics' : 'chemistry';
        const eveningChap = eveningSubj === 'maths' ? mathChap : eveningSubj === 'physics' ? physChap : chemChap;

        if (eveningChap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Evening (17:30 - 19:30)',
            subject: eveningSubj,
            chapterId: eveningChap.id,
            chapterName: eveningChap.name,
            unit: eveningChap.unit || 'Algebra',
            activity: `Solve 20 Past JEE Main PYQs (2019-2024)`,
            taskType: 'Solve PYQs',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 92 - dayIndex,
            reasoning: {
              whySelected: `High-yield authentic exam question practice for ${eveningChap.name}.`,
              dependentChapters: [`JEE Mock Test Performance`],
              rankingRationale: `PYQs carry the highest direct correlation with JEE Main score improvement.`,
              longTermImpact: `Directly contributes to +8 Marks in upcoming full-syllabus test.`,
              postponeRisk: `Unattempted PYQs leave exam question pattern traps undetected.`,
              targetAccuracy: `85% PYQ Accuracy Target`
            }
          });
        }

        blocks.push({
          id: `wb-${idCounter++}`,
          dayIndex,
          dayName,
          timeSlot: 'Night (21:30 - 22:30)',
          subject: 'revision',
          chapterId: 'rev-all',
          chapterName: 'Spaced Revision & Mistakes Review',
          unit: 'Recall Engine',
          activity: `Review 5 Mistakes Ledger Errors & Active Recall Cards`,
          taskType: 'Review Mistakes',
          durationMinutes: 45,
          completed: dayIndex < currentDayIndex,
          priorityScore: 85 - dayIndex,
          reasoning: {
            whySelected: `Active recall drill based on forgetting curve decay monitoring.`,
            dependentChapters: [`All Previously Studied Modules`],
            rankingRationale: `Prevents memory decay for chapters completed more than 7 days ago.`,
            longTermImpact: `Sustains retention score above 85% until exam day.`,
            postponeRisk: `Memory decay drops retention by 40% after 14 days without active recall.`,
            targetAccuracy: `90% Flashcard Recall`
          }
        });
      }
    }
  });

  // Apply deleted filters and schedule overrides
  blocks = blocks.filter(b => !deletedMissionIds.includes(b.id) && !deletedMissionIds.includes(b.id.replace('today-', '')));

  if (scheduleOverrides && Object.keys(scheduleOverrides).length > 0) {
    const todayDateObj = new Date();
    todayDateObj.setHours(0,0,0,0);
    const todayDateStr = getLocalDateKey(todayDateObj);

    blocks = blocks.map(b => {
      const override = scheduleOverrides[b.id] || scheduleOverrides[b.id.replace('today-', '')] || scheduleOverrides[b.id.replace('plan-', '')];
      
      // Ignore overrides from past dates for uncompleted blocks to allow auto-cascade
      if (override && override.scheduledDate && override.scheduledDate < todayDateStr && !b.completed) {
        return b;
      }

      if (override) {
        return {
          ...b,
          dayIndex: override.dayIndex !== undefined ? override.dayIndex : b.dayIndex,
          dayName: override.dayIndex !== undefined ? daysOfWeek[override.dayIndex] : b.dayName,
          timeSlot: override.timeSlot || b.timeSlot,
          scheduledDate: override.scheduledDate,
          scheduledTime: override.scheduledTime,
          isManualOverride: true
        };
      }
      return b;
    });
  }

  const extractLecNum = (name: string): number => {
    const match = (name || '').match(/Lecture\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  };

  const getEffectiveScore = (b: WeeklyBlock): number => {
    const isLec = b.taskType === 'Watch Lecture' || /Lecture\s+\d+/i.test(b.activity || '');
    if (isLec) return extractLecNum(b.activity);
    const isBreak = b.subject === 'break' || b.taskType === 'Break' || (b.activity || '').toLowerCase().includes('break');
    if (isBreak) {
      const pId = (b.id || '').replace(/^today-break-/, '').replace(/^break-after-/, '').replace(/^break-/, '');
      const parent = blocks.find(x => x.id === pId || x.id === `today-${pId}`);
      if (parent) {
        const pNum = extractLecNum(parent.activity);
        if (pNum !== Number.MAX_SAFE_INTEGER) return pNum + 0.5;
      }
    }
    return Number.MAX_SAFE_INTEGER;
  };

  const getBlockChapter = (b: WeeklyBlock): string => {
    const isBreak = b.subject === 'break' || b.taskType === 'Break' || (b.activity || '').toLowerCase().includes('break');
    if (isBreak) {
      const pId = (b.id || '').replace(/^today-break-/, '').replace(/^break-after-/, '').replace(/^break-/, '');
      const parent = blocks.find(x => x.id === pId || x.id === `today-${pId}`);
      if (parent && (parent.chapterName || (parent as any).chapter)) {
        return (parent.chapterName || (parent as any).chapter).toLowerCase();
      }
    }
    return (b.chapterName || (b as any).chapter || '').toLowerCase();
  };

  const getSlotMins = (slot: string | undefined): number => {
    if (!slot) return 9999;
    const match = slot.match(/(\d{1,2}):(\d{2})/);
    return match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : 9999;
  };

  blocks.sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    
    // Status rank for today: completed first
    if (a.completed !== b.completed) return a.completed ? -1 : 1;

    // Sequential same-chapter lecture + break order
    const chapA = getBlockChapter(a);
    const chapB = getBlockChapter(b);
    if (chapA && chapB && chapA === chapB && chapA !== 'recharge') {
      const scoreA = getEffectiveScore(a);
      const scoreB = getEffectiveScore(b);
      if (scoreA !== scoreB) return scoreA - scoreB;
    }

    const minA = getSlotMins(a.timeSlot);
    const minB = getSlotMins(b.timeSlot);
    if (minA !== minB) return minA - minB;

    return (a.id || '').localeCompare(b.id || '');
  });

  return blocks;
}

export function normalizeTwoDaySplitConfig(config?: any): [SubjectId[], SubjectId[], SubjectId[]] {
  const defaultTwoDayConfig: [SubjectId[], SubjectId[], SubjectId[]] = [
    ['physics', 'chemistry'],
    ['chemistry', 'maths'],
    ['maths', 'physics']
  ];
  if (!config) return defaultTwoDayConfig;
  const d0 = (Array.isArray(config[0]) ? config[0] : Array.isArray(config['0']) ? config['0'] : defaultTwoDayConfig[0]) as SubjectId[];
  const d1 = (Array.isArray(config[1]) ? config[1] : Array.isArray(config['1']) ? config['1'] : defaultTwoDayConfig[1]) as SubjectId[];
  const d2 = (Array.isArray(config[2]) ? config[2] : Array.isArray(config['2']) ? config['2'] : defaultTwoDayConfig[2]) as SubjectId[];
  return [d0, d1, d2];
}

export function getDayFocusPill(dayIdx: number, splitStrategy: string, twoDaySplitConfig?: any) {
  if (splitStrategy === '1_a_day_alternating') {
    return dayIdx % 3 === 0 ? 'PHYSICS ONLY' : dayIdx % 3 === 1 ? 'CHEMISTRY ONLY' : 'MATHS ONLY';
  } else if (splitStrategy === '2_a_day_alternating') {
    const config = normalizeTwoDaySplitConfig(twoDaySplitConfig);
    const pair = config[dayIdx % 3];
    const formatSubj = (s: SubjectId) => (s === 'physics' ? 'PHY' : s === 'chemistry' ? 'CHEM' : 'MATHS');
    return `${formatSubj(pair[0])} + ${formatSubj(pair[1])}`;
  } else {
    return 'ALL 3 SUBJS';
  }
}

export function getHeaderBadgeText(splitStrategy: string) {
  return splitStrategy === '1_a_day_alternating' 
    ? '1 Subject Focus' 
    : splitStrategy === '2_a_day_alternating' 
      ? '2 Subjects Alternating' 
      : '3 Subjects Daily';
}
