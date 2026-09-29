import { MockTest } from '@/types/mockTest';
import { parseExplanationSections } from '@/components/MathRenderer';
import { KATEX_INLINE_CSS } from './katexCss';
import {
  GeneratePaperHtmlOptions,
  escapeHtml,
  getQuestionImageUrl,
  areQuestionsDuplicate,
  deduplicateSections,
  deduplicateQuestionList,
  cleanQuestionPromptForDisplay,
  healQuestionContentAndOptions,
  renderRichTextToPrintHtml,
  stripTrailingOptionsFromContent,
  getOptionLetter,
  formatKeyForDisplay,
  getNtaPaperStyles,
  generateCoachingSheetHtml
} from './paperPrint';

// Re-export all public symbols for backwards compatibility
export type { GeneratePaperHtmlOptions };
export {
  getQuestionImageUrl,
  areQuestionsDuplicate,
  deduplicateSections,
  deduplicateQuestionList,
  cleanQuestionPromptForDisplay,
  healQuestionContentAndOptions,
  renderRichTextToPrintHtml,
  stripTrailingOptionsFromContent
};

/**
 * Generates the complete, self-contained A4 Test Paper & Solutions HTML document.
 */
export function generateTestPaperHtml(
  test: MockTest,
  options: GeneratePaperHtmlOptions = {}
): string {
  const {
    printMode = 'COMPLETE',
    fontSize = 'sm',
    showInstructions = true,
    showRoughWorkMargin = true,
    layoutStyle
  } = options;

  let counter = 0;
  const dedupedSections = deduplicateSections(test.sections || []);
  const indexedSections = dedupedSections.map((sec) => {
    // Preserve sequential question numbering: ensure MCQs are Part A and Numericals are Part B
    // without backward jumps in numbering if questions were slightly out of order
    const healedQuestions = (sec.questions || []).map((q: any) => healQuestionContentAndOptions(q));
    const orderedQuestions = [...healedQuestions].sort((a, b) => {
      const aNum = a.type === 'NUMERICAL' ? 1 : 0;
      const bNum = b.type === 'NUMERICAL' ? 1 : 0;
      return aNum - bNum;
    });

    return {
      ...sec,
      questions: orderedQuestions.map((q) => {
        counter++;
        return {
          ...q,
          globalIndex: counter
        };
      })
    };
  });

  const allIndexedQuestions = indexedSections.flatMap(s => s.questions);
  const totalQuestions = allIndexedQuestions.length;
  const baseFontSize = fontSize === 'sm' ? '12px' : '13.5px';

  // Automatically detect Coaching Practice Sheet layout for DPP worksheets, single-chapter drills, or custom papers
  const isDppOrSheet = test.source === 'dpp' ||
    (test as any).type === 'DPP' ||
    (test.category && String(test.category).toUpperCase().includes('DPP')) ||
    (test.sections?.length === 1 && (test.sections[0].questions?.length || 0) >= 10) ||
    Boolean(test.chapterName && test.chapterName !== 'Full Syllabus');

  const finalLayoutStyle = layoutStyle || (isDppOrSheet ? 'COACHING_SHEET' : 'NTA_CBT');

  if (finalLayoutStyle === 'COACHING_SHEET') {
    return generateCoachingSheetHtml(test, options, indexedSections, allIndexedQuestions, totalQuestions, fontSize);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(test.name)} - Question Paper & Solutions</title>
  <style id="katex-official-inline-css">
${KATEX_INLINE_CSS}
  </style>
  <style>
${getNtaPaperStyles(baseFontSize)}
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
                    const imgUrl = getQuestionImageUrl(q);
                    const rawContent = stripTrailingOptionsFromContent(q.content, q.options);
                    const cleanedContent = cleanQuestionPromptForDisplay(rawContent, Boolean(imgUrl));

                    return `
                      <article class="print-question-block">
                        <div class="q-row">
                          <span class="q-num">Q.${q.globalIndex}</span>
                          <div class="q-body">
                            ${renderRichTextToPrintHtml(cleanedContent)}
                            ${imgUrl ? `
                              <div class="diagram-image-wrapper" style="text-align: center; margin: 14px 0 16px 0;">
                                <div class="diagram-card" style="display: inline-block; padding: 6px; border: 1px solid #d1d5db; border-radius: 6px; background: #ffffff;">
                                  <img src="${imgUrl}" style="max-height: 240px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" alt="Diagram for Question ${q.globalIndex}" />
                                </div>
                                <div class="diagram-caption" style="font-size: 10px; font-weight: 700; color: #4b5563; margin-top: 4px; letter-spacing: 0.05em; text-transform: uppercase;">
                                  [Figure / Diagram for Q.${q.globalIndex}]
                                </div>
                              </div>
                            ` : ''}

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
                  ${numericals.map((q) => {
                    const imgUrl = getQuestionImageUrl(q);
                    const rawContent = q.content || '';
                    const cleanedContent = cleanQuestionPromptForDisplay(rawContent, Boolean(imgUrl));
                    return `
                    <article class="print-question-block">
                      <div class="q-row">
                        <span class="q-num">Q.${q.globalIndex}</span>
                        <div class="q-body">
                          ${renderRichTextToPrintHtml(cleanedContent)}
                          ${imgUrl ? `
                            <div class="diagram-image-wrapper" style="text-align: center; margin: 14px 0 16px 0;">
                              <div class="diagram-card" style="display: inline-block; padding: 6px; border: 1px solid #d1d5db; border-radius: 6px; background: #ffffff;">
                                <img src="${imgUrl}" style="max-height: 240px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" alt="Diagram for Question ${q.globalIndex}" />
                              </div>
                              <div class="diagram-caption" style="font-size: 10px; font-weight: 700; color: #4b5563; margin-top: 4px; letter-spacing: 0.05em; text-transform: uppercase;">
                                [Figure / Diagram for Q.${q.globalIndex}]
                              </div>
                            </div>
                          ` : ''}
                          <div class="numerical-blank">
                            <span>Answer:</span>
                            <span class="numerical-line"></span>
                          </div>
                        </div>
                      </div>
                    </article>
                  `;
                  }).join('')}
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
              const effectiveType = (q.options && q.options.length > 0) ? q.type : 'NUMERICAL';
              const ansDisplay = formatKeyForDisplay(q.correctAnswer, effectiveType);
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
                const effectiveType = (q.options && q.options.length > 0) ? q.type : 'NUMERICAL';
                const ansDisplay = formatKeyForDisplay(q.correctAnswer, effectiveType);
                let explanationText = (q.explanation || q.solution?.text || '').trim();
                if (/^Official Answer Key:\s*[0-3]$/i.test(explanationText)) {
                  const optIdx = parseInt(explanationText.replace(/[^0-9]/g, ''), 10);
                  const letter = String.fromCharCode(65 + optIdx);
                  explanationText = `The correct option is (${letter}). Refer to official JEE marking scheme.`;
                } else if (/^Official Answer Key:\s*([A-Za-z0-9.-]+)$/i.test(explanationText)) {
                  const ansVal = explanationText.replace(/^Official Answer Key:\s*/i, '').trim();
                  explanationText = `The correct numerical answer is ${ansVal}.`;
                } else if (!explanationText) {
                  explanationText = `The correct answer is ${ansDisplay || 'verified'}.`;
                }
                const parsedSections = parseExplanationSections(explanationText);

                return `
                  <article class="print-solution-block">
                    <div class="sol-top-row">
                      <span class="sol-q-label">Q.${q.globalIndex} (${escapeHtml(q.chapter || q.topic || 'General')})</span>
                      <span class="sol-key-badge">Correct: ${escapeHtml(ansDisplay || 'N/A')}</span>
                    </div>

                    <div class="sol-q-snippet">
                      ${renderRichTextToPrintHtml(q.content.length > 160 ? q.content.slice(0, 160) + '...' : q.content)}
                    </div>

                    ${(() => {
                      const imgUrl = getQuestionImageUrl(q);
                      return imgUrl ? `
                        <div class="sol-diagram-wrapper" style="text-align: center; margin: 8px 0 12px 0;">
                          <div style="display: inline-block; padding: 4px; border: 1px solid #e5e7eb; border-radius: 4px; background: #ffffff;">
                            <img src="${imgUrl}" style="max-height: 180px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" alt="Reference Figure for Q.${q.globalIndex}" />
                          </div>
                          <div style="font-size: 9.5px; font-weight: 700; color: #4b5563; margin-top: 3px; text-transform: uppercase;">
                            [Reference Figure: Q.${q.globalIndex}]
                          </div>
                        </div>
                      ` : '';
                    })()}

                    <div class="sol-steps-wrapper">
                      ${parsedSections.length > 0 ? parsedSections.map(s => `
                        <div class="step-section">
                          <div class="step-title">${escapeHtml(s.title || (s.type === 'concept' ? 'Key Concept & Formula' : s.type === 'conclusion' ? 'Conclusion & Correct Option' : `Step ${s.stepNum || 1}`))}:</div>
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
