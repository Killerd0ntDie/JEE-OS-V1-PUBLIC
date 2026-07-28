# Detailed Code Review: Centralized ChapterInfoEngine & Universal ChapterEditModal

**Reviewer**: Reviewer 2 (Edge Case & Robustness Reviewer)  
**Date**: 2026-07-24  
**Verdict**: REQUEST_CHANGES  

---

## Executive Summary

An independent build, edge-case, and robustness review was conducted for the **Centralized ChapterInfoEngine**, the **Universal ChapterEditModal**, and associated persistence actions in **StudyBrainActions.ts**.

1. **Build Verification**: `npm run build` executed with **0 compilation errors**. The bundle was successfully generated (Vite + esbuild server bundle).
2. **Robustness & Edge-Case Findings**:
   - `ChapterInfoEngine` handles empty chapter lists and missing/zero `totalLectures` gracefully without division-by-zero crashes. However, a **critical cache invalidation flaw** causes stale telemetry outputs when mistake statuses or unhashed chapter properties (`weightage`, `revisionCount`, `lastRevisionDaysAgo`) are updated.
   - `ChapterEditModal` handles missing initial telemetry smoothly with optional chaining fallbacks. However, numeric input state handlers lack clamping (`Math.max` / `Math.min`), allowing negative numbers or out-of-bounds progress values (e.g., current lecture > total lectures, negative weightage) to corrupt computed telemetry.
   - `StudyBrainActions` has **inconsistent async error handling for Firestore persistence**: while some methods handle background write rejections gracefully with `.catch()`, 12 key action methods await repository operations without `try...catch` blocks, causing unhandled rejections and halting state refreshes if network or Firestore errors occur.

---

## Detailed Findings

### 1. [Major] Stale Cache Bug in `ChapterInfoEngine.ts` Hash Computation

- **Location**: `src/engines/chapterInfo/ChapterInfoEngine.ts` (Lines 185–191)
- **Problem**:
  ```typescript
  private computeInputHash(input: ChapterInfoInput): string {
    const chapSig = input.chapters.map(c => `${c.id}:${c.completion}:${c.currentLecture}:${c.totalLectures}:${c.theoryComplete}:${c.dppComplete}:${c.pyqsComplete}:${c.status}:${c.confidence}`).join('|');
    const mistakeCount = input.mistakes.length;
    const sessionCount = input.sessions.length;
    const mockCount = input.mocks.length;
    return `${chapSig}_m${mistakeCount}_s${sessionCount}_mk${mockCount}`;
  }
  ```
  - **Issue A**: `input.mistakes.length` only checks array size. When a user marks a mistake as `Mastered` via `updateMistakeStatus`, a `MISTAKE_UPDATE` trigger is fired. However, `input.mistakes.length` remains unchanged. The engine assumes cache hit (`newHash === this.inputHash`) and returns stale cached telemetry with an outdated `unresolvedMistakesCount` and incorrect `masteryScore`.
  - **Issue B**: `chapSig` omits `weightage`, `solvedQuestions`, `revisionCount`, and `lastRevisionDaysAgo`. Modifying JEE weightage or updating spaced revision state leaves `chapSig` unchanged, returning stale telemetry.
- **Suggested Fix**: Include mistake resolution signature or mistake array hash in `computeInputHash`, and add `weightage`, `solvedQuestions`, `revisionCount`, `lastRevisionDaysAgo` to `chapSig`. Alternatively, call `this.chapterInfoEngine.invalidateCache()` inside `StudyBrainRuntime.refresh()` when triggers occur.

---

### 2. [Major] Inconsistent Async Error Handling in `StudyBrainActions.ts`

- **Location**: `src/actions/StudyBrainActions.ts` (Multiple methods)
- **Problem**:
  Methods such as `completeStudySession` (line 294), `completeRevision` (line 343), `toggleChapterStatus` (line 367), `updateChapterStatus` (line 376), `addMistake` (line 384), `updateMistakeStatus` (line 394), `updateChapterData` (line 420), `deleteMistake` (line 427), `toggleTimelineBlockComplete` (line 442), `addCustomTimelineBlock` (line 598), `updateCustomTimelineBlock` (line 618), and `deleteCustomTimelineBlock` (line 625) perform `await Repository.save...` or `await Repository.delete...` WITHOUT `try...catch` blocks before refreshing runtime state:
  ```typescript
  // Example in addMistake (line 384):
  await MistakeRepository.saveMistake(this.userId, newMistake);
  const updatedMistakes = [...this.state.mistakes, newMistake];
  await this.runtime.refresh('MISTAKE_UPDATE', { mistakes: updatedMistakes });
  ```
  If Firestore fails due to network offline status, security rules, or request timeout, an unhandled Promise rejection is thrown, preventing `this.runtime.refresh` from running and leaving the UI state out of sync.
