import { 
  Chapter, TodayMission, TimelineBlock, Note, StudySession, MockResult, 
  Mistake, XPState, SessionAnalytics, SubjectId, RevisionSettings, UserProfile, MentorProfile
} from '../types/index';
import { MockTest } from '../types/mockTest';
import { KnowledgeEngine, SyllabusNode } from '../engines/knowledge';
import { PlannerEngine, PlannerInput, PlannerOutput } from '../engines/planner';
import { OptimizationEngine, OptimizationInput, OptimizationResult } from '../engines/optimization';
import { AnalyticsEngine, AnalyticsInput, AnalyticsOutput } from '../engines/analytics';
import { CoachEngine, CoachInput, CoachOutput } from '../engines/coach';
import { ChapterInfoEngine, ChapterTelemetry } from '../engines/chapterInfo';
import { RevisionEngine, RevisionEngineOutput } from '../engines/revision';
import { StudyBrainService, createSyllabusGraph } from '../services/studyBrainService';
import { RevisionCard } from '../services/revisionEngineService';

export interface StudyBrainState {
  chapters: Chapter[];
  chapterTelemetryMap: Record<string, ChapterTelemetry>;
  activeEditChapterId: string | null;
  notes: Note[];
  studySessions: StudySession[];
  mocks: MockResult[];
  customMockTests: MockTest[];
  mistakes: Mistake[];
  timeline: TimelineBlock[];
  
  xp: XPState;
  analytics: SessionAnalytics;
  projectedReadiness: number;
  energyLevel: 'High' | 'Medium' | 'Low';
  coachMessage: string;
  activeSubject: SubjectId | 'all';
  radarFocusedChapter?: string;
  isMissionModeActive: boolean;
  mentorProfile?: MentorProfile;
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
    revisionSettings?: RevisionSettings;
    migratedToPristine?: boolean;
  };

  knowledgeGraph: SyllabusNode[];
  plannerOutput: PlannerOutput | null;
  optimizationResult: OptimizationResult | null;
  analyticsSummary: AnalyticsOutput | null;
  coachAnalysis: CoachOutput | null;
  revisionTelemetry: RevisionEngineOutput | null;
  revisionQueue: RevisionCard[];
  todayMissions: TodayMission[];
  customMissions: TodayMission[];

  // 1. All Derived Computations (No duplicated logic in UI)
  dashboardSummary: any;
  completionPrediction: any;
  subjectPriorities: Chapter[];
  syllabusProgress: {
    physics: { total: number, completed: number, percentage: number };
    chemistry: { total: number, completed: number, percentage: number };
    maths: { total: number, completed: number, percentage: number };
  };
  estimatedRemainingHours: string;
  plannedQuestions: number;
  targetFinishTime: string;
  daysRemaining: number;
  
  riskProfile: {
    estimatedReadinessScore: number;
    highestRiskSubject: 'Physics' | 'Chemistry' | 'Mathematics';
    highestRiskChapters: Chapter[];
  };

  chaptersWithData: { chapter: Chapter, data: any }[];

  loading: boolean;
  initializationError?: string | null;
  lastSyncError?: string | null;
  deletedMissionIds?: string[];
  writeBlocked?: boolean;
  lastRefresh: string | null;
  levelUpData?: { oldLevel: number; newLevel: number; xp: XPState } | null;
  
  // 3. Diagnostics
  diagnostics: {
    cacheHits: number;
    cacheMisses: number;
    invalidatedEngines: string[];
    refreshCause: string;
    lastRefreshDuration: number;
    totalEngineRuntime: number;
    engineExecutionTimes: Record<string, number>;
  };
}

export type RefreshTriggers = 'INIT' | 'CHAPTER_UPDATE' | 'MISTAKE_UPDATE' | 'SESSION_UPDATE' | 'MOCK_UPDATE' | 'SETTINGS_UPDATE';

export class StudyBrainRuntime {
  private static instance: StudyBrainRuntime;
  private state: StudyBrainState;
  private subscribers: Set<(state: StudyBrainState) => void> = new Set();

  private knowledgeEngine: KnowledgeEngine | null = null;
  private analyticsEngine: AnalyticsEngine;
  private coachEngine: CoachEngine | null = null;
  private chapterInfoEngine: ChapterInfoEngine;
  private revisionEngine: RevisionEngine;
  public plannerEngine?: any;
  public optimizationEngine?: any;
  
