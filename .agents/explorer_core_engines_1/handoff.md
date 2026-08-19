# Handoff Report: Core Engines & Telemetry Audit

**Agent**: Explorer 1 (Core Engines & Telemetry Specialist)  
**Parent Orchestrator ID**: `b0c01874-36da-4f82-a0ba-d0a98fa3787b`  
**Working Directory**: `d:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\.agents\explorer_core_engines_1`  
**Detailed Report**: `d:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\.agents\explorer_core_engines_1\analysis.md`  

---

## 1. Observation

Direct line-by-line inspection of `packages/engines/src/`, `src/runtime/`, `src/services/`, `src/utils/`, and `src/lib/` revealed 16 verified bugs, 8 dead code items, and 4 major architectural anti-patterns.

### Verbatim Observations:
1. **Inverted Accuracy Score**: In `packages/engines/src/planner/PlannerScoringEngine.ts:568`, the code executes:
   ```ts
   const recentAccuracyScore = Math.min(100, Math.round(100 - 70 + (chapterMistakes.length * 10)));
   ```
   For 0 mistakes, `recentAccuracyScore` is 30; for 7 mistakes, it is 100.
2. **Dead Fatigue Guard**: In `packages/engines/src/planner/PlannerScoringEngine.ts:643`, `if (fatigueScore > 80 && (context.taskType === 'Watch Lecture' || context.taskType === 'Solve PYQs'))` is evaluated. But lines 537–544 set `fatigueScore` for lectures/PYQs to only 45 or 50. The guard is mathematically unreachable.
3. **Stale Memoization Hashes**: In `packages/engines/src/chapterInfo/ChapterInfoEngine.ts:205-211` and `packages/engines/src/revision/RevisionEngine.ts:156-162`, `computeInputHash` excludes `practiceProgress`, `targetYear`, `chapterOnHold`, and `revisionOnHold`.
4. **Hardcoded Expired Dates**: In `packages/engines/src/planner/PlannerEngine.ts:948` and `src/services/studyBrainService.ts:397, 462`, fallback dates are hardcoded to `2024-01-01` and `targetYear: '2025'`.
5. **Raw String IDs in AI Reasoning**: In `packages/engines/src/planner/PlannerEngine.ts:223-224` and `KnowledgeEngine.ts:150`, `getDependencyTree` returns string IDs (`['p2', 'p3']`), and `dependentChapterNames` renders raw IDs directly into user-facing text: `Unlocks p2, p3 and adds projected +12 marks`.
6. **DPP Fallback Error in Graph**: In `packages/engines/src/graph/NeuralGraphEngine.ts:106`, `dppDone` is computed as `telemetry?.dppComplete ?? chapter.theoryComplete ?? false`. Theory completion erroneously marks DPP as done.
7. **Unstarted Chapter Score Fabrication**: In `src/utils/academicState.ts:91-98, 116-117`, chapters in stage `'Not Started'` are assigned a 90% retention score, artificially inflating overall completion by 9%.
8. **Competing Revision Engines**: `StudyBrainRuntime.ts` invokes both `RevisionEngine.generateRevisionTelemetry` (SM-2) and `StudyBrainService.getRevisionQueue` (Exponential Half-life) on every state update, creating dual conflicting revision states.

---

## 2. Logic Chain

1. **Scoring Inversion Logic**:
   - `PlannerScoringEngine.ts:568` computes accuracy as `(100 - 70) + (mistakes * 10)`.
   - As mistakes increase, the score increases. Therefore, the decision engine systematically favors error-prone chapters under the false premise that they have higher accuracy.
2. **Cache Invalidation Failure Logic**:
   - `ChapterInfoEngine` and `RevisionEngine` use custom string hashing (`computeInputHash`) to bypass expensive recalculations.
   - Because user mutations on `practiceProgress` or `chapterOnHold` do not alter the serialized string hash, subsequent calls return identical cached telemetry from previous states.
   - Therefore, toggling chapter hold or editing DPP progress fails to update dependent UI views until cache is flushed.
