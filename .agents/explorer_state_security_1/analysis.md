# State Management, Data Flow, Persistence & Security Audit Report

**Target Scope**: `src/context/`, `src/actions/`, `src/store/`, `src/runtime/`, `src/repositories/`, `src/services/`, `src/features/`, `src/utils/`  
**Agent**: Explorer 2 (State Management & Security Specialist)  
**Date**: August 2026  
**Status**: Comprehensive Read-Only Audit Completed  

---

## Executive Summary

This report delivers an exhaustive, line-by-line audit of State Management, Data Flow, Persistence, Error Handling, Crash Resilience, and Security across the JEE-OS application. 

The investigation identified **10 critical state and concurrency bugs**, **7 major dead code and orphaned architectural slices**, **9 security and persistence vulnerabilities**, and **5 predicted failure points** under hostile runtime conditions (e.g., storage quota exhaustion, Firestore document size limits, race conditions, and network disruption).

---

## 1. State Management Architecture & Data Flow

```
                                  ┌────────────────────────┐
                                  │   Firebase Firestore   │
                                  │ (User Subcollections)  │
                                  └───────────┬────────────┘
                                              │ (9 onSnapshot listeners)
                                              ▼
                                 ┌──────────────────────────┐
                                 │  StudyBrainProvider      │
                                 │ (StudyBrainContext.tsx)  │
                                 └────────────┬─────────────┘
                                              │ runtime.updateStateOptimistic()
                                              │ runtime.refresh('DATA_SYNC')
                                              ▼
┌────────────────────────┐       ┌──────────────────────────┐       ┌──────────────────────────┐
│   React UI Feature     │ ────▶ │    StudyBrainActions     │ ────▶ │    StudyBrainRuntime     │
│  Components & Modals   │ ◀──── │ (Optimistic + Rollback)  │ ◀──── │  (Singleton Coordinator) │
└────────────────────────┘       └──────────────────────────┘       └─────────────┬────────────┘
            ▲                                                                     │
            │                                                                     ▼
            │                                                       ┌──────────────────────────┐
            └────────────────────────────────────────────────────── │  8 Analytical Engines    │
                              useStudyBrainStore()                  │ (@jee-os/engines + Svc)  │
                              (Zustand Selector)                    └──────────────────────────┘
```

### Architectural Breakdown:
1. **Dual Architecture / Orphaned Context**:
   - `StudyBrainContext.tsx` contains `interface StudyBrainContextType` and `const StudyBrainContext = createContext<StudyBrainContextType | null>(null);` (lines 120–126), which is never exported or consumed by any React component.
   - `StudyBrainProvider` acts solely as a background side-effect mount point for 9 Firestore `onSnapshot` listeners, returning `<>{children}</>` directly.
   - State is actually consumed by the entire component tree via `useStudyBrainStore` (`src/store/useStudyBrainStore.ts`), which wraps the singleton `StudyBrainRuntime`.
2. **Singleton State Engine (`StudyBrainRuntime.ts`)**:
   - Coordinates state for all 70 chapters, study sessions, mistakes, mocks, custom missions, timeline blocks, and user settings.
   - Implements a debounced refresh queue (`processDebouncedRefresh`, lines 305–368) to prevent redundant analytical recalculations when Firestore listeners fire in rapid succession.
   - Caches analytical engine outputs (`KnowledgeEngine`, `PlannerEngine`, `OptimizationEngine`, `AnalyticsEngine`, `CoachEngine`, `RevisionEngine`, `MockScoringEngine`, `MistakeScoringEngine`) using object-reference memoization (`this.prevMemoState`).
3. **Action Dispatcher (`StudyBrainActions.ts`)**:
   - Contains 2,253 lines of action methods managing leveling, streak calculations, task completion, chapter updates, mock recording, and mentor onboarding.
   - Performs optimistic UI updates followed by asynchronous persistence to Firestore repositories, with rollback mechanisms on write failures.

