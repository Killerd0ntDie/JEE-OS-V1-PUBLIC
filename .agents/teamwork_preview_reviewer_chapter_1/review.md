# Code & Build Review Report: M1, M2, M3 (Chapter Telemetry & Universal Modal)

**Reviewer**: Reviewer 1 (Chapter Telemetry & Universal Modal Reviewer)  
**Date**: 2026-07-24  
**Verdict**: REQUEST_CHANGES  

---

## Executive Summary

An independent code, type, and build review was conducted on M1, M2, and M3 components, including `ChapterInfoEngine`, `StudyBrainRuntime`, `StudyBrainActions`, `StudyBrainContext`, `ChapterEditModal`, and all associated refactored views (`DailyMissionTimeline`, `SubjectCommandCenter`, `SubjectExpandedView`, `ChapterCommandCard`, `PlannerPage`, `RevisionPage`, `SyllabusDiagnosisModal`, `AnalyticsEngine`).

While `QuickChapterSetupModal.tsx` was successfully removed and components now invoke the universal `ChapterEditModal` via `actions.openChapterEditModal(...)`, the submission **FAILS** the build verification step (`tsc --noEmit` yields 14 TypeScript errors), contains a runtime `ReferenceError` crash bug in `SubjectExpandedView.tsx`, and exhibits a cache invalidation flaw in `ChapterInfoEngine.ts`.

---

## Findings

### [Critical] Finding 1: 14 TypeScript Compilation Errors (`npx tsc --noEmit` Failure) & Runtime Crash

- **What**: Executing `npx tsc --noEmit` fails with 14 type errors across 6 core files. `npm run build` only executes `vite build`, which uses `esbuild` to strip types without performing type checking, masking severe compilation errors.
- **Where**:
  1. `src/features/subjects/components/SubjectExpandedView.tsx:67` — `Cannot find name 'showSavedToast'`. Variable `showSavedToast` is referenced in JSX condition `{showSavedToast && (...)}` but is never declared in state, props, or scope. This causes an unhandled runtime `ReferenceError`.
  2. `src/runtime/StudyBrainRuntime.ts:295, 296, 298, 299, 354, 364` — `Property 'plannerEngine' does not exist on type 'StudyBrainRuntime'` and `Property 'optimizationEngine' does not exist on type 'StudyBrainRuntime'`. Private class properties `plannerEngine` and `optimizationEngine` were referenced without class field declarations.
  3. `src/actions/StudyBrainActions.ts:205` — `Type '"In Progress"' is not assignable to type 'SyllabusDiagnosisStage'`.
  4. `src/features/revision/RevisionPage.tsx:89` — `Property 'retentionConfidence' does not exist on type 'unknown'` and `Property 'retentionDecayPercent' does not exist on type 'unknown'`. Property `retentionDecayPercent` does not exist on `ChapterTelemetry`.
  5. `src/features/mission/PlannerPage.tsx:93-94` — `Property 'isBottleneck' does not exist on type 'unknown'` (missing type annotation on `Object.values(state.chapterTelemetryMap)`).
  6. `src/features/subjects/components/SubjectCommandCenter.tsx:84` — `Property 'subject' does not exist on type 'unknown'`.
- **Why**: Shipping code that fails TypeScript compilation leads to runtime crashes (`ReferenceError: showSavedToast is not defined`) and breaks type safety contracts.
- **Suggestion**: 
  - Declare `const [showSavedToast, setShowSavedToast] = useState(false);` or remove the dead JSX toast snippet in `SubjectExpandedView.tsx`.
  - Add `private plannerEngine: PlannerEngine | null = null;` and `private optimizationEngine: OptimizationEngine | null = null;` to `StudyBrainRuntime`.
  - Type-cast `Object.values(state.chapterTelemetryMap) as ChapterTelemetry[]`.
  - Fix interface mismatch in `RevisionPage.tsx` and `StudyBrainActions.ts`.

---

### [Major] Finding 2: Cache Invalidation Flaw in `ChapterInfoEngine`

- **What**: `ChapterInfoEngine.computeInputHash(input)` only hashes `input.mistakes.length`. It does NOT hash mistake `revisionStatus` or content.
- **Where**: `src/engines/chapterInfo/ChapterInfoEngine.ts:185-191`
- **Why**: When a mistake's `revisionStatus` is updated (e.g. from `'Unresolved'` to `'Mastered'`) and `StudyBrainRuntime.refresh('MISTAKE_UPDATE')` is triggered, `input.mistakes.length` remains unchanged. `computeInputHash` produces the exact same hash, causing `generateChapterTelemetry` to return stale cached telemetry without re-evaluating `unresolvedMistakesCount` or `masteryScore`.
- **Suggestion**: Update `computeInputHash` to include mistake status signature:
  ```ts
  const mistakeSig = input.mistakes.map(m => `${m.id}:${m.revisionStatus}:${m.chapter}`).join('|');
  ```
  or clear cache when `refresh('MISTAKE_UPDATE')` is called.

---

## Verified Claims

- [X] `QuickChapterSetupModal.tsx` deleted → Verified via file search (0 matches) → PASS
- [X] Components delegate modal opening to `actions.openChapterEditModal` → Verified in `DailyMissionTimeline`, `SubjectExpandedView`, `ChapterCommandCard`, `SyllabusDiagnosisModal` → PASS
- [ ] 0 TypeScript / Compilation Errors → `npx tsc --noEmit` failed with 14 errors → FAIL
- [ ] Strict type safety & memoized cache invalidation → Cache invalidation flaw in `ChapterInfoEngine` on mistake status updates → FAIL

---

## Coverage Gaps

- Automated unit testing for `ChapterInfoEngine.invalidateCache()` upon mistake status update — risk level: Medium — recommendation: Add regression test in `ChapterInfoEngine.test.ts`.

---

## Unverified Items

- None (All core files, types, and runtime build outputs were inspected).
