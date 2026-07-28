# Comprehensive Audit & Refactoring Plan: App-Wide Integration & Fragmented Modal Cleanup (Milestone 3)

## Executive Summary
This analysis report provides a complete audit of all consumer views across JEE OS for **Milestone 3: App-Wide Integration & Fragmented Modal Cleanup**.
The goal of Milestone 3 is to ensure that:
1. All 5 consumer view subsystems (**Dashboard Execution Queue**, **Subject Command Center & Trackers**, **Planner Page & Inspector Modal**, **Syllabus & Revision Ledger**, and **Analytics Engine & Views**) source chapter metrics, mastery, strategy radar, retention decay, weightage, and bottleneck scores exclusively from `ChapterInfoEngine` (`state.chapterTelemetryMap`).
2. All chapter editing and progress updating workflows across JEE OS trigger exclusively through the universal `ChapterEditModal` (`src/components/shared/ChapterEditModal.tsx`).
3. Fragmented, ad-hoc chapter edit modals and isolated in-place calculations are removed across the entire codebase.

---

## 1. Subsystem Audit Findings & Evidence Chain

### Subsystem 1: Dashboard Execution Queue
- **Files Inspected**:
  - `src/features/dashboard/DashboardPage.tsx`
  - `src/features/dashboard/components/DailyMissionTimeline.tsx`
- **Observed Ad-hoc Sourcing & Calculations**:
  - `DailyMissionTimeline.tsx:40-95`: Defines an ad-hoc helper function `getChapterStrategyRadar(chapName: string, subject: SubjectId)` that hardcodes strategy metrics (formulas, pitfalls, recommended PYQs, weightage gain, concept tags) using `if-else` string matching on chapter names instead of fetching telemetry from `ChapterInfoEngine`.
  - `DailyMissionTimeline.tsx:129-132`: Looks up active chapter directly from `state.chapters` array instead of pulling from `state.chapterTelemetryMap`.
- **Existing Edit Triggers**:
  - `DailyMissionTimeline.tsx:7`: Imports `ChapterEditModal`.
  - `DailyMissionTimeline.tsx:115, 352, 478, 564, 594`: Already uses `setupChapter` state to open `ChapterEditModal`.
- **Refactoring Requirement**:
  - Remove `getChapterStrategyRadar` (lines 40-95).
  - Source strategy radar and chapter telemetry directly from `state.chapterTelemetryMap[activeChap.id].strategyRadar`.

---

### Subsystem 2: Subject Command Center & Subject Trackers
- **Files Inspected**:
  - `src/features/subjects/PhysicsPage.tsx`
  - `src/features/subjects/ChemistryPage.tsx`
  - `src/features/subjects/MathsPage.tsx`
  - `src/features/subjects/SubjectDetailPage.tsx`
  - `src/features/subjects/components/SubjectCommandCenter.tsx`
  - `src/features/subjects/components/ChapterCommandCard.tsx`
  - `src/features/subjects/components/SubjectExpandedView.tsx`
- **Observed Ad-hoc Sourcing & Calculations**:
  - `SubjectCommandCenter.tsx:82-87`: Manually calculates subject stats (`totalCount`, `masteredCount`, `learningCount`, `unstartedCount`, `subjectProgressPercent`) by reducing over `subjectChapters` array.
  - `SubjectCommandCenter.tsx:90-94`: Performs ad-hoc focus chapter calculation.
  - `SubjectCommandCenter.tsx:245-257`: Renders Subject Telemetry Radar using local loop calculations.
  - `ChapterCommandCard.tsx:71-114`: Reads lecture progress, DPP status, and PYQ status directly from raw `chapter` prop instead of `chapterTelemetryMap[chapter.id]`.
- **Ad-hoc Modals & Forms**:
  - `SubjectExpandedView.tsx:204-385`: Contains an embedded, in-place custom telemetry calibration form with input fields for `currentLecInput`, `totalLecInput`, `avgDurInput`, `teacherInput`, `dppDoneInput`, `pyqsDoneInput` and an inline save function `handleSaveTelemetry` (lines 49-72) that calls `actions.updateChapterProgress`.
- **Refactoring Requirement**:
  - Sourcing: Retrieve subject telemetry array via `ChapterInfoEngine.getSubjectChapterTelemetry(subjectId)` or `state.chapterTelemetryMap`.
  - Modals: Replace the in-place calibration form in `SubjectExpandedView.tsx` (lines 204-385) with a button triggering the universal `ChapterEditModal`.

---

### Subsystem 3: Planner Page & Task Inspector Modal
- **Files Inspected**:
  - `src/features/mission/PlannerPage.tsx`
- **Observed Ad-hoc Sourcing & Calculations**:
  - `PlannerPage.tsx:90-105`: Defines `activeBottlenecks` by filtering `state.chapters` directly and generating ad-hoc string messages instead of calling `ChapterInfoEngine.getChapterBottlenecks()` or fetching bottleneck risk scores from `chapterTelemetryMap`.
- **Task Inspector Modal**:
  - `PlannerPage.tsx:1140-1267`: Renders Task Inspector Modal.
  - `PlannerPage.tsx:552-559`: Already reads `activeInspectorTelemetry` from `state.chapterTelemetryMap[chap.id]`.
  - Missing Trigger: The Inspector Modal currently lacks an "Edit Chapter" trigger button to open `ChapterEditModal`.
- **Refactoring Requirement**:
  - Replace `activeBottlenecks` calculation with `ChapterInfoEngine.getChapterBottlenecks()`.
  - Add an "Edit Chapter" button in Task Inspector Modal (near line 1255) that sets state to open `ChapterEditModal`.

