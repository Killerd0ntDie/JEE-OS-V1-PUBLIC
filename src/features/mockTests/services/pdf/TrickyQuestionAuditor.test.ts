import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrickyQuestionAuditor } from './TrickyQuestionAuditor';
import { MockQuestion } from '../../../../types/mockTest';
import * as MockTestGeneratorService from '../MockTestGeneratorService';

describe('TrickyQuestionAuditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseQuestion: MockQuestion = {
    id: 'q1',
    subject: 'chemistry',
    type: 'MCQ',
    chapter: 'Chemical Bonding',
    topic: 'VSEPR Theory',
    difficulty: 'Medium',
    content: 'Which of the following molecules has a linear geometry?',
    options: ['CO2', 'H2O', 'SO2', 'NO2'],
    correctAnswer: '0',
    marks: { correct: 4, incorrect: -1 },
    explanation: 'CO2 has a linear shape with 180 degree bond angle.'
  };

  describe('scoreQuestionRisk', () => {
    it('returns risk score 0 for already verified questions', () => {
      const verifiedQ: MockQuestion = {
        ...baseQuestion,
        isVerified: true
      };
      const result = TrickyQuestionAuditor.scoreQuestionRisk(verifiedQ);
      expect(result.score).toBe(0);
      expect(result.reasons).toContain('Already verified by dedicated AI reasoning');
    });

    it('assigns high risk (+40) to visual diagram and molecular structure questions', () => {
      const diagramQ: MockQuestion = {
        ...baseQuestion,
        hasDiagram: true,
        imageUrl: 'data:image/png;base64,sample'
      };
      const result = TrickyQuestionAuditor.scoreQuestionRisk(diagramQ);
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.reasons.some(r => r.includes('visual diagram'))).toBe(true);
    });

    it('penalizes missing or defaulted keys with short explanations', () => {
      const unkeyedQ: MockQuestion = {
        ...baseQuestion,
        correctAnswer: '',
        explanation: undefined
      };
      const result = TrickyQuestionAuditor.scoreQuestionRisk(unkeyedQ);
      expect(result.score).toBeGreaterThanOrEqual(35);
      expect(result.reasons.some(r => r.includes('Missing answer key'))).toBe(true);
    });

    it('boosts risk for MULTI type questions and tricky stereochemistry/domain keywords', () => {
      const multiQ: MockQuestion = {
        ...baseQuestion,
        type: 'MULTI',
        content: 'Identify which of the following compounds are optically active enantiomers with chiral centers:'
      };
      const result = TrickyQuestionAuditor.scoreQuestionRisk(multiQ);
      expect(result.score).toBeGreaterThanOrEqual(35);
      expect(result.reasons.some(r => r.includes('Multi-correct option evaluation'))).toBe(true);
      expect(result.reasons.some(r => r.includes('high-complexity IIT-JEE topic'))).toBe(true);
    });
  });

  describe('identifyTrickyQuestions', () => {
    it('ranks questions by risk descending and caps to maxCount', () => {
      const qSafe: MockQuestion = {
        ...baseQuestion,
        id: 'safe',
        content: 'Simple definition of mole',
        explanation: 'A mole contains 6.022 x 10^23 entities. Highly standard definition confirmed.'
      };
      const qDiagram: MockQuestion = {
        ...baseQuestion,
        id: 'diagram',
        hasDiagram: true,
        content: 'Consider the given circuit diagram in the figure'
      };
      const qMultiTricky: MockQuestion = {
        ...baseQuestion,
        id: 'multi',
        type: 'MULTI',
        hasDiagram: true,
        content: 'Identify stereoisomer pairs having axial lone pair bonds'
      };

      const ranked = TrickyQuestionAuditor.identifyTrickyQuestions([qSafe, qDiagram, qMultiTricky], 2);
      expect(ranked.length).toBe(2);
      // qMultiTricky has diagram (+40), MULTI (+20), and tricky keywords (+15) -> highest score
      expect(ranked[0].question.id).toBe('multi');
      expect(ranked[1].question.id).toBe('diagram');
    });

    it('excludes questions that are already verified', () => {
      const qVerifiedDiagram: MockQuestion = {
        ...baseQuestion,
        hasDiagram: true,
        isVerified: true
      };
      const ranked = TrickyQuestionAuditor.identifyTrickyQuestions([qVerifiedDiagram], 3);
      expect(ranked.length).toBe(0);
    });
  });

  describe('autoReverifyQuestions', () => {
    it('parallelly reverifies top tricky questions and updates them in-place', async () => {
      const spy = vi.spyOn(MockTestGeneratorService, 'reverifyQuestionWithAi').mockResolvedValue({
        correctAnswer: '2',
        correctOptionLetters: ['C'],
        explanation: '**Conclusion & Correct Option**: Option (C) is the definitive answer.',
        confidence: 'high',
        keyCorrectionMade: true
      });

      const qTricky: MockQuestion = {
        ...baseQuestion,
        hasDiagram: true,
        correctAnswer: '0'
      };

      const progressMessages: string[] = [];
      const result = await TrickyQuestionAuditor.autoReverifyQuestions(
        [qTricky],
        { targetSubject: 'chemistry', chapterName: 'Bonding' },
        { onProgress: (msg) => progressMessages.push(msg) }
      );

      expect(spy).toHaveBeenCalled();
      expect(result.verifiedCount).toBe(1);
      expect(result.correctionsMade).toBe(1);
      expect(qTricky.correctAnswer).toBe('2');
      expect(qTricky.isVerified).toBe(true);
      expect(qTricky.solution?.text).toContain('Option (C)');
      expect(progressMessages.some(m => m.includes('AI Pre-verifying'))).toBe(true);
    });

    it('handles worker failures gracefully without failing the entire batch', async () => {
      vi.spyOn(MockTestGeneratorService, 'reverifyQuestionWithAi').mockRejectedValue(new Error('Network timeout'));

      const qTricky: MockQuestion = {
        ...baseQuestion,
        hasDiagram: true,
        correctAnswer: '0'
      };

      const result = await TrickyQuestionAuditor.autoReverifyQuestions([qTricky]);
      expect(result.verifiedCount).toBe(0);
      expect(qTricky.correctAnswer).toBe('0'); // Kept candidate answer
    });
  });
});
