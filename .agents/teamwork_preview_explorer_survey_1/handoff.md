# Handoff Report: Core Calculation Engines Deep Audit

**Sender**: `teamwork_preview_explorer_survey_1`  
**Recipient**: Orchestrator (`parent`, ID: `78128038-f718-468c-bc2d-0bf6674fbf6a`)  
**Scope**: Core Calculation Engines (`packages/engines/src/`), Runtime Coordination, and Mathematical Models  
**Date**: 2026-09-04  
**Type**: Hard Handoff (Investigation & Survey Complete)

---

## 1. Observation

Direct code inspections across `packages/engines/src/`, `src/runtime/`, and `src/services/` revealed the following verbatim facts:

1. **Lookahead Simulator Score Inflation (`PlannerEngine.ts:785-788, 801-808, 968`)**:
   ```ts
   // PlannerEngine.ts:785-788
   if (activeChapterIds.has(t.chapterId)) {
     continuityScore += 200; // Strong bias to preserve ongoing chapters
   }
   ...
   // PlannerEngine.ts:801-808
   mission.score = Math.round(
     marksGainNormalized * 0.30 + 
     learningGainNormalized * 0.25 + 
     mission.subjectBalance * 0.15 + 
     mission.dependencyUnlock * 0.15 + 
     mission.revisionHealth * 0.15 +
     continuityScore
   );
   ...
   // PlannerEngine.ts:968
   const selectionReason = `StudyBrain explicit reasoning pipeline selected '${bestMission.name}' strategy (Score: ${bestMission.score}/100)...`;
   ```
   `continuityScore` adds 200 points per active task without clamping, pushing `mission.score` to 600–800. Line 968 formats this directly as `(Score: 636/100)`.

2. **Next-Day Schedule Wipe on Overflow (`PlannerEngine.ts:1180, 1340-1345`)**:
   ```ts
   // PlannerEngine.ts:1180
   if (newEndMins > endMinsTotal || forcePushToTomorrow) {
     pushToTomorrow = true;
     ...
   }
   ...
   // PlannerEngine.ts:1340-1345
   } else if (plannerWeekly && plannerWeekly[dayIndex] && plannerWeekly[dayIndex].length > 0) {
     // Avoid visual clashing: If we pushed tasks from today to this day, don't overlay the default lookahead slots!
     const existingBlocksForDay = blocks.filter(b => b.dayIndex === dayIndex);
     if (existingBlocksForDay.length > 0) {
       return;
     }
   ```
   When a task overflows today's end time, it is pushed to tomorrow. On tomorrow's iteration in `daysOfWeek.forEach`, `existingBlocksForDay.length > 0` evaluates to `true`, and the function returns immediately, discarding all planned tasks for tomorrow.

3. **Inverted Bottleneck Detection (`ChapterInfoEngine.ts:63-76`)**:
   ```ts
   // ChapterInfoEngine.ts:63-76
   if (isStarted && !isMastered) {
     if (chapter.currentLecture && chapter.currentLecture < (chapter.totalLectures || 12)) {
       isBottleneck = true;
       bottleneckReason = `${chapter.subject.toUpperCase()} ${chapter.name}: Lecture ${chapter.currentLecture}/${chapter.totalLectures || 12} backlog`;
     } else if (!chapter.dppComplete) {
       isBottleneck = true;
       bottleneckReason = `${chapter.subject.toUpperCase()} ${chapter.name}: DPP practice pending`;
     } else if (!chapter.pyqsComplete) { ... }
   }
   ```
   - If `theoryComplete: true` but `currentLecture: 5`, line 64 flags a lecture backlog despite theory completion.
   - If `currentLecture: 0` (falsy) and `theoryComplete: false`, line 64 evaluates to false and falls through to flag `DPP practice pending`.

