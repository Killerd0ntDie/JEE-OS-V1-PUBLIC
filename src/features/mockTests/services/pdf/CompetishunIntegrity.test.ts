import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { PdfOfflineParser } from './PdfOfflineParser';
import { PdfTextExtractor } from './PdfTextExtractor';
import { AnswerKeyExtractor } from './AnswerKeyExtractor';
import { StructuralIntegrityValidator } from './StructuralIntegrityValidator';

describe('Competishun Physics DPP #1 Full Integrity Test', () => {
  const pdfPath = 'C:/Users/Mani/.gemini/antigravity/brain/bd240573-8571-4e30-bf9d-d4467213cce7/.user_uploaded/media_1789841062216.pdf';

  it('correctly extracts, parses, and validates all 25 questions with high integrity', async () => {
    if (!fs.existsSync(pdfPath)) {
      console.warn('Test PDF not found, skipping live PDF integration test.');
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfjsLib = await PdfTextExtractor.getPdfJs();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    expect(pdf.numPages).toBe(4);

    let rawText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const content = await page.getTextContent();
      if (i === 1) {
        console.log('=== PAGE 1 Q8 CANDIDATE ITEMS ===');
        console.log(content.items.filter((it: any) => /body covers|velocity of|average velocity|\bm\/s\b/.test(it.str) || (it.transform[4] <= 300 && it.transform[5] <= 450 && it.transform[5] >= 200)).map((it: any) => ({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) })));
      }
      if (i === 4) {
        console.log('=== PAGE 4 ANSWER KEY CANDIDATE ITEMS ===');
        console.log(content.items.filter((it: any) => /1\.|\(2\)|21\.|25\./.test(it.str)).map((it: any) => ({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) })));
      }
      const sortedItems = PdfTextExtractor.sortPdfTextItems(content.items as any[], viewport.width);

      let lastY: number | null = null;
      let curLine = '';
      for (const item of sortedItems) {
        const itemY = item.transform?.[5] ?? null;
        if (lastY !== null && itemY !== null && Math.abs(itemY - lastY) > 6.5) {
          if (curLine.trim()) {
            rawText += curLine.trim() + '\n';
          }
          curLine = '';
        }
        curLine += (curLine ? ' ' : '') + (item.str || '');
        if (itemY !== null) {
          lastY = itemY;
        }
      }
      if (curLine.trim()) {
        rawText += curLine.trim() + '\n';
      }
      rawText += '\n';
    }

    expect(rawText.length).toBeGreaterThan(1000);

    console.log('=== TAIL OF RAW TEXT (LAST 800 CHARS) ===');
    console.log(rawText.substring(rawText.length - 800));

    // 1. Answer Key Extraction (should find all 25 answers without stripping (1)-(4))
    const keyData = AnswerKeyExtractor.extractGlobalAnswerKey(rawText);
    expect(keyData.hasKeySection).toBe(true);
    console.log('=== KEY DATA ENTRIES ===', keyData.entries.map(e => ({ q: e.qNum, a: e.normalizedAns })));
    expect(keyData.entries.length).toBe(25);

    // Verify answers for Q1-Q5 are preserved
    expect(keyData.lookup(0, 1)?.normalizedAns).toBe('1'); // (2) -> B -> '1'
    expect(keyData.lookup(1, 2)?.normalizedAns).toBe('3'); // (4) -> D -> '3'

    // 2. Deterministic Heuristic Parsing (Brain 1)
    const q17Idx = rawText.indexOf('17.');
    console.log('=== RAW TEXT FROM Q17 TO Q20 ===');
    console.log(rawText.substring(q17Idx, q17Idx + 800));

    console.log('=== EXACT RAW TEXT OF Q8 ===\n', rawText.substring(rawText.indexOf('8.'), rawText.indexOf('9.')));
    console.log('=== EXACT RAW TEXT OF Q12 ===\n', rawText.substring(rawText.indexOf('12.'), rawText.indexOf('13.')));
    console.log('=== EXACT RAW TEXT OF Q16 ===\n', rawText.substring(rawText.indexOf('16.'), rawText.indexOf('17.')));

    const questions = PdfOfflineParser.parsePaperTextHeuristic(rawText, 'physics');
    console.log('=== 26 PARSED QUESTIONS ===', questions.map((q: any, i: number) => `[${i+1}] Q${q.qNumber || q.localQuestionNumber}: ${q.content?.substring(0, 45)}...`));
    expect(questions.length).toBe(25);

    for (const qNum of [8, 12, 15, 16, 22]) {
      const q = questions[qNum - 1];
      console.log(`\n=================== QUESTION ${qNum} ===================`);
      console.log('CONTENT:\n', q?.content);
      console.log('OPTIONS:\n', q?.options);
    }

    // Apply extracted answer key to questions
    questions.forEach((q: any, idx: number) => {
      const keyLookup = keyData.lookup(idx, idx + 1);
      if (keyLookup) {
        q.correctAnswer = keyLookup.normalizedAns;
        if (keyLookup.isNumerical) q.type = 'NUMERICAL';
      }
    });

    // 3. Structural Integrity Validator
    const report = StructuralIntegrityValidator.validatePaper(questions, {
      rawText,
      expectedCount: 25,
      totalPages: 4
    });

    console.log('=== STRUCTURAL INTEGRITY REPORT ===');
    console.log('Valid:', report.isValid);
    console.log('Score:', report.integrityScore);
    console.log('Invariants:', report.invariants);
    console.log('Issues:', report.issues);
    console.log('Details:', report.details);
    console.log('Failed Pages:', report.failedPages);

    // Regression Assertions for User Reported Issues:
    // 1. Q15 Option D must be free of institutional footer / coaching address
    const q15OptD = questions[14]?.options?.find((o: any) => o.id === 'D')?.text || '';
    expect(q15OptD).not.toMatch(/OFFICE\s+ADDRESS|Plot\s+Number|Gopalpura|PAGE\s*#|BATCH/i);
    expect(q15OptD).toBe('A – 3 Bt –2');

    // 2. Q22 Content must be free of institutional footer / coaching address
    const q22Content = questions[21]?.content || '';
    expect(q22Content).not.toMatch(/OFFICE\s+ADDRESS|Plot\s+Number|Gopalpura|PAGE\s*#|BATCH/i);
    expect(q22Content).toContain('What will be the displacement from initial\npoint?');

    // 3. Q12 Options must have PUA symbols mapped and swallowed options repaired
    const q12Opts = questions[11]?.options || [];
    expect(q12Opts.length).toBe(4);
    for (const opt of q12Opts) {
      expect(opt.text).not.toMatch(/[\uF020-\uF0FF]/u); // No unmapped Adobe Symbol PUA codepoints
      expect(opt.text).not.toBe('Option (B)');
      expect(opt.text).not.toBe('Option (D)');
    }

    // 4. Q16 Options must have Adobe Symbol Font brackets and minus mapped without tofu boxes
    const q16Opts = questions[15]?.options || [];
    expect(q16Opts.length).toBe(4);
    for (const opt of q16Opts) {
      expect(opt.text).not.toMatch(/[\uF020-\uF0FF]/u); // No unmapped Adobe Symbol PUA codepoints
    }

    // 5. Structural Integrity Validator accurately catches failure modes to trigger Vision AI:
    // - Bare unit or placeholder options on Q8, Q11, Q16
    // - Figure references on Q2, Q3, Q20
    // - 0 column bleed / footer contamination (Q15 and Q22 are completely clean)
    expect(report.isValid).toBe(false);
    expect(report.invariants.countPassed).toBe(true);
    expect(report.invariants.sequencePassed).toBe(true);
    expect(report.invariants.columnBleedPassed).toBe(true);
    expect(report.details.columnBleedQuestions).toEqual([]);
    expect(report.details.malformedOptionQuestions).toEqual([8, 11, 16]);
    expect(report.details.suspiciousDiagramQuestions).toEqual([2, 3, 20]);
    expect(report.failedPages).toContain(1);
    expect(report.failedPages).toContain(2);
    expect(report.failedPages).toContain(3);
    expect(report.failedPages).toContain(4);
  }, 15000);
});