  // Total engine runtime
  private totalEngineRuntimeMs: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  private constructor() {
    this.chapterInfoEngine = new ChapterInfoEngine();
    this.revisionEngine = new RevisionEngine();
    this.state = this.getInitialState();
    this.analyticsEngine = new AnalyticsEngine();
    this.coachEngine = new CoachEngine();
  }

  public static getInstance(): StudyBrainRuntime {
    if (!StudyBrainRuntime.instance) {
      StudyBrainRuntime.instance = new StudyBrainRuntime();
    }
    return StudyBrainRuntime.instance;
  }

  private getInitialState(): StudyBrainState {
    return {
      chapters: [],
      chapterTelemetryMap: {},
      activeEditChapterId: null,
      notes: [],
      studySessions: [],
      mocks: [],
      customMockTests: [],
      mistakes: [],
      timeline: [],
      xp: { daily: 0, weekly: 0, total: 0, level: 1, streak: 0, nextLevelXP: 1000 },
      analytics: { studyTime: 0, focusTime: 0, idleTime: 0, breakTime: 0, questionsSolved: 0, accuracy: 0, tasksCompleted: 0, xpEarned: 0 },
      projectedReadiness: 0,
      energyLevel: 'Medium',
      coachMessage: 'Ready to study.',
      activeSubject: 'physics',
      isMissionModeActive: false,
      settings: {
        targetYear: '2027',
        dreamIit: 'IIT Bombay',
        targetBranch: 'Computer Science & Engineering',
        dailyQuota: 30,
        showStatusInBar: true,
        soundEffects: false,
        desktopNotifications: false,
        volume: 75,
        pauseOnTabChange: true,
      },
      knowledgeGraph: [],
      plannerOutput: null,
      optimizationResult: null,
      analyticsSummary: null,
      coachAnalysis: null,
      revisionTelemetry: null,
      revisionQueue: [],
      todayMissions: [],
      customMissions: [],
      
      dashboardSummary: null,
      completionPrediction: null,
      subjectPriorities: [],
      syllabusProgress: {
        physics: { total: 0, completed: 0, percentage: 0 },
        chemistry: { total: 0, completed: 0, percentage: 0 },
        maths: { total: 0, completed: 0, percentage: 0 }
      },
      estimatedRemainingHours: '0.0',
      plannedQuestions: 0,
      targetFinishTime: '',
      daysRemaining: 0,
      riskProfile: {
        estimatedReadinessScore: 0,
        highestRiskSubject: 'Physics',
        highestRiskChapters: []
      },
      
      chaptersWithData: [],

      loading: true,
      initializationError: null,
      writeBlocked: false,
      lastRefresh: null,
      levelUpData: null,
      diagnostics: {
        cacheHits: 0,
        cacheMisses: 0,
        invalidatedEngines: [],
        refreshCause: 'INIT',
        lastRefreshDuration: 0,
        totalEngineRuntime: 0,
        engineExecutionTimes: {}
      }
    };
  }

  public getState(): StudyBrainState {
    return this.state;
  }

