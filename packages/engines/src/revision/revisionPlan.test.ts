import { describe, it, expect } from 'vitest';
import { buildRevisionPlan } from './revisionPlan';
import { Chapter, Mistake, StudySession } from '../types/index';

describe('buildRevisionPlan (Canonical Spaced Repetition Due Engine)', () => {
  const baseChapter: Chapter = {
    id: 'p-kinematics',
    name: 'Kinematics',
    subject: 'physics',
    unit: 'Mechanics',
    status: 'Learning',
    completion: 60,
    totalLectures: 10,
    currentLecture: 6,
    theoryComplete: true,
    dppComplete: true,
    pyqsComplete: false,
    revisionCount: 1,
    difficulty: 'Medium',
    confidence: 70,
    priority: 1,
    dependencies: [],
    weaknessScore: 10,
    solvedQuestions: 40,
    lastRevisionDaysAgo: 4,
    lastRevisedAt: '2026-03-01T00:00:00.000Z',
    nextRevisionDueAt: '2026-03-04T00:00:00.000Z',
    sm2EaseFactor: 2.5,
    sm2Interval: 3
  } as any;

  it('marks chapter as overdue when now is past nextRevisionDueAt', () => {
    // Due at March 4, now is March 6 (2 days overdue)
    const now = '2026-03-06T12:00:00.000Z';
    const plan = buildRevisionPlan({
      chapters: [baseChapter],
      now
    });

    expect(plan.dueChapters).toHaveLength(1);
    const due = plan.dueChapters[0];
    expect(due.chapterId).toBe('p-kinematics');
    expect(due.urgency).toBe('overdue');
    expect(due.daysOverdue).toBe(2);
    expect(due.dueReason).toContain('Overdue by 2 days');
    expect(plan.stats.totalDueChapters).toBe(1);
    expect(plan.revisionQueue).toHaveLength(1);
    expect(plan.revisionQueue[0].isCritical).toBe(true);
  });

  it('marks chapter as upcoming when now is before nextRevisionDueAt', () => {
    // Due at March 4, now is March 2
    const now = '2026-03-02T12:00:00.000Z';
    const plan = buildRevisionPlan({
      chapters: [baseChapter],
      now
    });

    expect(plan.dueChapters).toHaveLength(0);
    expect(plan.upcomingChapters).toHaveLength(1);
    expect(plan.upcomingChapters[0].urgency).toBe('upcoming');
    expect(plan.stats.totalDueChapters).toBe(0);
    expect(plan.stats.totalUpcomingChapters).toBe(1);
  });

  it('schedules first review for completed/in-progress chapters with revisionCount === 0', () => {
    const freshChapter: Chapter = {
      ...baseChapter,
      id: 'c-thermo',
      name: 'Thermodynamics',
      subject: 'chemistry',
      revisionCount: 0,
      lastRevisedAt: undefined,
      nextRevisionDueAt: undefined,
      theoryComplete: true,
      completion: 75
    };

    const plan = buildRevisionPlan({
      chapters: [freshChapter],
      now: '2026-03-05T00:00:00.000Z'
    });

    expect(plan.dueChapters).toHaveLength(1);
    const due = plan.dueChapters[0];
    expect(due.chapterId).toBe('c-thermo');
    expect(due.urgency).toBe('due_today');
    expect(due.dueReason).toContain('First review milestone');
  });

  it('excludes untouched unstarted chapters from due queues completely', () => {
    const unstartedChapter: Chapter = {
      id: 'm-calculus',
      name: 'Integral Calculus',
      subject: 'maths',
      status: 'Not Started',
      completion: 0,
      currentLecture: 0,
      totalLectures: 15,
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0
    } as any;

    const plan = buildRevisionPlan({
      chapters: [unstartedChapter],
      now: '2026-03-05T00:00:00.000Z'
    });

    expect(plan.dueChapters).toHaveLength(0);
    expect(plan.upcomingChapters).toHaveLength(0);
    expect(plan.notStartedChapters).toHaveLength(1);
    expect(plan.notStartedChapters[0].chapterId).toBe('m-calculus');
  });

  it('generates real formula cards from FORMULA_BANK and attaches active student mistakes', () => {
    const mistake: Mistake = {
      id: 'm1',
      chapterId: 'p-kinematics',
      chapter: 'Kinematics',
      subject: 'physics',
      topic: 'Relative Velocity',
      questionText: 'Rain problem with car moving at 30 km/h',
      correctMethod: 'v_rel = v_rain - v_car',
      revisionStatus: 'New',
      priority: 'High',
      dateLogged: '2026-03-01T00:00:00.000Z'
    } as any;

    const plan = buildRevisionPlan({
      chapters: [baseChapter],
      mistakes: [mistake],
      now: '2026-03-06T00:00:00.000Z'
    });

    expect(plan.dueChapters[0].mistakeCardsCount).toBe(1);
    expect(plan.dueChapters[0].formulaCardsCount).toBeGreaterThan(0);
    expect(plan.allCards.some(c => c.cardType === 'mistake' && c.mistakeId === 'm1')).toBe(true);
    expect(plan.dueCards.some(c => c.cardType === 'formula')).toBe(true);
    expect(plan.dueCards.some(c => c.cardType === 'mistake')).toBe(false);
    expect(plan.stats.pendingMistakesCount).toBe(1);
  });

  it('respects wall-clock time elapsed when lastRevisedAt is present without explicit nextRevisionDueAt', () => {
    const chapterWithoutDueDate: Chapter = {
      ...baseChapter,
      nextRevisionDueAt: undefined,
      lastRevisedAt: '2026-03-01T00:00:00.000Z',
      sm2Interval: 3,
      revisionCount: 2
    };

    // 4 days later: elapsed >= interval (3 days), so due
    const planDue = buildRevisionPlan({
      chapters: [chapterWithoutDueDate],
      now: '2026-03-05T00:00:00.000Z'
    });
    expect(planDue.dueChapters).toHaveLength(1);

    // 2 days later: elapsed < interval, so upcoming
    const planUpcoming = buildRevisionPlan({
      chapters: [chapterWithoutDueDate],
      now: '2026-03-03T00:00:00.000Z'
    });
    expect(planUpcoming.dueChapters).toHaveLength(0);
    expect(planUpcoming.upcomingChapters).toHaveLength(1);
  });

  it('accurately counts reviewedTodayCount from study sessions', () => {
    const now = '2026-03-05T12:00:00.000Z';
    const sessions: StudySession[] = [
      {
        id: 's1',
        startTime: '2026-03-05T08:00:00.000Z',
        endTime: '2026-03-05T08:30:00.000Z',
        duration: 30,
        type: 'Revision',
        subjectId: 'physics',
        chapterId: 'p-kinematics'
      } as any,
      {
        id: 's2',
        startTime: '2026-03-04T08:00:00.000Z',
        endTime: '2026-03-04T08:30:00.000Z',
        duration: 30,
        type: 'Revision',
        subjectId: 'physics',
        chapterId: 'p-kinematics'
      } as any
    ];

    const plan = buildRevisionPlan({
      chapters: [baseChapter],
      sessions,
      now
    });

    expect(plan.stats.reviewedTodayCount).toBe(1);
  });

  it('excludes chapters revised today from dueChapters and schedules them in upcomingChapters', () => {
    const now = '2026-03-05T12:00:00.000Z';
    const revisedTodayChapter: Chapter = {
      ...baseChapter,
      id: 'c-chem-bonding',
      name: 'Chemical Bonding',
      subject: 'chemistry',
      status: 'Revision Due', // Even if status was previously 'Revision Due'
      lastRevisedAt: '2026-03-05T09:00:00.000Z',
      nextRevisionDueAt: '2026-03-08T09:00:00.000Z',
      revisionCount: 2
    } as any;

    const plan = buildRevisionPlan({
      chapters: [revisedTodayChapter],
      now
    });

    expect(plan.dueChapters).toHaveLength(0);
    expect(plan.upcomingChapters).toHaveLength(1);
    expect(plan.upcomingChapters[0].chapterId).toBe('c-chem-bonding');
    expect(plan.stats.totalDueChapters).toBe(0);
  });

  it('does not mark a chapter due if its unmastered mistakes are scheduled for future review dates', () => {
    const now = '2026-03-05T12:00:00.000Z';
    const chapterWithFutureMistake: Chapter = {
      ...baseChapter,
      id: 'c-bonding-future',
      name: 'Chemical Bonding',
      subject: 'chemistry',
      lastRevisedAt: '2026-03-05T09:00:00.000Z',
      nextRevisionDueAt: '2026-03-08T09:00:00.000Z',
      revisionCount: 1,
      flashcardStates: {
        'm-mistake-1': {
          repetitions: 1,
          easeFactor: 2.5,
          interval: 3,
          nextReviewDate: '2026-03-08T09:00:00.000Z',
          lastReviewDate: '2026-03-05T09:00:00.000Z'
        }
      }
    } as any;

    const mistake: Mistake = {
      id: 'mistake-1',
      chapterId: 'c-bonding-future',
      chapter: 'Chemical Bonding',
      subject: 'chemistry',
      revisionStatus: 'Reviewed',
      questionText: 'Bond angle in ClF3'
    } as any;

    const plan = buildRevisionPlan({
      chapters: [chapterWithFutureMistake],
      mistakes: [mistake],
      now
    });

    expect(plan.dueChapters).toHaveLength(0);
    expect(plan.stats.totalDueChapters).toBe(0);
  });
});
