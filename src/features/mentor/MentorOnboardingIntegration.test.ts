import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudyBrainActions } from '@/actions/StudyBrainActions';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { UserRepository } from '@/repositories/userRepository';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { Chapter, MentorProfile } from '@/types/index';

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

describe('Diagnostic Onboarding & Master Schedule Integration Audit', () => {
  let runtime: StudyBrainRuntime;
  let actions: StudyBrainActions;

  const sampleChapters: Chapter[] = [
    {
      id: 'p-kinematics',
      subject: 'physics',
      unit: 'Mechanics',
      name: 'Kinematics',
      completion: 0,
      currentLecture: 0,
      totalLectures: 10,
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0,
      difficulty: 'Medium',
      confidence: 20,
      estimatedRemainingTime: 10,
      priority: 1,
      dependencies: [],
      weaknessScore: 50,
      status: 'Not Started',
      solvedQuestions: 0,
      lastRevisionDaysAgo: 0
    }
  ];

  beforeEach(() => {
    runtime = StudyBrainRuntime.getInstance();
    runtime.initialize({
      chapters: sampleChapters,
      notes: [],
      mistakes: [],
      studySessions: [],
      mocks: [],
      customMockTests: [],
      timeline: [],
      xp: { daily: 0, weekly: 0, total: 0, level: 1, streak: 0, nextLevelXP: 1000 },
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
      todayMissions: [],
      customMissions: [],
      dashboardSummary: null,
      completionPrediction: null,
      subjectPriorities: [],
      syllabusProgress: {
        physics: { total: 1, completed: 0, percentage: 0 },
        chemistry: { total: 0, completed: 0, percentage: 0 },
        maths: { total: 0, completed: 0, percentage: 0 }
      },
      estimatedRemainingHours: '10h',
      plannedQuestions: 0,
      targetFinishTime: '8:00 PM',
      daysRemaining: 180,
      riskProfile: { estimatedReadinessScore: 80, highestRiskSubject: 'Physics', highestRiskChapters: [] },
      chaptersWithData: [],
      loading: false,
      lastRefresh: null,
      diagnostics: { cacheHits: 0, cacheMisses: 0, invalidatedEngines: [], refreshCause: 'INIT', lastRefreshDuration: 0, totalEngineRuntime: 0, engineExecutionTimes: {} }
    });

    actions = new StudyBrainActions(runtime, 'test-user-789');
  });

  it('completes onboarding interview, updates settings, maps chapter realities, and sets interviewCompleted to true', async () => {
    const userSaveSpy = vi.spyOn(UserRepository, 'updateUserProfile').mockResolvedValueOnce();
    const chapSaveSpy = vi.spyOn(ChapterRepository, 'saveChapter').mockResolvedValueOnce();

    const mentorData: Omit<MentorProfile, 'interviewCompleted'> = {
      targetExams: ['JEE Main', 'JEE Advanced'],
      targetYear: '2027',
      targetPercentile: '99.9',
      targetRank: 'AIR 100',
      targetCollege: 'IIT Bombay',
      targetBranch: 'Computer Science & Engineering',
      currentClass: '12th',
      coachingType: 'Online Coaching',
      dailyAvailableHours: 8,
      subjectSplitStrategy: '3_a_day'
    };

    const chapterUpdates = [
      {
        id: 'p-kinematics',
        status: 'In Progress' as const,
        lecturesWatched: 5,
        totalLectures: 10,
        avgLectureDuration: 60,
        dppDone: true,
        pyqsDone: false,
        confidence: 70,
        completion: 50
      }
    ];

    await actions.completeMentorInterview(mentorData, chapterUpdates);

    const state = runtime.getState();

    // 1. Mentor Profile Updated
    expect(state.mentorProfile?.interviewCompleted).toBe(true);
    expect(state.mentorProfile?.dailyAvailableHours).toBe(8);

    // 2. Settings Synced
    expect(state.settings.dailyQuota).toBe(8);
    expect(state.settings.dreamIit).toBe('IIT Bombay');

    // 3. Chapter Reality Updated
    const chap = state.chapters.find(c => c.id === 'p-kinematics');
    expect(chap?.status).toBe('Learning');
    expect(chap?.currentLecture).toBe(5);
    expect(chap?.dppComplete).toBe(true);
    expect(chap?.pyqsComplete).toBe(false);

    // 4. Verification that persistence was invoked
    expect(chapSaveSpy).toHaveBeenCalledWith('test-user-789', expect.objectContaining({
      id: 'p-kinematics',
      status: 'Learning',
      currentLecture: 5,
      dppComplete: true
    }));

    expect(userSaveSpy).toHaveBeenCalledWith('test-user-789', expect.objectContaining({
      mentorProfile: expect.objectContaining({
        interviewCompleted: true,
        dailyAvailableHours: 8
      }),
      settings: expect.objectContaining({
        dailyQuota: 8,
        dreamIit: 'IIT Bombay'
      })
    }));

    userSaveSpy.mockRestore();
    chapSaveSpy.mockRestore();
  });
});