- **Suggested Fix**: Wrap repository persistence calls in `try...catch` blocks or use non-blocking background promises with `.catch()` handlers (consistent with `updateChapter` and `completeTask`), ensuring runtime refresh and UI responsiveness are preserved even when offline.

---

### 3. [Major] Unsanitized & Unclamped Numeric Input Handling in `ChapterEditModal.tsx`

- **Location**: `src/components/shared/ChapterEditModal.tsx` (Lines 256, 267, 290, 330, 341, 368, 379, 414, 450)
- **Problem**:
  Form state setters use `parseInt(e.target.value) || 0` or `parseFloat(e.target.value) || 0`.
  - Negative input values (e.g. `-5`) are truthy in JS, so `parseInt("-5") || 0` evaluates to `-5`.
  - Entering `-5` for `currentLecture` or `completedDpp` produces negative completion values in `handleSave`: `calculatedCompletion` becomes negative or corrupt.
  - Manual input or copy-pasting values greater than total bounds (e.g. `currentLecture = 50` for `totalLectures = 10`) is not clamped, causing percentages like `500%` DPP or theory completion to be written into chapter progress.
- **Suggested Fix**: Clamp numeric inputs on state change or inside `handleSave`:
  ```typescript
  const sanitizedCurrentLecture = Math.max(0, Math.min(totalLectures, currentLecture));
  const sanitizedCompletedDpp = Math.max(0, Math.min(totalDpp, completedDpp));
  const sanitizedWeightage = Math.max(0, Math.min(100, weightage));
  ```

---

### 4. [Minor] Uncapped Theory Completion Percentage in `ChapterInfoEngine.ts`

- **Location**: `src/engines/chapterInfo/ChapterInfoEngine.ts` (Line 43)
- **Problem**:
  ```typescript
  const theoryPct = chapter.theoryComplete ? 100 : Math.round(((chapter.currentLecture || 0) / (chapter.totalLectures || 12)) * 100);
  ```
  If `currentLecture` > `totalLectures` when `theoryComplete` is `false`, `theoryPct` can exceed 100 (e.g., 125%).
- **Suggested Fix**:
  ```typescript
  const theoryPct = chapter.theoryComplete ? 100 : Math.min(100, Math.round(((chapter.currentLecture || 0) / (chapter.totalLectures || 12)) * 100));
  ```

---

## Verification Matrix

| Claim / Component | Target | Verification Method | Result |
|---|---|---|---|
| Build Verification | `npm run build` | Executed build command in environment | **PASS** (0 errors) |
| Empty Chapter List | `ChapterInfoEngine` | Code trace with `chapters = []` | **PASS** (Safe empty outputs) |
| Division by Zero Protection | `ChapterInfoEngine` & `ChapterEditModal` | Inspected all `/` operations for fallback values | **PASS** (Guarded with `|| 12` / `|| 1`) |
| Missing Telemetry Fallback | `ChapterEditModal` | Inspected optional chaining & default fallbacks | **PASS** (Safe default rendering) |
| Telemetry Cache Integrity | `ChapterInfoEngine` | Analyzed `computeInputHash` against `MISTAKE_UPDATE` & chapter edits | **FAIL** (Stale cache returned) |
| Input Bounds & Sanitization | `ChapterEditModal` | Inspected numeric state handlers & `handleSave` math | **FAIL** (Negative / out-of-bounds numbers allowed) |
| Firestore Async Error Resilience | `StudyBrainActions` | Inspected `await` calls vs `.catch()` handling across actions | **FAIL** (12 methods lack `try...catch` on `await`) |

---

## Conclusion & Verdict

**Verdict**: **REQUEST_CHANGES**

While the build succeeds with zero errors and basic telemetry calculations handle empty datasets and zero lecture fallbacks gracefully, changes are required to address:
1. Cache invalidation flaws in `ChapterInfoEngine.ts`.
2. Missing `try...catch` blocks for Firestore async operations in `StudyBrainActions.ts`.
3. Input validation and clamping in `ChapterEditModal.tsx`.
