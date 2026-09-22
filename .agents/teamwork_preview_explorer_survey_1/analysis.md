# Exhaustive Survey & Deep Audit of Core Calculation Engines

**Auditor**: `teamwork_preview_explorer_survey_1`  
**Target Subsystem**: Core Calculation Engines (`packages/engines/src/`), Runtime Engine Orchestration, and Mathematical Services  
**Scope**: 
- `packages/engines/src/chapterInfo/` (ChapterInfoEngine)
- `packages/engines/src/planner/` (PlannerEngine, PlannerScoringEngine)
- `packages/engines/src/knowledge/` (KnowledgeEngine)
- `packages/engines/src/revision/` (RevisionEngine, SpacedRepetitionEngine)
- `packages/engines/src/optimization/` (OptimizationEngine)
- `packages/engines/src/analytics/` (AnalyticsEngine)
- `packages/engines/src/coach/` (CoachEngine)
- `packages/engines/src/graph/` (NeuralGraphEngine)
- `packages/engines/src/intelligence/` (MockTestParsingEngine)
- `packages/engines/src/pyq/` (PyqEngine)
- Interacting runtime & services: `src/runtime/StudyBrainRuntime.ts`, `src/services/studyBrainService.ts`, `src/services/revisionEngineService.ts`, `src/utils/`

---

## 1. Executive Summary

A comprehensive, read-only forensic inspection was conducted across all 8 core calculation engines in `packages/engines/src/` and their runtime orchestration pipelines.

### Key Audit Highlights:
1. **Mathematical & Scoring Formula Distortions**:
   - The Lookahead Simulator in `PlannerEngine.ts` inflates candidate scores to **600–800/100** by adding an unnormalized $+200$ continuity bonus per active task, causing user-facing text to display strings like `Score: 636/100` and rendering multi-factor optimization ineffective.
   - In `StudyBrainService.ts`, chapters that are never revised maintain a static **50% retention score forever**, while chapters revised once decay to **0%**, creating an inverted learning incentive.
   - In `mistakeIntelligence.ts`, exponential compounding ($1.3^{M-1}$) inflates mistake scores above $2,000$, completely nullifying the 50% post-mistake revision mitigation logic when clamped to 100.

2. **Planner & Scheduling Logic Defects**:
   - Pushed overnight tasks in `generateWeeklyMatrix` (`PlannerEngine.ts:1340-1345`) cause the schedule generator to **abort and discard the entire next day's planned blocks**, wiping out 3–4 study sessions for that day.
   - Candidate task generation in `PlannerEngine.ts:223-264` leaks raw node database IDs (`p2`, `p3`) into user-facing reasoning strings (`"Unlocks p2, p3 and adds projected +12 JEE Main marks"`).
   - Time calculations in `timeSlotUtils.ts:68-75` fail to apply modulo 24, generating invalid clock displays such as `"23:30 - 24:30"`.

3. **Spaced Repetition & Retention Architecture**:
   - Dual competing revision engines run concurrently: `packages/engines/src/revision/RevisionEngine.ts` (SuperMemo-2) and `src/services/revisionEngineService.ts` (Exponential Half-Life), presenting conflicting data between Dashboard and Revision Vault.
   - In `RevisionEngine.ts:52`, chapter session history filters by `s.subjectId === chap.subject` instead of `chapterId`, causing studying any chapter in Physics to reset the "last studied" timestamp for all 20+ Physics chapters.
   - In `RevisionEngine.ts:174`, `reviewedTodayCount` counts all historical revision sessions across all time instead of filtering for today's date.
   - In `StudyBrainRuntime.ts:544`, the runtime passes `revisionBacklog: []` (empty array) to `PlannerEngine`, completely disconnecting SM-2 overdue cards from the daily mission scheduler.

