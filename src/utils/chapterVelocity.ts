export function calculateEffectiveMasteredChapters({
  masteredChapters,
  hasRealStudyHistory,
}: {
  masteredChapters: number;
  hasRealStudyHistory: boolean;
}): number {
  if (!Number.isFinite(masteredChapters)) return 0;
  if (!hasRealStudyHistory) {
    return Math.min(Math.max(masteredChapters, 0), 1);
  }
  return Math.max(0, masteredChapters);
}

export function calculateRealisticDailyChapterVelocity({
  masteredChapters,
  studyDaysElapsed,
  cap = 1.5,
  hasRealStudyHistory = true,
  minimumStudyMinutes = 30,
  actualStudyMinutes,
}: {
  masteredChapters: number;
  studyDaysElapsed: number;
  cap?: number;
  hasRealStudyHistory?: boolean;
  minimumStudyMinutes?: number;
  actualStudyMinutes?: number;
}): number {
  const effectiveMasteredChapters = calculateEffectiveMasteredChapters({
    masteredChapters,
    hasRealStudyHistory,
  });

  const safeMinimumStudyMinutes = Number.isFinite(minimumStudyMinutes) ? Math.max(0, minimumStudyMinutes) : 30;
  const totalStudyMinutes = Number.isFinite(actualStudyMinutes) ? Math.max(0, actualStudyMinutes) : Number.POSITIVE_INFINITY;

  if (!Number.isFinite(effectiveMasteredChapters) || !Number.isFinite(studyDaysElapsed) || studyDaysElapsed <= 0) {
    return 0;
  }

  if (hasRealStudyHistory && totalStudyMinutes < safeMinimumStudyMinutes) {
    return 0;
  }

  // A realistic chapter takes about 15 hours (900 minutes) to master completely.
  // By calculating velocity based on actual study time, we achieve two things:
  // 1. We smoothly award velocity for partial chapter progress (like doing 1 lecture).
  // 2. We completely ignore massive syllabus progress imports that would otherwise cause a 1.5x spike.
  const ASSUMED_MINUTES_PER_CHAPTER = 900;
  const inAppChaptersProgressed = totalStudyMinutes / ASSUMED_MINUTES_PER_CHAPTER;

  if (!hasRealStudyHistory) {
    return 0;
  }

  const rawVelocity = inAppChaptersProgressed / studyDaysElapsed;
  return Math.min(Math.max(rawVelocity, 0), cap);
}
