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

  it('resets streak to 0 when 0 minutes are logged today and yesterday', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoKey = `${threeDaysAgo.getFullYear()}-${String(threeDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(threeDaysAgo.getDate()).padStart(2, '0')}`;

    const sessions = [
      { startTime: new Date(`${threeDaysAgoKey}T10:00:00`).toISOString(), duration: 120 }
    ] as any[];

    expect(calculateCurrentStreak(sessions, 30)).toBe(0);
    expect(calculateCurrentStreak([], 30)).toBe(0);
  });

  it('preserves yesterday streak when yesterday met threshold but today has 0 minutes', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const sessions = [
      { startTime: new Date(`${yesterdayKey}T10:00:00`).toISOString(), duration: 60 }
    ] as any[];

    expect(calculateCurrentStreak(sessions, 30)).toBe(1);
  });

  it('correctly breaks streak when a day is missed (Day 1 studied, Day 2 missed, Day 3 studied)', () => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Two days ago (Day 1)
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoKey = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;

    // Yesterday (Day 2) was MISSED (0 minutes)
    // Today (Day 3) studied 45 mins
    const sessions = [
      { startTime: new Date(`${twoDaysAgoKey}T10:00:00`).toISOString(), duration: 60 },
      { startTime: new Date(`${todayKey}T10:00:00`).toISOString(), duration: 45 },
    ] as any[];

    // Since yesterday was missed, streak must be 1, NOT 2 or 3!
    expect(calculateCurrentStreak(sessions, 30)).toBe(1);
  });

  it('ignores break sessions and does not count them toward streak quota', () => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const sessions = [
      { startTime: new Date(`${todayKey}T10:00:00`).toISOString(), duration: 45, type: 'Break' },
      { startTime: new Date(`${todayKey}T11:00:00`).toISOString(), duration: 15, type: 'Practice' },
    ] as any[];

    // Only 15 mins of real study; threshold is 30 -> streak is 0
    expect(calculateCurrentStreak(sessions, 30)).toBe(0);
  });

  it('incorporates dailyAnalytics studyTime when present', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const dailyAnalytics = [
      { date: yesterdayKey, studyTime: 60 }
    ];

    expect(calculateCurrentStreak([], 30, dailyAnalytics)).toBe(1);
  });
});

describe('chapterVelocity', () => {
  it('caps chapter velocity at a realistic daily maximum', () => {
    expect(calculateRealisticDailyChapterVelocity({ masteredChapters: 120, studyDaysElapsed: 1, cap: 1.5, hasRealStudyHistory: true })).toBe(1.5);
    expect(calculateRealisticDailyChapterVelocity({ masteredChapters: 3, studyDaysElapsed: 10, cap: 1.5, hasRealStudyHistory: true })).toBe(0.3);
  });

  it('ignores onboarding-only completion when no real study history exists', () => {
    expect(calculateRealisticDailyChapterVelocity({ masteredChapters: 6, studyDaysElapsed: 1, cap: 1.5, hasRealStudyHistory: false })).toBe(0);
  });
});
