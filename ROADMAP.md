# Implementation Roadmap

## Phase 1: Product & Architecture Audit [Completed]
- [x] Document current architecture and data flow.
- [x] Identify technical debt and bottlenecks (`TECH_DEBT.md`).

## Phase 2: Core Business Logic Extraction [Completed]
- [x] Extract `calculateMastery`, `getNextAction`, and status logic out of UI components into `StudyBrainService`.
- [x] Remove root-level patch/fix scripts and consolidate phase documentation into canonical `README.md`.

## Phase 3: Core Engines Implementation [Completed]
- [x] **KnowledgeEngine**: 100% complete JEE syllabus structure with prerequisite graph.
- [x] **PlannerEngine**: Multi-objective lookahead optimization engine producing daily missions.
- [x] **RevisionEngine**: Spaced-repetition engine reacting to `LectureCompleted`, `QuestionsSolved`, `MistakeLogged`, and `RevisionCompleted` events.
- [x] **OptimizationEngine**: Predictive trajectory calculation, daily hour rebalancing, and neglected subject detection.

## Phase 4: Dashboard & Analytics Integration [Completed]
- [x] **AnalyticsEngine**: Real-time aggregation of study velocity, question accuracy, and subject mastery.
- [x] **Dashboard Integration**: Live telemetry driving dashboard views.

## Phase 5: AI Coach Integration [Completed]
- [x] **CoachEngine**: Gemini API integration (`@google/genai`) via Express server (`/api/coach/analyze`).

## Phase 6: Subject Command Centers [Completed]
- [x] High-density virtualized command centers (`@tanstack/react-virtual`) for 100+ JEE chapters.

## Phase 7: Codebase Stabilization & Refactoring [In Progress]
- [x] Clean up repo root files and patch scripts.
- [x] Refactor large component files (`DashboardPage.tsx`, `MistakesPage.tsx`) into modular sub-components. `MissionMode.tsx` still needs refactoring if applicable.
- [x] Integrate Mock Tests engine to support NTA simulation and auto-log mistakes to the Revision Engine.

