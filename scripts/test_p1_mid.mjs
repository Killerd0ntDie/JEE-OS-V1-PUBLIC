import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testP1Mid() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 2.0 });
  const tc = await page.getTextContent();
  const items = tc.items.map(it => {
    const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    return { str: it.str, x, y, width: (it.width || 0) * 2.0 };
  });

  const mid = items.filter(it => it.x >= 450 && it.x <= 650);
  console.log(`Page 1 items between 450 and 650:`);
  for (const it of mid) {
    console.log(`  x=${Math.round(it.x)}..${Math.round(it.x + it.width)}, y=${Math.round(it.y)}: "${it.str}"`);
  }
}

testP1Mid().catch(console.error);
