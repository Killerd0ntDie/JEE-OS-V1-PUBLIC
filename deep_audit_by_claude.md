# JEE-OS — Deep Technical Audit
Scope: full repo (`~36.5k` lines TS/TSX across `src/`, plus `server.ts`, `packages/engines`, Firestore config). This goes beyond `TECH_DEBT.md` / `PRODUCT_AUDIT.md`, which already exist in the repo — everything below is either new or materially deeper than what those docs cover. Verified against the actual code, not summarized from comments; two items were confirmed by literally running `tsc --noEmit`.

---

## 0. TL;DR — fix these first

| # | Finding | Severity |
|---|---|---|
| 1 | Live Firebase Admin **service-account private key** sits on disk and was included in the zip you shared | 🔴 Critical |
| 2 | Every `/api/*` AI route **fails open (no auth) whenever `NODE_ENV !== 'production'`**, and nothing in the repo pins that env var | 🔴 Critical |
| 3 | Logging out (or switching accounts) **does not clear the in-memory study data of the previous user** — real risk on shared devices | 🟠 High |
| 4 | XP can be **permanently inflated** via a check→uncheck race with the "God Mode" multiplier | 🟠 High |
| 5 | Streak/day logic uses **UTC dates**, not IST — breaks for exactly the audience this app is built for | 🟠 High |
| 6 | `getDaysUntilExam` **never rolls to next year** — countdown freezes at "0 days" for months after Jan 24 passes | 🟠 High |
| 7 | A refresh call uses a **reason string that isn't in the `RefreshTriggers` type** — silently skips 4 of 5 recompute engines | 🟠 High |

Everything else is below, grouped by area.

---

## 1. Security

### 1.1 `firebase-admin-key.json` is a live private key, present on disk
`server/firebaseAdmin.ts` will load `firebase-admin-key.json` from the project root if `FIREBASE_SERVICE_ACCOUNT_KEY` isn't set. That file is a **real, currently-valid** Google service-account credential (`project_id: jeeosv1`, full RSA private key) — not a placeholder. It's correctly listed in `.gitignore` (`firebase-admin-key.json`, `*firebase-adminsdk*.json`) and isn't in git history (`git ls-files` confirms it was never tracked), so this isn't a git-history leak.

But it **is** sitting unencrypted on the machine, and it just left that machine — it was inside the zip you uploaded to this conversation. `.gitignore` only protects against `git push`; it does nothing when the whole project directory gets zipped and shared (this looks like an AI Studio / Cloud Run export — see `.firebase/`, `assets/.aistudio`, `firebase-applet-config.json`). Whatever produces those export bundles doesn't respect `.gitignore`.

**This key should be treated as compromised and rotated in the Firebase console regardless of what you decide to do with this conversation.** It grants full Admin SDK access (Auth + Firestore) to `jeeosv1`.

Separately: the `VITE_FIREBASE_API_KEY` embedded in `dist/assets/*.js` is **not** a secret — Firebase client API keys are meant to be public; your actual access control is the Firestore rules (see §1.5). Don't confuse the two — only the service-account key above is the real secret.

### 1.2 Auth fails *open*, not closed, and nothing pins the env var that controls it
```ts
export const verifyAuth = async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    req.user = { uid: 'local-dev-user' };
    return next();
  }
  ...
```
Every AI-backed route (`/api/coach/analyze`, `/api/practice/generate`, `/api/mocktest/generate`, `/api/planner/generate-plan`) is gated by this. There's no `Dockerfile`, `Procfile`, or `render.yaml` in the repo that sets `NODE_ENV=production` — it depends entirely on the host (comments reference Render) setting it correctly. If that env var is ever unset, misspelled, or missing on a new deploy target, **every one of those routes becomes fully unauthenticated**, and anyone with the URL can burn your Gemini API quota indefinitely (rate-limited only to 50 req/15min *per IP*, which is trivial to rotate around). Auth-relevant behavior shouldn't hinge on an env var the app never asserts the presence of at boot.

