import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChapterActions } from './ChapterActions';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { Chapter } from '@/types/index';

vi.mock('@/firebase', () => ({
  db: {}
}));

vi.mock('@/repositories/chapterRepository', () => ({
  ChapterRepository: {
    saveChapter: vi.fn().mockResolvedValue(undefined),
    getChapters: vi.fn().mockResolvedValue([]),
    updateChapter: vi.fn().mockResolvedValue(undefined),
    deleteChapter: vi.fn().mockResolvedValue(undefined),
    seedChapters: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/userRepository', () => ({
  UserRepository: {
    saveUserProfile: vi.fn().mockResolvedValue(undefined),
    getUserProfile: vi.fn().mockResolvedValue(null),
    updateUserProfile: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/studySessionRepository', () => ({
  StudySessionRepository: {
    saveStudySession: vi.fn().mockResolvedValue(undefined),
    deleteStudySession: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/customMissionRepository', () => ({
  CustomMissionRepository: {
    saveMission: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('ChapterActions SM-2 Integration', () => {
  let runtime: StudyBrainRuntime;
  let actions: ChapterActions;

  const sampleChapter: Chapter = {
    id: 'chap-kinematics',
    name: 'Kinematics',
    subject: 'physics',
    unit: 'Mechanics',
    completion: 50,
    currentLecture: 5,
    totalLectures: 10,
    theoryComplete: true,
    pyqsComplete: false,
    revisionCount: 0,
    difficulty: 'Medium',
    confidence: 60,
    estimatedRemainingTime: 4,
    priority: 1,
    dependencies: [],
    weaknessScore: 20,
    status: 'Learning',
    solvedQuestions: 30,
    lastRevisionDaysAgo: 5,
    sm2EaseFactor: 2.5,
    sm2Interval: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = StudyBrainRuntime.getInstance();
    runtime.updateStateOptimistic({
      chapters: [{ ...sampleChapter }],
      xp: { daily: 100, weekly: 500, total: 2000, level: 3, streak: 5, nextLevelXP: 3000 },
      writeBlocked: false
    });
    actions = new ChapterActions(runtime, 'user-test-123');
  });

  it('schedules next revision with midnight-normalized date on High confidence', async () => {
    await actions.completeRevision('chap-kinematics', 'High');

    const updated = runtime.getState().chapters.find(c => c.id === 'chap-kinematics')!;
    expect(updated).toBeDefined();
    expect(updated.revisionCount).toBe(1);
    expect(updated.sm2Interval).toBe(1);
    expect(updated.confidence).toBe(100);
    expect(updated.nextRevisionDueAt).toBeDefined();

    // Verify nextRevisionDueAt is midnight-normalized
    const dueDate = new Date(updated.nextRevisionDueAt!);
    expect(dueDate.getHours()).toBe(0);
    expect(dueDate.getMinutes()).toBe(0);
    expect(dueDate.getSeconds()).toBe(0);

    // Verify XP incremented
    expect(runtime.getState().xp.total).toBeGreaterThan(2000);
    expect(ChapterRepository.saveChapter).toHaveBeenCalledWith('user-test-123', expect.objectContaining({
      id: 'chap-kinematics',
      revisionCount: 1,
      sm2Interval: 1
    }));
  });

  it('resets repetitions and sets interval to 1 on Low confidence', async () => {
    // Seed with existing repetitions
    runtime.updateStateOptimistic({
      chapters: [{
        ...sampleChapter,
        revisionCount: 4,
        sm2Interval: 14,
        sm2EaseFactor: 2.3
      }]
    });

    await actions.completeRevision('chap-kinematics', 'Low');

    const updated = runtime.getState().chapters.find(c => c.id === 'chap-kinematics')!;
    expect(updated.revisionCount).toBe(0);
    expect(updated.sm2Interval).toBe(1);
    expect(updated.confidence).toBe(40);
  });

  it('scales interval for second successful revision', async () => {
    // Seed after 1st revision
    runtime.updateStateOptimistic({
      chapters: [{
        ...sampleChapter,
        revisionCount: 1,
        sm2Interval: 1,
        sm2EaseFactor: 2.5
      }]
    });

    await actions.completeRevision('chap-kinematics', 'High');

    const updated = runtime.getState().chapters.find(c => c.id === 'chap-kinematics')!;
    expect(updated.revisionCount).toBe(2);
    expect(updated.sm2Interval).toBe(6);
  });

  it('marks matching revision todayMissions completed and updates completedPlannerMissionIds on completeRevision', async () => {
    runtime.updateStateOptimistic({
      todayMissions: [
        {
          id: 'mission-rev-kinematics',
          subject: 'physics',
          chapter: 'Kinematics',
          chapterId: 'chap-kinematics',
          type: 'Revise Formulas',
          taskName: 'Revise Kinematics',
          duration: 30,
          completed: false,
          xp: 50,
          unlocked: true
        }
      ],
      completedPlannerMissionIds: []
    });

    await actions.completeRevision('chap-kinematics', 'High');

    const m = runtime.getState().todayMissions.find(x => x.id === 'mission-rev-kinematics');
    expect(m?.completed).toBe(true);
    expect(runtime.getState().completedPlannerMissionIds).toContain('mission-rev-kinematics');
  });

  it('grades flashcards batch, updates chapter SM-2 interval, and completes matching todayMissions', async () => {
    runtime.updateStateOptimistic({
      todayMissions: [
        {
          id: 'mission-batch-rev',
          subject: 'physics',
          chapter: 'Kinematics',
          chapterId: 'chap-kinematics',
          type: 'Revise Formulas',
          taskName: 'Revise Kinematics Formulas',
          duration: 30,
          completed: false,
          xp: 50,
          unlocked: true
        }
      ],
      completedPlannerMissionIds: []
    });

    await actions.gradeFlashcardsBatch([
      { cardId: 'chap-kinematics-f0', chapterId: 'chap-kinematics', quality: 5 },
      { cardId: 'chap-kinematics-f1', chapterId: 'chap-kinematics', quality: 4 }
    ]);

    const updatedChap = runtime.getState().chapters.find(c => c.id === 'chap-kinematics')!;
    expect(updatedChap.revisionCount).toBe(1);
    expect(updatedChap.sm2Interval).toBe(1);
    expect(updatedChap.nextRevisionDueAt).toBeDefined();
    expect(updatedChap.lastRevisedAt).toBeDefined();

    const m = runtime.getState().todayMissions.find(x => x.id === 'mission-batch-rev');
    expect(m?.completed).toBe(true);
    expect(runtime.getState().completedPlannerMissionIds).toContain('mission-batch-rev');
  });

  it('marks matching Watch Lecture, Solve DPP, and Solve PYQs missions complete when chapter milestones are reached', async () => {
    runtime.updateStateOptimistic({
      chapters: [
        {
          id: 'chap-kinematics',
          name: 'Kinematics',
          subject: 'physics',
          unit: 'Mechanics',
          completion: 20,
          currentLecture: 2,
          totalLectures: 10,
          theoryComplete: false,
          dppComplete: false,
          pyqsComplete: false,
          difficulty: 'Medium',
          confidence: 60,
          status: 'Learning'
        } as any
      ],
      todayMissions: [
        {
          id: 'mission-lec-kinematics',
          subject: 'physics',
          chapter: 'Kinematics',
          chapterId: 'chap-kinematics',
          type: 'Watch Lecture',
          taskName: 'Watch Kinematics Lecture',
          duration: 60,
          completed: false,
          xp: 60,
          unlocked: true
        },
        {
          id: 'mission-dpp-kinematics',
          subject: 'physics',
          chapter: 'Kinematics',
          chapterId: 'chap-kinematics',
          type: 'Solve DPP',
          taskName: 'Solve Kinematics DPP',
          duration: 45,
          completed: false,
          xp: 50,
          unlocked: false
        },
        {
          id: 'mission-pyq-kinematics',
          subject: 'physics',
          chapter: 'Kinematics',
          chapterId: 'chap-kinematics',
          type: 'Solve PYQs',
          taskName: 'Solve Kinematics PYQs',
          duration: 60,
          completed: false,
          xp: 75,
          unlocked: false
        }
      ],
      completedPlannerMissionIds: []
    });

    // 1. Advance lecture progress to 10/10 -> Watch Lecture completes
    await actions.updateChapterProgress('chap-kinematics', 10, true);
    let state = runtime.getState();
    const lecMission = state.todayMissions.find(m => m.id === 'mission-lec-kinematics');
    expect(lecMission?.completed).toBe(true);
    expect(state.completedPlannerMissionIds).toContain('mission-lec-kinematics');

    // 2. Mark DPP complete -> Solve DPP completes
    await actions.updateChapterProgress('chap-kinematics', {}, undefined, true);
    state = runtime.getState();
    const dppMission = state.todayMissions.find(m => m.id === 'mission-dpp-kinematics');
    expect(dppMission?.completed).toBe(true);
    expect(state.completedPlannerMissionIds).toContain('mission-dpp-kinematics');

    // 3. Mark PYQs complete -> Solve PYQs completes
    await actions.updateChapterProgress('chap-kinematics', {}, undefined, undefined, true);
    state = runtime.getState();
    const pyqMission = state.todayMissions.find(m => m.id === 'mission-pyq-kinematics');
    expect(pyqMission?.completed).toBe(true);
    expect(state.completedPlannerMissionIds).toContain('mission-pyq-kinematics');
  });
});
