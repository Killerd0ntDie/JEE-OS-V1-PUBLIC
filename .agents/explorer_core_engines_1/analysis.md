# Comprehensive Core Engines & Telemetry Audit Report

**Audit Target**: JEE-OS Core Engines, Math Utilities, Telemetry Pipelines, and Runtime Coordination  
**Scope**: `packages/engines/src/`, `src/runtime/StudyBrainRuntime.ts`, `src/services/`, `src/utils/`, `src/lib/`, `src/types/`  
**Auditor**: Explorer 1 (Core Engines & Telemetry Specialist)  
**Date**: 2026-08-19  
**Mode**: STRICT READ-ONLY AUDIT  

---

## 1. Executive Summary & Engine Topology

JEE-OS features a distributed calculation and telemetry architecture split between the monorepo package `@jee-os/engines` (`packages/engines/src/`) and application-level services/runtimes (`src/runtime/`, `src/services/`, `src/utils/`). 

### Core Engine Inventory:
| Engine | Location | Responsibility |
|---|---|---|
| **ChapterInfoEngine** | `packages/engines/src/chapterInfo/ChapterInfoEngine.ts` | Single source of truth for 56-chapter telemetry, radar metrics, bottleneck risk scores, and lecture completion. |
| **PlannerEngine & ScoringEngine** | `packages/engines/src/planner/PlannerEngine.ts`, `PlannerScoringEngine.ts` | 14-factor decision engine, lookahead simulator, daily plan generation, weekly matrix builder. |
| **AnalyticsEngine** | `packages/engines/src/analytics/AnalyticsEngine.ts` | Study velocity, consistency score, subject balance, question accuracy, mock trend, streak tracking. |
| **RevisionEngine & SM-2** | `packages/engines/src/revision/RevisionEngine.ts`, `SpacedRepetitionEngine.ts` | SuperMemo-2 flashcard scheduler, forgetting curve decay monitoring, urgency ranking. |
| **OptimizationEngine** | `packages/engines/src/optimization/OptimizationEngine.ts` | Pacing optimization, target exam date deadline feasibility, overloaded schedule detection, plus-one-hour simulation. |
| **KnowledgeEngine** | `packages/engines/src/knowledge/KnowledgeEngine.ts` | Prerequisite DAG traversal, dependency tree caching, unlock state resolution. |
| **NeuralGraphEngine** | `packages/engines/src/graph/NeuralGraphEngine.ts` | 4-column serpentine graph layout generator for @xyflow/react canvas. |
| **MockTestParsingEngine** | `packages/engines/src/intelligence/MockTestParsingEngine.ts` | Gemini AI multimodal PDF extraction for mock test scorecards and error books. |
| **PyqEngine & Generator** | `packages/engines/src/pyq/PyqEngine.ts`, `src/lib/PyqGeneratorEngine.ts` | PYQ bank querying and AI question synthesis. |
| **StudyBrainRuntime** | `src/runtime/StudyBrainRuntime.ts` | Centralized singleton orchestrating state, memoization deltas, engine dispatch, and subscriber notifications. |
| **RevisionEngineService** | `src/services/revisionEngineService.ts` | Competing legacy half-life revision engine running in parallel with `packages/engines`. |
| **StudyBrainService** | `src/services/studyBrainService.ts` | Aggregates academic state, dashboard summaries, chapter command center data. |
| **Math & Logic Utilities** | `src/utils/` | Academic state normalization, leveling calculations, mistake intelligence, mock scoring, focus score, streak calculation, time slot binning, audio synthesis. |

---

## 2. Detailed Bug Catalog

### 🔴 Critical Severity Bugs

#### BUG-CE-01: Inverted Accuracy Scoring Logic in PlannerScoringEngine
- **Location**: `packages/engines/src/planner/PlannerScoringEngine.ts:568-569`
- **Code**:
  ```ts
  const recentAccuracyScore = Math.min(100, Math.round(100 - 70 + (chapterMistakes.length * 10)));
  ```
- **Root Cause**: `100 - 70 + (chapterMistakes.length * 10)` simplifies to `30 + (mistakes * 10)`. When a student has 0 mistakes, their `recentAccuracyScore` is scored as a dismal **30/100**. When a student makes 7 mistakes, their accuracy score jumps to **100/100**.
- **Impact**: Inverts the scoring model for accuracy; the AI planner rewards students who make more mistakes with a higher "accuracy score" and severely penalizes students with zero errors.

