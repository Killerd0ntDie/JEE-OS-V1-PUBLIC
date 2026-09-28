import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PageLayoutAnalyzer } from '../src/features/mockTests/services/pdf/PageLayoutAnalyzer.ts';

async function testQ20() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(3);
  const vp = page.getViewport({ scale: 2.0 });

  const layout = await PageLayoutAnalyzer.analyzePage(page, vp, 2.0);
  console.log('Layout questions on Page 3:');
  for (const q of layout.questions) {
    console.log(`  Q.${q.questionNum}: col=${q.columnIndex}, stmt=[${Math.round(q.statementYstart)}..${Math.round(q.statementYend)}], opt=[${Math.round(q.optionsYstart||0)}..${Math.round(q.optionsYend||0)}]`);
  }

  const block = PageLayoutAnalyzer.findQuestionBlock(layout, 20, 20, 'A particle travels from A to B path shown in figure');
  console.log('Found block for Q.20:', block ? `Q.${block.questionNum} col=${block.columnIndex}` : 'NONE');

  if (block) {
    const fence = PageLayoutAnalyzer.computeDiagramFence(block, null, vp.height, layout.answerKeyYstart);
    console.log('Fence for Q.20:', fence);
  }
}

testQ20().catch(console.error);
