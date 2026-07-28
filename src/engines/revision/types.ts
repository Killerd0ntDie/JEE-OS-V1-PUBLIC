import { SubjectId, Chapter, Mistake, StudySession } from '../../types/index';
import { ChapterTelemetry } from '../chapterInfo';
import { FormulaEntry } from '../../constants/formulaBank';

export interface RevisionCardItem extends FormulaEntry {
  id: string;
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  retentionConfidence: 'High' | 'Medium' | 'Low';
  retentionScore: number;
  lastReviewedDate?: string;
  nextReviewDays: number;
  intervalStage: '1d' | '3d' | '7d' | '14d' | '30d';
  recalledCount: number;
  urgencyRank: number; // Higher means more urgent
}

export interface ChapterRevisionSummary {
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  // BUGFIX: chapters that haven't been started yet used to be scored as
  // retentionConfidence: 'High' with a fabricated ~95% retentionScore — implying
  // strong retention of material the student has never studied. 'Not Started' is a
  // distinct, honest state: there's no memory to decay yet, so it isn't "high
  // retention", it's "not applicable". retentionScore is omitted for this state.
  retentionConfidence: 'High' | 'Medium' | 'Low' | 'Not Started';
  retentionScore?: number;
  overdueCardsCount: number;
  totalCardsCount: number;
  lastRevisionDate?: string;
}

export interface RevisionEngineInput {
  chapters: Chapter[];
  chapterTelemetryMap: Record<string, ChapterTelemetry>;
  sessions: StudySession[];
  mistakes: Mistake[];
}

export interface RevisionEngineOutput {
  overdueChapters: ChapterRevisionSummary[];
  upcomingChapters: ChapterRevisionSummary[];
  masteredChapters: ChapterRevisionSummary[];
  // BUGFIX: chapters not yet started are no longer folded into `masteredChapters`
  // (where they showed up in the Retention Matrix looking "mastered"/"High
  // retention"). They get their own bucket so the UI can label them distinctly.
  notStartedChapters: ChapterRevisionSummary[];
  cards: RevisionCardItem[];
  urgentCards: RevisionCardItem[]; // Top 6 urgent cards for compact display
  stats: {
    totalOverdue: number;
    totalUpcoming: number;
    totalMastered: number;
    totalNotStarted: number;
    avgRetentionScore: number;
    reviewedTodayCount: number;
  };
}