---

### Subsystem 4: Syllabus Table & Revision Ledger
- **Files Inspected**:
  - `src/features/revision/RevisionPage.tsx`
  - `src/components/mentor/SyllabusDiagnosisModal.tsx`
- **Observed Ad-hoc Sourcing & Calculations**:
  - `RevisionPage.tsx:87-92`: Filters `state.chapters` directly for `revisionDueChapters`.
  - `SyllabusDiagnosisModal.tsx:39-153`: Performs ad-hoc stage mapping calculations (`handleUpdateStage`, `handleUpdateLectureProgress`, `handleUpdatePracticeProgress`, `handleUpdateRevisionState`) that manually map `SyllabusDiagnosisStage` strings to completion percentages and status flags.
- **Fragmented Modal Isolation**:
  - `SyllabusDiagnosisModal.tsx` functions as an isolated chapter diagnosis modal with standalone mutation logic instead of delegating telemetry updates to `ChapterInfoEngine` action dispatchers or `ChapterEditModal`.
- **Refactoring Requirement**:
  - Wire `SyllabusDiagnosisModal.tsx` mutations to `StudyBrainActions` chapter dispatchers (`updateChapterProgress`, `updateChapter`).
  - Source revision queue and retention decay metrics in `RevisionPage.tsx` directly from `state.chapterTelemetryMap`.

---

### Subsystem 5: Analytics Engine & Views
- **Files Inspected**:
  - `src/features/analytics/AnalyticsPage.tsx`
  - `src/engines/analytics/AnalyticsEngine.ts`
- **Observed Ad-hoc Sourcing & Calculations**:
  - `AnalyticsEngine.ts:88-101`: Manually iterates `input.chapters` to sum `totalLectures` and `totalCompleted` for `subjectTotals` and `overallLectureCompletion`.
  - `AnalyticsPage.tsx:64-73`: Computes `revisionHealth` by filtering `state.mistakes`.
- **Refactoring Requirement**:
  - Update `AnalyticsEngine.ts` to consume `state.chapterTelemetryMap` / `ChapterInfoEngine` telemetry outputs for subject completion percentages, mastery scores, and retention health.

---

### Fragmented Modal Identified for Removal
- **`src/components/ui/QuickChapterSetupModal.tsx`** (168 lines):
  - Isolated ad-hoc chapter setup modal. Currently unreferenced across main flows.
  - **Action**: Delete `src/components/ui/QuickChapterSetupModal.tsx` and ensure any modal calls for chapter setup route through `ChapterEditModal`.

---

## 2. Refactoring Plan & Actionable Line Reference Table

| Subsystem / File | Location (Line Range) | Current Implementation | Target Refactored Implementation |
|---|---|---|---|
| **DailyMissionTimeline.tsx** | Lines 40-95 | Hardcoded `getChapterStrategyRadar` fallback function | Remove function; read `state.chapterTelemetryMap[chap.id]?.strategyRadar` |
| **SubjectCommandCenter.tsx** | Lines 82-87 | Manual `subjectChapters.reduce` for stats | Source stats from `ChapterInfoEngine.getSubjectChapterTelemetry(subjectId)` |
| **SubjectCommandCenter.tsx** | Lines 245-257 | Local loop calculation for Subject Telemetry Radar | Render telemetry metrics from `chapterTelemetryMap` |
| **ChapterCommandCard.tsx** | Lines 71-114 | Reads raw `chapter` prop fields | Source metrics from `state.chapterTelemetryMap[chapter.id]` |
| **SubjectExpandedView.tsx** | Lines 204-385 | Embedded in-place chapter calibration form & `handleSaveTelemetry` | Replace in-place form with "Calibrate Chapter Telemetry" button opening `ChapterEditModal` |
| **PlannerPage.tsx** | Lines 90-105 | Local filtering over `state.chapters` for `activeBottlenecks` | Call `ChapterInfoEngine.getChapterBottlenecks()` or read from `chapterTelemetryMap` |
| **PlannerPage.tsx** | Lines 1255-1265 | Inspector Modal footer without edit trigger | Add "Edit Chapter Telemetry" button opening `ChapterEditModal` |
| **RevisionPage.tsx** | Lines 87-92 | Raw filtering over `state.chapters` for revision due | Source retention decay and overdue queue from `state.chapterTelemetryMap` |
| **SyllabusDiagnosisModal.tsx** | Lines 39-153 | Local manual stage & progress calculations | Refactor handlers to delegate to unified `ChapterInfoEngine` action dispatchers |
| **AnalyticsEngine.ts** | Lines 88-101 | Iterates raw `input.chapters` to compute lecture totals | Accept `chapterTelemetryMap` and consume calculated completion percentages |
| **QuickChapterSetupModal.tsx** | Entire File (168 lines) | Isolated ad-hoc modal | Remove file completely |

---

## 3. Integration & Verification Steps
1. **Verification Command**: Run `npm run build` to ensure 0 TypeScript or React compilation errors.
2. **Runtime Verification**:
   - Verify `ChapterInfoEngine` provides cached `chapterTelemetryMap` for all 56 JEE chapters.
   - Verify opening chapter edit from Dashboard Execution Queue, Subject Command Center, Planner Inspector Modal, and Syllabus Diagnosis seamlessly launches `ChapterEditModal`.
   - Verify updating a chapter in `ChapterEditModal` immediately updates metrics across Dashboard, Subject Cards, Planner, Revision, and Analytics in real time.
