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

  if (Number.isFinite(actualStudyMinutes) && hasRealStudyHistory && totalStudyMinutes < safeMinimumStudyMinutes) {
    return 0;
  }

  const rawVelocity = effectiveMasteredChapters / studyDaysElapsed;
  return Math.min(Math.max(rawVelocity, 0), cap);
}
