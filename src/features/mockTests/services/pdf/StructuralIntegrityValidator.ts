import { PaperIntegrityReport, IntegrityInvariants } from './types';
import { OptionExtractor } from './OptionExtractor';

export interface ValidationContext {
  expectedCount?: number;
  rawText?: string;
  totalPages?: number;
}

export class StructuralIntegrityValidator {
  /**
   * Validates a parsed paper against 6 structural invariants.
   * Returns a comprehensive PaperIntegrityReport.
   */
  static validatePaper(
    questions: any[],
    context?: ValidationContext
  ): PaperIntegrityReport {
    const issues: string[] = [];
    const failedQuestionIndices: Set<number> = new Set();
    const failedPages: Set<number> = new Set();

    if (!Array.isArray(questions) || questions.length === 0) {
      return {
        isValid: false,
        integrityScore: 0.0,
        issues: ['No questions were parsed from the document.'],
        failedQuestionIndices: [],
        failedPages: [1],
        invariants: {
          countPassed: false,
          sequencePassed: false,
          optionsPassed: false,
          columnBleedPassed: false,
          answerKeyPassed: false,
          diagramsPassed: false
        },
        details: {
          totalQuestions: 0,
          expectedQuestions: context?.expectedCount,
          sequenceGaps: [],
          columnBleedQuestions: [],
          malformedOptionQuestions: [],
          missingAnswerQuestions: [],
          suspiciousDiagramQuestions: []
        }
      };
    }

    const totalQuestions = questions.length;

    let totalPages = context?.totalPages;
    if (!totalPages && context?.rawText) {
      const pageMatches = context.rawText.match(/\[PAGE\s+(\d+)\]/g);
      if (pageMatches && pageMatches.length > 0) {
        totalPages = pageMatches.length;
      }
    }
    const resolvedContext: ValidationContext = { ...context, totalPages };

    // 1. INVARIANT 1: Expected Question Count
    const countCheck = this.checkQuestionCount(questions, resolvedContext, issues);

    // 2. INVARIANT 2: Sequential Numbering Continuity
    const sequenceCheck = this.checkSequenceContinuity(questions, issues, failedQuestionIndices);

    // 3. INVARIANT 3: Option Completeness & Swallowed Markers
    const optionsCheck = this.checkOptionIntegrity(questions, issues, failedQuestionIndices);

    // 4. INVARIANT 4: Column Bleed Detection (Horizontal Interleaving)
    const columnBleedCheck = this.checkColumnBleed(questions, issues, failedQuestionIndices);

    // 5. INVARIANT 5: Answer Key Coverage
    const answerKeyCheck = this.checkAnswerKeyCoverage(questions, issues, failedQuestionIndices);

    // 6. INVARIANT 6: Diagram Sanity Check
    const diagramCheck = this.checkDiagramSanity(questions, issues, failedQuestionIndices);

    // Collect failed pages from failed questions
    for (const qIdx of failedQuestionIndices) {
      const q = questions[qIdx];
      const page = this.resolveQuestionPage(q, qIdx, totalQuestions, resolvedContext);
      if (page) {
        failedPages.add(page);
      }
    }

    const invariants: IntegrityInvariants = {
      countPassed: countCheck.passed,
      sequencePassed: sequenceCheck.passed,
      optionsPassed: optionsCheck.passed,
      columnBleedPassed: columnBleedCheck.passed,
      answerKeyPassed: answerKeyCheck.passed,
      diagramsPassed: diagramCheck.passed
    };

    // Weighted composite integrity score (0.0 - 1.0)
    let score = 0;
    score += (invariants.countPassed ? 0.25 : countCheck.partialRatio * 0.25);
    score += (invariants.sequencePassed ? 0.20 : sequenceCheck.partialRatio * 0.20);
    score += (invariants.optionsPassed ? 0.25 : optionsCheck.partialRatio * 0.25);
    score += (invariants.columnBleedPassed ? 0.15 : 0.0);
    score += (invariants.answerKeyPassed ? 0.10 : answerKeyCheck.partialRatio * 0.10);
    score += (invariants.diagramsPassed ? 0.05 : 0.0);

    const integrityScore = Math.min(1.0, Math.max(0.0, Math.round(score * 100) / 100));

    // A paper is structurally valid if score >= 0.85 and no critical invariants (column bleed, severe option damage) fail
    const isValid = integrityScore >= 0.85 &&
      invariants.columnBleedPassed &&
      optionsCheck.malformedQuestions.length === 0 &&
      countCheck.passed;

    return {
      isValid,
      integrityScore,
      issues,
      failedQuestionIndices: Array.from(failedQuestionIndices).sort((a, b) => a - b),
      failedPages: Array.from(failedPages).sort((a, b) => a - b),
      invariants,
      details: {
        totalQuestions,
        expectedQuestions: countCheck.expected,
        sequenceGaps: sequenceCheck.gaps,
        columnBleedQuestions: columnBleedCheck.flaggedQuestions,
        malformedOptionQuestions: optionsCheck.malformedQuestions,
        missingAnswerQuestions: answerKeyCheck.missingQuestions,
        suspiciousDiagramQuestions: diagramCheck.suspiciousQuestions
      }
    };
  }

