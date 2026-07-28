## 2026-07-24T10:53:27Z
You are Worker 2 (M3: App-Wide Integration & Fragmented Modal Cleanup).
Your working directory is: c:\Users\Mani\Downloads\jee-os (10)\.agents\teamwork_preview_worker_chapter_m3

Objective:
Implement Milestone 3: App-Wide Integration & Fragmented Modal Cleanup across Dashboard, Subject Trackers, Planner, Revision Ledger, Syllabus Table, and Analytics Engine.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Reference Documents:
- Explorer 3 Analysis: `c:\Users\Mani\Downloads\jee-os (10)\.agents\teamwork_preview_explorer_chapter_3\analysis.md`
- Explorer 3 Handoff: `c:\Users\Mani\Downloads\jee-os (10)\.agents\teamwork_preview_explorer_chapter_3\handoff.md`
- Worker 1 Handoff: `c:\Users\Mani\Downloads\jee-os (10)\.agents\teamwork_preview_worker_chapter_m1_m2\handoff.md`

Tasks:
1. **Dashboard Execution Queue** (`src/features/dashboard/components/DailyMissionTimeline.tsx`):
   - Refactor `DailyMissionTimeline.tsx` to read strategy radar metrics directly from `state.chapterTelemetryMap[chap.id]?.strategyRadar` instead of local calculations.
   - Replace any `QuickChapterSetupModal` usages/triggers with `actions.openChapterEditModal(chapterId)`.
2. **Subject Command Center & Trackers** (`src/features/subjects/components/`):
   - In `SubjectCommandCenter.tsx`: Replace manual reduce/calculation logic for subject chapter telemetry with calls to `ChapterInfoEngine.getSubjectChapterTelemetry(subjectId)` or `state.chapterTelemetryMap`.
   - In `SubjectExpandedView.tsx`: Remove the inline telemetry calibration form (lines 204-385) and replace with a trigger button that calls `actions.openChapterEditModal(chapter.id)`.
   - In `ChapterCommandCard.tsx`: Update to consume `ChapterTelemetry` from `state.chapterTelemetryMap` and wire edit button to `actions.openChapterEditModal(chapter.id)`.
3. **Planner Page & Task Inspector Modal** (`src/features/mission/PlannerPage.tsx`):
   - Replace local `activeBottlenecks` calculations with `ChapterInfoEngine.getChapterBottlenecks()`.
   - In Task Inspector Modal / `PlannerInspectorModal.tsx`: Source telemetry from `chapterTelemetryMap` and add an "Edit Chapter Telemetry" trigger button calling `actions.openChapterEditModal(chapterId)`.
4. **Syllabus & Revision Ledger** (`src/features/revision/RevisionPage.tsx`, `src/components/mentor/SyllabusDiagnosisModal.tsx`):
   - In `RevisionPage.tsx`: Source retention decay & overdue queue from `state.chapterTelemetryMap`.
   - In `SyllabusDiagnosisModal.tsx`: Route stage updates and chapter metadata edits through `actions.updateChapter(chapterId, updates)` or `actions.openChapterEditModal(chapterId)`.
5. **Analytics Engine & Views** (`src/features/analytics/AnalyticsEngine.ts`, `src/features/analytics/AnalyticsPage.tsx`):
   - Update `AnalyticsEngine.ts` to accept/read `chapterTelemetryMap` and consume cached completion percentages and mastery scores.
6. **Fragmented Modal Cleanup**:
   - Delete `src/components/ui/QuickChapterSetupModal.tsx`.
   - Search for any remaining imports or references to `QuickChapterSetupModal` across the entire codebase and clean them up.
7. **Verification**:
   - Run `npm run build` to confirm 0 compilation errors. Document build results and modified files in `handoff.md`.
8. Send completion report to parent when done.
