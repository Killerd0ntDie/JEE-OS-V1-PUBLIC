import { describe, expect, it } from 'vitest';
import { calculateLevelFromXP, getTitleAndColor } from './levelingCalculations';

describe('levelingCalculations', () => {
  describe('calculateLevelFromXP', () => {
    it('correctly calculates Level 1 at 0 XP', () => {
      const result = calculateLevelFromXP(0);
      expect(result.level).toBe(1);
      expect(result.progressPercent).toBe(0);
    });

    it('correctly calculates levels for positive XP', () => {
      const result = calculateLevelFromXP(500); // Level 2 requires 500 XP
      expect(result.level).toBe(2);
      expect(result.progressPercent).toBe(0);
      
      const resultMid = calculateLevelFromXP(750); // Level 2 -> Level 3 requires another 500 XP. 750 means half way to Level 3.
      expect(resultMid.level).toBe(2);
      expect(resultMid.progressPercent).toBe(50);
    });

    it('gracefully handles negative XP by flooring progress at 0%', () => {
      const result = calculateLevelFromXP(-500);
      expect(result.level).toBe(1);
      // Math.max(0, ...) in the code already handles the flooring:
      expect(result.progressPercent).toBe(0); 
    });
  });

  describe('getTitleAndColor', () => {
    it('returns Aspirant for levels < 4', () => {
      expect(getTitleAndColor(1).title).toBe('Aspirant');
      expect(getTitleAndColor(3).title).toBe('Aspirant');
    });

    it('returns Novice for levels 4 to 7', () => {
      expect(getTitleAndColor(4).title).toBe('Novice');
      expect(getTitleAndColor(7).title).toBe('Novice');
    });
  });
});
