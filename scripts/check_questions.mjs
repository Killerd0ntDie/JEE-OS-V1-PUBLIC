import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PdfTextExtractor } from '../src/features/mockTests/services/pdf/PdfTextExtractor.js';
import { areQuestionsDuplicate } from '../src/features/mockTests/utils/testPaperHtmlGenerator.js';

async function testAreQuestionsDuplicate() {
  const buf = fs.readFileSync('C:/Users/Mani/Downloads/1. P-11.pdf');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pageTexts = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    const tc = await page.getTextContent();
    const sorted = PdfTextExtractor.sortPdfTextItems(tc.items, viewport.width, viewport.height);
    pageTexts.push(sorted.map(it => it.str).join(' '));
  }
  const fullText = pageTexts.join('\n\n');

  // Regex to extract all 50 questions
  const questions = [];
  for (let q = 1; q <= 50; q++) {
    const nextQ = q + 1;
    // Regex for question q
    const qPattern = new RegExp(`(?:^|\\s)(?:Q\\.?\\s*${q}\\.?|${q}\\.)\\s+([\\s\\S]+?)(?=(?:(?:^|\\s)(?:Q\\.?\\s*\\d+\\.?|\\d+\\.)\\s+)|ANSWER|PAGE|$)`, 'i');
    const m = fullText.match(qPattern);
    if (m) {
      questions.push({
        num: q,
        content: m[1].trim()
      });
    } else {
      console.log(`Failed to match Q.${q}`);
    }
  }

  console.log(`Successfully matched ${questions.length} questions.`);

  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const qA = questions[i];
      const qB = questions[j];
      if (areQuestionsDuplicate(qA, qB)) {
        console.log(`FALSE DUPLICATE: Q.${qA.num} matched Q.${qB.num}!`);
        console.log(`  Q.${qA.num}: ${qA.content.slice(0, 70)}`);
        console.log(`  Q.${qB.num}: ${qB.content.slice(0, 70)}`);
      }
    }
  }
}
testAreQuestionsDuplicate().catch(console.error);
