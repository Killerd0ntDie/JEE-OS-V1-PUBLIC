export type PageId =
  | 'dashboard'
  | 'physics'
  | 'chemistry'
  | 'maths'
  | 'planner'
  | 'focus-vault'
  | 'revision'
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
  // {
  //   id: 'focus-vault',
  //   label: 'Focus Vault',
  //   icon: 'Headphones',
  //   description: 'Immersive deep-work zen mode with Lofi music and ambient focus tracking.',
  //   category: 'utilities',
  //   badge: 'Zen',
  //   badgeStyle: 'success',
  // },
  {
    id: 'revision',
    label: 'Revision',
    icon: 'Bookmark',
    description: 'Spaced repetition dashboard, formula cards, and high-yield notes collection.',
    category: 'utilities',
  },
  {
    id: 'neural-link',
    label: 'Neural Link',
    icon: 'BrainCircuit',
    description: 'Breathtaking 2D Knowledge Graph of the entire syllabus showing interconnected mastery progression.',
    category: 'intelligence',
    badge: 'NEW',
    badgeStyle: 'accent'
  },
  {
    id: 'mistakes',
    label: 'Mistakes Log',
    icon: 'FileQuestion',
    description: 'Your personal Error Book. Categorize, analyze, and re-attempt incorrect questions.',
    category: 'utilities',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'LineChart',
    description: 'In-depth performance metrics, subject accuracy, speed breakdown, and percentile estimates.',
    category: 'intelligence',
  },
  {
    id: 'ai-coach',
    label: 'AI Mentor',
    icon: 'Sparkles',
    description: 'Converse with your dedicated JEE strategist for study planning and motivation.',
    category: 'intelligence',
    //badge: '1.5 Flash',
    badgeStyle: 'accent',
  },
  {
    id: 'mock-tests',
    label: 'Mock Tests',
    icon: 'Target',
    description: 'Simulate full-length NTA exams and auto-log mistakes.',
    category: 'utilities',
    badge: 'New',
    badgeStyle: 'success',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Sliders',
    description: 'Configure target JEE year, dream IIT targets, exam patterns, and system preferences.',
    category: 'system',
  },
];

// Core Subject Definitions
export type SubjectId = 'physics' | 'chemistry' | 'maths';

export type ChapterStatus = 
  | 'Not Started' 
  | 'Learning' 
  | 'Theory Complete' 
  | 'DPP Pending' 
  | 'PYQ Pending' 
  | 'Revision Due' 
  | 'Mastered';

export type SyllabusDiagnosisStage = 
  | 'Not Started'
  | 'Watching Lectures' 
  | 'Making Notes' 
  | 'Doing Questions'
  | 'Solving DPPs'
  | 'Solving Modules'
  | 'Solving PYQs'
  | 'Revision' 
  | 'Mastered' 
  | 'Unknown';

export interface LectureProgress {
  teacher?: string;
  lectureSeries?: string;
  totalLectures: number;
  completedLectures: number;
  avgLectureDurationMinutes: number; // e.g. 80 mins
  estimatedRemainingHours?: number;
}

export interface PracticeProgress {
  dppCompleted: boolean | 'Partial';
  pyqsCompleted: boolean | 'Partial';
  moduleCompleted: boolean | 'Partial';
  dppPercent?: number;     // 0 - 100
  modulePercent?: number;  // 0 - 100
  pyqPercent?: number;     // 0 - 100
  mockTestsAttempted?: number;
  accuracyPercent: number; // 0 - 100
  confidencePercent: number; // 0 - 100
  weakTopics?: string[];
}

export interface RevisionState {
  lastRevisedDaysAgo: number;
  retentionConfidence: 'High' | 'Medium' | 'Low';
  formulaMemoryPercent: number;
  questionSolvingConfidencePercent: number;
  needRevision: boolean;
  retentionScore?: number; // 0 - 100
  lastRevisedAt?: string;  // ISO String
}

export interface ChapterAcademicState {
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  unit: string;
  syllabusStage: SyllabusDiagnosisStage;
  lectureProgress: LectureProgress;
  practiceProgress: PracticeProgress;
  revisionState: RevisionState;
  
  // High level derived metrics computed directly from Academic State
  overallCompletion: number; // 0 - 100
  estimatedRemainingTimeHours: number;
  hasMissingInfo: boolean;
  missingFields: string[];
}

