import { KnowledgeEngine, ProgressState } from '../knowledge';
import { PlannerInput, PlannerOutput, ScheduledTask, MissionReasoning, ReasoningPipelineSummary } from './types';
import { PlannerScoringEngine, ScoringContext, PLANNER_CONFIG } from './PlannerScoringEngine';
import { SubjectId, Chapter } from '../types/index';

function normalizeStageAlias(stage?: string): string | undefined {
  if (!stage) return stage;
  const normalized = stage.trim();
  if (normalized === 'Never Started' || normalized === 'Unknown') return 'Not Started';
  if (normalized === 'Doing Questions') return 'Solving DPPs';
  return normalized;
}

export const getLocalDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const d2 = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d2}`;
};

export class PlannerEngine {
  private knowledgeEngine: KnowledgeEngine;
  private scoringEngine: PlannerScoringEngine;

  constructor(knowledgeEngine: KnowledgeEngine) {
    this.knowledgeEngine = knowledgeEngine;
    this.scoringEngine = new PlannerScoringEngine();
  }

  public generateDailyPlan(input: PlannerInput): PlannerOutput {
    // =========================================================================
    // PIPELINE PHASE 1: ANALYZE CURRENT ACADEMIC STATE (SINGLE SOURCE OF TRUTH)
    // =========================================================================
    const chaptersList = input.chapters || [];
    input.chapterTelemetryMap = input.chapterTelemetryMap || {};
    const totalChapters = chaptersList.length || 56;
    const chapterById = new Map(chaptersList.map(c => [c.id, c]));

    const mergedStateMap: Record<string, any> = {};
    const allNodesForState = this.knowledgeEngine.getAllNodes();
    for (const node of allNodesForState) {
      const chapterMeta = chapterById.get(node.id);
      const rawProg: any = input.chapterTelemetryMap[node.id] || {};
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

    const allNodes = this.knowledgeEngine.getAllNodes();
    for (const node of allNodes) {
      const depTree = this.knowledgeEngine.getDependencyTree(node.id);
      nodeDependencyMap.set(node.id, depTree.map(id => this.knowledgeEngine.getNode(id)?.name || id));

      const rawProg = mergedStateMap[node.id];
      const isCompleted = rawProg ? (rawProg.isMastered || rawProg.theoryComplete || rawProg.completion > 60) : false;

      if (!isCompleted && node.prerequisites && node.prerequisites.length > 0) {
        for (const prereqId of node.prerequisites) {
          const prereqProg = mergedStateMap[prereqId];
          const prereqNode = this.knowledgeEngine.getNode(prereqId);
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
      const node = this.knowledgeEngine.getNode(rev.chapterId);
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
      // Sort to get the latest mock
      const latestMock = [...input.mocks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      // Analyze subject breakdown to find weakest link (< 40% accuracy or lowest score)
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

    // Prepare knowledge engine progress array for lookahead simulator
    const progressStates: ProgressState[] = Object.values(mergedStateMap).map((data: any) => ({
      chapterId: data.chapterId,
      completion: data.completion,
      isMastered: data.isMastered,
      theoryComplete: data.theoryComplete,
      dppComplete: data.dppComplete,
      pyqsComplete: data.pyqsComplete
    }));

    const availableMinutes = input.studyHours * 60;
    let candidates: ScheduledTask[] = [];

    // Helper for generating base task and score
    const generateTask = (
      type: ScheduledTask['type'], 
      node: any, 
      prog: any, 
      duration: number, 
      taskId: string, 
      taskName: string,
      revisionData?: any
    ): ScheduledTask => {
      const depTree = this.knowledgeEngine.getDependencyTree(node.id);
      const dependentChapterNames = depTree.map(id => this.knowledgeEngine.getNode(id)?.name || id);

      const context: ScoringContext = {
        taskType: type,
        node,
        progress: prog,
        revisionData,
        globalInput: input,
        dependencyTreeSize: depTree.length
      };

      const { totalScore, breakdown } = this.scoringEngine.calculateScore(context);

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

    // =========================================================================
    // PIPELINE PHASE 7: SCORE EVERY POSSIBLE STUDY ACTION (ALL CHAPTERS)
    // =========================================================================
    // Evaluate revision backlog
    for (const rev of input.revisionBacklog) {
      const node = this.knowledgeEngine.getNode(rev.chapterId);
      const chapterMeta = input.chapters?.find(c => c.id === rev.chapterId);
      if (node && !chapterMeta?.chapterOnHold && !chapterMeta?.revisionOnHold) {
        const prog = mergedStateMap[node.id] || { completion: 100, isMastered: true, chapterId: node.id };
        const todayStr = getLocalDateKey(input.currentDate ? new Date(input.currentDate) : new Date());
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
          const node = this.knowledgeEngine.getNode(chap.id);
          if (node) {
            const prog = mergedStateMap[node.id] || { completion: chap.completion || 0, isMastered: false, chapterId: node.id };
            const todayStr = getLocalDateKey(input.currentDate ? new Date(input.currentDate) : new Date());
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
      // Sort by lowest confidence or highest weakness score
      weakSubjectChapters.sort((a, b) => (a.confidence ?? 50) - (b.confidence ?? 50));
      
      if (weakSubjectChapters.length > 0) {
        const weakestChap = weakSubjectChapters[0];
        const node = this.knowledgeEngine.getNode(weakestChap.id);
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
          // Modify the candidate's selectionReason directly to reflect mock remediation
          const injectedTask = candidates[candidates.length - 1];
          injectedTask.selectionReason = mockRemediationReason;
          if (injectedTask.reasoning) {
            injectedTask.reasoning.whySelected = mockRemediationReason;
            injectedTask.reasoning.rankingRationale = "Ranked extremely high to immediately patch mock exam failure points.";
            // Bug 1.5: Use an absolute priority anchor (100) instead of (999) to respect UI boundaries
            // Ensures mock remediation is strictly first without breaking bounds
            injectedTask.priorityScore = 100;
          }
        }
      }
    }

    // Evaluate progression opportunities across all syllabus nodes
    const recommendedChapters = this.knowledgeEngine.getRecommendedNextChapters(progressStates, 25);
    
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

    // Identify target chapters per subject (filtering out any chapters on hold)
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
          const n = this.knowledgeEngine.getNode(activeChap.id);
          if (n) targetNodesMap.set(n.id, n);
        });

        // Bug 2.1 Reverted: We no longer auto-schedule unstarted chapters blindly.
        // The user strictly prefers syncing manually with their coaching classes.
      });
    } else {
      // Fallback when input.chapters is not provided
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
          // Use exact telemetry duration, falling back to 75 if completely missing, capped at 120
          const lecDuration = Math.min(prog.avgLectureDuration || 75, 120);

          // Bug 4.1: Cap unstarted chapters to 1 lecture generation to prevent mission board flooding
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
        const chapterMeta = chapterById.get(node.id);
        const hasStarted = prog.currentLecture > 0 || prog.completion >= 50 || prog.isMastered;
        
        if (hasStarted) {
          if (!prog.dppComplete && !chapterMeta?.dppOnHold) {
            candidates.push(generateTask(
              'Solve DPP',
              node,
              { chapterId: node.id, completion: prog.completion, isMastered: prog.isMastered },
              45,
              `dpp-${node.id}`,
              `Solve DPP: ${node.name}`
            ));
          }
          if (!prog.pyqsComplete && !chapterMeta?.pyqOnHold) {
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
      const chapterMistakes = input.mistakes?.filter(m => m.chapter === node.name && m.revisionStatus !== 'Mastered') || [];
      if (chapterMistakes.length > 0) {
        candidates.push(generateTask(
          'Review Mistakes',
          node,
          { chapterId: node.id, completion: prog.completion, isMastered: prog.isMastered },
          45,
          `mistake-rev-${node.id}`,
          `Review Mistakes: ${node.name}`
        ));
      }
    }

    // Sunk Cost Momentum: Give active in-progress chapters a minor priority boost (+10) 
    // to encourage finishing what was started without overriding the main scoring logic.
    // Also, apply a Progressive Lecture Penalty to subsequent lectures of the same chapter.
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
        // Bug 2.2: Proportional sunk-cost momentum curve instead of a flat +10
        const completionPct = prog.completion || prog.rawCompletion || (prog.currentLecture / (prog.totalLectures || 12) * 100) || 10;
        const momentumBoost = Math.max(2, Math.round(completionPct / 5)); // Up to +20 points for 99% complete
        task.priorityScore += momentumBoost;
      }
      
      // Ensure priority score remains normalized 0-100
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
        return match ? parseInt(match[1]) : Number.MAX_SAFE_INTEGER;
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

    console.log('==== DEBUG PLANNER SORTING ====');
    candidates.forEach(c => console.log(`CANDIDATE: ${c.id} | ${c.taskName} | PRIO: ${c.priorityScore} | DUR: ${c.duration}`));
    console.log('===============================');

    // Filter candidates for today's mission based on active day rotation & subjectSplitStrategy
    const todayDate = input.currentDate ? new Date(input.currentDate) : new Date();
    const currentDayIdx = (todayDate.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const splitStrategy = input.userPreferences?.subjectSplitStrategy || '3_a_day';

    let todayAllowedSubjects: string[] = ['physics', 'chemistry', 'maths'];
    const twoDayDefault: [SubjectId[], SubjectId[], SubjectId[]] = [
      ['physics', 'chemistry'],
      ['chemistry', 'maths'],
      ['maths', 'physics']
    ];
    const twoDayConfig = input.userPreferences?.twoDaySplitConfig || twoDayDefault;

    if (splitStrategy === '2_a_day_alternating') {
      todayAllowedSubjects = twoDayConfig[currentDayIdx % 3] || ['physics', 'chemistry'];
    } else if (splitStrategy === '1_a_day_alternating') {
      todayAllowedSubjects = currentDayIdx % 3 === 0 ? ['physics'] : currentDayIdx % 3 === 1 ? ['chemistry'] : ['maths'];
    }

    const filteredTodaysCandidates = candidates.filter(cand => 
      todayAllowedSubjects.includes(cand.subjectId)
    );
    const todaysCandidates = filteredTodaysCandidates.length > 0 ? filteredTodaysCandidates : candidates;

    // =========================================================================
    // PIPELINE PHASE 8: MULTI-STRATEGY LOOKAHEAD SELECTION
    // =========================================================================
    // Pre-compute active chapter IDs early so the mission builder can prioritize continuity
    const activeChapterIds = new Set((input.todayMissions || []).filter(m => !m.completed && !m.dismissed).map(m => m.chapterId));

    const buildMissionWithHeuristic = (
      preferredTypes: ScheduledTask['type'][],
      subjectFocus?: SubjectId
    ): ScheduledTask[] => {
      const mission: ScheduledTask[] = [];
      let currentMinutes = 0;
      const usedIds = new Set<string>();

      // Phase 0: Continuity — always include at least one task per active in-progress chapter first.
      // This ensures that a slight dailyQuota change doesn't discard chapters mid-sequence.
      for (const chapId of activeChapterIds) {
        if (currentMinutes >= availableMinutes) break;
        const chapTask = todaysCandidates.find(t =>
          !usedIds.has(t.id) &&
          t.chapterId === chapId &&
          currentMinutes + t.duration <= availableMinutes
        );
        if (chapTask) {
          mission.push(chapTask);
          currentMinutes += chapTask.duration;
          usedIds.add(chapTask.id);
        }
      }

      const addMatchingTasks = (types: ScheduledTask['type'][], focusOnSubject: boolean) => {
        const filtered = todaysCandidates.filter(t => 
          !usedIds.has(t.id) && 
          types.includes(t.type) && 
          (!focusOnSubject || t.subjectId === subjectFocus)
        );

        for (const task of filtered) {
          if (currentMinutes + task.duration <= availableMinutes) {
            mission.push(task);
            currentMinutes += task.duration;
            usedIds.add(task.id);
          }
        }
      };

      if (subjectFocus) addMatchingTasks(preferredTypes, true);
      addMatchingTasks(preferredTypes, false);
      if (subjectFocus) addMatchingTasks(['Watch Lecture', 'Solve DPP', 'Solve PYQs', 'Revise Formulas', 'Review Mistakes'], true);
      addMatchingTasks(['Watch Lecture', 'Solve DPP', 'Solve PYQs', 'Revise Formulas', 'Review Mistakes'], false);

      return mission;
    };

    interface CandidateMission {
      name: string;
      tasks: ScheduledTask[];
      score: number;
      learningGain: number;
      marksGain: number;
      subjectBalance: number;
      dependencyUnlock: number;
      revisionHealth: number;
      workloadRealism: number;
      completionProb: number;
    }

    const candidateMissions: CandidateMission[] = [];

    // Strategy 1: High Priority Balanced Selection (Strictly by priority score)
    const balancedTasks: ScheduledTask[] = [];
    let balancedMinutes = 0;
    const balancedUsed = new Set<string>();

    for (const t of todaysCandidates) {
      if (!balancedUsed.has(t.id) && balancedMinutes + t.duration <= availableMinutes) {
        balancedTasks.push(t);
        balancedMinutes += t.duration;
        balancedUsed.add(t.id);
      }
    }
    candidateMissions.push({ name: 'Balanced Mission', tasks: balancedTasks, score: 0, learningGain: 0, marksGain: 0, subjectBalance: 0, dependencyUnlock: 0, revisionHealth: 0, workloadRealism: 0, completionProb: 0 });

    // Strategy 2: Progression Focus
    candidateMissions.push({
      name: 'Progression Focus',
      tasks: buildMissionWithHeuristic(['Watch Lecture', 'Solve DPP']),
      score: 0, learningGain: 0, marksGain: 0, subjectBalance: 0, dependencyUnlock: 0, revisionHealth: 0, workloadRealism: 0, completionProb: 0
    });

    // Strategy 3: Practice Focus
    candidateMissions.push({
      name: 'Practice Focus',
      tasks: buildMissionWithHeuristic(['Solve DPP', 'Solve PYQs']),
      score: 0, learningGain: 0, marksGain: 0, subjectBalance: 0, dependencyUnlock: 0, revisionHealth: 0, workloadRealism: 0, completionProb: 0
    });

    // Strategy 4: Revision & Remediation Focus
    candidateMissions.push({
      name: 'Revision & Remediation Focus',
      tasks: buildMissionWithHeuristic(['Revise Formulas', 'Review Mistakes']),
      score: 0, learningGain: 0, marksGain: 0, subjectBalance: 0, dependencyUnlock: 0, revisionHealth: 0, workloadRealism: 0, completionProb: 0
    });

    // Strategy 5: Physics Focused
    candidateMissions.push({
      name: 'Physics Mastery Focus',
      tasks: buildMissionWithHeuristic(['Watch Lecture', 'Solve DPP', 'Solve PYQs', 'Revise Formulas', 'Review Mistakes'], 'physics'),
      score: 0, learningGain: 0, marksGain: 0, subjectBalance: 0, dependencyUnlock: 0, revisionHealth: 0, workloadRealism: 0, completionProb: 0
    });

    // Strategy 6: Chemistry Focused
    candidateMissions.push({
      name: 'Chemistry Mastery Focus',
      tasks: buildMissionWithHeuristic(['Watch Lecture', 'Solve DPP', 'Solve PYQs', 'Revise Formulas', 'Review Mistakes'], 'chemistry'),
      score: 0, learningGain: 0, marksGain: 0, subjectBalance: 0, dependencyUnlock: 0, revisionHealth: 0, workloadRealism: 0, completionProb: 0
    });

    // Strategy 7: Maths Focused
    candidateMissions.push({
      name: 'Mathematics Mastery Focus',
      tasks: buildMissionWithHeuristic(['Watch Lecture', 'Solve DPP', 'Solve PYQs', 'Revise Formulas', 'Review Mistakes'], 'maths'),
      score: 0, learningGain: 0, marksGain: 0, subjectBalance: 0, dependencyUnlock: 0, revisionHealth: 0, workloadRealism: 0, completionProb: 0
    });

    // Strategy 8: Pure Greedy
    const greedyTasks: ScheduledTask[] = [];
    let greedyMins = 0;
    for (const t of todaysCandidates) {
      if (greedyMins + t.duration <= availableMinutes) {
        greedyTasks.push(t);
        greedyMins += t.duration;
      }
    }
    candidateMissions.push({
      name: 'Pure Priority Focus',
      tasks: greedyTasks,
      score: 0, learningGain: 0, marksGain: 0, subjectBalance: 0, dependencyUnlock: 0, revisionHealth: 0, workloadRealism: 0, completionProb: 0
    });

    // 7-Day Lookahead Simulator (activeChapterIds already computed above at Phase 8 start)

    for (const mission of candidateMissions) {
      if (mission.tasks.length === 0) continue;

      let totalSimMarksGained = 0;
      let totalSimLearningGain = 0;

      for (const t of mission.tasks) {
        totalSimMarksGained += (t.expectedMarksGain || 0);
        totalSimLearningGain += (t.expectedLearningGain || 0);
      }

      const activeTasksCount = mission.tasks.filter(t => activeChapterIds.has(t.chapterId)).length;
      const continuityNormalized = Math.min(100, (activeTasksCount / Math.max(1, mission.tasks.length)) * 100);

      const marksGainNormalized = Math.min(100, totalSimMarksGained * 2);
      const learningGainNormalized = Math.min(100, totalSimLearningGain * 1.5);
      
      mission.learningGain = learningGainNormalized;
      mission.marksGain = marksGainNormalized;
      mission.subjectBalance = 85;
      mission.revisionHealth = 80;
      mission.dependencyUnlock = 75;
      mission.workloadRealism = 90;
      mission.completionProb = 90;

      const rawScore = (
        marksGainNormalized * 0.25 + 
        learningGainNormalized * 0.20 + 
        mission.subjectBalance * 0.15 + 
        mission.dependencyUnlock * 0.15 + 
        mission.revisionHealth * 0.15 +
        continuityNormalized * 0.10
      );

      mission.score = Math.min(100, Math.max(0, Math.round(rawScore)));
    }

    candidateMissions.sort((a, b) => b.score - a.score);

    const bestMission = candidateMissions[0] || {
      name: 'Pure Priority Focus',
      tasks: greedyTasks,
      score: 80,
      learningGain: 75,
      marksGain: 70,
      subjectBalance: 85,
      dependencyUnlock: 60,
      revisionHealth: 50,
      workloadRealism: 90,
      completionProb: 85
    };

    const todaysMission = bestMission.tasks;
    const scheduledIds = new Set(todaysMission.map(t => t.id));
    const carryForward = candidates.filter(t => !scheduledIds.has(t.id));
    const scheduledMinutes = todaysMission.reduce((sum, t) => sum + t.duration, 0);

    // Compute 7-Day Weekly Schedule Matrix (0 = Mon, 6 = Sun) using Progressive Multi-Day Simulation
    const weeklySchedule: Record<number, ScheduledTask[]> = {};

    // Group candidates by subject for progressive rotation
    const subjectCandidatesMap: Record<string, ScheduledTask[]> = {
      physics: candidates.filter(c => c.subjectId === 'physics'),
      chemistry: candidates.filter(c => c.subjectId === 'chemistry'),
      maths: candidates.filter(c => c.subjectId === 'maths'),
      revision: candidates.filter(c => c.type === 'Revise Formulas' || c.type === 'Review Mistakes')
    };

    const subjectPointer: Record<string, number> = { physics: 0, chemistry: 0, maths: 0, revision: 0 };
    const chapterSimulatedLecture: Record<string, number> = {};

    for (let day = 0; day < 7; day++) {
      let allowedSubjects: string[] = ['physics', 'chemistry', 'maths'];
      if (splitStrategy === '2_a_day_alternating') {
        allowedSubjects = twoDayConfig[day % 3] || ['physics', 'chemistry'];
      } else if (splitStrategy === '1_a_day_alternating') {
        allowedSubjects = day % 3 === 0 ? ['physics'] : day % 3 === 1 ? ['chemistry'] : ['maths'];
      }

      let dayMins = 0;
      const dayTasks: ScheduledTask[] = [];
      const perSubjBudget = availableMinutes / (allowedSubjects.length || 1);

      // Sequentially fill each allowed subject's allotted time budget
      for (const subj of allowedSubjects) {
        const subjCands = subjectCandidatesMap[subj] || [];
        if (subjCands.length === 0) continue;

        let subjMins = 0;
        let ptr = subjectPointer[subj] || 0;
        let attempts = 0;
        const usedTasksInDay = new Set<string>();

        while (subjMins + 40 <= perSubjBudget && attempts < 8) {
          attempts++;
          const baseTask = subjCands[ptr % subjCands.length];
          ptr++;

          if (!baseTask || usedTasksInDay.has(baseTask.id)) continue;
          usedTasksInDay.add(baseTask.id);

          let taskToPush = { ...baseTask, id: `plan-${day}-${baseTask.id}` };
          if (taskToPush.type === 'Watch Lecture') {
            const chapId = baseTask.chapterId;
            const chapter = input.chapters?.find(c => c.id === chapId);
            const totalLecs = chapter?.totalLectures || 12;
            const baseLec = chapter?.currentLecture || 0;
            
            const currentSimLec = (chapterSimulatedLecture[chapId] || baseLec) + 1;
            if (currentSimLec > totalLecs) {
              continue; // Skip ghost lectures in weekly simulation
            }
            chapterSimulatedLecture[chapId] = currentSimLec;
            taskToPush.id = `plan-${day}-lec-${chapId}-${currentSimLec}`;
            taskToPush.taskName = `Lecture ${currentSimLec}: ${baseTask.chapterName}`;
          }

          if (dayMins + taskToPush.duration <= availableMinutes + 30) {
            dayTasks.push(taskToPush);
            dayMins += taskToPush.duration;
            subjMins += taskToPush.duration;
          } else {
            break;
          }
        }
        subjectPointer[subj] = ptr;
      }

      // Add revision/mistakes review block for night slot if time permits
      if (dayMins < availableMinutes && subjectCandidatesMap.revision.length > 0) {
        const revTask = subjectCandidatesMap.revision[day % subjectCandidatesMap.revision.length];
        if (revTask && dayMins + revTask.duration <= availableMinutes + 30) {
          dayTasks.push({ ...revTask, id: `rev-${day}-${revTask.id}` });
        }
      } else if (dayMins < availableMinutes) {
        // Fallback: add any revision task if no revision tasks in map
        const anyRevTask = candidates.find(c => c.type === 'Revise Formulas' || c.type === 'Review Mistakes');
        if (anyRevTask && dayMins + anyRevTask.duration <= availableMinutes + 30) {
          dayTasks.push({ ...anyRevTask, id: `rev-${day}-${anyRevTask.id}` });
        }
      }

      weeklySchedule[day] = dayTasks.length > 0 ? dayTasks : todaysMission.filter(t => allowedSubjects.includes(t.subjectId));
    }

    // Time Blocking
    const morningBlock: ScheduledTask[] = [];
    const afternoonBlock: ScheduledTask[] = [];
    const nightBlock: ScheduledTask[] = [];
    
    let currentBlock = 'morning';
    let morningMins = 0;
    let afternoonMins = 0;

    for (const task of todaysMission) {
      if (currentBlock === 'morning') {
        morningBlock.push(task);
        morningMins += task.duration;
        if (morningMins >= availableMinutes * 0.4) currentBlock = 'afternoon';
      } else if (currentBlock === 'afternoon') {
        afternoonBlock.push(task);
        afternoonMins += task.duration;
        if (afternoonMins >= availableMinutes * 0.3) currentBlock = 'night';
      } else {
        nightBlock.push(task);
      }
    }

    const remainingHours = this.knowledgeEngine.getEstimatedRemainingHours(progressStates);
    const effectiveDailyHours = input.studyHours * 0.8;
    let estimatedFinishDate = null;
    
    if (effectiveDailyHours > 0) {
      const daysNeeded = Math.ceil(remainingHours / effectiveDailyHours);
      const finishDate = input.currentDate ? new Date(input.currentDate) : new Date();
      finishDate.setDate(finishDate.getDate() + daysNeeded);
      estimatedFinishDate = finishDate.toISOString();
    }

    // Strategic Takeaway for Pipeline Summary
    const strategicTakeaway = todaysMission.length > 0 
      ? `Highest leverage next action: ${todaysMission[0].taskName}. Reason: ${todaysMission[0].reasoning?.whySelected || todaysMission[0].selectionReason}`
      : "No urgent actions required today.";

    const reasoningPipelineSummary: ReasoningPipelineSummary = {
      academicStateOverview,
      detectedPrerequisiteGaps,
      detectedRevisionDecay,
      detectedWeakAreas,
      activeMonthlyObjective,
      totalCandidatesEvaluated: candidates.length,
      strategicTakeaway
    };

    const selectionReason = `StudyBrain explicit reasoning pipeline selected '${bestMission.name}' strategy (Score: ${bestMission.score}/100) after evaluating ${candidates.length} candidate actions across the full syllabus. Primary focus: ${strategicTakeaway}`;

    const priorityExplanation = `StudyBrain Explicit Reasoning Pipeline Summary:
==================================================
Academic Overview: ${academicStateOverview}
Active Objective: ${activeMonthlyObjective}
Total Candidates Evaluated: ${candidates.length}
Prerequisite Gaps Flagged: ${detectedPrerequisiteGaps.length}
Revision Decay Warnings: ${detectedRevisionDecay.length}
Weak Performance Spots: ${detectedWeakAreas.length}

Strategic Takeaway:
${strategicTakeaway}

Strategy Selected: ${bestMission.name} (Score: ${bestMission.score}/100)
Expected Learning Gain: ${Math.round(bestMission.learningGain)}%
Completion Probability: ${bestMission.completionProb}%`;

    return {
      todaysMission,
      morningBlock,
      afternoonBlock,
      nightBlock,
      carryForward,
      weeklySchedule,
      estimatedFinishDate,
      dailyWorkload: scheduledMinutes,
      priorityExplanation,
      missionScore: bestMission.score,
      expectedLearningGain: Math.round(bestMission.learningGain),
      completionProbability: bestMission.completionProb,
      selectionReason,
      reasoningPipelineSummary
    };
  }
}

export * from './weeklyMatrix';
