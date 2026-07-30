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
    'Never Started'
  );
  if (stage === 'Unknown') {
    stage = 'Never Started';
  }

  // 2. Lecture Progress
  const totalLects = chapter.lectureProgress?.totalLectures || chapter.totalLectures || 10;
  const compLects = Math.min(
    totalLects, 
    chapter.lectureProgress?.completedLectures ?? chapter.currentLecture ?? (stage === 'Mastered' ? totalLects : 0)
  );
  const avgDur = chapter.lectureProgress?.avgLectureDurationMinutes || 75;
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
  const dppComp = chapter.practiceProgress?.dppCompleted ?? (chapter.dppComplete ? true : false);
  const pyqComp = chapter.practiceProgress?.pyqsCompleted ?? (chapter.pyqsComplete ? true : false);
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
  const daysAgo = chapter.revisionProgress?.lastRevisedDaysAgo ?? chapter.lastRevisionDaysAgo ?? 14;
  const retentionConfidence = chapter.revisionProgress?.retentionConfidence || (daysAgo <= 7 ? 'High' : daysAgo <= 21 ? 'Medium' : 'Low');
  const retentionScore = chapter.retentionScore ?? (
    retentionConfidence === 'High' ? 90 : retentionConfidence === 'Medium' ? 65 : 40
  );

  const revisionState: RevisionState = {
    lastRevisedDaysAgo: daysAgo,
    retentionConfidence,
    formulaMemoryPercent: chapter.revisionProgress?.formulaMemoryPercent || (retentionScore > 75 ? 85 : 60),
    questionSolvingConfidencePercent: chapter.revisionProgress?.questionSolvingConfidencePercent || accuracy,
    needRevision: daysAgo > 14 || retentionScore < 60,
    retentionScore,
    lastRevisedAt: chapter.lastRevisedAt || chapter.revisionProgress?.lastRevisedAt
  };

  // 5. Calculate Overall Completion %
  // Theory (35%) + DPP (20%) + Module (15%) + PYQs (20%) + Revision (10%)
  const theoryWeight = (compLects / totalLects) * 35;
  const dppWeight = (dppPct / 100) * 20;
  const modWeight = (modPct / 100) * 15;
  const pyqWeight = (pyqPct / 100) * 20;
  const revWeight = (retentionScore / 100) * 10;
  const calculatedCompletion = Math.min(100, Math.round(theoryWeight + dppWeight + modWeight + pyqWeight + revWeight));

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
    unit: chapter.unit,
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
  const isUnstarted = (!chapter.currentLecture || chapter.currentLecture === 0) && !chapter.theoryComplete && !chapter.dppComplete && !chapter.pyqsComplete && (chapter.completion === 0 || chapter.completion === undefined);

  let syllabusStage: SyllabusDiagnosisStage = chapter.syllabusStage || 'Not Started';
  if (isMastered) {
    syllabusStage = 'Mastered';
  } else if (isUnstarted) {
    syllabusStage = 'Not Started';
  } else if (chapter.pyqsComplete) {
    syllabusStage = 'Solving PYQs';
  } else if (chapter.dppComplete) {
    syllabusStage = 'Solving DPPs';
  } else if (chapter.theoryComplete || (chapter.currentLecture && chapter.currentLecture > 0)) {
    syllabusStage = 'Watching Lectures';
  }

  const mappedStatus: Chapter['status'] = 
    syllabusStage === 'Mastered' ? 'Mastered' :
    syllabusStage === 'Revision' ? 'Revision Due' :
    syllabusStage === 'Not Started' || syllabusStage === 'Never Started' ? 'Not Started' : 'Learning';

  const acad = getAcademicState({ ...chapter, syllabusStage, status: mappedStatus });

  return {
    ...chapter,
    status: mappedStatus,
    syllabusStage: syllabusStage,
    completion: mappedStatus === 'Not Started' ? 0 : acad.overallCompletion,
    currentLecture: acad.lectureProgress.completedLectures,
    totalLectures: acad.lectureProgress.totalLectures,
    theoryComplete: acad.lectureProgress.completedLectures >= acad.lectureProgress.totalLectures || syllabusStage === 'Mastered',
    dppComplete: acad.practiceProgress.dppCompleted === true || acad.practiceProgress.dppPercent === 100,
    pyqsComplete: acad.practiceProgress.pyqsCompleted === true || acad.practiceProgress.pyqPercent === 100,
    confidence: acad.practiceProgress.confidencePercent,
    lastRevisionDaysAgo: acad.revisionState.lastRevisedDaysAgo,
    estimatedRemainingTime: acad.estimatedRemainingTimeHours,
    retentionScore: acad.revisionState.retentionScore ?? 60,
    healthScore: Math.round((acad.practiceProgress.accuracyPercent * 0.6) + ((acad.revisionState.retentionScore ?? 60) * 0.4)),
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
    let stg = item.syllabusStage as string;
    if (stg === 'Never Started' || stg === 'Unknown') stg = 'Not Started';
    if (stg === 'Doing Questions') stg = 'Solving DPPs';
    
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
