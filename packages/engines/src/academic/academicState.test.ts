import { describe, it, expect } from 'vitest';
import { normalizeChapter } from './academicState';
import { Chapter } from '../types/index';

describe('normalizeChapter Status Granularity Invariant', () => {
  it('preserves Theory Complete status when lectures are finished but DPP is pending', () => {
    const rawChapter: Chapter = {
      id: 'chap-test-1',
      name: 'Vectors',
      subject: 'maths',
      unit: 'Coordinate Geometry',
      completion: 40,
      currentLecture: 8,
      totalLectures: 8,
      theoryComplete: true,
      dppComplete: false,
      pyqsComplete: false,
      difficulty: 'Medium',
      confidence: 70,
      status: 'Theory Complete'
    } as any;

    const normalized = normalizeChapter(rawChapter);
    expect(normalized.status).toBe('Theory Complete');
    expect(normalized.theoryComplete).toBe(true);
    expect(normalized.dppComplete).toBe(false);
  });

  it('preserves DPP Pending status', () => {
    const rawChapter: Chapter = {
      id: 'chap-test-2',
      name: 'Thermodynamics',
      subject: 'physics',
      unit: 'Thermal Physics',
      completion: 50,
      currentLecture: 10,
      totalLectures: 10,
      theoryComplete: true,
      dppComplete: false,
      pyqsComplete: false,
      difficulty: 'Hard',
      confidence: 50,
      status: 'DPP Pending'
    } as any;

    const normalized = normalizeChapter(rawChapter);
    expect(normalized.status).toBe('DPP Pending');
  });

  it('preserves PYQ Pending status when DPP is done but PYQs remain', () => {
    const rawChapter: Chapter = {
      id: 'chap-test-3',
      name: 'Chemical Bonding',
      subject: 'chemistry',
      unit: 'Inorganic',
      completion: 70,
      currentLecture: 12,
      totalLectures: 12,
      theoryComplete: true,
      dppComplete: true,
      pyqsComplete: false,
      difficulty: 'Medium',
      confidence: 80,
      status: 'PYQ Pending'
    } as any;

    const normalized = normalizeChapter(rawChapter);
    expect(normalized.status).toBe('PYQ Pending');
  });

  it('preserves Revision Due status when scheduled for revision', () => {
    const rawChapter: Chapter = {
      id: 'chap-test-4',
      name: 'Kinematics',
      subject: 'physics',
      unit: 'Mechanics',
      completion: 90,
      currentLecture: 10,
      totalLectures: 10,
      theoryComplete: true,
      dppComplete: true,
      pyqsComplete: true,
      difficulty: 'Easy',
      confidence: 90,
      status: 'Revision Due'
    } as any;

    const normalized = normalizeChapter(rawChapter);
    expect(normalized.status).toBe('Revision Due');
    expect(normalized.syllabusStage).toBe('Revision');
  });

  it('correctly sets Mastered status when all components are completed', () => {
    const rawChapter: Chapter = {
      id: 'chap-test-5',
      name: 'Electrostatics',
      subject: 'physics',
      unit: 'Electromagnetism',
      completion: 100,
      currentLecture: 15,
      totalLectures: 15,
      theoryComplete: true,
      dppComplete: true,
      pyqsComplete: true,
      difficulty: 'Hard',
      confidence: 95,
      status: 'Mastered'
    } as any;

    const normalized = normalizeChapter(rawChapter);
    expect(normalized.status).toBe('Mastered');
    expect(normalized.syllabusStage).toBe('Mastered');
  });
});
