export type PageId =
  | 'dashboard'
  | 'physics'
  | 'chemistry'
  | 'maths'
  | 'planner'
  | 'focus-vault'
  | 'revision'
  | 'formulas'
  | 'mistakes'
  | 'analytics'
  | 'ai-coach'
  | 'coach-history'
  | 'mock-tests'
  | 'neural-link'
  | 'settings';

export interface PageDefinition {
  id: PageId;
  label: string;
  icon: string; // Lucide icon name
  description: string;
  category: 'core' | 'subjects' | 'utilities' | 'intelligence' | 'system';
  badge?: string;
  badgeStyle?: 'default' | 'accent' | 'success';
}

export const PAGES: PageDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    description: 'Overview of your JEE preparation performance, daily streak, and critical actions.',
    category: 'core',
  },
  {
    id: 'physics',
    label: 'Physics',
    icon: 'Atom',
    description: 'Mechanics, Electrodynamics, Optics, and Modern Physics syllabus trackers and chapter modules.',
    category: 'subjects',
    badge: '18 Ch',
  },
  {
    id: 'chemistry',
    label: 'Chemistry',
    icon: 'FlaskConical',
    description: 'Physical, Organic, and Inorganic Chemistry concepts, reaction databases, and revision logs.',
    category: 'subjects',
    badge: '22 Ch',
  },
  {
    id: 'maths',
    label: 'Mathematics',
    icon: 'Binary',
    description: 'Calculus, Algebra, Coordinate Geometry, and Vectors practice vaults and theorem boards.',
    category: 'subjects',
    badge: '16 Ch',
  },
  {
    id: 'planner',
    label: 'Planner',
    icon: 'Calendar',
    description: 'Daily scheduling, syllabus completion timeline, and micro-goals tracker.',
    category: 'utilities',
    badge: 'Today',
    badgeStyle: 'accent',
  },
  {
    id: 'revision',
    label: 'Revision',
    icon: 'Bookmark',
    description: 'Spaced repetition dashboard, formula cards, and high-yield notes collection.',
    category: 'utilities',
  },
  {
    id: 'formulas',
    label: 'Formula Vault',
    icon: 'Sigma',
    description: 'Complete KaTeX formula repository for Physics, Chemistry, and Maths with search and bookmarking.',
    category: 'utilities',
    badge: 'KaTeX',
    badgeStyle: 'accent'
  },
  {
    id: 'mistakes',
    label: 'Mistake Vault',
    icon: 'ShieldAlert',
    description: 'Intelligent error logbook with automated categorization, recovery scoring, and revision reminders.',
    category: 'utilities',
    badge: 'Vault',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'BarChart3',
    description: 'Detailed study hours, questions solved, accuracy trends, and subject-wise performance charts.',
    category: 'intelligence',
  },
  {
    id: 'ai-coach',
    label: 'AI Coach',
    icon: 'Sparkles',
    description: 'Personalized AI mentorship powered by Gemini, offering actionable guidance and study strategies.',
    category: 'intelligence',
    badge: 'AI',
    badgeStyle: 'accent',
  },
  {
    id: 'mock-tests',
    label: 'Mock Tests',
    icon: 'GraduationCap',
    description: 'Track full-length and part syllabus tests, analyze scores, and pinpoint weak areas.',
    category: 'utilities',
    badge: 'Tests',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    description: 'Exam target, daily quotas, system preferences, data backups, and application configuration.',
    category: 'system',
  },
];

// Re-export Canonical Domain Types from @jee-os/engines
export type {
  SubjectId,
  ChapterStatus,
  SyllabusDiagnosisStage,
  LectureProgress,
  PracticeProgress,
  RevisionState,
  ChapterAcademicState,
  RevisionStage,
  Chapter,
  TodayMission,
  Mission,
  TimelineBlock,
  Note,
  SessionAnalytics,
  XPState,
  Mistake,
  RevisionSettings,
  StudySession,
  StudyRecommendation,
  DailyCapacitySchedule,
  StudentConstraints,
  MonthlyObjective,
  WeeklyCheckin,
  DailyCheckin,
  PlannerOutputs,
  MentorProfile,
  UserProfile,
  UserSettings,
  StudentProfile
} from '@jee-os/engines';

import type { SubjectId, TodayMission, UserProfile } from '@jee-os/engines';

export interface Subject {
  id: SubjectId;
  name: string;
  totalChapters: number;
}

export interface Lecture {
  id: string;
  chapterId: string;
  title: string;
  duration: number; // minutes
  order: number;
  completed: boolean;
  videoUrl?: string;
}

export interface Revision {
  id: string;
  chapterId: string;
  scheduledFor: string; // ISO String
  completedAt?: string; // ISO String
  stage: import('@jee-os/engines').RevisionStage;
  status: 'Pending' | 'Completed' | 'Skipped';
  confidenceScoreAfter?: number;
}

export type RevisionItem = Revision;

export interface DailyAnalytics {
  id: string; // typically YYYY-MM-DD
  date: string;
  studyTime: number; // minutes
  questionsSolved: number;
  accuracy: number;
  xpEarned: number;
  subjectBreakdown: Record<string, number>;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  profile: UserProfile;
}

export interface QuestionProgress {
  chapterId: string;
  totalAttempted: number;
  totalCorrect: number;
  averageTimePerQuestion: number; // in seconds
  accuracy: number; // percentage
  lastPracticedAt?: string; // ISO String
}

export interface MockResult {
  id: string;
  date: string; // ISO String
  title: string;
  totalScore: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  duration: number; // in minutes
  subjectBreakdown: Record<SubjectId, { score: number; attempted: number; correct: number }>;
  testSnapshot?: import('./mockTest').MockTest;
  attemptData?: import('./mockTest').MockTestAttempt;
  isRetake?: boolean;
  originalAttemptId?: string;
}

export interface AnalyticsSnapshot {
  date: string; // YYYY-MM-DD
  dailyAnalytics: DailyAnalytics;
  overallMastery: number; // 0-100
  subjectMastery: Record<SubjectId, number>;
  activeStreak: number;
  projectedRank?: number;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  missions: TodayMission[];
  generatedAt: string; // ISO String
  isCompleted: boolean;
}

export interface MissionPlan {
  missions: TodayMission[];
  totalEstimatedTime: number; // minutes
  focusAreas: string[];
}