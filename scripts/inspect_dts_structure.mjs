import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function p3() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(3);
  const tc = await page.getTextContent();
  const sorted = tc.items.filter(it => it.str.trim()).sort((a,b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
  console.log('=== Page 3 Column 1 items (x < 300) ===');
  for (const it of sorted) {
    if (it.transform[4] < 300) {
      console.log(`x=${Math.round(it.transform[4])}, y=${Math.round(it.transform[5])}: ${JSON.stringify(it.str)}`);
    }
  }
}
p3().catch(console.error);
