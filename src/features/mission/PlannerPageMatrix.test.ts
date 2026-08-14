import { describe, it, expect } from 'vitest';
import { SubjectId, Chapter } from '@/types/index';

// Replicate exact matrix logic from PlannerPage.tsx for empirical validation
import { generateWeeklyMatrix, getDayFocusPill, getHeaderBadgeText, WeeklyBlock } from '@jee-os/engines';

// Helper to create a minimal active in-progress chapter for testing
function makeActiveChapter(id: string, name: string, subject: SubjectId, completion: number = 30): Chapter {
  return {
    id,
    name,
    subject,
    serialNumber: id.toUpperCase(),
    unit: 'Core Module',
    completion,
    currentLecture: 3,
    totalLectures: 10,
    theoryComplete: false,
    dppComplete: false,
    pyqsComplete: false,
    mistakes: [],
    weightage: 4,
    chapterOnHold: false,
    dppOnHold: false,
    pyqOnHold: false,
  } as unknown as Chapter;
}

const activeChapters: Chapter[] = [
  makeActiveChapter('p1', 'Kinematics', 'physics'),
  makeActiveChapter('c1', 'Mole Concept', 'chemistry'),
  makeActiveChapter('m1', 'Sets & Relations', 'maths'),
];

describe('PlannerPage Matrix Slot Generation & Header Views', () => {
  
  describe('Fallback Slot Generation - 3_a_day', () => {
    it('generates study blocks across 7 days when active chapters exist', () => {
      const blocks = generateWeeklyMatrix('3_a_day', activeChapters);
      const studyBlocks = blocks.filter(b => (b.taskType as any) !== 'Break');
      expect(studyBlocks.length).toBe(28);

      for (let day = 0; day < 7; day++) {
        const dayStudyBlocks = blocks.filter(b => b.dayIndex === day && (b.taskType as any) !== 'Break');
        expect(dayStudyBlocks.length).toBe(4);
      }
    });

    it('rotates subjects correctly across slots for 3_a_day', () => {
      const blocks = generateWeeklyMatrix('3_a_day', activeChapters);
      
      // Mon (day 0): Phy, Chem, Math
      const mon = blocks.filter(b => b.dayIndex === 0 && (b.taskType as any) !== 'Break' && b.subject !== 'revision');
      expect(mon[0].subject).toBe('physics');
      expect(mon[1].subject).toBe('chemistry');
      expect(mon[2].subject).toBe('maths');

      // Tue (day 1): Chem, Math, Phy
      const tue = blocks.filter(b => b.dayIndex === 1 && (b.taskType as any) !== 'Break' && b.subject !== 'revision');
      expect(tue[0].subject).toBe('chemistry');
      expect(tue[1].subject).toBe('maths');
      expect(tue[2].subject).toBe('physics');

      // Wed (day 2): Math, Phy, Chem
      const wed = blocks.filter(b => b.dayIndex === 2 && (b.taskType as any) !== 'Break' && b.subject !== 'revision');
      expect(wed[0].subject).toBe('maths');
      expect(wed[1].subject).toBe('physics');
      expect(wed[2].subject).toBe('chemistry');

      // Thu (day 3): Phy, Chem, Math (repeats cycle)
      const thu = blocks.filter(b => b.dayIndex === 3 && (b.taskType as any) !== 'Break' && b.subject !== 'revision');
      expect(thu[0].subject).toBe('physics');
      expect(thu[1].subject).toBe('chemistry');
      expect(thu[2].subject).toBe('maths');
    });

    it('has correct non-empty time slots for all days', () => {
      const blocks = generateWeeklyMatrix('3_a_day', activeChapters);
      for (let day = 0; day < 7; day++) {
        const dayBlocks = blocks.filter(b => b.dayIndex === day);
        dayBlocks.forEach((b) => {
          expect(b.timeSlot).toBeTruthy();
          expect(typeof b.timeSlot).toBe('string');
        });
      }
    });
  });

  describe('Fallback Slot Generation - 2_a_day_alternating', () => {
    it('generates study blocks across 7 days when active chapters exist', () => {
      const blocks = generateWeeklyMatrix('2_a_day_alternating', activeChapters);
      const studyBlocks = blocks.filter(b => (b.taskType as any) !== 'Break');
      expect(studyBlocks.length).toBe(28);

      for (let day = 0; day < 7; day++) {
        const dayBlocks = blocks.filter(b => b.dayIndex === day && (b.taskType as any) !== 'Break');
        expect(dayBlocks.length).toBe(4);
      }
    });

    it('rotates subjects correctly across slots for 2_a_day_alternating', () => {
      const blocks = generateWeeklyMatrix('2_a_day_alternating', activeChapters);
      
      // Mon (day 0): Phy (morning), Chem (afternoon), Phy (evening)
      const mon = blocks.filter(b => b.dayIndex === 0 && (b.taskType as any) !== 'Break' && b.subject !== 'revision');
      expect(mon[0].subject).toBe('physics');
      expect(mon[1].subject).toBe('chemistry');
      expect(mon[2].subject).toBe('physics');

      // Tue (day 1): Chem, Math, Chem
      const tue = blocks.filter(b => b.dayIndex === 1 && (b.taskType as any) !== 'Break' && b.subject !== 'revision');
      expect(tue[0].subject).toBe('chemistry');
      expect(tue[1].subject).toBe('maths');
      expect(tue[2].subject).toBe('chemistry');

      // Wed (day 2): Math, Phy, Math
      const wed = blocks.filter(b => b.dayIndex === 2 && (b.taskType as any) !== 'Break' && b.subject !== 'revision');
      expect(wed[0].subject).toBe('maths');
      expect(wed[1].subject).toBe('physics');
      expect(wed[2].subject).toBe('maths');
    });
  });

  describe('Fallback Slot Generation - 1_a_day_alternating', () => {
    it('generates study blocks across 7 days when active chapters exist', () => {
      const blocks = generateWeeklyMatrix('1_a_day_alternating', activeChapters);
      const studyBlocks = blocks.filter(b => (b.taskType as any) !== 'Break');
      expect(studyBlocks.length).toBe(28);

      for (let day = 0; day < 7; day++) {
        const dayBlocks = blocks.filter(b => b.dayIndex === day && (b.taskType as any) !== 'Break');
        expect(dayBlocks.length).toBe(4);
      }
    });

    it('rotates subjects correctly across slots for 1_a_day_alternating', () => {
      const blocks = generateWeeklyMatrix('1_a_day_alternating', activeChapters);
      
      // Mon (day 0): Phy, Phy, Phy
      const mon = blocks.filter(b => b.dayIndex === 0 && (b.taskType as any) !== 'Break' && b.subject !== 'revision');
      expect(mon[0].subject).toBe('physics');
      expect(mon[1].subject).toBe('physics');
      expect(mon[2].subject).toBe('physics');

      // Tue (day 1): Chem, Chem, Chem
      const tue = blocks.filter(b => b.dayIndex === 1 && (b.taskType as any) !== 'Break' && b.subject !== 'revision');
      expect(tue[0].subject).toBe('chemistry');
      expect(tue[1].subject).toBe('chemistry');
      expect(tue[2].subject).toBe('chemistry');

      // Wed (day 2): Math, Math, Math
      const wed = blocks.filter(b => b.dayIndex === 2 && (b.taskType as any) !== 'Break' && b.subject !== 'revision');
      expect(wed[0].subject).toBe('maths');
      expect(wed[1].subject).toBe('maths');
      expect(wed[2].subject).toBe('maths');
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
    it('handles empty chapters array by only generating revision blocks', () => {
      const blocks = generateWeeklyMatrix('3_a_day', []);
      // With no active chapters, only revision blocks are generated (1 per day)
      expect(blocks.length).toBe(7);
      expect(blocks.every(b => b.subject === 'revision')).toBe(true);
    });

    it('skips subjects with all chapters on hold', () => {
      const chaptersWithHold: Chapter[] = [
        makeActiveChapter('p1', 'Kinematics', 'physics'),
        { ...makeActiveChapter('c1', 'Mole Concept', 'chemistry'), chapterOnHold: true } as Chapter,
        makeActiveChapter('m1', 'Sets & Relations', 'maths'),
      ];
      const blocks = generateWeeklyMatrix('3_a_day', chaptersWithHold);
      // Chemistry blocks should be skipped since the only chem chapter is on hold
      const chemBlocks = blocks.filter(b => b.subject === 'chemistry');
      expect(chemBlocks.length).toBe(0);
    });

    it('handles todayMissions on current day correctly when todayMissions provided', () => {
      const mockTodayMission = [{
        id: 'tm-1',
        subject: 'physics',
        chapter: 'Rotational Motion',
        taskName: 'Solve 10 Hard Numerical Problems',
        type: 'Solve PYQs',
        duration: 90,
        timeSlot: '10:00 - 11:30',
        isManualOverride: true,
        completed: false,
        priorityScore: 98
      }];

      const blocks = generateWeeklyMatrix('3_a_day', activeChapters, mockTodayMission, null, 2, undefined, [], {}, "00:00", "23:59"); // Wed is current day
      const wedStudyBlocks = blocks.filter(b => b.dayIndex === 2 && (b.taskType as any) !== 'Break');
      expect(wedStudyBlocks.length).toBe(1);
      expect(wedStudyBlocks[0].chapterName).toBe('Rotational Motion');
      expect(wedStudyBlocks[0].id).toBe('today-tm-1');
    });
  });

});
