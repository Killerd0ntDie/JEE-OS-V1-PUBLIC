# Handoff Report — Worker 2 Subject Split Remediation

## 1. Observation

- **TypeScript Compilation (`npx tsc --noEmit`)**:
  - `src/engines/planner/PlannerEngine.subjectSplit.test.ts` previously used `as any` casts (`chapters: baseChapters as any` on lines 95, 145, 187, 210, 240, 263) due to incomplete mock chapter shapes (`baseChapters` and `mathsOnlyChapters` lacked required `Chapter` interface properties like `unit`, `currentLecture`, `solvedQuestions`, and used an invalid status string `'In Progress'`).
  - `userPreferences` objects in test inputs require `targetYear: string` per `PlannerInput` interface (`src/engines/planner/types.ts:46-51`).

- **Candidate Selection Logic (`src/engines/planner/PlannerEngine.ts`)**:
  - Lines 509–512 contained:
    ```typescript
    const filteredTodaysCandidates = candidates.filter(cand => 
      todayAllowedSubjects.includes(cand.subjectId) || cand.subjectId === ('revision' as any)
    );
    const todaysCandidates = filteredTodaysCandidates.length > 0 ? filteredTodaysCandidates : candidates;
    ```
  - `cand.subjectId` is strictly of type `SubjectId` (`'physics' | 'chemistry' | 'maths'`). The fallback check `cand.subjectId === ('revision' as any)` was redundant and bypassed strict subject filtering.
  - When candidate tasks exist for active subjects (`filteredTodaysCandidates.length > 0`), `todaysCandidates` strictly evaluates only active subjects. If zero active candidate tasks exist for today's allowed subjects, line 512 safely falls back to all `candidates` to ensure the student receives a valid schedule rather than an empty plan.

## 2. Logic Chain

1. **Test Type Safety Fix**:
   - Updated `baseChapters` and `mathsOnlyChapters` in `PlannerEngine.subjectSplit.test.ts` to strictly conform to `Chapter` from `../../types/index`. Added missing required properties (`unit`, `solvedQuestions`, `revisionCount`, `difficulty`, `confidence`, `estimatedRemainingTime`, `priority`, `dependencies`, `weaknessScore`, `lastRevisionDaysAgo`, and valid `status: 'Learning'`).
   - Removed all `as any` casts on `chapters` properties across all 6 test cases.
   - Ensured `targetYear: '2026'` is present in all mock `userPreferences` objects.

2. **Candidate Selection Refinement**:
   - Refactored `filteredTodaysCandidates` filter in `PlannerEngine.ts` to strictly check `todayAllowedSubjects.includes(cand.subjectId)`.
   - Preserved safe fallback `filteredTodaysCandidates.length > 0 ? filteredTodaysCandidates : candidates` so inactive subjects are never leaked when active candidates exist, while preserving graceful fallback if zero active subject candidate tasks exist overall.

3. **Validation**:
   - Ran `npx tsc --noEmit`: 0 errors.
   - Ran `npx vitest run`: 10 test files passed, 46/46 tests passed (including all 6 subject split strategy stress tests in `PlannerEngine.subjectSplit.test.ts`).
   - Ran `npm run build`: Production Vite + Esbuild bundle succeeded with 0 errors.

## 3. Caveats

- No caveats. All fixes are clean, minimal, and fully type-safe against domain interfaces.

## 4. Conclusion

- Targeted remediation for Subject Split Strategy feature complete.
- 0 TypeScript compilation errors.
- 100% Vitest test pass rate (46/46).
- Production build succeeds without errors.

## 5. Verification Method

To independently verify the changes:

```powershell
# 1. Typecheck
npx tsc --noEmit

# 2. Test suite
npx vitest run

# 3. Production build
npm run build
```
