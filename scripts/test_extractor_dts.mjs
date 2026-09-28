import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PdfTextExtractor } from '../src/features/mockTests/services/pdf/PdfTextExtractor.ts';

async function testExtraction() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();
    const sorted = PdfTextExtractor.sortPdfTextItems(content.items, vp.width, vp.height);

    console.log(`\n=== Page ${p} sorted items (${sorted.length}) ===`);
    // Find all question numbers in order
    const qFound = [];
    for (const it of sorted) {
      const m = (it.str || '').trim().match(/^(\d{1,2})[\.:\)]/);
      if (m && parseInt(m[1]) <= 25) {
        qFound.push(m[1]);
      }
    }
    console.log(`Page ${p} questions in extracted reading order:`, [...new Set(qFound)].join(', '));
  }
}

testExtraction().catch(console.error);
