# Handoff Report — Explorer 2: Subject Split Strategy R2 Engine Analysis

## 1. Observation
- **`src/types/index.ts` (line 533)**: `MentorProfile` includes `subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';`.
- **`src/engines/planner/types.ts` (line 50)**: `PlannerInput.userPreferences` includes `subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';`.
- **`src/runtime/StudyBrainRuntime.ts` (line 326)**: Passes `subjectSplitStrategy: this.state.mentorProfile?.subjectSplitStrategy` when constructing `plannerInput`.
- **`src/engines/planner/PlannerEngine.ts` (lines 665-692)**: Reads `input.userPreferences?.subjectSplitStrategy` inside the 7-day `weeklySchedule` loop to set `allowedSubjects` for each day `0..6` using a modulo-3 rotation:
  - `2_a_day_alternating`: `day % 3 === 0` -> Phys+Chem; `day % 3 === 1` -> Chem+Maths; `day % 3 === 2` -> Maths+Phys.
  - `1_a_day_alternating`: `day % 3 === 0` -> Phys; `day % 3 === 1` -> Chem; `day % 3 === 2` -> Maths.
  - `3_a_day`: Phys+Chem+Maths on all days.
- **`src/engines/planner/PlannerEngine.ts` (lines 495-660)**: Evaluates `candidateMissions` for `todaysMission` across all candidate tasks **without filtering candidates by today's active subjects**. Thus `todaysMission` produces tasks from all 3 subjects regardless of the active `subjectSplitStrategy`.
- **`src/engines/planner/PlannerScoringEngine.ts` (lines 448-457)**: Computes 14-factor scores for candidate tasks independently. Scoring math does not filter or depend on split strategy internally and relies on candidate set pre-filtering upstream.

## 2. Logic Chain
1. `StudyBrainRuntime.ts` correctly forwards `subjectSplitStrategy` from `mentorProfile` to `PlannerInput`.
2. `PlannerEngine.ts` calculates subject availability per day in `weeklySchedule` using modulo-3 pattern: `day % 3` where Day 0 = Monday, Day 1 = Tuesday, Day 2 = Wednesday, Day 3 = Thursday, Day 4 = Friday, Day 5 = Saturday, Day 6 = Sunday.
3. However, `PlannerEngine.ts` omits filtering the candidates used for building `todaysMission`. Because `todaysMission` uses unfiltered `candidates`, a student with `1_a_day_alternating` currently gets a multi-subject daily plan for today, even though `weeklySchedule[currentDayIdx]` is single-subject.
4. Filtering `candidates` by `getActiveSubjectsForDay(currentDayIdx, splitStrategy)` before generating `todaysMission` ensures `todaysMission` strictly complies with the selected split strategy.
5. `PlannerScoringEngine.ts` scores candidate tasks based on context. Pre-filtering candidates before scoring/selection is clean, modular, and requires 0 changes to `PlannerScoringEngine.ts` scoring algorithms.

## 3. Caveats
- Day index calculation in `PlannerEngine.ts` relies on `(date.getDay() + 6) % 7` (0 = Monday, 6 = Sunday). If `input.currentDate` is provided, `new Date(input.currentDate)` must be used for deterministic testing instead of `new Date()`.
- If an active subject has 0 candidate tasks available (e.g. 100% completed), fallback handling should ensure candidate selection does not return an empty mission if other active subjects or revision tasks exist.

## 4. Conclusion
R2 engine adaptation requires:
1. Adding a helper function `getActiveSubjectsForDay(dayIdx, strategy)` in `PlannerEngine.ts`.
2. Updating `PlannerEngine.generateDailyPlan` to filter `candidates` for `todaysMission` selection based on today's active subjects.
3. Aligning `todaysMission` and `weeklySchedule` so both strictly honor `subjectSplitStrategy`.
4. No changes needed in `PlannerScoringEngine.ts` math formulas.

## 5. Verification Method
- **Command**: `npx vitest run src/engines/planner/PlannerEngine.test.ts`
- **Unit Test Verification**:
  - Test `3_a_day`: Verify `todaysMission` contains tasks across Physics, Chemistry, Mathematics.
  - Test `2_a_day_alternating` on Day 0 (Mon): Verify `todaysMission` ONLY contains Physics and Chemistry tasks (0 Maths tasks).
  - Test `1_a_day_alternating` on Day 0 (Mon): Verify `todaysMission` ONLY contains Physics tasks (0 Chem or Maths tasks).
  - Test `1_a_day_alternating` on Day 1 (Tue): Verify `todaysMission` ONLY contains Chemistry tasks.
