import { SyllabusNode, ProgressState } from '@/engines/knowledge/types';
import { PlannerInput } from './types';
import { SubjectId, Chapter } from '@/types/index';
import { calculateMistakeScore } from '@/utils/mistakeIntelligence';

export interface ScoringContext {
  taskType: 'Watch Lecture' | 'Solve DPP' | 'Solve PYQs' | 'Revise Formulas' | 'Review Mistakes' | 'Break';
  node: SyllabusNode;
  progress: ProgressState;
  revisionData?: {
    daysOverdue: number;
    retentionScore: number;
  };
  globalInput: PlannerInput;
  dependencyTreeSize: number;
}

export interface ScoreBreakdown {
  // 10 Modular Core Factors
  prerequisiteImportanceScore: number;
  jeeChapterWeightageScore: number;
  currentMasteryScore: number;
  revisionUrgencyScore: number;
  forgettingRiskScore: number;
  recentAccuracyScore: number;
  monthlyObjectiveAlignmentScore: number;
  availableStudyTimeScore: number;
  projectedCompletionImpactScore: number;
  backlogSeverityScore: number;

  // Legacy compatibility fields
  dependencyScore: number;
  weightageScore: number;
  masteryScore: number;
  mistakeScore: number;
  completionScore: number;
  timeEfficiencyScore: number;
  subjectBalanceScore: number;
  examUrgencyScore: number;
  recentActivityScore: number;
  timeSinceLastStudyScore?: number;
  learningGainScore?: number;
  completionProbabilityScore?: number;
  remainingSyllabusScore?: number;
  studyVelocityScore?: number;
  fatigueScore?: number;
  dailyHoursScore?: number;
}

export interface ScoringResult {
  totalScore: number;
  breakdown: ScoreBreakdown;
  explanation: string;
}

// -----------------------------------------------------------------
// CENTRALIZED V2 CONFIGURATION: NO MAGIC NUMBERS
// -----------------------------------------------------------------
export const PLANNER_CONFIG = {
  // Configurable coefficients for the 14-factor formula
  weights: {
    jeeWeightage: 0.12,
    mastery: 0.08,
    mistakeIntelligence: 0.10,
    dependencyUnlock: 0.10,
    revisionUrgency: 0.15,
    timeSinceLastStudy: 0.08,
    subjectBalance: 0.08,
    learningGain: 0.12,
    completionProbability: 0.05,
    examUrgency: 0.05,
    remainingSyllabus: 0.03,
    studyVelocity: 0.02,
    fatigue: 0.01,
    dailyHours: 0.01,
  },

  // Numerical parameters & multipliers
  jeeWeightageScale: 10,       // maps 1-10 to 0-100
  dependencyTreeScale: 15,     // scales dependent chapter count
  dependencyMaxScore: 100,

  overdueDayMultiplier: 10,    // scales revision urgency
  retentionMaxOverdueScore: 100,

  targetMasteryOptimalPoint: 60, // peak optimal mastery for practice/revision tasks
  masteryBellCurveSpread: 1.5,

  mistakeWeightMultiplier: 10,
  mistakeMaxScore: 100,

  timeSinceLastStudyScale: 5,   // days studied ago -> points
  timeSinceLastStudyMax: 100,

  learningGainLectureScale: 80,
  learningGainDppScale: 60,
  learningGainPyqScale: 100,
  learningGainRevisionScale: 50,
  learningGainMistakeScale: 70,
  learningGainMax: 100,

  completionProbBase: 100,
  completionProbPenaltyFactor: 30,
  completionProbVelocityBonus: 5,
  completionProbMin: 10,
  completionProbMax: 100,

  examUrgencyDaysThresholdFar: 180,
  examUrgencyDaysThresholdNear: 90,
  examUrgencyScaleFar: 0.4,
  examUrgencyScaleNear: 70,
  examUrgencyScaleDefault: 50,

  fatigueHighVal: 75,
  fatigueMediumVal: 30,
  fatigueLowVal: 0,
  fatiguePenaltyMax: 40,

  velocityLowThreshold: 3,     // hours studied past week
  velocityHighThreshold: 6,
  forgettingDecayPerDay: 4,
};

