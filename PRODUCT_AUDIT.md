# Product Audit

## Mission Alignment
**Mission:** Eliminate decision fatigue during JEE preparation by automatically deciding what the student should study, revise and practice every day.

**Current State:** The application *looks* like it fulfills this mission, but underneath the UI, it relies heavily on static templates, hardcoded assumptions, and manual user inputs. It is currently a polished tracker, not an intelligent operating system.

## Screen-by-Screen Audit

### 1. Dashboard (`/features/dashboard`)
- **Purpose:** Command center and overview.
- **Issues:**
  - AI Coach message is randomly selected from a static array (`COACH_TEMPLATES`).
  - Analytics (XP, hours) are largely visual/mocked or loosely tied to real sessions.
  - Countdown timer calculates to May 30th statically.
- **Verdict:** Needs to become entirely driven by the `StudyBrain`.

### 2. Subjects (`/features/subjects`)
- **Purpose:** Syllabus tracking and chapter management.
- **Issues:**
  - `SubjectDetailPage.tsx` is massively overloaded (>1400 lines).
  - Contains embedded logic for mastery calculation.
  - "Next Action" is computed locally rather than assigned globally by an engine.
- **Verdict:** Keep, but heavily refactor. Strip business logic.

### 3. Mission Mode (`/features/mission`)
- **Purpose:** Focus session execution.
- **Issues:**
  - Video placeholders are fake.
  - Contextual details (lecture names, duration) fallback to hardcoded defaults.
- **Verdict:** Crucial feature. Needs real integration with current task data.

### 4. Mistakes Log (`/features/mistakes`)
- **Purpose:** Track and revise errors.
- **Issues:**
  - Good UI and data structure.
  - Disconnected from the main planner (logging a mistake doesn't automatically inject it into tomorrow's plan).
- **Verdict:** Core feature. Needs tighter integration with Planner Engine.

### 5. Mock Tests (`/features/mockTests`)
- **Purpose:** Exam simulation.
- **Issues:**
  - **CRITICAL:** Uses `localStorage`. Not connected to Firebase.
  - Questions are simulated/hardcoded grids.
  - Scoring is purely cosmetic based on UI clicks.
- **Verdict:** Remove completely until a real testing backend/schema is built, or replace with a simple "Log External Test Score" utility for now.

### 6. Analytics (`/features/analytics`)
- **Purpose:** Progress visualization.
- **Issues:**
  - Contains charts displaying static or random data arrays.
- **Verdict:** Rewrite to aggregate real Firestore data.

## Fake Data & Placeholders Identified
1. `MockTestsPage`: `localStorage` state, fake 75-question grid, cosmetic timer.
2. `DashboardPage`: `COACH_TEMPLATES` (fake AI).
3. `SubjectDetailPage`: Inline logic for "Estimated Remaining Time".
4. `MissionMode`: Static lecture titles if chapter data is incomplete.
5. `initialSeeds.ts`: Pre-populates 25+ chapters and mistakes to make the app look full.

## Summary
The product is visually stunning (10/10 UX/UI design) but functionally hollow. The primary bottleneck is the lack of a centralized `StudyBrain` to coordinate data between these isolated features.
