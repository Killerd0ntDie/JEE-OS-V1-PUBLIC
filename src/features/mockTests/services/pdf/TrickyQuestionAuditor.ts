import { MockQuestion } from '../../../../types/mockTest';
import { ConfidenceScorer } from './ConfidenceScorer';
import { reverifyQuestionWithAi } from '../MockTestGeneratorService';

export interface TrickyQuestionAuditEntry {
  question: MockQuestion;
  index: number;
  riskScore: number;
  riskReasons: string[];
}

export interface AutoReverificationResult {
  verifiedCount: number;
  correctionsMade: number;
  auditedEntries: TrickyQuestionAuditEntry[];
}

export class TrickyQuestionAuditor {
  /**
   * Evaluates the risk score (0 - 100) of a question having an incorrect or hallucinated key.
   * Higher score = higher urgency to re-verify with dedicated AI reasoning.
   */
  static scoreQuestionRisk(q: MockQuestion): { score: number; reasons: string[] } {
    if (!q) return { score: 0, reasons: [] };

    // Already verified questions need no re-verification
    if (q.isVerified) {
      return { score: 0, reasons: ['Already verified by dedicated AI reasoning'] };
    }

    let score = 0;
    const reasons: string[] = [];

    // 1. Visual Diagrams & Attached Images (+40)
    // Multimodal questions (chemical structures, circuit diagrams, geometric curves)
    // have the highest frequency of single-pass text hallucination.
    const hasVisualDiagram = Boolean(
      q.hasDiagram ||
      q.imageUrl ||
      (Array.isArray((q as any).diagramBbox) && (q as any).diagramBbox.length === 4) ||
      /\b(?:figure|diagram|circuit|graph\s+shown|bond\s+angle|bond\s+length|wedge\s+dash|stereoisomer)\b/i.test(q.content || '')
    );
    if (hasVisualDiagram) {
      score += 40;
      reasons.push('Contains visual diagram, molecular structure, or circuit');
    }

    // 2. Missing, Ambiguous, or Defaulted Key (+30)
    const rawAnswer = String(q.correctAnswer ?? '').trim();
    const isMissingKey = !rawAnswer;
    const isDefaultZeroOrA = (rawAnswer === '0' || rawAnswer === 'A') && (!q.explanation || q.explanation.length < 50);
    if (isMissingKey) {
      score += 35;
      reasons.push('Missing answer key');
    } else if (isDefaultZeroOrA) {
      score += 25;
      reasons.push('Defaulted placeholder key (Option A / 0) with brief derivation');
    }

    // 3. Question Quality & Heuristic Confidence Score (+25)
    try {
      const conf = ConfidenceScorer.scoreQuestion(q);
      if (conf.overallScore < 0.65) {
        score += 25;
        reasons.push(`Low parsing confidence (${Math.round(conf.overallScore * 100)}%)`);
      } else if (conf.overallScore < 0.8) {
        score += 15;
        reasons.push(`Moderate parsing confidence (${Math.round(conf.overallScore * 100)}%)`);
      }
    } catch {
      // Fallback if ConfidenceScorer encountered unexpected structure
    }

    // 4. Multi-Correct or Numerical Integer Type (+15)
    const typeUpper = (q.type || 'MCQ').toUpperCase();
    if (typeUpper === 'MULTI') {
      score += 20;
      reasons.push('Multi-correct option evaluation requires independent option proof');
    } else if (typeUpper === 'NUMERICAL') {
      score += 15;
      reasons.push('Numerical integer/decimal calculation requires step-by-step math');
    }

    // 5. Tricky Domain Concepts (+15)
    const trickyKeywords = /\b(enantiomer|diastereomer|hybridization|stereoisomer|optically\s+active|meso|chirality|lone\s+pair|axial|equatorial|bond\s+angle|moment\s+of\s+inertia|lcr\s+circuit|interference|fringe\s+width|flux|gauss's\s+law|definite\s+integral|eigen|determinant)\b/i;
    if (trickyKeywords.test(q.content || '')) {
      score += 15;
      reasons.push('Contains high-complexity IIT-JEE topic keywords');
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      reasons
    };
  }

  /**
   * Identifies and ranks tricky questions from a list, returning up to maxCount questions
   * sorted in descending order of risk.
   */
  static identifyTrickyQuestions(
    questions: MockQuestion[],
    maxCount: number = 4,
    threshold: number = 35
  ): TrickyQuestionAuditEntry[] {
    if (!Array.isArray(questions) || questions.length === 0) return [];

    const candidates: TrickyQuestionAuditEntry[] = [];

    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      if (!q || q.isVerified) continue;

      const { score, reasons } = this.scoreQuestionRisk(q);
      if (score >= threshold) {
        candidates.push({
          question: q,
          index: idx,
          riskScore: score,
          riskReasons: reasons
        });
      }
    }

    // Sort descending by risk score
    candidates.sort((a, b) => b.riskScore - a.riskScore);

    // Limit to maxCount
    return candidates.slice(0, maxCount);
  }

