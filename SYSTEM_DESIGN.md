# SYSTEM_DESIGN.md — JEE OS Core Architecture & Invariant Rules Specification

> **AUTHORITY:** LEAD SYSTEMS ARCHITECT  
> **STATUS:** CANONICAL & MANDATORY (TO BE ABSOLUTELY RESPECTED AT ALL TIMES)  
> **SCOPE:** Entire JEE OS Platform (`@jee-os/engines`, `src/runtime`, `src/store`, `src/actions`, `src/features`, `src/components`)  
> **CODE POLICY:** ZERO UNAUTHORIZED CODE MUTATIONS WITHOUT MAPPING AGAINST THIS SPECIFICATION.

---

## 1. Executive Architectural Summary & The Single "Hub"

JEE OS has transitioned from a legacy monolithic React Context (`MissionEngineContext`) into a hybrid model powered by `@jee-os/engines`, a centralized in-memory singleton in [`StudyBrainRuntime.ts`](file:///d:/JEE%20OS%20PLEASE%20HELP/jee-os%20(5)/jee-os%20(10)/src/runtime/StudyBrainRuntime.ts), and a lightweight Zustand subscription wrapper in [`useStudyBrainStore.ts`](file:///d:/JEE%20OS%20PLEASE%20HELP/jee-os%20(5)/jee-os%20(10)/src/store/useStudyBrainStore.ts).

However, without a strict specification, state has fragmented across **4 distinct physical storage tiers and uncoordinated component closures**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 UI COMPONENTS                                   │
│  (Views, Dashboards, Timers, Modals, Slash Commands: /boost /plan /learn etc.) │
└───────────────────────▲───────────────────────────────────┬─────────────────────┘
                        │ Reads via Selectors               │ Dispatches Actions
                        │ (useShallow)                      │ (actions.method())
┌───────────────────────┴───────────────────────────────────▼─────────────────────┐
│                            useStudyBrainStore (Zustand)                         │
│                    Reactive UI Binding to Central Runtime                       │
└───────────────────────▲───────────────────────────────────┬─────────────────────┘
                        │ Synchronous State Event           │ Optimistic Mutation
┌───────────────────────┴───────────────────────────────────▼─────────────────────┐
│                     StudyBrainRuntime (Central In-Memory Hub)                   │
│        - Single Canonical State Record                                          │
│        - Pure Computation Engines (@jee-os/engines)                             │
│        - Rollback Snapshots on Mutation Failure                                 │
└───────────────────────▲───────────────────────────────────┬─────────────────────┘
                        │ Real-Time Listener Hydration      │ Write-Through Pipeline
┌───────────────────────┴───────────────────────────────────▼─────────────────────┐
│                              UNIFIED STORAGE ADAPTER                            │
│  ┌───────────────────────┬─────────────────────────┬─────────────────────────┐  │
│  │     Tier 1: Cloud     │     Tier 2: Offline     │     Tier 3: Session     │  │
│  │  Firestore (Canonical │  IndexedDB (Large Blobs │  SessionStorage (Route  │  │
│  │   Documents & Sub-    │   Mocks, Attempts, Full │  Transient Ephemerals,  │  │
│  │     collections)      │      AI Transcripts)    │   Nav Prompt Handoffs)  │  │
│  └───────────────────────┴─────────────────────────┴─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Data Inventory

### A. Global Stores & In-Memory Runtimes
1. **`StudyBrainRuntime` (`src/runtime/StudyBrainRuntime.ts`)**:
   - **Properties Managed:** `chapters`, `chapterTelemetryMap`, `activeEditChapterId`, `notes`, `studySessions`, `mocks`, `customMockTests`, `mistakes`, `timeline`, `xp`, `analytics`, `projectedReadiness`, `energyLevel`, `coachMessage`, `activeSubject`, `radarFocusedChapter`, `isMissionModeActive`, `mentorProfile`, `settings`, `weeklyGoals`, `knowledgeGraph`, `plannerOutput`, `optimizationResult`, `analyticsSummary`, `coachAnalysis`, `revisionTelemetry`, `revisionQueue`, `todayMissions`, `customMissions`, `weeklySchedule`, `scheduleOverrides`, `loading`, `writeBlocked`, `diagnostics`.
2. **`useStudyBrainStore` (`src/store/useStudyBrainStore.ts`)**:
   - Direct Zustand selector interface bound to `StudyBrainRuntime.getState()`.

### B. React Context Providers
1. **`StudyBrainProvider` (`src/context/StudyBrainContext.tsx`)**:
   - Manages Firestore real-time snapshot subscriptions for `users/${uid}`, `chapters`, `customTimelineBlocks`, and `customMissions`.
   - Executes initial fetches for `notes`, `mistakes`, `studySessions`, `mockResults`, and `customMockTests`.
2. **`AuthContext` (`src/features/auth/AuthContext.tsx`)**:
   - Manages authenticated Firebase user credential lifecycle.
3. **`ThemeProvider` (`src/providers/ThemeProvider.tsx`)**:
   - Manages visual UI themes ('dark' | 'light' | 'system').
4. **`ToastProvider` (`src/components/ui/ToastProvider.tsx`)**:
   - Manages ephemeral in-memory alert toasts and dismiss timers.

### C. LocalStorage Keys (Audit of Prefix Drift)
| Storage Key | Prefix Category | Usage File | Data Stored |
| :--- | :--- | :--- | :--- |
| `jeeos_theme` | Canonical (`jeeos_`) | `ThemeProvider.tsx` | Visual skin theme |
| `jeeos_offline_mocks` | Canonical (`jeeos_`) | `StudyBrainContext.tsx` | Offline mock exam sync queue |
| `jeeos_mock_results_cache` | Canonical (`jeeos_`) | `MockTestActions.ts` | Local mock summary cache |
| `jeeos_dock_pinned` | Canonical (`jeeos_`) | `FloatingDynamicDock.tsx` | Dock pinned preference |
| `jeeos_read_notifications` | Canonical (`jeeos_`) | `Topbar.tsx`, `FloatingDynamicDock.tsx` | Dismissed notification IDs |
| `jeeos_cockpit_volume` | Canonical (`jeeos_`) | `audioEngine.ts` | Sound effect volume |
| `jeeos_mission_state_${id}` | Canonical (`jeeos_`) | `useMissionState.ts`, `useDashboardState.ts` | Active mission timer snapshot |
| `jeeos_bookmarked_formulas` | Canonical (`jeeos_`) | `FormulaVaultPage.tsx` | Starred formula IDs |
| `jeeos_daily_dose_${todayKey}` | Canonical (`jeeos_`) | `DailyDoseSessionStage.tsx` | Daily spaced repetition progress |
| `jeeos_last_daily_checkin_date` | Canonical (`jeeos_`) | `DailyCheckinCard.tsx` | Date of last check-in |
| `jeeos_last_daily_checkin_dismissed` | Canonical (`jeeos_`) | `DailyCheckinCard.tsx` | Dismissal date of check-in card |
| `jeeos_chats` | Canonical (`jeeos_`) | `useChatSessions.ts` | Up to 30 full AI Coach chat logs |
| `jeeos_active_chat_session` | Canonical (`jeeos_`) | `useChatSessions.ts` | Active chat session ID |
| `jeeos_mock_theme` | Canonical (`jeeos_`) | `useExamEngine.ts` | Mock exam layout ('nta-classic') |
| `jeeos_mock_infractions_${u}_${t}` | Canonical (`jeeos_`) | `useExamEngine.ts` | Mock test tab-switch count |
| `jeeos_mock_pos_${u}_${t}` | Canonical (`jeeos_`) | `useExamEngine.ts` | Current subject and question index |
| `jeeos_mock_end_${u}_${t}` | Canonical (`jeeos_`) | `useExamEngine.ts` | Timestamp when exam duration expires |
| `jeeos_mock_attempt_${u}_${t}` | Canonical (`jeeos_`) | `useExamEngine.ts` | Complete exam question attempt record |
| `jeeos_mock_active_tab_${u}_${t}` | Canonical (`jeeos_`) | `useExamEngine.ts` | Mock exam multi-tab mutex |
| `jeeos_gemini_api_key` | Canonical (`jeeos_`) | `AiInterrogationModal.tsx` | Custom user Gemini API key |
| `jee_last_dashboard_expand_date` | **Drift (`jee_`)** | `useDashboardState.ts` | Auto-expansion flag |
| `jee_dismissed_reality_audit` | **Drift (`jee_`)** | `useDashboardState.ts` | Reality audit prompt dismissal |
| `jee_dismissed_contingency_alert` | **Drift (`jee_`)** | `useDashboardState.ts` | Contingency banner dismissal |
| `syllabusViewMode` | **Unprefixed Drift** | `SubjectCommandCenter.tsx` | 'list' \| 'matrix' \| 'rpg' view mode |
| `gemini_api_key` | **Unprefixed Drift** | `AiInterrogationModal.tsx` | Fallback API key string |

### D. SessionStorage Keys
- `onboarding_dismissed`: Hides onboarding modal for the current session.
- `jee_selected_mission_id`: Selected mission highlighted across dashboard views.
- `jee_command_center_override`: User-toggled expansion of the dashboard banner.
- `jeeos_focus_vault_state`: Active focus countdown recovery state.
- `vault-active`: Global lock preventing accidental tab navigation away from Focus Vault.
- `pendingCoachPrompt`: Inter-page prompt handoff when clicking "Ask AI Coach" from test mistakes or graph nodes.

### E. IndexedDB (`JeeOS_Storage` database, `keyval` store)
- `jeeos_mock_results`: Serialized completed mock test history (`MockResult[]`).
- `jeeos_custom_mock_tests`: User-imported or generated tests (`MockTest[]`).
- `jeeos_mock_attempt_${userId}_${testId}`: In-flight question responses and timings during active test taking.

### F. Cloud Firestore Database Collections
- `users/${userId}`: Root user record (`xp`, `analytics`, `energyLevel`, `activeSubject`, `mentorProfile`, `settings`, `weeklyGoals`, `deletedMissionIds`, `completedPlannerMissionIds`, `scheduleOverrides`).
- `users/${userId}/chapters/${chapterId}`: Syllabus chapter tracking, lecture counts, accuracy, SM2 parameters.
- `users/${userId}/customTimelineBlocks/${blockId}`: Custom calendar blocks.
- `users/${userId}/customMissions/${missionId}`: Student-created custom missions.
- `users/${userId}/mistakes/${mistakeId}`: Mistake logbook entries.
- `users/${userId}/notes/${noteId}`: Chapter-linked notes.
- `users/${userId}/studySessions/${sessionId}`: Historical completed study sessions.
- `users/${userId}/mockResults/${resultId}`: Completed mock exam attempts.
- `users/${userId}/customMockTests/${testId}`: Custom mock tests.

---

## 3. Where Timer/Session Data Lives vs. Syllabus/Progress Data

| Dimension | **Timer & Session Data** | **Syllabus & Progress Data** |
| :--- | :--- | :--- |
| **Active Live Runtime** | Isolated inside feature-level React state (`FocusVaultPage`, `useMissionState`, `useExamEngine`). Not broadcast until session completion. | Centralized in `StudyBrainRuntime.state.chapters` and `chapterTelemetryMap`. Subscribed by all screens via Zustand. |
| **Crash Recovery** | `sessionStorage` (`jeeos_focus_vault_state`) or `localStorage` (`jeeos_mission_state_${id}`, `jeeos_mock_attempt_${userId}_${testId}`). | Re-hydrated on app load via Firestore `onSnapshot` real-time listeners. |
| **Cloud Storage** | Written to `users/${uid}/studySessions/${sessionId}` only upon full session finish via `actions.completeStudySession` or `actions.completeTask`. | Written to `users/${uid}/chapters/${chapterId}` whenever chapter lecture, DPP, PYQ, or revision status changes. |
| **Derived Aggregates** | Total study minutes and streak are duplicated between scalar fields on the User document (`analytics.studyTime`, `xp.streak`) and dynamic array-filter scans across `studySessions`. | Aggregated into `syllabusProgress` (`physics`, `chemistry`, `maths`), `dashboardSummary.syllabusCompletion`, and `knowledgeGraph` by `@jee-os/engines`. |
| **Inter-Device Sync** | In-flight timers do **NOT** sync across devices or tabs. Abandoning a tab risks orphaned time records. | Fully synchronized in real-time across devices via Firestore `onSnapshot`. |

---

## 4. Everywhere the App's State is Duplicated or Out of Sync

1. **Dual Competing Sources of Truth for Consistency Streak**:
   - `App.tsx` reads `xp.streak` from the UserProfile document to toggle "God Mode" and "Rot Mode".
   - `Topbar.tsx`, `FloatingDynamicDock.tsx`, and `AnalyticsPage.tsx` dynamically calculate streak on the fly by calling `calculateCurrentStreak(studySessions, minStreakMins)`.
   - *Result:* When offline sessions are logged or session history is pruned, the Dock and Topbar show a streak count that contradicts the God Mode banner in `App.tsx`.

2. **Redundant & Desynchronized User Aspirations / Quotas**:
   - Profile goals exist in two places on the root user object: `userProfile.settings` (`targetYear`, `dreamIit`, `targetBranch`, `dailyQuota`) and `userProfile.mentorProfile` (`targetYear`, `targetCollege`, `targetBranch`, `dailyAvailableHours`).
   - `useMentorInterviewForm.ts` falls back between both. Updating settings can leave mentorProfile out of sync and vice-versa.

3. **Quadruple Mock Test Storage & Divergent Cache Sources**:
   - Completed mock results are stored in 4 places simultaneously: Firestore (`mockResults`), IndexedDB (`jeeos_mock_results`), LocalStorage (`jeeos_mock_results_cache` & `jeeos_offline_mocks`), and Zustand Store (`state.mocks`).
   - In `MockTestsPage.tsx`, fallback logic reads local storage, then asynchronously triggers an IndexedDB get that overwrites `state.mocks`. If Firestore subsequently updates in `StudyBrainContext.tsx`, stale IndexedDB snapshots race and overwrite fresh remote data.

4. **Disconnected, Siloed Timer Implementations**:
   - `FocusVaultPage.tsx`, `useMissionState.ts`, and `useExamEngine.ts` maintain completely separate, isolated timer logic.
   - `useDashboardState.ts` maintains a dead `secondsElapsed` variable passed to `TacticalMissionConsole.tsx` (`PAUSE FOCUS COCKPIT (00:00:00)`), having zero sync with the real Cockpit session.

5. **Discrepant Chapter Completion and Mastery Thresholds**:
   - `academicState.ts` computes overall completion as a weighted formula across lecture, DPP, module, PYQ, and revision.
   - `NeuralGraphEngine.ts` treats a chapter as 'Completed' if `chapter.completion > 60`.
   - `SubjectCommandCenter.tsx` and `RpgKnowledgeTreeWidget.tsx` filter mastered chapters by `c.status === 'Mastered' || c.completion >= 100`.
   - `OptimizationEngine.ts` assigns `completion` directly from `data.masteryScore`.
   - *Result:* The same chapter displays as completed on Neural Link, "Learning" in Subject Command Center, and partial in Planner.

6. **Daily Check-in & Reality Audit Multi-Device Inconsistency**:
   - `DailyCheckinCard.tsx` checks `localStorage.getItem('jeeos_last_daily_checkin_date')` to determine whether to render.
   - However, `UserActions.submitDailyCheckin` writes the record to Firestore under `mentorProfile.dailyCheckins`.
   - *Result:* Completing check-in on mobile still leaves desktop showing the prompt because desktop's local storage never received the date.

7. **Local Storage Siloing of Formula Bookmarks & Notifications**:
   - Formula bookmarks (`jeeos_bookmarked_formulas`) and read notifications (`jeeos_read_notifications`) exist solely in browser local storage.
   - *Result:* Bookmarks and dismissed notifications do not sync across devices and are wiped upon browser cache clearing.

8. **AI Coach Chat Transcripts Stored in LocalStorage Instead of IndexedDB**:
   - Despite `idb.ts` being designed to prevent 5MB storage crashes, `useChatSessions.ts` saves up to 30 full message transcripts in `localStorage.getItem('jeeos_chats')`.
   - *Result:* Heavy AI coach sessions risk throwing `QuotaExceededError` in local storage, crashing subsequent writes across the entire app.

9. **Mission ID Prefix Mangling**:
   - Planner missions receive `today-` prefixes in `timelineSynthesizer.ts`, requiring slice and regex hacks across `usePlannerState.ts` and `MissionActions.ts`.
   - *Result:* Deleting or completing planner blocks occasionally fails because ID strings don't match across transformation boundaries.

10. **Highest Risk Subject and Chapter Re-derivation in Analytics**:
    - `StudyBrainRuntime.state.riskProfile` pre-computes `highestRiskChapters` via `OptimizationEngine`.
    - `AnalyticsPage.tsx` re-sorts and computes risk using its own disparate formula.
    - *Result:* The Dashboard and Analytics pages highlight completely different chapters as "Highest Risk".

---

## 5. Consolidated Core Entities Architecture (The Single Hub Schema)

All platform entities are consolidated into one canonical interface file (`packages/engines/src/types/canonical.ts`, re-exported identically by `src/types/index.ts`):

```typescript
export type SubjectId = 'physics' | 'chemistry' | 'maths';

export type ChapterStatus = 
  | 'Not Started' 
  | 'Learning' 
  | 'Theory Complete' 
  | 'DPP Pending' 
  | 'PYQ Pending' 
  | 'Revision Due' 
  | 'Mastered';

export interface LectureProgress {
  teacher?: string;
  lectureSeries?: string;
  totalLectures: number;
  completedLectures: number;
  avgLectureDurationMinutes: number;
  estimatedRemainingHours?: number;
}

export interface PracticeProgress {
  dppCompleted: boolean | 'Partial';
  pyqsCompleted: boolean | 'Partial';
  moduleCompleted: boolean | 'Partial';
  dppPercent?: number;       // 0 - 100
  modulePercent?: number;    // 0 - 100
  pyqPercent?: number;       // 0 - 100
  mockTestsAttempted?: number;
  accuracyPercent: number;   // 0 - 100
  confidencePercent: number; // 0 - 100
  weakTopics?: string[];
}

export interface RevisionState {
  lastRevisedDaysAgo: number;
  retentionConfidence: 'High' | 'Medium' | 'Low';
  formulaMemoryPercent: number;
  questionSolvingConfidencePercent: number;
  needRevision: boolean;
  retentionScore?: number;   // 0 - 100
  lastRevisedAt?: string;    // ISO String
}

export interface Chapter {
  id: string;
  subject: SubjectId;
  unit: string;
  name: string;
  serialNumber?: string;
  completion: number;         // 0 - 100 (Computed centrally by academicState.ts)
  currentLecture: number;
  totalLectures: number;
  theoryComplete: boolean;
  dppComplete?: boolean;
  pyqsComplete: boolean;
  formulaComplete?: boolean;
  hasTelemetry?: boolean;
  revisionCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  confidence: number;         // 0 - 100
  estimatedRemainingTime: number; // hours
  priority: 1 | 2 | 3;
  dependencies: string[];
  weightage?: number;
  priorityScore?: number;
  weaknessScore: number;      // 0 - 100
  status: ChapterStatus;
  solvedQuestions: number;
  lastRevisionDaysAgo: number;
  chapterOnHold?: boolean;
  dppOnHold?: boolean;
  pyqOnHold?: boolean;
  revisionOnHold?: boolean;
  isCustom?: boolean;
  
  lectureProgress?: LectureProgress;
  practiceProgress?: PracticeProgress;
  revisionProgress?: RevisionState;

  healthScore?: number;       // 0 - 100
  retentionScore?: number;    // 0 - 100
  retentionStatus?: 'Fresh' | 'Stable' | 'Fading' | 'Forgotten';
  nextRevisionDueAt?: string; // ISO String
  lastRevisedAt?: string;     // ISO String
  
  sm2EaseFactor?: number;
  sm2Interval?: number;
}

export interface TodayMission {
  id: string;
  subject: SubjectId | 'break';
  chapter: string;
  chapterId?: string;
  chapterName?: string;
  type: 'Watch Lecture' | 'Solve DPP' | 'Solve PYQs' | 'Revise Formulas' | 'Review Mistakes' | 'Break' | 'Solve Mock';
  taskName: string;
  duration: number;           // in minutes
  originalDuration?: number;
  linkedSessionId?: string | null;
  date?: string;              // YYYY-MM-DD
  scheduledDate?: string;     // ISO YYYY-MM-DD
  scheduledTime?: string;     // HH:MM e.g. '07:00'
  timeSlot?: string;
  isManualOverride?: boolean;
  completed: boolean;
  xp: number;
  partialXpAwarded?: number;
  unlocked: boolean;
  priorityScore?: number;
  targetPYQs?: number;
  selectionReason?: string;
  whyThisTaskExists?: string;
  dismissed?: boolean;
}

export interface StudySession {
  id: string;
  startTime: string;          // ISO String
  endTime: string;            // ISO String
  duration: number;           // Minutes
  type: 'Lecture' | 'Practice' | 'Mock' | 'Revision';
  subjectId: SubjectId;
  chapterId?: string;
  questionsSolved?: number;
  accuracy?: number;          // 0 - 100
  xpEarned: number;
  idleTime?: number;          // Seconds
  focusInterruptions?: number;
  focusScore?: number;        // 0 - 100
}

export interface Mistake {
  id: string;
  subject: SubjectId;
  chapter: string;
  chapterId?: string;
  topic: string;
  subtopic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'JEE Main' | 'JEE Advanced';
  source: string;
  timeTaken: number;
  correctMethod: string;
  studentMethod: string;
  mistakeTypes: string[];
  confidence: number;
  revisionSchedule: string;
  masteryImpact: 'High' | 'Medium' | 'Low';
  attemptNumber: number;
  revisionStatus: 'New' | 'Reviewed' | 'Solved Again' | 'Mastered';
  recoveryScore: number;
  teacherNotes: string;
  personalNotes: string;
  aiAdvice: string;
  priority: 'High' | 'Medium' | 'Low';
  dateLogged: string;
  questionText: string;
  correctSolution: string;
  correctSolutionImage?: string;
  wrongSolutionImage?: string;
}

export interface MockResult {
  id: string;
  date: string;               // ISO String
  title: string;
  totalScore: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  duration: number;           // minutes
  subjectBreakdown: Record<SubjectId, { score: number; attempted: number; correct: number }>;
  testSnapshot?: import('@/types/mockTest').MockTest;
  attemptData?: import('@/types/mockTest').MockTestAttempt;
  isRetake?: boolean;
  originalAttemptId?: string;
}

export interface UserProfile {
  xp: {
    daily: number;
    weekly: number;
    monthly?: number;
    total: number;
    level: number;
    streak: number;
    nextLevelXP: number;
    lastActiveDate?: string;
  };
  analytics: {
    studyTime: number;
    focusTime: number;
    idleTime: number;
    breakTime: number;
    questionsSolved: number;
    accuracy: number;
    tasksCompleted: number;
    xpEarned: number;
  };
  energyLevel: 'High' | 'Medium' | 'Low';
  activeSubject: SubjectId | 'all';
  isMissionModeActive: boolean;
  coachMessage: string;
  mentorProfile?: MentorProfile;
  settings: UserSettings;
  bookmarkedFormulas?: string[];
  readNotificationIds?: string[];
  completedPlannerMissionIds?: string[];
  deletedMissionIds?: string[];
  scheduleOverrides?: Record<string, { 
    dayIndex?: number; 
    timeSlot?: string; 
    scheduledDate?: string; 
    scheduledTime?: string 
  }>;
}

export interface UserSettings {
  targetYear: string;
  dreamIit: string;
  targetBranch: string;
  dailyQuota: number;
  showStatusInBar: boolean;
  soundEffects: boolean;
  desktopNotifications: boolean;
  volume: number;
  cockpitVolume?: number;
  pauseOnTabChange?: boolean;
  minStreakHours?: number;
  enableGodMode?: boolean;
  themeMode?: 'evangelion' | 'modern';
  focusSubject?: SubjectId;
  dayStartTime?: string;
  dayEndTime?: string;
  enablePomodoroCasino?: boolean;
}
```

---

## 6. Standardized User Journeys as State Machines

### Journey 1: `/boost` (Active Recall & Sprint Machine)
```
[IDLE] ──(START_BOOST)──> [FETCHING_QUEUE] ──(CARDS_READY)──> [INSPECTING]
                                                                  │
                                                              (FLIP_CARD)
                                                                  ▼
[COMPLETE] <──(SPRINT_END)── [PERSISTING_SM2] <──(GRADE)── [EVALUATING]
```
- **Guarantees**: Computes SuperMemo-2 (`easeFactor`, `interval`, `nextReviewDueAt`) via pure functions in `@jee-os/engines`. Optimistic UI updates with rollback snapshot. Dispatches XP and updates chapter telemetry upon sprint completion.

### Journey 2: `/plan` (Strategic Capacity Balancing Machine)
```
[IDLE] ──(RUN_PLANNER)──> [FILTER_CONSTRAINTS] ──> [RANK_ROIs] ──> [SYNTHESIZE_SLOTS] ──> [COMMITTED]
```
- **Guarantees**: Respects student sleep caps (`dayStartTime`, `dayEndTime`) and available hours. Enforces ascending lecture numbers for identical chapters. Generates zero-collision continuous time slots.

### Journey 3: `/learn` (Deep Work Study Cockpit Machine)
```
[READY] ──(START)──> [ACTIVE] ──(PAUSE/RESUME)──> [PAUSED]
                       │
             (TIME_UP / FINISH)
                       ▼
                 [PROOF_OF_WORK] ──(SUBMIT)──> [COMMITTING] ──(DONE)──> [CLEARED]
```
- **Guarantees**: Wall-clock drift calculation `(Date.now() - lastTick)`. Window `beforeunload` lock. Periodic 30s crash-recovery checkpointing to storage. Proof-of-work questions required to validate XP and session duration.

### Journey 4: `/goal` (Target Calibration & Reality Audit Machine)
```
[UNCALIBRATED] ──> [ORIENTATION] ──> [TARGET_LOCK] ──> [REALITY_AUDIT] ──> [GENERATING_ROADMAP] ──> [FINALIZED]
```
- **Guarantees**: Atomic simultaneous write to both `mentorProfile` and `settings`. Re-normalizes all 80+ chapters with baseline telemetry (`hasTelemetry: true`).

### Journey 5: `/grill-me` (Socratic AI Mistake Interrogation Machine)
```
[IDLE] ──(GRILL_REQUEST)──> [ANALYZING_MISTAKE] ──> [QUESTIONING] ──> [STUDENT_DEFENSE] ──> [EVALUATED]
```
- **Guarantees**: All AI chat transcripts stored directly in IndexedDB (`keyval`). If recovery score reaches >= 80%, the mistake's `revisionStatus` automatically upgrades to `'Solved Again'` or `'Mastered'`.

---

## 7. The Golden Invariants (To Be Absolutely Respected At All Times)

1. **Single Source of Truth Law**:
   - `StudyBrainRuntime` is the SOLE authoritative in-memory owner of all operational application state.
   - Components MUST NOT invent local state for values that affect multiple screens (e.g., streak, daily study time, mission completion, active theme).
   - Components MUST read state exclusively via `useStudyBrainStore` using `useShallow` selectors.

2. **Zero In-Render Business Logic Law**:
   - No component render function may compute business algorithms (e.g., SM2 intervals, streak counting, mastery percentages, risk sorting).
   - All derived data must be pre-calculated by `@jee-os/engines` inside `StudyBrainRuntime.refresh()` and consumed as static properties.

3. **Storage Tier Separation Law**:
   - **Firestore:** Canonical permanent database for all user entities.
   - **IndexedDB (`keyval`):** Exclusively for large offline blobs (Mock Test Snapshots, Full CBT Attempts, AI Chat Histories).
   - **SessionStorage:** Exclusively for intra-session UI handoffs (`pendingCoachPrompt`, `onboarding_dismissed`).
   - **LocalStorage:** Exclusively for device preferences (`jeeos_theme`, `jeeos_dock_pinned`, `jeeos_cockpit_volume`). ALL keys MUST begin with the prefix `jeeos_`. No unprefixed or `jee_` keys are permitted.

4. **Optimistic Mutation with Mandatory Rollback Law**:
   - Every state mutation dispatched through `StudyBrainActions` must take a synchronous snapshot of previous state before applying optimistic runtime updates.
   - If the persistence write fails, the action MUST automatically rollback the runtime state and record the error in `lastSyncError`.

5. **Single Streak Authority Law**:
   - The user's active streak is owned exclusively by `UserProfile.xp.streak`.
   - UI components (Dock, Topbar, Analytics, God Mode) MUST read `state.xp.streak`. Components are STRICTLY FORBIDDEN from calculating independent streaks on the fly.

6. **Centralized Chapter Status & Completion Law**:
   - A chapter's completion percentage (0 - 100) is calculated ONLY by `academicState.ts` via weighted components.
   - A chapter is `'Mastered'` IF AND ONLY IF `chapter.status === 'Mastered'` or `chapter.completion >= 100`. No component may use arbitrary thresholds (such as >60%).

---

## 8. Forbidden Anti-Patterns & Coding Invariants

- ❌ **FORBIDDEN:** Calling `localStorage.setItem` directly inside feature components for domain data. All storage must pass through `StudyBrainActions` or dedicated storage adapters.
- ❌ **FORBIDDEN:** Using `useState` for active timers without registering a persistent crash recovery key in session storage.
- ❌ **FORBIDDEN:** Re-implementing math or metrics in JSX (e.g. `chaps.filter(c => c.completion > 60)`).
- ❌ **FORBIDDEN:** Creating un-prefixed or `jee_` local storage keys.

---

## 9. Definition of Done (DoD) Checklist for New Features & Refactors

Before any PR, feature, or refactor is merged into JEE OS, it MUST satisfy every checkpoint of this 5-point checklist:

1. **Storage Guardrails Verified:**
   - [ ] ZERO raw `localStorage` or `sessionStorage` invocations in `src/components/` and `src/features/`.
   - [ ] All persistent keys are accessed via `StorageAdapter` (`src/services/StorageAdapter.ts`).
   - [ ] All storage keys strictly begin with the `jeeos_` prefix.
   - [ ] Verified via CI scanner: `npx tsx scripts/verify-storage-prefix.ts` exits with code 0.

2. **No In-Component Business Math:**
   - [ ] No `.tsx` component computes business math in JSX (streak counts, SuperMemo-2 retention decay, chapter mastery thresholds, or multi-subject capacity balancing).
   - [ ] All derived calculations originate in `@jee-os/engines` and are dispatched through `StudyBrainRuntime.refresh()`.
   - [ ] Single Authority rules are respected:
     - Streak = `userProfile.xp.streak`
     - Chapter Completion & Mastery = `academicState.ts` (`chapter.status === 'Mastered' || chapter.completion >= 100`)
     - Quota = `settings.dailyQuota`
     - Mock history = Firestore `mockResults` + IDB `jeeos_mock_results` (NO localStorage results cache)
     - Formula bookmarks = User Profile (`bookmarkedFormulaIds`)

3. **Store Subscriptions Use `useShallow`:**
   - [ ] Multi-property store selectors in UI components use `useShallow` (re-exported from `src/store/useStudyBrainStore.ts`).
   - [ ] Prevents re-render cascades caused by shallow reference inequality.

4. **State Machine First Protocol & Decoupled Timers:**
   - [ ] Multi-step user journeys (Sessions, Mock Exams, Checkins, Onboarding) are driven by explicit pure TypeScript state machines.
   - [ ] Timers do NOT rely on naive `1000ms` `setInterval` ticks; elapsed time is computed via wall-clock deltas: `Date.now() - lastTickTimestamp`.
   - [ ] Timed sessions checkpoint state every 30 seconds to `StorageAdapter.setCrashCheckpoint()`.

5. **Optimistic Mutations with Rollback Safety:**
   - [ ] State mutations in `StudyBrainActions` take a synchronous snapshot of previous runtime state.
   - [ ] On remote failure (network error, permission rejection), runtime state reverts to snapshot and populates `lastSyncError`.
   - [ ] Covered by regression tests in `src/actions/ArchitectureInvariants.test.ts`.

