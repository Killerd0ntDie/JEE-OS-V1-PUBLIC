import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PdfTextExtractor } from '../src/features/mockTests/services/pdf/PdfTextExtractor.ts';

async function testExtract() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/DTS_1.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const rawText = await PdfTextExtractor.extractAllPages(doc);
  console.log('Extracted rawText length:', rawText.length);

  // Let's write rawText to a file to examine it
  fs.writeFileSync('scripts/dts_extracted_raw.txt', rawText);
  console.log('Wrote rawText to scripts/dts_extracted_raw.txt');
}

testExtract().catch(console.error);
