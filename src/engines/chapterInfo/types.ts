import { SubjectId, Chapter, Mistake, StudySession, MockResult } from '../../types/index';

export interface ChapterStrategyRadar {
  masteryScore: number;
  theoryCompletionPercent: number;
  dppCompletionPercent: number;
  pyqCompletionPercent: number;
  retentionConfidenceScore: number;
  jeeWeightageRank: 'Tier 1' | 'Tier 2' | 'Tier 3';
  examWeightagePercent: number;
  bottleneckSeverity: 'Critical' | 'Moderate' | 'Low' | 'None';
  formulas?: string[];
  pitfalls?: string;
  recommendedPYQs?: number;
  weightageGain?: number;
  conceptTags?: string[];
}

export interface ChapterInfographicsData {
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  unit: string;
  masteryScore: number;
  syllabusStage: 'Not Started' | 'In Progress' | 'Mastered';
  currentLecture: number;
  totalLectures: number;
  theoryComplete: boolean;
  dppComplete: boolean;
  pyqsComplete: boolean;
  isMastered: boolean;
  weightagePercent: number;
  retentionConfidence: 'High' | 'Medium' | 'Low';
  unresolvedMistakesCount: number;
}

export interface ChapterTelemetry {
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  unit: string;
  masteryScore: number;
  syllabusStage: 'Not Started' | 'In Progress' | 'Mastered';
  currentLecture: number;
  totalLectures: number;
  theoryComplete: boolean;
  dppComplete: boolean;
  pyqsComplete: boolean;
  isMastered: boolean;
  weightagePercent: number;
  retentionConfidence: 'High' | 'Medium' | 'Low';
  unresolvedMistakesCount: number;
  strategyRadar: ChapterStrategyRadar;
  infographics: ChapterInfographicsData;
  isBottleneck: boolean;
  bottleneckReason?: string;
}

export interface ChapterInfoInput {
  chapters: Chapter[];
  mistakes: Mistake[];
  sessions: StudySession[];
  mocks: MockResult[];
  settings?: {
    targetYear: string;
    [key: string]: any;
  };
}
