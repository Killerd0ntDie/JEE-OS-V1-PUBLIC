import { KnowledgeEngine } from '../../knowledge';
import { PlannerInput, ScheduledTask, MissionReasoning } from '../types';
import { PlannerScoringEngine, ScoringContext } from '../PlannerScoringEngine';
import { SubjectId } from '../../types/index';
import { AcademicAnalysisResult, normalizeStageAlias } from './academicStateAnalyzer';

export const getLocalDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const d2 = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d2}`;
};

export function generateCandidateTasks(
  input: PlannerInput,
  knowledgeEngine: KnowledgeEngine,
  scoringEngine: PlannerScoringEngine,
  analysis: AcademicAnalysisResult
): ScheduledTask[] {
  const {
    mergedStateMap,
    chapterById,
    mistakesByChapter,
    mockRemediationSubject,
    mockRemediationReason,
    progressStates
  } = analysis;

  let candidates: ScheduledTask[] = [];

  const generateTask = (
    type: ScheduledTask['type'],
    node: any,
    prog: any,
    duration: number,
    taskId: string,
    taskName: string,
    revisionData?: any
  ): ScheduledTask => {
    const depTree = knowledgeEngine.getDependencyTree(node.id);
    const dependentChapterNames = depTree.map(id => knowledgeEngine.getNode(id)?.name || id);

    const context: ScoringContext = {
      taskType: type,
      node,
      progress: prog,
      revisionData,
      globalInput: input,
      dependencyTreeSize: depTree.length
    };

    const { totalScore, breakdown } = scoringEngine.calculateScore(context);

    const weightage = node.weightage || 5;
    const expectedMarksGain = Math.round(weightage * (type === 'Watch Lecture' ? 1.5 : type === 'Solve PYQs' ? 2.5 : type === 'Solve DPP' ? 2.0 : 1.0));
    const expectedLearningGain = Math.round(breakdown.learningGainScore || 50);
    const dependencyValue = Math.round(breakdown.dependencyScore || 0);
    const revisionContribution = Math.round((breakdown.revisionUrgencyScore || 0) * 0.7 + (breakdown.timeSinceLastStudyScore || 0) * 0.3);

    // Construct explicit reasoning grounded in Academic State
    let whySelected = "";
    let rankingRationale = "";
    let longTermImpact = "";
    let postponeRisk = "";

    if (type === 'Revise Formulas') {
      const days = revisionData?.daysOverdue || 7;
      whySelected = `Selected because formula memory for ${node.name} has been decaying over the past ${days} days (Retention score: ${revisionData?.retentionScore || 50}%). Formula recall is vital for rapid problem solving.`;
      rankingRationale = `Ranked with priority score ${totalScore}/100 due to urgent decay prevention. Revision takes only ${duration} minutes and prevents total memory loss.`;
      longTermImpact = `Protects 4-8 marks in ${node.name} by ensuring formulas remain active in short-term recall.`;
      postponeRisk = `Postponing further will cause memory decay below 40%, requiring full re-learning of chapter theory.`;
    } else if (type === 'Review Mistakes') {
      const mistakeCount = mistakesByChapter.get(node.name) || 2;
      whySelected = `Selected to target ${mistakeCount} active unresolved Error Book mistakes in ${node.name}. Remediation directly fixes weak concept tags.`;
      rankingRationale = `Ranked with priority score ${totalScore}/100 because mistake remediation yields the highest immediate score improvement per study minute.`;
      longTermImpact = `Eliminates repeated conceptual errors, boosting question accuracy by up to +20%.`;
      postponeRisk = `Postponing allows bad problem-solving habits and conceptual flaws to persist into upcoming mock tests.`;
    } else if (type === 'Watch Lecture') {
      whySelected = `Selected because ${node.name} is a high-yield JEE chapter (Weightage: ${weightage}/10). Completing this lecture builds foundational theory and unlocks downstream chapters.`;
      rankingRationale = `Ranked with priority score ${totalScore}/100. Foundation building unlocks ${depTree.length} dependent chapters in ${node.subject.toUpperCase()}.`;
      longTermImpact = dependentChapterNames.length > 0
        ? `Unlocks ${dependentChapterNames.slice(0, 3).join(', ')} and adds projected +12 JEE Main marks upon mastery.`
        : `Consolidates foundational coverage and adds projected +12 JEE Main marks upon mastery.`;
      postponeRisk = dependentChapterNames.length > 0
        ? `Postponing stalls progress in ${dependentChapterNames.length} dependent chapters across the syllabus.`
        : `Postponing stalls momentum in ${node.name}.`;
    } else if (type === 'Solve DPP') {
      whySelected = `Selected because theory for ${node.name} is complete, making structured DPP problem solving the logical next leverage point.`;
      rankingRationale = `Ranked with priority score ${totalScore}/100 to bridge theory comprehension with active numerical problem solving.`;
      longTermImpact = `Solidifies concept application and raises problem accuracy toward the 75%+ target threshold.`;
      postponeRisk = `Postponing practice creates a gap between theory and application, causing rapid concept atrophy.`;
    } else {
      whySelected = `Selected to attempt actual JEE Past Year Questions (PYQs) for ${node.name} to establish exam-level problem confidence.`;
      rankingRationale = `Ranked with priority score ${totalScore}/100 because PYQ mastery is the gold standard for exam readiness.`;
      longTermImpact = `Directly verifies exam readiness and provides high confidence on 12-16 marks in JEE Main/Advanced.`;
      postponeRisk = `Postponing delays exposure to real exam pattern questions, leaving exam speed untested.`;
    }

    const confidenceLevel: MissionReasoning['confidenceLevel'] = totalScore >= 75 ? 'Very High' : totalScore >= 55 ? 'High' : 'Medium';
    const confidenceScorePercent = Math.min(98, Math.max(68, totalScore));

    const reasoning: MissionReasoning = {
      whySelected,
      dependentChapters: dependentChapterNames,
      rankingRationale,
      longTermImpact,
      postponeRisk,
      estimatedStudyTimeMinutes: duration,
      confidenceLevel,
      confidenceScorePercent,
      factorsBreakdown: breakdown as unknown as Record<string, number>
    };

    const selectionReason = whySelected;

    return {
      id: taskId,
      type,
      subjectId: node.subject,
      chapterId: node.id,
      chapterName: node.name,
      taskName,
      duration,
      priorityScore: totalScore,
      priorityBreakdown: breakdown as unknown as Record<string, number>,
      expectedMarksGain,
      expectedLearningGain,
      dependencyValue,
      revisionContribution,
      selectionReason,
      reasoning
    };
  };

  const currentDateObj = input.currentDate ? new Date(input.currentDate) : new Date();
  const todayStr = getLocalDateKey(currentDateObj);

  // Evaluate revision backlog
  for (const rev of input.revisionBacklog) {
    const node = knowledgeEngine.getNode(rev.chapterId);
    const chapterMeta = input.chapters?.find(c => c.id === rev.chapterId);
    if (node && !chapterMeta?.chapterOnHold && !chapterMeta?.revisionOnHold) {
      // Safety 1: Skip if chapter was already revised today
      const lastRev = chapterMeta.lastRevisedAt || chapterMeta.revisionProgress?.lastRevisedAt;
      const isRevisedToday = Boolean(
        (lastRev && new Date(lastRev).toDateString() === currentDateObj.toDateString()) ||
        chapterMeta.lastRevisionDaysAgo === 0 ||
        chapterMeta.revisionProgress?.lastRevisedDaysAgo === 0
      );
      if (isRevisedToday) continue;

      // Safety 2: Skip if chapter nextRevisionDueAt is in the future
      if (chapterMeta.nextRevisionDueAt && new Date(chapterMeta.nextRevisionDueAt).getTime() > currentDateObj.getTime()) {
        continue;
      }

      // Safety 3: Skip if todayMissions already has a completed revision task for this chapter
      const hasCompletedRevisionToday = input.todayMissions?.some(m =>
        (m.chapterId === node.id || m.chapter?.toLowerCase() === node.name.toLowerCase()) &&
        (m.type === 'Revise Formulas' || m.type === 'Review Mistakes' || m.taskName?.toLowerCase().includes('revise')) &&
        m.completed
      );
      if (hasCompletedRevisionToday) continue;

      const prog = mergedStateMap[node.id] || { completion: 100, isMastered: true, chapterId: node.id };
      candidates.push(generateTask(
        'Revise Formulas',
        node,
        { chapterId: node.id, completion: prog.completion, isMastered: prog.isMastered },
        30,
        `rev-${rev.chapterId}-${todayStr}`,
        `Revise ${node.name}`,
        rev
      ));
    }
  }

  const existingRevChapterIds = new Set(input.revisionBacklog.map(r => r.chapterId));
  if (input.chapters) {
    for (const chap of input.chapters) {
      if (chap.status === 'Revision Due' && !existingRevChapterIds.has(chap.id) && !chap.chapterOnHold && !chap.revisionOnHold) {
        // Safety 1: Skip if chapter was already revised today
        const lastRev = chap.lastRevisedAt || chap.revisionProgress?.lastRevisedAt;
        const isRevisedToday = Boolean(
          (lastRev && new Date(lastRev).toDateString() === currentDateObj.toDateString()) ||
          chap.lastRevisionDaysAgo === 0 ||
          chap.revisionProgress?.lastRevisedDaysAgo === 0
        );
        if (isRevisedToday) continue;

        // Safety 2: Skip if chapter nextRevisionDueAt is in the future
        if (chap.nextRevisionDueAt && new Date(chap.nextRevisionDueAt).getTime() > currentDateObj.getTime()) {
          continue;
        }

        // Safety 3: Skip if todayMissions already has a completed revision task for this chapter
        const hasCompletedRevisionToday = input.todayMissions?.some(m =>
          (m.chapterId === chap.id || m.chapter?.toLowerCase() === chap.name.toLowerCase()) &&
          (m.type === 'Revise Formulas' || m.type === 'Review Mistakes' || m.taskName?.toLowerCase().includes('revise')) &&
          m.completed
        );
        if (hasCompletedRevisionToday) continue;

        const node = knowledgeEngine.getNode(chap.id);
        if (node) {
          const prog = mergedStateMap[node.id] || { completion: chap.completion || 0, isMastered: false, chapterId: node.id };
          candidates.push(generateTask(
            'Revise Formulas',
            node,
            { chapterId: node.id, completion: prog.completion, isMastered: prog.isMastered },
            30,
            `rev-status-${chap.id}-${todayStr}`,
            `Revise ${chap.name}`,
            { daysOverdue: chap.lastRevisionDaysAgo || 5, retentionScore: 50 }
          ));
        }
      }
    }
  }

  // Inject Mock Remediation Task for the weakest chapter in the weakest subject
  if (mockRemediationSubject && input.chapters) {
    const weakSubjectChapters = input.chapters.filter(c => c.subject === mockRemediationSubject && (c.completion > 10 || c.theoryComplete));
    weakSubjectChapters.sort((a, b) => (a.confidence ?? 50) - (b.confidence ?? 50));
    
    if (weakSubjectChapters.length > 0) {
      const weakestChap = weakSubjectChapters[0];
      const hasCompletedRemediationToday = input.todayMissions?.some(m =>
        (m.chapterId === weakestChap.id || m.chapter?.toLowerCase() === weakestChap.name.toLowerCase()) &&
        (m.type === 'Review Mistakes' || m.type === 'Revise Formulas' || m.taskName?.toLowerCase().includes('remediation') || m.taskName?.toLowerCase().includes('revise')) &&
        m.completed
      );
      const lastRev = weakestChap.lastRevisedAt || weakestChap.revisionProgress?.lastRevisedAt;
      const isRevisedToday = Boolean(
        (lastRev && new Date(lastRev).toDateString() === currentDateObj.toDateString()) ||
        weakestChap.lastRevisionDaysAgo === 0 ||
        weakestChap.revisionProgress?.lastRevisedDaysAgo === 0
      );

      if (!hasCompletedRemediationToday && !isRevisedToday) {
        const node = knowledgeEngine.getNode(weakestChap.id);
        if (node) {
          const prog = mergedStateMap[node.id] || { completion: weakestChap.completion || 0, isMastered: false, chapterId: node.id };
          const todayStr = getLocalDateKey(input.currentDate ? new Date(input.currentDate) : new Date());
          candidates.push(generateTask(
            'Review Mistakes',
            node,
            { chapterId: node.id, completion: prog.completion, isMastered: prog.isMastered },
            45,
            `remediation-${weakestChap.id}-${todayStr}`,
            `Mock Remediation: ${weakestChap.name}`,
            { daysOverdue: 0, retentionScore: 0 }
          ));
          const injectedTask = candidates[candidates.length - 1];
          injectedTask.selectionReason = mockRemediationReason;
          if (injectedTask.reasoning) {
            injectedTask.reasoning.whySelected = mockRemediationReason;
            injectedTask.reasoning.rankingRationale = "Ranked extremely high to immediately patch mock exam failure points.";
            injectedTask.priorityScore = 100;
          }
        }
      }
    }
  }

  // Evaluate progression opportunities across all syllabus nodes
  const recommendedChapters = knowledgeEngine.getRecommendedNextChapters(progressStates, 25);
  
  // Identify subjects that currently have active in-progress chapters
  const activeSubjects = new Set<string>();
  for (const node of recommendedChapters) {
    const prog = mergedStateMap[node.id] || {};
    const normalizedStatus = normalizeStageAlias(prog.status);
    const normalizedStage = normalizeStageAlias(prog.syllabusStage);
    const isStarted = (prog.completion && prog.completion > 0) || 
                      (prog.rawCompletion && prog.rawCompletion > 0) ||
                      (prog.currentLecture && prog.currentLecture > 0) || 
                      prog.theoryComplete || 
                      (normalizedStatus && normalizedStatus !== 'Not Started') ||
                      (normalizedStage && normalizedStage !== 'Not Started');
    if (isStarted) {
      activeSubjects.add(node.subject);
    }
  }

  // Identify target chapters per subject (respecting chapter hold)
  const targetNodesMap = new Map<string, any>();

  if (input.chapters && input.chapters.length > 0) {
    const subjects: SubjectId[] = ['physics', 'chemistry', 'maths'];
    subjects.forEach(subj => {
      const subjChapters = input.chapters!.filter(c => c.subject === subj);

      const activeNotOnHoldChapters = subjChapters.filter(c =>
        !c.chapterOnHold &&
        c.status !== 'Not Started' &&
        c.syllabusStage !== 'Not Started' &&
        (
          (c.currentLecture && c.currentLecture > 0) ||
          (c.theoryComplete && !c.pyqsComplete) || 
          c.dppComplete || 
          (c.solvedQuestions && c.solvedQuestions > 0) ||
          (c.completion && c.completion > 0 && c.completion < 100) ||
          c.status === 'Learning'
        )
      );

      activeNotOnHoldChapters.forEach(activeChap => {
        const n = knowledgeEngine.getNode(activeChap.id);
        if (n) targetNodesMap.set(n.id, n);
      });
    });
  } else {
    for (const n of recommendedChapters) {
      const chapterMeta = chapterById.get(n.id);
      if (!chapterMeta?.chapterOnHold) {
        targetNodesMap.set(n.id, n);
      }
    }
  }

  const targetNodes = Array.from(targetNodesMap.values());

  for (const node of targetNodes) {
    const chapterMeta = chapterById.get(node.id);
    if (chapterMeta?.chapterOnHold) continue;

    const prog = mergedStateMap[node.id] || {};

    if (!prog.theoryComplete) {
      const remainingLectures = Math.max(1, (prog.totalLectures || 12) - prog.currentLecture);
      const lecDuration = Math.min(prog.avgLectureDuration || 75, 120);

      const isUnstarted = !prog.currentLecture || prog.currentLecture === 0;
      const maxLecturesToGenerate = isUnstarted ? 1 : Math.min(remainingLectures, 3);

      for (let l = 0; l < maxLecturesToGenerate; l++) {
        const nextLec = prog.currentLecture + l + 1;
        candidates.push(generateTask(
          'Watch Lecture',
          node,
          { chapterId: node.id, completion: prog.completion, isMastered: prog.isMastered },
          lecDuration,
          `lec-${node.id}-${nextLec}`,
          `Lecture ${nextLec}/${prog.totalLectures}: ${node.name}`
        ));
      }
    } else {
      const hasStarted = prog.currentLecture > 0 || prog.completion >= 50 || prog.isMastered;
      
      if (hasStarted) {
        const hasCompletedDppToday = input.todayMissions?.some(m =>
          (m.chapterId === node.id || m.chapter?.toLowerCase() === node.name.toLowerCase()) &&
          m.type === 'Solve DPP' &&
          m.completed
        );
        if (!prog.dppComplete && !chapterMeta?.dppOnHold && !hasCompletedDppToday) {
          candidates.push(generateTask(
            'Solve DPP',
            node,
            { chapterId: node.id, completion: prog.completion, isMastered: prog.isMastered },
            45,
            `dpp-${node.id}`,
            `Solve DPP: ${node.name}`
          ));
        }

        const hasCompletedPyqsToday = input.todayMissions?.some(m =>
          (m.chapterId === node.id || m.chapter?.toLowerCase() === node.name.toLowerCase()) &&
          m.type === 'Solve PYQs' &&
          m.completed
        );
        if (!prog.pyqsComplete && !chapterMeta?.pyqOnHold && !hasCompletedPyqsToday) {
          candidates.push(generateTask(
            'Solve PYQs',
            node,
            { chapterId: node.id, completion: prog.completion, isMastered: prog.isMastered },
            60,
            `pyq-${node.id}`,
            `Solve PYQs: ${node.name}`
          ));
        }
      }
    }

    // Check for mistakes
    const chapterMistakes = input.mistakes?.filter(m =>
      (m.chapterId === node.id || m.chapter?.toLowerCase() === node.name.toLowerCase()) &&
      m.revisionStatus !== 'Mastered'
    ) || [];

    if (chapterMistakes.length > 0 && !chapterMeta?.revisionOnHold && !chapterMeta?.chapterOnHold) {
      const lastRev = chapterMeta?.lastRevisedAt || chapterMeta?.revisionProgress?.lastRevisedAt;
      const isRevisedToday = Boolean(
        (lastRev && new Date(lastRev).toDateString() === currentDateObj.toDateString()) ||
        chapterMeta?.lastRevisionDaysAgo === 0 ||
        chapterMeta?.revisionProgress?.lastRevisedDaysAgo === 0
      );
      const hasCompletedMistakeReviewToday = input.todayMissions?.some(m =>
        (m.chapterId === node.id || m.chapter?.toLowerCase() === node.name.toLowerCase()) &&
        (m.type === 'Review Mistakes' || m.taskName?.toLowerCase().includes('mistake')) &&
        m.completed
      );

      const hasDueOrNewMistakes = chapterMistakes.some(m => {
        if (m.revisionStatus === 'New') return true;
        const cardId = m.id.startsWith('m-') ? m.id : `m-${m.id}`;
        const dbState = chapterMeta?.flashcardStates?.[cardId];
        if (dbState?.nextReviewDate) {
          const nextMs = new Date(dbState.nextReviewDate).getTime();
          return !Number.isNaN(nextMs) && nextMs <= currentDateObj.getTime();
        }
        return false;
      });

      if (!isRevisedToday && !hasCompletedMistakeReviewToday && hasDueOrNewMistakes) {
        candidates.push(generateTask(
          'Review Mistakes',
          node,
          { chapterId: node.id, completion: prog.completion, isMastered: prog.isMastered },
          45,
          `mistake-rev-${node.id}-${todayStr}`,
          `Review Mistakes: ${node.name}`
        ));
      }
    }
  }

  // Sunk Cost Momentum & Progressive Lecture Penalty
  const lectureCountPerChapter = new Map<string, number>();

  for (const task of candidates) {
    if (task.type === 'Watch Lecture') {
      const count = lectureCountPerChapter.get(task.chapterId) || 0;
      if (count > 0) {
        task.priorityScore -= (count * 15);
      }
      lectureCountPerChapter.set(task.chapterId, count + 1);
    }

    const prog = mergedStateMap[task.chapterId] || {};
    const normalizedStatus = normalizeStageAlias(prog.status);
    const normalizedStage = normalizeStageAlias(prog.syllabusStage);
    const isStarted = prog && (
      (prog.completion > 0 && prog.completion < 100) ||
      (prog.rawCompletion > 0 && prog.rawCompletion < 100) ||
      (prog.currentLecture && prog.currentLecture > 0) ||
      (normalizedStatus && normalizedStatus !== 'Not Started') ||
      (normalizedStage && normalizedStage !== 'Not Started')
    );

    if (isStarted) {
      const completionPct = prog.completion || prog.rawCompletion || (prog.currentLecture / (prog.totalLectures || 12) * 100) || 10;
      const momentumBoost = Math.max(2, Math.round(completionPct / 5));
      task.priorityScore += momentumBoost;
    }
    
    task.priorityScore = Math.max(0, Math.min(100, task.priorityScore));
  }

  if (activeSubjects.size > 0) {
    candidates = candidates.filter(c => activeSubjects.has(c.subjectId) || c.type === 'Revise Formulas' || c.type === 'Review Mistakes');
  }

  // Sort all candidates by priority score descending, with a tie-breaker for chronological lecture order
  candidates.sort((a, b) => {
    const sameChapter =
      (a.chapterId && b.chapterId && a.chapterId === b.chapterId) ||
      ((a.chapterName || '') === (b.chapterName || ''));

    const getLecNum = (name: string) => {
      const match = name.match(/Lecture (\d+)/i);
      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    };

    const aIsLecture = a.type === 'Watch Lecture' || /Lecture \d+/i.test(a.taskName || '');
    const bIsLecture = b.type === 'Watch Lecture' || /Lecture \d+/i.test(b.taskName || '');

    if (sameChapter && aIsLecture && bIsLecture) {
      const lecNumA = getLecNum(a.taskName);
      const lecNumB = getLecNum(b.taskName);
      if (lecNumA !== lecNumB) {
        return lecNumA - lecNumB;
      }
    }

    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }

    const lecNumA = getLecNum(a.taskName);
    const lecNumB = getLecNum(b.taskName);
    if (lecNumA !== lecNumB) {
      return lecNumA - lecNumB;
    }

    return (a.chapterName || '').localeCompare(b.chapterName || '');
  });

  return candidates;
}