// Maintain compatibility with legacy tests
export const PLANNER_WEIGHTS = {
  dependency: 0.15,
  weightage: 0.15,
  mastery: 0.10,
  revisionUrgency: 0.25,
  mistake: 0.10,
  completion: 0.05,
  timeEfficiency: 0.05,
  subjectBalance: 0.05,
  examUrgency: 0.05,
  recentActivity: 0.05,
};

export interface StudyStatistics {
  durationSpent: Record<SubjectId, number>;
  activityCounts: Record<SubjectId, {
    lectures: number;
    dpps: number;
    pyqs: number;
    revisions: number;
  }>;
  remainingSyllabus: Record<SubjectId, number>;
  backlogCount: Record<SubjectId, number>;
  missionCount: Record<SubjectId, number>;
}

export function getSubjectForChapterId(chapterId: string, chapters: { id: string; subject: SubjectId; name: string }[]): SubjectId {
  const found = chapters.find(c => c.id === chapterId || c.name === chapterId);
  if (found) {
    return found.subject;
  }
  if (chapterId === 'c1' || chapterId === 'c2' || chapterId === 'p1') return 'physics';
  if (chapterId === 'chemistry' || chapterId === 'c1_chem' || chapterId === 'chem_bonded') return 'chemistry';
  if (chapterId === 'maths' || chapterId === 'm1') return 'maths';
  
  return 'physics';
}

export function collectStudyStatistics(context: ScoringContext): StudyStatistics {
  const studySessions = context.globalInput.studySessions || [];
  const todayMissions = context.globalInput.todayMissions || [];
  const chapters = context.globalInput.chapters || [];

  const currentDate = context.globalInput.currentDate ? new Date(context.globalInput.currentDate) : new Date();
  const fourteenDaysAgo = new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000);

  const durationSpent: Record<SubjectId, number> = { physics: 0, chemistry: 0, maths: 0 };
  const activityCounts: Record<SubjectId, { lectures: number; dpps: number; pyqs: number; revisions: number }> = {
    physics: { lectures: 0, dpps: 0, pyqs: 0, revisions: 0 },
    chemistry: { lectures: 0, dpps: 0, pyqs: 0, revisions: 0 },
    maths: { lectures: 0, dpps: 0, pyqs: 0, revisions: 0 }
  };
  const remainingSyllabus: Record<SubjectId, number> = { physics: 0, chemistry: 0, maths: 0 };
  const backlogCount: Record<SubjectId, number> = { physics: 0, chemistry: 0, maths: 0 };
  const missionCount: Record<SubjectId, number> = { physics: 0, chemistry: 0, maths: 0 };

  studySessions.forEach(session => {
    const sessionDate = new Date(session.startTime);
    if (sessionDate >= fourteenDaysAgo && sessionDate <= currentDate) {
      const dur = session.duration || 0;
      const subId = session.subjectId;
      if (durationSpent[subId] !== undefined) {
        durationSpent[subId] += dur;
        if (session.type === 'Lecture') activityCounts[subId].lectures++;
        if (session.type === 'Practice') activityCounts[subId].dpps++;
        if (session.type === 'Revision') activityCounts[subId].revisions++;
      }
    }
  });

  chapters.forEach(c => {
    const comp = c.completion || 0;
    const rem = 100 - comp;
    const subId = c.subject;
    if (remainingSyllabus[subId] !== undefined) {
      remainingSyllabus[subId] += rem;
    }
  });

  const totalChaptersSyllabus = remainingSyllabus.physics + remainingSyllabus.chemistry + remainingSyllabus.maths;
  if (totalChaptersSyllabus === 0) {
    Object.entries(context.globalInput.chapterTelemetryMap || {}).forEach(([cid, p]) => {
      const rem = 100 - (p.masteryScore || 0);
      const subId = getSubjectForChapterId(cid, chapters);
      remainingSyllabus[subId] += rem;
    });
  }

  if (remainingSyllabus.physics === 0 && remainingSyllabus.chemistry === 0 && remainingSyllabus.maths === 0) {
    remainingSyllabus.physics = 100;
    remainingSyllabus.chemistry = 100;
    remainingSyllabus.maths = 100;
  }

  const revisionBacklog = context.globalInput.revisionBacklog || [];
  revisionBacklog.forEach(b => {
    const subId = getSubjectForChapterId(b.chapterId, chapters);
    backlogCount[subId]++;
  });

  const totalBacklogCount = backlogCount.physics + backlogCount.chemistry + backlogCount.maths;
  if (totalBacklogCount === 0) {
    chapters.forEach(c => {
      if (c.status === 'Revision Due') {
        backlogCount[c.subject]++;
      }
    });
  }

  if (backlogCount.physics === 0 && backlogCount.chemistry === 0 && backlogCount.maths === 0) {
    backlogCount.physics = 1;
    backlogCount.chemistry = 1;
    backlogCount.maths = 1;
  }

  todayMissions.forEach(m => {
    const subId = m.subject;
    if (missionCount[subId] !== undefined) {
      missionCount[subId]++;
    }
  });

  if (missionCount.physics === 0 && missionCount.chemistry === 0 && missionCount.maths === 0) {
    missionCount.physics = 1;
    missionCount.chemistry = 1;
    missionCount.maths = 1;
  }

  return {
    durationSpent,
    activityCounts,
    remainingSyllabus,
    backlogCount,
    missionCount
  };
}