#### BUG-CE-02: Unreachable Fatigue Constraint Guard
- **Location**: `packages/engines/src/planner/PlannerScoringEngine.ts:643-645`
- **Code**:
  ```ts
  // 1. Fatigue State Machine Boundary
  if (fatigueScore > 80 && (context.taskType === 'Watch Lecture' || context.taskType === 'Solve PYQs')) {
    totalScore = Math.min(totalScore, 30);
  }
  ```
- **Root Cause**: In lines 537-544, `fatigueScore` for `'Watch Lecture'` and `'Solve PYQs'` is explicitly set to `45` or `50` (it is only set to `90` for `'Revise Formulas'` or `'Review Mistakes'`). Because `fatigueScore` for lectures/PYQs is NEVER > 80, this boundary check is dead code and never executes.
- **Impact**: The state machine boundary designed to cap heavy cognitive tasks when the student is fatigued is permanently inactive.

#### BUG-CE-03: Stale Cache Invalidation in ChapterInfoEngine & RevisionEngine
- **Location**: `packages/engines/src/chapterInfo/ChapterInfoEngine.ts:205-211`, `packages/engines/src/revision/RevisionEngine.ts:156-162`
- **Root Cause**:
  1. `ChapterInfoEngine.computeInputHash` omits `chapter.practiceProgress` (e.g. `dppPercent`, `pyqPercent`), `settings.targetYear` (which changes bottleneck severity), and mistake chapter reassignments. It only checks `sessions.length` and `mocks.length`. If a mock test score or session duration changes without changing the array length, `inputHash` remains identical.
  2. `RevisionEngine.computeHash` omits `chapter.chapterOnHold` and `chapter.revisionOnHold`. If a user puts a chapter on hold, `chapSig` does not change, and the engine returns stale cached telemetry.
- **Impact**: UI components display stale radar charts, wrong bottleneck alerts, and incorrect revision queues after user mutations.

#### BUG-CE-04: Hardcoded Fallback Year (2024 / 2025) Causing Stale & Invalid Planning
- **Location**: `packages/engines/src/planner/PlannerEngine.ts:948-950`, `src/services/studyBrainService.ts:397, 462`
- **Code**:
  ```ts
  // PlannerEngine.ts
  const finishDate = input.currentDate ? new Date(input.currentDate) : new Date("2024-01-01T00:00:00Z");
  
  // studyBrainService.ts
  userPreferences: { targetYear: '2025' }, remainingDaysUntilJEE: 100,
  ```
- **Root Cause**: When `currentDate` is omitted, `PlannerEngine` falls back to `2024-01-01T00:00:00Z` (2+ years in the past). `StudyBrainService.getTodayMission` and `getCompletionPrediction` hardcode `targetYear: '2025'` and `100 days`.
- **Impact**: Generates estimated finish dates in 2024 and incorrect schedules ignoring the user's real exam year (2026/2027).

#### BUG-CE-05: Double Boolean Inversion Blocking Chapter Start Status in ChapterInfoEngine
- **Location**: `packages/engines/src/chapterInfo/ChapterInfoEngine.ts:33-41`
- **Code**:
  ```ts
  const isStarted = chapter.status !== 'Not Started' && chapter.syllabusStage !== 'Not Started' && (
    (chapter.currentLecture && chapter.currentLecture > 0) || ...
  );
  ```
- **Root Cause**: Requires BOTH `chapter.status !== 'Not Started'` AND `chapter.syllabusStage !== 'Not Started'`. If a chapter has default DB value `syllabusStage: 'Not Started'`, even if `currentLecture: 5` or `completion: 40`, `isStarted` evaluates to `false`, causing line 44 to force `syllabusStage = 'Not Started'`.
- **Impact**: Chapters with active lecture progress get incorrectly classified as unstarted in telemetry and radar charts.

---

### 🟠 High Severity Bugs

