# Exhaustive Architectural, State Management, Actions, Persistence & `as any` Audit

**Auditor:** `teamwork_preview_explorer_survey_2`  
**Date:** 2026-09-04  
**Scope:**  
- `src/runtime/` (`StudyBrainRuntime.ts`, `StudyBrainRuntime.test.ts`)  
- `src/actions/` (`StudyBrainActions.ts`, `StudyBrainActions.syncError.test.ts`, `SuperMemo2SpacedRepetition.test.ts`)  
- `src/repositories/` (all 9 repository classes/objects + `src/firebase/QuestionRepository.ts`)  
- `src/store/` (`useStudyBrainStore.ts`)  
- `firestore.rules` and `firestore.indexes.json`  
- Related integration points (`StudyBrainContext.tsx`, `academicState.ts`, `SettingsPage.tsx`)

---

## Executive Summary

This investigation performed a line-by-line static analysis and architectural audit of JEE OS's state management, engine runtime orchestration, action execution, and Firestore persistence layers.

### Key Metrics & Findings Overview:
- **Total `as any` Assertions in Scope:** 23 instances (21 in `StudyBrainActions.ts`, 2 in `StudyBrainRuntime.ts`), plus 10 loose `: any` variable/parameter declarations that disable type safety across core engines.
- **Critical Architectural Weaknesses:** 7 major weaknesses identified (God-class coupling 12 domains, direct Firestore primitives bypassing repositories, circular cross-package dependency between `@jee-os/engines` and `@/services/studyBrainService`, UI components directly mutating repositories and runtime state, unnormalized chapter schemas causing silent state overwrites, and misplaced repository implementations).
- **Data Flow Integrity Risks:** 5 critical risks identified (non-atomic multi-document writes without Firestore transactions, orphaned data on chapter deletion lacking cascading deletes, Zustand selector re-render failure due to in-place state mutation in `runCoachAnalysis`, double subscription state duplication between Zustand and Context, and guest-mode action race conditions).
- **Mutation & Rollback Gaps:** Out of 38 asynchronous mutation methods in `StudyBrainActions.ts`, **only 3** implement optimistic rollback (`completeTask`, `completeStudySession`, `completeRevision`). The remaining 35 methods leave stale or corrupted optimistic state in memory when Firestore writes reject.
- **Subscription & Lifecycle Flaws:** The debounced refresh queue in `StudyBrainRuntime.ts` contains a logic bug where `this.refreshTimer` is never reset to `null`, silently dropping the 100ms retry timer during concurrent refreshes. Furthermore, promise rejections in `executeRefresh` are caught and resolved rather than rejected, hiding runtime engine crashes from callers. Finally, `StudyBrainContext.tsx` establishes 9 unbounded real-time snapshot listeners with zero pagination or limits.

---

## Section 1: Complete `as any` & `: any` Catalog

Every instance in `src/actions/` and `src/runtime/` was inspected. The table below details each instance, surrounding context, and whether it masks a runtime crash/type error or merely bypasses TypeScript checks.

### Part 1: `src/actions/StudyBrainActions.ts` (21 Instances of `as any`)

