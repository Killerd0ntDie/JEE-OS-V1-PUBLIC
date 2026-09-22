import katex from 'katex';
import { MockTest } from '@/types/mockTest';
import { normalizeMathDelimiters, parseExplanationSections } from '@/components/MathRenderer';

export interface GeneratePaperHtmlOptions {
  printMode?: 'QUESTION_PAPER' | 'SOLUTIONS' | 'COMPLETE';
  fontSize?: 'sm' | 'base';
  showInstructions?: boolean;
  showRoughWorkMargin?: boolean;
}

/**
 * Escapes HTML characters in raw text while preserving math and structure.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renders LaTeX math into pure HTML using KaTeX without MathML,
 * permanently preventing text duplication (e.g. 'NO3-NO3-').
 */
function renderMathToHtml(mathStr: string, displayMode = false): string {
  try {
    return katex.renderToString(mathStr, {
      displayMode,
      output: 'html', // PURE HTML ONLY — zero MathML elements emitted
      throwOnError: false
    });
  } catch (_err) {
    return `<code class="math-fallback">${escapeHtml(mathStr)}</code>`;
  }
}

/**
 * Converts markdown inline styling (**bold**, *italic*) to HTML.
 */
function formatMarkdownInline(text: string): string {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return `<em>${escapeHtml(part.slice(1, -1))}</em>`;
    }
    return escapeHtml(part);
  }).join('');
}

/**
 * Renders a single line of text, handling inline SVGs, display math, inline math, and markdown.
 */
function renderSingleLineToHtml(rawLine: string): string {
  const line = normalizeMathDelimiters(rawLine).replace(/\\\$/g, '$');

  // 1. Native inline SVG diagrams
  if (line.includes('<svg') && line.includes('</svg>')) {
    const svgMatch = line.match(/(<svg[\s\S]*?<\/svg>)/i);
    if (svgMatch) {
      const before = line.substring(0, svgMatch.index).trim();
      const svgCode = svgMatch[1];
      const after = line.substring(svgMatch.index! + svgCode.length).trim();
      return `
        <div class="diagram-wrapper">
          ${before ? `<div class="diagram-caption">${renderSingleLineToHtml(before)}</div>` : ''}
          <div class="diagram-svg">${svgCode}</div>
          ${after ? `<div class="diagram-caption">${renderSingleLineToHtml(after)}</div>` : ''}
        </div>
      `;
    }
  }

  // 2. KaTeX matrix blocks
  if ((line.includes('\\begin{matrix}') || line.includes('\\begin{array}')) && !line.includes('$$')) {
    return `<div class="math-display">${renderMathToHtml(line, true)}</div>`;
  }

  // 3. Math containing $$...$$ or $...$
  if (line.includes('$')) {
    const parts = line.split(/(\$\$.*?\$\$|\$.*?\$)/g);
    return parts.map(part => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return `<div class="math-display">${renderMathToHtml(part.slice(2, -2), true)}</div>`;
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return `<span class="math-inline">${renderMathToHtml(part.slice(1, -1), false)}</span>`;
      }
      return formatMarkdownInline(part);
    }).join('');
  }

  // 4. Raw LaTeX heuristics
  const hasRawLatex = /\\[a-zA-Z]+|\{.*?\}/.test(line);
  if (hasRawLatex) {
    const words = line.split(/\s+/);
    const isChemicalOrResonanceLine = /\\text\{[^{}]+\}[^\n]*(?:\\longrightarrow|\\rightarrow|\\leftrightarrow|\\longleftrightarrow|\\rightleftharpoons|\\equiv)/.test(line) &&
      !/\b(which|following|resonating|structure|acid|calculate|find)\b/i.test(line);
    const isPureMath = isChemicalOrResonanceLine || words.length <= 4 ||
      (/^[\\a-zA-Z0-9_\^\+\-\*\/\=\(\)\{\}\s]+$/.test(line) && !/[a-z]{4,}/i.test(line.replace(/\\[a-zA-Z]+/g, '')));

    if (isPureMath) {
      return `<span class="math-inline">${renderMathToHtml(line, false)}</span>`;
    }
  }

  return formatMarkdownInline(line);
}

