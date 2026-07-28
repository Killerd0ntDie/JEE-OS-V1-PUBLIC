# Subject Split Strategy (R2) — Engine Analysis Report

## Executive Summary
This report presents a comprehensive investigation of the Subject Split Strategy feature across the JEE-OS engine architecture:
- **`src/runtime/StudyBrainRuntime.ts`**
- **`src/engines/planner/PlannerEngine.ts`**
- **`src/engines/planner/PlannerScoringEngine.ts`**
- **`src/engines/planner/types.ts`**

### Key Findings:
1. **Parameter Flow**: `mentorProfile.subjectSplitStrategy` is correctly defined in `src/types/index.ts` and `src/engines/planner/types.ts`. `StudyBrainRuntime.ts` passes this value into `PlannerInput.userPreferences.subjectSplitStrategy` inside its `refresh()` method (line 326).
2. **Current Defect / Gap in `PlannerEngine.ts`**: `PlannerEngine.ts` currently reads `subjectSplitStrategy` **only** for generating the 7-day `weeklySchedule` matrix (lines 665-692). It **fails** to filter candidates when building `todaysMission` (lines 495-660). As a result, today's mission includes tasks across all 3 subjects even when `2_a_day_alternating` or `1_a_day_alternating` is selected.
3. **Scoring Engine Compatibility**: `PlannerScoringEngine.ts` uses a 14-factor scoring model. Its scoring math operates on individual task contexts and does not require internal changes. Filtering candidate tasks at the `PlannerEngine` selection layer ensures scoring strictly evaluates eligible active subjects.

---

## 1. Path Mapping & File Inventory

| Component | Repository Relative Path | Purpose |
|---|---|---|
| **Runtime Coordinator** | `src/runtime/StudyBrainRuntime.ts` | Bridges application state (`mentorProfile`) with engine inputs and outputs |
| **Planner Engine** | `src/engines/planner/PlannerEngine.ts` | Candidate generation, multi-strategy lookahead selection, daily mission assembly, and 7-day schedule matrix generation |
| **Scoring Engine** | `src/engines/planner/PlannerScoringEngine.ts` | 14-factor scoring formula for prioritizing candidates |
| **Planner Types** | `src/engines/planner/types.ts` | Type definitions for `PlannerInput`, `PlannerOutput`, `ScheduledTask` |
| **Core Types** | `src/types/index.ts` | Type definitions for `MentorProfile`, `SubjectId`, `TodayMission` |

---

## 2. Parameter Flow Analysis (`mentorProfile` -> `PlannerEngine`)

### 2.1 Schema Definitions
- `src/types/index.ts` (lines 522-534):
  ```ts
  export interface MentorProfile {
    ...
    dailyAvailableHours: number;
    subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';
    ...
  }
  ```
- `src/engines/planner/types.ts` (lines 46-51):
  ```ts
  export interface PlannerInput {
    ...
    userPreferences: {
      targetYear: string;
      focusSubject?: SubjectId;
      dailyQuota?: number;
      subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';
    };
    ...
  }
  ```

### 2.2 Runtime Parameter Forwarding
- `src/runtime/StudyBrainRuntime.ts` (lines 318-334):
  ```ts
  const plannerInput: PlannerInput = {
    studyHours: effectiveStudyHours, 
    currentSyllabusProgress,
    revisionBacklog: [], 
    userPreferences: {
      targetYear: this.state.settings.targetYear,
      focusSubject: this.state.settings.targetBranch ? undefined : undefined, 
      dailyQuota: effectiveStudyHours,
      subjectSplitStrategy: this.state.mentorProfile?.subjectSplitStrategy
    },
    ...
  };
  ```
- **Verification**: `StudyBrainRuntime.ts` forwards `subjectSplitStrategy` whenever `refresh()` is called. If `mentorProfile` is undefined, `subjectSplitStrategy` defaults to `undefined`, which `PlannerEngine` treats as `'3_a_day'`.

---

## 3. Candidate Generation & Daily Task Allocation (`PlannerEngine.ts`)

### 3.1 Candidate Set Generation (Phase 7, lines 273-488)
In Phase 7, `PlannerEngine.ts` generates candidates across:
1. **Revision Backlog** (`input.revisionBacklog` & chapters with `status === 'Revision Due'`).
2. **Mock Remediation** (Weakest subject chapter from latest mock exam).
3. **In-Progress Progression** (Active chapters with lectures/DPPs/PYQs/Mistakes).

All candidates for Physics, Chemistry, and Mathematics are compiled into a unified `candidates: ScheduledTask[]` list and sorted by `priorityScore` descending.

### 3.2 Rotation Pattern Mapping (Modulo 3 Logic)
Rotation maps day indices to active subject arrays:

$$\text{currentDayIdx} = (\text{getDay()} + 6) \pmod 7 \quad \text{(0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat, 6 = Sun)}$$

| Strategy | Rotation Rule | Active Subjects per Modulo Group |
|---|---|---|
| **`3_a_day`** | All active every day | Day 0-6: `['physics', 'chemistry', 'maths']` |
| **`2_a_day_alternating`** | Modulo 3 cycle | **Day % 3 == 0** (Mon, Thu, Sun): `['physics', 'chemistry']`<br>**Day % 3 == 1** (Tue, Fri): `['chemistry', 'maths']`<br>**Day % 3 == 2** (Wed, Sat): `['maths', 'physics']` |
| **`1_a_day_alternating`** | Modulo 3 cycle | **Day % 3 == 0** (Mon, Thu, Sun): `['physics']`<br>**Day % 3 == 1** (Tue, Fri): `['chemistry']`<br>**Day % 3 == 2** (Wed, Sat): `['maths']` |