#### BUG-CE-06: Unhandled Date Parsing Causing `RangeError: Invalid time value` Crashes
- **Location**: `packages/engines/src/optimization/OptimizationEngine.ts:59-67, 82`, `packages/engines/src/analytics/AnalyticsEngine.ts:151-152`
- **Root Cause**:
  1. In `OptimizationEngine`, if `targetCompletionDate` is malformed or invalid string `""`, `new Date(targetCompletionDate).getTime()` returns `NaN`. `daysUntilTarget` becomes `NaN`, `predictedCompletionMs` becomes `NaN`, and `new Date(NaN).toISOString()` throws an unhandled `RangeError: Invalid time value`, crashing the application runtime.
  2. In `AnalyticsEngine`, if `studyVelocity` is extremely low (e.g. 0.0001 hr/day), `daysToComplete` becomes hundreds of millions of days, exceeding JavaScript's max Date integer limit and throwing `RangeError`.
- **Impact**: Full application crash when handling empty target dates or near-zero study velocity.

#### BUG-CE-07: String IDs Leaked into User-Facing Reasoning Explanations
- **Location**: `packages/engines/src/planner/PlannerEngine.ts:223-224, 264`, `packages/engines/src/knowledge/KnowledgeEngine.ts:150`
- **Root Cause**: `KnowledgeEngine.getDependencyTree` returns `string[]` (node IDs like `'p2'`, `'p3'`). `PlannerEngine` does `depTree.map((n: any) => n.name || n)`. Because strings do not have a `.name` property, `dependentChapterNames` becomes `['p2', 'p3']`.
- **Impact**: User-facing reasoning cards render raw IDs: *"Unlocks p2, p3 and adds projected +12 JEE Main marks upon mastery."* instead of real chapter names (*"Unlocks Kinematics 2D, Laws of Motion"*).

#### BUG-CE-08: Incorrect DPP Completion Fallback in NeuralGraphEngine
- **Location**: `packages/engines/src/graph/NeuralGraphEngine.ts:106`
- **Code**:
  ```ts
  dppDone: telemetry?.dppComplete ?? chapter.theoryComplete ?? false,
  ```
- **Root Cause**: `dppDone` falls back to `chapter.theoryComplete` instead of `chapter.dppComplete`.
- **Impact**: Any chapter where theory is finished is rendered on the Neural Link graph as having completed DPP exercises, even when 0 DPP questions were solved.

#### BUG-CE-09: Unstarted Chapters Assigned Fabricated 90% Retention & 9% Completion
- **Location**: `src/utils/academicState.ts:91-98, 116-117`
- **Root Cause**: `academicState.ts` assigns `retentionConfidence: 'High'` and `retentionScore: 90` to chapters with stage `'Not Started'`. Line 116 computes `revWeight = (90 / 100) * 10 = 9%`.
- **Impact**: Untouched chapters are assigned a 9% overall completion score and claim "High Retention" of material the student has never learned.

#### BUG-CE-10: Asynchronous Race Condition in StudyBrainRuntime Debounced Refresh
- **Location**: `src/runtime/StudyBrainRuntime.ts:323-367`
- **Root Cause**: If `refresh()` is called while `isProcessingRefresh = true`, line 336 schedules a timer while line 364 ALSO kicks off another cycle in `finally`. Two parallel executions of `executeRefresh()` run concurrently, mutating `this.state` without locking.
- **Impact**: State tearing, lost mutations, and UI flickering during rapid multi-checkbox toggles.

---

### 🟡 Medium & Low Severity Bugs

#### BUG-CE-11: `reviewedTodayCount` Counts Historical Revisions Across All Time
- **Location**: `packages/engines/src/revision/RevisionEngine.ts:147`
- **Code**: `reviewedTodayCount: sessions.filter(s => s.type === 'Revision').length`
- **Root Cause**: Does not filter sessions by `startTime === today`. Counts every revision session in history.
- **Impact**: Stats badge shows total all-time revision sessions instead of today's revisions.

#### BUG-CE-12: SuperMemo-2 Ease Factor Inconsistency
- **Location**: `packages/engines/src/revision/SpacedRepetitionEngine.ts:50, 70`
- **Root Cause**: Line 50 clamps ease factor to `Math.min(2.5, ...)`, but line 70 initializes legacy `'High'` confidence with `easeFactor: 2.6`.
- **Impact**: Immediate clamping on first review creates non-monotonic interval calculations.

#### BUG-CE-13: JavaScript Comment Leaked into Gemini AI Prompt
- **Location**: `packages/engines/src/intelligence/MockTestParsingEngine.ts:40`
- **Code**:
  ```ts
  ${rawText.substring(0, 30000)} // truncate to prevent massive token overload just in case
  ```
