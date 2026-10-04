import { describe, it, expect } from 'vitest';
import { AnalyticsEngine, calculateRadarMetrics } from './AnalyticsEngine';
import { Chapter, Mistake, StudySession, MockResult } from '../types/index';

describe('AnalyticsEngine', () => {
  const engine = new AnalyticsEngine();

  const mockSessions: StudySession[] = [
    { id: '1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), duration: 120, type: 'Lecture', subjectId: 'physics', questionsSolved: 20, accuracy: 80, xpEarned: 10 },
    { id: '2', startTime: new Date(Date.now() - 86400000).toISOString(), endTime: new Date().toISOString(), duration: 60, type: 'Practice', subjectId: 'chemistry', questionsSolved: 30, accuracy: 90, xpEarned: 20 },
    { id: '3', startTime: new Date(Date.now() - 2 * 86400000).toISOString(), endTime: new Date().toISOString(), duration: 120, type: 'Mock', subjectId: 'maths', questionsSolved: 50, accuracy: 50, xpEarned: 30 },
  ];

  const mockChapters: Chapter[] = [
    { id: '1', subject: 'physics', name: 'p1', currentLecture: 2, totalLectures: 4 } as any,
    { id: '2', subject: 'chemistry', name: 'c1', currentLecture: 1, totalLectures: 2 } as any,
    { id: '3', subject: 'maths', name: 'm1', currentLecture: 0, totalLectures: 4 } as any,
  ];

  const mockMistakes: Mistake[] = [
    { id: '1', chapter: 'p1', revisionStatus: 'Mastered' } as any,
    { id: '2', chapter: 'c1', revisionStatus: 'Learning' } as any,
  ];

  const mockMocks: MockResult[] = [
    { id: '1', date: new Date().toISOString(), totalScore: 150 } as any,
    { id: '2', date: new Date(Date.now() - 86400000).toISOString(), totalScore: 100 } as any,
  ];

  it('calculates total study hours correctly', () => {
    const result = engine.generateAnalytics({
      sessions: mockSessions,
      chapters: [],
      mistakes: [],
      mocks: []
    });
    
    expect(result.totalStudyHours).toBe(5); // 120 + 60 + 120 = 300 mins = 5 hrs
  });

  it('calculates question accuracy correctly', () => {
    const result = engine.generateAnalytics({
      sessions: mockSessions,
      chapters: [],
      mistakes: [],
      mocks: []
    });

    // Qs: 20@80% (16), 30@90% (27), 50@50% (25) -> Total: 100, Correct: 68 -> 68%
    expect(result.questionAccuracy).toBe(68);
  });

  it('calculates mock performance correctly', () => {
    const result = engine.generateAnalytics({
      sessions: [],
      chapters: [],
      mistakes: [],
      mocks: mockMocks
    });

    expect(result.mockPerformance.averageScore).toBe(125);
    expect(result.mockPerformance.recentTrend).toBe(25); // 150 - 125
  });

  it('calculates overall lecture completion and subject balance', () => {
    const result = engine.generateAnalytics({
      sessions: mockSessions,
      chapters: mockChapters,
      mistakes: [],
      mocks: []
    });

    // Total lectures: 10, completed: 3 -> 30%
    expect(result.overallLectureCompletion).toBe(30);
    expect(result.subjectBalance.physics.completionPercentage).toBe(50);
    expect(result.subjectBalance.chemistry.completionPercentage).toBe(50);
    expect(result.subjectBalance.maths.completionPercentage).toBe(0);
    
    expect(result.subjectBalance.physics.studyHours).toBe(2);
    expect(result.subjectBalance.chemistry.studyHours).toBe(1);
    expect(result.subjectBalance.maths.studyHours).toBe(2);
  });

  it('calculates revision health', () => {
    const result = engine.generateAnalytics({
      sessions: [],
      chapters: [],
      mistakes: mockMistakes,
      mocks: []
    });

    expect(result.revisionHealth).toBe(50);
  });

  it('handles small study velocity and huge lecture backlog without RangeError: Invalid time value (BUG-11 fix)', () => {
    // 60-minute session logged today creates a valid velocity (~0.14 hrs/day)
    const session: StudySession = {
      id: 'session-1',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 60,
      type: 'Lecture',
      subjectId: 'physics',
      xpEarned: 10
    };

    // Huge remaining lectures backlog (e.g. 50,000 lectures) that would produce date overflow
    const hugeBacklogChapters: Chapter[] = [
      { id: '1', subject: 'physics', name: 'p1', currentLecture: 0, totalLectures: 50000 } as any
    ];

    expect(() => {
      const result = engine.generateAnalytics({
        sessions: [session],
        chapters: hugeBacklogChapters,
        mistakes: [],
        mocks: []
      });

      expect(result.predictedCompletionDate).toBeDefined();
      expect(typeof result.predictedCompletionDate).toBe('string');
      // Assert it is a valid date within 10-year clamped horizon
      const predictedTimestamp = new Date(result.predictedCompletionDate!).getTime();
      expect(Number.isNaN(predictedTimestamp)).toBe(false);

      const maxFutureMs = Date.now() + (3651 * 86400000);
      expect(predictedTimestamp).toBeLessThanOrEqual(maxFutureMs);
    }).not.toThrow();
  });

  it('correctly bins late-night sessions into calendar days across midnight (BUG-30)', () => {
    // Current simulated local time: Sept 4, 2026 at 09:00 AM
    const now = new Date(2026, 8, 4, 9, 0, 0);

    // Session A: Yesterday night at 11:00 PM (Sept 3, 2026 at 23:00)
    // Only 10 hours ago (< 24 hours elapsed), but on yesterday's calendar day
    const yesterdayLateSession: StudySession = {
      id: 'sess-yesterday-late',
      startTime: new Date(2026, 8, 3, 23, 0, 0).toISOString(),
      endTime: new Date(2026, 8, 3, 23, 45, 0).toISOString(),
      duration: 45, // 0.8 hr
      type: 'Lecture',
      subjectId: 'physics',
      xpEarned: 0
    };

    // Session B: Today morning at 07:00 AM (Sept 4, 2026 at 07:00)
    const todayEarlySession: StudySession = {
      id: 'sess-today-early',
      startTime: new Date(2026, 8, 4, 7, 0, 0).toISOString(),
      endTime: new Date(2026, 8, 4, 8, 0, 0).toISOString(),
      duration: 60, // 1.0 hr
      type: 'Lecture',
      subjectId: 'maths',
      xpEarned: 0
    };

    const result = engine.generateAnalytics({
      sessions: [yesterdayLateSession, todayEarlySession],
      chapters: [],
      mistakes: [],
      mocks: [],
      currentDate: now.toISOString()
    });

    // studyHoursPastWeek: index 6 is today (Sept 4), index 5 is yesterday (Sept 3)
    expect(result.studyHoursPastWeek[6]).toBe(1.0); // 60 mins today
    expect(result.studyHoursPastWeek[5]).toBe(0.8); // 45 mins yesterday
  });

  describe('calculateRadarMetrics', () => {
    it('computes velocity, retention, and depth normalized scores correctly', () => {
      const chapters: Chapter[] = [
        {
          id: 'ch-1',
          subject: 'physics',
          name: 'Kinematics',
          completion: 80,
          confidence: 85,
          status: 'Learning',
          pyqsComplete: true,
        } as any,
        {
          id: 'ch-2',
          subject: 'chemistry',
          name: 'Thermodynamics',
          completion: 100,
          status: 'Mastered',
          pyqsComplete: true,
        } as any,
      ];

      const sessions: StudySession[] = [
        {
          id: 's-1',
          startTime: new Date().toISOString(),
          duration: 180, // 3 hours
          subjectId: 'physics'
        } as any,
      ];

      const metrics = calculateRadarMetrics(chapters, sessions, 6.5);

      expect(metrics.velocity).toBeDefined();
      expect(metrics.retention).toBeDefined();
      expect(metrics.depth).toBeDefined();

      expect(metrics.velocity.score).toBeGreaterThan(0);
      expect(metrics.retention.score).toBeGreaterThan(0);
      expect(metrics.depth.score).toBeGreaterThan(0);
    });

    it('handles empty inputs gracefully with fallbacks', () => {
      const metrics = calculateRadarMetrics([], [], 6.5);
      expect(metrics.velocity.score).toBe(65);
      expect(metrics.retention.score).toBe(78);
      expect(metrics.depth.score).toBe(60);
    });
  });
});