---

## 2. Detailed Bug Catalog

### Bug 1: Silent Infinite Loading Lockout in Firestore Snapshot Listeners
- **Location**: `src/context/StudyBrainContext.tsx:19-32, 80-90, 305-340`
- **Severity**: **CRITICAL**
- **Code Reference**:
  ```ts
  // StudyBrainContext.tsx:19-25
  function validateAndSanitizeChapters(rawChapters: any[]): Chapter[] {
    if (!Array.isArray(rawChapters)) {
      throw new Error("Validation Error: Expected chapters to be an array");
    }
    return rawChapters.map(raw => {
      if (!raw || typeof raw !== 'object') {
        throw new Error("Validation Error: Invalid chapter object");
      }
      ...
    });
  }

  // StudyBrainContext.tsx:305-312
  const unsubChapters = onSnapshot(collection(db, 'users', currentUid, 'chapters'), (snap) => {
    try {
      const rawChapters = snap.docs.map(doc => doc.data());
      const chapters = validateAndSanitizeChapters(rawChapters);
      loadedFlags.chapters = true;
      checkAndInit();
    } catch (e) {
      console.error("Critical: Failed to validate/sanitize chapters snapshot", e);
    }
  });
  ```
- **Root Cause**: If Firestore returns any malformed document (e.g. from an aborted partial write or schema migration), `validateAndSanitizeChapters` throws an uncaught exception. The snapshot callback's `try/catch` catches the error and logs to `console.error`, but `loadedFlags.chapters` remains `false`.
- **Impact**: `checkAndInit()` checks `const allLoaded = Object.values(loadedFlags).every(Boolean);`. Because `loadedFlags.chapters` is never marked `true`, `loading: false` is never dispatched to `StudyBrainRuntime`. The application permanently hangs on `"SYNCING WORKSPACE..."` with no error banner and no transition to `initializationError`.

---

### Bug 2: Multi-User State Leakage & Memoization Poisoning in Singleton Runtime
- **Location**: `src/runtime/StudyBrainRuntime.ts:141-150, 257-262`
- **Severity**: **HIGH**
- **Code Reference**:
  ```ts
  // StudyBrainRuntime.ts:257-262
  public resetToInitialState(): void {
    this.state = this.getInitialState();
    this.subscribers.forEach(sub => sub(this.state));
    this.zustandListeners.forEach(listener => listener(this.state));
  }
  ```
- **Root Cause**: `resetToInitialState()` resets `this.state`, but **does NOT reset `this.prevMemoState`**, `this.knowledgeEngine`, `this.plannerEngine`, or `this.optimizationEngine`.
- **Impact**: When User A logs out and User B logs in within the same browser session without a hard reload, delta comparison in `executeRefresh()`:
  ```ts
  const chaptersChanged = currentState.chapters !== this.prevMemoState.chapters;
  ```
  compares User B's chapters against *User A's cached `prevMemoState.chapters`*. Engine caches retain User A's syllabus graph and analytics, leaking User A's progress and recommendations into User B's dashboard.

---

### Bug 3: Duplicate Study Session & Double XP Creation on Cockpit Mission Completion
- **Location**: `src/features/mission/hooks/useMissionState.ts:606` & `src/features/mission/CockpitPage.tsx:70-84`
- **Severity**: **CRITICAL**
- **Code Reference**:
  ```ts
  // useMissionState.ts:604-612
  const handleMissionComplete = async (data?: any) => {
    if (activeSubjectMission?.id) {
      // 1. First completeTask call
      await actions.completeTask(activeSubjectMission.id, data?.duration ?? Math.max(60, seconds));
    }
    if (onComplete) {
      onComplete({ ... });
    }
  };

  // StudyBrainActions.ts:538-554 (Inside completeTask)
  const sessionPayload: StudySession = {
    id: sessionId,
    subjectId: mission.subject,
    type: 'Mission',
    duration: Math.max(1, Math.round(durationSeconds / 60)),
    ...
  };
  savePromises.push(this.safeDbCall(() => StudySessionRepository.saveStudySession(this.userId, sessionPayload), 'saveStudySession'));

  // CockpitPage.tsx:70-84
  onComplete={(stats) => {
    const durationMinutes = Math.max(1, Math.ceil(stats.duration / 60));
    // 2. Second completeStudySession call for the same task!
    actions.completeStudySession({
      duration: durationMinutes,
      focusTime: durationMinutes,
      questions: stats.questions,
      correct: stats.correct ?? stats.questions,
      type: 'Practice',
      subjectId: activeSubject as any,
      ...
    });
    navigate('/dashboard');
  }}
  ```