export type RevisionStage = 'Theory Complete' | 'DPP Complete' | 'Revision 1' | 'Revision 2' | 'Revision 3' | 'PYQs' | 'Mock Test' | 'Mastered';

export interface Chapter {
  id: string;
  subject: SubjectId;
  unit: string;
  name: string;
  serialNumber?: string;    // User-defined serial number (e.g. P1785251959851) for custom sorting
  completion: number;       // 0 - 100
  currentLecture: number;
  totalLectures: number;
  theoryComplete: boolean;
  pyqsComplete: boolean;
  formulaComplete?: boolean;
  hasTelemetry?: boolean;
  revisionCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  confidence: number;       // 0 - 100
  estimatedRemainingTime: number; // in hours
  priority: 1 | 2 | 3;      // 1 = High, 2 = Med, 3 = Low
  dependencies: string[];
  weightage?: number;   // chapter names/ids
  weaknessScore: number;    // 0 - 100
  status: ChapterStatus;
  solvedQuestions: number;
  lastRevisionDaysAgo: number;

  // On-hold controls: excludes tasks from scheduling while true,
  // but the chapter keeps surfacing as a reminder until turned off.
  chapterOnHold?: boolean;
  dppOnHold?: boolean;
  pyqOnHold?: boolean;
  revisionOnHold?: boolean;

  // True for chapters the student added themselves rather than the system's
  // built-in JEE syllabus (surfaced with a badge, no scheduling difference).
  isCustom?: boolean;
  
  // Syllabus Diagnosis enhancements
  syllabusStage?: SyllabusDiagnosisStage;
  lectureProgress?: LectureProgress;
  practiceProgress?: PracticeProgress;
  revisionProgress?: RevisionState;

  // Revision Engine enhancements
  revisionStage?: RevisionStage;
  healthScore?: number;     // 0 - 100
  retentionScore?: number;  // 0 - 100
  retentionStatus?: 'Fresh' | 'Stable' | 'Fading' | 'Forgotten';
  nextRevisionDueAt?: string; // ISO String
  lastRevisedAt?: string;     // ISO String
  
  // SuperMemo-2 Spaced Repetition State
  sm2EaseFactor?: number;     // e.g. 2.5
  sm2Interval?: number;       // e.g. 1, 3, 7 days
  dppComplete?: boolean;
}

export interface TodayMission {
  id: string;
  subject: SubjectId;
  chapter: string;
  chapterId?: string;
  chapterName?: string;
  type: 'Watch Lecture' | 'Solve DPP' | 'Solve PYQs' | 'Revise Formulas' | 'Review Mistakes' | 'Break';
  taskName: string;
  duration: number;         // in minutes
  date?: string;            // scheduled YYYY-MM-DD date
  scheduledDate?: string;   // ISO YYYY-MM-DD date
  scheduledTime?: string;   // HH:MM start time e.g. '07:00'
  timeSlot?: string;        // timeSlot e.g. 'Morning (07:00 - 09:30)'
  isManualOverride?: boolean;
  completed: boolean;
  xp: number;
  unlocked: boolean;
  priorityScore?: number;
  expectedMarksGain?: number;
  expectedLearningGain?: number;
  dependencyValue?: number;
  targetPYQs?: number;
  revisionContribution?: number;
  selectionReason?: string;

  // Task rationale & AI explanation
  whyThisTaskExists?: string;
  futureDependencies?: string[];
  estimatedCompletionMinutes?: number;
  expectedJeeImpact?: string;
  confidenceGainPercent?: number;

  reasoning?: {
    whySelected: string;
    dependentChapters: string[];
    rankingRationale: string;
    longTermImpact: string;
    postponeRisk: string;
    targetAccuracy?: string;
    estimatedStudyTimeMinutes?: number;
    confidenceLevel?: 'Very High' | 'High' | 'Medium';
    confidenceScorePercent?: number;
    factorsBreakdown?: Record<string, number>;
  };

  /** When true the mission has been user-dismissed: it stays visible (struck-out at the bottom)
   *  and is blocked from re-appearing from the planner, but is NOT counted in progress metrics. */
  dismissed?: boolean;
}

export type Mission = TodayMission;

