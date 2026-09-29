import { PlannerInput, ScheduledTask } from '../types';
import { SubjectId } from '../../types/index';

export interface CandidateMission {
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

export interface MultiStrategySelectionResult {
  bestMission: CandidateMission;
  todaysMission: ScheduledTask[];
  carryForward: ScheduledTask[];
  scheduledMinutes: number;
  todaysCandidates: ScheduledTask[];
  splitStrategy: string;
  twoDayConfig: [SubjectId[], SubjectId[], SubjectId[]];
}

export function selectOptimalMission(
  candidates: ScheduledTask[],
  input: PlannerInput,
  availableMinutes: number
): MultiStrategySelectionResult {
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

  const candidateMissions: CandidateMission[] = [];

  // Strategy 1: High Priority Balanced Selection
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

  // Lookahead Simulation scoring
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

  return {
    bestMission,
    todaysMission,
    carryForward,
    scheduledMinutes,
    todaysCandidates,
    splitStrategy,
    twoDayConfig
  };
}
