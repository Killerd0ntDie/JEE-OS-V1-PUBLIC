import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PageLayoutAnalyzer } from '../src/features/mockTests/services/pdf/PageLayoutAnalyzer.ts';

async function testCrops() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 2.0 });
    const layout = await PageLayoutAnalyzer.analyzePage(page, vp, 2.0);
    console.log(`\n=== Page ${p} Layout (questions detected: ${layout.questions.length}) ===`);
    for (const qb of layout.questions) {
      const fence = PageLayoutAnalyzer.computeDiagramFence(layout, qb);
      console.log(`  Q.${qb.questionNum} (col=${qb.columnIndex}): stmtY=[${Math.round(qb.statementYstart)}, ${Math.round(qb.statementYend)}], optY=[${Math.round(qb.optionsYstart || 0)}, ${Math.round(qb.optionsYend || 0)}], fenceY=[${Math.round(fence.fenceYmin)}, ${Math.round(fence.fenceYmax)}]`);
    }
  }
}

testCrops().catch(console.error);