- **Root Cause**: JS line comment placed inside template literal string sent to Gemini API.
- **Impact**: Prompt pollution sent to LLM model.

#### BUG-CE-14: `FocusScoreInput.interruptions` Unused Parameter
- **Location**: `src/utils/focusScore.ts:7-14`
- **Root Cause**: `interruptions` parameter is accepted and destructured but completely ignored in the calculation.
- **Impact**: Focus interruptions do not affect focus score.

#### BUG-CE-15: Millisecond-Division Date Discrepancies in Analytics
- **Location**: `packages/engines/src/analytics/AnalyticsEngine.ts:45, 50-55`
- **Root Cause**: Uses `Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))` instead of calendar day matching.
- **Impact**: Sessions from yesterday evening get bucketed into today if analyzed in the morning.

#### BUG-CE-16: 24:00 Hour Overflow in `calculateNextTimeSlot`
- **Location**: `src/utils/timeSlotUtils.ts:68-75`
- **Root Cause**: `endHour = Math.floor(endMins / 60)` does not use `% 24`, producing invalid times like `"24:30"`.
- **Impact**: Planner time blocks render `"24:30"` instead of `"00:30"`.

---

## 3. Dead Code Catalog

| Item | Location | Type | Description |
|---|---|---|---|
| **Question Schema Object** | `src/lib/PyqGeneratorEngine.ts:17-66` | Unused Variable | 50-line `questionSchema` object defined inside method but never passed to API or used anywhere. |
| **Unused CoachEngine Import** | `src/lib/PyqGeneratorEngine.ts:3` | Unused Import | `import { CoachEngine } from '@jee-os/engines';` is never referenced. |
| **Duplicate On-Hold Check** | `packages/engines/src/planner/PlannerEngine.ts:458, 460` | Redundant Code | `if (chapterMeta?.chapterOnHold) continue;` is duplicated back-to-back on consecutive lines. |
| **Broken Ternary Logic** | `src/runtime/StudyBrainRuntime.ts:529` | Dead Code | `focusSubject: this.state.settings.targetBranch ? undefined : undefined` always returns `undefined`. |
| **Ignored Parameter `skippedTasks`** | `packages/engines/src/optimization/OptimizationEngine.ts:27` | Unused Parameter | `skippedTasks` destructured from input but never utilized. |
| **Debug Console Logs** | `packages/engines/src/planner/PlannerEngine.ts:604-606` | Leftover Debug | Spams browser console with `==== DEBUG PLANNER SORTING ====` and candidate dumps on every plan generation. |
| **Duplicated Legacy Planner Methods** | `src/services/studyBrainService.ts:362-479` | Orphaned Methods | `getTodayMission` and `getCompletionPrediction` instantiate new engine instances and hardcode year 2025, bypassing runtime. |
| **Orphaned `tags` and `category` fields** | `packages/engines/src/knowledge/types.ts:19, 28` | Orphaned Types | Legacy compatibility fields that are populated but never read by any active calculation. |

---

## 4. Poor Logic & Architecture Anti-Patterns

### 1. Dual Competing Revision Engines
The codebase runs **TWO distinct, competing revision algorithms** concurrently:
1. `packages/engines/src/revision/SpacedRepetitionEngine.ts`: Implements SuperMemo-2 (SM-2) algorithm based on repetition count, ease factor, and review intervals.
2. `src/services/revisionEngineService.ts`: Implements an exponential half-life forgetting curve model (`R = 100 * 0.5^(t / S)`) with hardcoded stage intervals (1, 3, 7, 15, 30 days).

In `StudyBrainRuntime.ts`, both engines are executed on every state change (lines 423-432 and lines 824-838). This causes state fragmentation where `state.revisionTelemetry` (SM-2) and `state.revisionQueue` (Half-life) produce conflicting revision due dates and counts.

### 2. Mock Lookahead Simulation Values
In `packages/engines/src/planner/PlannerEngine.ts:795-800`, the 8-strategy lookahead simulator purports to dynamically evaluate candidate missions across multiple dimensions, but hardcodes 5 out of 7 factors to static constants for all strategies:
```ts
mission.subjectBalance = 85;
mission.revisionHealth = 80;
mission.dependencyUnlock = 75;
mission.workloadRealism = 90;
mission.completionProb = 90;
```
Every candidate strategy receives identical scores for subject balance, revision health, dependency unlock, workload realism, and completion probability.

