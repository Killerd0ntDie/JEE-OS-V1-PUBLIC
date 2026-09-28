import { describe, it, expect } from 'vitest';
import { ConfidenceScorer } from './ConfidenceScorer';
import { PdfPaperParserService } from '../PdfPaperParserService';

describe('ConfidenceScorer — Phase 6 Active Runtime Self-Healing Loop', () => {
  describe('1. Individual Question Confidence Scoring', () => {
    it('scores high confidence (>= 0.9) on complete, high-quality MCQ questions', () => {
      const q = {
        content: 'Calculate the de Broglie wavelength of an electron accelerated through a potential difference of $100\\text{ V}$.',
        type: 'MCQ',
        options: [
          '0.123 nm',
          '0.246 nm',
          '0.061 nm',
          '0.492 nm'
        ],
        correctAnswer: 'A',
        hasDiagram: false
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.overallScore).toBeGreaterThanOrEqual(0.9);
      expect(score.statementQuality).toBe(1.0);
      expect(score.optionQuality).toBe(1.0);
      expect(score.answerQuality).toBe(1.0);
      expect(score.diagramQuality).toBe(1.0);
      expect(score.latexQuality).toBe(1.0);
      expect(score.issues).toHaveLength(0);
    });

    it('penalizes empty or excessively short question statements', () => {
      const q = {
        content: 'Q1.',
        type: 'MCQ',
        options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'],
        correctAnswer: 'B'
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.statementQuality).toBe(0.0);
      expect(score.issues.some(i => i.includes('too short'))).toBe(true);
      expect(score.overallScore).toBeLessThan(0.8);
    });

    it('penalizes statements containing leaked section headers or answer keys', () => {
      const q = {
        content: 'Find the magnetic field at the center of circular loop. SECTION - B INTEGER TYPE',
        type: 'MCQ',
        options: ['1 T', '2 T', '3 T', '4 T'],
        correctAnswer: 'A'
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.statementQuality).toBeLessThan(0.7);
      expect(score.issues.some(i => i.includes('leaked section header'))).toBe(true);
    });

    it('penalizes MCQ questions with missing or incomplete option arrays', () => {
      const q = {
        content: 'Which of the following elements has the highest electronegativity?',
        type: 'MCQ',
        options: ['Fluorine', 'Chlorine'],
        correctAnswer: 'A'
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.optionQuality).toBe(0.3);
      expect(score.issues.some(i => i.includes('Expected 4 options'))).toBe(true);
    });

    it('penalizes surrogate dummy option placeholders like (A), (C), (D)', () => {
      const q = {
        content: 'Identify the product formed in the aldol condensation reaction:',
        type: 'MCQ',
        options: ['(A), (B)', '(C), (D)', 'Option (3)', 'Option (4)'],
        correctAnswer: 'A'
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.optionQuality).toBe(0.3);
      expect(score.issues.some(i => i.includes('surrogate letter placeholders'))).toBe(true);
    });

    it('penalizes duplicate option texts', () => {
      const q = {
        content: 'What is the velocity of the particle at $t = 2\\text{ s}$?',
        type: 'MCQ',
        options: ['4 m/s', '4 m/s', '6 m/s', '8 m/s'],
        correctAnswer: 'C'
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.optionQuality).toBe(0.4);
      expect(score.issues.some(i => i.includes('Duplicate option text'))).toBe(true);
    });

    it('validates clean (A)-(D) diagram label options when diagram is attached', () => {
      const q = {
        content: 'Which of the following orbital diagrams represents Hund rule violation?',
        type: 'MCQ',
        options: ['(A)', '(B)', '(C)', '(D)'],
        correctAnswer: 'B',
        hasDiagram: true,
        imageUrl: 'data:image/webp;base64,' + 'A'.repeat(300)
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.optionQuality).toBe(1.0);
      expect(score.diagramQuality).toBe(1.0);
      expect(score.overallScore).toBeGreaterThanOrEqual(0.9);
    });

    it('scores numerical integer questions without options with high optionQuality', () => {
      const q = {
        content: 'Find the total number of lone pairs in a molecule of $XeF_4$.',
        type: 'NUMERICAL',
        correctAnswer: '2'
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.optionQuality).toBe(1.0);
      expect(score.answerQuality).toBe(1.0);
      expect(score.overallScore).toBeGreaterThanOrEqual(0.95);
    });

    it('flags broken diagram crops where hasDiagram is true but imageUrl is missing', () => {
      const q = {
        content: 'In the circuit diagram shown below, calculate the equivalent resistance between A and B.',
        type: 'MCQ',
        options: ['2 Ohm', '4 Ohm', '6 Ohm', '8 Ohm'],
        correctAnswer: 'A',
        hasDiagram: true
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.diagramQuality).toBe(0.0);
      expect(score.issues.some(i => i.includes('no cropped diagram image'))).toBe(true);
      expect(score.overallScore).toBeLessThan(0.95);
    });

    it('penalizes questions with implied diagram phrases that lack hasDiagram flag (R8)', () => {
      const q = {
        content: 'As shown in the figure, a particle of mass 10 kg is placed at a point A. When displaced, it reaches the point B.',
        type: 'MCQ',
        options: ['10 m/s', '20 m/s', '30 m/s', '40 m/s'],
        correctAnswer: 'A',
        hasDiagram: false
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.diagramQuality).toBe(0.3);
      expect(score.issues.some(i => i.includes('Statement mentions figure/diagram, but question is not marked hasDiagram'))).toBe(true);
      expect(score.overallScore).toBeLessThanOrEqual(0.90);
    });

    it('detects unclosed LaTeX math delimiters and prose wrapped in \\text', () => {
      const q = {
        content: 'Evaluate the integral $ \\int x^2 dx where x is positive and \\text{this is a really long piece of English explanation wrapped directly inside LaTeX which should have been outside}.',
        type: 'NUMERICAL',
        correctAnswer: '5'
      };

      const score = ConfidenceScorer.scoreQuestion(q);
      expect(score.latexQuality).toBeLessThan(0.7);
      expect(score.issues.some(i => i.includes('Unbalanced inline math delimiter') || i.includes('wraps long English prose'))).toBe(true);
    });
  });

  describe('2. Paper-Level Confidence Reporting', () => {
    it('accurately aggregates scores and identifies low-confidence and broken questions', () => {
      const questions = [
        {
          content: 'Find the derivative of $\\sin(x)$ with respect to $x$:',
          type: 'MCQ',
          options: ['$\\cos(x)$', '$-\\cos(x)$', '$\\tan(x)$', '$-\\sin(x)$'],
          correctAnswer: 'A'
        },
        {
          content: 'Broken Q without options',
          type: 'MCQ',
          options: [],
          correctAnswer: 'B'
        },
        {
          content: 'In the given figure, find the acceleration:',
          type: 'MCQ',
          options: ['2 m/s^2', '4 m/s^2', '6 m/s^2', '8 m/s^2'],
          correctAnswer: 'C',
          hasDiagram: true
          // missing imageUrl
        },
        {
          content: 'Evaluate the limit of $(1 + 1/n)^n$ as $n \\to \\infty$:',
          type: 'MCQ',
          options: ['$e$', '$e^2$', '$1$', '$\\infty$'],
          correctAnswer: '' // missing answer
        }
      ];

      const report = ConfidenceScorer.scorePaper(questions);
      expect(report.summary.totalQuestions).toBe(4);
      expect(report.questionScores).toHaveLength(4);
      expect(report.lowConfidenceIndices).toContain(1); // Broken Q without options
      expect(report.brokenDiagramIndices).toContain(2); // Missing diagram crop
      expect(report.missingAnswerIndices).toContain(3); // Missing answer
    });

    it('includes implied missing diagram questions in brokenDiagramIndices for self-healing (R8)', () => {
      const questions = [
        {
          content: 'As shown in the figures, a body of mass 50 kg is lifted to 20 m.',
          type: 'MCQ',
          options: ['1:1', '2:1', 'sqrt(3):2', '1:2'],
          correctAnswer: 'A',
          hasDiagram: false
        }
      ];

      const report = ConfidenceScorer.scorePaper(questions);
      expect(report.brokenDiagramIndices).toContain(0);
    });
  });

  describe('3. Self-Healing Mechanisms', () => {
    it('heals surrogate options from a matching heuristic question', () => {
      const targetQ: any = {
        content: 'Which of the following is an aromatic compound?',
        type: 'MCQ',
        options: ['(A), (B)', '(C), (D)', 'Option (3)', 'Option (4)'],
        correctAnswer: 'A'
      };

      const heuristicQ = {
        content: 'Which of the following is an aromatic compound?',
        type: 'MCQ',
        options: [
          { id: 'A', text: 'Benzene' },
          { id: 'B', text: 'Cyclohexane' },
          { id: 'C', text: 'Cyclooctatetraene' },
          { id: 'D', text: 'Cyclopentadiene' }
        ],
        correctAnswer: 'A'
      };

      const result = ConfidenceScorer.healQuestion(targetQ, heuristicQ);
      expect(result.healed).toBe(true);
      expect(result.changes.some(c => c.includes('surrogate option placeholders'))).toBe(true);
      expect(targetQ.options[0].text).toBe('Benzene');
    });

    it('heals missing correct answers from a matching heuristic question', () => {
      const targetQ = {
        content: 'What is the hybridisation of carbon in methane?',
        type: 'MCQ',
        options: ['sp3', 'sp2', 'sp', 'dsp2'],
        correctAnswer: ''
      };

      const heuristicQ = {
        content: 'What is the hybridisation of carbon in methane?',
        type: 'MCQ',
        options: ['sp3', 'sp2', 'sp', 'dsp2'],
        correctAnswer: 'A'
      };

      const result = ConfidenceScorer.healQuestion(targetQ, heuristicQ);
      expect(result.healed).toBe(true);
      expect(targetQ.correctAnswer).toBe('A');
    });

    it('heals missing diagram flag from heuristic diagram reference detector', () => {
      const targetQ = {
        content: 'In the shown circuit, calculate the current:',
        type: 'MCQ',
        options: ['1 A', '2 A', '3 A', '4 A'],
        correctAnswer: 'B',
        hasDiagram: false
      };

      const heuristicQ = {
        content: 'In the shown circuit, calculate the current:',
        hasDiagram: true,
        diagramPage: 3
      };

      const result = ConfidenceScorer.healQuestion(targetQ, heuristicQ);
      expect(result.healed).toBe(true);
      expect(targetQ.hasDiagram).toBe(true);
      expect((targetQ as any).diagramPage).toBe(3);
    });
  });

  describe('4. PdfPaperParserService Integration', () => {
    it('exposes scorePaperConfidence, scoreQuestionConfidence, and healQuestion on PdfPaperParserService', () => {
      expect(typeof PdfPaperParserService.scorePaperConfidence).toBe('function');
      expect(typeof PdfPaperParserService.scoreQuestionConfidence).toBe('function');
      expect(typeof PdfPaperParserService.healQuestion).toBe('function');
      expect(typeof PdfPaperParserService.parseWithHealing).toBe('function');
    });
  });
});