| # | Line | Exact Code Snippet | Category | Risk & Impact Assessment |
|---|---|---|---|---|
| 1 | 409 | `const previousPartialXp = (mission as any).partialXpAwarded || 0;` | Bypassing TS / Redundant | **Low Risk / Tech Debt**. `partialXpAwarded` is already defined as an optional number on `TodayMission` (`src/types/index.ts:302`). The cast is an obsolete workaround from prior refactoring, but bypasses compiler guarantees if the field name changes. |
| 2 | 413 | `delete (updatedMission as any).partialXpAwarded;` | Bypassing TS | **Low Risk / Tech Debt**. `delete` in strict mode on optional properties can prompt TS warnings in certain tsconfig configurations. Using `updatedMission.partialXpAwarded = undefined;` is cleaner and avoids deleting hidden class properties in V8. |
| 3 | 415 | `deltaXp = -( (mission as any).xpEarned \|\| (this.isGodModeActive() ? Math.floor(gainedXp * 1.5) : gainedXp) );` | Bypassing TS / Redundant | **Low Risk / Tech Debt**. `xpEarned` is defined on `TodayMission` (`src/types/index.ts:312`). Safe at runtime, but unnecessarily bypasses TypeScript type checking. |
| 4 | 521 | `...(statusUpdate ? { status: statusUpdate as any } : {}),` | **Masking Real Type Error** | **HIGH RISK**. `statusUpdate` is declared at line 461 as `let statusUpdate: string \| undefined = undefined;`. At line 475 it is assigned `'Learning'`. `Chapter.status` is strictly typed as `ChapterStatus = 'Not Started' \| 'Learning' \| 'Theory Complete' \| 'DPP Pending' \| 'PYQ Pending' \| 'Revision Due' \| 'Mastered'`. If `statusUpdate` were assigned an arbitrary string, it would silently corrupt the chapter's status in Firestore and in-memory state. Fix: Type the variable as `let statusUpdate: ChapterStatus \| undefined = undefined;`. |
| 5 | 655 | `xp: originalStateSnapshot.xp as any,` | Bypassing TS (Inferred Loose Type) | **Medium Risk**. In `completeTask` (line 290), `originalStateSnapshot` initializes `xp: { ...(this.state.xp \|\| {}) }`. Because shallow cloning an object without an explicit type annotation causes TypeScript to infer a loose anonymous type `{ [x: string]: any }`, passing it to `updateStateOptimistic` requires `as any`. Masks missing required properties (`total`, `level`, `daily`, `weekly`, `streak`). |
| 6 | 658 | `analytics: originalStateSnapshot.analytics as any` | Bypassing TS (Inferred Loose Type) | **Medium Risk**. Similar to #5, `analytics: { ...(this.state.analytics \|\| {}) }` creates an untyped plain object. If `analytics` properties are missing, this passes an incomplete object to runtime subscribers. |
| 7 | 1102 | `analytics: originalSnapshot.analytics as any,` | Bypassing TS (Inferred Loose Type) | **Medium Risk**. In `completeStudySession` rollback block (line 1042), `originalSnapshot.analytics` was shallow-cloned as `{ ...(this.state.analytics \|\| {}) }`. Required fields on `SessionAnalytics` (`studyTime`, `focusTime`, `questionsSolved`, `accuracy`) are stripped of their type contract. |
| 8 | 1103 | `xp: originalSnapshot.xp as any` | Bypassing TS (Inferred Loose Type) | **Medium Risk**. In `completeStudySession` rollback block (line 1043), `originalSnapshot.xp` was shallow-cloned. Same loose type issue as #5 and #7. |
| 9 | 1120 | `subjectId: (data.subject \|\| 'physics').toLowerCase() as any,` | **Masking Real Type Error / Runtime Crash** | **HIGH RISK**. In `recordStudySession`, `data.subject` is typed as `string \| undefined`. If a caller passes `"Mathematics"` or `"math"` or an invalid string like `"Chemistry Lab"`, `.toLowerCase()` produces `"mathematics"`. However, `SubjectId` is strictly `'physics' \| 'chemistry' \| 'maths'`. Passing `"mathematics"` results in an invalid `subjectId` saved to Firestore and state. Any consumer doing `subjectBreakdown[session.subjectId]` or `subjectColors[session.subjectId]` evaluates to `undefined`, causing UI rendering bugs or `TypeError` crashes. |
| 10 | 1126 | `type: (data.mode as any) \|\| 'Practice',` | **Masking Real Type Error** | **HIGH RISK**. In `recordStudySession`, `data.mode` is typed as `string \| undefined`. `StudySession.type` is strictly `'Lecture' \| 'Practice' \| 'Mock' \| 'Revision'`. Casting arbitrary strings (e.g. `'quiz'`, `'flashcards'`, `'video'`) to `any` bypasses validation and corrupts the session type in Firestore. Downstream analytics engines filtering by `session.type === 'Lecture'` will silently miscalculate total lecture time. |
| 11 | 1232 | `xp: originalSnapshot.xp as any` | Bypassing TS (Inferred Loose Type) | **Medium Risk**. In `completeRevision` rollback block (line 1205), `originalSnapshot.xp` is shallow-cloned, creating an untyped object passed to `updateStateOptimistic`. |
| 12 | 1658 | `} as any;` (in `setSettings`) | **Masking Real Type Error / Data Corruption** | **HIGH RISK**. In `setSettings`, `newSettings` is typed as `any`. `validatedSettings = { ...this.state.settings, ...validatedPartial } as any`. Casting the entire settings object to `any` allows arbitrary unvalidated fields from client calls to bypass `StudyBrainState.settings` schema and be persisted directly to the user's Firestore document. |
| 13 | 1821 | `await UserRepository.saveUserProfile(this.userId, initialProfile as any);` | **Masking Real Type Error / Runtime Crash** | **CRITICAL RISK**. In `resetToInitialState` (line 1800), `initialProfile` defines `mentorProfile: { interviewCompleted: false }`. However, `UserProfile.mentorProfile` requires non-optional fields: `targetExams`, `targetYear`, `targetPercentile`, `targetRank`, `targetCollege`, `targetBranch`, `currentClass`, `coachingType`, and `dailyAvailableHours` (`src/types/index.ts:610-623`). Writing `{ interviewCompleted: false } as any` saves an incomplete document to Firestore. |
| 14 | 1842 | `mentorProfile: { interviewCompleted: false } as any,` | **Masking Real Type Error / Runtime Crash** | **CRITICAL RISK**. In `resetToInitialState` (line 1842), passing `{ interviewCompleted: false } as any` into `this.runtime.initialize(...)`. Any downstream component or engine reading `state.mentorProfile.dailyAvailableHours` or `state.mentorProfile.targetExams.includes(...)` will crash immediately with `TypeError: Cannot read properties of undefined`. |
| 15 | 1843 | `settings: initialProfile.settings as any,` | Bypassing TS | **Low Risk**. `initialProfile.settings` lacks optional properties (`volume`, `themeMode`, `revisionSettings`), prompting a TS warning without `as any`. |
| 16 | 1869 | `subject: blockOrSubject as any,` | **Masking Real Type Error** | **HIGH RISK**. In `addCustomTimelineBlock` (lines 1863-1869), the overload accepts `subject: string`. `TimelineBlock.subject` is typed as `SubjectId \| 'general' \| 'break'`. Casting an arbitrary string to `any` allows values like `"History"` or `""` to enter timeline state, breaking timeline UI filters. |
| 17 | 2068 | `} as any;` (in `completeMentorInterview`) | Bypassing TS | **Low Risk**. `tempMentorProfile: MentorProfile = { ...mentorData, interviewCompleted: false } as any;`. `mentorData` is `Omit<MentorProfile, 'interviewCompleted'>`. The cast is redundant and bypasses TS check for missing fields. |
| 18 | 2335 | `const updatedWeekly = (generateWeeklyMatrix as any)(` | Bypassing TS / Signature Mismatch | **Medium Risk**. In `rebalancePlan`, `generateWeeklyMatrix` is cast to `any` because parameter 9 and 10 (`dayStartTime`, `dayEndTime`) are optional in runtime settings (`string \| undefined`), while `generateWeeklyMatrix` expects `string = "07:00"`. Completely disables argument type safety. |
| 19 | 2377 | `scheduledDate: (b as any).scheduledDate,` | Redundant / Tech Debt | **Low Risk**. `b` was already typed as `(b: any)` in `currentDayBlocks.map((b: any) => ...)` at line 2358. Double assertion indicates legacy code patching. |
| 20 | 2378 | `scheduledTime: (b as any).scheduledTime` | Redundant / Tech Debt | **Low Risk**. Same as #19. |
| 21 | 2413 | `timeline: updatedBlocks as any` | Bypassing TS | **Medium Risk**. In `updateScheduleBlock`, `updatedBlocks` is mapped from `TimelineBlock[]`. Because `time: updates.timeSlot \|\| b.time` can be undefined if `b.time` is missing, `as any` was slapped on to satisfy `timeline: TimelineBlock[]` in `StudyBrainRuntime.refresh`. |