3. **Runtime Synchronization Fragmentation Logic**:
   - `StudyBrainRuntime.ts` contains duplicate recalculations (`chaptersWithData` runs $O(N^2)$ checks for all 56 chapters on every tick; `validIncomplete` truncates tasks exceeding bedtime from remaining hours).
   - Concurrently, two revision engines write to separate state properties (`state.revisionTelemetry` vs `state.revisionQueue`).
   - Therefore, different UI components display divergent numbers for overdue revisions and completion estimates.

---

## 3. Caveats

- **Runtime Read-Only**: In compliance with the strict read-only mandate, no code changes or fixes were applied to any `.ts` or `.tsx` file during this audit.
- **Backend Coach Mocking**: `CoachEngine` makes network calls to `/api/coach/analyze`; local fallback logic (`generateDeterministicTacticalAdvice`) was audited, but live Gemini backend token exchange was not executed over the wire.
- **Firebase Persistence**: State persistence and offline IndexedDB synchronization were audited from the engine interface perspective; full data-layer transaction analysis is deferred to the State Management Specialist.

---

## 4. Conclusion

The core calculation engines in JEE-OS exhibit sophisticated architectural ambition (14-factor weighted scoring, SM-2 flashcard scheduling, DAG-based prerequisite lookaheads, and Web Audio synthesis), but suffer from **critical logic inversions, incomplete cache hashes, hardcoded past dates (2024/2025), dual competing revision engines, and unhandled NaN/Date parse crashes**.

### Summary of Audit Catalogs:
- **Critical Bugs**: 5 (Inverted accuracy scoring, unreachable fatigue boundary, stale memoization hashes, hardcoded 2024/2025 dates, double boolean block on chapter start).
- **High Severity Bugs**: 5 (Date parse `RangeError` crashes, string IDs in user-facing reasoning, wrong DPP fallback in graph, fabricated 90% retention on unstarted chapters, runtime debounced refresh race conditions).
- **Medium/Low Severity Bugs**: 6 (`reviewedTodayCount` all-time bug, SM-2 ease factor 2.6 mismatch, JS comment in Gemini prompt, unused `interruptions` parameter, millisecond date drift, 24:00 time overflow).
- **Dead Code Entries**: 8 (Unused `questionSchema`, unused `CoachEngine` import, duplicated on-hold checks, broken ternary returning undefined, unused `skippedTasks`, leftover console logs, orphaned legacy planner methods, dead types).
- **Predicted Scale Failures**: 4 (Performance degradation at 500+ sessions, overnight time slot collisions, cyclic dependency stack overflow, zero-lecture division anomalies).

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Inverted Accuracy Score**:
   Inspect `packages/engines/src/planner/PlannerScoringEngine.ts:568-569`:
   Calculate: `100 - 70 + (0 * 10) = 30` (0 mistakes = 30%); `100 - 70 + (7 * 10) = 100` (7 mistakes = 100%).
2. **Verify Stale Hash in ChapterInfoEngine**:
   Inspect `packages/engines/src/chapterInfo/ChapterInfoEngine.ts:205-211`:
   Note that `c.practiceProgress` is omitted from `chapSig`.
3. **Verify Date Parse Crash in OptimizationEngine**:
   Inspect `packages/engines/src/optimization/OptimizationEngine.ts:59-67`:
   Pass `targetCompletionDate: ""` -> `new Date("").getTime()` produces `NaN` -> `new Date(NaN).toISOString()` throws `RangeError: Invalid time value`.
4. **Verify DPP Graph Fallback Bug**:
   Inspect `packages/engines/src/graph/NeuralGraphEngine.ts:106`:
   Confirm `dppDone: telemetry?.dppComplete ?? chapter.theoryComplete ?? false`.
5. **Run Test Suite**:
   Run `npm run test` or `npx vitest run` to verify engine test coverage.
