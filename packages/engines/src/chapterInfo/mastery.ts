import { Chapter } from '../types/index';

/**
 * Calculates mastery score and human-readable explanation for a given chapter.
 * Implements the 5-factor composite weighting algorithm:
 * 1. Foundational Stage (Lectures & Theory) - 25% base
 * 2. Practice & Application (DPPs & PYQs) - 30% base
 * 3. Spaced Retention & Revisions - 20% base
 * 4. Accuracy & Mistakes Penalty - 15% base
 * 5. Confidence & Mock Exam Readiness - 10% base
 */
export function calculateMastery(chapter: Chapter, chapterMistakesCount: number): { score: number; explanation: string } {
  const lectureProgress = chapter.totalLectures > 0 ? (chapter.currentLecture / chapter.totalLectures) : (chapter.theoryComplete ? 1 : 0);
  const solvedQs = chapter.solvedQuestions ?? 0;
  const questionAccuracy = solvedQs > 0 ? Math.max(30, Math.min(100, Math.round(100 - (chapterMistakesCount / (solvedQs + chapterMistakesCount)) * 100))) : 50;
  
  // Practice-Proven Bypass: If they haven't done theory, but have solved a significant number of questions or PYQs/DPP
  // Bug 3.2: Only trigger if accuracy is acceptable (>= 70%) to prevent guessing bypass
  const hasSignificantPractice = chapter.pyqsComplete || chapter.dppComplete || (solvedQs >= 30 && questionAccuracy >= 70);

  if (lectureProgress === 0 && !chapter.theoryComplete && !hasSignificantPractice) {
    return {
      score: 0,
      explanation: "Chapter has not been started yet. Complete lectures or theory to begin mastering."
    };
  }

  // 1. Foundational Stage (Lectures & Theory) - Weight: 25% (Base)
  const foundationalScore = (Math.min(1, lectureProgress) * 0.6 + (chapter.theoryComplete ? 0.4 : 0)) * 100;

  // 2. Practice & Application (DPPs & PYQs) - Weight: 30% (Base)
  // Up to 0.4 for DPP, 0.4 for PYQs, and 0.2 for volume (100 questions to reach max volume score)
  const practiceVolume = Math.min(0.2, solvedQs / 500);
  const practiceScore = ((chapter.dppComplete ? 0.4 : 0) + (chapter.pyqsComplete ? 0.4 : 0) + practiceVolume) * 100;

  // 3. Spaced Retention & Revisions - Weight: 20% (Base)
  const daysOverdue = chapter.lastRevisionDaysAgo ?? 0;
  const baseRetention = (chapter.revisionCount && chapter.revisionCount > 0) ? 100 : 60;
  const computedRetention = Math.max(0, Math.min(100, baseRetention - daysOverdue * 4));
  const retentionScore = chapter.retentionScore ?? computedRetention;
  const retentionComponent = (Math.min(1.0, (chapter.revisionCount || 0) / 3) * 0.4 + (retentionScore / 100) * 0.6) * 100;

  // 4. Accuracy & Mistakes Penalty - Weight: 15% (Base)
  const accuracyScore = (questionAccuracy * 0.8) + Math.max(0, 20 - chapterMistakesCount * 2);

  // 5. Confidence & Mock Exam Readiness - Weight: 10% (Base)
  const confidenceScore = chapter.healthScore ?? chapter.confidence ?? 50;

  // Dynamic Weighting: Shift weight from foundation to practice/accuracy if practice-proven
  let wFoundation = 0.25;
  let wPractice = 0.30;
  let wRetention = 0.20;
  let wAccuracy = 0.15;
  let wConfidence = 0.10;

  if (hasSignificantPractice && foundationalScore < 50) {
     wFoundation = 0.10;
     wPractice = 0.35;
     wAccuracy = 0.25;
  }

  // Weighted sum
  const totalScore = Math.max(0, Math.min(100, Math.round(
    (foundationalScore * wFoundation) +
    (practiceScore * wPractice) +
    (retentionComponent * wRetention) +
    (accuracyScore * wAccuracy) +
    (confidenceScore * wConfidence)
  )));

  // Generate detailed dynamic reason/explanation
  const reasons: string[] = [];
  if (lectureProgress >= 1 || chapter.theoryComplete) {
    reasons.push("Completed all lectures");
  } else if (lectureProgress > 0) {
    reasons.push(`Lecture progress ${Math.round(lectureProgress * 100)}%`);
  } else if (hasSignificantPractice) {
    reasons.push("Practice-proven (Skipped theory)");
  }

  if (chapter.pyqsComplete) {
    reasons.push("Completed PYQs");
  } else if (solvedQs > 0) {
    reasons.push(`Solved ${solvedQs} questions`);
  }

  if (chapter.dppComplete) {
    reasons.push("Completed DPP");
  }

  if (chapter.revisionCount > 0) {
    if (daysOverdue > 7) {
      reasons.push(`Revision overdue by ${daysOverdue} days`);
    } else {
      reasons.push(`Revised ${chapter.revisionCount} times (${daysOverdue}d ago)`);
    }
  } else {
    reasons.push("No formal revision completed");
  }

  reasons.push(`Accuracy ${Math.round(questionAccuracy)}%`);

  if (chapterMistakesCount > 0) {
    reasons.push(`${chapterMistakesCount} active mistake${chapterMistakesCount > 1 ? 's' : ''}`);
  }

  const explanation = reasons.join(', ');

  return {
    score: totalScore,
    explanation
  };
}
