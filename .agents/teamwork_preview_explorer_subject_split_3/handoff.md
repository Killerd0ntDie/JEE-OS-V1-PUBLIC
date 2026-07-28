# Handoff Report: R3 Subject Split Strategy (Header Badges & 7-Day Matrix Adaptation)

**Agent**: Explorer 3  
**Role**: Read-only investigator  
**Working Directory**: `.agents/teamwork_preview_explorer_subject_split_3`  
**Handoff Type**: Hard Handoff (Task Complete)  

---

## 1. Observation

Direct observations from source file inspection and codebase tool execution:

1. **File Locations & Definitions**:
   - `PlannerPage.tsx` is located at `src/features/mission/PlannerPage.tsx` (1064 lines).
   - `MentorProfile` in `src/types/index.ts:533` defines `subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating'`.
   - `StudyBrainRuntime.ts:326` passes `subjectSplitStrategy` from `state.mentorProfile` into `PlannerInput.userPreferences`.

2. **Master Control Bar Badges (`PlannerPage.tsx:470–475`)**:
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

3. **Sub-Header Strategy Badge Gaps**:
   - **Daily Focus View (`lines 616–677`)**: Displays Prev/Next Day, `fullDayNames[selectedDayIndex]`, TODAY / Past / Upcoming status, date, and `dailyCapHours`, but lacks `subjectSplitStrategy` badge and daily focus subject indicator.
   - **Weekly Matrix View (`lines 550–609 & 736–773`)**: Header bar and day column headers (`{dayName}`) do not show aggregate strategy or column-level subject focus pills.
   - **Monthly Strategy View (`lines 827–849`)**: Shows monthly objective, description, and CTA, but omits strategy badge.

4. **Fallback Matrix Hardcoded Mismatch (`PlannerPage.tsx:183–292`)**:
   - Fallback `weeklyMatrix` loop hardcodes:
     - Morning slot: `dayIndex % 3 === 0 ? 'physics' : dayIndex % 3 === 1 ? 'chemistry' : 'maths'`
     - Afternoon slot: `dayIndex % 3 === 0 ? 'chemistry' : dayIndex % 3 === 1 ? 'maths' : 'physics'`
     - Evening slot: `dayIndex % 3 === 0 ? 'maths' : dayIndex % 3 === 1 ? 'physics' : 'chemistry'`
     - Night slot: `revision`
   - **Observation**: Hardcodes 3 core subjects per day regardless of whether `subjectSplitStrategy` is `3_a_day`, `2_a_day_alternating`, or `1_a_day_alternating`.

5. **Engine Matrix Filtering (`PlannerEngine.ts:672–676`)**:
   - `PlannerEngine.ts` filters candidates via:
     - `2_a_day_alternating`: Day 0,3,6: `[physics, chemistry]`, Day 1,4: `[chemistry, maths]`, Day 2,5: `[maths, physics]`
     - `1_a_day_alternating`: Day 0,3,6: `[physics]`, Day 1,4: `[chemistry]`, Day 2,5: `[maths]`

---

## 2. Logic Chain

1. **Premise**: R3 requires displaying `subjectSplitStrategy` in each view mode's header and adapting the 7-day schedule matrix daily slots to the selected strategy.
2. **Step 1 (Header Views)**: Currently, only the top master control bar has a static badge. Each of the three view modes (Daily Focus, Weekly Matrix, Monthly Strategy) lacks context-specific strategy badges and daily subject focus indicators.
   - *Inference*: Sub-headers should be enhanced to include strategy badges and day-level focus indicators so the user always understands why certain subjects appear on specific days.
3. **Step 2 (7-Day Matrix Slots)**: The `weeklyMatrix` hook in `PlannerPage.tsx` relies on `PlannerEngine` when `plannerOutput` is populated, but falls back to local generation when `plannerOutput` is empty or loading.
   - *Inference*: The fallback generation in `PlannerPage.tsx` currently forces 3 subjects per day on every day, breaking the contract for `2_a_day_alternating` and `1_a_day_alternating`.
4. **Step 3 (Slot Adaptability)**:
   - `3_a_day`: 4 slots (Phys Lecture, Chem DPP, Math PYQs, Night Revision).
   - `2_a_day_alternating`: 4 slots focused on the 2 allowed subjects for that day (e.g. Phys Lecture, Phys DPP, Chem Theory & PYQs, Night Revision).
   - `1_a_day_alternating`: 4 slots focused on the 1 allowed subject for that day (e.g. Phys Lecture, Phys DPP, Phys PYQs, Night Revision).
5. **Conclusion**: Aligning `weeklyMatrix` fallback generation with `PlannerEngine` candidate filtering and inserting contextual strategy badges in all three view mode headers delivers a seamless, consistent user experience.

---

## 3. Caveats

1. **Read-Only Investigation Scope**: As Explorer 3, no modifications were made to `src/` source code files. Implementation should be carried out by Implementer agent.
2. **PlannerEngine Output vs Local Fallback**: When `state.plannerOutput?.weeklySchedule` is present, `PlannerEngine` output takes precedence. The fallback matrix logic must mirror `PlannerEngine`'s subject filtering rules.
3. **Day Index Mapping Assumption**: `dayIndex` is mapped as `0 = Monday, 6 = Sunday` using `(new Date().getDay() + 6) % 7`.

---

## 4. Conclusion

- **Header Integration**: Contextual strategy badges (`subjectSplitStrategy`) should be added to the sub-headers of Daily Focus, Weekly Matrix, and Monthly Strategy views, including day-column sub-badges (`PHYSICS ONLY`, `PHY + CHEM`, `ALL 3 SUBJS`).
- **Matrix Adaptability**: Both `PlannerEngine.ts` and the `weeklyMatrix` fallback generation in `PlannerPage.tsx` must strictly use `getSubjectsForDay(dayIndex, strategy)` to structure daily slots.
- Detailed design blueprints, code snippets, and diff templates are provided in `analysis.md`.

---

## 5. Verification Method

To independently verify the investigation findings and test future implementation:

1. **Inspect Target Files**:
   - `src/features/mission/PlannerPage.tsx` (lines 108–296 for matrix generation, lines 612–900 for view modes and headers).
   - `src/engines/planner/PlannerEngine.ts` (lines 665–691 for strategy filtering).
2. **Execute Test Suite**:
   - Run `npx vitest run` from project root to ensure unit tests execute.
3. **Verify Matrix Generation Behavior**:
   - Change `subjectSplitStrategy` in `mentorProfile` to `1_a_day_alternating`, `2_a_day_alternating`, and `3_a_day`.
   - Verify that `weeklyMatrix` produces 1, 2, or 3 subjects per day matching the rotation schedule.
4. **Verify UI Rendering**:
   - Check that header strategy badges appear in Daily Focus, Weekly Matrix, and Monthly Strategy views.
