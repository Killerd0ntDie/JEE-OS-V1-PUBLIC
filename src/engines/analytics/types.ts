import { SubjectId, Chapter, Mistake, StudySession, MockResult } from '../../types/index';
import { ChapterTelemetry } from '../chapterInfo/types';

export interface AnalyticsInput {
  chapters: Chapter[];
  sessions: StudySession[];
  mocks: MockResult[];
  mistakes: Mistake[];
  chapterTelemetryMap?: Record<string, ChapterTelemetry>;
  currentDate?: string;
}

export interface AnalyticsOutput {
  totalStudyHours: number;
  studyHoursPastWeek: number[]; // e.g. [4, 5, 3, 0, 6, 7, 4] for the last 7 days
  studyVelocity: number; // moving average of hours/day over last 7 days
  consistencyScore: number; // percentage of active days in last 30 days
  currentStreak: number;
  
  subjectBalance: Record<SubjectId, {
    studyHours: number;
    completionPercentage: number;
  }>;
  
  overallLectureCompletion: number; // percentage
  
  questionAccuracy: number; // overall percentage
  
  revisionHealth: number; // percentage of mistakes resolved or chapters mastered
  
  mockPerformance: {
    averageScore: number;
    recentTrend: number; // difference between last mock and average
  };
  
  predictedCompletionDate: string | null;
}
