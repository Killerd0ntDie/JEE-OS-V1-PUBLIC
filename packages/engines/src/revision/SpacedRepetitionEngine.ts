export interface SM2State {
  repetitions: number;
  easeFactor: number;
  interval: number; // in days
  nextReviewDate?: string; // ISO string
}

export class SpacedRepetitionEngine {
  /**
   * SuperMemo-2 Algorithm Implementation
   * @param quality Quality of response (0-5)
   * 0: Complete blackout
   * 1: Incorrect response, but upon seeing correct answer it felt familiar
   * 2: Incorrect response, but easy to recall upon seeing correct answer
   * 3: Correct response recalled with serious difficulty
   * 4: Correct response after a hesitation
   * 5: Perfect response
   * @param previousState The previous SM2 state of the flashcard
   * @returns The updated SM2 state
   */
  public calculateNextReview(quality: number, previousState?: SM2State): SM2State {
    // If quality is invalid, constrain it to 0-5
    quality = Math.max(0, Math.min(5, Math.round(quality)));

    let { 
      repetitions = 0, 
      easeFactor = 2.5, 
      interval = 0 
    } = previousState || {};

    // If the response was incorrect (0-2), reset repetitions but keep the modified ease factor
    if (quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    }

    // Update ease factor: EF':=EF+(0.1-(5-q)*(0.08+(5-q)*0.02))
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Ease factor cannot drop below 1.3
    easeFactor = Math.max(1.3, easeFactor);

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return {
      repetitions,
      easeFactor,
      interval,
      nextReviewDate: nextReviewDate.toISOString(),
    };
  }

  /**
   * Helper to convert retention confidence string to an estimated SM-2 State
   * Useful for migrating legacy hardcoded flashcards to SM2 tracking
   */
  public legacyConfidenceToState(confidence: 'High' | 'Medium' | 'Low'): SM2State {
    if (confidence === 'High') {
      return { repetitions: 2, easeFactor: 2.6, interval: 7 };
    }
    if (confidence === 'Medium') {
      return { repetitions: 1, easeFactor: 2.3, interval: 3 };
    }
    return { repetitions: 0, easeFactor: 2.0, interval: 1 };
  }
}