export function calculateTargetEffort(stats: StudyStatistics): Record<SubjectId, number> {
  const subjects: SubjectId[] = ['physics', 'chemistry', 'maths'];
  
  const totalRemaining = subjects.reduce((sum, s) => sum + stats.remainingSyllabus[s], 0);
  const totalBacklog = subjects.reduce((sum, s) => sum + stats.backlogCount[s], 0);
  const totalMissions = subjects.reduce((sum, s) => sum + stats.missionCount[s], 0);

  const targetShare: Record<SubjectId, number> = { physics: 1/3, chemistry: 1/3, maths: 1/3 };

  subjects.forEach(s => {
    const remShare = totalRemaining > 0 ? stats.remainingSyllabus[s] / totalRemaining : 1/3;
    const backShare = totalBacklog > 0 ? stats.backlogCount[s] / totalBacklog : 1/3;
    const missShare = totalMissions > 0 ? stats.missionCount[s] / totalMissions : 1/3;

    targetShare[s] = 0.5 * remShare + 0.3 * backShare + 0.2 * missShare;
  });

  return targetShare;
}

export function calculateActualEffort(stats: StudyStatistics): Record<SubjectId, number> {
  const subjects: SubjectId[] = ['physics', 'chemistry', 'maths'];

  const totalDuration = subjects.reduce((sum, s) => sum + stats.durationSpent[s], 0);
  
  const totalActivities = subjects.reduce((sum, s) => {
    const ac = stats.activityCounts[s];
    return sum + (ac.lectures + ac.dpps + ac.pyqs + ac.revisions);
  }, 0);

  const actualShare: Record<SubjectId, number> = { physics: 1/3, chemistry: 1/3, maths: 1/3 };

  subjects.forEach(s => {
    const spentShare = totalDuration > 0 ? stats.durationSpent[s] / totalDuration : 1/3;
    const ac = stats.activityCounts[s];
    const totalSubjectActivities = ac.lectures + ac.dpps + ac.pyqs + ac.revisions;
    const activityShare = totalActivities > 0 ? totalSubjectActivities / totalActivities : 1/3;

    actualShare[s] = 0.7 * spentShare + 0.3 * activityShare;
  });

  return actualShare;
}

export function calculateEffortDeficit(
  targetEffort: Record<SubjectId, number>,
  actualEffort: Record<SubjectId, number>,
  subject: SubjectId
): number {
  return targetEffort[subject] - actualEffort[subject];
}

