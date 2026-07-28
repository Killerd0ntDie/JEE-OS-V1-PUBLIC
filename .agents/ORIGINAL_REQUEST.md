# Original User Request

## 2026-07-23T21:16:53Z

Build a centralized `ChapterInfoEngine` as the primary brain for all chapter-related telemetry, infographics, strategy radar metrics, bottleneck risk scores, and mastery calculations across JEE OS.

Working directory: c:\Users\Mani\Downloads\jee-os (10)

## Requirements

### R1. Centralized Engine Architecture (`src/engines/chapterInfo/`)
- Create `src/engines/chapterInfo/types.ts` defining `ChapterTelemetry`, `ChapterStrategyRadar`, `ChapterInfographicsData`, and `ChapterInfoInput`.
- Create `src/engines/chapterInfo/ChapterInfoEngine.ts`:
  - `getChapterTelemetry(chapterId: string): ChapterTelemetry`
  - `getAllChapterTelemetry(): Record<string, ChapterTelemetry>`
  - `getSubjectChapterTelemetry(subjectId: SubjectId): ChapterTelemetry[]`
  - `getChapterBottlenecks(): string[]`
  - `getStrategyRadar(chapterName: string, subject: SubjectId): ChapterStrategyRadar`
- Implement memoized caching with selective invalidation on `CHAPTER_UPDATE`, `SESSION_UPDATE`, or `MISTAKE_UPDATE` events.

### R2. Runtime Integration (`StudyBrainRuntime.ts` & `StudyBrainContext.tsx`)
- Instantiate `ChapterInfoEngine` inside `StudyBrainRuntime.ts`.
- Expose `state.chapterTelemetryMap: Record<string, ChapterTelemetry>` in `StudyBrainState`.
- Feed `ChapterInfoEngine` telemetry outputs directly into `PlannerEngine`, `AnalyticsEngine`, and `OptimizationEngine`.

### R3. Component Refactoring
- Refactor `PlannerPage.tsx` to read telemetry and infographics directly from `state.chapterTelemetryMap`.
- Refactor `DailyMissionTimeline.tsx` to consume strategy radar metrics from `ChapterInfoEngine`.
- Refactor `ChapterCommandCard.tsx` and `SubjectExpandedView.tsx` to use unified chapter telemetry.

## Acceptance Criteria

### Functionality & Performance Verification
- [ ] `ChapterInfoEngine` provides a single cached source of truth for all 56 JEE chapters.
- [ ] UI components (`PlannerPage`, `DailyMissionTimeline`, `ChapterCommandCard`) consume unified telemetry without redundant local calculations.
- [ ] Selective cache invalidation functions cleanly without performance drops.
- [ ] `npm run build` compiles with 0 errors.

## 2026-07-24T10:48:50Z

Build a centralized `ChapterInfoEngine` and universal `ChapterEditModal` that serve as the single source of truth for all chapter telemetry, mission processing, state mutations, and editing workflows across JEE OS.

Working directory: c:\Users\Mani\Downloads\jee-os (10)
Integrity mode: development

## Requirements

### R1. Centralized Chapter State & Telemetry Authority (`src/engines/chapterInfo/`)
- `ChapterInfoEngine` must be the sole calculating engine for chapter mastery scores, syllabus stage (`Not Started` | `In Progress` | `Mastered`), lecture completion %, DPP/PYQ status, retention decay, strategy radar, weightage rank, and active bottlenecks across JEE OS.
- Implement memoized caching with selective invalidation on state updates.

### R2. Unified Chapter Action Dispatcher (`StudyBrainActions.ts`)
- All chapter mutations (updating lecture count, toggling theory/DPP/PYQ completion, updating confidence, editing chapter metadata) must pass through unified `ChapterInfoEngine` mutation dispatchers.

### R3. Universal ChapterEditModal Component (`src/components/shared/ChapterEditModal.tsx`)
- Build a single, high-fidelity universal `ChapterEditModal` powered directly by `ChapterInfoEngine`.
- Make it accessible from:
  - Dashboard Execution Queue (editing chapter mission)
  - Subject Command Center / Subject Trackers (Physics, Chemistry, Maths)
  - Planner Page & Inspector Modal
  - Syllabus Table & Revision Ledger

### R4. App-Wide Integration & Fragmented Modal Cleanup
- Refactor Execution Queue, Subject Command Center, Planner Engine, Revision Engine, and Analytics Engine to source all chapter info and trigger all chapter edits exclusively through `ChapterInfoEngine` and `ChapterEditModal`.
- Remove ad-hoc, isolated chapter edit modals across all views.

## Acceptance Criteria

### Functionality & Verification
- [ ] `ChapterInfoEngine` provides a single cached source of truth for all 56 JEE chapters.
- [ ] `ChapterEditModal` opens seamlessly from Execution Queue, Subject Trackers, Planner, and Revision.
- [ ] Updating a chapter via `ChapterEditModal` instantly reflects in real-time across Dashboard, Subject Trackers, Planner Matrix, and Analytics.
- [ ] No component performs independent ad-hoc chapter state calculations or isolated chapter edits.
- [ ] `npm run build` compiles with 0 errors.