  /**
   * Checks if extracted count matches expectations.
   */
  private static checkQuestionCount(
    questions: any[],
    context: ValidationContext | undefined,
    issues: string[]
  ): { passed: boolean; partialRatio: number; expected?: number } {
    let expected = context?.expectedCount;

    // If not provided in context, estimate from rawText
    if (!expected && context?.rawText) {
      const qMarkers = [...context.rawText.matchAll(/(?:^|\n|\r)\s*(?:Q\.?\s*(\d{1,3})|(\d{1,3})\s*[:.\-\]])/gi)];
      if (qMarkers.length > 0) {
        const nums = qMarkers
          .map(m => parseInt(m[1] || m[2], 10))
          .filter(n => !isNaN(n) && n > 0 && n <= 100);
        if (nums.length > 0) {
          expected = Math.max(...nums);
        }
      }
    }

    if (!expected || expected <= 0) {
      return { passed: true, partialRatio: 1.0 };
    }

    const actual = questions.length;
    const ratio = Math.min(1.0, actual / expected);

    if (actual < Math.floor(expected * 0.8)) {
      issues.push(`Parsed question count (${actual}) is significantly lower than expected (${expected}). Missing ~${expected - actual} questions.`);
      return { passed: false, partialRatio: ratio, expected };
    }

    if (actual > expected + 5) {
      issues.push(`Parsed question count (${actual}) exceeds expected (${expected}) by > 5. Possible duplicate or fragmented questions.`);
      return { passed: false, partialRatio: 0.8, expected };
    }

