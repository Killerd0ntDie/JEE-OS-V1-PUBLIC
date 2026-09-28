import { describe, it, expect } from 'vitest';
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PdfTextExtractor } from './PdfTextExtractor';
import { PdfLexicalParser } from '../PdfLexicalParser';
import { AnswerKeyExtractor } from './AnswerKeyExtractor';

const localDtsPath = 'C:/Users/Mani/Downloads/DTS_1.pdf';
const hasLocalDts = fs.existsSync(localDtsPath);

describe('DTS_1 Parser Test', () => {
  it.runIf(hasLocalDts)('extracts and parses all 25 questions from DTS_1.pdf', async () => {
    const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const content = await page.getTextContent();
      const sortedItems = PdfTextExtractor.sortPdfTextItems(content.items as any[], viewport.width, viewport.height);
      fullText += `\n[PAGE ${i}]\n`;
      let lastY = null;
      let curLine = '';
      for (const item of sortedItems) {
        const itemY = item.transform?.[5] ?? null;
        if (lastY !== null && itemY !== null && Math.abs(itemY - lastY) > 6.5) {
          if (curLine.trim()) fullText += curLine.trim() + '\n';
          curLine = '';
        }
        curLine += (curLine ? ' ' : '') + (item.str || '');
        if (itemY !== null) lastY = itemY;
      }
      if (curLine.trim()) fullText += curLine.trim() + '\n';
    }


    const keyData = AnswerKeyExtractor.extractGlobalAnswerKey(fullText);
    console.log('Extracted answer key:', keyData.hasKeySection, 'count =', keyData.entries.length);

    const parsed = PdfLexicalParser.parse(fullText, { subject: 'physics', answerKey: keyData } as any);
    console.log(`Parsed questions count: ${parsed.length}`);
    for (const q of parsed) {
      console.log(`=== Q${q.qNum} (${q.type}) ===`);
      console.log('CONTENT:', q.content.replace(/\s+/g, ' '));
      if (q.options && q.options.length > 0) {
        console.log('OPTIONS:', q.options.map(o => `(${o.id}) ${o.text}`).join('  |  '));
      }
    }

    expect(parsed.length).toBe(25);
    const mcqs = parsed.filter(q => q.type === 'MCQ');
    const numericals = parsed.filter(q => q.type === 'NUMERICAL');
    expect(mcqs.length).toBe(20);
    expect(numericals.length).toBe(5);
    expect(keyData.entries.length).toBe(25);
  });

  it.runIf(hasLocalDts)('correctly fences diagrams for Q3, Q20, Q23, Q25', async () => {
    const { PageLayoutAnalyzer } = await import('./PageLayoutAnalyzer');
    const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const fences: Record<number, number> = {};
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 2.0 });
      const model = await PageLayoutAnalyzer.analyzePage(page, viewport, 2.0);
      for (const q of model.questions) {
        if ([3, 20, 23, 25].includes(q.localQNum)) {
          const fence = PageLayoutAnalyzer.computeDiagramFence(q, null, viewport.height, model.answerKeyYstart);
          const span = fence.fenceYmax - fence.fenceYmin;
          fences[q.localQNum] = span;
          console.log(`Page ${p} Q${q.localQNum}: col=${q.columnIndex} stmt=[${Math.round(q.statementYstart)}..${Math.round(q.statementYend)}] gap=[${Math.round(q.diagramGapYstart)}..${Math.round(q.diagramGapYend)}] fence=[${Math.round(fence.fenceYmin)}..${Math.round(fence.fenceYmax)}] span=${Math.round(span)}`);
        }
      }
    }
    // Verify all 4 diagrams have substantial fence spans
    expect(fences[3]).toBeGreaterThan(100);
    expect(fences[20]).toBeGreaterThan(250);
    expect(fences[23]).toBeGreaterThan(200);
    expect(fences[25]).toBeGreaterThan(300);
  });
});
