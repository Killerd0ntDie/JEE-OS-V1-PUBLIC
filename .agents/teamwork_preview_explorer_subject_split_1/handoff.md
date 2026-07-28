# Explorer 1 Handoff Report — R1 Subject Split Strategy

## 1. Observation
Direct codebase observations:
1. **`src/types/index.ts` (lines 522–535)**:
   ```typescript
   export interface MentorProfile {
     targetExams: Array<'JEE Main' | 'JEE Advanced' | 'Boards' | 'MHT CET' | 'BITSAT' | 'Others'>;
     targetYear: string;
     targetPercentile: string;
     targetRank: string;
     targetCollege: string;
     targetBranch: string;
     currentClass: '11th' | '12th' | 'Dropper';
     coachingType: 'Online Coaching' | 'Offline Coaching' | 'Self Study' | 'School + Coaching';
     coachingName?: string;
     dailyAvailableHours: number;
     subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';
     interviewCompleted: boolean;
     ...
   }
   ```
2. **`src/engines/planner/types.ts` (line 50)**:
   ```typescript
   subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';
   ```
3. **`src/engines/planner/PlannerEngine.ts` (lines 668–677)**:
   ```typescript
   const splitStrategy = input.userPreferences?.subjectSplitStrategy || '3_a_day';

   for (let day = 0; day < 7; day++) {
     let allowedSubjects: string[] = ['physics', 'chemistry', 'maths'];
     if (splitStrategy === '2_a_day_alternating') {
       allowedSubjects = day % 3 === 0 ? ['physics', 'chemistry'] : day % 3 === 1 ? ['chemistry', 'maths'] : ['maths', 'physics'];
     } else if (splitStrategy === '1_a_day_alternating') {
       allowedSubjects = day % 3 === 0 ? ['physics'] : day % 3 === 1 ? ['chemistry'] : ['maths'];
     }
   ```
4. **`src/runtime/StudyBrainRuntime.ts` (line 326)**:
   ```typescript
   subjectSplitStrategy: this.state.mentorProfile?.subjectSplitStrategy
   ```
5. **`src/actions/StudyBrainActions.ts` (lines 578–589)**:
   `updateMentorProfile` defines default fallback object without `subjectSplitStrategy`, which should explicitly include `subjectSplitStrategy: '3_a_day'`.
6. **`src/components/mentor/MentorInterviewModal.tsx`**:
   - Currently implemented as 5 steps (`Step {step} of 5`, `stepTitles` length 5, `grid-cols-5`).
   - Line 55: `const [subjectSplitStrategy, setSubjectSplitStrategy] = useState<'3_a_day' | '2_a_day_alternating' | '1_a_day_alternating'>(state.mentorProfile?.subjectSplitStrategy || '3_a_day');`
   - Lines 568–593: `subjectSplitStrategy` option selection buttons are embedded inside Step 3 ("Class & Setup").
   - Line 149: `handleFinishInterview` passes `subjectSplitStrategy: subjectSplitStrategy` to `actions.completeMentorInterview`.

---

## 2. Logic Chain
1. **Observation 1 & 2** confirm that `MentorProfile` and `PlannerInput['userPreferences']` already declare `subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';`.
2. **Observation 3 & 4** show that `PlannerEngine.ts` and `StudyBrainRuntime.ts` already support reading `subjectSplitStrategy` and calculating daily subject rotations for the 7-day schedule matrix.
3. **Observation 5** demonstrates that `StudyBrainActions.ts` handles saving `mentorData.subjectSplitStrategy` when completing the interview, but `updateMentorProfile` fallback needs `subjectSplitStrategy: '3_a_day'` to avoid missing property warnings when resetting or updating default profiles.
4. **Observation 6** reveals that while `MentorInterviewModal.tsx` contains state and save handlers for `subjectSplitStrategy`, it currently embeds the selection into Step 3 instead of providing a dedicated step. Upgrading the wizard from 5 steps to 6 steps creates a clean, dedicated Step 4 ("Subject Strategy") with explicit descriptions for each strategy (`3_a_day`, `2_a_day_alternating`, `1_a_day_alternating`) and adds a summary card in the final Roadmap Lock step.

---

## 3. Caveats
- No unit test suite exists specifically for `MentorInterviewModal.tsx` step navigation; verification must rely on TypeScript build checking (`npx tsc --noEmit` or `npm run build`) and manual UI testing.
- `subjectSplitStrategy` remains optional (`?`) on `MentorProfile` to preserve backward compatibility for existing persisted profiles in localStorage / backend.

---

## 4. Conclusion
The Subject Split Strategy backend execution engine (`PlannerEngine.ts`), runtime bridge (`StudyBrainRuntime.ts`), and type contracts (`types/index.ts`) are fully in place. The primary work remaining for the implementer is:
1. Add explicit `subjectSplitStrategy: '3_a_day'` default fallback in `StudyBrainActions.ts` line 578.
2. Upgrade `MentorInterviewModal.tsx` from 5 steps to 6 steps, extracting `subjectSplitStrategy` into its own dedicated Step 4 with rich options (`3_a_day`, `2_a_day_alternating`, `1_a_day_alternating`), updating step indices, progress bar grid, and adding a summary tile to Step 6 ("Roadmap Lock").

Detailed step-by-step code snippets and diff proposals have been saved to `analysis.md`.

---

## 5. Verification Method
1. Inspect `analysis.md` for exact drop-in replacement chunks.
2. Run `npx tsc --noEmit` from project root `c:\Users\Mani\Downloads\jee-os (10)` to verify type compliance.
3. Launch development server (`npm run dev`) and test the Diagnostic Interview wizard flow (Steps 1 through 6), ensuring:
   - Step 4 displays all 3 strategies with correct labels and descriptions.
   - Selecting any strategy persists upon completion of the interview.
   - The final Step 6 summary card reflects the selected strategy.