### 1.3 Cross-account / cross-session data leakage on shared devices
`StudyBrainRuntime` is a hard singleton (`getInstance()`), and its in-memory state is **never cleared on logout**:

```ts
// AuthContext.tsx
const logout = async () => {
  ...
  await signOut(auth); // that's it — no runtime reset
};

// StudyBrainContext.tsx
if (!user) {
  runtime.initialize({ loading: false, initializationError: null, writeBlocked: true });
  return; // chapters, mistakes, notes, sessions, mocks, xp — none of it is cleared
}
```
On sign-out, only a `writeBlocked` flag gets set. `chapters`, `mistakes`, `notes`, `studySessions`, `mocks`, `xp`, everything — stays resident in the singleton and still renders via the Zustand mirror. On a shared computer (school lab, library, sibling's laptop — exactly the demographic for a JEE prep app), a student who logs out doesn't actually clear their study history from the screen, and if a second student logs in on the same tab without a hard refresh, there's a real window (until all 9 Firestore `onSnapshot` listeners for the new UID resolve) where the first student's mistake log / personal notes are still what's rendered.

**Fix direction:** call `runtime.dispose()`/re-instantiate (or an explicit `resetToInitialState()`) on `!user`, not just on data reload.

### 1.4 KaTeX rendering has no per-widget guard, and the AI is told to lean on LaTeX heavily
`server.ts`'s prompts explicitly instruct Gemini to "Use LaTeX heavily... wrap inline with `$` and block with `$$`." `react-katex`'s `BlockMath`/`InlineMath` are used with default settings (no `throwOnError={false}`, no per-node try/catch) in `ActiveRecallArena.tsx`, `QuestionViewerWidget.tsx`, `MockTestsPage.tsx`. There is exactly **one** `ErrorBoundary`, wrapped around the entire route tree in `App.tsx`. LLMs reliably produce occasional malformed LaTeX (unbalanced braces, unsupported macros). One bad formula in one AI-generated question doesn't just fail to render — it throws, and the top-level boundary catches it by **blanking the entire routed app**, not just that question card, until the user reloads.

### 1.5 Firestore rules — mostly fine, one thing worth confirming is intentional
```
match /pyq_bank/{document=**} {
  allow read: if request.auth != null;
  allow write: if false;
}
```
`request.auth != null` is also true for **anonymous** sign-ins (`signInAnonymously` is wired up as "Guest" login in `AuthContext.tsx`). So the entire PYQ bank is fully readable by anyone who opens the app and taps "Continue as Guest" — no real account required. If that content is meant to be a value-add for registered users, this rule doesn't enforce that; if it's intentionally public-behind-a-click, it's fine as is.

---

## 2. Correctness / logic bugs

### 2.1 XP can be permanently inflated (check → uncheck exploit)
In `StudyBrainActions.completeTask`:
```ts
const isGodModeActive = (this.state.xp?.streak || 0) >= 7 && (this.state.settings?.enableGodMode !== false);
const finalGainedXp = isGodModeActive ? Math.floor(gainedXp * 1.5) : gainedXp;
const deltaXp = isCompleting ? finalGainedXp : -finalGainedXp;
...
daily: Math.max(0, this.state.xp.daily + deltaXp),
```
The multiplier used to **reverse** a completion (uncheck) is recomputed from *current* state, not the multiplier that was actually applied when the task was completed. Sequence:
1. Complete a 50-XP task while streak is 6 (no multiplier) → `+50`.
2. Complete enough other tasks that streak crosses 7 (God Mode turns on).
3. Uncheck the original task → multiplier is now active, so it subtracts `-75`, not `-50`.
4. Because of the `Math.max(0, ...)` floor, if the running total is below 75 at that point, the subtraction silently clamps instead of going negative — **XP that was never truly earned survives the floor**, and can be re-earned by re-completing the same task.

Net effect: XP/level integrity can drift upward indefinitely through ordinary use, not just deliberate abuse. Fix: store the XP delta that was actually applied on the mission object itself (or in the ledger) and reverse *that* value, not a freshly recomputed one.

### 2.2 Streak/day boundary uses UTC, not local time — wrong for the app's own audience
```ts
const today = new Date().toISOString().split('T')[0]; // UTC calendar date
```
This appears in the streak logic inside `completeTask`. `toISOString()` is always UTC. IST is UTC+5:30. Any student who studies between **12:00 AM and 5:29 AM IST** gets a "today" that's actually still *yesterday* in UTC terms. Depending on when the previous session landed, this can cause the streak to reset incorrectly (looks like a missed day when it wasn't) or fail to advance (two different local days both stamp as the same UTC day). This is a genuinely hard-to-catch bug because it only manifests for late-night study sessions — which, for JEE aspirants, is not a rare edge case.

