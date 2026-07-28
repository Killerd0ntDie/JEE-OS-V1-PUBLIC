# Subject Split Strategy Analysis Report — R1

## Executive Summary
This analysis details the exact codebase structure, state flow, and line-by-line requirements to complete **R1 of the Subject Split Strategy** feature in JEE-OS. 

The Subject Split Strategy allows students to configure how their daily study schedule distributes time across core subjects (Physics, Chemistry, Mathematics):
1. `3_a_day` (Default): Study Physics, Chemistry, and Mathematics every day.
2. `2_a_day_alternating`: Study 2 subjects per day with alternating rotation (Phys+Chem → Chem+Maths → Maths+Phys).
3. `1_a_day_alternating`: Study 1 subject per day with daily rotation (Physics → Chemistry → Maths).

---

## 1. Type Definitions Audit (`src/types/index.ts`)

In `src/types/index.ts`, `MentorProfile` is defined starting at line 522:
- **Exact File Path**: `src/types/index.ts` (lines 522–561)
- **Line 533**:
  ```typescript
  subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';
  ```
- **Analysis**:
  - The type union `'3_a_day' | '2_a_day_alternating' | '1_a_day_alternating'` is already defined on `MentorProfile`.
  - To ensure backwards compatibility with legacy profiles saved in storage, `subjectSplitStrategy` remains optional (`?`), but all runtime initializations and wizard defaults fall back to `'3_a_day'`.
  - In `src/engines/planner/types.ts` (line 50), `userPreferences` also defines `subjectSplitStrategy?: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';`.

---

## 2. Interview Wizard Analysis (`src/components/mentor/MentorInterviewModal.tsx`)

### Current State
`MentorInterviewModal.tsx` currently operates as a 5-step modal wizard:
- Line 22: `const [step, setStep] = useState<number>(1);`
- Line 55-57:
  ```typescript
  const [subjectSplitStrategy, setSubjectSplitStrategy] = useState<'3_a_day' | '2_a_day_alternating' | '1_a_day_alternating'>(
    state.mentorProfile?.subjectSplitStrategy || '3_a_day'
  );
  ```
- Lines 164-170:
  ```typescript
  const stepTitles = [
    'Orientation',
    'Academic Targets',
    'Class & Setup',
    'Reality Audit',
    'Roadmap Lock'
  ];
  ```
- Lines 568–593: `subjectSplitStrategy` is currently embedded as a minor section inside Step 3 ("Class & Setup").
- Lines 793–810: Step 5 ("Roadmap Lock") currently summarizes Daily Hours, Class, Completed Chapters, and Pending Chapters, but lacks a summary badge for the selected Subject Split Strategy.

### Recommended 6-Step Wizard Restructuring
To give Subject Split Strategy prominent focus, the wizard should be upgraded to a **6-step wizard**:
1. Step 1: Orientation (`'Orientation'`)
2. Step 2: Academic Targets (`'Academic Targets'`)
3. Step 3: Class & Setup (`'Class & Setup'`) — *Focus purely on Academic Standard, Coaching, and Daily Hours.*
4. Step 4: Subject Strategy (`'Subject Strategy'`) — *NEW dedicated step for Subject Split Strategy selection with rich option cards.*
5. Step 5: Reality Audit (`'Reality Audit'`) — *Chapter completion audit.*
6. Step 6: Roadmap Lock (`'Roadmap Lock'`) — *Roadmap synthesis with summary of selected strategy.*

### Step 4 UI Specification (Dedicated Step)
- **Title**: "Subject Allocation Strategy"
- **Subtitle**: "Choose how your daily study hours are distributed across Physics, Chemistry, and Mathematics."
- **Option Cards**:
  1. **`3_a_day`**
     - Title: `3 Subjects Daily`
     - Description: `Study Physics, Chemistry, and Mathematics every day.`
     - Badge/Tag: `Balanced Daily Rotation`
  2. **`2_a_day_alternating`**
     - Title: `2 Subjects Alternating`
     - Description: `Study 2 subjects per day with alternating rotation (Phys+Chem -> Chem+Maths -> Maths+Phys).`
     - Badge/Tag: `Dual-Subject Focus`
  3. **`1_a_day_alternating`**
     - Title: `1 Subject Focus`
     - Description: `Study 1 subject per day with daily rotation (Physics -> Chemistry -> Maths).`
     - Badge/Tag: `Deep Single-Subject Focus`

