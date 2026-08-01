import { Chapter, Mistake } from '@/types/index';

export interface MistakeScoreResult {
  score: number;
  explanation: string;
}

/**
 * Calculates a highly robust, deterministic, data-driven Mistake Intelligence Score (0-100)
 * representing: "How dangerous is this chapter if the student enters JEE today?"
 * 
 * Also generates a detailed explanation based on real StudyBrain signals.
 */
export function calculateMistakeScore(chapter: Chapter, chapterMistakes: Mistake[]): MistakeScoreResult {
  if (!chapterMistakes || chapterMistakes.length === 0) {
    return {
      score: 0,
      explanation: "No recorded mistakes for this chapter. Excellent foundational stability."
    };
  }

  const activeMistakes = chapterMistakes.filter(m => m.revisionStatus !== 'Mastered');
  const resolvedMistakes = chapterMistakes.filter(m => m.revisionStatus === 'Mastered');

  // If there are no mistakes logged for the chapter at all, threat score is 0
  if (activeMistakes.length === 0 && resolvedMistakes.length === 0) {
    return {
      score: 0,
      explanation: "No recorded mistakes for this chapter. Excellent foundational stability."
    };
  }

  let rawScore = 0;
  const now = Date.now();

  // 1. Unresolved Mistakes Danger Calculation
  if (activeMistakes.length > 0) {
    activeMistakes.forEach(m => {
      let mistakeBase = 15; // Base danger weight

      // Adjust based on severity/priority
      if (m.priority === 'High') {
        mistakeBase += 10;
      } else if (m.priority === 'Low') {
        mistakeBase -= 5;
      }

      // Adjust based on difficulty of question
      if (m.difficulty === 'JEE Advanced') {
        mistakeBase += 10;
      } else if (m.difficulty === 'JEE Main') {
        mistakeBase += 5;
      } else if (m.difficulty === 'Easy') {
        mistakeBase -= 5;
      }

      // Adjust based on mastery impact
      if (m.masteryImpact === 'High') {
        mistakeBase += 5;
      }

      // Resolution status attenuation
      let statusFactor = 1.0;
      if (m.revisionStatus === 'Reviewed') {
        statusFactor = 0.7;
      } else if (m.revisionStatus === 'Solved Again') {
        statusFactor = 0.4;
      }
      mistakeBase *= statusFactor;

      // Repeated mistake exponential scaling
      const attemptNum = m.attemptNumber || 1;
      if (attemptNum > 1) {
        mistakeBase *= Math.pow(1.8, attemptNum - 1);
      }

      // Source multiplier (Mock, PYQ, DPP)
      const src = m.source?.toLowerCase() || '';
      let sourceMultiplier = 1.0;
      if (src.includes('mock')) {
        sourceMultiplier = 1.5;
      } else if (src.includes('pyq')) {
        sourceMultiplier = 1.3;
      } else if (src.includes('dpp')) {
        sourceMultiplier = 1.1;
      }
      mistakeBase *= sourceMultiplier;

      // Age of active mistake weight
      const loggedDateStr = m.dateLogged || new Date().toISOString();
      const loggedDate = new Date(loggedDateStr);
      const daysAgo = Math.max(0, (now - loggedDate.getTime()) / (1000 * 60 * 60 * 24));
      let ageMultiplier = 1.0;
      if (daysAgo <= 7) {
        ageMultiplier = 1.2; // Acute recent mistakes
      } else if (daysAgo > 30) {
        ageMultiplier = 1.15; // Old unresolved persistent gaps
      }
      mistakeBase *= ageMultiplier;

      rawScore += mistakeBase;
    });

    // Exponential boost if multiple active mistakes exist
    if (activeMistakes.length > 1) {
      rawScore *= Math.pow(1.3, activeMistakes.length - 1);
    }
  }

  // 2. Time decay for resolved mistakes
  let resolvedDanger = 0;
  resolvedMistakes.forEach(m => {
    const loggedDateStr = m.dateLogged || new Date().toISOString();
    const loggedDate = new Date(loggedDateStr);
    const daysAgo = Math.max(0, (now - loggedDate.getTime()) / (1000 * 60 * 60 * 24));

    let mistakeBase = 10;
    if (m.priority === 'High') {
      mistakeBase += 5;
    }

    // Spaced decay factor: resolved mistakes gradually lose influence
    let decayFactor = 0;
    if (daysAgo <= 7) {
      decayFactor = Math.max(0.1, 1 - (daysAgo / 7)); // Linear decay over 7 days
    } else if (daysAgo <= 30) {
      decayFactor = 0.05; // Residual danger
    } else {
      decayFactor = 0.0; // Old resolved mistakes eventually contribute almost nothing
    }

    resolvedDanger += mistakeBase * decayFactor;
  });
  rawScore += resolvedDanger;

  // 3. Post-mistake Revision Mitigation Check
  const dates = chapterMistakes.map(m => new Date(m.dateLogged || new Date().toISOString()).getTime());
  const latestMistakeTime = dates.length > 0 ? Math.max(...dates) : now;
  const latestMistakeDaysAgo = Math.max(0, (now - latestMistakeTime) / (1000 * 60 * 60 * 24));

  let revisionMitigated = false;
  let postMistakeNoRevision = false;

  if (chapter.lastRevisionDaysAgo !== undefined && chapter.lastRevisionDaysAgo !== null) {
    const revisionTime = now - (chapter.lastRevisionDaysAgo * 1000 * 60 * 60 * 24);
    if (revisionTime > latestMistakeTime) {
      revisionMitigated = true;
      rawScore *= 0.5; // Halve threat score because active recall/revision took place after error
    } else {
      postMistakeNoRevision = true;
      rawScore += 15; // Premium penalty for unrevised mistake
    }
  } else {
    postMistakeNoRevision = true;
    rawScore += 20; // High premium penalty if never revised
  }

  // 4. Chapter Importance Multiplier (JEE Weightage & Priority)
  let importanceMultiplier = 1.0;
  if (chapter.priority === 1 || (chapter.weightage && chapter.weightage >= 8)) {
    importanceMultiplier = 1.3;
  } else if (chapter.priority === 2 || (chapter.weightage && chapter.weightage >= 5)) {
    importanceMultiplier = 1.1;
  } else {
    importanceMultiplier = 0.9;
  }
  rawScore *= importanceMultiplier;

  // Cap at 100, floor at 0
  const mistakeScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // 5. Generate Dynamic, Analytical Explanation (strictly no boilerplate, no placeholders)
  const reasons: string[] = [];
  const activeCount = activeMistakes.length;
  const repeatedCount = activeMistakes.filter(m => (m.attemptNumber || 1) > 1).length;

  if (activeCount > 0) {
    const timeDesc = latestMistakeDaysAgo <= 1 ? "today" : latestMistakeDaysAgo <= 10 ? "in the last 10 days" : "recently";
    
    if (repeatedCount > 0) {
      reasons.push(`Repeated unresolved ${chapter.name.toLowerCase()} mistakes ${timeDesc}`);
    } else {
      reasons.push(`${activeCount} active ${chapter.name.toLowerCase()} mistake${activeCount > 1 ? 's' : ''} ${timeDesc}`);
    }

    if (postMistakeNoRevision) {
      reasons.push("No successful revision after latest error");
    } else if (revisionMitigated) {
      reasons.push("Revision conducted after latest error");
    }

    // Check sources
    const inMock = activeMistakes.some(m => m.source?.toLowerCase().includes('mock'));
    const inPyq = activeMistakes.some(m => m.source?.toLowerCase().includes('pyq'));
    const inDpp = activeMistakes.some(m => m.source?.toLowerCase().includes('dpp'));

    if (inMock) {
      reasons.push("Appeared again in a mock test");
    } else if (inPyq) {
      reasons.push("Appeared again in PYQs");
    } else if (inDpp) {
      reasons.push("Appeared again in a DPP");
    }

    const highSevCount = activeMistakes.filter(m => m.priority === 'High').length;
    if (highSevCount > 0) {
      reasons.push(`${highSevCount} high-severity error${highSevCount > 1 ? 's' : ''}`);
    }
  } else {
    if (resolvedMistakes.length > 0) {
      const resolvedRecently = resolvedMistakes.some(m => {
        const loggedDateStr = m.dateLogged || new Date().toISOString();
        const days = (now - new Date(loggedDateStr).getTime()) / (1000 * 60 * 60 * 24);
        return days <= 7;
      });

      if (resolvedRecently) {
        reasons.push("Mistakes recently resolved, currently monitoring spacing retention");
      } else {
        reasons.push("All logged mistakes resolved and mastered. High stability");
      }
    } else {
      reasons.push("No recorded mistakes for this chapter. High stability");
    }
  }

  // Combine cleanly
  let explanation = reasons.join('. ') + '.';
  explanation = explanation.replace(/\.\./g, '.');

  return {
    score: mistakeScore,
    explanation
  };
}
