import { describe, it, expect } from 'vitest';
import { PlannerEngine } from './PlannerEngine';
import { KnowledgeEngine, SyllabusNode } from '@/engines/knowledge';
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
});
