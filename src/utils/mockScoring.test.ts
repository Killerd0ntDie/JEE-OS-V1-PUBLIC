import { describe, expect, it } from 'vitest';
import { 
  calculateMockScorePercent, 
  isMockAnswerCorrect, 
  normalizeAnswerToOptionLetter,
  evaluateMockAttempt,
  isMultiChoiceQuestion
} from './mockScoring';
import { MockTest, MockTestAttempt } from '@/types/mockTest';

describe('mockScoring Engine Audit & Verification', () => {
  describe('isMultiChoiceQuestion', () => {
    it('identifies MULTI type directly', () => {
      expect(isMultiChoiceQuestion({ type: 'MULTI' })).toBe(true);
      expect(isMultiChoiceQuestion({ type: 'multi' })).toBe(true);
    });

    it('identifies MULTI from sectionName containing PART - III, multiple or one or more', () => {
      expect(isMultiChoiceQuestion({ sectionName: 'PART - III' })).toBe(true);
      expect(isMultiChoiceQuestion({ sectionName: 'PART-III: One or More Than One Option Correct' })).toBe(true);
      expect(isMultiChoiceQuestion({ sectionName: 'Multiple Correct Section' })).toBe(true);
    });

    it('identifies MULTI from solution.correctOptionIds having length >= 2', () => {
      expect(isMultiChoiceQuestion({ solution: { correctOptionIds: ['A', 'C'] } })).toBe(true);
      expect(isMultiChoiceQuestion({ solution: { correctOptionIds: ['A'] } })).toBe(false);
    });

    it('identifies MULTI from multi-letter correctAnswer like ACD or AB', () => {
      expect(isMultiChoiceQuestion({ correctAnswer: 'ACD' })).toBe(true);
      expect(isMultiChoiceQuestion({ correctAnswer: 'AB' })).toBe(true);
      expect(isMultiChoiceQuestion({ correctAnswer: 'A' })).toBe(false);
    });
  });
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

    it('correctly matches multi-letter options like ACD, AC, BC regardless of ordering', () => {
      expect(isMockAnswerCorrect({ type: 'MCQ', correctAnswer: 'ACD' }, 'ACD')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'MCQ', correctAnswer: 'ACD' }, 'DAC')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'MCQ', correctAnswer: 'ACD' }, 'A, C, D')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'MCQ', correctAnswer: 'ACD' }, 'AB')).toBe(false);
      expect(isMockAnswerCorrect({ type: 'MCQ', correctAnswer: 'AC' }, 'AC')).toBe(true);
    });

    it('evaluates numerical questions with finite float tolerance', () => {
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '45.0' }, '45.00')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '3.1415' }, '3.14')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '10' }, '10.00')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '10' }, '12')).toBe(false);
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '10' }, '')).toBe(false);
      expect(isMockAnswerCorrect({ type: 'numerical', correctAnswer: '14.0' }, '14')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'Numerical', correctAnswer: '1250' }, '1,250')).toBe(true);
      expect(isMockAnswerCorrect({ type: 'NUMERICAL', correctAnswer: '1,500.5' }, '1500.5')).toBe(true);
    });
  });

  describe('areOptionsSemanticallyEquivalent & Semantic Equivalence', () => {
    it('detects equivalence between reversed inequality chains (e.g. Cl-O bond order in oxyanions)', () => {
      const optA = '$\\text{ClO}_4^- > \\text{ClO}_3^- > \\text{ClO}_2^- > \\text{ClO}^-$';
      const optB = '$\\text{ClO}^- < \\text{ClO}_2^- < \\text{ClO}_3^- < \\text{ClO}_4^-$';
      const optC = '$\\text{ClO}_3^- < \\text{ClO}_2^- > \\text{ClO}^- > \\text{ClO}_4^-$';

      expect(isMockAnswerCorrect({
        type: 'MCQ',
        correctAnswer: 'A',
        options: [optA, optB, optC, '$\\text{ClO}_2^- < \\text{ClO}_3^-$']
      }, '0')).toBe(true);

      // Student selected Option B ('1') when answer key says 'A' ('0') -> MUST be marked CORRECT!
      expect(isMockAnswerCorrect({
        type: 'MCQ',
        correctAnswer: 'A',
        options: [optA, optB, optC, '$\\text{ClO}_2^- < \\text{ClO}_3^-$']
      }, '1')).toBe(true);

      expect(isMockAnswerCorrect({
        type: 'MCQ',
        correctAnswer: 'A',
        options: [optA, optB, optC, '$\\text{ClO}_2^- < \\text{ClO}_3^-$']
      }, 'B')).toBe(true);

      // Option C is actually incorrect order -> MUST be marked FALSE
      expect(isMockAnswerCorrect({
        type: 'MCQ',
        correctAnswer: 'A',
        options: [optA, optB, optC, '$\\text{ClO}_2^- < \\text{ClO}_3^-$']
      }, '2')).toBe(false);
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

    it('awards positive partial marks for multi-choice questions without deducting negative penalty', () => {
      const multiTest: MockTest = {
        id: 'test-multi',
        name: 'JEE Advanced Multi Test',
        durationMinutes: 60,
        totalMarks: 8,
        sections: [
          {
            subject: 'chemistry',
            questions: [
              {
                id: 'qm1',
                type: 'MULTI',
                content: 'Find the correct statements regarding SO4^-2',
                options: [
                  'Bond order is 1.5',
                  'Bond order is 2.5',
                  'It violates Octet Rule',
                  'All S-O bonds are equivalent'
                ],
                correctAnswer: 'ACD',
                subject: 'chemistry',
                chapter: 'Chemical Bonding',
                topic: 'Resonance',
                difficulty: 'Medium',
                marks: { correct: 4, incorrect: -1 }
              },
              {
                id: 'qm2',
                type: 'MCQ',
                content: 'The correct order of Cl-O bond order is:',
                options: [
                  '$\\text{ClO}_4^- > \\text{ClO}_3^- > \\text{ClO}_2^- > \\text{ClO}^-$',
                  '$\\text{ClO}^- < \\text{ClO}_2^- < \\text{ClO}_3^- < \\text{ClO}_4^-$',
                  '$\\text{ClO}_3^- < \\text{ClO}_2^- > \\text{ClO}^- > \\text{ClO}_4^-$',
                  '$\\text{ClO}_2^- < \\text{ClO}_3^- < \\text{ClO}_4^- < \\text{ClO}^-$'
                ],
                correctAnswer: 'A', // Key specifies A, but B is semantically identical reversed order
                subject: 'chemistry',
                chapter: 'Chemical Bonding',
                topic: 'Bond Order',
                difficulty: 'Medium',
                marks: { correct: 4, incorrect: -1 }
              }
            ]
          }
        ]
      };

      // Case 1: Student selected only 'A' on Q1 (partial credit +1, NOT -1!)
      // and selected 'B' on Q2 (equivalent reversed order -> +4!)
      const attemptPartial: MockTestAttempt = {
        testId: 'test-multi',
        startTime: '2026-01-01T00:00:00.000Z',
        questions: {
          qm1: { questionId: 'qm1', subject: 'chemistry', status: 'Answered', selectedAnswer: 'A', timeSpentSeconds: 40 },
          qm2: { questionId: 'qm2', subject: 'chemistry', status: 'Answered', selectedAnswer: 'B', timeSpentSeconds: 50 },
        }
      };

      const evalPartial = evaluateMockAttempt(multiTest, attemptPartial);
      // Q1: +1 (partial marks for 1 correct option without incorrect)
      // Q2: +4 (Option B is equivalent to Option A)
      expect(evalPartial.totalScore).toBe(5);
      expect(evalPartial.correct).toBe(2);
      expect(evalPartial.incorrect).toBe(0);
      expect(evalPartial.mistakesToLog).toHaveLength(0);

      // Case 2: Student selected 'ACD' on Q1 (full credit +4)
      const attemptFull: MockTestAttempt = {
        testId: 'test-multi',
        startTime: '2026-01-01T00:00:00.000Z',
        questions: {
          qm1: { questionId: 'qm1', subject: 'chemistry', status: 'Answered', selectedAnswer: 'ACD', timeSpentSeconds: 40 },
          qm2: { questionId: 'qm2', subject: 'chemistry', status: 'Answered', selectedAnswer: 'A', timeSpentSeconds: 50 },
        }
      };
      const evalFull = evaluateMockAttempt(multiTest, attemptFull);
      expect(evalFull.totalScore).toBe(8); // 4 + 4 = 8
      expect(evalFull.correct).toBe(2);
      expect(evalFull.incorrect).toBe(0);

      // Case 3: Student selected 'B' on Q1 (Option B is WRONG for Q1 -> -1 penalty)
      const attemptWrong: MockTestAttempt = {
        testId: 'test-multi',
        startTime: '2026-01-01T00:00:00.000Z',
        questions: {
          qm1: { questionId: 'qm1', subject: 'chemistry', status: 'Answered', selectedAnswer: 'AB', timeSpentSeconds: 40 },
          qm2: { questionId: 'qm2', subject: 'chemistry', status: 'Answered', selectedAnswer: 'A', timeSpentSeconds: 50 },
        }
      };
      const evalWrong = evaluateMockAttempt(multiTest, attemptWrong);
      expect(evalWrong.totalScore).toBe(3); // -1 (due to wrong option B) + 4 = 3
      expect(evalWrong.correct).toBe(1);
      expect(evalWrong.incorrect).toBe(1);
    });

    it('treats whitespace-only answer as unattempted and does not penalize (CRITICAL-03)', () => {
      const testWithWhitespace: MockTest = {
        id: 'test-ws',
        name: 'Whitespace Test',
        durationMinutes: 10,
        totalMarks: 8,
        sections: [
          {
            subject: 'physics',
            questions: [
              {
                id: 'qw1',
                type: 'NUMERICAL',
                content: 'Value of g',
                correctAnswer: '9.8',
                subject: 'physics',
                chapter: 'Kinematics',
                topic: 'Gravity',
                difficulty: 'Easy',
                marks: { correct: 4, incorrect: 0 }
              },
              {
                id: 'qw2',
                type: 'MCQ',
                content: 'Pick A',
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 'A',
                subject: 'physics',
                chapter: 'Kinematics',
                topic: 'Gravity',
                difficulty: 'Easy',
                marks: { correct: 4, incorrect: -1 }
              }
            ]
          }
        ]
      };

      const attemptWithWs: MockTestAttempt = {
        testId: 'test-ws',
        startTime: '2026-01-01T00:00:00.000Z',
        questions: {
          qw1: { questionId: 'qw1', subject: 'physics', status: 'Answered', selectedAnswer: '   ', timeSpentSeconds: 30 },
          qw2: { questionId: 'qw2', subject: 'physics', status: 'Not Answered', selectedAnswer: '', timeSpentSeconds: 10 },
        }
      };

      const result = evaluateMockAttempt(testWithWhitespace, attemptWithWs);
      expect(result.totalScore).toBe(0);
      expect(result.unattempted).toBe(2);
      expect(result.attempted).toBe(0);
      expect(result.incorrect).toBe(0);
      expect(result.detailedQuestions[0].isUnattempted).toBe(true);
      expect(result.detailedQuestions[0].statusLabel).toBe('Unattempted');
    });

    it('applies -2 default penalty for multi-choice when marks.incorrect is not specified (HIGH-02)', () => {
      const testMultiDefaultPenalty: MockTest = {
        id: 'test-multi-def',
        name: 'JEE Adv Multi Default',
        durationMinutes: 10,
        totalMarks: 4,
        sections: [
          {
            subject: 'chemistry',
            questions: [
              {
                id: 'qmd1',
                type: 'MULTI',
                content: 'Select correct options',
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 'AC',
                subject: 'chemistry',
                chapter: 'Chemical Bonding',
                topic: 'Resonance',
                difficulty: 'Hard',
                marks: { correct: 4 } as any // no incorrect specified
              }
            ]
          }
        ]
      };

      const attemptWrong: MockTestAttempt = {
        testId: 'test-multi-def',
        startTime: '2026-01-01T00:00:00.000Z',
        questions: {
          qmd1: { questionId: 'qmd1', subject: 'chemistry', status: 'Answered', selectedAnswer: 'B', timeSpentSeconds: 40 },
        }
      };

      const evalResult = evaluateMockAttempt(testMultiDefaultPenalty, attemptWrong);
      expect(evalResult.totalScore).toBe(-2);
      expect(evalResult.incorrect).toBe(1);
    });

    it('[HIGH-06] multi-choice question with no valid chosen indices is treated as unattempted rather than incurring -2 penalty', () => {
      const testMulti: MockTest = {
        id: 'test-multi-no-choice',
        name: 'JEE Adv Multi',
        durationMinutes: 10,
        totalMarks: 4,
        sections: [
          {
            subject: 'physics',
            questions: [
              {
                id: 'qm_none',
                type: 'MULTI',
                content: 'One or more than one option is correct',
                options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
                correctAnswer: 'AB',
                subject: 'physics',
                chapter: 'Modern Physics',
                topic: 'Radioactivity',
                difficulty: 'Hard',
                marks: { correct: 4, incorrect: -2 }
              }
            ]
          }
        ]
      };

      // Submitted string contains no valid A-D or 0-3 options
      const attemptEmpty: MockTestAttempt = {
        testId: 'test-multi-no-choice',
        startTime: '2026-01-01T00:00:00.000Z',
        questions: {
          qm_none: { questionId: 'qm_none', subject: 'physics', status: 'Answered', selectedAnswer: 'XYZ', timeSpentSeconds: 15 }
        }
      };

      const result = evaluateMockAttempt(testMulti, attemptEmpty);
      expect(result.totalScore).toBe(0);
      expect(result.incorrect).toBe(0);
      expect(result.unattempted).toBe(1);
      expect(result.detailedQuestions[0].statusLabel).toBe('Unattempted');
    });

    it('[HIGH-07] calculateMockScorePercent accurately reflects negative scores without clamping to 0', () => {
      // If student scored -15 out of 300, percentage should be -5% rather than clamped 0%
      const negativePercent = calculateMockScorePercent({ totalScore: -15, totalMarks: 300 });
      expect(negativePercent).toBe(-5);

      const severeNegative = calculateMockScorePercent({ totalScore: -30, totalMarks: 120 });
      expect(severeNegative).toBe(-25);

      const positivePercent = calculateMockScorePercent({ totalScore: 150, totalMarks: 300 });
      expect(positivePercent).toBe(50);
    });

    it('[HIGH-04] isMockAnswerCorrect supports relative tolerance for large numerical answers', () => {
      const numQ = {
        type: 'NUMERICAL',
        correctAnswer: '8400',
        content: 'Find value in Joules'
      };

      // Exact match
      expect(isMockAnswerCorrect(numQ, '8400')).toBe(true);

      // Within relative tolerance of 0.01% (for 8400, 0.0001 * 8400 = 0.84)
      expect(isMockAnswerCorrect(numQ, '8400.5')).toBe(true);

      // Outside relative tolerance
      expect(isMockAnswerCorrect(numQ, '8405')).toBe(false);

      // Small numbers still use absolute tolerance 0.01
      const smallQ = { type: 'NUMERICAL', correctAnswer: '1.414', content: 'sqrt(2)' };
      expect(isMockAnswerCorrect(smallQ, '1.41')).toBe(true); // diff 0.004 < 0.01
      expect(isMockAnswerCorrect(smallQ, '1.43')).toBe(false); // diff 0.016 > 0.01
    });
  });
});
