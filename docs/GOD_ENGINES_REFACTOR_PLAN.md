# Implementation Plan: Domain & Planning God Engines Refactoring

## Overview
Refactor the 5 core "God Engines" (>800 lines) of JEE OS into modular, single-responsibility domain submodules while ensuring:
1. **Zero Breaking Changes**: Public exports, class methods, types, constants, hook return properties and signatures remain 100% backward-compatible.
2. **Architectural Guardrails**:
   - Storage Prefix Rule: All storage reads/writes use `storageAdapter` with keys starting with `jeeos_`.
   - Business Math Prohibition: Streak, accuracy, and mastery calculations remain in engines/store, not UI.
3. **Deep Verification**:
   - `npm run typecheck` passes with 0 errors at every step.
   - All existing tests pass with `npx vitest run <file> --pool=threads`.
   - `npx ts-node scripts/verify-storage-prefix.ts` passes with 0 errors.

---

## Target 1: `packages/engines/src/planner/PlannerEngine.ts` (1,008 lines)
**Goal:** Extract phases of `generateDailyPlan` into focused domain modules under `packages/engines/src/planner/modules/`:
- `academicStateAnalyzer.ts`: Phase 1-5 (state merging, prerequisite gap detection, revision decay detection, weak area detection, mock exam remediation, active objective resolution).
- `candidateTaskGenerator.ts`: Phase 7 (generating tasks for revision, mock remediation, lectures, DPP, PYQ, mistakes, sunk-cost momentum boost, chronological sorting).
- `multiStrategySelector.ts`: Phase 8 (heuristics for 8 mission strategies, lookahead simulation scoring, selecting best mission).
- `weeklyScheduleSimulator.ts`: Phase 9 (7-day progressive weekly rotation simulation without ghost lectures).
- `timeBlocker.ts`: Phase 10 (morning, afternoon, night time blocking and finish date estimation).
- `PlannerEngine.ts`: High-level facade coordinating the submodules.

---

## Target 2: `packages/engines/src/planner/weeklyMatrix.ts` (907 lines)
**Goal:** Modularize matrix generation into domain components under `packages/engines/src/planner/weekly/`:
- `weeklyTypes.ts`: Interfaces (`WeeklyBlock`), constants (`daysOfWeek`).
- `timeSlotUtils.ts`: Break duration calculations, dynamic morning slot formatting, slot time parsers.
- `todayMissionsScheduler.ts`: Cascading active today missions, auto-break interleaving, pushing to tomorrow.
- `plannerWeeklyScheduler.ts`: Lookahead weekly schedule mapping onto standard time slots.
- `proceduralScheduler.ts`: Procedural generation for 1-a-day, 2-a-day alternating, 3-a-day strategies.
- `blockSorter.ts`: Stable transitive sorting comparator for weekly blocks.
- `splitConfigHelpers.ts`: `normalizeTwoDaySplitConfig`, `getDayFocusPill`, `getHeaderBadgeText`.
- `weeklyMatrix.ts`: Main entry point re-exporting all types, helpers, and `generateWeeklyMatrix`.

---

## Target 3: `src/utils/audioEngine.ts` (905 lines)
**Goal:** Modularize Web Audio API synthesizer into submodules under `src/utils/audio/`:
- `audioContextManager.ts`: AudioContext singleton, master compressor, master & cockpit gain nodes, noise buffer generator, cockpit volume persistence via `storageAdapter`.
- `audioSourceTracker.ts`: Tracking and stopping entrance, exit, and general audio sources.
- `evangelionSynthesizer.ts`: Laser charge and "Cruel Angel's Thesis" entrance & exit synth with subject-specific harmonic transpositions and timbre (celestial glass, punchy horn, brass piano).
- `tacticalSfx.ts`: Mechanical switch snap, radio relay click, Cherry/Topre keypress simulation, tactical HUD beep, hover tick.
- `feedbackSfx.ts`: Success tone, alert siren, card flip with haptic vibration, streak victory chimes.
- `notificationManager.ts`: Desktop notification permissions and dispatcher.
- `audioEngine.ts`: Facade class delegating to submodules, preserving all public methods, aliases, and singleton `audioEngine`.

---

## Target 4: `src/features/mockTests/hooks/useExamEngine.ts` (898 lines)
**Goal:** Decompose the 3-hour live exam lifecycle into modular hooks under `src/features/mockTests/hooks/exam/`:
- `useExamUiState.ts`: Modals (question paper, shortcuts, instructions, print), NTA classic theme toggle, and fullscreen management.
- `useExamProctoring.ts`: Proctor warnings, infraction counting via `storageAdapter`, anti-cheat tab-switch and window-blur listeners, 3-infraction auto-submission.
- `useExamExclusivity.ts`: Multi-tab exclusivity lock (BroadcastChannel & storage events), back-button popstate trapping, beforeunload safety save.
- `useExamTimerAndHeartbeat.ts`: TargetEndTime watcher, question time accumulation with sleep clamp (>15s), visibility flush.
- `useExamInputAndKeypad.ts`: Virtual keypad handlers for numericals, keyboard shortcuts (Alt+1/2/3, Alt+S, Alt+M, Enter, MCQ keys).
- `useExamNavigationAndSubmit.ts`: Question navigation, save & next, mark for review, clear, test submission, discard exit, status counts.
- `useExamEngine.ts`: Master orchestrator hook composing sub-hooks and returning the identical state and handler object.

---

## Target 5: `src/features/mission/hooks/useMissionState.ts` (802 lines)
**Goal:** Decompose Cockpit mission timer hook into modular sub-hooks under `src/features/mission/hooks/subhooks/`:
- `useMissionSubjectInfo.ts`: Subject resolution, chapter mapping, active mission binding, duration and progress percentages.
- `useMissionTimer.ts`: Wall-clock delta ticking, idle time tracking, focus score calculation, tab-change auto-pause, 30s session persistence.
- `useMissionChecklist.ts`: Dynamic checklist initialization based on mission type, task toggling, adding custom tasks, auto-complete detection, keyboard shortcuts.
- `useMissionNotesAndFormulas.ts`: Quick notes list and input, formula search and filtering, coach tips rotation.
- `useMissionLifecycle.ts`: Mission completion handler, next subject transition, session reset, standardized session timeSlot updating on early exit.
- `useMissionState.ts`: Composes sub-hooks and returns `{ state, setters, handlers, refs }`.

---

## Verification Milestones
At each target:
1. `npm run typecheck` — 0 errors.
2. `npx ts-node scripts/verify-storage-prefix.ts` — all keys conform to `jeeos_`.
3. Vitest test suite runs with `--pool=threads`:
   - `packages/engines/src/planner/*.test.ts`
   - `src/features/mockTests/MockTestArena.test.tsx`
   - `src/features/mission/MissionExecutionIntegration.test.ts`
   - New unit tests for audio engine and modularized components.
