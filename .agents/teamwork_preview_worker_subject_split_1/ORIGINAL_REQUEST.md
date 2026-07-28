## 2026-07-24T02:18:03Z

You are Worker 1 implementing the Subject Split Strategy feature in JEE-OS.
Working Directory: c:\Users\Mani\Downloads\jee-os (10)\.agents\teamwork_preview_worker_subject_split_1
Project Root: c:\Users\Mani\Downloads\jee-os (10)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:

1. R1: Schema & MentorInterviewModal UI
   - `src/types/index.ts`: Ensure `MentorProfile` has `subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';`.
   - `src/actions/StudyBrainActions.ts`: In `updateMentorProfile`, include `subjectSplitStrategy: '3_a_day'` in fallback defaults.
   - `src/components/mentor/MentorInterviewModal.tsx`:
     - Upgrade interview wizard to a 6-step flow with dedicated Step 4 for Subject Strategy.
     - Add explicit selection step for `subjectSplitStrategy` with options:
       - `3_a_day`: Study Physics, Chemistry, and Mathematics every day.
       - `2_a_day_alternating`: Study 2 subjects per day with alternating rotation (Phys+Chem -> Chem+Maths -> Maths+Phys).
       - `1_a_day_alternating`: Study 1 subject per day with daily rotation (Physics -> Chemistry -> Maths).
     - Update progress bar / step titles / step indicator grid to 6 steps.
     - Add summary card to final Roadmap Lock step showing selected `subjectSplitStrategy`.

2. R2: Engine Adaptation
   - `src/runtime/StudyBrainRuntime.ts`: Pass `subjectSplitStrategy: this.state.mentorProfile?.subjectSplitStrategy` to `PlannerInput`.
   - `src/engines/planner/PlannerEngine.ts`:
     - Implement candidate filtering for `todaysMission` based on active day rotation so `todaysMission` matches `weeklySchedule` subject constraints.
     - Rotation rules:
       - `3_a_day`: ['physics', 'chemistry', 'maths']
       - `2_a_day_alternating`: Day 0 -> ['physics', 'chemistry'], Day 1 -> ['chemistry', 'maths'], Day 2 -> ['maths', 'physics'] (modulo 3 pattern).
       - `1_a_day_alternating`: Day 0 -> ['physics'], Day 1 -> ['chemistry'], Day 2 -> ['maths'] (modulo 3 pattern).
     - Filter candidates passed into `todaysMission` candidate selection.

3. R3: UI Integration & 7-Day Matrix Consistency (`PlannerPage.tsx`)
   - `src/features/mission/PlannerPage.tsx`:
     - Add `subjectSplitStrategy` contextual strategy badge to Daily Focus, Weekly Matrix, and Monthly Strategy headers.
     - Update local fallback `weeklyMatrix` loop so daily slots and subject assignments dynamically adapt to `subjectSplitStrategy` (`3_a_day`, `2_a_day_alternating`, `1_a_day_alternating`).
     - Display day column focus pills in Weekly Matrix view (`PHYSICS ONLY`, `PHY + CHEM`, `ALL 3 SUBJS`).

4. Verification:
   - Run type check (`npx tsc --noEmit`) and unit tests (`npx vitest run` or tests).
   - Run `npm run build` and ensure build succeeds with 0 errors.
   - Document all changes and verification outputs in your handoff report `handoff.md`. Send a message to parent when done.
