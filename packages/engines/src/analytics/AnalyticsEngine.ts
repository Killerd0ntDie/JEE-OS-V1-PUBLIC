import { SubjectId, Chapter, StudySession } from '../types/index';
import { AnalyticsInput, AnalyticsOutput } from './types';

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class AnalyticsEngine {
  
  public generateAnalytics(input: AnalyticsInput): AnalyticsOutput {
    const now = input.currentDate ? new Date(input.currentDate) : new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    
    // 1. Total Study Hours & Velocity
    let totalStudyMins = 0;
    const studyMinsPastWeek = [0, 0, 0, 0, 0, 0, 0];
    const activeDaysInLast30 = new Set<string>();
    let totalQs = 0;
    let correctQs = 0;
    
    const subjectMins: Record<SubjectId, number> = {
      physics: 0,
      chemistry: 0,
      maths: 0
    };

    // Calculate daily active days
    const dailyStudyMins: Record<string, number> = {};

    input.sessions.forEach(session => {
      totalStudyMins += session.duration;
      if (session.subjectId) {
        subjectMins[session.subjectId] += session.duration;
      }
      
      if (session.questionsSolved && session.accuracy !== undefined) {
        totalQs += session.questionsSolved;
        correctQs += Math.round(session.questionsSolved * (session.accuracy / 100));
      }
      
      const sessionDate = new Date(session.startTime);
      const sessionMidnight = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()).getTime();
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const diffDays = Math.round((nowMidnight - sessionMidnight) / msPerDay);
      
      const dateStr = getLocalDateKey(sessionDate);
      dailyStudyMins[dateStr] = (dailyStudyMins[dateStr] || 0) + session.duration;
      
      if (diffDays < 7 && diffDays >= 0) {
        studyMinsPastWeek[6 - diffDays] += session.duration;
      }
      
      if (diffDays < 30 && diffDays >= 0) {
        activeDaysInLast30.add(dateStr);
      }
    });
    
    const studyHoursPastWeek = studyMinsPastWeek.map(m => Math.round((m / 60) * 10) / 10);
    const studyVelocity = studyHoursPastWeek.reduce((a, b) => a + b, 0) / 7;
    const consistencyScore = Math.round((activeDaysInLast30.size / 30) * 100);
    
    // Calculate Streak using calendar days and quota threshold
    const minStreakMins = input.minStreakMinutes ?? 30;
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = getLocalDateKey(d);
      const mins = dailyStudyMins[dateStr] || 0;
      if (mins >= minStreakMins) {
        currentStreak++;
      } else {
        if (i === 0) continue; // Allow today to be incomplete without breaking yesterday's streak
        break;
      }
    }

    // 2. Question Accuracy
    const questionAccuracy = totalQs > 0 ? Math.round((correctQs / totalQs) * 100) : 0;
    
    // 3. Subject Balance & Lecture Completion
    const subjectBalance: Record<SubjectId, { studyHours: number, completionPercentage: number }> = {
      physics: { studyHours: Math.round(subjectMins.physics / 60), completionPercentage: 0 },
      chemistry: { studyHours: Math.round(subjectMins.chemistry / 60), completionPercentage: 0 },
      maths: { studyHours: Math.round(subjectMins.maths / 60), completionPercentage: 0 }
    };
    
    let totalCompleted = 0;
    let totalLectures = 0;
    
    const subjectTotals: Record<SubjectId, { completed: number, total: number }> = {
      physics: { completed: 0, total: 0 },
      chemistry: { completed: 0, total: 0 },
      maths: { completed: 0, total: 0 }
    };
    
    if (input.chapterTelemetryMap && Object.keys(input.chapterTelemetryMap).length > 0) {
      Object.values(input.chapterTelemetryMap).forEach(t => {
        const sub = t.subject;
        const totLec = t.totalLectures || 12;
        const curLec = t.currentLecture || 0;
        
        if (subjectTotals[sub]) {
          subjectTotals[sub].total += totLec;
          subjectTotals[sub].completed += curLec;
        }
        totalLectures += totLec;
        totalCompleted += curLec;
      });
    } else {
      input.chapters.forEach(c => {
        totalLectures += (c.totalLectures || 1);
        totalCompleted += (c.currentLecture || 0);
        
        if (subjectTotals[c.subject]) {
          subjectTotals[c.subject].total += (c.totalLectures || 1);
          subjectTotals[c.subject].completed += (c.currentLecture || 0);
        }
      });
    }
    
    for (const sub of ['physics', 'chemistry', 'maths'] as SubjectId[]) {
      const tot = subjectTotals[sub].total;
      subjectBalance[sub].completionPercentage = tot > 0 ? Math.min(100, Math.round((subjectTotals[sub].completed / tot) * 100)) : 0;
    }
    
    const overallLectureCompletion = totalLectures > 0 ? Math.min(100, Math.round((totalCompleted / totalLectures) * 100)) : 0;
    
    // 4. Revision Health
    let resolvedMistakes = 0;
    input.mistakes.forEach(m => {
      if (m.revisionStatus === 'Mastered') resolvedMistakes++;
    });
    const revisionHealth = input.mistakes.length > 0 ? Math.round((resolvedMistakes / input.mistakes.length) * 100) : 100;
    
    // 5. Mock Performance
    let avgScore = 0;
    let recentTrend = 0;
    if (input.mocks.length > 0) {
      const sortedMocks = [...input.mocks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const totalScore = sortedMocks.reduce((acc, m) => acc + m.totalScore, 0);
      avgScore = Math.round(totalScore / sortedMocks.length);
      const latestScore = sortedMocks[0].totalScore;
      recentTrend = latestScore - avgScore;
    }
    
    // 6. Predicted Completion
    let predictedDate: string | null = null;
    const remainingLectures = Math.max(0, totalLectures - totalCompleted);
    if (studyVelocity > 0 && remainingLectures > 0) {
      // rough heuristic: 1.5 hours per lecture
      const remainingHours = remainingLectures * 1.5;
      const rawDays = remainingHours / studyVelocity;
      // BUG-11: Clamp daysToComplete to prevent JavaScript Date overflow (RangeError: Invalid time value)
      // Supports realistic horizon between 1 day and 10 years (3650 days)
      const daysToComplete = Number.isNaN(rawDays) || !Number.isFinite(rawDays) || rawDays <= 0
        ? 365
        : Math.min(3650, Math.max(1, rawDays));
      const futureMs = now.getTime() + daysToComplete * msPerDay;
      try {
        predictedDate = Number.isNaN(futureMs) ? new Date().toISOString() : new Date(futureMs).toISOString();
      } catch {
        predictedDate = new Date().toISOString();
      }
    } else if (remainingLectures === 0) {
      predictedDate = now.toISOString();
    }

    return {
      totalStudyHours: Math.round(totalStudyMins / 60),
      studyHoursPastWeek,
      studyVelocity: Math.round(studyVelocity * 10) / 10,
      consistencyScore,
      currentStreak,
      subjectBalance,
      overallLectureCompletion,
      questionAccuracy,
      revisionHealth,
      mockPerformance: {
        averageScore: avgScore,
        recentTrend
      },
      predictedCompletionDate: predictedDate
    };
  }
}

