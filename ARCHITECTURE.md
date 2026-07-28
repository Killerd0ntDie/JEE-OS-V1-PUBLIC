# JEE OS Architecture Document

## Overview
JEE OS is a React (Vite) application written in TypeScript, using Firebase Firestore for data persistence and Authentication. It follows a feature-based folder structure, but currently suffers from architectural convergence where the global state context acts as a "God Object."

## Current Stack
- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Radix UI (Lucide Icons)
- **State Management:** React Context (`MissionEngineContext`)
- **Backend/DB:** Firebase Authentication, Firestore
- **Routing:** Conditional rendering (custom `onNavigate` prop), no formal router (e.g., React Router) is actively managing deep links.

## Directory Structure
- `/src/components` - Shared UI components (Card, Button, Badge, etc.)
- `/src/features` - Feature modules (dashboard, mission, subjects, mistakes, mockTests, etc.)
- `/src/repositories` - Firebase data access layer (Chapter, Mistake, Note, Timeline, User)
- `/src/services` - Business logic services (RevisionEngineService)
- `/src/context` - Global state providers (`MissionEngineContext`)
- `/src/types` - Shared TypeScript interfaces

## Data Layer (Repository Pattern)
The application correctly abstracts Firebase calls into repository classes:
- `ChapterRepository.ts`
- `MistakeRepository.ts`
- `NoteRepository.ts`
- `TimelineRepository.ts`
- `UserRepository.ts`

**Pros:** Good separation of external DB dependencies.
**Cons:** Error handling and caching are minimal.

## State Management (`MissionEngineContext`)
The entire application state is managed by a single context (`MissionEngineContext.tsx`, ~1100+ lines).
- It fetches all chapters, notes, mistakes, timeline blocks, and user profiles on load.
- It provides update functions (e.g., `updateChapterData`, `addMistake`) which perform optimistic UI updates and call the repositories.

**Architectural Bottleneck:** 
This is a God Object. Any change to a single mistake or chapter triggers a re-render for components consuming this context. Mixing auth state, user settings, syllabus data, and active session state in one context is not scalable.

## Business Logic Leakage
Business logic is frequently found inside presentation components.
- Example: `calculateMastery` and `getNextAction` are defined and executed inside `SubjectDetailPage.tsx` instead of a dedicated `StudyBrainService`.
- Example: Exam simulation logic and mock score calculations are inside `MockTestsPage.tsx`.

## Current Data Flow
\`\`\`
[Firebase Firestore] 
       <--> [Repositories (CRUD)] 
       <--> [MissionEngineContext (State + Optimistic Updates)] 
       <--> [UI Components (Features)]
\`\`\`

## Recommended Target Architecture
1. **State Segregation:** Split `MissionEngineContext` into `UserContext`, `SyllabusContext`, and `SessionContext`. Alternatively, adopt React Query for server state and Zustand for client state.
2. **Service Layer (Study Brain):** Extract all derivations (mastery, next action, revision queue) into pure TypeScript services/engines.
3. **Routing:** Implement a standard router (e.g., React Router) for deep linking and code splitting.
