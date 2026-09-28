import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testQ3Items() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 2.0 });
  const tc = await page.getTextContent();
  const items = tc.items.map(it => {
    const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    return { str: it.str, x, y };
  }).filter(it => it.x < 595 && it.y >= 1000 && it.y <= 1550)
    .sort((a,b) => a.y - b.y || a.x - b.x);

  console.log('Q.3 items on Page 1:');
  for (const it of items) {
    console.log(`  x=${Math.round(it.x)}, y=${Math.round(it.y)}: "${it.str}"`);
  }
}

testQ3Items().catch(console.error);