---

### Part 2: `src/runtime/StudyBrainRuntime.ts` (2 Instances of `as any`)

| # | Line | Exact Code Snippet | Category | Risk & Impact Assessment |
|---|---|---|---|---|
| 22 | 609 | `subject: t.subjectId as any,` | Bypassing TS / Cross-Package Types | **Medium Risk**. `t` is a `ScheduledTask` from `plannerOutput?.todaysMission`. `ScheduledTask.subjectId` is typed as `SubjectId` in `@jee-os/engines/src/planner/types.ts:54`. However, `TodayMission.subject` is typed as `SubjectId` in `src/types/index.ts:145`. Because `@jee-os/engines` and `src/` have slight discrepancies in package export resolution, the compiler treats them as separate types, prompting the author to use `as any`. Masks potential invalid subject assignments if engines ever return non-standard subjects. |
| 23 | 698 | `weeklySchedule = (generateWeeklyMatrix as any)(` | Bypassing TS / Signature Mismatch | **Medium Risk**. Same as #18: `generateWeeklyMatrix` is cast to `any` because `this.state.settings?.dayStartTime` is `string \| undefined`. Bypassing compiler checks prevents catching parameter re-ordering or signature changes in `PlannerEngine.ts`. |

---

### Part 3: Untyped / `: any` Declarations in `src/actions/` & `src/runtime/`

In addition to `as any` type casts, several critical variables and parameters were declared as `: any`, which completely disables TypeScript compile-time validation:

1. **`StudyBrainActions.ts:114`**: `private evaluateAndUpdateStreak(xp: any, updatedSessions: StudySession[])`  
   `xp` is passed as `any`. It mutates `xp.streak` and `xp.lastActiveDate` directly in-place without type checking.
2. **`StudyBrainActions.ts:360`**: `const localBreak: any = { ... id: breakId, subject: 'break', ... }`  
   `subject: 'break'` is assigned to a `TodayMission`. But `TodayMission.subject` must be `SubjectId = 'physics' | 'chemistry' | 'maths'`. Declaring `localBreak: any` masks this type violation.
3. **`StudyBrainActions.ts:540`**: `const userProfileUpdates: any = { xp: newXp };`  
   Lacks `Partial<UserProfile>` type, allowing unchecked object properties to be passed to `UserRepository.updateUserProfile`.
