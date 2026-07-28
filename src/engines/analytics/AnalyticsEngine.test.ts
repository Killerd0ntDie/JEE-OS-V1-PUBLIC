import { describe, it, expect } from 'vitest';
import { AnalyticsEngine } from './AnalyticsEngine';
import { Chapter, Mistake, StudySession, MockResult } from '../../types/index';

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
});
