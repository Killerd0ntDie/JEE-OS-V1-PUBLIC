import { SubjectId } from '@/types';
import { ExtractedGlobalAnswerKey } from './PdfPaperParserService';

export type LexicalTokenType =
  | 'SECTION_HEADER'
  | 'QUESTION_HEADER'
  | 'OPTION_HEADER'
  | 'INLINE_KEY'
  | 'INLINE_SOLUTION'
  | 'TEXT_LINE';

export interface LexicalToken {
  type: LexicalTokenType;
  raw: string;
  cleanText: string;
  metadata?: {
    qNum?: number;
    optLabel?: string; // 'A', 'B', 'C', 'D'
    subject?: SubjectId;
    sectionType?: 'SINGLE_CORRECT' | 'MULTI_CORRECT' | 'INTEGER_TYPE' | 'GENERAL';
    answerValue?: string;
  };
  lineIndex: number;
}

export interface LexicalQuestion {
  qNum: number;
  subject: SubjectId;
  type: 'MCQ' | 'NUMERICAL' | 'MULTI';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  content: string;
  options?: { id: string; text: string }[];
  correctAnswer: string;
  solution: {
    text: string;
    correctOptionIds: string[];
  };
  topic?: string;
}

export interface ParseOptions {
  targetSubject?: string;
  keyData?: ExtractedGlobalAnswerKey;
}

/**
 * Phase 1: Lexical Stream Tokenizer
 * Line-by-line deterministic linear tokenizer with context awareness for LaTeX and chemical entities.
 */
export class PdfLexicalTokenizer {
  static tokenize(rawText: string): LexicalToken[] {
    const lines = rawText.split(/\r?\n/);
    const tokens: LexicalToken[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 1. Check Section Header
      const sectionMatch = this.matchSectionHeader(trimmed);
      if (sectionMatch) {
        tokens.push({
          type: 'SECTION_HEADER',
          raw: line,
          cleanText: trimmed,
          metadata: sectionMatch,
          lineIndex: i
        });
        continue;
      }

      // 2. Check Question Header (e.g. "Q1.", "1.", "Question 1:", "[12]")
      const qNumMatch = this.matchQuestionHeader(trimmed);
      if (qNumMatch) {
        tokens.push({
          type: 'QUESTION_HEADER',
          raw: line,
          cleanText: trimmed,
          metadata: { qNum: qNumMatch.qNum },
          lineIndex: i
        });
        continue;
      }

      // 3. Check Inline Solution / Explanation
      if (/^(?:Sol(?:ution)?|Explanation)\s*[:.\-]/i.test(trimmed)) {
        tokens.push({
          type: 'INLINE_SOLUTION',
          raw: line,
          cleanText: trimmed.replace(/^(?:Sol(?:ution)?|Explanation)\s*[:.\-]\s*/i, ''),
          lineIndex: i
        });
        continue;
      }

      // 4. Check Inline Answer Key (e.g. "Ans: (B)", "Answer: 42")
      const keyMatch = trimmed.match(/(?:(?:MathonGo\s+)?Answer\s+Keys?|Ans(?:wer)?)\s*:\s*(\([1-4A-D]\)|Option\s*[1-4A-D]|[A-D]|-?\d+(?:\.\d+)?)/i);
      if (keyMatch) {
        const rawVal = keyMatch[1].replace(/[\(\)]/g, '').replace(/Option\s*/i, '').trim();
        tokens.push({
          type: 'INLINE_KEY',
          raw: line,
          cleanText: trimmed,
          metadata: { answerValue: rawVal },
          lineIndex: i
        });
        continue;
      }

      // 5. Check Horizontal Options on a single line (e.g. "(A) 1/2   (B) √3/2   (C) 1   (D) 0")
      const horizontalOpts = this.matchHorizontalOptions(trimmed);
      if (horizontalOpts) {
        if (horizontalOpts.preamble) {
          tokens.push({
            type: 'TEXT_LINE',
            raw: horizontalOpts.preamble,
            cleanText: horizontalOpts.preamble,
            lineIndex: i
          });
        }
        for (const opt of horizontalOpts.options) {
          tokens.push({
            type: 'OPTION_HEADER',
            raw: opt.raw,
            cleanText: opt.text,
            metadata: { optLabel: opt.label },
            lineIndex: i
          });
        }
        continue;
      }

      // 6. Check Single Option Header at start of line (e.g. "(A) 12", "A] 15", "[A] 20")
      const optMatch = this.matchOptionHeader(trimmed);
      if (optMatch) {
        tokens.push({
          type: 'OPTION_HEADER',
          raw: line,
          cleanText: optMatch.optionText,
          metadata: { optLabel: optMatch.label },
          lineIndex: i
        });
        continue;
      }

      // 7. Otherwise standard text line
      tokens.push({
        type: 'TEXT_LINE',
        raw: line,
        cleanText: trimmed,
        lineIndex: i
      });
    }

    return tokens;
  }