---

## 3. Codebase References & Default Profile Audits

The following files reference `MentorProfile` or initialize default profiles and require review or alignment:

### 1. `src/actions/StudyBrainActions.ts`
- **Line 476–478** (in `resetSystemData` initial profile):
  Currently: `mentorProfile: { interviewCompleted: false } as any`
  Recommendation: Keep or add `subjectSplitStrategy: '3_a_day'` for standard default.
- **Line 510** (in runtime initialization reset):
  Currently: `mentorProfile: { interviewCompleted: false } as any`
- **Line 578–589** (in `updateMentorProfile` fallback):
  Currently defines `currentMentor` fallback without `subjectSplitStrategy`.
  Recommendation: Add `subjectSplitStrategy: '3_a_day'` to `currentMentor` default object.
- **Line 618–630** (`completeMentorInterview` handler):
  Receives `mentorData: Omit<MentorProfile, 'interviewCompleted'>` which includes `subjectSplitStrategy: subjectSplitStrategy` from `MentorInterviewModal.tsx` line 149.
  Passes `mentorData` directly into `tempMentorProfile` (line 698) and `fullMentorProfile` (line 795).

### 2. `src/runtime/StudyBrainRuntime.ts`
- **Line 326**:
  ```typescript
  subjectSplitStrategy: this.state.mentorProfile?.subjectSplitStrategy
  ```
  Properly passes the student's selected strategy into `plannerInput.userPreferences`.

### 3. `src/engines/planner/PlannerEngine.ts`
- **Line 668**:
  ```typescript
  const splitStrategy = input.userPreferences?.subjectSplitStrategy || '3_a_day';
  ```
- **Lines 670–677**:
  Implements the weekly 7-day matrix subject filtering:
  - `3_a_day`: `['physics', 'chemistry', 'maths']`
  - `2_a_day_alternating`: `day % 3 === 0 ? ['physics', 'chemistry'] : day % 3 === 1 ? ['chemistry', 'maths'] : ['maths', 'physics']`
  - `1_a_day_alternating`: `day % 3 === 0 ? ['physics'] : day % 3 === 1 ? ['chemistry'] : ['maths']`

---

## 4. Exact Proposed Code Changes for Implementer

### Change 1: `src/actions/StudyBrainActions.ts`
Add default `subjectSplitStrategy: '3_a_day'` in `updateMentorProfile` fallback (lines 578-589):

```typescript
// src/actions/StudyBrainActions.ts:578
const currentMentor = this.state.mentorProfile || {
  targetExams: ['JEE Main', 'JEE Advanced'],
  targetYear: '2027',
  targetPercentile: '99.5+',
  targetRank: 'AIR 1000',
  targetCollege: 'IIT Bombay',
  targetBranch: 'Computer Science & Engineering',
  currentClass: '12th',
  coachingType: 'Online Coaching',
  dailyAvailableHours: 6,
  subjectSplitStrategy: '3_a_day',
  interviewCompleted: false
};
```

### Change 2: `src/components/mentor/MentorInterviewModal.tsx`
Upgrade to a 6-step wizard and establish Step 4 as the dedicated Subject Split Strategy step:

1. **Step Count & Titles (lines 188, 207, 164-170)**:
```typescript
const stepTitles = [
  'Orientation',
  'Academic Targets',
  'Class & Setup',
  'Subject Strategy',
  'Reality Audit',
  'Roadmap Lock'
];
```
Header count: Change `Step {step} of 5` to `Step {step} of 6`.
Progress grid: Change `grid-cols-5` to `grid-cols-6`.