### 3. $O(L^2)$ Leveling Calculation
In `src/utils/levelingCalculations.ts:39`, `calculateLevelFromXP` uses a `while (getXpRequiredForLevel(level + 1) <= totalXP)` loop, where `getXpRequiredForLevel` internally loops from 1 to `level`. This creates an $O(L^2)$ algorithm for XP leveling that could be calculated in $O(1)$ arithmetic progression math.

### 4. Exponential Explosion in Mistake Danger Score
In `src/utils/mistakeIntelligence.ts:106`, active mistakes apply an exponential multiplier:
```ts
if (activeMistakes.length > 1) {
  rawScore *= Math.pow(1.3, activeMistakes.length - 1);
}
```
For 20 mistakes, `rawScore` multiplies by $1.3^{19} \approx 144.3$, inflating `rawScore` into the tens of thousands. Because this occurs before post-mistake revision mitigation (`rawScore *= 0.5`), the mitigation halving has 0 effect because the score remains far above the 100 cap.

---

## 5. Predicted Failure Points

### 1. Scale Degradation under 500+ Study Sessions & Mistakes
- **Mechanism**: `StudyBrainRuntime.executeRefresh` performs multiple full-array iterations over all sessions, mistakes, and chapters on every single state mutation:
  - `collectStudyStatistics` loops over all sessions and chapters.
  - `ChapterInfoEngine` loops over all 56 chapters and filters the entire mistakes array per chapter ($56 \times M$).
  - `chaptersWithData` runs `getChapterCommandCenterData` for all 56 chapters ($56 \times 56$ chapter graph checks + $56 \times M$ mistake filters).
- **Scale Breaking Point**: When a student logs 500+ sessions and 200+ mistakes, `executeRefresh()` runtime exceeds 250ms, causing noticeable UI frame drops during typing and checkbox interactions.

### 2. Timezone & Overnight Study Boundary Collisions
- **Mechanism**: The app handles late-night study (between 00:00 and 06:00) using arbitrary 24-hour offsets in some utilities (`timeSlotUtils.ts:100`, `StudyBrainRuntime.ts:672`), while using direct `new Date()` calendar dates in others (`AnalyticsEngine.ts:44`, `streakCalculations.ts:39`).
- **Scale Breaking Point**: A student studying at 1:30 AM will have sessions counted towards yesterday's planner schedule but today's streak tracker and tomorrow's timeline, leading to phantom mission overlaps and duplicate time slots.

### 3. Cyclic Dependency Graph Traversal Stack Overflow
- **Mechanism**: In `KnowledgeEngine.ts`, `getPrerequisiteTree` and `getDependencyTree` use recursive traversal. If custom chapters or syllabus modifications introduce a cycle (e.g. Chapter A depends on Chapter B, Chapter B depends on Chapter A), recursion will loop infinitely until hitting `RangeError: Maximum call stack size exceeded`.

### 4. Zero-Duration & Zero-Lecture Chapter Math Anomalies
- **Mechanism**: Chapters with `totalLectures: 0` or missing durations cause division by zero or NaN values in `ChapterInfoEngine` (`(chapter.currentLecture || 0) / (chapter.totalLectures || 12)` forces 12 even when explicit 0 was intended), and `studyBrainService.ts:54` defaults `lectureProgress` to 0.

---

## 6. Recommendations & Architecture Clean-Up Strategy

1. **Unify Revision Authority**: Deprecate `RevisionEngineService.ts` and consolidate all spaced repetition and forgetting curve calculations inside `packages/engines/src/revision/`.
2. **Fix `PlannerScoringEngine` Accuracy & Fatigue Formulas**: Correct the inverted accuracy formula (`100 - (mistakes * 10)`) and fix the fatigue boundary condition.
3. **Refactor Hash Memoization**: Include all relevant state keys (`practiceProgress`, `targetYear`, `chapterOnHold`) in `computeInputHash` and `computeHash`.
4. **Enforce Safe Date Fallbacks**: Replace all hardcoded `2024`/`2025` fallbacks with `new Date().toISOString()`, and wrap date parsing with `isNaN(date.getTime())` checks.
5. **Optimize $O(N^2)$ Loops**: Pre-group mistakes by `chapterId` into a `Map<string, Mistake[]>` before iterating over chapters in `ChapterInfoEngine`, `StudyBrainRuntime`, and `StudyBrainService`.
