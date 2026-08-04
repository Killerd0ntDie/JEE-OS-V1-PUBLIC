# Technical Debt Report

## Resolved Items
- [x] **Mock Tests Engine Integration**: Graduated `MockTestsPage` from a client-side sandbox to a fully integrated feature using Firebase and StudyBrain engines.
- [x] **Business Logic in UI Components**: Moved `calculateMastery`, `getNextAction`, and status logic into pure TypeScript services (`StudyBrainService`).
- [x] **Hardcoded Templates & Root Cleanup**: Purged root patch scripts (`patch_*`, `fix_*`) and replaced misleading `COACH_TEMPLATES` with engine-backed briefings.
- [x] **Routing Improvements**: Migrated to `react-router-dom` to support URL deep linking and standard browser navigation.
- [x] **Type Strictness**: Enforced strict `boolean` types across `StudyBrainActions` to eliminate build failures on `undefined`.

## Remaining Structural Debt
1. **Large Component Files**
   - **Issue:** `MistakesPage.tsx` (~1560 lines), `DashboardPage.tsx` (~970 lines).
   - **Impact:** Hard to read, navigate, and maintain.
   - **Effort to Fix:** Medium. Extract modular sub-components and custom hooks. (Note: `MissionMode.tsx` was successfully refactored).

2. **Test Coverage Gaps**
   - **Issue:** While engines are well-tested, some UI components lack unit and integration tests.
   - **Impact:** Higher risk of regressions during UI refactors.
   - **Effort to Fix:** Medium. Gradually add tests using React Testing Library.
