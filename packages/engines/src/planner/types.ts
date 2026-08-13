import { SubjectId, StudySession, TodayMission, Chapter, Mistake, MonthlyObjective, MockResult } from '@/types/index';

export interface MissionReasoning {
  whySelected: string;                       // Why this chapter was selected
  dependentChapters: string[];               // Which future chapters depend on it
  rankingRationale: string;                 // Why it ranks above other available tasks
  longTermImpact: string;                   // Estimated impact on long-term preparation
  postponeRisk: string;                     // Risk of postponing it
  estimatedStudyTimeMinutes: number;       // Estimated study time
  confidenceLevel: 'Very High' | 'High' | 'Medium'; // Confidence in this recommendation
  confidenceScorePercent: number;          // e.g. 94%
  factorsBreakdown?: Record<string, number>; // 10-factor modular scores
}

export interface ReasoningPipelineSummary {
  academicStateOverview: string;
  detectedPrerequisiteGaps: string[];
  detectedRevisionDecay: string[];
  detectedWeakAreas: string[];
  activeMonthlyObjective: string;
  totalCandidatesEvaluated: number;
  strategicTakeaway: string;
}

export interface PlannerInput {
  studyHours: number;
  chapterTelemetryMap: Record<string, import('../chapterInfo/types').ChapterTelemetry>;
  revisionBacklog: Array<{
    chapterId: string;
    daysOverdue: number;
    retentionScore: number;
  }>;
  userPreferences: {
    targetYear: string;
    focusSubject?: SubjectId;
    dailyQuota?: number;
    subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';
    twoDaySplitConfig?: [SubjectId[], SubjectId[], SubjectId[]];
    prerequisiteEnforcementStrategy?: 'strict' | 'parallel';
  };
  remainingDaysUntilJEE: number;
  currentDate?: string; // ISO string for deterministic planning
  studySessions?: StudySession[];
  todayMissions?: TodayMission[];
  chapters?: Chapter[];
  mistakes?: Mistake[];
  monthlyObjectives?: MonthlyObjective[];
  mocks?: MockResult[];
}

export interface ScheduledTask {
  id: string;
  type: 'Watch Lecture' | 'Solve DPP' | 'Solve PYQs' | 'Revise Formulas' | 'Review Mistakes' | 'Break';
  subjectId: SubjectId;
  chapterId: string;
  chapterName: string;
  taskName: string;
  duration: number; // minutes
  priorityScore: number;
  priorityBreakdown?: Record<string, number>;
  expectedMarksGain?: number;
  expectedLearningGain?: number;
  dependencyValue?: number;
  revisionContribution?: number;
  selectionReason?: string;
  reasoning?: MissionReasoning;
  scheduledDate?: string;  // ISO date e.g. '2026-08-06'
  scheduledTime?: string;  // HH:MM e.g. '07:00'
}

export interface PlannerOutput {
  todaysMission: ScheduledTask[];
  morningBlock: ScheduledTask[];
  afternoonBlock: ScheduledTask[];
  nightBlock: ScheduledTask[];
  carryForward: ScheduledTask[];
  weeklySchedule?: Record<number, ScheduledTask[]>;
  estimatedFinishDate: string | null;
  dailyWorkload: number; // minutes
  priorityExplanation: string;
  missionScore?: number;
  expectedLearningGain?: number;
  completionProbability?: number;
  selectionReason?: string;
  reasoningPipelineSummary?: ReasoningPipelineSummary;
}
