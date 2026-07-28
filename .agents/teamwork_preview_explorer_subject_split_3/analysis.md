# Detailed Analysis Report: PlannerPage Header Strategy Badges & 7-Day Matrix Adaptation

**Explorer**: Explorer 3  
**Feature**: Subject Split Strategy (R3 - PlannerPage Integration)  
**Working Directory**: `.agents/teamwork_preview_explorer_subject_split_3`  
**Target Files**: `src/features/mission/PlannerPage.tsx`, `src/engines/planner/PlannerEngine.ts`, `src/types/index.ts`  

---

## 1. Executive Summary

This report provides a comprehensive architectural and UX analysis of `src/features/mission/PlannerPage.tsx` for Round 3 (R3) of the Subject Split Strategy feature. Specifically, it details:
1. How header views (**Daily Focus**, **Weekly Matrix**, and **Monthly Strategy**) display active profile info and strategy badges.
2. How the 7-day schedule matrix generates daily slots and subjects per day.
3. Precise specifications and recommendations for displaying `subjectSplitStrategy` badges across all header view modes and adapting 7-day matrix daily slots to the selected strategy (`3_a_day`, `2_a_day_alternating`, `1_a_day_alternating`).

---

## 2. Examination of Header Views & Strategy Badge Display

### 2.1 Current Implementation in `PlannerPage.tsx`

`PlannerPage.tsx` contains a top-level Header & Control Bar (lines 359–485) and three distinct View Modes selected via a 3-way segmented control (lines 564–608):
- `viewMode === 'daily'` (Daily Focus)
- `viewMode === 'weekly'` (Weekly Matrix)
- `viewMode === 'monthly'` (Monthly Strategy)

#### Top Master Header Bar (Lines 455–484)
In the master control bar at line 471–475, there is a global badge displaying `subjectSplitStrategy`:
```tsx
<div className="flex items-center gap-2">
  <span className="text-zinc-500">Subject Split:</span>
  <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 font-bold">
    {mentorProfile?.subjectSplitStrategy === '1_a_day_alternating' 
      ? '1 Subject Focus' 
      : mentorProfile?.subjectSplitStrategy === '2_a_day_alternating' 
      ? '2 Subjects Alternating' 
      : '3 Subjects Daily'}
  </span>
</div>
```

#### Missing/Inconsistent Badge Display in Sub-Headers by View Mode

1. **Daily Focus View Mode Header (Lines 616–677)**
   - **Current State**: Shows Prev Day / Next Day / Jump to Today buttons, selected day name (`fullDayNames[selectedDayIndex]`), status pill (`TODAY` / `Past Day History` / `Upcoming Schedule`), date string, and daily capacity budget (`{dailyCapHours} hrs`).
   - **Gap**: Does **NOT** display the user's active `subjectSplitStrategy` badge, nor does it indicate what subjects are scheduled for the selected day under that strategy (e.g. "Physics Focus Day" or "Physics & Chemistry Day").

2. **Weekly Matrix View Mode Header (Lines 550–609 & Lines 736–773)**
   - **Current State**: Shows the section header "Academic Schedule & Strategy Engine" and the 3-way view mode toggle. Each day column header (lines 756–773) shows `{dayName}` and `{dailyCapHours}h →`.
   - **Gap**: The section header lacks an aggregate strategy badge (e.g. `[ Strategy: 2-Subject Alternating Split ]`). Furthermore, individual day column headers do **NOT** show day-level subject focus pills (e.g. `PHY + CHEM` or `PHYSICS ONLY`).

3. **Monthly Strategy View Mode Header (Lines 827–849)**
   - **Current State**: Shows "Monthly Strategic Objective", target category title, description, and "Set Monthly Goal" CTA button.
   - **Gap**: Lacks any badge or indicator showing how the daily/weekly `subjectSplitStrategy` aligns with the 4-week roadmap execution.

---

## 3. Examination of 7-Day Schedule Matrix Daily Slots & Subject Generation

### 3.1 `weeklyMatrix` Generation Logic (`PlannerPage.tsx`, Lines 108–296)

The `weeklyMatrix` hook evaluates schedule blocks using three conditional branches:

