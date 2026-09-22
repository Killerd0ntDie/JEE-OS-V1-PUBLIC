import { SubjectId } from './index';

export type QuestionType = 'MCQ' | 'NUMERICAL' | 'MULTI';

export interface MockQuestion {
  id: string;
  subject: SubjectId;
  type: QuestionType;
  chapter: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  content: string; // Markdown or plain text for the question body
  options?: string[]; // Only for MCQ
  correctAnswer: string; // The correct option index (0-3) as string, or the numerical answer as string
  marks: {
    correct: number; // e.g. 4
    incorrect: number; // e.g. -1
  };
  explanation?: string;
  imageUrl?: string;
  hasDiagram?: boolean;
  isVerified?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  solution?: { text?: string };
  pageNumber?: number;
}

export interface MockTestSection {
  subject: SubjectId;
  questions: MockQuestion[];
}

export interface MockTest {
  id: string;
  name: string;
  durationMinutes: number; // e.g. 180
  totalMarks: number; // e.g. 300
  sections: MockTestSection[];
  source?: 'builtin' | 'pyq' | 'dpp' | 'generated' | 'custom';
  category?: 'grand' | 'pyq' | 'dpp' | 'sprint' | 'chapter';
  chapterId?: string;
  chapterName?: string;
  createdAt?: number;
  isCustom?: boolean;
}

// Used to track live exam state
export type QuestionStatus = 'Not Visited' | 'Not Answered' | 'Answered' | 'Marked for Review' | 'Answered & Marked for Review';

export interface MockTestAttemptQuestion {
  questionId: string;
  subject: SubjectId;
  status: QuestionStatus;
  selectedAnswer?: string;
  timeSpentSeconds: number;
}

export interface MockTestAttempt {
  testId: string;
  startTime: string;
  endTime?: string;
  questions: Record<string, MockTestAttemptQuestion>; // Keyed by questionId
}
