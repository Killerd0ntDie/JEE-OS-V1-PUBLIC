import { Chapter, Mistake, SessionAnalytics, TodayMission } from '../../types/index';
import { StudyBrainService } from '@/services/studyBrainService';
import { calculateSyllabusProgress, SyllabusProgress } from './syllabusProgressCalculator';

export interface DashboardSummaryCalculatorSettings {
  targetYear?: string;
  dayStartTime?: string;
  dayEndTime?: string;
}

export interface DashboardDerivedComputations {
  dashboardSummary: { syllabusCompletion: number; daysUntilExam: number } | null;
  subjectPriorities: Chapter[];
  syllabusProgress: SyllabusProgress;
  daysRemaining: number;
  projectedReadiness: number;
  riskProfile: {
    estimatedReadinessScore: number;
    highestRiskSubject: 'Physics' | 'Chemistry' | 'Mathematics';
    highestRiskChapters: Chapter[];
  };
  estimatedRemainingHours: string;
  plannedQuestions: number;
  targetFinishTime: string;
  chaptersWithData: {
    chapter: Chapter;
    data: ReturnType<typeof StudyBrainService['getChapterCommandCenterData']>;
  }[];
}

/**
 * Pure calculator for dashboard summary, risk profile, syllabus progress,
 * and time-budget metrics.
 */
export function calculateDashboardDerivedState(params: {
  chapters: Chapter[];
  mistakes: Mistake[];
  settings?: DashboardSummaryCalculatorSettings;
  analytics?: SessionAnalytics;
  todayMissions: TodayMission[];
}): DashboardDerivedComputations {
  const { chapters, mistakes, settings, analytics, todayMissions } = params;
  const targetYear = settings?.targetYear || '2027';

  const dashboardSummary = StudyBrainService.getDashboardSummary(chapters, targetYear);
  const subjectPriorities = StudyBrainService.sortChaptersByRecommendation(chapters, mistakes).slice(0, 3);
  const syllabusProgress = calculateSyllabusProgress(chapters);
  const daysRemaining = StudyBrainService.getDaysUntilExam(targetYear);

  // Compute Risk Profile
  const avgMastery = chapters.reduce((sum, c) => {
    const cMistakes = (mistakes || []).filter(m => m.chapter === c.name && m.revisionStatus !== 'Mastered').length;
    const comp = typeof c.completion === 'number' && !isNaN(c.completion) ? c.completion : 0;
    const completionPart = Math.min(100, Math.max(0, comp));
    const mistakePenalty = Math.min(30, cMistakes * 5);
    return sum + Math.max(0, completionPart - mistakePenalty);
  }, 0) / (chapters.length || 1);

  const safeAvgMastery = isNaN(avgMastery) ? 0 : avgMastery;
  const accuracy = typeof analytics?.accuracy === 'number' && !isNaN(analytics.accuracy)
    ? analytics.accuracy
    : 0;
  const questionsSolved = analytics?.questionsSolved || 0;
  const rawReadiness = Math.round(safeAvgMastery * 0.7 + (questionsSolved > 0 ? accuracy * 0.3 : 25));
  const estimatedReadinessScore = isNaN(rawReadiness) ? 25 : Math.max(10, Math.min(100, rawReadiness));
  const projectedReadiness = estimatedReadinessScore;

  const getSubjectMastery = (sub: string) => {
    const subChaps = chapters.filter(c => c.subject === sub);
    if (subChaps.length === 0) return 0;
    const totalM = subChaps.reduce((acc, c) => {
      const cMistakes = (mistakes || []).filter(m => m.chapter === c.name && m.revisionStatus !== 'Mastered').length;
      const comp = typeof c.completion === 'number' && !isNaN(c.completion) ? c.completion : 0;
      const completionPart = Math.min(100, Math.max(0, comp));
      const mistakePenalty = Math.min(30, cMistakes * 5);
      return acc + Math.max(0, completionPart - mistakePenalty);
    }, 0);
    const res = subChaps.length > 0 ? totalM / subChaps.length : 0;
    return isNaN(res) ? 0 : res;
  };

  let highestRiskSubject: 'Physics' | 'Chemistry' | 'Mathematics' = 'Physics';
  let minMastery = getSubjectMastery('physics');

  const cMastery = getSubjectMastery('chemistry');
  if (cMastery < minMastery) {
    minMastery = cMastery;
    highestRiskSubject = 'Chemistry';
  }

  const mMastery = getSubjectMastery('maths');
  if (mMastery < minMastery) {
    highestRiskSubject = 'Mathematics';
  }

  const riskProfile = {
    estimatedReadinessScore,
    highestRiskSubject,
    highestRiskChapters: subjectPriorities
  };

  // Compute remaining study hours and questions
  const incompleteMissions = todayMissions.filter(m => !m.completed);

  const dayStartTime = settings?.dayStartTime || '07:00';
  const dayEndTime = settings?.dayEndTime || '23:00';
  const parseTimeVal = (val: string | undefined, fallback: number) => {
    const p = parseInt(val || '', 10);
    return isNaN(p) ? fallback : p;
  };

  const endHour = parseTimeVal(dayEndTime.split(':')[0], 23);
  const endMinute = parseTimeVal(dayEndTime.split(':')[1], 0);
  let logicalEndHour = endHour;
  const startHourVal = parseTimeVal(dayStartTime.split(':')[0], 7);
  if (logicalEndHour < startHourVal) {
    logicalEndHour += 24;
  }
  const endMinsTotal = logicalEndHour * 60 + endMinute;

  const now = new Date();
  let logicalRealCurrentHour = now.getHours();
  if (logicalRealCurrentHour < (parseInt(dayStartTime.split(':')[0], 10) || 7)) {
    logicalRealCurrentHour += 24;
  }
  const nowMins = logicalRealCurrentHour * 60 + now.getMinutes();

  let curPushMins = nowMins;
  const validIncomplete = incompleteMissions.filter(m => {
    const duration = m.duration || 60;
    const start = curPushMins;
    curPushMins += duration;
    return start < endMinsTotal;
  });

  const studyMins = validIncomplete
    .filter(m => m.type !== 'Break' && (m.subject as string) !== 'break')
    .reduce((acc, curr) => acc + (curr.duration || 0), 0);

  const totalMinsIncludingBreaks = validIncomplete.reduce((acc, curr) => acc + (curr.duration || 0), 0);

  const estimatedRemainingHours = (studyMins / 60).toFixed(1);

  const plannedQuestions = validIncomplete.reduce((acc, curr) => {
    if (curr.type === 'Solve PYQs') return acc + 15;
    if (curr.type === 'Solve DPP') return acc + 10;
    return acc;
  }, 0);

  const finishDate = new Date();
  // Add 5 min buffer per mission for transitions, breaks are already included in totalMinsIncludingBreaks
  finishDate.setMinutes(finishDate.getMinutes() + totalMinsIncludingBreaks + (validIncomplete.length * 5));
  const targetFinishTime = finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Compute Chapter Data for UI
  const chaptersWithData = chapters.map(chapter => {
    return {
      chapter,
      data: StudyBrainService.getChapterCommandCenterData(chapter, chapters, mistakes)
    };
  });

  return {
    dashboardSummary,
    subjectPriorities,
    syllabusProgress,
    daysRemaining,
    projectedReadiness,
    riskProfile,
    estimatedRemainingHours,
    plannedQuestions,
    targetFinishTime,
    chaptersWithData
  };
}
