import { QuestionConfidence } from './types';
import { OptionExtractor } from './OptionExtractor';

export interface PaperConfidenceReport {
  overallScore: number; // 0.0 - 1.0
  questionScores: QuestionConfidence[];
  lowConfidenceIndices: number[];
  brokenDiagramIndices: number[];
  missingAnswerIndices: number[];
  summary: {
    totalQuestions: number;
    highConfidenceCount: number; // >= 0.8
    moderateConfidenceCount: number; // 0.6 - 0.8
    lowConfidenceCount: number; // < 0.6
  };
}

export class ConfidenceScorer {
  /**
   * Scores an individual question across 5 dimensions:
   * 1. statementQuality (25%)
   * 2. optionQuality (25%)
   * 3. answerQuality (25%)
   * 4. diagramQuality (15%)
   * 5. latexQuality (10%)
   */
  static scoreQuestion(q: any): QuestionConfidence {
    const issues: string[] = [];

    const statementQuality = this.scoreStatement(q?.content || '', issues);
    const optionQuality = this.scoreOptions(q, issues);
    const answerQuality = this.scoreAnswer(q, issues);
    const diagramQuality = this.scoreDiagram(q, issues);
    const latexQuality = this.scoreLatex(q, issues);

    // Composite weighted score
    const overallScore = Math.min(
      1.0,
      Math.max(
        0.0,
        Math.round(
          (statementQuality * 0.25 +
            optionQuality * 0.25 +
            answerQuality * 0.25 +
            diagramQuality * 0.15 +
            latexQuality * 0.10) *
            100
        ) / 100
      )
    );

    return {
      overallScore,
      statementQuality,
      optionQuality,
      diagramQuality,
      answerQuality,
      latexQuality,
      issues
    };
  }