4. **`StudyBrainActions.ts:1636`**: `async setSettings(newSettings: any)`  
   `newSettings` parameter is completely untyped.
5. **`StudyBrainActions.ts:2313`**: `const getSortKey = (m: any) => { ... }`  
   `m` is untyped, bypassing checks on `m.taskName` and `m.completed`.
6. **`StudyBrainActions.ts:2350` & `2358`**: `(b: any) => b.dayIndex === currentDayIndex` and `currentDayBlocks.map((b: any) => ...)`  
   Blocks returned from `generateWeeklyMatrix` are typed as `WeeklyBlock`, but cast to `any`. In line 2363, `subject: b.subject` is assigned to `TodayMission.subject`. Because `WeeklyBlock.subject` can be `'break'` or `'revision'` (`WeeklyBlock` definition in `PlannerEngine.ts:1011`), this injects invalid subjects (`'break'` or `'revision'`) into `TodayMission.subject` without a compile-time error.
7. **`StudyBrainRuntime.ts:147`**: `public plannerEngine?: any;`  
   Disables type checking on all calls to `this.plannerEngine.generateDailyPlan(...)`.
8. **`StudyBrainRuntime.ts:148`**: `public optimizationEngine?: any;`  
   Disables type checking on all calls to `this.optimizationEngine.optimize(...)`.
9. **`StudyBrainRuntime.ts:159`**: `settings?: any;` in `prevMemoState`  
   Prevents type checking during delta memoization comparisons.

---

## Section 2: Structural & Architectural Weaknesses

### Weakness 1: God-Class Anti-Pattern in `StudyBrainActions.ts`
- **File & Lines:** `src/actions/StudyBrainActions.ts` (lines 1–2479, ~2,480 lines)
- **Problem Statement:** `StudyBrainActions` has aggregated 12 disparate application domains into a single monolithic class:
  1. XP Leveling & streak calculation (lines 75–142, 1701–1719)
  2. Pomodoro Casino XP wagering (lines 249–269)
  3. Mission execution, early partial XP awards, break insertion (lines 282–714)
  4. Chapter progress, stage normalization, and custom chapters (lines 812–963, 1492–1519)
  5. Spaced repetition SM-2 flashcard grading (lines 1131–1297)
  6. Mock test result recording and score calculation (lines 1342–1397)
  7. Mistake logging, base64 image upload, recovery score tracking (lines 1399–1611)
  8. Timeline block management and schedule overrides (lines 1613–1630, 1861–1932, 2391–2418)
  9. Weekly matrix regeneration and schedule rebalancing (lines 2299–2389)
  10. Full database wiping and batch deletion of subcollections (lines 1721–1848)
  11. Mentor onboarding, check-ins, and strategic roadmap generation (lines 1934–2276)
  12. Settings schema parsing and deep merging (lines 1636–1681)
- **Architectural Impact:** High coupling and zero cohesion. A failure in one domain (e.g. `checkWriteBlock` throwing due to an uninitialized database) locks out unrelated local actions like UI modal toggling (`openChapterEditModal`, lines 849–851). Single-responsibility principle (SRP) is completely broken.

---

### Weakness 2: Direct Firestore Primitives Bypassing the Repository Layer
- **File & Lines:**  
  - `src/actions/StudyBrainActions.ts:19–20, 1775–1796`  
  - `src/context/StudyBrainContext.tsx:2–3, 234–428`
- **Problem Statement:** The codebase defines a repository pattern under `src/repositories/` (`ChapterRepository`, `MistakeRepository`, `StudySessionRepository`, etc.). However:
  1. In `StudyBrainActions.ts` lines 1775–1796 (`resetAllProgress`), it imports `collection`, `getDocs`, `writeBatch`, `deleteDoc`, and `doc` directly from `firebase/firestore` and iterates over subcollections (`'chapters'`, `'mistakes'`, `'notes'`, `'studySessions'`, `'mockResults'`, `'customTimelineBlocks'`, `'customMissions'`, `'customMockTests'`), performing batch deletions directly and bypassing the repository classes.
  2. In `StudyBrainContext.tsx` lines 234–428, all real-time read listeners (`onSnapshot`) are established directly on Firestore collections without going through repositories. Repositories only provide one-shot `get` and `save` methods, meaning the entire read/subscription architecture completely bypasses `src/repositories/`.
- **Architectural Impact:** The repository pattern is only half-implemented (write-only helper functions). There is no central abstraction for data access, caching, or real-time subscription management.

---

### Weakness 3: Cyclical Cross-Package Dependency (`@jee-os/engines` ↔ `@/services/studyBrainService`)
- **File & Lines:**  
  - `packages/engines/src/chapterInfo/ChapterInfoEngine.ts:4`  
  - `src/services/studyBrainService.ts:3–9`