```
weeklyMatrix (useMemo)
 ├── Branch A: isToday && state.todayMissions.length > 0
 │     └── Maps todayMissions directly to WeeklyBlocks
 ├── Branch B: state.plannerOutput?.weeklySchedule[dayIndex] exists
 │     └── Maps PlannerEngine's 7-day weekly schedule output
 └── Branch C: FALLBACK MATRIX GENERATION (Lines 183–292)
       └── Generates fallback WeeklyBlocks when plannerWeekly is missing
```

### 3.2 Critical Fallback Mismatch Discovered

In **Branch C (Fallback Matrix Generation)**:
```tsx
const morningSubj: SubjectId = dayIndex % 3 === 0 ? 'physics' : dayIndex % 3 === 1 ? 'chemistry' : 'maths';
... // Morning slot block added
const afternoonSubj: SubjectId = dayIndex % 3 === 0 ? 'chemistry' : dayIndex % 3 === 1 ? 'maths' : 'physics';
... // Afternoon slot block added
const eveningSubj: SubjectId = dayIndex % 3 === 0 ? 'maths' : dayIndex % 3 === 1 ? 'physics' : 'chemistry';
... // Evening slot block added
... // Night revision block added
```

**Finding**: The fallback generation logic **completely ignores `subjectSplitStrategy`**!
- It hardcodes 3 distinct subjects per day (Morning = Subj 1, Afternoon = Subj 2, Evening = Subj 3) + Night Revision regardless of whether `subjectSplitStrategy` is set to `3_a_day`, `2_a_day_alternating`, or `1_a_day_alternating`.
- If a student sets their strategy to `1_a_day_alternating` (e.g. Monday = Physics Day), the fallback schedule still generates Physics, Chemistry, and Maths tasks on Monday!

### 3.3 Engine Generation Alignment (`PlannerEngine.ts`, Lines 665–691)

In `PlannerEngine.ts`:
```ts
const splitStrategy = input.userPreferences?.subjectSplitStrategy || '3_a_day';

for (let day = 0; day < 7; day++) {
  let allowedSubjects: string[] = ['physics', 'chemistry', 'maths'];
  if (splitStrategy === '2_a_day_alternating') {
    allowedSubjects = day % 3 === 0 ? ['physics', 'chemistry'] : day % 3 === 1 ? ['chemistry', 'maths'] : ['maths', 'physics'];
  } else if (splitStrategy === '1_a_day_alternating') {
    allowedSubjects = day % 3 === 0 ? ['physics'] : day % 3 === 1 ? ['chemistry'] : ['maths'];
  }

  const dayCandidates = candidates.filter(cand => 
    allowedSubjects.includes(cand.subjectId) || cand.subjectId === ('revision' as any)
  );
  ...
}
```
`PlannerEngine.ts` properly filters candidate tasks by `allowedSubjects`, but `PlannerPage.tsx` fallback matrix does not share this subject filtering logic.

---

## 4. Design & Functional Specifications for R3 Strategy Adaptation

### 4.1 Daily Slot Adaptation by Strategy

| Strategy | Daily Subject Allocation | Daily Slot Breakdown (4 Slots / Day) | Rotation Pattern across 7 Days (Mon–Sun) |
|---|---|---|---|
| **`3_a_day`** (Default) | 3 Core Subjects Daily + Spaced Revision | **Slot 1 (Morning)**: Subject 1 Lecture/Theory<br>**Slot 2 (Afternoon)**: Subject 2 DPP Practice<br>**Slot 3 (Evening)**: Subject 3 PYQs Drill<br>**Slot 4 (Night)**: Spaced Revision & Mistakes Review | **Mon**: Phys/Chem/Math<br>**Tue**: Chem/Math/Phys<br>**Wed**: Math/Phys/Chem<br>**Thu**: Phys/Chem/Math<br>**Fri**: Chem/Math/Phys<br>**Sat**: Math/Phys/Chem<br>**Sun**: Phys/Chem/Math |
| **`2_a_day_alternating`** | 2 Core Subjects Daily + Spaced Revision | **Slot 1 (Morning)**: Subj A Lecture/Theory<br>**Slot 2 (Afternoon)**: Subj A DPP/Practice<br>**Slot 3 (Evening)**: Subj B Theory & PYQs<br>**Slot 4 (Night)**: Spaced Revision & Mistakes Review | **Mon, Thu, Sun**: Physics & Chemistry<br>**Tue, Fri**: Chemistry & Maths<br>**Wed, Sat**: Maths & Physics |
| **`1_a_day_alternating`** | 1 Core Subject Daily + Spaced Revision | **Slot 1 (Morning)**: Focus Subj Watch Lecture<br>**Slot 2 (Afternoon)**: Focus Subj Solve DPPs<br>**Slot 3 (Evening)**: Focus Subj Solve PYQs Drill<br>**Slot 4 (Night)**: Spaced Revision & Error Audit | **Mon, Thu, Sun**: Physics Focus Day<br>**Tue, Fri**: Chemistry Focus Day<br>**Wed, Sat**: Maths Focus Day |

