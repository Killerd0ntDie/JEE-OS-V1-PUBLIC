import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function examine() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  console.log('numPages:', doc.numPages);
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    console.log(`Page ${p}: ${tc.items.length} items`);
    // Sample first 15 items
    const sample = tc.items.slice(0, 20).map(it => it.str).join(' ');
    console.log(`  Sample: ${sample}`);
  }
}

examine().catch(console.error);