  /**
   * Runs parallel AI re-verification on top tricky questions with bounded concurrency (2 workers).
   * Updates question in-place with authoritative key, verified badge, and step-by-step LaTeX derivation.
   */
  static async autoReverifyQuestions(
    questions: MockQuestion[],
    context?: { targetSubject?: string; chapterName?: string },
    options?: {
      maxCount?: number;
      threshold?: number;
      onProgress?: (msg: string) => void;
    }
  ): Promise<AutoReverificationResult> {
    const maxCount = options?.maxCount ?? 4;
    const threshold = options?.threshold ?? 35;
    const onProgress = options?.onProgress;

    const trickyList = this.identifyTrickyQuestions(questions, maxCount, threshold);

    if (trickyList.length === 0) {
      return { verifiedCount: 0, correctionsMade: 0, auditedEntries: [] };
    }

    const total = trickyList.length;
    onProgress?.(`AI Pre-verifying ${total} tricky question${total > 1 ? 's' : ''} (chemical structures & keys)...`);

    let verifiedCount = 0;
    let correctionsMade = 0;
    let currentIndex = 0;

    // Worker queue with concurrency 2
    const worker = async () => {
      while (currentIndex < trickyList.length) {
        const itemIdx = currentIndex++;
        const item = trickyList[itemIdx];
        const { question, index } = item;
        const qNum = (question as any).qNumber || (question as any).localQuestionNumber || index + 1;

        onProgress?.(`AI Pre-verifying Q${qNum} with dedicated reasoning (${itemIdx + 1}/${total})...`);

        try {
          const result = await reverifyQuestionWithAi(question, context);
          if (result && result.correctAnswer !== undefined) {
            const oldKey = question.correctAnswer;
            question.correctAnswer = result.correctAnswer;
            if (result.explanation) {
              question.explanation = result.explanation;
              question.solution = { text: result.explanation };
            }
            question.isVerified = true;
            question.confidence = result.confidence || 'high';

            verifiedCount++;
            if (result.keyCorrectionMade || (oldKey && oldKey !== result.correctAnswer)) {
              correctionsMade++;
              console.log(`[TrickyQuestionAuditor] Auto-corrected key for Q${qNum}: "${oldKey}" -> "${result.correctAnswer}"`);
            }
          }
        } catch (err) {
          console.warn(`[TrickyQuestionAuditor] Auto-reverification failed for Q${qNum}, keeping existing candidate:`, err);
        }
      }
    };

    // Run 2 workers in parallel
    const workerCount = Math.min(2, total);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);

    onProgress?.(`AI Pre-verification complete: ${verifiedCount} question${verifiedCount !== 1 ? 's' : ''} verified.`);

    return {
      verifiedCount,
      correctionsMade,
      auditedEntries: trickyList
    };
  }
}
