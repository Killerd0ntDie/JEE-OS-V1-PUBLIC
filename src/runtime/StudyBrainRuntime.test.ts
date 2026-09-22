import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudyBrainRuntime } from './StudyBrainRuntime';

describe('StudyBrainRuntime Core Architecture', () => {
  let runtime: StudyBrainRuntime;

  beforeEach(() => {
    runtime = StudyBrainRuntime.getInstance();
  });

  it('resets to initial state without throwing null pointer error when knowledgeEngine is uninitialized', () => {
    expect(() => {
      runtime.resetToInitialState();
    }).not.toThrow();

    const state = runtime.getState();
    expect(state.loading).toBe(false);
    expect(state.writeBlocked).toBe(true);
    expect(state.chapters).toEqual([]);
  });

  it('notifies subscribers synchronously upon optimistic updates', () => {
    let capturedEnergy = '';
    const unsubscribe = runtime.subscribe((s) => {
      capturedEnergy = s.energyLevel;
    });

    runtime.updateStateOptimistic({ energyLevel: 'High' });
    expect(capturedEnergy).toBe('High');

    unsubscribe();
  });

  it('BUG-03: supports and updates focusSubject preference in runtime state', () => {
    runtime.updateStateOptimistic({
      settings: {
        ...runtime.getState().settings,
        focusSubject: 'physics'
      }
    });

    const state = runtime.getState();
    expect(state.settings.focusSubject).toBe('physics');
  });

  it('BUG-15: seeds official JEE Main 2024 test paper in customMockTests upon reset or initialization', () => {
    runtime.resetToInitialState();
    const state = runtime.getState();
    expect(state.customMockTests).toBeDefined();
    expect(state.customMockTests.length).toBeGreaterThanOrEqual(1);
    const officialTest = state.customMockTests.find(t => t.id === 'jee-main-2024-shift-1');
    expect(officialTest).toBeDefined();
    expect(officialTest?.name).toContain('JEE Main 2024');
  });

  it('BUG-16 & BUG-17: handles debounced refresh errors by rejecting pending promises', async () => {
    // Spy on executeRefresh to simulate an unexpected engine exception
    const spy = vi.spyOn(runtime as any, 'executeRefresh').mockRejectedValueOnce(new Error('Engine crash simulation'));

    await expect(runtime.refresh('CHAPTER_UPDATE')).rejects.toThrow('Engine crash simulation');

    spy.mockRestore();

    // After failure, runtime should still be ready to process subsequent refreshes without hanging
    await expect(runtime.refresh('CHAPTER_UPDATE')).resolves.toBeUndefined();
  });
});