- **Problem Statement:**  
  - In `packages/engines/src/chapterInfo/ChapterInfoEngine.ts:4`:  
    `import { StudyBrainService } from '@/services/studyBrainService';`  
  - In `src/services/studyBrainService.ts:3–9`:  
    `import { KnowledgeEngine, PlannerEngine, OptimizationEngine, AnalyticsEngine, CoachEngine } from '@jee-os/engines';`  
  - In `packages/engines/src/index.ts`: exports `ChapterInfoEngine`.
- **Architectural Impact:** `packages/engines` is supposed to be an independent, reusable calculation engine package (located under `packages/`). Yet it reaches back into the main application (`@/services/studyBrainService` and `@/types/index`). This creates a circular dependency between the application and the engine package. If `packages/engines` were compiled or bundled independently, TypeScript and bundlers would fail because `@/` cannot resolve outside the root Vite configuration.

---

### Weakness 4: UI Components Bypassing Actions to Directly Mutate Repositories & Runtime
- **File & Lines:** `src/features/dashboard/SettingsPage.tsx:174–181`
- **Problem Statement:**  
  In `SettingsPage.tsx`, the mission undo button executes:
  ```ts
  const sessions = useStudyBrainStore.getState().studySessions || [];
  const latestSession = sessions[0];
  if (latestSession) {
    await actions.safeDbCall(() => StudySessionRepository.deleteStudySession(actions.userId, latestSession.id), 'deleteStudySession');
  }
  await actions.safeDbCall(() => UserRepository.updateUserProfile(actions.userId, { xp: newXp }), 'updateUserProfile');
  const newSessions = sessions.filter(s => s.id !== latestSession?.id);
  actions.runtime.updateStateOptimistic({ xp: newXp, studySessions: newSessions });
  await actions.runtime.refresh('INIT');
  ```
- **Architectural Impact:**  
  1. The UI directly accesses `StudySessionRepository` and `UserRepository`, completely bypassing `StudyBrainActions`.
  2. The UI accesses `actions.runtime` directly and triggers optimistic updates and engine refreshes.
  3. `sessions[0]` assumes the session array is sorted descending, but `StudyBrainContext` populates `snapshotState.studySessions` via `snap.docs.map(...)` with no order guarantee, risking deleting an arbitrary session rather than the latest one.

---

### Weakness 5: Unnormalized, Redundant Chapter Schema & Desync in `normalizeChapter`
- **File & Lines:**  
  - `src/types/index.ts:230–280`  
  - `src/utils/academicState.ts:43–46, 196–208`  
  - `src/actions/StudyBrainActions.ts:940–955`
- **Problem Statement:** The `Chapter` interface contains duplicated, redundant fields:
  - Top-level `currentLecture` vs nested `lectureProgress.completedLectures`
  - Top-level `totalLectures` vs nested `lectureProgress.totalLectures`
  - Top-level `theoryComplete`, `dppComplete`, `pyqsComplete` vs nested `practiceProgress`
  - `status` (`ChapterStatus`) vs `syllabusStage` (`SyllabusDiagnosisStage`)
- **Concrete Bug Scenario:**  
  In `StudyBrainActions.ts:944` (`updateChapterProgress`), when called with a lecture number:
  ```ts
  updatedChapter = normalizeChapter({
    ...chapter,
    currentLecture: typeof updates === 'number' ? updates : chapter.currentLecture,
    ...
  });
  ```
  It updates `currentLecture: 5`. But in `academicState.ts:43–46`:
  ```ts
  const compLects = Math.min(
    totalLects, 
    chapter.lectureProgress?.completedLectures ?? chapter.currentLecture ?? ...
  );
  ```
  Because `chapter.lectureProgress.completedLectures` already exists (e.g. `2`), the nullish coalescing operator `??` selects `2`, ignoring `currentLecture: 5`! Then line 197 sets `currentLecture = compLects` (`2`). **The user's update is silently reverted and lost.**

---

### Weakness 6: Misplaced Repository Implementation (`src/firebase/QuestionRepository.ts`)
- **File & Lines:** `src/firebase/QuestionRepository.ts` (lines 1–91)
- **Problem Statement:** All data repositories reside in `src/repositories/` (`chapterRepository.ts`, `mistakeRepository.ts`, etc.). However, `QuestionRepository.ts` was implemented in `src/firebase/QuestionRepository.ts`.
- **Architectural Impact:** Inconsistent project layout violating the repository pattern conventions established in `PROJECT.md`.

---

### Weakness 7: Inconsistent Repository Coding Styles
- **File & Lines:**  
  - `src/repositories/customMissionRepository.ts:6` (`export class CustomMissionRepository`)  
  - `src/firebase/QuestionRepository.ts:5` (`export class QuestionRepository`)  
  - `src/repositories/chapterRepository.ts:6` (`export const ChapterRepository = { ... }`)  
  - `src/repositories/userRepository.ts:6` (`export const UserRepository = { ... }`)