/**
 * Authoritative Subject Mastery Average calculation.
 */
export function calculateSubjectMasteryAverages(
  telemetryList: Array<{ subject: string; masteryScore: number }>
): { physics: number; chemistry: number; maths: number } {
  const calc = (sub: string) => {
    const list = telemetryList.filter(t => t.subject === sub);
    if (list.length === 0) return 0;
    return Math.round(list.reduce((acc, t) => acc + t.masteryScore, 0) / list.length);
  };
  return {
    physics: calc('physics'),
    chemistry: calc('chemistry'),
    maths: calc('maths'),
  };
}

/**
 * Authoritative Weekly Strategy Subject Distribution calculation.
 */
export function calculateWeeklyStrategyDistribution(
  chapters: Array<{ subject: string; status?: string; isMastered?: boolean }>
) {
  let pCount = 0;
  let cCount = 0;
  let mCount = 0;
  let pMastered = 0;
  let cMastered = 0;
  let mMastered = 0;

  chapters.forEach(ch => {
    const isMastered = ch.status === 'Mastered' || !!ch.isMastered;
    if (ch.subject === 'physics') {
      pCount++;
      if (isMastered) pMastered++;
    } else if (ch.subject === 'chemistry') {
      cCount++;
      if (isMastered) cMastered++;
    } else if (ch.subject === 'maths') {
      mCount++;
      if (isMastered) mMastered++;
    }
  });

  const total = pCount + cCount + mCount || 1;
  const pPct = Math.round((pCount / total) * 100);
  const cPct = Math.round((cCount / total) * 100);
  const mPct = 100 - pPct - cPct;

  const pMasteryPct = pCount > 0 ? Math.round((pMastered / pCount) * 100) : 0;
  const cMasteryPct = cCount > 0 ? Math.round((cMastered / cCount) * 100) : 0;
  const mMasteryPct = mCount > 0 ? Math.round((mMastered / mCount) * 100) : 0;

  return {
    physics: { total: pCount, mastered: pMastered, pct: pPct, masteryPct: pMasteryPct },
    chemistry: { total: cCount, mastered: cMastered, pct: cPct, masteryPct: cMasteryPct },
    maths: { total: mCount, mastered: mMastered, pct: mPct, masteryPct: mMasteryPct },
  };
}