### 2.3 Exam countdown freezes at "0 days" for months after the date passes
```ts
getDaysUntilExam(targetYear, examType = 'JEE Main') {
  const targetDate = examType === 'JEE Main'
    ? new Date(targetYearNum, 0, 24)   // hardcoded Jan 24
    : new Date(targetYearNum, 4, 30);  // hardcoded May 30
  const diffTime = targetDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffTime / 86_400_000));
}
```
There's no rollover once `targetDate` is in the past — it just floors at `0` forever. This value (`daysRemaining` / `remainingDaysUntilJEE`) feeds directly into the Planner Engine's `PlannerInput` and the Optimization Engine's `targetCompletionDate`. Any user who doesn't proactively bump `targetYear` forward the moment Jan 24 passes will have the entire daily-mission generator behave as if the exam is *today*, indefinitely — this is silent, has no error state, and will look like the app is "acting weird" without any obvious cause months into normal use. Also worth a product decision: JEE Main actually runs two sessions (Jan + Apr), and the exam is typically the year *before* graduation — worth double-checking the `targetYear` semantics match how it's presented in onboarding.

### 2.4 A `refresh()` call uses a reason the type system doesn't recognize
```ts
// StudyBrainActions.ts:1640
await this.runtime.refresh('MANUAL_AUTO_BALANCE', ...); // tsc: not assignable to RefreshTriggers
```
`RefreshTriggers` is `'INIT' | 'CHAPTER_UPDATE' | 'MISTAKE_UPDATE' | 'SESSION_UPDATE' | 'MOCK_UPDATE' | 'SETTINGS_UPDATE'`. Every recompute block inside `StudyBrainRuntime.refresh()` is gated by `if (reason === '<one of those>')`. Passing an unrecognized string means:
- ChapterInfo/Revision telemetry: **skipped**
- KnowledgeGraph: **skipped**
- AnalyticsEngine: **skipped**
- Planner + Optimization: still runs (unconditional block)
- Revision queue recompute: **skipped**

So whatever "manual auto-balance" feature this is calling from ends up regenerating the plan against stale telemetry/analytics/revision-queue data, silently. This was caught by running `tsc --noEmit` directly — it's a real, currently-shipping type error, not a hypothetical.

### 2.5 Optimistic updates have no rollback path
The pattern used throughout `StudyBrainActions` (e.g. `completeTask`, `addMockResult`, `completeStudySession`) is: mutate local state → `runtime.refresh()` (UI updates immediately) → `await Promise.all(savePromises)` → on failure, `handleWriteError` just toasts and sets `lastSyncError`. The already-applied optimistic state is never reverted. Since Firestore's `onSnapshot` listeners only fire on data that *did* change server-side, a failed write leaves the client permanently ahead of what's actually persisted, for the rest of that session (until a hard reload re-syncs truth from Firestore). On a flaky connection this compounds: XP, mission-completion state, and chapter progress can all silently diverge from what's saved.

