import { SyllabusNode, ProgressState } from './types';

export class KnowledgeEngine {
  private syllabus: Map<string, SyllabusNode> = new Map();
  private dependencyTreeCache: Map<string, string[]> = new Map();
  private prerequisiteTreeCache: Map<string, string[]> = new Map();

  constructor(nodes: SyllabusNode[]) {
    // Fast clone to avoid mutating the original source while maintaining high performance
    for (const node of nodes) {
      this.syllabus.set(node.id, {
        ...node,
        prerequisites: node.prerequisites ? [...node.prerequisites] : [],
        unlockedChapters: node.unlockedChapters ? [...node.unlockedChapters] : [],
        tags: node.tags ? [...node.tags] : undefined,
        revisionDefaults: node.revisionDefaults ? {
          intervals: [...node.revisionDefaults.intervals]
        } : undefined
      });
    }
    this.computeUnlockedChapters();
  }

  /**
   * Automatically populates the `unlockedChapters` arrays based on `prerequisites`.
   */
  private computeUnlockedChapters(): void {
    for (const node of this.syllabus.values()) {
      node.unlockedChapters = [];
    }
    for (const node of this.syllabus.values()) {
      for (const reqId of node.prerequisites) {
        const reqNode = this.syllabus.get(reqId);
        if (reqNode && !reqNode.unlockedChapters.includes(node.id)) {
          reqNode.unlockedChapters.push(node.id);
        }
      }
    }
  }

  public getNode(chapterId: string): SyllabusNode | undefined {
    return this.syllabus.get(chapterId);
  }

  public getAllNodes(): SyllabusNode[] {
    return Array.from(this.syllabus.values());
  }

  /**
   * Returns all chapters that are fully unlocked (all prerequisites are mastered).
   */
  public getUnlockedChapters(progress: ProgressState[]): SyllabusNode[] {
    // Bug 1.4: Prereqs are satisfied if completion >= 70, or fully mastered, or theory + (dpp or pyqs)
    const passedPrereqIds = new Set(progress.filter(p => p.isMastered || p.completion >= 70 || (p.theoryComplete && (p.dppComplete || p.pyqsComplete))).map(p => p.chapterId));
    
    const completedIds = new Set(progress.filter(p => p.isMastered || p.completion === 100).map(p => p.chapterId));
    
    return this.getAllNodes().filter(node => {
      // If it's already mastered/completed, it's not "unlocked" to study, it's done.
      if (completedIds.has(node.id)) return false;
      const hasAllPrereqs = node.prerequisites.every(reqId => passedPrereqIds.has(reqId));
      return hasAllPrereqs;
    });
  }

  /**
   * Returns all chapters that are currently blocked by unmastered prerequisites.
   */
  public getBlockedChapters(progress: ProgressState[]): SyllabusNode[] {
    const passedPrereqIds = new Set(progress.filter(p => p.isMastered || p.completion >= 70 || (p.theoryComplete && (p.dppComplete || p.pyqsComplete))).map(p => p.chapterId));
    
    return this.getAllNodes().filter(node => {
      const hasAllPrereqs = node.prerequisites.every(reqId => passedPrereqIds.has(reqId));
      return !hasAllPrereqs;
    });
  }

  /**
   * Returns the best next chapters to study based on weightage, importance, and unlock status.
   */
  public getRecommendedNextChapters(progress: ProgressState[], limit: number = 25): SyllabusNode[] {
    const completedIds = new Set(progress.filter(p => p.completion === 100 || p.isMastered).map(p => p.chapterId));
    
    // getUnlockedChapters now inherently filters out completed ones
    const available = this.getUnlockedChapters(progress);

    const progressMap = new Map(progress.map(p => [p.chapterId, p]));
    const importanceScore: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
    
    available.sort((a, b) => {
      const progA = progressMap.get(a.id);
      const progB = progressMap.get(b.id);

      const compA = progA ? progA.completion : 0;
      const compB = progB ? progB.completion : 0;

      const isInProgressA = compA > 0 && compA < 100;
      const isInProgressB = compB > 0 && compB < 100;

      // 1. In-Progress active chapters FIRST (finish what you started)
      if (isInProgressA && !isInProgressB) return -1;
      if (!isInProgressA && isInProgressB) return 1;
      if (isInProgressA && isInProgressB) {
        // Higher completion in-progress chapters first to close them out
        if (compA !== compB) return compB - compA;
      }

      // 2. Importance (High > Medium > Low)
      const scoreA = importanceScore[a.importance || 'Medium'] || 0;
      const scoreB = importanceScore[b.importance || 'Medium'] || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;

      // 3. Weightage (Desc)
      return b.weightage - a.weightage;
    });

    return available.slice(0, limit);
  }

  /**
   * Traverses upwards to find all prerequisites (recursive) for a given chapter.
   */
  public getPrerequisiteTree(chapterId: string): string[] {
    if (this.prerequisiteTreeCache.has(chapterId)) {
      return this.prerequisiteTreeCache.get(chapterId)!;
    }

    const result = new Set<string>();
    
    const traverse = (currentId: string) => {
      const node = this.getNode(currentId);
      if (!node) return;
      for (const reqId of node.prerequisites) {
        if (!result.has(reqId)) {
          result.add(reqId);
          traverse(reqId);
        }
      }
    };
    
    traverse(chapterId);
    const deps = Array.from(result);
    this.prerequisiteTreeCache.set(chapterId, deps);
    return deps;
  }

  /**
   * Traverses downwards to find all chapters dependent on the given chapter.
   */
  public getDependencyTree(chapterId: string): string[] {
    if (this.dependencyTreeCache.has(chapterId)) {
      return this.dependencyTreeCache.get(chapterId)!;
    }

    const result = new Set<string>();
    
    const traverse = (currentId: string) => {
      const node = this.getNode(currentId);
      if (!node) return;
      for (const depId of node.unlockedChapters) {
        if (!result.has(depId)) {
          result.add(depId);
          traverse(depId);
        }
      }
    };
    
    traverse(chapterId);
    const deps = Array.from(result);
    this.dependencyTreeCache.set(chapterId, deps);
    return deps;
  }

  /**
   * Calculates total estimated remaining study hours for uncompleted chapters.
   */
  public getEstimatedRemainingHours(progress: ProgressState[]): number {
    let remaining = 0;
    const progressMap = new Map(progress.map(p => [p.chapterId, p]));

    for (const node of this.syllabus.values()) {
      const prog = progressMap.get(node.id);
      const completion = prog ? prog.completion : 0;
      if (completion < 100) {
        const remainingPct = (100 - completion) / 100;
        const fallbackHours = ((node.totalLectures || 12) * (node.avgLectureDuration || 60)) / 60 * 1.5;
        remaining += (node.estimatedHours || fallbackHours) * remainingPct;
      }
    }

    return Math.round(remaining * 10) / 10;
  }

  /**
   * Returns nodes that have not been fully completed.
   */
  public getRemainingSyllabus(progress: ProgressState[]): SyllabusNode[] {
    const completedIds = new Set(progress.filter(p => p.completion === 100).map(p => p.chapterId));
    return this.getAllNodes().filter(node => !completedIds.has(node.id));
  }
}