/**
 * Authoritative calculation for marks at stake from unresolved mistakes.
 */
export function calculateMistakesMarksAtStake(unresolvedCount: number): number {
  return unresolvedCount * 5;
}

/**
 * Authoritative calculation for mock test mastery, potential, and penalties.
 */
export function calculateMockMasteryMetrics(
  totalScore: number,
  whatIfScore: number,
  totalMarks: number
): {
  masteryLevel: number;
  potentialMastery: number;
  avoidablePenalty: number;
} {
  const safeMarks = totalMarks > 0 ? totalMarks : 1;
  return {
    masteryLevel: Math.max(0, Math.round((totalScore / safeMarks) * 100)),
    potentialMastery: Math.min(100, Math.max(0, Math.round((whatIfScore / safeMarks) * 100))),
    avoidablePenalty: Math.max(0, whatIfScore - totalScore),
  };
}

/**
 * Authoritative calculation for subject question accuracy rate.
 */
export function calculateSubjectAccuracy(correct: number, attempted: number): number {
  if (attempted <= 0) return 0;
  return Math.round((correct / attempted) * 100);
}

export interface RadarAxisMetric {
  score: number;
  label: string;
  raw: number;
}

export interface RadarMetrics {
  velocity: RadarAxisMetric;
  retention: RadarAxisMetric;
  depth: RadarAxisMetric;
}

/**
 * Authoritative calculation for Momentum Radar metrics (Velocity, Retention, Depth).
 */
export function calculateRadarMetrics(
  chapters: Chapter[],
  studySessions: StudySession[],
  dailyTargetHours: number = 6.5
): RadarMetrics {
  // 1. Velocity Axis (Hours per day over last 7 days vs target)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMinutes = (studySessions || [])
    .filter(s => s.startTime && new Date(s.startTime) >= sevenDaysAgo)
    .reduce((acc, s) => acc + (s.duration || 0), 0);

  const avgDailyHours = (recentMinutes / 60) / 7;
  const velocityScore = Math.min(100, Math.round((avgDailyHours / (dailyTargetHours || 6)) * 100)) || 65;

  // 2. Retention Axis (Average confidence & revision progress across chapters)
  let totalRetention = 0;
  let countedChapters = 0;

  (chapters || []).forEach(ch => {
    if (ch.completion > 0 || ch.status === 'Mastered') {
      const rawConfidence = ch.confidence ? (ch.confidence <= 5 ? ch.confidence * 20 : ch.confidence) : 65;
      const score = ch.revisionProgress?.retentionScore ?? (ch.status === 'Mastered' ? 92 : rawConfidence);
      totalRetention += score;
      countedChapters++;
    }
  });

  const retentionScore = countedChapters > 0 ? Math.round(totalRetention / countedChapters) : 78;

  // 3. Depth Axis (PYQs completed vs expected across syllabus)
  let totalPyqComplete = 0;
  (chapters || []).forEach(ch => {
    if (ch.pyqsComplete) totalPyqComplete++;
  });
  const depthScore = chapters && chapters.length > 0 ? Math.min(100, Math.round((totalPyqComplete / Math.max(1, chapters.length * 0.4)) * 100)) || 55 : 60;

  return {
    velocity: { score: velocityScore, label: `${avgDailyHours.toFixed(1)}h/day`, raw: velocityScore },
    retention: { score: retentionScore, label: `${retentionScore}% Score`, raw: retentionScore },
    depth: { score: depthScore, label: `${totalPyqComplete} Modules`, raw: depthScore }
  };
}
