import { describe, it, expect } from 'vitest';
import { PdfLexicalParser, PdfLexicalTokenizer } from './PdfLexicalParser';

describe('PdfLexicalParser (Lexical Tokenizer & State Machine Engine)', () => {
  it('tokenizes section headers, question headers, and options cleanly', () => {
    const raw = `
PART I - PHYSICS
SECTION A - SINGLE CORRECT
Q1. A body moves with uniform velocity v = 10 m/s.
Find the distance covered in 5 seconds.
(A) 50 m
(B) 25 m
(C) 100 m
(D) 10 m
Ans: (A)
Sol: Distance = velocity * time = 10 * 5 = 50 m.
`;

    const tokens = PdfLexicalTokenizer.tokenize(raw);
    expect(tokens.some(t => t.type === 'SECTION_HEADER' && t.metadata?.subject === 'physics')).toBe(true);
    expect(tokens.some(t => t.type === 'QUESTION_HEADER' && t.metadata?.qNum === 1)).toBe(true);
    expect(tokens.filter(t => t.type === 'OPTION_HEADER')).toHaveLength(4);
    expect(tokens.some(t => t.type === 'INLINE_KEY' && t.metadata?.answerValue === 'A')).toBe(true);
    expect(tokens.some(t => t.type === 'INLINE_SOLUTION')).toBe(true);
  });

  it('parses a multi-question test into structured LexicalQuestions with accurate types and answer keys', () => {
    const paper = `
PART I - PHYSICS
SECTION A: SINGLE CORRECT
Q1. The dimension of Planck constant is:
(A) [ML^2T^-1]
(B) [MLT^-1]
(C) [ML^2T^-2]
(D) [ML^0T^-1]
Ans: (A)
Sol: E = h * nu => [h] = [ML^2T^-1].

Q2. Acceleration due to gravity at earth surface is:
(A) 9.8 m/s^2
(B) 10.8 m/s^2
(C) 8.8 m/s^2
(D) 12.0 m/s^2
Ans: (A)

SECTION B: INTEGER TYPE
Q3. Find the number of degrees of freedom of a monoatomic gas.
Ans: 3
Sol: Monoatomic gas has 3 translational degrees of freedom.
`;

    const questions = PdfLexicalParser.parse(paper);
    expect(questions).toHaveLength(3);

    // Q1
    expect(questions[0].qNum).toBe(1);
    expect(questions[0].subject).toBe('physics');
    expect(questions[0].type).toBe('MCQ');
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].correctAnswer).toBe('0'); // A -> 0
    expect(questions[0].solution.text).toContain('E = h * nu');

    // Q2
    expect(questions[1].qNum).toBe(2);
    expect(questions[1].type).toBe('MCQ');
    expect(questions[1].correctAnswer).toBe('0');

    // Q3 (Section B: Numerical)
    expect(questions[2].qNum).toBe(3);
    expect(questions[2].type).toBe('NUMERICAL');
    expect(questions[2].options).toBeUndefined();
    expect(questions[2].correctAnswer).toBe('3');
    expect(questions[2].solution.text).toContain('Monoatomic gas has 3');
  });

  it('supports multi-subject transitions from Physics to Chemistry to Maths', () => {
    const threeSubjectPaper = `
SECTION I: PHYSICS
1. In projectile motion, apex velocity is horizontal.
(A) True (B) False (C) Cannot tell (D) None
Ans: A

SECTION II: CHEMISTRY
2. Oxidation state of Cr in K2Cr2O7 is:
(A) +6 (B) +3 (C) +2 (D) +7
Ans: A

SECTION III: MATHEMATICS
3. Number of real roots of x^2 + 1 = 0 is:
(A) 0 (B) 1 (C) 2 (D) Inf
Ans: A
`;

    const questions = PdfLexicalParser.parse(threeSubjectPaper);
    expect(questions).toHaveLength(3);
    expect(questions[0].subject).toBe('physics');
    expect(questions[1].subject).toBe('chemistry');
    expect(questions[2].subject).toBe('maths');
  });

  it('handles horizontal options on a single line cleanly', () => {
    const text = `
Q1. The value of sin(30°) is:
(A) 1/2   (B) √3/2   (C) 1   (D) 0
Ans: A
`;

    const questions = PdfLexicalParser.parse(text);
    expect(questions).toHaveLength(1);
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].options?.[0].text).toBe('1/2');
    expect(questions[0].options?.[1].text).toBe('√3/2');
    expect(questions[0].options?.[2].text).toBe('1');
    expect(questions[0].options?.[3].text).toBe('0');
  });

  it('recovers gracefully from empty or malformed text blocks without crashing', () => {
    const textWithGarbage = `
Preamble text that is not a question.
Welcome to the examination.
Time: 3 hours.

Q1. Valid question statement 1.
(A) Option 1
(B) Option 2
(C) Option 3
(D) Option 4
Ans: B

Random garbage line that shouldn't be parsed as a question.

Q2. Valid question statement 2.
(A) Alpha
(B) Beta
(C) Gamma
(D) Delta
Ans: C
`;

    const questions = PdfLexicalParser.parse(textWithGarbage);
    expect(questions).toHaveLength(2);
    expect(questions[0].qNum).toBe(1);
    expect(questions[0].correctAnswer).toBe('1'); // B -> 1
    expect(questions[1].qNum).toBe(2);
    expect(questions[1].correctAnswer).toBe('2'); // C -> 2
  });

  it('guarantees zero collision when chemistry statement mentions Compound (A), (B), (C), and (D)', () => {
    const chemText = `
SECTION II: CHEMISTRY
Q1. An organic Compound (A) reacts with NaOH to form (B). When (B) is heated with (C) and (D), it yields acetone.
Identify Compound (A):
(A) 2-Methylpropene
(B) Propan-2-ol
(C) Butan-2-ol
(D) Ethanal
Ans: (B)
Sol: Propan-2-ol on dehydrogenation gives acetone.
`;

    const questions = PdfLexicalParser.parse(chemText);
    expect(questions).toHaveLength(1);
    expect(questions[0].content).toContain('Compound (A) reacts with NaOH to form (B)');
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].options?.[0].text).toContain('2-Methylpropene');
    expect(questions[0].options?.[1].text).toContain('Propan-2-ol');
    expect(questions[0].options?.[2].text).toContain('Butan-2-ol');
    expect(questions[0].options?.[3].text).toContain('Ethanal');
    expect(questions[0].correctAnswer).toBe('1'); // B -> 1
  });

  it('correctly parses 2x2 numeric options grid without swallowing options', () => {
    const dppQuestion = `
1. A hall has the dimensions 10 m × 10 m × 10 m. A fly starting at one corner ends up at a farthest corner. The magnitude of its displacement is:
(1) 5 √3 m   (2) 10 √3 m
(3) 20 √3 m   (4) 30 √3 m
Ans: (2)
`;

    const questions = PdfLexicalParser.parse(dppQuestion);
    expect(questions).toHaveLength(1);
    expect(questions[0].qNum).toBe(1);
    expect(questions[0].type).toBe('MCQ');
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].options?.[0].id).toBe('A');
    expect(questions[0].options?.[0].text).toBe('5 √3 m');
    expect(questions[0].options?.[1].id).toBe('B');
    expect(questions[0].options?.[1].text).toBe('10 √3 m');
    expect(questions[0].options?.[2].id).toBe('C');
    expect(questions[0].options?.[2].text).toBe('20 √3 m');
    expect(questions[0].options?.[3].id).toBe('D');
    expect(questions[0].options?.[3].text).toBe('30 √3 m');
    expect(questions[0].correctAnswer).toBe('1'); // (2) -> 1 (Option B)
  });

  it('correctly parses 2x2 vertically-laid-out options grid (A & C on line 1, B & D on line 2)', () => {
    const text = `
Q1. Which of the following is correct?
(A) First left   (C) First right
(B) Second left  (D) Second right
Ans: C
`;

    const questions = PdfLexicalParser.parse(text);
    expect(questions).toHaveLength(1);
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].options?.[0].text).toBe('First left');
    expect(questions[0].options?.[1].text).toBe('Second left');
    expect(questions[0].options?.[2].text).toBe('First right');
    expect(questions[0].options?.[3].text).toBe('Second right');
    expect(questions[0].correctAnswer).toBe('2'); // C -> 2
  });

  it('does not misidentify references to equations (1) and (2) as option pairs', () => {
    const text = `
Q1. A particle moves along a path.
From equations (1) and (2), we get the acceleration.
Find the final velocity:
(A) 10 m/s
(B) 20 m/s
(C) 30 m/s
(D) 40 m/s
Ans: A
`;

    const questions = PdfLexicalParser.parse(text);
    expect(questions).toHaveLength(1);
    expect(questions[0].content).toContain('From equations (1) and (2), we get the acceleration.');
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].options?.[0].text).toBe('10 m/s');
  });
});
