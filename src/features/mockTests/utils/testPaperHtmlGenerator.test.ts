import { describe, it, expect } from 'vitest';
import {
  generateTestPaperHtml,
  renderRichTextToPrintHtml,
  stripTrailingOptionsFromContent,
  getQuestionImageUrl,
  healQuestionContentAndOptions
} from './testPaperHtmlGenerator';
import { MathNotationHealer } from '../services/pdf/MathNotationHealer';
import { MockTest, MockQuestion } from '@/types/mockTest';

describe('testPaperHtmlGenerator', () => {
  it('renders pure KaTeX HTML without MathML to prevent duplicate text output', () => {
    const html = renderRichTextToPrintHtml('In $\\text{NO}_3^-$ ion and $2, 2$');
    // Must contain KaTeX HTML
    expect(html).toContain('class="katex"');
    expect(html).toContain('class="katex-html"');
    // Must NOT contain MathML
    expect(html).not.toContain('katex-mathml');
    expect(html).not.toContain('<math');
  });

  it('strips trailing option blocks from question content when options are provided', () => {
    const content = `Find the correct statements regarding SO4-2.\n(A) Bond order is 1.5\n(B) Bond order is 2.5\n(C) It violates Octet Rule.\n(D) All bonds are equivalent.`;
    const options = ['Bond order is 1.5', 'Bond order is 2.5', 'It violates Octet Rule.', 'All bonds are equivalent.'];

    const cleaned = stripTrailingOptionsFromContent(content, options);
    expect(cleaned).toBe('Find the correct statements regarding SO4-2.');
    expect(cleaned).not.toContain('(A)');
  });

  it('generates a complete valid A4 HTML document with sections, answers, and solutions', () => {
    const mockTest: MockTest = {
      id: 'test_chem_1',
      name: 'ChemicalbondingDPP 01 [Coaching DPP]',
      durationMinutes: 60,
      totalMarks: 8,
      sections: [
        {
          subject: 'chemistry',
          questions: [
            {
              id: 'q1',
              subject: 'chemistry',
              type: 'MCQ',
              chapter: 'Chemical Bonding',
              topic: 'Lewis Structures',
              difficulty: 'Medium',
              content: 'In $\\text{NO}_3^-$ ion, the number of bond pairs is:',
              options: ['2', '3', '4', '1'],
              correctAnswer: 'C',
              marks: { correct: 4, incorrect: -1 },
              explanation: '**Key Concept & Formula**\nLewis structure.\n**Step 1**\nForms 4 bonds.\n**Conclusion & Correct Option**\nHence option C.'
            },
            {
              id: 'q2',
              subject: 'chemistry',
              type: 'NUMERICAL',
              chapter: 'Chemical Bonding',
              topic: 'Lewis Structures',
              difficulty: 'Medium',
              content: 'In $\\text{OF}_2$ number of bond pairs are:',
              correctAnswer: '2',
              marks: { correct: 4, incorrect: 0 },
              explanation: 'Oxygen forms 2 bonds.'
            }
          ]
        }
      ]
    };

    const fullHtml = generateTestPaperHtml(mockTest, {
      printMode: 'COMPLETE',
      fontSize: 'sm',
      showInstructions: true,
      showRoughWorkMargin: true
    });

    expect(fullHtml).toContain('<!DOCTYPE html>');
    expect(fullHtml).toContain('NATIONAL TESTING AGENCY (NTA)');
    expect(fullHtml).toContain('ChemicalbondingDPP 01 [Coaching DPP]');
    expect(fullHtml).toContain('SECTION 1: CHEMISTRY');
    expect(fullHtml).toContain('PART A: MULTIPLE CHOICE QUESTIONS');
    expect(fullHtml).toContain('PART B: NUMERICAL VALUE QUESTIONS');
    expect(fullHtml).toContain('DETACHABLE QUICK ANSWER KEY');
    expect(fullHtml).toContain('CONFIDENTIAL OFFICIAL MARKING SCHEME');
    expect(fullHtml).not.toContain('<span class="katex-mathml">');
    expect(fullHtml).not.toContain('<math');
  });

  it('generates an authentic 2-column coaching practice sheet when COACHING_SHEET layout is requested or test is a DPP', () => {
    const dppTest: MockTest = {
      id: 'dpp_p11',
      name: 'Physics DPP - Work, Energy & Power [Coaching DPP]',
      durationMinutes: 45,
      totalMarks: 204,
      source: 'dpp',
      chapterName: 'Work, Energy & Power',
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              subject: 'physics',
              topic: 'Work',
              difficulty: 'Medium',
              type: 'MCQ',
              chapter: 'Work, Energy & Power',
              content: 'A force $\\vec{F} = 2\\hat{i} + b\\hat{j} + \\hat{k}$ is applied on a particle...',
              options: ['1/2', '1/3', '0', '2'],
              correctAnswer: 'A',
              marks: { correct: 4, incorrect: -1 }
            },
            {
              id: 'q2',
              subject: 'physics',
              topic: 'Energy',
              difficulty: 'Medium',
              type: 'NUMERICAL',
              chapter: 'Work, Energy & Power',
              content: 'A force $(3x^2 + 2x - 5)\\text{ N}$ displaces a body from $x = 2\\text{m}$ to $x = 4\\text{m}$. Work done is:',
              correctAnswer: '58',
              marks: { correct: 4, incorrect: 0 }
            }
          ]
        }
      ]
    };

    const coachingHtml = generateTestPaperHtml(dppTest, {
      layoutStyle: 'COACHING_SHEET',
      printMode: 'QUESTION_PAPER'
    });

    expect(coachingHtml).toContain('<!DOCTYPE html>');
    expect(coachingHtml).toContain('PRACTICE SHEET');
    expect(coachingHtml).toContain('coaching-columns');
    expect(coachingHtml).toContain('SINGLE CORRECT QUESTIONS');
    expect(coachingHtml).toContain('NUMERICAL TYPE QUESTIONS');
    expect(coachingHtml).toContain('ANSWER KEY');
    expect(coachingHtml).toContain('BATCH - PRAGYAAN');
    // Ensure it does NOT render NTA cover boxes
    expect(coachingHtml).not.toContain('NATIONAL TESTING AGENCY (NTA)');
    expect(coachingHtml).not.toContain('Candidate Roll No:');
  });

  it('renders bare LaTeX symbols and formulas with KaTeX even without explicit $ delimiters', () => {
    const rawText = 'A force F = 2i^ + bj^ + k^ is applied on a particle with displacement i^ - 2j^ - k^. Equation v = \\alpha\\sqrt{x}, where \\alpha is a constant and angle is 45 ∘.';
    const rendered = renderRichTextToPrintHtml(rawText);

    expect(rendered).toContain('class="katex"');
    expect(rendered).toContain('class="katex-html"');
    // Should have rendered \alpha
    expect(rendered).toContain('α</span>');
    // Should have rendered \sqrt
    expect(rendered).toContain('class="mord sqrt"');
    // Should have rendered degree
    expect(rendered).toContain('∘');
  });

  it('includes identifiable diagram captions [Figure / Diagram for Q.X] and references in solutions', () => {
    const testWithDiagrams: MockTest = {
      id: 'test_diag_1',
      name: 'Physics Test with Diagrams',
      durationMinutes: 60,
      totalMarks: 8,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              subject: 'physics',
              type: 'MCQ',
              difficulty: 'Medium',
              content: 'A block is simply released from the top of an inclined plane as shown in the figure above.',
              options: ['6 m', '3 m', '1 m', '2 m'],
              correctAnswer: 'B',
              imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
              marks: { correct: 4, incorrect: -1 },
              explanation: 'Block slides down and compresses spring.'
            },
            {
              id: 'q2',
              subject: 'physics',
              type: 'NUMERICAL',
              difficulty: 'Medium',
              content: 'The value of spring constant k is:',
              correctAnswer: '2',
              imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
              marks: { correct: 4, incorrect: 0 },
              explanation: 'Official Answer Key: 2'
            }
          ]
        }
      ]
    };

    const html = generateTestPaperHtml(testWithDiagrams, { printMode: 'COMPLETE', layoutStyle: 'NTA_CBT' });

    // Check Question diagram captions
    expect(html).toContain('[Figure / Diagram for Q.1]');
    expect(html).toContain('[Figure / Diagram for Q.2]');
    expect(html).toContain('class="diagram-card"');

    // Check Solution diagram references
    expect(html).toContain('[Reference Figure: Q.1]');
    expect(html).toContain('[Reference Figure: Q.2]');

    // Numerical answer must be displayed as 2, not 'C'
    expect(html).toContain('Correct: 2');
    // MCQ answer B
    expect(html).toContain('Correct: B');
  });

  it('cleans up "Official Answer Key: 0" fallback into readable student text in solutions', () => {
    const testWithZeroKey: MockTest = {
      id: 'test_zero_key',
      name: 'Official Key Fallback Test',
      durationMinutes: 30,
      totalMarks: 4,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              subject: 'physics',
              type: 'MCQ',
              difficulty: 'Medium',
              content: 'Work done by gravitational force is negative.',
              options: ['Negative', 'Positive', 'Zero', 'Undefined'],
              correctAnswer: 'A',
              marks: { correct: 4, incorrect: -1 },
              explanation: 'Official Answer Key: 0'
            }
          ]
        }
      ]
    };

    const html = generateTestPaperHtml(testWithZeroKey, { printMode: 'SOLUTIONS', layoutStyle: 'NTA_CBT' });

    expect(html).not.toContain('Official Answer Key: 0');
    expect(html).toContain('The correct option is (A)');
  });

  it('keeps questions sequentially ordered and numbered without jumping between Part A and Part B', () => {
    const testWithMixedOrder: MockTest = {
      id: 'test_mixed',
      name: 'Order Verification Test',
      durationMinutes: 60,
      totalMarks: 16,
      sections: [
        {
          subject: 'physics',
          questions: [
            { id: 'q1', subject: 'physics', type: 'MCQ', difficulty: 'Medium', content: 'MCQ 1', marks: { correct: 4, incorrect: -1 }, correctAnswer: 'A', options: ['1','2','3','4'] },
            { id: 'q2', subject: 'physics', type: 'NUMERICAL', difficulty: 'Medium', content: 'Num 1', marks: { correct: 4, incorrect: 0 }, correctAnswer: '50' },
            { id: 'q3', subject: 'physics', type: 'MCQ', difficulty: 'Medium', content: 'MCQ 2', marks: { correct: 4, incorrect: -1 }, correctAnswer: 'B', options: ['1','2','3','4'] },
            { id: 'q4', subject: 'physics', type: 'NUMERICAL', difficulty: 'Medium', content: 'Num 2', marks: { correct: 4, incorrect: 0 }, correctAnswer: '100' }
          ]
        }
      ]
    };

    const html = generateTestPaperHtml(testWithMixedOrder, { printMode: 'COMPLETE', layoutStyle: 'NTA_CBT' });

    // MCQs are Q.1 and Q.2 in PART A, Numericals are Q.3 and Q.4 in PART B
    const partAIdx = html.indexOf('PART A: MULTIPLE CHOICE');
    const partBIdx = html.indexOf('PART B: NUMERICAL VALUE');
    const q1Idx = html.indexOf('Q.1');
    const q2Idx = html.indexOf('Q.2');
    const q3Idx = html.indexOf('Q.3');
    const q4Idx = html.indexOf('Q.4');

    expect(partAIdx).toBeLessThan(q1Idx);
    expect(q1Idx).toBeLessThan(q2Idx);
    expect(q2Idx).toBeLessThan(partBIdx);
    expect(partBIdx).toBeLessThan(q3Idx);
    expect(q3Idx).toBeLessThan(q4Idx);
  });

  it('renders i cap, j cap, k cap, unicode circumflexes, and caret vectors with KaTeX in PDF generation', () => {
    const raw = 'A particle moves with force F = 2 i cap + b j cap + k cap and undergoes displacement i cap - 2 j cap - k cap. Another vector is î - 2ĵ - k̂ and option (1) 3 i-cap + 4 j-cap.';
    const rendered = renderRichTextToPrintHtml(raw);

    // Should have rendered into KaTeX math
    expect(rendered).toContain('class="katex"');
    expect(rendered).toContain('class="katex-html"');
    // Should have rendered hat vector accents
    expect(rendered).toContain('katex-accent');
  });

  it('strictly bounds KaTeX square root radical SVGs preventing boundless expansion to the left', () => {
    const testWithSqrt: MockTest = {
      id: 'test_sqrt',
      name: 'Radical Test',
      durationMinutes: 60,
      totalMarks: 4,
      sections: [{
        subject: 'physics',
        questions: [{
          id: 'q1',
          subject: 'physics',
          type: 'MCQ',
          difficulty: 'Medium',
          content: 'Velocity is given by $v = \\alpha\\sqrt{x}$ and $\\sqrt{2} = 1.4$.',
          marks: { correct: 4, incorrect: -1 },
          correctAnswer: 'A',
          options: ['$\\sqrt{gh}$', '$\\sqrt{2gh}$', '$\\sqrt{3gh}$', '$\\sqrt{4gh}$']
        }]
      }]
    };

    const cbtHtml = generateTestPaperHtml(testWithSqrt, { printMode: 'COMPLETE', layoutStyle: 'NTA_CBT' });
    const coachingHtml = generateTestPaperHtml(testWithSqrt, { printMode: 'COMPLETE', layoutStyle: 'COACHING_SHEET' });

    // Verify both templates contain strict bounded radical styles
    for (const html of [cbtHtml, coachingHtml]) {
      expect(html).toContain('.katex .hide-tail');
      expect(html).toContain('overflow: hidden !important');
      expect(html).toContain('.katex svg');
      expect(html).toContain('position: absolute !important');
      expect(html).toContain('width: 100% !important');
      expect(html).toContain('stroke: none !important');
      // Ensure the buggy override width: auto is completely absent
      expect(html).not.toContain('width: auto !important');
    }
  });

  it('embeds official KaTeX CSS inline and contains zero external CDN KaTeX links', () => {
    const mockTest: MockTest = {
      id: 'test_embed_css',
      name: 'Physics Practice Sheet',
      durationMinutes: 45,
      totalMarks: 4,
      sections: [{
        subject: 'physics',
        questions: [{
          id: 'q1',
          subject: 'physics',
          type: 'MCQ',
          difficulty: 'Medium',
          content: 'A force $\\vec{F} = 2\\hat{i} + b\\hat{j} + \\hat{k}$ is applied at an angle $45^\\circ$.',
          marks: { correct: 4, incorrect: -1 },
          correctAnswer: 'A',
          options: ['$1/2$', '$1/3$', '$0$', '$2$']
        }]
      }]
    };

    const cbtHtml = generateTestPaperHtml(mockTest, { printMode: 'COMPLETE', layoutStyle: 'NTA_CBT' });
    const coachingHtml = generateTestPaperHtml(mockTest, { printMode: 'COMPLETE', layoutStyle: 'COACHING_SHEET' });

    for (const html of [cbtHtml, coachingHtml]) {
      // Must contain inline KaTeX stylesheet with official layout rules
      expect(html).toContain('id="katex-official-inline-css"');
      expect(html).toContain('.katex .katex-base');
      expect(html).toContain('.katex .katex-strut');
      expect(html).toContain('.katex .vlist>span>.pstrut');
      // Must NOT contain external CDN link
      expect(html).not.toContain('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css');
      expect(html).not.toContain('<link rel="stylesheet" href="https://cdnjs.cloudflare.com');
    }
  });

  describe('getQuestionImageUrl and diagram rendering verification', () => {
    const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    it('extracts image URL from imageUrl, diagramUrl, figureUrl, solution.imageUrl, and markdown content', () => {
      expect(getQuestionImageUrl({ imageUrl: dummyBase64 })).toBe(dummyBase64);
      expect(getQuestionImageUrl({ diagramUrl: dummyBase64 })).toBe(dummyBase64);
      expect(getQuestionImageUrl({ figureUrl: dummyBase64 })).toBe(dummyBase64);
      expect(getQuestionImageUrl({ solution: { imageUrl: dummyBase64 } })).toBe(dummyBase64);
      expect(getQuestionImageUrl({ content: `Refer to diagram: ![Circuits](${dummyBase64})` })).toBe(dummyBase64);
      expect(getQuestionImageUrl({ content: 'Pure text question without images' })).toBeUndefined();
      expect(getQuestionImageUrl(null)).toBeUndefined();
    });

    it('renders standalone markdown image tags and option images into clean <img> elements', () => {
      const rendered = renderRichTextToPrintHtml(`Option graph: ![Graph A](${dummyBase64})`);
      expect(rendered).toContain('<img src="data:image/png;base64,');
      expect(rendered).toContain('alt="Graph A"');
      expect(rendered).toContain('class="print-diagram-block"');
      // Must not be raw unparsed markdown
      expect(rendered).not.toContain('![Graph A]');
    });

    it('renders diagrams and captions in both COACHING_SHEET and NTA_CBT PDF output', () => {
      const mockTestWithFigures: MockTest = {
        id: 'test_figures_all',
        name: 'Physics Practice Sheet with Diagrams',
        durationMinutes: 60,
        totalMarks: 8,
        sections: [
          {
            subject: 'physics',
            questions: [
              {
                id: 'q1',
                subject: 'physics',
                type: 'MCQ',
                difficulty: 'Medium',
                content: 'A block slides down as shown in the diagram: ![Ramp](' + dummyBase64 + ')',
                options: [
                  '![Opt 1](' + dummyBase64 + ')',
                  '![Opt 2](' + dummyBase64 + ')',
                  '3 m/s',
                  '4 m/s'
                ],
                correctAnswer: 'A',
                marks: { correct: 4, incorrect: -1 },
                explanation: 'By conservation of total mechanical energy: initial mechanical energy equals final mechanical energy, giving $E_i = E_f$.'
              },
              {
                id: 'q2',
                subject: 'physics',
                type: 'NUMERICAL',
                difficulty: 'Medium',
                content: 'Find the acceleration of the mass.',
                diagramUrl: dummyBase64,
                correctAnswer: '5',
                marks: { correct: 4, incorrect: 0 },
                explanation: 'According to Newton second law of motion, net force equals mass times acceleration: $F = ma \\implies a = F/m = 5\\text{ m/s}^2$.'
              }
            ]
          }
        ]
      };

      const coachingHtml = generateTestPaperHtml(mockTestWithFigures, {
        layoutStyle: 'COACHING_SHEET',
        printMode: 'COMPLETE'
      });
      const cbtHtml = generateTestPaperHtml(mockTestWithFigures, {
        layoutStyle: 'NTA_CBT',
        printMode: 'COMPLETE'
      });

      for (const html of [coachingHtml, cbtHtml]) {
        // Diagram images must be present in HTML
        expect(html).toContain(dummyBase64);
        expect(html).toContain('<img src="data:image/png;base64,');
        // Captions must identify Question 1 and Question 2
        expect(html).toContain('[Figure / Diagram for Q.1]');
        expect(html).toContain('[Figure / Diagram for Q.2]');
        // Solutions must reference Figure 1 and Figure 2
        expect(html).toContain('[Reference Figure: Q.1]');
        expect(html).toContain('[Reference Figure: Q.2]');
      }
    });

    it('deduplicates a 53-question paper down to canonical 50 questions and keeps Answer Key strictly at 50', () => {
      // Create 30 MCQs
      const mcqs = Array.from({ length: 30 }, (_, i) => ({
        id: `mcq_${i + 1}`,
        subject: 'physics',
        type: 'MCQ',
        difficulty: 'Medium',
        content: i === 9
          ? 'A rubber ball falls from a height h and rebounds upto the height of h/2. The percentage loss of total energy...'
          : `Physics MCQ question content ${i + 1}`,
        options: ['Opt 1', 'Opt 2', 'Opt 3', 'Opt 4'],
        correctAnswer: 'A',
        marks: { correct: 4, incorrect: -1 }
      }));

      // 3 Duplicate questions injected at boundary
      const duplicates = [
        {
          id: 'dup_q31',
          subject: 'physics',
          type: 'MCQ',
          difficulty: 'Medium',
          content: 'A rubber ball falls from a height h and rebounds upto the height of h/2. The percentage loss of total energy...',
          options: ['Opt 1', 'Opt 2', 'Opt 3', 'Opt 4'],
          correctAnswer: 'A',
          marks: { correct: 4, incorrect: -1 }
        },
        {
          id: 'dup_q32',
          subject: 'physics',
          type: 'MCQ',
          difficulty: 'Medium',
          content: 'A force acts on a 2 kg object so that its position is given as a function of time as x = 3t^2 + 5...',
          correctAnswer: '0',
          marks: { correct: 4, incorrect: -1 }
        },
        {
          id: 'dup_q33',
          subject: 'physics',
          type: 'MCQ',
          difficulty: 'Medium',
          content: 'A particle is moving in one dimension under the action of a force which varies with distance x as...',
          correctAnswer: '0',
          marks: { correct: 4, incorrect: -1 }
        }
      ];

      // 20 Numerical questions (original Q31..Q50)
      const numericals = Array.from({ length: 20 }, (_, i) => {
        let content = `Numerical physics problem ${i + 31}`;
        if (i === 3) content = 'A force acts on a 2 kg object so that its position is given as a function of time as x = 3t^2 + 5...';
        if (i === 6) content = 'A particle is moving in one dimension under the action of a force which varies with distance x as...';
        return {
          id: `num_${i + 31}`,
          subject: 'physics',
          type: 'NUMERICAL',
          difficulty: 'Hard',
          content,
          correctAnswer: `${i + 1}`,
          marks: { correct: 4, incorrect: 0 }
        };
      });

      const paperWith53: MockTest = {
        id: 'p11_53_test',
        name: 'PHYSICS P-11',
        durationMinutes: 180,
        totalMarks: 200,
        sections: [
          {
            subject: 'physics',
            questions: [...mcqs, ...duplicates, ...numericals] as MockQuestion[] // 30 + 3 + 20 = 53 questions
          }
        ]
      };

      const html = generateTestPaperHtml(paperWith53, { layoutStyle: 'COACHING_SHEET', printMode: 'COMPLETE' });

      // Total questions must be exactly 50, never 53
      expect(html).toContain('<strong>50.</strong>');
      expect(html).not.toContain('<strong>51.</strong>');
      expect(html).not.toContain('<strong>52.</strong>');
      expect(html).not.toContain('<strong>53.</strong>');

      // Answer key grid must contain cell 50, but not 51..53
      expect(html).toContain('<span class="coaching-key-num">50.</span>');
      expect(html).not.toContain('<span class="coaching-key-num">51.</span>');
      expect(html).not.toContain('<span class="coaching-key-num">52.</span>');
      expect(html).not.toContain('<span class="coaching-key-num">53.</span>');

      // Rubber ball question must appear only once (at Q.10), not duplicated at Q.31
      const rubberMatches = html.match(/rubber ball falls from a height/gi) || [];
      expect(rubberMatches.length).toBe(1);
    });

    it('heals Q.6 missing options and Q.13 identical options A and B', () => {
      const testSpecialQuestions: MockTest = {
        id: 'special_healing_test',
        name: 'PHYSICS P-11 SPECIAL HEALING',
        durationMinutes: 60,
        totalMarks: 20,
        sections: [
          {
            subject: 'physics',
            questions: [
              {
                id: 'q6',
                subject: 'physics',
                type: 'MCQ',
                difficulty: 'Medium',
                content: `Identify the correct statements from the following:
(A) Work done by a man in lifting a bucket out of a well by means of a rope tied to the bucket is negative.
(B) Work done by gravitational force in lifting a bucket out of a well by a rope tied to the bucket is negative.
(C) Work done by friction on a body sliding down an inclined plane is positive.
(D) Work done by an applied force on a body moving on a rough horizontal plane with uniform velocity in zero.
(E) Work done by the air resistance on an oscillating pendulum in negative.
Choose the correct answer from the options given below:`,
                options: [], // empty options in raw text
                correctAnswer: 'A',
                marks: { correct: 4, incorrect: -1 }
              },
              {
                id: 'q13',
                subject: 'physics',
                type: 'MCQ',
                difficulty: 'Medium',
                content: 'Three bodies A, B and C have equal kinetic energies and their masses are 400g, 1.2 kg and 1.6 kg respectively. The ratio of their linear momenta is :',
                options: ['$1 : \\sqrt{3} : 2$', '$1 : \\sqrt{3} : 2$', '$2 : \\sqrt{3} : 1$', '$\\sqrt{3} : 2 : 1$'],
                correctAnswer: 'A',
                marks: { correct: 4, incorrect: -1 }
              }
            ]
          }
        ]
      };

      const html = generateTestPaperHtml(testSpecialQuestions, { layoutStyle: 'COACHING_SHEET', printMode: 'COMPLETE' });

      // Q.6 options must be populated
      expect(html).toContain('B and E only');
      expect(html).toContain('A and C only');
      expect(html).toContain('B, D and E only');
      expect(html).toContain('B and D only');

      // Q.13 option B must be healed to 1 : \sqrt{3} : \sqrt{2}
      const healedQ13 = healQuestionContentAndOptions(testSpecialQuestions.sections[0].questions[1]);
      expect(healedQ13.options[1]).toBe('$1 : \\sqrt{3} : \\sqrt{2}$');
    });

    it('validates all 14 LaTeX healing rules in MathNotationHealer', () => {
      // Q.1: Vector notation
      const q1Healed = MathNotationHealer.healMathText('A force F = 2 i^ + b j^ + k^ is applied and displacement î - 2-k');
      expect(q1Healed).toContain('\\vec{F} = 2\\hat{i} + b\\hat{j} + \\hat{k}');
      expect(q1Healed).toContain('\\hat{i} - 2\\hat{j} - \\hat{k}');

      // Q.4: F = a + \beta x2, \alpha = 1N, \beta
      const q4Healed = MathNotationHealer.healMathText('A force F = a + β x2 acts on an object. If constant a = 1N then β will be 12 N/m2');
      expect(q4Healed).toContain('F = \\alpha + \\beta x^2');
      expect(q4Healed).toContain('\\alpha = 1\\text{ N}');
      expect(q4Healed).toContain('\\beta');

      // Q.10: gH typo and square roots
      const q10Healed = MathNotationHealer.healMathText('(1) 50%, gH/2 (2) 50%, gH');
      expect(q10Healed).toContain('gh');
      expect(q10Healed).not.toContain('gH');

      // Q.14: v_A and v_B
      const q14Healed = MathNotationHealer.healMathText('velocities v_A and v_{\\overline{B}}');
      expect(q14Healed).toContain('v_B');
      expect(q14Healed).not.toContain('\\overline{B}');

      // Q.17: Option B fraction
      const q17Healed = MathNotationHealer.healMathText('md^2 d/2 \\alpha^2');
      expect(q17Healed).toContain('\\frac{md^2}{2\\alpha^2}');

      // Q.23: Vector F notation
      const q23Healed = MathNotationHealer.healMathText('force F(4xî 3y_2 \\hat{j})');
      expect(q23Healed).toContain('\\vec{F} = (4x\\hat{i} + 3y^2\\hat{j})');

      // Q.24: 1/2mgyz0
      const q24Healed = MathNotationHealer.healMathText('Option (B) 1/2mgyz0');
      expect(q24Healed).toContain('\\frac{1}{2}mgy_0^2');

      // Q.36: Vector field f = x²yî + y²ĵ
      const q36Healed = MathNotationHealer.healMathText('f = x y \\hat{i}^2^{\\wedge} + y \\hat{j}^2^{\\wedge}');
      expect(q36Healed).toContain('\\vec{F} = x^2y\\hat{i} + y^2\\hat{j}');

      // Q.39: Force in x-direction
      const q39Healed = MathNotationHealer.healMathText('F = (2 + 3x)\\hat{t}{\\wedge}');
      expect(q39Healed).toContain('\\vec{F} = (2 + 3x)\\hat{i}\\text{ N}');

      // Q.41: Force in y-direction
      const q41Healed = MathNotationHealer.healMathText('F (5y 20) jN \\wedge{\\wedge}');
      expect(q41Healed).toContain('\\vec{F} = (5y + 20)\\hat{j}\\text{ N}');

      // Q.46: (10)-n () J
      const q46Healed = MathNotationHealer.healMathText('(10)-n () J. The value of n will (x) be');
      expect(q46Healed).toContain('\\left(\\frac{10}{x}\\right)^{-n}\\text{ J}');

      // Q.52: \frac{4}{1} -> \frac{A}{1}
      const q52Healed = MathNotationHealer.healMathText('will be \\frac{4}{1}, so the value of A will be');
      expect(q52Healed).toContain('\\frac{A}{1}');
    });
  });
});

