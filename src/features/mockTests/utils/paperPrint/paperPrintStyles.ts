/**
 * CSS stylesheets for coaching practice sheets and official NTA CBT exam prints.
 */

export function getCoachingSheetStyles(baseFontSize: string): string {
  const effectiveFontSize = baseFontSize === 'sm' ? '11px' : '12px';
  return `
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 10mm 10mm;
    }
    :root, html, body {
      color-scheme: light !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      font-size: ${effectiveFontSize};
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    * {
      box-sizing: border-box !important;
      color: #000000 !important;
      text-shadow: none !important;
    }

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
    .katex .strut {
      display: inline-block;
    }
    .katex .vlist-t {
      display: inline-table;
      table-layout: fixed;
      border-collapse: collapse;
    }
    .katex .vlist-r {
      display: table-row;
    }
    .katex .vlist {
      display: table-cell;
      vertical-align: bottom;
      position: relative;
    }
    .katex .vlist > span {
      display: block;
      height: 0;
      position: relative;
    }
    .katex .vlist-s {
      display: table-cell;
      vertical-align: bottom;
      font-size: 1px;
      width: 1px;
      min-width: 1px;
    }
    .katex .frac-line {
      display: block;
      border-bottom-style: solid;
      border-bottom-width: 0.04em;
    }
    .katex .sqrt {
      display: inline-block !important;
      position: relative !important;
    }
    .katex .sqrt > .vlist-t {
      position: relative !important;
    }
    .katex .svg-align {
      text-align: left !important;
    }
    .katex .hide-tail {
      width: 100% !important;
      position: relative !important;
      overflow: hidden !important;
      display: inline-block !important;
    }
    .katex svg {
      display: block !important;
      position: absolute !important;
      width: 100% !important;
      height: inherit !important;
      fill: currentColor !important;
      stroke: currentColor !important;
      overflow: hidden !important;
    }
    .katex svg path {
      stroke: none !important;
      stroke-width: 0 !important;
    }

    .diagram-svg svg {
      background: transparent !important;
      display: block;
      margin: 4px auto;
    }
    .diagram-svg svg line, .diagram-svg svg path {
      stroke: #000000 !important;
      stroke-width: 1.5px !important;
    }
    .diagram-svg svg circle {
      fill: #000000 !important;
      stroke: #000000 !important;
    }
    .diagram-svg svg text, .diagram-svg svg .diagram-atom {
      fill: #000000 !important;
      color: #000000 !important;
      font-weight: bold !important;
      font-size: 10px !important;
    }

    .sheet-wrapper {
      width: 100%;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
    }
    .coaching-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 2px;
      margin-bottom: 6px;
    }
    .coaching-banner-box {
      border: 1.5px solid #000000;
      padding: 6px 10px;
      text-align: center;
      margin-bottom: 8px;
      background: #ffffff;
    }
    .coaching-banner-title {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.05em;
      margin: 0;
      line-height: 1.1;
    }
    .coaching-banner-sub {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .coaching-columns {
      column-count: 2;
      column-gap: 16px;
      column-rule: 0.8px solid #9ca3af;
      width: 100%;
    }
    .coaching-section-banner {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      column-span: all;
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-top: 1.2px solid #000000;
      border-bottom: 1.2px solid #000000;
      padding: 3px 0;
      margin: 8px 0 6px 0;
      background: #f9fafb;
    }
    .coaching-q-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 0.5px dashed #d1d5db;
    }
    .coaching-q-header {
      display: flex;
      align-items: flex-start;
      gap: 4px;
    }
    .coaching-q-num {
      font-weight: 900;
      flex-shrink: 0;
      font-size: 11px;
    }
    .coaching-q-text {
      flex: 1;
      font-size: 11px;
      line-height: 1.4;
    }
    .coaching-q-diagram {
      text-align: center;
      margin: 4px auto 6px auto;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .coaching-q-diagram img {
      max-height: 150px;
      max-width: 95%;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .coaching-options-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 3px 8px;
      margin-top: 5px;
      padding-left: 12px;
    }
    .coaching-opt-item {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      font-size: 10.5px;
      line-height: 1.35;
    }
    .coaching-opt-marker {
      font-weight: 700;
      flex-shrink: 0;
    }
    .coaching-opt-text {
      flex: 1;
    }
    .coaching-num-answer-box {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      padding-left: 12px;
      font-size: 10px;
      font-weight: 700;
    }
    .coaching-num-line {
      display: inline-block;
      width: 70px;
      border-bottom: 1px solid #000000;
      height: 12px;
    }
    .coaching-answer-key-section {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      column-span: all;
      border: 1.2px solid #000000;
      margin-top: 12px;
      padding: 6px;
      background: #ffffff;
    }
    .coaching-key-banner {
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.1em;
      border-bottom: 1px solid #000000;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    .coaching-key-grid {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      border: 0.8px solid #000000;
      text-align: center;
      font-size: 9.5px;
    }
    .coaching-key-cell {
      padding: 2px 1px;
      border-right: 0.8px solid #000000;
      border-bottom: 0.8px solid #000000;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .coaching-key-num {
      font-size: 8.5px;
      font-weight: 700;
      color: #374151;
    }
    .coaching-key-ans {
      font-size: 10.5px;
      font-weight: 900;
      color: #000000;
    }
    .coaching-sheet-footer {
      break-inside: avoid !important;
      column-span: all;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      font-weight: 700;
      border-top: 1px solid #000000;
      padding-top: 3px;
      margin-top: 8px;
    }
    .print-page-break {
      break-before: page !important;
      page-break-before: always !important;
    }
    .print-solution-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 10px;
      border: 1px solid #d1d5db;
      padding: 8px 10px;
      background: #ffffff;
      font-size: 10.5px;
    }
    .sol-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
      margin-bottom: 6px;
      font-size: 10.5px;
    }
    .sol-q-label { font-weight: 800; }
    .sol-key-badge {
      font-weight: 800;
      padding: 1px 5px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
    }
    .step-section {
      margin-top: 6px;
      padding-top: 4px;
      border-top: 1px solid #f3f4f6;
    }
    .step-title {
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .step-content { font-size: 10.5px; line-height: 1.45; }
    .math-display { margin: 4px 0; overflow-x: auto; text-align: center; }
    .math-inline { display: inline-block; vertical-align: middle; }
  `;
}

