# Technical Debt Report

## Resolved Items
- [x] **Client-Side Fake Implementations (`MockTestsPage.tsx`)**: Removed `MockTestsPage` and its routes/nav entries, ensuring Firebase/StudyBrain engines remain the sole source of truth.
- [x] **Business Logic in UI Components**: Moved `calculateMastery`, `getNextAction`, and status logic into pure TypeScript services (`StudyBrainService`).
- [x] **Hardcoded Templates & Root Cleanup**: Purged root patch scripts (`patch_*`, `fix_*`) and replaced misleading `COACH_TEMPLATES` with engine-backed briefings.

## Remaining Structural Debt
1. **God Context (`StudyBrainContext.tsx`)**
   - **Issue:** Multi-purpose state and synchronization handling.
   - **Impact:** Triggers full app re-renders on state mutations.
   - **Effort to Fix:** High. Recommend splitting into modular domain contexts or lightweight store patterns.

2. **Large Component Files**
   - **Issue:** `MistakesPage.tsx` (~1560 lines), `MissionMode.tsx` (~1150 lines), `DashboardPage.tsx` (~970 lines).
   - **Impact:** Hard to read, navigate, and maintain.
   - **Effort to Fix:** Medium. Extract modular sub-components and custom hooks.

3. **Routing Improvements**
   - **Issue:** App navigation uses local `activePage` state in `App.tsx`.
   - **Impact:** Browser back/forward navigation and URL deep linking are limited.
   - **Effort to Fix:** Medium. Migrate to `react-router-dom`.

