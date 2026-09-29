import { SubjectId, Chapter } from '../types/index';
import { WeeklyBlock, daysOfWeek } from './weekly/weeklyTypes';
import { scheduleTodayMissions } from './weekly/todayMissionsScheduler';
import { schedulePlannerWeekly } from './weekly/plannerWeeklyScheduler';
import { scheduleProceduralWeekly } from './weekly/proceduralScheduler';
import { filterAndOverrideBlocks, sortWeeklyBlocks } from './weekly/blockSorter';
import {
  normalizeTwoDaySplitConfig,
  getDayFocusPill,
  getHeaderBadgeText
} from './weekly/splitConfigHelpers';

export type { WeeklyBlock };
export {
  daysOfWeek,
  normalizeTwoDaySplitConfig,
  getDayFocusPill,
  getHeaderBadgeText
};

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
  const blocks: WeeklyBlock[] = [];
  const idCounter = { current: 1 };

  daysOfWeek.forEach((dayName, dayIndex) => {
    const isToday = dayIndex === currentDayIndex;

    if (isToday && todayMissions && todayMissions.length > 0) {
      const todayBlocks = scheduleTodayMissions(
        todayMissions,
        dayIndex,
        dayName,
        chapters,
        dayStartTime,
        dayEndTime,
        settings
      );
      blocks.push(...todayBlocks);
    } else if (plannerWeekly?.[dayIndex] && plannerWeekly[dayIndex].length > 0) {
      const weeklyBlocks = schedulePlannerWeekly(
        plannerWeekly[dayIndex],
        dayIndex,
        dayName,
        currentDayIndex,
        chapters,
        blocks,
        dayStartTime
      );
      blocks.push(...weeklyBlocks);
    } else {
      if (todayMissions && todayMissions.length > 0) {
        return;
      }
      const proceduralBlocks = scheduleProceduralWeekly(
        dayIndex,
        dayName,
        currentDayIndex,
        splitStrategy,
        chapters,
        twoDaySplitConfig,
        dayStartTime,
        idCounter
      );
      blocks.push(...proceduralBlocks);
    }
  });

  const filteredAndOverridden = filterAndOverrideBlocks(
    blocks,
    deletedMissionIds,
    scheduleOverrides
  );

  return sortWeeklyBlocks(filteredAndOverridden);
}
