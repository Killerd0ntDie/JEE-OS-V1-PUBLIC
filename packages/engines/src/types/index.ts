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
  avgLectureDurationMinutes: number;
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
  totalDpp?: number;
  completedDpp?: number;
  totalPyq?: number;
  totalPyqs?: number;
  completedPyq?: number;
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
  serialNumber?: string;
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
  weightage?: number;
  priorityScore?: number;
  weaknessScore: number;    // 0 - 100
  status: ChapterStatus;
  solvedQuestions: number;
  lastRevisionDaysAgo: number;

  chapterOnHold?: boolean;
  dppOnHold?: boolean;
  pyqOnHold?: boolean;
  revisionOnHold?: boolean;

  isCustom?: boolean;
  
  syllabusStage?: SyllabusDiagnosisStage;
  lectureProgress?: LectureProgress;
  practiceProgress?: PracticeProgress;
  revisionProgress?: RevisionState;

  revisionStage?: RevisionStage;
  healthScore?: number;     // 0 - 100
  retentionScore?: number;  // 0 - 100
  retentionStatus?: 'Fresh' | 'Stable' | 'Fading' | 'Forgotten';
  nextRevisionDueAt?: string; // ISO String
  lastRevisedAt?: string;     // ISO String
  
  sm2EaseFactor?: number;
  sm2Interval?: number;
  dppComplete?: boolean;
  
  flashcardStates?: Record<string, {
    repetitions: number;
    easeFactor: number;
    interval: number;
    nextReviewDate?: string;
    lastReviewDate?: string;
  }>;
}

export interface TodayMission {
  id: string;
  subject: SubjectId | 'break';
  chapter: string;
  chapterId?: string;
  chapterName?: string;
  type: 'Watch Lecture' | 'Solve DPP' | 'Solve PYQs' | 'Revise Formulas' | 'Review Mistakes' | 'Break' | 'Solve Mock';
  taskName: string;
  duration: number;         // in minutes
  originalDuration?: number;
  linkedSessionId?: string;
  date?: string;            // YYYY-MM-DD
  scheduledDate?: string;   // ISO YYYY-MM-DD
  scheduledTime?: string;   // HH:MM e.g. '07:00'
  timeSlot?: string;
  isManualOverride?: boolean;
  completed: boolean;
  xp: number;
  partialXpAwarded?: number;
  unlocked: boolean;
  priorityScore?: number;
  expectedMarksGain?: number;
  expectedLearningGain?: number;
  dependencyValue?: number;
  targetPYQs?: number;
  revisionContribution?: number;
  selectionReason?: string;
  originalTimeSlot?: string;
  xpEarned?: number;

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
  chapterId?: string;
  tags?: string[];
}

export interface SessionAnalytics {
  studyTime: number;
  focusTime: number;
  idleTime: number;
  breakTime: number;
  questionsSolved: number;
  accuracy: number;
  tasksCompleted: number;
  xpEarned: number;
  dailyAnalytics?: Array<{
    date: string;
    studyTime: number;
    questionsSolved?: number;
    accuracy?: number;
    xpEarned?: number;
  }>;
}

export interface XPState {
  daily: number;
  weekly: number;
  monthly?: number;
  total: number;
  level: number;
  streak: number;
  nextLevelXP: number;
  lastActiveDate?: string;
}

export interface Mistake {
  id: string;
  subject: SubjectId;
  chapter: string;
  chapterId?: string;
  topic: string;
  subtopic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'JEE Main' | 'JEE Advanced';
  source: string;
  timeTaken: number;
  correctMethod: string;
  studentMethod: string;
  mistakeTypes: string[];
  confidence: number;
  revisionSchedule: string;
  masteryImpact: 'High' | 'Medium' | 'Low';
  attemptNumber: number;
  revisionStatus: 'New' | 'Reviewed' | 'Solved Again' | 'Mastered';
  recoveryScore: number;
  teacherNotes: string;
  personalNotes: string;
  aiAdvice: string;
  priority: 'High' | 'Medium' | 'Low';
  dateLogged: string;
  questionText: string;
  correctSolution: string;
  correctSolutionImage?: string;
  wrongSolutionImage?: string;
  errorType?: string;
  description?: string;
  note?: string;
  correction?: string;
  explanation?: string;
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
  dailyTimeLimit: number;
  weights: {
    daysOverdue: number;
    confidence: number;
    importance: number;
    dependencies: number;
    mistakes: number;
  };
}

export interface StudySession {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
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

export interface MockResult {
  id: string;
  date: string;
  title: string;
  totalScore: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  duration: number;
  subjectBreakdown: Record<SubjectId, { score: number; attempted: number; correct: number }>;
  testSnapshot?: any;
  attemptData?: any;
}

export interface StudyRecommendation {
  type: 'Chapter' | 'Revision' | 'Mock' | 'MistakeReview';
  subjectId: SubjectId;
  targetId: string;
  priorityScore: number;
  reasoning: string;
  estimatedDuration: number;
}

export interface DailyCapacitySchedule {
  wakeUpTime: string;
  sleepTime: string;
  schoolHours: string;
  coachingHours: string;
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
  name?: string;
  userName?: string;
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
  dismissedPlannerMissionIds?: string[];
  scheduleOverrides?: Record<string, { 
    dayIndex?: number; 
    timeSlot?: string; 
    scheduledDate?: string; 
    scheduledTime?: string 
  }>;
  bookmarkedFormulaIds?: string[];
  settings: {
    targetYear: string;
    dreamIit: string;
    targetBranch: string;
    dailyQuota: number;
    showStatusInBar: boolean;
    soundEffects: boolean;
    desktopNotifications: boolean;
    volume: number;
    cockpitVolume?: number;
    pauseOnTabChange?: boolean;
    migratedToPristine?: boolean;
    revisionSettings?: RevisionSettings;
    prerequisiteEnforcementStrategy?: 'strict' | 'parallel';
    enableGodMode?: boolean;
    enableHardBedtimeCap?: boolean;
    dayStartTime?: string;
    dayEndTime?: string;
    minStreakHours?: number;
    enablePomodoroCasino?: boolean;
    sessionExtensionDate?: string;
    sessionExtensionEnd?: string;
    themeMode?: 'evangelion' | 'modern';
    focusSubject?: SubjectId;
  };
}

export type UserSettings = UserProfile['settings'];
export type StudentProfile = UserProfile;