    return { passed: true, partialRatio: 1.0, expected };
  }

  /**
   * Checks sequential question numbering continuity.
   */
  private static checkSequenceContinuity(
    questions: any[],
    issues: string[],
    failedIndices: Set<number>
  ): { passed: boolean; partialRatio: number; gaps: { from: number; to: number }[] } {
    const gaps: { from: number; to: number }[] = [];
    const detectedNums: { num: number; index: number }[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const num = this.extractQuestionNumber(q);
      if (num !== null) {
        detectedNums.push({ num, index: i });
      }
    }

    if (detectedNums.length < 3) {
      return { passed: true, partialRatio: 1.0, gaps: [] };
    }

    let totalGaps = 0;
    for (let i = 1; i < detectedNums.length; i++) {
      const prev = detectedNums[i - 1];
      const curr = detectedNums[i];
      const diff = curr.num - prev.num;

      // Detect sequence jump
      if (diff > 1 && diff <= 15) {
        gaps.push({ from: prev.num, to: curr.num });
        totalGaps += (diff - 1);
        failedIndices.add(prev.index);
        failedIndices.add(curr.index);
        issues.push(`Sequence gap detected: jumped from Q${prev.num} to Q${curr.num} (missing ~${diff - 1} questions).`);
      }
    }

    const passed = gaps.length === 0;
    const partialRatio = Math.max(0.0, 1.0 - (totalGaps / questions.length));
    return { passed, partialRatio, gaps };
  }

  /**
   * Checks option completeness and guards against swallowed option markers.
   */
  private static checkOptionIntegrity(
    questions: any[],
    issues: string[],
    failedIndices: Set<number>
  ): { passed: boolean; partialRatio: number; malformedQuestions: number[] } {
    const malformedQuestions: number[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const type = (q.type || 'MCQ').toUpperCase();
      if (type === 'NUMERICAL') continue;

      const opts = q.options;
      let isMalformed = false;

      // 1. Must have exactly 4 options for standard MCQ
      if (!Array.isArray(opts) || opts.length !== 4) {
        isMalformed = true;
        issues.push(`Q${i + 1}: expected 4 options, found ${Array.isArray(opts) ? opts.length : 0}.`);
      } else {
        // 2. Check for empty option strings or dummy placeholders
        const emptyCount = opts.filter((o: any) => {
          const text = typeof o === 'string' ? o : o?.text;
          const trimmed = (text || '').trim();
          return !trimmed || /^Option\s*\([A-D1-4]\)$/i.test(trimmed);
        }).length;

        if (emptyCount > 0) {
          isMalformed = true;
          issues.push(`Q${i + 1}: has ${emptyCount} empty or placeholder option(s).`);
        }

        // 2b. Check for bare unit options without numbers (e.g. "m/s" or "km/hr")
        const hasBareUnitOpt = opts.some((o: any) => {
          const t = (typeof o === 'string' ? o : o?.text || '').trim();
          return /^(?:m\/s|km\/h(?:r)?|cm\/s|rad\/s|m|cm|mm|km|kg|g|J|N|W|V|A|Hz|K|s)$/i.test(t);
        });
        if (hasBareUnitOpt) {
          isMalformed = true;
          issues.push(`Q${i + 1}: contains incomplete option with bare unit without numerical quantity.`);
        }

        // 3. Check for swallowed option markers inside option text (e.g. 2x2 grid collapsed)
        for (let oIdx = 0; oIdx < opts.length; oIdx++) {
          const optText = typeof opts[oIdx] === 'string' ? opts[oIdx] : opts[oIdx]?.text || '';
          // Pattern: Option 1 text containing "(2)" or "(B)" or "[2]"
          if (/(?:\s|^)(?:\([2-4B-Db-d]\)|\[[2-4B-Db-d]\])\s+[^\s]/.test(optText)) {
            isMalformed = true;
            issues.push(`Q${i + 1} Option ${oIdx + 1}: contains swallowed option marker in text ("${optText.substring(0, 40)}...").`);
            break;
          }
        }

        // 4. Check if options are dummy surrogates while question body has real options embedded
        if (OptionExtractor.isSurrogateOpt(opts)) {
          const hasInline = /(?:\s|^)\([Aa]\)[\s\S]*?\([Bb]\)[\s\S]*?\([Cc]\)[\s\S]*?\([Dd]\)/.test(q.content || '');
          if (hasInline) {
            isMalformed = true;
            issues.push(`Q${i + 1}: options are placeholders, but full options are embedded in question text.`);
          }
        }
      }

      if (isMalformed) {
        malformedQuestions.push(i + 1);
        failedIndices.add(i);
      }
    }

    const passed = malformedQuestions.length === 0;
    const partialRatio = Math.max(0.0, 1.0 - (malformedQuestions.length / questions.length));
    return { passed, partialRatio, malformedQuestions };
  }

  /**
   * Checks for column bleed (horizontal interleaving of 2-column text).
   */
  private static checkColumnBleed(
    questions: any[],
    issues: string[],
    failedIndices: Set<number>
  ): { passed: boolean; flaggedQuestions: number[] } {
    const flaggedQuestions: number[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const content = q.content || '';

      // Indicator 1: Mid-sentence question marker
      // e.g. "...speed of 10 m/s. 4. A particle moves..." or "...a. 4. A man moves..."
      const midSentenceQ = /(?:[a-zA-Z0-9,\)\]])(?:\s{2,}|\.\s+|\n\s*)(?:Q\.?\s*(\d{1,3})|\b(\d{1,3})\s*[:.\-\]])\s+[A-Z]/g;
      const match = midSentenceQ.exec(content);
      if (match) {
        const leakedNum = parseInt(match[1] || match[2], 10);
        // Ensure it's not a reference to an equation like "equation (1)" or self question number
        const preText = content.substring(0, match.index);
        if (leakedNum !== (i + 1) && !/(?:equation|eq|case|step|figure|fig)\s*$/i.test(preText)) {
          flaggedQuestions.push(i + 1);
          failedIndices.add(i);
          issues.push(`Q${i + 1}: Column bleed detected! Contains injected question start "Q${leakedNum}" mid-statement.`);
          continue;
        }
      }

      // Indicator 2: Leaked institutional headers or footers inside question prose or options
      const optTexts = Array.isArray(q.options)
        ? q.options.map((o: any) => (typeof o === 'string' ? o : o?.text || '')).join(' ')
        : '';
      const fullQText = content + ' ' + optTexts;

      if (/(?:PAGE\s*#?\s*\d+|OFFICE\s+ADDRESS|Plot\s+Number|Near\s+Riddhi|Triveni\s+Nagar|Gopalpura|Jaipur|Rajasthan|\bMob\.\s*\d|www\.[a-z0-9\-]+|BATCH\s*[-–])/i.test(fullQText)) {
        flaggedQuestions.push(i + 1);
        failedIndices.add(i);
        issues.push(`Q${i + 1}: Column bleed/footer contamination! Contains page footer text.`);
      }
    }

    return {
      passed: flaggedQuestions.length === 0,
      flaggedQuestions
    };
  }

  /**
   * Checks answer key coverage across questions.
   */
  private static checkAnswerKeyCoverage(
    questions: any[],
    issues: string[],
    failedIndices: Set<number>
  ): { passed: boolean; partialRatio: number; missingQuestions: number[] } {
    const missingQuestions: number[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ans = String(q.correctAnswer ?? '').trim();
      const isMissing = !ans;
      // '0' is Option A (the first option) in 0-indexed MCQ convention.
      // It is only suspicious as an unkeyed default if there is NO solution/key text and correctAnswer was strictly absent/undefined.
      const isDefaultZero = ans === '0' && q.type !== 'NUMERICAL' && !q.solution?.text && !q.isVerified && (!q.explanation || q.explanation.length < 30) && !q.hasExplicitKey;

      if (isMissing || isDefaultZero) {
        missingQuestions.push(i + 1);
        failedIndices.add(i);
      }
    }

    const missingRatio = missingQuestions.length / questions.length;
    const passed = missingRatio <= 0.20; // Allow up to 20% unkeyed before failing invariant
    const partialRatio = Math.max(0.0, 1.0 - missingRatio);

    if (missingQuestions.length > 0 && !passed) {
      issues.push(`Answer key coverage issue: ${missingQuestions.length}/${questions.length} questions lack valid answer keys.`);
    }

    return { passed, partialRatio, missingQuestions };
  }

  /**
   * Checks sanity of cropped diagram attachments.
   */
  private static checkDiagramSanity(
    questions: any[],
    issues: string[],
    failedIndices: Set<number>
  ): { passed: boolean; suspiciousQuestions: number[] } {
    const suspiciousQuestions: number[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const content = q.content || '';

      // Check explicit diagram reference
      const requiresDiagram = /\b(?:given\s+(?:figure|diagram)|shown\s+in\s+(?:the\s+)?figure|circuit\s+diagram|refer\s+to\s+(?:the\s+)?diagram|graph\s+shown)\b/i.test(content);

      if ((requiresDiagram || q.hasDiagram) && !q.imageUrl) {
        suspiciousQuestions.push(i + 1);
        failedIndices.add(i);
        issues.push(`Q${i + 1}: ${requiresDiagram ? 'Explicitly references a figure or circuit diagram' : 'Marked as having a diagram'}, but no diagram is attached.`);
      }

      // Check for broken tiny placeholder image
      if (q.imageUrl && typeof q.imageUrl === 'string') {
        if (q.imageUrl.length < 200) {
          suspiciousQuestions.push(i + 1);
          failedIndices.add(i);
          issues.push(`Q${i + 1}: Attached diagram data URL is suspiciously short (${q.imageUrl.length} chars). Possible blank crop.`);
        }
      }
    }

    const passed = suspiciousQuestions.length === 0;
    return { passed, suspiciousQuestions };
  }

  /**
   * Extracts question number from metadata or statement text.
   */
  private static extractQuestionNumber(q: any): number | null {
    if (typeof q?.qNumber === 'number' && q.qNumber > 0) return q.qNumber;
    if (typeof q?.localQuestionNumber === 'number' && q.localQuestionNumber > 0) return q.localQuestionNumber;
    if (typeof q?.questionNumber === 'number' && q.questionNumber > 0) return q.questionNumber;

    const content = String(q?.content || '').trim();
    const match = content.match(/^(?:\[?\s*Q(?:uestion)?\.?\s*(\d{1,3})|\[\s*(\d{1,3})\s*\]|(\d{1,3})\s*[:.\-\]\)])/i);
    if (match) {
      const num = parseInt(match[1] || match[2] || match[3], 10);
      if (!isNaN(num) && num > 0) return num;
    }

    return null;
  }

  /**
   * Resolves physical PDF page for a question.
   */
  private static resolveQuestionPage(
    q: any,
    qIdx: number,
    totalQuestions: number,
    context?: ValidationContext
  ): number | null {
    if (typeof q?.pageNumber === 'number' && q.pageNumber > 0) return q.pageNumber;
    if (typeof q?.diagramPage === 'number' && q.diagramPage > 0) return q.diagramPage;

    // Check [PAGE n] markers in rawText for deterministic page tracking
    if (context?.rawText) {
      const pageRegex = /\[PAGE\s+(\d+)\]/g;
      const pageMarkers: { page: number; index: number }[] = [];
      let pm;
      while ((pm = pageRegex.exec(context.rawText)) !== null) {
        pageMarkers.push({ page: parseInt(pm[1], 10), index: pm.index });
      }

      if (pageMarkers.length > 0) {
        const snippet = (q?.content || '').substring(0, 35).replace(/[\r\n\t]+/g, ' ').trim();
        const qNum = this.extractQuestionNumber(q) || (qIdx + 1);
        let qPos = -1;
        if (snippet.length > 10) {
          qPos = context.rawText.indexOf(snippet);
        }
        if (qPos === -1 && qNum) {
          const qNumRegex = new RegExp(`(?:^|\\n)\\s*${qNum}[.:\\)]\\s+`);
          const m = qNumRegex.exec(context.rawText);
          if (m) qPos = m.index;
        }

        if (qPos >= 0) {
          let resolvedPage = pageMarkers[0].page;
          for (const marker of pageMarkers) {
            if (marker.index <= qPos) {
              resolvedPage = marker.page;
            } else {
              break;
            }
          }
          return resolvedPage;
        }
      }
    }

    // Estimate page from index and total pages
    const totalPages = context?.totalPages || 1;
    if (totalPages > 1 && totalQuestions > 0) {
      const estimatedPage = Math.min(totalPages, Math.max(1, Math.ceil(((qIdx + 1) / totalQuestions) * totalPages)));
      return estimatedPage;
    }

    return 1;
  }
}
