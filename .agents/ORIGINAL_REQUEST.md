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

## 2026-09-04T09:06:43Z

Conduct a deep, production-grade technical audit of an existing JEE exam preparation application ("JEE OS"). This is a full-stack React + TypeScript + Firebase application (~255 source files, ~2.6MB of code) with a custom engine runtime layer, Zustand state management, Firestore persistence, an Express+Gemini AI backend, and 15 feature modules. The audit must identify every remaining architectural weakness, bug, performance bottleneck, data integrity risk, and code quality gap that would block production deployment at scale.

Working directory: d:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)
Integrity mode: development

### Application Architecture Summary

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion
- **State:** Zustand store (`useStudyBrainStore.ts`) synced with a singleton `StudyBrainRuntime` that orchestrates 6+ engines
- **Engines** (in `packages/engines/src/`): KnowledgeEngine, PlannerEngine, OptimizationEngine, AnalyticsEngine, CoachEngine, ChapterInfoEngine, RevisionEngine (SM-2 spaced repetition), NeuralGraphEngine
- **Actions:** `StudyBrainActions.ts` (~2,400 lines) — all Firestore write operations and state mutations
- **Backend:** `server.ts` (~620 lines) — Express server with Gemini AI endpoints for practice generation, mock tests, and AI coaching
- **Persistence:** Firebase Firestore with repository pattern (`src/repositories/`)
- **Auth:** Firebase Auth (email, Google, anonymous/guest with account linking)
- **Features:** Dashboard, Planner (weekly/daily calendar grid), Mission Cockpit (timer, focus tracking), Subject pages, Revision vault (flashcards + SM-2), Mistakes journal, Mock tests (with AI generation), AI Coach (chat), Neural Link (knowledge graph visualization via ReactFlow), Analytics, Formula vault, Focus vault, Settings, Onboarding diagnostic

### Prior Audit Work

Two audit passes have already been completed by a prior agent, fixing ~20 issues including null dereferences, missing rollbacks, JSON.parse crashes, timezone bugs in SM-2, race conditions from dynamic imports, and planner navigation bugs. The codebase currently passes `tsc --noEmit` (0 errors) and `vitest run` (25 files, 104 tests, all green). This audit should find issues the prior passes missed.

## Requirements

### R1. Comprehensive Bug & Logic Error Discovery

Identify all remaining bugs, logic errors, and edge-case failures across the entire codebase — including but not limited to: race conditions, unhandled promise rejections, memory leaks, orphaned event listeners, incorrect mathematical formulas in scoring engines, off-by-one errors in planner scheduling, missing null guards, broken error boundaries, and incorrect state transitions. Each finding must include the exact file path, line number(s), a clear explanation of why it is a bug, and a concrete reproduction scenario or trigger condition.

### R2. Architecture & Data Flow Integrity Assessment

Evaluate the architecture for production readiness: module boundary violations, circular dependencies, state pollution between features, data duplication across stores, unnormalized schemas, missing indexes in Firestore, unsafe `as any` type assertions masking real type errors, and areas where the codebase violates its own architectural patterns (e.g., repositories bypassed, engines called directly instead of through runtime). Identify the top structural risks that would cause maintenance nightmares at scale.

### R3. Performance, Rendering & UX Audit

Identify performance bottlenecks: unnecessary re-renders, missing memoization, expensive computations running on every render, large bundle sizes from non-code-split imports, layout thrashing, accessibility violations, broken responsive layouts, and UI states that would confuse or frustrate a real student user. Focus on the critical user paths: dashboard load, planner interaction, mission cockpit timer, and revision flashcard cycling.

### R4. Test Coverage & Reliability Gap Analysis

Map which critical code paths have zero test coverage and which existing tests are fragile, incomplete, or testing the wrong thing. Priority areas: `StudyBrainRuntime` refresh/subscription lifecycle, `StudyBrainActions` mutation rollback guarantees, repository batch operations, server API endpoint error handling, and engine edge cases.

## Acceptance Criteria

### Bug Discovery
- [ ] At least 10 distinct, verified bugs or logic errors not already fixed by the prior audit passes (each with file path, line numbers, and reproduction trigger)
- [ ] Zero false positives — every reported bug must be reproducible or demonstrably incorrect by reading the code logic
- [ ] Each bug classified by severity: Critical (crash/data loss), High (incorrect behavior), Medium (degraded experience), Low (cosmetic/minor)

### Architecture Assessment
- [ ] At least 5 structural/architectural issues identified with concrete evidence (file references, dependency traces)
- [ ] Every `as any` usage in `src/actions/` and `src/runtime/` catalogued with an assessment of whether it masks a real type error
- [ ] Identification of at least 3 data flow integrity risks (e.g., state desync scenarios, orphaned data, missing cascading deletes)

### Performance Audit
- [ ] At least 5 rendering or performance issues identified with evidence (component names, hook traces, bundle analysis)
- [ ] Each performance finding must include a clear before/after impact description (e.g., "this component re-renders 47 times on page load because X")

### Test Coverage
- [ ] A coverage gap map listing the top 10 most critical untested code paths, ranked by blast radius
- [ ] At least 3 specific recommendations for test suites that would catch the most regressions per test added

### Report Quality
- [ ] All findings organized in a single structured report with clear sections, severity labels, and file links
- [ ] The report must be actionable — a developer should be able to pick up any finding and fix it without needing additional context
- [ ] No vague findings like "code could be improved" — every item must have a specific, concrete problem statement

## Verification

An independent reviewer agent will:
1. Cross-reference each reported bug against the actual source code to verify the logic error exists
2. Confirm that reported file paths and line numbers match real code
3. Check that no reported bugs overlap with the already-fixed issues from prior audits (null dereference in resetToInitialState, JSON.parse in useMissionState, PlannerPage week range, SM-2 UTC midnight, dynamic import race conditions, completeStudySession/completeRevision rollbacks)
4. Validate that performance findings cite specific components/hooks rather than generic advice
5. Reject any finding that is vague, unsubstantiated, or already addressed
