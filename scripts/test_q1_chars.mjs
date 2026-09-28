import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testQ1Chars() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();

  console.log('Q.1 items on Page 1:');
  for (const it of tc.items) {
    if (it.transform[5] >= 600 && it.transform[5] <= 700 && it.transform[4] < 300) {
      console.log(`x=${Math.round(it.transform[4])}, y=${Math.round(it.transform[5])}, font=${it.fontName}, str=${JSON.stringify(it.str)}, codes=${it.str.split('').map(c => c.charCodeAt(0))}`);
    }
  }
}

testQ1Chars().catch(console.error);
