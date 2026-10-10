import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockTestActions } from './MockTestActions';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { MockResult, } from '@/types/index';

vi.mock('@/firebase', () => ({
  db: {}
}));

vi.mock('@/utils/idb', () => ({
  idbSet: vi.fn().mockResolvedValue(undefined),
  idbGet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/repositories/mockResultRepository', () => ({
  MockResultRepository: {
    saveMockResult: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/mockTestRepository', () => ({
  MockTestRepository: {
    saveMockTest: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/customMissionRepository', () => ({
  CustomMissionRepository: {
    saveMission: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/userRepository', () => ({
  UserRepository: {
    saveUserProfile: vi.fn().mockResolvedValue(undefined),
    updateUserProfile: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('MockTestActions Bidirectional Timeline Sync', () => {
  let runtime: StudyBrainRuntime;
  let actions: MockTestActions;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = StudyBrainRuntime.getInstance();
    runtime.updateStateOptimistic({
      mocks: [],
      studySessions: [],
      analytics: {
        studyTime: 0,
        focusTime: 0,
        idleTime: 0,
        breakTime: 0,
        questionsSolved: 0,
        accuracy: 0,
        tasksCompleted: 0,
        xpEarned: 0
      },
      xp: {
        total: 1000,
        daily: 100,
        weekly: 500,
        monthly: 1000,
        level: 2,
        streak: 3,
        nextLevelXP: 2000
      },
      todayMissions: [
        {
          id: 'mission-mock-1',
          chapter: 'Full Mock',
          subject: 'physics',
          type: 'Solve Mock',
          taskName: 'Complete Full Mock Test 1',
          duration: 180,
          completed: false,
          xp: 250,
          unlocked: true
        }
      ],
      completedPlannerMissionIds: [],
      writeBlocked: false
    });

    actions = new MockTestActions(runtime, 'user-mock-test');
    // Mock runAtomicBatch to execute callback
    (actions as any).runAtomicBatch = vi.fn().mockImplementation(async (callback) => {
      const mockBatch = {
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      };
      await callback(mockBatch);
    });
  });

  it('marks matching Solve Mock mission in todayMissions as completed and records ID when addMockResult is invoked', async () => {
    const mockResultData: Omit<MockResult, 'id'> = {
      date: new Date().toISOString(),
      title: 'Full JEE Advanced Mock 1',
      totalScore: 180,
      totalQuestions: 54,
      attempted: 45,
      correct: 38,
      incorrect: 7,
      duration: 180,
      subjectBreakdown: {
        physics: { score: 60, attempted: 15, correct: 13 },
        chemistry: { score: 65, attempted: 15, correct: 14 },
        maths: { score: 55, attempted: 15, correct: 11 }
      }
    };

    const savedResult = await actions.addMockResult(mockResultData);
    expect(savedResult).toBeDefined();

    const state = runtime.getState();
    const mockMission = state.todayMissions.find(m => m.id === 'mission-mock-1');
    expect(mockMission?.completed).toBe(true);
    expect(mockMission?.linkedSessionId).toBeDefined();
    expect(state.completedPlannerMissionIds).toContain('mission-mock-1');
    expect(state.mocks.length).toBe(1);
    expect(state.studySessions.length).toBe(1);
    expect(state.studySessions[0].type).toBe('Mock');
  });
});
