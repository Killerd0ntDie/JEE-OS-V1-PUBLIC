import { describe, expect, it } from 'vitest';
import { calculateFocusScore } from './focusScore';

describe('calculateFocusScore', () => {
  it('starts at 100 and declines with interruptions and idle time', () => {
    const score = calculateFocusScore({
      interruptions: 2,
      idleSeconds: 180,
      uninterruptedSeconds: 0,
    });

    expect(score).toBeLessThan(100);
    expect(score).toBe(94);
  });

  it('recovers while the user remains continuously active', () => {
    const score = calculateFocusScore({
      interruptions: 0,
      idleSeconds: 0,
      uninterruptedSeconds: 300,
    });

    expect(score).toBeGreaterThan(100 - 8);
    expect(score).toBe(100);
  });
});