- **Root Cause**: `handleMissionComplete` calls `actions.completeTask(mission.id)`, which creates and persists a `StudySession` to Firestore and state. Then `onComplete` in `CockpitPage.tsx` immediately invokes `actions.completeStudySession(...)`, which creates and persists a *second* `StudySession` with a new timestamp ID for the identical study event.
- **Impact**: Every completed cockpit mission produces **2 duplicate study session records** in Firestore, doubling the user's recorded study time, inflating daily focus hours in `SessionAnalytics`, and awarding duplicate XP.

---

### Bug 4: Timeline Subcollection Name Mismatch (Silent Data Desync)
- **Location**: `src/context/StudyBrainContext.tsx:383` vs `src/repositories/timelineRepository.ts:9, 16, 33`
- **Severity**: **HIGH**
- **Code Reference**:
  ```ts
  // StudyBrainContext.tsx:383
  const unsubTimeline = onSnapshot(collection(db, 'users', currentUid, 'timelineBlocks'), (snap) => {
    ...
  });

  // timelineRepository.ts:9 & 16
  async getCustomTimelineBlocks(userId: string): Promise<TimelineBlock[]> {
    const blocksCol = collection(db, 'users', userId, 'customTimelineBlocks');
    ...
  }
  async saveTimelineBlock(userId: string, block: TimelineBlock): Promise<void> {
    const blockDoc = doc(db, 'users', userId, 'customTimelineBlocks', block.id);
    await setDoc(blockDoc, sanitizeForFirestore(block));
  }
  ```
- **Root Cause**: `TimelineRepository` reads and writes to the subcollection path `users/{userId}/customTimelineBlocks`, while `StudyBrainContext.tsx` establishes a real-time `onSnapshot` listener on `users/{userId}/timelineBlocks`.
- **Impact**: Any custom timeline block created or updated via `TimelineRepository` is saved to `customTimelineBlocks` and **never received by the snapshot listener** in `StudyBrainContext`. The UI timeline will never update in real-time.

---

### Bug 5: Direct Immutable State Mutations Bypassing Subscriptions
- **Location**: `src/actions/StudyBrainActions.ts:435, 437, 556, 562, 590`
- **Severity**: **MEDIUM**
- **Code Reference**:
  ```ts
  // StudyBrainActions.ts:435-437
  c.status = 'Learning';
  if (this.state.chapterTelemetryMap[c.id]) {
    this.state.chapterTelemetryMap[c.id].retentionConfidence = 'High';
  }

  // StudyBrainActions.ts:556
  this.state.studySessions = [sessionPayload, ...this.state.studySessions];

  // StudyBrainActions.ts:590 (in rollback)
  this.state.studySessions = originalStateSnapshot.studySessions;
  ```
- **Root Cause**: In-place mutation of `c.status` and `this.state.chapterTelemetryMap[c.id]` and direct reassignment to `this.state.studySessions` without going through `updateStateOptimistic` or notifying subscribers.
- **Impact**: React components consuming `studySessions` or `chapterTelemetryMap` via Zustand selectors do not receive change notifications until an unrelated action triggers a full runtime refresh, causing stale UI renders.

---

