import { Chapter, TodayMission, SubjectId } from '../types/index';
import { KnowledgeEngine, SyllabusNode } from '../engines/knowledge';
import { PlannerEngine, PlannerInput } from '../engines/planner';
import { OptimizationEngine, OptimizationInput } from '../engines/optimization';
import { RevisionEngineService } from './revisionEngineService';
import { Mistake, MockResult, StudySession } from '../types/index';
import { AnalyticsEngine, AnalyticsInput } from '../engines/analytics';
import { CoachEngine, CoachInput } from '../engines/coach';
import { calculateMistakeScore } from '../utils/mistakeIntelligence';
import { getAcademicState } from '../utils/academicState';

export function createSyllabusGraph(chapters: Chapter[]): SyllabusNode[] {
  const nameToId = new Map<string, string>();
  chapters.forEach(c => nameToId.set(c.name, c.id));
  
  return chapters.map(c => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    module: c.unit || 'General',
    difficulty: c.difficulty || 'Medium',
    weightage: c.weightage || 5,
    estimatedHours: (c.totalLectures || 1) * 1.5,
    lectureCount: c.totalLectures || 1,
    dppCount: 1, // standard 1 DPP per chapter
    pyqCount: 50, // standard 50 PYQs
    prerequisites: c.dependencies ? c.dependencies.map(d => nameToId.get(d) || '').filter(Boolean) : [],
    unlockedChapters: [], // will be built by knowledge engine if needed
    revisionPriority: c.priority === 1 ? 'High' : (c.priority === 2 ? 'Medium' : 'Low'),
    // legacy compat
    category: c.unit || 'General',
    estimatedLectures: c.totalLectures || 1,
    estimatedStudyHours: (c.totalLectures || 1) * 1.5,
    importance: c.priority === 1 ? 'High' : (c.priority === 2 ? 'Medium' : 'Low'),
    revisionDefaults: { intervals: [1, 3, 7, 14, 30] },
    tags: []
  }));
}

export const LevelingSystem = {
  getTitle(level: number): { title: string; color: string } {
    if (level < 10) return { title: 'Aspirant', color: 'text-zinc-400' };
    if (level < 20) return { title: 'Novice', color: 'text-blue-400' };
    if (level < 30) return { title: 'Initiate', color: 'text-emerald-400' };
    if (level < 40) return { title: 'Scholar', color: 'text-indigo-400' };
    if (level < 50) return { title: 'Adept', color: 'text-purple-400' };
    if (level < 60) return { title: 'Expert', color: 'text-rose-400' };
    if (level < 80) return { title: 'Master', color: 'text-amber-400' };
    if (level < 100) return { title: 'Grandmaster', color: 'text-cyan-400' };
    return { title: 'JEE Legend', color: 'text-yellow-400 font-bold drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' };
  },
  
  calculateLevel(totalXP: number): { level: number; currentLevelXP: number; nextLevelXP: number; progressPercent: number } {
    // Basic scaling formula: Level N requires (N * 1000) XP. 
    // Total XP for level N = (N * (N + 1) / 2) * 1000.
    // Inverse formula: N = floor((-1 + sqrt(1 + 8 * TotalXP / 1000)) / 2)
    const level = Math.floor((-1 + Math.sqrt(1 + 8 * totalXP / 1000)) / 2) + 1;
    const xpForCurrentLevel = ((level - 1) * level / 2) * 1000;
    const xpForNextLevel = (level * (level + 1) / 2) * 1000;
    
    const currentLevelXP = totalXP - xpForCurrentLevel;
    const nextLevelXP = xpForNextLevel - xpForCurrentLevel;
    const progressPercent = Math.min(100, Math.max(0, (currentLevelXP / nextLevelXP) * 100));
    
    return { level, currentLevelXP, nextLevelXP, progressPercent };
  }
};

