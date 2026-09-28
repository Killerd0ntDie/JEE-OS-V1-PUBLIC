import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PageLayoutAnalyzer } from '../src/features/mockTests/services/pdf/PageLayoutAnalyzer.ts';

async function testP4() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(4);
  const vp = page.getViewport({ scale: 2.0 });
  const tc = await page.getTextContent();
  const items = tc.items.map(it => {
    const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    return { str: it.str, x, y, width: (it.width || 0) * 2.0, height: (it.height || 0) * 2.0 };
  });

  const lines = PageLayoutAnalyzer.groupItemsIntoLines(items);
  console.log('Page 4 lines:');
  for (const l of lines) {
    if (l.y > 1000) {
      console.log(`  y=${Math.round(l.y)}: "${l.text}"`);
    }
  }

  const akY = PageLayoutAnalyzer.detectAnswerKeyYstart(lines);
  console.log('detectAnswerKeyYstart on Page 4 lines:', akY);
}

testP4().catch(console.error);
