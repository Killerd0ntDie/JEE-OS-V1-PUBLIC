# Technical Context: Centralized ChapterInfoEngine & Universal ChapterEditModal

## Overview
JEE OS requires a single source of truth for chapter calculations and state mutations, as well as a universal editing modal component.

## Key Target Areas
1. **Engine Layer**:
   - `src/engines/chapterInfo/types.ts`
   - `src/engines/chapterInfo/ChapterInfoEngine.ts`
2. **Runtime & Actions**:
   - `src/core/StudyBrainActions.ts` (or equivalent location)
   - `src/core/StudyBrainRuntime.ts`
   - `src/context/StudyBrainContext.tsx`
3. **Shared Components**:
   - `src/components/shared/ChapterEditModal.tsx`
4. **Consumer Pages & Views**:
   - Dashboard Execution Queue
   - Subject Command Center / Subject Trackers (Physics, Chemistry, Maths)
   - Planner Page & Inspector Modal
   - Syllabus Table & Revision Ledger
   - Analytics Engine & views

## Requirements Summary
- Telemetry: Mastery scores, syllabus stage (`Not Started` | `In Progress` | `Mastered`), lecture completion %, DPP/PYQ status, retention decay, strategy radar, weightage rank, active bottlenecks.
- Memoized caching with selective invalidation on state updates (`CHAPTER_UPDATE`, `SESSION_UPDATE`, `MISTAKE_UPDATE`).
- All mutations routed through `ChapterInfoEngine` / `StudyBrainActions.ts`.
- `ChapterEditModal` powered by engine, accessible from all 4 primary UI domains.
- Full removal of fragmented, ad-hoc chapter edit modals.
- 0 build errors (`npm run build`).
