import { describe, it, expect } from 'vitest';
import {
  generateTestPaperHtml,
  renderRichTextToPrintHtml,
  stripTrailingOptionsFromContent
} from './testPaperHtmlGenerator';
import { MockTest } from '@/types/mockTest';

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
});