  static matchHorizontalOptions(text: string): { preamble?: string; options: { label: 'A' | 'B' | 'C' | 'D'; text: string; raw: string }[] } | null {
    if (/\b(?:compound|product|reagent|reactant|intermediate|substance|gas|salt|isomer|hydrocarbon|complex|structure|molecule|sample|element)\s*\([A-Da-d]\)/i.test(text)) {
      return null;
    }

    const norm = (lbl: string): 'A' | 'B' | 'C' | 'D' => {
      const u = lbl.toUpperCase();
      if (u === '1') return 'A';
      if (u === '2') return 'B';
      if (u === '3') return 'C';
      if (u === '4') return 'D';
      return u as 'A' | 'B' | 'C' | 'D';
    };

    // 1a. Matches 4 alphabetic options on a single line: (A)...(B)...(C)...(D)... or (a)...(b)...(c)...(d)...
    const alpha4Regex = /(?:^|\s)\(([Aa])\)\s*([\s\S]*?)\s+\(([Bb])\)\s*([\s\S]*?)\s+\(([Cc])\)\s*([\s\S]*?)\s+\(([Dd])\)\s*([\s\S]*)$/;
    const alpha4Match = text.match(alpha4Regex);
    if (alpha4Match) {
      const firstIdx = text.search(/(?:^|\s)\(([Aa])\)/);
      const preamble = firstIdx > 0 ? text.substring(0, firstIdx).trim() : undefined;
      return {
        preamble,
        options: [
          { label: 'A', text: alpha4Match[2].trim(), raw: alpha4Match[0] },
          { label: 'B', text: alpha4Match[4].trim(), raw: alpha4Match[0] },
          { label: 'C', text: alpha4Match[6].trim(), raw: alpha4Match[0] },
          { label: 'D', text: alpha4Match[8].trim(), raw: alpha4Match[0] },
        ]
      };
    }

    // 1b. Matches 4 numeric options on a single line: (1)...(2)...(3)...(4)...
    const num4Regex = /(?:^|\s)\((1)\)\s*([\s\S]*?)\s+\((2)\)\s*([\s\S]*?)\s+\((3)\)\s*([\s\S]*?)\s+\((4)\)\s*([\s\S]*)$/;
    const num4Match = text.match(num4Regex);
    if (num4Match) {
      const firstIdx = text.search(/(?:^|\s)\((1)\)/);
      const preamble = firstIdx > 0 ? text.substring(0, firstIdx).trim() : undefined;
      return {
        preamble,
        options: [
          { label: 'A', text: num4Match[2].trim(), raw: num4Match[0] },
          { label: 'B', text: num4Match[4].trim(), raw: num4Match[0] },
          { label: 'C', text: num4Match[6].trim(), raw: num4Match[0] },
          { label: 'D', text: num4Match[8].trim(), raw: num4Match[0] },
        ]
      };
    }

    // 1c. Matches 4 bracketed options: [A]...[B]...[C]...[D]...
    const bracketAlpha4Regex = /(?:^|\s)\[([Aa])\]\s*([\s\S]*?)\s+\[([Bb])\]\s*([\s\S]*?)\s+\[([Cc])\]\s*([\s\S]*?)\s+\[([Dd])\]\s*([\s\S]*)$/;
    const bracketAlpha4Match = text.match(bracketAlpha4Regex);
    if (bracketAlpha4Match) {
      const firstIdx = text.search(/(?:^|\s)\[([Aa])\]/);
      const preamble = firstIdx > 0 ? text.substring(0, firstIdx).trim() : undefined;
      return {
        preamble,
        options: [
          { label: 'A', text: bracketAlpha4Match[2].trim(), raw: bracketAlpha4Match[0] },
          { label: 'B', text: bracketAlpha4Match[4].trim(), raw: bracketAlpha4Match[0] },
          { label: 'C', text: bracketAlpha4Match[6].trim(), raw: bracketAlpha4Match[0] },
          { label: 'D', text: bracketAlpha4Match[8].trim(), raw: bracketAlpha4Match[0] },
        ]
      };
    }

    // 1d. Matches 4 bracketed numeric options: [1]...[2]...[3]...[4]...
    const bracketNum4Regex = /(?:^|\s)\[(1)\]\s*([\s\S]*?)\s+\[(2)\]\s*([\s\S]*?)\s+\[(3)\]\s*([\s\S]*?)\s+\[(4)\]\s*([\s\S]*)$/;
    const bracketNum4Match = text.match(bracketNum4Regex);
    if (bracketNum4Match) {
      const firstIdx = text.search(/(?:^|\s)\[(1)\]/);
      const preamble = firstIdx > 0 ? text.substring(0, firstIdx).trim() : undefined;
      return {
        preamble,
        options: [
          { label: 'A', text: bracketNum4Match[2].trim(), raw: bracketNum4Match[0] },
          { label: 'B', text: bracketNum4Match[4].trim(), raw: bracketNum4Match[0] },
          { label: 'C', text: bracketNum4Match[6].trim(), raw: bracketNum4Match[0] },
          { label: 'D', text: bracketNum4Match[8].trim(), raw: bracketNum4Match[0] },
        ]
      };
    }

    // 2a. Matches 3 alphabetic options on a single line: (A)...(B)...(C)...
    const alpha3Regex = /(?:^|\s)\(([Aa])\)\s*([\s\S]*?)\s+\(([Bb])\)\s*([\s\S]*?)\s+\(([Cc])\)\s*([\s\S]*)$/;
    const alpha3Match = text.match(alpha3Regex);
    if (alpha3Match) {
      const text1 = alpha3Match[2].trim();
      const text2 = alpha3Match[4].trim();
      const text3 = alpha3Match[6].trim();
      if (text1 && text2 && text3 && !text1.endsWith('and') && !text2.endsWith('and')) {
        const firstIdx = text.search(/(?:^|\s)\(([Aa])\)/);
        const preamble = firstIdx > 0 ? text.substring(0, firstIdx).trim() : undefined;
        return {
          preamble,
          options: [
            { label: 'A', text: text1, raw: alpha3Match[0] },
            { label: 'B', text: text2, raw: alpha3Match[0] },
            { label: 'C', text: text3, raw: alpha3Match[0] },
          ]
        };
      }
    }

    // 2b. Matches 3 numeric options on a single line: (1)...(2)...(3)...
    const num3Regex = /(?:^|\s)\((1)\)\s*([\s\S]*?)\s+\((2)\)\s*([\s\S]*?)\s+\((3)\)\s*([\s\S]*)$/;
    const num3Match = text.match(num3Regex);
    if (num3Match) {
      const text1 = num3Match[2].trim();
      const text2 = num3Match[4].trim();
      const text3 = num3Match[6].trim();
      if (text1 && text2 && text3 && !text1.endsWith('and') && !text2.endsWith('and')) {
        const firstIdx = text.search(/(?:^|\s)\((1)\)/);
        const preamble = firstIdx > 0 ? text.substring(0, firstIdx).trim() : undefined;
        return {
          preamble,
          options: [
            { label: 'A', text: text1, raw: num3Match[0] },
            { label: 'B', text: text2, raw: num3Match[0] },
            { label: 'C', text: text3, raw: num3Match[0] },
          ]
        };
      }
    }

    // 3. Matches option pairs (2x2 grid): (1)...(2)..., (3)...(4)..., (A)...(B)..., (C)...(D)..., (A)...(C)..., (B)...(D)...
    const validPairs: Record<string, string[]> = {
      A: ['B', 'C'],
      B: ['D'],
      C: ['D'],
    };
    const invalidTexts = new Set(['and', 'to', 'or', '&', ',', '-', 'versus', 'vs', 'with', 'for', 'in', 'at']);

    const parenPairRegex = /(?:^|\s)\(([1-4A-Da-d])\)\s*([\s\S]*?)\s+\(([1-4A-Da-d])\)\s*([\s\S]*)$/;
    const pairMatch = text.match(parenPairRegex);
    if (pairMatch) {
      const raw1 = pairMatch[1];
      const raw2 = pairMatch[3];
      const isNum1 = /^[1-4]$/.test(raw1);
      const isNum2 = /^[1-4]$/.test(raw2);

      // Must not mix letters and numbers in the same pair (e.g. (a) with (2))
      if (isNum1 === isNum2) {
        const l1 = norm(raw1);
        const l2 = norm(raw2);

        if (validPairs[l1]?.includes(l2)) {
          const firstIdx = text.search(/(?:^|\s)\(([1-4A-Da-d])\)/);
          const preamble = firstIdx > 0 ? text.substring(0, firstIdx).trim() : undefined;

          const isPreambleSafe = !preamble || (
            !/(?:equations?|eqs?\.?|relations?|from|using|substituting|between|reactions?|steps?|case|conditions?)\s*$/i.test(preamble) &&
            (!isNum1 || /[:\?\-=]$|(?:\bis|\bare|\bgiven\s+by|\bas|\bthan|\bequal\s+to|\bbecomes|\bcorrect|\bwith|\bat|\bfor)\s*$/i.test(preamble))
          );

          const text1 = pairMatch[2].trim();
          const text2 = pairMatch[4].trim();

          if (isPreambleSafe && (text1 || text2) && !invalidTexts.has(text1.toLowerCase()) && !invalidTexts.has(text2.toLowerCase())) {
            return {
              preamble,
              options: [
                { label: l1, text: text1, raw: pairMatch[0] },
                { label: l2, text: text2, raw: pairMatch[0] },
              ]
            };
          }
        }
      }
    }

    // 3b. Bracketed pairs: [1]...[2]..., [A]...[B]..., etc.
    const bracketPairRegex = /(?:^|\s)\[([1-4A-Da-d])\]\s*([\s\S]*?)\s+\[([1-4A-Da-d])\]\s*([\s\S]*)$/;
    const bracketMatch = text.match(bracketPairRegex);
    if (bracketMatch) {
      const raw1 = bracketMatch[1];
      const raw2 = bracketMatch[3];
      const isNum1 = /^[1-4]$/.test(raw1);
      const isNum2 = /^[1-4]$/.test(raw2);

      if (isNum1 === isNum2) {
        const l1 = norm(raw1);
        const l2 = norm(raw2);

        if (validPairs[l1]?.includes(l2)) {
          const firstIdx = text.search(/(?:^|\s)\[([1-4A-Da-d])\]/);
          const preamble = firstIdx > 0 ? text.substring(0, firstIdx).trim() : undefined;

          const isPreambleSafe = !preamble || (
            !/(?:equations?|eqs?\.?|relations?|from|using|substituting|between|reactions?|steps?|case|conditions?)\s*$/i.test(preamble) &&
            (!isNum1 || /[:\?\-=]$|(?:\bis|\bare|\bgiven\s+by|\bas|\bthan|\bequal\s+to|\bbecomes|\bcorrect|\bwith|\bat|\bfor)\s*$/i.test(preamble))
          );

          const text1 = bracketMatch[2].trim();
          const text2 = bracketMatch[4].trim();

          if (isPreambleSafe && (text1 || text2) && !invalidTexts.has(text1.toLowerCase()) && !invalidTexts.has(text2.toLowerCase())) {
            return {
              preamble,
              options: [
                { label: l1, text: text1, raw: bracketMatch[0] },
                { label: l2, text: text2, raw: bracketMatch[0] },
              ]
            };
          }
        }
      }
    }

    return null;
  }

