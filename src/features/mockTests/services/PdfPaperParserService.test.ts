import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfPaperParserService, validatePdfMagicBytes, sanitizeHtmlContent } from './PdfPaperParserService';
import { normalizeChemistryAndOrbitals, sanitizeCorruptedLatex } from '@/components/MathRenderer';

describe('PdfPaperParserService & DPP Solver', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleDppText = `
Allen Career Institute - Daily Practice Problem (DPP)
Physics - Ray Optics and Optical Instruments
Total Marks: 40 | Time: 45 Mins

Q1. A ray of light is incident at an angle of 30° on a plane mirror. The angle of deviation produced is:
(A) 60°
(B) 120°
(C) 150°
(D) 30°
Ans: B
Sol: Angle of deviation \\delta = 180° - 2i = 180° - 60° = 120°.

Q2. An object is placed at 20 cm in front of a concave mirror of focal length 10 cm. The image formed is:
(A) Real, inverted and at 20 cm
(B) Virtual, erect and at 20 cm
(C) Real, inverted and at 10 cm
(D) Real, inverted and at infinity
Answer: A
Explanation: 1/v + 1/u = 1/f => 1/v - 1/20 = -1/10 => 1/v = -1/20 => v = -20 cm.

Q3. Find the focal length (in cm) of a convex lens in air whose radius of curvature for both surfaces is 20 cm and refractive index is 1.5.
Answer: 20
Explanation: 1/f = (1.5 - 1)(1/20 - (-1/20)) = 0.5 * (2/20) = 1/20 => f = 20 cm.
`;

  it('correctly extracts questions and options using parsePaperTextHeuristic', () => {
    const questions = PdfPaperParserService.parsePaperTextHeuristic(sampleDppText, 'physics');
    expect(questions.length).toBeGreaterThanOrEqual(2);

    const q1 = questions[0];
    expect(q1.content).toContain('incident at an angle of');
    expect(q1.options).toBeDefined();
    expect(q1.options?.length).toBe(4);
    expect(q1.correctAnswer).toBe('1'); // 'B' is index '1'
    expect(q1.solution?.text).toContain('120');
  });

  it('builds a single-subject DPP test with custom duration and chapter targeting', async () => {
    // Mock extractTextFromPDF to return sample text
    vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue(sampleDppText);

    // Mock fetch to simulate offline or AI failure to trigger heuristic builder
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const mockFile = new File(['mock content'], 'Ray_Optics_DPP_01.pdf', { type: 'application/pdf' });

    const dppTest = await PdfPaperParserService.parseDppToMockTest(mockFile, {
      dppTitle: 'Ray Optics DPP Drill 01',
      subject: 'physics',
      chapterName: 'Ray Optics',
      durationMinutes: 45
    });

    expect(dppTest.name).toBe('Ray Optics DPP Drill 01 [Coaching DPP]');
    expect(dppTest.durationMinutes).toBe(45);
    expect(dppTest.sections.length).toBe(1);
    expect(dppTest.sections[0].subject).toBe('physics');
    expect(dppTest.sections[0].questions.length).toBeGreaterThanOrEqual(2);

    // Verify questions have the chapter name attached
    expect(dppTest.sections[0].questions[0].chapter).toBe('Ray Optics');
    expect(dppTest.sections[0].questions[0].subject).toBe('physics');
  }, 15000);

  it('throws an informative error if the document has no identifiable questions', async () => {
    vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue('Welcome to random empty document with no questions');
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const mockFile = new File(['empty'], 'blank.pdf', { type: 'application/pdf' });

    await expect(
      PdfPaperParserService.parseDppToMockTest(mockFile, {
        subject: 'chemistry'
      })
    ).rejects.toThrow('Unable to identify questions');
  });

  it('successfully digitizes scanned image-only PDFs via Gemini Multimodal Vision API when text layer is empty', async () => {
    // Simulate scanned PDF where pdfjs-dist extracts 0 characters of text
    vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue('');

    // Mock fetch to return parsed questions from AI vision
    const mockQuestions = [
      {
        content: 'In NO3- ion, The number of bond pair and lone pair of electrons present on Nitrogen atom are :',
        options: [
          { id: 'A', text: '2,2' },
          { id: 'B', text: '3,1' },
          { id: 'C', text: '1,3' },
          { id: 'D', text: '4,0' }
        ],
        correctAnswer: 'D',
        type: 'MCQ',
        solution: { text: '**Key Concept & Formula**\nOctet rule.\n\n**Step 1**\nTotal bonds = 4.\n\n**Conclusion & Correct Option**\n(D)' }
      },
      {
        content: 'How many bonded electron pairs are present in IF7 molecule?',
        options: [
          { id: 'A', text: '6' },
          { id: 'B', text: '7' },
          { id: 'C', text: '5' },
          { id: 'D', text: 'None of these' }
        ],
        correctAnswer: 'B',
        type: 'MCQ',
        solution: { text: '**Key Concept & Formula**\n7 bonds.\n\n**Conclusion & Correct Option**\n(B)' }
      }
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ questions: mockQuestions })
    });

    const mockScannedFile = new File(['fake image bytes'], 'Chemical_Bonding_Scan.pdf', { type: 'application/pdf' });

    const resultTest = await PdfPaperParserService.parsePdfToMockTest(mockScannedFile, {
      paperTitle: 'Chemical Bonding Scanned DPP'
    });

    expect(resultTest).toBeDefined();
    expect(resultTest.sections.length).toBeGreaterThanOrEqual(1);
    const allQuestions = resultTest.sections.flatMap(s => s.questions);
    expect(allQuestions.length).toBe(2);
    expect(allQuestions[0].content).toContain('NO3- ion');
    expect(allQuestions[0].correctAnswer).toBe('3'); // 'D' -> index '3'
  });

  it('throws a clear scanned PDF error if AI Vision is unreachable and text layer is empty', async () => {
    vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue('');
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const mockScannedFile = new File(['fake image bytes'], 'Blank_Scan.pdf', { type: 'application/pdf' });

    await expect(
      PdfPaperParserService.parsePdfToMockTest(mockScannedFile)
    ).rejects.toThrow('Could not extract questions from this scanned PDF');
  });

  it('sanitizeQuestionText strips stray brackets, Q27], [1], and leading punctuation cleanly', () => {
    expect(PdfPaperParserService.sanitizeQuestionText('] If uncertainty in position and momentum')).toBe('If uncertainty in position and momentum');
    expect(PdfPaperParserService.sanitizeQuestionText('Q27] If uncertainty in position and momentum')).toBe('If uncertainty in position and momentum');
    expect(PdfPaperParserService.sanitizeQuestionText('[Q1] What is the velocity')).toBe('What is the velocity');
    expect(PdfPaperParserService.sanitizeQuestionText('1] Two particles A and B')).toBe('Two particles A and B');
    expect(PdfPaperParserService.sanitizeQuestionText('Q.1: Which of the following')).toBe('Which of the following');
    expect(PdfPaperParserService.sanitizeQuestionText('): Find the value of work function')).toBe('Find the value of work function');
  });

  it('correctly parses questions starting with square brackets (Q27]) and extracts lowercase options without stray ]', () => {
    const rawSquareBracketText = `
ATOMIC STRUCTURE
LEVEL - 1

Q26] Among the following representations of excited states of atoms which is impossible?
(a) 1s1 2s1 (b) [Ne]3s2 3p3 4s1 (c) 1s2 2s3 2p4 3s2 (d) [Ne] 3s2 3p6 4s3 3d2

Q27] If uncertainty in position and momentum of a particle is numerically equal, then the minimum uncertainty in speed of the particle should be
(a) sqrt(h/2pi)
(b) 1/2m sqrt(h/pi)
(c) sqrt(h/pi)
(d) 1/m sqrt(h/pi)

Q28] Wave function of an orbital is plotted against the distance from nucleus.
(a) 1s (b) 2s (c) 3s (d) 2p
`;

    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawSquareBracketText, 'chemistry');
    expect(parsed.length).toBe(3);

    const q27 = parsed[1];
    expect(q27.content.startsWith(']')).toBe(false);
    expect(q27.content).toContain('If uncertainty in position and momentum');
    expect(q27.options).toBeDefined();
    expect(q27.options?.length).toBe(4);
    expect(q27.options?.[0].text).toContain('sqrt(h/2pi)');
    expect(q27.options?.[1].text).toContain('1/2m');
  });

  it('accurately parses global coaching answer keys at bottom of document and maps them to questions', () => {
    const coachingPaperWithBottomKey = `
ATOMIC STRUCTURE
LEVEL - 1
Q1] Two particles A and B having same e/m ratio are projected towards silver nucleus with same speed.
(a) same for both. (b) greater for A. (c) greater for B. (d) depends on speed.

Q2] Which of the following statement does not form part of Bohr model?
(a) Energy is quantized (b) Lowest energy orbit (c) Different orbits (d) Position and velocity cannot be determined

LEVEL - 2
INTEGER TYPE
Q1] Calculate the wavelength in Angstrom associated with ejected electrons having maximum kinetic energy.
Q2] Suppose a satellite telecasts a match, after what time in milliseconds will we see this action?

ANSWER KEY
Level-1
1] a   2] d
INTEGER TYPE
1] 3   2] 0084
`;

    const parsed = PdfPaperParserService.parsePaperTextHeuristic(coachingPaperWithBottomKey, 'chemistry');
    expect(parsed.length).toBe(4);

    // Q1 should be MCQ with answer '0' (from 'a')
    expect(parsed[0].type).toBe('MCQ');
    expect(parsed[0].correctAnswer).toBe('0');
    expect(parsed[0].options?.length).toBe(4);

    // Q2 should be MCQ with answer '3' (from 'd')
    expect(parsed[1].type).toBe('MCQ');
    expect(parsed[1].correctAnswer).toBe('3');

    // Integer Q1 should be NUMERICAL with answer '3'
    expect(parsed[2].type).toBe('NUMERICAL');
    expect(parsed[2].correctAnswer).toBe('3');

    // Integer Q2 should be NUMERICAL with answer '0084' (NOT '0'!)
    expect(parsed[3].type).toBe('NUMERICAL');
    expect(parsed[3].correctAnswer).toBe('0084');
  });

  it('correctly preserves ratio options (Q3) and never returns blank options or stripped numbers', () => {
    const rawRatioText = `
ATOMIC STRUCTURE
Q3] The ratio of the frequency of revolution of electron in the first Bohr orbit of He+ to that in the second Bohr orbit of Li 2+ is:
(a) 3 : 2 (b) 9 : 4 (c) 4 : 9 (d) 2 : 3

Q4] The kinetic energy of an electron is E. Its de Broglie wavelength is:
(a) h / sqrt(2mE) (b) sqrt(h / 2mE) (c) 2mE / h (d) h / 2mE

Q5] The orbital angular momentum of a 3p electron is:
(a) h / 2pi (b) sqrt(2) h / 2pi (c) sqrt(6) h / 2pi (d) 2 h / pi
`;

    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawRatioText, 'chemistry');
    expect(parsed.length).toBe(3);

    const q3 = parsed[0];
    expect(q3.options).toBeDefined();
    expect(q3.options?.length).toBe(4);
    // Crucial check: none of the options should be blank or stripped of the leading number
    expect(q3.options?.[0].text).toBe('3 : 2');
    expect(q3.options?.[1].text).toBe('9 : 4');
    expect(q3.options?.[2].text).toBe('4 : 9');
    expect(q3.options?.[3].text).toBe('2 : 3');
  });

  it('correctly parses scientific notation (Q7) preserving 1.2, 6.0, and negative exponents into KaTeX', () => {
    const rawSciText = `
ATOMIC STRUCTURE
Q7] The work function of a metal is 4.2 eV. The maximum kinetic energy of ejected electrons when light of wavelength 2000 Å falls on it is:
(a) 1.2 × 10 -18 J
(b) 6.0 × 10 -19 J
(c) 3.2 × 10 -20 J
(d) 5.0 × 10 -12 J

Q8] If work function is 2 eV, threshold frequency is:
(a) 4.8 × 10 14 Hz (b) 5.2 × 10 14 Hz (c) 6.0 × 10 14 Hz (d) 7.1 × 10 14 Hz

Q9] The energy of a photon of wavelength 4000 Å is:
(a) 3.1 eV (b) 4.2 eV (c) 2.5 eV (d) 1.8 eV
`;

    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawSciText, 'chemistry');
    expect(parsed.length).toBe(3);

    const q7 = parsed[0];
    expect(q7.options).toBeDefined();
    expect(q7.options?.length).toBe(4);
    // Option A must preserve 1.2 and format 10^{-18}
    expect(q7.options?.[0].text).toContain('1.2');
    expect(q7.options?.[0].text).toContain('10^{-18}');
    // Option B must preserve 6.0 and format 10^{-19}
    expect(q7.options?.[1].text).toContain('6.0');
    expect(q7.options?.[1].text).toContain('10^{-19}');
  });

  it('correctly parses statement questions (Q4) preserving statements in question body and (a)-(d) as options', () => {
    const rawStatementText = `
ATOMIC STRUCTURE
Q4] Consider the following statements:
(1) Energy of electron in hydrogen atom is negative.
(2) Velocity of electron is highest in the first orbit.
(3) Radius of orbit is directly proportional to n.
Which of the above statements are correct?
(a) (1) and (2) (b) (2) and (3) (c) (1) and (3) (d) (1), (2) and (3)

Q5] A photon of frequency v collides with an electron.
(a) Frequency increases (b) Frequency decreases (c) Unchanged (d) None

Q6] The ratio of radius of 2nd orbit to 1st orbit of hydrogen is:
(a) 4 (b) 2 (c) 8 (d) 16
`;

    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawStatementText, 'chemistry');
    expect(parsed.length).toBe(3);

    const q4 = parsed[0];
    expect(q4.content).toContain('Consider the following statements');
    expect(q4.content).toContain('Energy of electron');
    expect(q4.content).toContain('Velocity of electron');
    expect(q4.options).toBeDefined();
    expect(q4.options?.length).toBe(4);
    expect(q4.options?.[0].text).toContain('(1) and (2)');
    expect(q4.options?.[1].text).toContain('(2) and (3)');
  });

  it('normalizeMathToLatex accurately handles radicals, fractions, ions, and mathematical Unicode', () => {
    const raw = '√(λR(λR - 1)) with h/2π for Li 2+ ion and 1.2 × 10 -18 J';
    const normalized = PdfPaperParserService.normalizeMathToLatex(raw);

    expect(normalized).toContain('$\\sqrt{\\lambda R(\\lambda R - 1)}$');
    expect(normalized).toContain('$\\frac{h}{2\\pi}$');
    expect(normalized).toContain('$\\text{Li}^{2+}\\text{ ion}$');
    expect(normalized).toContain('$1.2 \\times 10^{-18} \\text{ J}$');
  });

  it('correctly maps Adobe Symbol PUA codepoints eliminating tofu glyphs (Images 1 & 4)', () => {
    const rawTofuText = `ATOMIC STRUCTURE
Q30] In a photoelectric experiment, kinetic energy of photoelectrons was plotted against the frequency of incident radiation ( \uF06E ), as shown in figure.
(a) The threshold frequency is \uF06E 1 .
(b) The slope of this line is equal to Plank's constant.
(c) As frequency increases, kinetic energy decreases.
(d) It is impossible to obtain such a graph.

Q31] Next question
(a) 1 (b) 2 (c) 3 (d) 4

Q32] Another question
(a) A (b) B (c) C (d) D
`;

    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawTofuText, 'physics');
    expect(parsed.length).toBe(3);

    const q30 = parsed[0];
    // Must not contain unmapped PUA code point \uF06E
    expect(q30.content.includes('\uF06E')).toBe(false);
    expect(q30.content).toContain('($\\nu$)');
    expect(q30.options?.[0].text).toContain('$\\nu_1$');
    expect(q30.options?.[0].text.includes('\uF06E')).toBe(false);
  });

  it('correctly prunes trailing section headers from Option D (Image 5)', () => {
    const rawSectionBleedText = `ATOMIC STRUCTURE
Q40] Calculate the minimum and maximum number of electrons which may have magnetic quantum number, m = +1 and spin quantum number, s = - 1/2 in chromium (Cr) :
(a) 0, 1 (b) 1, 2 (c) 4, 6 (d) 2, 3
LEVEL - 2
Q1] Light of wavelength (λ) strikes a metal surface
(a) Y halved (b) Y doubled (c) Z halved (d) Z doubled

Q2] Second question
(a) 1 (b) 2 (c) 3 (d) 4
`;

    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawSectionBleedText, 'chemistry');
    expect(parsed.length).toBe(3);

    const q40 = parsed[0];
    expect(q40.options?.[3].text).toBe('2, 3');
    expect(q40.options?.[3].text).not.toContain('LEVEL - 2');
  });

  it('correctly folds vertically stacked 2D fractions in options (Image 3)', () => {
    const rawStackedText = `ATOMIC STRUCTURE
Q27] If uncertainty in position and momentum of a particle is numerically equal, then the minimum uncertainty in speed of the particle should be
(a)   √  
h
2π  
(b) 1/2m   √
h
π  
(c)   √
h
π  
(d) 1/m √
h
π

Q28] Next question
(a) 1s (b) 2s (c) 3s (d) 4s

Q29] Another question
(a) 1 (b) 2 (c) 3 (d) 4
`;

    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawStackedText, 'chemistry');
    expect(parsed.length).toBe(3);

    const q27 = parsed[0];
    // Options must not have linebreaks splitting numerator and denominator
    expect(q27.options?.[0].text.includes('\n')).toBe(false);
    expect(q27.options?.[0].text).toContain('\\sqrt{\\frac{h}{2\\pi}}');
    expect(q27.options?.[1].text).toContain('\\sqrt{\\frac{h}{\\pi}}');
  });

  it('correctly handles complex compound radicals with fractions (Image 2)', () => {
    const rawRadicalsText = `ATOMIC STRUCTURE
Q12] An excited state of H atom emits a photon of wave length and returns in the ground state. The principal quantum number of excited state is given by :
(a) √λR(λR - 1)
(b) √λR/(λR - 1)
(c) √2λR(λR - 1)
(d) √(λR - 1)/λR

Q13] Next question
(a) 2 (b) 4 (c) 1/2 (d) 1/4

Q14] Third question
(a) 1 (b) 2 (c) 3 (d) 4
`;

    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawRadicalsText, 'chemistry');
    expect(parsed.length).toBe(3);

    const q12 = parsed[0];
    expect(q12.options?.[0].text).toBe('$\\sqrt{\\lambda R(\\lambda R - 1)}$');
    expect(q12.options?.[1].text).toBe('$\\sqrt{\\frac{\\lambda R}{\\lambda R - 1}}$');
    expect(q12.options?.[2].text).toBe('$\\sqrt{2\\lambda R(\\lambda R - 1)}$');
    expect(q12.options?.[3].text).toBe('$\\frac{\\sqrt{\\lambda R - 1}}{\\lambda R}$');
  });

  it('correctly parses positive scientific notation exponents with asterisk and space (Image 2: 1.54*10 6 m/s)', () => {
    const rawSci = `ATOMIC STRUCTURE
Q1] An electron in a hydrogen atom in its ground state absorbs 1.5 times as much energy as the minimum required for it to escape from the atom. What is the velocity of the emitted electron?
(a) 1.54*10 6 m/s
(b) 1.54*10 8 m/s
(c) 1.54*10 3 m/s
(d) 1.54*10 4 m/s

Q2] Next question
(a) 1 (b) 2 (c) 3 (d) 4

Q3] Another question
(a) A (b) B (c) C (d) D
`;
    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawSci, 'chemistry');
    expect(parsed.length).toBe(3);
    const q1 = parsed[0];
    expect(q1.options?.[0].text).toBe('$1.54 \\times 10^{6} \\text{ m/s}$');
    expect(q1.options?.[1].text).toBe('$1.54 \\times 10^{8} \\text{ m/s}$');
    expect(q1.options?.[2].text).toBe('$1.54 \\times 10^{3} \\text{ m/s}$');
    expect(q1.options?.[3].text).toBe('$1.54 \\times 10^{4} \\text{ m/s}$');
  });

  it('correctly normalizes multi-line wave equation and variables (Image 3: psi(3s))', () => {
    const rawWave = `ATOMIC STRUCTURE
Q2] For a 3s - orbital, value of \\psi is given by following relation :
\\psi(3s) =
1
9√3(
1
a o
) 3/2 (6-6 \\sigma + \\sigma 2 ) e
-\\sigma/2
; where \\sigma =
2r.Z
3a o
What is the maximum radial distance of node from nucleus ?
(a) 1 (b) 2 (c) 3 (d) 4

Q3] Next question
(a) A (b) B (c) C (d) D

Q4] Another question
(a) 10 (b) 20 (c) 30 (d) 40
`;
    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawWave, 'chemistry');
    expect(parsed.length).toBe(3);
    const q2 = parsed[0];
    // Wave equation should not have broken radicals $\sqrt{3(}$
    expect(q2.content).not.toContain('\\sqrt{3(');
    // Should have Bohr radius a_0
    expect(q2.content).toContain('a_0');
    // Should have sigma^2
    expect(q2.content).toContain('\\sigma^2');
    // Should have unified fractions
    expect(q2.content).toContain('\\frac{1}{a_0}');
  });

  it('provides descriptive figure references for diagram/graph questions with visual options (Image 1)', () => {
    const rawGraph = `ATOMIC STRUCTURE
Q15] Which of the following graph represents the radial probability function of 3d electron?
(1) (2) (3) (4)

Q16] Next question
(a) 1 (b) 2 (c) 3 (d) 4

Q17] Another question
(a) A (b) B (c) C (d) D
`;
    const parsed = PdfPaperParserService.parsePaperTextHeuristic(rawGraph, 'chemistry');
    expect(parsed.length).toBe(3);
    const q15 = parsed[0];
    expect(q15.options?.[0].text).toContain('Graph / Figure (1)');
    expect(q15.options?.[1].text).toContain('Graph / Figure (2)');
    expect(q15.options?.[2].text).toContain('Graph / Figure (3)');
    expect(q15.options?.[3].text).toContain('Graph / Figure (4)');
  });

  it('strips PART - III section headers cleanly in sanitizeQuestionText', () => {
    const sample = 'PART - III : ONE OR MORE THAN ONE OPTIONS CORRECT TYPE\n1. Find the correct statements regarding SO4^-2.';
    const sanitized = PdfPaperParserService.sanitizeQuestionText(sample);
    expect(sanitized).not.toContain('PART - III');
    expect(sanitized).toContain('Find the correct statements regarding SO4^-2.');
  });

  it('formats orbital combinations and chemical ions in normalizeMathToLatex', () => {
    const orbitalText = 'Consider y-axis as internuclear axis: (i) py - py (ii) px - px (iii) pz - pz (iv) dxy - dxy (v) dyz - dyz (vi) px - dxy';
    const formattedOrbitals = PdfPaperParserService.normalizeMathToLatex(orbitalText);
    expect(formattedOrbitals).toContain('$p_{y} - p_{y}$');
    expect(formattedOrbitals).toContain('$p_{x} - p_{x}$');
    expect(formattedOrbitals).toContain('$d_{xy} - d_{xy}$');

    const chemText = 'Find statements regarding SO4^-2 and CO3^-2 and CCl4.';
    const formattedChem = PdfPaperParserService.normalizeMathToLatex(chemText);
    expect(formattedChem).toContain('\\text{SO}_4^{\\,2-}');
    expect(formattedChem).toContain('\\text{CO}_3^{\\,2-}');
    expect(formattedChem).toContain('\\text{CCl}_4');
  });

  it('supports multi-letter answers like ACD, AC, BC in normalizeAnswerValue and buildDppMockTestObject', () => {
    const resAcd = PdfPaperParserService.normalizeAnswerValue('ACD');
    expect(resAcd.normalized).toBe('ACD');
    expect(resAcd.isNumerical).toBe(false);

    const resSingle = PdfPaperParserService.normalizeAnswerValue('A');
    expect(resSingle.normalized).toBe('0');

    const mockQ = {
      content: 'Which statements are correct regarding SO4^2-?',
      type: 'MCQ',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'ACD'
    };
    const testObj = (PdfPaperParserService as any).buildDppMockTestObject('Chemical Bonding Test', [mockQ], {}, undefined);
    expect(testObj.sections[0].questions[0].correctAnswer).toBe('ACD');
  });

  it('heuristicAnalyzeDppMetadata accurately detects institute, subject, chapter, and duration', () => {
    const chapters = [
      { id: '1', name: 'Ray Optics and Optical Instruments', subject: 'physics' },
      { id: '2', name: 'Rotational Motion', subject: 'physics' },
      { id: '3', name: 'Chemical Bonding and Molecular Structure', subject: 'chemistry' }
    ];

    const dppSample = `
      Allen Career Institute
      Physics DPP #04 - Ray Optics and Optical Instruments
      Total Questions: 10
      Q1. Light ray deviation...
      Q2. Concave mirror...
      Q3. Convex lens focal length...
    `;

    const metadata = PdfPaperParserService.heuristicAnalyzeDppMetadata(
      'Allen_Physics_DPP_04.pdf',
      dppSample,
      chapters
    );

    expect(metadata.detectedInstitute).toBe('Allen');
    expect(metadata.subject).toBe('physics');
    expect(metadata.chapterName).toBe('Ray Optics and Optical Instruments');
    expect(metadata.recommendedDurationMinutes).toBe(30); // 3 questions <= 10 -> 30m
    expect(metadata.title).toContain('Allen');
    expect(metadata.title).toContain('Physics');
  });

  it('analyzeDppMetadata falls back seamlessly to heuristic if server is unavailable', async () => {
    vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue(`
      Resonance Chemistry DPP #02
      Chemical Bonding and Molecular Structure
      Q1. Find hybridisation of SF6
      Q2. Bond angle in NH3
    `);

    // Mock fetch error
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const mockFile = new File(['content'], 'Resonance_Chem_Bonding.pdf', { type: 'application/pdf' });
    const chapters = [{ id: 'c1', name: 'Chemical Bonding and Molecular Structure', subject: 'chemistry' }];

    const result = await PdfPaperParserService.analyzeDppMetadata(mockFile, chapters);
    expect(result.detectedInstitute).toBe('Resonance');
    expect(result.subject).toBe('chemistry');
    expect(result.chapterName).toBe('Chemical Bonding and Molecular Structure');
    expect(result.title).toContain('Resonance');
    expect(result.title).toContain('Chemistry');
  });

  it('correctly classifies ATOMICSTRUCTUREpdf.pdf as Chemistry and matches Atomic Structure chapter', async () => {
    vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue(`
      Worksheet
      Q1. Calculate wavelength of line in Balmer series
      Q2. De Broglie wavelength of electron
      Q3. Energy of photon in eV
    `);

    // Mock fetch offline/error to test local heuristic resolution
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const mockFile = new File(['content'], 'ATOMICSTRUCTUREpdf.pdf', { type: 'application/pdf' });
    const chapters = [
      { id: 'p1', name: 'Work, Energy & Power', subject: 'physics' },
      { id: 'p2', name: 'Rotational Motion', subject: 'physics' },
      { id: 'c1', name: 'Atomic Structure', subject: 'chemistry' },
      { id: 'c2', name: 'Chemical Bonding', subject: 'chemistry' }
    ];

    const result = await PdfPaperParserService.analyzeDppMetadata(mockFile, chapters);
    expect(result.subject).toBe('chemistry');
    expect(result.chapterName).toBe('Atomic Structure');
    expect(result.title).toContain('Chemistry');
    expect(result.title).toContain('Atomic Structure');
  });

  it('automatically detects diagram requirement and crops diagram when question contains theta or bond angle references', async () => {
    vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue('');
    vi.spyOn(PdfPaperParserService as any, 'fileToBase64').mockResolvedValue('fake-base64');
    vi.spyOn(PdfPaperParserService as any, 'renderAndCropDiagram').mockResolvedValue('data:image/webp;base64,CROPPED_DIAGRAM_OK');

    const mockQuestions = [
      {
        content: 'Which of the following statements is correct for SO2Cl2 (Sulfuryl chloride)?<br/>',
        options: [
          { id: 'A', text: 'It contains p_pi - p_pi and p_pi - d_pi bonds.' },
          { id: 'B', text: 'It has regular tetrahedral geometry.' },
          { id: 'C', text: '\\theta_1 > \\theta_3' },
          { id: 'D', text: 'Plane which contains maximum number of atom is 4.' }
        ],
        // Simulating AI that omitted hasDiagram and diagramBbox
        hasDiagram: false,
        correctAnswer: 'A',
        type: 'MCQ',
        solution: { text: '**Key Concept & Formula**\nSO2Cl2 structure.\n\n**Conclusion & Correct Option**\n(A)' }
      }
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ questions: mockQuestions })
    });

    const mockFile = new File(['fake bytes'], 'SO2Cl2_DPP.pdf', { type: 'application/pdf' });
    const resultTest = await PdfPaperParserService.parseDppToMockTest(mockFile, {
      dppTitle: 'Chemical Bonding DPP'
    });

    const q = resultTest.sections[0].questions[0];
    expect(q.hasDiagram).toBe(true);
    expect(q.imageUrl).toBe('data:image/webp;base64,CROPPED_DIAGRAM_OK');
    expect(q.content).not.toContain('<br/>');
  });

  it('does NOT flag pure text questions containing arc symbols like \\widehat{CNC} or \\widehat{HCH} as having diagrams', async () => {
    vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue('');
    vi.spyOn(PdfPaperParserService as any, 'fileToBase64').mockResolvedValue('fake-base64');
    const cropSpy = vi.spyOn(PdfPaperParserService as any, 'renderAndCropDiagram').mockResolvedValue('data:image/webp;base64,SHOULD_NOT_CROP');

    const mockQuestions = [
      {
        content: 'The \\widehat{CNC} bond angle in CH3NCS is:',
        options: [
          { id: 'A', text: '< 109^\\circ 28\'' },
          { id: 'B', text: '< 120^\\circ' },
          { id: 'C', text: '> 120^\\circ' },
          { id: 'D', text: '112^\\circ' }
        ],
        hasDiagram: false,
        correctAnswer: 'C',
        type: 'MCQ',
        solution: { text: '**Key Concept & Formula**\nCH3NCS geometry.\n\n**Conclusion & Correct Option**\n(C)' }
      },
      {
        content: 'Choose the correct statement from the following options.',
        options: [
          { id: 'A', text: 'All d_{C-O} in H2CO3 are identical.' },
          { id: 'B', text: 'All d_{Sb-Cl} in SbCl5 are identical.' },
          { id: 'C', text: '\\widehat{HCH}(in H_2CO) < \\widehat{FCF}(in F_2CO)' },
          { id: 'D', text: 'All above statements are incorrect' }
        ],
        hasDiagram: false,
        correctAnswer: 'C',
        type: 'MCQ',
        solution: { text: '**Key Concept & Formula**\nBack bonding and formal bonds.\n\n**Conclusion & Correct Option**\n(C)' }
      }
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ questions: mockQuestions })
    });

    const mockFile = new File(['fake bytes'], 'Text_Angles_DPP.pdf', { type: 'application/pdf' });
    const resultTest = await PdfPaperParserService.parseDppToMockTest(mockFile, {
      dppTitle: 'Chemical Bonding Angles'
    });

    const questions = resultTest.sections[0].questions;
    expect(questions[0].hasDiagram).toBe(false);
    expect(questions[0].imageUrl).toBeUndefined();
    expect(questions[1].hasDiagram).toBe(false);
    expect(questions[1].imageUrl).toBeUndefined();
    expect(cropSpy).not.toHaveBeenCalled();
  });

  it('correctly suppresses redundant diagram for Hydrazoic acid resonating structures while preserving SO3 Lewis options', () => {
    // Hydrazoic acid: content has resonating structures, options are Roman numerals I, II, III, IV
    const hydrazoicQ = {
      content: 'In hydrazoic acid ($HN_3$) the structures are: $H-\\ddot{N}=\\overset{+}{N}=\\ddot{N}^- \\leftrightarrow H-\\overset{+}{\\ddot{N}}-\\ddot{N}\\equiv N$. Which is most stable?',
      options: [
        { id: 'A', text: 'I' },
        { id: 'B', text: 'II' },
        { id: 'C', text: 'III' },
        { id: 'D', text: 'Both (I) and (III)' }
      ],
      hasDiagram: true
    };
    expect(PdfPaperParserService.isDiagramRedundant(hydrazoicQ)).toBe(true);

    // SO3 Lewis structures: options in PDF are drawn diagrams, option texts are bare letters (A), (B), (C), (D)
    const so3Q = {
      content: 'Which of the following is the correct Lewis structure of $SO_3$?',
      options: [
        { id: 'A', text: '(A)' },
        { id: 'B', text: '(B)' },
        { id: 'C', text: '(C)' },
        { id: 'D', text: '(D)' }
      ],
      hasDiagram: true
    };
    expect(PdfPaperParserService.isDiagramRedundant(so3Q)).toBe(false);

    // Circuit diagram question: references given figure/diagram
    const circuitQ = {
      content: 'In the given circuit diagram, find current through $R_1$ when switch $S$ is closed.',
      options: [
        { id: 'A', text: '2 A' },
        { id: 'B', text: '4 A' },
        { id: 'C', text: '6 A' },
        { id: 'D', text: '8 A' }
      ],
      hasDiagram: true
    };
    expect(PdfPaperParserService.isDiagramRedundant(circuitQ)).toBe(false);
  });

  it('detectDiagramCropRect cleanly isolates diagram between question statement and option lines', () => {
    // Mock canvas context with simulated pixels:
    // Header text: y = 20..40
    // Diagram: y = 80..180, x = 200..400
    // Options: y = 220..260
    const width = 600;
    const height = 400;
    const imgData = {
      data: new Uint8ClampedArray(width * height * 4)
    };

    // Fill white (255, 255, 255, 255)
    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = 255;
      imgData.data[i + 1] = 255;
      imgData.data[i + 2] = 255;
      imgData.data[i + 3] = 255;
    }

    const setBlack = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      imgData.data[idx] = 0;
      imgData.data[idx + 1] = 0;
      imgData.data[idx + 2] = 0;
      imgData.data[idx + 3] = 255;
    };

    // 1. Question text line at top
    for (let y = 20; y <= 40; y++) {
      for (let x = 30; x <= 550; x++) setBlack(x, y);
    }

    // 2. Diagram in middle
    for (let y = 80; y <= 180; y++) {
      for (let x = 200; x <= 400; x++) setBlack(x, y);
    }

    // 3. Option A at bottom
    for (let y = 220; y <= 250; y++) {
      for (let x = 40; x <= 350; x++) setBlack(x, y);
    }

    const mockCtx = {
      getImageData: () => imgData
    } as unknown as CanvasRenderingContext2D;

    const crop = (PdfPaperParserService as any).detectDiagramCropRect(mockCtx, width, height);
    expect(crop.cropY).toBeGreaterThanOrEqual(40); // strictly below question text
    expect(crop.cropY + crop.cropH).toBeLessThanOrEqual(220); // strictly above options
    expect(crop.cropX).toBeLessThanOrEqual(200); // contains diagram x
    expect(crop.cropX + crop.cropW).toBeGreaterThanOrEqual(400); // contains diagram x
  });

  it('detectDiagramCropRect with explicit question fence isolates diagram and prevents bleeding into next questions (Q5 and Q19)', () => {
    // Multi-question page:
    // Q.5 statement: y = 20..50
    // Q.5 diagram: y = 70..140, x = 60..300 (with margin notation at x = 60)
    // Q.6 statement: y = 180..210
    // Q.6 resonance: y = 230..280
    // Q.7: y = 320..380
    const width = 600;
    const height = 500;
    const imgData = { data: new Uint8ClampedArray(width * height * 4) };
    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = 255;
      imgData.data[i + 1] = 255;
      imgData.data[i + 2] = 255;
      imgData.data[i + 3] = 255;
    }
    const setBlack = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      imgData.data[idx] = 0;
      imgData.data[idx + 1] = 0;
      imgData.data[idx + 2] = 0;
      imgData.data[idx + 3] = 255;
    };

    // Q5 statement
    for (let y = 20; y <= 50; y++) {
      for (let x = 40; x <= 450; x++) setBlack(x, y);
    }
    // Q5 diagram (with left-aligned Na+ / bracket at x=60)
    for (let y = 70; y <= 140; y++) {
      for (let x = 60; x <= 300; x++) setBlack(x, y);
    }
    // Q6 statement & equation (MUST NOT BLEED INTO Q5)
    for (let y = 180; y <= 280; y++) {
      for (let x = 40; x <= 500; x++) setBlack(x, y);
    }

    const mockCtx = { getImageData: () => imgData } as unknown as CanvasRenderingContext2D;

    // With fence: fenceYmin = 55 (below Q5 statement), fenceYmax = 175 (strictly above Q6)
    const crop = (PdfPaperParserService as any).detectDiagramCropRect(mockCtx, width, height, undefined, { fenceYmin: 55, fenceYmax: 175 });

    // Must be completely above Q6 (180)
    expect(crop.cropY + crop.cropH).toBeLessThan(180);
    // Must be below Q5 statement (50)
    expect(crop.cropY).toBeGreaterThanOrEqual(55);
    // Left margin must not cut off left-aligned chemical notation
    expect(crop.cropX).toBeLessThanOrEqual(60);
    expect(crop.cropX + crop.cropW).toBeGreaterThanOrEqual(300);
  });

  it('correctly detects diagram for questions comparing bond angles x and y, cleans injected formula text, and attaches cropped diagram', async () => {
    vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue('');
    vi.spyOn(PdfPaperParserService as any, 'fileToBase64').mockResolvedValue('fake-base64');
    const cropSpy = vi.spyOn(PdfPaperParserService as any, 'renderAndCropDiagram').mockResolvedValue('data:image/webp;base64,MOLECULES_DIAGRAM_OK');

    const mockQuestions = [
      {
        content: 'Compare bond angle $x$ and $y$ in the following molecules ($SO_2F_2$ vs $SOF_2$).',
        options: [
          { id: 'A', text: '$x > y$' },
          { id: 'B', text: '$y > x$' },
          { id: 'C', text: '$x = y$' },
          { id: 'D', text: 'None of these' }
        ],
        // Simulating AI that returned hasDiagram: false and added ($SO_2F_2$ vs $SOF_2$)
        hasDiagram: false,
        correctAnswer: 'A',
        type: 'MCQ',
        solution: { text: '**Key Concept & Formula**\nVSEPR and lone pair repulsion.\n\n**Conclusion & Correct Option**\n(A)' }
      }
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ questions: mockQuestions })
    });

    const mockFile = new File(['fake bytes'], 'Bond_Angle_Worksheet.pdf', { type: 'application/pdf' });
    const resultTest = await PdfPaperParserService.parseDppToMockTest(mockFile, {
      dppTitle: 'Chemical Bonding Angles DPP'
    });

    const q = resultTest.sections[0].questions[0];
    expect(q.hasDiagram).toBe(true);
    expect(q.imageUrl).toBe('data:image/webp;base64,MOLECULES_DIAGRAM_OK');
    expect(q.content).toBe('Compare bond angle $x$ and $y$ in the following molecules.');
    expect(q.content).not.toContain('($SO_2F_2$ vs $SOF_2$)');
    expect(cropSpy).toHaveBeenCalled();
  });

  it('correctly parses unspaced ANSWERKEY headers and strips them from questions', () => {
    const rawPdfText = `
85. Find the value of (x + y + z) where x = 1 y = 2 z = 3

[PAGE 10] ANSWERKEY LEVEL -1
1] 28
2] 13
3] 6
4] 5
5] 4
6] 3
7] 2
8] 1
    `.trim();

    const keyData = PdfPaperParserService.extractGlobalAnswerKey(rawPdfText);
    expect(keyData.hasKeySection).toBe(true);
    expect(keyData.entries.length).toBe(8);
    expect(keyData.lookup(0, 1)?.rawAns).toBe('28');
    expect(keyData.lookup(1, 2)?.rawAns).toBe('13');

    // Ensure extractOptionsFromBlock removes the leaked ANSWERKEY
    const blockWithKey = `
85. Find the value of (x + y + z) where x = 1 y = 2 z = 3
ANSWERKEY LEVEL -1
Integer
1] 28
2] 13
3] 6
4] 5
    `.trim();

    const extracted = PdfPaperParserService.extractOptionsFromBlock(blockWithKey);
    // Since it was an integer question without genuine A/B/C/D options, it should not mistake answer key numbers for options
    expect(extracted.hasOptions).toBe(false);
    expect(extracted.questionBody).toContain('Find the value of');
    expect(extracted.questionBody).toContain('$(x + y + z)$');
    expect(extracted.questionBody).not.toContain('ANSWERKEY');
  });

  it('mergeParsedWithHeuristic seamlessly backfills missing questions into their exact document positions', () => {
    const aiQuestions = [
      { content: 'Question 1: What is hybridization of BF3?', type: 'MCQ', solution: { text: 'AI solution 1' } },
      { content: 'Question 3: Calculate formal charge in ozone.', type: 'MCQ', solution: { text: 'AI solution 3' } }
    ];

    const heuristicQuestions = [
      { content: 'Question 1: What is hybridization of BF3?', type: 'MCQ', solution: { text: 'Heuristic solution 1' } },
      { content: 'Question 2: Which molecule is non-polar?', type: 'MCQ', solution: { text: 'Heuristic solution 2' } },
      { content: 'Question 3: Calculate formal charge in ozone.', type: 'MCQ', solution: { text: 'Heuristic solution 3' } }
    ];

    const merged = PdfPaperParserService.mergeParsedWithHeuristic(aiQuestions, heuristicQuestions);
    expect(merged.length).toBe(3);
    // Question 1 should be AI's rich question
    expect(merged[0].content).toContain('BF3');
    expect(merged[0].solution.text).toBe('AI solution 1');
    // Question 2 should be backfilled from heuristic!
    expect(merged[1].content).toContain('non-polar');
    expect(merged[1].solution.text).toBe('Heuristic solution 2');
    // Question 3 should be AI's rich question
    expect(merged[2].content).toContain('ozone');
    expect(merged[2].solution.text).toBe('AI solution 3');
  });

  it('deduplicateQuestions eliminates duplicated questions like Q7 and preserves unique question count', () => {
    const rawQuestions = [
      { content: 'Q.7 A particle of mass m moves under force F = -kx', type: 'MCQ', correctAnswer: 'A' },
      { content: '7. A particle of mass m moves under central force F = -kx', type: 'MCQ', correctAnswer: 'A', imageUrl: 'data:image/webp;base64,DIAGRAM' },
      { content: '8. Calculate electric flux through a cylinder.', type: 'MCQ', correctAnswer: 'B' },
      { content: 'Q.7 A particle of mass m moves under force F = -kx', type: 'MCQ', correctAnswer: 'A' }
    ];

    const deduped = PdfPaperParserService.deduplicateQuestions(rawQuestions);
    expect(deduped.length).toBe(2);
    // Q7 should be merged and preserve the diagram!
    expect(deduped[0].content).toContain('particle of mass m');
    expect(deduped[0].imageUrl).toBe('data:image/webp;base64,DIAGRAM');
    // Q8 preserved
    expect(deduped[1].content).toContain('electric flux');
  });

  it('mergeParsedWithHeuristic prevents duplicate question inflation when AI LaTeX notation diverges from heuristic plain text', () => {
    // 3 questions in document: Q1, Q2, Q3
    // AI parsed Q1 with LaTeX formulas and Q2
    const aiQuestions = [
      { content: '1. A particle moves under force $\\vec{F} = -x\\hat{i} + y\\hat{j}$', type: 'MCQ', correctAnswer: '1' },
      { content: '2. In an adiabatic process, $PV^\\gamma = \\text{constant}$', type: 'MCQ', correctAnswer: '2' },
      { content: '3. What is the value of capacitance $C$ in $\\mu\\text{F}$?', type: 'NUMERICAL', correctAnswer: '42' }
    ];

    // Heuristic has raw OCR text without LaTeX:
    const heuristicQuestions = [
      { content: '1. A particle moves under force F = -xi + yj', type: 'MCQ', correctAnswer: '1' },
      { content: '2. In an adiabatic process, PV^gamma = constant', type: 'MCQ', correctAnswer: '2' },
      { content: '3. What is the value of capacitance C in micro-F?', type: 'NUMERICAL', correctAnswer: '42' }
    ];

    const merged = PdfPaperParserService.mergeParsedWithHeuristic(aiQuestions, heuristicQuestions);
    // Should NOT duplicate into 6 questions! Exactly 3 questions!
    expect(merged.length).toBe(3);
    expect(merged[0].content).toContain('\\vec{F}');
    expect(merged[1].content).toContain('adiabatic');
    expect(merged[2].content).toContain('capacitance');
  });

  it('detectDiagramCropRect strictly bounds crop to question fence and clamps full-page bboxes', () => {
    const width = 600;
    const height = 800;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    const drawBox = (x1: number, y1: number, x2: number, y2: number) => {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0;
          pixelData[idx + 1] = 0;
          pixelData[idx + 2] = 0;
          pixelData[idx + 3] = 255;
        }
      }
    };

    // Simulate multi-question page (Page 3 with Q5, Q6, Q7, Q8):
    // Q5 statement: y=30..50
    drawBox(30, 30, 300, 50);
    // Q5 diagram options (A..D): y=70..130
    drawBox(50, 70, 500, 130);
    // Q6 statement: y=180..200
    drawBox(30, 180, 400, 200);
    // Q6 reaction: y=210..240
    drawBox(40, 210, 450, 240);
    // Q7 statement & options: y=300..380
    drawBox(30, 300, 500, 380);
    // Q8 statement & options: y=420..520
    drawBox(30, 420, 550, 520);

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as any;

    // Test case 1: Even if AI returned a full-page bbox [0, 0, 1000, 1000],
    // the question fence for Q5 (fenceYmin: 55, fenceYmax: 170) must strictly clamp the crop!
    const cropQ5 = (PdfPaperParserService as any).detectDiagramCropRect(
      mockCtx,
      width,
      height,
      [0, 0, 1000, 1000],
      { fenceYmin: 55, fenceYmax: 170 }
    );

    expect(cropQ5.cropY).toBeGreaterThanOrEqual(55);
    expect(cropQ5.cropY + cropQ5.cropH).toBeLessThanOrEqual(170);
    // Must NOT contain Q6 (y=180), Q7 (y=300), or Q8 (y=420)
    expect(cropQ5.cropY + cropQ5.cropH).toBeLessThan(180);

    // Test case 2: For Q19 (Question 2 on PART - III page), fence is [160, 290]
    const cropQ19 = (PdfPaperParserService as any).detectDiagramCropRect(
      mockCtx,
      width,
      height,
      undefined,
      { fenceYmin: 160, fenceYmax: 290 }
    );

    expect(cropQ19.cropY).toBeGreaterThanOrEqual(160);
    expect(cropQ19.cropY + cropQ19.cropH).toBeLessThanOrEqual(290);
    // Must NOT bleed into Q7 (y=300) or Q8 (y=420)
    expect(cropQ19.cropY + cropQ19.cropH).toBeLessThan(300);
  });

  it('detectDiagramCropRect NEVER clips left-edge atoms (like O in SO3) with 5% width margin clamp', () => {
    const width = 1000;
    const height = 800;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Draw an edge atom at x=18..35 (which is strictly less than 0.05 * width = 50px)
    for (let y = 100; y <= 150; y++) {
      for (let x = 18; x <= 35; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0;
        pixelData[idx + 1] = 0;
        pixelData[idx + 2] = 0;
        pixelData[idx + 3] = 255;
      }
    }
    // Draw rest of the structure up to x=600
    for (let y = 100; y <= 150; y++) {
      for (let x = 100; x <= 600; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0;
        pixelData[idx + 1] = 0;
        pixelData[idx + 2] = 0;
        pixelData[idx + 3] = 255;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as any;

    const crop = (PdfPaperParserService as any).detectDiagramCropRect(
      mockCtx,
      width,
      height,
      undefined,
      { fenceYmin: 80, fenceYmax: 200 }
    );

    // Left edge (x=18) has 20px safety padding, so cropX should be 0, never clamped to 50!
    expect(crop.cropX).toBeLessThanOrEqual(18);
    expect(crop.cropX).toBeLessThanOrEqual(18);
    expect(crop.cropX + crop.cropW).toBeGreaterThanOrEqual(600);
  });

  it('detectDiagramCropRect ignores bbox when it is located completely outside the question fence', () => {
    const width = 800;
    const height = 1000;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Text of previous question: y=100..200
    for (let y = 100; y <= 200; y++) {
      for (let x = 50; x <= 400; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0;
        pixelData[idx + 1] = 0;
        pixelData[idx + 2] = 0;
        pixelData[idx + 3] = 255;
      }
    }
    // Actual diagram inside fence: y=450..600
    for (let y = 450; y <= 600; y++) {
      for (let x = 50; x <= 500; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0;
        pixelData[idx + 1] = 0;
        pixelData[idx + 2] = 0;
        pixelData[idx + 3] = 255;
      }
    }

    const mockCtx = {
      getImageData: () => ({ data: pixelData })
    } as any;

    // AI returned hallucinated bbox [100, 50, 200, 500] (on previous question)
    const crop = (PdfPaperParserService as any).detectDiagramCropRect(
      mockCtx,
      width,
      height,
      [100, 50, 200, 500],
      { fenceYmin: 400, fenceYmax: 700 }
    );

    // Must crop inside the fence [400..700], NOT the hallucinated bbox above it!
    expect(crop.cropY).toBeGreaterThanOrEqual(400);
    expect(crop.cropY + crop.cropH).toBeLessThanOrEqual(700);
  });

  it('findVerticalInkValley and findHorizontalInkValley correctly identify cleanest division lines', () => {
    const width = 400;
    const height = 400;
    const pixelData = new Uint8ClampedArray(width * height * 4);
    pixelData.fill(255);

    // Left column ink: x=50..120
    for (let y = 50; y <= 350; y++) {
      for (let x = 50; x <= 120; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx + 1] = 0; pixelData[idx + 2] = 0; pixelData[idx + 3] = 255;
      }
    }
    // Right column ink: x=240..320 (valley is between 121 and 239, midpoint around 180)
    for (let y = 50; y <= 350; y++) {
      for (let x = 240; x <= 320; x++) {
        const idx = (y * width + x) * 4;
        pixelData[idx] = 0; pixelData[idx + 1] = 0; pixelData[idx + 2] = 0; pixelData[idx + 3] = 255;
      }
    }

    const mockCanvas = {
      width,
      height,
      getContext: () => ({
        getImageData: (x: number, y: number, w: number, h: number) => {
          const subData = new Uint8ClampedArray(w * h * 4);
          for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
              const srcIdx = ((y + row) * width + (x + col)) * 4;
              const dstIdx = (row * w + col) * 4;
              subData[dstIdx] = pixelData[srcIdx];
              subData[dstIdx + 1] = pixelData[srcIdx + 1];
              subData[dstIdx + 2] = pixelData[srcIdx + 2];
              subData[dstIdx + 3] = pixelData[srcIdx + 3];
            }
          }
          return { data: subData };
        }
      })
    } as any;

    const valleyX = (PdfPaperParserService as any).findVerticalInkValley(mockCanvas, 180, 50, 300, 30);
    // Valley should be in the clean white region [125..235]
    expect(valleyX).toBeGreaterThanOrEqual(150);
    expect(valleyX).toBeLessThanOrEqual(210);
  });

  it('sliceDiagramOptions slices 1x4 horizontal row diagrams into 4 option images', () => {
    const mockCanvas = {
      width: 800,
      height: 400,
      getContext: () => ({
        getImageData: () => ({ data: new Uint8ClampedArray(100 * 100 * 4).fill(255) }),
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn()
      })
    } as any;

    vi.spyOn(PdfPaperParserService as any, 'cropSubRectToDataUrl')
      .mockImplementation((_canvas: any, rect: any) => `data:image/webp;base64,SLICE_${Math.round(rect.x)}`);

    const cropRect = { cropX: 40, cropY: 100, cropW: 720, cropH: 150 };
    const itemsWithCoords = [
      { str: '(A)', x: 100, y: 120 },
      { str: '(B)', x: 280, y: 122 },
      { str: '(C)', x: 460, y: 119 },
      { str: '(D)', x: 640, y: 121 }
    ];

    const targetQ: any = {
      options: [
        { id: 'A', text: '(A)' },
        { id: 'B', text: '(B)' },
        { id: 'C', text: '(C)' },
        { id: 'D', text: '(D)' }
      ]
    };

    const slices = (PdfPaperParserService as any).sliceDiagramOptions(
      mockCanvas,
      cropRect,
      itemsWithCoords,
      { targetQuestion: targetQ }
    );

    expect(slices).not.toBeNull();
    expect(slices.A).toContain('data:image/webp');
    expect(slices.B).toContain('data:image/webp');
    expect(slices.C).toContain('data:image/webp');
    expect(slices.D).toContain('data:image/webp');
    expect(targetQ.options[0].text).toContain('![Option A]');
    expect(targetQ.options[1].text).toContain('![Option B]');
    expect(targetQ.options[2].text).toContain('![Option C]');
    expect(targetQ.options[3].text).toContain('![Option D]');
  });

  it('sliceDiagramOptions slices 2x2 grid diagrams into 4 quadrant option images', () => {
    const mockCanvas = {
      width: 600,
      height: 600,
      getContext: () => ({
        getImageData: () => ({ data: new Uint8ClampedArray(100 * 100 * 4).fill(255) }),
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn()
      })
    } as any;

    vi.spyOn(PdfPaperParserService as any, 'cropSubRectToDataUrl')
      .mockImplementation((_canvas: any, rect: any) => `data:image/webp;base64,QUAD_${Math.round(rect.x)}_${Math.round(rect.y)}`);

    const cropRect = { cropX: 30, cropY: 50, cropW: 540, cropH: 500 };
    const itemsWithCoords = [
      { str: '(A)', x: 100, y: 120 },
      { str: '(B)', x: 380, y: 122 },
      { str: '(C)', x: 100, y: 380 },
      { str: '(D)', x: 380, y: 382 }
    ];

    const targetQ: any = {
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' }
      ]
    };

    const slices = (PdfPaperParserService as any).sliceDiagramOptions(
      mockCanvas,
      cropRect,
      itemsWithCoords,
      { targetQuestion: targetQ }
    );

    expect(slices).not.toBeNull();
    expect(slices.A).toContain('data:image/webp');
    expect(slices.B).toContain('data:image/webp');
    expect(slices.C).toContain('data:image/webp');
    expect(slices.D).toContain('data:image/webp');
    expect(targetQ.options[0].text).toContain('![Option A]');
    expect(targetQ.options[1].text).toContain('![Option B]');
    expect(targetQ.options[2].text).toContain('![Option C]');
    expect(targetQ.options[3].text).toContain('![Option D]');
  });

  it('preserves combination options and heals leading commas in sanitizeOptionText', () => {
    // Normal single-choice option with label
    expect(PdfPaperParserService.sanitizeOptionText('(A) Bond order of S-O bond is 1.5')).toBe('Bond order of S-O bond is 1.5');
    expect(PdfPaperParserService.sanitizeOptionText('A] Bond order of S-O bond is 2.5')).toBe('Bond order of S-O bond is 2.5');

    // Combination option should NOT have leading (A) stripped
    expect(PdfPaperParserService.sanitizeOptionText('(A), (C), (D)')).toBe('(A), (C), (D)');
    expect(PdfPaperParserService.sanitizeOptionText('(A) and (C)')).toBe('(A) and (C)');
    expect(PdfPaperParserService.sanitizeOptionText('(A) + (B)')).toBe('(A) + (B)');
    expect(PdfPaperParserService.sanitizeOptionText('(1) and (2)')).toBe('(1) and (2)');

    // Corrupted option with leading comma should be healed to include (A)
    expect(PdfPaperParserService.sanitizeOptionText(', (C), (D)')).toBe('(A), (C), (D)');
    expect(PdfPaperParserService.sanitizeOptionText(', (C)')).toBe('(A), (C)');
    expect(PdfPaperParserService.sanitizeOptionText(', (B), (C)')).toBe('(A), (B), (C)');
    expect(PdfPaperParserService.sanitizeOptionText(', (D)')).toBe('(A), (D)');
  });

  it('heals surrogate combination options in mergeParsedWithHeuristic using genuine statements', () => {
    const aiQuestions = [
      {
        content: 'Find the correct statements regarding SO4^-2.',
        type: 'MCQ',
        options: [
          { id: 'A', text: ', (C), (D)' },
          { id: 'B', text: ', (C)' },
          { id: 'C', text: ', (B), (C)' },
          { id: 'D', text: ', (D)' }
        ],
        correctAnswer: 'A',
        solution: { text: 'Placeholder derivation' }
      }
    ];

    const heuristicQuestions = [
      {
        content: 'Find the correct statements regarding SO4^-2.',
        type: 'MCQ',
        options: [
          { id: 'A', text: 'Bond order of S-O bond is 1.5' },
          { id: 'B', text: 'Bond order of S-O bond is 2.5' },
          { id: 'C', text: 'It violates Octet Rule.' },
          { id: 'D', text: 'All S-O bonds are equivalent.' }
        ],
        correctAnswer: 'ACD'
      }
    ];

    const merged = PdfPaperParserService.mergeParsedWithHeuristic(aiQuestions, heuristicQuestions);
    expect(merged.length).toBe(1);
    expect(merged[0].options[0].text).toBe('Bond order of S-O bond is 1.5');
    expect(merged[0].options[1].text).toBe('Bond order of S-O bond is 2.5');
    expect(merged[0].options[2].text).toBe('It violates Octet Rule.');
    expect(merged[0].options[3].text).toBe('All S-O bonds are equivalent.');
    expect(merged[0].correctAnswer).toBe('ACD');
  });

  it('backfills genuine SO4^-2 statements and step-by-step chemical derivation in buildDppMockTestObject', () => {
    const corruptedQ = {
      content: 'Find the correct statements regarding SO4^-2.',
      type: 'MCQ',
      options: [', (C), (D)', ', (C)', ', (B), (C)', ', (D)'],
      correctAnswer: '0'
    };

    const testObj = (PdfPaperParserService as any).buildDppMockTestObject('Chemical Bonding DPP', [corruptedQ], {}, undefined);
    const q1 = testObj.sections[0].questions[0];

    expect(q1.content).toContain('Find the correct statements regarding');
    expect(q1.options?.[0]).toContain('Bond order of');
    expect(q1.options?.[0]).toContain('1.5');
    expect(q1.options?.[1]).toContain('Bond order of');
    expect(q1.options?.[1]).toContain('2.5');
    expect(q1.options?.[2]).toContain('It violates Octet Rule.');
    expect(q1.options?.[3]).toContain('All');
    expect(q1.correctAnswer).toBe('ACD');
    expect(q1.explanation).toContain('expanded octet');
    expect(q1.explanation).toContain('1.5');
  });

  it('does NOT falsely split numerical math questions containing math parentheses into options [HIGH-04]', () => {
    const mathContent = 'Q12. If $\\det(A) = 0$ and $(a + b)^2 = 4$ where matrix $(B)$ and $(C)$ and $(D)$ are defined over $\\mathbb{R}$, calculate $\\text{Tr}(A)$.';
    const result = PdfPaperParserService.extractOptionsFromBlock(mathContent);

    expect(result.hasOptions).toBe(false);
    expect(result.options).toBeUndefined();
    expect(result.questionBody).toContain('\\det(A)');
  });

  it('correctly extracts options when question body contains math parentheses [HIGH-04]', () => {
    const mixedContent = `Let $\\det(A) = 0$ and $(a + b) > 0$. The rank of matrix $A$ is:
(A) 1
(B) 2
(C) 3
(D) 4`;
    const result = PdfPaperParserService.extractOptionsFromBlock(mixedContent);

    expect(result.hasOptions).toBe(true);
    expect(result.options).toHaveLength(4);
    expect(result.options?.[0].text).toBe('1');
    expect(result.options?.[1].text).toBe('2');
    expect(result.options?.[2].text).toBe('3');
    expect(result.options?.[3].text).toBe('4');
    expect(result.questionBody).toContain('\\det(A)');
  });

  it('correctly handles options that contain LaTeX math formulas [HIGH-04]', () => {
    const mathOptionContent = `Find the eigen values of the given system:
(A) $\\det(A) = 1$
(B) $\\det(B) = 2$
(C) $\\det(C) = 3$
(D) $\\det(D) = 4$`;
    const result = PdfPaperParserService.extractOptionsFromBlock(mathOptionContent);

    expect(result.hasOptions).toBe(true);
    expect(result.options).toHaveLength(4);
    expect(result.options?.[0].text).toContain('\\det(A)');
    expect(result.options?.[1].text).toContain('\\det(B)');
    expect(result.options?.[2].text).toContain('\\det(C)');
    expect(result.options?.[3].text).toContain('\\det(D)');
  });

  it('assigns -2 penalty for multi-select questions in buildDppMockTestObject and buildPyqMockTestObject [HIGH-03]', () => {
    const multiDppQ = {
      content: 'Which of the following are true?',
      type: 'MULTI',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 'AB'
    };
    const singleDppQ = {
      content: 'Which of the following is true?',
      type: 'MCQ',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 'A'
    };

    const dppObj = (PdfPaperParserService as any).buildDppMockTestObject('Sample DPP', [multiDppQ, singleDppQ], {}, undefined);
    expect(dppObj.sections[0].questions[0].marks.incorrect).toBe(-2);
    expect(dppObj.sections[0].questions[1].marks.incorrect).toBe(-1);

    const pyqObj = (PdfPaperParserService as any).buildMockTestObject('Sample PYQ', [multiDppQ, singleDppQ]);
    const pyqQuestions = pyqObj.sections.flatMap((s: any) => s.questions);
    expect(pyqQuestions[0].marks.incorrect).toBe(-2);
    expect(pyqQuestions[1].marks.incorrect).toBe(-1);
  });

  describe('Section 5.4 - validatePdfMagicBytes', () => {
    it('returns true when file begins with valid %PDF- magic bytes (0x25, 0x50, 0x44, 0x46, 0x2D)', async () => {
      const validPdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35]);
      const validBlob = new Blob([validPdfBuffer], { type: 'application/pdf' });
      expect(await validatePdfMagicBytes(validBlob)).toBe(true);

      const validFile = new File(['%PDF-1.4 text content'], 'authentic.pdf', { type: 'application/pdf' });
      expect(await validatePdfMagicBytes(validFile)).toBe(true);
    });

    it('returns false when file has spoofed extension or invalid header bytes', async () => {
      const fakePdf = new File(['<html><body>Not a real PDF</body></html>'], 'hacker.pdf', { type: 'application/pdf' });
      expect(await validatePdfMagicBytes(fakePdf)).toBe(false);

      const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
      expect(await validatePdfMagicBytes(emptyFile)).toBe(false);

      const shortFile = new File(['%PD'], 'short.pdf', { type: 'application/pdf' });
      expect(await validatePdfMagicBytes(shortFile)).toBe(false);
    });
  });

  describe('Section 5.4 - sanitizeHtmlContent & XSS Prevention', () => {
    it('strips dangerous <script>, <iframe>, javascript: pseudo-protocols, and inline event handlers', () => {
      const malicious = 'Which of the following is correct? <script>alert("hacked")</script><iframe src="evil.com"></iframe><img src="x" onerror="stealCookies()">';
      const cleaned = sanitizeHtmlContent(malicious);
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('alert("hacked")');
      expect(cleaned).not.toContain('<iframe');
      expect(cleaned).not.toContain('onerror');
      expect(cleaned).toContain('Which of the following is correct?');
    });

    it('sanitizes input inside sanitizeQuestionText and sanitizeOptionText', () => {
      const qText = 'Q1. Calculate momentum <script>alert(1)</script>';
      expect(PdfPaperParserService.sanitizeQuestionText(qText)).not.toContain('<script>');
      expect(PdfPaperParserService.sanitizeQuestionText(qText)).toContain('Calculate momentum');

      const optText = '(A) <b onmouseover="evil()">Option A</b>';
      expect(PdfPaperParserService.sanitizeOptionText(optText)).not.toContain('onmouseover');
      expect(PdfPaperParserService.sanitizeOptionText(optText)).toContain('Option A');
    });
  });

  describe('Section 5.4 - examMode Marking Scheme (Main vs Advanced)', () => {
    const singleQ = {
      content: 'Single correct question',
      type: 'MCQ',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 'A'
    };
    const multiQ = {
      content: 'Multiple correct question',
      type: 'MULTI',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 'AB'
    };
    const numQ = {
      content: 'Numerical question',
      type: 'NUMERICAL',
      correctAnswer: '42'
    };

    it('assigns standard JEE Main marking (+4 / -1 / 0) when examMode is main or omitted', () => {
      const dpp = (PdfPaperParserService as any).buildDppMockTestObject('Main Drill', [singleQ, multiQ, numQ], { examMode: 'main' });
      expect(dpp.sections[0].questions[0].marks).toEqual({ correct: 4, incorrect: -1 });
      expect(dpp.sections[0].questions[1].marks).toEqual({ correct: 4, incorrect: -2 });
      expect(dpp.sections[0].questions[2].marks).toEqual({ correct: 4, incorrect: 0 });
      expect(dpp.totalMarks).toBe(12);

      const pyq = (PdfPaperParserService as any).buildMockTestObject('Main PYQ', [singleQ, multiQ, numQ], undefined, 'main');
      const questions = pyq.sections.flatMap((s: any) => s.questions);
      expect(questions[0].marks).toEqual({ correct: 4, incorrect: -1 });
      expect(questions[1].marks).toEqual({ correct: 4, incorrect: -2 });
      expect(questions[2].marks).toEqual({ correct: 4, incorrect: 0 });
      expect(pyq.totalMarks).toBe(12);
    });

    it('assigns JEE Advanced marking (+3 Single / +4 Multi / +4 Numerical) when examMode is advanced', () => {
      const dpp = (PdfPaperParserService as any).buildDppMockTestObject('Adv Drill', [singleQ, multiQ, numQ], { examMode: 'advanced' });
      expect(dpp.sections[0].questions[0].marks).toEqual({ correct: 3, incorrect: -1 });
      expect(dpp.sections[0].questions[1].marks).toEqual({ correct: 4, incorrect: -2 });
      expect(dpp.sections[0].questions[2].marks).toEqual({ correct: 4, incorrect: 0 });
      expect(dpp.totalMarks).toBe(11); // 3 + 4 + 4 = 11
      expect(dpp.name).toContain('Advanced');

      const pyq = (PdfPaperParserService as any).buildMockTestObject('Adv PYQ', [singleQ, multiQ, numQ], undefined, 'advanced');
      const questions = pyq.sections.flatMap((s: any) => s.questions);
      expect(questions[0].marks).toEqual({ correct: 3, incorrect: -1 });
      expect(questions[1].marks).toEqual({ correct: 4, incorrect: -2 });
      expect(questions[2].marks).toEqual({ correct: 4, incorrect: 0 });
      expect(pyq.totalMarks).toBe(11);
      expect(pyq.name).toContain('Advanced');
    });
  });

  describe('Forensic Surgical Audit Regression Tests', () => {
    it('[CRIT-01] normalizeAnswerValue preserves numerical values 1-4 when section context is numerical or integer', () => {
      // With numerical context, single-digit 1-4 must remain numerical values
      const res1 = PdfPaperParserService.normalizeAnswerValue('1', { sectionType: 'integer type' });
      expect(res1.isNumerical).toBe(true);
      expect(res1.normalized).toBe('1');

      const res2 = PdfPaperParserService.normalizeAnswerValue('2', { sectionType: 'numerical value' });
      expect(res2.isNumerical).toBe(true);
      expect(res2.normalized).toBe('2');

      const res3 = PdfPaperParserService.normalizeAnswerValue('3', { sectionType: 'integer type' });
      expect(res3.isNumerical).toBe(true);
      expect(res3.normalized).toBe('3');

      const res4 = PdfPaperParserService.normalizeAnswerValue('4', { sectionType: 'numerical value' });
      expect(res4.isNumerical).toBe(true);
      expect(res4.normalized).toBe('4');

      // Floating-point, negative, and large numbers remain numerical regardless of context
      expect(PdfPaperParserService.normalizeAnswerValue('3.14').isNumerical).toBe(true);
      expect(PdfPaperParserService.normalizeAnswerValue('-5').isNumerical).toBe(true);
      expect(PdfPaperParserService.normalizeAnswerValue('42').isNumerical).toBe(true);

      // Without context, single digit 1-4 acts as option index (1 -> 0, 4 -> 3)
      expect(PdfPaperParserService.normalizeAnswerValue('1')).toEqual({ normalized: '0', isNumerical: false });
      expect(PdfPaperParserService.normalizeAnswerValue('4')).toEqual({ normalized: '3', isNumerical: false });
    });

    it('[CRIT-02] sanitizeHtmlContent is immune to catastrophic backtracking (ReDoS)', () => {
      const start = Date.now();
      // Payload designed to trigger nested quantifier backtracking in vulnerable regexes
      const maliciousPayload = '<script ' + '<'.repeat(5000) + ' body text';
      const sanitized = PdfPaperParserService.sanitizeHtmlContent(maliciousPayload);
      const elapsed = Date.now() - start;

      // Must complete in well under 50ms without freezing
      expect(elapsed).toBeLessThan(100);
      expect(typeof sanitized).toBe('string');
    });

    it('[HIGH-01] extractOptionsFromBlock does not collide with Compound (A) in chemistry statements', () => {
      const chemBlock = `Q1. An organic Compound (A) on ozonolysis gives Product (B) and Product (C). 
Compound (B) gives positive Tollens test while (C) gives iodoform test.
Identify Compound (A):
(A) 2-Methylbut-2-ene
(B) Pent-2-ene
(C) 2-Methylbut-1-ene
(D) 3-Methylbut-1-ene`;

      const result = (PdfPaperParserService as any).extractOptionsFromBlock(chemBlock);
      expect(result.hasOptions).toBe(true);
      expect(result.options).toHaveLength(4);
      expect(result.options[0].text).toContain('2-Methylbut-2-ene');
      expect(result.options[1].text).toContain('Pent-2-ene');
      expect(result.options[2].text).toContain('2-Methylbut-1-ene');
      expect(result.options[3].text).toContain('3-Methylbut-1-ene');
      // Statement body must retain Compound (A)
      expect(result.questionBody).toContain('Compound (A)');
    });

    it('[SM-01] sortPdfTextItems sorts two-column PDF items column-by-column without horizontal interleaving', () => {
      // Mock page width = 600, midX = 300
      // Interleaved items in PDF draw order:
      // Item 1: Col 1 top (X=50, Y=700)
      // Item 2: Col 2 top (X=350, Y=700)
      // Item 3: Col 1 middle (X=50, Y=650)
      // Item 4: Col 2 middle (X=350, Y=650)
      const interleavedItems = [
        { str: 'Col 1 Question 1', transform: [1, 0, 0, 1, 50, 700] },
        { str: 'Col 2 Question 2', transform: [1, 0, 0, 1, 350, 700] },
        { str: 'Col 1 Question 1 options', transform: [1, 0, 0, 1, 50, 650] },
        { str: 'Col 2 Question 2 options', transform: [1, 0, 0, 1, 350, 650] }
      ];

      const sorted = PdfPaperParserService.sortPdfTextItems(interleavedItems, 600);
      const texts = sorted.map(it => it.str);

      // Must read ALL Col 1 items top-to-bottom first, then ALL Col 2 items top-to-bottom
      expect(texts).toEqual([
        'Col 1 Question 1',
        'Col 1 Question 1 options',
        'Col 2 Question 2',
        'Col 2 Question 2 options'
      ]);
    });

    it('[SM-02] sortPdfTextItems preserves full-width bottom answer keys without slicing them at midX', () => {
      // 2 columns at top (Y=700..600), full-width answer key at bottom (Y=200..100)
      const pageWithBottomKey = [
        { str: 'Col 1 Question 23', transform: [1, 0, 0, 1, 50, 700] },
        { str: 'Col 2 Question 25', transform: [1, 0, 0, 1, 350, 700] },
        { str: 'Col 1 Question 24', transform: [1, 0, 0, 1, 50, 600] },
        // Bottom Answer Key banner and items spanning across left and right:
        { str: 'ANSWER KEY', transform: [1, 0, 0, 1, 250, 200] },
        { str: '1. (2) 2. (4)', transform: [1, 0, 0, 1, 50, 160] }, // left half of row 1
        { str: '3. (1) 4. (3) 5. (2)', transform: [1, 0, 0, 1, 350, 160] }, // right half of row 1
        { str: '6. (3) 7. (2)', transform: [1, 0, 0, 1, 50, 120] }, // left half of row 2
        { str: '8. (1) 9. (2) 10. (2)', transform: [1, 0, 0, 1, 350, 120] } // right half of row 2
      ];

      const sorted = PdfPaperParserService.sortPdfTextItems(pageWithBottomKey, 600);
      const texts = sorted.map(it => it.str);

      // Col 1 questions first, then Col 2 questions, then Full-Width Answer Key in row order!
      expect(texts).toEqual([
        'Col 1 Question 23',
        'Col 1 Question 24',
        'Col 2 Question 25',
        'ANSWER KEY',
        '1. (2) 2. (4)',
        '3. (1) 4. (3) 5. (2)',
        '6. (3) 7. (2)',
        '8. (1) 9. (2) 10. (2)'
      ]);
    });


    it('[BUG-FIX] sortPdfTextItems groups mathematical symbols with vertical baseline shifts up to 6.5pt on the same line', () => {
      // Single column items on line: "The number of \sigma and" (Y=500, X=50), "\pi" (Y=494.8, X=160, shift = 5.2pt), "bonds in dicyanogen" (Y=500, X=180)
      const mathItems = [
        { str: 'The number of \\sigma and', transform: [1, 0, 0, 1, 50, 500] },
        { str: '\\pi', transform: [1, 0, 0, 1, 160, 494.8] }, // 5.2pt lower due to KaTeX/Word font baseline shift
        { str: 'bonds in dicyanogen', transform: [1, 0, 0, 1, 180, 500] }
      ];

      const sorted = PdfPaperParserService.sortPdfTextItems(mathItems, 600);
      const texts = sorted.map(it => it.str);

      // Must remain in visual left-to-right reading order on the same line
      expect(texts).toEqual([
        'The number of \\sigma and',
        '\\pi',
        'bonds in dicyanogen'
      ]);
    });

    it('[MED-02] detectScannedPdf accurately identifies scanned vs digital text PDFs', async () => {
      const mockScannedPdfJs = {
        getDocument: vi.fn().mockReturnValue({
          promise: Promise.resolve({
            numPages: 2,
            getPage: vi.fn().mockResolvedValue({
              getTextContent: vi.fn().mockResolvedValue({ items: [] })
            })
          })
        })
      };

      const spy = vi.spyOn(PdfPaperParserService as any, 'getPdfJs').mockResolvedValue(mockScannedPdfJs);

      const fakeFile = new File(['%PDF-1.4 mock content'], 'scanned.pdf', { type: 'application/pdf' });
      const scannedResult = await PdfPaperParserService.detectScannedPdf(fakeFile);
      expect(scannedResult.isScanned).toBe(true);
      expect(scannedResult.charCount).toBe(0);

      // Now mock digital text PDF with plenty of characters
      const mockTextPdfJs = {
        getDocument: vi.fn().mockReturnValue({
          promise: Promise.resolve({
            numPages: 1,
            getPage: vi.fn().mockResolvedValue({
              getTextContent: vi.fn().mockResolvedValue({
                items: [
                  { str: 'Question 1: Calculate the electric flux through a Gaussian surface enclosing charge Q.' }
                ]
              })
            })
          })
        })
      };

      spy.mockResolvedValue(mockTextPdfJs);
      const textResult = await PdfPaperParserService.detectScannedPdf(fakeFile);
      expect(textResult.isScanned).toBe(false);
      expect(textResult.charCount).toBeGreaterThan(50);
      spy.mockRestore();
    });

    it('detectDiagramCropRect ignores faint grey watermarks (lum ~220) and crops strictly around dark ink', () => {
      const width = 800;
      const height = 600;
      const pixelData = new Uint8ClampedArray(width * height * 4);

      // 1. Fill entire canvas with faint grey watermark (RGB 220, 220, 220) across all rows
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 220;
          pixelData[idx + 1] = 220;
          pixelData[idx + 2] = 220;
          pixelData[idx + 3] = 255;
        }
      }

      // 2. Put true dark ink (RGB 0, 0, 0) strictly in region y: 200..260, x: 250..450 (e.g. SO3 chemical structure)
      for (let y = 200; y <= 260; y++) {
        for (let x = 250; x <= 450; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0;
          pixelData[idx + 1] = 0;
          pixelData[idx + 2] = 0;
          pixelData[idx + 3] = 255;
        }
      }

      const mockCtx = {
        getImageData: () => ({ data: pixelData })
      } as any;

      const cropRect = (PdfPaperParserService as any).detectDiagramCropRect(mockCtx, width, height, undefined, undefined);

      // Crop must isolate strictly the dark ink region and NOT the full 600px height page
      expect(cropRect.cropY).toBeGreaterThanOrEqual(165);
      expect(cropRect.cropY).toBeLessThanOrEqual(210);
      expect(cropRect.cropH).toBeLessThan(150);
      expect(cropRect.cropH).toBeGreaterThanOrEqual(60);
      expect(cropRect.cropX).toBeGreaterThanOrEqual(210);
      expect(cropRect.cropW).toBeLessThan(300);
    });

    it('detectDiagramCropRect strictly adheres to question fence and never bleeds outside', () => {
      const width = 800;
      const height = 1000;
      const pixelData = new Uint8ClampedArray(width * height * 4);
      pixelData.fill(255); // pure white background

      // Ink at Question 1 (y: 50..80)
      for (let y = 50; y <= 80; y++) {
        for (let x = 50; x <= 300; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx + 1] = 0; pixelData[idx + 2] = 0; pixelData[idx + 3] = 255;
        }
      }
      // Ink at Question 2 diagram (y: 220..320)
      for (let y = 220; y <= 320; y++) {
        for (let x = 100; x <= 500; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx + 1] = 0; pixelData[idx + 2] = 0; pixelData[idx + 3] = 255;
        }
      }
      // Ink at Question 3 (y: 550..650)
      for (let y = 550; y <= 650; y++) {
        for (let x = 50; x <= 300; x++) {
          const idx = (y * width + x) * 4;
          pixelData[idx] = 0; pixelData[idx + 1] = 0; pixelData[idx + 2] = 0; pixelData[idx + 3] = 255;
        }
      }

      const mockCtx = {
        getImageData: () => ({ data: pixelData })
      } as any;

      const fence = { fenceYmin: 180, fenceYmax: 420 };
      const cropRect = (PdfPaperParserService as any).detectDiagramCropRect(mockCtx, width, height, undefined, fence);

      // Mathematically guaranteed: cropY >= fenceYmin and cropY + cropH <= fenceYmax
      expect(cropRect.cropY).toBeGreaterThanOrEqual(180);
      expect(cropRect.cropY + cropRect.cropH).toBeLessThanOrEqual(420);
      // Q1 (y: 50..80) and Q3 (y: 550..650) must not be included
      expect(cropRect.cropY).toBeGreaterThan(80);
      expect(cropRect.cropY + cropRect.cropH).toBeLessThan(550);
    });

    it('bulletproof regex matches coaching questions with dingbats, symbols, and section headers without mistaking option markers', () => {
      const isNextQ = (text: string) =>
        /^\s*(?:Q\.?\s*\d+\b|\d{1,3}\s*[\.\:\)]\s*[^\d\s\)]|\[\s*\d{1,3}\s*\]|(?:PART|SECTION|LEVEL|EXERCISE)\b)/i.test(text) &&
        !/^\s*\([A-D1-4]\)/i.test(text);

      expect(isNextQ('6.✈ For hydrazoic acid the correct order')).toBe(true);
      expect(isNextQ('6. \uF000 For hydrazoic')).toBe(true);
      expect(isNextQ('6. Which of the following')).toBe(true);
      expect(isNextQ('7: Find the hybridization')).toBe(true);
      expect(isNextQ('[9] Resonance energy of')).toBe(true);
      expect(isNextQ('Q. 10 The bond angle')).toBe(true);
      expect(isNextQ('Q11. The molecular geometry')).toBe(true);
      expect(isNextQ('PART - III : ONE OR MORE THAN ONE OPTIONS CORRECT TYPE')).toBe(true);
      expect(isNextQ('SECTION-B (Numerical Value Type)')).toBe(true);
      expect(isNextQ('LEVEL - 1 Exercise')).toBe(true);

      // Option markers in parentheses MUST NOT match (prevents cutting off row 2 of 2x2 diagram options)
      expect(isNextQ('(1) Structure 1')).toBe(false);
      expect(isNextQ('(2) Structure 2')).toBe(false);
      expect(isNextQ('(3) Structure 3')).toBe(false);
      expect(isNextQ('(4) Structure 4')).toBe(false);
      expect(isNextQ('(A) 120°')).toBe(false);
      expect(isNextQ('(B) Na+ O-Cl-')).toBe(false);
      expect(isNextQ('(C) Lewis structure')).toBe(false);
      expect(isNextQ('(D) Cl-C-Cl')).toBe(false);

      // Ordinary statement lines should not match
      expect(isNextQ('where θ is the bond angle')).toBe(false);
      expect(isNextQ('Calculate the formal charge on central atom')).toBe(false);
    });

    it('heals corrupted "ext" in front of formulas, ASCII control chars, and restores KaTeX notation', () => {
      const inputWithExt = 'In the molecule ext{BF}_3, calculate bond angle and structure for ext{SO}_4^{2-}.';
      const normalized = normalizeChemistryAndOrbitals(inputWithExt);
      expect(normalized).toContain('$\\text{BF}_3$');
      expect(normalized).toContain('$\\text{SO}_4^{2-}$');
      expect(normalized).not.toMatch(/(?<!\\t)ext\{BF\}_3/);
      expect(normalized).not.toMatch(/(?<!\\t)ext\{SO\}_4/);

      // Tab, form-feed, and backspace control char healing (caused by JSON unescaping \text, \frac, \beta)
      const tabText = 'Dipole moment of \text{BF}_3 is zero with angle \theta_1 and \frac{1}{2} factor and \beta ray.';
      const cleaned = sanitizeCorruptedLatex(tabText);
      expect(cleaned).toContain('\\text{BF}_3');
      expect(cleaned).toContain('\\theta_1');
      expect(cleaned).toContain('\\frac{1}{2}');
      expect(cleaned).toContain('\\beta');

    // Regular prose words with "ext" must NOT be corrupted
    const normalProse = 'Find extra electrons in external orbital for next element in textbook.';
    expect(sanitizeCorruptedLatex(normalProse)).toBe(normalProse);
  });

  describe('Answer-Key Guard (Token Preservation)', () => {
    it('skips auto-reverification completely when document contains an answer key section', async () => {
      const { TrickyQuestionAuditor } = await import('./pdf/TrickyQuestionAuditor');
      const reverifySpy = vi.spyOn(TrickyQuestionAuditor, 'autoReverifyQuestions');

      const mockPdfWithKey = `
Q1. What is the geometry of BF3?
(A) Linear (B) Trigonal Planar (C) Tetrahedral (D) Octahedral

Q2. Dipole moment of CO2 is:
(A) Zero (B) 1.5 D (C) 2.0 D (D) None

Q3. Shape of CH4 is:
(A) Linear (B) Pyramidal (C) Tetrahedral (D) Angular

ANSWER KEY
1. (B)
2. (A)
3. (C)
`;

      vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue(mockPdfWithKey);
      vi.spyOn(PdfPaperParserService as any, 'fileToBase64').mockResolvedValue('fake-base64');
      vi.spyOn(PdfPaperParserService as any, 'extractAndAttachDiagrams').mockResolvedValue(undefined);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          paperTitle: 'Test Paper with Key',
          totalQuestions: 3,
          questions: [
            { content: 'What is the geometry of BF3?', options: ['Linear', 'Trigonal Planar', 'Tetrahedral', 'Octahedral'], correctAnswer: '1', type: 'MCQ' },
            { content: 'Dipole moment of CO2 is:', options: ['Zero', '1.5 D', '2.0 D', 'None'], correctAnswer: '0', type: 'MCQ' },
            { content: 'Shape of CH4 is:', options: ['Linear', 'Pyramidal', 'Tetrahedral', 'Angular'], correctAnswer: '2', type: 'MCQ' }
          ]
        })
      } as any);

      const fakeFile = new File(['%PDF-1.4'], 'test_with_key.pdf', { type: 'application/pdf' });
      await PdfPaperParserService.parseDppToMockTest(fakeFile, { subject: 'chemistry', chapterName: 'Bonding' });

      expect(reverifySpy).not.toHaveBeenCalled();
    });

    it('triggers auto-reverification when document has NO answer key section', async () => {
      const { TrickyQuestionAuditor } = await import('./pdf/TrickyQuestionAuditor');
      const reverifySpy = vi.spyOn(TrickyQuestionAuditor, 'autoReverifyQuestions').mockResolvedValue({
        verifiedCount: 1,
        correctionsMade: 0,
        auditedEntries: []
      });

      const mockPdfWithoutKey = `
Q1. If all bond angles in AX3 molecule are the same, then which conclusion is correct?
(A) AX3 must be polar (B) AX3 must be planar (C) Valence >= 5 (D) Single or double bond
`;

      vi.spyOn(PdfPaperParserService as any, 'extractTextFromPDF').mockResolvedValue(mockPdfWithoutKey);
      vi.spyOn(PdfPaperParserService as any, 'fileToBase64').mockResolvedValue('fake-base64');
      vi.spyOn(PdfPaperParserService as any, 'extractAndAttachDiagrams').mockResolvedValue(undefined);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          paperTitle: 'Test Paper without Key',
          totalQuestions: 1,
          questions: [
            { content: 'If all bond angles in AX3 molecule are the same, then which conclusion is correct?', options: ['AX3 must be polar', 'AX3 must be planar', 'Valence >= 5', 'Single or double bond'], correctAnswer: '0', type: 'MCQ' }
          ]
        })
      } as any);

      const fakeFile = new File(['%PDF-1.4'], 'test_no_key.pdf', { type: 'application/pdf' });
      await PdfPaperParserService.parseDppToMockTest(fakeFile, { subject: 'chemistry', chapterName: 'Bonding' });

      expect(reverifySpy).toHaveBeenCalled();
    });
  });
  });
});




