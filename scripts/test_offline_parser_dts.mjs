import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PdfTextExtractor } from '../src/features/mockTests/services/pdf/PdfTextExtractor.ts';
import { PdfOfflineParser } from '../src/features/mockTests/services/pdf/PdfOfflineParser.ts';

async function testOfflineParser() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();
    const sortedItems = PdfTextExtractor.sortPdfTextItems(content.items, viewport.width, viewport.height);
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

  const parsed = PdfOfflineParser.parsePaperText(fullText, 'physics');
  console.log(`Parsed questions: ${parsed.length}`);
  for (const q of parsed) {
    const num = q.questionNumber || q.localQuestionNumber;
    console.log(`\n--- Q.${num} (hasDiagram=${q.hasDiagram}) ---`);
    console.log(`Statement: ${q.question?.slice(0, 100)}`);
    console.log(`Options (${q.options?.length || 0}):`, q.options?.map(o => `${o.id}: ${o.text}`).join(' | '));
  }
}

testOfflineParser().catch(console.error);