export function getNtaPaperStyles(baseFontSize: string): string {
  return `
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

    /* High contrast vector diagrams - strictly scoped to diagram-svg */
    .diagram-svg svg {
      background: transparent !important;
      display: block;
      margin: 6px auto;
    }
    .diagram-svg svg line, .diagram-svg svg path {
      stroke: #000000 !important;
      stroke-width: 2px !important;
    }
    .diagram-svg svg circle {
      fill: #000000 !important;
      stroke: #000000 !important;
    }
    .diagram-svg svg text, .diagram-svg svg .diagram-atom {
      fill: #000000 !important;
      color: #000000 !important;
      font-weight: bold !important;
      font-family: system-ui, -apple-system, sans-serif !important;
    }
    .diagram-charge {
      fill: #dc2626 !important;
    }

    /* KaTeX Precision Radical / Square Root Layout (Prevents horizontal overflow and boundless expansion to the left) */
    .katex .strut {
      display: inline-block;
    }
    .katex .vlist-t {
      display: inline-table;
      table-layout: fixed;
      border-collapse: collapse;
    }
    .katex .vlist-r {
      display: table-row;
    }
    .katex .vlist {
      display: table-cell;
      vertical-align: bottom;
      position: relative;
    }
    .katex .vlist > span {
      display: block;
      height: 0;
      position: relative;
    }
    .katex .vlist-s {
      display: table-cell;
      vertical-align: bottom;
      font-size: 1px;
      width: 1px;
      min-width: 1px;
    }
    .katex .frac-line {
      display: block;
      border-bottom-style: solid;
      border-bottom-width: 0.04em;
    }
    .katex .sqrt {
      display: inline-block !important;
      position: relative !important;
    }
    .katex .sqrt > .vlist-t {
      position: relative !important;
    }
    .katex .svg-align {
      text-align: left !important;
    }
    .katex .hide-tail {
      width: 100% !important;
      position: relative !important;
      overflow: hidden !important;
      display: inline-block !important;
    }
    /* Radical SVGs are strictly bounded to .hide-tail container width */
    .katex svg {
      display: block !important;
      position: absolute !important;
      width: 100% !important;
      height: inherit !important;
      fill: currentColor !important;
      stroke: currentColor !important;
      overflow: hidden !important;
    }
    .katex svg path {
      stroke: none !important;
      stroke-width: 0 !important;
    }

    /* Print Headings, Bullets, and Numbered List items */
    .print-h1 { font-size: 13px; font-weight: 800; margin: 6px 0 3px 0; border-bottom: 1px solid #d1d5db; padding-bottom: 2px; }
    .print-h2 { font-size: 12px; font-weight: 800; margin: 5px 0 2px 0; }
    .print-h3 { font-size: 11px; font-weight: 700; margin: 4px 0 2px 0; }
    .print-bullet-item { display: flex; align-items: flex-start; gap: 5px; margin: 2px 0; }
    .print-bullet-item .bullet-dot { font-weight: 900; line-height: 1.4; color: #111827; flex-shrink: 0; }
    .print-bullet-item .bullet-text { flex: 1; min-width: 0; }
    .print-num-item { display: flex; align-items: flex-start; gap: 4px; margin: 2px 0; }
    .print-num-item .num-marker { font-weight: 700; font-family: monospace; flex-shrink: 0; }
    .print-num-item .num-text { flex: 1; min-width: 0; }

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

    /* Diagram & Visual Media */
    .diagram-image-wrapper {
      text-align: center;
      margin: 14px 0 16px 0;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .diagram-card {
      display: inline-block;
      padding: 6px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #ffffff;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .diagram-card img {
      max-height: 240px;
      max-width: 100%;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .diagram-caption {
      font-size: 10px;
      font-weight: 700;
      color: #4b5563;
      margin-top: 4px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .sol-diagram-wrapper {
      text-align: center;
      margin: 8px 0 12px 0;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .sol-diagram-wrapper img {
      max-height: 180px;
      max-width: 100%;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .print-diagram-block {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
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
  `;
}
