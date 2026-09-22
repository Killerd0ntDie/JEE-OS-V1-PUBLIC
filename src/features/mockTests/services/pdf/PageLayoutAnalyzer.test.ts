import { describe, it, expect } from 'vitest';
import { PageLayoutAnalyzer } from './PageLayoutAnalyzer';
import { TextItemCoord } from './types';

describe('PageLayoutAnalyzer', () => {
  it('groups items into visual lines within baseline tolerance', () => {
    const items: TextItemCoord[] = [
      { str: '5.', x: 20, y: 100 },
      { str: 'Which', x: 45, y: 102 }, // within 6.5px of 100
      { str: 'of', x: 90, y: 99 },
      { str: 'the', x: 110, y: 100 },
      { str: 'structure', x: 140, y: 101 },
      { str: '6.', x: 20, y: 250 },     // new line
      { str: 'For', x: 45, y: 251 }
    ];

    const lines = PageLayoutAnalyzer.groupItemsIntoLines(items);
    expect(lines.length).toBe(2);
    expect(lines[0].text).toContain('5. Which of the structure');
    expect(lines[1].text).toContain('6. For');
  });

  it('detects two-column vs single-column layouts', () => {
    const singleColItems: TextItemCoord[] = Array.from({ length: 20 }, (_, i) => ({
      str: `Text ${i}`,
      x: 50,
      y: 100 + i * 20
    }));

    const twoColItems: TextItemCoord[] = [
      ...Array.from({ length: 15 }, (_, i) => ({ str: `Left ${i}`, x: 80, y: 100 + i * 20 })),
      ...Array.from({ length: 15 }, (_, i) => ({ str: `Right ${i}`, x: 500, y: 100 + i * 20 }))
    ];

    expect(PageLayoutAnalyzer.detectColumnCount(singleColItems, 800)).toBe(1);
    expect(PageLayoutAnalyzer.detectColumnCount(twoColItems, 800)).toBe(2);
  });

  it('extracts structured QuestionBlocks and computes fence without bleed', () => {
    const lines = [
      { text: '5. Which of the following is most stable?', y: 100, anchorY: 100, minX: 20, maxX: 400, items: [] },
      { text: '(A) (B) (C) (D)', y: 180, anchorY: 180, minX: 20, maxX: 400, items: [] },
      { text: '6. For hydrazoic acid which is least stable?', y: 260, anchorY: 260, minX: 20, maxX: 400, items: [] }
    ];

    const questions = PageLayoutAnalyzer.extractQuestionBlocks(lines, [], 1000);
    expect(questions.length).toBe(2);
    expect(questions[0].questionNum).toBe(5);
    expect(questions[1].questionNum).toBe(6);

    const fence = PageLayoutAnalyzer.computeDiagramFence(questions[0], questions[1], 1000);
    // fenceYmin must be below statement descenders (+28px)
    expect(fence.fenceYmin).toBeGreaterThanOrEqual(128);
    // fenceYmax must not exceed question 6 start
    expect(fence.fenceYmax).toBeLessThanOrEqual(260);
  });
});
