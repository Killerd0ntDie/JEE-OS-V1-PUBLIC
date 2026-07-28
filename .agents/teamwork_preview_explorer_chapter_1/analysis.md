# Milestone 1: Centralized ChapterInfoEngine & Action Dispatcher Architecture Analysis

## 1. Executive Summary

Milestone 1 establishes the single source of truth for all chapter-related telemetry, infographics, strategy radar metrics, bottleneck risk scores, and syllabus mastery calculations across JEE OS. 

Currently, chapter progress metrics, mastery calculations, and syllabus status are computed redundantly across multiple engines (`PlannerEngine`, `AnalyticsEngine`, `OptimizationEngine`, `StudyBrainService`, and UI components like `PlannerPage`, `DailyMissionTimeline`, and `ChapterCommandCard`). This fragmentation leads to inconsistent state representations and UI sync delays.

This document details the architectural specification and implementation design for:
1. `src/engines/chapterInfo/types.ts`: Telemetry, Infographics, Strategy Radar, and Input interfaces.
2. `src/engines/chapterInfo/ChapterInfoEngine.ts`: Centralized engine authority featuring memoized caching, selective cache invalidation, mastery calculations, syllabus stage categorization, lecture %, DPP/PYQ status, retention decay, strategy radar, weightage rank, and active bottleneck detection.
3. `src/actions/StudyBrainActions.ts`: Centralized mutation dispatchers for chapter state updates.
4. `src/runtime/StudyBrainRuntime.ts` & `src/context/StudyBrainContext.tsx`: Integration into the core runtime, exposing `state.chapterTelemetryMap`, and feeding telemetry into downstream engines.

---

## 2. Existing Codebase Analysis

### 2.1 File Map & Locations
- **Types**: `src/types/index.ts` (Defines `Chapter`, `SubjectId`, `Mistake`, `StudySession`, `MockResult`, `SyllabusDiagnosisStage`, `LectureProgress`, `PracticeProgress`, `RevisionState`)
- **ChapterInfo Types**: `src/engines/chapterInfo/types.ts`
- **ChapterInfo Engine**: `src/engines/chapterInfo/ChapterInfoEngine.ts` and `src/engines/chapterInfo/index.ts`
- **Runtime**: `src/runtime/StudyBrainRuntime.ts` (Owns application state, engine execution pipeline, subscriber notifications)
- **Context**: `src/context/StudyBrainContext.tsx` (React Context provider exposing state, runtime, and actions)
- **Actions Dispatcher**: `src/actions/StudyBrainActions.ts` (Handles mutations, state refreshes, and repository persistence)
- **Academic Utilities**: `src/utils/academicState.ts` (Provides `getAcademicState` and `normalizeChapter`)
- **Service Layer**: `src/services/studyBrainService.ts` (`calculateMastery`, syllabus completion calculations)

### 2.2 Key Findings from Investigation
1. **Existing Prototype Engine**: `src/engines/chapterInfo/ChapterInfoEngine.ts` currently exists as a baseline implementation in the codebase.
2. **Current Input Hash**: Uses `computeInputHash` based on chapter signatures (`id:completion:currentLecture:theoryComplete:dppComplete:pyqsComplete:status`), mistake count, and session count.
3. **Integration Point in Runtime**: `StudyBrainRuntime.ts` already instantiates `ChapterInfoEngine` in its constructor (line 108) and computes `this.state.chapterTelemetryMap` during `refresh` on triggers `INIT`, `CHAPTER_UPDATE`, `SESSION_UPDATE`, and `MISTAKE_UPDATE` (lines 238-248).
4. **Gaps to Address**:
   - `ChapterInfoEngine` public API needs additional query helper methods:
     - `getChapterTelemetry(chapterId: string): ChapterTelemetry | null`
     - `getAllChapterTelemetry(): Record<string, ChapterTelemetry>`
     - `getSubjectChapterTelemetry(subjectId: SubjectId): ChapterTelemetry[]`
     - `getChapterBottlenecks(): string[]`
     - `getStrategyRadar(chapterName: string, subject: SubjectId): ChapterStrategyRadar`
   - Downstream engines (`PlannerEngine`, `AnalyticsEngine`, `OptimizationEngine`, `RevisionEngine`) currently compute their own localized mastery/stage derivations from `Chapter` inputs instead of exclusively consuming `ChapterTelemetry`.
   - `StudyBrainActions.ts` has multiple chapter update methods (`updateChapterProgress`, `updateChapterStatus`, `toggleChapterStatus`, `updateChapterData`, `updateChapterDetailedDiagnosis`). These need a standardized dispatcher interface (`updateChapter` / `dispatchChapterMutation`) to unify chapter mutations.

