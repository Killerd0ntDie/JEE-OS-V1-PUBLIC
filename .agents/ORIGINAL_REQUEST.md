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
## 2026-08-19T10:15:10Z

# Teamwork Project Prompt — Draft

Use a very large team of agents.

A comprehensive architecture, security, and code quality audit of the entire JEE-OS application. The goal is to identify bugs, poor logic, dead code, and predict potential failure points across all pages, modals, and engines. The output must be a directory of separate reports per module/engine. Do not modify any application code.

Working directory: ~/teamwork_projects/jee_os_audit
Integrity mode: benchmark

## Requirements

### R1. Comprehensive Directory of Reports
Produce a directory containing separate markdown reports for different domains of the app (e.g., `ui_components.md`, `state_management.md`, `core_engines.md`, `security.md`).

### R2. Deep Vulnerability & Logic Analysis
Each report must explicitly identify bugs, dead code, illicit/poor logic, and include a dedicated section predicting where the app is most likely to break under edge cases or scale.

### R3. Read-Only Enforcement
The team must ONLY produce the audit reports and must not modify, format, or delete any of the actual application source code files.

## Acceptance Criteria

### Report Structure & Coverage
- [ ] The `audit_reports` directory exists.
- [ ] There are at least 4 separate markdown files in the directory.
- [ ] Every report contains a heading for "Predicted Failure Points".

### Read-Only Verification
- [ ] `git status` shows no modified `.ts` or `.tsx` files in the main `jee-os` repository.
