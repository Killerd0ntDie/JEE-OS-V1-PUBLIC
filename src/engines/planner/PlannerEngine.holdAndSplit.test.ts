import { describe, it, expect } from 'vitest';
import { PlannerEngine, getDayFocusPill } from './PlannerEngine';
import { KnowledgeEngine, SyllabusNode } from '../knowledge';
import { PlannerInput } from './types';
import { Chapter } from '../../types';

const MOCK_SYLLABUS: SyllabusNode[] = [
  {
    id: 'p1',
    name: 'Work Power Energy',
    subject: 'physics',
    module: 'Mechanics',
    prerequisites: [],
    unlockedChapters: [],
    lectureCount: 10,
    estimatedHours: 10,
    weightage: 5,
    dppCount: 1,
    pyqCount: 50,
    revisionPriority: 'High',
    difficulty: 'Medium',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: []
  },
  {
    id: 'p2',
    name: 'Kinematics',
    subject: 'physics',
    module: 'Mechanics',
    prerequisites: [],
    unlockedChapters: [],
    lectureCount: 10,
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
    id: 'c1',
    name: 'Chemical Bonding',
    subject: 'chemistry',
    module: 'Physical Chemistry',
    prerequisites: [],
    unlockedChapters: [],
    lectureCount: 10,
    estimatedHours: 10,
    weightage: 5,
    dppCount: 1,
    pyqCount: 50,
    revisionPriority: 'High',
    difficulty: 'Medium',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: []
  }
];

describe('PlannerEngine - Chapter Hold & Custom 2-Day Split Tests', () => {
  const knowledgeEngine = new KnowledgeEngine(MOCK_SYLLABUS);
  const plannerEngine = new PlannerEngine(knowledgeEngine);

  const mockChapters: Chapter[] = [
    {
      id: 'p1',
      subject: 'physics',
      unit: 'Mechanics',
      name: 'Work Power Energy',
      completion: 30,
      currentLecture: 3,
      totalLectures: 10,
      theoryComplete: true,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0,
      difficulty: 'Medium',
      confidence: 60,
      estimatedRemainingTime: 5,
      priority: 1,
      dependencies: [],
      weaknessScore: 40,
      status: 'Learning',
      solvedQuestions: 10,
      lastRevisionDaysAgo: 2,
      chapterOnHold: true, // Entire Chapter on Hold
    },
    {
      id: 'p2',
      subject: 'physics',
      unit: 'Mechanics',
      name: 'Kinematics',
      completion: 40,
      currentLecture: 4,
      totalLectures: 10,
      theoryComplete: true,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0,
      difficulty: 'Easy',
      confidence: 80,
      estimatedRemainingTime: 4,
      priority: 1,
      dependencies: [],
      weaknessScore: 20,
      status: 'Learning',
      solvedQuestions: 20,
      lastRevisionDaysAgo: 1,
    },
    {
      id: 'c1',
      subject: 'chemistry',
      unit: 'Physical Chemistry',
      name: 'Chemical Bonding',
      completion: 50,
      currentLecture: 5,
      totalLectures: 10,
      theoryComplete: true,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0,
      difficulty: 'Medium',
      confidence: 70,
      estimatedRemainingTime: 4,
      priority: 2,
      dependencies: [],
      weaknessScore: 30,
      status: 'Learning',
      solvedQuestions: 25,
      lastRevisionDaysAgo: 3,
    },
  ];

  it('skips task generation for chapters where chapterOnHold is true', () => {
    const input: PlannerInput = {
      studyHours: 4,
      chapterTelemetryMap: {
        p1: { chapterId: 'p1', masteryScore: 30, theoryComplete: true, dppComplete: false } as any,
        p2: { chapterId: 'p2', masteryScore: 40, theoryComplete: true, dppComplete: false } as any,
      },
      revisionBacklog: [],
      userPreferences: {
        targetYear: '2026',
        subjectSplitStrategy: '3_a_day',
      },
      remainingDaysUntilJEE: 150,
      chapters: mockChapters,
    };

    const output = plannerEngine.generateDailyPlan(input);
    // p1 has chapterOnHold: true, so no missions for Work Power Energy should be scheduled
    const p1Tasks = output.todaysMission.filter(t => t.chapterId === 'p1' || t.chapterName === 'Work Power Energy');
    expect(p1Tasks.length).toBe(0);

    // p2 is active, so Kinematics tasks should be present
    const p2Tasks = output.todaysMission.filter(t => t.chapterId === 'p2' || t.chapterName === 'Kinematics');
    expect(p2Tasks.length).toBeGreaterThan(0);
  });

  it('respects custom twoDaySplitConfig for 2_a_day_alternating strategy', () => {
    const customConfig: [any, any, any] = [
      ['physics', 'maths'],    // Day 1 pair: PHY + MATHS instead of PHY + CHEM
      ['chemistry', 'maths'],  // Day 2 pair
      ['physics', 'chemistry'] // Day 3 pair
    ];

    const pill = getDayFocusPill(0, '2_a_day_alternating', customConfig);
    expect(pill).toBe('PHY + MATHS');

    const input: PlannerInput = {
      studyHours: 4,
      chapterTelemetryMap: {
        p2: { chapterId: 'p2', masteryScore: 40, theoryComplete: true } as any,
        c1: { chapterId: 'c1', masteryScore: 50, theoryComplete: true } as any,
      },
      revisionBacklog: [],
      userPreferences: {
        targetYear: '2026',
        subjectSplitStrategy: '2_a_day_alternating',
        twoDaySplitConfig: customConfig,
      },
      remainingDaysUntilJEE: 150,
      currentDate: '2026-07-27T00:00:00Z', // Monday (Day 0)
      chapters: mockChapters,
    };

    const output = plannerEngine.generateDailyPlan(input);
    // On Day 0 with customConfig ['physics', 'maths'], physics tasks are allowed, but chemistry candidates should be filtered out
    const chemTasks = output.todaysMission.filter(t => t.subjectId === 'chemistry');
    expect(chemTasks.length).toBe(0);
  });
});