---

## 3. Data Structure Specifications (`src/engines/chapterInfo/types.ts`)

```typescript
import { SubjectId, Chapter, Mistake, StudySession, MockResult } from '../../types/index';

/**
 * Strategy Radar metrics for radar visualizations & AI diagnostic assessments
 */
export interface ChapterStrategyRadar {
  masteryScore: number;                 // 0 - 100
  theoryCompletionPercent: number;     // 0 - 100
  dppCompletionPercent: number;        // 0 - 100
  pyqCompletionPercent: number;        // 0 - 100
  retentionConfidenceScore: number;    // 0 - 100 (High: 90, Medium: 70, Low: 40)
  jeeWeightageRank: 'Tier 1' | 'Tier 2' | 'Tier 3'; // Tier 1: >=6%, Tier 2: >=4%, Tier 3: <4%
  examWeightagePercent: number;        // Weightage % in JEE (e.g. 6.5%)
  bottleneckSeverity: 'Critical' | 'Moderate' | 'Low' | 'None';
}

/**
 * Infographics Data structure for UI cards, drawer badges, and header metrics
 */
export interface ChapterInfographicsData {
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  unit: string;
  masteryScore: number;
  syllabusStage: 'Not Started' | 'In Progress' | 'Mastered';
  currentLecture: number;
  totalLectures: number;
  theoryComplete: boolean;
  dppComplete: boolean;
  pyqsComplete: boolean;
  isMastered: boolean;
  weightagePercent: number;
  retentionConfidence: 'High' | 'Medium' | 'Low';
  unresolvedMistakesCount: number;
}

/**
 * Unified Telemetry Model — Single Source of Truth for a single chapter
 */
export interface ChapterTelemetry {
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  unit: string;
  masteryScore: number;
  syllabusStage: 'Not Started' | 'In Progress' | 'Mastered';
  currentLecture: number;
  totalLectures: number;
  theoryComplete: boolean;
  dppComplete: boolean;
  pyqsComplete: boolean;
  isMastered: boolean;
  weightagePercent: number;
  retentionConfidence: 'High' | 'Medium' | 'Low';
  unresolvedMistakesCount: number;
  strategyRadar: ChapterStrategyRadar;
  infographics: ChapterInfographicsData;
  isBottleneck: boolean;
  bottleneckReason?: string;
}

/**
 * Engine Input Bundle required to generate chapter telemetry map
 */
export interface ChapterInfoInput {
  chapters: Chapter[];
  mistakes: Mistake[];
  sessions: StudySession[];
  mocks: MockResult[];
}
```

---

## 4. `ChapterInfoEngine` Core Architecture (`src/engines/chapterInfo/ChapterInfoEngine.ts`)

### 4.1 Class Structure & Methods

```typescript
export class ChapterInfoEngine {
  private cache: Map<string, ChapterTelemetry> = new Map();
  private inputHash: string = '';

  /**
   * Primary Telemetry Generator — Returns cached map if input signature is unchanged.
   */
  public generateChapterTelemetry(input: ChapterInfoInput): Record<string, ChapterTelemetry>;

  /**
   * Look up telemetry for a single chapter by ID.
   */
  public getChapterTelemetry(chapterId: string): ChapterTelemetry | null;

  /**
   * Get all chapter telemetry as a Record map.
   */
  public getAllChapterTelemetry(): Record<string, ChapterTelemetry>;

  /**
   * Get telemetry array filtered by subject.
   */
  public getSubjectChapterTelemetry(subjectId: SubjectId): ChapterTelemetry[];

  /**
   * Retrieve active bottleneck descriptions (top 3 critical bottlenecks).
   */
  public getChapterBottlenecks(input?: ChapterInfoInput): string[];

  /**
   * Retrieve Strategy Radar metrics for a specific chapter name & subject.
   */
  public getStrategyRadar(chapterName: string, subject: SubjectId, input?: ChapterInfoInput): ChapterStrategyRadar;

  /**
   * Selective Cache Invalidation Helper.
   */
  public invalidateCache(): void;

  /**
   * Hash calculation based on state signature.
   */
  private computeInputHash(input: ChapterInfoInput): string;
}
```

### 4.2 Calculation Algorithms