export interface TimelineBlock {
  id: string;
  time: string;
  subject: SubjectId | 'general' | 'break';
  chapter: string;
  activity: string;
  completed: boolean;
}

export interface Note {
  id: string;
  timestamp: string;
  text: string;
  category: string;
  subject: SubjectId;
  chapter: string;
}

export interface SessionAnalytics {
  studyTime: number;        // minutes
  focusTime: number;        // minutes
  idleTime: number;         // minutes
  breakTime: number;        // minutes
  questionsSolved: number;
  accuracy: number;         // percentage
  tasksCompleted: number;
  xpEarned: number;
}

export interface XPState {
  daily: number;
  weekly: number;
  monthly?: number;
  total: number;
  level: number;
  streak: number;
  nextLevelXP: number;
  lastActiveDate?: string; // YYYY-MM-DD
}

export interface Mistake {
  id: string;
  subject: SubjectId;
  chapter: string;
  topic: string;
  subtopic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'JEE Main' | 'JEE Advanced';
  source: string;
  timeTaken: number; // in minutes
  correctMethod: string;
  studentMethod: string;
  mistakeTypes: string[]; // e.g. ['Conceptual Error', 'Silly Mistake']
  confidence: number; // 0 - 100
  revisionSchedule: string;
  masteryImpact: 'High' | 'Medium' | 'Low';
  attemptNumber: number;
  revisionStatus: 'New' | 'Reviewed' | 'Solved Again' | 'Mastered';
  recoveryScore: number; // 0, 40, 70, 100
  teacherNotes: string;
  personalNotes: string;
  aiAdvice: string;
  priority: 'High' | 'Medium' | 'Low';
  dateLogged: string;
  questionText: string;
  correctSolution: string;
  correctSolutionImage?: string;
  wrongSolutionImage?: string;
}

export interface RevisionSettings {
  intervals: {
    revision1: number;
    revision2: number;
    revision3: number;
    revision4: number;
    revision5: number;
  };
  maxRevisionsPerDay: number;
  dailyTimeLimit: number; // in minutes
  weights: {
    daysOverdue: number;
    confidence: number;
    importance: number;
    dependencies: number;
    mistakes: number;
  };
}

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

export interface StudySession {
  id: string;
  startTime: string; // ISO String
  endTime: string; // ISO String
  duration: number; // minutes
  type: 'Lecture' | 'Practice' | 'Mock' | 'Revision';
  subjectId: SubjectId;
  chapterId?: string;
  questionsSolved?: number;
  accuracy?: number;
  xpEarned: number;
  idleTime?: number;
  focusInterruptions?: number;
  focusScore?: number;
}

export interface Revision {
  id: string;
  chapterId: string;
  scheduledFor: string; // ISO String
  completedAt?: string; // ISO String
  stage: RevisionStage;
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
}

export interface AnalyticsSnapshot {
  date: string; // YYYY-MM-DD
  dailyAnalytics: DailyAnalytics;
  overallMastery: number; // 0-100
  subjectMastery: Record<SubjectId, number>;
  activeStreak: number;
  projectedRank?: number;
}

