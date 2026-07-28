import { Chapter, Mistake, MockResult, StudySession, TodayMission, StudyRecommendation } from '../../types/index';
import { AnalyticsOutput } from '../analytics';

export interface CoachInput {
  mission: TodayMission[];
  weakTopics: Mistake[];
  revisionQueue: Chapter[]; // or mistakes
  plannerDecisions: any[];
  analyticsSummary: AnalyticsOutput;
  plannerOutput?: any;
  chapters?: Chapter[];
  studyHistory?: StudySession[];
  mockHistory?: MockResult[];
  remainingDays?: number;
  question?: string;
  // Explicit student targets — do NOT rely on plannerOutput.targetYear/targetCollege,
  // PlannerOutput has no such fields (see MentorProfile in types/index.ts instead).
  targetYear?: string;
  targetCollege?: string;
  coachingType?: string;
}

export interface CoachAction {
  type: 'ADD_MISSION' | 'UPDATE_CHAPTER' | 'UPDATE_TARGET' | 'CLEAR_MISSIONS';
  payload: any;
}

export interface CoachOutput {
  analysis: string;
  actions?: CoachAction[];
}
