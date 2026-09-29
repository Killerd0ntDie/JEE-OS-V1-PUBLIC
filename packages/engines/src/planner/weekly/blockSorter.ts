import { WeeklyBlock, daysOfWeek } from './weeklyTypes';
import { getLocalDateKey } from '../modules/candidateTaskGenerator';
import { getSlotMins } from './timeSlotUtils';

export function filterAndOverrideBlocks(
  blocks: WeeklyBlock[],
  deletedMissionIds: string[],
  scheduleOverrides: Record<string, { dayIndex?: number; timeSlot?: string; scheduledDate?: string; scheduledTime?: string }>
): WeeklyBlock[] {
  let filtered = blocks.filter(b => !deletedMissionIds.includes(b.id) && !deletedMissionIds.includes(b.id.replace('today-', '')));

  if (scheduleOverrides && Object.keys(scheduleOverrides).length > 0) {
    const todayDateObj = new Date();
    todayDateObj.setHours(0, 0, 0, 0);
    const todayDateStr = getLocalDateKey(todayDateObj);

    filtered = filtered.map(b => {
      const override = scheduleOverrides[b.id] || scheduleOverrides[b.id.replace('today-', '')] || scheduleOverrides[b.id.replace('plan-', '')];
      
      // Ignore overrides from past dates for uncompleted blocks to allow auto-cascade
      if (override?.scheduledDate && override.scheduledDate < todayDateStr && !b.completed) {
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

  return filtered;
}

export function sortWeeklyBlocks(blocks: WeeklyBlock[]): WeeklyBlock[] {
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

  return [...blocks].sort((a, b) => {
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
}
