import { describe, it, expect } from 'vitest';
import { SubjectId, Chapter } from '../../types/index';

// Replicate exact matrix logic from PlannerPage.tsx for empirical validation
import { generateWeeklyMatrix, getDayFocusPill, getHeaderBadgeText, WeeklyBlock } from '../../engines/planner/PlannerEngine';

describe('PlannerPage Matrix Slot Generation & Header Views', () => {
  
  describe('Fallback Slot Generation - 3_a_day', () => {
    it('generates exactly 28 blocks across 7 days (4 slots per day)', () => {
      const blocks = generateWeeklyMatrix('3_a_day');
      expect(blocks.length).toBe(28);

      for (let day = 0; day < 7; day++) {
        const dayBlocks = blocks.filter(b => b.dayIndex === day);
        expect(dayBlocks.length).toBe(4);
      }
    });

    it('rotates subjects correctly across slots for 3_a_day', () => {
      const blocks = generateWeeklyMatrix('3_a_day');
      
      // Mon (day 0): Phy, Chem, Math, Revision
      const mon = blocks.filter(b => b.dayIndex === 0);
      expect(mon[0].subject).toBe('physics');
      expect(mon[1].subject).toBe('chemistry');
      expect(mon[2].subject).toBe('maths');
      expect(mon[3].subject).toBe('revision');

      // Tue (day 1): Chem, Math, Phy, Revision
      const tue = blocks.filter(b => b.dayIndex === 1);
      expect(tue[0].subject).toBe('chemistry');
      expect(tue[1].subject).toBe('maths');
      expect(tue[2].subject).toBe('physics');
      expect(tue[3].subject).toBe('revision');

      // Wed (day 2): Math, Phy, Chem, Revision
      const wed = blocks.filter(b => b.dayIndex === 2);
      expect(wed[0].subject).toBe('maths');
      expect(wed[1].subject).toBe('physics');
      expect(wed[2].subject).toBe('chemistry');
      expect(wed[3].subject).toBe('revision');

      // Thu (day 3): Phy, Chem, Math, Revision (repeats cycle)
      const thu = blocks.filter(b => b.dayIndex === 3);
      expect(thu[0].subject).toBe('physics');
      expect(thu[1].subject).toBe('chemistry');
      expect(thu[2].subject).toBe('maths');
      expect(thu[3].subject).toBe('revision');
    });

    it('has correct time slots for all days', () => {
      const blocks = generateWeeklyMatrix('3_a_day');
      const timeSlots = [
        'Morning (07:00 - 09:30)',
        'Afternoon (14:00 - 16:00)',
        'Evening (17:30 - 19:30)',
        'Night (21:30 - 22:30)'
      ];

      for (let day = 0; day < 7; day++) {
        const dayBlocks = blocks.filter(b => b.dayIndex === day);
        dayBlocks.forEach((b, idx) => {
          expect(b.timeSlot).toBe(timeSlots[idx]);
        });
      }
    });
  });

  describe('Fallback Slot Generation - 2_a_day_alternating', () => {
    it('generates exactly 28 blocks across 7 days (4 slots per day)', () => {
      const blocks = generateWeeklyMatrix('2_a_day_alternating');
      expect(blocks.length).toBe(28);

      for (let day = 0; day < 7; day++) {
        const dayBlocks = blocks.filter(b => b.dayIndex === day);
        expect(dayBlocks.length).toBe(4);
      }
    });

    it('rotates subjects correctly across slots for 2_a_day_alternating', () => {
      const blocks = generateWeeklyMatrix('2_a_day_alternating');
      
      // Mon (day 0): Phy (morning), Chem (afternoon), Phy (evening), Revision (night)
      const mon = blocks.filter(b => b.dayIndex === 0);
      expect(mon[0].subject).toBe('physics');
      expect(mon[1].subject).toBe('chemistry');
      expect(mon[2].subject).toBe('physics');
      expect(mon[3].subject).toBe('revision');

      // Tue (day 1): Chem, Math, Chem, Revision
      const tue = blocks.filter(b => b.dayIndex === 1);
      expect(tue[0].subject).toBe('chemistry');
      expect(tue[1].subject).toBe('maths');
      expect(tue[2].subject).toBe('chemistry');
      expect(tue[3].subject).toBe('revision');

      // Wed (day 2): Math, Phy, Math, Revision
      const wed = blocks.filter(b => b.dayIndex === 2);
      expect(wed[0].subject).toBe('maths');
      expect(wed[1].subject).toBe('physics');
      expect(wed[2].subject).toBe('maths');
      expect(wed[3].subject).toBe('revision');
    });
  });

  describe('Fallback Slot Generation - 1_a_day_alternating', () => {
    it('generates exactly 28 blocks across 7 days (4 slots per day)', () => {
      const blocks = generateWeeklyMatrix('1_a_day_alternating');
      expect(blocks.length).toBe(28);

      for (let day = 0; day < 7; day++) {
        const dayBlocks = blocks.filter(b => b.dayIndex === day);
        expect(dayBlocks.length).toBe(4);
      }
    });

    it('rotates subjects correctly across slots for 1_a_day_alternating', () => {
      const blocks = generateWeeklyMatrix('1_a_day_alternating');
      
      // Mon (day 0): Phy, Phy, Phy, Revision
      const mon = blocks.filter(b => b.dayIndex === 0);
      expect(mon[0].subject).toBe('physics');
      expect(mon[1].subject).toBe('physics');
      expect(mon[2].subject).toBe('physics');
      expect(mon[3].subject).toBe('revision');

      // Tue (day 1): Chem, Chem, Chem, Revision
      const tue = blocks.filter(b => b.dayIndex === 1);
      expect(tue[0].subject).toBe('chemistry');
      expect(tue[1].subject).toBe('chemistry');
      expect(tue[2].subject).toBe('chemistry');
      expect(tue[3].subject).toBe('revision');

      // Wed (day 2): Math, Math, Math, Revision
      const wed = blocks.filter(b => b.dayIndex === 2);
      expect(wed[0].subject).toBe('maths');
      expect(wed[1].subject).toBe('maths');
      expect(wed[2].subject).toBe('maths');
      expect(wed[3].subject).toBe('revision');
    });
  });

  describe('Day Focus Pills & Header Badges', () => {
    it('returns correct day focus pills for 1_a_day_alternating', () => {
      expect(getDayFocusPill(0, '1_a_day_alternating')).toBe('PHYSICS ONLY');
      expect(getDayFocusPill(1, '1_a_day_alternating')).toBe('CHEMISTRY ONLY');
      expect(getDayFocusPill(2, '1_a_day_alternating')).toBe('MATHS ONLY');
      expect(getDayFocusPill(3, '1_a_day_alternating')).toBe('PHYSICS ONLY');
      expect(getDayFocusPill(4, '1_a_day_alternating')).toBe('CHEMISTRY ONLY');
      expect(getDayFocusPill(5, '1_a_day_alternating')).toBe('MATHS ONLY');
      expect(getDayFocusPill(6, '1_a_day_alternating')).toBe('PHYSICS ONLY');
    });

    it('returns correct day focus pills for 2_a_day_alternating', () => {
      expect(getDayFocusPill(0, '2_a_day_alternating')).toBe('PHY + CHEM');
      expect(getDayFocusPill(1, '2_a_day_alternating')).toBe('CHEM + MATHS');
      expect(getDayFocusPill(2, '2_a_day_alternating')).toBe('MATHS + PHY');
      expect(getDayFocusPill(3, '2_a_day_alternating')).toBe('PHY + CHEM');
    });

    it('returns correct day focus pills for 3_a_day', () => {
      for (let day = 0; day < 7; day++) {
        expect(getDayFocusPill(day, '3_a_day')).toBe('ALL 3 SUBJS');
      }
    });

    it('returns correct header badge label rendering for all strategies', () => {
      expect(getHeaderBadgeText('1_a_day_alternating')).toBe('1 Subject Focus');
      expect(getHeaderBadgeText('2_a_day_alternating')).toBe('2 Subjects Alternating');
      expect(getHeaderBadgeText('3_a_day')).toBe('3 Subjects Daily');
    });
  });

  describe('Edge Cases & Resiliency', () => {
    it('handles empty chapters array without crashing or throwing errors', () => {
      const blocks = generateWeeklyMatrix('3_a_day', []);
      expect(blocks.length).toBe(28);
      expect(blocks[0].chapterName).toBe('Kinematics'); // default fallback
    });

    it('handles todayMissions on current day correctly when todayMissions provided', () => {
      const mockTodayMission = [{
        id: 'tm-1',
        subject: 'physics',
        chapter: 'Rotational Motion',
        taskName: 'Solve 10 Hard Numerical Problems',
        type: 'Solve PYQs',
        duration: 90,
        completed: false,
        priorityScore: 98
      }];

      const blocks = generateWeeklyMatrix('3_a_day', [], mockTodayMission, null, 2); // Wed is current day
      const wedBlocks = blocks.filter(b => b.dayIndex === 2);
      expect(wedBlocks.length).toBe(1);
      expect(wedBlocks[0].chapterName).toBe('Rotational Motion');
      expect(wedBlocks[0].id).toBe('today-tm-1');
    });
  });

});
