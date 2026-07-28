import { describe, it, expect } from 'vitest';
import { OptimizationEngine } from './OptimizationEngine';
import { KnowledgeEngine, SyllabusNode } from '../knowledge';
import { PlannerInput } from '../planner/types';

const MOCK_SYLLABUS: SyllabusNode[] = [
  { id: 'p1', name: 'Physics 1', subject: 'physics', module: 'Mechanics', prerequisites: [], unlockedChapters: [], lectureCount: 5, estimatedHours: 10, weightage: 5,
    dppCount: 1,
    pyqCount: 50, revisionPriority: 'High', difficulty: 'Easy', revisionDefaults: { intervals: [1, 3] }, tags: [] },
  { id: 'p2', name: 'Physics 2', subject: 'physics', module: 'Mechanics', prerequisites: ['p1'], unlockedChapters: [], lectureCount: 10, estimatedHours: 20, weightage: 10,
    dppCount: 1,
    pyqCount: 50, revisionPriority: 'High', difficulty: 'Medium', revisionDefaults: { intervals: [1, 3] }, tags: [] },
  { id: 'c1', name: 'Chemistry 1', subject: 'chemistry', module: 'Physical', prerequisites: [], unlockedChapters: [], lectureCount: 5, estimatedHours: 10, weightage: 5,
    dppCount: 1,
    pyqCount: 50, revisionPriority: 'High', difficulty: 'Easy', revisionDefaults: { intervals: [1, 3] }, tags: [] },
  { id: 'm1', name: 'Maths 1', subject: 'maths', module: 'Algebra', prerequisites: [], unlockedChapters: [], lectureCount: 5, estimatedHours: 10, weightage: 5,
    dppCount: 1,
    pyqCount: 50, revisionPriority: 'High', difficulty: 'Easy', revisionDefaults: { intervals: [1, 3] }, tags: [] }
];

describe('OptimizationEngine', () => {
  const knowledgeEngine = new KnowledgeEngine(MOCK_SYLLABUS);
  const engine = new OptimizationEngine(knowledgeEngine);

  const basePlannerInput: PlannerInput = {
    studyHours: 4,
    chapterTelemetryMap: {
      'p1': { masteryScore: 100, currentLecture: 5, totalLectures: 5, theoryComplete: true, dppComplete: true, pyqsComplete: true, isMastered: true } as any,
      'p2': { masteryScore: 0, currentLecture: 0, totalLectures: 10, theoryComplete: false, dppComplete: false, pyqsComplete: false, isMastered: false } as any,
      'c1': { masteryScore: 100, currentLecture: 5, totalLectures: 5, theoryComplete: true, dppComplete: true, pyqsComplete: true, isMastered: true } as any,
      'm1': { masteryScore: 0, currentLecture: 0, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, isMastered: false } as any
    },
    revisionBacklog: [],
    userPreferences: { targetYear: '2025' },
    remainingDaysUntilJEE: 100,
    currentDate: '2024-01-01T00:00:00.000Z'
  };

  it('detects neglected subjects', () => {
    const result = engine.optimize({
      plannerInput: basePlannerInput,
      targetCompletionDate: '2024-06-01T00:00:00.000Z',
      actualStudyHoursPastWeek: [4, 4, 4, 4, 4, 4, 4],
      skippedTasks: []
    });

    expect(result.neglectedSubjects).toContain('maths');
    expect(result.neglectedSubjects).toContain('physics');
    expect(result.neglectedSubjects).not.toContain('chemistry');
    
    expect(['maths', 'physics']).toContain(result.optimizedPlannerInput.userPreferences.focusSubject);
  });

  it('detects overload and caps study hours', () => {
    const result = engine.optimize({
      plannerInput: basePlannerInput,
      targetCompletionDate: '2024-01-02T00:00:00.000Z',
      actualStudyHoursPastWeek: [2, 2, 2],
      skippedTasks: []
    });

    expect(result.isOverloaded).toBe(true);
    expect(result.recommendedDailyStudyHours).toBe(37.5);
    expect(result.optimizedPlannerInput.studyHours).toBe(12); // capped at 12
    expect(result.scheduleStatus).toBe('At Risk');
  });

  it('identifies schedule status as On Track', () => {
    const result = engine.optimize({
      plannerInput: basePlannerInput,
      targetCompletionDate: '2024-04-10T00:00:00.000Z',
      actualStudyHoursPastWeek: [4, 5, 4],
      skippedTasks: []
    });

    expect(result.isOverloaded).toBe(false);
    expect(result.scheduleStatus).toBe('On Track');
  });
});
