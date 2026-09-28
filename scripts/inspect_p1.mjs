import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PageLayoutAnalyzer } from '../src/features/mockTests/services/pdf/PageLayoutAnalyzer.ts';

async function testP1() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 2.0 });
  const layout = await PageLayoutAnalyzer.analyzePage(page, vp, 2.0);
  console.log('Page 1 columnCount:', layout.columnCount);
  console.log('Page 1 columnGutterX:', layout.columnGutterX);
  console.log('Page 1 questions count:', layout.questions.length);
  for (const q of layout.questions) {
    console.log(`  Q.${q.questionNum}: col=${q.columnIndex}, y=${Math.round(q.statementYstart)}: "${q.statementText.slice(0, 50)}"`);
  }
}

testP1().catch(console.error);