- **Problem Statement:** Half of the repositories are implemented as classes with static methods, while the other half are plain JavaScript objects with async function properties.
- **Architectural Impact:** Inconsistent testing, mocking patterns, and typing conventions across the persistence layer.

---

## Section 3: Data Flow Integrity Risks

### Risk 1: Non-Atomic Multi-Document Operations Without Firestore Batches/Transactions
- **File & Lines:**  
  - `src/actions/StudyBrainActions.ts:544–573` (`completeTask`)  
  - `src/actions/StudyBrainActions.ts:1092–1096` (`completeStudySession`)  
  - `src/actions/StudyBrainActions.ts:1371–1374` (`addMockResult`)  
  - `src/actions/StudyBrainActions.ts:1598–1601` (`updateMistakeTestResult`)
- **Problem Statement:**  
  In each of these operations, multiple Firestore documents across different collections are written via independent calls or `Promise.all`:
  - In `completeStudySession`:
    ```ts
    savePromises.push(StudySessionRepository.saveStudySession(this.userId, session));
    savePromises.push(UserRepository.updateUserProfile(this.userId, { analytics: updatedAnalytics, xp: newXp }));
    await Promise.all(savePromises);
    ```
  - In `updateMistakeTestResult`:
    ```ts
    await MistakeRepository.saveMistake(this.userId, updatedMistake);
    if (deltaXp > 0) {
      await UserRepository.updateUserProfile(this.userId, { xp: newXp });
    }
    ```
- **Concrete Failure Scenario:** If the user is on an unstable mobile network and loses connectivity after the first write commits (or hits a Firestore quota limit), the session or mistake is committed to Firestore, but the user profile update (XP, level, streak, analytics) fails. Because Firestore transactions (`runTransaction`) or batch writes (`writeBatch`) are not used, the database enters a permanently desynchronized state where study sessions exist without corresponding XP or analytics totals.

---

### Risk 2: Orphaned Data & Missing Cascading Deletes on Chapter Deletion
- **File & Lines:** `src/actions/StudyBrainActions.ts:1507–1519` (`deleteChapter`)
- **Problem Statement:**  
  ```ts
  async deleteChapter(chapterId: string) {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    try {
      await ChapterRepository.deleteChapter(this.userId, chapterId);
      const updatedChapters = this.state.chapters.filter(c => c.id !== chapterId);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'deleteChapter');
    }
  }
  ```
- **Concrete Failure Scenario:**  
  When a chapter is deleted:
  1. Documents in `/users/{uid}/mistakes` that reference `chapterId` or `chapter.name` are **not deleted**. They become orphaned records.
  2. Documents in `/users/{uid}/notes` referencing `chapter.name` are **not deleted**.
  3. Documents in `/users/{uid}/studySessions` referencing `chapterId` are **not updated or deleted**.
  4. Active missions in `todayMissions` and `customMissions` referencing `chapterId` remain in state and UI.
  5. Other chapters whose `dependencies` array contains `chapter.name` still reference the deleted chapter, causing `KnowledgeEngine` graph construction to point to non-existent nodes.
  6. `radarFocusedChapter` or `activeEditChapterId` in runtime state point to the non-existent chapter ID, causing inspector modals to render blank or throw null dereferences.

---

### Risk 3: In-Place Mutation in `runCoachAnalysis` Breaking Zustand Selectors
- **File & Lines:** `src/runtime/StudyBrainRuntime.ts:1064–1066`
- **Problem Statement:**  
  ```ts
  const analysis = await this.coachEngine.getAnalysis(coachInput);
  this.state.coachAnalysis = analysis;
  this.state.coachMessage = analysis.analysis;
  this.notifySubscribers();
  ```
- **Concrete Failure Scenario:**  
  `this.state` is mutated in-place rather than creating a new state reference (`this.state = { ...this.state, coachAnalysis: analysis, coachMessage: analysis.analysis }`). When `this.notifySubscribers()` runs:
  In `useStudyBrainStore.ts:17–19`:
  ```ts
  runtime.subscribe((newState) => {
    set(newState);
  });
  ```
  Zustand receives `newState === oldState` (identical object reference). Component selectors using shallow equality or root state comparison (e.g. `useStudyBrainStore(s => s.coachMessage)`) detect no reference change and skip re-rendering. The UI remains stuck displaying the old coach message.

---

### Risk 4: Double Subscription Between Zustand Store and StudyBrainContext
- **File & Lines:**  
  - `src/store/useStudyBrainStore.ts:17–19`  
  - `src/context/StudyBrainContext.tsx:139–142`
- **Problem Statement:**  
  1. In `useStudyBrainStore.ts` (upon module import):
     ```ts
     runtime.subscribe((newState) => {
       set(newState);
     });
     ```
  2. In `StudyBrainContext.tsx` (in `useEffect`):
     ```ts
     const unsubscribe = runtime.subscribe((newState) => {
       useStudyBrainStore.getState().syncFromRuntime(newState);
     });
     ```
