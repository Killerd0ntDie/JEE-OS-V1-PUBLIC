import { SubjectId } from '../../types/index';

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
  parentTaskId?: string;
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