4. **Telemetry, Graph & Intelligence Engine Gaps**:
   - `ChapterInfoEngine.ts:63-76` contains a double inverted logic flaw: it flags false lecture backlogs on chapters where theory is already complete, and skips lecture backlogs on unstarted chapters to falsely flag "DPP practice pending".
   - `NeuralGraphEngine.ts:119-121` uses `chapter.theoryComplete` as fallback for DPP completion, and assigns DPP completion percentage to the `accuracyPercent` field.
   - `CoachEngine.ts:77-80` creates malformed mission payloads where `chapterId` is set to the chapter's name (string) and the subject is overridden by search query keywords.
   - `AnalyticsEngine.ts:151-153` contains unshielded date arithmetic where near-zero study velocity overflows JavaScript's date limits and throws `RangeError: Invalid time value`.

---

## 2. Engine-by-Engine Deep Forensic Analysis

### 2.1 KnowledgeEngine (`packages/engines/src/knowledge/KnowledgeEngine.ts`)
- **Role**: Prerequisite DAG graph traversal, topological unlock calculation, and syllabus completion hour estimations.
- **Observations**:
  - `getDependencyTree` (lines 155–177) returns `string[]` (node ID keys). When consumed by `PlannerEngine.ts:224`, callers assume nodes are objects (`n.name || n`), leaking raw string IDs.
  - In `getEstimatedRemainingHours` (line 191), fallback hours uses `node.totalLectures` and `node.avgLectureDuration`, which are optional legacy fields on `SyllabusNode`. If missing, it defaults to 12 lectures and 60 minutes.
  - Cycle protection in `traverse` (lines 135–144 and 162–171) inserts nodes into `result` before recursing. While this halts simple recursion loops, the root node itself is not seeded in `result`, so mutual dependencies (A $\leftrightarrow$ B) will include A in A's own prerequisites.

### 2.2 PlannerEngine & PlannerScoringEngine (`packages/engines/src/planner/`)
- **Role**: 14-factor task scoring, daily mission selection via 8-strategy lookahead simulation, and 7-day weekly matrix calendar generation.
- **Observations**:
  - **Lookahead Score Inflation** (`PlannerEngine.ts:785-808`): Lookahead candidates add $+200$ per task for ongoing chapters (`continuityScore += 200`). This pushes `mission.score` to 600–800, which is displayed directly in `selectionReason` as `Score: 636/100`.
  - **Static Simulation Factors** (`PlannerEngine.ts:795-799`): Factors `subjectBalance` (85), `revisionHealth` (80), `dependencyUnlock` (75), `workloadRealism` (90), and `completionProb` (90) are static constants across all candidates, meaning strategies are only differentiated by marks/learning gain and continuity.
  - **Pushed Overnight Task Cascade Drop** (`PlannerEngine.ts:1340-1345`): If today's tasks overflow past `dayEndTime`, 1 task is pushed to tomorrow. When generating tomorrow's schedule, the engine checks `if (existingBlocksForDay.length > 0) return;`, dropping the entire planned schedule for that day.
  - **Subject Split Fallback Inconsistency** (`PlannerEngine.ts:630`): If `1_a_day_alternating` or `2_a_day_alternating` filters produce 0 tasks, line 630 falls back to `candidates` (all subjects), violating the strict day rotation rule.
  - **Redundant Hold Check** (`PlannerEngine.ts:458, 460`): Duplicate identical lines `if (chapterMeta?.chapterOnHold) continue;` appear consecutively.
  - **Missing Null Guard on `userPreferences`** (`PlannerScoringEngine.ts:575`): `context.globalInput.userPreferences.focusSubject` accesses `.focusSubject` directly without optional chaining, throwing `TypeError` if `userPreferences` is omitted.

### 2.3 ChapterInfoEngine (`packages/engines/src/chapterInfo/ChapterInfoEngine.ts`)
- **Role**: Centralized single source of truth for 56 chapter telemetry records, strategy radar, syllabus stages, and bottleneck risk scores.
- **Observations**:
  - **Bottleneck Determination Flaws** (lines 63–76):
    - When `chapter.theoryComplete === true` but `chapter.currentLecture < 12`, line 64 triggers `isBottleneck = true` and reports a lecture backlog.
    - When `chapter.currentLecture === 0` and `chapter.theoryComplete === false`, line 64 evaluates to false because `0` is falsy, falling into line 67 to report `DPP practice pending`.
  - **Bottleneck Truncation Order** (lines 165–174): `getChapterBottlenecks` truncates to 3 items via `.slice(0, 3)` using map iteration order without sorting by `bottleneckSeverity`.
  - **Array Safety on Partial Inputs** (lines 28, 30, 208–211): `input.chapters`, `input.mistakes`, `input.sessions`, and `input.mocks` are accessed directly with `.forEach`, `.filter`, `.map`, and `.reduce` without fallback defaults.
  - **Unstarted Retention Confidence Label** (lines 55–58): `retentionConfidence` is assigned `'High'` for unstarted chapters while `retentionConfidenceScore` is `0`, creating a conflicting representation.

