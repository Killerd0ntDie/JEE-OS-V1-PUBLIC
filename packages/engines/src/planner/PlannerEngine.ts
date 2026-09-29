import { KnowledgeEngine } from '../knowledge';
import { PlannerInput, PlannerOutput } from './types';
import { PlannerScoringEngine } from './PlannerScoringEngine';
import { analyzeAcademicState } from './modules/academicStateAnalyzer';
import { generateCandidateTasks, getLocalDateKey } from './modules/candidateTaskGenerator';
import { selectOptimalMission } from './modules/multiStrategySelector';
import { simulateProgressiveWeeklySchedule } from './modules/weeklyScheduleSimulator';
import {
  partitionTimeBlocks,
  calculateEstimatedFinishDate,
  buildReasoningSummary
} from './modules/timeBlocker';

export { getLocalDateKey };

export class PlannerEngine {
  private knowledgeEngine: KnowledgeEngine;
  private scoringEngine: PlannerScoringEngine;

  constructor(knowledgeEngine: KnowledgeEngine) {
    this.knowledgeEngine = knowledgeEngine;
    this.scoringEngine = new PlannerScoringEngine();
  }

  public generateDailyPlan(input: PlannerInput): PlannerOutput {
    // Phase 1-5: Academic State & Diagnostic Gap Analysis
    const analysis = analyzeAcademicState(input, this.knowledgeEngine);

    // Phase 7: Score and generate all candidate actions across the syllabus
    const candidates = generateCandidateTasks(
      input,
      this.knowledgeEngine,
      this.scoringEngine,
      analysis
    );

    const availableMinutes = input.studyHours * 60;

    // Phase 8: Multi-strategy lookahead selection
    const selection = selectOptimalMission(candidates, input, availableMinutes);
    const {
      bestMission,
      todaysMission,
      carryForward,
      scheduledMinutes,
      splitStrategy,
      twoDayConfig
    } = selection;

    // Phase 9: Progressive 7-Day Weekly Schedule Simulation
    const weeklySchedule = simulateProgressiveWeeklySchedule(
      candidates,
      todaysMission,
      input,
      availableMinutes,
      splitStrategy,
      twoDayConfig
    );

    // Phase 10: Time Blocking & Pipeline Summary Generation
    const { morningBlock, afternoonBlock, nightBlock } = partitionTimeBlocks(
      todaysMission,
      availableMinutes
    );

    const estimatedFinishDate = calculateEstimatedFinishDate(
      this.knowledgeEngine,
      analysis.progressStates,
      input.studyHours,
      input.currentDate
    );

    const {
      reasoningPipelineSummary,
      selectionReason,
      priorityExplanation
    } = buildReasoningSummary(
      analysis,
      candidates.length,
      todaysMission,
      bestMission
    );

    return {
      todaysMission,
      morningBlock,
      afternoonBlock,
      nightBlock,
      carryForward,
      weeklySchedule,
      estimatedFinishDate,
      dailyWorkload: scheduledMinutes,
      priorityExplanation,
      missionScore: bestMission.score,
      expectedLearningGain: Math.round(bestMission.learningGain),
      completionProbability: bestMission.completionProb,
      selectionReason,
      reasoningPipelineSummary
    };
  }
}

export * from './weeklyMatrix';
