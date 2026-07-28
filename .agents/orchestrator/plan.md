# Project Plan: Centralized ChapterInfoEngine & Universal ChapterEditModal for JEE OS

## Architecture & Design
Centralized `ChapterInfoEngine` in `src/engines/chapterInfo/` serving as the single source of truth for telemetry, infographics, strategy radar metrics, bottleneck risk scores, and mastery calculations across all 56 JEE chapters.

- **Types**: `src/engines/chapterInfo/types.ts` defining `ChapterTelemetry`, `ChapterStrategyRadar`, `ChapterInfographicsData`, `ChapterInfoInput`.
- **Engine Core**: `src/engines/chapterInfo/ChapterInfoEngine.ts` implementing caching, selective invalidation on `CHAPTER_UPDATE`, `SESSION_UPDATE`, `MISTAKE_UPDATE`.
- **Action Dispatcher**: `StudyBrainActions.ts` (or `src/core/StudyBrainActions.ts`) handling all chapter state mutations.
- **Runtime**: Integrated in `StudyBrainRuntime.ts` & `StudyBrainContext.tsx`, exposing `state.chapterTelemetryMap` and feeding telemetry to `PlannerEngine`, `AnalyticsEngine`, `OptimizationEngine`, `RevisionEngine`.
- **Universal Modal**: `src/components/shared/ChapterEditModal.tsx` accessible app-wide.
- **UI Components Refactored**: Dashboard Execution Queue, Subject Command Center / Subject Trackers (Physics, Chemistry, Maths), Planner Page & Inspector Modal, Syllabus Table & Revision Ledger, Analytics Engine.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Centralized ChapterInfoEngine & Action Dispatcher | `src/engines/chapterInfo/`, `StudyBrainActions.ts`, `StudyBrainRuntime.ts`, `StudyBrainContext.tsx` | None | PLANNED |
| 2 | M2: Universal ChapterEditModal Component | `src/components/shared/ChapterEditModal.tsx` | M1 | PLANNED |
| 3 | M3: App-Wide Integration & Fragmented Modal Cleanup | Execution Queue, Subject Trackers, Planner, Syllabus/Revision, Analytics | M1, M2 | PLANNED |
| 4 | M4: Final Build & E2E Verification | `npm run build` zero errors & verification | M1, M2, M3 | PLANNED |

## Code Layout
- `src/engines/chapterInfo/types.ts`
- `src/engines/chapterInfo/ChapterInfoEngine.ts`
- `src/core/StudyBrainActions.ts`
- `src/core/StudyBrainRuntime.ts`
- `src/context/StudyBrainContext.tsx`
- `src/components/shared/ChapterEditModal.tsx`
- `src/features/` & `src/components/`
