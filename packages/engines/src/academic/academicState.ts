import { 
  Chapter, 
  ChapterAcademicState, 
  SyllabusDiagnosisStage, 
  LectureProgress, 
  PracticeProgress, 
  RevisionState,
  SubjectId 
} from '../types/index';

export interface IntelligentFollowUpQuestion {
  id: string;
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  questionText: string;
  fieldToUpdate: string;
  suggestedType: 'text' | 'number' | 'select';
  options?: string[];
  contextReason: string;
}

/**
  Extracts and normalizes the central Academic State for a given chapter.
  Reads from all fields (top-level or nested), enforcing consistency across the system.
 */
export function getAcademicState(chapter: Chapter): ChapterAcademicState {
  // 1. Determine Stage
  let stage: SyllabusDiagnosisStage = chapter.syllabusStage || (
    chapter.completion >= 100 || chapter.status === 'Mastered' ? 'Mastered' :
    chapter.completion > 80 || chapter.status === 'Revision Due' ? 'Revision' :
    chapter.pyqsComplete ? 'Solving PYQs' :
    chapter.dppComplete ? 'Solving DPPs' :
    chapter.theoryComplete || chapter.currentLecture > 0 ? 'Watching Lectures' :
    'Not Started'
  );
  if (stage === 'Unknown') {
    stage = 'Not Started';
  }

  // 2. Lecture Progress
  const totalLects = (typeof chapter.totalLectures === 'number' && chapter.totalLectures > 0)
    ? chapter.totalLectures
    : ((typeof chapter.lectureProgress?.totalLectures === 'number' && chapter.lectureProgress.totalLectures > 0)
      ? chapter.lectureProgress.totalLectures
      : 10);
  // BUG-14: Prioritize explicitly updated top-level currentLecture over potentially stale nested lectureProgress
  const rawCompLects = typeof chapter.currentLecture === 'number' && !Number.isNaN(chapter.currentLecture)
    ? chapter.currentLecture
    : (typeof chapter.lectureProgress?.completedLectures === 'number' && !Number.isNaN(chapter.lectureProgress.completedLectures)
      ? chapter.lectureProgress.completedLectures
      : (stage === 'Mastered' ? totalLects : 0));
  const compLects = Math.min(totalLects, Math.max(0, rawCompLects));
  const avgDur = (typeof chapter.lectureProgress?.avgLectureDurationMinutes === 'number' && chapter.lectureProgress.avgLectureDurationMinutes > 0)
    ? chapter.lectureProgress.avgLectureDurationMinutes
    : 75;
  const remainingLects = Math.max(0, totalLects - compLects);
  const estLectHours = Math.round((remainingLects * avgDur / 60) * 10) / 10;

  const lectureProgress: LectureProgress = {
    teacher: chapter.lectureProgress?.teacher || undefined,
    lectureSeries: chapter.lectureProgress?.lectureSeries || undefined,
    totalLectures: totalLects,
    completedLectures: compLects,
    avgLectureDurationMinutes: avgDur,
    estimatedRemainingHours: estLectHours
  };

  // 3. Practice Progress
  const dppComp = chapter.practiceProgress?.dppCompleted ?? (!!chapter.dppComplete);
  const pyqComp = chapter.practiceProgress?.pyqsCompleted ?? (!!chapter.pyqsComplete);
  const modComp = chapter.practiceProgress?.moduleCompleted ?? false;

  const dppPct = chapter.practiceProgress?.dppPercent ?? (dppComp === true ? 100 : dppComp === 'Partial' ? 50 : 0);
  const pyqPct = chapter.practiceProgress?.pyqPercent ?? (pyqComp === true ? 100 : pyqComp === 'Partial' ? 50 : 0);
  const modPct = chapter.practiceProgress?.modulePercent ?? (modComp === true ? 100 : modComp === 'Partial' ? 50 : 0);
  const accuracy = chapter.practiceProgress?.accuracyPercent ?? (chapter.confidence ? chapter.confidence : 70);

  const practiceProgress: PracticeProgress = {
    dppCompleted: dppComp,
    pyqsCompleted: pyqComp,
    moduleCompleted: modComp,
    dppPercent: dppPct,
    modulePercent: modPct,
    pyqPercent: pyqPct,
    accuracyPercent: accuracy,
    confidencePercent: chapter.confidence || accuracy,
    mockTestsAttempted: chapter.practiceProgress?.mockTestsAttempted || 0,
    weakTopics: chapter.practiceProgress?.weakTopics || []
  };

  // 4. Revision State
  const lastRevDate = chapter.lastRevisedAt || chapter.revisionProgress?.lastRevisedAt;
  const computedDaysAgoFromDate = lastRevDate 
    ? Math.max(0, Math.floor((Date.now() - new Date(lastRevDate).getTime()) / (1000 * 60 * 60 * 24)))
    : undefined;
  const daysAgo = computedDaysAgoFromDate ?? chapter.revisionProgress?.lastRevisedDaysAgo ?? chapter.lastRevisionDaysAgo ?? 14;
  
  const retentionConfidence: 'High' | 'Medium' | 'Low' = 
    (daysAgo <= 1) ? 'High' :
    chapter.revisionProgress?.retentionConfidence || 
    (stage === 'Not Started' ? 'High' : 
     chapter.confidence !== undefined && chapter.confidence > 0
      ? (chapter.confidence >= 80 ? 'High' : chapter.confidence >= 50 ? 'Medium' : 'Low')
      : (daysAgo <= 7 ? 'High' : daysAgo <= 21 ? 'Medium' : 'Low'));
  
  const retentionScore = (stage === 'Not Started') ? 0 : (chapter.retentionScore ?? (retentionConfidence === 'High' ? 90 : retentionConfidence === 'Medium' ? 65 : 40));

  const revisionState: RevisionState = {
    lastRevisedDaysAgo: stage === 'Not Started' ? 0 : daysAgo,
    retentionConfidence,
    formulaMemoryPercent: chapter.revisionProgress?.formulaMemoryPercent || (retentionScore > 75 ? 85 : 60),
    questionSolvingConfidencePercent: chapter.revisionProgress?.questionSolvingConfidencePercent || accuracy,
    needRevision: stage !== 'Not Started' && (daysAgo > 14 || retentionScore < 60),
    retentionScore,
    lastRevisedAt: chapter.lastRevisedAt || chapter.revisionProgress?.lastRevisedAt
  };

  // 5. Calculate Overall Completion %
  // Theory (35%) + DPP (20%) + Module (15%) + PYQs (20%) + Revision (10%)
  const theoryWeight = totalLects > 0 ? (compLects / totalLects) * 35 : (chapter.theoryComplete ? 35 : 0);
  const safeDppPct = typeof dppPct === 'number' && !Number.isNaN(dppPct) ? dppPct : 0;
  const safeModPct = typeof modPct === 'number' && !Number.isNaN(modPct) ? modPct : 0;
  const safePyqPct = typeof pyqPct === 'number' && !Number.isNaN(pyqPct) ? pyqPct : 0;
  const safeRetentionScore = typeof retentionScore === 'number' && !Number.isNaN(retentionScore) ? retentionScore : 0;

  const dppWeight = (safeDppPct / 100) * 20;
  const modWeight = (safeModPct / 100) * 15;
  const pyqWeight = (safePyqPct / 100) * 20;
  const revWeight = (stage === 'Not Started') ? 0 : (safeRetentionScore / 100) * 10;
  const rawCompletion = theoryWeight + dppWeight + modWeight + pyqWeight + revWeight;
  const calculatedCompletion = Number.isNaN(rawCompletion) ? 0 : Math.min(100, Math.max(0, Math.round(rawCompletion)));

  // Remaining Practice Hours estimate (approx 0.1 hour per remaining question / module)
  const remainingPracticeHours = Math.round(((100 - pyqPct) * 0.05 + (100 - dppPct) * 0.03) * 10) / 10;
  const totalEstRemainingHours = Math.round((estLectHours + remainingPracticeHours) * 10) / 10;

  // 6. Detect Missing Info Fields
  const missingFields: string[] = [];
  if (stage !== 'Not Started') {
    if (!lectureProgress.teacher) missingFields.push('teacher');
    if (!lectureProgress.lectureSeries) missingFields.push('lectureSeries');
  }
  if (stage === 'Watching Lectures' || stage === 'Making Notes') {
    if (lectureProgress.totalLectures === 10 && compLects === 0) missingFields.push('exactLectureCount');
  }
  if (['Solving DPPs', 'Solving Modules', 'Solving PYQs', 'Revision', 'Mastered'].includes(stage)) {
    if (!chapter.practiceProgress?.accuracyPercent) missingFields.push('accuracyPercent');
  }
  if (['Revision', 'Mastered'].includes(stage)) {
    if (chapter.lastRevisionDaysAgo === undefined && !chapter.revisionProgress?.lastRevisedDaysAgo) missingFields.push('lastRevisedDaysAgo');
  }

  return {
    chapterId: chapter.id,
    chapterName: chapter.name,
    subject: chapter.subject,
    unit: chapter.unit || 'Core Module',
    syllabusStage: stage,
    lectureProgress,
    practiceProgress,
    revisionState,
    overallCompletion: calculatedCompletion,
    estimatedRemainingTimeHours: totalEstRemainingHours,
    hasMissingInfo: missingFields.length > 0,
    missingFields
  };
}

