import { describe, it, expect } from 'vitest';
import { PdfTextExtractor } from './PdfTextExtractor';

describe('PdfTextExtractor', () => {
  describe('healColumnMathTokens', () => {
    it('merges vertically stacked fraction numerators and denominators', () => {
      const items = [
        { str: '1', transform: [1, 0, 0, 1, 100, 200] },
        { str: '2', transform: [1, 0, 0, 1, 100, 190] }, // dy = 10, dx = 0
      ];

      const result = PdfTextExtractor.healColumnMathTokens(items);
      expect(result).toHaveLength(1);
      expect(result[0].str).toBe('1/2');
    });

    it('merges math expressions like \\sqrt{3} over 2', () => {
      const items = [
        { str: '\\sqrt{3}', transform: [1, 0, 0, 1, 150, 300] },
        { str: '2', transform: [1, 0, 0, 1, 150, 288] }, // dy = 12
      ];

      const result = PdfTextExtractor.healColumnMathTokens(items);
      expect(result).toHaveLength(1);
      expect(result[0].str).toBe('\\sqrt{3}/2');
    });

    it('does not merge horizontally disparate or vertically distant tokens', () => {
      const items = [
        { str: '1', transform: [1, 0, 0, 1, 100, 200] },
        { str: '2', transform: [1, 0, 0, 1, 150, 190] }, // dx = 50 (> 8pt threshold)
        { str: '3', transform: [1, 0, 0, 1, 100, 150] }, // dy = 50 (> 18pt threshold)
      ];

      const result = PdfTextExtractor.healColumnMathTokens(items);
      expect(result).toHaveLength(3);
    });
  });

  describe('sortPdfTextItems', () => {
    it('correctly handles 2-column layout even when right column has few items but contains question markers', () => {
      // 10 items in left column (Q16 statement)
      const leftItems = [
        { str: '16. A block is released', transform: [1, 0, 0, 1, 50, 700] },
        { str: 'from the top of an', transform: [1, 0, 0, 1, 50, 680] },
        { str: 'inclined plane of', transform: [1, 0, 0, 1, 50, 660] },
        { str: 'angle 30 degrees.', transform: [1, 0, 0, 1, 50, 640] },
        { str: '(1) 10 m/s', transform: [1, 0, 0, 1, 50, 620] },
        { str: '(2) 20 m/s', transform: [1, 0, 0, 1, 120, 620] },
        { str: '(3) 30 m/s', transform: [1, 0, 0, 1, 50, 600] },
        { str: '(4) 40 m/s', transform: [1, 0, 0, 1, 120, 600] },
      ];

      // Right column has only 3 items (e.g. because large diagram takes up space), but starts with question marker
      const rightItems = [
        { str: '19. Two bodies are having', transform: [1, 0, 0, 1, 350, 700] },
        { str: 'kinetic energies in the', transform: [1, 0, 0, 1, 350, 680] },
        { str: 'ratio 4:1.', transform: [1, 0, 0, 1, 350, 660] },
      ];

      // Interleaved items in random order
      const allItems = [...rightItems, ...leftItems];
      const sorted = PdfTextExtractor.sortPdfTextItems(allItems, 612, 792);

      // Left column items must precede right column items
      const strings = sorted.map(it => it.str);
      expect(strings[0]).toBe('16. A block is released');
      expect(strings[1]).toBe('from the top of an');
      // Verify Q16 is completely listed before Q19 starts
      const idxQ16Last = strings.indexOf('(4) 40 m/s');
      const idxQ19First = strings.indexOf('19. Two bodies are having');
      expect(idxQ16Last).toBeLessThan(idxQ19First);
    });

    it('respects pageHeight boundary so questions referencing [JEE MAIN] or PHYSICS inside content are not stripped as page headers', () => {
      const pageHeight = 792;
      const topHeaderY = pageHeight * 0.90; // ~712, in top header zone
      const questionY = pageHeight * 0.50;  // 396, middle of page

      const items = [
        // Real top running header
        { str: 'PHYSICS', transform: [1, 0, 0, 1, 50, topHeaderY] },
        { str: 'COMPETISHUN', transform: [1, 0, 0, 1, 350, topHeaderY] },
        // Left column question
        { str: '1. A particle moves in a circle', transform: [1, 0, 0, 1, 50, 600] },
        { str: 'with constant speed.', transform: [1, 0, 0, 1, 50, 580] },
        // Question in right column that happens to mention [JEE MAIN 2021] or PHYSICS
        { str: '2. [JEE MAIN 2021] In PHYSICS, work done is', transform: [1, 0, 0, 1, 350, questionY] },
        { str: 'zero when displacement is perpendicular.', transform: [1, 0, 0, 1, 350, questionY - 20] },
        { str: '(1) True', transform: [1, 0, 0, 1, 350, questionY - 40] },
        { str: '(2) False', transform: [1, 0, 0, 1, 420, questionY - 40] },
      ];

      const sorted = PdfTextExtractor.sortPdfTextItems(items, 612, pageHeight);
      const strings = sorted.map(it => it.str);

      // Top running header is at the top
      expect(strings[0]).toBe('PHYSICS');
      expect(strings[1]).toBe('COMPETISHUN');

      // Question 2 should NOT be treated as running header, and should remain intact in right column
      const q2Idx = strings.indexOf('2. [JEE MAIN 2021] In PHYSICS, work done is');
      expect(q2Idx).toBeGreaterThan(strings.indexOf('with constant speed.'));
    });
  });
});