- **Impact:** Every single runtime update (every optimistic update, engine refresh, and level-up timer) emits to both listeners, executing `set(newState)` **twice in immediate succession**. This causes redundant React component re-renders throughout the application.

---

### Risk 5: Race Condition on Guest vs User Actions
- **File & Lines:**  
  - `src/store/useStudyBrainStore.ts:14`  
  - `src/context/StudyBrainContext.tsx:134–137`
- **Problem Statement:**  
  `useStudyBrainStore` initializes `actions` as:
  `const actions = new StudyBrainActions(runtime, 'guest');`
  `StudyBrainContext.tsx` only updates `actions` with the authenticated `user.uid` inside a `useEffect`:
  `useStudyBrainStore.getState().setActions(actions);`
- **Concrete Failure Scenario:** If any component triggers an action during initial render or in an early `useLayoutEffect` / mount callback before `StudyBrainContext`'s effect executes, `actions.userId` is still `'guest'`. The action attempts to write to `/users/guest/...`. Under `firestore.rules`, `isOwner(userId)` evaluates `request.auth.uid == 'guest'`, which fails with `permission-denied`. This puts the store into a permanent `writeBlocked` or sync error state.

---

## Section 4: Mutation & Rollback Integrity

### Missing Rollbacks in `StudyBrainActions.ts`

Only 3 methods in `StudyBrainActions.ts` implement try/catch rollbacks:
1. `completeTask` (lines 650–661)
2. `completeStudySession` (lines 1100–1106)
3. `completeRevision` (lines 1230–1235)

**Every other asynchronous mutation method lacks optimistic rollback.** When a Firestore write fails, the method invokes `this.handleWriteError(err, actionName)`:
```ts
private async handleWriteError(err: any, actionName: string): Promise<never> {
  const errorMsg = `Sync Error (${actionName}): ${err?.message || 'Database write failed'}`;
  console.error(errorMsg, err);
  this.triggerToast('Sync Error', errorMsg, 'error');
  await this.runtime.refresh('SETTINGS_UPDATE', { lastSyncError: errorMsg });
  throw new Error(errorMsg);
}
```
`handleWriteError` sets `lastSyncError` and throws an error, but **does not restore previously mutated state**.

### Catalog of Methods Lacking Rollback:
1. **`skipTask` (lines 965–1008):** Updates `todayMissions` in memory to mark `dismissed: true` and unlock the next mission. If Firestore write (`CustomMissionRepository.saveMission` or `UserRepository.updateUserProfile`) fails, `todayMissions` is not rolled back. The task appears skipped in the UI but remains active on next reload.
2. **`deleteMission` (lines 680–714):** Removes custom missions and adds to `deletedMissionIds`. On failure, state is not rolled back.
3. **`updateChapter` (lines 812–847):** Optimistically mutates `this.state.chapters`. On `ChapterRepository.saveChapter` failure, the updated chapter remains in memory until page reload.
4. **`addCustomChapter` (lines 853–925):** Appends to `this.state.chapters`. On failure, the chapter is not removed from local state.
5. **`updateChapterProgress` (lines 927–963):** Updates lecture/DPP/PYQ progress. On failure, no rollback is performed.
6. **`toggleChapterStatus` & `updateChapterStatus` (lines 1299–1338):** No rollback on Firestore rejection.
7. **`addMockResult` (lines 1342–1383):** Calculates new XP and level, adds mock to `state.mocks`. If `UserRepository.updateUserProfile` fails, XP is not rolled back.
8. **`addMistake` (lines 1399–1438):** No rollback on failure.
9. **`updateMistakeStatus` (lines 1440–1490):** No rollback on failure.
10. **`updateMistakeTestResult` (lines 1546–1611):** Updates mistake attempt number, recovery score, and XP. On failure, no rollback is performed.
11. **`deleteMistake` (lines 1535–1544):** Removes mistake from local state. If `MistakeRepository.deleteMistake` rejects, the mistake remains deleted in the UI.
12. **`setSettings` (lines 1636–1681):** Updates settings and mentor profile. No rollback on failure.
13. **`addCustomTimelineBlock`, `updateCustomTimelineBlock`, `deleteCustomTimelineBlock` (lines 1863–1932):** No rollback on failure.
14. **`updateScheduleBlock` (lines 2391–2418):** Updates schedule overrides. No rollback on failure.
15. **`extendSession` (lines 2425–2477):** Updates session extension end time. No rollback on failure.

---

## Section 5: Subscription & Lifecycle Leaks

