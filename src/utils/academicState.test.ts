import { describe, it, expect } from 'vitest';
import { getAcademicState, normalizeChapter } from './academicState';
import { Chapter } from '@/types/index';

describe('academicState (BUG-14: Lecture Progress Synchronization)', () => {
  it('prioritizes explicit chapter.currentLecture over stale nested lectureProgress.completedLectures', () => {
    const chapterWithStaleProgress: Chapter = {
      id: 'phys-rot',
      name: 'Rotational Motion',
      subject: 'physics',
      status: 'Learning',
      totalLectures: 12,
      currentLecture: 8, // Explicitly advanced to lecture 8
      lectureProgress: {
        completedLectures: 3, // Stale nested property that was not synced
        totalLectures: 12,
        durationMinutes: 60,
        estimatedTotalTimeHours: 12,
        notesTaken: true
      },
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false
    } as any;

    const acad = getAcademicState(chapterWithStaleProgress);
    expect(acad.lectureProgress.completedLectures).toBe(8);
  });

  it('normalizeChapter preserves explicit currentLecture and syncs lectureProgress', () => {
    const rawChapter: Chapter = {
      id: 'chem-thermo',
      name: 'Thermodynamics',
      subject: 'chemistry',
      status: 'Learning',
      totalLectures: 10,
      currentLecture: 6,
      lectureProgress: {
        completedLectures: 2,
        totalLectures: 10,
        durationMinutes: 50,
        estimatedTotalTimeHours: 10,
        notesTaken: false
      },
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false
    } as any;

    const normalized = normalizeChapter(rawChapter);
    expect(normalized.currentLecture).toBe(6);
    expect(normalized.lectureProgress?.completedLectures).toBe(6);
  });
});
