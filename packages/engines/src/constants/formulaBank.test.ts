import { describe, it, expect } from 'vitest';
import katex from 'katex';
import { FORMULA_BANK } from './formulaBank';

describe('FORMULA_BANK Knowledge Integrity & KaTeX Validation', () => {
  it('covers all 80 chapters across Physics (p1-p25), Chemistry (c1-c30), and Maths (m1-m25)', () => {
    expect(FORMULA_BANK.length).toBe(80);

    const physicsChapters = FORMULA_BANK.filter(c => c.subject === 'physics');
    const chemistryChapters = FORMULA_BANK.filter(c => c.subject === 'chemistry');
    const mathsChapters = FORMULA_BANK.filter(c => c.subject === 'maths');

    expect(physicsChapters.length).toBe(25);
    expect(chemistryChapters.length).toBe(30);
    expect(mathsChapters.length).toBe(25);

    for (let i = 1; i <= 25; i++) {
      expect(FORMULA_BANK.some(c => c.chapterId === `p${i}`)).toBe(true);
    }
    for (let i = 1; i <= 30; i++) {
      expect(FORMULA_BANK.some(c => c.chapterId === `c${i}`)).toBe(true);
    }
    for (let i = 1; i <= 25; i++) {
      expect(FORMULA_BANK.some(c => c.chapterId === `m${i}`)).toBe(true);
    }
  });

  it('guarantees every chapter has at least 4 comprehensive formulas (no 1-formula placeholders)', () => {
    for (const chapter of FORMULA_BANK) {
      expect(chapter.formulas.length, `Chapter ${chapter.chapterId} (${chapter.chapterName}) has < 4 formulas`).toBeGreaterThanOrEqual(4);
    }
  });

  it('renders every single formula in KaTeX with zero throw errors', () => {
    const failures: Array<{ chapter: string; title: string; formula: string; error: string }> = [];

    for (const chapter of FORMULA_BANK) {
      for (const formula of chapter.formulas) {
        try {
          katex.renderToString(formula.formula, { throwOnError: true });
        } catch (e: any) {
          failures.push({
            chapter: chapter.chapterId,
            title: formula.title,
            formula: formula.formula,
            error: e.message
          });
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('contains zero raw Unicode hacks (∆, ½, ², √, ⟹, ·, etc.) in formulas', () => {
    const unicodeRegex = /[∆½²√⟹·₁₂₃₄₅₆₇₈₉₀¹³⁴⁵⁶⁷⁸⁹⁰⁻⁺→]/;
    const violations: Array<{ chapter: string; title: string; formula: string; match: string }> = [];

    for (const chapter of FORMULA_BANK) {
      for (const formula of chapter.formulas) {
        const match = formula.formula.match(unicodeRegex);
        if (match) {
          violations.push({
            chapter: chapter.chapterId,
            title: formula.title,
            formula: formula.formula,
            match: match[0]
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('provides high-yield JEE exam tips (examNote) for every formula entry', () => {
    for (const chapter of FORMULA_BANK) {
      for (const formula of chapter.formulas) {
        expect(formula.examNote, `Formula "${formula.title}" in ${chapter.chapterId} lacks examNote`).toBeDefined();
        expect(formula.examNote?.trim().length).toBeGreaterThan(5);
      }
    }
  });

  it('contains essential JEE top-ranker forms and shortcuts', () => {
    const allFormulas = FORMULA_BANK.flatMap(c => c.formulas.map(f => f.formula)).join(' ');

    // Parabola tangent in slope form: y = mx + a/m
    expect(allFormulas).toContain(String.raw`y = mx + \frac{a}{m}`);

    // Chord of contact: T = 0
    expect(allFormulas).toContain('T = 0');

    // Pair of tangents: SS_1 = T^2
    expect(allFormulas).toContain('SS_1 = T^2');

    // Lens maker formula
    expect(allFormulas).toContain(String.raw`\frac{1}{f} = (\mu_{\text{rel}} - 1)\left(\frac{1}{R_1} - \frac{1}{R_2}\right)`);

    // Colligative properties: Delta T_b = i K_b m
    expect(allFormulas).toContain('K_b');

    // de Broglie electron shortcut: 12.27 / sqrt(V)
    expect(allFormulas).toContain('12.27');

    // Bohr model: -13.6 Z^2 / n^2
    expect(allFormulas).toContain('-13.6');
  });
});
