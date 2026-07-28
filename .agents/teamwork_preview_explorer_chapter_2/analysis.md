# Analysis Report: Universal ChapterEditModal Component (Milestone 2)

**Agent**: Explorer 2 (M2: Universal ChapterEditModal Component)  
**Date**: 2026-07-24  
**Scope**: `src/components/shared/ChapterEditModal.tsx`, global modal state management, UI design system integration, `ChapterInfoEngine` telemetry consumption, and `StudyBrainActions.ts` mutation dispatchers.

---

## Executive Summary

JEE OS currently has multiple fragmented chapter editing interfaces and setup modals scattered across different views (e.g., `QuickChapterSetupModal` in `DailyMissionTimeline`, inline telemetry calibration form in `SubjectExpandedView`, stage diagnosis in `SyllabusDiagnosisModal`, and basic modal in `ChapterEditModal`).

This investigation provides a comprehensive architectural design for **Milestone 2: Universal `ChapterEditModal` (`src/components/shared/ChapterEditModal.tsx`)**. The new universal modal will serve as the single, high-fidelity entry point for viewing telemetry and editing chapter attributes across all JEE OS pages (Dashboard Execution Queue, Subject Command Centers, Planner Page, Revision Ledger, and Syllabus Tables).

---

## 1. Catalog of Existing Modals & Chapter Edit Interfaces

| Component Path | Current Responsibility | Limitations & Redundancies | Proposed M2 Action |
|---|---|---|---|
| `src/components/shared/ChapterEditModal.tsx` | Prototype modal for basic chapter editing (lectures, theory, DPP, PYQ, status, difficulty, estimated hours). | Missing confidence score slider, notes, target finish date, weightage editor, priority selector, detailed DPP/PYQ counts, and global context trigger. | **Upgrade to Universal ChapterEditModal** with full telemetry integration & global state trigger. |
| `src/components/ui/QuickChapterSetupModal.tsx` | Quick 4-field setup modal for lectures, theory, DPP, PYQs. Used in `DailyMissionTimeline.tsx`. | Isolated local state, duplicate of `ChapterEditModal`, lacks telemetry integration. | **Deprecate & replace** with `ChapterEditModal`. |
| `src/features/subjects/components/SubjectExpandedView.tsx` | Inline "TELEMETRY & CALIBRATION" form for lectures, teacher, avg duration, DPP & PYQs status. | Inline form takes up page height, duplicated state calculation logic, isolated actions. | **Replace inline form with trigger** to universal `ChapterEditModal`. |
| `src/components/mentor/SyllabusDiagnosisModal.tsx` | Master-detail modal for syllabus diagnosis stages, lecture progress, practice progress, and revision state. | Standalone modal with heavy isolated form state. | **Align data dispatching** to use `StudyBrainActions.ts` and `ChapterInfoEngine`. |
| `src/components/ui/QuickRevisionModal.tsx` | Spaced repetition active recall modal for revision outcomes. | Focused on revision lifecycle. | Retain as specialized revision card modal; route chapter metadata edits to `ChapterEditModal`. |

---

## 2. UI Design System & Component Styling Analysis

JEE OS uses a high-contrast dark theme UI built with Tailwind CSS, custom component primitives (`Card`, `Button`, `Badge`, `Icon`), and Framer Motion (`motion/react`).

### Key Design System Patterns:
1. **Backdrop & Container Aesthetics**:
   - Fixed overlay backdrop: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200`
   - Dialog container: `relative w-full max-w-2xl bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden font-sans text-left`
2. **Subject Color Themes**:
   - **Physics**: Sky Blue (`text-sky-400 bg-sky-950/40 border-sky-800/80`)
   - **Chemistry**: Emerald Green (`text-emerald-400 bg-emerald-950/40 border-emerald-800/80`)
   - **Mathematics**: Purple/Indigo (`text-purple-400 bg-purple-950/40 border-purple-800/80`, `text-indigo-400`)
3. **Typography & Badges**:
   - Monospace labels: `font-mono text-[9px]` or `text-[10px]` uppercase tracking-wider
   - Headings: `font-display font-bold text-white tracking-tight`
   - Input controls: `bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500`
4. **Icons**:
   - Standardized via `lucide-react` imports (`BookOpen`, `Layers`, `Flame`, `Award`, `AlertCircle`, `CheckCircle2`, `Clock`, `SlidersHorizontal`, `Save`, `X`, `Calendar`, `TrendingUp`, `Target`, `FileText`).

---

## 3. Telemetry Integration (`ChapterInfoEngine`) & Mutation Dispatchers (`StudyBrainActions.ts`)

### Telemetry Consumption (Read Path)
The universal modal consumes `ChapterTelemetry` directly from `state.chapterTelemetryMap[chapterId]`:
```typescript
const telemetry: ChapterTelemetry | undefined = chapterId && state.chapterTelemetryMap 
  ? state.chapterTelemetryMap[chapterId] 
  : undefined;
