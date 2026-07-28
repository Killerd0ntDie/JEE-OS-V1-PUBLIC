# Data Flow Audit

## Current Architecture

\`\`\`text
[Firestore DB] 
      │
      ▼
[Repositories] (CRUD wrappers)
      │
      ▼
[MissionEngineContext] (Global React Context)
      │
      ▼
[UI Components] (Dashboard, Subjects, Mission)
\`\`\`

### Step-by-Step Flow (Example: Marking a chapter complete)
1. User clicks "Theory Complete" in `SubjectDetailPage`.
2. Component calls `updateChapterData(chapterId, { theoryComplete: true })` from `MissionEngineContext`.
3. `MissionEngineContext` updates its massive local `chapters` array (Optimistic Update).
4. Context triggers a re-render of the ENTIRE application.
5. Context calls `ChapterRepository.saveChapter()` to push to Firestore.
6. `SubjectDetailPage` re-renders. Inside the render block, it runs `calculateMastery()` to determine the new percentage.

## Identified Flaws

1. **Massive Re-renders:** Because everything lives in one context, changing a single subtopic in one mistake causes the Dashboard, Settings, and Subject pages to re-render.
2. **Business Logic in Render:** Calculations like `calculateMastery`, `getNextAction`, and progress aggregates run during the React render cycle in the UI components, severely impacting performance.
3. **No Rollback:** If the Firestore write in step 5 fails, the local context remains updated. The UI lies to the user.
4. **No True Engine Layer:** There is no "Study Brain." The UI just reads raw rows from the DB and tries to make sense of them on the fly.

## Proposed Data Flow (Future Phase)

\`\`\`text
[Firestore DB]
      │
      ▼
[Data Repositories]
      │
      ▼
[React Query / SWR] (Server State Management & Caching)
      │
      ▼
[Study Brain Services] (Pure TS logic: Planners, Calculators, Mastery Engines)
      │
      ▼
[Zustand] (Client UI State - Active Timers, Modals, Form inputs)
      │
      ▼
[UI Components] (Dumb components, purely presentational)
\`\`\`
