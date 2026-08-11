import { toLocalDateString } from '@/utils/dateUtils';
import { 
  Chapter, TodayMission, TimelineBlock, Note, StudySession, MockResult, 
  Mistake, XPState, SessionAnalytics, SubjectId, RevisionSettings, UserProfile, MentorProfile
} from '../types/index';
import { ScheduledTask } from '@jee-os/engines/src/planner/types';
import { MockTest } from '@/types/mockTest';
import { KnowledgeEngine, SyllabusNode } from '@jee-os/engines';
import type { PlannerInput, PlannerOutput, WeeklyBlock } from '@jee-os/engines';
import type { OptimizationInput, OptimizationResult } from '@jee-os/engines';
import { AnalyticsEngine, AnalyticsInput, AnalyticsOutput } from '@jee-os/engines';
import { CoachEngine, CoachInput, CoachOutput } from '@jee-os/engines';
import { ChapterInfoEngine, ChapterTelemetry } from '@jee-os/engines';
import { RevisionEngine, RevisionEngineOutput } from '@jee-os/engines';
import { StudyBrainService, createSyllabusGraph } from '@/services/studyBrainService';
import { RevisionCard } from '@/services/revisionEngineService';

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
    enableGodMode?: boolean;
    dayStartTime?: string;
    dayEndTime?: string;
    minStreakHours?: number;
    enablePomodoroCasino?: boolean;
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
  private prevMemoState: {
    chapters?: Chapter[];
    mistakes?: Mistake[];
    sessions?: StudySession[];
    mocks?: MockResult[];
    settings?: any;
    timeline?: TimelineBlock[];
  } = {};

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
      weeklySchedule: [],
      scheduleOverrides: {},
      
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
    this.notifySubscribers();
  }

  public dispose() {
    this.isDisposed = true;
    this.subscribers.clear();
    this.refreshQueue = [];
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

  // Hide initialization and mutation behind the scenes
  // The public API requires this to be part of `refresh` or `initialize`
  public async initialize(data: Partial<StudyBrainState>) {
    this.state = { ...this.state, ...data };
    await this.refresh('INIT');
  }

  // For optimistic updates, they can pass partial state
  
  private refreshQueue: Array<{ reason: RefreshTriggers; optimisticData?: Partial<StudyBrainState>; resolve: (value: void) => void }> = [];
  private isProcessingRefresh: boolean = false;
  private isDisposed: boolean = false;
  private levelUpTimeout: NodeJS.Timeout | null = null;



  public async refresh(reason: RefreshTriggers, optimisticData?: Partial<StudyBrainState>) {
    if (this.isDisposed) {
      console.warn('[StudyBrainRuntime] Refresh called on disposed instance');
      return Promise.resolve();
    }

    if (optimisticData) {
      this.state = { ...this.state, ...optimisticData };
      this.notifySubscribers();
    }

    if (reason === 'INIT') {
      await this.executeRefresh(reason);
      return;
    }

    // Add to queue instead of using debounced timeout
    return new Promise((resolve) => {
      this.refreshQueue.push({ reason, optimisticData: null, resolve }); // Don't pass optimisticData to queue - already applied
      this.processRefreshQueue();
    });
  }

  private async processRefreshQueue() {
    if (this.isDisposed || this.isProcessingRefresh || this.refreshQueue.length === 0) {
      return;
    }

    this.isProcessingRefresh = true;

    while (this.refreshQueue.length > 0 && !this.isDisposed) {
      const { reason, resolve } = this.refreshQueue.shift()!;
      
      try {
        await this.executeRefresh(reason);
        resolve();
      } catch (error) {
        console.error('[StudyBrainRuntime] Refresh failed:', error);
        // Resolve anyway to prevent queue deadlock, but the error has been logged
        // The caller should handle this gracefully - state may be stale but won't crash
        resolve();
      }
    }

    this.isProcessingRefresh = false;
  }

  private async executeRefresh(reason: RefreshTriggers) {


    const stateChanged = {
      chapters: this.state.chapters !== this.prevMemoState.chapters,
      mistakes: this.state.mistakes !== this.prevMemoState.mistakes,
      sessions: this.state.studySessions !== this.prevMemoState.sessions,
      mocks: this.state.mocks !== this.prevMemoState.mocks,
      settings: this.state.settings !== this.prevMemoState.settings,
      timeline: this.state.timeline !== this.prevMemoState.timeline,
    };
    
    this.prevMemoState = {
      chapters: this.state.chapters,
      mistakes: this.state.mistakes,
      sessions: this.state.studySessions,
      mocks: this.state.mocks,
      settings: this.state.settings,
      timeline: this.state.timeline,
    };

    const startTime = performance.now();
    const engineTimes: Record<string, number> = {};

    const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

    const invalidatedEngines: string[] = [];

    // 0. ChapterInfo Engine (Centralized Chapter Telemetry Brain)
    if (reason === 'INIT' || stateChanged.chapters || stateChanged.sessions || stateChanged.mistakes || stateChanged.mocks || stateChanged.settings) {
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

    await yieldToMain();
    await yieldToMain();
    // 1. Knowledge Engine
    if (reason === 'INIT' || stateChanged.chapters) {
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

    await yieldToMain();
    await yieldToMain();
    // 2. Analytics Engine
    if (reason === 'INIT' || stateChanged.chapters || stateChanged.sessions || stateChanged.mocks || stateChanged.mistakes) {
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

    await yieldToMain();
    await yieldToMain();
    // 3. Planner Engine & Optimization Engine (Unconditionally optimize to keep everything in sync)
    const pStart = performance.now();
    if (this.knowledgeEngine) {
      if (!this.plannerEngine || reason === 'INIT' || stateChanged.chapters || stateChanged.sessions || stateChanged.mistakes || stateChanged.settings) {
        const { PlannerEngine } = await import('@jee-os/engines');
        this.plannerEngine = new PlannerEngine(this.knowledgeEngine);
      }
      if (!this.optimizationEngine || reason === 'INIT' || stateChanged.chapters || stateChanged.sessions || stateChanged.mistakes || stateChanged.settings) {
        const { OptimizationEngine } = await import('@jee-os/engines');
        this.optimizationEngine = new OptimizationEngine(this.knowledgeEngine);
      }
      
      // Sanitize dailyQuota: max possible study hours for JEE is ~14h, 
      // if corrupted state (e.g. 17.5) exists, cap it at 12h for sanity.
      let userQuota = this.state.settings.dailyQuota || 4;
      if (userQuota > 14) {
        userQuota = 12;
      }

      // Energy sets the intensity of the day based on max userQuota
      // High = 125% of available time (push harder), Medium = 100% (normal day), Low = 50% (rest day)
      const energyMultiplier = this.state.energyLevel === 'Low' ? 0.5 : this.state.energyLevel === 'Medium' ? 1.0 : 1.25;
      const totalDailyQuotaHours = Math.min(14, Math.max(1.0, Math.round(userQuota * energyMultiplier * 10) / 10));

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
      const effectiveStudyHours = Math.max(1.0, totalDailyQuotaHours - consumedHours);

      const plannerInput: PlannerInput = {
        studyHours: effectiveStudyHours, 
        chapterTelemetryMap: this.state.chapterTelemetryMap,
        revisionBacklog: [], 
        userPreferences: {
          targetYear: this.state.settings.targetYear,
          focusSubject: this.state.settings.targetBranch ? undefined : undefined, 
          dailyQuota: effectiveStudyHours,
          subjectSplitStrategy: this.state.mentorProfile?.subjectSplitStrategy,
          twoDaySplitConfig: this.state.mentorProfile?.twoDaySplitConfig
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
      const aiMissions = this.state.todayMissions.filter(m => 
        m.id.startsWith('mission-ai-') && !userCustomMissions.some(uc => uc.id === m.id)
      );

      // Priority 3: Planner-generated missions (lowest priority - system suggestions)
      const plannerMissions = (this.state.plannerOutput?.todaysMission || []).map(t => ({
        id: t.id,
        subject: t.subjectId as SubjectId,
        chapter: t.chapterName,
        type: t.type,
        taskName: t.taskName,
        duration: t.duration,
        completed: existingMissionsMap.get(t.id)?.completed || false,
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
      })).filter(pm => !userCustomMissions.some(uc => uc.id === pm.id) && !aiMissions.some(ai => ai.id === pm.id));

      // Combine missions in priority order (later entries override earlier ones if same ID)
      const allMissions = [
        ...plannerMissions,    // System suggestions (base layer)
        ...aiMissions,         // AI suggestions (override planner)
        ...userCustomMissions  // User explicit intent (highest priority)
      ];

      // Remove duplicates by ID and filter out deleted IDs
      const deletedIds = new Set(this.state.deletedMissionIds || []);
      const uniqueMissions = new Map<string, TodayMission>();
      for (const m of allMissions) {
        if (!deletedIds.has(m.id)) {
          uniqueMissions.set(m.id, m); // Later entries override earlier ones
        }
      }

      this.state.todayMissions = Array.from(uniqueMissions.values());

      const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
      const splitStrategy = this.state.mentorProfile?.subjectSplitStrategy || '3_a_day';
      const { generateWeeklyMatrix } = await import('@jee-os/engines');
      // Type assertion needed due to dynamic import and type compatibility issues
      this.state.weeklySchedule = (generateWeeklyMatrix as (
        splitStrategy: string,
        chapters: Chapter[],
        todayMissions: TodayMission[],
        weeklySchedule: any,
        currentDayIndex: number,
        twoDaySplitConfig: any,
        deletedMissionIds: string[],
        scheduleOverrides: any,
        dayStartTime: string | undefined,
        dayEndTime: string | undefined
      ) => any)(
        splitStrategy,
        this.state.chapters,
        this.state.todayMissions,
        this.state.plannerOutput?.weeklySchedule,
        currentDayIndex,
        this.state.mentorProfile?.twoDaySplitConfig,
        this.state.deletedMissionIds || [],
        this.state.scheduleOverrides,
        this.state.settings?.dayStartTime,
        this.state.settings?.dayEndTime
      );

      // Map generated matrix blocks back to todayMissions to synchronize Dashboard and Planner
      const currentDayBlocks = this.state.weeklySchedule.filter(b => b.dayIndex === currentDayIndex);
      this.state.todayMissions = currentDayBlocks.map(b => {
        const originalId = b.id.startsWith('today-') ? b.id.slice(6) : b.id;
        const original = uniqueMissions.get(originalId);
        return {
          id: originalId,
          subject: b.subject as SubjectId,
          chapter: b.chapterName,
          chapterId: b.chapterId,
          type: b.taskType,
          taskName: b.activity,
          duration: b.durationMinutes,
          timeSlot: b.timeSlot,
          completed: original ? original.completed : b.completed,
          xp: original ? original.xp : Math.round(b.priorityScore),
          unlocked: true,
          priorityScore: b.priorityScore,
          reasoning: b.reasoning,
          dismissed: original?.dismissed ?? false,
          isManualOverride: (b as typeof b & { isManualOverride?: boolean }).isManualOverride ?? false,
          scheduledDate: (b as typeof b & { scheduledDate?: string }).scheduledDate,
          scheduledTime: (b as typeof b & { scheduledTime?: string }).scheduledTime
        };
      });

      // Update timeline based on the newly synchronized todayMissions
      let currentHour = 9;
      let currentMinute = 0;
      const customBlocks = this.state.timeline.filter(b => b.id.startsWith('custom-'));
      const generatedBlocks: TimelineBlock[] = [];

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
          time: mission.timeSlot || `${startStr} - ${endStr}`,
          subject: mission.subject as any, // TimelineBlock expects broader subject type - acceptable here as subject types are compatible
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
            subject: 'break',
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

    await yieldToMain();
    await yieldToMain();
    // 4. Revision Engine
    if (reason === 'INIT' || stateChanged.mistakes || stateChanged.chapters || stateChanged.settings) {
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

    await yieldToMain();
    await yieldToMain();
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
    this.state.syllabusProgress.physics.masteredCount = this.state.chapters.filter(c => c.subject === 'physics' && (c.status === 'Mastered' || c.completion >= 100)).length;
    this.state.syllabusProgress.physics.totalCount = this.state.chapters.filter(c => c.subject === 'physics').length;
    this.state.syllabusProgress.chemistry.masteredCount = this.state.chapters.filter(c => c.subject === 'chemistry' && (c.status === 'Mastered' || c.completion >= 100)).length;
    this.state.syllabusProgress.chemistry.totalCount = this.state.chapters.filter(c => c.subject === 'chemistry').length;
    this.state.syllabusProgress.maths.masteredCount = this.state.chapters.filter(c => c.subject === 'maths' && (c.status === 'Mastered' || c.completion >= 100)).length;
    this.state.syllabusProgress.maths.totalCount = this.state.chapters.filter(c => c.subject === 'maths').length;

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
      if (this.levelUpTimeout) clearTimeout(this.levelUpTimeout);
      // Keep it for one notification cycle, then clear
      this.levelUpTimeout = setTimeout(() => {
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
        this.state.coachAnalysis = analysis;
        this.state.coachMessage = analysis.analysis;
        this.notifySubscribers();
      } catch (e) {
        console.error("Coach analysis failed", e);
      }
    }
  }
}