export interface StudyRecommendation {
  type: 'Chapter' | 'Revision' | 'Mock' | 'MistakeReview';
  subjectId: SubjectId;
  targetId: string; // Chapter ID or Mistake ID
  priorityScore: number; // 0-100
  reasoning: string; // AI generated reason
  estimatedDuration: number; // minutes
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

export interface DailyCapacitySchedule {
  wakeUpTime: string; // e.g. "06:00 AM"
  sleepTime: string;  // e.g. "11:00 PM"
  schoolHours: string; // e.g. "08:00 AM - 02:00 PM"
  coachingHours: string; // e.g. "04:00 PM - 07:00 PM"
  travelMinutes: number;
  exerciseMinutes: number;
  mealsBreaksMinutes: number;
  maxSustainableStudyHours: number;
  preferredSessionLengthMinutes: number;
}

export interface StudentConstraints {
  healthStatus: string;
  backlogsSeverity: 'None' | 'Moderate' | 'Severe';
  burnoutRisk: 'Low' | 'Moderate' | 'High';
  sportsObligations?: string;
  familyObligations?: string;
  internetIssue?: boolean;
  laptopAvailability?: boolean;
}

export interface MonthlyObjective {
  id: string;
  title: string;
  category: 'Finish Mechanics' | 'Finish Organic' | 'Complete 12th' | 'Increase Maths Accuracy' | 'Boards Focus' | 'Revision Rush';
  description: string;
  targetDate: string;
  status?: 'in_progress' | 'completed' | 'upcoming';
  subject?: SubjectId;
  focusChapters?: string[];
}

export interface WeeklyCheckin {
  date: string;
  completedChapters: string[];
  newBacklogNotes: string;
  upcomingExams: string;
  healthLevel: 'Good' | 'Fatigued' | 'Recovering';
  motivationLevel: 'High' | 'Medium' | 'Low';
  availableHoursThisWeek: number;
  unexpectedEvents: string;
}

export interface DailyCheckin {
  date: string;
  actualHoursAvailable: number;
  mood: 'Focused' | 'Energetic' | 'Tired' | 'Stressed';
  energyLevel: 'High' | 'Medium' | 'Low';
  sleepQualityHours: number;
  unexpectedWork: string;
}

export interface PlannerOutputs {
  currentPosition: string;
  remainingSyllabusPercent: number;
  estimatedCompletionDate: string;
  riskLevel: 'On Track' | 'At Risk' | 'Critical';
  currentBottlenecks: string[];
  projectedReadinessPercent: number;
  successCriteria: string[];
  mentorDecisionExplanations: string[];
}

export interface MentorProfile {
  targetExams: Array<'JEE Main' | 'JEE Advanced' | 'Boards' | 'MHT CET' | 'BITSAT' | 'Others'>;
  targetYear: string;
  targetPercentile: string;
  targetRank: string;
  targetCollege: string;
  targetBranch: string;
  currentClass: '11th' | '12th' | 'Dropper';
  coachingType: 'Online Coaching' | 'Offline Coaching' | 'Self Study' | 'School + Coaching';
  coachingName?: string;
  dailyAvailableHours: number;
  subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';
  twoDaySplitConfig?: [SubjectId[], SubjectId[], SubjectId[]];
  interviewCompleted: boolean;
  interviewCompletedAt?: string;
  realityAuditCompleted?: boolean;
  capacitySchedule?: DailyCapacitySchedule;
  constraints?: StudentConstraints;
  monthlyObjective?: MonthlyObjective;
  weeklyCheckins?: WeeklyCheckin[];
  dailyCheckins?: DailyCheckin[];
  plannerOutputs?: PlannerOutputs;
  roadmap?: {
    generatedAt: string;
    overallStrategy: string;
    weeklyTargets: Array<{
      weekNumber: number;
      title: string;
      focusSubject: SubjectId;
      keyChapters: string[];
      status: 'upcoming' | 'active' | 'completed';
    }>;
    milestones: Array<{
      id: string;
      title: string;
      targetDate: string;
      description: string;
      status: 'pending' | 'achieved';
    }>;
  };
}

export interface UserProfile {
  xp: XPState;

  analytics: SessionAnalytics;
  energyLevel: 'High' | 'Medium' | 'Low';
  activeSubject: 'physics' | 'chemistry' | 'maths' | 'all';
  isMissionModeActive: boolean;
  coachMessage: string;
  mentorProfile?: MentorProfile;
  weeklyGoals?: {
    weekIndex: number;
    title: string;
    focus: string;
    status: 'Completed' | 'Active' | 'Upcoming';
  }[];
  deletedMissionIds?: string[];
  completedPlannerMissionIds?: string[];
  scheduleOverrides?: Record<string, { 
    dayIndex?: number; 
    timeSlot?: string; 
    scheduledDate?: string; 
    scheduledTime?: string 
  }>;
  settings: {
    targetYear: string;
    dreamIit: string;
    targetBranch: string;
    dailyQuota: number;
    showStatusInBar: boolean;
    soundEffects: boolean;
    desktopNotifications: boolean;
    volume: number;
    pauseOnTabChange?: boolean;
    migratedToPristine?: boolean;
    revisionSettings?: RevisionSettings;
    enableGodMode?: boolean;
    enableHardBedtimeCap?: boolean;
    dayStartTime?: string;
    dayEndTime?: string;
    minStreakHours?: number;
    enablePomodoroCasino?: boolean;
    sessionExtensionDate?: string;
    sessionExtensionEnd?: string;
  };
}