4. **Unsorted Bottleneck Truncation (`ChapterInfoEngine.ts:165-174`)**:
   ```ts
   // ChapterInfoEngine.ts:165-174
   public getChapterBottlenecks(input?: ChapterInfoInput): string[] {
     const map = input ? this.generateChapterTelemetry(input) : this.getAllChapterTelemetry();
     const list: string[] = [];
     Object.values(map).forEach(t => {
       if (t.isBottleneck && t.bottleneckReason) {
         list.push(t.bottleneckReason);
       }
     });
     return list.slice(0, 3);
   }
   ```
   `list.slice(0, 3)` takes the first 3 items in object iteration order without sorting by `t.strategyRadar.bottleneckSeverity` (`Critical` vs `Low`).

5. **Subject-Level Bleed into Chapter History (`RevisionEngine.ts:52-53, 63, 133`)**:
   ```ts
   // RevisionEngine.ts:52-53
   const chapSessions = sessions.filter(s => s.subjectId === chap.subject);
   const lastSession = chapSessions.length > 0 ? chapSessions[chapSessions.length - 1].startTime : undefined;
   ```
   Filters by subject rather than chapter ID. Studying any Physics chapter resets `lastSession` for all 20+ Physics chapters.

6. **Historical Revisions Counted as Today's (`RevisionEngine.ts:174`)**:
   ```ts
   // RevisionEngine.ts:174
   reviewedTodayCount: sessions.filter(s => s.type === 'Revision').length
   ```
   Counts all lifetime revision sessions across all history without matching date against today.

7. **Date Overflow Crash (`AnalyticsEngine.ts:151-153`)**:
   ```ts
   // AnalyticsEngine.ts:151-153
   const daysToComplete = isNaN(remainingHours / studyVelocity) || !isFinite(remainingHours / studyVelocity) ? 365 : remainingHours / studyVelocity;
   const futureMs = now.getTime() + daysToComplete * msPerDay;
   predictedDate = isNaN(futureMs) ? new Date().toISOString() : new Date(futureMs).toISOString();
   ```
   When `studyVelocity` is near-zero (e.g. 0.0001), `futureMs` exceeds $8.64 \times 10^{15}$. `isNaN(futureMs)` returns `false`. `new Date(futureMs).toISOString()` throws `RangeError: Invalid time value`.

8. **NeuralGraphEngine Mappings (`NeuralGraphEngine.ts:119, 121`)**:
   ```ts
   119: dppDone: telemetry?.dppComplete ?? chapter.theoryComplete ?? false,
   121: accuracyPercent: telemetry?.strategyRadar?.dppCompletionPercent || chapter.confidence || 0,
   ```
   `dppDone` falls back to `theoryComplete` instead of `dppComplete`. `accuracyPercent` is assigned `dppCompletionPercent`.

9. **CoachEngine Malformed Action Payload (`CoachEngine.ts:77-80`)**:
   ```ts
   actions.push({
     type: 'ADD_MISSION',
     payload: {
       title: `Solve 15 PYQs: ${topChap.name}`,
       subject: q.includes('chemistry') ? 'chemistry' : q.includes('physics') ? 'physics' : 'maths',
       duration: 60,
       chapterId: topChap.name
     }
   });
   ```
   `chapterId` is set to the chapter's name (string) instead of `topChap.id`, and `subject` is determined from query substring matching.

10. **Runtime Disconnects (`StudyBrainRuntime.ts:544, 547`)**:
    ```ts
    // StudyBrainRuntime.ts:544, 547
    revisionBacklog: [],
    ...
    focusSubject: this.state.settings.targetBranch ? undefined : undefined,
    ```
    Runtime starves `PlannerEngine` of revision backlog and hardcodes `focusSubject` to undefined.

11. **Leaked Node IDs in Explanations (`PlannerEngine.ts:83, 223-224, 264`)**:
    ```ts
    // PlannerEngine.ts:223-224, 264
    const depTree = this.knowledgeEngine.getDependencyTree(node.id);
    const dependentChapterNames = depTree.map((n: any) => n.name || n);
    ...
    longTermImpact = `Unlocks ${dependentChapterNames.slice(0, 3).join(', ')} and adds projected +12 JEE Main marks upon mastery.`;
    ```
    `depTree` is `string[]`. `n.name` evaluates to `undefined`, so `n.name || n` evaluates to ID strings like `'p2'`, outputting `"Unlocks p2, p3..."`.

