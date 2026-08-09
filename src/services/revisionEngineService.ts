import { Chapter, Mistake, TodayMission, RevisionSettings, RevisionStage } from '@/types/index';

export interface RevisionCard {
  chapterId: string;
  subject: 'physics' | 'chemistry' | 'maths';
  chapterName: string;
  reason: string;
  estimatedTime: number; // in minutes
  priority: 'High' | 'Medium' | 'Low';
  priorityScore: number;
  confidence: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  lastRevised: string; // e.g. "3 days ago"
  currentStage: RevisionStage;
  healthScore: number;
  retentionScore: number;
  retentionStatus: 'Fresh' | 'Stable' | 'Fading' | 'Forgotten';
  isCritical: boolean;
  daysOverdue: number;
}

export const RevisionEngineService = {
  // 1. Default configuration settings
  getDefaultSettings(): RevisionSettings {
    return {
      intervals: {
        revision1: 1,  // 1 day
        revision2: 3,  // 3 days
        revision3: 7,  // 7 days
        revision4: 15, // 15 days
        revision5: 30, // 30 days
      },
      maxRevisionsPerDay: 3,
      dailyTimeLimit: 60, // 60 minutes
      weights: {
        daysOverdue: 0.4,
        confidence: 0.2,
        importance: 0.1,
        dependencies: 0.1,
        mistakes: 0.2,
      },
    };
  },

  // 2. Resolve memory half-life/stability based on current lifecycle stage
  getMemoryStability(stage?: RevisionStage): number {
    switch (stage) {
      case 'Theory Complete':
        return 2;  // 2 days
      case 'DPP Complete':
        return 4;  // 4 days
      case 'Revision 1':
        return 8;  // 8 days
      case 'Revision 2':
        return 16; // 16 days
      case 'Revision 3':
        return 32; // 32 days
      case 'PYQs':
        return 64; // 64 days
      case 'Mock Test':
        return 90; // 90 days
      case 'Mastered':
        return 180; // 180 days
      default:
        return 1;  // 1 day default
    }
  },

  // 3. Estimate memory retention using the Forgetting Curve (half-life model)
  estimateRetention(chapter: Chapter): { retention: number; status: 'Fresh' | 'Stable' | 'Fading' | 'Forgotten' } {
    const daysSince = chapter.lastRevisionDaysAgo ?? 0;
    const stability = this.getMemoryStability(chapter.revisionStage || this.inferCurrentStage(chapter));
    
    // Retention R = 100 * (0.5) ^ (t / S)
    const retention = Math.round(100 * Math.pow(0.5, daysSince / stability));
    
    let status: 'Fresh' | 'Stable' | 'Fading' | 'Forgotten' = 'Fresh';
    if (retention >= 80) {
      status = 'Fresh';
    } else if (retention >= 60) {
      status = 'Stable';
    } else if (retention >= 40) {
      status = 'Fading';
    } else {
      status = 'Forgotten';
    }

    return { retention, status };
  },

  // Helper: Infer current stage based on completion parameters
  inferCurrentStage(chapter: Chapter): RevisionStage {
    if (chapter.revisionStage) return chapter.revisionStage;
    if (chapter.completion === 100 && chapter.pyqsComplete) return 'Mastered';
    if (chapter.pyqsComplete) return 'PYQs';
    if (chapter.revisionCount >= 3) return 'Revision 3';
    if (chapter.revisionCount === 2) return 'Revision 2';
    if (chapter.revisionCount === 1) return 'Revision 1';
    if (chapter.dppComplete) return 'DPP Complete';
    return 'Theory Complete';
  },

  // 4. Automatically update Chapter Health based on current status
  calculateHealth(chapter: Chapter, chapterMistakesCount: number): number {
    const { retention } = this.estimateRetention(chapter);
    
    // Weighted Health: Completion (20%), Confidence (45%), Retention (35%)
    // Subtract 4% penalty for each active mistake in this chapter (capped at -24%)
    const rawHealth = (chapter.completion * 0.20) + (chapter.confidence * 0.45) + (retention * 0.35);
    const penalty = Math.min(24, chapterMistakesCount * 4);
    
    return Math.max(0, Math.min(100, Math.round(rawHealth - penalty)));
  },

  // Helper: Get human-readable label for health score
  getHealthLabel(health: number): { text: string; color: string; bg: string; border: string } {
    if (health >= 95) return { text: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-500/20' };
    if (health >= 80) return { text: 'Strong', color: 'text-teal-400', bg: 'bg-teal-950/20', border: 'border-teal-500/20' };
    if (health >= 60) return { text: 'Needs Review', color: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-500/20' };
    if (health >= 40) return { text: 'Weak', color: 'text-orange-400', bg: 'bg-orange-950/20', border: 'border-orange-500/20' };
    return { text: 'Critical', color: 'text-red-400', bg: 'bg-red-950/20', border: 'border-red-500/20' };
  },

  // 5. Priority score computation
  calculatePriorityScore(
    chapter: Chapter,
    daysOverdue: number,
    mistakesCount: number,
    dependencyCount: number,
    settings: RevisionSettings
  ): number {
    const w = settings.weights;
    
    // Scale components between 0 and 100
    const overdueScore = Math.min(100, daysOverdue * 12);
    const weaknessScore = 100 - chapter.confidence;
    const importanceScore = (4 - chapter.priority) * 33.3; // 1 = 99.9, 2 = 66.6, 3 = 33.3
    const depScore = Math.min(100, dependencyCount * 25);
    const mistakeScore = Math.min(100, mistakesCount * 20);

    const priorityScore = (overdueScore * w.daysOverdue) +
                          (weaknessScore * w.confidence) +
                          (importanceScore * w.importance) +
                          (depScore * w.dependencies) +
                          (mistakeScore * w.mistakes);

    return Math.round(priorityScore);
  },

  // 6. Generate a prioritized and smart-rescheduled Daily Revision Queue
  generateRevisionQueue(
    chapters: Chapter[],
    mistakes: Mistake[],
    customSettings?: RevisionSettings
  ): RevisionCard[] {
    const settings = customSettings || this.getDefaultSettings();
    const queue: RevisionCard[] = [];

    // Calculate dependency count map
    const depCounts: Record<string, number> = {};
    chapters.forEach(c => {
      if (c.dependencies) {
        c.dependencies.forEach(depName => {
          depCounts[depName.toLowerCase()] = (depCounts[depName.toLowerCase()] || 0) + 1;
        });
      }
    });

    const mistakeCounts: Record<string, number> = {};
    mistakes.forEach(m => {
      if (m.revisionStatus !== 'Mastered' && m.chapter) {
        mistakeCounts[m.chapter.toLowerCase()] = (mistakeCounts[m.chapter.toLowerCase()] || 0) + 1;
      }
    });

    chapters.forEach(chapter => {
      // Check if eligible for spaced repetition revision
      // Must be at least Theory Complete or DPP Complete
      if (!chapter.theoryComplete && chapter.completion < 30) return;

      const currentStage = this.inferCurrentStage(chapter);
      if (currentStage === 'Mastered') return; // already finished!

      // Determine days to wait based on stage
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

      // Calculate days overdue
      const daysSinceLast = chapter.lastRevisionDaysAgo ?? 0;
      const daysOverdue = Math.max(0, daysSinceLast - intervalDays);

      // We revision is "due" if we are past the interval, OR if confidence is dangerously low (< 60)
      const isDue = daysSinceLast >= intervalDays || chapter.confidence < 60 || chapter.status === 'Revision Due';
      if (!isDue) return;

      // Unresolved Mistakes Count
      const mistakesCount = mistakeCounts[chapter.name.toLowerCase()] || 0;
      
      // Dependency weight
      const dependencyCount = depCounts[chapter.name.toLowerCase()] || 0;

      // Estimate Retention & Health
      const { retention, status: retentionStatus } = this.estimateRetention(chapter);
      const healthScore = this.calculateHealth(chapter, mistakesCount);

      // Priority calculation
      const priorityScore = this.calculatePriorityScore(chapter, daysOverdue, mistakesCount, dependencyCount, settings);

      // Estimated Time: scale based on difficulty
      let estimatedTime = 15;
      if (chapter.difficulty === 'Medium') estimatedTime = 20;
      if (chapter.difficulty === 'Hard') estimatedTime = 30;

      // Generate context-aware Reason string
      let reason = 'Spaced Repetition Due';
      if (daysOverdue > 3) {
        reason = `Highly Overdue (${daysOverdue} days)`;
      } else if (mistakesCount > 2) {
        reason = `${mistakesCount} Unresolved Errors`;
      } else if (chapter.confidence < 50) {
        reason = 'Low Concept Confidence';
      } else if (dependencyCount > 1) {
        reason = `Prerequisite for ${dependencyCount} Chapters`;
      } else {
        reason = `${currentStage} Checkpoint`;
      }

      // Determine Priority Category
      let priority: 'High' | 'Medium' | 'Low' = 'Low';
      if (priorityScore >= 65) priority = 'High';
      else if (priorityScore >= 35) priority = 'Medium';

      // Revisions are critical if overdue by > 3 days, have Critical health (< 40), or high priority score (>= 65)
      const isCritical = daysOverdue >= 3 || healthScore < 40 || priorityScore >= 65;

      queue.push({
        chapterId: chapter.id,
        subject: chapter.subject === 'maths' ? 'maths' : chapter.subject,
        chapterName: chapter.name,
        reason,
        estimatedTime,
        priority,
        priorityScore,
        confidence: chapter.confidence,
        difficulty: chapter.difficulty,
        lastRevised: daysSinceLast === 0 ? 'Today' : `${daysSinceLast} ${daysSinceLast === 1 ? 'day' : 'days'} ago`,
        currentStage,
        healthScore,
        retentionScore: retention,
        retentionStatus,
        isCritical,
        daysOverdue,
      });
    });

    // Sort by priorityScore descending
    queue.sort((a, b) => b.priorityScore - a.priorityScore);

    // Smart Rescheduling:
    // 1. Identify all critical items.
    // 2. Limit non-critical items so the total workload is manageable (maxRevisionsPerDay and dailyTimeLimit).
    // 3. Crucial rule: "Never postpone critical revisions. Move lower-priority revisions."
    
    const criticalItems = queue.filter(item => item.isCritical);
    const nonCriticalItems = queue.filter(item => !item.isCritical);

    const rescheduledQueue: RevisionCard[] = [];
    let currentTotalTime = 0;

    // 1. Always include all critical items first to never postpone them
    criticalItems.forEach(item => {
      rescheduledQueue.push(item);
      currentTotalTime += item.estimatedTime;
    });

    // 2. Fill the remaining spots with high-priority non-critical items, up to limits
    for (const item of nonCriticalItems) {
      if (rescheduledQueue.length >= settings.maxRevisionsPerDay && rescheduledQueue.length > 0) {
        // Already at max count. Avoid creating impossible workloads.
        break;
      }
      if (currentTotalTime + item.estimatedTime > settings.dailyTimeLimit && rescheduledQueue.length > 0) {
        // Exceeds time budget. Avoid creating impossible workloads.
        break;
      }
      rescheduledQueue.push(item);
      currentTotalTime += item.estimatedTime;
    }

    // Sort rescheduled queue again so they are beautifully ordered for today's plan
    return rescheduledQueue.sort((a, b) => b.priorityScore - a.priorityScore);
  },

  // 7. Merge revisions dynamically into Today's Missions optimized task list
  mergeMissionsWithRevisions(
    missions: TodayMission[],
    dueRevisions: RevisionCard[]
  ): TodayMission[] {
    const merged = [...missions];

    // Filter out existing standard revision tasks to avoid duplicates
    const filteredMissions = merged.filter(m => m.type !== 'Revise Formulas');

    // Add high priority revisions from our Revision Engine
    dueRevisions.forEach((rev, idx) => {
      filteredMissions.push({
        id: `m-revision-auto-${rev.chapterId}`,
        subject: rev.subject,
        chapter: rev.chapterName,
        type: 'Revise Formulas',
        taskName: `${rev.currentStage}: Active Recall on ${rev.chapterName}`,
        duration: rev.estimatedTime,
        completed: false,
        xp: rev.priority === 'High' ? 100 : 70,
        unlocked: idx === 0 // unlock the first one by default
      });
    });

    // Re-verify unlocks sequence
    filteredMissions.forEach((m, idx) => {
      if (idx > 0) {
        m.unlocked = filteredMissions[idx - 1].completed;
      } else {
        m.unlocked = true;
      }
    });

    return filteredMissions;
  }
};