### Bug 6: Concurrent Unmerged `updateUserProfile` Invocations in `completeTask`
- **Location**: `src/actions/StudyBrainActions.ts:501, 527, 530`
- **Severity**: **HIGH**
- **Code Reference**:
  ```ts
  // StudyBrainActions.ts:501
  savePromises.push(this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, { xp: newXp }), 'updateUserProfile'));
  
  // StudyBrainActions.ts:530
  savePromises.push(this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, { 
    completedPlannerMissionIds: Array.from(completedSet) 
  }), 'updateUserProfile'));

  // StudyBrainActions.ts:577
  await Promise.all(savePromises);
  ```
- **Root Cause**: `completeTask` pushes multiple separate `UserRepository.updateUserProfile(this.userId, ...)` promises into `savePromises` and runs them concurrently with `Promise.all`.
- **Impact**: In Firestore, concurrent `setDoc(docRef, data, { merge: true })` calls on the exact same user document race against each other. One write can overwrite the other depending on network packet arrival order, leading to lost XP or lost `completedPlannerMissionIds`.

---

### Bug 7: Stale Closure Discarding Reality Audit Diagnostic Data
- **Location**: `src/components/mentor/hooks/useMentorInterviewForm.ts:57-64`
- **Severity**: **HIGH**
- **Code Reference**:
  ```ts
  const initialRealityState = useMemo(() => {
    const state: Record<string, 'not_started' | 'lectures_done' | 'practice_done' | 'revision_needed' | 'mastered'> = {};
    chapters.forEach(c => {
      state[c.id] = ...;
    });
    return state;
  }, [chapters]);

  const [chapterReality, setChapterReality] = useState<Record<string, ...>>(initialRealityState);
  ```
- **Root Cause**: `useState(initialRealityState)` only evaluates its initial state argument on initial mount. When the hook mounts while `chapters` is still loading (`chapters = []`), `chapterReality` initializes to `{}`. When chapters load asynchronously, `initialRealityState` recomputes, but `useState` does not update `chapterReality`.
- **Impact**: When the user proceeds through the onboarding interview and clicks finish, `chapterReality` is completely empty (`{}`). `completeMentorInterview` receives an empty updates object and **silently loses all user diagnostic input**.

---

### Bug 8: Sequential Blocking Firestore Network Roundtrips
- **Location**: `src/actions/StudyBrainActions.ts:1774-1825` & `src/features/mockTests/components/UploadPDFModal.tsx:126-152`
- **Severity**: **MEDIUM**
- **Code Reference**:
  ```ts
  // StudyBrainActions.ts:1774-1779
  for (const c of updatedChapters) {
    if (realityUpdates[c.id] !== undefined) {
      await ChapterRepository.saveChapter(this.userId, c);
    }
  }
  ```
- **Root Cause**: Updates up to 56 chapters sequentially using `for-of` and `await ChapterRepository.saveChapter(...)` instead of a Firestore `writeBatch`.
- **Impact**: Generates 56 sequential network roundtrips taking 8–20+ seconds over slow connections, freezing the UI and risking partial failure without transactional atomicity.

---

### Bug 9: Three Conflicting Formulas for Chapter Completion Percentage
- **Location**:
  1. `src/components/shared/ChapterEditModal.tsx:247-252`: `(currentLectures/totalLectures)*40 + (theory?20:0) + (dpp?20:0) + (pyqs?20:0)` (40/20/20/20)
  2. `src/actions/StudyBrainActions.ts:770-776`: `(tasksCompleted / 4) * 100` (25/25/25/25)
  3. `src/utils/academicState.ts:111-118`: `(lectures)*35 + (dpp)*20 + (module)*15 + (pyqs)*20 + (retention)*10` (35/20/15/20/10)
- **Severity**: **MEDIUM**
- **Impact**: A chapter's completion percentage fluctuates inconsistently depending on whether it was saved from the modal, updated via action, or normalized in the runtime.

---

