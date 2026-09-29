import { StudySession, Chapter, SubjectId, Mistake, TodayMission } from '@/types/index';
import { calculateLevelFromXP, getTitleAndColor } from '@/utils/levelingCalculations';
import { KnowledgeEngine, SyllabusNode, calculateMastery } from '@jee-os/engines';
import { PlannerEngine, PlannerInput } from '@jee-os/engines';
import { OptimizationEngine, OptimizationInput } from '@jee-os/engines';
import { RevisionEngineService } from './revisionEngineService';
import { MockResult } from '@/types/index';
import { AnalyticsEngine, AnalyticsInput } from '@jee-os/engines';
import { CoachEngine, CoachInput } from '@jee-os/engines';
import { calculateMistakeScore } from '@/utils/mistakeIntelligence';
import { getAcademicState } from '@jee-os/engines';

export function createSyllabusGraph(chapters: Chapter[]): SyllabusNode[] {
  const nameToId = new Map<string, string>();
  chapters.forEach(c => {
    nameToId.set(c.name, c.id);
  });
  
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
    return getTitleAndColor(level);
  },
  
  calculateLevel(totalXP: number) {
    return calculateLevelFromXP(totalXP);
  }
};

export const StudyBrainService = {
  // 1. Mastery Calculation (Delegated to @jee-os/engines canonical implementation)
  calculateMastery(chapter: Chapter, chapterMistakesCount: number): { score: number; explanation: string } {
    return calculateMastery(chapter, chapterMistakesCount);
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
      allChapters.forEach(c => {
        nameToId.set(c.name, c.id);
      });
      
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

  getTodayMission(chapters: Chapter[], dailyQuota: number, studySessions?: StudySession[], todayMissions?: TodayMission[], mistakes?: Mistake[], targetYear?: string): TodayMission[] {
    if (!chapters || chapters.length === 0) return [];
    const syllabus = createSyllabusGraph(chapters);
    const knowledgeEngine = new KnowledgeEngine(syllabus);
    const planner = new PlannerEngine(knowledgeEngine);
    
    const progress: Record<string, any> = {};
    chapters.forEach(c => {
      // Find the most recent session for this chapter
      const chapterSessions = studySessions?.filter(s => s.chapterId === c.id) || [];
      chapterSessions.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
      const lastSessionDate = chapterSessions.length > 0 
        ? chapterSessions[0].endTime 
        : new Date(0).toISOString(); // Epoch if never studied

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
        lastStudiedDate: lastSessionDate,
        conceptConnections: []
      };
    });
    
    const input: PlannerInput = {
      studyHours: dailyQuota || 4,
      chapterTelemetryMap: progress,
      revisionBacklog: [],
      userPreferences: { targetYear: targetYear || new Date().getFullYear().toString() },
      remainingDaysUntilJEE: this.getDaysUntilExam(targetYear || new Date().getFullYear().toString()),
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
      xp: Math.round(t.priorityScore),
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

  getCompletionPrediction(chapters: Chapter[], targetCompletionDate: string, actualStudyHours: number[], targetYear?: string) {
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
        lastStudiedDate: new Date(0).toISOString(),
        conceptConnections: []
      };
    });

    const plannerInput: PlannerInput = {
      studyHours: 4,
      chapterTelemetryMap: progress,
      revisionBacklog: [],
      userPreferences: { targetYear: targetYear || new Date().getFullYear().toString() },
      remainingDaysUntilJEE: this.getDaysUntilExam(targetYear || new Date().getFullYear().toString()),
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
      console.error('[StudyBrainService] OptimizationEngine failed:', err);
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
    const subjChaps = (chapters || []).filter(c => c && c.subject === subject);
    const total = subjChaps.length;
    const completed = subjChaps.filter(c => {
      const comp = typeof c.completion === 'number' && !Number.isNaN(c.completion) ? c.completion : 0;
      return comp >= 100 || c.status === 'Mastered';
    }).length;
    const totalCompletion = subjChaps.reduce((acc, curr) => {
      const comp = typeof curr?.completion === 'number' && !Number.isNaN(curr.completion) ? curr.completion : 0;
      return acc + Math.min(100, Math.max(0, comp));
    }, 0);
    const rawPct = total > 0 ? Math.round(totalCompletion / total) : 0;
    const percentage = Number.isNaN(rawPct) ? 0 : Math.min(100, Math.max(0, rawPct));
    return { total, completed, percentage };
  },

  getDaysUntilExam(targetYear: string, examType: 'JEE Main' | 'JEE Advanced' = 'JEE Main'): number {
    let targetYearNum = parseInt(targetYear, 10) || 2027;
    // JEE Main Session 1 is in January (Jan 24th). JEE Advanced is in May (May 30th).
    let targetDate = examType === 'JEE Main' 
      ? new Date(targetYearNum, 0, 24)
      : new Date(targetYearNum, 4, 30);
    const today = new Date();
    
    // If the exam date for the target year has already passed, roll over to the next year
    while (targetDate.getTime() < today.getTime()) {
      targetYearNum += 1;
      targetDate = examType === 'JEE Main' 
        ? new Date(targetYearNum, 0, 24)
        : new Date(targetYearNum, 4, 30);
    }
    
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  },

  sortChaptersByRecommendation(chapters: Chapter[], mistakes: Mistake[]): Chapter[] {
    const mistakeCounts = new Map<string, number>();
    for (const m of mistakes) {
      if (m.revisionStatus !== 'Mastered' && m.chapter) {
        mistakeCounts.set(m.chapter, (mistakeCounts.get(m.chapter) || 0) + 1);
      }
    }

    return [...chapters].sort((a, b) => {
      const aMistakes = mistakeCounts.get(a.name) || 0;
      const bMistakes = mistakeCounts.get(b.name) || 0;
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
