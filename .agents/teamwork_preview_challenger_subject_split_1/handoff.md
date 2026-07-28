# Formal Challenger Handoff Report: PlannerEngine Subject Split Strategy

## 1. Observation

### Target Under Test
- **File**: `src/engines/planner/PlannerEngine.ts`
- **Method**: `PlannerEngine.prototype.generateDailyPlan(input: PlannerInput): PlannerOutput`
- **Test File Created**: `src/engines/planner/PlannerEngine.subjectSplit.test.ts`
- **Execution Commands**:
  - Test command: `npx vitest run` (10 test files passed, 46 tests passed in 723ms)
  - Build command: `npm run build` (vite build + esbuild server completed successfully in 8.64s)

### Verbatim Findings & Test Data

1. **Rotation Behavior Across Days 0..6 (Mon..Sun)**
   - **Day Indexing Formula**: Line 499 in `PlannerEngine.ts`:
     `const currentDayIdx = (todayDate.getDay() + 6) % 7;` (Maps Monday=0 .. Sunday=6).
   - **`3_a_day` Strategy**:
     - Day 0 (Mon) .. Day 6 (Sun): `['physics', 'chemistry', 'maths']` active every day.
     - *Status*: **VERIFIED PASS**. All 3 subjects active on all 7 days in both `todaysMission` and `weeklySchedule`.
   - **`2_a_day_alternating` Strategy**:
     - Line 504: `currentDayIdx % 3 === 0 ? ['physics', 'chemistry'] : currentDayIdx % 3 === 1 ? ['chemistry', 'maths'] : ['maths', 'physics']`
     - Day 0 (Mon): `physics`, `chemistry` active | `maths` inactive
     - Day 1 (Tue): `chemistry`, `maths` active | `physics` inactive
     - Day 2 (Wed): `maths`, `physics` active | `chemistry` inactive
     - Day 3 (Thu): `physics`, `chemistry` active | `maths` inactive
     - Day 4 (Fri): `chemistry`, `maths` active | `physics` inactive
     - Day 5 (Sat): `maths`, `physics` active | `chemistry` inactive
     - Day 6 (Sun): `physics`, `chemistry` active | `maths` inactive
     - *Status*: **VERIFIED PASS**. Rotation correctly alternates 2 active subjects per day in a 3-day cyclic pattern.
   - **`1_a_day_alternating` Strategy**:
     - Line 506: `currentDayIdx % 3 === 0 ? ['physics'] : currentDayIdx % 3 === 1 ? ['chemistry'] : ['maths']`
     - Day 0 (Mon): `physics` active | `chemistry`, `maths` inactive
     - Day 1 (Tue): `chemistry` active | `physics`, `maths` inactive
     - Day 2 (Wed): `maths` active | `physics`, `chemistry` inactive
     - Day 3 (Thu): `physics` active | `chemistry`, `maths` inactive
     - Day 4 (Fri): `chemistry` active | `physics`, `maths` inactive
     - Day 5 (Sat): `maths` active | `physics`, `chemistry` inactive
     - Day 6 (Sun): `physics` active | `chemistry`, `maths` inactive
     - *Status*: **VERIFIED PASS**. Rotation correctly isolates 1 active subject per day in a 3-day cyclic pattern.

2. **Candidate Selection & Inactive Subject Filtering**
   - **Normal Case (Active subject candidates exist)**:
     - Filtering logic at lines 509-511:
       `const filteredTodaysCandidates = candidates.filter(cand => todayAllowedSubjects.includes(cand.subjectId) || cand.subjectId === ('revision' as any));`
     - When active subject candidates are present, `todaysMission` strictly excludes inactive subjects across all 3 strategies.
   - **Empirically Discovered Fallback Flaw (Active subject candidates = 0)**:
     - Line 512: `const todaysCandidates = filteredTodaysCandidates.length > 0 ? filteredTodaysCandidates : candidates;`
     - *Observation*: If the student has zero tasks available in today's allowed subject(s) (e.g. Day 0 Physics day under `1_a_day_alternating`, but student has only started Maths chapters), `filteredTodaysCandidates.length === 0`.
     - Line 512 falls back to `candidates` (unfiltered candidate pool).
     - *Result*: Inactive subjects (e.g. `maths`) leak into `todaysMission`, violating strict exclusion rules.

3. **`weeklySchedule` Matrix Integrity**
   - Lines 688-711 construct `weeklySchedule[0..6]`.
   - Each day `day` (0..6) correctly filters `candidates` by `allowedSubjects` for that day index.
   - *Observation*: If `dayCandidates` is empty for a day in `weeklySchedule`, line 710 falls back to `todaysMission.filter(t => allowedSubjects.includes(t.subjectId))`. If `todaysMission` has no matching tasks for that future day's rotation, `weeklySchedule[day]` becomes `[]`.

---

## 2. Logic Chain