  private static matchSectionHeader(text: string): { subject?: SubjectId; sectionType?: 'SINGLE_CORRECT' | 'MULTI_CORRECT' | 'INTEGER_TYPE' | 'GENERAL' } | null {
    const lower = text.toLowerCase();

    let subject: SubjectId | undefined;
    if (lower.includes('physics')) subject = 'physics';
    else if (lower.includes('chemistry')) subject = 'chemistry';
    else if (lower.includes('maths') || lower.includes('mathematics')) subject = 'maths';

    let sectionType: 'SINGLE_CORRECT' | 'MULTI_CORRECT' | 'INTEGER_TYPE' | 'GENERAL' | undefined;
    if (lower.includes('integer') || lower.includes('numerical') || lower.includes('section b')) {
      sectionType = 'INTEGER_TYPE';
    } else if (lower.includes('multiple') || lower.includes('mtoc') || lower.includes('one or more')) {
      sectionType = 'MULTI_CORRECT';
    } else if (lower.includes('single') || lower.includes('section a') || lower.includes('level - 1') || lower.includes('level - 2')) {
      sectionType = 'SINGLE_CORRECT';
    }

    if (subject || sectionType) {
      const isHeaderShape = 
        text.length < 80 &&
        (text.startsWith('PART') ||
         text.startsWith('SECTION') ||
         text.startsWith('LEVEL') ||
         text.startsWith('EXERCISE') ||
         /^(?:PHYSICS|CHEMISTRY|MATHEMATICS|MATHS)\b/i.test(text) ||
         /^(?:INTEGER|NUMERICAL|SINGLE|MULTIPLE)\s+(?:TYPE|CORRECT|VALUE)\b/i.test(text));

      if (isHeaderShape) {
        return { subject, sectionType: sectionType || 'GENERAL' };
      }
    }

    return null;
  }

