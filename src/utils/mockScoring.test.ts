import { describe, expect, it } from 'vitest';
import { 
  calculateMockScorePercent, 
  isMockAnswerCorrect, 
  normalizeAnswerToOptionLetter,
  evaluateMockAttempt 
} from './mockScoring';
import { MockTest, MockTestAttempt } from '@/types/mockTest';

describe('mockScoring Engine Audit & Verification', () => {
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

  describe('normalizeAnswerToOptionLetter & isMockAnswerCorrect', () => {
    it('normalizes indices 0,1,2,3 to letters A,B,C,D correctly', () => {
      expect(normalizeAnswerToOptionLetter('0')).toBe('A');
      expect(normalizeAnswerToOptionLetter('1')).toBe('B');
      expect(normalizeAnswerToOptionLetter('2')).toBe('C');
      expect(normalizeAnswerToOptionLetter('3')).toBe('D');
      expect(normalizeAnswerToOptionLetter('Option B')).toBe('B');
    });

    it('correctly matches index 0 to letter A and vice versa', () => {
      expect(isMockAnswerCorrect({ type: 'MCQ', correctAnswer: 'A' }, '0')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'MCQ', correctAnswer: '0' }, 'A')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'MCQ', correctAnswer: 'Option C' }, '2')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'MCQ', correctAnswer: 'D' }, '3')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'MCQ', correctAnswer: 'B' }, '0')).toBe(false);
    });

    it('evaluates numerical questions with finite float tolerance', () => {
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '45.0' }, '45.00')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '3.1415' }, '3.14')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '10' }, '10.00')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '10' }, '12')).toBe(false);
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '10' }, '')).toBe(false);
    });
  });

  describe('evaluateMockAttempt', () => {
    const mockTest: MockTest = {
      id: 'test-1',
      name: 'JEE Main Physics Mini-Mock',
      durationMinutes: 30,
      totalMarks: 16,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              type: 'MCQ',
              content: 'What is acceleration due to gravity?',
              options: ['9.8 m/s^2', '10.8 m/s^2', '8.8 m/s^2', '11.2 m/s^2'],
              correctAnswer: 'A',
              subject: 'physics',
              chapter: 'Kinematics',
              topic: 'Gravity',
              difficulty: 'Easy',
              marks: { correct: 4, incorrect: -1 }
            },
            {
              id: 'q2',
              type: 'MCQ',
              content: 'Identify scalar quantity',
              options: ['Velocity', 'Energy', 'Force', 'Acceleration'],
              correctAnswer: '1', // Index 1 is Energy (Option B)
              subject: 'physics',
              chapter: 'Kinematics',
              topic: 'Scalars',
              difficulty: 'Easy',
              marks: { correct: 4, incorrect: -1 }
            },
            {
              id: 'q3',
              type: 'NUMERICAL',
              content: 'Speed of sound in m/s',
              correctAnswer: '343',
              subject: 'physics',
              chapter: 'Waves',
              topic: 'Sound',
              difficulty: 'Medium',
              marks: { correct: 4, incorrect: -1 }
            },
            {
              id: 'q4',
              type: 'MCQ',
              content: 'Unit of force',
              options: ['Joule', 'Watt', 'Newton', 'Pascal'],
              correctAnswer: 'C',
              subject: 'physics',
              chapter: 'Laws of Motion',
              topic: 'Units',
              difficulty: 'Easy',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    const mockAttempt: MockTestAttempt = {
      testId: 'test-1',
      startTime: '2026-01-01T00:00:00.000Z',
      questions: {
        q1: { questionId: 'q1', subject: 'physics', status: 'Answered', selectedAnswer: '0', timeSpentSeconds: 60 }, // '0' matches 'A' -> +4
        q2: { questionId: 'q2', subject: 'physics', status: 'Answered', selectedAnswer: 'B', timeSpentSeconds: 45 }, // 'B' matches '1' -> +4
        q3: { questionId: 'q3', subject: 'physics', status: 'Answered', selectedAnswer: '343.0', timeSpentSeconds: 50 }, // 343 matches 343 -> +4
        q4: { questionId: 'q4', subject: 'physics', status: 'Answered', selectedAnswer: '0', timeSpentSeconds: 70 }, // '0' (A) is wrong for 'C' -> -1
      }
    };

    it('accurately evaluates mixed index/letter formats, computes score +11, and prepares formatted mistake log', () => {
      const evaluation = evaluateMockAttempt(mockTest, mockAttempt, [
        { id: 'ch-kinematics', name: 'Kinematics', subject: 'physics' } as any,
        { id: 'ch-lom', name: 'Laws of Motion', subject: 'physics' } as any
      ]);

      expect(evaluation.totalScore).toBe(11); // 4 + 4 + 4 - 1 = 11
      expect(evaluation.correct).toBe(3);
      expect(evaluation.incorrect).toBe(1);
      expect(evaluation.unattempted).toBe(0);
      expect(evaluation.attempted).toBe(4);

      // Verify mistake logging formatted properly
      expect(evaluation.mistakesToLog).toHaveLength(1);
      const loggedMistake = evaluation.mistakesToLog[0];
      expect(loggedMistake.chapter).toBe('Laws of Motion');
      expect(loggedMistake.chapterId).toBe('ch-lom');
      expect(loggedMistake.studentMethod).toContain('Option A: Joule');
      expect(loggedMistake.correctSolution).toContain('Option C: Newton');
    });
  });
});
