export interface SM2State {
  repetitions: number;
  easeFactor: number;
  interval: number; // in days
  nextReviewDate?: string; // ISO string
}

export interface SM2Options {
  isChapterLevel?: boolean;
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
   * @param previousState The previous SM2 state of the flashcard or chapter
   * @param options Additional calculation options (e.g. isChapterLevel)
   * @returns The updated SM2 state
   */
  public calculateNextReview(quality: number, previousState?: SM2State, options?: SM2Options): SM2State {
    // If quality is invalid, constrain it to 0-5 (defaulting to 3 if missing or NaN)
    const rawQuality = typeof quality === 'number' && !Number.isNaN(quality) ? quality : 3;
    const safeQuality = Math.max(0, Math.min(5, Math.round(rawQuality)));

    let repetitions = typeof previousState?.repetitions === 'number' && !Number.isNaN(previousState.repetitions)
      ? previousState.repetitions
      : 0;
    let easeFactor = typeof previousState?.easeFactor === 'number' && !Number.isNaN(previousState.easeFactor)
      ? previousState.easeFactor
      : 2.5;
    let interval = typeof previousState?.interval === 'number' && !Number.isNaN(previousState.interval)
      ? previousState.interval
      : 0;

    if (options?.isChapterLevel) {
      if (safeQuality < 3) {
        repetitions = 0;
        interval = 1;
      } else {
        if (repetitions === 0) {
          interval = quality >= 4 ? 3 : 2;
        } else if (repetitions === 1) {
          interval = quality >= 4 ? 7 : 4;
        } else if (repetitions === 2) {
          interval = quality >= 4 ? 14 : 7;
        } else {
          interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
      }
    } else {
      // Default card-level SM-2 algorithm
      if (safeQuality < 3) {
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
    }

    // Update ease factor: EF':=EF+(0.1-(5-q)*(0.08+(5-q)*0.02))
    easeFactor = easeFactor + (0.1 - (5 - safeQuality) * (0.08 + (5 - safeQuality) * 0.02));
    
    // Ease factor lower bound (1.3), uncapped upper bound per SM-2
    easeFactor = Math.max(1.3, easeFactor);

    // Calculate next review date, normalized to local midnight to prevent timezone drift
    const nextReviewDate = new Date();
    nextReviewDate.setHours(0, 0, 0, 0);
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