export function mapDeficitToScore(deficit: number, focusSubjectBoost: boolean): number {
  let score = Math.max(0, Math.min(100, Math.round(50 + (deficit * 150))));
  if (focusSubjectBoost) {
    score = Math.min(100, score + 20);
  }
  return score;
}

export function generateExplanation(subject: SubjectId, stats: StudyStatistics): string {
  const subjects: SubjectId[] = ['physics', 'chemistry', 'maths'];

  const totalDuration = subjects.reduce((sum, s) => sum + stats.durationSpent[s], 0);
  const spentShare = totalDuration > 0 ? stats.durationSpent[subject] / totalDuration : 1/3;

  const totalRemaining = subjects.reduce((sum, s) => sum + stats.remainingSyllabus[s], 0);
  const remainingShare = totalRemaining > 0 ? stats.remainingSyllabus[subject] / totalRemaining : 1/3;

  const totalBacklog = subjects.reduce((sum, s) => sum + stats.backlogCount[s], 0);
  const backlogShare = totalBacklog > 0 ? stats.backlogCount[subject] / totalBacklog : 1/3;

  const subjectLabels: Record<SubjectId, string> = {
    physics: 'Physics',
    chemistry: 'Chemistry',
    maths: 'Maths'
  };

  const subjectLabel = subjectLabels[subject] || 'Subject';
  const pctSpent = Math.round(spentShare * 100);
  const pctRemaining = Math.round(remainingShare * 100);
  const pctBacklog = Math.round(backlogShare * 100);

  return `${subjectLabel} has received ${pctSpent}% of study time during the last 14 days while representing ${pctRemaining}% of remaining workload and ${pctBacklog}% of revision backlog.`;
}

export class PlannerScoringEngine {
  private weights = PLANNER_CONFIG.weights;

  constructor(customWeights?: Partial<typeof PLANNER_CONFIG.weights>) {
    if (customWeights) {
      this.weights = { ...this.weights, ...customWeights };
    }
  }