### 2.4 RevisionEngine & SpacedRepetitionEngine (`packages/engines/src/revision/`)
- **Role**: SuperMemo-2 dynamic interval scheduling, formula card generation, and retention decay tracking.
- **Observations**:
  - **Subject-Level Session Bleed** (`RevisionEngine.ts:52-53`): Filters sessions by `s.subjectId === chap.subject` rather than `chapterId`. Any study session in Physics resets the last session timestamp for all Physics chapters.
  - **Historical Today Count** (`RevisionEngine.ts:174`): `reviewedTodayCount` returns all sessions matching `type === 'Revision'` without checking session dates against today.
  - **SM-2 Floating Point Accumulation** (`SpacedRepetitionEngine.ts:47`): Ease factor addition and subtraction produces unrounded IEEE 754 floats (`2.6000000000000005`, `1.3000000000000003`).
  - **Missing Formula Bank Coverage**: If a chapter has no entries in `FORMULA_BANK`, `RevisionEngine` produces 0 cards and reports `overdueCardsCount: 0` regardless of overdue status.

### 2.5 OptimizationEngine (`packages/engines/src/optimization/OptimizationEngine.ts`)
- **Role**: Velocity-smoothed exam target forecasting, overloaded hours detection, and schedule status classification.
- **Observations**:
  - **Unsafe Object Property Access** (lines 34, 150): `plannerInput.userPreferences.dailyQuota` and `plannerInput.userPreferences.focusSubject` assume `userPreferences` is always defined.
  - **Over-constrained Zero-Hours Floor** (lines 141–143): When `remainingHours === 0` (syllabus fully mastered), `recommendedDailyStudyHours` is 0, but line 141 forces `optimizedStudyHours = 2.0` (minimum daily hours).

### 2.6 AnalyticsEngine (`packages/engines/src/analytics/AnalyticsEngine.ts`)
- **Role**: 7-day velocity, 30-day consistency score, question accuracy %, subject balance, mock trend, and active streak tracking.
- **Observations**:
  - **Date Math Overflow** (lines 151–153): If `studyVelocity` is extremely low, `futureMs` exceeds $8.64 \times 10^{15}$ ms. `isNaN(futureMs)` is `false`, and `new Date(futureMs).toISOString()` throws `RangeError: Invalid time value`.
  - **Rolling 24h Milliseconds vs Calendar Day** (lines 44–52): `diffDays = Math.floor((now - sessionDate) / msPerDay)` uses elapsed millisecond offsets instead of local calendar dates, placing yesterday evening's study sessions into today's weekly bar chart.

### 2.7 CoachEngine (`packages/engines/src/coach/CoachEngine.ts`)
- **Role**: Hybrid AI / deterministic pedagogical advice, sprint missions, and error autopsy.
- **Observations**:
  - **Corrupted Mission Payload** (lines 77–80): `actions.push({ type: 'ADD_MISSION', payload: { chapterId: topChap.name, subject: ... } })` assigns the chapter's name to `chapterId` and overrides `topChap.subject` based on user query keywords.
  - **Unused Static Property** (line 4): `public static cachedWorkingModel: string | null = null;` is declared but never written or read.

### 2.8 NeuralGraphEngine (`packages/engines/src/graph/NeuralGraphEngine.ts`)
- **Role**: Serializes chapters and telemetry into `@xyflow/react` nodes and energy edges.
- **Observations**:
  - **Typo in DPP Fallback** (line 119): `dppDone: telemetry?.dppComplete ?? chapter.theoryComplete ?? false` falls back to theory completion instead of `chapter.dppComplete`.
  - **Accuracy Metric Mismatch** (line 121): `accuracyPercent: telemetry?.strategyRadar?.dppCompletionPercent || chapter.confidence || 0` displays DPP completion progress as question accuracy.