### 2.6 `sanitizeForFirestore` has a lossy, one-way array transform
```ts
if (obj.some(item => Array.isArray(item))) {
  const cleanedObj: Record<string, any> = {};
  obj.forEach((item, idx) => { cleanedObj[String(idx)] = sanitizeForFirestore(item); });
  return cleanedObj; // array → object, silently
}
```
This exists to dodge Firestore's "no nested arrays" limitation, and it's a reasonable write-side workaround — but there's no corresponding read-side transform back to an array. Any `Chapter` field that ever contains a nested array (e.g. something like `lectureProgress` history, or any future field someone adds without knowing about this) will come back from Firestore as a plain object on the next load, and the first `.map()`/`.filter()` call on it downstream will throw or silently no-op.

### 2.7 Doc/implementation mismatch: leveling curve
```ts
/**
 * New scaling formula: XP requirements increase exponentially with level
 * Level 1-10: 500 XP per level
 * Level 11-20: 750 XP per level
 * ... (tiered, flat-per-band)
 */
export function calculateLevelFromXP(totalXP: number) {
  const level = Math.floor(Math.sqrt(totalXP / 100)) + 1; // continuous sqrt curve, not tiered at all
```
The comment describes a stepped/tiered cost curve; the code is a smooth `sqrt` curve that behaves nothing like the described bands. Whoever tunes mission XP rewards (the `baseXp = 50` in `completeTask`, or the various `xp` values scattered through mission generation) is very likely calibrating against the comment's mental model, not the actual curve — worth reconciling one to the other.

### 2.8 `dayStartTime` / `dayEndTime` are read but were never added to the type
```ts
// StudyBrainRuntime.ts
this.state.settings?.dayStartTime,
this.state.settings?.dayEndTime,
```
`tsc --noEmit` flags four separate usages of these two fields across `StudyBrainRuntime.ts` and `SettingsPage.tsx` — neither exists on `StudyBrainState['settings']`. It "works" at runtime only because these reads are all optional-chained into `undefined`, which `generateWeeklyMatrix` presumably has its own fallback for — but it means day-start/day-end scheduling is currently running on undefined bounds, silently, everywhere, and the type system can't protect it from a future refactor.

---

## 3. Dead code, disconnected features, repo hygiene

### 3.1 The entire offline-resilience subsystem is disconnected
`useOfflineSafeMutation` (which wraps `OfflineQueue`) is **defined but never imported or called anywhere else in the codebase.** Nothing calls `OfflineQueue.enqueue`. `OfflineBanner.tsx` calls `OfflineQueue.flushAll()` on reconnect, but since nothing ever enqueues, it always flushes an empty queue. Meanwhile, the three places that actually *would* benefit from offline queuing — `AiRevisionPlanModal.tsx`, `MockTestsPage.tsx`, `PyqGeneratorEngine.ts` — each hand-roll their own `fetch(...)` with a `Bearer` token instead of going through it. Either finish wiring this up or remove it; right now it's UI (`OfflineBanner`) promising behavior the app doesn't deliver.

Worth knowing if you *do* wire it up: as written, `useOfflineSafeMutation` would persist the raw `Authorization: Bearer <token>` header into `localStorage` for however long the device is offline, then replay it verbatim on reconnect with no refresh — Firebase ID tokens expire in ~1 hour, so anything queued longer than that fails with 401 on flush. `flushAll()` also `break`s on the first failed request, which means one stale-token failure **permanently head-of-line-blocks every mutation queued after it** until the user manually intervenes.