### Bug 10: Dual Conflicting Revision Engines Running Simultaneously
- **Location**: `src/runtime/StudyBrainRuntime.ts:14, 424, 828`
- **Severity**: **MEDIUM**
- **Code Reference**:
  - Line 424: `revisionTelemetry = this.revisionEngine.generateRevisionTelemetry(...)` (calls `@jee-os/engines` `RevisionEngine`)
  - Line 828: `revisionQueue = StudyBrainService.getRevisionQueue(...)` (calls `src/services/revisionEngineService.ts`)
- **Impact**: The Dashboard displays due revision cards from `RevisionEngineService`, whereas the Revision Hub and Analytics pages display cards from `@jee-os/engines` `RevisionEngine`. The two pages show conflicting counts and differing lists of overdue chapters.

---

## 3. Dead Code & Orphaned Architecture Catalog

| File & Line Number | Dead Element | Explanation & Root Cause |
|---|---|---|
| `src/context/StudyBrainContext.tsx:120-126` | `StudyBrainContext` React Context | Defined and initialized via `createContext(null)`, but never exported or consumed by `useContext`. |
| `src/services/knowledgeGraphService.ts:1-124` | `KnowledgeGraphService` | Entire 124-line service is never imported or used anywhere in the codebase. |
| `src/services/studyBrainService.ts:362-425` | `StudyBrainService.getTodayMission` | Dead function with hardcoded `targetYear: '2025'` and `remainingDaysUntilJEE: 100`. |
| `src/services/studyBrainService.ts:427-479` | `StudyBrainService.getCompletionPrediction` | Dead function with hardcoded `targetYear: '2025'` and `remainingDaysUntilJEE: 100`. |
| `src/services/studyBrainService.ts:482-504` | `getAnalyticsSnapshot`, `getCoachAnalysis` | Dead helper methods never imported or invoked. |
| `src/services/revisionEngineService.ts:325-360` | `mergeMissionsWithRevisions` | Dead helper function bypassed by runtime planner. |
| `src/actions/StudyBrainActions.ts:770-777, 1285-1292` | Completion Math in `updateChapter` | Calculates `merged.completion = (tasksCompleted/4)*100`, which is immediately clobbered and overwritten by `normalizeChapter(merged)`. |
| `src/actions/StudyBrainActions.ts:1627-1636` | `addTodayMission`, `clearTodayMissions` | Dead actions completely bypassed by runtime planner. |
| `src/repositories/noteRepository.ts:1-40` | `NoteRepository` | Repository exists and `StudyBrainContext` listens to `notes` subcollection, but zero actions exist in `StudyBrainActions` to create/edit/delete notes. |

---

## 4. Security & Persistence Vulnerabilities

### Vuln 1: Firestore 1MB Document Quota Crash via Base64 Diagram Upload
- **Location**: `src/features/mistakes/components/LogMistakeModal.tsx:49-62, 100-101` & `src/repositories/mistakeRepository.ts:16-17`
- **Severity**: **CRITICAL**
- **Description**: `LogMistakeModal` permits users to upload diagrams up to 3MB (`file.size > 3 * 1024 * 1024`), encoding them directly as Base64 Data URLs inside `wrongSolutionImage` and `correctSolutionImage`.
- **Attack / Failure Vector**: When `MistakeRepository.saveMistake` executes `setDoc`, Firestore rejects any document exceeding **1,048,576 bytes** (`FirebaseError: Document exceeds maximum size limit`). The mistake cannot be saved, triggering permanent sync errors. Downloading multi-megabyte base64 documents inside snapshot listeners also causes severe browser memory leaks on mobile devices.

---

### Vuln 2: Firestore Nested 2D Array Object Conversion Corruption
- **Location**: `src/utils/firestoreSanitizer.ts:8-19`
- **Severity**: **HIGH**
- **Description**:
  ```ts
  if (Array.isArray(val)) {
    if (val.some(item => Array.isArray(item))) {
      const obj: Record<string, any> = {};
      val.forEach((item, index) => {
        obj[index.toString()] = sanitizeForFirestore(item);
      });
      acc[key] = obj;
    }
  }
  ```
