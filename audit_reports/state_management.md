# State Management, Data Flow, Persistence & Runtime Synchronization Audit Report

**Application**: JEE-OS (Mission Control & Intelligent Study Operating System)  
**Target Scope**: `src/context/`, `src/actions/`, `src/store/`, `src/runtime/`, `src/repositories/`, `src/services/`, `src/features/`, `src/utils/`  
**Audit Specialist**: Worker 2 (State Management & Persistence Specialist)  
**Date**: August 2026  
**Status**: Authoritative Read-Only Production Audit  

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [State Architecture & Data Flow Overview](#1-state-architecture--data-flow-overview)
   - [2.1 Architectural Topology](#21-architectural-topology)
   - [2.2 Core State Pillars](#22-core-state-pillars)
   - [2.3 Data Flow & Synchronization Lifecycle](#23-data-flow--synchronization-lifecycle)
3. [Comprehensive Bugs Catalog](#2-comprehensive-bugs-catalog)
   - [Bug 1: Silent Infinite Loading Freeze on Document Parse Failure](#bug-1-silent-infinite-loading-freeze-on-document-parse-failure)
   - [Bug 2: Duplicate Study Session & Double XP Creation on Cockpit Mission Completion](#bug-2-duplicate-study-session--double-xp-creation-on-cockpit-mission-completion)
   - [Bug 3: Subcollection Naming Desync in Timeline Blocks](#bug-3-subcollection-naming-desync-in-timeline-blocks)
   - [Bug 4: Singleton Runtime State Leakage & Memoization Poisoning on User Logout/Switch](#bug-4-singleton-runtime-state-leakage--memoization-poisoning-on-user-logoutswitch)
   - [Bug 5: Concurrent Unmerged `updateUserProfile` Invocations in `completeTask`](#bug-5-concurrent-unmerged-updateuserprofile-invocations-in-completetask)
   - [Bug 6: Direct In-Place State Mutations Bypassing Subscriber Notification](#bug-6-direct-in-place-state-mutations-bypassing-subscriber-notification)
   - [Bug 7: Stale Closure Discarding Reality Audit Diagnostic Data on Onboarding](#bug-7-stale-closure-discarding-reality-audit-diagnostic-data-on-onboarding)
   - [Bug 8: Sequential Blocking Firestore Network Roundtrips in Multi-Chapter Operations](#bug-8-sequential-blocking-firestore-network-roundtrips-in-multi-chapter-operations)
   - [Bug 9: Three Conflicting Formulas for Chapter Completion Percentage](#bug-9-three-conflicting-formulas-for-chapter-completion-percentage)
   - [Bug 10: Dual Conflicting Revision Engines Running Simultaneously](#bug-10-dual-conflicting-revision-engines-running-simultaneously)
4. [Dead Code & Orphaned Architecture Catalog](#3-dead-code--orphaned-architecture-catalog)
   - [3.1 Orphaned React Context (`StudyBrainContext`)](#31-orphaned-react-context-studybraincontext)
   - [3.2 Dead Knowledge Graph Service (`knowledgeGraphService.ts`)](#32-dead-knowledge-graph-service-knowledgegraphservicets)
   - [3.3 Dead Analytical Functions in `StudyBrainService`](#33-dead-analytical-functions-in-studybrainservice)
   - [3.4 Dead Mission-Revision Merger in `revisionEngineService.ts`](#34-dead-mission-revision-merger-in-revisionengineservicets)
   - [3.5 Dead Overwritten Completion Math in `StudyBrainActions`](#35-dead-overwritten-completion-math-in-studybrainactions)
   - [3.6 Dead Mission Manipulation Actions](#36-dead-mission-manipulation-actions)
   - [3.7 Abandoned State Slice & Repository (`NoteRepository`)](#37-abandoned-state-slice--repository-noterepository)
5. [Illicit / Poor Logic Catalog](#4-illicit--poor-logic-catalog)
   - [4.1 Direct Mutation Anti-Patterns](#41-direct-mutation-anti-patterns)
   - [4.2 Race Conditions in Debounced Refresh Queue](#42-race-conditions-in-debounced-refresh-queue)
   - [4.3 Competing State Sources & Source-of-Truth Ambiguity](#43-competing-state-sources--source-of-truth-ambiguity)
   - [4.4 Firestore Nested 2D Array Object Conversion Corruption](#44-firestore-nested-2d-array-object-conversion-corruption)
   - [4.5 Indiscriminate `localStorage.clear()` Wiping Unrelated Origin Keys](#45-indiscriminate-localstorageclear-wiping-unrelated-origin-keys)
6. [Predicted Failure Points](#5-predicted-failure-points)
   - [5.1 LocalStorage Quota 5MB Overflow from AI Chat History](#51-localstorage-quota-5mb-overflow-from-ai-chat-history)
   - [5.2 Rapid Concurrent Dispatches Causing State Desynchronization](#52-rapid-concurrent-dispatches-causing-state-desynchronization)
   - [5.3 Offline Sync Collisions and Data Loss via Logout Wipes](#53-offline-sync-collisions-and-data-loss-via-logout-wipes)
   - [5.4 Schema Evolution Breakages and Deserialization Failures](#54-schema-evolution-breakages-and-deserialization-failures)
   - [5.5 Firestore 1MB Document Limit Breach via Base64 Diagram Uploads](#55-firestore-1mb-document-limit-breach-via-base64-diagram-uploads)
7. [Comprehensive Remediation Roadmap](#6-comprehensive-remediation-roadmap)

---

## Executive Summary

State management in JEE-OS represents a hybrid architecture comprising a **Firestore Real-time Synchronization Layer**, a **Singleton State & Engine Coordinator Runtime (`StudyBrainRuntime`)**, a **Zustand UI Binding Store (`useStudyBrainStore`)**, an **Imperative Action Dispatcher (`StudyBrainActions`)**, and **8 Analytical Subsystems**. 

While the system successfully decouples heavy mathematical syllabus calculations from React render trees, the current implementation suffers from severe synchronization vulnerabilities, memory leaks across user sessions, silent failure modes during data validation, competing completion formulas, and race conditions during concurrent dispatches.

Key findings include:
- **1 Critical Infinite Loading Bug**: A malformed Firestore document in any collection halts the synchronization barrier permanently without surfacing error state to the UI.
- **1 Critical Data Duplication Bug**: Cockpit mission completion dispatches duplicate sessions, doubling user focus hours, inflating analytics, and awarding double XP.
- **1 Critical Subcollection Path Desync**: Timeline block writes target `customTimelineBlocks` while the snapshot listener subscribes to `timelineBlocks`.
- **7 Orphaned / Dead Code Slices**: Entire services, orphaned context types, and dead action handlers remain compiled into the client bundle without being consumed.
- **5 High-Risk Predicted Failure Points**: Document size limit crashes (Base64 uploads exceeding 1MB), origin storage quota exhaustion (5MB `localStorage` AI history), and auth linking trapping.

---

## 1. State Architecture & Data Flow Overview

### 2.1 Architectural Topology

The following diagram illustrates the exact data flow topology connecting Firebase Firestore, the Provider mount point, the Singleton Runtime, Analytical Engines, the Zustand store, and React components.

```
                              ┌─────────────────────────────────────────────────────────┐
                              │                    Firebase Firestore                   │
                              │ ┌──────────────────┬─────────────────┬────────────────┐ │
                              │ │  users/{uid}     │  chapters subcol│  mistakes col  │ │
                              │ │  studySessions   │  mockResults    │  customMocks   │ │
                              │ └──────────────────┴─────────────────┴────────────────┘ │
                              └────────────────────────────┬────────────────────────────┘
                                                           │ (9 Real-Time onSnapshot Listeners)
                                                           ▼
                              ┌─────────────────────────────────────────────────────────┐
                              │                   StudyBrainProvider                    │
                              │           (`src/context/StudyBrainContext.tsx`)          │
                              │  - Validates schemas (validateAndSanitizeChapters, etc.)│
                              │  - Gathers 9 loadedFlags before initializing runtime    │
                              │  - Renders `<>{children}</>` directly (Context unused)  │
                              └──────────────┬───────────────────────────▲──────────────┘
                                             │ runtime.initialize()      │
                                             │ runtime.updateStateOpt()  │
                                             ▼                           │
┌──────────────────────────┐  ┌──────────────────────────────┐          │
│     React UI Feature     │  │      StudyBrainRuntime        │          │
│    Pages, Views, Modals  │  │  (`src/runtime/StudyBrain...`)│          │
│ (Dashboard, Planner, etc)│  │  - Singleton State Machine    │          │
└────────────┬─────────────┘  │  - Debounced Engine Executor  │          │
             │                │  - Reference Cache (prevMemo) │          │
             │                └──────────────┬───────────────┘          │
             │                               │                          │
             │ Actions Invocation            ▼                          │
             ▼                ┌──────────────────────────────┐          │
┌──────────────────────────┐  │     8 Analytical Engines     │          │
│    StudyBrainActions     │  │  - ChapterInfoEngine         │          │
│ (`src/actions/Study...`) │  │  - RevisionEngine            │          │
│ - Optimistic dispatch    │  │  - KnowledgeEngine           │          │
│ - Repository persistence ├─▶│  - PlannerEngine             │          │
│ - Rollback on failure    │  │  - OptimizationEngine        │          │
└──────────────────────────┘  │  - AnalyticsEngine           │          │
                              │  - CoachEngine               │          │
                              │  - MockScoringEngine         │          │
                              └──────────────┬───────────────┘          │
                                             │ Derived State Computed   │
                                             ▼                          │
                              ┌──────────────────────────────┐          │
                              │    useStudyBrainStore        │          │
                              │  (`src/store/useStudy...`)   │          │
                              │  - Zustand Global Selector   │──────────┘
                              │  - Notifies React Components │
                              └──────────────────────────────┘
```

### 2.2 Core State Pillars

1. **`StudyBrainProvider` (`src/context/StudyBrainContext.tsx`)**:
   - Acts as a lifecycle harness mounting 9 Firestore `onSnapshot` listeners upon authenticated login (`profile`, `chapters`, `notes`, `mistakes`, `studySessions`, `mocks`, `customMockTests`, `timelineBlocks`, `customMissions`).
   - Maintains an in-memory `loadedFlags` map. Once all 9 collections return initial snapshots, it triggers `runtime.initialize()`.
   - Subscribes to offline mock syncing from `localStorage` (`'jeeos_offline_mocks'`).
   - Contains an unused `StudyBrainContext` React Context definition that is never exported or consumed.

2. **`StudyBrainRuntime` (`src/runtime/StudyBrainRuntime.ts`)**:
   - Implements a singleton coordinator holding the master `StudyBrainState` (encompassing 70 chapters, study sessions, mistakes, mocks, custom missions, timeline blocks, user settings, and analytics).
   - Coordinates execution across 8 analytical engines (`ChapterInfoEngine`, `RevisionEngine`, `KnowledgeEngine`, `PlannerEngine`, `OptimizationEngine`, `AnalyticsEngine`, `CoachEngine`, `MockScoringEngine`).
   - Implements a debounced refresh queue (`processDebouncedRefresh()`) to coalesce rapid Firestore snapshots and action dispatches.
   - Utilizes `this.prevMemoState` to perform selective cache invalidation, recomputing only engines affected by changed state slices.

3. **`StudyBrainActions` (`src/actions/StudyBrainActions.ts`)**:
   - 2,253-line action coordinator containing business logic for task completion, XP leveling, streak evaluations, chapter progress updates, mock logging, and mentor onboarding.
   - Employs an optimistic UI pattern: updates in-memory runtime state immediately, dispatches asynchronous writes to Firestore repositories, and executes state rollbacks if persistence calls fail.

4. **`useStudyBrainStore` (`src/store/useStudyBrainStore.ts`)**:
   - Zustand store wrapping `StudyBrainRuntime`.
   - Listens to runtime state transitions via `runtime.subscribe()` and triggers granular component re-renders across the React tree.

5. **Persistence Repositories (`src/repositories/`)**:
   - Encapsulates Firestore CRUD operations (`UserRepository`, `ChapterRepository`, `MistakeRepository`, `StudySessionRepository`, `MockResultRepository`, `MockTestRepository`, `TimelineRepository`, `NoteRepository`).
   - Sanitizes data payloads via `src/utils/firestoreSanitizer.ts`.

---

## 2. Comprehensive Bugs Catalog

### Bug 1: Silent Infinite Loading Freeze on Document Parse Failure
- **Location**: `src/context/StudyBrainContext.tsx:19-32, 80-90, 298-310, 327-338`
- **Severity**: **CRITICAL**
- **Impact**: Permanent application freeze on the loading splash screen (`"SYNCING WORKSPACE..."`) with zero visual feedback or error recovery options.
- **Code Reference**:
  ```ts
  // src/context/StudyBrainContext.tsx:19-32
  const validateAndSanitizeChapters = (chaps: any[]): Chapter[] => {
    if (!Array.isArray(chaps)) {
      throw new Error("Chapters database corruption: Chapters data is not an array");
    }
    return chaps.map((c, index) => {
      if (!c || typeof c !== 'object') {
        throw new Error(`Chapters database corruption: Chapter entry at index ${index} is invalid`);
      }
      if (!c.id || typeof c.id !== 'string') {
        throw new Error(`Chapters database corruption: Chapter entry at index ${index} is missing a valid string ID`);
      }
      if (!c.name || typeof c.name !== 'string') {
        throw new Error(`Chapters database corruption: Chapter with ID '${c.id}' has an invalid or missing name`);
      }
      ...
    });
  };

  // src/context/StudyBrainContext.tsx:298-310
  const unsubChapters = onSnapshot(collection(db, 'users', currentUid, 'chapters'), (snap) => {
    if (!active) return;
    try {
      snapshotState.chapters = validateAndSanitizeChapters(snap.docs.map(d => d.data()));
      loadedFlags.chapters = true;
      checkAndInit();
    } catch (e) {
      console.error("Error processing chapters snapshot:", e);
    }
  }, (error) => {
    console.error("chapters snapshot error:", error);
  });
  ```
- **Root Cause & Logic Chain**:
  1. `validateAndSanitizeChapters` throws a hard JavaScript `Error` if any single chapter document in Firestore is missing an `id` or `name` string (e.g. from an interrupted partial write, bad import, or manual Firestore edit).
  2. Inside `unsubChapters`, the `try/catch` block catches the error and logs it to `console.error`.
  3. Because an exception was thrown before reaching line 303, `loadedFlags.chapters` remains `false`.
  4. In `checkAndInit()`, `const allLoaded = Object.values(loadedFlags).every(Boolean);` evaluates to `false`.
  5. `runtime.initialize()` is never invoked. The initial runtime state has `loading: true` and `initializationError: null`.
  6. The UI remains perpetually trapped in `PageSkeleton` / loading screen with no error boundary trigger.

---

### Bug 2: Duplicate Study Session & Double XP Creation on Cockpit Mission Completion
- **Location**: `src/features/mission/hooks/useMissionState.ts:604-612` & `src/features/mission/CockpitPage.tsx:70-84` & `src/actions/StudyBrainActions.ts:538-554, 948-1025`
- **Severity**: **CRITICAL**
- **Impact**: Every cockpit mission completion creates **two duplicate study sessions** in Firestore, doubling recorded study time, distorting daily focus metrics in analytics, and granting double XP.
- **Code Reference**:
  ```ts
  // src/features/mission/hooks/useMissionState.ts:604-612
  const handleMissionComplete = async (data?: any) => {
    if (activeSubjectMission?.id) {
      // FIRST DISPATCH: Invokes completeTask
      await actions.completeTask(activeSubjectMission.id, data?.duration ?? Math.max(60, seconds));
    }
    if (onComplete) {
      onComplete({
        missionId: activeSubjectMission?.id,
        duration: data?.duration ?? Math.max(60, seconds),
        ...
      });
    }
  };

  // src/actions/StudyBrainActions.ts:538-554 (inside completeTask)
  if (isCompleting && studySessionDuration > 0 && mission.type !== 'Break') {
    const sessionId = `session-${Date.now()}`;
    updatedMission.linkedSessionId = sessionId;
    const sessionPayload: StudySession = {
      id: sessionId,
      duration: studySessionDuration,
      type: mission.type === 'Solve Mock' ? 'Mock' : ...,
      subjectId: mission.subject as SubjectId,
      chapterId: chapter?.id,
      xpEarned: deltaXp
    };
    savePromises.push(this.safeDbCall(() => StudySessionRepository.saveStudySession(this.userId, sessionPayload), 'saveStudySession'));
    this.state.studySessions = [sessionPayload, ...this.state.studySessions];
  }

  // src/features/mission/CockpitPage.tsx:70-84
  onComplete={(stats) => {
    const durationMinutes = Math.max(1, Math.ceil(stats.duration / 60));
    // SECOND DISPATCH: Invokes completeStudySession for the exact same event!
    actions.completeStudySession({
      duration: durationMinutes,
      focusTime: durationMinutes,
      questions: stats.questions,
      correct: stats.correct ?? stats.questions,
      type: 'Practice',
      subjectId: activeSubject as any,
      idleTime: stats.idleTime ? Math.ceil(stats.idleTime / 60) : 0,
      focusInterruptions: stats.focusInterruptions,
      focusScore: stats.focusScore
    });
    navigate('/dashboard');
  }}
  ```
- **Root Cause & Logic Chain**:
  1. `handleMissionComplete` calls `actions.completeTask()`, which creates and saves a `StudySession` (`sessionId = session-${Date.now()}`) and updates XP in user profile.
  2. `handleMissionComplete` immediately invokes the caller's `onComplete` prop callback.
  3. In `CockpitPage.tsx`, `onComplete` receives `stats` and calls `actions.completeStudySession()`.
  4. `actions.completeStudySession()` constructs a *second* `StudySession` with `id: Date.now().toString()`, saves it to Firestore via `StudySessionRepository.saveStudySession()`, and awards XP a *second time* via `UserRepository.updateUserProfile()`.

---

### Bug 3: Subcollection Naming Desync in Timeline Blocks
- **Location**: `src/context/StudyBrainContext.tsx:383` vs `src/repositories/timelineRepository.ts:9, 16, 22, 33`
- **Severity**: **HIGH**
- **Impact**: Timeline blocks created by users are saved to Firestore but are never delivered to the UI listener. Real-time timeline sync is completely broken.
- **Code Reference**:
  ```ts
  // src/context/StudyBrainContext.tsx:383
  const unsubTimeline = onSnapshot(collection(db, 'users', currentUid, 'timelineBlocks'), (snap) => {
    if (!active) return;
    try {
      snapshotState.timeline = snap.docs.map(d => d.data());
      loadedFlags.timeline = true;
      checkAndInit();
    } catch (e) { ... }
  });

  // src/repositories/timelineRepository.ts:8-18
  export const TimelineRepository = {
    async getCustomTimelineBlocks(userId: string): Promise<TimelineBlock[]> {
      const blocksCol = collection(db, 'users', userId, 'customTimelineBlocks');
      const snapshot = await getDocs(blocksCol);
      return snapshot.docs.map(doc => doc.data() as TimelineBlock);
    },

    async saveTimelineBlock(userId: string, block: TimelineBlock): Promise<void> {
      const blockDoc = doc(db, 'users', userId, 'customTimelineBlocks', block.id);
      await setDoc(blockDoc, sanitizeForFirestore(block));
    }
  };
  ```
- **Root Cause**: `TimelineRepository` writes and reads from subcollection path `users/{userId}/customTimelineBlocks`, but `StudyBrainContext.tsx` sets up its real-time `onSnapshot` listener on `users/{userId}/timelineBlocks`. The snapshot listener never receives documents created through `TimelineRepository`.

---

### Bug 4: Singleton Runtime State Leakage & Memoization Poisoning on User Logout/Switch
- **Location**: `src/runtime/StudyBrainRuntime.ts:141-150, 257-262, 373-399`
- **Severity**: **HIGH**
- **Impact**: In a multi-user or shared browser scenario, logging out User A and logging in User B without a hard page reload causes User B to see User A's cached engine outputs, recommendations, and syllabus graphs.
- **Code Reference**:
  ```ts
  // src/runtime/StudyBrainRuntime.ts:257-262
  public resetToInitialState() {
    this.state = this.getInitialState();
    this.state.writeBlocked = true;
    this.state.loading = false;
    this.notifySubscribers();
  }

  // src/runtime/StudyBrainRuntime.ts:383-399 (in executeRefresh)
  const stateChanged = {
    chapters: currentState.chapters !== this.prevMemoState.chapters,
    mistakes: currentState.mistakes !== this.prevMemoState.mistakes,
    sessions: currentState.studySessions !== this.prevMemoState.sessions,
    mocks: currentState.mocks !== this.prevMemoState.mocks,
    settings: settingsChangedForPlanner,
    timeline: currentState.timeline !== this.prevMemoState.timeline,
  };
  ```
- **Root Cause & Logic Chain**:
  1. `resetToInitialState()` resets `this.state` to default empty values, but **fails to reset `this.prevMemoState`**, `this.knowledgeEngine`, `this.analyticsEngine`, `this.coachEngine`, or `this.totalEngineRuntimeMs`.
  2. When User B logs in, Firestore snapshot listeners populate `snapshotState` and invoke `runtime.initialize(snapshotState)`.
  3. Inside `executeRefresh()`, `currentState.chapters` (User B's chapters) is compared against `this.prevMemoState.chapters` (User A's chapters from before logout).
  4. If User B has an identical chapter list structure, delta checks fail to flag changes, or cached analytical engine instances retain internal states belonging to User A.

---

### Bug 5: Concurrent Unmerged `updateUserProfile` Invocations in `completeTask`
- **Location**: `src/actions/StudyBrainActions.ts:501, 527, 530, 587`
- **Severity**: **HIGH**
- **Impact**: Concurrent non-atomic `setDoc({ merge: true })` writes race against each other on the user document, resulting in lost XP updates or lost `completedPlannerMissionIds`.
- **Code Reference**:
  ```ts
  // src/actions/StudyBrainActions.ts:500-532
  const savePromises: Promise<any>[] = [
    this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, { xp: newXp }), 'updateUserProfile')
  ];
  ...
  if (isCompleting) {
    updatedCompletedPlannerMissionIds = Array.from(new Set([...updatedCompletedPlannerMissionIds, taskId]));
    savePromises.push(this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, { 
      completedPlannerMissionIds: updatedCompletedPlannerMissionIds 
    }), 'updateUserProfile'));
  }

  // Line 587:
  await Promise.all(savePromises);
  ```
- **Root Cause**: `completeTask` pushes two independent `UserRepository.updateUserProfile(this.userId, ...)` promises into `savePromises` and fires them in parallel with `Promise.all()`. In Firestore, concurrent `setDoc(userDocRef, payload, { merge: true })` calls on the same document are not serialized; whichever arrives last can overwrite partial document state.

---

### Bug 6: Direct In-Place State Mutations Bypassing Subscriber Notification
- **Location**: `src/actions/StudyBrainActions.ts:435-437, 556, 562, 590`
- **Severity**: **MEDIUM**
- **Impact**: In-place mutations modify state objects directly without updating Zustand store or triggering component subscriptions, resulting in stale UI renders until an unrelated action triggers a full runtime refresh.
- **Code Reference**:
  ```ts
  // src/actions/StudyBrainActions.ts:435-438
  c.status = 'Learning';
  if (this.state.chapterTelemetryMap && this.state.chapterTelemetryMap[c.id]) {
    this.state.chapterTelemetryMap[c.id].retentionConfidence = 'High';
  }

  // src/actions/StudyBrainActions.ts:556
  this.state.studySessions = [sessionPayload, ...this.state.studySessions];

  // src/actions/StudyBrainActions.ts:590 (in rollback)
  this.state.studySessions = originalStateSnapshot.studySessions;
  ```
- **Root Cause**: `this.state.studySessions` and `this.state.chapterTelemetryMap` are directly mutated on `this.state`. In `updateStateOptimistic` (lines 577-583), `studySessions` is omitted from the update payload, so subscribers are never notified of the newly created session.

---

### Bug 7: Stale Closure Discarding Reality Audit Diagnostic Data on Onboarding
- **Location**: `src/components/mentor/hooks/useMentorInterviewForm.ts:57-64, 86-90`
- **Severity**: **HIGH**
- **Impact**: If the mentor onboarding interview loads before Firestore completes chapter snapshot delivery, the entire chapter audit state evaluates to `{}` and the interview submission silently discards all student chapter statuses.
- **Code Reference**:
  ```ts
  // src/components/mentor/hooks/useMentorInterviewForm.ts:57-64
  const initialRealityState = () => {
    const map: Record<string, 'Not Started' | 'In Progress' | 'Completed'> = {};
    chapters.forEach(c => {
      map[c.id] = 'Not Started';
    });
    return map;
  };
  const [chapterReality, setChapterReality] = useState<Record<string, 'Not Started' | 'In Progress' | 'Completed'>>(initialRealityState);

  // Line 86-90 (inside handleFinishInterview):
  const chapterUpdates = Object.entries(chapterReality).map(([id, status]) => ({
    id,
    status,
    confidence: status === 'Completed' ? 85 : status === 'In Progress' ? 50 : 20
  }));
  ```
- **Root Cause**: `useState(initialRealityState)` executes only on mount. When the component mounts while `chapters = []` during initial loading, `chapterReality` initializes to `{}`. There is no `useEffect` or state synchronization when `chapters` array populates, so any un-clicked chapters are completely absent from `chapterUpdates`.

---

### Bug 8: Sequential Blocking Firestore Network Roundtrips in Multi-Chapter Operations
- **Location**: `src/actions/StudyBrainActions.ts:1774-1825`
- **Severity**: **MEDIUM**
- **Impact**: Onboarding interview completion triggers up to 56–70 sequential network requests, causing 8–20 second UI freezes over standard mobile connections and risking partial write failures without transactional atomicity.
- **Code Reference**:
  ```ts
  // src/actions/StudyBrainActions.ts:1774-1825
  if (chapterUpdates && chapterUpdates.length > 0) {
    for (const update of chapterUpdates) {
      const chap = updatedChapters.find(c => c.id === update.id);
      if (chap) {
        ...
        try {
          await ChapterRepository.saveChapter(this.userId, updatedChap);
        } catch (chapterSaveErr) {
          console.error(`[MentorInterview] Chapter save FAILED for ${update.id}:`, chapterSaveErr);
        }
        updatedChapters = updatedChapters.map(c => c.id === update.id ? updatedChap : c);
      }
    }
  }
  ```
- **Root Cause**: The method executes a sequential `for-of` loop awaiting `ChapterRepository.saveChapter()` on every iteration rather than assembling operations into a single atomic Firestore `writeBatch(db)`.

---

### Bug 9: Three Conflicting Formulas for Chapter Completion Percentage
- **Location**:
  1. `src/components/shared/ChapterEditModal.tsx:247-252`
  2. `src/actions/StudyBrainActions.ts:770-776`
  3. `src/utils/academicState.ts:111-118`
- **Severity**: **MEDIUM**
- **Impact**: A chapter's completion percentage changes inconsistently depending on whether the user edited it via modal, marked a task complete, or triggered a runtime normalization cycle.
- **Code Reference**:
  ```ts
  // Formula 1: ChapterEditModal.tsx:247-252 (40/20/20/20)
  const calculatedCompletion = Math.min(100, Math.round(
    ((currentLecture / (totalLectures || 1)) * 40) +
    (theoryComplete ? 20 : 0) +
    (dppComplete ? 20 : 0) +
    (pyqsComplete ? 20 : 0)
  ));

  // Formula 2: StudyBrainActions.ts:770-776 (25/25/25/25)
  let tasksCompleted = 0;
  if (merged.theoryComplete) tasksCompleted++;
  if (merged.dppComplete) tasksCompleted++;
  if (merged.pyqsComplete) tasksCompleted++;
  if (merged.formulaComplete) tasksCompleted++;
  merged.completion = Math.round((tasksCompleted / 4) * 100);

  // Formula 3: academicState.ts:111-118 (35/20/15/20/10)
  const theoryWeight = (compLects / totalLects) * 35;
  const dppWeight = (dppPct / 100) * 20;
  const modWeight = (modPct / 100) * 15;
  const pyqWeight = (pyqPct / 100) * 20;
  const revWeight = (retentionScore / 100) * 10;
  const calculatedCompletion = Math.min(100, Math.round(theoryWeight + dppWeight + modWeight + pyqWeight + revWeight));
  ```

---

### Bug 10: Dual Conflicting Revision Engines Running Simultaneously
- **Location**: `src/runtime/StudyBrainRuntime.ts:424, 828`
- **Severity**: **MEDIUM**
- **Impact**: The Dashboard displays overdue cards computed from `RevisionEngineService`, while the Revision Hub and Analytics views display cards computed from `@jee-os/engines` `RevisionEngine`. The two views display conflicting counts and differing prioritization orders.
- **Code Reference**:
  ```ts
  // src/runtime/StudyBrainRuntime.ts:424 (Engine 1)
  revisionTelemetry = this.revisionEngine.generateRevisionTelemetry({
    chapters: this.state.chapters,
    chapterTelemetryMap,
    sessions: this.state.studySessions,
    mistakes: this.state.mistakes
  });

  // src/runtime/StudyBrainRuntime.ts:828 (Engine 2)
  revisionQueue = StudyBrainService.getRevisionQueue(
    this.state.chapters, 
    this.state.mistakes, 
    this.state.settings.revisionSettings
  );
  ```

---

## 3. Dead Code & Orphaned Architecture Catalog

The following table and detailed subsections enumerate dead, orphaned, and unused code slices across state management and services:

| Identifier & File Location | Dead Artifact | Category | Root Cause & Description |
|---|---|---|---|
| `src/context/StudyBrainContext.tsx:120-126` | `StudyBrainContext` | Orphaned React Context | Created with `createContext<StudyBrainContextType \| null>(null)` but never exported or provided to children. |
| `src/services/knowledgeGraphService.ts:1-124` | `KnowledgeGraphService` | Dead Service | Entire 124-line service is never imported or referenced in any file in `src/`. |
| `src/services/studyBrainService.ts:362-425` | `StudyBrainService.getTodayMission` | Dead Function | Hardcoded with `targetYear: '2025'`. Bypassed in favor of `@jee-os/engines` `PlannerEngine`. |
| `src/services/studyBrainService.ts:427-479` | `StudyBrainService.getCompletionPrediction` | Dead Function | Hardcoded with `targetYear: '2025'`. Bypassed in favor of `OptimizationEngine`. |
| `src/services/studyBrainService.ts:482-492` | `StudyBrainService.getAnalyticsSnapshot` | Dead Function | Standalone wrapper never invoked anywhere in codebase. |
| `src/services/studyBrainService.ts:494-504` | `StudyBrainService.getCoachAnalysis` | Dead Function | Standalone wrapper never invoked; runtime calls `CoachEngine` directly. |
| `src/services/revisionEngineService.ts:325-360` | `mergeMissionsWithRevisions` | Dead Function | Helper method intended to merge revisions into missions; bypassed by runtime planner. |
| `src/actions/StudyBrainActions.ts:770-777` | Completion Math in `updateChapter` | Dead Code | Calculates 25% increments, immediately overwritten by `normalizeChapter(merged)`. |
| `src/actions/StudyBrainActions.ts:1627-1636` | `addTodayMission`, `clearTodayMissions` | Dead Actions | Replaced by runtime planner engine generation. |
| `src/repositories/noteRepository.ts:1-40` | `NoteRepository` | Orphaned Repository | Repository and snapshot listener exist, but zero actions exist to create/update notes. |

### 3.1 Orphaned React Context (`StudyBrainContext`)
`StudyBrainContext.tsx` declares `interface StudyBrainContextType` and executes:
```ts
const StudyBrainContext = createContext<StudyBrainContextType | null>(null);
```
At line 426, `StudyBrainProvider` renders `<>{children}</>` without wrapping children in `<StudyBrainContext.Provider>`. State is consumed entirely via Zustand (`useStudyBrainStore`), making this context object completely orphaned.

### 3.2 Dead Knowledge Graph Service (`knowledgeGraphService.ts`)
`src/services/knowledgeGraphService.ts` contains full graph traversal implementations (`getAllNodes`, `getNode`, `getSubjectNodes`, `getUnlockedNodes`, `getImmediateNextNodes`, `getTopologicalSort`, `getUnlockPath`). A codebase-wide grep confirms zero imports of `KnowledgeGraphService`.

### 3.3 Dead Analytical Functions in `StudyBrainService`
- `StudyBrainService.getTodayMission` (lines 362-425): Contains hardcoded `{ targetYear: '2025', remainingDaysUntilJEE: 100 }`. Completely superseded by `PlannerEngine` in `StudyBrainRuntime.ts`.
- `StudyBrainService.getCompletionPrediction` (lines 427-479): Superseded by `OptimizationEngine`.
- `StudyBrainService.getAnalyticsSnapshot` (lines 482-492): Never invoked.
- `StudyBrainService.getCoachAnalysis` (lines 494-504): Never invoked.

### 3.4 Dead Mission-Revision Merger in `revisionEngineService.ts`
`RevisionEngineService.mergeMissionsWithRevisions` (lines 325-360) is never called by `StudyBrainRuntime` or any view component.

### 3.5 Dead Overwritten Completion Math in `StudyBrainActions`
In `StudyBrainActions.ts:770-777` (`updateChapter`) and `StudyBrainActions.ts:1285-1292` (`updateChapterData`), `merged.completion` is computed using a 4-task formula `(tasksCompleted / 4) * 100`. Immediately on line 787, `normalizeChapter(merged)` is called, which invokes `getAcademicState(chapter)` and overwrites `completion` with the 5-part weighted formula from `academicState.ts:117`.

### 3.6 Dead Mission Manipulation Actions
`addTodayMission` (line 1627) and `clearTodayMissions` (line 1633) in `StudyBrainActions.ts` attempt to set `todayMissions` and trigger `runtime.refresh('INIT')`. During `INIT` refresh, the runtime planner executes and completely replaces `todayMissions`, rendering these action methods useless.

### 3.7 Abandoned State Slice & Repository (`NoteRepository`)
`NoteRepository.ts` provides complete CRUD methods (`getNotes`, `saveNote`, `deleteNote`, `seedNotes`) and `StudyBrainContext.tsx:313` mounts a snapshot listener for `users/{uid}/notes`. However, `StudyBrainActions.ts` contains zero methods to create, edit, or delete notes.

---

## 4. Illicit / Poor Logic Catalog

### 4.1 Direct Mutation Anti-Patterns
Multiple action handlers directly mutate state objects before updating Zustand:
- **Retention State Mutation** (`StudyBrainActions.ts:435-437`):
  ```ts
  c.status = 'Learning';
  if (this.state.chapterTelemetryMap && this.state.chapterTelemetryMap[c.id]) {
    this.state.chapterTelemetryMap[c.id].retentionConfidence = 'High';
  }
  ```
- **Study Session Array Mutation** (`StudyBrainActions.ts:556, 590`):
  ```ts
  this.state.studySessions = [sessionPayload, ...this.state.studySessions];
  ```
Mutating state objects in place breaks reference comparison in React components and bypasses Zustand selector subscriptions.

### 4.2 Race Conditions in Debounced Refresh Queue
`StudyBrainRuntime.ts:305-368` manages a debounced refresh queue:
```ts
public async refresh(reason: RefreshTriggers, optimisticData?: Partial<StudyBrainState>) {
  if (optimisticData) {
    this.updateStateOptimistic(optimisticData);
  }
  return new Promise<void>((resolve) => {
    this.pendingReasons.add(reason);
    this.pendingResolvers.push(resolve);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.processDebouncedRefresh();
    }, 0);
  });
}
```
**Race Condition Vector**:
1. When two rapid dispatches occur (e.g. `SESSION_UPDATE` followed by `CHAPTER_UPDATE`), `this.pendingReasons` contains `['SESSION_UPDATE', 'CHAPTER_UPDATE']`.
2. `mainReason` evaluates to `reasons[0]` (`'SESSION_UPDATE'`).
3. While `executeRefresh()` is executing asynchronous operations (e.g. `CoachEngine`), a third action dispatches `updateStateOptimistic()`, mutating `this.state` in place while the engine execution is reading from it.
4. Engine outputs derived from the partially-mutated state are assigned back to `this.state` at the conclusion of `executeRefresh()`, clobbering intermediate updates.

### 4.3 Competing State Sources & Source-of-Truth Ambiguity
The application exhibits 4 competing sources of truth:
1. **Firestore Real-time Snapshots**: Pushes raw document data into `snapshotState`.
2. **Runtime In-Memory State**: Computed and cached by `StudyBrainRuntime`.
3. **Zustand UI Store**: Subscribed to runtime state.
4. **LocalStorage**: Directly read and written by UI components (`jeeos_chats`, `jeeos_offline_mocks`, `gemini_api_key`, `jeeos_active_chat_session`).

When a user logs out, `localStorage.clear()` wipes all client-side cached data without coordinating with Firestore repositories or runtime state.

### 4.4 Firestore Nested 2D Array Object Conversion Corruption
`src/utils/firestoreSanitizer.ts:8-19` converts nested arrays into indexed objects:
```ts
if (Array.isArray(obj)) {
  if (inArray) {
    const arrObj: Record<string, any> = {};
    obj.forEach((item, index) => {
      const sanitized = sanitizeForFirestore(item, false);
      if (sanitized !== undefined) {
        arrObj[index.toString()] = sanitized;
      }
    });
    return arrObj;
  }
  return obj.map(item => sanitizeForFirestore(item, true));
}
```
When complex structures containing 2D arrays (such as `mentorProfile.twoDaySplitConfig: [SubjectId[], SubjectId[], SubjectId[]]`) are saved to Firestore, they are converted into plain objects `{ '0': { '0': 'physics', '1': 'chemistry' }, ... }`. When read back from Firestore, properties expected to be arrays are plain objects, causing immediate runtime crashes when `.map()` or `.includes()` is invoked.

### 4.5 Indiscriminate `localStorage.clear()` Wiping Unrelated Origin Keys
- **Locations**: `src/App.tsx:189`, `src/features/auth/AuthContext.tsx:156`, `src/features/dashboard/SettingsPage.tsx:303`
- **Issue**: Invoking `localStorage.clear()` nukes all keys for the entire browser origin, including queued offline mock tests (`'jeeos_offline_mocks'`) and user-configured Gemini API keys (`'gemini_api_key'`), rather than selectively removing session-specific keys.

---

## 5. Predicted Failure Points

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PREDICTED FAILURE POINTS MATRIX                           │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ Failure Scenario         │ Root Vulnerability       │ Impact & Failure Mechanism       │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ 1. AI Chat History       │ localStorage 5MB origin  │ QuotaExceededError crashes chat  │
│    Storage Overflow      │ quota exhaustion         │ persistence; conversation drops  │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ 2. Rapid Concurrent      │ Non-atomic debounced     │ State clobbering & out-of-order  │
│    Dispatches            │ refresh queue            │ engine derivation overwrite      │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ 3. Offline Sync Data     │ Unscoped logout          │ Offline mocks deleted before     │
│    Collisions            │ localStorage.clear()     │ sync cycle can execute           │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ 4. Schema Evolution      │ Hard throw in validation │ Permanent sync freeze on         │
│    Breakages             │ snapshot listeners       │ "SYNCING WORKSPACE..."           │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ 5. Base64 Diagram        │ Firestore 1MB document   │ Firestore rejects write; sync    │
│    Uploads (>1MB)        │ size limit breach        │ error banner blocks further work │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
```

### 5.1 LocalStorage Quota 5MB Overflow from AI Chat History
- **Location**: `src/features/coach/AiCoachPage.tsx:149, 186` & `src/features/coach/CoachHistoryPage.tsx:37`
- **Failure Mechanism**: `AiCoachPage` serializes up to 30 full multi-turn AI chat sessions into `localStorage.setItem('jeeos_chats', ...)`. Extensive Markdown responses, LaTeX formulas, and study schedules generate payloads exceeding the standard 5MB browser quota.
- **Consequence**: `localStorage.setItem` throws `DOMException: QuotaExceededError`. The exception is caught by a `console.warn` block, causing subsequent user conversations to silently fail to save.

### 5.2 Rapid Concurrent Dispatches Causing State Desynchronization
- **Location**: `src/runtime/StudyBrainRuntime.ts:305-368`
- **Failure Mechanism**: When a user rapidly marks multiple tasks complete in the Planner or Cockpit within milliseconds, multiple `refresh()` calls queue concurrently.
- **Consequence**: `processDebouncedRefresh()` merges reasons into a single trigger. Asynchronous operations within `executeRefresh()` run concurrently with subsequent optimistic state updates, causing the second refresh to evaluate against stale `prevMemoState` references and overwriting newer optimistic state with stale engine calculations.

### 5.3 Offline Sync Collisions and Data Loss via Logout Wipes
- **Location**: `src/context/StudyBrainContext.tsx:195-214` & `src/features/auth/AuthContext.tsx:156`
- **Failure Mechanism**: Offline mock tests stored in `localStorage.getItem('jeeos_offline_mocks')` are processed asynchronously upon login. If a user logs out or switches accounts before the asynchronous sync loop finishes, `AuthContext.logout()` executes `localStorage.clear()`.
- **Consequence**: All un-synced mock test results are permanently destroyed from local storage with no cloud backup.

### 5.4 Schema Evolution Breakages and Deserialization Failures
- **Location**: `src/context/StudyBrainContext.tsx:19-32` & `src/utils/firestoreSanitizer.ts:8-19`
- **Failure Mechanism**: `validateAndSanitizeChapters` strictly requires string `id` and `name` properties on all chapter objects. Furthermore, `sanitizeForFirestore` deserializes 2D arrays as objects.
- **Consequence**: If a future update introduces a new chapter format or Firestore document structure, any legacy document lacking new fields causes `validateAndSanitizeChapters` to throw an uncaught exception, permanently locking the user out of the application on the loading screen.

### 5.5 Firestore 1MB Document Limit Breach via Base64 Diagram Uploads
- **Location**: `src/features/mistakes/components/LogMistakeModal.tsx:49-62, 100-101` & `src/repositories/mistakeRepository.ts:16-17`
- **Failure Mechanism**: `LogMistakeModal` permits users to upload images up to 3MB (`file.size > 3 * 1024 * 1024`), encoding them directly as Base64 Data URLs inside `wrongSolutionImage` and `correctSolutionImage`.
- **Consequence**: When `MistakeRepository.saveMistake` executes `setDoc`, Firestore rejects documents exceeding 1,048,576 bytes (`FirebaseError: Document exceeds maximum size limit`). The action throws a sync error, blocking the user from logging the mistake.

---

## 6. Comprehensive Remediation Roadmap

### Priority 1: Critical System Stability (Immediate)
1. **Fault-Tolerant Snapshot Error Handling**:
   - In `StudyBrainContext.tsx`, ensure `loadedFlags[key] = true` is set inside snapshot `catch` blocks, and dispatch `runtime.updateStateOptimistic({ initializationError: err.message, loading: false })` to allow graceful UI degradation rather than an infinite loading lock.
2. **Eliminate Duplicate Study Session Dispatches**:
   - Remove `actions.completeStudySession` from `CockpitPage.tsx:70-84`. Rely exclusively on `actions.completeTask` inside `useMissionState.ts:606`.
3. **Synchronize Timeline Subcollection Path**:
   - Align `StudyBrainContext.tsx:383` and `TimelineRepository.ts` to use `customTimelineBlocks`.
4. **Clean Reset on User Account Switch**:
   - Update `StudyBrainRuntime.resetToInitialState()` to reset `this.prevMemoState = {}`, `this.knowledgeEngine = null`, `this.coachEngine = null`, and clear all engine caches.
5. **Fix Onboarding Stale Closure**:
   - In `useMentorInterviewForm.ts`, add a synchronization `useEffect` that updates `chapterReality` when `chapters` array populates if `chapterReality` is empty.

### Priority 2: Data Integrity & Persistence Hardening (Near-Term)
1. **Atomic Batch Writes for Multi-Chapter Operations**:
   - Replace sequential `for-of` loops in `completeMentorInterview` with Firestore `writeBatch(db)`.
2. **Merge Concurrent `updateUserProfile` Calls**:
   - In `StudyBrainActions.completeTask`, consolidate all profile property updates (`xp`, `completedPlannerMissionIds`) into a single `UserRepository.updateUserProfile` call.
3. **Unify Completion Percentage Calculation**:
   - Adopt `academicState.ts:normalizeChapter` as the single authoritative completion formula across all modals and actions. Remove duplicate 25% calculations from `StudyBrainActions.ts`.
4. **Migrate LocalStorage Caches to IndexedDB**:
   - Migrate AI Coach chat history (`jeeos_chats`) to IndexedDB (`src/utils/idb.ts`) to avoid 5MB quota exhaustion.
5. **Client-Side Image Compression for Mistake Diagrams**:
   - Restrict mistake diagram uploads to 400KB and compress images client-side before Base64 encoding.

### Priority 3: Architecture & Codebase Cleanup (Long-Term)
1. **Remove Dead Services & Functions**:
   - Delete `src/services/knowledgeGraphService.ts`.
   - Remove dead methods `getTodayMission`, `getCompletionPrediction`, `getAnalyticsSnapshot`, and `getCoachAnalysis` from `src/services/studyBrainService.ts`.
   - Remove dead `mergeMissionsWithRevisions` from `src/services/revisionEngineService.ts`.
2. **Consolidate Revision Engines**:
   - Deprecate `RevisionEngineService` and route all revision telemetry and queue calculations through `@jee-os/engines` `RevisionEngine`.
3. **Remove Orphaned `StudyBrainContext`**:
   - Clean up unused `createContext` declarations in `StudyBrainContext.tsx`.
