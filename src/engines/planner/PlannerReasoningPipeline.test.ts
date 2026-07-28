import { describe, it, expect, beforeEach } from 'vitest';
import { PlannerEngine } from './PlannerEngine';
import { KnowledgeEngine, SyllabusNode } from '../knowledge';
import { PlannerInput } from './types';

const MOCK_SYLLABUS: SyllabusNode[] = [
  {
    id: 'p1',
    name: 'System of Particles & Rotational Motion',
    subject: 'physics',
    module: 'Mechanics',
    prerequisites: [],
    unlockedChapters: ['p2'],
    lectureCount: 5,
    estimatedHours: 10,
    weightage: 8,
    dppCount: 5,
    pyqCount: 50,
    revisionPriority: 'High',
    difficulty: 'Hard',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: ['Mechanics', 'High Weightage']
  },
  {
    id: 'p2',
    name: 'Gravitation',
    subject: 'physics',
    module: 'Mechanics',
    prerequisites: ['p1'],
    unlockedChapters: [],
    lectureCount: 4,
    estimatedHours: 8,
    weightage: 6,
    dppCount: 3,
    pyqCount: 40,
    revisionPriority: 'Medium',
    difficulty: 'Medium',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: ['Mechanics']
  }
];

describe('PlannerEngine Explicit Reasoning Pipeline', () => {
  let knowledgeEngine: KnowledgeEngine;
  let plannerEngine: PlannerEngine;

  beforeEach(() => {
    knowledgeEngine = new KnowledgeEngine(MOCK_SYLLABUS);
    plannerEngine = new PlannerEngine(knowledgeEngine);
  });

  it('should execute full explicit reasoning pipeline and generate structured reasoning for every mission', () => {
    const input: PlannerInput = {
      studyHours: 4,
      chapterTelemetryMap: {
        'p1': {
          masteryScore: 30,
          currentLecture: 2,
          totalLectures: 5,
          theoryComplete: false,
          dppComplete: false,
          pyqsComplete: false,
          isMastered: false
        },
        'p2': {
          masteryScore: 80,
          currentLecture: 4,
          totalLectures: 4,
          theoryComplete: true,
          dppComplete: true,
          pyqsComplete: false,
          isMastered: false
        }
      } as any,
      revisionBacklog: [
        { chapterId: 'p1', daysOverdue: 12, retentionScore: 45 }
      ],
      userPreferences: {
        targetYear: '2026',
        focusSubject: 'physics'
      },
      remainingDaysUntilJEE: 250,
      currentDate: '2026-01-01T00:00:00.000Z',
      monthlyObjectives: [
        {
          id: 'mo-1',
          title: 'Master Physics Mechanics Core',
          category: 'Finish Mechanics',
          description: 'High-yield focus on Rotational Motion and Newton Laws',
          targetDate: '2026-02-01',
          status: 'in_progress'
        }
      ],
      mistakes: [
        {
          id: 'm1',
          chapter: 'System of Particles & Rotational Motion',
          subject: 'physics',
          topic: 'Torque',
          subtopic: 'Rotational Equilibrium',
          difficulty: 'Hard',
          source: 'DPP',
          timeTaken: 10,
          correctMethod: 'Use torque balance about pivot',
          studentMethod: 'Forgot pivot distance',
          mistakeTypes: ['Conceptual Error'],
          confidence: 40,
          revisionSchedule: 'Immediate',
          masteryImpact: 'High',
          attemptNumber: 1,
          revisionStatus: 'Reviewed',
          recoveryScore: 40,
          teacherNotes: 'Review cross product',
          personalNotes: 'Be careful with r x F',
          aiAdvice: 'Practice pivot analysis',
          priority: 'High',
          dateLogged: '2026-01-01',
          questionText: 'Find net torque',
          correctSolution: 'Tau = I * alpha'
        }
      ]
    };

    const output = plannerEngine.generateDailyPlan(input);

    // 1. Verify Pipeline Output Structure
    expect(output).toBeDefined();
    expect(output.todaysMission).toBeDefined();
    expect(output.todaysMission.length).toBeGreaterThan(0);
    expect(output.reasoningPipelineSummary).toBeDefined();

    // 2. Verify Pipeline Summary Insights
    const summary = output.reasoningPipelineSummary!;
    expect(summary.academicStateOverview).toContain('Analyzed');
    expect(summary.activeMonthlyObjective).toContain('Master Physics Mechanics Core');
    expect(summary.totalCandidatesEvaluated).toBeGreaterThan(0);
    expect(summary.strategicTakeaway).toBeDefined();
    expect(summary.strategicTakeaway.length).toBeGreaterThan(10);

    // 3. Verify Structured Mission Reasoning
    for (const task of output.todaysMission) {
      expect(task.reasoning).toBeDefined();
      const reasoning = task.reasoning!;

      expect(reasoning.whySelected).toBeDefined();
      expect(reasoning.whySelected.length).toBeGreaterThan(15);

      expect(Array.isArray(reasoning.dependentChapters)).toBe(true);
      expect(reasoning.rankingRationale).toBeDefined();
      expect(reasoning.longTermImpact).toBeDefined();
      expect(reasoning.postponeRisk).toBeDefined();

      expect(['Very High', 'High', 'Medium']).toContain(reasoning.confidenceLevel);
      expect(reasoning.confidenceScorePercent).toBeGreaterThanOrEqual(50);
      expect(reasoning.confidenceScorePercent).toBeLessThanOrEqual(100);

      // Verify 10-Factor Score Breakdown presence
      expect(task.priorityBreakdown).toBeDefined();
      expect(task.priorityBreakdown?.prerequisiteImportanceScore).toBeDefined();
      expect(task.priorityBreakdown?.jeeChapterWeightageScore).toBeDefined();
      expect(task.priorityBreakdown?.currentMasteryScore).toBeDefined();
      expect(task.priorityBreakdown?.revisionUrgencyScore).toBeDefined();
    }
  });
});
