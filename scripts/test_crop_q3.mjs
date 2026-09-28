import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PageLayoutAnalyzer } from '../src/features/mockTests/services/pdf/PageLayoutAnalyzer.ts';
import { DiagramCropperEngine } from '../src/features/mockTests/services/pdf/DiagramCropperEngine.ts';
import { createCanvas } from 'canvas';

async function testQ3() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 2.0 });

  const canvas = createCanvas(vp.width, vp.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  const layout = await PageLayoutAnalyzer.analyzePage(page, vp, 2.0);
  console.log('Layout questions on Page 1:');
  for (const q of layout.questions) {
    console.log(`  Q.${q.questionNum}: col=${q.columnIndex}, stmt=[${Math.round(q.statementYstart)}..${Math.round(q.statementYend)}], opt=[${Math.round(q.optionsYstart||0)}..${Math.round(q.optionsYend||0)}]`);
  }

  // Let's test findQuestionBlock for Q.3
  const block = PageLayoutAnalyzer.findQuestionBlock(layout, 3, 3, 'A car starts from P');
  console.log('Found block for Q.3:', block ? `Q.${block.questionNum} col=${block.columnIndex}` : 'NONE');

  if (block) {
    const fence = PageLayoutAnalyzer.computeDiagramFence(block, null, vp.height, layout.answerKeyYstart);
    console.log('Fence for Q.3:', fence);
    const rect = DiagramCropperEngine.detectCropRect(
      canvas,
      layout,
      block,
      undefined,
      undefined,
      { fenceYmin: fence.fenceYmin, fenceYmax: fence.fenceYmax }
    );
    console.log('Detected crop rect for Q.3:', rect);
  }
}

testQ3().catch(console.error);
