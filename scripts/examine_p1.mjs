import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function examinePage1() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/1. P-11.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page1 = await doc.getPage(1);
  const tc1 = await page1.getTextContent();
  const sorted = tc1.items.filter(it => it.str && it.str.trim()).sort((a,b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
  for (const it of sorted.slice(0, 60)) {
    console.log(`x=${Math.round(it.transform[4])}, y=${Math.round(it.transform[5])}, font=${it.fontName}, str=${JSON.stringify(it.str)}`);
  }
}
examinePage1().catch(console.error);
