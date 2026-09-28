import { describe, it, expect } from 'vitest';
import { PageLayoutAnalyzer } from './PageLayoutAnalyzer';
import { TextItemCoord, PageLayoutModel, QuestionBlock } from './types';

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
    // fenceYmin must be below statement descenders (starts >= 106)
    expect(fence.fenceYmin).toBeGreaterThanOrEqual(106);
    // fenceYmax must not exceed question 6 start
    expect(fence.fenceYmax).toBeLessThanOrEqual(260);
  });

  it('expands multi-line physics problem statements past 160px up to 350px (R2)', () => {
    // 9 consecutive lines spaced 25px apart, spanning 200px total
    const lines = [
      { text: '34. A body of mass 50 kg is lifted to a height', y: 100, anchorY: 100, minX: 20, maxX: 400, items: [] },
      { text: 'of 20 m from the ground in the two different', y: 125, anchorY: 125, minX: 20, maxX: 400, items: [] },
      { text: 'ways as shown in the figures. The ratio of work', y: 150, anchorY: 150, minX: 20, maxX: 400, items: [] },
      { text: 'done against the gravity in both the respective', y: 175, anchorY: 175, minX: 20, maxX: 400, items: [] },
      { text: 'cases, will be: (Take g = 10 m/s^2).', y: 200, anchorY: 200, minX: 20, maxX: 400, items: [] },
      { text: 'The incline angle for case two is 30 degrees', y: 225, anchorY: 225, minX: 20, maxX: 400, items: [] },
      { text: 'and the vertical height remains exactly 20 m.', y: 250, anchorY: 250, minX: 20, maxX: 400, items: [] },
      { text: 'Determine the mechanical work in both scenarios:', y: 275, anchorY: 275, minX: 20, maxX: 400, items: [] },
      { text: '[JEE MAIN 050424_S1]', y: 300, anchorY: 300, minX: 20, maxX: 400, items: [] },
      { text: '(A) 1 : 1', y: 480, anchorY: 480, minX: 20, maxX: 200, items: [] }
    ];

    const questions = PageLayoutAnalyzer.extractQuestionBlocks(lines, [], 1000);
    expect(questions.length).toBe(1);
    expect(questions[0].questionNum).toBe(34);
    // All 9 lines of question statement must be incorporated without cutting off at y=260
    expect(questions[0].statementText).toContain('JEE MAIN 050424_S1');
    expect(questions[0].statementYend).toBeGreaterThanOrEqual(305);
    // Diagram fence must start AFTER the entire statement (at >= 305 + 2 = 307)
    const fence = PageLayoutAnalyzer.computeDiagramFence(questions[0], null, 1000);
    expect(fence.fenceYmin).toBeGreaterThanOrEqual(307);
  });

  it('calculates adaptive column gutter using text density valley detection (Phase 3 - R9)', () => {
    // Asymmetric two-column page: Left column x = 50..420, Right column x = 510..950, width = 1000
    // Valley is between 420 and 510, centered ~465
    const leftItems: TextItemCoord[] = Array.from({ length: 20 }, (_, i) => ({
      str: `Left ${i}`,
      x: 50 + (i % 5) * 70, // 50 to 330
      y: 100 + i * 20
    }));

    const rightItems: TextItemCoord[] = Array.from({ length: 20 }, (_, i) => ({
      str: `Right ${i}`,
      x: 520 + (i % 5) * 80, // 520 to 840
      y: 100 + i * 20
    }));

    const items = [...leftItems, ...rightItems];
    const gutterX = PageLayoutAnalyzer.findColumnGutter(items, 1000);

    // Gutter must be between left text bounds and right text bounds
    expect(gutterX).toBeGreaterThanOrEqual(400);
    expect(gutterX).toBeLessThanOrEqual(530);

    // Fallback on sparse items (< 15 items returns exact width / 2)
    expect(PageLayoutAnalyzer.findColumnGutter(items.slice(0, 5), 1000)).toBe(500);
  });

  it('does not treat numbered options (1), (2), (3), (4) or bare option labels as questions', () => {
    const lines = [
      { text: '1. A particle moves along x-axis with velocity v.', y: 100, anchorY: 100, minX: 20, maxX: 400, items: [] },
      { text: '(1) 12 m/s', y: 160, anchorY: 160, minX: 20, maxX: 200, items: [] },
      { text: '(2) 24 m/s', y: 185, anchorY: 185, minX: 20, maxX: 200, items: [] },
      { text: '(3) 36 m/s', y: 210, anchorY: 210, minX: 20, maxX: 200, items: [] },
      { text: '(4) 48 m/s', y: 235, anchorY: 235, minX: 20, maxX: 200, items: [] },
      { text: '2. The work done by conservative force in closed loop is:', y: 300, anchorY: 300, minX: 20, maxX: 400, items: [] },
      { text: '(1) zero (2) positive', y: 340, anchorY: 340, minX: 20, maxX: 400, items: [] },
      { text: '(3) negative (4) infinite', y: 365, anchorY: 365, minX: 20, maxX: 400, items: [] }
    ];

    const questions = PageLayoutAnalyzer.extractQuestionBlocks(lines, [], 1000);
    // There must be EXACTLY 2 questions, NOT 6 or 10!
    expect(questions.length).toBe(2);
    expect(questions[0].questionNum).toBe(1);
    expect(questions[1].questionNum).toBe(2);
    expect(questions[0].optionsYstart).toBe(160);
    expect(questions[1].optionsYstart).toBe(340);
  });

  it('supports vector/math accents preceding question numbers without dropping them', () => {
    const lines = [
      { text: 'Q.48 A block of mass m is attached to a spring.', y: 100, anchorY: 100, minX: 20, maxX: 400, items: [] },
      { text: '^49. Two solids A and B of very large mass', y: 280, anchorY: 280, minX: 20, maxX: 400, items: [] }
    ];

    const questions = PageLayoutAnalyzer.extractQuestionBlocks(lines, [], 1000);
    expect(questions.length).toBe(2);
    expect(questions[0].questionNum).toBe(48);
    expect(questions[1].questionNum).toBe(49);
  });

  it('computeDiagramFence guarantees at least 24px clearance above the next question statement to avoid font ascender bleed', () => {
    const q1: QuestionBlock = {
      questionNum: 48,
      localQNum: 48,
      lineIndex: 0,
      statementYstart: 100,
      statementYend: 140,
      diagramGapYstart: 140,
      diagramGapYend: 435,
      contentXmin: 50,
      contentXmax: 400,
      statementText: '48. Spring problem'
    };

    const q2: QuestionBlock = {
      questionNum: 49,
      localQNum: 49,
      lineIndex: 1,
      statementYstart: 459, // Baseline of next question statement
      statementYend: 485,
      diagramGapYstart: 485,
      diagramGapYend: 700,
      contentXmin: 50,
      contentXmax: 400,
      statementText: '49. Two solids A and B'
    };

    const fence = PageLayoutAnalyzer.computeDiagramFence(q1, q2, 1000);
    // Next question statement at 459 must have at least 24px clearance (<= 435)
    expect(fence.fenceYmax).toBeLessThanOrEqual(435);
  });

  it('findQuestionBlock prioritizes exact printed number match over index fallback', () => {
    const mockModel: PageLayoutModel = {
      pageNum: 2,
      viewportWidth: 800,
      viewportHeight: 1000,
      scale: 1,
      headerHeight: 0,
      footerHeight: 1000,
      columnCount: 1,
      lines: [],
      sections: [],
      questions: [
        { questionNum: 10, localQNum: 10, lineIndex: 0, statementYstart: 100, statementYend: 120, diagramGapYstart: 120, diagramGapYend: 200, contentXmin: 50, contentXmax: 300, statementText: '10. Text 10' },
        { questionNum: 11, localQNum: 11, lineIndex: 1, statementYstart: 200, statementYend: 220, diagramGapYstart: 220, diagramGapYend: 300, contentXmin: 50, contentXmax: 300, statementText: '11. Text 11' },
        { questionNum: 12, localQNum: 12, lineIndex: 2, statementYstart: 300, statementYend: 320, diagramGapYstart: 320, diagramGapYend: 400, contentXmin: 50, contentXmax: 300, statementText: '12. Text 12' }
      ]
    };

    // Searching for question 12 should return questionNum: 12, NOT model.questions[0] (which is question 10)
    const block = PageLayoutAnalyzer.findQuestionBlock(mockModel, 12, 12);
    expect(block).not.toBeNull();
    expect(block?.questionNum).toBe(12);

    // Searching for an unindexed number should not blindly pick questions[localQNum - 1] if numbers mismatch
    const nonexistent = PageLayoutAnalyzer.findQuestionBlock(mockModel, 1, 1);
    expect(nonexistent).toBeNull();
  });

  it('detectAnswerKeyYstart accurately identifies answer key headers and answer grid rows', () => {
    const lines = [
      { text: '50. The value of current in the circuit is', y: 500, anchorY: 500, minX: 50, maxX: 400, items: [] },
      { text: 'ANSWER KEY', y: 750, anchorY: 750, minX: 100, maxX: 300, items: [] },
      { text: '1. (1) 2. (3) 3. (2) 4. (4)', y: 800, anchorY: 800, minX: 50, maxX: 500, items: [] }
    ];

    const answerKeyY = PageLayoutAnalyzer.detectAnswerKeyYstart(lines);
    expect(answerKeyY).toBe(750);
  });

  it('computeDiagramFence strictly clamps bottomLimit above answerKeyYstart to protect Q50', () => {
    const q50: QuestionBlock = {
      questionNum: 50,
      localQNum: 50,
      lineIndex: 0,
      statementYstart: 400,
      statementYend: 440,
      diagramGapYstart: 440,
      diagramGapYend: 680,
      contentXmin: 50,
      contentXmax: 400,
      statementText: '50. The value of current in the circuit is'
    };

    // Answer key starts at y = 700. Diagram fence must stop at or above 700 - 20 = 680
    const fence = PageLayoutAnalyzer.computeDiagramFence(q50, null, 1000, 700);
    expect(fence.fenceYmax).toBeLessThanOrEqual(680);
    expect(fence.fenceYmin).toBe(442);
  });
});


