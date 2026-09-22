import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudyBrainActions } from './StudyBrainActions';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';

const mockBatch = {
  set: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined)
};

// Mock Firebase
vi.mock('@/firebase', () => ({
  db: { _type: 'mockFirestoreDb' }
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    writeBatch: vi.fn(() => mockBatch),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    doc: vi.fn((_db, ...pathSegments) => ({
      id: pathSegments[pathSegments.length - 1],
      path: pathSegments.join('/')
    }))
  };
});

describe('Section 2.3: Data Flow Integrity Tests (RISK-01 to RISK-05)', () => {
  let runtime: StudyBrainRuntime;
  let actions: StudyBrainActions;

  beforeEach(() => {
    vi.clearAllMocks();

    runtime = StudyBrainRuntime.getInstance();
    runtime.initialize({
      chapters: [
        {
          id: 'chap-1',
          name: 'Rotational Motion',
          subject: 'physics',
          unit: 'Mechanics',
          completion: 40,
          currentLecture: 4,
          totalLectures: 10,
          theoryComplete: false,
          dppComplete: false,
          pyqsComplete: false,
          revisionCount: 1,
          difficulty: 'Hard',
          confidence: 50,
          estimatedRemainingTime: 5,
          priority: 1,
          dependencies: [],
          weaknessScore: 30,
          status: 'Learning',
          solvedQuestions: 20,
          lastRevisionDaysAgo: 2
        },
        {
          id: 'chap-2',
          name: 'Gravitation',
          subject: 'physics',
          unit: 'Mechanics',
          completion: 0,
          currentLecture: 0,
          totalLectures: 8,
          theoryComplete: false,
          dppComplete: false,
          pyqsComplete: false,
          revisionCount: 0,
          difficulty: 'Medium',
          confidence: 20,
          estimatedRemainingTime: 4,
          priority: 2,
          dependencies: ['chap-1'], // Dependent on chap-1!
          weaknessScore: 0,
          status: 'Not Started',
          solvedQuestions: 0,
          lastRevisionDaysAgo: 0
        }
      ],
      notes: [
        {
          id: 'note-1',
          timestamp: new Date().toISOString(),
          text: 'Remember moment of inertia for cylinder',
          category: 'Formula',
          subject: 'physics',
          chapter: 'chap-1'
        },
        {
          id: 'note-2',
          timestamp: new Date().toISOString(),
          text: 'General note for kinematics',
          category: 'Concept',
          subject: 'physics',
          chapter: 'other-chap'
        }
      ],
      mistakes: [
        {
          id: 'mistake-1',
          subject: 'physics',
          chapter: 'Rotational Motion',
          chapterId: 'chap-1',
          topic: 'Torque',
          subtopic: '',
          difficulty: 'Hard',
          source: 'Mock 1',
          timeTaken: 120,
          correctMethod: '',
          studentMethod: '',
          mistakeTypes: ['Conceptual'],
          confidence: 30,
          revisionSchedule: 'Daily',
          masteryImpact: 'High',
          attemptNumber: 1,
          revisionStatus: 'New',
          recoveryScore: 0,
          teacherNotes: '',
          personalNotes: '',
          aiAdvice: '',
          priority: 'High',
          dateLogged: new Date().toISOString(),
          questionText: 'Find angular acceleration',
          correctSolution: 'tau = I * alpha'
        }
      ],
      studySessions: [],
      mocks: [],
      customMockTests: [],
      timeline: [
        {
          id: 'tb-1',
          time: '10:00 AM',
          subject: 'physics',
          chapter: 'chap-1',
          activity: 'Lecture 5',
          completed: false
        }
      ],
      xp: { daily: 100, weekly: 300, total: 1500, level: 2, streak: 3, nextLevelXP: 2000 },
      analytics: {
        studyTime: 120,
        focusTime: 100,
        idleTime: 10,
        breakTime: 10,
        questionsSolved: 25,
        accuracy: 80,
        tasksCompleted: 4,
        xpEarned: 150
      },
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
      plannerOutput: { todaysMission: [], weeklySchedule: [], carryForwardTasks: [] } as any,
      optimizationResult: null,
      analyticsSummary: {
        totalStudyHours: 10,
        studyHoursPastWeek: [1, 2, 1, 2, 1, 2, 1],
        studyVelocity: 1.5,
        consistencyScore: 85,
        currentStreak: 5,
        subjectBalance: {
          physics: { studyHours: 5, completionPercentage: 50 },
          chemistry: { studyHours: 3, completionPercentage: 30 },
          maths: { studyHours: 2, completionPercentage: 20 }
        },
        overallLectureCompletion: 40,
        questionAccuracy: 78,
        revisionHealth: 80,
        mockPerformance: {
          averageScore: 180,
          recentTrend: 10
        },
        predictedCompletionDate: '2026-12-01'
      },
      coachAnalysis: null,
      revisionTelemetry: null,
      revisionQueue: [],
      todayMissions: [
        {
          id: 'mission-1',
          subject: 'physics',
          chapterId: 'chap-1',
          chapter: 'Rotational Motion',
          taskName: 'Watch Lecture 5',
          type: 'Watch Lecture',
          duration: 60,
          completed: false,
          xp: 50,
          unlocked: true
        }
      ],
      customMissions: [
        {
          id: 'cm-1',
          subject: 'physics',
          chapterId: 'chap-1',
          chapter: 'Rotational Motion',
          taskName: 'Solve 10 Torque Problems',
          type: 'Solve DPP',
          duration: 45,
          completed: false,
          xp: 45,
          unlocked: true
        }
      ],
      dashboardSummary: null,
      completionPrediction: null,
      subjectPriorities: [],
      syllabusProgress: {
        physics: { total: 2, completed: 0, percentage: 20 },
        chemistry: { total: 0, completed: 0, percentage: 0 },
        maths: { total: 0, completed: 0, percentage: 0 }
      },
      estimatedRemainingHours: '10h',
      plannedQuestions: 50,
      targetFinishTime: '9:00 PM',
      daysRemaining: 120,
      riskProfile: { estimatedReadinessScore: 75, highestRiskSubject: 'Physics', highestRiskChapters: [] },
      chaptersWithData: [],
      loading: false,
      lastRefresh: null,
      diagnostics: { cacheHits: 0, cacheMisses: 0, invalidatedEngines: [], refreshCause: 'INIT', lastRefreshDuration: 0, totalEngineRuntime: 0, engineExecutionTimes: {} }
    });

    actions = new StudyBrainActions(runtime, 'test-auth-user-99');
  });

  describe('RISK-01: Atomic Multi-Document Writes via runAtomicBatch', () => {
    it('commits completeStudySession atomically across session and user profile', async () => {
      await actions.completeStudySession({
        duration: 45,
        questions: 10,
        correct: 8,
        accuracy: 80,
        subjectId: 'physics',
        chapterId: 'chap-1',
        type: 'Practice'
      });

      // Assert writeBatch was requested and committed
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);

      // Verify that the user profile and session documents were populated into the batch
      const setCalls = mockBatch.set.mock.calls;
      expect(setCalls[0][1]).toHaveProperty('duration', 45);
      expect(setCalls[1][1]).toHaveProperty('analytics');
      expect(setCalls[1][1]).toHaveProperty('xp');
    });

    it('commits addMockResult atomically across mock results and user profile', async () => {
      await actions.addMockResult({
        title: 'JEE Main Full Mock 1',
        totalScore: 180,
        totalQuestions: 75,
        attempted: 70,
        correct: 45,
        incorrect: 25,
        date: new Date().toISOString(),
        duration: 180,
        subjectBreakdown: {
          physics: { score: 60, attempted: 25, correct: 15 },
          chemistry: { score: 60, attempted: 25, correct: 15 },
          maths: { score: 60, attempted: 20, correct: 15 }
        }
      });

      expect(mockBatch.set).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);

      const setCalls = mockBatch.set.mock.calls;
      expect(setCalls[0][1]).toHaveProperty('title', 'JEE Main Full Mock 1');
      expect(setCalls[1][1]).toHaveProperty('type', 'Mock');
      expect(setCalls[1][1]).toHaveProperty('duration', 180);
      expect(setCalls[2][1]).toHaveProperty('xp');
      expect(setCalls[2][1]).toHaveProperty('analytics');
    });

    it('commits updateMistakeTestResult atomically across mistake and user profile', async () => {
      await actions.updateMistakeTestResult('mistake-1', true);

      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);

      const setCalls = mockBatch.set.mock.calls;
      expect(setCalls[0][1]).toHaveProperty('revisionStatus', 'Solved Again');
      expect(setCalls[1][1]).toHaveProperty('xp');
    });

    it('prevents infinite XP farming by symmetrically adjusting XP when toggling mistake retest status', async () => {
      const initialTotalXp = runtime.getState().xp.total;

      // 1. Mark as solved correctly -> awards +60 XP
      await actions.updateMistakeTestResult('mistake-1', true);
      expect(runtime.getState().xp.total).toBe(initialTotalXp + 60);

      // 2. Unmark / mark as wrong -> deducts 60 XP
      await actions.updateMistakeTestResult('mistake-1', false);
      expect(runtime.getState().xp.total).toBe(initialTotalXp);

      // 3. Mark as solved correctly again -> returns to +60 XP, NOT +120 XP
      await actions.updateMistakeTestResult('mistake-1', true);
      expect(runtime.getState().xp.total).toBe(initialTotalXp + 60);
    });

    it('deduplicates daily check-in entries for the same calendar date', async () => {
      runtime.updateStateOptimistic({
        mentorProfile: {
          interviewCompleted: true,
          dailyAvailableHours: 4,
          dailyCheckins: [
            {
              date: '2026-09-05',
              actualHoursAvailable: 3,
              mood: 'Tired',
              energyLevel: 'Low',
              sleepQualityHours: 6,
              unexpectedWork: ''
            }
          ]
        } as any
      });

      // Submit check-in for the same date with updated details
      await actions.submitDailyCheckin({
        date: '2026-09-05',
        actualHoursAvailable: 5,
        mood: 'Focused',
        energyLevel: 'Medium',
        sleepQualityHours: 8,
        unexpectedWork: ''
      });

      const checkins = runtime.getState().mentorProfile?.dailyCheckins || [];
      expect(checkins).toHaveLength(1);
      expect(checkins[0].actualHoursAvailable).toBe(5);
      expect(checkins[0].mood).toBe('Focused');
    });
  });

  describe('RISK-02: Cascading Deletions on Chapter Deletion', () => {
    it('atomically cascades deletes to notes, mistakes, custom missions, and prunes dependent chapter DAG prerequisites', async () => {
      // Verify initial state
      expect(runtime.getState().chapters).toHaveLength(2);
      expect(runtime.getState().chapters[1].dependencies).toContain('chap-1');
      expect(runtime.getState().notes).toHaveLength(2);
      expect(runtime.getState().mistakes).toHaveLength(1);
      expect(runtime.getState().customMissions).toHaveLength(1);
      expect(runtime.getState().todayMissions).toHaveLength(1);
      expect(runtime.getState().timeline).toHaveLength(1);

      // Execute cascading delete of chap-1
      await actions.deleteChapter('chap-1');

      // 1. Chapter removed from state
      const state = runtime.getState();
      expect(state.chapters).toHaveLength(1);
      expect(state.chapters[0].id).toBe('chap-2');

      // 2. Dependent chapter's prerequisite dependencies pruned
      expect(state.chapters[0].dependencies).not.toContain('chap-1');
      expect(state.chapters[0].dependencies).toEqual([]);

      // 3. Associated notes pruned (note-2 preserved)
      expect(state.notes).toHaveLength(1);
      expect(state.notes[0].id).toBe('note-2');

      // 4. Associated mistakes pruned
      expect(state.mistakes).toHaveLength(0);

      // 5. Associated custom missions pruned
      expect(state.customMissions).toHaveLength(0);

      // 6. Active missions and timeline blocks for chap-1 pruned
      expect(state.todayMissions.every(m => m.chapterId !== 'chap-1' && m.chapter !== 'Rotational Motion')).toBe(true);
      expect(state.timeline.filter(t => t.chapter === 'chap-1' || t.chapter === 'Rotational Motion')).toHaveLength(0);

      // 7. Atomic batch deletes verified: chapterDoc, mistakeDoc, noteDoc, customMissionDoc
      expect(mockBatch.delete).toHaveBeenCalledTimes(4);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe('RISK-03: Immutable State Generation in runCoachAnalysis', () => {
    it('produces an immutable new state object reference allowing Zustand shallow equality to re-render', async () => {
      // Setup mock coachEngine
      (runtime as any).coachEngine = {
        getAnalysis: vi.fn().mockResolvedValue({
          analysis: 'Focus heavily on Mechanics questions this week.',
          suggestedActions: ['Revise Rotational Dynamics']
        })
      };

      const prevState = runtime.getState();
      await runtime.runCoachAnalysis();
      const nextState = runtime.getState();

      // Ensure object reference is distinct (immutable copy)
      expect(nextState).not.toBe(prevState);
      expect(nextState.coachMessage).toBe('Focus heavily on Mechanics questions this week.');
      expect(nextState.coachAnalysis).toEqual({
        analysis: 'Focus heavily on Mechanics questions this week.',
        suggestedActions: ['Revise Rotational Dynamics']
      });
    });
  });

  describe('RISK-05: Guest Mode Safety & Write Protection', () => {
    it('safely skips remote Firestore operations and avoids throwing permission errors in guest mode', async () => {
      const guestActions = new StudyBrainActions(runtime, 'guest');
      expect(guestActions.isGuestUser()).toBe(true);

      // Attempting an action in guest mode should succeed optimistically without calling Firestore batch.commit
      await guestActions.completeStudySession({
        duration: 30,
        questions: 5,
        correct: 5,
        accuracy: 100,
        subjectId: 'physics',
        type: 'Practice'
      });

      // Remote commit was skipped
      expect(mockBatch.commit).not.toHaveBeenCalled();

      // But local optimistic update succeeded cleanly
      expect(runtime.getState().studySessions.length).toBeGreaterThan(0);
      expect(runtime.getState().lastSyncError).toBeNull();
    });

    it('updates userId dynamically via setUserId when user logs in', () => {
      const dynamicActions = new StudyBrainActions(runtime, 'guest');
      expect(dynamicActions.isGuestUser()).toBe(true);

      dynamicActions.setUserId('firebase-uid-456');
      expect(dynamicActions.userId).toBe('firebase-uid-456');
      expect(dynamicActions.isGuestUser()).toBe(false);
    });
  });
});
