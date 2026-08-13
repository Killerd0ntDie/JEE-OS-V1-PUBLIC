import { describe, it, expect } from 'vitest';
import { KnowledgeEngine } from './KnowledgeEngine';
import { SyllabusNode, ProgressState } from './types';

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
    tags: ['basics']
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
    tags: ['core']
  },
  {
    id: 'c3',
    name: 'Chapter 3',
    subject: 'physics',
    module: 'Mechanics',
    prerequisites: ['c2'],
    unlockedChapters: [],
    lectureCount: 8,
    estimatedHours: 16,
    weightage: 8,
    dppCount: 1,
    pyqCount: 50,
    revisionPriority: 'Medium',
    difficulty: 'Hard',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: ['advanced']
  },
  {
    id: 'c4',
    name: 'Chapter 4',
    subject: 'maths',
    module: 'Algebra',
    prerequisites: [],
    unlockedChapters: [],
    lectureCount: 6,
    estimatedHours: 12,
    weightage: 4,
    dppCount: 1,
    pyqCount: 50,
    revisionPriority: 'Low',
    difficulty: 'Easy',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: ['algebra']
  }
];

describe('KnowledgeEngine', () => {
  it('computes unlocked chapters automatically on initialization', () => {
    const engine = new KnowledgeEngine(MOCK_SYLLABUS);
    
    const c1 = engine.getNode('c1');
    expect(c1?.unlockedChapters).toContain('c2');
    
    const c2 = engine.getNode('c2');
    expect(c2?.unlockedChapters).toContain('c3');
  });

  it('identifies unlocked chapters based on user progress', () => {
    const engine = new KnowledgeEngine(MOCK_SYLLABUS);
    
    // Initial state: only c1 and c4 are unlocked
    let unlocked = engine.getUnlockedChapters([]);
    expect(unlocked.map(n => n.id)).toEqual(['c1', 'c4']);

    // Complete c1: c2 should now be unlocked
    const progress: ProgressState[] = [{ chapterId: 'c1', completion: 100, isMastered: true }];
    unlocked = engine.getUnlockedChapters(progress);
    expect(unlocked.map(n => n.id)).toEqual(['c2', 'c4']);
  });

  it('identifies blocked chapters', () => {
    const engine = new KnowledgeEngine(MOCK_SYLLABUS);
    
    const blocked = engine.getBlockedChapters([]);
    expect(blocked.map(n => n.id)).toEqual(['c2', 'c3']);
  });

  it('returns recommended next chapters based on importance and weightage', () => {
    const engine = new KnowledgeEngine(MOCK_SYLLABUS);
    
    // c1 and c4 are unlocked. c1 is High/5, c4 is Low/4. c1 should be recommended first.
    const recommendations = engine.getRecommendedNextChapters([]);
    expect(recommendations.map(n => n.id)).toEqual(['c1', 'c4']);
  });

  it('computes prerequisite tree', () => {
    const engine = new KnowledgeEngine(MOCK_SYLLABUS);
    
    const prereqs = engine.getPrerequisiteTree('c3');
    expect(prereqs).toContain('c2');
    expect(prereqs).toContain('c1');
    expect(prereqs.length).toBe(2);
  });

  it('computes dependency tree', () => {
    const engine = new KnowledgeEngine(MOCK_SYLLABUS);
    
    const deps = engine.getDependencyTree('c1');
    expect(deps).toContain('c2');
    expect(deps).toContain('c3');
    expect(deps.length).toBe(2);
  });

  it('calculates estimated remaining hours', () => {
    const engine = new KnowledgeEngine(MOCK_SYLLABUS);
    
    // Total hours: 10 + 20 + 16 + 12 = 58
    expect(engine.getEstimatedRemainingHours([])).toBe(58);

    // Complete half of c2 (10 hours left), complete c1 (0 hours left)
    const progress: ProgressState[] = [
      { chapterId: 'c1', completion: 100, isMastered: true },
      { chapterId: 'c2', completion: 50, isMastered: false }
    ];
    
    // Remaining: c2(10) + c3(16) + c4(12) = 38
    expect(engine.getEstimatedRemainingHours(progress)).toBe(38);
  });

  it('calculates remaining syllabus', () => {
    const engine = new KnowledgeEngine(MOCK_SYLLABUS);
    
    const progress: ProgressState[] = [
      { chapterId: 'c1', completion: 100, isMastered: true },
    ];
    
    const remaining = engine.getRemainingSyllabus(progress);
    expect(remaining.map(n => n.id)).toEqual(['c2', 'c3', 'c4']);
  });
});
