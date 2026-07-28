import { describe, it, expect } from 'vitest';
import { calculateMistakeScore } from './mistakeIntelligence';
import { Chapter, Mistake } from '../types/index';

describe('calculateMistakeScore', () => {
  const mockChapter: Chapter = {
    id: 'c-rotational',
    name: 'Rotational Dynamics',
    subject: 'physics',
    unit: 'Mechanics',
    completion: 80,
    currentLecture: 5,
    totalLectures: 5,
    theoryComplete: true,
    dppComplete: true,
    pyqsComplete: false,
    revisionCount: 2,
    difficulty: 'Hard',
    confidence: 65,
    estimatedRemainingTime: 2,
    priority: 1, // High Priority
    dependencies: [],
    weaknessScore: 35,
    status: 'Learning',
    solvedQuestions: 50,
    lastRevisionDaysAgo: 5, // Last revised 5 days ago
  };

  it('returns 0 score and empty state explanation if no mistakes exist', () => {
    const result = calculateMistakeScore(mockChapter, []);
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('No recorded mistakes');
  });

  it('calculates danger score correctly for active High-Priority mistakes', () => {
    const mistakes: Mistake[] = [
      {
        id: 'm1',
        subject: 'physics',
        chapter: 'Rotational Dynamics',
        topic: 'Moment of Inertia',
        subtopic: 'Parallel Axis Theorem',
        difficulty: 'JEE Advanced',
        source: 'Mock Test',
        timeTaken: 10,
        correctMethod: 'Apply Integration',
        studentMethod: 'Wrong integration bounds',
        mistakeTypes: ['Conceptual Error'],
        confidence: 30,
        revisionSchedule: '',
        masteryImpact: 'High',
        attemptNumber: 1,
        revisionStatus: 'New',
        recoveryScore: 0,
        teacherNotes: '',
        personalNotes: '',
        aiAdvice: '',
        priority: 'High',
        dateLogged: new Date().toISOString(), // today
        questionText: 'Find Moment of inertia of a composite cylinder...',
        correctSolution: '',
      }
    ];

    const result = calculateMistakeScore(mockChapter, mistakes);
    expect(result.score).toBeGreaterThan(30);
    expect(result.explanation).toContain('1 active rotational dynamics mistake today');
    expect(result.explanation).toContain('No successful revision after latest error');
    expect(result.explanation).toContain('Appeared again in a mock test');
  });

  it('exponentially amplifies the score when multiple or repeated active mistakes occur', () => {
    const baseMistakes: Mistake[] = [
      {
        id: 'm1',
        subject: 'physics',
        chapter: 'Rotational Dynamics',
        topic: 'Moment of Inertia',
        subtopic: '',
        difficulty: 'Easy',
        source: 'DPP',
        timeTaken: 10,
        correctMethod: '',
        studentMethod: '',
        mistakeTypes: ['Conceptual Error'],
        confidence: 30,
        revisionSchedule: '',
        masteryImpact: 'Low',
        attemptNumber: 1,
        revisionStatus: 'New',
        recoveryScore: 0,
        teacherNotes: '',
        personalNotes: '',
        aiAdvice: '',
        priority: 'Low',
        dateLogged: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), // 2 days ago
        questionText: '',
        correctSolution: '',
      }
    ];

    const resultSingle = calculateMistakeScore(mockChapter, baseMistakes);

    const repeatedMistakes: Mistake[] = [
      {
        ...baseMistakes[0],
        id: 'm2',
        attemptNumber: 3, // Repeated 3 times!
      }
    ];

    const resultRepeated = calculateMistakeScore(mockChapter, repeatedMistakes);
    expect(resultRepeated.score).toBeGreaterThan(resultSingle.score);
    expect(resultRepeated.explanation).toContain('Repeated unresolved rotational dynamics mistakes');
  });

  it('applies time decay to resolved mistakes so old resolved mistakes contribute almost nothing', () => {
    const recentResolved: Mistake[] = [
      {
        id: 'm1',
        subject: 'physics',
        chapter: 'Rotational Dynamics',
        topic: 'Moment of Inertia',
        subtopic: '',
        difficulty: 'JEE Advanced',
        source: 'Mock Test',
        timeTaken: 10,
        correctMethod: '',
        studentMethod: '',
        mistakeTypes: ['Conceptual Error'],
        confidence: 90,
        revisionSchedule: '',
        masteryImpact: 'High',
        attemptNumber: 1,
        revisionStatus: 'Mastered', // Resolved and mastered
        recoveryScore: 100,
        teacherNotes: '',
        personalNotes: '',
        aiAdvice: '',
        priority: 'High',
        dateLogged: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), // resolved/logged 2 days ago
        questionText: '',
        correctSolution: '',
      }
    ];

    const resultRecent = calculateMistakeScore(mockChapter, recentResolved);

    const oldResolved: Mistake[] = [
      {
        ...recentResolved[0],
        dateLogged: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(), // resolved 40 days ago
      }
    ];

    const resultOld = calculateMistakeScore(mockChapter, oldResolved);
    expect(resultOld.score).toBeLessThan(resultRecent.score);
    expect(resultOld.score).toBe(0); // contributed 0
  });

  it('mitigates the danger score when a revision was completed after the latest mistake', () => {
    const recentMistakes: Mistake[] = [
      {
        id: 'm1',
        subject: 'physics',
        chapter: 'Rotational Dynamics',
        topic: 'Moment of Inertia',
        subtopic: '',
        difficulty: 'JEE Advanced',
        source: 'Mock Test',
        timeTaken: 10,
        correctMethod: '',
        studentMethod: '',
        mistakeTypes: ['Conceptual Error'],
        confidence: 30,
        revisionSchedule: '',
        masteryImpact: 'High',
        attemptNumber: 1,
        revisionStatus: 'New',
        recoveryScore: 0,
        teacherNotes: '',
        personalNotes: '',
        aiAdvice: '',
        priority: 'High',
        dateLogged: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), // 10 days ago
        questionText: '',
        correctSolution: '',
      }
    ];

    // Chapter revised 1 day ago (revisionTime > latestMistakeTime)
    const revisedChapter = {
      ...mockChapter,
      lastRevisionDaysAgo: 1,
    };

    const resultMitigated = calculateMistakeScore(revisedChapter, recentMistakes);

    // Chapter revised 15 days ago (no revision after latest mistake logged 10 days ago)
    const unrevisedChapter = {
      ...mockChapter,
      lastRevisionDaysAgo: 15,
    };

    const resultUnmitigated = calculateMistakeScore(unrevisedChapter, recentMistakes);

    expect(resultMitigated.score).toBeLessThan(resultUnmitigated.score);
    expect(resultMitigated.explanation).toContain('Revision conducted after latest error');
    expect(resultUnmitigated.explanation).toContain('No successful revision after latest error');
  });
});
