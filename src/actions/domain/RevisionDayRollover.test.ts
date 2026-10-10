import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChapterActions } from './ChapterActions';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { validateAndSanitizeChapters } from '@/context/sanitizers/chapterSanitizer';
import { RevisionEngine } from '@jee-os/engines';
import { Chapter } from '@/types/index';

vi.mock('@/firebase', () => ({
  db: {}
}));

vi.mock('@/repositories/chapterRepository', () => ({
  ChapterRepository: {
    saveChapter: vi.fn().mockResolvedValue(undefined),
    getChapters: vi.fn().mockResolvedValue([]),
    updateChapter: vi.fn().mockResolvedValue(undefined),
    deleteChapter: vi.fn().mockResolvedValue(undefined),
    seedChapters: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/userRepository', () => ({
  UserRepository: {
    saveUserProfile: vi.fn().mockResolvedValue(undefined),
    getUserProfile: vi.fn().mockResolvedValue(null),
    updateUserProfile: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/studySessionRepository', () => ({
  StudySessionRepository: {
    saveStudySession: vi.fn().mockResolvedValue(undefined),
    deleteStudySession: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/repositories/customMissionRepository', () => ({
  CustomMissionRepository: {
    saveMission: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Revision Day-Rollover & State Persistence Invariant', () => {
  let runtime: StudyBrainRuntime;
  let actions: ChapterActions;
  let revisionEngine: RevisionEngine;

  const baseChapter: Chapter = {
    id: 'chap-rotational-motion',
    name: 'Rotational Motion',
    subject: 'physics',
    unit: 'Mechanics',
    completion: 80,
    currentLecture: 8,
    totalLectures: 10,
    theoryComplete: true,
    dppComplete: true,
    pyqsComplete: false,
    revisionCount: 0,
    difficulty: 'Hard',
    confidence: 50,
    estimatedRemainingTime: 3,
    priority: 1,
    dependencies: [],
    weaknessScore: 30,
    status: 'Revision Due',
    syllabusStage: 'Revision',
    solvedQuestions: 45,
    lastRevisionDaysAgo: 10,
    sm2EaseFactor: 2.5,
    sm2Interval: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = StudyBrainRuntime.getInstance();
    runtime.updateStateOptimistic({ writeBlocked: false });
    actions = new ChapterActions(runtime, 'test-user-rollover');
    revisionEngine = new RevisionEngine();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('preserves SM-2 repetitions and prevents reset to "Never reviewed" across multi-day rollover and sanitizer cycles', async () => {
    // -------------------------------------------------------------
    // DAY 1: Initial state - Chapter needs revision (revisionCount = 0)
    // -------------------------------------------------------------
    const day1Time = new Date('2026-10-10T10:00:00.000Z');
    vi.setSystemTime(day1Time);

    runtime.updateStateOptimistic({
      chapters: [{ ...baseChapter }],
      todayMissions: [
        {
          id: 'mission-rev-rotational',
          subject: 'physics',
          chapter: 'Rotational Motion',
          chapterId: 'chap-rotational-motion',
          type: 'Revise Formulas',
          taskName: 'Spaced Repetition: Rotational Motion',
          duration: 45,
          completed: false,
          xp: 80,
          unlocked: true,
          isManualOverride: true
        }
      ],
      completedPlannerMissionIds: []
    });

    // 1. Complete Day 1 Revision with 'High' confidence
    await actions.completeRevision('chap-rotational-motion', 'High');

    let state = runtime.getState();
    let chapter = state.chapters.find(c => c.id === 'chap-rotational-motion')!;

    // Assert Day 1 metrics
    expect(chapter.revisionCount).toBe(1);
    expect(chapter.sm2Interval).toBe(1); // 1st rep interval is 1 day
    expect(chapter.sm2EaseFactor).toBe(2.6); // 2.5 + 0.1
    expect(chapter.lastRevisedAt).toBe(day1Time.toISOString());
    expect(chapter.nextRevisionDueAt).toBeDefined();
    expect(new Date(chapter.nextRevisionDueAt!).getTime()).toBeGreaterThan(day1Time.getTime());
    expect(chapter.syllabusStage).not.toBe('Revision'); // Exited 'Revision Due' trap

    // Verify matching todayMission was completed
    const day1Mission = state.todayMissions.find(m => m.id === 'mission-rev-rotational');
    expect(day1Mission?.completed).toBe(true);

    // 2. Simulate Firestore roundtrip serialization through validateAndSanitizeChapters
    const serialized = JSON.parse(JSON.stringify([chapter]));
    const rehydrated = validateAndSanitizeChapters(serialized);
    const sanitizedChapter = rehydrated[0];

    // Assert that sanitizer NEVER drops SM-2 fields
    expect(sanitizedChapter.revisionCount).toBe(1);
    expect(sanitizedChapter.sm2Interval).toBe(1);
    expect(sanitizedChapter.sm2EaseFactor).toBe(2.6);
    expect(sanitizedChapter.lastRevisedAt).toBe(day1Time.toISOString());
    expect(sanitizedChapter.nextRevisionDueAt).toBe(chapter.nextRevisionDueAt);

    // 3. Telemetry Check on Day 1:
    // Rotational Motion was revised today, so it must NOT be in overdueChapters
    const day1Telemetry = revisionEngine.generateRevisionTelemetry({
      chapters: [sanitizedChapter],
      chapterTelemetryMap: {},
      sessions: [],
      mistakes: [],
      notes: []
    });
    expect(day1Telemetry.overdueChapters.some(c => c.chapterId === 'chap-rotational-motion')).toBe(false);

    // -------------------------------------------------------------
    // DAY 2: Advance clock by 24 hours (2026-10-11T10:00:00.000Z)
    // -------------------------------------------------------------
    const day2Time = new Date('2026-10-11T10:00:00.000Z');
    vi.setSystemTime(day2Time);

    // Check UI format: Revised 1d ago (NEVER "Never reviewed")
    const lastRevisedMs = new Date(sanitizedChapter.lastRevisedAt!).getTime();
    const daysAgo = Math.floor((day2Time.getTime() - lastRevisedMs) / (1000 * 60 * 60 * 24));
    expect(daysAgo).toBe(1);
    const formattedLastRevised = daysAgo === 0 ? 'Revised today' : daysAgo === 1 ? 'Revised yesterday' : `Revised ${daysAgo}d ago`;
    expect(formattedLastRevised).toBe('Revised yesterday');

    // Due date has arrived (1-day interval passed)
    const nextDueMs = new Date(sanitizedChapter.nextRevisionDueAt!).getTime();
    expect(day2Time.getTime()).toBeGreaterThanOrEqual(nextDueMs);

    // Rehydrate runtime on Day 2 with sanitized chapters
    runtime.updateStateOptimistic({
      chapters: [sanitizedChapter],
      todayMissions: [
        {
          id: 'mission-rev-rotational-day2',
          subject: 'physics',
          chapter: 'Rotational Motion',
          chapterId: 'chap-rotational-motion',
          type: 'Revise Formulas',
          taskName: 'Spaced Repetition: Rotational Motion (Rep 2)',
          duration: 45,
          completed: false,
          xp: 80,
          unlocked: true,
          isManualOverride: true
        }
      ]
    });

    // 4. Complete Day 2 Revision with 'High' confidence (2nd review)
    await actions.completeRevision('chap-rotational-motion', 'High');

    state = runtime.getState();
    chapter = state.chapters.find(c => c.id === 'chap-rotational-motion')!;

    // Assert SM-2 scaled up for repetition 2:
    // interval should be 6 days (standard SM-2: rep 1 -> 1d, rep 2 -> 6d)
    expect(chapter.revisionCount).toBe(2);
    expect(chapter.sm2Interval).toBe(6);
    expect(chapter.sm2EaseFactor).toBe(2.7); // 2.6 + 0.1
    expect(chapter.lastRevisedAt).toBe(day2Time.toISOString());

    const dueDay2 = new Date(chapter.nextRevisionDueAt!);
    const dueInDays = Math.round((dueDay2.getTime() - day2Time.getTime()) / (1000 * 60 * 60 * 24));
    expect(dueInDays).toBeGreaterThanOrEqual(5);

    // -------------------------------------------------------------
    // DAY 3: Advance clock by another 24 hours (2026-10-12T10:00:00.000Z)
    // -------------------------------------------------------------
    const day3Time = new Date('2026-10-12T10:00:00.000Z');
    vi.setSystemTime(day3Time);

    // Simulate Firestore roundtrip again
    const serializedDay2 = JSON.parse(JSON.stringify([chapter]));
    const rehydratedDay2 = validateAndSanitizeChapters(serializedDay2);
    const sanitizedDay2Chapter = rehydratedDay2[0];

    // Assert fields are intact
    expect(sanitizedDay2Chapter.revisionCount).toBe(2);
    expect(sanitizedDay2Chapter.sm2Interval).toBe(6);

    // Telemetry Check on Day 3:
    // Next revision is due in ~5 days, so it must NOT be scheduled or in overdue backlog!
    const day3Telemetry = revisionEngine.generateRevisionTelemetry({
      chapters: [sanitizedDay2Chapter],
      chapterTelemetryMap: {},
      sessions: [],
      mistakes: [],
      notes: []
    });

    expect(day3Telemetry.overdueChapters.some(c => c.chapterId === 'chap-rotational-motion')).toBe(false);
  });

  it('correctly handles Low confidence revision: resets repetitions to 0, sets interval to 1, and reschedules for tomorrow', async () => {
    const day1Time = new Date('2026-10-10T10:00:00.000Z');
    vi.setSystemTime(day1Time);

    const chapterWithPriorReps: Chapter = {
      ...baseChapter,
      revisionCount: 3,
      sm2Interval: 15,
      sm2EaseFactor: 2.5,
      lastRevisionDaysAgo: 20
    };

    runtime.updateStateOptimistic({
      chapters: [chapterWithPriorReps],
      todayMissions: [
        {
          id: 'mission-rev-low',
          subject: 'physics',
          chapter: 'Rotational Motion',
          chapterId: 'chap-rotational-motion',
          type: 'Revise Formulas',
          taskName: 'Revise Formulas: Rotational Motion',
          duration: 30,
          completed: false,
          xp: 60,
          unlocked: true,
          isManualOverride: true
        }
      ],
      completedPlannerMissionIds: []
    });

    // Complete with Low confidence (forgetting occurred)
    await actions.completeRevision('chap-rotational-motion', 'Low');

    const state = runtime.getState();
    const updated = state.chapters.find(c => c.id === 'chap-rotational-motion')!;

    // SM-2: Repetitions reset to 0, interval resets to 1, ease factor decreases
    expect(updated.revisionCount).toBe(0);
    expect(updated.sm2Interval).toBe(1);
    expect(updated.sm2EaseFactor).toBeLessThan(2.5);
    expect(updated.revisionProgress?.needRevision).toBe(true);

    // Sanitizer test
    const sanitized = validateAndSanitizeChapters([updated])[0];
    expect(sanitized.revisionCount).toBe(0);
    expect(sanitized.sm2Interval).toBe(1);
    expect(sanitized.lastRevisedAt).toBe(day1Time.toISOString());
  });

  it('grades flashcards batch and updates SM-2 intervals without resetting across day rollover', async () => {
    const day1Time = new Date('2026-10-10T10:00:00.000Z');
    vi.setSystemTime(day1Time);

    runtime.updateStateOptimistic({
      chapters: [{ ...baseChapter }],
      todayMissions: [
        {
          id: 'mission-fc-rotational',
          subject: 'physics',
          chapter: 'Rotational Motion',
          chapterId: 'chap-rotational-motion',
          type: 'Revise Formulas',
          taskName: 'Flashcard Drill: Rotational Motion',
          duration: 30,
          completed: false,
          xp: 50,
          unlocked: true,
          isManualOverride: true
        }
      ],
      completedPlannerMissionIds: []
    });

    // Grade batch with 5 cards: 4 Easy, 1 Good -> Average quality >= 4 (High confidence)
    await actions.gradeFlashcardsBatch([
      { cardId: 'card-1', rating: 'Easy', chapterId: 'chap-rotational-motion' },
      { cardId: 'card-2', rating: 'Easy', chapterId: 'chap-rotational-motion' },
      { cardId: 'card-3', rating: 'Good', chapterId: 'chap-rotational-motion' },
      { cardId: 'card-4', rating: 'Easy', chapterId: 'chap-rotational-motion' },
      { cardId: 'card-5', rating: 'Easy', chapterId: 'chap-rotational-motion' }
    ]);

    let state = runtime.getState();
    let chapter = state.chapters.find(c => c.id === 'chap-rotational-motion')!;

    expect(chapter.revisionCount).toBe(1);
    expect(chapter.sm2Interval).toBe(1);
    expect(chapter.lastRevisedAt).toBe(day1Time.toISOString());

    const mission = state.todayMissions.find(m => m.id === 'mission-fc-rotational');
    expect(mission?.completed).toBe(true);

    // Advance clock to Day 2
    const day2Time = new Date('2026-10-11T10:00:00.000Z');
    vi.setSystemTime(day2Time);

    const sanitized = validateAndSanitizeChapters([chapter])[0];
    expect(sanitized.revisionCount).toBe(1);
    expect(sanitized.sm2Interval).toBe(1);

    // Complete 2nd batch on Day 2
    runtime.updateStateOptimistic({
      chapters: [sanitized],
      todayMissions: []
    });

    await actions.gradeFlashcardsBatch([
      { cardId: 'card-1', rating: 'Easy', chapterId: 'chap-rotational-motion' },
      { cardId: 'card-2', rating: 'Easy', chapterId: 'chap-rotational-motion' },
      { cardId: 'card-3', rating: 'Easy', chapterId: 'chap-rotational-motion' }
    ]);

    state = runtime.getState();
    chapter = state.chapters.find(c => c.id === 'chap-rotational-motion')!;

    expect(chapter.revisionCount).toBe(2);
    expect(chapter.sm2Interval).toBe(6);
    expect(chapter.lastRevisedAt).toBe(day2Time.toISOString());
  });
});

