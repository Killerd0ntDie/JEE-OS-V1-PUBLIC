import { Chapter, SubjectId } from '../../types/index';
import { WeeklyBlock } from './weeklyTypes';
import { formatMorningSlot } from './timeSlotUtils';

export function schedulePlannerWeekly(
  plannerWeeklyDayTasks: any[],
  dayIndex: number,
  dayName: string,
  currentDayIndex: number,
  chapters: Chapter[],
  existingBlocks: WeeklyBlock[],
  dayStartTime: string = "07:00"
): WeeklyBlock[] {
  const blocks: WeeklyBlock[] = [];
  const existingBlocksForDay = existingBlocks.filter(b => b.dayIndex === dayIndex);
  const existingNonBreakCount = existingBlocksForDay.filter(b => (b.taskType as any) !== 'Break').length;
  const standardSlots = [
    formatMorningSlot(dayStartTime),
    'Afternoon (14:00 - 16:00)',
    'Evening (17:30 - 19:30)',
    'Night (21:30 - 22:30)'
  ];
  
  plannerWeeklyDayTasks.forEach((t: any, tIdx: number) => {
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

  return blocks;
}
