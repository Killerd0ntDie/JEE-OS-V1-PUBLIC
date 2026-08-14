import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudyBrainActions } from '@/actions/StudyBrainActions';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { UserRepository } from '@/repositories/userRepository';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { Chapter, TodayMission } from '@/types/index';

vi.mock('../../repositories/userRepository', () => ({
  UserRepository: {
    updateUserProfile: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../../repositories/chapterRepository', () => ({
  ChapterRepository: {
    saveChapter: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../../repositories/customMissionRepository', () => ({
  CustomMissionRepository: {
    saveMission: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../../repositories/studySessionRepository', () => ({
  StudySessionRepository: {
    saveStudySession: vi.fn().mockResolvedValue(undefined),
    deleteStudySession: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Mission Execution & Chapter State Flow Integration Audit', () => {
  let runtime: StudyBrainRuntime;
  let actions: StudyBrainActions;

  const initialChapters: Chapter[] = [
    {
      id: 'p-kinematics',
      subject: 'physics',
      unit: 'Mechanics',
      name: 'Kinematics',
      completion: 20,
      currentLecture: 2,
      totalLectures: 10,
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0,
      difficulty: 'Medium',
      confidence: 60,
      estimatedRemainingTime: 8,
      priority: 1,
      dependencies: [],
      weaknessScore: 30,
      status: 'Learning',
      solvedQuestions: 5,
      lastRevisionDaysAgo: 0
    }
  ];

  const initialMissions: TodayMission[] = [
    {
      id: 'custom-m-1',
      subject: 'physics',
      chapter: 'Kinematics',
      chapterId: 'p-kinematics',
      type: 'Watch Lecture',
      taskName: 'Watch Kinematics Lec 3',
      duration: 60,
      completed: false,
      xp: 100,
      unlocked: true
    },
    {
      id: 'custom-m-2',
      subject: 'physics',
      chapter: 'Kinematics',
      chapterId: 'p-kinematics',
      type: 'Solve DPP',
      taskName: 'Solve Kinematics DPP 1',
      duration: 45,
      completed: false,
      xp: 80,
      unlocked: false
    }
  ];

  beforeEach(() => {
    runtime = StudyBrainRuntime.getInstance();
    runtime.initialize({
      chapters: initialChapters,
      notes: [],
      mistakes: [],
      studySessions: [],
      mocks: [],
      customMockTests: [],
      timeline: [],
      xp: { daily: 0, weekly: 0, total: 100, level: 1, streak: 5, nextLevelXP: 1000 },
      analytics: { studyTime: 0, focusTime: 0, idleTime: 0, breakTime: 0, questionsSolved: 0, accuracy: 0, tasksCompleted: 0, xpEarned: 0 },
      energyLevel: 'High',
      activeSubject: 'physics',
      isMissionModeActive: false,
      coachMessage: 'Ready',
      settings: {
        targetYear: '2027',
        dreamIit: 'IIT Bombay',
        targetBranch: 'CSE',
        dailyQuota: 6,
        showStatusInBar: true,
        soundEffects: false,
        desktopNotifications: false,
        volume: 75
      },
      knowledgeGraph: [],
      plannerOutput: null,
      optimizationResult: null,
      analyticsSummary: null,
      coachAnalysis: null,
      revisionTelemetry: null,
      revisionQueue: [],
      todayMissions: initialMissions,
      customMissions: initialMissions,
      dashboardSummary: null,
      completionPrediction: null,
      subjectPriorities: [],
      syllabusProgress: {
        physics: { total: 1, completed: 0, percentage: 20 },
        chemistry: { total: 0, completed: 0, percentage: 0 },
        maths: { total: 0, completed: 0, percentage: 0 }
      },
      estimatedRemainingHours: '8h',
      plannedQuestions: 20,
      targetFinishTime: '8:00 PM',
      daysRemaining: 180,
      riskProfile: { estimatedReadinessScore: 80, highestRiskSubject: 'Physics', highestRiskChapters: [] },
      chaptersWithData: [],
      loading: false,
      lastRefresh: null,
      diagnostics: { cacheHits: 0, cacheMisses: 0, invalidatedEngines: [], refreshCause: 'INIT', lastRefreshDuration: 0, totalEngineRuntime: 0, engineExecutionTimes: {} }
    });

    actions = new StudyBrainActions(runtime, 'test-user-456');
    runtime.updateStateOptimistic({ todayMissions: initialMissions, customMissions: initialMissions, chapters: initialChapters });
  });

  it('completes a Watch Lecture mission, unlocks next mission, increments XP, and advances lecture progress in chapter state', async () => {
    const userSaveSpy = vi.spyOn(UserRepository, 'updateUserProfile').mockResolvedValueOnce();
    const chapSaveSpy = vi.spyOn(ChapterRepository, 'saveChapter').mockResolvedValueOnce();

    await actions.completeTask('custom-m-1');

    const state = runtime.getState();

    // 1. Mission 1 completed & Mission 2 unlocked
    const m1 = state.todayMissions.find(m => m.id === 'custom-m-1');
    const m2 = state.todayMissions.find(m => m.id === 'custom-m-2');
    expect(m1?.completed).toBe(true);
    expect(m2?.unlocked).toBe(true);

    // 2. XP updated
    expect(state.xp.total).toBe(200); // 100 base + 100 gained

    // 3. Chapter lecture advanced from 2 to 3
    const chap = state.chapters.find(c => c.id === 'p-kinematics');
    expect(chap?.currentLecture).toBe(3);

    // 4. Verification that repository saves executed
    expect(userSaveSpy).toHaveBeenCalled();
    expect(chapSaveSpy).toHaveBeenCalled();

    userSaveSpy.mockRestore();
    chapSaveSpy.mockRestore();
  });

  it('completes Solve DPP mission and marks DPP complete on chapter', async () => {
    const userSaveSpy = vi.spyOn(UserRepository, 'updateUserProfile').mockResolvedValueOnce();
    const chapSaveSpy = vi.spyOn(ChapterRepository, 'saveChapter').mockResolvedValueOnce();

    await actions.completeTask('custom-m-2');

    const state = runtime.getState();
    const chap = state.chapters.find(c => c.id === 'p-kinematics');
    expect(chap?.dppComplete).toBe(true);

    userSaveSpy.mockRestore();
    chapSaveSpy.mockRestore();
  });

  it('reverts local state change and surfaces sync error if repository write fails', async () => {
    const userSaveSpy = vi.spyOn(UserRepository, 'updateUserProfile').mockRejectedValueOnce(new Error('Network error'));

    await expect(actions.completeTask('custom-m-1')).rejects.toThrow('Sync Error (completeTask)');

    // Local state is reverted upon write failure via optimistic rollback
    const m1 = runtime.getState().todayMissions.find(m => m.id === 'custom-m-1');
    expect(m1?.completed).toBe(false);
    expect(runtime.getState().lastSyncError).toContain('Sync Error (completeTask)');

    userSaveSpy.mockRestore();
  });
});