/**
  Synchronizes a Chapter object with its normalized Academic State so all properties stay 100% in sync.
 */
export function normalizeChapter(chapter: Chapter): Chapter {
  const isMastered = chapter.status === 'Mastered' || chapter.completion === 100 || (chapter.theoryComplete && chapter.dppComplete && chapter.pyqsComplete);
  
  // A chapter is ONLY unstarted if it has zero progress across all metrics AND hasn't been manually marked as Learning
  const isUnstarted = chapter.status !== 'Learning' && 
    (!chapter.currentLecture || chapter.currentLecture === 0) && 
    !chapter.theoryComplete && 
    !chapter.dppComplete && 
    !chapter.pyqsComplete && 
    (chapter.completion === 0 || chapter.completion === undefined) &&
    (!chapter.solvedQuestions || chapter.solvedQuestions === 0);

  let syllabusStage: SyllabusDiagnosisStage = chapter.syllabusStage || 'Not Started';
  
  if (chapter.status === 'Revision Due') {
    syllabusStage = 'Revision';
  } else if (isMastered) {
    syllabusStage = 'Mastered';
  } else if (isUnstarted) {
    syllabusStage = 'Not Started';
  } else if (chapter.pyqsComplete) {
    syllabusStage = 'Solving PYQs';
  } else if (chapter.dppComplete) {
    syllabusStage = 'Solving DPPs';
  } else if (chapter.theoryComplete || (chapter.currentLecture && chapter.currentLecture > 0)) {
    syllabusStage = 'Watching Lectures';
  } else if (chapter.status === 'Learning' && (syllabusStage === 'Not Started' || syllabusStage === 'Revision')) {
    syllabusStage = 'Watching Lectures'; 
  }

  const mappedStatus: Chapter['status'] = 
    chapter.status === 'Revision Due' ? 'Revision Due' :
    syllabusStage === 'Mastered' ? 'Mastered' :
    syllabusStage === 'Revision' ? 'Revision Due' :
    (syllabusStage === 'Not Started' && chapter.status !== 'Learning') ? 'Not Started' :
    chapter.status === 'Theory Complete' ? 'Theory Complete' :
    chapter.status === 'DPP Pending' ? 'DPP Pending' :
    chapter.status === 'PYQ Pending' ? 'PYQ Pending' :
    (chapter.theoryComplete && !chapter.dppComplete) ? 'Theory Complete' :
    (chapter.theoryComplete && chapter.dppComplete && !chapter.pyqsComplete) ? 'PYQ Pending' :
    'Learning';

  const acad = getAcademicState({ ...chapter, syllabusStage, status: mappedStatus });
  const safeOverallCompletion = typeof acad.overallCompletion === 'number' && !Number.isNaN(acad.overallCompletion)
    ? acad.overallCompletion
    : 0;
  const safeCompLects = typeof acad.lectureProgress.completedLectures === 'number' && !Number.isNaN(acad.lectureProgress.completedLectures)
    ? acad.lectureProgress.completedLectures
    : 0;

  return {
    ...chapter,
    status: mappedStatus,
    syllabusStage: syllabusStage,
    completion: mappedStatus === 'Not Started' ? 0 : safeOverallCompletion,
    currentLecture: mappedStatus === 'Not Started' ? 0 : safeCompLects,
    totalLectures: acad.lectureProgress.totalLectures || 10,
    theoryComplete: mappedStatus === 'Not Started' ? false : (syllabusStage === 'Mastered' || chapter.theoryComplete === true || (safeCompLects > 0 && safeCompLects >= acad.lectureProgress.totalLectures)),
    dppComplete: mappedStatus === 'Not Started' ? false : (chapter.dppComplete === true || acad.practiceProgress.dppCompleted === true || acad.practiceProgress.dppPercent === 100),
    pyqsComplete: mappedStatus === 'Not Started' ? false : (chapter.pyqsComplete === true || acad.practiceProgress.pyqsCompleted === true || acad.practiceProgress.pyqPercent === 100),
    confidence: typeof acad.practiceProgress.confidencePercent === 'number' && !Number.isNaN(acad.practiceProgress.confidencePercent) ? acad.practiceProgress.confidencePercent : 0,
    lastRevisionDaysAgo: mappedStatus === 'Not Started' ? 0 : (typeof acad.revisionState.lastRevisedDaysAgo === 'number' && !Number.isNaN(acad.revisionState.lastRevisedDaysAgo) ? acad.revisionState.lastRevisedDaysAgo : 0),
    lastRevisedAt: chapter.lastRevisedAt || acad.revisionState.lastRevisedAt || chapter.revisionProgress?.lastRevisedAt,
    nextRevisionDueAt: chapter.nextRevisionDueAt,
    revisionCount: typeof chapter.revisionCount === 'number' ? chapter.revisionCount : 0,
    sm2Interval: chapter.sm2Interval,
    sm2EaseFactor: chapter.sm2EaseFactor,
    flashcardStates: chapter.flashcardStates,
    estimatedRemainingTime: mappedStatus === 'Not Started' ? 0 : (typeof acad.estimatedRemainingTimeHours === 'number' && !Number.isNaN(acad.estimatedRemainingTimeHours) ? acad.estimatedRemainingTimeHours : 0),
    retentionScore: mappedStatus === 'Not Started' ? 90 : (acad.revisionState.retentionScore ?? 60),
    healthScore: mappedStatus === 'Not Started' ? 100 : Math.round((acad.practiceProgress.accuracyPercent * 0.6) + ((acad.revisionState.retentionScore ?? 60) * 0.4)),
    lectureProgress: acad.lectureProgress,
    practiceProgress: acad.practiceProgress,
    revisionProgress: acad.revisionState,
    serialNumber: chapter.serialNumber
  };
}