- **Root Cause**: Converts nested arrays into plain indexed objects `{ '0': item0, '1': item1 }`. When read back from Firestore, properties expected to be arrays are plain JavaScript objects, causing immediate runtime crashes when `.map()`, `.filter()`, or `.length` are called.

---

### Vuln 3: AI Coach Chat LocalStorage Quota Overflow Crash
- **Location**: `src/features/coach/AiCoachPage.tsx:149, 186` & `src/features/coach/CoachHistoryPage.tsx:37`
- **Severity**: **HIGH**
- **Description**: Serializes up to 30 multi-turn AI Coach chat sessions into `localStorage.setItem('jeeos_chats', ...)`.
- **Root Cause**: `localStorage` has a strict origin quota of ~5MB. Long markdown AI coaching responses easily exceed 5MB. When `localStorage.setItem` throws `DOMException: QuotaExceededError`, the error is caught with only `console.warn`, silently failing to save subsequent user study conversations.
- **Remediation**: Transition chat storage to IndexedDB (`src/utils/idb.ts`).

---

### Vuln 4: Indiscriminate `localStorage.clear()` on Logout Wiping Unrelated Origin Data
- **Location**: `src/App.tsx:189`, `src/features/auth/AuthContext.tsx:156`, `src/features/settings/SettingsPage.tsx:303`
- **Severity**: **HIGH**
- **Description**: Calls `localStorage.clear()`, which nukes the entire browser origin storage.
- **Impact**: Permanently deletes un-synced offline mock tests stored under `'jeeos_offline_mocks'`, as well as any other origin keys, rather than selectively removing session-specific keys.

---

### Vuln 5: Auth Link Trapping on Pre-existing Google Account
- **Location**: `src/features/auth/AuthContext.tsx:84-88`
- **Severity**: **HIGH**
- **Description**:
  ```ts
  if (user && user.isAnonymous) {
    await linkWithPopup(user, googleProvider);
  }
  ```
- **Failure Vector**: If an anonymous user attempts to link with a Google account that has previously logged in, Firebase throws `auth/credential-already-in-use`. The user is trapped in anonymous mode with no automatic re-authentication or data migration flow.

---

### Vuln 6: GDPR & Data Leakage on Account Deletion
- **Location**: `src/features/auth/AuthContext.tsx:166-180`
- **Severity**: **MEDIUM**
- **Description**: `deleteAccount` calls `firebaseDeleteUser(currentUser)` but does **NOT** delete the user's Firestore document or subcollections (`chapters`, `mistakes`, `studySessions`, `mockResults`).
- **Impact**: Leaves orphaned personal study data, mistakes, and notes permanently stored in Firestore.

---

### Vuln 7: Unprotected Global Firestore Collection (`pyq_bank`) Seeding Race
- **Location**: `src/firebase/QuestionRepository.ts:80-89` & `src/features/mission/components/QuestionViewerWidget.tsx:39`
- **Severity**: **MEDIUM**
- **Description**: When any client mounts `QuestionViewerWidget`, it calls `QuestionRepository.seedInitialDatabase(...)`, checking `getDocs(collection(db, 'pyq_bank'))` and writing hundreds of questions if empty.
- **Impact**: Multiple concurrent new users race to populate the global collection simultaneously, resulting in duplicate batch writes and potential security rule violations.

---

### Vuln 8: Client-Side "Fake Encryption" for Secret API Keys
- **Location**: `src/utils/crypto.ts:7-24` & `src/features/mockTests/components/UploadPDFModal.tsx:39`
- **Severity**: **LOW**
- **Description**: `encodeSecret` uses `btoa(encodeURIComponent(text))` which is basic base64 encoding, not encryption. Any malicious script or browser extension with access to localStorage can instantly decode the Gemini API key with `atob()`.