### 2.9 Intelligence & PYQ Engines (`packages/engines/src/intelligence/`, `packages/engines/src/pyq/`)
- **Observations**:
  - `MockTestParsingEngine.ts:40`: Verbatim JavaScript comment `// truncate to prevent massive token overload just in case` is interpolated inside the prompt string sent to Gemini AI.
  - `PyqGeneratorEngine.ts:17-99`: Client-side method allocates a 50-line JSON schema and 32-line prompt string on every call, but sends only `{ chapterId, subject, count }` to the backend.
  - `PyqEngine.ts:23-28`: If fetching `/data/pyqs.json` fails once, `fetchPromise` remains cached as a resolved promise, permanently preventing retry.

---

## 3. Architectural & Cross-Engine Synthesis

### 3.1 Dual Competing Revision Engines
The application runs two completely independent revision engines on every state mutation:
1. `packages/engines/src/revision/RevisionEngine.ts`: SM-2 algorithm, updates `state.revisionTelemetry`.
2. `src/services/revisionEngineService.ts`: Exponential half-life decay ($R = 100 \cdot 0.5^{t/S}$), updates `state.revisionQueue`.

**Impact**: Components inspecting revision status receive divergent results. Dashboard displays `revisionQueue` with unstarted chapters defaulted to 100% retention, while Revision Vault displays SM-2 cards with distinct due dates.

### 3.2 Runtime Disconnects in StudyBrainRuntime.ts
1. Line 544 passes `revisionBacklog: []` to `PlannerEngine`. Despite computing `revisionTelemetry` with overdue chapters in line 443, the planner's revision scheduling loop is starved of input.
2. Line 547 hardcodes `focusSubject: this.state.settings.targetBranch ? undefined : undefined`, permanently blinding `PlannerScoringEngine` to the user's focus subject preference.

### 3.3 Dead & Orphaned Calculation Methods in Services
`StudyBrainService.getTodayMission` (lines 362–432) and `StudyBrainService.getCompletionPrediction` (lines 434–480) instantiate private `KnowledgeEngine`, `PlannerEngine`, and `OptimizationEngine` instances directly, bypassing `ChapterInfoEngine` and hardcoding mock inputs. Neither method is called by any active component.

---

## 4. Comprehensive Catalog of Verified Bugs

