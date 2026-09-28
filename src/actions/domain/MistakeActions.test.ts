import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MistakeActions } from './MistakeActions';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { MistakeRepository } from '@/repositories/mistakeRepository';
import { Mistake } from '@/types/index';

vi.mock('@/firebase', () => ({
  db: {}
}));

vi.mock('@/repositories/mistakeRepository', () => ({
  MistakeRepository: {
    saveMistake: vi.fn().mockResolvedValue(undefined),
    saveMistakesBatch: vi.fn().mockResolvedValue(undefined),
    deleteMistake: vi.fn().mockResolvedValue(undefined),
    deleteMistakesBatch: vi.fn().mockResolvedValue(undefined),
    getMistakes: vi.fn().mockResolvedValue([]),
    updateMistake: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('MistakeActions Domain Logic', () => {
  let runtime: StudyBrainRuntime;
  const sampleMistakes: Mistake[] = [
    {
      id: 'm1',
      subject: 'physics',
      chapter: 'Kinematics',
      topic: '1D Motion',
      questionText: 'Test question 1',
      revisionStatus: 'New',
      difficulty: 'Medium',
      dateLogged: '2026-09-01T00:00:00Z',
      timeTaken: 2,
      recoveryScore: 0
    } as Mistake,
    {
      id: 'm2',
      subject: 'chemistry',
      chapter: 'Atomic Structure',
      topic: 'Bohr Model',
      questionText: 'Test question 2',
      revisionStatus: 'Reviewed',
      difficulty: 'Hard',
      dateLogged: '2026-09-02T00:00:00Z',
      timeTaken: 4,
      recoveryScore: 40
    } as Mistake
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = StudyBrainRuntime.getInstance();
    runtime.updateStateOptimistic({
      mistakes: [...sampleMistakes],
      xp: { daily: 100, weekly: 500, total: 2000, level: 3, streak: 5, nextLevelXP: 3000 },
      writeBlocked: false
    });
  });

  describe('Guest user operations', () => {
    it('successfully deletes a mistake in-memory without contacting Firestore', async () => {
      const actions = new MistakeActions(runtime, 'guest');
      expect(actions.isGuestUser()).toBe(true);

      await actions.deleteMistake('m1');

      // State is updated optimistically
      const state = runtime.getState();
      expect(state.mistakes.find(m => m.id === 'm1')).toBeUndefined();
      expect(state.mistakes.length).toBe(1);

      // Firestore was not invoked for guest user
      expect(MistakeRepository.deleteMistake).not.toHaveBeenCalled();
    });

    it('successfully batch deletes mistakes in-memory without contacting Firestore', async () => {
      const actions = new MistakeActions(runtime, 'guest');

      await actions.deleteMistakesBatch(['m1', 'm2']);

      const state = runtime.getState();
      expect(state.mistakes.length).toBe(0);
      expect(MistakeRepository.deleteMistakesBatch).not.toHaveBeenCalled();
    });

    it('adds a mistake without calling Firestore in guest mode', async () => {
      const actions = new MistakeActions(runtime, 'guest');

      await actions.addMistake({
        subject: 'maths',
        chapter: 'Matrices',
        topic: 'Determinants',
        questionText: 'Evaluate determinant',
        revisionStatus: 'New',
        difficulty: 'Easy',
        dateLogged: new Date().toISOString(),
        timeTaken: 1
      } as any);

      const state = runtime.getState();
      expect(state.mistakes.length).toBe(3);
      expect(MistakeRepository.saveMistake).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated user operations', () => {
    it('calls Firestore deleteMistake for authenticated users', async () => {
      const actions = new MistakeActions(runtime, 'user-123');
      expect(actions.isGuestUser()).toBe(false);

      await actions.deleteMistake('m1');

      const state = runtime.getState();
      expect(state.mistakes.find(m => m.id === 'm1')).toBeUndefined();
      expect(MistakeRepository.deleteMistake).toHaveBeenCalledWith('user-123', 'm1');
    });

    it('calls Firestore deleteMistakesBatch for authenticated users', async () => {
      const actions = new MistakeActions(runtime, 'user-123');

      await actions.deleteMistakesBatch(['m1', 'm2']);

      const state = runtime.getState();
      expect(state.mistakes.length).toBe(0);
      expect(MistakeRepository.deleteMistakesBatch).toHaveBeenCalledWith('user-123', ['m1', 'm2']);
    });

    it('rolls back optimistic deletion if Firestore call throws', async () => {
      vi.mocked(MistakeRepository.deleteMistake).mockRejectedValueOnce(new Error('Network offline'));
      const actions = new MistakeActions(runtime, 'user-123');

      await expect(actions.deleteMistake('m1')).rejects.toThrow(/Sync Error \(deleteMistake\)/);

      // State rolled back to original 2 mistakes
      const state = runtime.getState();
      expect(state.mistakes.length).toBe(2);
      expect(state.mistakes.find(m => m.id === 'm1')).toBeDefined();
    });
  });

  describe('Torn-off method preservation (StudyBrainActions)', () => {
    it('executes deleteMistake successfully even when extracted as a detached function reference', async () => {
      const { StudyBrainActions } = await import('../StudyBrainActions');
      const rootActions = new StudyBrainActions(runtime, 'guest');

      // Detach method from instance
      const detachedDelete = rootActions.deleteMistake;

      // Calling detachedDelete() without context must not throw Cannot read properties of undefined (reading 'mistakes')
      await detachedDelete('m1');

      const state = runtime.getState();
      expect(state.mistakes.find(m => m.id === 'm1')).toBeUndefined();
    });
  });
});
