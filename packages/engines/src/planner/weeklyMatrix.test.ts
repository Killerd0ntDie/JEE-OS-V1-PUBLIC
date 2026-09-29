import { describe, it, expect } from 'vitest';
import {
  generateWeeklyMatrix,
  normalizeTwoDaySplitConfig,
  getDayFocusPill,
  getHeaderBadgeText
} from './weeklyMatrix';
import { Chapter } from '../types/index';

describe('weeklyMatrix Engine Suite', () => {
  const mockChapters: Chapter[] = [
    {
      id: 'p1',
      name: 'Kinematics',
      subject: 'physics',
      unit: 'Mechanics',
      status: 'In Progress',
      syllabusStage: 'In Progress',
      completion: 40,
      currentLecture: 3,
      totalLectures: 10
    },
    {
      id: 'c1',
      name: 'Chemical Bonding',
      subject: 'chemistry',
      unit: 'Inorganic',
      status: 'In Progress',
      syllabusStage: 'In Progress',
      completion: 50,
      currentLecture: 4,
      totalLectures: 8
    },
    {
      id: 'm1',
      name: 'Complex Numbers',
      subject: 'maths',
      unit: 'Algebra',
      status: 'In Progress',
      syllabusStage: 'In Progress',
      completion: 30,
      currentLecture: 2,
      totalLectures: 12
    }
  ];

  describe('Split Configuration Helpers', () => {
    it('normalizes custom and fallback two-day split configurations', () => {
      const fallback = normalizeTwoDaySplitConfig(undefined);
      expect(fallback).toHaveLength(3);
      expect(fallback[0]).toEqual(['physics', 'chemistry']);
      expect(fallback[1]).toEqual(['chemistry', 'maths']);
      expect(fallback[2]).toEqual(['maths', 'physics']);

      const custom = normalizeTwoDaySplitConfig([
        ['maths', 'physics'],
        ['physics', 'chemistry'],
        ['chemistry', 'maths']
      ]);
      expect(custom[0]).toEqual(['maths', 'physics']);
    });

    it('returns appropriate focus pills and header badge text across all strategies', () => {
      expect(getHeaderBadgeText('1_a_day_alternating')).toBe('1 Subject Focus');
      expect(getHeaderBadgeText('2_a_day_alternating')).toBe('2 Subjects Alternating');
      expect(getHeaderBadgeText('3_a_day')).toBe('3 Subjects Daily');

      expect(getDayFocusPill(0, '1_a_day_alternating')).toBe('PHYSICS ONLY');
      expect(getDayFocusPill(1, '1_a_day_alternating')).toBe('CHEMISTRY ONLY');
      expect(getDayFocusPill(2, '1_a_day_alternating')).toBe('MATHS ONLY');

      expect(getDayFocusPill(0, '2_a_day_alternating')).toBe('PHY + CHEM');
      expect(getDayFocusPill(0, '3_a_day')).toBe('ALL 3 SUBJS');
    });
  });

  describe('Procedural Generation', () => {
    it('generates 7-day schedule with 1_a_day_alternating rotation', () => {
      const matrix = generateWeeklyMatrix('1_a_day_alternating', mockChapters, null, null, 0);
      expect(matrix.length).toBeGreaterThan(0);

      // Verify days are covered
      const daysRepresented = new Set(matrix.map(b => b.dayIndex));
      expect(daysRepresented.size).toBe(7);

      // Day 0 (Mon): Physics focus
      const day0Blocks = matrix.filter(b => b.dayIndex === 0 && b.subject !== 'revision' && b.subject !== 'break');
      expect(day0Blocks.length).toBeGreaterThan(0);
      day0Blocks.forEach(b => {
        expect(b.subject).toBe('physics');
      });

      // Day 1 (Tue): Chemistry focus
      const day1Blocks = matrix.filter(b => b.dayIndex === 1 && b.subject !== 'revision' && b.subject !== 'break');
      expect(day1Blocks.length).toBeGreaterThan(0);
      day1Blocks.forEach(b => {
        expect(b.subject).toBe('chemistry');
      });
    });

    it('generates 7-day schedule with 2_a_day_alternating rotation', () => {
      const matrix = generateWeeklyMatrix('2_a_day_alternating', mockChapters, null, null, 0);
      expect(matrix.length).toBeGreaterThan(0);

      // Day 0: Physics and Chemistry
      const day0Blocks = matrix.filter(b => b.dayIndex === 0 && b.subject !== 'revision' && b.subject !== 'break');
      const day0Subjects = new Set(day0Blocks.map(b => b.subject));
      expect(day0Subjects.has('physics')).toBe(true);
      expect(day0Subjects.has('chemistry')).toBe(true);
    });

    it('generates 7-day schedule with 3_a_day rotation', () => {
      const matrix = generateWeeklyMatrix('3_a_day', mockChapters, null, null, 0);
      expect(matrix.length).toBeGreaterThan(0);

      const day0Blocks = matrix.filter(b => b.dayIndex === 0 && b.subject !== 'revision' && b.subject !== 'break');
      const day0Subjects = new Set(day0Blocks.map(b => b.subject));
      expect(day0Subjects.size).toBe(3);
      expect(day0Subjects.has('physics')).toBe(true);
      expect(day0Subjects.has('chemistry')).toBe(true);
      expect(day0Subjects.has('maths')).toBe(true);
    });
  });

  describe('Overrides & Deletions', () => {
    it('filters out deletedMissionIds and applies scheduleOverrides', () => {
      const initial = generateWeeklyMatrix('1_a_day_alternating', mockChapters, null, null, 0);
      const targetBlock = initial[0];

      const deleted = generateWeeklyMatrix(
        '1_a_day_alternating',
        mockChapters,
        null,
        null,
        0,
        undefined,
        [targetBlock.id]
      );
      expect(deleted.some(b => b.id === targetBlock.id)).toBe(false);

      const secondBlock = initial[1];
      const overridden = generateWeeklyMatrix(
        '1_a_day_alternating',
        mockChapters,
        null,
        null,
        0,
        undefined,
        [],
        {
          [secondBlock.id]: {
            dayIndex: 5,
            timeSlot: 'Night (22:00 - 23:00)'
          }
        }
      );
      const modifiedBlock = overridden.find(b => b.id === secondBlock.id);
      expect(modifiedBlock).toBeDefined();
      expect(modifiedBlock?.dayIndex).toBe(5);
      expect(modifiedBlock?.dayName).toBe('Sat');
      expect(modifiedBlock?.timeSlot).toBe('Night (22:00 - 23:00)');
      expect(modifiedBlock?.isManualOverride).toBe(true);
    });
  });
});