| # | Bug Title | Target File | Lines | Severity | Reproduction Trigger |
|---|---|---|---|---|---|
| 1 | Lookahead Score Inflation (`Score: 636/100`) via Unnormalized Continuity Bonus | `packages/engines/src/planner/PlannerEngine.ts` | 785-788, 801-808, 968 | High | Generate daily plan with $\ge 1$ active in-progress chapter |
| 2 | Pushed Overnight Tasks Wipe Out Entire Next-Day Weekly Matrix Schedule | `packages/engines/src/planner/PlannerEngine.ts` | 1180-1182, 1340-1345 | Critical | Today's tasks exceed `dayEndTime`, pushing 1 task to tomorrow |
| 3 | Double Inverted Bottleneck Logic Flags False Backlogs & Skips Lecture Gaps | `packages/engines/src/chapterInfo/ChapterInfoEngine.ts` | 63-76 | High | Chapter with `theoryComplete: true` and `currentLecture < 12`, or `currentLecture: 0` |
| 4 | Unsorted Bottleneck Truncation Drops Critical Exam Bottlenecks | `packages/engines/src/chapterInfo/ChapterInfoEngine.ts` | 165-174 | Medium | Student has $>3$ bottlenecks where Low severity precedes Critical in chapters array |
| 5 | Subject-Level Bleed Corrupts Chapter `lastSession` in RevisionEngine | `packages/engines/src/revision/RevisionEngine.ts` | 52-53, 63, 133 | High | Complete study session in any subject with multiple chapters |
| 6 | `reviewedTodayCount` Counts Lifetime Historical Revisions Instead of Today's | `packages/engines/src/revision/RevisionEngine.ts` | 174 | Medium | User has revision sessions logged on past dates |
| 7 | Unhandled Date Math Overflow in AnalyticsEngine Throws `RangeError` | `packages/engines/src/analytics/AnalyticsEngine.ts` | 151-153 | High | User logs small study duration ($\approx 0$ velocity) with remaining lectures |
| 8 | NeuralGraphEngine DPP Fallback Typo & Accuracy Assigned DPP % | `packages/engines/src/graph/NeuralGraphEngine.ts` | 119, 121 | High | View Neural Link map when telemetry is unpopulated or DPP completion $\ne$ accuracy |
| 9 | CoachEngine Creates Corrupted Mission with Chapter Name as `chapterId` | `packages/engines/src/coach/CoachEngine.ts` | 77-80 | High | Ask Coach AI tactical question mentioning syllabus topics |
| 10 | Runtime Disconnect: Empty `revisionBacklog: []` & Broken `focusSubject` Ternary | `src/runtime/StudyBrainRuntime.ts` | 544, 547 | Critical | Every execution of `StudyBrainRuntime.executeRefresh` |
| 11 | Raw Node IDs Leaked into User-Facing Reasoning Explanations | `packages/engines/src/planner/PlannerEngine.ts` | 83, 223-224, 264 | Medium | Generate lecture task for any chapter with dependent prerequisites |
| 12 | Inverted Incentive: Never-Revised Chapters Never Decay While Revised Chapters Decay to 0 | `src/services/studyBrainService.ts` | 78-80 | Medium | Chapter with `revisionCount: 0` and high `lastRevisionDaysAgo` |
| 13 | 24:00+ Hour Overflow in `timeSlotUtils.ts` Produces Invalid Time Strings | `src/utils/timeSlotUtils.ts` | 68-75 | Low | Session scheduled or running across midnight (e.g. 23:30 + 60m $\to$ `"24:30"`) |
| 14 | Missing Null Guards on `userPreferences` in PlannerScoringEngine & OptimizationEngine | `packages/engines/src/planner/PlannerScoringEngine.ts`, `packages/engines/src/optimization/OptimizationEngine.ts` | 575 (Scoring), 34, 150 (Opt) | Medium | Invoke Planner or Optimizer with partial input omitting `userPreferences` |
| 15 | Missing Input Array Null Guards in ChapterInfoEngine Cause Crash | `packages/engines/src/chapterInfo/ChapterInfoEngine.ts` | 28, 30, 208-211 | Medium | Invoke `generateChapterTelemetry` with partial `ChapterInfoInput` |
| 16 | Exponential Multiplier in Mistake Danger Score Nullifies Revision Mitigation | `src/utils/mistakeIntelligence.ts` | 105-107, 148, 170 | Medium | Chapter with $\ge 8$ active mistakes undergoes post-mistake revision |
| 17 | Unused Dead Payloads in `PyqGeneratorEngine.ts` | `src/lib/PyqGeneratorEngine.ts` | 3, 17-66, 68-99, 108 | Low | Question generation API invocation |
| 18 | JavaScript Comment Leaked into Gemini AI Prompt in MockTestParsingEngine | `packages/engines/src/intelligence/MockTestParsingEngine.ts` | 40 | Low | Mock test parsing API invocation |
| 19 | Rolling 24h Milliseconds vs Calendar Day Binning in AnalyticsEngine | `packages/engines/src/analytics/AnalyticsEngine.ts` | 44-52 | Low | Open analytics the morning after an evening study session |

---

## 5. Verification Against Prior Audits

Every item in this report was verified against:
1. `ALL_BUGS_VERIFICATION_REPORT.md`
2. `CRITICAL_FIXES_COMPLETION_REPORT.md`
3. Git commit history (`ace43ec`, `90a3bd2`)

None of the 19 reported issues duplicate any of the previously verified fixes (e.g. `resetToInitialState` null dereference, `useMissionState` JSON.parse crash, planner week range off-by-one, SM-2 UTC midnight normalization, debounced queue mutex, dynamic import races, completeTask data pollution). All reported bugs are verified present in the active codebase.