/**
  Generates targeted, non-intrusive intelligent follow-up questions for chapters missing key details.
 */
export function generateIntelligentFollowUpQuestions(
  chapters: Chapter[], 
  limit: number = 3
): IntelligentFollowUpQuestion[] {
  const questions: IntelligentFollowUpQuestion[] = [];

  // Filter active chapters (in progress or revision)
  const activeChapters = chapters.filter(c => {
    const stage = c.syllabusStage || 'Not Started';
    return stage !== 'Not Started' && stage !== 'Mastered';
  });

  for (const chap of activeChapters) {
    if (questions.length >= limit) break;
    const acad = getAcademicState(chap);

    if (acad.missingFields.includes('teacher')) {
      questions.push({
        id: `q-teacher-${chap.id}`,
        chapterId: chap.id,
        chapterName: chap.name,
        subject: chap.subject,
        questionText: `Which teacher or coaching batch are you following for ${chap.name}?`,
        fieldToUpdate: 'lectureProgress.teacher',
        suggestedType: 'text',
        contextReason: `Helps the AI Planner accurately estimate lecture duration and depth for ${chap.name}.`
      });
    } else if (acad.missingFields.includes('accuracyPercent')) {
      questions.push({
        id: `q-accuracy-${chap.id}`,
        chapterId: chap.id,
        chapterName: chap.name,
        subject: chap.subject,
        questionText: `What is your typical problem-solving accuracy (%) when solving questions for ${chap.name}?`,
        fieldToUpdate: 'practiceProgress.accuracyPercent',
        suggestedType: 'number',
        contextReason: `Ensures the Planner assigns practice vs revision tasks based on real accuracy.`
      });
    } else if (acad.missingFields.includes('lastRevisedDaysAgo')) {
      questions.push({
        id: `q-revised-${chap.id}`,
        chapterId: chap.id,
        chapterName: chap.name,
        subject: chap.subject,
        questionText: `Approximately how many days ago did you last revise ${chap.name}?`,
        fieldToUpdate: 'revisionProgress.lastRevisedDaysAgo',
        suggestedType: 'number',
        contextReason: `Updates the forgetting curve calculation to prevent concept decay.`
      });
    }
  }

  return questions;
}

