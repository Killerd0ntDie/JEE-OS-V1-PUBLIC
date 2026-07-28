import { describe, it, expect } from 'vitest';
import { StudyBrainService } from './studyBrainService';
import { Chapter } from '../types/index';

describe('StudyBrainService.calculateMastery', () => {
  it('returns 0 score and clear message if chapter is not started', () => {
    const chapter: Chapter = {
      id: 'test-1',
      subject: 'physics',
      unit: 'Mechanics',
      name: 'Kinematics',
      completion: 0,
      currentLecture: 0,
      totalLectures: 5,
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0,
      difficulty: 'Easy',
      confidence: 0,
      estimatedRemainingTime: 10,
      priority: 1,
      dependencies: [],
      weaknessScore: 0,
      status: 'Not Started',
      solvedQuestions: 0,
      lastRevisionDaysAgo: 0,
    };

    const result = StudyBrainService.calculateMastery(chapter, 0);
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('not been started');
  });

  it('calculates mastery using multiple real signals (lecture, DPP, PYQ, revisions, mistakes, accuracy, retention, confidence)', () => {
    const chapter: Chapter = {
      id: 'test-2',
      subject: 'maths',
      unit: 'Algebra',
      name: 'Quadratic Equations',
      completion: 100,
      currentLecture: 5,
      totalLectures: 5,
      theoryComplete: true,
      dppComplete: true,
      pyqsComplete: true,
      revisionCount: 3,
      difficulty: 'Medium',
      confidence: 85,
      estimatedRemainingTime: 0,
      priority: 1,
      dependencies: [],
      weaknessScore: 10,
      status: 'Mastered',
      solvedQuestions: 80,
      lastRevisionDaysAgo: 2, // Fresh revision
    };

    // Case A: High performance, no mistakes, recently revised
    const resultHigh = StudyBrainService.calculateMastery(chapter, 0);
    expect(resultHigh.score).toBeGreaterThan(80);
    expect(resultHigh.explanation).toContain('Completed all lectures');
    expect(resultHigh.explanation).toContain('Completed PYQs');
    expect(resultHigh.explanation).toContain('Revised 3 times');
    expect(resultHigh.explanation).toContain('Accuracy 100%');

    // Case B: High performance but with 4 active mistakes and revision overdue
    const chapterOverdue = {
      ...chapter,
      lastRevisionDaysAgo: 15, // Overdue
    };
    const resultOverdue = StudyBrainService.calculateMastery(chapterOverdue, 4);
    expect(resultOverdue.score).toBeLessThan(resultHigh.score);
    expect(resultOverdue.explanation).toContain('Revision overdue by 15 days');
    expect(resultOverdue.explanation).toContain('4 active mistakes');
    expect(resultOverdue.explanation).toContain('Accuracy 95%'); // 80 solved, 4 mistakes -> 80/(80+4) = 95%
  });
});