export const StudyBrainService = {
  // 1. Mastery Calculation
  calculateMastery(chapter: Chapter, chapterMistakesCount: number): { score: number; explanation: string } {
    const lectureProgress = chapter.totalLectures > 0 ? (chapter.currentLecture / chapter.totalLectures) : (chapter.theoryComplete ? 1 : 0);
    
    if (lectureProgress === 0 && !chapter.theoryComplete) {
      return {
        score: 0,
        explanation: "Chapter has not been started yet. Complete lectures or theory to begin mastering."
      };
    }

    // 1. Foundational Stage (Lectures & Theory) - Weight: 25%
    const foundationalScore = (Math.min(1, lectureProgress) * 0.6 + (chapter.theoryComplete ? 0.4 : 0)) * 100;

    // 2. Practice & Application (DPPs & PYQs) - Weight: 30%
    const practiceScore = ((chapter.dppComplete ? 0.4 : 0) + (chapter.pyqsComplete ? 0.4 : 0) + Math.min(0.2, (chapter.solvedQuestions ?? 0) / 100)) * 100;

    // 3. Spaced Retention & Revisions - Weight: 20%
    const daysOverdue = chapter.lastRevisionDaysAgo ?? 0;
    const retentionScore = chapter.retentionScore ?? Math.max(0, Math.min(100, chapter.revisionCount > 0 ? 100 - daysOverdue * 4 : 50));
    const retentionComponent = (Math.min(1.0, (chapter.revisionCount || 0) / 3) * 0.4 + (retentionScore / 100) * 0.6) * 100;

    // 4. Accuracy & Mistakes Penalty - Weight: 15%
    const questionAccuracy = chapter.solvedQuestions > 0 ? Math.max(30, Math.min(100, Math.round(100 - (chapterMistakesCount / (chapter.solvedQuestions + chapterMistakesCount)) * 100))) : 50;
    const accuracyScore = (questionAccuracy * 0.8) + Math.max(0, 20 - chapterMistakesCount * 2);

    // 5. Confidence & Mock Exam Readiness - Weight: 10%
    const confidenceScore = chapter.healthScore ?? chapter.confidence ?? 50;

    // Weighted sum
    const totalScore = Math.max(0, Math.min(100, Math.round(
      (foundationalScore * 0.25) +
      (practiceScore * 0.30) +
      (retentionComponent * 0.20) +
      (accuracyScore * 0.15) +
      (confidenceScore * 0.10)
    )));

    // Generate detailed dynamic reason/explanation
    const reasons: string[] = [];
    if (lectureProgress >= 1 || chapter.theoryComplete) {
      reasons.push("Completed all lectures");
    } else {
      reasons.push(`Lecture progress ${Math.round(lectureProgress * 100)}%`);
    }

    if (chapter.pyqsComplete) {
      reasons.push("Completed PYQs");
    } else if (chapter.solvedQuestions > 0) {
      reasons.push(`Solved ${chapter.solvedQuestions} questions`);
    }

    if (chapter.dppComplete) {
      reasons.push("Completed DPP");
    }

    if (chapter.revisionCount > 0) {
      if (daysOverdue > 7) {
        reasons.push(`Revision overdue by ${daysOverdue} days`);
      } else {
        reasons.push(`Revised ${chapter.revisionCount} times (${daysOverdue}d ago)`);
      }
    } else {
      reasons.push("No formal revision completed");
    }

    reasons.push(`Accuracy ${Math.round(questionAccuracy)}%`);

    if (chapterMistakesCount > 0) {
      reasons.push(`${chapterMistakesCount} active mistake${chapterMistakesCount > 1 ? 's' : ''}`);
    }

    const explanation = reasons.join(', ');

    return {
      score: totalScore,
      explanation
    };
  },

  calculateMistakeScore(chapter: Chapter, chapterMistakes: Mistake[]) {
    return calculateMistakeScore(chapter, chapterMistakes);
  },

  getChapterCommandCenterData(chapter: Chapter, allChapters: Chapter[], mistakes: Mistake[]) {
    const chapterMistakesCount = mistakes.filter(m => m.chapter === chapter.name).length;
    const activeMistakes = mistakes.filter(m => m.chapter === chapter.name && m.revisionStatus !== 'Mastered').length;
    const masteryResult = this.calculateMastery(chapter, chapterMistakesCount);
    const mastery = masteryResult.score;
    const masteryExplanation = masteryResult.explanation;

    const mistakeResult = this.calculateMistakeScore(chapter, mistakes.filter(m => m.chapter === chapter.name));
    const mistakeScore = mistakeResult.score;
    const mistakeExplanation = mistakeResult.explanation;
    
    const progress = allChapters.map(c => ({
      chapterId: c.id,
      completion: c.completion,
      isMastered: c.status === 'Mastered' || c.completion === 100
    }));

    const masteredIds = new Set(progress.filter(p => p.isMastered).map(p => p.chapterId));
    
    let isUnlocked = true;
    let lockedBy: { id: string, name: string }[] = [];
    
    if (chapter.dependencies && chapter.dependencies.length > 0) {
      const nameToId = new Map<string, string>();
      allChapters.forEach(c => nameToId.set(c.name, c.id));
      
      const reqIds = chapter.dependencies.map(d => nameToId.get(d) || '').filter(Boolean);
      lockedBy = reqIds.filter(reqId => !masteredIds.has(reqId)).map(reqId => {
        const c = allChapters.find(ch => ch.id === reqId);
        return { id: reqId, name: c ? c.name : reqId };
      });
      isUnlocked = lockedBy.length === 0;
    }

    const nextAction = this.getNextAction(chapter, mastery);

    // Calculate masteryTier
    let masteryTierName: string;
    let masteryTierBgClass: string;
    let masteryTierTextClass: string;

    if (mastery >= 85) {
      masteryTierName = 'Mastered';
      masteryTierBgClass = 'bg-emerald-950/50 border-emerald-800/30';
      masteryTierTextClass = 'text-emerald-400 font-medium';
    } else if (mastery >= 60) {
      masteryTierName = 'Proficient';
      masteryTierBgClass = 'bg-indigo-950/50 border-indigo-800/30';
      masteryTierTextClass = 'text-indigo-400 font-medium';
    } else if (mastery >= 30) {
      masteryTierName = 'Developing';
      masteryTierBgClass = 'bg-yellow-950/50 border-yellow-800/30';
      masteryTierTextClass = 'text-yellow-400 font-medium';
    } else {
      masteryTierName = 'Novice';
      masteryTierBgClass = 'bg-zinc-900 border-zinc-800';
      masteryTierTextClass = 'text-zinc-400 font-medium';
    }

    const masteryTier = {
      name: masteryTierName,
      bgClass: masteryTierBgClass,
      textClass: masteryTierTextClass
    };

    // Calculate statusInfo
    let status = chapter.status;
    if (mastery === 100) {
      status = 'Mastered';
    } else if (chapter.lastRevisionDaysAgo !== undefined) {
      const currentStage = RevisionEngineService.inferCurrentStage(chapter);
      const settings = RevisionEngineService.getDefaultSettings();
      let intervalDays = settings.intervals.revision1;
      if (currentStage === 'DPP Complete' || currentStage === 'Revision 1') {
        intervalDays = settings.intervals.revision1;
      } else if (currentStage === 'Revision 2') {
        intervalDays = settings.intervals.revision2;
      } else if (currentStage === 'Revision 3') {
        intervalDays = settings.intervals.revision3;
      } else if (currentStage === 'PYQs') {
        intervalDays = settings.intervals.revision4;
      } else if (currentStage === 'Mock Test') {
        intervalDays = settings.intervals.revision5;
      }
      const daysSinceLast = chapter.lastRevisionDaysAgo ?? 0;
      if (daysSinceLast >= intervalDays || chapter.confidence < 60) {
        status = 'Revision Due';
      }
    }

    const statusInfo = { status };

    return {
        mastery,
        masteryExplanation,
        mistakeScore,
        mistakeExplanation,
        isUnlocked,
        lockedBy,
        nextAction,
        lectureProgress: chapter.totalLectures > 0 ? Math.round((chapter.currentLecture / chapter.totalLectures) * 100) : (chapter.theoryComplete ? 100 : 0),
        completion: chapter.completion,
        masteryTier,
        statusInfo,
        estimatedRemainingTime: this.getEstimatedRemainingTime(chapter),
        activeMistakes,
        dppComplete: chapter.dppComplete,
        formulaComplete: chapter.formulaComplete,
        pyqsComplete: chapter.pyqsComplete,
        revisionCount: chapter.revisionCount || 0,
        weightage: chapter.weightage || 5,
        difficulty: chapter.difficulty || 'Medium'
    };
  },

  getNextAction(chapter: Chapter, mastery: number) {
    if (mastery === 100) {
      return {
        label: 'Chapter Mastered',
        action: 'complete',
        description: 'You have attained full mastery. Wait for the spaced repetition algorithm to schedule the next review.'
      };
    }
    if (!chapter.theoryComplete) {
      return {
        label: 'Watch Theory Lectures',
        action: 'theory',
        description: 'Complete the foundational video lectures to build conceptual clarity.'
      };
    }
    if (!chapter.formulaComplete) {
      return {
        label: 'Memorize Formulas',
        action: 'formula',
        description: 'Review core formulas, theory concepts, and key derivations.'
      };
    }
    if (!chapter.dppComplete) {
      return {
        label: 'Finish DPP Exercises',
        action: 'dpp',
        description: 'Solve the chapter Daily Practice Problem (DPP) worksheet to solidify mechanics.'
      };
    }
    if (!chapter.pyqsComplete) {
      return {
        label: 'Solve Chapter PYQs',
        action: 'pyqs',
        description: 'Practice 10-year JEE Previous Year Questions (PYQs) under timed bounds.'
      };
    }
    if ((chapter.revisionCount || 0) < 1) {
      return {
        label: 'Start Spaced Revision 1',
        action: 'revision',
        description: 'Engage in active recall and formula rehearsal to retain concepts.'
      };
    }
    if (chapter.solvedQuestions < 100) {
      return {
        label: `Solve ${Math.min(20, 100 - chapter.solvedQuestions)} Practice Qs`,
        action: 'practice',
        description: 'Perform focused chapter practice to reach standard target of 100+ questions.'
      };
    }
    if ((chapter.revisionCount || 0) < 2) {
      return {
        label: 'Perform Spaced Revision 2',
        action: 'revision',
        description: 'Deploy second spacing interval review to guard against the forgetting curve.'
      };
    }
    if (mastery < 90) {
      return {
        label: 'Attempt Sectional Mock Test',
        action: 'mock',
        description: 'Your mastery is almost there. Take a timed sectional mock to identify remaining weak spots.'
      };
    }
    
    return {
      label: 'Chapter Mastered',
      action: 'complete',
      description: 'You have attained full mastery. Wait for the spaced repetition algorithm to schedule the next review.'
    };
  },

  
  // ==========================================
  // REAL ENGINE INTEGRATIONS
  // ==========================================

  getDashboardSummary(chapters: Chapter[], targetYear: string) {
    if (!chapters || chapters.length === 0) return null;
    const pComp = this.calculateSubjectCompletion(chapters, 'physics').percentage;
    const cComp = this.calculateSubjectCompletion(chapters, 'chemistry').percentage;
    const mComp = this.calculateSubjectCompletion(chapters, 'maths').percentage;
    
    return {
      syllabusCompletion: Math.round((pComp + cComp + mComp) / 3),
      daysUntilExam: this.getDaysUntilExam(targetYear),
    };
  },

  getTodayMission(chapters: Chapter[], dailyQuota: number, studySessions?: StudySession[], todayMissions?: TodayMission[], mistakes?: Mistake[]): TodayMission[] {
    if (!chapters || chapters.length === 0) return [];
    const syllabus = createSyllabusGraph(chapters);
    const knowledgeEngine = new KnowledgeEngine(syllabus);
    const planner = new PlannerEngine(knowledgeEngine);
    
    const progress: Record<string, any> = {};
    chapters.forEach(c => {
      progress[c.id] = {
        chapterId: c.id,
        chapterName: c.name,
        subject: c.subject,
        unit: c.unit,
        weightage: c.weightage,
        difficulty: c.difficulty,
        status: c.status,
        completion: c.completion,
        isMastered: c.status === 'Mastered',
        currentLecture: c.currentLecture || 0,
        totalLectures: c.totalLectures || 1,
        theoryComplete: c.theoryComplete || false,
        dppComplete: c.dppComplete || false,
        pyqsComplete: c.pyqsComplete || false,
        masteryScore: c.completion || 0,
        recentMistakesCount: 0,
        averageTimePerQuestion: 0,
        lastStudiedDate: new Date().toISOString(),
        conceptConnections: []
      };
    });
    
    const input: PlannerInput = {
      studyHours: dailyQuota || 4,
      chapterTelemetryMap: progress,
      revisionBacklog: [],
      userPreferences: { targetYear: '2025' },
      remainingDaysUntilJEE: 100,
      studySessions,
      todayMissions,
      chapters,
      mistakes
    };
    
    const plannerOutput = planner.generateDailyPlan(input);
    const missions: TodayMission[] = plannerOutput.todaysMission.map(t => ({
      id: t.id,
      subject: t.subjectId,
      chapter: t.chapterName,
      type: t.type,
      taskName: t.taskName,
      duration: t.duration,
      completed: false,
      xp: Math.round(t.priorityScore * 10),
      unlocked: true,
      priorityScore: t.priorityScore,
      expectedMarksGain: t.expectedMarksGain,
      expectedLearningGain: t.expectedLearningGain,
      dependencyValue: t.dependencyValue,
      revisionContribution: t.revisionContribution,
      selectionReason: t.selectionReason
    }));
    
    return missions;
  },

  getCompletionPrediction(chapters: Chapter[], targetCompletionDate: string, actualStudyHours: number[]) {
    if (!chapters || chapters.length === 0) return null;
    const syllabus = createSyllabusGraph(chapters);
    const knowledgeEngine = new KnowledgeEngine(syllabus);
    const optimization = new OptimizationEngine(knowledgeEngine);
    
    const progress: Record<string, any> = {};
    chapters.forEach(c => {
      progress[c.id] = {
        chapterId: c.id,
        chapterName: c.name,
        subject: c.subject,
        unit: c.unit,
        weightage: c.weightage,
        difficulty: c.difficulty,
        status: c.status,
        completion: c.completion,
        isMastered: c.status === 'Mastered',
        currentLecture: c.currentLecture || 0,
        totalLectures: c.totalLectures || 1,
        theoryComplete: c.theoryComplete || false,
        dppComplete: c.dppComplete || false,
        pyqsComplete: c.pyqsComplete || false,
        masteryScore: c.completion || 0,
        recentMistakesCount: 0,
        averageTimePerQuestion: 0,
        lastStudiedDate: new Date().toISOString(),
        conceptConnections: []
      };
    });

    const plannerInput: PlannerInput = {
      studyHours: 4,
      chapterTelemetryMap: progress,
      revisionBacklog: [],
      userPreferences: { targetYear: '2025' },
      remainingDaysUntilJEE: 100,
      chapters
    };

    const input: OptimizationInput = {
      plannerInput,
      targetCompletionDate,
      actualStudyHoursPastWeek: actualStudyHours.length ? actualStudyHours : [4, 4, 4, 4, 4, 4, 4],
      skippedTasks: []
    };

    try {
      return optimization.optimize(input);
    } catch(err) {
      return null;
    }
  },

  
  getAnalyticsSnapshot(chapters: Chapter[], sessions: StudySession[], mocks: MockResult[], mistakes: Mistake[], currentDate?: string) {
    const engine = new AnalyticsEngine();
    const input: AnalyticsInput = {
      chapters,
      sessions,
      mocks,
      mistakes,
      currentDate
    };
    return engine.generateAnalytics(input);
  },

  async getCoachAnalysis(mission: TodayMission[], weakTopics: Mistake[], revisionQueue: Chapter[], plannerDecisions: any[], analyticsSummary: any) {
    const engine = new CoachEngine();
    const input: CoachInput = {
      mission,
      weakTopics,
      revisionQueue,
      plannerDecisions,
      analyticsSummary
    };
    return await engine.getAnalysis(input);
  },

  getRevisionQueue(chapters: Chapter[], mistakes: Mistake[], settings: any): any[] {
    return RevisionEngineService.generateRevisionQueue(chapters, mistakes, settings);
  },

  // Remaining utility functions that were already there
  getEstimatedRemainingTime(chapter: Chapter): number {
    const acad = getAcademicState(chapter);
    return acad.estimatedRemainingTimeHours;
  },

  calculateSubjectCompletion(chapters: Chapter[], subject: SubjectId): { total: number, completed: number, percentage: number } {
    const subjChaps = chapters.filter(c => c.subject === subject);
    const total = subjChaps.length;
    const completed = subjChaps.filter(c => c.completion === 100).length;
    const percentage = total > 0 
      ? Math.round(subjChaps.reduce((acc, curr) => acc + curr.completion, 0) / total)
      : 0;
    return { total, completed, percentage };
  },

  getDaysUntilExam(targetYear: string, examType: 'JEE Main' | 'JEE Advanced' = 'JEE Main'): number {
    const targetYearNum = parseInt(targetYear) || 2027;
    // JEE Main Session 1 is in January (Jan 24th). JEE Advanced is in May (May 30th).
    const targetDate = examType === 'JEE Main' 
      ? new Date(targetYearNum, 0, 24)
      : new Date(targetYearNum, 4, 30);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  },

  sortChaptersByRecommendation(chapters: Chapter[], mistakes: Mistake[]): Chapter[] {
    return [...chapters].sort((a, b) => {
      const aMistakes = mistakes.filter(m => m.chapter === a.name && m.revisionStatus !== 'Mastered').length;
      const bMistakes = mistakes.filter(m => m.chapter === b.name && m.revisionStatus !== 'Mastered').length;
      const aMastery = this.calculateMastery(a, aMistakes).score;
      const bMastery = this.calculateMastery(b, bMistakes).score;
      
      if (aMastery !== bMastery) return aMastery - bMastery;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.completion - a.completion;
    });
  },

  sortChaptersByPriority(chapters: Chapter[]): Chapter[] {
    return [...chapters].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.completion - b.completion;
    });
  },

  calculateTimeInvested(chapter: Chapter): number {
    return Math.round((chapter.currentLecture * 1.5 + (chapter.solvedQuestions * 0.05) + (chapter.revisionCount || 0) * 0.75) * 10) / 10;
  },

  calculateProjectedAccuracy(chapter: Chapter): number {
    return Math.min(98, 60 + Math.round(chapter.confidence * 0.35));
  },

  calculateProjectedPercentile(chapter: Chapter): number {
    return Math.min(100, 55 + Math.round(chapter.confidence * 0.45));
  }
};