1. **Rotation Verification**:
   - `todayDate.getDay()` returns 0 (Sun) to 6 (Sat).
   - `(todayDate.getDay() + 6) % 7` transforms Sunday to index 6, Monday to 0, Tuesday to 1, etc.
   - Modulo 3 arithmetic (`dayIdx % 3`) maps:
     - 0 -> Physics (or Phys+Chem)
     - 1 -> Chem (or Chem+Maths)
     - 2 -> Maths (or Maths+Phys)
     - 3 -> Physics (or Phys+Chem)
     - 4 -> Chem (or Chem+Maths)
     - 5 -> Maths (or Maths+Phys)
     - 6 -> Physics (or Phys+Chem)
   - Empirical testing confirmed that subject lists returned for `todaysMission` and `weeklySchedule` match this schedule across all 7 days for `3_a_day`, `2_a_day_alternating`, and `1_a_day_alternating`.

2. **Strict Exclusion Verification**:
   - In standard multi-subject progress states, `todaysMission` contains zero tasks from inactive subjects for any strategy.
   - However, empirical stress-testing revealed a edge-case vulnerability in line 512:
     If `filteredTodaysCandidates.length === 0`, `todaysCandidates` falls back to `candidates`. Because `candidates` contains tasks from all subjects, inactive subjects bypass filtering.
   - To guarantee strict exclusion under all edge cases, line 512 should be updated to `const todaysCandidates = filteredTodaysCandidates;` rather than falling back to `candidates`.

---

## 3. Caveats

- **Mock Remediation & Revision Backlog Tasks**: Tasks generated for mock remediation or revision backlog are assigned `subjectId: node.subject`. They respect subject filtering during `filteredTodaysCandidates` filtering when candidate tasks exist, but will leak if the fallback on line 512 is triggered.
- **Dead Code Check**: `cand.subjectId === ('revision' as any)` in line 510 never evaluates to true because revision tasks are tagged with their chapter's actual subject ID (`'physics'`, `'chemistry'`, or `'maths'`).

---

## 4. Conclusion

**Verdict**: **PASS WITH 1 MEDIUM-SEVERITY FLAW NOTED**

1. The Subject Split Strategy rotation across days 0..6 is **fully correct** for `3_a_day`, `2_a_day_alternating`, and `1_a_day_alternating` in both `todaysMission` and `weeklySchedule`.
2. `todaysMission` candidate selection **strictly excludes inactive subjects** in standard operation when candidates exist for active subjects.
3. **Flaw Identified**: Line 512 in `PlannerEngine.ts` falls back to unfiltered `candidates` when `filteredTodaysCandidates` is empty. This allows inactive subjects to leak into `todaysMission` when a user has zero candidates in today's active subject(s).
4. Automated tests (`npx vitest run`) and build (`npm run build`) execute cleanly and pass 100%.

---

## 5. Verification Method

To independently verify these findings:

1. **Run Vitest Test Suite**:
   ```bash
   npx vitest run src/engines/planner/PlannerEngine.subjectSplit.test.ts
   ```
   *Expected result*: 6 passed tests verifying rotation for all 3 strategies across days 0..6 and confirming the fallback flaw on empty active candidate sets.

2. **Run Full Test & Build Check**:
   ```bash
   npx vitest run
   npm run build
   ```
   *Expected result*: All 10 test files pass (46 tests total); build succeeds without error.

---

## Adversarial Challenge Report

### Challenge Summary
- **Overall risk assessment**: **MEDIUM** (Rotation logic is solid; fallback leak occurs only under specific single-subject or empty active candidate pool scenarios).

### Challenges

#### [Medium] Challenge 1: Fallback Leak on Empty Active Candidate Pool
- **Assumption challenged**: Fallback on line 512 (`filteredTodaysCandidates.length > 0 ? filteredTodaysCandidates : candidates`) preserves strict subject split strategy constraints when no active subject tasks exist.
- **Attack scenario**: User selects `1_a_day_alternating` (Day 0 = Physics). User has not started any Physics chapters yet (only Maths chapters exist).
- **Blast radius**: `todaysMission` contains Maths tasks on Physics day, violating the user's explicit subject split preference.
- **Mitigation**: Change line 512 in `PlannerEngine.ts` from:
  ```ts
  const todaysCandidates = filteredTodaysCandidates.length > 0 ? filteredTodaysCandidates : candidates;
  ```
  to:
  ```ts
  const todaysCandidates = filteredTodaysCandidates;
  ```
  (Or fallback to empty mission / rest day recommendation).

### Stress Test Results
- `3_a_day` rotation across days 0..6 -> Phys/Chem/Maths every day -> PASS
- `2_a_day_alternating` rotation across days 0..6 -> Day 0: P+C, Day 1: C+M, Day 2: M+P ... -> PASS
- `1_a_day_alternating` rotation across days 0..6 -> Day 0: P, Day 1: C, Day 2: M ... -> PASS
- Candidate strict exclusion on normal multi-subject inputs -> PASS
- Candidate strict exclusion on empty active subject inputs -> FAIL (Fallback Leak)

### Unchallenged Areas
- Scoring engine weights and priority calculation formulas (out of scope for Subject Split Strategy verification).