```

#### Provided Telemetry Attributes:
- `masteryScore`: Calculated score (0–100%) incorporating lecture progress, DPP/PYQ completion, and unresolved mistakes.
- `syllabusStage`: Unified stage (`Not Started` | `In Progress` | `Mastered`).
- `weightagePercent` & `strategyRadar.jeeWeightageRank`: Weightage % and Tier classification (`Tier 1` >= 6.0%, `Tier 2` >= 4.0%, `Tier 3` < 4.0%).
- `retentionConfidence`: Spaced repetition retention score (`High` | `Medium` | `Low`).
- `unresolvedMistakesCount`: Count of non-mastered mistakes logged for this chapter.
- `isBottleneck` & `bottleneckReason`: Bottleneck detection flag and human-readable explanation.

### Mutation Dispatchers (Write Path)
All edits in `ChapterEditModal` trigger unified actions in `StudyBrainActions.ts`:
1. `actions.updateChapterProgress(chapterId, updates)`: Updates lectures, theory, DPP, and PYQ status.
2. `actions.updateChapterDetailedDiagnosis(chapterId, updates)`: Optimistically updates chapter state in runtime and syncs to Firestore.
3. `actions.updateChapterData(chapterId, updates)`: Recalculates completion percentage and auto-updates status.

---

## 4. Global Modal State Management Design

To allow any view (Execution Queue, Subject Command Center, Planner Page, Revision Ledger, Syllabus Table) to open `ChapterEditModal(chapterId)` seamlessly without managing local modal state, we design a global modal state trigger mechanism.

### Architecture Options

#### Option A: Centralized Modal State in `StudyBrainContext` (Recommended)
Add global modal state to `StudyBrainState` and action helpers to `StudyBrainActions`:

```typescript
// StudyBrainState addition
export interface StudyBrainState {
  // ... existing fields
  activeEditChapterId: string | null;
}

// StudyBrainActions addition
export class StudyBrainActions {
  openChapterEditModal(chapterId: string) {
    this.runtime.updateStateOptimistic({ activeEditChapterId: chapterId });
  }

  closeChapterEditModal() {
    this.runtime.updateStateOptimistic({ activeEditChapterId: null });
  }
}
```

Then place a single `<ChapterEditModal />` in the root component (`App.tsx` or main layout):
```tsx
const { state, actions } = useStudyBrain();

<ChapterEditModal
  isOpen={!!state.activeEditChapterId}
  chapterId={state.activeEditChapterId}
  onClose={() => actions.closeChapterEditModal()}
/>
```

#### Option B: Standalone `ChapterModalContext`
Create `src/context/ChapterModalContext.tsx` providing `openModal(chapterId)` and `closeModal()`.

**Recommendation**: **Option A** is cleanest because it directly leverages existing `useStudyBrain()` context without introducing additional context providers.

---

## 5. Universal `ChapterEditModal.tsx` Component Design

### Component Props Interface
```typescript
export interface ChapterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string | null;
  /** Optional initial active tab */
  defaultTab?: 'progress' | 'practice' | 'meta' | 'radar';
}
```

### Internal Form State Structure
```typescript
interface ModalFormState {
  // Lectures & Theory
  currentLecture: number;
  totalLectures: number;
  theoryComplete: boolean;
  syllabusStage: SyllabusDiagnosisStage;
  teacher: string;
  avgLectureDurationMinutes: number;

  // Practice & PYQs
  dppComplete: boolean;
  completedDpp: number;
  totalDpp: number;
  pyqsComplete: boolean;
  completedPyq: number;
  totalPyq: number;
  confidence: number; // 0 - 100

