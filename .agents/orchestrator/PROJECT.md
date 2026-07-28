# Project: Centralized ChapterInfoEngine & Universal ChapterEditModal for JEE OS

## Architecture
JEE-OS React/TypeScript Web Application.
- `src/engines/chapterInfo/types.ts`: Telemetry, Infographics, Strategy Radar, Input types.
- `src/engines/chapterInfo/ChapterInfoEngine.ts`: Core calculating authority for 56 JEE chapters (mastery, syllabus stage, lecture %, DPP/PYQ status, retention decay, strategy radar, weightage rank, active bottlenecks) with selective memoized caching.
- `src/core/StudyBrainRuntime.ts` & `src/context/StudyBrainContext.tsx`: Engine runtime integration, state exposure (`chapterTelemetryMap`), feeding telemetry into Planner, Analytics, Optimization, and Revision engines.
- `src/core/StudyBrainActions.ts`: Centralized mutation dispatchers for chapter updates.
- `src/components/shared/ChapterEditModal.tsx`: Universal high-fidelity modal for chapter editing across all views.
- UI Refactorings: Dashboard Execution Queue, Subject Command Center / Subject Trackers, Planner Page & Inspector Modal, Syllabus Table & Revision Ledger, Analytics Engine.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Centralized ChapterInfoEngine & Action Dispatcher | `src/engines/chapterInfo/`, `StudyBrainActions.ts`, `StudyBrainRuntime.ts`, `StudyBrainContext.tsx` | None | DONE |
| 2 | M2: Universal ChapterEditModal Component | `src/components/shared/ChapterEditModal.tsx` | M1 | DONE |
| 3 | M3: App-Wide Integration & Fragmented Modal Cleanup | Execution Queue, Subject Trackers, Planner, Syllabus/Revision, Analytics | M1, M2 | DONE |
| 4 | M4: Final Build & E2E Verification | `npm run build` zero errors & verification | M1, M2, M3 | DONE |

## Code Layout
- `src/engines/chapterInfo/types.ts`
- `src/engines/chapterInfo/ChapterInfoEngine.ts`
- `src/core/StudyBrainActions.ts`
- `src/core/StudyBrainRuntime.ts`
- `src/context/StudyBrainContext.tsx`
- `src/components/shared/ChapterEditModal.tsx`
- `src/features/` & `src/components/` (Dashboard, Subject Trackers, Planner, Revision, Analytics)
