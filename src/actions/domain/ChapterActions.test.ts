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
});
