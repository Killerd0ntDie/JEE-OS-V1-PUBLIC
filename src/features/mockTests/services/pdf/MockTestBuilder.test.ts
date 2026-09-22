import { describe, it, expect } from 'vitest';
import { MockTestBuilder } from './MockTestBuilder';

describe('MockTestBuilder', () => {
  describe('extractMultiCorrectFromExplanation', () => {
    it('returns null when derivation concludes a single option despite mentioning options in text', () => {
      const exp = `
**Key Concept & Formula**
Analysis of bond lengths in H2CO3 and SbCl5, and bond angles via Bent's rule in H2CO vs F2CO.

**Step 1: Evaluating Each Statement**
• Statement (A): In carbonic acid (H2CO3), the C-O bonds are not identical. (Incorrect)
• Statement (B): In SbCl5, axial bonds are longer than equatorial bonds. (Incorrect)
• Statement (C): HCH > FCF, making statement (C) incorrect.
• Statement (D): Since statements (A), (B), and (C) are all incorrect, statement (D) is correct.

**Conclusion & Correct Option**
Correct Option: **(D)**.
`;
      const result = MockTestBuilder.extractMultiCorrectFromExplanation(exp);
      expect(result).toBeNull();
    });

    it('rejects listed options when followed by negative assertion words', () => {
      const exp = 'Statements (A) and (B) are incorrect. Option (D) is the correct answer.';
      const result = MockTestBuilder.extractMultiCorrectFromExplanation(exp);
      expect(result).toBeNull();
    });

    it('extracts multi-letter combination when statements are explicitly positive', () => {
      const exp = 'Both Option A and Option B are correct according to resonance theory.';
      const result = MockTestBuilder.extractMultiCorrectFromExplanation(exp);
      expect(result).toBe('AB');
    });

    it('extracts multi-letter combination from explicit conclusion', () => {
      const exp = '**Conclusion & Correct Option**\nCorrect Options: **ACD**.';
      const result = MockTestBuilder.extractMultiCorrectFromExplanation(exp);
      expect(result).toBe('ACD');
    });
  });

  describe('buildDppMockTestObject canonical question handling', () => {
    it('correctly resolves Q1 (AX3 all bond angles same) to Option D (index 3) and type MCQ', () => {
      const rawQ = {
        content: 'If all bond angles in AX3 molecule are the same, then which of the following conclusions is correct about AX3?',
        options: [
          'AX3 must be polar.',
          'AX3 must be planar.',
          'AX3 must have at least 5 valence electrons.',
          'X must connect from central atom with either single bond or double bond.'
        ],
        correctAnswer: 'ABC', // Raw hallucinated key
        type: 'MULTI' // Mistakenly parsed type
      };

      const test = MockTestBuilder.buildDppMockTestObject('Chemical Bonding DPP', [rawQ], {
        subject: 'chemistry',
        chapterName: 'Chemical Bonding'
      });

      const q = test.sections[0].questions[0];
      expect(q.correctAnswer).toBe('3');
      expect(q.type).toBe('MCQ');
      expect(q.marks.correct).toBe(4);
      expect(q.marks.incorrect).toBe(-1);
      expect(q.isVerified).toBe(true);
      expect(q.explanation).toContain('Option **(D)** is the only correct statement');
    });

    it('correctly resolves Q8 (H2CO3 / SbCl5 / H2CO vs F2CO) to Option D (index 3) and type MCQ', () => {
      const rawQ = {
        content: 'Choose the correct statement from the following options.',
        options: [
          'All dC-O in H2CO3 are identical.',
          'All dSb-Cl in SbCl5 are identical.',
          '\\widehat{HCH} (in H2CO) < \\widehat{FCF} (in F2CO)',
          'All above statements are incorrect'
        ],
        correctAnswer: 'AB', // Raw hallucinated key
        type: 'MULTI'
      };

      const test = MockTestBuilder.buildDppMockTestObject('Chemical Bonding DPP', [rawQ], {
        subject: 'chemistry',
        chapterName: 'Chemical Bonding'
      });

      const q = test.sections[0].questions[0];
      expect(q.correctAnswer).toBe('3');
      expect(q.type).toBe('MCQ');
      expect(q.marks.correct).toBe(4);
      expect(q.marks.incorrect).toBe(-1);
      expect(q.isVerified).toBe(true);
      expect(q.explanation).toContain('All above statements are incorrect');
    });

    it('correctly resolves Q11 (dimer characteristics: Al2Cl6) to Option C (index 2) and type MCQ', () => {
      const rawQ = {
        content: 'In which of the following all the given characteristics are present?\n(I) Vacant orbitals involved in hybridization.\n(II) Octet of underlined atom is complete.\n(III) Geometry at underlined atom is tetrahedral.',
        options: ['B2H6', 'Si2H6', 'Al2Cl6', 'I2Cl6'],
        correctAnswer: '0', // Raw defaulted key
        type: 'MCQ'
      };

      const test = MockTestBuilder.buildDppMockTestObject('Chemical Bonding DPP', [rawQ], {
        subject: 'chemistry',
        chapterName: 'Chemical Bonding'
      });

      const q = test.sections[0].questions[0];
      expect(q.correctAnswer).toBe('2');
      expect(q.type).toBe('MCQ');
      expect(q.marks.correct).toBe(4);
      expect(q.marks.incorrect).toBe(-1);
      expect(q.isVerified).toBe(true);
      expect(q.explanation).toContain('Al_2Cl_6');
    });
  });
});
