import { SubjectId } from '@/types/index';
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
      const diffDays = Math.floor((now.getTime() - sessionDate.getTime()) / msPerDay);
      
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
    
    // Calculate Streak
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now.getTime() - i * msPerDay);
      const dateStr = getLocalDateKey(d);
      if (dailyStudyMins[dateStr] > 0) {
        currentStreak++;
      } else {
        if (i === 0) continue; // Allow today to be 0 and keep streak from yesterday
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
      const daysToComplete = remainingHours / (studyVelocity > 0 ? studyVelocity : 1);
      predictedDate = new Date(now.getTime() + daysToComplete * msPerDay).toISOString();
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
