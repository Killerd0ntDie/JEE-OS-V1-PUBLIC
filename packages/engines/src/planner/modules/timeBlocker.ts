import { KnowledgeEngine, ProgressState } from '../../knowledge';
import { ScheduledTask, ReasoningPipelineSummary } from '../types';
import { AcademicAnalysisResult } from './academicStateAnalyzer';
import { CandidateMission } from './multiStrategySelector';

export interface TimeBlockingResult {
  morningBlock: ScheduledTask[];
  afternoonBlock: ScheduledTask[];
  nightBlock: ScheduledTask[];
}

export function partitionTimeBlocks(
  todaysMission: ScheduledTask[],
  availableMinutes: number
): TimeBlockingResult {
  const morningBlock: ScheduledTask[] = [];
  const afternoonBlock: ScheduledTask[] = [];
  const nightBlock: ScheduledTask[] = [];
  
  let currentBlock = 'morning';
  let morningMins = 0;
  let afternoonMins = 0;

  for (const task of todaysMission) {
    if (currentBlock === 'morning') {
      morningBlock.push(task);
      morningMins += task.duration;
      if (morningMins >= availableMinutes * 0.4) currentBlock = 'afternoon';
    } else if (currentBlock === 'afternoon') {
      afternoonBlock.push(task);
      afternoonMins += task.duration;
      if (afternoonMins >= availableMinutes * 0.3) currentBlock = 'night';
    } else {
      nightBlock.push(task);
    }
  }

  return { morningBlock, afternoonBlock, nightBlock };
}

export function calculateEstimatedFinishDate(
  knowledgeEngine: KnowledgeEngine,
  progressStates: ProgressState[],
  studyHours: number,
  currentDate?: string
): string | null {
  const remainingHours = knowledgeEngine.getEstimatedRemainingHours(progressStates);
  const effectiveDailyHours = studyHours * 0.8;
  
  if (effectiveDailyHours <= 0) return null;

  const daysNeeded = Math.ceil(remainingHours / effectiveDailyHours);
  const finishDate = currentDate ? new Date(currentDate) : new Date();
  finishDate.setDate(finishDate.getDate() + daysNeeded);
  return finishDate.toISOString();
}

export function buildReasoningSummary(
  analysis: AcademicAnalysisResult,
  totalCandidates: number,
  todaysMission: ScheduledTask[],
  bestMission: CandidateMission
): {
  reasoningPipelineSummary: ReasoningPipelineSummary;
  selectionReason: string;
  priorityExplanation: string;
} {
  const {
    academicStateOverview,
    detectedPrerequisiteGaps,
    detectedRevisionDecay,
    detectedWeakAreas,
    activeMonthlyObjective
  } = analysis;

  const strategicTakeaway = todaysMission.length > 0 
    ? `Highest leverage next action: ${todaysMission[0].taskName}. Reason: ${todaysMission[0].reasoning?.whySelected || todaysMission[0].selectionReason}`
    : "No urgent actions required today.";

  const reasoningPipelineSummary: ReasoningPipelineSummary = {
    academicStateOverview,
    detectedPrerequisiteGaps,
    detectedRevisionDecay,
    detectedWeakAreas,
    activeMonthlyObjective,
    totalCandidatesEvaluated: totalCandidates,
    strategicTakeaway
  };

  const selectionReason = `StudyBrain explicit reasoning pipeline selected '${bestMission.name}' strategy (Score: ${bestMission.score}/100) after evaluating ${totalCandidates} candidate actions across the full syllabus. Primary focus: ${strategicTakeaway}`;

  const priorityExplanation = `StudyBrain Explicit Reasoning Pipeline Summary:
==================================================
Academic Overview: ${academicStateOverview}
Active Objective: ${activeMonthlyObjective}
Total Candidates Evaluated: ${totalCandidates}
Prerequisite Gaps Flagged: ${detectedPrerequisiteGaps.length}
Revision Decay Warnings: ${detectedRevisionDecay.length}
Weak Performance Spots: ${detectedWeakAreas.length}

Strategic Takeaway:
${strategicTakeaway}

Strategy Selected: ${bestMission.name} (Score: ${bestMission.score}/100)
Expected Learning Gain: ${Math.round(bestMission.learningGain)}%
Completion Probability: ${bestMission.completionProb}%`;

  return {
    reasoningPipelineSummary,
    selectionReason,
    priorityExplanation
  };
}