  /**
   * Evaluates the completeness and clarity of the question statement.
   */
  private static scoreStatement(content: string, issues: string[]): number {
    const trimmed = (content || '').trim();
    if (!trimmed || trimmed.length < 10) {
      issues.push('Question statement is empty or too short (< 10 chars)');
      return 0.0;
    }

    let score = 0.85;

    if (trimmed.length < 20) {
      score = 0.5;
      issues.push('Question statement is unusually brief (10-20 chars)');
    }

    // Reward question cues
    const hasQuestionCue = /\b(?:find|calculate|which|what|determine|evaluate|consider|identify|select|if)\b|\?|\:/i.test(trimmed);
    if (hasQuestionCue) {
      score = Math.min(1.0, score + 0.15);
    }

    // Penalize leaked section headers
    if (/\b(?:LEVEL\s*[-–]\s*\d+|INTEGER\s+TYPE|NUMERICAL\s+VALUE|SINGLE\s+CORRECT|SECTION\s*[-–\s]\s*[A-Z0-9]+|PART\s*[-–\s]\s*[A-Z0-9]+|ANSWER\s*KEYS?)\b/i.test(trimmed)) {
      score = Math.max(0.2, score - 0.4);
      issues.push('Statement contains leaked section header or answer key');
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * Evaluates the validity and layout of options.
   */
  private static scoreOptions(q: any, issues: string[]): number {
    const typeUpper = (q?.type || 'MCQ').toUpperCase();
    const isNumerical = typeUpper === 'NUMERICAL' || typeUpper === 'INTEGER';

    if (isNumerical) {
      if (!q.options || q.options.length === 0) {
        return 1.0;
      }
      return 0.8;
    }

    // MCQ or MULTI
    const opts = q.options;
    if (!Array.isArray(opts) || opts.length === 0) {
      issues.push(`Missing options for ${typeUpper} question`);
      return 0.0;
    }

    if (opts.length !== 4) {
      issues.push(`Expected 4 options, found ${opts.length}`);
      return 0.3;
    }

    const optTexts = opts.map(o => (typeof o === 'string' ? o : o?.text || '').trim());

    // Check empty text
    const hasEmpty = optTexts.some(t => t.length === 0);
    if (hasEmpty) {
      issues.push('One or more options have empty text');
      return 0.25;
    }

    // Check surrogate letters
    if (OptionExtractor.isSurrogateOpt(opts)) {
      issues.push('Options contain surrogate letter placeholders (e.g. (A), (C), (D))');
      return 0.3;
    }

    // Check diagram labels
    const isDiagramLabels = optTexts.every((t, idx) => {
      const char = String.fromCharCode(65 + idx);
      return t === `(${char})` || t === char;
    });

    if (isDiagramLabels) {
      if (q.hasDiagram || q.imageUrl) {
        return 1.0;
      }
      issues.push('Options are clean diagram labels (A)-(D), but no diagram is attached');
      return 0.7;
    }

    // Check duplicate options
    const unique = new Set(optTexts.map(t => t.toLowerCase()));
    if (unique.size < opts.length) {
      issues.push('Duplicate option text detected');
      return 0.4;
    }

    return 1.0;
  }

  /**
   * Evaluates the correctness of the answer value.
   */
  private static scoreAnswer(q: any, issues: string[]): number {
    const ans = (q?.correctAnswer !== undefined && q?.correctAnswer !== null)
      ? String(q.correctAnswer).trim()
      : '';

    if (!ans) {
      issues.push('Missing correct answer');
      return 0.0;
    }

    const typeUpper = (q?.type || 'MCQ').toUpperCase();
    const isNumerical = typeUpper === 'NUMERICAL' || typeUpper === 'INTEGER';

    if (isNumerical) {
      const numVal = parseFloat(ans);
      if (!isNaN(numVal)) {
        if (ans === '0') {
          return 0.7; // Valid zero, but flagged with slight caution if placeholder
        }
        return 1.0;
      }
      issues.push(`Non-numeric answer "${ans}" for numerical question`);
      return 0.0;
    }

    // MCQ
    if (/^[A-D]$/i.test(ans) || /^[0-3]$/.test(ans)) {
      return 1.0;
    }

    // MULTI (e.g. AB, ACD)
    if (/^[A-D]{2,4}$/i.test(ans)) {
      return 1.0;
    }

    issues.push(`Unrecognized answer format "${ans}" for ${typeUpper}`);
    return 0.3;
  }

  /**
   * Evaluates diagram presence and image crop validity.
   */
  private static scoreDiagram(q: any, issues: string[]): number {
    const content = q?.content || '';
    const impliedDiagram = /\b(?:given\s+(?:figures?|diagrams?|graphs?|illustration)|shown\s+in\s+(?:the\s+)?(?:figures?|diagrams?|graphs?|illustration)|refer\s+to\s+(?:the\s+)?(?:figures?|diagrams?|graphs?)|circuit(?:\s+diagram)?|graph\s+shown|four\s+graphs|indicator\s+diagram|P-V\s+curve|pulley|wedge|inclined\s+plane|tube|spring|placed\s+at\s+a\s+point\s+[A-D]|reaches\s+the\s+point\s+[A-D])\b/i.test(content);

    if (!q.hasDiagram) {
      if (impliedDiagram) {
        issues.push('Statement mentions figure/diagram, but question is not marked hasDiagram');
        return 0.3;
      }
      return 1.0;
    }

    // Question hasDiagram is true
    if (!q.imageUrl) {
      issues.push('Question is marked hasDiagram, but no cropped diagram image is attached');
      return 0.0;
    }

    // Validate imageUrl data
    if (typeof q.imageUrl === 'string' && q.imageUrl.startsWith('data:image/')) {
      if (q.imageUrl.length < 200) {
        issues.push('Diagram image URL is corrupted or under minimum size');
        return 0.2;
      }
      return 1.0;
    }

    return 0.8;
  }

  /**
   * Evaluates LaTeX formula integrity and KaTeX delimiter balance.
   */
  private static scoreLatex(q: any, issues: string[]): number {
    const allText = `${q?.content || ''} ${(q?.options || []).map((o: any) => (typeof o === 'string' ? o : o?.text || '')).join(' ')}`;

    let score = 1.0;

    // Check $ delimiter parity (count non-escaped $)
    const dollarMatches = allText.match(/(?<!\\)\$/g) || [];
    if (dollarMatches.length % 2 !== 0) {
      score = Math.max(0.4, score - 0.4);
      issues.push('Unbalanced inline math delimiter ($)');
    }

    // Check $$ delimiter parity
    const doubleDollarMatches = allText.match(/(?<!\\)\$\$/g) || [];
    if (doubleDollarMatches.length % 2 !== 0) {
      score = Math.max(0.4, score - 0.3);
      issues.push('Unbalanced display math delimiter ($$)');
    }

    // Check for prose wrapped in \text{...}
    const longTextInLatex = allText.match(/\\text\{([^}]{50,})\}/);
    if (longTextInLatex) {
      score = Math.max(0.5, score - 0.2);
      issues.push('LaTeX \\text{} block wraps long English prose');
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * Aggregates confidence scores across an entire paper.
   */
  static scorePaper(questions: any[]): PaperConfidenceReport {
    if (!Array.isArray(questions) || questions.length === 0) {
      return {
        overallScore: 0.0,
        questionScores: [],
        lowConfidenceIndices: [],
        brokenDiagramIndices: [],
        missingAnswerIndices: [],
        summary: {
          totalQuestions: 0,
          highConfidenceCount: 0,
          moderateConfidenceCount: 0,
          lowConfidenceCount: 0
        }
      };
    }

    const questionScores: QuestionConfidence[] = [];
    const lowConfidenceIndices: number[] = [];
    const brokenDiagramIndices: number[] = [];
    const missingAnswerIndices: number[] = [];

    let sum = 0;
    let high = 0;
    let mod = 0;
    let low = 0;

    for (let i = 0; i < questions.length; i++) {
      const score = this.scoreQuestion(questions[i]);
      questionScores.push(score);
      sum += score.overallScore;

      if (score.overallScore < 0.75 || score.optionQuality < 0.5 || score.statementQuality < 0.5) {
        low++;
        lowConfidenceIndices.push(i);
      } else if (score.overallScore < 0.85) {
        mod++;
      } else {
        high++;
      }

      if ((score.diagramQuality < 0.5 && questions[i]?.hasDiagram) || score.diagramQuality <= 0.3) {
        brokenDiagramIndices.push(i);
      }

      if (score.answerQuality < 0.5) {
        missingAnswerIndices.push(i);
      }
    }

    const overallScore = Math.round((sum / questions.length) * 100) / 100;

    return {
      overallScore,
      questionScores,
      lowConfidenceIndices,
      brokenDiagramIndices,
      missingAnswerIndices,
      summary: {
        totalQuestions: questions.length,
        highConfidenceCount: high,
        moderateConfidenceCount: mod,
        lowConfidenceCount: low
      }
    };
  }

  /**
   * Evaluates if a low-confidence question can be healed by a matching heuristic question.
   */
  static healQuestion(targetQ: any, heuristicQ: any): { healed: boolean; changes: string[] } {
    const changes: string[] = [];
    if (!targetQ || !heuristicQ) return { healed: false, changes };

    // 1. Heal surrogate options with real text options from heuristic
    if (OptionExtractor.isSurrogateOpt(targetQ.options) && OptionExtractor.hasRealOpts(heuristicQ.options)) {
      targetQ.options = heuristicQ.options;
      changes.push('Replaced surrogate option placeholders with heuristic option statements');
    }

    // 2. Heal missing options if heuristic has complete 4 options
    if ((!targetQ.options || targetQ.options.length < 4) && Array.isArray(heuristicQ.options) && heuristicQ.options.length === 4) {
      targetQ.options = heuristicQ.options;
      changes.push('Backfilled missing options from heuristic extraction');
    }

    // 3. Heal missing or empty correctAnswer
    if (!targetQ.correctAnswer && heuristicQ.correctAnswer) {
      targetQ.correctAnswer = heuristicQ.correctAnswer;
      changes.push(`Backfilled missing answer (${heuristicQ.correctAnswer}) from heuristic`);
    }

    // 4. Heal missing diagram flag if heuristic detected diagram reference
    if (!targetQ.hasDiagram && heuristicQ.hasDiagram) {
      targetQ.hasDiagram = true;
      if (heuristicQ.diagramPage) targetQ.diagramPage = heuristicQ.diagramPage;
      changes.push('Enabled hasDiagram from heuristic diagram reference detector');
    }

    return {
      healed: changes.length > 0,
      changes
    };
  }
}
