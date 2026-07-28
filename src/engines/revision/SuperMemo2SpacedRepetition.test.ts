import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudyBrainActions } from '../../actions/StudyBrainActions';
import { StudyBrainRuntime } from '../../runtime/StudyBrainRuntime';
import { ChapterRepository } from '../../repositories/chapterRepository';
import { Chapter } from '../../types/index';

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

describe('SuperMemo-2 Spaced Repetition Integration Audit', () => {
  let runtime: StudyBrainRuntime;
  let actions: StudyBrainActions;

  const sampleChapter: Chapter = {
    id: 'chem-atomic',
    subject: 'chemistry',
    unit: 'Physical Chemistry',
    name: 'Atomic Structure',
    completion: 100,
    currentLecture: 10,
    totalLectures: 10,
    theoryComplete: true,
    dppComplete: true,
    pyqsComplete: true,
    revisionCount: 0,
    difficulty: 'Medium',
    confidence: 60,
    estimatedRemainingTime: 0,
    priority: 1,
    dependencies: [],
    weaknessScore: 10,
    status: 'Mastered',
    solvedQuestions: 50,
    lastRevisionDaysAgo: 5,
    sm2EaseFactor: 2.5,
    sm2Interval: 0
  };

  beforeEach(() => {
    runtime = StudyBrainRuntime.getInstance();
    runtime.initialize({
      chapters: [sampleChapter],
      notes: [],
      mistakes: [],
      studySessions: [],
      mocks: [],
      customMockTests: [],
      timeline: [],
      xp: { daily: 0, weekly: 0, total: 500, level: 1, streak: 10, nextLevelXP: 1000 },
      analytics: { studyTime: 0, focusTime: 0, idleTime: 0, breakTime: 0, questionsSolved: 0, accuracy: 0, tasksCompleted: 0, xpEarned: 0 },
      energyLevel: 'High',
      activeSubject: 'chemistry',
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
      todayMissions: [],
      customMissions: [],
      dashboardSummary: {},
      completionPrediction: {},
      subjectPriorities: [],
      syllabusProgress: {
        physics: { total: 0, completed: 0, percentage: 0 },
        chemistry: { total: 1, completed: 1, percentage: 100 },
        maths: { total: 0, completed: 0, percentage: 0 }
      },
      estimatedRemainingHours: '0h',
      plannedQuestions: 0,
      targetFinishTime: '8:00 PM',
      daysRemaining: 180,
      riskProfile: { estimatedReadinessScore: 90, highestRiskSubject: 'Chemistry', highestRiskChapters: [] },
      chaptersWithData: [],
      loading: false,
      lastRefresh: null,
      diagnostics: { cacheHits: 0, cacheMisses: 0, invalidatedEngines: [], refreshCause: 'INIT', lastRefreshDuration: 0, totalEngineRuntime: 0, engineExecutionTimes: {} }
    });

    actions = new StudyBrainActions(runtime, 'test-user-sm2');
  });

  it('correctly updates SM-2 ease factor and interval on High confidence completion', async () => {
    const chapSaveSpy = vi.spyOn(ChapterRepository, 'saveChapter').mockResolvedValueOnce();

    // 1. First revision with High confidence
    await actions.completeRevision('chem-atomic', 'High');

    let chap = runtime.getState().chapters.find(c => c.id === 'chem-atomic');
    expect(chap?.revisionCount).toBe(1);
    expect(chap?.sm2Interval).toBe(1);
    expect(chap?.sm2EaseFactor).toBeGreaterThanOrEqual(2.6);

    // 2. Second revision with High confidence
    chapSaveSpy.mockResolvedValueOnce();
    await actions.completeRevision('chem-atomic', 'High');

    chap = runtime.getState().chapters.find(c => c.id === 'chem-atomic');
    expect(chap?.revisionCount).toBe(2);
    expect(chap?.sm2Interval).toBe(6);

    chapSaveSpy.mockRestore();
  });

  it('resets SM-2 interval to 1 day on Low confidence completion', async () => {
    const chapSaveSpy = vi.spyOn(ChapterRepository, 'saveChapter').mockResolvedValueOnce();

    await actions.completeRevision('chem-atomic', 'Low');

    const chap = runtime.getState().chapters.find(c => c.id === 'chem-atomic');
    expect(chap?.sm2Interval).toBe(1);
    expect(chap?.sm2EaseFactor).toBeLessThan(2.5);

    chapSaveSpy.mockRestore();
  });
});
