import { describe, expect, it } from 'vitest';
import { calculateMockScorePercent } from './mockScoring';

describe('calculateMockScorePercent', () => {
  it('uses the actual total marks when a mock snapshot is present', () => {
    const percent = calculateMockScorePercent({
      totalScore: 60,
      totalQuestions: 20,
      testSnapshot: { totalMarks: 100 } as any,
    });

    expect(percent).toBe(60);
  });

  it('falls back to a safe default only when no mark total is available', () => {
    const percent = calculateMockScorePercent({
      totalScore: 60,
      totalQuestions: 20,
    });

    expect(percent).toBe(75);
  });
});