### 1. Refresh Queue Timer Leak & Dropped Retries in `StudyBrainRuntime.ts`
- **File & Lines:** `src/runtime/StudyBrainRuntime.ts:336–359`
- **Problem Statement:**  
  In `refresh()` (line 340):
  ```ts
  this.refreshTimer = setTimeout(() => {
    this.processDebouncedRefresh();
  }, 0);
  ```
  In `processDebouncedRefresh()` (lines 351–359):
  ```ts
  if (this.isProcessingRefresh) {
    if (!this.refreshTimer) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null;
        this.processDebouncedRefresh();
      }, 100);
    }
    return;
  }
  ```
- **Bug Mechanism:** When `processDebouncedRefresh` is invoked by the `setTimeout(..., 0)` timer, **`this.refreshTimer` is never reset to `null`**. It still holds the timer ID from line 340. If another refresh request arrived while `isProcessingRefresh === true`, `if (!this.refreshTimer)` evaluates to **false**. The 100ms fallback retry timer is never scheduled! The refresh queue drops the scheduled retry and relies solely on the active execution's `finally` block.

---

### 2. Swallowed Exceptions in Debounced Refresh Queue
- **File & Lines:** `src/runtime/StudyBrainRuntime.ts:369–384`
- **Problem Statement:**  
  ```ts
  try {
    const mainReason = reasons.includes('SETTINGS_UPDATE') ? 'SETTINGS_UPDATE' : reasons[0];
    await this.executeRefresh(mainReason);
  } catch (error) {
    console.error('[StudyBrainRuntime] Refresh failed:', error);
  } finally {
    this.isProcessingRefresh = false;
    resolvers.forEach(r => r());
  }
  ```
- **Bug Mechanism:** When `executeRefresh` throws an error (e.g. an engine fails or invalid data is encountered), the catch block merely logs to console. In the `finally` block, `resolvers.forEach(r => r())` is called unconditionally. Callers who await `await runtime.refresh(...)` receive a resolved promise, believing the refresh succeeded, while the engine state remains uncomputed.

---

### 3. Floating Unhandled Async Promise in `StudyBrainContext.tsx`
- **File & Lines:** `src/context/StudyBrainContext.tsx:201–216`
- **Problem Statement:**  
  ```ts
  (async () => {
    const remainingQueue = [];
    for (const mock of offlineQueue) {
      try {
        await actions.addMockResult(mock);
      } catch (e) { ... }
    }
    ...
  })();
  ```
- **Bug Mechanism:** An unawaited async IIFE runs in the background upon initial data load. It has no cancellation mechanism (`active` flag or `AbortController`). If the user logs out or switches accounts while this loop is executing, it continues calling `actions.addMockResult(mock)`, triggering state updates and writing to Firestore under the previous user context.

---

### 4. Unbounded Real-Time Firestore `onSnapshot` Collections
- **File & Lines:** `src/context/StudyBrainContext.tsx:301, 318, 334, 350, 366, 382, 398, 414`
- **Problem Statement:** Nine listeners are created on root subcollections (`studySessions`, `mistakes`, `mockResults`, `notes`, `chapters`, etc.) without `limit()` or `where()`.
- **Performance & Scale Impact:** For an active student studying over 6–12 months, `studySessions` and `mistakes` accumulate thousands of documents. Every single time any document is added or modified, Firestore pushes all document snapshots, and JavaScript maps over the entire array (`snap.docs.map(...)`). This creates high memory churn, slow garbage collection pauses, and excessive Firestore read billing.

---

### 5. Incompatible Firestore Rules for `pyq_bank` and Guest Authentication
- **File & Lines:**  
  - `firestore.rules:18–21`  
  - `src/firebase/QuestionRepository.ts:14, 46–60`
- **Problem Statement:**  
  In `firestore.rules`:
  ```
  match /pyq_bank/{document=**} {
    allow read: if request.auth != null && request.auth.token.firebase.sign_in_provider != 'anonymous';
    allow write: if false; // Only Admin SDK can write PYQs
  }
  ```
  1. `QuestionRepository.saveQuestion` and `QuestionRepository.saveQuestionsBatch` attempt to write to `pyq_bank` from client code. Any client invocation will unconditionally fail with Firestore `permission-denied`.
  2. Anonymous / Guest users are explicitly denied read access (`sign_in_provider != 'anonymous'`). When guest users attempt to view PYQ questions, `QuestionRepository.getQuestionsByChapter` silently catches the permission-denied error and returns an empty array `[]`, breaking practice features for prospective users.

---

## Conclusion

The JEE OS runtime, state, and persistence architecture exhibits clear signs of evolutionary code expansion without architectural refactoring:
1. `StudyBrainActions` has become an unmaintainable God-class coupling 12 distinct feature domains.
2. Optimistic mutations almost universally lack rollback mechanisms on failure (35 out of 38 methods).
3. Cross-package boundary violations exist between `@jee-os/engines` and application services.
4. Redundant, denormalized chapter schemas cause silent data overwrite bugs in `normalizeChapter`.
5. The refresh queue has timer retention bugs and swallows engine exceptions.
6. Firestore reads are unbounded and bypass the repository layer entirely.
