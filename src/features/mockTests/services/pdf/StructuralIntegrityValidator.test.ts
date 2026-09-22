import { describe, it, expect } from 'vitest';
import { StructuralIntegrityValidator } from './StructuralIntegrityValidator';

describe('StructuralIntegrityValidator', () => {
  const createMockQuestion = (num: number, overrides: Record<string, any> = {}) => ({
    id: `q_${num}`,
    qNumber: num,
    localQuestionNumber: num,
    type: 'MCQ',
    content: `${num}. A particle moves along a straight line with uniform acceleration. Calculate its displacement after 5 seconds.`,
    options: [
      { id: 'A', text: '10 m' },
      { id: 'B', text: '20 m' },
      { id: 'C', text: '30 m' },
      { id: 'D', text: '40 m' }
    ],
    correctAnswer: 'A',
    marks: { correct: 4, incorrect: -1 },
    ...overrides
  });

  it('validates a clean, well-formed 25-question paper with score 1.0', () => {
    const questions = Array.from({ length: 25 }, (_, i) => createMockQuestion(i + 1));
    const report = StructuralIntegrityValidator.validatePaper(questions, { expectedCount: 25, totalPages: 4 });

    expect(report.isValid).toBe(true);
    expect(report.integrityScore).toBe(1.0);
    expect(report.invariants.countPassed).toBe(true);
    expect(report.invariants.sequencePassed).toBe(true);
    expect(report.invariants.optionsPassed).toBe(true);
    expect(report.invariants.columnBleedPassed).toBe(true);
    expect(report.invariants.answerKeyPassed).toBe(true);
    expect(report.failedQuestionIndices).toHaveLength(0);
    expect(report.failedPages).toHaveLength(0);
  });

  it('detects missing questions when count is significantly below expectation', () => {
    // Only 10 questions extracted out of 25 expected
    const questions = Array.from({ length: 10 }, (_, i) => createMockQuestion(i + 1));
    const report = StructuralIntegrityValidator.validatePaper(questions, { expectedCount: 25, totalPages: 4 });

    expect(report.isValid).toBe(false);
    expect(report.invariants.countPassed).toBe(false);
    expect(report.integrityScore).toBeLessThan(0.9);
    expect(report.issues.some(iss => iss.includes('significantly lower than expected'))).toBe(true);
  });

  it('detects sequence gaps when question numbering jumps', () => {
    // Questions: 1, 2, 3, 4, 8, 9, 10 (gap: skipped 5, 6, 7)
    const questions = [
      createMockQuestion(1),
      createMockQuestion(2),
      createMockQuestion(3),
      createMockQuestion(4),
      createMockQuestion(8),
      createMockQuestion(9),
      createMockQuestion(10)
    ];

    const report = StructuralIntegrityValidator.validatePaper(questions);
    expect(report.invariants.sequencePassed).toBe(false);
    expect(report.details.sequenceGaps).toEqual([{ from: 4, to: 8 }]);
    expect(report.issues.some(iss => iss.includes('Sequence gap detected'))).toBe(true);
  });

  it('detects swallowed 2x2 option markers inside option text', () => {
    const questions = [
      createMockQuestion(1),
      createMockQuestion(2, {
        options: [
          { id: 'A', text: '5 m (2) 10 m' }, // Option 2 was swallowed into Option 1!
          { id: 'B', text: '15 m' },
          { id: 'C', text: '20 m' },
          { id: 'D', text: '25 m' }
        ]
      }),
      createMockQuestion(3)
    ];

    const report = StructuralIntegrityValidator.validatePaper(questions);
    expect(report.isValid).toBe(false);
    expect(report.invariants.optionsPassed).toBe(false);
    expect(report.details.malformedOptionQuestions).toContain(2);
    expect(report.issues.some(iss => iss.includes('swallowed option marker'))).toBe(true);
  });

  it('detects column bleed when an adjacent column question is injected mid-sentence', () => {
    const questions = [
      createMockQuestion(1, {
        content: '1. A body starts from rest with acceleration a. 4. A man moves 50 m due east and then 40 m due north.'
      }),
      createMockQuestion(2),
      createMockQuestion(3)
    ];

    const report = StructuralIntegrityValidator.validatePaper(questions);
    expect(report.isValid).toBe(false);
    expect(report.invariants.columnBleedPassed).toBe(false);
    expect(report.details.columnBleedQuestions).toContain(1);
    expect(report.issues.some(iss => iss.includes('Column bleed detected'))).toBe(true);
  });

  it('does not falsely trigger column bleed on equation references like (1) or eq. 1', () => {
    const questions = [
      createMockQuestion(1, {
        content: '1. Using equation (1) and substituting in equation (2), the resultant velocity is given by v = u + at.'
      }),
      createMockQuestion(2)
    ];

    const report = StructuralIntegrityValidator.validatePaper(questions);
    expect(report.invariants.columnBleedPassed).toBe(true);
    expect(report.details.columnBleedQuestions).toHaveLength(0);
  });

  it('detects low answer key coverage when questions have missing/defaulted answers', () => {
    const questions = Array.from({ length: 10 }, (_, i) =>
      createMockQuestion(i + 1, { correctAnswer: i < 5 ? '' : 'A' })
    );

    const report = StructuralIntegrityValidator.validatePaper(questions);
    expect(report.invariants.answerKeyPassed).toBe(false);
    expect(report.details.missingAnswerQuestions).toEqual([1, 2, 3, 4, 5]);
    expect(report.issues.some(iss => iss.includes('Answer key coverage issue'))).toBe(true);
  });

  it('correctly maps failed questions to their specific page numbers', () => {
    const questions = [
      createMockQuestion(1, { pageNumber: 1 }),
      createMockQuestion(2, { pageNumber: 1 }),
      createMockQuestion(3, {
        pageNumber: 2,
        options: [{ id: 'A', text: '10 m (2) 20 m' }] // Swallowed option on page 2
      }),
      createMockQuestion(4, { pageNumber: 3 })
    ];

    const report = StructuralIntegrityValidator.validatePaper(questions, { totalPages: 3 });
    expect(report.failedQuestionIndices).toEqual([2]); // Q3 (index 2) failed
    expect(report.failedPages).toEqual([2]); // Page 2 identified as failed
  });

  it('detects missing or corrupted diagrams when referenced or marked hasDiagram', () => {
    const questions = [
      createMockQuestion(1, { content: '1. In the circuit diagram shown in the figure, find current I.' }), // references figure without imageUrl
      createMockQuestion(2, { hasDiagram: true }), // marked hasDiagram without imageUrl
      createMockQuestion(3, { hasDiagram: true, imageUrl: 'data:image/png;base64,' + 'A'.repeat(300) }), // valid diagram
      createMockQuestion(4, { hasDiagram: true, imageUrl: 'data:image/png;base64,tiny' }), // suspicious tiny image
      createMockQuestion(5) // text-only question
    ];

    const report = StructuralIntegrityValidator.validatePaper(questions);
    expect(report.invariants.diagramsPassed).toBe(false);
    expect(report.details.suspiciousDiagramQuestions).toEqual([1, 2, 4]);
    expect(report.issues.some(iss => iss.includes('Q1: Explicitly references a figure'))).toBe(true);
    expect(report.issues.some(iss => iss.includes('Q2: Marked as having a diagram'))).toBe(true);
    expect(report.issues.some(iss => iss.includes('Q4: Attached diagram data URL is suspiciously short'))).toBe(true);
  });

  it('returns graceful failure report when empty questions array is passed', () => {
    const report = StructuralIntegrityValidator.validatePaper([]);
    expect(report.isValid).toBe(false);
    expect(report.integrityScore).toBe(0.0);
    expect(report.issues).toContain('No questions were parsed from the document.');
    expect(report.failedPages).toEqual([1]);
  });
});