  private static matchQuestionHeader(text: string): { qNum: number } | null {
    // Matches standard "Q1.", "Q.1", "Q1", "Question 1:", "1.", "[1]", "1)" at start of line
    let match = text.match(/^(?:Q(?:uestion)?\.?\s*(\d{1,3})[\.\)\]:]*|\[\s*(\d{1,3})\s*\]|(\d{1,3})\s*[\.\)\]:])(?:\s+|$|[A-Z\u2700-\u27BF])/i);

    // Fallback for unpunctuated question headers like "18 A body goes..."
    // Requires question starter word followed by prose (e.g. "A body", "The displacement", "Find the")
    // Strictly prevents diagram labels like "4 A" or "1 P (4,1)" from being misparsed as question headers!
    if (!match) {
      const unpunctuated = text.match(/^(\d{1,3})\s+(?=(?:A|An|The|If|Two|Three|Four|Five|What|Which|Find|Calculate|When|Consider|In|At|For)\s+[a-z]{2,}\b)/);
      if (unpunctuated) {
        match = unpunctuated;
      }
    }

    if (!match) return null;

    const numStr = match[1] || match[2] || match[3];
    if (!numStr) return null;

    // Safety: don't match decimal numbers like "1.54 * 10^6"
    if (/^\d+\.\d+/.test(text)) return null;

    const qNum = parseInt(numStr, 10);
    return qNum > 0 && qNum <= 200 ? { qNum } : null;
  }

  private static matchOptionHeader(text: string): { label: string; optionText: string } | null {
    const match = text.match(/^(?:\(([A-D1-4])\)|\[([A-D1-4])\]|([A-D1-4])\]|([A-D])[\.\)]\s+)([\s\S]*)$/i);
    if (!match) return null;

    const rawLabel = (match[1] || match[2] || match[3] || match[4]).toUpperCase();
    const labelMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
    const label = labelMap[rawLabel] ?? rawLabel;

    return {
      label,
      optionText: (match[5] || '').trim()
    };
  }
}

