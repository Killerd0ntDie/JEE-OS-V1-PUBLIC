import { Chapter, TodayMission, TimelineBlock, SubjectId, MentorProfile } from '../types/index';
import { generateWeeklyMatrix, WeeklyBlock } from '@jee-os/engines';

export interface TimelineSynthesisInput {
  uniqueMissions: Map<string, TodayMission>;
  userCustomMissions: TodayMission[];
  energyChanged: boolean;
  totalDailyQuotaHours: number;
  chapters: Chapter[];
  weeklySchedule: WeeklyBlock[] | null;
  deletedMissionIds: string[];
  scheduleOverrides: Record<string, { dayIndex?: number; timeSlot?: string; scheduledDate?: string; scheduledTime?: string }>;
  completedPlannerMissionIds: string[];
  timeline: TimelineBlock[];
  settings?: any;
  mentorProfile?: MentorProfile;
  energyLevel?: string;
}

export interface TimelineSynthesisOutput {
  todayMissions: TodayMission[];
  weeklySchedule: WeeklyBlock[];
  timeline: TimelineBlock[];
}

export function synthesizeDailyMissionsAndTimeline(input: TimelineSynthesisInput): TimelineSynthesisOutput {
  const {
    uniqueMissions,
    userCustomMissions,
    energyChanged,
    totalDailyQuotaHours,
    chapters,
    deletedMissionIds,
    scheduleOverrides,
    completedPlannerMissionIds,
    settings,
    mentorProfile,
    energyLevel
  } = input;

  let tempTodayMissions = Array.from(uniqueMissions.values()).filter(m => 
    !(m.subject === 'break' && (m.id.startsWith('break-') || m.id.startsWith('today-break-')) && !m.isManualOverride)
  );

  // If energy level changed, clear old timeSlots on uncompleted missions so generateWeeklyMatrix recalculates them for the new energy schedule
  if (energyChanged) {
    tempTodayMissions = tempTodayMissions.map(m => {
      if (!m.completed && !m.isManualOverride) {
        return { ...m, timeSlot: undefined };
      }
      return m;
    });
  }

  // Academic integrity: Enforce sequential lecture order: same-chapter lectures must always be in ascending order.
  // Uses a strictly transitive total comparator so V8 Timsort never scrambles lectures or breaks.
  const extractLecNum = (name: string): number => {
    const match = (name || '').match(/Lecture\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  };

  tempTodayMissions.sort((a, b) => {
    // Completed tasks first
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    if (a.dismissed !== b.dismissed) return a.dismissed ? 1 : -1;

    // 1. For same-chapter lecture tasks, strictly sort by lecture number ascending
    // (Lecture 8 must ALWAYS precede Lecture 10, regardless of any manual override)
    const sameChapter = (a.chapter || '').toLowerCase() === (b.chapter || '').toLowerCase();
    const aIsLec = (a.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(a.taskName || ''));
    const bIsLec = (b.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(b.taskName || ''));
    if (sameChapter && aIsLec && bIsLec) {
      const diff = extractLecNum(a.taskName) - extractLecNum(b.taskName);
      if (diff !== 0) return diff;
    }

    if (a.isManualOverride && !b.isManualOverride) return -1;
    if (!a.isManualOverride && b.isManualOverride) return 1;

    const prioDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
    if (prioDiff !== 0) return prioDiff;

    return (a.id || '').localeCompare(b.id || '');
  });

  // Clear stale timeSlot on uncompleted non-manual missions so generateWeeklyMatrix can cleanly compute continuous, sequential timeSlots
  tempTodayMissions = tempTodayMissions.map(m => {
    if (!m.completed && !m.isManualOverride) {
      return {
        ...m,
        timeSlot: undefined
      };
    }
    return m;
  });

  // During overnight hours (before dayStartTime), the student is still on the previous day's schedule
  const dayStartHour = parseInt((settings?.dayStartTime || '07:00').split(':')[0], 10) || 7;
  const nowForDay = new Date();
  if (nowForDay.getHours() < dayStartHour) {
    nowForDay.setDate(nowForDay.getDate() - 1);
  }
  const currentDayIndex = (nowForDay.getDay() + 6) % 7; // Monday = 0
  const splitStrategy = mentorProfile?.subjectSplitStrategy || '3_a_day';
  const matrixSettings = {
    ...(settings || {}),
    energyLevel,
    effectiveDailyStudyHours: totalDailyQuotaHours,
    dailyCapHours: totalDailyQuotaHours
  };
  const weeklySchedule = generateWeeklyMatrix(
    splitStrategy,
    chapters,
    tempTodayMissions,
    input.weeklySchedule,
    currentDayIndex,
    mentorProfile?.twoDaySplitConfig,
    deletedMissionIds || [],
    scheduleOverrides || {},
    settings?.dayStartTime || "07:00",
    settings?.dayEndTime || "22:30",
    matrixSettings
  );

  // Map generated matrix blocks back to todayMissions to synchronize Dashboard and Planner
  const currentDayBlocks = weeklySchedule.filter(b => b.dayIndex === currentDayIndex);
  const todayMissions: TodayMission[] = currentDayBlocks.map(b => {
    const originalId = b.id.startsWith('today-') ? b.id.slice(6) : b.id;
    const original = uniqueMissions.get(originalId);
    const parentId = (b as any).parentTaskId || originalId.replace(/^break-/, '').replace(/^break-after-/, '');
    const parentMission = uniqueMissions.get(parentId);
    const isBreak = b.subject === 'break' || b.taskType === 'Break' || b.activity?.toLowerCase().includes('break');
    const resolvedChapter = isBreak && parentMission?.chapter ? parentMission.chapter : b.chapterName;
    const resolvedChapterId = isBreak && parentMission?.chapterId ? parentMission.chapterId : b.chapterId;

    return {
      ...(original || {}),
      id: originalId,
      subject: b.subject as SubjectId,
      chapter: resolvedChapter,
      chapterId: resolvedChapterId,
      type: b.taskType,
      taskName: b.activity,
      duration: b.durationMinutes,
      timeSlot: b.timeSlot,
      completed: (original ? original.completed : b.completed) || 
                 (completedPlannerMissionIds || []).includes(originalId) || 
                 (completedPlannerMissionIds || []).includes(b.id),
      xp: original ? original.xp : Math.round(b.priorityScore),
      unlocked: true,
      priorityScore: b.priorityScore,
      reasoning: b.reasoning,
      dismissed: original?.dismissed ?? false,
      isManualOverride: (b as typeof b & { isManualOverride?: boolean }).isManualOverride ?? original?.isManualOverride ?? false,
      scheduledDate: (b as typeof b & { scheduledDate?: string }).scheduledDate,
      scheduledTime: (b as typeof b & { scheduledTime?: string }).scheduledTime
    };
  });

  // Safety check: Unconditionally preserve all completed, dismissed, or custom missions
  const currentMissionIds = new Set(todayMissions.map(m => m.id));
  const userCustomMissionIds = new Set(userCustomMissions.map(m => m.id));
  for (const [id, m] of uniqueMissions.entries()) {
    if ((m.completed || m.dismissed || m.isManualOverride || userCustomMissionIds.has(id)) && !currentMissionIds.has(id)) {
      todayMissions.push(m);
    }
  }

  // Post-sort: Enforce chronological and sequential lecture order after rebuilding from weekly matrix.
  const getMissionChapter = (m: TodayMission): string => {
    const isBreak = m.subject === 'break' || m.type === 'Break' || m.taskName?.toLowerCase().includes('break');
    if (isBreak) {
      const linkedId = m.id.replace(/^today-break-/, '').replace(/^break-/, '').replace(/^break-after-/, '');
      const parent = todayMissions.find(x => x.id === linkedId);
      if (parent?.chapter) return parent.chapter.toLowerCase();
    }
    return (m.chapter || '').toLowerCase();
  };

  const getEffectiveLecScore = (m: TodayMission): number => {
    const isLec = m.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(m.taskName || '');
    if (isLec) {
      return extractLecNum(m.taskName);
    }
    const isBreak = m.subject === 'break' || m.type === 'Break' || m.taskName?.toLowerCase().includes('break');
    if (isBreak) {
      const linkedId = m.id.replace(/^today-break-/, '').replace(/^break-/, '').replace(/^break-after-/, '');
      const parent = todayMissions.find(x => x.id === linkedId);
      if (parent) {
        const pNum = extractLecNum(parent.taskName);
        if (pNum !== Number.MAX_SAFE_INTEGER) return pNum + 0.5;
      }
    }
    return Number.MAX_SAFE_INTEGER;
  };

  todayMissions.sort((a, b) => {
    // 1. Keep completed/dismissed at their current relative position
    const rankA = a.dismissed ? 2 : a.completed ? 1 : 0;
    const rankB = b.dismissed ? 2 : b.completed ? 1 : 0;
    if (rankA !== rankB) return rankA - rankB;

    // 2. Sequential order for same-chapter lectures and their linked breaks:
    // Lecture 8 (8.0) -> Break 8 (8.5) -> Lecture 9 (9.0) -> Break 9 (9.5) -> Lecture 10 (10.0) -> Break 10 (10.5)
    const chapA = getMissionChapter(a);
    const chapB = getMissionChapter(b);
    const sameChapter = Boolean(chapA && chapB && chapA === chapB);
    if (sameChapter) {
      const scoreA = getEffectiveLecScore(a);
      const scoreB = getEffectiveLecScore(b);
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
    }

    // 3. Sort by chronological timeSlot to preserve scheduled sequence (sessions & breaks)
    const getSlotMins = (slot: string | undefined): number => {
      if (!slot) return Number.MAX_SAFE_INTEGER;
      const match = slot.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
      if (!match) return Number.MAX_SAFE_INTEGER;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = match[3]?.toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      if (hours < dayStartHour) hours += 24;
      return hours * 60 + minutes;
    };
    const minA = getSlotMins(a.timeSlot);
    const minB = getSlotMins(b.timeSlot);
    if (minA !== minB) return minA - minB;

    // 4. Linked break ordering fallback
    if (a.id === `break-${b.id}` || a.id === `break-after-${b.id}`) return 1;
    if (b.id === `break-${a.id}` || b.id === `break-after-${a.id}`) return -1;

    // 5. Stable tie-breaker by ID
    return (a.id || '').localeCompare(b.id || '');
  });

  // Update timeline based on the newly synchronized todayMissions
  let currentHour = 9;
  let currentMinute = 0;
  let timeSinceLastBreak = 0;
  const customBlocks = input.timeline.filter(b => b.id.startsWith('custom-'));
  const generatedBlocks: TimelineBlock[] = [];

  todayMissions.forEach((mission, idx) => {
    const startStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    currentMinute += mission.duration;
    timeSinceLastBreak += mission.duration;
    
    while (currentMinute >= 60) {
      currentHour += 1;
      currentMinute -= 60;
    }
    const endStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    generatedBlocks.push({
      id: `mission-${mission.id}`,
      time: mission.timeSlot || `${startStr} - ${endStr}`,
      subject: mission.subject as SubjectId,
      chapter: mission.chapter,
      activity: `${mission.type}: ${mission.taskName}`,
      completed: mission.completed
    });

    if (idx < todayMissions.length - 1) {
      // Dynamic Breaks: Only insert a break if we've been studying continuously for 45+ mins
      if (timeSinceLastBreak >= 45) {
        const breakDuration = timeSinceLastBreak >= 90 ? 20 : 10;
        const breakStart = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        currentMinute += breakDuration;
        while (currentMinute >= 60) {
          currentHour += 1;
          currentMinute -= 60;
        }
        const breakEnd = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        generatedBlocks.push({
          id: `break-${idx}`,
          time: `${breakStart} - ${breakEnd}`,
          subject: 'break',
          chapter: 'Cognitive Disconnection',
          activity: `Take a ${breakDuration}-minute break. Stretch and hydrate.`,
          completed: false
        });
        timeSinceLastBreak = 0;
      }
    }
  });

  const timeline = [...customBlocks, ...generatedBlocks];

  return {
    todayMissions,
    weeklySchedule,
    timeline
  };
}
