import { SubjectId, Chapter } from '@/types/index';
import { ChapterInfoInput, ChapterTelemetry, ChapterStrategyRadar, ChapterInfographicsData } from './types';
import { getAcademicState } from '@/utils/academicState';
import { StudyBrainService } from '@/services/studyBrainService';

export class ChapterInfoEngine {
  private cache: Map<string, ChapterTelemetry> = new Map();
  private inputHash: string = '';

  /**
   * Compute or return cached chapter telemetry for all chapters
   */
  public generateChapterTelemetry(input: ChapterInfoInput): Record<string, ChapterTelemetry> {
    const newHash = this.computeInputHash(input);
    if (this.inputHash === newHash && this.cache.size > 0) {
      const result: Record<string, ChapterTelemetry> = {};
      this.cache.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    this.inputHash = newHash;
    this.cache.clear();

    const telemetryMap: Record<string, ChapterTelemetry> = {};

    input.chapters.forEach(chapter => {
      const acad = getAcademicState(chapter);
      const unresolvedMistakes = input.mistakes.filter(m => m.chapter === chapter.name && m.revisionStatus !== 'Mastered');
      const mastery = StudyBrainService.calculateMastery(chapter, unresolvedMistakes.length);

      const isStarted = (chapter.completion > 0 && chapter.completion < 100) || 
                        (chapter.currentLecture && chapter.currentLecture > 0) || 
                        chapter.theoryComplete ||
                        chapter.hasTelemetry;
                        
      const isMastered = chapter.status === 'Mastered' || chapter.completion === 100;
      const syllabusStage: 'Not Started' | 'In Progress' | 'Mastered' = isMastered ? 'Mastered' : isStarted ? 'In Progress' : 'Not Started';

      const weightage = chapter.weightage || 4.0;
      const weightageRank: 'Tier 1' | 'Tier 2' | 'Tier 3' = weightage >= 6.0 ? 'Tier 1' : weightage >= 4.0 ? 'Tier 2' : 'Tier 3';

      const theoryPct = chapter.theoryComplete ? 100 : Math.round(((chapter.currentLecture || 0) / (chapter.totalLectures || 12)) * 100);
      const dppPct = chapter.dppComplete ? 100 : (chapter.practiceProgress?.dppPercent || 0);
      const pyqPct = chapter.pyqsComplete ? 100 : (chapter.practiceProgress?.pyqPercent || 0);

      const retentionConfidence: 'High' | 'Medium' | 'Low' = acad.revisionState?.retentionConfidence || 'High';
      const retentionConfidenceScore = retentionConfidence === 'High' ? 90 : retentionConfidence === 'Medium' ? 70 : 40;

      let isBottleneck = false;
      let bottleneckReason: string | undefined = undefined;

      if (isStarted && !isMastered) {
        if (chapter.currentLecture && chapter.currentLecture < (chapter.totalLectures || 12)) {
          isBottleneck = true;
          bottleneckReason = `${chapter.subject.toUpperCase()} ${chapter.name}: Lecture ${chapter.currentLecture}/${chapter.totalLectures || 12} backlog`;
        } else if (!chapter.dppComplete) {
          isBottleneck = true;
          bottleneckReason = `${chapter.subject.toUpperCase()} ${chapter.name}: DPP practice pending`;
        } else if (!chapter.pyqsComplete) {
          isBottleneck = true;
          bottleneckReason = `${chapter.subject.toUpperCase()} ${chapter.name}: PYQs drill pending`;
        } else if (unresolvedMistakes.length >= 3) {
          isBottleneck = true;
          bottleneckReason = `${chapter.subject.toUpperCase()} ${chapter.name}: ${unresolvedMistakes.length} unresolved errors`;
        }
      }

      let severity: 'Critical' | 'Moderate' | 'Low' | 'None' = isBottleneck ? 'Moderate' : 'None';
      if (isBottleneck && input.settings?.targetYear) {
        const targetYear = parseInt(input.settings.targetYear);
        const currentYear = new Date().getFullYear();
        if (targetYear <= currentYear + 1 && (weightageRank === 'Tier 1' || chapter.difficulty === 'Hard' || chapter.unit?.toLowerCase().includes('basic') || chapter.unit?.toLowerCase().includes('prerequisite'))) {
          severity = 'Critical';
          bottleneckReason = `[WARNING: Exam Near] ${bottleneckReason}`;
        } else if (targetYear > currentYear + 1) {
          severity = 'Low';
        }
      }

      const strategyRadar: ChapterStrategyRadar = {
        masteryScore: mastery.score,
        theoryCompletionPercent: theoryPct,
        dppCompletionPercent: dppPct,
        pyqCompletionPercent: pyqPct,
        retentionConfidenceScore,
        jeeWeightageRank: weightageRank,
        examWeightagePercent: weightage,
        bottleneckSeverity: severity
      };

      const infographics: ChapterInfographicsData = {
        chapterId: chapter.id,
        chapterName: chapter.name,
        subject: chapter.subject,
        unit: chapter.unit || 'Core Module',
        masteryScore: mastery.score,
        syllabusStage,
        currentLecture: chapter.currentLecture || 0,
        totalLectures: chapter.totalLectures || 12,
        theoryComplete: chapter.theoryComplete || false,
        dppComplete: chapter.dppComplete || false,
        pyqsComplete: chapter.pyqsComplete || false,
        isMastered,
        weightagePercent: weightage,
        retentionConfidence,
        unresolvedMistakesCount: unresolvedMistakes.length
      };

      const telemetry: ChapterTelemetry = {
        chapterId: chapter.id,
        chapterName: chapter.name,
        subject: chapter.subject,
        unit: chapter.unit || 'Core Module',
        masteryScore: mastery.score,
        syllabusStage,
        currentLecture: chapter.currentLecture || 0,
        totalLectures: chapter.totalLectures || 12,
        theoryComplete: chapter.theoryComplete || false,
        dppComplete: chapter.dppComplete || false,
        pyqsComplete: chapter.pyqsComplete || false,
        isMastered,
        weightagePercent: weightage,
        retentionConfidence,
        unresolvedMistakesCount: unresolvedMistakes.length,
        strategyRadar,
        infographics,
        isBottleneck,
        bottleneckReason
      };

      this.cache.set(chapter.id, telemetry);
      telemetryMap[chapter.id] = telemetry;
    });

    return telemetryMap;
  }

  public getChapterTelemetry(chapterId: string): ChapterTelemetry | null {
    return this.cache.get(chapterId) || null;
  }

  public getAllChapterTelemetry(): Record<string, ChapterTelemetry> {
    const result: Record<string, ChapterTelemetry> = {};
    this.cache.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  public getSubjectChapterTelemetry(subjectId: SubjectId): ChapterTelemetry[] {
    return Array.from(this.cache.values()).filter(t => t.subject === subjectId);
  }

  public getChapterBottlenecks(input?: ChapterInfoInput): string[] {
    const map = input ? this.generateChapterTelemetry(input) : this.getAllChapterTelemetry();
    const list: string[] = [];
    Object.values(map).forEach(t => {
      if (t.isBottleneck && t.bottleneckReason) {
        list.push(t.bottleneckReason);
      }
    });
    return list.slice(0, 3);
  }

  public getStrategyRadar(chapterName: string, subject: SubjectId, input?: ChapterInfoInput): ChapterStrategyRadar {
    if (input) {
      this.generateChapterTelemetry(input);
    }

    for (const telemetry of this.cache.values()) {
      if (
        telemetry.subject === subject &&
        (telemetry.chapterName.toLowerCase() === chapterName.toLowerCase() || telemetry.chapterId === chapterName)
      ) {
        return telemetry.strategyRadar;
      }
    }

    return {
      masteryScore: 65,
      theoryCompletionPercent: 70,
      dppCompletionPercent: 50,
      pyqCompletionPercent: 40,
      retentionConfidenceScore: 75,
      jeeWeightageRank: 'Tier 2',
      examWeightagePercent: 4.5,
      bottleneckSeverity: 'None'
    };
  }

  public invalidateCache(): void {
    this.inputHash = '';
    this.cache.clear();
  }

  private computeInputHash(input: ChapterInfoInput): string {
    const chapSig = input.chapters.map(c => `${c.id}:${c.completion}:${c.currentLecture}:${c.totalLectures}:${c.theoryComplete}:${c.dppComplete}:${c.pyqsComplete}:${c.status}:${c.confidence}:${c.weightage}:${c.solvedQuestions}:${c.lastRevisionDaysAgo}`).join('|');
    const mistakeSig = input.mistakes.map(m => `${m.id}:${(m as any).status}:${m.revisionStatus}`).join('|');
    const sessionCount = input.sessions.length;
    const mockCount = input.mocks.length;
    return `${chapSig}_m${mistakeSig}_s${sessionCount}_mk${mockCount}`;
  }
}
