import { SubjectId } from '@/types/index';
import { PlannerInput } from '@/engines/planner/types';
import { KnowledgeEngine, ProgressState } from '@/engines/knowledge';
import { OptimizationInput, OptimizationResult } from './types';

// -----------------------------------------------------------------
// CENTRALIZED V2 CONFIGURATION: NO MAGIC NUMBERS
// -----------------------------------------------------------------
export const OPTIMIZATION_CONFIG = {
  maxDailyHours: 12,
  minDailyHours: 2,
  neglectedSubjectCompletionThreshold: 0.2, // 20% completion gap triggers neglected subject state
  atRiskBufferDays: 0,
  behindScheduleBufferDays: 30,
  studyEfficiencyMultiplier: 0.8,            // realistic effective hours multiplier (takes into account breaks, distractions)
};

export class OptimizationEngine {
  private knowledgeEngine: KnowledgeEngine;
  private readonly MAX_DAILY_HOURS = OPTIMIZATION_CONFIG.maxDailyHours;

  constructor(knowledgeEngine: KnowledgeEngine) {
    this.knowledgeEngine = knowledgeEngine;
  }

  public optimize(input: OptimizationInput): OptimizationResult {
    const { plannerInput, targetCompletionDate, actualStudyHoursPastWeek, skippedTasks } = input;
    
    const loggedAvg = actualStudyHoursPastWeek.length > 0 
      ? actualStudyHoursPastWeek.reduce((a, b) => a + b, 0) / actualStudyHoursPastWeek.length 
      : 0;
    
    // Clamp target daily quota between 2 and 12 hrs/day to prevent impossible 30 hrs/day or 0 hrs/day values
    const rawQuota = plannerInput.userPreferences.dailyQuota || plannerInput.studyHours || 6;
    const targetQuota = Math.min(12, Math.max(2, rawQuota));
    
    // Implement Velocity Smoothing (EWMA) proportional to sample size
    let avgStudyHours = targetQuota;
    if (loggedAvg > 0) {
      const loggedWeight = Math.min(0.6, (actualStudyHoursPastWeek.length / 7) * 0.6);
      const targetWeight = 1 - loggedWeight;
      avgStudyHours = (targetQuota * targetWeight) + (loggedAvg * loggedWeight);
    }
    avgStudyHours = Math.max(1.5, Math.min(12, avgStudyHours)); // Ensure it never drops too low or high

    const telemetryMap = plannerInput.chapterTelemetryMap || {};
    const progressStates: ProgressState[] = Object.entries(telemetryMap).map(([chapterId, data]) => ({
      chapterId,
      completion: data.masteryScore,
      isMastered: data.isMastered
    }));

    const remainingHours = this.knowledgeEngine.getEstimatedRemainingHours(progressStates);

    const effectiveAvgHours = Math.max(1.5, avgStudyHours * OPTIMIZATION_CONFIG.studyEfficiencyMultiplier);
    const rawPredictedDays = remainingHours > 0 ? remainingHours / effectiveAvgHours : 0;
    
    const parsedCurrentMs = new Date(plannerInput.currentDate || new Date().toISOString()).getTime();
    const currentMs = isNaN(parsedCurrentMs) ? Date.now() : parsedCurrentMs;
    const parsedTargetMs = new Date(targetCompletionDate).getTime();
    const targetMs = isNaN(parsedTargetMs) ? currentMs + (365 * 24 * 60 * 60 * 1000) : parsedTargetMs;
    const daysUntilTarget = Math.max(1, (targetMs - currentMs) / (1000 * 60 * 60 * 24));

    // Cap predictions to a realistic maximum relative to target exam date
    const maxRealisticDays = Math.max(daysUntilTarget + 90, 450);
    const predictedDays = Math.min(rawPredictedDays, maxRealisticDays);
    const predictedCompletionMs = currentMs + (predictedDays * 24 * 60 * 60 * 1000);
    const predictedCompletionDate = new Date(predictedCompletionMs).toISOString();
    
    // Completion Probability Calculation
    let completionProbability = 0;
    if (remainingHours <= 0) {
      completionProbability = 100;
    } else {
      const ratio = daysUntilTarget / Math.max(1, predictedDays);
      completionProbability = Math.min(100, Math.max(0, Math.round(ratio * 100)));
    }

    // Plus One Hour Simulation
    const plusOneHourPace = (avgStudyHours + 1) * OPTIMIZATION_CONFIG.studyEfficiencyMultiplier;
    const rawPlusOneDays = plusOneHourPace > 0 ? remainingHours / plusOneHourPace : 0;
    const plusOneDays = Math.min(rawPlusOneDays, maxRealisticDays);
    const plusOneHourCompletionDate = new Date(currentMs + (plusOneDays * 24 * 60 * 60 * 1000)).toISOString();

    const recommendedDailyStudyHours = remainingHours / (daysUntilTarget * OPTIMIZATION_CONFIG.studyEfficiencyMultiplier);

    const isOverloaded = recommendedDailyStudyHours > this.MAX_DAILY_HOURS;

    let scheduleStatus: OptimizationResult['scheduleStatus'] = 'On Track';
    const bufferDays = Math.min(OPTIMIZATION_CONFIG.behindScheduleBufferDays, daysUntilTarget * 0.15);
    const bufferMs = bufferDays * 24 * 60 * 60 * 1000;
    const warningMs = (bufferDays * 2) * 24 * 60 * 60 * 1000;
    
    // Fix: Buffer should be subtracted from the target date, not added.
    if (predictedCompletionMs > targetMs) {
      // Finishing AFTER the exam is a hard fail.
      scheduleStatus = 'Behind Schedule';
    } else if (predictedCompletionMs > targetMs - bufferMs) {
      // Finishing within the 30-day buffer zone is risky.
      scheduleStatus = 'At Risk';
    } else if (predictedCompletionMs > targetMs - warningMs) {
      // Finishing slightly outside the buffer zone
      scheduleStatus = 'Slightly Off Pace';
    } else {
      if (avgStudyHours > targetQuota + 0.5) {
        scheduleStatus = 'Catching Up'; // Making good progress relative to quota
      } else {
        scheduleStatus = 'On Track';
      }
    }

    const subjectProgress: Record<SubjectId, { completed: number, total: number }> = {
      physics: { completed: 0, total: 0 },
      chemistry: { completed: 0, total: 0 },
      maths: { completed: 0, total: 0 }
    };

    const allNodes = this.knowledgeEngine.getAllNodes();
    for (const node of allNodes) {
      const prog = telemetryMap[node.id];
      subjectProgress[node.subject].total += 1;
      if (prog) {
        subjectProgress[node.subject].completed += (prog.masteryScore || 0) / 100;
      }
    }

    const pPct = subjectProgress.physics.total > 0 ? subjectProgress.physics.completed / subjectProgress.physics.total : 0;
    const cPct = subjectProgress.chemistry.total > 0 ? subjectProgress.chemistry.completed / subjectProgress.chemistry.total : 0;
    const mPct = subjectProgress.maths.total > 0 ? subjectProgress.maths.completed / subjectProgress.maths.total : 0;

    const maxPct = Math.max(pPct, cPct, mPct);
    const neglectedSubjects: SubjectId[] = [];
    
    if (pPct < maxPct - OPTIMIZATION_CONFIG.neglectedSubjectCompletionThreshold) neglectedSubjects.push('physics');
    if (cPct < maxPct - OPTIMIZATION_CONFIG.neglectedSubjectCompletionThreshold) neglectedSubjects.push('chemistry');
    if (mPct < maxPct - OPTIMIZATION_CONFIG.neglectedSubjectCompletionThreshold) neglectedSubjects.push('maths');

    let optimizedStudyHours = recommendedDailyStudyHours;
    if (isOverloaded) {
      optimizedStudyHours = this.MAX_DAILY_HOURS;
    } else if (optimizedStudyHours < OPTIMIZATION_CONFIG.minDailyHours) {
      optimizedStudyHours = OPTIMIZATION_CONFIG.minDailyHours;
    }
    
    const optimizedPlannerInput: PlannerInput = {
      ...plannerInput,
      studyHours: Math.round(optimizedStudyHours * 10) / 10,
      userPreferences: {
        ...plannerInput.userPreferences,
        focusSubject: neglectedSubjects.length > 0 ? neglectedSubjects[0] : plannerInput.userPreferences.focusSubject
      }
    };

    return {
      isOverloaded,
      recommendedDailyStudyHours: Math.round(recommendedDailyStudyHours * 10) / 10,
      predictedCompletionDate,
      completionProbability,
      plusOneHourCompletionDate,
      neglectedSubjects,
      scheduleStatus,
      optimizedPlannerInput
    };
  }
}
