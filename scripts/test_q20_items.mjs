import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testQ20Items() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(3);
  const vp = page.getViewport({ scale: 2.0 });
  const tc = await page.getTextContent();
  const items = tc.items.map(it => {
    const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    return { str: it.str, x, y };
  }).filter(it => it.x >= 595 && it.y >= 450 && it.y <= 1100)
    .sort((a,b) => a.y - b.y || a.x - b.x);

  console.log('Q.20 items on Page 3:');
  for (const it of items) {
    console.log(`  x=${Math.round(it.x)}, y=${Math.round(it.y)}: "${it.str}"`);
  }
}

testQ20Items().catch(console.error);