1. **Mastery Score Calculation**:
   - Primary: `StudyBrainService.calculateMastery(chapter, unresolvedMistakes.length).score`.
   - Combines completion %, lecture watches, practice completion (DPP/PYQ), formula completion, and applies penalties for active unresolved mistakes (5 pts per mistake, max 30 pts).

2. **Syllabus Stage Determination**:
   - `isMastered = chapter.status === 'Mastered' || chapter.completion === 100`
   - `isStarted = (chapter.completion > 0 && chapter.completion < 100) || (chapter.currentLecture && chapter.currentLecture > 0) || chapter.theoryComplete`
   - `syllabusStage = isMastered ? 'Mastered' : isStarted ? 'In Progress' : 'Not Started'`

3. **Lecture Completion %**:
   - `theoryPct = chapter.theoryComplete ? 100 : Math.round(((chapter.currentLecture || 0) / (chapter.totalLectures || 12)) * 100)`

4. **Retention Decay & Confidence Score**:
   - `retentionConfidence = acad.revisionState?.retentionConfidence || 'High'`
   - `retentionConfidenceScore`: High = 90, Medium = 70, Low = 40.

5. **Weightage Rank**:
   - `weightage = chapter.weightage || 4.0`
   - `jeeWeightageRank = weightage >= 6.0 ? 'Tier 1' : weightage >= 4.0 ? 'Tier 2' : 'Tier 3'`

6. **Active Bottleneck Detection**:
   - If `isStarted` and `!isMastered`:
     - If `currentLecture < totalLectures`: Bottleneck = `${subject} ${name}: Lecture ${currentLecture}/${totalLectures} backlog`
     - Else if `!dppComplete`: Bottleneck = `${subject} ${name}: DPP practice pending`
     - Else if `!pyqsComplete`: Bottleneck = `${subject} ${name}: PYQs drill pending`
     - Else if `unresolvedMistakesCount >= 3`: Bottleneck = `${subject} ${name}: ${unresolvedMistakesCount} unresolved errors`
   - `isBottleneck`: `true` if any condition triggers.
   - `bottleneckSeverity`: `'Critical'` if `isBottleneck`, else `'None'`.

### 4.3 Memoization & Invalidation Logic

- **Hash Function**:
  ```typescript
  private computeInputHash(input: ChapterInfoInput): string {
    const chapSig = input.chapters
      .map(c => `${c.id}:${c.completion}:${c.currentLecture}:${c.theoryComplete}:${c.dppComplete}:${c.pyqsComplete}:${c.status}:${c.confidence}`)
      .join('|');
    return `${chapSig}_m${input.mistakes.length}_s${input.sessions.length}_mk${input.mocks.length}`;
  }
  ```
- **Selective Invalidation**:
  When `StudyBrainRuntime.refresh` runs with reason `'INIT'`, `'CHAPTER_UPDATE'`, `'SESSION_UPDATE'`, or `'MISTAKE_UPDATE'`, `generateChapterTelemetry` is called. If the input hash matches `this.inputHash`, cached data is returned instantly (0ms execution time).

---

## 5. Centralized Mutation Dispatcher (`src/actions/StudyBrainActions.ts`)

To ensure all chapter state mutations are processed consistently and invalidate `ChapterInfoEngine` cache predictably, `StudyBrainActions` provides unified action methods:

### 5.1 Standardized Chapter Mutation Dispatcher

```typescript
export class StudyBrainActions {
  // Existing methods preserved for backwards compatibility:
  // updateChapterProgress, toggleChapterStatus, updateChapterStatus, updateChapterData, updateChapterDetailedDiagnosis

  /**
   * Standardized Universal Chapter Mutation Dispatcher
   * Single entry point for updating any chapter fields.
   */
  async updateChapter(chapterId: string, updates: Partial<Chapter>): Promise<void> {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === chapterId || c.name === chapterId);
    if (!chapter) return;

    // 1. Merge updates & normalize academic state
    const merged = { ...chapter, ...updates };
    
    // Auto-derive completion & status if completion flags updated
    let tasksCompleted = 0;
    if (merged.theoryComplete) tasksCompleted++;
    if (merged.dppComplete) tasksCompleted++;
    if (merged.pyqsComplete) tasksCompleted++;
    if (merged.formulaComplete) tasksCompleted++;
    
    // Maintain backwards compatible completion calculation if not explicitly provided
    if (updates.completion === undefined) {
      merged.completion = Math.round((tasksCompleted / 4) * 100);
    }
    
    if (merged.completion === 100) {
      merged.status = 'Mastered';
    } else if (merged.completion > 0 && merged.status === 'Not Started') {
      merged.status = 'Learning';
    }

    const updatedChapter = normalizeChapter(merged);
    const updatedChapters = this.state.chapters.map(c => (c.id === chapter.id ? updatedChapter : c));

    // 2. Optimistic UI update
    this.runtime.updateStateOptimistic({ chapters: updatedChapters });

    // 3. Trigger Runtime Refresh with 'CHAPTER_UPDATE' (re-evaluates ChapterInfoEngine)
    await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters });

    // 4. Background Firestore persistence
    ChapterRepository.saveChapter(this.userId, updatedChapter).catch(err => {
      console.error(`Failed to persist chapter ${chapterId} to Firestore:`, err);
    });
  }
}
```

