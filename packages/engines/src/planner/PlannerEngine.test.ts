import { describe, it, expect } from 'vitest';
import { PlannerEngine } from './PlannerEngine';
import { KnowledgeEngine, SyllabusNode } from '../knowledge';
import { PlannerInput } from './types';

const MOCK_SYLLABUS: SyllabusNode[] = [
  {
    id: 'c1',
    name: 'Chapter 1',
    subject: 'physics',
    module: 'Mechanics',
    prerequisites: [],
    unlockedChapters: [],
    lectureCount: 5,
    estimatedHours: 10,
    weightage: 5,
    dppCount: 1,
    pyqCount: 50,
    revisionPriority: 'High',
    difficulty: 'Easy',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: []
  },
  {
    id: 'c2',
    name: 'Chapter 2',
    subject: 'physics',
    module: 'Mechanics',
    prerequisites: ['c1'],
    unlockedChapters: [],
    lectureCount: 10,
    estimatedHours: 20,
    weightage: 10,
    dppCount: 1,
    pyqCount: 50,
    revisionPriority: 'High',
    difficulty: 'Medium',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: []
  }
];

describe('PlannerEngine', () => {
  it('generates a deterministic daily plan respecting hours and priorities', () => {
    const knowledgeEngine = new KnowledgeEngine(MOCK_SYLLABUS);
    const planner = new PlannerEngine(knowledgeEngine);

    const input: PlannerInput = {
      studyHours: 2, // 120 minutes
      chapterTelemetryMap: {
        c1: {
          masteryScore: 0,
          currentLecture: 4,
          totalLectures: 5,
          theoryComplete: false,
          dppComplete: false,
          pyqsComplete: false,
          isMastered: false
        }
      } as any,
      revisionBacklog: [
        { chapterId: 'c1', daysOverdue: 2, retentionScore: 50 }
      ],
      userPreferences: {
        targetYear: '2025'
      },
      remainingDaysUntilJEE: 300,
      currentDate: '2024-01-01T00:00:00.000Z'
    };

    const output = planner.generateDailyPlan(input);

    // Should prioritize revision (30 min) + 1 lecture (60 min) = 90 mins total
    console.log(output.todaysMission.map(t => t.type));

    expect(output.dailyWorkload).toBe(105);
    expect(output.todaysMission.length).toBe(2);
    expect(output.todaysMission[0].type).toBe('Revise Formulas');
    expect(output.todaysMission[1].type).toBe('Watch Lecture');
    
    // Time blocks
    expect(output.morningBlock.length).toBeGreaterThan(0);

    // Deterministic date
    expect(output.estimatedFinishDate).toBeDefined();

    expect(output.carryForward.length).toBe(0);
  });

  it('overflows tasks to carry forward when hours are exceeded', () => {
    const knowledgeEngine = new KnowledgeEngine(MOCK_SYLLABUS);
    const planner = new PlannerEngine(knowledgeEngine);

    const input: PlannerInput = {
      studyHours: 0.5, // 30 minutes
      chapterTelemetryMap: {
        c1: {
          masteryScore: 0,
          currentLecture: 0,
          totalLectures: 5,
          theoryComplete: false,
          dppComplete: false,
          pyqsComplete: false,
          isMastered: false
        }
      } as any,
      revisionBacklog: [
        { chapterId: 'c1', daysOverdue: 2, retentionScore: 50 }
      ],
      userPreferences: {
        targetYear: '2025'
      },
      remainingDaysUntilJEE: 300,
      currentDate: '2024-01-01T00:00:00.000Z'
    };

    const output = planner.generateDailyPlan(input);

    expect(output.dailyWorkload).toBe(30); // only the 30 min revision fits
    expect(output.todaysMission.length).toBe(1);
    expect(output.todaysMission[0].type).toBe('Revise Formulas');
    
    // The lecture should overflow to carry forward
    expect(output.carryForward.length).toBeGreaterThan(0);
    expect(output.carryForward[0].type).toBe('Watch Lecture');
  });

  it('maps dependent chapter IDs to readable chapter names in mission reasoning (BUG-21)', () => {
    const knowledgeEngine = new KnowledgeEngine(MOCK_SYLLABUS);
    const planner = new PlannerEngine(knowledgeEngine);

    const input: PlannerInput = {
      studyHours: 4,
      chapterTelemetryMap: {
        c1: {
          masteryScore: 0,
          currentLecture: 0,
          totalLectures: 5,
          theoryComplete: false,
          dppComplete: false,
          pyqsComplete: false,
          isMastered: false
        }
      } as any,
      revisionBacklog: [],
      userPreferences: { targetYear: '2025' },
      remainingDaysUntilJEE: 300,
      currentDate: '2024-01-01T00:00:00.000Z'
    };

    const output = planner.generateDailyPlan(input);
    const task = output.todaysMission.find(t => t.chapterId === 'c1');
    expect(task).toBeDefined();
    expect(task?.reasoning).toBeDefined();

    // In MOCK_SYLLABUS, c2 depends on c1.
    // The dependent chapter list must contain the name 'Chapter 2', NOT raw id 'c2'
    expect(task?.reasoning?.dependentChapters).toContain('Chapter 2');
    expect(task?.reasoning?.dependentChapters).not.toContain('c2');
    expect(task?.reasoning?.longTermImpact).toContain('Chapter 2');
  });

  it('does not schedule revision for a chapter revised today or with future due date', () => {
    const knowledgeEngine = new KnowledgeEngine(MOCK_SYLLABUS);
    const planner = new PlannerEngine(knowledgeEngine);

    const input: PlannerInput = {
      studyHours: 4,
      chapters: [
        {
          id: 'c1',
          name: 'Chapter 1',
          subject: 'physics',
          unit: 'Mechanics',
          status: 'Revision Due',
          completion: 100,
          currentLecture: 5,
          totalLectures: 5,
          theoryComplete: true,
          dppComplete: true,
          pyqsComplete: true,
          revisionCount: 1,
          difficulty: 'Easy',
          confidence: 80,
          priority: 1,
          dependencies: [],
          weaknessScore: 0,
          solvedQuestions: 50,
          lastRevisionDaysAgo: 0,
          lastRevisedAt: '2024-01-01T08:00:00.000Z',
          nextRevisionDueAt: '2024-01-04T00:00:00.000Z'
        } as any
      ],
      revisionBacklog: [
        { chapterId: 'c1', daysOverdue: 2, retentionScore: 40 }
      ],
      userPreferences: { targetYear: '2025' },
      remainingDaysUntilJEE: 300,
      currentDate: '2024-01-01T12:00:00.000Z'
    };

    const output = planner.generateDailyPlan(input);
    const revTask = output.todaysMission.find(t => t.chapterId === 'c1' && (t.type === 'Revise Formulas' || t.taskName.includes('Revise')));
    expect(revTask).toBeUndefined();
  });

  it('does not schedule Review Mistakes if already completed today or revised today', () => {
    const knowledgeEngine = new KnowledgeEngine(MOCK_SYLLABUS);
    const planner = new PlannerEngine(knowledgeEngine);

    const input: PlannerInput = {
      studyHours: 4,
      chapters: [
        {
          id: 'c1',
          name: 'Chapter 1',
          subject: 'physics',
          unit: 'Mechanics',
          status: 'Theory Complete',
          completion: 100,
          currentLecture: 5,
          totalLectures: 5,
          theoryComplete: true,
          dppComplete: true,
          pyqsComplete: true,
          revisionCount: 1,
          difficulty: 'Easy',
          confidence: 80,
          priority: 1,
          dependencies: [],
          weaknessScore: 0,
          solvedQuestions: 50,
          lastRevisionDaysAgo: 0,
          lastRevisedAt: '2024-01-01T08:00:00.000Z',
          nextRevisionDueAt: '2024-01-04T00:00:00.000Z'
        } as any
      ],
      mistakes: [
        {
          id: 'mst-1',
          chapter: 'Chapter 1',
          chapterId: 'c1',
          revisionStatus: 'Reviewed',
          subject: 'physics'
        } as any
      ],
      todayMissions: [
        {
          id: 'mistake-rev-c1-2024-01-01',
          subject: 'physics',
          chapter: 'Chapter 1',
          chapterId: 'c1',
          type: 'Review Mistakes',
          taskName: 'Review Mistakes: Chapter 1',
          duration: 45,
          completed: true,
          xp: 40,
          unlocked: true
        }
      ],
      revisionBacklog: [],
      userPreferences: { targetYear: '2025' },
      remainingDaysUntilJEE: 300,
      currentDate: '2024-01-01T12:00:00.000Z'
    };

    const output = planner.generateDailyPlan(input);
    const mistakeTask = output.todaysMission.find(t => t.chapterId === 'c1' && t.type === 'Review Mistakes');
    expect(mistakeTask).toBeUndefined();
  });

  it('does not reschedule Solve DPP or Solve PYQs if already completed today', () => {
    const knowledgeEngine = new KnowledgeEngine(MOCK_SYLLABUS);
    const planner = new PlannerEngine(knowledgeEngine);

    const input: PlannerInput = {
      studyHours: 4,
      chapters: [
        {
          id: 'c1',
          name: 'Chapter 1',
          subject: 'physics',
          unit: 'Mechanics',
          status: 'Theory Complete',
          completion: 60,
          currentLecture: 5,
          totalLectures: 5,
          theoryComplete: true,
          dppComplete: false,
          pyqsComplete: false,
          difficulty: 'Easy',
          confidence: 70
        } as any
      ],
      todayMissions: [
        {
          id: 'dpp-c1-today',
          subject: 'physics',
          chapter: 'Chapter 1',
          chapterId: 'c1',
          type: 'Solve DPP',
          taskName: 'Solve DPP: Chapter 1',
          duration: 45,
          completed: true,
          xp: 40,
          unlocked: true
        },
        {
          id: 'pyq-c1-today',
          subject: 'physics',
          chapter: 'Chapter 1',
          chapterId: 'c1',
          type: 'Solve PYQs',
          taskName: 'Solve PYQs: Chapter 1',
          duration: 60,
          completed: true,
          xp: 50,
          unlocked: true
        }
      ],
      revisionBacklog: [],
      currentDate: '2024-01-01T12:00:00.000Z'
    };

    const output = planner.generateDailyPlan(input);
    const dppTask = output.todaysMission.find(t => t.chapterId === 'c1' && t.type === 'Solve DPP');
    const pyqTask = output.todaysMission.find(t => t.chapterId === 'c1' && t.type === 'Solve PYQs');
    expect(dppTask).toBeUndefined();
    expect(pyqTask).toBeUndefined();
  });
});
