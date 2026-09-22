import { describe, it, expect } from 'vitest';
import { AnswerKeyExtractor } from './AnswerKeyExtractor';

describe('AnswerKeyExtractor', () => {
  it('parses grid table answer keys from coaching sheets', () => {
    const rawText = `
      Some questions...
      CHECK YOUR GRASP ANSWER KEY EXERCISE -1
      Que. 1 2 3 4 5
      Ans. A D C B A
      Que. 6 7 8 9 10
      Ans. A D B B C
    `;

    const key = AnswerKeyExtractor.extractGlobalAnswerKey(rawText);
    expect(key.hasKeySection).toBe(true);
    expect(key.entries.length).toBe(10);
    expect(key.lookup(0, 1)?.rawAns).toBe('A');
    expect(key.lookup(1, 2)?.rawAns).toBe('D');
    expect(key.lookup(2, 3)?.rawAns).toBe('C');
    expect(key.lookup(9, 10)?.rawAns).toBe('C');
  });

  it('preserves numerical values 1-4 in numerical sections and converts in MCQ', () => {
    // MCQ context
    const mcqAns = AnswerKeyExtractor.normalizeAnswerValue('2');
    expect(mcqAns.normalized).toBe('1'); // converted to 0-based index
    expect(mcqAns.isNumerical).toBe(false);

    // Numerical context
    const numAns = AnswerKeyExtractor.normalizeAnswerValue('2', { sectionType: 'integer type' });
    expect(numAns.normalized).toBe('2'); // preserved as 2
    expect(numAns.isNumerical).toBe(true);
  });

  it('parses headerless PART - I, PART - II, and PART - III answer sheets', () => {
    const rawText = `
      Some questions on pages 1 to 5...

      PART - I
      1. (D) 2. (B) 3. (D) 4. (B) 5. (A)
      6. (B) 7. (A) 8. (D) 9. (B) 10. (C)

      PART - II
      1. 2   2. 5 (i, iv, v, vi, ix)   3. 10 (iii, iv, v)
      4. 3   5. 12 (x = 6, y = 6)     6. 5 (i, iii, iv)
      7. 5 (ii, iii)

      PART - III
      1. (ACD)    2. (AC)    3. (BC)    4. (AB)
    `;

    const key = AnswerKeyExtractor.extractGlobalAnswerKey(rawText);
    expect(key.hasKeySection).toBe(true);
    expect(key.entries.length).toBe(21);

    // Part I lookup
    expect(key.lookup(0, 1)?.normalizedAns).toBe('3'); // (D) -> 3
    expect(key.lookup(4, 5)?.normalizedAns).toBe('0'); // (A) -> 0
    expect(key.lookup(9, 10)?.normalizedAns).toBe('2'); // (C) -> 2

    // Part II numerical lookup
    expect(key.lookup(10, 1)?.normalizedAns).toBe('2');
    expect(key.lookup(11, 2)?.normalizedAns).toBe('5');
    expect(key.lookup(14, 5)?.normalizedAns).toBe('12');

    // Part III multi-option lookup
    expect(key.lookup(17, 1, 'PART - III')?.normalizedAns).toBe('ACD');
    expect(key.lookup(18, 2, 'PART - III')?.normalizedAns).toBe('AC');
    expect(key.lookup(19, 3, 'PART - III')?.normalizedAns).toBe('BC');
    expect(key.lookup(20, 4, 'PART - III')?.normalizedAns).toBe('AB');
  });

  it('parses Competishun DPP answer key format with (1)-(4) MCQ options and unparenthesized numerical answers', () => {
    const rawCompetishunText = `
      Some physics rectilinear motion questions 1 to 25...

      / ANSWER KEY /
      1. (2) 2. (4) 3. (1) 4. (3) 5. (2)
      6. (3) 7. (2) 8. (1) 9. (2) 10. (2)
      11. (4) 12. (3) 13. (1) 14. (1) 15. (2)
      16. (2) 17. (1) 18. (1) 19. (4) 20. (2)
      21. 25 22. 22.36 23. 82 24. 25 25. 10
    `;

    const key = AnswerKeyExtractor.extractGlobalAnswerKey(rawCompetishunText);
    expect(key.hasKeySection).toBe(true);
    expect(key.entries.length).toBe(25);

    // MCQs mapped from 1-based (1)-(4) to 0-based indices 0-3
    expect(key.lookup(0, 1)?.normalizedAns).toBe('1'); // (2) -> 1 (B)
    expect(key.lookup(1, 2)?.normalizedAns).toBe('3'); // (4) -> 3 (D)
    expect(key.lookup(2, 3)?.normalizedAns).toBe('0'); // (1) -> 0 (A)
    expect(key.lookup(3, 4)?.normalizedAns).toBe('2'); // (3) -> 2 (C)
    expect(key.lookup(19, 20)?.normalizedAns).toBe('1'); // (2) -> 1 (B)

    // Numerical questions preserve exact numerical values
    expect(key.lookup(20, 21)?.normalizedAns).toBe('25');
    expect(key.lookup(20, 21)?.isNumerical).toBe(true);
    expect(key.lookup(21, 22)?.normalizedAns).toBe('22.36');
    expect(key.lookup(21, 22)?.isNumerical).toBe(true);
    expect(key.lookup(22, 23)?.normalizedAns).toBe('82');
    expect(key.lookup(22, 23)?.isNumerical).toBe(true);
    expect(key.lookup(24, 25)?.normalizedAns).toBe('10');
    expect(key.lookup(24, 25)?.isNumerical).toBe(true);
  });
});