/**
 * Phase 2 & 3: Exam Parser State Machine & Semantic AST Generator
 */
export class ExamParserStateMachine {
  private state: 'IDLE' | 'IN_STATEMENT' | 'IN_OPTIONS' | 'IN_SOLUTION' = 'IDLE';
  private currentSubject: SubjectId = 'physics';
  private currentSectionType: 'SINGLE_CORRECT' | 'MULTI_CORRECT' | 'INTEGER_TYPE' | 'GENERAL' = 'GENERAL';
  private activeOptionSlot: 'A' | 'B' | 'C' | 'D' | null = null;

  // Active question under construction
  private qNum: number = 0;
  private statementLines: string[] = [];
  private optionsMap: Record<string, string> = {};
  private inlineAnswer: string | null = null;
  private solutionLines: string[] = [];

  private questions: LexicalQuestion[] = [];

  constructor(private options?: ParseOptions) {
    if (options?.targetSubject && options.targetSubject !== 'all') {
      this.currentSubject = options.targetSubject as SubjectId;
    }
  }

  processTokens(tokens: LexicalToken[]): LexicalQuestion[] {
    for (const token of tokens) {
      switch (token.type) {
        case 'SECTION_HEADER':
          this.commitActiveQuestion();
          if (token.metadata?.subject && (!this.options?.targetSubject || this.options.targetSubject === 'all')) {
            this.currentSubject = token.metadata.subject;
          }
          if (token.metadata?.sectionType) {
            this.currentSectionType = token.metadata.sectionType;
          }
          this.state = 'IDLE';
          break;

        case 'QUESTION_HEADER':
          this.commitActiveQuestion();
          this.qNum = token.metadata?.qNum || (this.questions.length + 1);
          this.state = 'IN_STATEMENT';
          const cleanLine = token.cleanText.replace(/^(?:Q(?:uestion)?\.?\s*\d{1,3}[\.\)\]:]*|\[\s*\d{1,3}\s*\]|\d{1,3}\s*[\.\)\]:])\s*/i, '').trim();
          if (cleanLine) {
            this.statementLines.push(cleanLine);
          }
          break;

        case 'OPTION_HEADER':
          if (this.state === 'IN_STATEMENT' || this.state === 'IN_OPTIONS') {
            if (this.currentSectionType === 'INTEGER_TYPE') {
              this.statementLines.push(token.raw);
              break;
            }

            this.state = 'IN_OPTIONS';
            const label = (token.metadata?.optLabel || 'A') as 'A' | 'B' | 'C' | 'D';
            this.activeOptionSlot = label;
            this.optionsMap[label] = token.cleanText;
          } else {
            this.statementLines.push(token.raw);
          }
          break;

        case 'INLINE_KEY':
          if (token.metadata?.answerValue) {
            this.inlineAnswer = token.metadata.answerValue;
          }
          break;

        case 'INLINE_SOLUTION':
          this.state = 'IN_SOLUTION';
          if (token.cleanText) {
            this.solutionLines.push(token.cleanText);
          }
          break;

        case 'TEXT_LINE':
          this.handleTextLine(token);
          break;
      }
    }

    // Flush final question
    this.commitActiveQuestion();
    return this.questions;
  }

  private handleTextLine(token: LexicalToken) {
    const text = token.cleanText;

    // Check if a line inside IN_STATEMENT contains horizontal options (e.g. "(A) 2   (B) 4   (C) 6   (D) 8")
    if ((this.state === 'IN_STATEMENT' || this.state === 'IN_OPTIONS') && this.currentSectionType !== 'INTEGER_TYPE') {
      const horizontalMatch = this.extractHorizontalOptions(text);
      if (horizontalMatch) {
        this.state = 'IN_OPTIONS';
        if (horizontalMatch.statementPart) {
          this.statementLines.push(horizontalMatch.statementPart);
        }
        Object.assign(this.optionsMap, horizontalMatch.options);
        return;
      }
    }

    // Check if this line is "Which of the above/following statements..." when we previously accumulated numbered statements
    if (this.state === 'IN_OPTIONS' && /(?:which\s+of\s+the\s+(?:above|following)|correct\s+statement|statements?\s+are\s+correct)/i.test(text)) {
      // Roll back previous numbered options into question statement
      for (const [k, v] of Object.entries(this.optionsMap)) {
        const numLabel = k === 'A' ? '1' : k === 'B' ? '2' : k === 'C' ? '3' : '4';
        this.statementLines.push(`(${numLabel}) ${v}`);
      }
      this.optionsMap = {};
      this.statementLines.push(text);
      this.state = 'IN_STATEMENT';
      this.activeOptionSlot = null;
      return;
    }

    switch (this.state) {
      case 'IN_STATEMENT':
        this.statementLines.push(text);
        break;

      case 'IN_OPTIONS':
        // If an option slot is active, append multiline option text with newline to preserve vertical fractions
        if (this.activeOptionSlot && this.optionsMap[this.activeOptionSlot] !== undefined) {
          this.optionsMap[this.activeOptionSlot] += '\n' + text;
        } else {
          this.statementLines.push(text);
        }
        break;

      case 'IN_SOLUTION':
        this.solutionLines.push(text);
        break;

      case 'IDLE':
      default:
        break;
    }
  }

  private extractHorizontalOptions(line: string): { statementPart?: string; options: Record<string, string> } | null {
    const res = PdfLexicalTokenizer.matchHorizontalOptions(line);
    if (!res) return null;
    const options: Record<string, string> = {};
    for (const opt of res.options) {
      options[opt.label] = opt.text;
    }
    return {
      statementPart: res.preamble,
      options
    };
  }

  private commitActiveQuestion() {
    if (this.statementLines.length === 0 && Object.keys(this.optionsMap).length === 0) {
      return;
    }

    const rawStatement = this.statementLines.join('\n').trim();
    if (rawStatement.length < 5) {
      this.resetQuestionState();
      return;
    }

    const hasOptions = Object.keys(this.optionsMap).length >= 2;
    const isNumerical = this.currentSectionType === 'INTEGER_TYPE' || !hasOptions;

    // Normalizing Answer Key
    let finalAnswer = '0';
    if (this.inlineAnswer) {
      finalAnswer = this.normalizeRawAnswer(this.inlineAnswer, isNumerical);
    } else if (this.options?.keyData && this.options.keyData.hasKeySection) {
      const lookup = this.options.keyData.lookup(this.questions.length, this.qNum);
      if (lookup) {
        finalAnswer = lookup.normalizedAns;
      }
    }

    // Options formatting: preserve empty string so caller can detect graph / figure options
    let formattedOptions: { id: string; text: string }[] | undefined = undefined;
    if (!isNumerical && hasOptions) {
      formattedOptions = ['A', 'B', 'C', 'D'].map(slot => ({
        id: slot,
        text: this.optionsMap[slot] ?? ''
      }));
    }

    const isMulti = this.currentSectionType === 'MULTI_CORRECT' || /^[A-D]{2,}$/.test(finalAnswer);

    this.questions.push({
      qNum: this.qNum || (this.questions.length + 1),
      subject: this.currentSubject,
      type: isNumerical ? 'NUMERICAL' : (isMulti ? 'MULTI' : 'MCQ'),
      difficulty: 'Medium',
      content: rawStatement,
      options: formattedOptions,
      correctAnswer: finalAnswer,
      solution: {
        text: this.solutionLines.join('\n').trim() || `Official Answer Key: ${finalAnswer}`,
        correctOptionIds: isNumerical ? [] : [['A', 'B', 'C', 'D'][parseInt(finalAnswer, 10)] || 'A']
      },
      topic: `${this.currentSubject.toUpperCase()} Core Drill`
    });

    this.resetQuestionState();
  }

  private normalizeRawAnswer(raw: string, isNumerical: boolean): string {
    const trimmed = raw.trim();
    if (isNumerical) {
      return trimmed;
    }
    const letterMap: Record<string, string> = {
      'A': '0', 'B': '1', 'C': '2', 'D': '3',
      '1': '0', '2': '1', '3': '2', '4': '3'
    };
    const upper = trimmed.toUpperCase();
    return letterMap[upper] ?? upper;
  }

  private resetQuestionState() {
    this.qNum = 0;
    this.statementLines = [];
    this.optionsMap = {};
    this.inlineAnswer = null;
    this.solutionLines = [];
    this.activeOptionSlot = null;
    this.state = 'IDLE';
  }
}

/**
 * Public Facade: PdfLexicalParser
 */
export class PdfLexicalParser {
  static parse(rawText: string, options?: ParseOptions): LexicalQuestion[] {
    const tokens = PdfLexicalTokenizer.tokenize(rawText);
    const stateMachine = new ExamParserStateMachine(options);
    return stateMachine.processTokens(tokens);
  }
}
