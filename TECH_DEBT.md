# Technical Debt Report

## Resolved Items
- [x] **Mock Tests Engine Integration**: Graduated `MockTestsPage` from a client-side sandbox to a fully integrated feature using Firebase and StudyBrain engines.
- [x] **Business Logic in UI Components**: Moved `calculateMastery`, `getNextAction`, and status logic into pure TypeScript services (`StudyBrainService`).
- [x] **Hardcoded Templates & Root Cleanup**: Purged root patch scripts (`patch_*`, `fix_*`) and replaced misleading `COACH_TEMPLATES` with engine-backed briefings.
- [x] **Routing Improvements**: Migrated to `react-router-dom` to support URL deep linking and standard browser navigation.
- [x] **Type Strictness**: Enforced strict `boolean` types across `StudyBrainActions` to eliminate build failures on `undefined`.

## Remaining Structural Debt
1. **God Context (`StudyBrainContext.tsx`)**
   - **Issue:** Multi-purpose state and synchronization handling.
   - **Impact:** Triggers full app re-renders on state mutations.
   - **Effort to Fix:** High. Recommend splitting into modular domain contexts or lightweight store patterns.

2. **Large Component Files**
   - **Issue:** `MistakesPage.tsx` (~1560 lines), `MissionMode.tsx` (~1150 lines), `DashboardPage.tsx` (~970 lines).
   - **Impact:** Hard to read, navigate, and maintain.
   - **Effort to Fix:** Medium. Extract modular sub-components and custom hooks.

4. **Codebase Size and Monolith**
   - **Issue:** All engines and UI exist in a single repository without clear boundary separations.
   - **Impact:** Hard to deploy engines as microservices later.
   - **Effort to Fix:** Medium/High. Requires nx or turborepo migration.