### 4.2 Helper Logic for Subject Allocation

To ensure unified behavior between fallback matrix and engine rendering, define helper functions:

```typescript
export function getSubjectsForDay(dayIndex: number, strategy: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating'): SubjectId[] {
  if (strategy === '1_a_day_alternating') {
    const rotation: SubjectId[] = ['physics', 'chemistry', 'maths'];
    return [rotation[dayIndex % 3]];
  }
  if (strategy === '2_a_day_alternating') {
    const pairs: [SubjectId, SubjectId][] = [
      ['physics', 'chemistry'],
      ['chemistry', 'maths'],
      ['maths', 'physics']
    ];
    return pairs[dayIndex % 3];
  }
  return ['physics', 'chemistry', 'maths'];
}
```

### 4.3 Proposed Header Badges Design across View Modes

#### A. Daily Focus View Header Badge
Render in `PlannerPage.tsx` around line 648:
```tsx
<div className="flex items-center gap-2 flex-wrap">
  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-800/80 text-purple-300 flex items-center gap-1.5">
    <Layers className="w-3 h-3 text-purple-400" />
    Strategy: {strategyLabel}
  </span>
  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/80 text-indigo-300">
    Focus: {dayFocusSubjectText}
  </span>
</div>
```

#### B. Weekly Matrix Sub-Header & Day Column Badges
1. **Matrix Sub-Header Bar (Line 552)**:
   Add a strategy summary pill: `[ ⚡ Active Split: 2-Subject Alternating ]`.
2. **Day Column Header (Line 765)**:
   Add a mini badge under the day name:
   - `1_a_day_alternating`: `<span className="...">PHYSICS ONLY</span>`
   - `2_a_day_alternating`: `<span className="...">PHY + CHEM</span>`
   - `3_a_day`: `<span className="...">ALL 3 SUBJS</span>`

#### C. Monthly Strategy View Header Badge
Render in the Monthly Strategic Objective banner (around line 835):
```tsx
<span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/80 border border-purple-800/80 px-2.5 py-1 rounded-full flex items-center gap-1">
  <Layers className="w-3 h-3 text-purple-400" />
  Pacing Strategy: {strategyLabel} ({strategyDaysDescription})
</span>
```

---

## 5. Summary of Recommended Code Changes

1. **Refactor Fallback Matrix Generation in `PlannerPage.tsx`**:
   - Update `weeklyMatrix` to use `getSubjectsForDay(dayIndex, strategy)`.
   - For `1_a_day_alternating`: generate Morning (Lecture), Afternoon (DPP), Evening (PYQs) all for the single daily focus subject, plus Night Revision.
   - For `2_a_day_alternating`: generate Morning (Subj A Lecture), Afternoon (Subj A DPP), Evening (Subj B PYQs), plus Night Revision.
   - For `3_a_day`: maintain 3 rotated core subjects + Night Revision.
2. **Add View-Specific Strategy Badges**:
   - Inject strategy & daily subject focus badges in **Daily Focus Header**, **Weekly Matrix Grid Header & Columns**, and **Monthly Strategy Header**.
3. **Verification**:
   - Test UI rendering across all 3 view modes under each of the 3 `subjectSplitStrategy` values.

---

**Report Compiled by Explorer 3**  
*Read-only analysis complete.*
