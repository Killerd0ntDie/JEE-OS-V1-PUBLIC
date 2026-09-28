import { sanitizeHtmlContent } from './sanitizeHtml';
import {
  OptionLayout,
  ParsedOption,
  OptionValidationResult,
  ExtractedBlockOptions,
  QuestionBlock
} from './types';

export type { OptionLayout, ParsedOption, OptionValidationResult, ExtractedBlockOptions };

export interface OptionNormalizationHooks {
  foldStackedFractions?: (text: string) => string;
  normalizeMathToLatex?: (text: string) => string;
  sanitizeQuestionText?: (text: string) => string;
}

export interface MarkerMatch {
  index: number;
  length: number;
  label: string; // 'A', 'B', 'C', 'D' or '1', '2', '3', '4'
  isNumeric: boolean;
}

export class OptionExtractor {
  /**
   * Strips genuine option markers like "(A)", "A)", "A]", "1)", "1]", "A.", "1." from option text.
   * NEVER strips numbers followed by decimals (e.g. "1.2 × 10^-18 J"), colons (e.g. "3 : 2"),
   * negative signs (e.g. "-4"), or bare numbers (e.g. "4").
   */
  static sanitizeOptionText(opt: string): string {
    if (!opt) return '';
    const clean = sanitizeHtmlContent(opt);
    const text = clean.replace(/^,\s*(?=\([A-Da-d1-4]\)|[A-Da-d1-4]\b)/, '(A), ');
    return text
      .replace(
        /^\s*(?:\([a-dA-D1-4]\)|\[[a-dA-D1-4]\]|[a-dA-D1-4]\s*[\)\]]|[a-dA-D]\s*[:.]|\b[1-4]\.\s+)(?!\s*(?:[,\+&]|\band\b|\bor\b|\(|\/))\s*/,
        ''
      )
      // Strip institutional address/footer leaks
      .replace(/(?:^|\n|\r|\s{2,})(?:OFFICE\s+ADDRESS|Plot\s+Number|Near\s+Riddhi|Triveni\s+Nagar|Gopalpura|Jaipur|Rajasthan|\bMob\.\s*\d|www\.[a-z0-9\-]+|PAGE\s*#?\s*\d*|BATCH\s*[-–])[\s\S]*$/i, '')
      .trim();
  }

  /**
   * Checks if an options list contains surrogate letter combinations (e.g. "(A), (C), (D)" or ", (C), (D)")
   */
  static isSurrogateOpt(optList: any[]): boolean {
    if (!Array.isArray(optList) || optList.length < 4) return true;
    return optList.some(o => {
      const t = (typeof o === 'string' ? o : (o?.text || '')).trim();
      return /^(?:,?\s*\(?[A-D]\)?[\s,]+)+(?:\(?[A-D]\)?)?$/i.test(t) || /^Option\s*\([1-4A-D]\)$/i.test(t);
    });
  }

  /**
   * Checks if an options list contains real distinct text statements.
   */
  static hasRealOpts(optList: any[]): boolean {
    if (!Array.isArray(optList) || optList.length < 4) return false;
    return optList.every(o => {
      const t = (typeof o === 'string' ? o : (o?.text || '')).trim();
      return t.length > 3 && !/^(?:,?\s*\(?[A-D]\)?[\s,]+)+(?:\(?[A-D]\)?)?$/i.test(t) && !/^Option\s*\([1-4A-D]\)$/i.test(t);
    });
  }

  /**
   * Cleans diagram question options so they appear as clean (A), (B), (C), (D) buttons.
   */
  static cleanOptions(opts: any[] | undefined): void {
    if (!Array.isArray(opts) || opts.length === 0) return;
    for (let i = 0; i < opts.length; i++) {
      const char = String.fromCharCode(65 + i);
      const defaultLabel = `(${char})`;
      if (typeof opts[i] === 'string') {
        const t = opts[i].trim();
        // NEVER replace bare numeric values like "1", "2", "3", "4", "0", "-1"
        if (/!\[.*?\]\(.*?\)/.test(t) || !t || /structure\s*\([A-D]\)/i.test(t) || /^\s*\([A-D]\)\s*$/i.test(t)) {
          opts[i] = defaultLabel;
        }
      } else if (opts[i] && typeof opts[i] === 'object') {
        const t = (opts[i].text || '').trim();
        // NEVER replace bare numeric values like "1", "2", "3", "4", "0", "-1"
        if (/!\[.*?\]\(.*?\)/.test(t) || !t || /structure\s*\([A-D]\)/i.test(t) || /^\s*\([A-D]\)\s*$/i.test(t)) {
          opts[i].text = defaultLabel;
        }
      }
    }
  }

  /**
   * Detects the layout of options within the question block.
   * Recognizes: 'stacked', 'horizontal', 'two-column', 'diagram', 'numbered', 'unknown'.
   */
  static detectLayout(
    text: string,
    questionBlock?: QuestionBlock,
    matches?: MarkerMatch[]
  ): OptionLayout {
    // 1. Diagram question check
    const isDiagramContext = /graph|figure|diagram|shown below|plot|curve|orbital|structure\s*\([A-D]\)/i.test(text);
    if (isDiagramContext && (!matches || matches.length === 0)) {
      return 'diagram';
    }

    // 2. Visual layout model from QuestionBlock (Phase 1 engine)
    if (questionBlock?.optionLines && questionBlock.optionLines.length > 0) {
      if (questionBlock.optionLines.length === 1) return 'horizontal';
      if (questionBlock.optionLines.length === 2) return 'two-column';
      if (questionBlock.optionLines.length >= 4) return 'stacked';
    }

    if (!matches || matches.length < 4) {
      return isDiagramContext ? 'diagram' : 'unknown';
    }

    // 3. Numbered layout: if markers are 1, 2, 3, 4
    if (matches[0].isNumeric) {
      return 'numbered';
    }

    // 4. Inspect newline distribution between markers in text
    const m0 = matches[0];
    const m1 = matches[1];
    const m2 = matches[2];
    const m3 = matches[3];

    const span01 = text.substring(m0.index + m0.length, m1.index);
    const span12 = text.substring(m1.index + m1.length, m2.index);
    const span23 = text.substring(m2.index + m2.length, m3.index);

    const nl01 = (span01.match(/\n/g) || []).length;
    const nl12 = (span12.match(/\n/g) || []).length;
    const nl23 = (span23.match(/\n/g) || []).length;

    // Horizontal: all 4 markers on the same line (0 newlines between any pairs)
    if (nl01 === 0 && nl12 === 0 && nl23 === 0) {
      return 'horizontal';
    }

    // Two-Column (2x2 Grid):
    // Line 1 has (A) and (B) (0 newlines between them)
    // Line 2 has (C) and (D) (0 newlines between them)
    // With newline between (B) and (C)
    if (nl01 === 0 && nl12 >= 1 && nl23 === 0) {
      return 'two-column';
    }

    // Check if options are column-major 2x2 (large horizontal spacing / tabs)
    if ((nl01 >= 1 && nl12 === 0 && nl23 >= 1) || (span01.includes('\t') && span23.includes('\t'))) {
      return 'two-column';
    }

    // Stacked: each option starts on its own line
    if (nl01 >= 1 && nl12 >= 1 && nl23 >= 1) {
      return 'stacked';
    }

    // Default with 4 alpha options
    return 'stacked';
  }

  /**
   * Layout-specific extractor for stacked vertical options:
   * (A) option A\n(B) option B\n(C) option C\n(D) option D
   */
  static extractStacked(rawOpts: string[]): ParsedOption[] {
    const ids = ['A', 'B', 'C', 'D'];
    return ids.map((id, i) => {
      const raw = rawOpts[i] || '';
      const text = OptionExtractor.sanitizeOptionText(raw);
      return {
        id,
        text,
        rawText: raw.trim()
      };
    });
  }

  /**
   * Layout-specific extractor for horizontal inline options:
   * (A) text (B) text (C) text (D) text
   */
  static extractHorizontal(rawOpts: string[]): ParsedOption[] {
    const ids = ['A', 'B', 'C', 'D'];
    return ids.map((id, i) => {
      const raw = rawOpts[i] || '';
      const cleaned = raw.replace(/[\t\r\n]+/g, ' ').trim();
      const text = OptionExtractor.sanitizeOptionText(cleaned);
      return {
        id,
        text,
        rawText: raw.trim()
      };
    });
  }

  /**
   * Layout-specific extractor for 2x2 two-column options:
   * (A) opt A    (B) opt B
   * (C) opt C    (D) opt D
   */
  static extractTwoColumn(rawOpts: string[], matches?: MarkerMatch[]): ParsedOption[] {
    const ids = ['A', 'B', 'C', 'D'];
    return ids.map((id, i) => {
      const raw = rawOpts[i] || '';
      const text = OptionExtractor.sanitizeOptionText(raw.replace(/\r?\n/g, ' '));
      return {
        id,
        text,
        rawText: raw.trim()
      };
    });
  }

  /**
   * Layout-specific extractor for diagram-based options (structures, plots, charts):
   * Outputs clean (A), (B), (C), (D) button options.
   */
  static extractDiagramLabels(rawOpts?: string[]): ParsedOption[] {
    const ids = ['A', 'B', 'C', 'D'];
    return ids.map((id, i) => {
      const raw = rawOpts && rawOpts[i] ? rawOpts[i] : `(${id})`;
      const clean = OptionExtractor.sanitizeOptionText(raw);
      return {
        id,
        text: clean || `(${id})`,
        rawText: raw
      };
    });
  }

  /**
   * Layout-specific extractor for numbered options:
   * (1) text (2) text (3) text (4) text
   * Normalizes numeric markers 1, 2, 3, 4 into IDs 'A', 'B', 'C', 'D'.
   */
  static extractNumbered(rawOpts: string[]): ParsedOption[] {
    const ids = ['A', 'B', 'C', 'D'];
    return ids.map((id, i) => {
      const raw = rawOpts[i] || '';
      const text = OptionExtractor.sanitizeOptionText(raw);
      return {
        id,
        text,
        rawText: raw.trim()
      };
    });
  }

  /**
   * Validates parsed options against JEE mock test requirements:
   * - Exactly 4 options for MCQ / MULTI
   * - Non-empty option statements
   * - Distinct options (no duplicates)
   * - Zero leakage of question body, section headers, or subsequent questions
   */
  static validate(options: ParsedOption[], questionType?: string): OptionValidationResult {
    const issues: string[] = [];

    // Classify layout
    let layout: OptionLayout = 'stacked';
    const isDiagramLabels = options.length === 4 && options.every((o, idx) => {
      const char = String.fromCharCode(65 + idx);
      return o.text === `(${char})` || o.text === char;
    });

    if (isDiagramLabels) {
      layout = 'diagram';
    }

    // 1. Length validation
    const typeUpper = (questionType || 'MCQ').toUpperCase();
    const isMcq = typeUpper === 'MCQ' || typeUpper === 'MULTI' || typeUpper === 'SINGLE';
    if (isMcq && options.length !== 4) {
      issues.push(`Expected 4 options for ${typeUpper}, found ${options.length}`);
    }

    // 2. Non-empty text validation
    for (const opt of options) {
      if (!opt.text || opt.text.trim().length === 0) {
        issues.push(`Option ${opt.id} text is empty`);
      }
    }

    // 3. Duplicate detection (unless diagram label placeholders)
    if (!isDiagramLabels && options.length > 1) {
      const seen = new Set<string>();
      for (const opt of options) {
        const norm = opt.text.trim().toLowerCase();
        if (norm && seen.has(norm)) {
          issues.push(`Duplicate option text detected: "${opt.text.trim()}"`);
        }
        seen.add(norm);
      }
    }

    // 4. Leakage detection (section headers or subsequent question numbers)
    const headerLeakRegex = /(?:^|\n)\s*(?:LEVEL\s*[-–]\s*\d+|INTEGER\s+TYPE|NUMERICAL\s+VALUE|SINGLE\s+CORRECT|SECTION\s*[-–\s]\s*[A-Z0-9]+|PART\s*[-–\s]\s*[A-Z0-9]+|ANSWER\s*KEYS?|KEY\s*SHEET)/i;
    const nextQLeakRegex = /(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*\d+|\b\d{1,3}\.\s+[A-Z])/i;

    for (const opt of options) {
      if (headerLeakRegex.test(opt.text)) {
        issues.push(`Option ${opt.id} contains leaked section header or answer key`);
      }
      if (nextQLeakRegex.test(opt.text)) {
        issues.push(`Option ${opt.id} contains leaked subsequent question text`);
      }
    }

    // 5. Surrogate check
    if (OptionExtractor.isSurrogateOpt(options)) {
      issues.push(`Option list contains surrogate letters or placeholder combinations`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      layout
    };
  }

  /**
   * Intelligently extracts 4 options from a question block across diverse coaching layouts.
   * Handles LaTeX masking, chemistry naming preservation, layout detection, and option normalization.
   */
  static extractOptionsFromBlock(
    contentBeforeKey: string,
    questionBlock?: QuestionBlock,
    hooks?: OptionNormalizationHooks
  ): ExtractedBlockOptions {
    const sanitizedBlock = contentBeforeKey
      .replace(
        /(?:^|\n|\r|\s{2,})(?:\[PAGE\s*\d+\]\s*)?(?:ANSWER\s*KEYS?|KEY\s*SHEET|SOLUTIONS?\s+KEY|HINTS\s+(?:&|AND)\s+ANSWERS?)[\s\S]*$/i,
        ''
      )
      .trim();

    // 1. Mask math environments ($$, \[\], \(\), $) with spaces to protect math parentheses
    let maskedBlock = sanitizedBlock.replace(
      /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?:\$[^$\n]+?\$)/g,
      match => ' '.repeat(match.length)
    );

    // 2. Mask chemistry compound designations like Compound (A), Product (B), Reagent (C)
    maskedBlock = maskedBlock.replace(
      /\b(?:compound|product|reagent|reactant|intermediate|substance|gas|salt|isomer|hydrocarbon|complex|structure|molecule|sample|element)\s*\([A-Da-d1-4]\)/gi,
      match => ' '.repeat(match.length)
    );

    // 3. Mask matrix designations like Matrix (A), Matrix (B)
    maskedBlock = maskedBlock.replace(
      /\b(?:matrix|matrices|set|vector|state)\s*\([A-Da-d1-4]\)/gi,
      match => ' '.repeat(match.length)
    );

    // Sequence validator: verifies exactly 4 sequential markers (A-D or 1-4)
    const isValidSequence = (arr: MarkerMatch[]): boolean => {
      if (arr.length !== 4) return false;
      const labels = arr.map(m => m.label.toUpperCase());
      const isAlphaSeq = labels[0] === 'A' && labels[1] === 'B' && labels[2] === 'C' && labels[3] === 'D';
      const isNumSeq = labels[0] === '1' && labels[1] === '2' && labels[2] === '3' && labels[3] === '4';
      return isAlphaSeq || isNumSeq;
    };

    const findValidOptionSequence = (allMatches: MarkerMatch[]): MarkerMatch[] | null => {
      if (allMatches.length < 4) return null;
      for (let i = allMatches.length - 4; i >= 0; i--) {
        const candidate = allMatches.slice(i, i + 4);
        if (isValidSequence(candidate)) {
          return candidate;
        }
      }
      return null;
    };

    const collectMatches = (regex: RegExp, isNumeric: boolean): MarkerMatch[] => {
      const list: MarkerMatch[] = [];
      for (const m of maskedBlock.matchAll(regex)) {
        if (m.index !== undefined) {
          let matchIdx = m.index;
          let matchStr = m[0];
          const ws = matchStr.match(/^[\s\r\n]+/);
          if (ws) {
            matchIdx += ws[0].length;
            matchStr = matchStr.substring(ws[0].length);
          }
          const label = m[1] || m[2] || m[3] || '';
          list.push({
            index: matchIdx,
            length: matchStr.length,
            label,
            isNumeric
          });
        }
      }
      return list;
    };

    let validMatches: MarkerMatch[] | null = null;

    // Candidate Alpha sequence: (A)-(D) or A]-D] or [A]-[D]
    const candAlphaParen = findValidOptionSequence(collectMatches(/(?:^|\s)\(([a-dA-D])\)/g, false));
    const candAlphaBracket = !candAlphaParen ? findValidOptionSequence(collectMatches(/(?:^|\s)([a-dA-D])\]/g, false)) : null;
    const candAlphaSquare = (!candAlphaParen && !candAlphaBracket) ? findValidOptionSequence(collectMatches(/(?:^|\s)\[([a-dA-D])\]/g, false)) : null;
    const candAlpha = candAlphaParen || candAlphaBracket || candAlphaSquare;

    // Candidate Numeric sequence: (1)-(4) or 1]-4] or [1]-[4]
    const candNum = findValidOptionSequence(collectMatches(/(?:^|\s)(?:\(([1-4])\)|([1-4])\]|\[([1-4])\])/g, true));