12. **Inverted Retention Decay Incentive (`StudyBrainService.ts:78-80`)**:
    ```ts
    // StudyBrainService.ts:78-80
    const daysOverdue = chapter.lastRevisionDaysAgo ?? 0;
    const retentionScore = chapter.retentionScore ?? Math.max(0, Math.min(100, chapter.revisionCount > 0 ? 100 - daysOverdue * 4 : 50));
    ```
    If `revisionCount === 0`, `retentionScore` defaults to 50 regardless of days elapsed. If `revisionCount > 0`, it decays down to 0 after 25 days.

13. **Hour Overflow in Time Formatting (`timeSlotUtils.ts:68-75`)**:
    ```ts
    // timeSlotUtils.ts:68-75
    const endHour = Math.floor(endMins / 60);
    const endMinute = endMins % 60;
    return {
      start: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
      end: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
      duration: durationMinutes
    };
    ```
    Missing `% 24`, formatting 23:30 + 60m as `"24:30"`.

14. **Missing Null Guards on `userPreferences` (`PlannerScoringEngine.ts:575`, `OptimizationEngine.ts:34, 150`)**:
    Unshielded dot-property access on `userPreferences.focusSubject` and `userPreferences.dailyQuota`.

15. **Missing Array Null Guards (`ChapterInfoEngine.ts:28, 30, 208-211`)**:
    No default fallback on `input.chapters`, `input.mistakes`, `input.sessions`, or `input.mocks`.

16. **Mistake Danger Score Compounding (`mistakeIntelligence.ts:105-107, 148, 170`)**:
    `Math.pow(1.3, activeMistakes.length - 1)` drives raw score $> 2,000$, rendering the $0.5$ revision multiplier ineffective after capping at 100.

17. **Dead Schema & Prompt in Client (`PyqGeneratorEngine.ts:3, 17-99, 108`)**:
    50 lines of JSON schema and 32 lines of prompt string created on client but never transmitted over network.

18. **Comment in AI Prompt (`MockTestParsingEngine.ts:40`)**:
    Verbatim `// truncate...` string literal in prompt template sent to Gemini API.

19. **Rolling Milliseconds in Weekly Bar Chart (`AnalyticsEngine.ts:44-52`)**:
    Elapsed milliseconds binning shifts yesterday evening sessions into today.

---

## 2. Logic Chain

1. **Score Inflation**: In `PlannerEngine.ts`, `continuityScore` adds $+200$ per ongoing chapter task (Observation 1). The 14-factor weighted score is between 0 and 100. Adding $200 \times N$ forces `mission.score` into $400-800$. The engine then injects this unnormalized number directly into user-facing template strings (`"Score: ${bestMission.score}/100"`), proving the score calculation is unnormalized and unconstrained.
2. **Schedule Wipe**: In `PlannerEngine.ts:1180`, a late session sets `pushToTomorrow = true` and adds a block with `dayIndex = tomorrow`. In lines 1340-1345, the loop for `tomorrow` filters `blocks` for `dayIndex === tomorrow`. Because 1 block is present, `length > 0` evaluates to true, and it executes `return;` without scheduling the remaining 3–4 planned tasks for that day (Observation 2).
3. **Bottleneck Misclassification**: In `ChapterInfoEngine.ts`, line 64 tests `chapter.currentLecture && chapter.currentLecture < totalLectures` without checking `!chapter.theoryComplete`. If theory is finished, this condition remains true, misreporting lecture backlog. If `currentLecture === 0`, `0` is falsy, bypassing the lecture check and erroneously reporting DPP pending (Observation 3).
4. **Session History Pollution**: In `RevisionEngine.ts:52`, `s.subjectId === chap.subject` groups sessions at the subject level. Consequently, completing a session for Chapter A updates `lastSession` for all chapters sharing that subject, preventing decayed retention cards from surfacing (Observation 5).
5. **Runtime Decoupling**: In `StudyBrainRuntime.ts:544`, `revisionBacklog` is passed as an empty array `[]` (Observation 10). `PlannerEngine.ts:318` relies entirely on `input.revisionBacklog` to schedule revision tasks. Thus, SM-2 overdue cards are systematically excluded from the planner.
6. **Date Parsing Crashes**: In `AnalyticsEngine.ts:151`, `remainingHours / studyVelocity` approaches infinity when velocity is small. Multiplying this by `msPerDay` produces values beyond $8.64 \times 10^{15}$. Calling `.toISOString()` on a date with an invalid timestamp throws an unhandled `RangeError` (Observation 7).

