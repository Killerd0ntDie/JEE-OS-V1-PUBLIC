export interface ExtractedAnswerKeyEntry {
  qNum: number;
  rawAns: string;
  normalizedAns: string;
  isNumerical: boolean;
  sectionName?: string;
}

export interface ExtractedGlobalAnswerKey {
  hasKeySection: boolean;
  keySectionStartIndex: number;
  entries: ExtractedAnswerKeyEntry[];
  bySection: Record<string, ExtractedAnswerKeyEntry[]>;
  lookup: (qIndex: number, qNum: number, sectionTitle?: string) => ExtractedAnswerKeyEntry | undefined;
}

export class AnswerKeyExtractor {
  /**
   * Normalizes an answer key string into a canonical answer format.
   * Preserves numerical values 1-4 when section context is numerical or integer.
   */
  static normalizeAnswerValue(
    raw: string,
    context?: { sectionType?: string; hasParentheses?: boolean; qNum?: number; hasMixedParenthesesInKey?: boolean }
  ): { normalized: string; isNumerical: boolean } {
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    const isNumericalSection = !context?.hasParentheses && (
      context?.sectionType === 'integer type' ||
      context?.sectionType === 'numerical value' ||
      context?.sectionType?.includes('integer') ||
      context?.sectionType?.includes('numerical') ||
      /part\s*[-–\s]\s*(?:ii\b|2\b)/i.test(context?.sectionType || '') ||
      // Removed: (context?.qNum > 30) — this blindly treated all Q>30 as numerical,
      // corrupting MCQ answers. hasMixedParenthesesInKey handles mixed papers correctly.
      Boolean(context?.hasMixedParenthesesInKey)
    );

    // Pure letter answers (a-d) are always MCQ option indices
    if (/^[a-d]+$/i.test(lower)) {
      const letterMap: Record<string, string> = { 'a': '0', 'b': '1', 'c': '2', 'd': '3' };
      if (lower.length > 1) {
        return { normalized: lower.toUpperCase(), isNumerical: false };
      }
      return { normalized: letterMap[lower[0]] ?? '0', isNumerical: false };
    }

    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      if (isNumericalSection) {
        return { normalized: trimmed, isNumerical: true };
      }
      if (trimmed.length > 1 || parseFloat(trimmed) > 4 || trimmed.includes('.') || trimmed.startsWith('-') || trimmed.startsWith('0')) {
        return { normalized: trimmed, isNumerical: true };
      }
      const optionMap: Record<string, string> = { '1': '0', '2': '1', '3': '2', '4': '3' };
      return { normalized: optionMap[trimmed] ?? trimmed, isNumerical: false };
    }
    return { normalized: trimmed, isNumerical: false };
  }

  /**
   * Extracts global Answer Key sheet from the bottom/end of coaching and PYQ PDFs.
   * Handles both table-grid answer sheets (e.g. Allen: Que. 1 2 3... \n Ans. A D C...)
   * and standard inline answer keys (e.g. 1. (A), 2. (B)).
   */
  static extractGlobalAnswerKey(rawText: string): ExtractedGlobalAnswerKey {
    const keyHeaderRegex = /(?:^|\n|\r)[^\n]{0,80}?(?:ANSWER\s*KEYS?|KEY\s*SHEET|SOLUTIONS?\s+KEY|HINTS\s+(?:&|AND)\s+ANSWERS?|ANSWER\s*SHEET|ANSWERS\s*[:.\-]?\s*(?:\r?\n|$)|(?:\n|^)\s*PART\s*[-–]\s*[IVX\d]+[\s\S]{0,80}?\b1\.\s*\(?[A-D0-9]+\)?)/i;
    let match = rawText.match(keyHeaderRegex);

    if (!match || match.index === undefined) {
      // Fallback for headerless answer keys (e.g. Competishun DPPs, where answer key table starts directly as "1. (2) 2. (4) 3. (1)...")
      const headerlessKeyRegex = /(?:^|\n|\r|\s{2,})(?:Q\.?\s*)?1\.\s*\(?[A-D0-9]+\)?(?:\s+(?:Q\.?\s*)?2\.\s*\(?[A-D0-9]+\)?)/i;
      match = rawText.match(headerlessKeyRegex);
    }

    if (!match || match.index === undefined) {
      return {
        hasKeySection: false,
        keySectionStartIndex: -1,
        entries: [],
        bySection: {},
        lookup: () => undefined
      };
    }

    const keySectionStartIndex = match.index;
    const keyText = rawText.substring(keySectionStartIndex)
      .split(/(?:OFFICE\s+ADDRESS|Plot\s+Number|www\.[a-z0-9]+\.com|\bMob\.\s*\d)/i)[0]
      .replace(/\[PAGE\s*\d+\]/gi, '');
    const sectionSplitter = /(?:^|\n)\s*(?=(?:Level\s*[-–]\s*\d+|SINGLE\s+CORRECT|MTOC|MULTIPLE\s+TYPE|INTEGER\s+TYPE|NUMERICAL\s+VALUE|PHYSICS|CHEMISTRY|MATHEMATICS|MATHS|PART\s*[-–\s]\s*[IVX\d]+|SECTION\s*[-–\s]\s*[A-Z0-9]+)\b)/i;
    const rawSections = keyText.split(sectionSplitter).map(s => s.trim()).filter(Boolean);
    const entryRegex = /(?:^|\s)(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*(?:[:.\-\]]|\s{2,})\s*\(?(-?\d+(?:\.\d+)?|[a-dA-D]+)\)?/g;

    const entries: ExtractedAnswerKeyEntry[] = [];
    const bySection: Record<string, ExtractedAnswerKeyEntry[]> = {};

    // 1. Check for Grid Table Answer Keys (e.g. Allen sheets with Que. 1 2 3... \n Ans. A D C...)
    const queLines = keyText.match(/(?:Que\.|Q\s*u\s*e\s*\.)\s*([0-9\s]+)/gi) || [];
    const ansLines = keyText.match(/(?:Ans\.|A\s*n\s*s\s*\.)\s*([a-dA-D1-4,\s]+)/gi) || [];
    if (queLines.length > 0 && queLines.length === ansLines.length) {
      for (let k = 0; k < queLines.length; k++) {
        const qNums = queLines[k].replace(/^(?:Que\.|Q\s*u\s*e\s*\.)/i, '').trim().split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        const aVals = ansLines[k].replace(/^(?:Ans\.|A\s*n\s*s\s*\.)/i, '').trim().split(/\s+/).map(a => a.trim()).filter(a => a.length > 0);
        for (let idx = 0; idx < Math.min(qNums.length, aVals.length); idx++) {
          const rawAns = aVals[idx];
          const norm = this.normalizeAnswerValue(rawAns, { qNum: qNums[idx] });
          entries.push({
            qNum: qNums[idx],
            rawAns,
            normalizedAns: norm.normalized,
            isNumerical: norm.isNumerical,
            sectionName: 'general'
          });
        }
      }
    }

    // 2. Standard inline answer parsing
    if (entries.length === 0) {
      rawSections.forEach((sec) => {
        const lines = sec.split('\n');
        const header = lines.find(l => l.trim().length > 0)?.trim() || '';
        const isHeaderKey = /^(?:ANSWER\s+KEYS?|KEY\s+SHEET|SOLUTIONS?\s+KEY|HINTS\s+&\s+ANSWERS?|ANSWERS)$/i.test(header);
        const secName = isHeaderKey ? 'general' : header.toLowerCase();
        const isIntegerSec = secName.includes('integer') || secName.includes('numerical') || /part\s*[-–\s]\s*(?:ii\b|2\b)/i.test(secName);
        const secEntries: ExtractedAnswerKeyEntry[] = [];
        const seenInSec = new Set<number>();

        // Clean non-option parentheticals (e.g. "(i, iv, v, vi, ix)" or "(x = 6, y = 6)") that corrupt entry matching.
        // Strictly preserve valid option and numeric parentheticals like "(1)", "(2)", "(A)", "(ACD)", "(1, 2)"
        const cleanSec = sec.replace(/\([^\n\(\)]*\)/g, (match) => {
          if (/^\([A-D0-9,\s\-.]+\)$/i.test(match)) return match;
          return ' ';
        });

        const hasParensInSec = /\(\s*[1-4A-Da-d]\s*\)/.test(cleanSec);
        const entryRegexWithParens = /(?:^|\s)(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*(?:[:.\-\]]|\s{2,})\s*(\()?(-?\d+(?:\.\d+)?|[a-dA-D]+)(\))?/g;
        let m: RegExpExecArray | null;
        while ((m = entryRegexWithParens.exec(cleanSec)) !== null) {
          const qNum = parseInt(m[1], 10);
          if (seenInSec.has(qNum)) continue;
          seenInSec.add(qNum);
          const hasParens = Boolean(m[2] === '(' && m[4] === ')');
          const rawAns = m[3].trim();
          const norm = this.normalizeAnswerValue(rawAns, {
            sectionType: secName,
            hasParentheses: hasParens,
            qNum,
            hasMixedParenthesesInKey: hasParensInSec && !hasParens
          });
          if ((isIntegerSec || (hasParensInSec && !hasParens)) && !norm.isNumerical) {
            norm.isNumerical = true;
          }
          const item: ExtractedAnswerKeyEntry = {
            qNum,
            rawAns,
            normalizedAns: norm.isNumerical ? rawAns : norm.normalized,
            isNumerical: norm.isNumerical,
            sectionName: secName
          };
          secEntries.push(item);
          entries.push(item);
        }
        if (secEntries.length > 0) {
          bySection[secName] = secEntries;
        }
      });
    }

    if (entries.length < 3) {
      return {
        hasKeySection: false,
        keySectionStartIndex: -1,
        entries: [],
        bySection: {},
        lookup: () => undefined
      };
    }

    const lookup = (qIndex: number, qNum: number, secName?: string): ExtractedAnswerKeyEntry | undefined => {
      if (secName) {
        const normSec = secName.toLowerCase().replace(/[\s\-_]/g, '');
        // Sort keys by length descending so 'part - iii' matches before substring 'part - i'
        const sortedKeys = Object.keys(bySection).sort((a, b) => b.length - a.length);
        const targetSecKey = sortedKeys.find(k => {
          const normK = k.toLowerCase().replace(/[\s\-_]/g, '');
          return normK === normSec || normSec.includes(normK) || normK.includes(normSec);
        });
        if (targetSecKey) {
          const found = bySection[targetSecKey].find(e => e.qNum === qNum);
          if (found) return found;
        }
      }
      if (qIndex >= 0 && qIndex < entries.length) {
        return entries[qIndex];
      }
      return entries.find(e => e.qNum === qNum);
    };

    return {
      hasKeySection: true,
      keySectionStartIndex,
      entries,
      bySection,
      lookup
    };
  }
}