---

## 6. Runtime & Context Integration

### 6.1 `StudyBrainRuntime.ts` Integration

1. **State Definition (`StudyBrainState`)**:
   ```typescript
   export interface StudyBrainState {
     chapters: Chapter[];
     chapterTelemetryMap: Record<string, ChapterTelemetry>; // Single source of truth map
     // ...
   }
   ```
2. **Engine Execution Pipeline in `refresh(reason)`**:
   ```typescript
   // 0. ChapterInfo Engine Execution
   if (reason === 'INIT' || reason === 'CHAPTER_UPDATE' || reason === 'SESSION_UPDATE' || reason === 'MISTAKE_UPDATE') {
     const ciStart = performance.now();
     this.state.chapterTelemetryMap = this.chapterInfoEngine.generateChapterTelemetry({
       chapters: this.state.chapters,
       mistakes: this.state.mistakes,
       sessions: this.state.studySessions,
       mocks: this.state.mocks
     });
     engineTimes['ChapterInfoEngine'] = performance.now() - ciStart;
     invalidatedEngines.push('ChapterInfoEngine');
   }
   ```
3. **Feeding Downstream Engines**:
   - **`PlannerEngine`**: Consumes `state.chapterTelemetryMap` for mastery scores, syllabus stages (`Not Started` | `In Progress` | `Mastered`), and active bottlenecks instead of executing standalone calculations.
   - **`AnalyticsEngine`**: Reads strategy radar arrays and infographics from `state.chapterTelemetryMap`.
   - **`OptimizationEngine`**: Uses `telemetry.syllabusStage` and `telemetry.masteryScore` for timeline completion forecasting.
   - **`RevisionEngine`**: Reads `telemetry.retentionConfidence` and `telemetry.unresolvedMistakesCount`.

### 6.2 `StudyBrainContext.tsx` Integration

`StudyBrainContext` exposes `state`, `runtime`, and `actions`. Components call `useStudyBrain()`:
```typescript
const { state, actions } = useStudyBrain();
const telemetry = state.chapterTelemetryMap[chapterId];
```

---

## 7. Implementation Recommendations for M1 Developer

1. **`src/engines/chapterInfo/types.ts`**:
   - Update type definitions to match exact specs above.
   - Ensure strict typing for `'Not Started' | 'In Progress' | 'Mastered'` and `'High' | 'Medium' | 'Low'`.

2. **`src/engines/chapterInfo/ChapterInfoEngine.ts`**:
   - Implement helper methods (`getChapterTelemetry`, `getAllChapterTelemetry`, `getSubjectChapterTelemetry`, `getChapterBottlenecks`, `getStrategyRadar`).
   - Standardize input hash calculation and cache invalidation.

3. **`src/actions/StudyBrainActions.ts`**:
   - Add unified `updateChapter(chapterId, updates)` method.
   - Ensure all chapter mutation paths trigger `'CHAPTER_UPDATE'` runtime refresh.

4. **`src/runtime/StudyBrainRuntime.ts`**:
   - Verify `chapterTelemetryMap` is initialized in state.
   - Verify `ChapterInfoEngine` is executed during `INIT`, `CHAPTER_UPDATE`, `SESSION_UPDATE`, and `MISTAKE_UPDATE`.
   - Pass telemetry map to downstream engines.

---

## 8. Verification Strategy

1. **Type Checking**:
   - Run `npm run build` or `npx tsc --noEmit` to verify 0 TypeScript errors.
2. **Runtime Telemetry Mapping**:
   - Verify `state.chapterTelemetryMap` contains keys for all 56 JEE chapters.
3. **Cache Performance**:
   - Check `state.diagnostics.engineExecutionTimes['ChapterInfoEngine']` during consecutive unchanged state refreshes to confirm cache hit behavior.
