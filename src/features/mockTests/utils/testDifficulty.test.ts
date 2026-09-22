import { describe, it, expect } from 'vitest';
import { calculateTestDifficulty, getDifficultyLabel, getDifficultyColors } from './testDifficulty';
import { MockTest } from '@/types/mockTest';

describe('testDifficulty utility', () => {
  const baseTest: MockTest = {
    id: 'test-diff',
    name: 'Sample Test',
    durationMinutes: 60,
    totalMarks: 100,
    sections: []
  };

  it('defaults to Medium for empty tests', () => {
    expect(calculateTestDifficulty(baseTest)).toBe('Medium');
    expect(getDifficultyLabel('Medium')).toBe('Moderate');
  });

  it('calculates Easy difficulty correctly when predominantly easy questions', () => {
    const easyTest: MockTest = {
      ...baseTest,
      sections: [
        {
          subject: 'physics',
          questions: [
            { id: '1', subject: 'physics', type: 'MCQ', chapter: 'C', topic: 'T', difficulty: 'Easy', content: '', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } },
            { id: '2', subject: 'physics', type: 'MCQ', chapter: 'C', topic: 'T', difficulty: 'Easy', content: '', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } },
            { id: '3', subject: 'physics', type: 'MCQ', chapter: 'C', topic: 'T', difficulty: 'Medium', content: '', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } },
          ]
        }
      ]
    };
    expect(calculateTestDifficulty(easyTest)).toBe('Easy');
    expect(getDifficultyLabel('Easy')).toBe('Easy');
    const colors = getDifficultyColors('Easy');
    expect(colors.text).toContain('emerald');
  });

  it('calculates Hard difficulty correctly when predominantly hard questions', () => {
    const hardTest: MockTest = {
      ...baseTest,
      sections: [
        {
          subject: 'chemistry',
          questions: [
            { id: '1', subject: 'chemistry', type: 'MCQ', chapter: 'C', topic: 'T', difficulty: 'Hard', content: '', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } },
            { id: '2', subject: 'chemistry', type: 'MCQ', chapter: 'C', topic: 'T', difficulty: 'Hard', content: '', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } },
            { id: '3', subject: 'chemistry', type: 'MCQ', chapter: 'C', topic: 'T', difficulty: 'Medium', content: '', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } },
          ]
        }
      ]
    };
    expect(calculateTestDifficulty(hardTest)).toBe('Hard');
    expect(getDifficultyLabel('Hard')).toBe('Challenging');
    const colors = getDifficultyColors('Hard');
    expect(colors.text).toContain('rose');
  });

  it('correctly infers difficulty when questions lack explicit difficulty tags', () => {
    const uncalibratedTest: MockTest = {
      ...baseTest,
      sections: [
        {
          subject: 'maths',
          questions: [
            { id: '1', subject: 'maths', type: 'MULTI', chapter: 'C', topic: 'T', content: 'Select all correct statements', correctAnswer: 'AB', marks: { correct: 4, incorrect: -2 } },
            { id: '2', subject: 'maths', type: 'MCQ', chapter: 'C', topic: 'T', content: 'Statement-1: f is continuous. Statement-2: f is differentiable.', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } },
            { id: '3', subject: 'maths', type: 'MCQ', chapter: 'C', topic: 'T', content: 'Calculate \\int_0^1 \\frac{x^4(1-x)^4}{1+x^2} dx', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } },
          ]
        }
      ]
    };
    expect(calculateTestDifficulty(uncalibratedTest)).toBe('Hard');
  });
});