### 3.2 An orphaned, non-compiling file sits at the repo root
`c4f9933_PlannerEngine.ts` (hash-prefixed filename — has the look of an auto-saved diff/backup) imports `./types` and `./PlannerScoringEngine`, neither of which exists relative to the repo root. It doesn't compile (`tsc` confirms). It sits alongside a pile of other root-level one-off scripts — `fix.cjs`, `move_ui.cjs`, `move_planner_ui.py`, `refactor.cjs`, `script.cjs`, `update_modals.cjs`, `diff.txt`, `mission_mode_log.txt`, `test_coach.js`, `test_gemini.ts`, `test_validation.js`, `test_zod.js` — that read like one-off AI-assisted refactor scratch scripts that never got cleaned up. `TECH_DEBT.md` already says root cleanup was "resolved" (patch_*/fix_* purge) — this suggests the pattern is recurring, not fixed once.

### 3.3 `package.json` lists `vite` under both `dependencies` and `devDependencies`
Harmless with npm's resolution/dedupe, but it's a tell that the manifest hasn't been tidied — worth a quick pass since it's the kind of thing that causes real confusion later (e.g., someone assuming `vite` is a runtime dep and shipping it in a serverless bundle).

### 3.4 `any` usage and one `@ts-ignore`
99 occurrences of `: any` and 1 `@ts-ignore`/`@ts-expect-error` across `src/`. Given the app markets itself as having "Type Strictness" enforced (per `TECH_DEBT.md`'s resolved-items list), it's worth knowing where the `any`s cluster — spot-checking, a meaningful share sit at exactly the two boundaries where type safety matters most: parsing AI/Gemini JSON responses, and the `@jee-os/engines` package boundary (input/output types passed as `any` in several `StudyBrainRuntime` call sites, e.g. `CoachInput` fields cast with `as any`).

### 3.5 Two "brain" files carry more responsibility than the ones already flagged
`TECH_DEBT.md` calls out `MistakesPage.tsx` (~1560 lines) and `DashboardPage.tsx` (~970 lines) as large-file debt. Not mentioned there: **`StudyBrainActions.ts` (1642 lines)** and **`StudyBrainRuntime.ts` (710 lines)** — these two together are the entire app's business-logic-plus-I/O core (every Firestore write, every XP/streak/mission mutation, every engine orchestration call), and they're larger and more central than the UI files already on the debt list. A bug in either has app-wide blast radius in a way a bug in `MistakesPage.tsx` doesn't.

---

## 4. Verification notes (what I actually checked, not just read)

- **Ran `tsc --noEmit`** against the real project config. Findings §2.4 and §2.8 came directly from real compiler errors, not inference — you can reproduce both with `npx tsc --noEmit`.
- **Attempted to run the vitest suite** (`vitest run`) — blocked in this sandbox by a missing platform-specific optional dependency (`@rollup/rollup-linux-x64-gnu`, a known npm optional-deps bug: https://github.com/npm/cli/issues/4828). Wasn't able to execute the existing tests (`focusScore.test.ts`, `mistakeIntelligence.test.ts`, `studyBrainService.test.ts`, the engines package tests, etc.) to check for failures — worth running locally with a clean `node_modules` (`rm -rf node_modules package-lock.json && npm i`) since I couldn't confirm they currently pass.
- **Confirmed via `git ls-files`** that `firebase-admin-key.json` and `.env*` are not tracked in git history (only 15 commits total, all clean on that front).
- Grepped the full `src/` tree for `dangerouslySetInnerHTML`, `eval(`, `new Function(` — none found, which is good hygiene.
- Confirmed `node_modules/@jee-os` exists but is **empty** in this sandbox (workspace symlink never got created) — I can't be fully sure whether that's just this sandbox's partial install or reflects something about the real dev environment, so I'm not counting the `@jee-os/engines` "Cannot find module" errors from `tsc` as a confirmed bug — flagging it only so you double check `npm install` correctly links the workspace package before trusting a clean `tsc` run elsewhere.

---

## 5. Everything already covered well (not re-litigated here)

`PRODUCT_AUDIT.md` and `TECH_DEBT.md` already correctly identify: Dashboard's AI-coach message quality, mock test data model gaps, large UI component files, and test-coverage gaps in UI components. Those still stand — this audit intentionally didn't re-derive them.
