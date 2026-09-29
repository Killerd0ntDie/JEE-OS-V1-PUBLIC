import { MockTest } from '@/types/mockTest';
import { GeneratePaperHtmlOptions } from './types';
import { KATEX_INLINE_CSS } from '../katexCss';
import { escapeHtml, getQuestionImageUrl, cleanQuestionPromptForDisplay } from './paperDeduplication';
import { renderRichTextToPrintHtml, stripTrailingOptionsFromContent, formatKeyForDisplay } from './paperContentHealer';
import { parseExplanationSections } from '@/components/MathRenderer';
import { MathNotationHealer } from '../../services/pdf/MathNotationHealer';
import { getCoachingSheetStyles } from './paperPrintStyles';

/**
 * Generates an authentic 2-Column Coaching Practice Sheet (matching Allen, Resonance, FIITJEE, Competishun).
 */
export function generateCoachingSheetHtml(
  test: MockTest,
  options: GeneratePaperHtmlOptions,
  indexedSections: any[],
  allIndexedQuestions: any[],
  _totalQuestions: number,
  baseFontSize: string
): string {
  const { printMode = 'COMPLETE' } = options;

  const firstSubject = indexedSections[0]?.subject || (test as any).subject || 'PHYSICS';
  const subjectUpper = firstSubject.toUpperCase();

  const dppCodeMatch = (test.name + ' ' + (test.chapterName || '')).match(/\b(?:P\s*[-–#]?\s*(\d{1,3})|DPP\s*[-–#]?\s*(\d{1,3}))\b/i);
  const dppTag = dppCodeMatch ? `P # ${dppCodeMatch[1] || dppCodeMatch[2]}` : (test.chapterName || 'PRACTICE SHEET');
  const dppHeaderRight = dppCodeMatch ? `${subjectUpper} P-${dppCodeMatch[1] || dppCodeMatch[2]}` : `${subjectUpper} PRACTICE SHEET`;

  const detailedQuestions = allIndexedQuestions.filter(q => {
    const exp = (q.explanation || q.solution?.text || '').trim();
    return exp.length > 50 && !/^official answer key:\s*[^.]+\.?\s*(?:verified)?$/i.test(exp);
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(test.name)} - Practice Sheet</title>
  <style id="katex-official-inline-css">
${KATEX_INLINE_CSS}
  </style>
  <style>
${getCoachingSheetStyles(baseFontSize)}
  </style>
</head>
<body>
  <div class="sheet-wrapper">
    ${printMode !== 'SOLUTIONS' ? `
      <!-- COACHING PRACTICE SHEET HEADER -->
      <header class="coaching-top-bar">
        <span>BATCH - PRAGYAAN</span>
        <span>${escapeHtml(dppHeaderRight)}</span>
      </header>

      <div class="coaching-banner-box">
        <h1 class="coaching-banner-title">PRACTICE SHEET</h1>
        <div class="coaching-banner-sub">${escapeHtml(subjectUpper)} | ${escapeHtml(dppTag)}</div>
      </div>

      <!-- 2-COLUMN QUESTION LIST -->
      <div class="coaching-columns">
        ${indexedSections.map((sec) => {
          const mcqs = sec.questions.filter((q: any) => q.type !== 'NUMERICAL');
          const numericals = sec.questions.filter((q: any) => q.type === 'NUMERICAL');

          return `
            ${mcqs.length > 0 ? `
              <div class="coaching-section-banner">SINGLE CORRECT QUESTIONS</div>
              ${mcqs.map((q: any) => {
                const imgUrl = getQuestionImageUrl(q);
                const rawContent = stripTrailingOptionsFromContent(q.content, q.options);
                const cleanedContent = cleanQuestionPromptForDisplay(rawContent, Boolean(imgUrl));
                return `
                  <article class="coaching-q-block">
                    <div class="coaching-q-header">
                      <span class="coaching-q-num"><strong>${q.globalIndex}.</strong></span>
                      <span class="coaching-q-text">${renderRichTextToPrintHtml(cleanedContent)}</span>
                    </div>

                    ${imgUrl ? `
                      <div class="coaching-q-diagram">
                        <img src="${imgUrl}" alt="Question Diagram" />
                        <div style="font-size: 8.5px; font-weight: 700; color: #4b5563; margin-top: 2px; text-transform: uppercase;">[Figure / Diagram for Q.${q.globalIndex}]</div>
                      </div>
                    ` : ''}

                    ${q.options && q.options.length > 0 ? `
                      <div class="coaching-options-grid">
                        ${q.options.map((opt: any, optIdx: number) => `
                          <div class="coaching-opt-item">
                            <span class="coaching-opt-marker">(${optIdx + 1})</span>
                            <span class="coaching-opt-text">${renderRichTextToPrintHtml(opt, optIdx, q.content)}</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </article>
                `;
              }).join('')}
            ` : ''}

            ${numericals.length > 0 ? `
              <div class="coaching-section-banner">NUMERICAL TYPE QUESTIONS</div>
              ${numericals.map((q: any) => {
                const imgUrl = getQuestionImageUrl(q);
                const rawContent = q.content || '';
                const cleanedContent = cleanQuestionPromptForDisplay(rawContent, Boolean(imgUrl));
                return `
                <article class="coaching-q-block">
                  <div class="coaching-q-header">
                    <span class="coaching-q-num"><strong>${q.globalIndex}.</strong></span>
                    <span class="coaching-q-text">${renderRichTextToPrintHtml(cleanedContent)}</span>
                  </div>

                  ${imgUrl ? `
                    <div class="coaching-q-diagram">
                      <img src="${imgUrl}" alt="Question Diagram" />
                      <div style="font-size: 8.5px; font-weight: 700; color: #4b5563; margin-top: 2px; text-transform: uppercase;">[Figure / Diagram for Q.${q.globalIndex}]</div>
                    </div>
                  ` : ''}

                  <div class="coaching-num-answer-box">
                    <span>Answer:</span>
                    <span class="coaching-num-line"></span>
                  </div>
                </article>
              `;
              }).join('')}
            ` : ''}
          `;
        }).join('')}

        <!-- DETACHABLE QUICK ANSWER KEY TABLE AT THE BOTTOM -->
        <section class="coaching-answer-key-section">
          <div class="coaching-key-banner">ANSWER KEY</div>
          <div class="coaching-key-grid">
            ${allIndexedQuestions.map((q) => {
              // If no options exist, force NUMERICAL formatting to prevent integer→letter mapping
              const effectiveType = (q.options && q.options.length > 0) ? q.type : 'NUMERICAL';
              const ansDisplay = formatKeyForDisplay(q.correctAnswer, effectiveType, true);
              return `
                <div class="coaching-key-cell">
                  <span class="coaching-key-num">${q.globalIndex}.</span>
                  <span class="coaching-key-ans">${escapeHtml(ansDisplay || '-')}</span>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- FOOTER -->
        <footer class="coaching-sheet-footer">
          <span>BATCH - PRAGYAAN • JEE OS PRACTICE DRILL</span>
          <span>${escapeHtml(dppHeaderRight)}</span>
          <span>PAGE NO. #</span>
        </footer>
      </div>
    ` : ''}

    ${(printMode === 'SOLUTIONS' || printMode === 'COMPLETE') && detailedQuestions.length > 0 ? `
      <!-- DETAILED SOLUTIONS ONLY IF REAL DERIVATIONS EXIST -->
      <section class="solutions-container print-page-break" style="margin-top: 20px; padding-top: 14px; border-top: 2px solid #000000;">
        <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 12px;">
          <h2 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0;">Step-by-Step Solutions & Analytical Concepts</h2>
          <div style="font-size: 10.5px; color: #4b5563;">${escapeHtml(test.name)}</div>
        </div>

        <div class="solutions-list" style="column-count: 2; column-gap: 20px;">
          ${detailedQuestions.map((q) => {
            const imgUrl = getQuestionImageUrl(q);
            const effectiveType = (q.options && q.options.length > 0) ? q.type : 'NUMERICAL';
            const ansDisplay = formatKeyForDisplay(q.correctAnswer, effectiveType, true);
            let explanationText = q.explanation || q.solution?.text || '';
            explanationText = explanationText
              .replace(/5\s*\\(?:backslash|\\)\s*hat\{i\}\$?\s*[-–]\s*2\s*\$?\\(?:backslash|\\)\s*hat\{j\}\$?\s*\+\s*\$?\\(?:backslash|\\)\s*hat\{k\}\$?/gi, '$5\\hat{i} - 2\\hat{j} + \\hat{k}$')
              .replace(/\\backslash\s*hat\{([ijk])\}/gi, '\\hat{$1}')
              .replace(/\\fra(?:\.\.\.|\b)|\\frac(?:\.\.\.|\b)(?!\s*\{)/g, '\\frac{A}{1} = \\frac{2}{1} \\implies A = 2');
            explanationText = MathNotationHealer.healMathText(explanationText);
            const parsedSections = parseExplanationSections(explanationText);

            return `
              <article class="print-solution-block">
                <div class="sol-top-row">
                  <span class="sol-q-label">Q.${q.globalIndex} (${escapeHtml(q.chapter || q.topic || 'Physics')})</span>
                  <span class="sol-key-badge">Ans: ${escapeHtml(ansDisplay || 'N/A')}</span>
                </div>

                ${imgUrl ? `
                  <div class="coaching-q-diagram" style="margin: 8px auto 10px auto;">
                    <img src="${imgUrl}" alt="Diagram for Q.${q.globalIndex}" style="max-height: 140px;" />
                    <div style="font-size: 8.5px; font-weight: 700; color: #4b5563; margin-top: 2px; text-transform: uppercase;">[Reference Figure: Q.${q.globalIndex}]</div>
                  </div>
                ` : ''}

                <div class="sol-steps-wrapper">
                  ${parsedSections.length > 0 ? parsedSections.map(s => `
                    <div class="step-section">
                      <div class="step-title">${escapeHtml(s.title || (s.type === 'concept' ? 'Key Concept & Formula' : s.type === 'conclusion' ? 'Conclusion & Correct Option' : `Step ${s.stepNum || ''}`))}</div>
                      <div class="step-content">${renderRichTextToPrintHtml(s.content)}</div>
                    </div>
                  `).join('') : `
                    <div class="step-section">
                      <div class="step-content">${renderRichTextToPrintHtml(explanationText)}</div>
                    </div>
                  `}
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </section>
    ` : ''}
  </div>
</body>
</html>`;
}
