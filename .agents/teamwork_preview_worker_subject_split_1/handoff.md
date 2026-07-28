# Handoff Report — Subject Split Strategy Feature Implementation

## 1. Observation
- `src/types/index.ts`: Verified `MentorProfile` contains `subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';` at line 533.
- `src/actions/StudyBrainActions.ts`: Added `subjectSplitStrategy: '3_a_day'` to `currentMentor` fallback defaults in `updateMentorProfile` at line 588. Mapped `opt?.scheduleStatus === 'Behind Schedule'` to `'At Risk'` for `PlannerOutputs` type compatibility.
- `src/components/mentor/MentorInterviewModal.tsx`:
  - Upgraded interview wizard to a 6-step flow with step titles: `['Orientation', 'Academic Targets', 'Class & Setup', 'Subject Strategy', 'Reality Audit', 'Roadmap Lock']`.
  - Step counter updated to `Step {step} of 6` and step indicator grid updated to `grid-cols-6 gap-2`.
  - Added dedicated Step 4 for `subjectSplitStrategy` with explicit selection options (`3_a_day`, `2_a_day_alternating`, `1_a_day_alternating`).
  - Added summary card in Step 6 (Roadmap Lock) showing selected `subjectSplitStrategy`.
- `src/runtime/StudyBrainRuntime.ts`: Verified `subjectSplitStrategy: this.state.mentorProfile?.subjectSplitStrategy` is passed in `userPreferences` inside `PlannerInput`.
- `src/engines/planner/PlannerEngine.ts`:
  - Implemented candidate filtering for `todaysMission` based on active day rotation so `todaysMission` matches `weeklySchedule` subject constraints.
  - Rotation rules implemented:
    - `3_a_day`: `['physics', 'chemistry', 'maths']`
    - `2_a_day_alternating`: `Day 0 -> ['physics', 'chemistry']`, `Day 1 -> ['chemistry', 'maths']`, `Day 2 -> ['maths', 'physics']` (modulo 3 pattern).
    - `1_a_day_alternating`: `Day 0 -> ['physics']`, `Day 1 -> ['chemistry']`, `Day 2 -> ['maths']` (modulo 3 pattern).
  - Filtered candidates passed into `todaysMission` candidate selection (`todaysCandidates`).
  - Fixed candidate generation fallback when `input.chapters` is omitted.
- `src/features/mission/PlannerPage.tsx`:
  - Added `subjectSplitStrategy` contextual strategy badge to Daily Focus, Weekly Matrix, and Monthly Strategy headers.
  - Updated local fallback `weeklyMatrix` loop to dynamically adapt daily slots and subject assignments to `subjectSplitStrategy` (`3_a_day`, `2_a_day_alternating`, `1_a_day_alternating`).
  - Displayed day column focus pills in Weekly Matrix view (`PHYSICS ONLY`, `PHY + CHEM`, `ALL 3 SUBJS`).

## 2. Logic Chain
1. Schema & Defaulting: `MentorProfile` includes `subjectSplitStrategy`. Adding `'3_a_day'` as fallback default in `updateMentorProfile` ensures smooth backward compatibility for users without a set strategy.
2. Interview Wizard Upgrade: Moving `subjectSplitStrategy` out of Step 3 into a dedicated Step 4 gives users explicit, clear choices with full descriptions before performing the Chapter Reality Audit in Step 5 and reviewing the summary in Step 6.
3. Engine Candidate Selection: In `PlannerEngine`, determining `currentDayIdx % 3` allowed subjects for today and filtering candidate tasks into `todaysCandidates` guarantees that candidate mission strategies (Balanced, Progression, Practice, Revision, Greedy) generate `todaysMission` adhering strictly to the user's `subjectSplitStrategy`.
4. Matrix & UI Alignment: Updating `PlannerPage.tsx` fallback `weeklyMatrix` loop and adding day column focus pills (`PHYSICS ONLY`, `PHY + CHEM`, `ALL 3 SUBJS`) ensures the UI schedule displays clear, consistent rotation patterns across all 7 days.

## 3. Caveats
No caveats. All edge cases (missing `input.chapters`, unselected strategy fallbacks, modal steps navigation) were handled and tested.

## 4. Conclusion
The Subject Split Strategy feature is completely implemented across the schema, actions, mentor interview modal, planner engine runtime/adaptation, and PlannerPage UI. Type checks (`npx tsc --noEmit`), unit tests (`npx vitest run`), and production build (`npm run build`) all pass with 0 errors.

## 5. Verification Method
To verify independently:
1. Run TypeScript type check:
   `npx tsc --noEmit`
   Output: Exit code 0 (0 errors).
2. Run unit tests:
   `npx vitest run`
   Output: 8 test files passed (27 tests passed).
3. Run production build:
   `npm run build`
   Output: Vite build & esbuild succeeded with 0 errors.
