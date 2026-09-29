import { Chapter } from '../../types/index';
import { WeeklyBlock, daysOfWeek } from './weeklyTypes';
import { getLocalDateKey } from '../modules/candidateTaskGenerator';
import { getBreakDuration, parseTimeVal } from './timeSlotUtils';

export function scheduleTodayMissions(
  todayMissions: any[],
  dayIndex: number,
  dayName: string,
  chapters: Chapter[],
  dayStartTime: string = "07:00",
  dayEndTime: string = "22:30",
  settings?: any
): WeeklyBlock[] {
  const blocks: WeeklyBlock[] = [];
  const todayDateObj = new Date();
  todayDateObj.setHours(0, 0, 0, 0);
  const todayDateStr = getLocalDateKey(todayDateObj);

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

  const endMinsTotal = getTimeMins(effectiveEndTime);

  let pushToTomorrow = false;
  let forcePushToTomorrow = realNowMins > endMinsTotal;

  // Filter out auto-generated breaks from incoming todayMissions.
  const candidateMissions = todayMissions.filter(m => 
    !(m.subject === 'break' && (m.id.startsWith('break-') || m.id.startsWith('today-break-')) && !m.isManualOverride)
  );

  const getLecNum = (name: string): number => {
    const match = (name || '').match(/Lecture\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  };

  const sortedTodayMissions = [...candidateMissions].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    if (a.dismissed !== b.dismissed) return a.dismissed ? 1 : -1;

    const sameChapter = (a.chapter || '').toLowerCase() === (b.chapter || '').toLowerCase();
    const aIsLec = (a.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(a.taskName || ''));
    const bIsLec = (b.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(b.taskName || ''));
    if (sameChapter && aIsLec && bIsLec) {
      const diff = getLecNum(a.taskName) - getLecNum(b.taskName);
      if (diff !== 0) return diff;
    }

    if (a.isManualOverride && !b.isManualOverride) return -1;
    if (!a.isManualOverride && b.isManualOverride) return 1;

    const getSlotMinsInternal = (slot: string | undefined): number => {
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
    const minA = getSlotMinsInternal(a.timeSlot);
    const minB = getSlotMinsInternal(b.timeSlot);
    if (minA !== minB) return minA - minB;

    const prioDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
    if (prioDiff !== 0) return prioDiff;

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
    const duration = m.duration || 60;
    let isManualOverride = m.isManualOverride;

    if (!m.completed && m.scheduledDate && m.scheduledDate < todayDateStr) {
      timeSlot = null;
      isManualOverride = false;
    }

    if (!m.completed && !isManualOverride) {
      timeSlot = null;
    }
    
    if (!timeSlot || timeSlot.includes('Morning') || timeSlot.includes('Afternoon') || timeSlot.includes('Evening') || timeSlot.includes('Night')) {
      let logicalCurrentHour = currentHour;
      if (logicalCurrentHour < (parseInt(dayStartTime.split(':')[0], 10) || 7)) {
        logicalCurrentHour += 24;
      }
      let startMins = logicalCurrentHour * 60 + currentMinute;
      let newEndMins = startMins + duration;

      const exceedsDailyBudget = !m.completed && !isManualOverride && (accumulatedTodayStudyMins + duration > maxDailyStudyMins) && accumulatedTodayStudyMins > 0;

      if (newEndMins > endMinsTotal || forcePushToTomorrow || exceedsDailyBudget) {
        pushToTomorrow = true;
        forcePushToTomorrow = false;
        currentHour = parseInt(dayStartTime.split(':')[0], 10) || 7;
        currentMinute = parseInt(dayStartTime.split(':')[1], 10) || 0;
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

  return blocks;
}
