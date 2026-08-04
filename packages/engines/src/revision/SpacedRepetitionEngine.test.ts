import { describe, it, expect } from 'vitest';
import { SpacedRepetitionEngine, SM2State } from './SpacedRepetitionEngine';

describe('SpacedRepetitionEngine', () => {
  const engine = new SpacedRepetitionEngine();

  it('calculates initial review for a perfect score (5)', () => {
    const nextState = engine.calculateNextReview(5);
    expect(nextState.repetitions).toBe(1);
    expect(nextState.interval).toBe(1);
    expect(nextState.easeFactor).toBe(2.6); // 2.5 + 0.1
  });

  it('calculates initial review for a blackout (0)', () => {
    const nextState = engine.calculateNextReview(0);
    expect(nextState.repetitions).toBe(0);
    expect(nextState.interval).toBe(1);
    expect(nextState.easeFactor).toBeLessThan(2.5);
  });

  it('handles consecutive successful reviews', () => {
    let state = engine.calculateNextReview(4);
    expect(state.repetitions).toBe(1);
    expect(state.interval).toBe(1);

    state = engine.calculateNextReview(4, state);
    expect(state.repetitions).toBe(2);
    expect(state.interval).toBe(6);

    state = engine.calculateNextReview(4, state);
    expect(state.repetitions).toBe(3);
    // 6 * EF (which is ~2.5) should be around 15
    expect(state.interval).toBe(15);
  });

  it('resets interval when quality is poor but keeps ease factor', () => {
    const state: SM2State = {
      repetitions: 5,
      easeFactor: 2.2,
      interval: 30
    };

    const nextState = engine.calculateNextReview(2, state);
    expect(nextState.repetitions).toBe(0);
    expect(nextState.interval).toBe(1); // interval resets to 1
    // ease factor decreases but shouldn't reset
    expect(nextState.easeFactor).toBeLessThan(2.2); 
    expect(nextState.easeFactor).toBeGreaterThan(1.3);
  });
});
