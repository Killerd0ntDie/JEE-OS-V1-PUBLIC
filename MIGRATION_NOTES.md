# Context Fan-out & Migration Architecture

## Overview
`StudyBrainProviders.tsx` introduces 5 fine-grained domain contexts that slice `StudyBrainState`. By subscribing to `StudyBrainRuntime` once at the provider level and fanning out memoized slices, components consuming a specific domain hook (e.g., `useMissions()`) only re-render when fields in that specific slice change, preventing whole-app re-renders on every telemetry update.

---

## The 5 Domain Contexts

| Hook | Context | Sliced State Fields | Primary Consumers |
|------|---------|---------------------|-------------------|
| `useSyllabus()` | `SyllabusContext` | `chapters`, `chapterTelemetryMap`, `knowledgeGraph`, `syllabusProgress`, `chaptersWithData`, `subjectPriorities`, `activeEditChapterId` | Subject trackers, Syllabus tables, Chapter edit modals |
| `useMissions()` | `MissionContext` | `todayMissions`, `plannerOutput`, `timeline`, `isMissionModeActive`, `energyLevel`, `estimatedRemainingHours`, `plannedQuestions`, `targetFinishTime` | Execution Queue, Daily Mission Timeline, Mission Mode, Planner Page |
| `useMistakesState()` | `MistakesContext` | `mistakes`, `revisionTelemetry`, `revisionQueue` | Mistakes Page, Error Book widgets, Batch Review modals |
| `useAnalyticsState()` | `AnalyticsContext` | `analyticsSummary`, `analytics`, `mocks`, `diagnostics`, `riskProfile`, `completionPrediction`, `dashboardSummary`, `coachAnalysis`, `coachMessage` | Analytics Page, Velocity Widgets, Diagnostic Cards |
| `useAppSettings()` | `SettingsContext` | `settings`, `daysRemaining`, `mentorProfile`, `activeSubject`, `loading`, `initializationError`, `writeBlocked` | Settings Page, Sidebar, Topbar, Mentor Modals |

---

## Migration Status

### ✅ Migrated Components
- `DashboardPage.tsx` — uses `useSyllabus()`, `useMissions()`, `useAnalyticsState()`, `useAppSettings()`
- `MistakesPage.tsx` — uses `useMistakesState()`, `useSyllabus()`

### ⏳ Remaining Legacy Consumers (using `useStudyBrain()`)
These 22 components continue to function seamlessly via legacy compatibility mode inside `StudyBrainContext.tsx`:

1. `App.tsx`
2. `Sidebar.tsx`
3. `Topbar.tsx`
4. `AiCoachPage.tsx`
5. `SettingsPage.tsx`
6. `MissionMode.tsx`
7. `PlannerPage.tsx`
8. `RevisionPage.tsx`
9. `DailyMissionTimeline.tsx`
10. `SubjectCommandCenter.tsx`
11. `ChapterCommandCard.tsx`
12. `SubjectExpandedView.tsx`
13. `ChapterEditModal.tsx`
14. `MentorInterviewModal.tsx`
15. `DailyCheckinModal.tsx`
16. `WeeklyCheckinModal.tsx`
17. `MonthlyObjectiveModal.tsx`
18. `SyllabusDiagnosisModal.tsx`
19. `ChapterRevisionInspectorModal.tsx`
20. `FeynmanSandboxModal.tsx`
21. `FormulaSpeedDrillModal.tsx`
22. `QuickRevisionModal.tsx`

> **Note for Developers**: When creating new components or refactoring existing ones, prefer importing domain hooks from `src/context/StudyBrainProviders` over `useStudyBrain()`.