  public calculateScore(context: ScoringContext): ScoringResult {
    // -------------------------------------------------------------
    // FACTOR 1: JEE Weightage (0-100)
    // -------------------------------------------------------------
    const weightage = context.node.weightage || 5;
    const weightageScore = Math.min(100, weightage * PLANNER_CONFIG.jeeWeightageScale);

    // -------------------------------------------------------------
    // FACTOR 2: Mastery Score (0-100)
    // For lecture progression: prioritize low mastery (100 - completion)
    // For practice: bell-curve around target point (e.g. 60%) to ensure readiness
    // -------------------------------------------------------------
    const completion = context.progress.completion || 0;
    const masteryFactor = Math.max(0, 100 - completion);
    let masteryScore = 0;
    if (context.taskType === 'Watch Lecture') {
      masteryScore = masteryFactor;
    } else {
      masteryScore = Math.max(0, 100 - Math.abs(completion - PLANNER_CONFIG.targetMasteryOptimalPoint) * PLANNER_CONFIG.masteryBellCurveSpread);
    }

    // -------------------------------------------------------------
    // FACTOR 3: Mistake Intelligence (0-100)
    // -------------------------------------------------------------
    let mistakeScore = 0;
    const nodeName = context.node.name;
    const mistakes = context.globalInput.mistakes || [];
    const chapterMistakes = mistakes.filter(m => m.chapter === nodeName);

    const chapter = context.globalInput.chapters?.find(c => c.name === nodeName) || {
      id: context.node.id,
      name: nodeName,
      subject: context.node.subject,
      unit: context.node.module,
      priority: context.node.revisionPriority === 'High' ? 1 : (context.node.revisionPriority === 'Medium' ? 2 : 3),
      completion: context.progress.completion,
      lastRevisionDaysAgo: context.revisionData?.daysOverdue,
      revisionCount: 0,
      solvedQuestions: 0,
      totalLectures: context.node.lectureCount,
      currentLecture: 0,
      theoryComplete: context.progress.completion > 0,
      dppComplete: false,
      pyqsComplete: false,
      status: 'Revision Due'
    } as any;

    const mistakeResult = calculateMistakeScore(chapter, chapterMistakes);
    mistakeScore = mistakeResult.score;

    if (context.taskType === 'Review Mistakes') {
      mistakeScore = 100;
    }

    // -------------------------------------------------------------
    // FACTOR 4: Dependency Unlock Value (0-100)
    // -------------------------------------------------------------
    const dependencyScore = Math.min(PLANNER_CONFIG.dependencyMaxScore, context.dependencyTreeSize * PLANNER_CONFIG.dependencyTreeScale);

    // -------------------------------------------------------------
    // FACTOR 5: Revision Urgency (0-100)
    // -------------------------------------------------------------
    let revisionUrgencyScore = 0;
    if (context.revisionData) {
      revisionUrgencyScore = Math.min(100, context.revisionData.daysOverdue * PLANNER_CONFIG.overdueDayMultiplier + Math.max(0, 100 - context.revisionData.retentionScore));
    } else if (context.globalInput.chapters) {
      const foundChap = context.globalInput.chapters.find(c => c.id === context.node.id);
      if (foundChap && foundChap.status === 'Revision Due') {
        const daysOverdue = foundChap.lastRevisionDaysAgo || 5;
        revisionUrgencyScore = Math.min(100, daysOverdue * PLANNER_CONFIG.overdueDayMultiplier + 50);
      }
    }

    // Add extra bump if this is a Revision task to maintain compatibility with legacy priorities
    if (context.taskType === 'Revise Formulas' && revisionUrgencyScore > 0) {
      revisionUrgencyScore = Math.min(100, revisionUrgencyScore + 15);
    }

    // -------------------------------------------------------------
    // FACTOR 6: Time Since Last Study (0-100)
    // -------------------------------------------------------------
    let timeSinceLastStudyScore = 50;
    if (context.revisionData) {
      timeSinceLastStudyScore = Math.min(PLANNER_CONFIG.timeSinceLastStudyMax, context.revisionData.daysOverdue * PLANNER_CONFIG.timeSinceLastStudyScale);
    } else {
      const foundChap = context.globalInput.chapters?.find(c => c.id === context.node.id);
      const daysOverdue = foundChap ? (foundChap.lastRevisionDaysAgo || 7) : 7;
      timeSinceLastStudyScore = Math.min(PLANNER_CONFIG.timeSinceLastStudyMax, daysOverdue * PLANNER_CONFIG.timeSinceLastStudyScale);
    }

    // -------------------------------------------------------------
    // FACTOR 7: Subject Balance (0-100)
    // -------------------------------------------------------------
    const subject = context.node.subject;
    const stats = collectStudyStatistics(context);
    const targetEffort = calculateTargetEffort(stats);
    const actualEffort = calculateActualEffort(stats);
    const deficit = calculateEffortDeficit(targetEffort, actualEffort, subject);
    const isFocusSubject = context.globalInput.userPreferences.focusSubject === subject;
    const subjectBalanceScore = mapDeficitToScore(deficit, isFocusSubject);
    const subjectBalanceExplanation = generateExplanation(subject, stats);

    // -------------------------------------------------------------
    // FACTOR 8: Estimated Learning Gain (0-100)
    // -------------------------------------------------------------
    let learningGainScore = 0;
    const weightageRatio = (context.node.weightage || 5) / 10;
    if (context.taskType === 'Watch Lecture') {
      learningGainScore = PLANNER_CONFIG.learningGainLectureScale * weightageRatio * (1 - completion / 100);
    } else if (context.taskType === 'Solve DPP') {
      learningGainScore = PLANNER_CONFIG.learningGainDppScale * weightageRatio;
    } else if (context.taskType === 'Solve PYQs') {
      learningGainScore = PLANNER_CONFIG.learningGainPyqScale * weightageRatio;
    } else if (context.taskType === 'Revise Formulas') {
      const retScore = context.revisionData ? context.revisionData.retentionScore : 50;
      learningGainScore = PLANNER_CONFIG.learningGainRevisionScale * (1 - retScore / 100);
    } else if (context.taskType === 'Review Mistakes') {
      learningGainScore = PLANNER_CONFIG.learningGainMistakeScale;
    }
    learningGainScore = Math.min(PLANNER_CONFIG.learningGainMax, learningGainScore);

    // -------------------------------------------------------------
    // FACTOR 9: Completion Probability (0-100)
    // Based on task duration, daily hours and velocity
    // -------------------------------------------------------------
    const taskDuration = context.taskType === 'Watch Lecture' ? 60 : (context.taskType === 'Revise Formulas' ? 30 : 45);
    const totalMins = context.globalInput.studyHours * 60;
    const userVelocityHours = context.globalInput.studyHours || 4;
    let completionProbabilityScore = PLANNER_CONFIG.completionProbBase - (taskDuration / (totalMins || 1)) * PLANNER_CONFIG.completionProbPenaltyFactor + (userVelocityHours - 4) * PLANNER_CONFIG.completionProbVelocityBonus;
    completionProbabilityScore = Math.max(PLANNER_CONFIG.completionProbMin, Math.min(PLANNER_CONFIG.completionProbMax, completionProbabilityScore));

    // -------------------------------------------------------------
    // FACTOR 10: Exam Urgency (0-100)
    // -------------------------------------------------------------
    let examUrgencyScore = PLANNER_CONFIG.examUrgencyScaleDefault;
    const days = context.globalInput.remainingDaysUntilJEE;
    if (days < PLANNER_CONFIG.examUrgencyDaysThresholdNear) {
      examUrgencyScore = Math.min(100, (context.node.weightage || 5) * 10);
    } else if (days < PLANNER_CONFIG.examUrgencyDaysThresholdFar) {
      examUrgencyScore = PLANNER_CONFIG.examUrgencyScaleNear;
    }

    // -------------------------------------------------------------
    // FACTOR 11: Remaining Syllabus (0-100)
    // -------------------------------------------------------------
    const chaptersList = context.globalInput.chapters || [];
    const totalSyllabusRemaining = chaptersList.length > 0
      ? chaptersList.reduce((acc, c) => acc + (100 - (c.completion || 0)), 0) / chaptersList.length
      : 50;
    let remainingSyllabusScore = totalSyllabusRemaining;
    if (context.taskType !== 'Watch Lecture' && context.taskType !== 'Solve DPP') {
      remainingSyllabusScore = 100 - totalSyllabusRemaining;
    }

    // -------------------------------------------------------------
    // FACTOR 12: User Study Velocity (0-100)
    // -------------------------------------------------------------
    const velocityHours = context.globalInput.studyHours;
    let studyVelocityScore = 50;
    if (velocityHours > PLANNER_CONFIG.velocityHighThreshold) {
      studyVelocityScore = 90;
    } else if (velocityHours < PLANNER_CONFIG.velocityLowThreshold) {
      studyVelocityScore = 30;
    }

    // -------------------------------------------------------------
    // FACTOR 13: Current Fatigue (0-100)
    // -------------------------------------------------------------
    let userFatigue = PLANNER_CONFIG.fatigueLowVal;
    if (context.globalInput.studyHours > 8) userFatigue = PLANNER_CONFIG.fatigueHighVal;
    else if (context.globalInput.studyHours > 5) userFatigue = PLANNER_CONFIG.fatigueMediumVal;
    let fatigueScore = 50;
    if (userFatigue > 50) {
      if (context.taskType === 'Revise Formulas' || context.taskType === 'Review Mistakes') {
        fatigueScore = 90;
      } else {
        fatigueScore = 20;
      }
    }

    // -------------------------------------------------------------
    // FACTOR 14: Daily Available Hours (0-100)
    // -------------------------------------------------------------
    const dailyHours = context.globalInput.studyHours;
    let dailyHoursScore = 50;
    if (dailyHours >= 8) {
      if (context.taskType === 'Watch Lecture' || context.taskType === 'Solve PYQs') {
        dailyHoursScore = 90;
      }
    } else if (dailyHours <= 3) {
      if (context.taskType === 'Revise Formulas' || context.taskType === 'Review Mistakes') {
        dailyHoursScore = 90;
      }
    }

    // -------------------------------------------------------------
    // MODULAR 10-FACTOR BREAKDOWN MAPPING
    // -------------------------------------------------------------
    const prerequisiteImportanceScore = dependencyScore;
    const jeeChapterWeightageScore = weightageScore;
    const currentMasteryScore = masteryScore;
    const forgettingRiskScore = Math.min(100, Math.round((context.revisionData ? (100 - context.revisionData.retentionScore) : 40) + (context.revisionData?.daysOverdue || 5) * 3));
    const recentAccuracyScore = Math.min(100, Math.round(100 - 70 + (chapterMistakes.length * 10)));
    
    // Monthly objective alignment check
    let monthlyObjectiveAlignmentScore = 40;
    const monthlyObjs = context.globalInput.monthlyObjectives || [];
    if (monthlyObjs.some(o => o.subject === context.node.subject || (o.focusChapters && o.focusChapters.includes(context.node.name)) || (o.category && o.category.toLowerCase().includes(context.node.subject)))) {
      monthlyObjectiveAlignmentScore = 95;
    } else if (context.globalInput.userPreferences.focusSubject === context.node.subject) {
      monthlyObjectiveAlignmentScore = 80;
    }

    const availableStudyTimeScore = completionProbabilityScore;
    const projectedCompletionImpactScore = learningGainScore;
    const backlogSeverityScore = Math.min(100, mistakeScore + (context.revisionData?.daysOverdue ? context.revisionData.daysOverdue * 5 : 0));

    // Ensure we also populate legacy breakdown scores for fully backward-compatible rendering
    const completionScore = completion >= 80 && completion < 100 ? 100 : (completion >= 50 ? 60 : 20);
    const timeEfficiencyScore = context.taskType === 'Revise Formulas' ? 90 : (context.taskType === 'Solve DPP' ? 75 : 60);
    const recentActivityScore = 50;

    const breakdown: ScoreBreakdown = {
      // 10 Modular Core Factors
      prerequisiteImportanceScore,
      jeeChapterWeightageScore,
      currentMasteryScore,
      revisionUrgencyScore,
      forgettingRiskScore,
      recentAccuracyScore,
      monthlyObjectiveAlignmentScore,
      availableStudyTimeScore,
      projectedCompletionImpactScore,
      backlogSeverityScore,

      // Legacy compatibility
      dependencyScore,
      weightageScore,
      masteryScore,
      mistakeScore,
      completionScore,
      timeEfficiencyScore,
      subjectBalanceScore,
      examUrgencyScore,
      recentActivityScore,
      // V2 factors
      timeSinceLastStudyScore,
      learningGainScore,
      completionProbabilityScore,
      remainingSyllabusScore,
      studyVelocityScore,
      fatigueScore,
      dailyHoursScore,
    };

    // Calculate total score using the configurable 14-factor weights
    const totalScore = Math.round(
      weightageScore * this.weights.jeeWeightage +
      masteryScore * this.weights.mastery +
      mistakeScore * this.weights.mistakeIntelligence +
      dependencyScore * this.weights.dependencyUnlock +
      revisionUrgencyScore * this.weights.revisionUrgency +
      timeSinceLastStudyScore * this.weights.timeSinceLastStudy +
      subjectBalanceScore * this.weights.subjectBalance +
      learningGainScore * this.weights.learningGain +
      completionProbabilityScore * this.weights.completionProbability +
      examUrgencyScore * this.weights.examUrgency +
      remainingSyllabusScore * this.weights.remainingSyllabus +
      studyVelocityScore * this.weights.studyVelocity +
      fatigueScore * this.weights.fatigue +
      dailyHoursScore * this.weights.dailyHours
    );

    return { totalScore, breakdown, explanation: subjectBalanceExplanation };
  }
}
