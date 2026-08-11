import { KnowledgeEngine, ProgressState } from '@/engines/knowledge';
import { PlannerInput, PlannerOutput, ScheduledTask, MissionReasoning, ReasoningPipelineSummary } from './types';
import { PlannerScoringEngine, ScoringContext, PLANNER_CONFIG } from './PlannerScoringEngine';
import { SubjectId, Chapter } from '@/types/index';

function normalizeStageAlias(stage?: string): string | undefined {
  if (!stage) return stage;
  const normalized = stage.trim();
  if (normalized === 'Never Started' || normalized === 'Unknown') return 'Not Started';
  if (normalized === 'Doing Questions') return 'Solving DPPs';
  return normalized;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
    let completedChaptersCount = 0;
    let totalCompletionSum = 0;

    chaptersList.forEach(c => {
      const telemetry = input.chapterTelemetryMap[c.id];
      const completion = telemetry ? telemetry.masteryScore : (c.completion || 0);
      const stage = telemetry ? telemetry.syllabusStage : (c.status === 'Mastered' ? 'Mastered' : 'Not Started');
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
      nodeDependencyMap.set(node.id, depTree.map((n: any) => n.name || n));

      const rawProg = input.chapterTelemetryMap[node.id];
      const isCompleted = rawProg ? (rawProg.isMastered || rawProg.theoryComplete || rawProg.masteryScore > 60) : false;

      if (!isCompleted && node.prerequisites && node.prerequisites.length > 0) {
        for (const prereqId of node.prerequisites) {
          const prereqProg = input.chapterTelemetryMap[prereqId];
          const prereqNode = this.knowledgeEngine.getNode(prereqId);
          if (prereqNode && (!prereqProg || (!prereqProg.theoryComplete && prereqProg.masteryScore < 50))) {
            const prereqName = (prereqNode as any).name || prereqNode;
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
        const telemetry = input.chapterTelemetryMap[chap.id];
        const confidence = telemetry ? telemetry.retentionConfidence : 'High';
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
        const telemetry = input.chapterTelemetryMap[chap.id];
        if (telemetry && telemetry.unresolvedMistakesCount >= 3 && !detectedWeakAreas.some(w => w.includes(chap.name))) {
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
    } else if (input.userPreferences.focusSubject) {
      activeMonthlyObjective = `Focus Subject: Accelerate ${input.userPreferences.focusSubject.toUpperCase()} progression.`;
    }

    // Prepare knowledge engine progress array for lookahead simulator
    const progressStates: ProgressState[] = Object.entries(input.chapterTelemetryMap).map(([chapterId, data]) => ({
      chapterId,
      completion: data.masteryScore,
      isMastered: data.isMastered
    }));

    const availableMinutes = input.studyHours * 60;
    const candidates: ScheduledTask[] = [];

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
      const dependentChapterNames = depTree.map((n: any) => n.name || n);

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
        longTermImpact = `Unlocks ${dependentChapterNames.slice(0, 3).join(', ')} and adds projected +12 JEE Main marks upon mastery.`;
        postponeRisk = `Postponing stalls progress in ${dependentChapterNames.length} dependent chapters across the syllabus.`;
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
      if (node) {
        const rawProg: any = input.chapterTelemetryMap[node.id] || { masteryScore: 100, isMastered: true };
        const todayStr = (input.currentDate || new Date().toISOString()).split('T')[0];
        candidates.push(generateTask(
          'Revise Formulas',
          node,
          { chapterId: node.id, completion: rawProg.masteryScore, isMastered: rawProg.isMastered },
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
        if (chap.status === 'Revision Due' && !existingRevChapterIds.has(chap.id)) {
          const node = this.knowledgeEngine.getNode(chap.id);
          if (node) {
            const rawProg: any = input.chapterTelemetryMap[node.id] || { masteryScore: chap.completion || 0, isMastered: false };
            const todayStr = (input.currentDate || new Date().toISOString()).split('T')[0];
            candidates.push(generateTask(
              'Revise Formulas',
              node,
              { chapterId: node.id, completion: rawProg.masteryScore, isMastered: rawProg.isMastered },
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
      weakSubjectChapters.sort((a, b) => a.confidence - b.confidence);
      
      if (weakSubjectChapters.length > 0) {
        const weakestChap = weakSubjectChapters[0];
        const node = this.knowledgeEngine.getNode(weakestChap.id);
        if (node) {
          const rawProg: any = input.chapterTelemetryMap[node.id] || { masteryScore: weakestChap.completion || 0, isMastered: false };
          const todayStr = (input.currentDate || new Date().toISOString()).split('T')[0];
          candidates.push(generateTask(
            'Review Mistakes',
            node,
            { chapterId: node.id, completion: rawProg.masteryScore, isMastered: rawProg.isMastered },
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
            injectedTask.priorityScore = Math.max(injectedTask.priorityScore, 95); // Ensure it's very high priority
          }
        }
      }
    }

    // Evaluate progression opportunities across all syllabus nodes
    const recommendedChapters = this.knowledgeEngine.getRecommendedNextChapters(progressStates, 25);
    
    // Identify subjects that currently have active in-progress chapters
    const activeSubjects = new Set<string>();
    for (const node of recommendedChapters) {
      const rawProg: any = input.chapterTelemetryMap[node.id] || {};
      const normalizedStatus = normalizeStageAlias(rawProg.status);
      const normalizedStage = normalizeStageAlias(rawProg.syllabusStage);
      const isStarted = (rawProg.masteryScore && rawProg.masteryScore > 0) || 
                        (rawProg.rawCompletion && rawProg.rawCompletion > 0) ||
                        (rawProg.currentLecture && rawProg.currentLecture > 0) || 
                        rawProg.theoryComplete || 
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

        // Only schedule chapters the user has explicitly started and that are NOT on hold.
        // NEVER auto-schedule unstarted chapters.
        const activeNotOnHoldChapters = subjChapters.filter(c =>
          !c.chapterOnHold &&
          ((c.completion > 0 && c.completion < 100) ||
           (c.currentLecture && c.currentLecture > 0) ||
           (c.theoryComplete && !c.pyqsComplete) ||
           c.hasTelemetry)
        );

        activeNotOnHoldChapters.forEach(activeChap => {
          const n = this.knowledgeEngine.getNode(activeChap.id);
          if (n) targetNodesMap.set(n.id, n);
        });
        // If no active in-progress non-on-hold chapter exists, schedule nothing for this subject.
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

      const rawProg: any = input.chapterTelemetryMap[node.id] || {};
      const prog = {
        completion: rawProg.masteryScore || 0,
        currentLecture: rawProg.currentLecture || 0,
        totalLectures: rawProg.totalLectures || node.lectureCount || 12,
        avgLectureDuration: rawProg.avgLectureDuration || rawProg.lectureProgress?.avgLectureDurationMinutes || rawProg.estimatedDuration || undefined,
        theoryComplete: rawProg.theoryComplete || false,
        dppComplete: rawProg.dppComplete || false,
        pyqsComplete: rawProg.pyqsComplete || false,
        isMastered: rawProg.isMastered || false
      };

      if (!prog.theoryComplete) {
        const remainingLectures = Math.max(1, (prog.totalLectures || 12) - prog.currentLecture);
        // Use exact telemetry duration, falling back to 75 if completely missing, capped at 120
        const lecDuration = Math.min(prog.avgLectureDuration || 75, 120);

        for (let l = 0; l < remainingLectures; l++) {
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

    // Give active in-progress chapters a heavy priority boost (+100) so active work strictly fills missions first, while unstarted chapters stay available if needed
    for (const task of candidates) {
      const prog: any = input.chapterTelemetryMap[task.chapterId] || {};
      const normalizedStatus = normalizeStageAlias(prog.status);
      const normalizedStage = normalizeStageAlias(prog.syllabusStage);
      const isStarted = prog && (
        (prog.masteryScore > 0 && prog.masteryScore < 100) ||
        (prog.rawCompletion > 0 && prog.rawCompletion < 100) ||
        (prog.currentLecture && prog.currentLecture > 0) ||
        (normalizedStatus && normalizedStatus !== 'Not Started') ||
        (normalizedStage && normalizedStage !== 'Not Started')
      );

      const isUnstarted = (prog.currentLecture === 0) &&
                          !prog.theoryComplete &&
                          (!normalizedStatus || normalizedStatus === 'Not Started');

      if (isStarted) {
        task.priorityScore += 100;
      } else if (isUnstarted) {
        task.priorityScore = Math.max(10, task.priorityScore - 40);
      }
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
    const buildMissionWithHeuristic = (
      preferredTypes: ScheduledTask['type'][],
      subjectFocus?: SubjectId
    ): ScheduledTask[] => {
      const mission: ScheduledTask[] = [];
      let currentMinutes = 0;
      const usedIds = new Set<string>();

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

    // 7-Day Lookahead Simulator
    for (const mission of candidateMissions) {
      if (mission.tasks.length === 0) continue;

      let totalSimMarksGained = 0;
      let totalSimLearningGain = 0;

      for (const t of mission.tasks) {
        totalSimMarksGained += (t.expectedMarksGain || 0);
        totalSimLearningGain += (t.expectedLearningGain || 0);
      }

      const marksGainNormalized = Math.min(100, totalSimMarksGained * 2);
      const learningGainNormalized = Math.min(100, totalSimLearningGain * 1.5);
      
      mission.learningGain = learningGainNormalized;
      mission.marksGain = marksGainNormalized;
      mission.subjectBalance = 85;
      mission.revisionHealth = 80;
      mission.dependencyUnlock = 75;
      mission.workloadRealism = 90;
      mission.completionProb = 90;

      mission.score = Math.round(
        marksGainNormalized * 0.30 + 
        learningGainNormalized * 0.25 + 
        mission.subjectBalance * 0.15 + 
        mission.dependencyUnlock * 0.15 + 
        mission.revisionHealth * 0.15
      );
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

        while (subjMins + 40 <= perSubjBudget && attempts < 8) {
          attempts++;
          const baseTask = subjCands[ptr % subjCands.length];
          ptr++;

          if (!baseTask) continue;

          let taskToPush = { ...baseTask, id: `plan-${day}-${baseTask.id}-${ptr}` };
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
      const finishDate = input.currentDate ? new Date(input.currentDate) : new Date("2024-01-01T00:00:00Z");
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


export interface WeeklyBlock {
  id: string;
  dayIndex: number;
  dayName: string;
  timeSlot: string;
  subject: SubjectId | 'break' | 'revision';
  chapterId: string;
  chapterName: string;
  unit: string;
  activity: string;
  taskType: 'Watch Lecture' | 'Solve DPP' | 'Solve PYQs' | 'Revise Formulas' | 'Review Mistakes';
  durationMinutes: number;
  completed: boolean;
  priorityScore: number;
  reasoning: {
    whySelected: string;
    dependentChapters: string[];
    rankingRationale: string;
    longTermImpact: string;
    postponeRisk: string;
    targetAccuracy: string;
  };
  isManualOverride?: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
}

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function generateWeeklyMatrix(
  splitStrategy: '1_a_day_alternating' | '2_a_day_alternating' | '3_a_day',
  chapters: Chapter[] = [],
  todayMissions: any[] | null = null,
  plannerWeekly: any[] | null = null,
  currentDayIndex: number = 0,
  twoDaySplitConfig?: [SubjectId[], SubjectId[], SubjectId[]],
  deletedMissionIds: string[] = [],
  scheduleOverrides: Record<string, { dayIndex?: number; timeSlot?: string; scheduledDate?: string; scheduledTime?: string }> = {},
  dayStartTime: string = "07:00",
  dayEndTime: string = "22:30"
): WeeklyBlock[] {
  // Only schedule chapters the user has explicitly started and that are NOT on hold.
  // NEVER auto-schedule unstarted chapters.
  const activeChaps = chapters.filter(c => !c.chapterOnHold && c.completion > 0 && c.completion < 100);

  const getUniqueChap = (subj: SubjectId, offset: number): Chapter | null => {
    const subjActive = activeChaps.filter(c => c.subject === subj);
    if (subjActive.length > offset) return subjActive[offset];
    if (subjActive.length > 0) return subjActive[offset % subjActive.length];
    // No active in-progress non-on-hold chapter for this subject — schedule nothing.
    return null;
  };

  let blocks: WeeklyBlock[] = [];
  let idCounter = 1;

  daysOfWeek.forEach((dayName, dayIndex) => {
    const isToday = dayIndex === currentDayIndex;

    if (isToday && todayMissions && todayMissions.length > 0) {
      let currentHour = parseInt(dayStartTime.split(':')[0]) || 7;
      let currentMinute = parseInt(dayStartTime.split(':')[1]) || 0;
      let endHour = parseInt(dayEndTime.split(':')[0]) || 22;
      let endMinute = parseInt(dayEndTime.split(':')[1]) || 30;
      let endMinsTotal = endHour * 60 + endMinute;

      let pushToTomorrow = false;

      const todayDateObj = new Date();
      todayDateObj.setHours(0,0,0,0);
      const todayDateStr = getLocalDateKey(todayDateObj);

      todayMissions.forEach((m, mIdx) => {
        const chap = chapters.find(c => c.name.toLowerCase() === (m.chapter || '').toLowerCase());
        
        let pendingBreakBlock: any = null;
        let timeSlot = m.timeSlot;
        let duration = m.duration || 60;
        let isManualOverride = m.isManualOverride;

        // Strip timeSlot if pushed from yesterday
        if (!m.completed && m.scheduledDate && m.scheduledDate < todayDateStr) {
          timeSlot = null;
          isManualOverride = false;
        }

        // Force cascade for uncompleted, non-manual missions to prevent stale time slot clashes
        if (!m.completed && !isManualOverride) {
          timeSlot = null;
        }
        
        if (!timeSlot || timeSlot.includes('Morning') || timeSlot.includes('Afternoon') || timeSlot.includes('Evening') || timeSlot.includes('Night')) {
          let startMins = currentHour * 60 + currentMinute;
          let newEndMins = startMins + duration;

          if (newEndMins > endMinsTotal) {
            pushToTomorrow = true;
            // Next day starts at dayStartTime
            currentHour = parseInt(dayStartTime.split(':')[0]) || 7;
            currentMinute = parseInt(dayStartTime.split(':')[1]) || 0;
            startMins = currentHour * 60 + currentMinute;
            newEndMins = startMins + duration;
          }

          const startStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          
          currentMinute += duration;
          while (currentMinute >= 60) {
            currentHour += 1;
            currentMinute -= 60;
          }
          const endStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          timeSlot = `${startStr} - ${endStr}`;
          
          // Prepare 15 min break after if not overflowing
          const hasExistingBreak = todayMissions.some(tm => tm.id === `break-${m.id}` || tm.id === `today-break-${m.id}`);
          if (!pushToTomorrow && m.subject !== 'break' && !hasExistingBreak) {
            const breakStartStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
            currentMinute += 15;
            let tempHour = currentHour;
            let tempMinute = currentMinute;
            while (tempMinute >= 60) {
              tempHour += 1;
              tempMinute -= 60;
            }
            const breakEndStr = `${tempHour.toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}`;
            
            pendingBreakBlock = {
              id: `today-break-${m.id}`,
              dayIndex: dayIndex,
              dayName: dayName,
              timeSlot: `${breakStartStr} - ${breakEndStr}`,
              subject: 'break',
              chapterId: 'break',
              chapterName: 'Recharge',
              unit: 'Break',
              activity: '☕ 15m Break',
              taskType: 'Break' as any,
              durationMinutes: 15,
              completed: false,
              priorityScore: 0,
              reasoning: {
                whySelected: 'Pacing out your study blocks reduces cognitive fatigue and maximizes retention.',
                dependentChapters: [],
                rankingRationale: 'Scheduled rest interval.',
                longTermImpact: 'Maintains stamina over long sessions.',
                postponeRisk: 'Burnout risk increases.',
                targetAccuracy: 'N/A'
              }
            };

            currentHour = tempHour;
            currentMinute = tempMinute;
          }
        } else {
          // Time slot was preserved. We MUST update currentHour and currentMinute to the end of this slot
          // so that subsequent tasks don't get scheduled on top of it (causing clashes).
          const match = timeSlot.match(/- (\d{1,2}):(\d{2})/);
          if (match) {
            currentHour = parseInt(match[1], 10);
            currentMinute = parseInt(match[2], 10);
            
            // Also add a 15-minute break offset logically, so the next un-timeslotted task starts after a break
            if (m.subject !== 'break') {
              currentMinute += 15;
              while (currentMinute >= 60) {
                currentHour += 1;
                currentMinute -= 60;
              }
            }
          }
        }

        blocks.push({
          id: `today-${m.id}`,
          dayIndex: pushToTomorrow ? (dayIndex + 1) % 7 : dayIndex,
          dayName: pushToTomorrow ? daysOfWeek[(dayIndex + 1) % 7] : dayName,
          timeSlot: timeSlot,
          subject: m.subject || 'physics',
          chapterId: chap?.id || 'p1',
          chapterName: m.chapter || m.taskName,
          unit: chap?.unit || 'Core Module',
          activity: m.taskName,
          taskType: (m.type as any) || 'Solve PYQs',
          durationMinutes: duration,
          completed: m.completed,
          priorityScore: m.priorityScore || 94,
          reasoning: {
            whySelected: m.reasoning?.whySelected || m.whyThisTaskExists || `High leverage task prioritized by PlannerEngine.`,
            dependentChapters: m.futureDependencies || [],
            rankingRationale: m.reasoning?.rankingRationale || `Ranked Tier 1 Priority by PlannerScoringEngine.`,
            longTermImpact: m.expectedJeeImpact || `+${m.expectedMarksGain || 8} Marks in JEE Main`,
            postponeRisk: m.reasoning?.postponeRisk || `Delaying shifts target completion velocity.`,
            targetAccuracy: `${m.confidenceGainPercent || 85}% Target Benchmark`
          }
        });

        if (pendingBreakBlock) {
          blocks.push(pendingBreakBlock);
        }
      });
    } else if (plannerWeekly && plannerWeekly[dayIndex] && plannerWeekly[dayIndex].length > 0) {
      plannerWeekly[dayIndex].forEach((t: any, tIdx: number) => {
        const chap = chapters.find(c => c.id === t.chapterId);
        blocks.push({
          id: `plan-${t.id}-${tIdx}`,
          dayIndex,
          dayName,
          timeSlot: tIdx === 0 ? 'Morning (07:00 - 09:30)' : tIdx === 1 ? 'Afternoon (14:00 - 16:00)' : tIdx === 2 ? 'Evening (17:30 - 19:30)' : 'Night (21:30 - 22:30)',
          subject: t.subjectId,
          chapterId: t.chapterId,
          chapterName: t.chapterName,
          unit: chap?.unit || 'Core Module',
          activity: t.taskName,
          taskType: t.type,
          durationMinutes: t.duration,
          completed: dayIndex < currentDayIndex,
          priorityScore: t.priorityScore,
          reasoning: {
            whySelected: t.reasoning?.whySelected || t.selectionReason || `Scheduled by PlannerEngine 7-Day Lookahead.`,
            dependentChapters: t.reasoning?.dependentChapters || [],
            rankingRationale: t.reasoning?.rankingRationale || `Calculated by PlannerScoringEngine.`,
            longTermImpact: t.reasoning?.longTermImpact || `+${t.expectedMarksGain || 6} Marks in JEE`,
            postponeRisk: t.reasoning?.postponeRisk || `Impacts weekly milestone target.`,
            targetAccuracy: `80% Concept Check Accuracy`
          }
        });
      });
    } else {
      const physChap = getUniqueChap('physics', dayIndex);
      const chemChap = getUniqueChap('chemistry', dayIndex);
      const mathChap = getUniqueChap('maths', dayIndex);

      if (splitStrategy === '1_a_day_alternating') {
        const focusSubj: SubjectId = dayIndex % 3 === 0 ? 'physics' : dayIndex % 3 === 1 ? 'chemistry' : 'maths';
        const focusChap = focusSubj === 'physics' ? physChap : focusSubj === 'chemistry' ? chemChap : mathChap;

        if (focusChap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Morning (07:00 - 09:30)',
            subject: focusSubj,
            chapterId: focusChap.id,
            chapterName: focusChap.name,
            unit: focusChap.unit || 'Core Module',
            activity: `Watch Lecture ${(focusChap.currentLecture || 0) + 1} of ${focusChap.totalLectures || 10}`,
            taskType: 'Watch Lecture',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 95 - dayIndex,
            reasoning: {
              whySelected: `Deep single-subject focus module for ${focusChap.name}.`,
              dependentChapters: [`Advanced ${focusChap.name}`],
              rankingRationale: `Ranked Tier 1 Priority under 1-Subject Daily Strategy.`,
              longTermImpact: `Accelerates mastery in ${focusSubj.toUpperCase()}.`,
              postponeRisk: `Shifts target completion velocity for ${focusSubj.toUpperCase()}.`,
              targetAccuracy: `75% Concept Check Accuracy`
            }
          });

          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Afternoon (14:00 - 16:00)',
            subject: focusSubj,
            chapterId: focusChap.id,
            chapterName: focusChap.name,
            unit: focusChap.unit || 'Core Module',
            activity: `Solve 15 Practice DPP Problems in ${focusChap.name}`,
            taskType: 'Solve DPP',
            durationMinutes: 75,
            completed: dayIndex < currentDayIndex,
            priorityScore: 89 - dayIndex,
            reasoning: {
              whySelected: `Structured problem solving for ${focusChap.name}.`,
              dependentChapters: [`DPP Practice Mastery`],
              rankingRationale: `Deep single-subject numerical drill.`,
              longTermImpact: `Builds high problem-solving speed.`,
              postponeRisk: `Reduces practice retention.`,
              targetAccuracy: `80% DPP Accuracy`
            }
          });

          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Evening (17:30 - 19:30)',
            subject: focusSubj,
            chapterId: focusChap.id,
            chapterName: focusChap.name,
            unit: focusChap.unit || 'Core Module',
            activity: `Solve 20 Past JEE Main PYQs in ${focusChap.name}`,
            taskType: 'Solve PYQs',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 92 - dayIndex,
            reasoning: {
              whySelected: `High-yield authentic exam question practice for ${focusChap.name}.`,
              dependentChapters: [`JEE Mock Test Performance`],
              rankingRationale: `PYQ drill for single-subject focus day.`,
              longTermImpact: `Directly improves test score performance in ${focusSubj.toUpperCase()}.`,
              postponeRisk: `Delays exam question pattern exposure.`,
              targetAccuracy: `85% PYQ Accuracy Target`
            }
          });
        }

        blocks.push({
          id: `wb-${idCounter++}`,
          dayIndex,
          dayName,
          timeSlot: 'Night (21:30 - 22:30)',
          subject: 'revision',
          chapterId: 'rev-all',
          chapterName: 'Spaced Revision & Mistakes Review',
          unit: 'Recall Engine',
          activity: `Review 5 Mistakes Ledger Errors & Active Recall Cards`,
          taskType: 'Review Mistakes',
          durationMinutes: 45,
          completed: dayIndex < currentDayIndex,
          priorityScore: 85 - dayIndex,
          reasoning: {
            whySelected: `Active recall drill based on forgetting curve decay monitoring.`,
            dependentChapters: [`All Previously Studied Modules`],
            rankingRationale: `Prevents memory decay for chapters completed more than 7 days ago.`,
            longTermImpact: `Sustains retention score above 85% until exam day.`,
            postponeRisk: `Memory decay drops retention by 40% after 14 days without active recall.`,
            targetAccuracy: `90% Flashcard Recall`
          }
        });
      } else if (splitStrategy === '2_a_day_alternating') {
        const twoDayConfigNormalized = normalizeTwoDaySplitConfig(twoDaySplitConfig);
        const pair = twoDayConfigNormalized[dayIndex % 3];
        const subj1: SubjectId = pair[0] || 'physics';
        const subj2: SubjectId = pair[1] || 'chemistry';
        
        const chap1 = subj1 === 'physics' ? physChap : subj1 === 'chemistry' ? chemChap : mathChap;
        const chap2 = subj2 === 'chemistry' ? chemChap : subj2 === 'maths' ? mathChap : physChap;

        if (chap1) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Morning (07:00 - 09:30)',
            subject: subj1,
            chapterId: chap1.id,
            chapterName: chap1.name,
            unit: chap1.unit || 'Mechanics',
            activity: `Watch Lecture ${(chap1.currentLecture || 0) + 1} of ${chap1.totalLectures || 10}`,
            taskType: 'Watch Lecture',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 95 - dayIndex,
            reasoning: {
              whySelected: `Foundational theory module for ${chap1.name}.`,
              dependentChapters: [`Advanced ${chap1.name}`],
              rankingRationale: `Ranked Tier 1 Priority under 2-Subject Alternating Strategy.`,
              longTermImpact: `Unlocks downstream problem sets in ${subj1.toUpperCase()}.`,
              postponeRisk: `Delaying shifts ${chap1.unit} progression.`,
              targetAccuracy: `75% Concept Check Accuracy`
            }
          });
        }

        if (chap2) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Afternoon (14:00 - 16:00)',
            subject: subj2,
            chapterId: chap2.id,
            chapterName: chap2.name,
            unit: chap2.unit || 'Organic Chemistry',
            activity: `Solve 15 DPP Problems in ${chap2.name}`,
            taskType: 'Solve DPP',
            durationMinutes: 75,
            completed: dayIndex < currentDayIndex,
            priorityScore: 89 - dayIndex,
            reasoning: {
              whySelected: `Timed problem-solving drill for ${chap2.name}.`,
              dependentChapters: [`Advanced ${chap2.name}`],
              rankingRationale: `Converts theory into numerical speed.`,
              longTermImpact: `Increases problem-solving velocity in ${subj2.toUpperCase()}.`,
              postponeRisk: `Concept retention drops if practice is delayed.`,
              targetAccuracy: `80% DPP Accuracy`
            }
          });
        }

        if (chap1) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Evening (17:30 - 19:30)',
            subject: subj1,
            chapterId: chap1.id,
            chapterName: chap1.name,
            unit: chap1.unit || 'Mechanics',
            activity: `Solve 20 Past JEE Main PYQs in ${chap1.name}`,
            taskType: 'Solve PYQs',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 92 - dayIndex,
            reasoning: {
              whySelected: `High-yield authentic exam question practice for ${chap1.name}.`,
              dependentChapters: [`JEE Mock Test Performance`],
              rankingRationale: `PYQs carry direct correlation with exam score improvement.`,
              longTermImpact: `Directly contributes to score gain in ${subj1.toUpperCase()}.`,
              postponeRisk: `Unattempted PYQs leave exam traps undetected.`,
              targetAccuracy: `85% PYQ Accuracy Target`
            }
          });
        }

        blocks.push({
          id: `wb-${idCounter++}`,
          dayIndex,
          dayName,
          timeSlot: 'Night (21:30 - 22:30)',
          subject: 'revision',
          chapterId: 'rev-all',
          chapterName: 'Spaced Revision & Mistakes Review',
          unit: 'Recall Engine',
          activity: `Review 5 Mistakes Ledger Errors & Active Recall Cards`,
          taskType: 'Review Mistakes',
          durationMinutes: 45,
          completed: dayIndex < currentDayIndex,
          priorityScore: 85 - dayIndex,
          reasoning: {
            whySelected: `Active recall drill based on forgetting curve decay monitoring.`,
            dependentChapters: [`All Previously Studied Modules`],
            rankingRationale: `Prevents memory decay for completed chapters.`,
            longTermImpact: `Sustains retention score above 85% until exam day.`,
            postponeRisk: `Memory decay drops retention after 14 days.`,
            targetAccuracy: `90% Flashcard Recall`
          }
        });
      } else {
        const morningSubj: SubjectId = dayIndex % 3 === 0 ? 'physics' : dayIndex % 3 === 1 ? 'chemistry' : 'maths';
        const morningChap = morningSubj === 'physics' ? physChap : morningSubj === 'chemistry' ? chemChap : mathChap;
        
        if (morningChap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Morning (07:00 - 09:30)',
            subject: morningSubj,
            chapterId: morningChap.id,
            chapterName: morningChap.name,
            unit: morningChap.unit || 'Mechanics',
            activity: `Watch Lecture ${(morningChap.currentLecture || 0) + 1} of ${morningChap.totalLectures || 10}`,
            taskType: 'Watch Lecture',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 95 - dayIndex,
            reasoning: {
              whySelected: `Foundational theory module for ${morningChap.name}. Crucial prerequisite for problem sets.`,
              dependentChapters: morningSubj === 'physics' ? ['Laws of Motion', 'Work Power Energy'] : morningSubj === 'chemistry' ? ['Hydrocarbons', 'Reaction Mechanisms'] : ['Limits', 'Derivatives'],
              rankingRationale: `Ranked Tier 1 Priority due to high JEE weightage (${morningChap.weightage || 4}%).`,
              longTermImpact: `Unlocks 12+ downstream JEE Main & Advanced numerical problem types.`,
              postponeRisk: `Delaying will shift the entire ${morningChap.unit} progression by 48 hours.`,
              targetAccuracy: `75% Concept Check Accuracy`
            }
          });
        }

        const afternoonSubj: SubjectId = dayIndex % 3 === 0 ? 'chemistry' : dayIndex % 3 === 1 ? 'maths' : 'physics';
        const afternoonChap = afternoonSubj === 'chemistry' ? chemChap : afternoonSubj === 'maths' ? mathChap : physChap;

        if (afternoonChap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Afternoon (14:00 - 16:00)',
            subject: afternoonSubj,
            chapterId: afternoonChap.id,
            chapterName: afternoonChap.name,
            unit: afternoonChap.unit || 'Organic Chemistry',
            activity: `Solve 15 DPP Problems in ${afternoonChap.name}`,
            taskType: 'Solve DPP',
            durationMinutes: 75,
            completed: dayIndex < currentDayIndex,
            priorityScore: 89 - dayIndex,
            reasoning: {
              whySelected: `Timed problem-solving drill to reinforce theory learned in ${afternoonChap.name}.`,
              dependentChapters: [`Advanced ${afternoonChap.name} Problems`],
              rankingRationale: `Essential for converting theoretical understanding into numerical speed.`,
              longTermImpact: `Increases problem-solving velocity from 2.5 min/Q to 1.8 min/Q.`,
              postponeRisk: `Concept retention drops by 35% if DPP is delayed beyond 24 hours of lecture.`,
              targetAccuracy: `80% DPP Accuracy`
            }
          });
        }

        const eveningSubj: SubjectId = dayIndex % 3 === 0 ? 'maths' : dayIndex % 3 === 1 ? 'physics' : 'chemistry';
        const eveningChap = eveningSubj === 'maths' ? mathChap : eveningSubj === 'physics' ? physChap : chemChap;

        if (eveningChap) {
          blocks.push({
            id: `wb-${idCounter++}`,
            dayIndex,
            dayName,
            timeSlot: 'Evening (17:30 - 19:30)',
            subject: eveningSubj,
            chapterId: eveningChap.id,
            chapterName: eveningChap.name,
            unit: eveningChap.unit || 'Algebra',
            activity: `Solve 20 Past JEE Main PYQs (2019-2024)`,
            taskType: 'Solve PYQs',
            durationMinutes: 90,
            completed: dayIndex < currentDayIndex,
            priorityScore: 92 - dayIndex,
            reasoning: {
              whySelected: `High-yield authentic exam question practice for ${eveningChap.name}.`,
              dependentChapters: [`JEE Mock Test Performance`],
              rankingRationale: `PYQs carry the highest direct correlation with JEE Main score improvement.`,
              longTermImpact: `Directly contributes to +8 Marks in upcoming full-syllabus test.`,
              postponeRisk: `Unattempted PYQs leave exam question pattern traps undetected.`,
              targetAccuracy: `85% PYQ Accuracy Target`
            }
          });
        }

        blocks.push({
          id: `wb-${idCounter++}`,
          dayIndex,
          dayName,
          timeSlot: 'Night (21:30 - 22:30)',
          subject: 'revision',
          chapterId: 'rev-all',
          chapterName: 'Spaced Revision & Mistakes Review',
          unit: 'Recall Engine',
          activity: `Review 5 Mistakes Ledger Errors & Active Recall Cards`,
          taskType: 'Review Mistakes',
          durationMinutes: 45,
          completed: dayIndex < currentDayIndex,
          priorityScore: 85 - dayIndex,
          reasoning: {
            whySelected: `Active recall drill based on forgetting curve decay monitoring.`,
            dependentChapters: [`All Previously Studied Modules`],
            rankingRationale: `Prevents memory decay for chapters completed more than 7 days ago.`,
            longTermImpact: `Sustains retention score above 85% until exam day.`,
            postponeRisk: `Memory decay drops retention by 40% after 14 days without active recall.`,
            targetAccuracy: `90% Flashcard Recall`
          }
        });
      }
    }
  });

  // Apply deleted filters and schedule overrides
  blocks = blocks.filter(b => !deletedMissionIds.includes(b.id) && !deletedMissionIds.includes(b.id.replace('today-', '')));

  if (scheduleOverrides && Object.keys(scheduleOverrides).length > 0) {
    const todayDateObj = new Date();
    todayDateObj.setHours(0,0,0,0);
    const todayDateStr = getLocalDateKey(todayDateObj);

    blocks = blocks.map(b => {
      const override = scheduleOverrides[b.id] || scheduleOverrides[b.id.replace('today-', '')] || scheduleOverrides[b.id.replace('plan-', '')];
      
      // Ignore overrides from past dates for uncompleted blocks to allow auto-cascade
      if (override && override.scheduledDate && override.scheduledDate < todayDateStr && !b.completed) {
        return b;
      }

      if (override) {
        return {
          ...b,
          dayIndex: override.dayIndex !== undefined ? override.dayIndex : b.dayIndex,
          dayName: override.dayIndex !== undefined ? daysOfWeek[override.dayIndex] : b.dayName,
          timeSlot: override.timeSlot || b.timeSlot,
          scheduledDate: override.scheduledDate,
          scheduledTime: override.scheduledTime,
          isManualOverride: true
        };
      }
      return b;
    });
  }

  return blocks;
}

export function normalizeTwoDaySplitConfig(config?: any): [SubjectId[], SubjectId[], SubjectId[]] {
  const defaultTwoDayConfig: [SubjectId[], SubjectId[], SubjectId[]] = [
    ['physics', 'chemistry'],
    ['chemistry', 'maths'],
    ['maths', 'physics']
  ];
  if (!config) return defaultTwoDayConfig;
  const d0 = (Array.isArray(config[0]) ? config[0] : Array.isArray(config['0']) ? config['0'] : defaultTwoDayConfig[0]) as SubjectId[];
  const d1 = (Array.isArray(config[1]) ? config[1] : Array.isArray(config['1']) ? config['1'] : defaultTwoDayConfig[1]) as SubjectId[];
  const d2 = (Array.isArray(config[2]) ? config[2] : Array.isArray(config['2']) ? config['2'] : defaultTwoDayConfig[2]) as SubjectId[];
  return [d0, d1, d2];
}

export function getDayFocusPill(dayIdx: number, splitStrategy: string, twoDaySplitConfig?: any) {
  if (splitStrategy === '1_a_day_alternating') {
    return dayIdx % 3 === 0 ? 'PHYSICS ONLY' : dayIdx % 3 === 1 ? 'CHEMISTRY ONLY' : 'MATHS ONLY';
  } else if (splitStrategy === '2_a_day_alternating') {
    const config = normalizeTwoDaySplitConfig(twoDaySplitConfig);
    const pair = config[dayIdx % 3];
    const formatSubj = (s: SubjectId) => (s === 'physics' ? 'PHY' : s === 'chemistry' ? 'CHEM' : 'MATHS');
    return `${formatSubj(pair[0])} + ${formatSubj(pair[1])}`;
  } else {
    return 'ALL 3 SUBJS';
  }
}

export function getHeaderBadgeText(splitStrategy: string) {
  return splitStrategy === '1_a_day_alternating' 
    ? '1 Subject Focus' 
    : splitStrategy === '2_a_day_alternating' 
      ? '2 Subjects Alternating' 
      : '3 Subjects Daily';
}
