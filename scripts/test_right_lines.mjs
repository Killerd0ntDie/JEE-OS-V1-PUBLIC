import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PageLayoutAnalyzer } from '../src/features/mockTests/services/pdf/PageLayoutAnalyzer.ts';

async function testRightLines() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(4);
  const vp = page.getViewport({ scale: 2.0 });
  const layout = await PageLayoutAnalyzer.analyzePage(page, vp, 2.0);

  console.log('Page 4 columnCount:', layout.columnCount);
  console.log('Page 4 gutter:', layout.columnGutterX);

  const tc = await page.getTextContent();
  const items = tc.items.map(it => {
    const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    return { str: it.str, x, y, width: (it.width || 0) * 2.0, height: (it.height || 0) * 2.0 };
  });

  const midX = layout.columnGutterX || vp.width / 2;
  const rightItems = items.filter(it => it.x > midX);
  const rightLines = PageLayoutAnalyzer.groupItemsIntoLines(rightItems);
  console.log('Page 4 right lines:');
  for (const l of rightLines) {
    console.log(`  y=${Math.round(l.y)}: "${l.text}"`);
  }
}

testRightLines().catch(console.error);
