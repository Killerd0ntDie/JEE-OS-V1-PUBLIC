import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionActions } from './SessionActions';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { StudySession, TodayMission } from '@/types/index';

vi.mock('@/firebase', () => ({
  db: {}
}));

vi.mock('@/repositories/studySessionRepository', () => ({
  StudySessionRepository: {
    saveStudySession: vi.fn().mockResolvedValue(undefined),
    deleteStudySession: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/userRepository', () => ({
  UserRepository: {
    saveUserProfile: vi.fn().mockResolvedValue(undefined),
    updateUserProfile: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/customMissionRepository', () => ({
  CustomMissionRepository: {
    saveMission: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('SessionActions undoLatestMission Reversion Invariant', () => {
  let runtime: StudyBrainRuntime;
  let actions: SessionActions;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = StudyBrainRuntime.getInstance();

    const sampleSession: StudySession = {
      id: 'session-to-undo-1',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date().toISOString(),
      duration: 60,
      type: 'Practice',
      subjectId: 'physics',
      chapterId: 'chap-kinematics',
      questionsSolved: 20,
      accuracy: 85,
      xpEarned: 50
    };

    const completedMission: TodayMission = {
      id: 'mission-practice-1',
      subject: 'physics',
      chapter: 'Kinematics',
      chapterId: 'chap-kinematics',
      type: 'Solve DPP',
      taskName: 'Solve Kinematics Practice',
      duration: 60,
      completed: true,
      completedAt: new Date().toISOString(),
      linkedSessionId: 'session-to-undo-1',
      xp: 50,
      unlocked: true
    };

    runtime.updateStateOptimistic({
      studySessions: [sampleSession],
      todayMissions: [completedMission],
      completedPlannerMissionIds: ['mission-practice-1'],
      xp: {
        daily: 150,
        weekly: 400,
        monthly: 800,
        total: 1500,
        level: 2,
        streak: 4,
        nextLevelXP: 2000
      },
      writeBlocked: false
    });

    actions = new SessionActions(runtime, 'user-session-test');
    (actions as any).runAtomicBatch = vi.fn().mockImplementation(async (callback) => {
      const mockBatch = { set: vi.fn(), update: vi.fn(), delete: vi.fn() };
      await callback(mockBatch);
    });
  });

  it('reverts completed mission to completed:false and removes ID from completedPlannerMissionIds on undoLatestMission', async () => {
    await actions.undoLatestMission(50);

    const state = runtime.getState();
    // Session removed
    expect(state.studySessions.length).toBe(0);
    // XP deducted
    expect(state.xp.total).toBe(1450);
    // Mission reverted
    const mission = state.todayMissions.find(m => m.id === 'mission-practice-1');
    expect(mission?.completed).toBe(false);
    expect(mission?.linkedSessionId).toBeUndefined();
    // Removed from completedPlannerMissionIds
    expect(state.completedPlannerMissionIds).not.toContain('mission-practice-1');
  });
});
