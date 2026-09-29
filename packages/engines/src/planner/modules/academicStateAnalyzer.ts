import { KnowledgeEngine, ProgressState } from '../../knowledge';
import { PlannerInput } from '../types';
import { SubjectId, Chapter } from '../../types/index';

export function normalizeStageAlias(stage?: string): string | undefined {
  if (!stage) return stage;
  const normalized = stage.trim();
  if (normalized === 'Never Started' || normalized === 'Unknown') return 'Not Started';
  if (normalized === 'Doing Questions') return 'Solving DPPs';
  return normalized;
}

export interface AcademicAnalysisResult {
  totalChapters: number;
  mergedStateMap: Record<string, any>;
  chapterById: Map<string, Chapter>;
  academicStateOverview: string;
  detectedPrerequisiteGaps: string[];
  detectedRevisionDecay: string[];
  detectedWeakAreas: string[];
  mockRemediationSubject: SubjectId | null;
  mockRemediationReason: string;
  activeMonthlyObjective: string;
  progressStates: ProgressState[];
  mistakesByChapter: Map<string, number>;
}

export function analyzeAcademicState(
  input: PlannerInput,
  knowledgeEngine: KnowledgeEngine
): AcademicAnalysisResult {
  // =========================================================================
  // PIPELINE PHASE 1: ANALYZE CURRENT ACADEMIC STATE (SINGLE SOURCE OF TRUTH)
  // =========================================================================
  const chaptersList = input.chapters || [];
  const telemetryMap = input.chapterTelemetryMap || {};
  const totalChapters = chaptersList.length || 56;
  const chapterById = new Map(chaptersList.map(c => [c.id, c]));

  const mergedStateMap: Record<string, any> = {};
  const allNodesForState = knowledgeEngine.getAllNodes();
  for (const node of allNodesForState) {
    const chapterMeta = chapterById.get(node.id);
    const rawProg: any = telemetryMap[node.id] || {};
    mergedStateMap[node.id] = {
      ...rawProg,
      chapterId: node.id,
      completion: rawProg.masteryScore || chapterMeta?.completion || 0,
      theoryComplete: chapterMeta?.theoryComplete ?? rawProg.theoryComplete ?? false,
      currentLecture: chapterMeta?.currentLecture ?? rawProg.currentLecture ?? 0,
      totalLectures: chapterMeta?.totalLectures ?? rawProg.totalLectures ?? node.lectureCount ?? 12,
      dppComplete: chapterMeta?.dppComplete ?? rawProg.dppComplete ?? false,
      pyqsComplete: chapterMeta?.pyqsComplete ?? rawProg.pyqsComplete ?? false,
      avgLectureDuration: rawProg.avgLectureDuration || rawProg.lectureProgress?.avgLectureDurationMinutes || rawProg.estimatedDuration || undefined,
      isMastered: rawProg.isMastered || chapterMeta?.status === 'Mastered' || false,
      status: rawProg.status || chapterMeta?.status || 'Not Started',
      syllabusStage: rawProg.syllabusStage || chapterMeta?.syllabusStage || 'Not Started',
    };
  }

  let completedChaptersCount = 0;
  let totalCompletionSum = 0;

  chaptersList.forEach(c => {
    const prog = mergedStateMap[c.id] || {};
    const completion = prog.completion || 0;
    const stage = prog.syllabusStage;
    totalCompletionSum += completion;
    if (stage === 'Mastered') completedChaptersCount++;
  });

  const avgCompletion = totalChapters > 0 ? Math.round(totalCompletionSum / totalChapters) : 35;
  const academicStateOverview = `Analyzed ${totalChapters} chapters across Physics, Chemistry, and Maths. Overall syllabus completion: ${avgCompletion}%, ${completedChaptersCount} chapters mastered. Available study budget: ${input.studyHours} hours.`;

  // =========================================================================
  // PIPELINE PHASE 2: DETECT PREREQUISITE GAPS
  // =========================================================================
  const detectedPrerequisiteGaps: string[] = [];
  const nodeDependencyMap = new Map<string, string[]>();

  const allNodes = knowledgeEngine.getAllNodes();
  for (const node of allNodes) {
    const depTree = knowledgeEngine.getDependencyTree(node.id);
    nodeDependencyMap.set(node.id, depTree.map(id => knowledgeEngine.getNode(id)?.name || id));

    const rawProg = mergedStateMap[node.id];
    const isCompleted = rawProg ? (rawProg.isMastered || rawProg.theoryComplete || rawProg.completion > 60) : false;

    if (!isCompleted && node.prerequisites && node.prerequisites.length > 0) {
      for (const prereqId of node.prerequisites) {
        const prereqProg = mergedStateMap[prereqId];
        const prereqNode = knowledgeEngine.getNode(prereqId);
        if (prereqNode && (!prereqProg || (!prereqProg.theoryComplete && prereqProg.completion < 50))) {
          const prereqName = prereqNode?.name || prereqId;
          detectedPrerequisiteGaps.push(
            `${node.name} (${node.subject.toUpperCase()}) is blocked or at risk due to incomplete prerequisite ${prereqName}.`
          );
        }
      }
    }
  }

  // =========================================================================
  // PIPELINE PHASE 3: DETECT REVISION DECAY
  // =========================================================================
  const detectedRevisionDecay: string[] = [];
  const revisionBacklogList = input.revisionBacklog || [];

  for (const rev of revisionBacklogList) {
    const node = knowledgeEngine.getNode(rev.chapterId);
    const name = node ? node.name : rev.chapterId;
    if (rev.retentionScore < 60 || rev.daysOverdue > 10) {
      detectedRevisionDecay.push(
        `${name}: Retention score decayed to ${rev.retentionScore}% (${rev.daysOverdue} days overdue).`
      );
    }
  }

  if (input.chapters) {
    for (const chap of input.chapters) {
      const telemetry = mergedStateMap[chap.id] || {};
      const confidence = telemetry.retentionConfidence || 'High';
      if ((confidence === 'Medium' || confidence === 'Low') && !detectedRevisionDecay.some(d => d.includes(chap.name))) {
        detectedRevisionDecay.push(
          `${chap.name}: Retention confidence is ${confidence}.`
        );
      }
    }
  }

  // =========================================================================
  // PIPELINE PHASE 4: DETECT WEAK PERFORMANCE
  // =========================================================================
  const detectedWeakAreas: string[] = [];
  const mistakesList = input.mistakes || [];

  const mistakesByChapter = new Map<string, number>();
  for (const m of mistakesList) {
    if (m.revisionStatus !== 'Mastered') {
      const count = mistakesByChapter.get(m.chapter) || 0;
      mistakesByChapter.set(m.chapter, count + 1);
    }
  }

  for (const [chapName, count] of mistakesByChapter.entries()) {
    detectedWeakAreas.push(`${chapName}: ${count} active unresolved Error Book mistakes.`);
  }

  if (input.chapters) {
    for (const chap of input.chapters) {
      const telemetry = mergedStateMap[chap.id] || {};
      if (telemetry.unresolvedMistakesCount >= 3 && !detectedWeakAreas.some(w => w.includes(chap.name))) {
        detectedWeakAreas.push(`${chap.name}: ${telemetry.unresolvedMistakesCount} unresolved mistakes detected.`);
      }
    }
  }

  // =========================================================================
  // PIPELINE PHASE 4.5: MOCK EXAM REMEDIATION
  // =========================================================================
  let mockRemediationSubject: SubjectId | null = null;
  let mockRemediationReason = "";
  if (input.mocks && input.mocks.length > 0) {
    const latestMock = [...input.mocks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    let weakestSub: SubjectId | null = null;
    let lowestAccuracy = 100;
    
    for (const [sub, data] of Object.entries(latestMock.subjectBreakdown)) {
      if (data.attempted > 0) {
        const acc = (data.correct / data.attempted) * 100;
        if (acc < lowestAccuracy && acc < 50) {
          lowestAccuracy = acc;
          weakestSub = sub as SubjectId;
        }
      }
    }
    
    if (weakestSub) {
      mockRemediationSubject = weakestSub;
      mockRemediationReason = `Recent Mock "${latestMock.title}" showed ${Math.round(lowestAccuracy)}% accuracy in ${weakestSub}. Remediation required to patch structural knowledge gaps before next exam.`;
      detectedWeakAreas.push(`CRITICAL: Mock Exam weakness detected in ${weakestSub} (${Math.round(lowestAccuracy)}% accuracy).`);
    }
  }

  // =========================================================================
  // PIPELINE PHASE 5: DETECT CURRENT MONTHLY OBJECTIVE
  // =========================================================================
  let activeMonthlyObjective = "Maximize high-yield syllabus coverage and resolve foundational gaps.";
  if (input.monthlyObjectives && input.monthlyObjectives.length > 0) {
    const currentObj = input.monthlyObjectives.find(o => o.status === 'in_progress') || input.monthlyObjectives[0];
    if (currentObj) {
      activeMonthlyObjective = `${currentObj.title}: ${currentObj.description || 'Focus on high-yield mastery.'}`;
    }
  } else if (input.userPreferences?.focusSubject) {
    activeMonthlyObjective = `Focus Subject: Accelerate ${input.userPreferences.focusSubject.toUpperCase()} progression.`;
  }

  const progressStates: ProgressState[] = Object.values(mergedStateMap).map((data: any) => ({
    chapterId: data.chapterId,
    completion: data.completion,
    isMastered: data.isMastered,
    theoryComplete: data.theoryComplete,
    dppComplete: data.dppComplete,
    pyqsComplete: data.pyqsComplete
  }));

  return {
    totalChapters,
    mergedStateMap,
    chapterById,
    academicStateOverview,
    detectedPrerequisiteGaps,
    detectedRevisionDecay,
    detectedWeakAreas,
    mockRemediationSubject,
    mockRemediationReason,
    activeMonthlyObjective,
    progressStates,
    mistakesByChapter
  };
}
