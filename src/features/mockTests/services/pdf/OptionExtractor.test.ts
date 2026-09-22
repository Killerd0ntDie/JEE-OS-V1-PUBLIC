import { describe, it, expect } from 'vitest';
import { OptionExtractor } from './OptionExtractor';
import { QuestionBlock } from './types';

describe('OptionExtractor — Phase 5 Bulletproof Option Parser', () => {
  describe('1. Layout Detection & Stacked Options', () => {
    it('detects and extracts standard stacked options (A)-(D)', () => {
      const block = `
1. A particle of mass $m$ is moving in a circle of radius $r$. The angular momentum is:
(A) $mvr$
(B) $mv^2/r$
(C) $mvr^2$
(D) $m^2vr$
      `.trim();

      const res = OptionExtractor.extractOptionsFromBlock(block);
      expect(res.hasOptions).toBe(true);
      expect(res.layout).toBe('stacked');
      expect(res.options).toHaveLength(4);
      expect(res.options![0]).toEqual({ id: 'A', text: '$mvr$', rawText: '(A) $mvr$' });
      expect(res.options![1]).toEqual({ id: 'B', text: '$mv^2/r$', rawText: '(B) $mv^2/r$' });
      expect(res.options![2]).toEqual({ id: 'C', text: '$mvr^2$', rawText: '(C) $mvr^2$' });
      expect(res.options![3]).toEqual({ id: 'D', text: '$m^2vr$', rawText: '(D) $m^2vr$' });
      expect(res.validation?.isValid).toBe(true);
    });

    it('handles stacked options with multi-line prose descriptions', () => {
      const block = `
Which of the following statements regarding Carnot engine is correct?
(A) The efficiency of a Carnot engine depends only on the temperatures of source and sink
    and is independent of the nature of the working substance.
(B) It is impossible to achieve 100% efficiency even if the sink temperature is 0 Kelvin.
(C) The efficiency increases when the temperature of the source decreases.
(D) It operates on a cycle comprising three isothermal and one adiabatic process.
      `.trim();

      const res = OptionExtractor.extractOptionsFromBlock(block);
      expect(res.hasOptions).toBe(true);
      expect(res.layout).toBe('stacked');
      expect(res.options![0].text).toContain('depends only on the temperatures');
      expect(res.options![0].text).toContain('independent of the nature');
      expect(res.options![3].text).toContain('three isothermal');
      expect(res.validation?.isValid).toBe(true);
    });

    it('handles bracketed options [A]-[D] and A]-D]', () => {
      const block = `
Find the SI unit of magnetic flux:
[A] Weber
[B] Tesla
[C] Henry
[D] Gauss
      `.trim();

      const res = OptionExtractor.extractOptionsFromBlock(block);
      expect(res.hasOptions).toBe(true);
      expect(res.options![0].text).toBe('Weber');
      expect(res.options![1].text).toBe('Tesla');
      expect(res.options![2].text).toBe('Henry');
      expect(res.options![3].text).toBe('Gauss');
    });
  });

  describe('2. Horizontal Inline Options', () => {
    it('detects and extracts options that are all inline on one line', () => {
      const block = `
The velocity of light in vacuum is:
(A) $3 \\times 10^8$ m/s  (B) $3 \\times 10^6$ m/s  (C) $3 \\times 10^7$ m/s  (D) $3 \\times 10^9$ m/s
      `.trim();

      const res = OptionExtractor.extractOptionsFromBlock(block);
      expect(res.hasOptions).toBe(true);
      expect(res.layout).toBe('horizontal');
      expect(res.options).toHaveLength(4);
      expect(res.options![0].text).toContain('$3 \\times 10^8$ m/s');
      expect(res.options![1].text).toContain('$3 \\times 10^6$ m/s');
      expect(res.options![2].text).toContain('$3 \\times 10^7$ m/s');
      expect(res.options![3].text).toContain('$3 \\times 10^9$ m/s');
      expect(res.validation?.isValid).toBe(true);
    });

    it('infers horizontal layout from QuestionBlock with 1 option line', () => {
      const qBlock: QuestionBlock = {
        questionNum: 1,
        localQNum: 1,
        lineIndex: 0,
        statementYstart: 100,
        statementYend: 150,
        diagramGapYstart: 150,
        diagramGapYend: 150,
        contentXmin: 50,
        contentXmax: 500,
        statementText: 'Sample question',
        optionLines: [
          { text: '(A) 1  (B) 2  (C) 3  (D) 4', y: 160, anchorY: 160, minX: 50, maxX: 500, items: [] }
        ]
      };

      const layout = OptionExtractor.detectLayout('(A) 1 (B) 2 (C) 3 (D) 4', qBlock, [
        { index: 0, length: 3, label: 'A', isNumeric: false },
        { index: 6, length: 3, label: 'B', isNumeric: false },
        { index: 12, length: 3, label: 'C', isNumeric: false },
        { index: 18, length: 3, label: 'D', isNumeric: false }
      ]);
      expect(layout).toBe('horizontal');
    });
  });

  describe('3. Two-Column (2x2 Grid) Options', () => {
    it('detects and extracts 2x2 grid options correctly', () => {
      const block = `
The solutions to $x^2 - 5x + 6 = 0$ are:
(A) 2, 3              (B) -2, -3
(C) 1, 6              (D) -1, -6
      `.trim();

      const res = OptionExtractor.extractOptionsFromBlock(block);
      expect(res.hasOptions).toBe(true);
      expect(res.layout).toBe('two-column');
      expect(res.options).toHaveLength(4);
      expect(res.options![0].text).toBe('2, 3');
      expect(res.options![1].text).toBe('-2, -3');
      expect(res.options![2].text).toBe('1, 6');
      expect(res.options![3].text).toBe('-1, -6');
    });

    it('infers two-column layout from QuestionBlock with 2 option lines', () => {
      const qBlock: QuestionBlock = {
        questionNum: 2,
        localQNum: 2,
        lineIndex: 0,
        statementYstart: 100,
        statementYend: 150,
        diagramGapYstart: 150,
        diagramGapYend: 150,
        contentXmin: 50,
        contentXmax: 500,
        statementText: 'Sample question',
        optionLines: [
          { text: '(A) opt1    (B) opt2', y: 160, anchorY: 160, minX: 50, maxX: 500, items: [] },
          { text: '(C) opt3    (D) opt4', y: 180, anchorY: 180, minX: 50, maxX: 500, items: [] }
        ]
      };

      const layout = OptionExtractor.detectLayout('(A) opt1 (B) opt2\n(C) opt3 (D) opt4', qBlock, [
        { index: 0, length: 3, label: 'A', isNumeric: false },
        { index: 9, length: 3, label: 'B', isNumeric: false },
        { index: 18, length: 3, label: 'C', isNumeric: false },
        { index: 27, length: 3, label: 'D', isNumeric: false }
      ]);
      expect(layout).toBe('two-column');
    });
  });

  describe('4. Numbered Options (1)-(4) -> Normalized to (A)-(D)', () => {
    it('normalizes stacked numeric options (1)-(4) to IDs A-D', () => {
      const block = `
In a thermodynamic process, the work done during an isobaric expansion is:
(1) $P \\Delta V$
(2) $nRT \\ln(V_2/V_1)$
(3) Zero
(4) $\\frac{P_1 V_1 - P_2 V_2}{\\gamma - 1}$
      `.trim();

      const res = OptionExtractor.extractOptionsFromBlock(block);
      expect(res.hasOptions).toBe(true);
      expect(res.layout).toBe('numbered');
      expect(res.options).toHaveLength(4);
      expect(res.options![0].id).toBe('A');
      expect(res.options![0].text).toBe('$P \\Delta V$');
      expect(res.options![1].id).toBe('B');
      expect(res.options![1].text).toBe('$nRT \\ln(V_2/V_1)$');
      expect(res.options![2].id).toBe('C');
      expect(res.options![2].text).toBe('Zero');
      expect(res.options![3].id).toBe('D');
      expect(res.options![3].text).toContain('\\gamma - 1');
    });

    it('normalizes horizontal numeric options 1) to 4)', () => {
      const block = `
The value of universal gas constant $R$ in SI units is:
(1) 8.314 J/mol K  (2) 1.987 cal/mol K  (3) 0.0821 L atm/mol K  (4) 6.022 J/mol K
      `.trim();

      const res = OptionExtractor.extractOptionsFromBlock(block);
      expect(res.hasOptions).toBe(true);
      expect(res.options![0].id).toBe('A');
      expect(res.options![0].text).toContain('8.314');
      expect(res.options![1].id).toBe('B');
      expect(res.options![1].text).toContain('1.987');
      expect(res.options![2].id).toBe('C');
      expect(res.options![2].text).toContain('0.0821');
      expect(res.options![3].id).toBe('D');
      expect(res.options![3].text).toContain('6.022');
    });
  });

  describe('5. Diagram Labels & Visual Options', () => {
    it('produces clean button options for diagram questions with empty text options', () => {
      const block = `
Which of the following represents the correct graph of electric field $E$ versus distance $r$?
[PAGE 1]
(A)
(B)
(C)
(D)
      `.trim();

      const res = OptionExtractor.extractOptionsFromBlock(block);
      expect(res.hasOptions).toBe(true);
      expect(res.options).toHaveLength(4);
      expect(res.options![0].text).toContain('Graph / Figure (1)');
      expect(res.options![1].text).toContain('Graph / Figure (2)');
      expect(res.options![2].text).toContain('Graph / Figure (3)');
      expect(res.options![3].text).toContain('Graph / Figure (4)');
    });

    it('cleanOptions converts markdown images and placeholders into clean (A)-(D) labels', () => {
      const opts = [
        { id: 'A', text: '![diagram A](data:image/webp;base64,AAA)' },
        { id: 'B', text: '(B)' },
        { id: 'C', text: 'structure (C)' },
        { id: 'D', text: '' }
      ];

      OptionExtractor.cleanOptions(opts);
      expect(opts[0].text).toBe('(A)');
      expect(opts[1].text).toBe('(B)');
      expect(opts[2].text).toBe('(C)');
      expect(opts[3].text).toBe('(D)');
    });
  });

  describe('6. Parenthetical Guarding & Mixed Math/Chemistry', () => {
    it('avoids false option splits when question statement contains math parentheses', () => {
      const block = `
If $\\det(A) = 0$ and $(a + b)^2 = 4$ where matrices $(B)$ and $(C)$ are orthogonal,
calculate the value of $(1/2) \\text{Tr}(A)$.
      `.trim();

      const res = OptionExtractor.extractOptionsFromBlock(block);
      expect(res.hasOptions).toBe(false);
      expect(res.options).toBeUndefined();
      expect(res.questionBody).toContain('\\det(A)');
      expect(res.questionBody).toContain('(1/2)');
    });

    it('avoids collision with chemistry compound designations like Compound (A) and Product (B)', () => {
      const block = `
An organic Compound (A) on ozonolysis gives Product (B) and Product (C).
Identify Compound (A):
(A) 2-Methylbut-2-ene
(B) Pent-2-ene
(C) 2-Methylbut-1-ene
(D) 3-Methylbut-1-ene
      `.trim();

      const res = OptionExtractor.extractOptionsFromBlock(block);
      expect(res.hasOptions).toBe(true);
      expect(res.options).toHaveLength(4);
      expect(res.questionBody).toContain('Compound (A)');
      expect(res.options![0].text).toBe('2-Methylbut-2-ene');
      expect(res.options![1].text).toBe('Pent-2-ene');
      expect(res.options![2].text).toBe('2-Methylbut-1-ene');
      expect(res.options![3].text).toBe('3-Methylbut-1-ene');
    });

    it('does not strip decimals from option numbers like 1.2 × 10^-18 J', () => {
      expect(OptionExtractor.sanitizeOptionText('(A) 1.2 × 10^-18 J')).toBe('1.2 × 10^-18 J');
      expect(OptionExtractor.sanitizeOptionText('1.2 × 10^-18 J')).toBe('1.2 × 10^-18 J');
      expect(OptionExtractor.sanitizeOptionText('(1) -4.5 m/s')).toBe('-4.5 m/s');
      expect(OptionExtractor.sanitizeOptionText('(A) 3 : 2')).toBe('3 : 2');
    });
  });

  describe('7. Strict Option Validation', () => {
    it('validates a correct set of 4 distinct options', () => {
      const options = [
        { id: 'A', text: 'Velocity increases' },
        { id: 'B', text: 'Velocity decreases' },
        { id: 'C', text: 'Velocity remains constant' },
        { id: 'D', text: 'Velocity is zero' }
      ];
      const val = OptionExtractor.validate(options);
      expect(val.isValid).toBe(true);
      expect(val.issues).toHaveLength(0);
    });

    it('flags invalid when option count is not 4 for MCQ', () => {
      const options = [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' }
      ];
      const val = OptionExtractor.validate(options, 'MCQ');
      expect(val.isValid).toBe(false);
      expect(val.issues.some(i => i.includes('Expected 4 options'))).toBe(true);
    });

    it('flags invalid when an option text is empty', () => {
      const options = [
        { id: 'A', text: 'Valid' },
        { id: 'B', text: '   ' },
        { id: 'C', text: 'Valid 2' },
        { id: 'D', text: 'Valid 3' }
      ];
      const val = OptionExtractor.validate(options);
      expect(val.isValid).toBe(false);
      expect(val.issues.some(i => i.includes('Option B text is empty'))).toBe(true);
    });

    it('flags invalid when duplicate option text is detected', () => {
      const options = [
        { id: 'A', text: '4 m/s' },
        { id: 'B', text: '4 m/s' },
        { id: 'C', text: '6 m/s' },
        { id: 'D', text: '8 m/s' }
      ];
      const val = OptionExtractor.validate(options);
      expect(val.isValid).toBe(false);
      expect(val.issues.some(i => i.includes('Duplicate option text detected'))).toBe(true);
    });

    it('flags invalid when an option contains leaked section headers or subsequent questions', () => {
      const options = [
        { id: 'A', text: '4 m/s' },
        { id: 'B', text: '6 m/s' },
        { id: 'C', text: '8 m/s' },
        { id: 'D', text: '10 m/s\nSECTION - B INTEGER TYPE' }
      ];
      const val = OptionExtractor.validate(options);
      expect(val.isValid).toBe(false);
      expect(val.issues.some(i => i.includes('leaked section header'))).toBe(true);
    });

    it('flags invalid when surrogate dummy combinations are present', () => {
      const options = [
        { id: 'A', text: '(A), (B), (C)' },
        { id: 'B', text: '(B), (D)' },
        { id: 'C', text: 'Option (3)' },
        { id: 'D', text: 'Option (4)' }
      ];
      const val = OptionExtractor.validate(options);
      expect(val.isValid).toBe(false);
      expect(val.issues.some(i => i.includes('surrogate letters'))).toBe(true);
    });
  });
});