  public subscribe(callback: (state: StudyBrainState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.state);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public dispose() {
    this.subscribers.clear();
  }

  private notifySubscribers() {
    for (const callback of this.subscribers) {
      callback(this.state);
    }
  }

  public updateStateOptimistic(data: Partial<StudyBrainState>) {
    this.state = { ...this.state, ...data };
    this.notifySubscribers();
  }

  // Hide initialization and mutation behind the scenes
  // The public API requires this to be part of `refresh` or `initialize`
  public async initialize(data: Partial<StudyBrainState>) {
    this.state = { ...this.state, ...data };
    await this.refresh('INIT');
  }

  // For optimistic updates, they can pass partial state
  public async refresh(reason: RefreshTriggers, optimisticData?: Partial<StudyBrainState>) {
    if (optimisticData) {
      this.state = { ...this.state, ...optimisticData };
    }

    const startTime = performance.now();
    const engineTimes: Record<string, number> = {};
    const invalidatedEngines: string[] = [];

    // 0. ChapterInfo Engine (Centralized Chapter Telemetry Brain)
    if (reason === 'INIT' || reason === 'CHAPTER_UPDATE' || reason === 'SESSION_UPDATE' || reason === 'MISTAKE_UPDATE') {
      const ciStart = performance.now();
      this.state.chapterTelemetryMap = this.chapterInfoEngine.generateChapterTelemetry({
        chapters: this.state.chapters,
        mistakes: this.state.mistakes,
        sessions: this.state.studySessions,
        mocks: this.state.mocks,
        settings: this.state.settings
      });
      engineTimes['ChapterInfoEngine'] = performance.now() - ciStart;
      invalidatedEngines.push('ChapterInfoEngine');

      // 0.5 Revision Engine (Spaced Repetition & Retention Scheduling Authority)
      const rStart = performance.now();
      this.state.revisionTelemetry = this.revisionEngine.generateRevisionTelemetry({
        chapters: this.state.chapters,
        chapterTelemetryMap: this.state.chapterTelemetryMap,
        sessions: this.state.studySessions,
        mistakes: this.state.mistakes
      });
      engineTimes['RevisionEngine'] = performance.now() - rStart;
      invalidatedEngines.push('RevisionEngine');
    }

    // 1. Knowledge Engine
    if (reason === 'INIT' || reason === 'CHAPTER_UPDATE') {
      const kStart = performance.now();
      const nodes = createSyllabusGraph(this.state.chapters);
      this.knowledgeEngine = new KnowledgeEngine(nodes);
      this.state.knowledgeGraph = nodes; 
      engineTimes['KnowledgeEngine'] = performance.now() - kStart;
      invalidatedEngines.push('KnowledgeEngine');
      this.cacheMisses++;
    } else {
      this.cacheHits++;
    }

    // 2. Analytics Engine
    if (reason === 'INIT' || reason === 'CHAPTER_UPDATE' || reason === 'SESSION_UPDATE' || reason === 'MOCK_UPDATE' || reason === 'MISTAKE_UPDATE') {
      const aStart = performance.now();
      
      // Compute subject specific filters inside engine input
      let filteredSessions = this.state.studySessions;
      let filteredChapters = this.state.chapters;
      if (this.state.activeSubject !== 'all') {
        filteredSessions = this.state.studySessions.filter(s => s.subjectId === this.state.activeSubject);
        filteredChapters = this.state.chapters.filter(c => c.subject === this.state.activeSubject);
      }

      const analyticsInput: AnalyticsInput = {
        chapters: filteredChapters,
        sessions: filteredSessions,
        mocks: this.state.mocks,
        mistakes: this.state.mistakes,
        chapterTelemetryMap: this.state.chapterTelemetryMap
      };
      this.state.analyticsSummary = this.analyticsEngine!.generateAnalytics(analyticsInput);
      engineTimes['AnalyticsEngine'] = performance.now() - aStart;
      invalidatedEngines.push('AnalyticsEngine');
      this.cacheMisses++;
    } else {
      this.cacheHits++;
    }

    // 3. Planner Engine & Optimization Engine (Unconditionally optimize to keep everything in sync)
    const pStart = performance.now();
    if (this.knowledgeEngine) {
      if (!this.plannerEngine || reason === 'INIT' || reason === 'CHAPTER_UPDATE') {
        this.plannerEngine = new PlannerEngine(this.knowledgeEngine);
      }
      if (!this.optimizationEngine || reason === 'INIT' || reason === 'CHAPTER_UPDATE') {
        this.optimizationEngine = new OptimizationEngine(this.knowledgeEngine);
      }
      
      // Sanitize dailyQuota: max possible study hours for JEE is ~14h, 
      // if corrupted state (e.g. 17.5) exists, cap it at 12h for sanity.
      let userQuota = this.state.settings.dailyQuota || 4;
      if (userQuota > 14) {
        userQuota = 12;
      }

      // Energy sets the intensity of the day based on max userQuota
      // High = 100% of available time, Medium = 75%, Low = 50%
      const energyMultiplier = this.state.energyLevel === 'Low' ? 0.5 : this.state.energyLevel === 'Medium' ? 0.75 : 1.0;
      const effectiveStudyHours = Math.min(14, Math.max(1.0, Math.round(userQuota * energyMultiplier * 10) / 10));

      const plannerInput: PlannerInput = {
        studyHours: effectiveStudyHours, 
        chapterTelemetryMap: this.state.chapterTelemetryMap,
        revisionBacklog: [], 
        userPreferences: {
          targetYear: this.state.settings.targetYear,
          focusSubject: this.state.settings.targetBranch ? undefined : undefined, 
          dailyQuota: effectiveStudyHours,
          subjectSplitStrategy: this.state.mentorProfile?.subjectSplitStrategy
        },
        remainingDaysUntilJEE: StudyBrainService.getDaysUntilExam(this.state.settings.targetYear),
        studySessions: this.state.studySessions,
        todayMissions: this.state.todayMissions,
        chapters: this.state.chapters,
        mistakes: this.state.mistakes,
        currentDate: new Date().toISOString()
      };
      this.state.plannerOutput = this.plannerEngine.generateDailyPlan(plannerInput);
      
      const targetCompletionDate = new Date(this.state.settings.targetYear + "-01-24").toISOString();
      const pastWeekHours = this.state.analyticsSummary?.studyHoursPastWeek || [4, 4, 4, 4, 4, 4, 4];
      const optInput: OptimizationInput = {
        plannerInput,
        targetCompletionDate, 
        actualStudyHoursPastWeek: pastWeekHours,
        skippedTasks: []
      };
      const optResult = this.optimizationEngine.optimize(optInput);
      this.state.optimizationResult = optResult;
      this.state.completionPrediction = optResult;
      
      // Directly map planner output into today's missions and preserve local complete checkboxes
      const existingMissionsMap = new Map(this.state.todayMissions.map(m => [m.id, m.completed]));
      const completedAiMissions = this.state.todayMissions.filter(m => m.id.startsWith('mission-ai-') && m.completed);
      const customAiMissions = this.state.todayMissions.filter(m => m.id.startsWith('mission-ai-') && !m.completed);

      this.state.todayMissions = [
        ...this.state.customMissions, // User's persistent custom missions
        ...completedAiMissions,       // Retain checked-off planner missions
        ...customAiMissions,          // Retain explicit AI assistant custom missions
        ...(this.state.plannerOutput?.todaysMission || []).map(t => ({
        id: t.id,
        subject: t.subjectId,
        chapter: t.chapterName,
        type: t.type,
        taskName: t.taskName,
        duration: t.duration,
        completed: existingMissionsMap.get(t.id) || false,
        xp: Math.round(t.priorityScore * 10),
        unlocked: true,
        priorityScore: t.priorityScore,
        expectedMarksGain: t.expectedMarksGain,
        expectedLearningGain: t.expectedLearningGain,
        dependencyValue: t.dependencyValue,
        revisionContribution: t.revisionContribution,
        selectionReason: t.selectionReason,
        whyThisTaskExists: t.reasoning?.whySelected || t.selectionReason,
        futureDependencies: t.reasoning?.dependentChapters || [],
        estimatedCompletionMinutes: t.duration,
        expectedJeeImpact: t.reasoning?.longTermImpact || `+${t.expectedMarksGain} Marks`,
        confidenceGainPercent: t.reasoning?.confidenceScorePercent || 85,
        reasoning: t.reasoning
      }))
      ];

      // Remove duplicates by ID and filter out user-deleted missions
      const deletedIds = new Set(this.state.deletedMissionIds || []);
      const uniqueMissions = new Map<string, TodayMission>();
      for (const m of this.state.todayMissions) {
        if (!uniqueMissions.has(m.id) && !deletedIds.has(m.id)) {
          uniqueMissions.set(m.id, m);
        }
      }
      this.state.todayMissions = Array.from(uniqueMissions.values());

      // Dynamically generate daily algorithmic timeline missions
      const customBlocks = this.state.timeline.filter(b => b.id.startsWith('custom-'));
      const generatedBlocks: TimelineBlock[] = [];
      let currentHour = 9;
      let currentMinute = 0;

      this.state.todayMissions.forEach((mission, idx) => {
        const startStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        currentMinute += mission.duration;
        while (currentMinute >= 60) {
          currentHour += 1;
          currentMinute -= 60;
        }
        const endStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        generatedBlocks.push({
          id: `mission-${mission.id}`,
          time: `${startStr} - ${endStr}`,
          subject: mission.subject as any,
          chapter: mission.chapter,
          activity: `${mission.type}: ${mission.taskName}`,
          completed: mission.completed
        });

        if (idx < this.state.todayMissions.length - 1) {
          const breakStart = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          currentMinute += 20;
          while (currentMinute >= 60) {
            currentHour += 1;
            currentMinute -= 60;
          }
          const breakEnd = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

          generatedBlocks.push({
            id: `break-${idx}`,
            time: `${breakStart} - ${breakEnd}`,
            subject: 'break' as any,
            chapter: 'Cognitive Disconnection',
            activity: 'Take a 20-minute break. Absolutely no social media feeds or high-intensity audio.',
            completed: false
          });
        }
      });
      this.state.timeline = [...customBlocks, ...generatedBlocks];
    }
    engineTimes['PlannerAndOptimization'] = performance.now() - pStart;
    invalidatedEngines.push('PlannerEngine');
    this.cacheMisses++;

    // 4. Revision Engine
    if (reason === 'INIT' || reason === 'MISTAKE_UPDATE' || reason === 'CHAPTER_UPDATE' || reason === 'SETTINGS_UPDATE') {
      const rStart = performance.now();
      this.state.revisionQueue = StudyBrainService.getRevisionQueue(
        this.state.chapters, 
        this.state.mistakes, 
        this.state.settings.revisionSettings
      );
      engineTimes['RevisionEngine'] = performance.now() - rStart;
      invalidatedEngines.push('RevisionEngine');
      this.cacheMisses++;
    } else {
      this.cacheHits++;
    }

    // 5. Precompute UI Derived States
    const uiStart = performance.now();
    this.state.dashboardSummary = StudyBrainService.getDashboardSummary(this.state.chapters, this.state.settings.targetYear);
    this.state.subjectPriorities = StudyBrainService.sortChaptersByRecommendation(this.state.chapters, this.state.mistakes).slice(0, 3);
    
    // Syllabus Progress with precise mastered count tracking
    this.state.syllabusProgress = {
      physics: StudyBrainService.calculateSubjectCompletion(this.state.chapters, 'physics'),
      chemistry: StudyBrainService.calculateSubjectCompletion(this.state.chapters, 'chemistry'),
      maths: StudyBrainService.calculateSubjectCompletion(this.state.chapters, 'maths'),
    };
    
    // Add exact mastered counts based on `isMastered` flag (or completion === 100)
    (this.state.syllabusProgress.physics as any).masteredCount = this.state.chapters.filter(c => c.subject === 'physics' && (c.status === 'Mastered' || c.completion >= 100)).length;
    (this.state.syllabusProgress.physics as any).totalCount = this.state.chapters.filter(c => c.subject === 'physics').length;
    (this.state.syllabusProgress.chemistry as any).masteredCount = this.state.chapters.filter(c => c.subject === 'chemistry' && (c.status === 'Mastered' || c.completion >= 100)).length;
    (this.state.syllabusProgress.chemistry as any).totalCount = this.state.chapters.filter(c => c.subject === 'chemistry').length;
    (this.state.syllabusProgress.maths as any).masteredCount = this.state.chapters.filter(c => c.subject === 'maths' && (c.status === 'Mastered' || c.completion >= 100)).length;
    (this.state.syllabusProgress.maths as any).totalCount = this.state.chapters.filter(c => c.subject === 'maths').length;

    this.state.daysRemaining = StudyBrainService.getDaysUntilExam(this.state.settings.targetYear);

    // Compute Risk Profile
    const avgMastery = this.state.chapters.reduce((sum, c) => {
      const cMistakes = this.state.mistakes.filter(m => m.chapter === c.name && m.revisionStatus !== 'Mastered').length;
      const completionPart = c.completion || 0;
      const mistakePenalty = Math.min(30, cMistakes * 5);
      return sum + Math.max(0, completionPart - mistakePenalty);
    }, 0) / (this.state.chapters.length || 1);
    const accuracy = this.state.analytics.accuracy || 0;
    const questionsSolved = this.state.analytics.questionsSolved || 0;
    const estimatedReadinessScore = Math.max(10, Math.min(100, Math.round(avgMastery * 0.7 + (questionsSolved > 0 ? accuracy * 0.3 : 25))));
    this.state.projectedReadiness = estimatedReadinessScore;

    const getSubjectMastery = (sub: string) => {
      const subChaps = this.state.chapters.filter(c => c.subject === sub);
      if (subChaps.length === 0) return 0;
      const totalM = subChaps.reduce((acc, c) => {
        const cMistakes = this.state.mistakes.filter(m => m.chapter === c.name && m.revisionStatus !== 'Mastered').length;
        const completionPart = c.completion || 0;
        const mistakePenalty = Math.min(30, cMistakes * 5);
        return acc + Math.max(0, completionPart - mistakePenalty);
      }, 0);
      return totalM / subChaps.length;
    };
    
    let highestRiskSubject: 'Physics' | 'Chemistry' | 'Mathematics' = 'Physics';
    let minMastery = getSubjectMastery('physics');
    
    const cMastery = getSubjectMastery('chemistry');
    if (cMastery < minMastery) {
      minMastery = cMastery;
      highestRiskSubject = 'Chemistry';
    }
    
    const mMastery = getSubjectMastery('maths');
    if (mMastery < minMastery) {
      highestRiskSubject = 'Mathematics';
    }
    
    this.state.riskProfile = {
      estimatedReadinessScore,
      highestRiskSubject,
      highestRiskChapters: this.state.subjectPriorities
    };

    // Compute remaining study hours and questions
    const incompleteMissions = this.state.todayMissions.filter(m => !m.completed);
    const totalMins = incompleteMissions.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    this.state.estimatedRemainingHours = (totalMins / 60).toFixed(1);

    this.state.plannedQuestions = incompleteMissions.reduce((acc, curr) => {
      if (curr.type === 'Solve PYQs') return acc + 15;
      if (curr.type === 'Solve DPP') return acc + 10;
      return acc;
    }, 0);

    const now = new Date();
    now.setMinutes(now.getMinutes() + totalMins + (incompleteMissions.length * 15)); // padding
    this.state.targetFinishTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Compute Chapter Data for UI
    this.state.chaptersWithData = this.state.chapters.map(chapter => {
      return { 
        chapter, 
        data: StudyBrainService.getChapterCommandCenterData(chapter, this.state.chapters, this.state.mistakes) 
      };
    });

    engineTimes['UIComputation'] = performance.now() - uiStart;

    const totalDuration = performance.now() - startTime;
    this.totalEngineRuntimeMs += totalDuration;

    this.state.diagnostics = {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      invalidatedEngines,
      refreshCause: reason,
      lastRefreshDuration: totalDuration,
      totalEngineRuntime: this.totalEngineRuntimeMs,
      engineExecutionTimes: engineTimes
    };

    this.state.lastRefresh = new Date().toISOString();

    // Clear levelUpData after it's been processed by subscribers
    if (this.state.levelUpData) {
      // Keep it for one notification cycle, then clear
      setTimeout(() => {
        this.state.levelUpData = null;
        this.notifySubscribers();
      }, 100);
    }

    this.notifySubscribers();
  }

  // Kept internally in runtime for testing/initialization, but rarely invoked by UI directly.
  public async runCoachAnalysis(question?: string) {
    if (this.coachEngine && this.state.analyticsSummary && this.state.plannerOutput) {
      try {
        const coachInput: CoachInput = {
          mission: this.state.todayMissions,
          weakTopics: this.state.mistakes.filter(m => m.revisionStatus !== 'Mastered'),
          revisionQueue: this.state.chapters.filter(c => c.status === 'Learning' || c.status === 'Theory Complete' || c.status === 'DPP Pending' || c.status === 'PYQ Pending'),
          // BUGFIX: this was hardcoded to `[]`, which — because empty arrays are truthy in
          // JS — always won out over the real `plannerOutput.todaysMission` fallback inside
          // CoachEngine, so the Coach never actually saw what the Planner scheduled.
          plannerDecisions: this.state.plannerOutput?.todaysMission || [],
          analyticsSummary: this.state.analyticsSummary,
          plannerOutput: this.state.plannerOutput,
          chapters: this.state.chapters,
          studyHistory: this.state.studySessions,
          remainingDays: this.state.daysRemaining,
          question: question,
          // BUGFIX: pass real student targets instead of relying on nonexistent
          // plannerOutput.targetYear/targetCollege fields.
          targetYear: this.state.settings?.targetYear,
          targetCollege: this.state.settings?.dreamIit,
          mockHistory: this.state.mocks
        };
        const analysis = await this.coachEngine.getAnalysis(coachInput);
        this.state.coachAnalysis = analysis;
        this.state.coachMessage = analysis.analysis;
        this.notifySubscribers();
      } catch (e) {
        console.error("Coach analysis failed", e);
      }
    }
  }
}