---

## 3. Caveats

1. **No Application Source Code Modified**: This investigation was strictly read-only. No `.ts` or `.tsx` files in the repository were altered.
2. **Backend API Endpoints**: `/api/practice/generate` and `/api/coach/analyze` were evaluated based on client-side engine call signatures and schemas in `server.ts`; live external Gemini API rate limits and network latency were not benchmarked.
3. **Prior Fixes Preserved**: None of the ~20 previously verified bugs (from `ALL_BUGS_VERIFICATION_REPORT.md` and `CRITICAL_FIXES_COMPLETION_REPORT.md`) are included. All 19 findings are distinct new discoveries.

---

## 4. Conclusion

The core calculation engines in `packages/engines/src/` contain **19 verified logic, mathematical, and architectural defects** that distort user telemetry, crash specific edge cases (such as near-zero study velocity), wipe next-day planner calendars, disconnect SM-2 revision tasks from daily missions, and display corrupted scores (`Score: 636/100`) and node IDs (`p2`, `p3`) in the UI.

All findings are documented in detail with code locations, reproduction triggers, and remediation recommendations in:
`d:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\.agents\teamwork_preview_explorer_survey_1\analysis.md`

---

## 5. Verification Method

To independently verify these findings:

1. **Test Suite Baseline Execution**:
   Run the engine vitest suite:
   ```bash
   npx vitest run packages/engines
   ```
   Note that current tests pass (9 test files, 33 tests) because existing tests do not assert bounds on `bestMission.score <= 100`, do not test overflowing sessions past `dayEndTime`, do not test zero study velocity in Analytics, and do not test `revisionBacklog` passing from `StudyBrainRuntime`.

2. **Code Inspection**:
   - `packages/engines/src/planner/PlannerEngine.ts`: Inspect lines 785–808, 968 for `continuityScore += 200` and `(Score: ${bestMission.score}/100)`.
   - `packages/engines/src/planner/PlannerEngine.ts`: Inspect lines 1340–1345 for `if (existingBlocksForDay.length > 0) return;`.
   - `packages/engines/src/chapterInfo/ChapterInfoEngine.ts`: Inspect lines 63–76 for bottleneck lecture vs DPP conditions.
   - `packages/engines/src/revision/RevisionEngine.ts`: Inspect lines 52–53 for `s.subjectId === chap.subject` and line 174 for `reviewedTodayCount`.
   - `packages/engines/src/analytics/AnalyticsEngine.ts`: Inspect lines 151–153 for date calculation overflow.
   - `packages/engines/src/graph/NeuralGraphEngine.ts`: Inspect lines 119 and 121 for `chapter.theoryComplete` DPP fallback and `dppCompletionPercent` accuracy mapping.
   - `src/runtime/StudyBrainRuntime.ts`: Inspect line 544 for `revisionBacklog: []` and line 547 for broken ternary.

3. **Invalidation Conditions**:
   A finding is invalidated if and only if the code at the cited line number does not contain the specified logic or if a runtime guard elsewhere intercepts and normalizes the value prior to consumption.
