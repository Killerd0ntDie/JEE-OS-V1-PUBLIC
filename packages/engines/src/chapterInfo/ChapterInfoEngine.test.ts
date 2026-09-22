import { describe, it, expect } from 'vitest';
import { ChapterInfoEngine } from './ChapterInfoEngine';
import { Chapter } from '../types/index';

describe('ChapterInfoEngine (BUG-09 Bottleneck Logic Accuracy)', () => {
  const engine = new ChapterInfoEngine();

  it('correctly flags lecture backlog when currentLecture is 0 and theory is incomplete', () => {
    const chapter: Chapter = {
      id: 'p1',
      name: 'Kinematics',
      subject: 'physics',
      status: 'Learning',
      totalLectures: 10,
      currentLecture: 0,
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false,
      completion: 10
    } as any;

    const result = engine.generateChapterTelemetry({
      chapters: [chapter],
      mistakes: [],
      settings: { targetYear: '2026' } as any
    });

    expect(result['p1'].isBottleneck).toBe(true);
    expect(result['p1'].bottleneckReason).toContain('Lecture 0/10 backlog');
    expect(result['p1'].bottleneckReason).not.toContain('DPP practice pending');
  });

  it('does NOT flag lecture backlog when theory is complete, even if currentLecture < totalLectures', () => {
    const chapter: Chapter = {
      id: 'p2',
      name: 'Laws of Motion',
      subject: 'physics',
      status: 'Learning',
      totalLectures: 12,
      currentLecture: 5,
      theoryComplete: true, // Theory completed via notes/fast-track
      dppComplete: false,
      pyqsComplete: false,
      completion: 40
    } as any;

    const result = engine.generateChapterTelemetry({
      chapters: [chapter],
      mistakes: [],
      settings: { targetYear: '2026' } as any
    });

    expect(result['p2'].isBottleneck).toBe(true);
    expect(result['p2'].bottleneckReason).toContain('DPP practice pending');
    expect(result['p2'].bottleneckReason).not.toContain('Lecture 5/12 backlog');
  });

  it('correctly advances bottleneck from DPP to PYQ drill and unresolved errors', () => {
    const chapterDppDone: Chapter = {
      id: 'c1',
      name: 'Thermodynamics',
      subject: 'chemistry',
      status: 'Learning',
      totalLectures: 8,
      currentLecture: 8,
      theoryComplete: true,
      dppComplete: true,
      pyqsComplete: false,
      completion: 65
    } as any;

    const result1 = engine.generateChapterTelemetry({
      chapters: [chapterDppDone],
      mistakes: [],
      settings: { targetYear: '2026' } as any
    });

    expect(result1['c1'].isBottleneck).toBe(true);
    expect(result1['c1'].bottleneckReason).toContain('PYQs drill pending');

    const chapterPyqDone: Chapter = {
      ...chapterDppDone,
      id: 'c2',
      pyqsComplete: true
    };

    const mistakes = [
      { id: 'm1', chapter: 'Thermodynamics', revisionStatus: 'Pending' },
      { id: 'm2', chapter: 'Thermodynamics', revisionStatus: 'Pending' },
      { id: 'm3', chapter: 'Thermodynamics', revisionStatus: 'Pending' }
    ] as any;

    const result2 = engine.generateChapterTelemetry({
      chapters: [chapterPyqDone],
      mistakes,
      settings: { targetYear: '2026' } as any
    });

    expect(result2['c2'].isBottleneck).toBe(true);
    expect(result2['c2'].bottleneckReason).toContain('3 unresolved errors');
  });

  it('prioritizes Critical severity and higher weightage bottlenecks in getChapterBottlenecks (BUG-19)', () => {
    const lowSeverityChap: Chapter = {
      id: 'low1',
      name: 'Units and Dimensions',
      subject: 'physics',
      status: 'Learning',
      totalLectures: 5,
      currentLecture: 1,
      theoryComplete: false,
      weightage: 2.0
    } as any;

    const moderateChap: Chapter = {
      id: 'mod1',
      name: 'Thermodynamics',
      subject: 'physics',
      status: 'Learning',
      totalLectures: 10,
      currentLecture: 3,
      theoryComplete: false,
      weightage: 4.0
    } as any;

    const criticalChap1: Chapter = {
      id: 'crit1',
      name: 'Rotational Motion',
      subject: 'physics',
      status: 'Learning',
      totalLectures: 15,
      currentLecture: 2,
      theoryComplete: false,
      weightage: 7.0,
      difficulty: 'Hard'
    } as any;

    const criticalChap2: Chapter = {
      id: 'crit2',
      name: 'Electrostatics',
      subject: 'physics',
      status: 'Learning',
      totalLectures: 12,
      currentLecture: 4,
      theoryComplete: false,
      weightage: 8.5,
      difficulty: 'Hard'
    } as any;

    const bottlenecks = engine.getChapterBottlenecks({
      chapters: [lowSeverityChap, moderateChap, criticalChap1, criticalChap2],
      mistakes: [],
      settings: { targetYear: `${new Date().getFullYear() + 1}` } as any
    });

    expect(bottlenecks.length).toBe(3);
    // Both critical chapters should be in the top 3, with higher weightage (Electrostatics) first
    expect(bottlenecks[0]).toContain('Electrostatics');
    expect(bottlenecks[1]).toContain('Rotational Motion');
    // The third should be Thermodynamics (Moderate), NOT the low-weightage Units and Dimensions
    expect(bottlenecks[2]).toContain('Thermodynamics');
  });

  it('safely handles missing or undefined chapters and mistakes arrays without throwing (BUG-24)', () => {
    expect(() => {
      const res1 = engine.generateChapterTelemetry({
        chapters: undefined as any,
        mistakes: undefined as any,
      });
      expect(res1).toEqual({});
    }).not.toThrow();

    expect(() => {
      const res2 = engine.generateChapterTelemetry({
        chapters: [{
          id: 'c-test',
          name: 'Test Chapter',
          subject: 'physics',
          status: 'Learning',
          completion: 20
        } as any],
        mistakes: undefined as any,
      });
      expect(res2['c-test']).toBeDefined();
    }).not.toThrow();
  });
});