    // If both exist (e.g. multi-statement question with statements A-E followed by options 1-4),
    // pick whichever candidate appears closest to the end of the question block!
    if (candAlpha && candNum) {
      validMatches = candNum[0].index > candAlpha[0].index ? candNum : candAlpha;
    } else if (candAlpha) {
      validMatches = candAlpha;
    } else if (candNum) {
      validMatches = candNum;
    }
    // Priority 5: A. / A) / 1. / 1) at start of line
    if (!validMatches) {
      const lineMatches: MarkerMatch[] = [];
      for (const m of maskedBlock.matchAll(/(?:^|\n)\s*([A-D1-4])[\.\)]\s+/g)) {
        if (m.index !== undefined) {
          let matchIdx = m.index;
          let matchStr = m[0];
          const ws = matchStr.match(/^[\s\r\n]+/);
          if (ws) {
            matchIdx += ws[0].length;
            matchStr = matchStr.substring(ws[0].length);
          }
          const label = m[1] || '';
          const isNum = /[1-4]/.test(label);
          lineMatches.push({
            index: matchIdx,
            length: matchStr.length,
            label,
            isNumeric: isNum
          });
        }
      }
      validMatches = findValidOptionSequence(lineMatches);
    }

    if (validMatches) {
      const firstOptIdx = validMatches[0].index;
      const qBody = sanitizedBlock.substring(0, firstOptIdx).trim();

      const o1 = sanitizedBlock.substring(validMatches[0].index, validMatches[1].index);
      const o2 = sanitizedBlock.substring(validMatches[1].index, validMatches[2].index);
      const o3 = sanitizedBlock.substring(validMatches[2].index, validMatches[3].index);
      const rawO4 = sanitizedBlock.substring(validMatches[3].index);

      // Defensively strip section headers or answer keys that leak into the 4th option
      const sectionHeaderRegex = /(?:^|\n)\s*(?:LEVEL\s*[-–]\s*\d+|INTEGER\s+TYPE|NUMERICAL\s+VALUE|SINGLE\s+CORRECT|MTOC|MULTIPLE\s+TYPE|SECTION\s*[-–\s]\s*[A-Z0-9]+|PART\s*[-–\s]\s*[A-Z0-9]+)[\s\S]*$/i;
      const o4 = rawO4.replace(sectionHeaderRegex, '').trim();

      // Detect layout
      const layout = OptionExtractor.detectLayout(sanitizedBlock, questionBlock, validMatches);

      // Extract based on layout
      let parsedOptions: ParsedOption[];
      switch (layout) {
        case 'horizontal':
          parsedOptions = OptionExtractor.extractHorizontal([o1, o2, o3, o4]);
          break;
        case 'two-column':
          parsedOptions = OptionExtractor.extractTwoColumn([o1, o2, o3, o4], validMatches);
          break;
        case 'numbered':
          parsedOptions = OptionExtractor.extractNumbered([o1, o2, o3, o4]);
          break;
        case 'diagram':
          parsedOptions = OptionExtractor.extractDiagramLabels([o1, o2, o3, o4]);
          break;
        case 'stacked':
        default:
          parsedOptions = OptionExtractor.extractStacked([o1, o2, o3, o4]);
          break;
      }

      // Apply normalization hooks (KaTeX, fraction folding, etc.)
      parsedOptions = parsedOptions.map((opt, idx) => {
        let text = opt.text;
        if (hooks?.foldStackedFractions) text = hooks.foldStackedFractions(text);
        if (hooks?.normalizeMathToLatex) text = hooks.normalizeMathToLatex(text);
        text = text.replace(/\n+/g, ' ').trim();
        return {
          ...opt,
          text
        };
      });

      // Handle diagram questions where text options are empty or minimal
      const isDiagramQuestion =
        /graph|figure|diagram|shown below|plot|curve|orbital/i.test(qBody) ||
        parsedOptions.every(o => !o.text);

      if (isDiagramQuestion) {
        for (let i = 0; i < parsedOptions.length; i++) {
          if (!parsedOptions[i].text) {
            parsedOptions[i].text = `Graph / Figure (${i + 1}) [Refer to PDF]`;
          }
        }
      } else {
        for (let i = 0; i < parsedOptions.length; i++) {
          if (!parsedOptions[i].text) {
            parsedOptions[i].text = `Option (${i + 1})`;
          }
        }
      }

      // Format question body
      let cleanQBody = qBody;
      if (hooks?.foldStackedFractions) cleanQBody = hooks.foldStackedFractions(cleanQBody);
      if (hooks?.sanitizeQuestionText) cleanQBody = hooks.sanitizeQuestionText(cleanQBody);
      if (hooks?.normalizeMathToLatex) cleanQBody = hooks.normalizeMathToLatex(cleanQBody);

      const validation = OptionExtractor.validate(parsedOptions);

      return {
        hasOptions: true,
        questionBody: cleanQBody,
        options: parsedOptions,
        layout,
        validation
      };
    }

    // No valid option sequence found
    let cleanQBody = contentBeforeKey;
    if (hooks?.foldStackedFractions) cleanQBody = hooks.foldStackedFractions(cleanQBody);
    if (hooks?.sanitizeQuestionText) cleanQBody = hooks.sanitizeQuestionText(cleanQBody);
    if (hooks?.normalizeMathToLatex) cleanQBody = hooks.normalizeMathToLatex(cleanQBody);

    return {
      hasOptions: false,
      questionBody: cleanQBody,
      options: undefined,
      layout: 'unknown'
    };
  }

  /**
   * Recovers options when a 2x2 grid collapses and option 2 or 4 is swallowed into option 1 or 3.
   */
  static repairSwallowedOptions(options: { id: string; text: string }[]): { id: string; text: string }[] {
    if (!Array.isArray(options) || options.length !== 4) return options;
    const result = options.map(o => ({ ...o }));

    const isDummy = (t: string) => !t || /^Option\s*\([A-D1-4]\)$/i.test(t.trim());

    // 1. If Option B is dummy / empty, check if Option A swallowed "(2)" or "(B)"
    if (isDummy(result[1].text)) {
      const splitMatch = result[0].text.match(/(?:^|\n|\s+)(?:\(([2B])\)|\[([2B])\]|\b2\.\s+)\s*([\s\S]*)$/);
      if (splitMatch && splitMatch.index !== undefined) {
        const textA = result[0].text.substring(0, splitMatch.index).trim();
        const textB = (splitMatch[3] || '').trim();
        if (textA) {
          result[0].text = textA;
          result[1].text = textB || result[1].text;
        }
      }
    }

    // 2. If Option D is dummy / empty, check if Option C swallowed "(4)" or "(D)"
    if (isDummy(result[3].text)) {
      const splitMatch = result[2].text.match(/(?:^|\n|\s+)(?:\(([4D])\)|\[([4D])\]|\b4\.\s+)\s*([\s\S]*)$/);
      if (splitMatch && splitMatch.index !== undefined) {
        const textC = result[2].text.substring(0, splitMatch.index).trim();
        const textD = (splitMatch[3] || '').trim();
        if (textC) {
          result[2].text = textC;
          result[3].text = textD || result[3].text;
        }
      }
    }

    return result;
  }
}

