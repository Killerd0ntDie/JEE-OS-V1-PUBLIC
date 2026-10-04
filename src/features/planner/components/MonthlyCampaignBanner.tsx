import { useMemo } from 'react';
import { Swords, Ghost, Zap, Trophy, Flame, TrendingUp, Clock, Target, AlertTriangle, Sparkles } from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { StudyBrainService } from '@/services/studyBrainService';

/**
 * MonthlyCampaignBanner — "Monthly Boss Fight + Ideal Student XP Race"
 *
 * Boss Fight: Scaled dynamically to match the monthly XP required to achieve
 * an elite AIR < 1000 trajectory given the user's exam countdown and syllabus deficit.
 *
 * XP Race: The student races against an "Ideal Aspirant Ghost" whose pace is dynamically
 * calculated from:
 * 1. How close the exam is (Urgency Multiplier based on days remaining).
 * 2. How far the student is from an ideal student (Syllabus Completion Gap & Required Chapter Velocity).
 */
export function MonthlyCampaignBanner() {
  const xp = useStudyBrainStore(state => state.xp);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const chapters = useStudyBrainStore(state => state.chapters);
  const settings = useStudyBrainStore(state => state.settings);

  // ─── 1. EXAM PROXIMITY & IDEAL ASPIRANT BENCHMARK ───────────────────
  const benchmark = useMemo(() => {
    const targetYear = settings?.targetYear || '2026';
    const daysMain = StudyBrainService.getDaysUntilExam(targetYear, 'JEE Main');
    const daysAdv = StudyBrainService.getDaysUntilExam(targetYear, 'JEE Advanced');

    const targetExamName = daysMain > 0 ? 'JEE Main' : (daysAdv > 0 ? 'JEE Advanced' : 'JEE Main');
    const daysUntilExam = daysMain > 0 ? daysMain : (daysAdv > 0 ? daysAdv : 180);

    // Exam Urgency Factor: Closer to the exam -> higher daily study rigor expected from an ideal candidate
    let examUrgencyFactor = 1.0;
    if (daysUntilExam <= 30) {
      examUrgencyFactor = 1.8; // Peak countdown sprint
    } else if (daysUntilExam <= 60) {
      examUrgencyFactor = 1.55; // Intensive test series + rapid recall
    } else if (daysUntilExam <= 120) {
      examUrgencyFactor = 1.35; // Consolidation & depth
    } else if (daysUntilExam <= 240) {
      examUrgencyFactor = 1.15; // Acceleration phase
    } else {
      examUrgencyFactor = 1.0; // Foundation phase
    }

    // ─── Distance from Ideal Student (Syllabus Deficit Engine) ───
    const totalChapters = chapters.length || 75;
    const masteredCount = chapters.filter(c => (c.completion ?? 0) >= 100 || c.status === 'Mastered').length;
    const inProgressCount = chapters.filter(c => (c.completion ?? 0) > 0 && (c.completion ?? 0) < 100 && c.status !== 'Mastered').length;
    const effectiveDone = masteredCount + (inProgressCount * 0.4);
    const remainingChapters = Math.max(0, totalChapters - effectiveDone);
    const actualCompletionPct = totalChapters > 0 ? (effectiveDone / totalChapters) * 100 : 0;

    // Ideal student finishes 100% syllabus 60 days before exam for dedicated CBT test series
    const totalPrepDays = daysUntilExam > 365 ? 730 : 365;
    const finishHorizonDays = 60;
    const activePrepWindow = Math.max(90, totalPrepDays - finishHorizonDays);
    const daysElapsed = Math.max(0, totalPrepDays - daysUntilExam);
    const idealCompletionPct = Math.min(100, Math.max(15, Math.round((daysElapsed / activePrepWindow) * 100)));

    // Syllabus Gap (Deficit)
    const syllabusDeficitPct = Math.max(0, idealCompletionPct - actualCompletionPct);
    const chapterDeficit = Math.round((syllabusDeficitPct / 100) * totalChapters);

    // Required Velocity to conquer remaining syllabus before exam lock-in:
    const usableDays = Math.max(15, daysUntilExam - 30);
    const requiredDailyVelocity = remainingChapters / usableDays;
    // Normal baseline velocity is ~0.25 chapters/day (~2 chapters/week)
    const gapMultiplier = Math.max(1.0, Math.min(1.5, requiredDailyVelocity / 0.25));

    // Final Calibrated Ideal Daily Pace (clamped between 100 and 240 XP/day)
    const idealDailyPace = Math.round(100 * examUrgencyFactor * gapMultiplier);
    const calibratedDailyPace = Math.max(100, Math.min(240, idealDailyPace));

    return {
      targetYear,
      targetExamName,
      daysUntilExam,
      examUrgencyFactor,
      totalChapters,
      masteredCount,
      remainingChapters,
      actualCompletionPct,
      idealCompletionPct,
      chapterDeficit,
      calibratedDailyPace
    };
  }, [settings?.targetYear, chapters]);

  // ─── 2. BOSS FIGHT (Scaled to Ideal Monthly Target) ─────────────────
  const boss = useMemo(() => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // Dynamic Monthly Goal based on Ideal Student Pace
    const monthlyGoal = benchmark.calibratedDailyPace * daysInMonth;
    const earned = xp?.monthly || 0;
    const remaining = Math.max(0, monthlyGoal - earned);
    const healthPercent = (remaining / monthlyGoal) * 100;
    const damagePercent = 100 - healthPercent;
    const isDefeated = remaining <= 0;

    // Boss Identity derivation
    let bossName = 'The Monthly Titan';
    const objective = mentorProfile?.monthlyObjective;
    if (objective?.category) {
      const topic = objective.category.replace(/^Finish\s+/i, '').replace(/^Complete\s+/i, '').replace(/^Increase\s+/i, '');
      bossName = `The ${topic} Boss`;
    } else if (chapters.length > 0) {
      const uncompleted = chapters.filter(c => c.completion < 100 && c.status !== 'Mastered');
      if (uncompleted.length > 0) {
        const weakest = uncompleted.reduce((w, c) =>
          (c.retentionScore || 100) < (w.retentionScore || 100) ? c : w
        , uncompleted[0]);
        bossName = `The ${weakest.name} Boss`;
      }
    }

    return { monthlyGoal, earned, remaining, healthPercent, damagePercent, isDefeated, bossName, daysInMonth };
  }, [xp?.monthly, mentorProfile?.monthlyObjective, chapters, benchmark.calibratedDailyPace]);

  // ─── 3. XP RACE (vs Ideal Student Ghost) ────────────────────────────
  const race = useMemo(() => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = boss.daysInMonth;

    // Ghost pace corresponds to the ideal student's cumulative pace up to today
    const ghostXp = Math.min(boss.monthlyGoal, Math.round(benchmark.calibratedDailyPace * dayOfMonth));
    const userXp = xp?.monthly || 0;
    const diff = userXp - ghostXp;
    const isAhead = diff >= 0;

    // Progress bars capped at 100%
    const ghostPercent = Math.min(100, (ghostXp / boss.monthlyGoal) * 100);
    const userPercent = Math.min(100, (userXp / boss.monthlyGoal) * 100);

    // Days ahead or behind the Ideal Student pace
    const daysEquivalent = benchmark.calibratedDailyPace > 0
      ? Math.abs(Math.round(diff / benchmark.calibratedDailyPace))
      : 0;

    return {
      ghostXp,
      userXp,
      diff,
      isAhead,
      ghostPercent,
      userPercent,
      daysEquivalent,
      dayOfMonth,
      daysInMonth
    };
  }, [xp?.monthly, boss.monthlyGoal, boss.daysInMonth, benchmark.calibratedDailyPace]);

  return (
    <div
      style={{
        background: 'rgba(13, 16, 24, 0.75)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        border: '1px solid rgba(239, 68, 68, 0.40)',
        borderTop: '1.5px solid rgba(239, 68, 68, 0.75)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.25), 0 0 20px rgba(239, 68, 68, 0.15)'
      }}
      className="px-4 sm:px-5 py-4 rounded-2xl flex flex-col gap-3.5 relative overflow-hidden shadow-lg text-left"
    >
      {/* Hazard stripe */}
      <div
        className="absolute top-0 inset-x-0 h-1 opacity-80 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(-45deg, #ef4444 0px, #ef4444 8px, transparent 8px, transparent 16px)'
        }}
      />

      {/* Caliper crosshairs */}
      <span className="absolute top-2 left-2 text-[9px] font-mono text-red-500/60 select-none pointer-events-none">+</span>
      <span className="absolute top-2 right-2 text-[9px] font-mono text-red-500/60 select-none pointer-events-none">+</span>
      <span className="absolute bottom-2 left-2 text-[9px] font-mono text-red-500/60 select-none pointer-events-none">+</span>
      <span className="absolute bottom-2 right-2 text-[9px] font-mono text-red-500/60 select-none pointer-events-none">+</span>

      {/* ═══ ROW 1: Boss Fight ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 z-10">

        {/* Boss Identity */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/30">
            <Swords className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
              MONTHLY BOSS
              <span className="text-zinc-500">LV.{xp?.level || 1}</span>
              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-[8.5px] text-red-300 border border-red-500/30 font-mono">
                {benchmark.examUrgencyFactor >= 1.5 ? 'PEAK COUNTDOWN' : benchmark.examUrgencyFactor >= 1.2 ? 'HIGH RIGOR' : 'FOUNDATION'}
              </span>
            </div>
            <h3 className="text-sm font-tactical font-black text-white uppercase tracking-tight truncate max-w-[200px]">
              {boss.isDefeated ? '✦ DEFEATED ✦' : boss.bossName}
            </h3>
          </div>
        </div>

        {/* Boss HP Bar */}
        <div className="flex-1 w-full min-w-0 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono font-bold uppercase tracking-wider">
            <span className="text-red-400 flex items-center gap-1">
              {boss.isDefeated ? (
                <><Trophy className="w-3 h-3 text-yellow-400" /> BOSS SLAIN</>
              ) : (
                <>HP {boss.remaining.toLocaleString()} / {boss.monthlyGoal.toLocaleString()}</>
              )}
            </span>
            <span className="text-zinc-400">
              {boss.isDefeated
                ? `${boss.earned.toLocaleString()} XP earned!`
                : `${boss.earned.toLocaleString()} XP dealt`
              }
            </span>
          </div>

          {/* HP bar — drains from right as user deals damage */}
          <div className="h-2.5 rounded-full bg-red-950/80 border border-red-900/60 overflow-hidden relative">
            {/* Damage dealt (green, from left) */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-1000 ease-out"
              style={{ width: `${boss.damagePercent}%` }}
            />
            {/* Remaining HP (red, from right) */}
            <div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-red-600 via-rose-500 to-red-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(239,68,68,0.5)]"
              style={{ width: `${boss.healthPercent}%` }}
            />
            {/* Damage boundary marker */}
            {!boss.isDefeated && boss.damagePercent > 2 && boss.damagePercent < 98 && (
              <div
                className="absolute inset-y-0 w-0.5 bg-white/40"
                style={{ left: `${boss.damagePercent}%` }}
              />
            )}
          </div>

          {/* Motivational hint */}
          <div className="text-[10px] font-mono text-zinc-500">
            {boss.isDefeated
              ? 'Boss defeated this month! Keep grinding for bonus XP.'
              : boss.healthPercent <= 20
                ? '🔥 Almost there — one big session could finish it!'
                : `Earn ${boss.remaining.toLocaleString()} more XP this month to sustain an AIR < 1000 trajectory.`
            }
          </div>
        </div>
      </div>

      {/* ═══ ROW 2: Ideal Student XP Race ═══ */}
      <div className="bg-black/40 rounded-xl p-3 px-4 border border-white/10 z-10">

        {/* Race Header */}
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-mono font-bold text-zinc-200 uppercase tracking-wider">
              Ideal Student XP Race
            </span>
          </div>
          <div className="text-[10px] font-mono font-bold">
            {race.isAhead ? (
              <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                {race.daysEquivalent > 0 ? `${race.daysEquivalent}d ahead of Ideal Pace` : 'On pace with Ideal Student'}
              </span>
            ) : (
              <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {race.daysEquivalent > 0 ? `${race.daysEquivalent}d behind Ideal Pace` : 'On pace with Ideal Student'}
              </span>
            )}
          </div>
        </div>

        {/* Ideal Student Telemetry Context Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5 text-[10px] font-mono">
          {/* Exam Proximity Pill */}
          <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>{benchmark.daysUntilExam}d to {benchmark.targetExamName} {benchmark.targetYear}</span>
          </div>

          {/* Ideal Target Pace Pill */}
          <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1">
            <Target className="w-3 h-3 text-cyan-400" />
            <span>{benchmark.calibratedDailyPace} XP/d Ideal Target</span>
          </div>

          {/* Syllabus Gap Pill */}
          {benchmark.chapterDeficit > 0 ? (
            <div className="px-2 py-0.5 rounded-md bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>{benchmark.chapterDeficit} chaps behind ideal trajectory</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Syllabus on track ({Math.round(benchmark.actualCompletionPct)}% done)</span>
            </div>
          )}
        </div>

        {/* Race Track */}
        <div className="space-y-2.5">
          {/* User track */}
          <div className="flex items-center gap-2.5">
            <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border ${
              race.isAhead
                ? 'bg-emerald-950 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-amber-950 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
            }`}>
              <Zap className={`w-3 h-3 ${race.isAhead ? 'text-emerald-400' : 'text-amber-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-2 rounded-full bg-zinc-900 overflow-hidden border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    race.isAhead
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      : 'bg-gradient-to-r from-amber-600 to-amber-400'
                  }`}
                  style={{ width: `${race.userPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-white shrink-0 w-16 text-right">
              {race.userXp.toLocaleString()} XP
            </span>
          </div>

          {/* Ghost track (Ideal Student Pacer) */}
          <div className="flex items-center gap-2.5">
            <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-700 shadow-xs">
              <Ghost className="w-3 h-3 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-2 rounded-full bg-zinc-900 overflow-hidden border border-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-zinc-600 to-zinc-500 transition-all duration-1000 ease-out"
                  style={{ width: `${race.ghostPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-400 shrink-0 w-16 text-right">
              {race.ghostXp.toLocaleString()} XP
            </span>
          </div>
        </div>

        {/* Race explanation footer */}
        <div className="mt-2.5 flex flex-col sm:flex-row justify-between gap-1 text-[10px] font-mono text-zinc-500 border-t border-white/5 pt-2">
          <span>Ghost = Ideal Aspirant pace ({benchmark.calibratedDailyPace} XP/day • {benchmark.remainingChapters} remaining chaps)</span>
          <span>Day {race.dayOfMonth}/{race.daysInMonth}</span>
        </div>
      </div>
    </div>
  );
}