### 3.3 Identification of Existing Defect / Gap
In lines 495-660 of `PlannerEngine.ts`:
- Candidate selection strategies (`candidateMissions`: Balanced, Progression, Practice, Revision, Physics Mastery, Chemistry Mastery, Mathematics Mastery, Pure Priority Focus) evaluate candidates from `candidates` **without filtering by today's active subjects**.
- `splitStrategy` is currently ONLY referenced in line 668 for `weeklySchedule`:
  ```ts
  const currentDayIdx = (new Date().getDay() + 6) % 7;
  const weeklySchedule: Record<number, ScheduledTask[]> = {};
  const splitStrategy = input.userPreferences?.subjectSplitStrategy || '3_a_day';

  for (let day = 0; day < 7; day++) {
    let allowedSubjects: string[] = ['physics', 'chemistry', 'maths'];
    if (splitStrategy === '2_a_day_alternating') {
      allowedSubjects = day % 3 === 0 ? ['physics', 'chemistry'] : day % 3 === 1 ? ['chemistry', 'maths'] : ['maths', 'physics'];
    } else if (splitStrategy === '1_a_day_alternating') {
      allowedSubjects = day % 3 === 0 ? ['physics'] : day % 3 === 1 ? ['chemistry'] : ['maths'];
    }
    ...
  }
  ```
- **Consequence**: `todaysMission` includes tasks for inactive subjects. For example, under `1_a_day_alternating` on Monday (Day 0), `todaysMission` still contains Chemistry and Maths tasks.

---

## 4. `PlannerScoringEngine.ts` Analysis

### 4.1 Scoring Formula
`PlannerScoringEngine` computes task priority score using a 14-factor weighted model (`PLANNER_CONFIG.weights`):
- `jeeWeightage`: 0.12
- `mastery`: 0.08
- `mistakeIntelligence`: 0.10
- `dependencyUnlock`: 0.10
- `revisionUrgency`: 0.15
- `timeSinceLastStudy`: 0.08
- `subjectBalance`: 0.08
- `learningGain`: 0.12
- `completionProbability`: 0.05
- `examUrgency`: 0.05
- `remainingSyllabus`: 0.03
- `studyVelocity`: 0.02
- `fatigue`: 0.01
- `dailyHours`: 0.01

### 4.2 Subject Balance Interaction
- `Factor 7 (Subject Balance)` compares 14-day study history (`actualEffort`) against target workload share (`targetEffort`).
- When candidate filtering is applied in `PlannerEngine`, tasks for inactive subjects on a given day are excluded before selection.
- Over a 7-to-14 day window, alternating strategies naturally maintain subject balance across the rotation cycles.
- **Conclusion**: No internal changes are required in `PlannerScoringEngine.ts`. It works seamlessly when candidates are filtered upstream in `PlannerEngine.ts`.

---

## 5. R2 Implementation Blueprint

To complete R2 implementation, the following changes are required in `PlannerEngine.ts`:

### Helper Function: Active Subjects Resolver
```ts
export function getActiveSubjectsForDay(
  dayIndex: number, 
  strategy: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating' = '3_a_day'
): SubjectId[] {
  if (strategy === '2_a_day_alternating') {
    const mod = dayIndex % 3;
    return mod === 0 ? ['physics', 'chemistry'] : mod === 1 ? ['chemistry', 'maths'] : ['maths', 'physics'];
  }
  if (strategy === '1_a_day_alternating') {
    const mod = dayIndex % 3;
    return mod === 0 ? ['physics'] : mod === 1 ? ['chemistry'] : ['maths'];
  }
  return ['physics', 'chemistry', 'maths'];
}
```

### Filtering Today's Candidate Pool
In `PlannerEngine.ts` `generateDailyPlan`:
```ts
const splitStrategy = input.userPreferences?.subjectSplitStrategy || '3_a_day';
const currentDateObj = input.currentDate ? new Date(input.currentDate) : new Date();
const currentDayIdx = (currentDateObj.getDay() + 6) % 7; // 0 = Mon ... 6 = Sun
const todayActiveSubjects = getActiveSubjectsForDay(currentDayIdx, splitStrategy);

// Filter candidates for today's mission building
const todayCandidates = candidates.filter(cand => 
  todayActiveSubjects.includes(cand.subjectId)
);
```

Use `todayCandidates` when building `candidateMissions` so `todaysMission` strictly contains tasks for today's active subjects.

---

## Summary of Recommendations for Implementer
1. Export `getActiveSubjectsForDay(dayIndex, strategy)` helper for reusability.
2. In `PlannerEngine.generateDailyPlan`:
   - Compute `todayActiveSubjects` using deterministic `input.currentDate`.
   - Filter candidate tasks for `todaysMission` selection to `todayActiveSubjects`.
   - Ensure `weeklySchedule` loop uses `getActiveSubjectsForDay(day, splitStrategy)`.
3. Verify that `StudyBrainRuntime.ts` forwards `mentorProfile.subjectSplitStrategy` (already present on line 326).
4. Run unit tests (`vitest`) to ensure all test suites pass.
