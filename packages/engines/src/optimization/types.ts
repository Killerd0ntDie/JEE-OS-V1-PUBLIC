import { SubjectId } from '@/types/index';
import { PlannerInput, ScheduledTask } from '@/engines/planner/types';

export interface OptimizationInput {
  plannerInput: PlannerInput;
  targetCompletionDate: string; // ISO string
  actualStudyHoursPastWeek: number[]; // Array of hours
  skippedTasks: ScheduledTask[];
}

export interface OptimizationResult {
  isOverloaded: boolean;
  recommendedDailyStudyHours: number;
  predictedCompletionDate: string; // ISO string
  completionProbability: number;
  plusOneHourCompletionDate: string;
  neglectedSubjects: SubjectId[];
  scheduleStatus: 'On Track' | 'At Risk' | 'Behind Schedule';
  optimizedPlannerInput: PlannerInput;
}
