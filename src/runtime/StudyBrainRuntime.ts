import { toLocalDateString } from '@/utils/dateUtils';
import { 
  Chapter, TodayMission, TimelineBlock, Note, StudySession, MockResult, 
  Mistake, XPState, SessionAnalytics, SubjectId, RevisionSettings, UserProfile, MentorProfile
} from '../types/index';
import { MockTest } from '@/types/mockTest';
import { mockTest1 } from '@/data/mockTests/jeeMain2024Shift1';
import { 
  KnowledgeEngine, 
  SyllabusNode, 
  PlannerEngine, 
  OptimizationEngine, 
  AnalyticsEngine, 
  AnalyticsInput, 
  AnalyticsOutput,
  CoachEngine, 
  CoachInput, 
  CoachOutput,
  ChapterInfoEngine, 
  ChapterTelemetry,
  RevisionEngine, 
  RevisionEngineOutput 
} from '@jee-os/engines';
import type { PlannerInput, PlannerOutput, WeeklyBlock } from '@jee-os/engines';
import type { OptimizationInput, OptimizationResult } from '@jee-os/engines';
import { StudyBrainService, createSyllabusGraph } from '@/services/studyBrainService';
import { RevisionCard } from '@/services/revisionEngineService';
import { synthesizeDailyMissionsAndTimeline } from './timelineSynthesizer';

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
    revisionSettings?: RevisionSettings;
    migratedToPristine?: boolean;
    prerequisiteEnforcementStrategy?: 'strict' | 'parallel';
    enableGodMode?: boolean;
    dayStartTime?: string;
    dayEndTime?: string;
    minStreakHours?: number;
    enablePomodoroCasino?: boolean;
    themeMode?: 'evangelion' | 'modern';
    focusSubject?: SubjectId;
  };
  weeklyGoals?: {
    weekIndex: number;
    title: string;
    focus: string;
    status: 'Completed' | 'Active' | 'Upcoming';
  }[];

  knowledgeGraph: SyllabusNode[];
  plannerOutput: PlannerOutput | null;
  optimizationResult: OptimizationResult | null;
  analyticsSummary: AnalyticsOutput | null;
  coachAnalysis: CoachOutput | null;
  revisionTelemetry: RevisionEngineOutput | null;
  revisionQueue: RevisionCard[];
  todayMissions: TodayMission[];
  customMissions: TodayMission[];
  weeklySchedule: WeeklyBlock[]; // WeeklyBlock[]
  scheduleOverrides: Record<string, { dayIndex?: number; timeSlot?: string; scheduledDate?: string; scheduledTime?: string }>;


  // 1. All Derived Computations (No duplicated logic in UI)
  dashboardSummary: { syllabusCompletion: number; daysUntilExam: number; } | null;
  completionPrediction: OptimizationResult | null;
  subjectPriorities: Chapter[];
  syllabusProgress: {
    physics: { percentage: number; masteredCount?: number; totalCount?: number; completed: number; total: number; };
    chemistry: { percentage: number; masteredCount?: number; totalCount?: number; completed: number; total: number; };
    maths: { percentage: number; masteredCount?: number; totalCount?: number; completed: number; total: number; };
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

  chaptersWithData: { chapter: Chapter, data: ReturnType<typeof StudyBrainService['getChapterCommandCenterData']> }[];

  loading: boolean;
  initializationError?: string | null;
  lastSyncError?: string | null;
  deletedMissionIds?: string[];
  completedPlannerMissionIds?: string[];
  dismissedPlannerMissionIds?: string[];
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
  public plannerEngine?: PlannerEngine | null;
  public optimizationEngine?: OptimizationEngine | null;
  
  // Total engine runtime
  private totalEngineRuntimeMs: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private prevMemoState: {
    chapters?: Chapter[];
    mistakes?: Mistake[];
    sessions?: StudySession[];
    mocks?: MockResult[];
    settings?: StudyBrainState['settings'];
    timeline?: TimelineBlock[];
    mentorProfile?: MentorProfile;
    todayMissions?: TodayMission[];
    energyLevel?: 'High' | 'Medium' | 'Low';
  } = {};

  private constructor() {
    this.chapterInfoEngine = new ChapterInfoEngine();
    this.revisionEngine = new RevisionEngine();
    this.state = this.getInitialState();
    const tokenProvider = async () => {
      try {
        const { auth } = await import('@/firebase');
        return auth?.currentUser?.getIdToken() ?? null;
      } catch {
        return null;
      }
    };
    CoachEngine.setTokenProvider(tokenProvider);
    this.coachEngine = new CoachEngine({ tokenProvider });
    this.analyticsEngine = new AnalyticsEngine();
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
      customMockTests: [mockTest1],
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
        dailyQuota: 6,
        showStatusInBar: true,
        soundEffects: false,
        desktopNotifications: false,
        volume: 75,
        cockpitVolume: 75,
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
      weeklySchedule: [],
      scheduleOverrides: {},
      bookmarkedFormulaIds: [],
      
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

  public resetToInitialState() {
    this.state = this.getInitialState();
    this.state.writeBlocked = true;
    this.state.loading = false;
    this.prevMemoState = {};
    this.totalEngineRuntimeMs = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.plannerEngine = null;
    this.optimizationEngine = null;
    this.knowledgeEngine?.invalidateCache();
    this.chapterInfoEngine.invalidateCache();
    this.notifySubscribers();
  }

  public dispose() {
    this.isDisposed = true;
    this.subscribers.clear();
    this.pendingRejecters.forEach(rej => {
      try { rej(new Error('StudyBrainRuntime disposed')); } catch {}
    });
    this.pendingResolvers = [];
    this.pendingRejecters = [];
    this.pendingReasons.clear();
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.isProcessingRefresh = false;
    if (this.levelUpTimeout) {
      clearTimeout(this.levelUpTimeout);
      this.levelUpTimeout = null;
    }
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

  /**
   * Fine-grained rollback that restores only the specific chapter that failed,
   * avoiding clobbering concurrent optimistic updates to other chapters.
   */
  public rollbackChapter(chapterId: string, fallbackChapter: Chapter | null) {
    const currentChapters = this.state.chapters;
    const newChapters = fallbackChapter
      ? currentChapters.map(c => c.id === chapterId ? fallbackChapter : c)
      : currentChapters.filter(c => c.id !== chapterId);
    this.state = { ...this.state, chapters: newChapters };
    this.notifySubscribers();
  }

  /**
   * Fine-grained rollback that restores only the specific mission that failed,
   * avoiding clobbering concurrent optimistic updates to other missions.
   */
  public rollbackMission(missionId: string, fallbackMission: TodayMission | null) {
    const currentMissions = this.state.todayMissions;
    const newMissions = fallbackMission
      ? currentMissions.map(m => m.id === missionId ? fallbackMission : m)
      : currentMissions.filter(m => m.id !== missionId);
    this.state = { ...this.state, todayMissions: newMissions };
    this.notifySubscribers();
  }

  // Hide initialization and mutation behind the scenes
  // The public API requires this to be part of `refresh` or `initialize`
  public async initialize(data: Partial<StudyBrainState>) {
    this.state = { ...this.state, ...data };
    await this.refresh('INIT');
  }

  // For optimistic updates, they can pass partial state
  
  private isProcessingRefresh: boolean = false;
  private isDisposed: boolean = false;
  private levelUpTimeout: NodeJS.Timeout | null = null;
  
  private refreshTimer: NodeJS.Timeout | null = null;
  private pendingReasons = new Set<RefreshTriggers>();
  private pendingResolvers: Array<(value: void) => void> = [];
  private pendingRejecters: Array<(reason?: any) => void> = [];

  public async refresh(reason: RefreshTriggers, optimisticData?: Partial<StudyBrainState>) {
    if (this.isDisposed) {
      console.warn('[StudyBrainRuntime] Refresh called on disposed instance');
      return Promise.resolve();
    }

    if (optimisticData) {
      this.updateStateOptimistic(optimisticData);
    }

    return new Promise<void>((resolve, reject) => {
      this.pendingReasons.add(reason);
      this.pendingResolvers.push(resolve);
      this.pendingRejecters.push(reject);

      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }

      this.refreshTimer = setTimeout(() => {
        this.processDebouncedRefresh();
      }, 0);
    });
  }

  private async processDebouncedRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.isDisposed || this.pendingReasons.size === 0) {
      return;
    }

    if (this.isProcessingRefresh) {
      if (!this.refreshTimer) {
        this.refreshTimer = setTimeout(() => {
          this.refreshTimer = null;
          this.processDebouncedRefresh();
        }, 100);
      }
      return;
    }

    this.isProcessingRefresh = true;
    
    // Snapshot the current pending batch
    const reasons = Array.from(this.pendingReasons);
    const resolvers = [...this.pendingResolvers];
    const rejecters = [...this.pendingRejecters];
    this.pendingReasons.clear();
    this.pendingResolvers = [];
    this.pendingRejecters = [];

    let refreshError: unknown = null;
    try {
      // Pick the most impactful reason, or just the first one since executeRefresh is delta-aware
      const mainReason = reasons.includes('SETTINGS_UPDATE') ? 'SETTINGS_UPDATE' : reasons[0];
      await this.executeRefresh(mainReason);
    } catch (error) {
      console.error('[StudyBrainRuntime] Refresh failed:', error);
      refreshError = error;
    } finally {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
      this.isProcessingRefresh = false;
      // Propagate result to all waiters for this batch
      if (refreshError) {
        rejecters.forEach(rej => rej(refreshError));
      } else {
        resolvers.forEach(r => r());
      }

      // If more came in while we were processing, kick off another cycle
      if (this.pendingReasons.size > 0) {
        this.processDebouncedRefresh();
      }
    }
  }

  private async executeRefresh(reason: RefreshTriggers) {
    const currentState = this.state;

    const prevSettings = this.prevMemoState.settings;
    const currSettings = currentState.settings;
    const prevEnergy = this.prevMemoState.energyLevel;
    const currEnergy = currentState.energyLevel;
    const energyChanged = Boolean(prevEnergy && prevEnergy !== currEnergy);

    const settingsChangedForPlanner = !prevSettings || !currSettings ||
      prevSettings.targetYear !== currSettings.targetYear ||
      prevSettings.dailyQuota !== currSettings.dailyQuota ||
      energyChanged ||
      this.prevMemoState.mentorProfile?.subjectSplitStrategy !== currentState.mentorProfile?.subjectSplitStrategy ||
      this.prevMemoState.mentorProfile?.twoDaySplitConfig !== currentState.mentorProfile?.twoDaySplitConfig ||
      prevSettings.prerequisiteEnforcementStrategy !== currSettings.prerequisiteEnforcementStrategy;

    const stateChanged = {
      chapters: currentState.chapters !== this.prevMemoState.chapters,
      mistakes: currentState.mistakes !== this.prevMemoState.mistakes,
      sessions: currentState.studySessions !== this.prevMemoState.sessions,
      mocks: currentState.mocks !== this.prevMemoState.mocks,
      settings: settingsChangedForPlanner,
      timeline: currentState.timeline !== this.prevMemoState.timeline,
      todayMissions: currentState.todayMissions !== this.prevMemoState.todayMissions,
      energy: energyChanged,
    };
    
    this.prevMemoState = {
      chapters: currentState.chapters,
      mistakes: currentState.mistakes,
      sessions: currentState.studySessions,
      mocks: currentState.mocks,
      settings: currentState.settings,
      timeline: currentState.timeline,
      mentorProfile: currentState.mentorProfile,
      todayMissions: currentState.todayMissions,
      energyLevel: currentState.energyLevel,
    };

    const startTime = performance.now();
    const engineTimes: Record<string, number> = {};

    const invalidatedEngines: string[] = [];

    // 0. ChapterInfo Engine (Centralized Chapter Telemetry Brain)
    let chapterTelemetryMap = this.state.chapterTelemetryMap;
    let revisionTelemetry = this.state.revisionTelemetry;

    if (reason === 'INIT' || stateChanged.chapters || stateChanged.sessions || stateChanged.mistakes || stateChanged.mocks || stateChanged.settings) {
      const ciStart = performance.now();
      chapterTelemetryMap = this.chapterInfoEngine.generateChapterTelemetry({
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
      revisionTelemetry = this.revisionEngine.generateRevisionTelemetry({
        chapters: this.state.chapters,
        chapterTelemetryMap,
        sessions: this.state.studySessions,
        mistakes: this.state.mistakes,
        notes: this.state.notes
      });
      engineTimes['RevisionEngine'] = performance.now() - rStart;
      invalidatedEngines.push('RevisionEngine');
    }

    // 1. Knowledge Engine
    let knowledgeGraph = this.state.knowledgeGraph;
    if (reason === 'INIT' || stateChanged.chapters) {
      const kStart = performance.now();
      const nodes = createSyllabusGraph(this.state.chapters);
      this.knowledgeEngine = new KnowledgeEngine(nodes);
      knowledgeGraph = nodes; 
      engineTimes['KnowledgeEngine'] = performance.now() - kStart;
      invalidatedEngines.push('KnowledgeEngine');
      this.cacheMisses++;
    } else {
      this.cacheHits++;
    }

    // 2. Analytics Engine
    let analyticsSummary = this.state.analyticsSummary;
    if (reason === 'INIT' || stateChanged.chapters || stateChanged.sessions || stateChanged.mocks || stateChanged.mistakes) {
      const aStart = performance.now();
      
      // Unconditional Global Compute (Architectural Fix 1.2)
      // The Analytics Engine should always compute global state. 
      // Sub-filtering belongs at the UI/Selector level, not at data-ingestion.
      const analyticsInput: AnalyticsInput = {
        chapters: this.state.chapters,
        sessions: this.state.studySessions,
        mocks: this.state.mocks,
        mistakes: this.state.mistakes,
        chapterTelemetryMap
      };
      analyticsSummary = this.analyticsEngine!.generateAnalytics(analyticsInput);
      engineTimes['AnalyticsEngine'] = performance.now() - aStart;
      invalidatedEngines.push('AnalyticsEngine');
      this.cacheMisses++;
    } else {
      this.cacheHits++;
    }

    // 3. Planner Engine & Optimization Engine (Unconditionally optimize to keep everything in sync)
    const pStart = performance.now();
    let plannerOutput = this.state.plannerOutput;
    let optimizationResult = this.state.optimizationResult;
    let completionPrediction = this.state.completionPrediction;
    let weeklySchedule = this.state.weeklySchedule;
    let todayMissions = this.state.todayMissions;
    let timeline = this.state.timeline;

    const shouldRerunPlanner = reason === 'INIT' || 
      !this.plannerEngine || 
      !plannerOutput || 
      stateChanged.chapters || 
      stateChanged.sessions || 
      stateChanged.mistakes || 
      stateChanged.settings ||
      stateChanged.todayMissions;

    if (this.knowledgeEngine && shouldRerunPlanner) {
      if (!this.plannerEngine || reason === 'INIT' || stateChanged.chapters || stateChanged.sessions || stateChanged.mistakes || stateChanged.settings) {
        this.plannerEngine = new PlannerEngine(this.knowledgeEngine);
      }
      if (!this.optimizationEngine || reason === 'INIT' || stateChanged.chapters || stateChanged.sessions || stateChanged.mistakes || stateChanged.settings) {
        this.optimizationEngine = new OptimizationEngine(this.knowledgeEngine);
      }
      
      // Realistic base daily study hours (typical JEE prep is 4h - 6h)
      const rawQuota = this.state.settings?.dailyQuota || this.state.mentorProfile?.dailyAvailableHours || 4.5;
      const baseDailyHours = (rawQuota > 14) ? 4.5 : Math.max(2.0, rawQuota);

      // Energy sets the intensity of the day based on baseDailyHours
      // High = 125% of available time (push harder), Medium = 100% (normal day), Low = 50% (rest day)
      const energyMultiplier = this.state.energyLevel === 'Low' ? 0.5 : this.state.energyLevel === 'Medium' ? 1.0 : 1.25;
      const totalDailyQuotaHours = Math.min(14, Math.max(1.0, Math.round(baseDailyHours * energyMultiplier * 10) / 10));

      // Calculate time already consumed by completed or custom missions
      const preservedMissionsForQuota = [
        ...this.state.customMissions,
        ...this.state.todayMissions.filter(m => m.completed)
      ];
      // Only count missions that weren't dismissed
      const consumedMinutes = preservedMissionsForQuota
        .filter(m => !m.dismissed)
        .reduce((acc, m) => acc + (m.duration || 0), 0);
      
      const consumedHours = consumedMinutes / 60;
      const effectiveStudyHours = Math.max(0, totalDailyQuotaHours - consumedHours);

      const revisionBacklog = (revisionTelemetry?.overdueChapters || []).map(ch => {
        const lastDate = ch.lastRevisionDate ? new Date(ch.lastRevisionDate).getTime() : 0;
        const daysOverdue = lastDate > 0 
          ? Math.max(1, Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24))) 
          : 7;
        return {
          chapterId: ch.chapterId,
          daysOverdue,
          retentionScore: ch.retentionScore ?? 0
        };
      });

      const activeFocusSubject = this.state.settings.focusSubject || 
        this.state.mentorProfile?.roadmap?.weeklyTargets?.find(w => w.status === 'active')?.focusSubject;

      const plannerInput: PlannerInput = {
        studyHours: effectiveStudyHours, 
        chapterTelemetryMap,
        revisionBacklog, 
        userPreferences: {
          targetYear: this.state.settings.targetYear,
          focusSubject: activeFocusSubject, 
          dailyQuota: effectiveStudyHours,
          subjectSplitStrategy: this.state.mentorProfile?.subjectSplitStrategy,
          twoDaySplitConfig: this.state.mentorProfile?.twoDaySplitConfig,
          prerequisiteEnforcementStrategy: this.state.settings.prerequisiteEnforcementStrategy
        },
        remainingDaysUntilJEE: StudyBrainService.getDaysUntilExam(this.state.settings.targetYear),
        studySessions: this.state.studySessions,
        todayMissions: this.state.todayMissions,
        chapters: this.state.chapters,
        mistakes: this.state.mistakes,
        currentDate: toLocalDateString()
      };
      plannerOutput = this.plannerEngine.generateDailyPlan(plannerInput);
      
      const targetCompletionDate = this.state.settings.targetYear + "-01-24T00:00:00.000Z";
      const pastWeekHours = analyticsSummary?.studyHoursPastWeek || [4, 4, 4, 4, 4, 4, 4];
      const optInput: OptimizationInput = {
        plannerInput,
        targetCompletionDate, 
        actualStudyHoursPastWeek: pastWeekHours,
        skippedTasks: []
      };
      const optResult = this.optimizationEngine.optimize(optInput);
      optimizationResult = optResult;
      completionPrediction = optResult;
      
      // Simplified mission state synchronization with clear priority order
      const existingMissionsMap = new Map(this.state.todayMissions.map(m => [m.id, m]));
      
      // Priority 1: User's custom missions (highest priority - user explicit intent)
      const todayStr = toLocalDateString();
      const userCustomMissions = this.state.customMissions.filter(m => {
        const mDate = m.scheduledDate || m.date;
        if (!mDate) return true; // if no date, assume today
        return mDate <= todayStr;
      });

      // Priority 2: AI-generated missions (medium priority)
      const aiMissions = this.state.todayMissions.filter(m => {
        if (!m.id.startsWith('mission-ai-')) return false;
        if (userCustomMissions.some(uc => uc.id === m.id)) return false;
        
        // Filter out AI missions if their chapter was put on hold
        const chap = this.state.chapters.find(c => c.name === m.chapter || c.id === m.chapterId);
        if (chap) {
          if (chap.chapterOnHold) return false;
          if (chap.dppOnHold && m.taskName?.toLowerCase().includes('dpp')) return false;
          if (chap.pyqOnHold && m.taskName?.toLowerCase().includes('pyq')) return false;
        }
        return true;
      });

      // Priority 3: Planner-generated missions (lowest priority - system suggestions)
      const plannerMissions = (plannerOutput?.todaysMission || []).map(t => {
        // Bug 4.2: Preserve user edits to planner tasks. If it already exists in state,
        // return the exact existing object so duration/timeSlot edits aren't wiped out by refresh.
        // UNLESS energy level changed, in which case we rebalance according to the new energy quota.
        if (!energyChanged) {
          const existing = existingMissionsMap.get(t.id);
          if (existing) return existing;
        }

        return {
          id: t.id,
          subject: t.subjectId as SubjectId,
          chapter: t.chapterName,
          type: t.type,
          taskName: t.taskName,
          duration: t.duration,
          completed: false,
          dismissed: (this.state.dismissedPlannerMissionIds || []).includes(t.id),
          xp: Math.round(t.priorityScore),
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
        };
      }).filter(pm => !userCustomMissions.some(uc => uc.id === pm.id) && !aiMissions.some(ai => ai.id === pm.id));

      // Combine missions in priority order (later entries override earlier ones if same ID)
      const allMissions = [
        ...this.state.todayMissions.filter(m => m.completed || m.dismissed || m.isManualOverride || m.id.startsWith('mission-adv-') || m.id.startsWith('mission-eng-')), // Preserved completed/dismissed/manual missions
        ...plannerMissions,    // System suggestions (base layer)
        ...aiMissions,         // AI suggestions (override planner)
        ...userCustomMissions  // User explicit intent (highest priority)
      ];

      // Remove duplicates by ID and filter out deleted IDs
      const deletedIds = new Set(this.state.deletedMissionIds || []);
      const uniqueMissions = new Map<string, TodayMission>();
      for (const m of allMissions) {
        if (!deletedIds.has(m.id)) {
          const existing = uniqueMissions.get(m.id);
          const isCompletedInState = m.completed || 
            existing?.completed || 
            existingMissionsMap.get(m.id)?.completed || 
            (this.state.completedPlannerMissionIds || []).includes(m.id);

          // Never let an uncompleted candidate overwrite a completed task
          if (existing && existing.completed && !m.completed) {
            continue;
          }

          const isUnlockedInState = m.unlocked || existing?.unlocked || existingMissionsMap.get(m.id)?.unlocked;
          const finalMission = { 
            ...(existing || {}),
            ...m, 
            ...(isCompletedInState && { completed: true }),
            ...(isUnlockedInState && { unlocked: true })
          };
          uniqueMissions.set(m.id, finalMission);
        }
      }

      const synthesized = synthesizeDailyMissionsAndTimeline({
        uniqueMissions,
        userCustomMissions,
        energyChanged,
        totalDailyQuotaHours,
        chapters: this.state.chapters,
        weeklySchedule: this.state.weeklySchedule,
        deletedMissionIds: this.state.deletedMissionIds || [],
        scheduleOverrides: this.state.scheduleOverrides || {},
        completedPlannerMissionIds: this.state.completedPlannerMissionIds || [],
        timeline: this.state.timeline,
        settings: this.state.settings,
        mentorProfile: this.state.mentorProfile,
        energyLevel: this.state.energyLevel
      });
      todayMissions = synthesized.todayMissions;
      weeklySchedule = synthesized.weeklySchedule;
      timeline = synthesized.timeline;

      engineTimes['PlannerAndOptimization'] = performance.now() - pStart;
      invalidatedEngines.push('PlannerEngine');
      this.cacheMisses++;
    } else {
      this.cacheHits++;
    }

    // 4. Revision Engine
    let revisionQueue = this.state.revisionQueue;
    if (reason === 'INIT' || stateChanged.mistakes || stateChanged.chapters || stateChanged.settings) {
      const rStart = performance.now();
      revisionQueue = StudyBrainService.getRevisionQueue(
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
    const dashboardSummary = StudyBrainService.getDashboardSummary(this.state.chapters, this.state.settings.targetYear);
    const subjectPriorities = StudyBrainService.sortChaptersByRecommendation(this.state.chapters, this.state.mistakes).slice(0, 3);
    
    // Syllabus Progress with precise mastered count tracking
    const syllabusProgress: StudyBrainState['syllabusProgress'] = {
      physics: {
        ...StudyBrainService.calculateSubjectCompletion(this.state.chapters, 'physics'),
        masteredCount: this.state.chapters.filter(c => c.subject === 'physics' && (c.status === 'Mastered' || (typeof c.completion === 'number' && c.completion >= 100))).length,
        totalCount: this.state.chapters.filter(c => c.subject === 'physics').length,
      },
      chemistry: {
        ...StudyBrainService.calculateSubjectCompletion(this.state.chapters, 'chemistry'),
        masteredCount: this.state.chapters.filter(c => c.subject === 'chemistry' && (c.status === 'Mastered' || (typeof c.completion === 'number' && c.completion >= 100))).length,
        totalCount: this.state.chapters.filter(c => c.subject === 'chemistry').length,
      },
      maths: {
        ...StudyBrainService.calculateSubjectCompletion(this.state.chapters, 'maths'),
        masteredCount: this.state.chapters.filter(c => c.subject === 'maths' && (c.status === 'Mastered' || (typeof c.completion === 'number' && c.completion >= 100))).length,
        totalCount: this.state.chapters.filter(c => c.subject === 'maths').length,
      },
    };

    const daysRemaining = StudyBrainService.getDaysUntilExam(this.state.settings.targetYear);

    // Compute Risk Profile
    const avgMastery = this.state.chapters.reduce((sum, c) => {
      const cMistakes = (this.state.mistakes || []).filter(m => m.chapter === c.name && m.revisionStatus !== 'Mastered').length;
      const comp = typeof c.completion === 'number' && !isNaN(c.completion) ? c.completion : 0;
      const completionPart = Math.min(100, Math.max(0, comp));
      const mistakePenalty = Math.min(30, cMistakes * 5);
      return sum + Math.max(0, completionPart - mistakePenalty);
    }, 0) / (this.state.chapters.length || 1);
    const safeAvgMastery = isNaN(avgMastery) ? 0 : avgMastery;
    const accuracy = typeof this.state.analytics?.accuracy === 'number' && !isNaN(this.state.analytics.accuracy)
      ? this.state.analytics.accuracy
      : 0;
    const questionsSolved = this.state.analytics?.questionsSolved || 0;
    const rawReadiness = Math.round(safeAvgMastery * 0.7 + (questionsSolved > 0 ? accuracy * 0.3 : 25));
    const estimatedReadinessScore = isNaN(rawReadiness) ? 25 : Math.max(10, Math.min(100, rawReadiness));
    const projectedReadiness = estimatedReadinessScore;

    const getSubjectMastery = (sub: string) => {
      const subChaps = this.state.chapters.filter(c => c.subject === sub);
      if (subChaps.length === 0) return 0;
      const totalM = subChaps.reduce((acc, c) => {
        const cMistakes = (this.state.mistakes || []).filter(m => m.chapter === c.name && m.revisionStatus !== 'Mastered').length;
        const comp = typeof c.completion === 'number' && !isNaN(c.completion) ? c.completion : 0;
        const completionPart = Math.min(100, Math.max(0, comp));
        const mistakePenalty = Math.min(30, cMistakes * 5);
        return acc + Math.max(0, completionPart - mistakePenalty);
      }, 0);
      const res = subChaps.length > 0 ? totalM / subChaps.length : 0;
      return isNaN(res) ? 0 : res;
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
    
    const riskProfile = {
      estimatedReadinessScore,
      highestRiskSubject,
      highestRiskChapters: subjectPriorities
    };

    // Compute remaining study hours and questions
    const incompleteMissions = todayMissions.filter(m => !m.completed);

    const dayStartTime = this.state.settings?.dayStartTime || '07:00';
    const dayEndTime = this.state.settings?.dayEndTime || '23:00';
    const parseTimeVal = (val: string | undefined, fallback: number) => {
      const p = parseInt(val || '', 10);
      return isNaN(p) ? fallback : p;
    };
    let endHour = parseTimeVal(dayEndTime.split(':')[0], 23);
    let endMinute = parseTimeVal(dayEndTime.split(':')[1], 0);
    let logicalEndHour = endHour;
    const startHourVal = parseTimeVal(dayStartTime.split(':')[0], 7);
    if (logicalEndHour < startHourVal) {
      logicalEndHour += 24;
    }
    const endMinsTotal = logicalEndHour * 60 + endMinute;

    const now = new Date();
    let logicalRealCurrentHour = now.getHours();
    if (logicalRealCurrentHour < (parseInt(dayStartTime.split(':')[0]) || 7)) {
      logicalRealCurrentHour += 24;
    }
    const nowMins = logicalRealCurrentHour * 60 + now.getMinutes();

    let curPushMins = nowMins;
    const validIncomplete = incompleteMissions.filter(m => {
      const duration = m.duration || 60;
      const start = curPushMins;
      curPushMins += duration;
      return start < endMinsTotal;
    });
    
    const studyMins = validIncomplete
      .filter(m => m.type !== 'Break' && (m.subject as string) !== 'break')
      .reduce((acc, curr) => acc + (curr.duration || 0), 0);
      
    const totalMinsIncludingBreaks = validIncomplete.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      
    const estimatedRemainingHours = (studyMins / 60).toFixed(1);

    const plannedQuestions = validIncomplete.reduce((acc, curr) => {
      if (curr.type === 'Solve PYQs') return acc + 15;
      if (curr.type === 'Solve DPP') return acc + 10;
      return acc;
    }, 0);

    const finishDate = new Date();
    // Add 5 min buffer per mission for transitions, breaks are already included in totalMinsIncludingBreaks
    finishDate.setMinutes(finishDate.getMinutes() + totalMinsIncludingBreaks + (validIncomplete.length * 5)); 
    const targetFinishTime = finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Compute Chapter Data for UI
    const chaptersWithData = this.state.chapters.map(chapter => {
      return { 
        chapter, 
        data: StudyBrainService.getChapterCommandCenterData(chapter, this.state.chapters, this.state.mistakes) 
      };
    });

    engineTimes['UIComputation'] = performance.now() - uiStart;

    const totalDuration = performance.now() - startTime;
    this.totalEngineRuntimeMs += totalDuration;

    const diagnostics = {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      invalidatedEngines,
      refreshCause: reason,
      lastRefreshDuration: totalDuration,
      totalEngineRuntime: this.totalEngineRuntimeMs,
      engineExecutionTimes: engineTimes
    };

    // Atomic assignment of all computed derived state merged with latest state
    this.state = {
      ...this.state,
      chapterTelemetryMap,
      revisionTelemetry,
      knowledgeGraph,
      analyticsSummary,
      plannerOutput,
      optimizationResult,
      completionPrediction,
      weeklySchedule,
      todayMissions,
      timeline,
      revisionQueue,
      dashboardSummary,
      subjectPriorities,
      syllabusProgress,
      daysRemaining,
      projectedReadiness,
      riskProfile,
      estimatedRemainingHours,
      plannedQuestions,
      targetFinishTime,
      chaptersWithData,
      diagnostics,
      lastRefresh: new Date().toISOString()
    };

    // Clear levelUpData after it's been processed by subscribers
    if (this.state.levelUpData) {
      if (this.levelUpTimeout) clearTimeout(this.levelUpTimeout);
      // Keep it for one notification cycle, then clear
      this.levelUpTimeout = setTimeout(() => {
        this.state = { ...this.state, levelUpData: null };
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
          plannerDecisions: this.state.plannerOutput?.todaysMission || [],
          analyticsSummary: this.state.analyticsSummary,
          plannerOutput: undefined, // Strip massive payload
          chapters: this.state.chapters.filter(c => c.status !== 'Not Started' || c.completion > 0),
          studyHistory: undefined, // Strip massive payload
          remainingDays: this.state.daysRemaining,
          question: question,
          targetYear: this.state.settings?.targetYear,
          targetCollege: this.state.settings?.dreamIit,
          mockHistory: this.state.mocks
        };
        const analysis = await this.coachEngine.getAnalysis(coachInput);
        this.state = {
          ...this.state,
          coachAnalysis: analysis,
          coachMessage: analysis.analysis
        };
        this.notifySubscribers();
      } catch (e) {
        console.error("Coach analysis failed", e);
      }
    }
  }
}