/**
  Calculates aggregate syllabus metrics directly from centralized Academic States.
 */
export function normalizeStageAlias(stage?: string): string {
  if (!stage) return 'Not Started';
  const normalized = stage.trim();
  if (normalized === 'Never Started' || normalized === 'Unknown') return 'Not Started';
  if (normalized === 'Doing Questions') return 'Solving DPPs';
  return normalized;
}

export function computeCentralAcademicStateSummary(chapters: Chapter[]) {
  const normalized = chapters.map(c => getAcademicState(c));

  const totalChapters = normalized.length;
  if (totalChapters === 0) {
    return {
      overallProgressPercent: 0,
      totalRemainingHours: 0,
      stageCounts: {
        'Not Started': 0,
        'Watching Lectures': 0,
        'Making Notes': 0,
        'Solving DPPs': 0,
        'Solving Modules': 0,
        'Solving PYQs': 0,
        'Revision': 0,
        'Mastered': 0
      },
      chaptersWithMissingInfoCount: 0
    };
  }

  const totalComp = normalized.reduce((acc, curr) => acc + curr.overallCompletion, 0);
  const overallProgressPercent = Math.round(totalComp / totalChapters);

  const totalRemainingHours = Math.round(
    normalized.reduce((acc, curr) => acc + curr.estimatedRemainingTimeHours, 0) * 10
  ) / 10;

  const stageCounts: Record<string, number> = {
    'Not Started': 0,
    'Watching Lectures': 0,
    'Making Notes': 0,
    'Solving DPPs': 0,
    'Solving Modules': 0,
    'Solving PYQs': 0,
    'Revision': 0,
    'Mastered': 0
  };

  let missingInfoCount = 0;

  normalized.forEach(item => {
    const stg = normalizeStageAlias(item.syllabusStage as string);
    
    if (stageCounts[stg] !== undefined) {
      stageCounts[stg]++;
    } else {
      stageCounts['Watching Lectures']++;
    }

    if (item.hasMissingInfo) missingInfoCount++;
  });

  return {
    overallProgressPercent,
    totalRemainingHours,
    stageCounts,
    chaptersWithMissingInfoCount: missingInfoCount,
    totalChapters
  };
}