2. **Step 3 ("Class & Setup") Next Button (line 603)**:
Change `onClick={() => setStep(4)}` (which leads to new Step 4). Remove old inline Subject Allocation Preference (lines 568-593).

3. **Step 4 (NEW - "Subject Strategy") UI Block**:
```tsx
{/* STEP 4: SUBJECT SPLIT STRATEGY */}
{step === 4 && (
  <div className="space-y-6 animate-fade-in">
    <div className="space-y-1">
      <h3 className="text-lg font-display font-bold text-white">Subject Allocation Strategy</h3>
      <p className="text-xs text-zinc-400">Choose how your daily study hours are distributed across Physics, Chemistry, and Mathematics.</p>
    </div>

    <div className="grid grid-cols-1 gap-4">
      {[
        { 
          id: '3_a_day', 
          title: '3 Subjects Daily (Recommended)', 
          desc: 'Study Physics, Chemistry, and Mathematics every day.',
          badge: 'Balanced Rotation',
          detail: 'Maintains daily touchpoints across all subjects to prevent topic decay.' 
        },
        { 
          id: '2_a_day_alternating', 
          title: '2 Subjects Alternating', 
          desc: 'Study 2 subjects per day with alternating rotation (Phys+Chem -> Chem+Maths -> Maths+Phys).',
          badge: 'Dual Subject Focus',
          detail: 'Allows deeper 3-4 hour study blocks per subject while staying multi-subject.' 
        },
        { 
          id: '1_a_day_alternating', 
          title: '1 Subject Focus', 
          desc: 'Study 1 subject per day with daily rotation (Physics -> Chemistry -> Maths).',
          badge: 'Deep Immersion',
          detail: 'Maximum immersion for completing heavy chapters without context switching.' 
        }
      ].map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setSubjectSplitStrategy(opt.id as any)}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            subjectSplitStrategy === opt.id
              ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]'
              : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
          }`}
        >
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-display font-bold text-white">{opt.title}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">
                {opt.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-300 font-sans">{opt.desc}</p>
            <p className="text-[11px] font-mono text-zinc-500">{opt.detail}</p>
          </div>
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
            subjectSplitStrategy === opt.id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-zinc-700 bg-zinc-950'
          }`}>
            {subjectSplitStrategy === opt.id && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </button>
      ))}
    </div>

    <div className="pt-4 flex justify-between">
      <button
        onClick={() => setStep(3)}
        className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
      >
        Back
      </button>
      <button
        onClick={() => setStep(5)}
        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
      >
        Next: Reality Audit
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
)}
```

4. **Update Step 5 (Reality Audit) navigation**:
- Back button: `onClick={() => setStep(4)}`
- Next button: `onClick={() => setStep(6)}`

5. **Update Step 6 (Roadmap Lock) UI Summary & navigation**:
- Back button: `onClick={() => setStep(5)}`
- Add Subject Strategy summary card in Step 6 grid (lines 793-810):
```tsx
<div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
  <span className="text-[9px] text-zinc-500 uppercase block font-bold">Split Strategy</span>
  <span className="text-amber-400 font-bold text-sm font-mono">
    {subjectSplitStrategy === '3_a_day' ? '3 Subjects/Day' : subjectSplitStrategy === '2_a_day_alternating' ? '2 Subjects/Day' : '1 Subject/Day'}
  </span>
</div>
```

---

## 5. Verification Checklist & Invalidation Conditions

1. **Type Checking**:
   - `npx tsc --noEmit` verifies type soundness across `src/types/index.ts`, `src/actions/`, `src/components/`, `src/runtime/`, and `src/engines/`.
2. **Wizard Step Verification**:
   - Verify wizard advances cleanly 1 -> 2 -> 3 -> 4 -> 5 -> 6 and supports backward navigation without state corruption.
3. **Planner Integration Verification**:
   - Complete interview with `2_a_day_alternating` or `1_a_day_alternating` and verify `PlannerEngine` generates valid weekly schedules filtering candidate tasks according to the strategy rotation.