---

### Vuln 9: Missing Backend Endpoint for AI Practice Generation
- **Location**: `src/lib/PyqGeneratorEngine.ts:102`
- **Severity**: **MEDIUM**
- **Description**: `fetch('/api/practice/generate', ...)` targets a non-existent backend API route in a purely static client-side React SPA.

---

## 5. Predicted Failure Points

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                PREDICTED FAILURE POINTS                                │
├──────────────────────────┬─────────────────────────────────────────────────────────────┤
│ Scenario                 │ Immediate Failure Mechanism & User Impact                   │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 1. Corrupted Firestore   │ validateAndSanitizeChapters throws uncaught error inside    │
│    Data Payload          │ snapshot listener. loadedFlags.chapters remains false. App  │
│                          │ freezes permanently on "SYNCING WORKSPACE..." splash screen.│
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 2. Base64 Diagram Upload │ User uploads a 2.5MB diagram in LogMistakeModal. Firestore  │
│    in Mistake Log        │ throws Document exceeds 1MB limit. Mistake is never saved,  │
│                          │ action rejects with persistent sync error banner.           │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 3. Multi-Turn AI Coach   │ Multi-turn chat exceeds 5MB localStorage quota. Browser     │
│    Usage (>30 sessions)  │ throws QuotaExceededError. Subsequent chat histories and   │
│                          │ strategic study plans are silently dropped.                 │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 4. Simultaneous Mission  │ useMissionState and CockpitPage both dispatch session saves │
│    Completion in Cockpit │ for the same event. Generates 2 duplicate Firestore records,│
│                          │ doubling recorded study hours and inflating user stats.     │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 5. User Account Switch   │ StudyBrainRuntime.resetToInitialState() does not clear      │
│    Without Page Reload   │ prevMemoState. User B sees User A's cached recommendations, │
│                          │ syllabus graphs, and analytics summary.                     │
└──────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 6. Recommended Remediation Roadmap

### Priority 1: High-Impact Stability Fixes
1. **Fix `StudyBrainContext.tsx` Error Handling**:
   - In snapshot catch blocks, set `loadedFlags[key] = true` and dispatch an explicit `runtime.setInitializationError(...)` to allow graceful degradation rather than an infinite loading freeze.
2. **Eliminate Duplicate Study Session Creation**:
   - Remove `actions.completeStudySession` call from `CockpitPage.tsx:70-84` since `actions.completeTask` already saves the `StudySession`.
3. **Fix Timeline Subcollection Path**:
   - Align `StudyBrainContext.tsx:383` and `TimelineRepository.ts` to use `customTimelineBlocks`.
4. **Fix Singleton Runtime User Switch Leakage**:
   - In `StudyBrainRuntime.resetToInitialState()`, explicitly reset `this.prevMemoState = null`, `this.knowledgeEngine = null`, and clear all engine caches.
5. **Fix Onboarding Stale Closure**:
   - In `useMentorInterviewForm.ts`, add a `useEffect` that synchronizes `chapterReality` when `chapters` change if `chapterReality` is empty.

### Priority 2: Security & Persistence Hardening
1. **Enforce 500KB Max Image Size for Mistake Uploads**:
   - Reduce file size limit in `LogMistakeModal.tsx` to 400KB and compress images client-side via canvas before Base64 conversion to guarantee documents stay well below Firestore's 1MB limit.
2. **Migrate AI Coach Chats to IndexedDB**:
   - Replace `localStorage` calls in `AiCoachPage.tsx` and `CoachHistoryPage.tsx` with `idbSet` / `idbGet` from `src/utils/idb.ts`.
3. **Use Batch Writes for Multi-Chapter Operations**:
   - Replace sequential loops in `completeMentorInterview` with `writeBatch(db)`.
4. **Unify Completion Percentage Calculation**:
   - Adopt `academicState.ts:getAcademicState` as the single source of truth across all modals and actions.
