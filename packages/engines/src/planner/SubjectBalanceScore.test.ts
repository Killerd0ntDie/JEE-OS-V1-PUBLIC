import { describe, it, expect } from 'vitest';
import { PlannerEngine } from './PlannerEngine';
import { KnowledgeEngine, SyllabusNode } from '@/engines/knowledge';
import { PlannerInput } from './types';
import { PlannerScoringEngine, ScoringContext } from './PlannerScoringEngine';
import { Chapter } from '@/types/index';

const TEST_SYLLABUS: SyllabusNode[] = [
  {
    id: 'p1',
    name: 'Kinematics',
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
    id: 'c1',
    name: 'Chemical Bonding',
    subject: 'chemistry',
    module: 'Inorganic',
    prerequisites: [],
    unlockedChapters: [],
    lectureCount: 5,
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
    id: 'm1',
    name: 'Quadratic Equations',
    subject: 'maths',
    module: 'Algebra',
    prerequisites: [],
    unlockedChapters: [],
    lectureCount: 5,
    estimatedHours: 10,
    weightage: 5,
    dppCount: 1,
    pyqCount: 50,
    revisionPriority: 'High',
    difficulty: 'Hard',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: []
  }
];

const TEST_CHAPTERS = [
  { id: 'p1', subject: 'physics', name: 'Kinematics', unit: 'Mechanics', currentLecture: 1, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, revisionCount: 0, difficulty: 'Easy', confidence: 50, estimatedRemainingTime: 10, priority: 1, dependencies: [] },
  { id: 'c1', subject: 'chemistry', name: 'Chemical Bonding', unit: 'Inorganic', currentLecture: 1, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, revisionCount: 0, difficulty: 'Medium', confidence: 50, estimatedRemainingTime: 10, priority: 1, dependencies: [] },
  { id: 'm1', subject: 'maths', name: 'Quadratic Equations', unit: 'Algebra', currentLecture: 1, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, revisionCount: 0, difficulty: 'Hard', confidence: 50, estimatedRemainingTime: 10, priority: 1, dependencies: [] }
] as unknown as Chapter[];

describe('SubjectBalanceScore Algorithm', () => {
  it('rewards neglected subjects and penalizes over-studied ones', () => {
    const scoringEngine = new PlannerScoringEngine();

    // Context 1: Normal input with equal balance defaults
    const inputBalanced: PlannerInput = {
      studyHours: 4,
      chapterTelemetryMap: {
        'p1': { currentLecture: 1, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, isMastered: false },
        'c1': { currentLecture: 1, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, isMastered: false },
        'm1': { currentLecture: 1, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, isMastered: false },
      } as any,
      revisionBacklog: [],
      userPreferences: { targetYear: '2026' },
      remainingDaysUntilJEE: 300,
      currentDate: '2026-07-21T00:00:00.000Z',
      studySessions: [], // No study sessions => default equal split (spentShare = 1/3)
      todayMissions: [],
      chapters: TEST_CHAPTERS
    };

    const contextPhys: ScoringContext = {
      taskType: 'Watch Lecture',
      node: TEST_SYLLABUS[0], // Physics node
      progress: { chapterId: 'p1', isMastered: false } as any,
      globalInput: inputBalanced,
      dependencyTreeSize: 0
    };

    const scorePhysBalanced = scoringEngine.calculateScore(contextPhys);
    expect(scorePhysBalanced.breakdown.subjectBalanceScore).toBe(50); // Deficit is 0 => score is 50
    expect(scorePhysBalanced.explanation).toContain('Physics has received 33% of study time');

    // Context 2: Neglected Physics
    // Let's record study sessions where only chemistry and maths were studied
    const inputNeglectedPhys: PlannerInput = {
      ...inputBalanced,
      studySessions: [
        { id: 's1', startTime: '2026-07-20T10:00:00Z', endTime: '2026-07-20T12:00:00Z', duration: 120, type: 'Lecture', subjectId: 'chemistry', xpEarned: 100 },
        { id: 's2', startTime: '2026-07-20T14:00:00Z', endTime: '2026-07-20T16:00:00Z', duration: 120, type: 'Lecture', subjectId: 'maths', xpEarned: 100 }
      ]
    };

    const contextPhysNeglected: ScoringContext = {
      ...contextPhys,
      globalInput: inputNeglectedPhys
    };

    const scorePhysNeglected = scoringEngine.calculateScore(contextPhysNeglected);
    // Physics has 0 minutes spent while chemistry has 120 and maths has 120.
    // spentShare of Physics is 0%, which is below its targetShare. So it should have a deficit > 0 and score > 50.
    expect(scorePhysNeglected.breakdown.subjectBalanceScore).toBeGreaterThan(50);
    expect(scorePhysNeglected.explanation).toContain('Physics has received 0% of study time');

    // Context 3: Over-studied Physics
    const inputOverstudiedPhys: PlannerInput = {
      ...inputBalanced,
      studySessions: [
        { id: 's1', startTime: '2026-07-20T10:00:00Z', endTime: '2026-07-20T14:00:00Z', duration: 240, type: 'Lecture', subjectId: 'physics', xpEarned: 200 }
      ]
    };

    const contextPhysOverstudied: ScoringContext = {
      ...contextPhys,
      globalInput: inputOverstudiedPhys
    };

    const scorePhysOverstudied = scoringEngine.calculateScore(contextPhysOverstudied);
    // Physics has 100% of study time spent. Its balance score should be significantly penalized (score < 50).
    expect(scorePhysOverstudied.breakdown.subjectBalanceScore).toBeLessThan(50);
    expect(scorePhysOverstudied.explanation).toContain('Physics has received 100% of study time');
  });
});