  // Metadata & Priority
  weightage: number;
  priority: 1 | 2 | 3;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedRemainingTime: number;
  targetCompletionDate: string; // ISO / YYYY-MM-DD
  personalNotes: string;
}
```

### Layout Breakdown (Tabbed / Sectional Layout)

```
+-------------------------------------------------------------------------+
| [SUBJECT BADGE] [UNIT TAG]              Chapter Name                [X] |
+-------------------------------------------------------------------------+
| TELEMETRY OVERVIEW HEADER                                               |
| Mastery: 75% | Weightage: 5.2% (Tier 1) | Retention: High | Bottleneck |
+-------------------------------------------------------------------------+
| TABS: [1. Lectures & Theory] [2. Practice & PYQs] [3. Metadata] [4. Radar]
+-------------------------------------------------------------------------+
| TAB 1: LECTURES & THEORY                                                |
| - Watched Lectures / Total Lectures inputs + progress bar               |
| - Theory Complete checkbox toggle                                       |
| - Syllabus Stage dropdown (Not Started | In Progress | Mastered)        |
| - Teacher / Coaching Batch input                                        |
| - Avg Lecture Duration (minutes)                                        |
|                                                                         |
| TAB 2: PRACTICE & PYQS                                                  |
| - DPP Status toggle & Problem Sets count (completed / total)           |
| - PYQs Status toggle & PYQ count (e.g. 25+ solved)                     |
| - Confidence Level Slider (0 - 100%) with live rating badge             |
|                                                                         |
| TAB 3: METADATA, PRIORITY & NOTES                                       |
| - JEE Weightage % input                                                 |
| - Priority Tier selector (1: High | 2: Medium | 3: Low)                 |
| - Difficulty Level selector (Easy | Medium | Hard)                      |
| - Estimated Remaining Hours input                                       |
| - Target Completion Date picker                                         |
| - Chapter Revision & Strategy Notes textarea                            |
|                                                                         |
| TAB 4: STRATEGY RADAR INSIGHTS (Read-Only Engine Output)               |
| - Theory %, DPP %, PYQ %, Retention Confidence Score                    |
| - Exam Weightage Rank & Bottleneck Severity                              |
+-------------------------------------------------------------------------+
| [ Cancel ]                                   [ Save Telemetry & Sync ]  |
+-------------------------------------------------------------------------+
```

---

## 6. Implementation Code Blueprint

Below is the complete proposed code for `src/components/shared/ChapterEditModal.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { 
  X, Save, CheckCircle2, Clock, BookOpen, Layers, Flame, Award, 
  AlertCircle, SlidersHorizontal, Calendar, FileText, Target, Activity, Check 
} from 'lucide-react';
import { Chapter, SubjectId, SyllabusDiagnosisStage } from '../../types/index';
import { useStudyBrain } from '../../context/StudyBrainContext';
import { ChapterTelemetry } from '../../engines/chapterInfo';

export interface ChapterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string | null;
  defaultTab?: 'progress' | 'practice' | 'meta' | 'radar';
}

