import { sanitizeHtmlContent } from './sanitizeHtml';
import { normalizeChemistryAndOrbitals, sanitizeCorruptedLatex, replaceAdobeSymbolFont } from '@/components/MathRenderer';
import { PdfLexicalParser } from '../PdfLexicalParser';
import { AnswerKeyExtractor, ExtractedGlobalAnswerKey } from './AnswerKeyExtractor';
import { OptionExtractor } from './OptionExtractor';
import { SubjectId } from '@/types/mockTest';

export class PdfOfflineParser {
  /**
   * Sanitizes question content to guarantee zero leading prefixes, numbers, or brackets (e.g. "]", "Q27]", "1.")
   * Defensively preserves questions that legitimately begin with numerical quantities (e.g. "2 moles of gas")
   */
  static sanitizeQuestionText(text: string): string {
    if (!text) return '';
    const clean = sanitizeHtmlContent(text);
    return clean
      .replace(/\r/g, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/\\?ightarrow\b/g, '\\rightarrow')
      .replace(/\bightarrow\b/g, '\\rightarrow')
      .replace(/\\n(?![a-zA-Z])/g, '\n')
      .replace(/\\r(?![a-zA-Z])/g, '')
      .replace(/\\q?quad\s*(?=\([ivxlcdm\d]+\))/gi, '\n')
      .replace(/\\q?quad\s*/gi, '   ')
      // Strip leaked institutional address/footer metadata
      .replace(/(?:^|\n|\r|\s{2,})(?:OFFICE\s+ADDRESS|Plot\s+Number|Near\s+Riddhi|Triveni\s+Nagar|Gopalpura|Jaipur|Rajasthan|\bMob\.\s*\d|www\.[a-z0-9\-]+|PAGE\s*#?\s*\d*|BATCH\s*[-–])[\s\S]*$/i, '')
      // Strip leaked section headers (e.g. "PART - III : ONE OR MORE THAN ONE OPTIONS CORRECT TYPE\n")
      .replace(/^(?:PART\s*[-–]\s*[IVX\d]+(?:\s*[:.\-]?\s*[^\n]+)?\n*)/i, '')
      // Strip leading question markers: "Q1]", "Q27]", "Q. 27:", "Question 27.", "1)", "1.", "[Q1]", etc.
      .replace(/^(?:\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\]\)]*|\[\s*\d{1,3}\s*\]|\b\d{1,3}\s*[:.\-\]\)])\s*/i, '')
      // Strip any residual leading brackets or punctuation (e.g., "]" or ")" or ":")
      .replace(/^[\]\)\:\-\.]+\s*/, '')
      // Defensively strip trailing answer keys if leaked into question block
      .replace(/(?:^|\n|\r|\s{2,})(?:\[PAGE\s*\d+\]\s*)?(?:ANSWER\s*KEYS?|KEY\s*SHEET|SOLUTIONS?\s+KEY|HINTS\s+(?:&|AND)\s+ANSWERS?)[\s\S]*$/i, '')
      .trim();
  }

  /**
   * Delegates option sanitization to OptionExtractor.
   */
  static sanitizeOptionText(opt: string): string {
    return OptionExtractor.sanitizeOptionText(opt);
  }

  /**
   * Normalizes raw math, OCR artifacts, and scientific notation into standard KaTeX/LaTeX.
   */
  static normalizeMathToLatex(text: string): string {
    if (!text) return '';
    if (text.includes('<svg') && text.includes('</svg>')) {
      return text;
    }

    let out = sanitizeCorruptedLatex(text);
    out = replaceAdobeSymbolFont(out);
    out = out.replace(/\\nu\s*([0-9])\b/g, '$\\nu_$1$');
    out = out.replace(/\(\s*\\nu\s*\)/g, '($\\nu$)');

    // 1. Unicode minus & math signs
    out = out
      .replace(/\u2212/gu, '-')
      .replace(/\u00d7/gu, ' \\times ')
      .replace(/Å/gu, ' \\text{\\AA} ')
      .replace(/\\delta/gi, ' \\delta ')
      .replace(/\\Delta/g, ' \\Delta ');

    // 2. Pre-process compound radical fractions
    out = out.replace(/√\s*\(([^\)]+)\)\s*\/\s*([^\s,\)]+)/g, '$\\frac{\\sqrt{$1}}{$2}$');
    out = out.replace(/√\s*([^\s\/\(\)]+)\s*\/\s*\(([^\)]+)\)/g, '$\\sqrt{\\frac{$1}{$2}}$');
    out = out.replace(/√\s*([^\s\(\)]+)\s*\(([^\)]+)\)/g, '$\\sqrt{$1($2)}$');

    // 3. Radicals / square roots
    if (out.includes('√')) {
      let radicalResult = '';
      let i = 0;
      while (i < out.length) {
        if (out[i] === '√') {
          let j = i + 1;
          while (j < out.length && /\s/.test(out[j])) j++;
          if (out[j] === '(') {
            let depth = 0;
            let k = j;
            for (; k < out.length; k++) {
              if (out[k] === '(') depth++;
              else if (out[k] === ')') {
                depth--;
                if (depth === 0) break;
              }
            }
            if (depth === 0) {
              const inner = out.slice(j + 1, k).trim();
              radicalResult += '$\\sqrt{' + inner + '}$';
              i = k + 1;
              continue;
            }
          }
          const tokenMatch = out.slice(j).match(/^[^\s,;\(\)\}\]]+/);
          if (tokenMatch) {
            radicalResult += '$\\sqrt{' + tokenMatch[0].trim() + '}$';
            i = j + tokenMatch[0].length;
            continue;
          }
        }
        radicalResult += out[i];
        i++;
      }
      out = radicalResult;
    }

    // 3. Greek symbols & Mathematical Alphanumeric Unicode Symbols from OCR
    out = out
      .replace(/[\u{1D706}\u03BBλ]/gu, '\\lambda ')
      .replace(/[\u{1D445}]/gu, 'R')
      .replace(/[\u{1D45F}]/gu, 'r')
      .replace(/[\u{1D713}\u03C8ψ]/gu, '\\psi ')
      .replace(/[\u{1D703}\u03B8θ]/gu, '\\theta ')
      .replace(/[\u{1D719}\u03D5\u03C6ϕφ]/gu, '\\phi ')
      .replace(/[\u{1D70B}\u03C0π]/gu, '\\pi ')
      .replace(/[\u{1D707}\u03BCμ]/gu, '\\mu ')
      .replace(/[\u{1D708}\u03BDν]/gu, '\\nu ')
      .replace(/[\u{1D70E}\u03C3σ]/gu, '\\sigma ');

    // 4. Scientific notation
    out = out.replace(/(\b\d+(?:\.\d+)?)\s*(?:\\times|[×x*])\s*10\s*(?:\^|\s*)\s*([-–]?\s*\d+)(?:\s*([A-Za-z\/\-]+))?/gi, (_m, val, exp, unit) => {
      const cleanExp = exp.replace(/\s+/g, '').replace(/[–]/g, '-');
      return '$' + val + ' \\times 10^{' + cleanExp + '}' + (unit ? ' \\text{ ' + unit.trim() + '}' : '') + '$';
    });

    // 5. Powers of 10 without leading number
    out = out.replace(/(?<!\d)\b10\s*[-–]\s*(\d+)(?:\s*([A-Za-z\/\-]+))?/gi, (_m, exp, unit) => {
      return '$10^{-' + exp + '}' + (unit ? ' \\text{ ' + unit.trim() + '}' : '') + '$';
    });

    // 6. Subscripts & powers
    out = out.replace(/\ba\s+[oO0]\b/g, 'a_0');
    out = out.replace(/\\sigma\s*2\b/g, '\\sigma^2');
    out = out.replace(/\be\s*\n+\s*([-\u2212]\s*\\?[a-zA-Z0-9\/]+)/g, 'e^{$1}');
    out = out.replace(/\)\s*3\/2\b/g, ')^{3/2}');
    out = out.replace(/\br\s+1\/2\b/g, '$r^{1/2}$');
    out = out.replace(/\br\s+-1\/2\b/g, '$r^{-1/2}$');
    out = out.replace(/\br\s+-1\b/g, '$r^{-1}$');
    out = out.replace(/\\psi\s*2\s*\(\s*r\s*,\s*\\theta\s*,\s*\\phi\s*\)/gi, '$\\psi^2(r, \\theta, \\phi)$');

    // 7. Fractions
    out = out.replace(/\bh\s*\/\s*2\s*\\pi\b/g, '$\\frac{h}{2\\pi}$');
    out = out.replace(/\bh\s*\/\s*\\pi\b/g, '$\\frac{h}{\\pi}$');
    out = out.replace(/\b2h\s*\/\s*\\pi\b/g, '$\\frac{2h}{\\pi}$');
    out = out.replace(/\bh\s*\/\s*4\s*\\pi\b/g, '$\\frac{h}{4\\pi}$');
    out = out.replace(/\bR\/9\b/g, '$\\frac{R}{9}$');
    out = out.replace(/\b9\/R\b/g, '$\\frac{9}{R}$');
    out = out.replace(/\b1\/R\b/g, '$\\frac{1}{R}$');
    out = out.replace(/\b9R\/4\b/g, '$\\frac{9R}{4}$');
    out = out.replace(/\b4x\/3\b/g, '$\\frac{4x}{3}$');
    out = out.replace(/\b9x\/2\b/g, '$\\frac{9x}{2}$');
    out = out.replace(/\\lambda\s*\/\s*(\d+)/g, '$\\frac{\\lambda}{$1}$');

    // 8. Ions
    out = out.replace(/\bLi\s*2\+?\s*(?:ion)?\b/gi, '$\\text{Li}^{2+}\\text{ ion}$');
    out = out.replace(/\bHe\s*\+?\s+ion\b/gi, '$\\text{He}^+\\text{ ion}$');

    // 9. Quantum numbers and constants
    out = out.replace(/\bm\s*l\s*=/g, 'm_l = ');
    out = out.replace(/\bm\s*s\s*=/g, 'm_s = ');
    out = out.replace(/\bn\s*g\b/g, '$n_g$');
    out = out.replace(/\bn\s*r\b/g, '$n_r$');
    out = out.replace(/\bN\s*A\b/g, '$N_A$');
    out = out.replace(/\(K\.?E\.?\)\s*max/gi, '$(K.E.)_{\\text{max}}$');

    // 10. Clean consecutive spaces
    out = out.replace(/\\([a-zA-Z]+)\s+\}/g, '\\$1}');
    out = out.replace(/  +/g, ' ');
    out = out.replace(/\$\s*\$/g, '');

    // 11. Normalize chemistry ions & orbitals
    out = normalizeChemistryAndOrbitals(out);

    return out.trim();
  }

  /**
   * Folds multi-line stacked 2D fractions into unified KaTeX fractions.
   */
  static foldStackedFractions(text: string): string {
    if (!text) return '';
    let out = text;
    out = out.replace(/((?:1\/\d+m|1\/m|[a-zA-Z0-9\/]+)?\s*)√\s*\n+\s*([^\n\(\)]+)\s*\n+\s*([^\n\(\)]+)/g, (_m, prefix, num, den) => {
      const p = prefix ? prefix.trim() + ' ' : '';
      return p + '$\\sqrt{\\frac{' + num.trim() + '}{' + den.trim() + '}}$';
    });
    out = out.replace(/((?:1\/\d+m|1\/m|[a-zA-Z0-9\/]+)?\s*)\$\\sqrt\{([^}]+)\}\$\s*\n+\s*([^\n\(\)]+)/g, (_m, prefix, num, den) => {
      const p = prefix ? prefix.trim() + ' ' : '';
      return p + '$\\frac{\\sqrt{' + num.trim() + '}}{' + den.trim() + '}$';
    });
    out = out.replace(/(?:^|\n)\s*1\s*\n+\s*9[√\\]+3\s*(\(?)/g, ' \\frac{1}{9\\sqrt{3}}$1 ');
    out = out.replace(/(?:^|\n)\s*1\s*\n+\s*(?:a_0|a\s*[oO0])\b/g, ' \\frac{1}{a_0} ');
    out = out.replace(/(\d+r\.?Z|\d+rZ|\d+r)\s*\n+\s*(\d+(?:a_0|a\s*[oO0]))/g, ' \\frac{$1}{$2} ');

    return out;
  }

  /**
   * Intelligently extracts 4 options from a question block across diverse coaching layouts.
   * Delegates to OptionExtractor for layout classification and extraction.
   */
  static extractOptionsFromBlock(contentBeforeKey: string): {
    hasOptions: boolean;
    questionBody: string;
    options?: { id: string; text: string }[];
  } {
    return OptionExtractor.extractOptionsFromBlock(contentBeforeKey, undefined, {
      foldStackedFractions: PdfOfflineParser.foldStackedFractions,
      normalizeMathToLatex: PdfOfflineParser.normalizeMathToLatex,
      sanitizeQuestionText: PdfOfflineParser.sanitizeQuestionText
    });
  }

  /**
   * Offline / fallback parser that identifies question patterns.
   */
  static parsePaperTextHeuristic(rawText: string, targetSubject?: string): any[] {
    const keyData = AnswerKeyExtractor.extractGlobalAnswerKey(rawText);
    const mainText = keyData.hasKeySection && keyData.keySectionStartIndex > 0
      ? rawText.substring(0, keyData.keySectionStartIndex).trim()
      : rawText;

    // 1. Primary Engine: Lexical Stream Tokenizer & State Machine Parser
    try {
      const lexicalQuestions = PdfLexicalParser.parse(mainText, { targetSubject, keyData });
      if (lexicalQuestions && lexicalQuestions.length >= 3) {
        return lexicalQuestions.map(q => {
          const foldedContent = PdfOfflineParser.foldStackedFractions(q.content);
          const sanitizedContent = PdfOfflineParser.sanitizeQuestionText(foldedContent);
          const normalizedContent = PdfOfflineParser.normalizeMathToLatex(sanitizedContent);
          const isDiagramQuestion = /graph|figure|diagram|shown below|plot|curve|orbital/i.test(normalizedContent);

          const repairedOptions = OptionExtractor.repairSwallowedOptions(q.options || []);
          return {
            ...q,
            content: normalizedContent,
            options: repairedOptions.map((opt, idx) => {
              const optClean = PdfOfflineParser.normalizeMathToLatex(PdfOfflineParser.foldStackedFractions(PdfOfflineParser.sanitizeOptionText(opt.text)));
              return {
                id: opt.id,
                text: optClean || (isDiagramQuestion ? `Graph / Figure (${idx + 1}) [Refer to PDF]` : `Option (${opt.id})`)
              };
            })
          };
        });
      }
    } catch (lexicalErr) {
      console.warn('[PdfOfflineParser] Lexical state machine encounter, falling back to legacy blocks parser:', lexicalErr);
    }

    // 2. Secondary Engine: Question block parser for standardized coaching papers
    const qBlockRegex = /(?:^|\n|\r|\s{2,})(?=(?:\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\]\)]*|\[\s*\d{1,3}\s*\]|(?:\n|\r)\s*\d{1,3}\s*[:.\-\]\)]))/i;
    const blocks = mainText.split(qBlockRegex).map(b => b.trim()).filter(b => b.length > 5);

    if (blocks.length >= 3) {
      const parsed = PdfOfflineParser.parseBlocksHeuristic(blocks, mainText, targetSubject, keyData);
      if (parsed.length >= 3) {
        return parsed;
      }
    }

    // 3. Tertiary Fallback: Line-by-line parser
    return PdfOfflineParser.parseLineByLineHeuristic(mainText, targetSubject, keyData);
  }

  /**
   * Robust question block parser for standardized papers.
   */
  static parseBlocksHeuristic(
    blocks: string[],
    rawText: string,
    targetSubject?: string,
    keyData?: ExtractedGlobalAnswerKey
  ): any[] {
    const questions: any[] = [];

    const sampleTextFirst25 = blocks.slice(0, Math.min(25, blocks.length)).join(' ').toLowerCase();
    const mathKeywords = (sampleTextFirst25.match(/\b(roots|quadratic|integral|matrix|matrices|determinant|triangle|ellipse|hyperbola|derivative|differential|domain|function|ap|gp)\b/g) || []).length;
    const physicsKeywords = (sampleTextFirst25.match(/\b(velocity|acceleration|force|momentum|permittivity|electric|magnetic|current|refraction|diffraction|torque|friction|mass|wavelength)\b/g) || []).length;
    const chemistryKeywords = (sampleTextFirst25.match(/\b(atomic|structure|bohr|electron|proton|neutron|quantum|orbital|subshell|rydberg|moles?|molar|equilibrium|enthalpy|acid|base|oxidation|reduction|organic|inorganic|bond|reaction|reagent|isomer|hybridization|electronegativity|ion|gas\s+constant|pv\s*=\s*nrt)\b/gi) || []).length;

    let detectedFirstSubject: SubjectId = 'physics';
    if (chemistryKeywords > physicsKeywords && chemistryKeywords > mathKeywords) {
      detectedFirstSubject = 'chemistry';
    } else if (mathKeywords >= physicsKeywords && mathKeywords >= chemistryKeywords) {
      detectedFirstSubject = 'maths';
    }

    let currentSectionSubject: SubjectId = detectedFirstSubject;
    let currentSectionTitle = 'general';

    for (let i = 0; i < blocks.length; i++) {
      try {
        const block = blocks[i];
        const qNumMatch = block.match(/^(?:Q\.?\s*(\d+)|Question\s*(\d+)|^(\d{1,3}))[.:\-\]\)\s]/i);

        if (!qNumMatch && i === 0) {
          continue;
        }

        const qNum = qNumMatch ? parseInt(qNumMatch[1] || qNumMatch[2] || qNumMatch[3], 10) : (i + 1);

        if (/(?:^|\n)\s*(?:Level\s*[-–]\s*2|SINGLE\s+CORRECT)/i.test(block)) {
          currentSectionTitle = 'single correct';
        } else if (/(?:^|\n)\s*(?:MTOC|MULTIPLE\s+TYPE)/i.test(block)) {
          currentSectionTitle = 'mtoc';
        } else if (/(?:^|\n)\s*(?:INTEGER\s+TYPE|NUMERICAL\s+VALUE)/i.test(block)) {
          currentSectionTitle = 'integer type';
        } else if (/(?:^|\n)\s*Level\s*[-–]\s*1/i.test(block)) {
          currentSectionTitle = 'level-1';
        }

        const lower = block.toLowerCase();
        if (lower.includes('section ii: chemistry') || (lower.includes('chemistry') && lower.includes('section')) || lower.includes('atomic structure')) {
          currentSectionSubject = 'chemistry';
        } else if (lower.includes('section iii: maths') || lower.includes('mathematics') || (lower.includes('maths') && lower.includes('section'))) {
          currentSectionSubject = 'maths';
        } else if (lower.includes('section i: physics') || (lower.includes('physics') && lower.includes('section'))) {
          currentSectionSubject = 'physics';
        }

        let subject: SubjectId = currentSectionSubject;
        if (targetSubject && targetSubject !== 'all') {
          subject = targetSubject as SubjectId;
        } else if (blocks.length >= 60) {
          const perSection = Math.ceil(blocks.length / 3);
          if (detectedFirstSubject === 'maths') {
            if (qNum <= perSection) subject = 'maths';
            else if (qNum <= perSection * 2) subject = 'physics';
            else subject = 'chemistry';
          } else if (detectedFirstSubject === 'chemistry') {
            if (qNum <= perSection) subject = 'chemistry';
            else if (qNum <= perSection * 2) subject = 'physics';
            else subject = 'maths';
          } else {
            if (qNum <= perSection) subject = 'physics';
            else if (qNum <= perSection * 2) subject = 'chemistry';
            else subject = 'maths';
          }
        }

        let cleanBlock = PdfOfflineParser.sanitizeQuestionText(block);
        const keyIdx = cleanBlock.search(/(?:MathonGo\s+)?Answer\s+Keys?|Ans(?:wer)?\s*:/i);
        let contentBeforeKey = keyIdx !== -1 ? cleanBlock.substring(0, keyIdx).trim() : cleanBlock;
        const solIdx = contentBeforeKey.search(/(?:Sol(?:ution)?|Explanation)\s*:/i);
        if (solIdx !== -1) {
          contentBeforeKey = contentBeforeKey.substring(0, solIdx).trim();
        }

        contentBeforeKey = contentBeforeKey
          .replace(/\d{2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\(.*\)/gi, '')
          .replace(/Answer\s+Keys/gi, '')
          .replace(/JEE\s+Main\s+202\d/gi, '')
          .replace(/MathonGo/gi, '')
          .replace(/#PaperPhodnaHai/gi, '')
          .replace(/www\.mathongo\.com/gi, '')
          .trim();

        const optResult = PdfOfflineParser.extractOptionsFromBlock(contentBeforeKey);
        const hasOptions = optResult.hasOptions;
        let isNumerical = false;
        if (hasOptions) {
          isNumerical = false;
        } else if (currentSectionTitle.includes('integer') || currentSectionTitle.includes('numerical')) {
          isNumerical = true;
        } else if (targetSubject && targetSubject !== 'all') {
          isNumerical = (qNum % 25 > 20 || qNum % 25 === 0);
        } else if (blocks.length >= 60) {
          isNumerical = (qNum % 25 > 20 || qNum % 25 === 0);
        }

        let answer = isNumerical ? '0' : '0';
        const numKeyMatch = block.match(/(?:(?:MathonGo\s+)?Answer\s+Keys?|Ans(?:wer)?)\s*:\s*(-?\d+(?:\.\d+)?)/i);
        const mcqKeyMatch = block.match(/(?:(?:MathonGo\s+)?Answer\s+Keys?|Ans(?:wer)?)\s*:\s*(?:\(([1-4A-D])\)|Option\s*([1-4A-D])|\b([A-D])\b)/i);

        if (isNumerical && numKeyMatch) {
          answer = numKeyMatch[1];
        } else if (!isNumerical && mcqKeyMatch) {
          const char = (mcqKeyMatch[1] || mcqKeyMatch[2] || mcqKeyMatch[3]).toUpperCase();
          const map: Record<string, string> = { '1': '0', '2': '1', '3': '2', '4': '3', 'A': '0', 'B': '1', 'C': '2', 'D': '3' };
          answer = map[char] ?? '0';
        } else if (numKeyMatch) {
          answer = numKeyMatch[1];
        } else if (keyData && keyData.hasKeySection) {
          const keyLookup = keyData.lookup(questions.length, qNum, currentSectionTitle);
          if (keyLookup) {
            answer = keyLookup.normalizedAns;
            if (keyLookup.isNumerical && !hasOptions) {
              isNumerical = true;
            }
          }
        }

        let solutionText = '';
        const solMatch = block.match(/(?:Sol(?:ution)?|Explanation)\s*:\s*([\s\S]+?)(?=(?:Q\.?\s*\d+|$))/i);
        if (solMatch) {
          solutionText = PdfOfflineParser.normalizeMathToLatex(solMatch[1].trim());
        }

        let options: { id: string; text: string }[] | undefined = undefined;
        let questionContent = optResult.questionBody;

        if (!isNumerical && hasOptions) {
          options = optResult.options;
        } else if (!isNumerical) {
          options = [
            { id: 'A', text: 'Option (1)' },
            { id: 'B', text: 'Option (2)' },
            { id: 'C', text: 'Option (3)' },
            { id: 'D', text: 'Option (4)' }
          ];
        }

        if (questionContent.length < 5) {
          questionContent = `Question ${qNum}`;
        }

        questions.push({
          topic: `${subject.toUpperCase()} Core Question ${qNum}`,
          subject,
          type: isNumerical ? 'NUMERICAL' : 'MCQ',
          difficulty: 'Medium',
          content: questionContent,
          options,
          correctAnswer: answer,
          solution: {
            text: solutionText || (answer !== '0' ? `Official coaching answer key: ${answer}. Review theoretical concepts and standard JEE methodology.` : 'Review theoretical concepts and standard JEE methodology.'),
            correctOptionIds: isNumerical ? [] : [['A', 'B', 'C', 'D'][parseInt(answer, 10)] || 'A']
          }
        });
      } catch (blockErr) {
        console.warn(`[PdfOfflineParser] Skipped malformed block #${i + 1} during heuristic extraction:`, blockErr);
      }
    }

    return questions;
  }

  /**
   * Line-by-line fallback parser for structured plain text.
   */
  static parseLineByLineHeuristic(
    rawText: string,
    targetSubject?: string,
    keyData?: ExtractedGlobalAnswerKey
  ): any[] {
    const questions: any[] = [];
    const lines = rawText.split('\n');
    let currentSubject: SubjectId = (targetSubject && targetSubject !== 'all') ? (targetSubject as SubjectId) : 'physics';
    let currentSectionTitle = 'general';
    let currentQuestionText = '';
    let currentOptions: string[] = [];

    const commitQuestion = () => {
      try {
        if (currentQuestionText.trim().length > 10) {
          let questionBody = currentQuestionText.trim();
          let extractedOptions: string[] = [...currentOptions];

          if (extractedOptions.length < 2) {
            const optResult = PdfOfflineParser.extractOptionsFromBlock(questionBody);
            if (optResult.hasOptions && optResult.options) {
              questionBody = optResult.questionBody;
              extractedOptions = optResult.options.map(o => o.text);
            }
          }

          const isNumerical = extractedOptions.length < 2;
          let answer = isNumerical ? '0' : '0';

          if (keyData && keyData.hasKeySection) {
            const qNum = questions.length + 1;
            const keyLookup = keyData.lookup(questions.length, qNum, currentSectionTitle);
            if (keyLookup) {
              answer = keyLookup.normalizedAns;
            }
          }

          questions.push({
            topic: `${currentSubject.toUpperCase()} PYQ Question`,
            subject: currentSubject,
            type: isNumerical ? 'NUMERICAL' : 'MCQ',
            difficulty: 'Medium',
            content: PdfOfflineParser.normalizeMathToLatex(PdfOfflineParser.sanitizeQuestionText(questionBody)),
            options: isNumerical ? undefined : extractedOptions.slice(0, 4).map((opt, idx) => ({
              id: ['A', 'B', 'C', 'D'][idx],
              text: PdfOfflineParser.normalizeMathToLatex(PdfOfflineParser.foldStackedFractions(PdfOfflineParser.sanitizeOptionText(opt)))
            })),
            correctAnswer: answer,
            solution: {
              text: answer !== '0' ? `Official answer key: ${answer}. Review theoretical concepts and standard JEE methodology.` : 'Extracted from previous year question paper. Review the theoretical formula and solve step-by-step.',
              correctOptionIds: isNumerical ? [] : [['A', 'B', 'C', 'D'][parseInt(answer, 10)] || 'A']
            }
          });
        }
      } catch (commitErr) {
        console.warn('[PdfOfflineParser LineByLine] Failed to parse question block:', commitErr);
      }
      currentQuestionText = '';
      currentOptions = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (/(?:^|\n)\s*(?:Level\s*[-–]\s*2|SINGLE\s+CORRECT)/i.test(line)) {
        currentSectionTitle = 'single correct';
      } else if (/(?:^|\n)\s*(?:MTOC|MULTIPLE\s+TYPE)/i.test(line)) {
        currentSectionTitle = 'mtoc';
      } else if (/(?:^|\n)\s*(?:INTEGER\s+TYPE|NUMERICAL\s+VALUE)/i.test(line)) {
        currentSectionTitle = 'integer type';
      } else if (/(?:^|\n)\s*Level\s*[-–]\s*1/i.test(line)) {
        currentSectionTitle = 'level-1';
      }

      const lower = line.toLowerCase();
      if (lower.includes('chemistry') || lower.includes('section ii: chemistry') || lower.includes('part b: chemistry')) {
        commitQuestion();
        currentSubject = 'chemistry';
        continue;
      } else if (lower.includes('mathematics') || lower.includes('maths') || lower.includes('section iii: maths') || lower.includes('part c: mathematics')) {
        commitQuestion();
        currentSubject = 'maths';
        continue;
      } else if (lower.includes('physics') && (lower.includes('section i') || lower.includes('part a') || lower.includes('subject:'))) {
        commitQuestion();
        currentSubject = 'physics';
        continue;
      }

      const qMatch = line.match(/^(?:Q\.?\s*(\d+)[:.\-\]\)]*|Question\s*(\d+)[:.\-\]\)]*|^(\d{1,3})[.:\-\]\)]\s*)/i);
      if (qMatch) {
        commitQuestion();
        const cleanLine = PdfOfflineParser.sanitizeQuestionText(line);
        currentQuestionText = cleanLine;
        continue;
      }

      const optMatch = line.match(/^\(?\s*([A-Da-d1-4])\s*[\).\:\]\-]\s*(.+)$/);
      if (optMatch && currentQuestionText) {
        currentOptions.push(PdfOfflineParser.sanitizeOptionText(optMatch[2].trim()));
        continue;
      }

      if (currentQuestionText && /(?:\([A-Da-d1-4]\)|[A-Da-d1-4][\].\)])/i.test(line)) {
        const parts = line.split(/(?:\([A-Da-d1-4]\)|[A-Da-d1-4][\].\)])/i).map(p => PdfOfflineParser.sanitizeOptionText(p.trim())).filter(Boolean);
        if (parts.length >= 2) {
          currentOptions.push(...parts.slice(0, 4));
          continue;
        }
      }

      if (currentQuestionText) {
        currentQuestionText += ' ' + line;
      }
    }

    commitQuestion();
    return questions;
  }

  /**
   * Merges AI-parsed questions with offline/heuristic questions.
   */
  static mergeParsedWithHeuristic(aiQuestions: any[], heuristicQuestions: any[]): any[] {
    if (!heuristicQuestions || heuristicQuestions.length === 0) return aiQuestions;
    if (!aiQuestions || aiQuestions.length === 0) return heuristicQuestions;

    const normalizeSnippet = (s: string) => {
      return (s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 40);
    };

    const merged: any[] = [];
    const usedAiIndices = new Set<number>();

    for (const hq of heuristicQuestions) {
      const hSnippet = normalizeSnippet(hq.content);
      let matchIdx = -1;

      for (let i = 0; i < aiQuestions.length; i++) {
        if (usedAiIndices.has(i)) continue;
        const aiQ = aiQuestions[i];
        const aiSnippet = normalizeSnippet(aiQ.content);
        if (aiSnippet && hSnippet && (aiSnippet.startsWith(hSnippet) || hSnippet.startsWith(aiSnippet) || aiSnippet.includes(hSnippet.substring(0, 25)) || hSnippet.includes(aiSnippet.substring(0, 25)))) {
          matchIdx = i;
          break;
        }
      }

      if (matchIdx !== -1) {
        usedAiIndices.add(matchIdx);
        const aiQ = { ...aiQuestions[matchIdx] };

        if (OptionExtractor.isSurrogateOpt(aiQ.options) && OptionExtractor.hasRealOpts(hq.options)) {
          if (Array.isArray(aiQ.options) && aiQ.options[0]) {
            const firstOptText = typeof aiQ.options[0] === 'string' ? aiQ.options[0] : (aiQ.options[0]?.text || '');
            const letters = firstOptText.replace(/[^A-D]/gi, '').toUpperCase();
            if (letters.length >= 2 && (!aiQ.correctAnswer || aiQ.correctAnswer === '0' || aiQ.correctAnswer === 'A')) {
              aiQ.correctAnswer = letters;
            }
          }
          aiQ.options = hq.options;
          if (hq.correctAnswer && hq.correctAnswer !== '0' && hq.correctAnswer.length > 1) {
            aiQ.correctAnswer = hq.correctAnswer;
          }
        }

        merged.push(aiQ);
      } else {
        merged.push(hq);
      }
    }

    for (let i = 0; i < aiQuestions.length; i++) {
      if (!usedAiIndices.has(i)) {
        merged.push(aiQuestions[i]);
      }
    }

    return merged;
  }
}
