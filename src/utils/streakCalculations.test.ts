import { describe, expect, it } from 'vitest';
import { calculateCurrentStreak } from './streakCalculations';
import { calculateRealisticDailyChapterVelocity } from './chapterVelocity';

describe('streakCalculations', () => {
  it('uses the configured minimum study threshold instead of a fixed magic value', () => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const sessions = [
      { startTime: new Date(`${todayKey}T09:00:00`).toISOString(), duration: 45 },
      { startTime: new Date(`${yesterdayKey}T09:00:00`).toISOString(), duration: 45 },
    ] as any[];

    expect(calculateCurrentStreak(sessions, 60)).toBe(0);
    expect(calculateCurrentStreak(sessions, 30)).toBe(2);
  });

  it('bounds negative session durations to 0', () => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const sessions = [
      { startTime: new Date(`${todayKey}T09:00:00`).toISOString(), duration: 60 },
      { startTime: new Date(`${todayKey}T10:00:00`).toISOString(), duration: -120 },
    ] as any[];

    // If negative duration was allowed, sum would be -60, and streak would be 0.
    // Since bounded to 0, sum is 60, so streak should be 1.
    expect(calculateCurrentStreak(sessions, 30)).toBe(1);
  });
});

describe('chapterVelocity', () => {
  it('caps chapter velocity at a realistic daily maximum', () => {
    expect(calculateRealisticDailyChapterVelocity({ masteredChapters: 120, studyDaysElapsed: 1, cap: 1.5, hasRealStudyHistory: true })).toBe(1.5);
    expect(calculateRealisticDailyChapterVelocity({ masteredChapters: 3, studyDaysElapsed: 10, cap: 1.5, hasRealStudyHistory: true })).toBe(0.3);
  });

  it('ignores onboarding-only completion when no real study history exists', () => {
    expect(calculateRealisticDailyChapterVelocity({ masteredChapters: 6, studyDaysElapsed: 1, cap: 1.5, hasRealStudyHistory: false })).toBe(1);
  });
});