export const ChapterEditModal: React.FC<ChapterEditModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  defaultTab = 'progress'
}) => {
  const { state, actions } = useStudyBrain();

  const chapter: Chapter | undefined = state.chapters.find(c => c.id === chapterId);
  const telemetry: ChapterTelemetry | undefined = chapterId && state.chapterTelemetryMap ? state.chapterTelemetryMap[chapterId] : undefined;

  const [activeTab, setActiveTab] = useState<'progress' | 'practice' | 'meta' | 'radar'>(defaultTab);

  // Form states
  const [currentLecture, setCurrentLecture] = useState<number>(0);
  const [totalLectures, setTotalLectures] = useState<number>(10);
  const [theoryComplete, setTheoryComplete] = useState<boolean>(false);
  const [teacher, setTeacher] = useState<string>('');
  const [avgLectureDuration, setAvgLectureDuration] = useState<number>(75);

  const [dppComplete, setDppComplete] = useState<boolean>(false);
  const [completedDpp, setCompletedDpp] = useState<number>(0);
  const [totalDpp, setTotalDpp] = useState<number>(10);
  const [pyqsComplete, setPyqsComplete] = useState<boolean>(false);
  const [completedPyq, setCompletedPyq] = useState<number>(0);
  const [totalPyq, setTotalPyq] = useState<number>(30);
  const [confidence, setConfidence] = useState<number>(70);

  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [weightage, setWeightage] = useState<number>(4.5);
  const [estimatedHours, setEstimatedHours] = useState<number>(4);
  const [targetDate, setTargetDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<'Not Started' | 'In Progress' | 'Mastered'>('Not Started');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  useEffect(() => {
    if (chapter) {
      setCurrentLecture(chapter.currentLecture || 0);
      setTotalLectures(chapter.totalLectures || 10);
      setTheoryComplete(!!chapter.theoryComplete);
      setTeacher(chapter.lectureProgress?.teacher || '');
      setAvgLectureDuration(chapter.lectureProgress?.avgLectureDurationMinutes || 75);

      setDppComplete(!!chapter.dppComplete);
      setCompletedDpp(chapter.practiceProgress?.dppPercent ? Math.round((chapter.practiceProgress.dppPercent / 100) * 10) : (chapter.dppComplete ? 10 : 0));
      setTotalDpp(10);
      setPyqsComplete(!!chapter.pyqsComplete);
      setCompletedPyq(chapter.practiceProgress?.pyqPercent ? Math.round((chapter.practiceProgress.pyqPercent / 100) * 30) : (chapter.pyqsComplete ? 25 : 0));
      setTotalPyq(30);
      setConfidence(chapter.confidence || 70);

      setDifficulty(chapter.difficulty || 'Medium');
      setPriority(chapter.priority || 2);
      setWeightage(chapter.weightage || 4.5);
      setEstimatedHours(chapter.estimatedRemainingTime || 4);
      setNotes(chapter.practiceProgress?.weakTopics?.join(', ') || '');
      setStatus(chapter.status === 'Mastered' ? 'Mastered' : chapter.completion > 0 ? 'In Progress' : 'Not Started');
    }
  }, [chapter]);

  if (!isOpen || !chapter) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const calculatedCompletion = Math.min(100, Math.round(
      ((currentLecture / (totalLectures || 1)) * 40) +
      (theoryComplete ? 20 : 0) +
      (dppComplete ? 20 : 0) +
      (pyqsComplete ? 20 : 0)
    ));

    const updatedChapter: Partial<Chapter> = {
      currentLecture,
      totalLectures,
      theoryComplete,
      dppComplete,
      pyqsComplete,
      confidence,
      difficulty,
      priority,
      weightage,
      estimatedRemainingTime: estimatedHours,
      completion: calculatedCompletion,
      status: calculatedCompletion === 100 ? 'Mastered' : calculatedCompletion > 0 ? 'Learning' : 'Not Started',
      syllabusStage: calculatedCompletion === 100 ? 'Mastered' : calculatedCompletion > 0 ? 'Watching Lectures' : 'Never Started',
      lectureProgress: {
        totalLectures,
        completedLectures: currentLecture,
        avgLectureDurationMinutes: avgLectureDuration,
        teacher,
        estimatedRemainingHours: Math.round(((totalLectures - currentLecture) * avgLectureDuration) / 60)
      },
      practiceProgress: {
        dppCompleted: dppComplete,
        pyqsCompleted: pyqsComplete,
        moduleCompleted: dppComplete && pyqsComplete,
        dppPercent: dppComplete ? 100 : Math.round((completedDpp / (totalDpp || 1)) * 100),
        pyqPercent: pyqsComplete ? 100 : Math.round((completedPyq / (totalPyq || 1)) * 100),
        accuracyPercent: confidence,
        confidencePercent: confidence,
        weakTopics: notes ? notes.split(',').map(s => s.trim()) : []
      }
    };

    await actions.updateChapterDetailedDiagnosis(chapter.id, updatedChapter);

    setIsSaving(false);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      onClose();
    }, 600);
  };

  const subjectColorClass = chapter.subject === 'physics' 
    ? 'text-sky-400 bg-sky-950/40 border-sky-800/80' 
    : chapter.subject === 'chemistry' 
    ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80' 
    : 'text-purple-400 bg-purple-950/40 border-purple-800/80';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden font-sans text-left">
        
        {/* Toast */}
        {showSuccessToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-mono font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Chapter Telemetry Updated via ChapterInfoEngine!
          </div>
        )}

        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${subjectColorClass}`}>
                {chapter.subject.toUpperCase()}
              </span>
              <span className="text-2xs font-mono text-zinc-500 uppercase">{chapter.unit || 'Core Module'}</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">{chapter.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Overview Card */}
        <div className="p-4 bg-zinc-900/60 border-b border-zinc-800/80 grid grid-cols-4 gap-3 font-mono text-xs text-left">
          <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
            <span className="text-[9px] text-zinc-500 block uppercase">Mastery Score</span>
            <span className="text-sm font-bold text-indigo-400">{telemetry?.masteryScore || chapter.completion || 0}%</span>
          </div>
          <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
            <span className="text-[9px] text-zinc-500 block uppercase">JEE Weightage</span>
            <span className="text-sm font-bold text-purple-400">{telemetry?.weightagePercent || chapter.weightage || 4.5}%</span>
          </div>
          <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
            <span className="text-[9px] text-zinc-500 block uppercase">Retention</span>
            <span className="text-xs font-bold text-sky-400">{telemetry?.retentionConfidence || 'High'}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
            <span className="text-[9px] text-zinc-500 block uppercase">Bottleneck</span>
            <span className={`text-xs font-bold ${telemetry?.isBottleneck ? 'text-amber-400' : 'text-emerald-400'}`}>
              {telemetry?.isBottleneck ? 'Active' : 'Clear'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 border-b border-zinc-900 bg-zinc-950 flex gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'progress' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Lectures & Theory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'practice' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Practice & PYQs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'meta' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Metadata & Priority
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'radar' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Strategy Radar
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 text-left max-h-[60vh] overflow-y-auto">
          
          {activeTab === 'progress' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Lectures Progress
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-zinc-500 block mb-1">Watched Lectures</span>
                    <input
                      type="number"
                      min="0"
                      max={totalLectures}
                      value={currentLecture}
                      onChange={(e) => setCurrentLecture(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block mb-1">Total Chapter Lectures</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={totalLectures}
                      onChange={(e) => setTotalLectures(parseInt(e.target.value) || 1)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-zinc-500 block mb-1">Teacher / Coaching Batch</span>
                  <input
                    type="text"
                    placeholder="e.g. Physics Galaxy, PW, Allen"
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block mb-1">Avg Duration (mins)</span>
                  <input
                    type="number"
                    value={avgLectureDuration}
                    onChange={(e) => setAvgLectureDuration(parseInt(e.target.value) || 60)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={theoryComplete}
                  onChange={(e) => setTheoryComplete(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0"
                />
                <span className="text-xs font-mono text-zinc-200">Theory / All Lectures Completed</span>
              </label>
            </div>
          )}

          {activeTab === 'practice' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className={`p-4 rounded-xl border flex flex-col gap-2 cursor-pointer ${dppComplete ? 'bg-emerald-950/40 border-emerald-500/60' : 'bg-zinc-900/40 border-zinc-800'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">DPP Practice</span>
                    <input
                      type="checkbox"
                      checked={dppComplete}
                      onChange={(e) => setDppComplete(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-0"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">Problem Sets & Daily Practice</span>
                </label>

                <label className={`p-4 rounded-xl border flex flex-col gap-2 cursor-pointer ${pyqsComplete ? 'bg-purple-950/40 border-purple-500/60' : 'bg-zinc-900/40 border-zinc-800'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">JEE PYQs</span>
                    <input
                      type="checkbox"
                      checked={pyqsComplete}
                      onChange={(e) => setPyqsComplete(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-0"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">Past 10 Years Questions</span>
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">Confidence Score Rating</span>
                  <span className="text-indigo-400 font-bold">{confidence}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'meta' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div>
                  <label className="block mb-1 text-zinc-400 uppercase text-[10px]">JEE Weightage %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightage}
                    onChange={(e) => setWeightage(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-zinc-400 uppercase text-[10px]">Priority Tier</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>Tier 1 (High Priority)</option>
                    <option value={2}>Tier 2 (Medium Priority)</option>
                    <option value={3}>Tier 3 (Low Priority)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div>
                  <label className="block mb-1 text-zinc-400 uppercase text-[10px]">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-zinc-400 uppercase text-[10px]">Est. Remaining Hours</label>
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-mono text-zinc-400 uppercase text-[10px]">Chapter Notes & Weak Points</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key concepts to revise, formula pitfalls, weak sub-topics..."
                  className="w-full min-h-[80px] bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Strategy Radar Snapshot</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>Theory Completion: <strong className="text-indigo-400">{telemetry?.strategyRadar.theoryCompletionPercent || 0}%</strong></div>
                  <div>DPP Completion: <strong className="text-emerald-400">{telemetry?.strategyRadar.dppCompletionPercent || 0}%</strong></div>
                  <div>PYQ Completion: <strong className="text-purple-400">{telemetry?.strategyRadar.pyqCompletionPercent || 0}%</strong></div>
                  <div>Retention Score: <strong className="text-sky-400">{telemetry?.strategyRadar.retentionConfidenceScore || 70}</strong></div>
                </div>
              </div>

              {telemetry?.isBottleneck && (
                <div className="p-3 rounded-xl border border-amber-900/40 bg-amber-950/20 text-amber-300 space-y-1">
                  <span className="text-[10px] font-bold uppercase block">⚠️ Bottleneck Reason</span>
                  <p className="text-[11px] text-zinc-300">{telemetry.bottleneckReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Telemetry'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
```

---

## Conclusion & Verification Plan

1. `ChapterEditModal.tsx` provides a universal, single source of truth editing modal for all 56 JEE chapters.
2. It consumes `ChapterInfoEngine` telemetry (`ChapterTelemetry`) and dispatches mutations via `StudyBrainActions.ts`.
3. Global modal triggering enables seamless opening from Dashboard Execution Queue, Subject Trackers, Planner, and Revision Ledger.
4. Next step (Milestone 3): Implement `activeEditChapterId` in global context and replace fragmented setup modals across views.