/**
 * Renders rich text (questions, options, explanations) into clean semantic HTML.
 */
export function renderRichTextToPrintHtml(
  content: string | undefined | null,
  optIndex?: number,
  questionContent?: string
): string {
  if (!content) return '';

  let cleanContent = content
    .replace(/\r/g, '')
    .replace(/\\longr\\rightarrow/g, '\\longrightarrow')
    .replace(/(?<![a-zA-Z\\])ightarrow\b/g, '\\rightarrow')
    .replace(/\\n(?![a-zA-Z])/g, '\n')
    .replace(/\\r(?![a-zA-Z])/g, '')
    .replace(/\\q?quad\s*(?=\([ivxlcdm\d]+\))/gi, '\n')
    .replace(/\\q?quad\s*/gi, '   ')
    .replace(/^(?:PART\s*[-–]\s*[IVX\d]+(?:\s*[:.\-]?\s*[^\n]+)?\n*)/i, '')
    .replace(/^\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\]\)]*\s*/i, '')
    .replace(/^\]\s*/, '')
    .trim();

  // Defensively heal options that lost their leading "(A)" due to historical stripping e.g. ", (C), (D)" -> "(A), (C), (D)"
  if (optIndex !== undefined && /^,\s*(?:\([A-Da-d1-4]\)|[A-Da-d1-4]\b)/i.test(cleanContent)) {
    cleanContent = `(A)${cleanContent}`;
  }


  if (cleanContent.includes('<svg')) {
    cleanContent = cleanContent.replace(/<svg[\s\S]*?<\/svg>/gi, (svgBlock) => {
      return svgBlock.replace(/\r?\n\s*/g, ' ');
    });
  }

  const lines = cleanContent.split('\n');
  return lines
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<div class="rich-line">${renderSingleLineToHtml(line)}</div>`)
    .join('');
}

/**
 * Strips duplicate option listings from question content when options are rendered separately.
 */
export function stripTrailingOptionsFromContent(content: string, options?: string[]): string {
  if (!content || !options || options.length === 0) return content;

  // Check if content has trailing option block like (A) ... (B) ... (C) ... (D)
  const optionBlockMatch = content.match(/(?:\n|\r|\s{2,})(?:\(?A\)|\(?1\)|\bA\.)\s+[\s\S]*$/i);
  if (optionBlockMatch && optionBlockMatch.index && optionBlockMatch.index > 10) {
    const candidateBody = content.substring(0, optionBlockMatch.index).trim();
    if (candidateBody.length >= 10) {
      return candidateBody;
    }
  }

  return content;
}

function getOptionLetter(idx: number): string {
  return String.fromCharCode(65 + idx);
}

function formatKeyForDisplay(ans: string | undefined, type: string): string {
  if (!ans) return '-';
  const trimmed = ans.trim();
  if (type === 'NUMERICAL') return trimmed;
  if (/^[a-dA-D]$/.test(trimmed)) return trimmed.toUpperCase();
  const parsed = parseInt(trimmed, 10);
  if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) {
    return String.fromCharCode(65 + parsed);
  }
  return trimmed;
}

/**
 * Generates the complete, self-contained A4 NTA Test Paper & Solutions HTML document.
 */
export function generateTestPaperHtml(
  test: MockTest,
  options: GeneratePaperHtmlOptions = {}
): string {
  const {
    printMode = 'COMPLETE',
    fontSize = 'sm',
    showInstructions = true,
    showRoughWorkMargin = true
  } = options;

  let counter = 0;
  const indexedSections = (test.sections || []).map((sec) => ({
    ...sec,
    questions: (sec.questions || []).map((q) => {
      counter++;
      return {
        ...q,
        globalIndex: counter
      };
    })
  }));

  const allIndexedQuestions = indexedSections.flatMap(s => s.questions);
  const totalQuestions = allIndexedQuestions.length;
  const baseFontSize = fontSize === 'sm' ? '12px' : '13.5px';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(test.name)} - Question Paper & Solutions</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 12mm 14mm;
    }
    :root, html, body {
      color-scheme: light !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      font-size: ${baseFontSize};
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    * {
      box-sizing: border-box !important;
      color: #000000 !important;
      text-shadow: none !important;
    }

    /* CRITICAL FIX: Hide MathML to prevent duplicate text printout */
    .katex-mathml {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
    }
    .katex, .katex-html, .katex-display {
      color: #000000 !important;
      font-size: 1.05em !important;
    }
    .katex * {
      color: #000000 !important;
      border-color: #000000 !important;
    }

    /* High contrast vector diagrams */
    svg {
      background: transparent !important;
      display: block;
      margin: 6px auto;
    }
    svg line, svg path {
      stroke: #000000 !important;
      stroke-width: 2px !important;
    }
    svg circle {
      fill: #000000 !important;
      stroke: #000000 !important;
    }
    svg text, svg .diagram-atom {
      fill: #000000 !important;
      color: #000000 !important;
      font-weight: bold !important;
      font-family: system-ui, -apple-system, sans-serif !important;
    }
    .diagram-charge {
      fill: #dc2626 !important;
    }

    /* Page Breaks & Flow */
    .print-page-break {
      break-before: page !important;
      page-break-before: always !important;
    }
    .print-question-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 14px;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 12px;
    }
    .print-solution-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 14px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 12px;
      background: #ffffff;
    }

    /* Document Structure */
    .booklet-container {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      padding: 16px 20px;
      background: #ffffff;
    }
    .nta-cover-box {
      border: 2px solid #000000;
      padding: 20px;
      margin-bottom: 24px;
      text-align: center;
    }
    .header-crest {
      border-bottom: 2px solid #000000;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .header-agency {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #374151;
    }
    .header-title {
      font-size: 20px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 4px 0;
      color: #000000;
    }
    .header-subtitle {
      font-size: 11.5px;
      color: #4b5563;
    }

    /* Vitals Strip */
    .vitals-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      border: 1px solid #000000;
      font-weight: 700;
      font-size: 11px;
      background: #f9fafb;
      margin-bottom: 14px;
    }
    .vitals-item {
      padding: 6px 8px;
      border-right: 1px solid #000000;
    }
    .vitals-item:last-child {
      border-right: none;
    }

    /* Candidate Info */
    .candidate-grid {
      border: 1px solid #000000;
      padding: 10px 12px;
      margin-bottom: 14px;
      text-align: left;
      font-size: 11px;
    }
    .candidate-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .candidate-row:last-child {
      margin-bottom: 0;
    }
    .candidate-label {
      font-weight: 700;
      min-width: 140px;
    }
    .roll-boxes {
      display: flex;
      gap: 3px;
    }
    .roll-box {
      display: inline-block;
      width: 18px;
      height: 22px;
      border: 1px solid #000000;
    }
    .line-fill {
      flex: 1;
      border-bottom: 1px solid #000000;
      height: 18px;
    }

    /* Instructions */
    .instructions-body {
      text-align: left;
      font-size: 10.5px;
      border-top: 1px solid #000000;
      padding-top: 10px;
      color: #1f2937;
    }
    .instructions-title {
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 6px;
      color: #000000;
    }

    /* Section Headers */
    .section-banner {
      border-bottom: 2px solid #000000;
      padding-bottom: 6px;
      margin-top: 20px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .section-title {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .section-meta {
      font-size: 11px;
      font-weight: 700;
      color: #4b5563;
    }

    .part-banner {
      background: #f3f4f6;
      border-left: 4px solid #000000;
      padding: 6px 10px;
      font-weight: 700;
      font-size: 11px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }

    /* Question Layout */
    .q-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .q-num {
      font-weight: 800;
      flex-shrink: 0;
      min-width: 32px;
    }
    .q-body {
      flex: 1;
    }
    .rich-line {
      margin-bottom: 4px;
    }
    .rich-line:last-child {
      margin-bottom: 0;
    }

    /* MCQ Options Grid */
    .options-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 14px;
      margin-top: 10px;
      padding-top: 6px;
    }
    @media (max-width: 600px) {
      .options-grid {
        grid-template-columns: 1fr;
      }
    }
    .opt-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 11.5px;
    }
    .opt-letter {
      font-weight: 700;
      flex-shrink: 0;
    }
    .opt-content {
      flex: 1;
    }

    /* Numerical Answer Box */
    .numerical-blank {
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .numerical-line {
      display: inline-block;
      width: 120px;
      border-bottom: 1px solid #000000;
    }

    /* Rough Work Margin */
    .rough-work-box {
      border: 1px dashed #9ca3af;
      padding: 12px;
      margin-top: 20px;
      text-align: center;
      color: #9ca3af;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Solutions Section */
    .solutions-header-box {
      text-align: center;
      border-bottom: 2px solid #000000;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .confidential-tag {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #4b5563;
      text-transform: uppercase;
    }
    .solutions-main-title {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 4px 0;
    }

    /* Detachable Answer Key Table */
    .answer-key-box {
      margin-bottom: 24px;
    }
    .answer-key-title {
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #000000;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .answer-key-grid {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      border: 1px solid #000000;
      text-align: center;
      font-size: 11px;
    }
    @media (max-width: 600px) {
      .answer-key-grid {
        grid-template-columns: repeat(5, 1fr);
      }
    }
    .key-cell {
      padding: 4px;
      border-right: 1px solid #000000;
      border-bottom: 1px solid #000000;
      background: #f9fafb;
    }
    .key-q-num {
      font-size: 9.5px;
      color: #4b5563;
      font-weight: 700;
    }
    .key-ans {
      font-size: 12px;
      font-weight: 900;
      color: #000000;
    }

    /* Analytical Steps */
    .sol-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      margin-bottom: 8px;
      font-size: 11.5px;
    }
    .sol-q-label {
      font-weight: 800;
    }
    .sol-key-badge {
      font-weight: 800;
      padding: 2px 6px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 4px;
    }
    .sol-q-snippet {
      font-style: italic;
      color: #4b5563;
      font-size: 11px;
      margin-bottom: 8px;
    }
    .step-section {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #f3f4f6;
    }
    .step-title {
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      color: #111827;
      margin-bottom: 2px;
    }
    .step-content {
      font-size: 11.5px;
      line-height: 1.5;
    }
    .math-display {
      margin: 6px 0;
      overflow-x: auto;
      text-align: center;
    }
    .math-inline {
      display: inline-block;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="booklet-container">
    ${showInstructions && printMode !== 'SOLUTIONS' ? `
      <!-- COVER & INSTRUCTIONS PAGE -->
      <section class="nta-cover-box print-page-break">
        <div class="header-crest">
          <div class="header-agency">NATIONAL TESTING AGENCY (NTA) • JEE (MAIN / ADVANCED) SIMULATION</div>
          <h1 class="header-title">${escapeHtml(test.name)}</h1>
          <div class="header-subtitle">Computer Based Test (CBT) Standard Question Paper Booklet</div>
        </div>

        <div class="vitals-strip">
          <div class="vitals-item">TIME ALLOWED: ${test.durationMinutes || 180} MINUTES</div>
          <div class="vitals-item">MAXIMUM MARKS: ${test.totalMarks || 300}</div>
          <div class="vitals-item">TOTAL QUESTIONS: ${totalQuestions}</div>
        </div>

        <div class="candidate-grid">
          <div class="candidate-row">
            <span class="candidate-label">Candidate Roll No:</span>
            <div class="roll-boxes">
              ${Array.from({ length: 12 }).map(() => '<span class="roll-box"></span>').join('')}
            </div>
          </div>
          <div class="candidate-row">
            <span class="candidate-label">Candidate Name:</span>
            <span class="line-fill"></span>
          </div>
          <div class="candidate-row">
            <span class="candidate-label">Invigilator Signature:</span>
            <span class="line-fill"></span>
          </div>
        </div>

        <div class="instructions-body">
          <div class="instructions-title">General Examination Instructions:</div>
          <p>1. The test contains <strong>${indexedSections.length} Sections</strong>: ${indexedSections.map(s => escapeHtml(s.subject.toUpperCase())).join(', ')}.</p>
          <p>2. <strong>Section A (MCQ)</strong>: 4 Marks for correct answer, -1 Mark for incorrect answer, 0 for unattempted.</p>
          <p>3. <strong>Section B (Numerical)</strong>: 4 Marks for correct numerical response, 0 for incorrect answer.</p>
          <p>4. Use of calculators, logarithmic tables, and cellular devices is strictly prohibited.</p>
          <p>5. Rough work must be completed only in the designated space provided at the bottom of the booklet.</p>
        </div>
      </section>
    ` : ''}

    ${printMode !== 'SOLUTIONS' ? `
      <!-- QUESTION PAPER BODY -->
      <div class="questions-flow">
        ${indexedSections.map((sec, sIdx) => {
          const mcqs = sec.questions.filter(q => q.type !== 'NUMERICAL');
          const numericals = sec.questions.filter(q => q.type === 'NUMERICAL');

          return `
            <section class="section-container print-page-break">
              <div class="section-banner">
                <h2 class="section-title">SECTION ${sIdx + 1}: ${escapeHtml(sec.subject.toUpperCase())}</h2>
                <span class="section-meta">${sec.questions.length} Questions (${sec.questions.length * 4} Marks)</span>
              </div>

              ${mcqs.length > 0 ? `
                <div class="part-banner">PART A: MULTIPLE CHOICE QUESTIONS (Single Option Correct: +4, -1)</div>
                <div class="questions-list">
                  ${mcqs.map((q) => {
                    // Strip embedded option letters from content to eliminate duplicate option listing
                    const cleanedContent = stripTrailingOptionsFromContent(q.content, q.options);

                    return `
                      <article class="print-question-block">
                        <div class="q-row">
                          <span class="q-num">Q.${q.globalIndex}</span>
                          <div class="q-body">
                            ${renderRichTextToPrintHtml(cleanedContent)}
                            ${q.imageUrl ? `<div class="diagram-image-wrapper" style="text-align: center; margin: 8px 0;"><img src="${q.imageUrl}" style="max-height: 200px; max-width: 100%; object-fit: contain; border-radius: 4px;" alt="Question Diagram" /></div>` : ''}

                            ${q.options && q.options.length > 0 ? `
                              <div class="options-grid">
                                ${q.options.map((opt, optIdx) => `
                                  <div class="opt-item">
                                    <span class="opt-letter">(${getOptionLetter(optIdx)})</span>
                                    <div class="opt-content">${renderRichTextToPrintHtml(opt, optIdx, q.content)}</div>
                                  </div>
                                `).join('')}
                              </div>
                            ` : ''}
                          </div>
                        </div>
                      </article>
                    `;
                  }).join('')}
                </div>
              ` : ''}

              ${numericals.length > 0 ? `
                <div class="part-banner" style="margin-top: 18px;">PART B: NUMERICAL VALUE QUESTIONS (Single Integer/Decimal: +4, 0)</div>
                <div class="questions-list">
                  ${numericals.map((q) => `
                    <article class="print-question-block">
                      <div class="q-row">
                        <span class="q-num">Q.${q.globalIndex}</span>
                        <div class="q-body">
                          ${renderRichTextToPrintHtml(q.content)}
                          ${q.imageUrl ? `<div class="diagram-image-wrapper" style="text-align: center; margin: 8px 0;"><img src="${q.imageUrl}" style="max-height: 200px; max-width: 100%; object-fit: contain; border-radius: 4px;" alt="Question Diagram" /></div>` : ''}
                          <div class="numerical-blank">
                            <span>Answer:</span>
                            <span class="numerical-line"></span>
                          </div>
                        </div>
                      </div>
                    </article>
                  `).join('')}
                </div>
              ` : ''}

              ${showRoughWorkMargin ? `
                <div class="rough-work-box">SPACE FOR ROUGH WORK</div>
              ` : ''}
            </section>
          `;
        }).join('')}
      </div>
    ` : ''}

    ${(printMode === 'SOLUTIONS' || printMode === 'COMPLETE') ? `
      <!-- MARKING SCHEME & STEP-BY-STEP SOLUTIONS -->
      <section class="solutions-container print-page-break" style="margin-top: 24px; padding-top: 16px; border-top: 3px solid #000000;">
        <div class="solutions-header-box">
          <div class="confidential-tag">CONFIDENTIAL OFFICIAL MARKING SCHEME</div>
          <h2 class="solutions-main-title">Answer Key & Comprehensive Step-by-Step Solutions</h2>
          <div style="font-size: 11px; color: #4b5563;">${escapeHtml(test.name)}</div>
        </div>

        <!-- 1. DETACHABLE QUICK ANSWER KEY TABLE -->
        <div class="answer-key-box">
          <h3 class="answer-key-title">DETACHABLE QUICK ANSWER KEY</h3>
          <div class="answer-key-grid">
            ${allIndexedQuestions.map((q) => {
              const ansDisplay = formatKeyForDisplay(q.correctAnswer, q.type);
              return `
                <div class="key-cell">
                  <div class="key-q-num">Q.${q.globalIndex}</div>
                  <div class="key-ans">${escapeHtml(ansDisplay || '-')}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 2. STEP-BY-STEP ANALYTICAL EXPLANATIONS -->
        <div class="solutions-list">
          <h3 class="answer-key-title">DETAILED ANALYTICAL SOLUTIONS & CONCEPTS</h3>

          ${indexedSections.map((sec) => `
            <div class="subject-solutions" style="margin-bottom: 20px;">
              <div class="part-banner">${escapeHtml(sec.subject.toUpperCase())} SOLUTIONS</div>

              ${sec.questions.map((q) => {
                const ansDisplay = formatKeyForDisplay(q.correctAnswer, q.type);
                const explanationText = q.explanation || 'Detailed step-by-step reasoning verified.';
                const parsedSections = parseExplanationSections(explanationText);

                return `
                  <article class="print-solution-block">
                    <div class="sol-top-row">
                      <span class="sol-q-label">Q.${q.globalIndex} (${escapeHtml(q.chapter || q.topic || 'General')})</span>
                      <span class="sol-key-badge">Correct: ${escapeHtml(ansDisplay || 'N/A')}</span>
                    </div>

                    <div class="sol-q-snippet">
                      ${renderRichTextToPrintHtml(q.content.length > 140 ? q.content.slice(0, 140) + '...' : q.content)}
                    </div>

                    <div class="sol-steps-wrapper">
                      ${parsedSections.length > 0 ? parsedSections.map(s => `
                        <div class="step-section">
                          <div class="step-title">${escapeHtml(s.title || (s.type === 'concept' ? 'Key Concept & Formula' : s.type === 'conclusion' ? 'Conclusion & Correct Option' : `Step ${s.stepNum || ''}`))}</div>
                          <div class="step-content">${renderRichTextToPrintHtml(s.content)}</div>
                        </div>
                      `).join('') : `
                        <div class="step-section">
                          <div class="step-title">Step-by-Step Explanation:</div>
                          <div class="step-content">${renderRichTextToPrintHtml(explanationText)}</div>
                        </div>
                      `}
                    </div>
                  </article>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </section>
    ` : ''}
  </div>
</body>
</html>`;
}
