import { SubjectId, Chapter, Mistake, StudySession, Note } from '../types/index';
import { ChapterTelemetry } from '../chapterInfo';
import { FormulaEntry } from '../constants/formulaBank';

export interface RevisionCardItem extends FormulaEntry {
  id: string;
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  cardType?: 'formula' | 'mistake' | 'note';
  mistakeId?: string;
  noteId?: string;
  latex?: string;
  retentionConfidence: 'High' | 'Medium' | 'Low';
  retentionScore: number;
  lastReviewedDate?: string;
  nextReviewDays: number;
  intervalStage: string;
  recalledCount: number;
  urgencyRank: number; // Higher means more urgent
  sm2State?: {
    repetitions: number;
    easeFactor: number;
    interval: number;
  };
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
  notes?: Note[];
}

export interface DueChapterItem {
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  status: string;
  completion: number;
  revisionCount: number;
  lastRevisedAt?: string;
  nextRevisionDueAt?: string;
  daysOverdue: number;
  urgency: 'overdue' | 'due_today' | 'upcoming';
  dueReason: string;
  formulaCardsCount: number;
  mistakeCardsCount: number;
  totalCardsCount: number;
  cards: RevisionCardItem[];
}

export interface RevisionCard {
  chapterId: string;
  subject: SubjectId;
  chapterName: string;
  reason: string;
  estimatedTime: number; // in minutes
  priority: 'High' | 'Medium' | 'Low';
  priorityScore: number;
  confidence: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  lastRevised: string; // e.g. "3 days ago"
  currentStage: string;
  healthScore: number;
  retentionScore: number;
  retentionStatus: 'Fresh' | 'Stable' | 'Fading' | 'Forgotten';
  isCritical: boolean;
  daysOverdue: number;
}

export interface RevisionPlanOutput {
  dueChapters: DueChapterItem[];
  upcomingChapters: DueChapterItem[];
  masteredChapters: ChapterRevisionSummary[];
  notStartedChapters: ChapterRevisionSummary[];
  dueCards: RevisionCardItem[];
  allCards: RevisionCardItem[];
  revisionQueue: RevisionCard[];
  stats: {
    totalDueChapters: number;
    totalDueCards: number;
    totalUpcomingChapters: number;
    totalMasteredChapters: number;
    totalNotStartedChapters: number;
    reviewedTodayCount: number;
    avgRetentionScore: number;
  };
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
  dueChapters?: DueChapterItem[];
  upcomingDueChapters?: DueChapterItem[];
  dueCards?: RevisionCardItem[];
  revisionQueue?: RevisionCard[];
  stats: {
    totalOverdue: number;
    totalUpcoming: number;
    totalMastered: number;
    totalNotStarted: number;
    avgRetentionScore: number;
    reviewedTodayCount: number;
  };
}

