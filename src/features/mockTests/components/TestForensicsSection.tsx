import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Clock, AlertTriangle, Zap, CheckCircle2, 
  XCircle, TrendingDown, TrendingUp, ShieldAlert,
  ArrowRight, Award, Brain, BarChart2
} from 'lucide-react';
import { MockAttemptEvaluation, EvaluatedMockQuestion } from '@/utils/mockScoring';
import { SubjectId } from '@/types/index';
import { MathRenderer } from '@/components/MathRenderer';

interface TestForensicsSectionProps {
  analysis: MockAttemptEvaluation;
  onSelectQuestion?: (idx: number) => void;
}

export function TestForensicsSection({ analysis, onSelectQuestion }: TestForensicsSectionProps) {
  // 1. Compute Subject Time Distribution vs Optimal JEE Benchmark
  const subjectTimeBreakdown = useMemo(() => {
    const times: Record<SubjectId, { seconds: number; targetMins: number; correct: number; incorrect: number }> = {
      physics: { seconds: 0, targetMins: 55, correct: 0, incorrect: 0 },
      chemistry: { seconds: 0, targetMins: 40, correct: 0, incorrect: 0 },
      maths: { seconds: 0, targetMins: 85, correct: 0, incorrect: 0 },
    };

    analysis.detailedQuestions.forEach(item => {
      const sub = item.sectionSubject;
      if (times[sub]) {
        const s = item.attempt.timeSpentSeconds || 0;
        times[sub].seconds += s;
        if (item.isCorrect) times[sub].correct++;
        if (item.isIncorrect) times[sub].incorrect++;
      }
    });

    return {
      physics: {
        ...times.physics,
        actualMins: Math.round(times.physics.seconds / 60),
        diff: Math.round(times.physics.seconds / 60) - times.physics.targetMins
      },
      chemistry: {
        ...times.chemistry,
        actualMins: Math.round(times.chemistry.seconds / 60),
        diff: Math.round(times.chemistry.seconds / 60) - times.chemistry.targetMins
      },
      maths: {
        ...times.maths,
        actualMins: Math.round(times.maths.seconds / 60),
        diff: Math.round(times.maths.seconds / 60) - times.maths.targetMins
      }
    };
  }, [analysis]);

  // 2. Dead-Time Trap Questions (Time Spent > 200s and got wrong or left unattempted)
  const deadTimeTraps = useMemo(() => {
    return analysis.detailedQuestions
      .filter(item => (item.attempt.timeSpentSeconds || 0) >= 180 && !item.isCorrect)
      .sort((a, b) => (b.attempt.timeSpentSeconds || 0) - (a.attempt.timeSpentSeconds || 0));
  }, [analysis]);

  const totalDeadTimeSeconds = deadTimeTraps.reduce((acc, q) => acc + (q.attempt.timeSpentSeconds || 0), 0);
  const totalDeadTimeMinutes = Math.round(totalDeadTimeSeconds / 60);

  // 3. High-Efficiency Quick Hits (Correct in < 75s)
  const highEfficiencyHits = useMemo(() => {
    return analysis.detailedQuestions
      .filter(item => item.isCorrect && (item.attempt.timeSpentSeconds || 0) <= 75 && (item.attempt.timeSpentSeconds || 0) > 0)
      .sort((a, b) => (a.attempt.timeSpentSeconds || 0) - (b.attempt.timeSpentSeconds || 0));
  }, [analysis]);

  // 4. Strategic 3-Round Attempt Distribution
  const roundBreakdown = useMemo(() => {
    let round1 = { count: 0, correct: 0 }; // < 90s
    let round2 = { count: 0, correct: 0 }; // 90s - 180s
    let round3 = { count: 0, correct: 0 }; // > 180s

    analysis.detailedQuestions.forEach(item => {
      if (item.isUnattempted) return;
      const t = item.attempt.timeSpentSeconds || 0;
      if (t < 90) {
        round1.count++;
        if (item.isCorrect) round1.correct++;
      } else if (t <= 180) {
        round2.count++;
        if (item.isCorrect) round2.correct++;
      } else {
        round3.count++;
        if (item.isCorrect) round3.correct++;
      }
    });

    return { round1, round2, round3 };
  }, [analysis]);

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* 1. EXAM TIME SPLIT VS BENCHMARK AUDIT */}
      <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-display font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Subject Time Allocation vs JEE Benchmark
            </h3>
            <p className="text-xs text-zinc-400 font-sans">
              Compares your actual test section duration against optimal standard JEE strategy.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Physics */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-sky-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">Physics</span>
              <span className="text-[10px] font-mono text-zinc-400">Target: 55m</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-bold text-white">{subjectTimeBreakdown.physics.actualMins}m</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                Math.abs(subjectTimeBreakdown.physics.diff) <= 8
                  ? 'bg-emerald-950/60 text-emerald-300'
                  : subjectTimeBreakdown.physics.diff > 8
                  ? 'bg-amber-950/60 text-amber-300'
                  : 'bg-indigo-950/60 text-indigo-300'
              }`}>
                {subjectTimeBreakdown.physics.diff > 0 ? `+${subjectTimeBreakdown.physics.diff}m Over` : `${subjectTimeBreakdown.physics.diff}m Under`}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 block">
              {subjectTimeBreakdown.physics.correct} Correct • {subjectTimeBreakdown.physics.incorrect} Incorrect
            </span>
          </div>

          {/* Chemistry */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Chemistry</span>
              <span className="text-[10px] font-mono text-zinc-400">Target: 40m</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-bold text-white">{subjectTimeBreakdown.chemistry.actualMins}m</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                subjectTimeBreakdown.chemistry.actualMins <= 45
                  ? 'bg-emerald-950/60 text-emerald-300'
                  : 'bg-red-950/60 text-red-300'
              }`}>
                {subjectTimeBreakdown.chemistry.diff > 0 ? `+${subjectTimeBreakdown.chemistry.diff}m Over` : `${subjectTimeBreakdown.chemistry.diff}m Under`}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 block">
              {subjectTimeBreakdown.chemistry.correct} Correct • {subjectTimeBreakdown.chemistry.incorrect} Incorrect
            </span>
          </div>

          {/* Mathematics */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-purple-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-400 uppercase">Mathematics</span>
              <span className="text-[10px] font-mono text-zinc-400">Target: 85m</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-bold text-white">{subjectTimeBreakdown.maths.actualMins}m</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                subjectTimeBreakdown.maths.actualMins >= 65
                  ? 'bg-emerald-950/60 text-emerald-300'
                  : 'bg-amber-950/60 text-amber-300'
              }`}>
                {subjectTimeBreakdown.maths.diff > 0 ? `+${subjectTimeBreakdown.maths.diff}m Over` : `${subjectTimeBreakdown.maths.diff}m Under`}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 block">
              {subjectTimeBreakdown.maths.correct} Correct • {subjectTimeBreakdown.maths.incorrect} Incorrect
            </span>
          </div>

        </div>
      </div>

      {/* 2. DEAD-TIME & NEGATIVE-ROI TRAP REPORT */}
      <div className="p-6 rounded-3xl border border-red-950/50 bg-red-950/10 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-900/30 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-display font-bold text-red-300 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Dead-Time & Negative-ROI Question Traps
            </h3>
            <p className="text-xs text-zinc-400">
              Questions where over 3 minutes were spent but yielded 0 or negative marks.
            </p>
          </div>

          <div className="px-3 py-1 rounded-xl bg-red-950/60 border border-red-800/40 text-red-300 font-mono text-xs font-bold shrink-0">
            {totalDeadTimeMinutes} Wasted Minutes ({deadTimeTraps.length} Trap Questions)
          </div>
        </div>

        {deadTimeTraps.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-emerald-400">
            ✓ Exceptional discipline! Zero questions suffered from excessive time-sink traps.
          </div>
        ) : (
          <div className="space-y-2.5">
            {deadTimeTraps.slice(0, 5).map((item, idx) => {
              const seconds = item.attempt.timeSpentSeconds || 0;
              const mins = Math.floor(seconds / 60);
              const remSec = seconds % 60;

              return (
                <div
                  key={idx}
                  onClick={() => onSelectQuestion && onSelectQuestion(item.globalIndex - 1)}
                  className="p-3.5 rounded-2xl bg-zinc-950/80 border border-red-900/30 hover:border-red-500/50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-900/50">
                        Q{item.globalIndex} • {item.sectionSubject}
                      </span>
                      <span className="text-xs font-mono text-red-300 font-bold">
                        {item.isIncorrect ? '-1 Negative Mark' : 'Unattempted after sink'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-300 font-sans truncate">
                      {item.question.text || 'Question statement'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-bold text-red-400">
                      {mins}m {remSec}s
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 group-hover:text-white transition-colors">
                      Inspect →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 3-ROUND STRATEGIC PACING BREAKDOWN */}
      <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-4">
        <h3 className="text-base font-display font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          3-Round Attempt Strategy Distribution
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          
          {/* Round 1: Fast Execution (<90s) */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-emerald-500/30 space-y-1.5">
            <span className="text-emerald-400 font-bold uppercase block">Round 1: Rapid Fire (&lt;90s)</span>
            <div className="text-2xl font-bold text-white">
              {roundBreakdown.round1.count} <span className="text-xs text-zinc-400">Questions</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Accuracy: <strong className="text-emerald-300">{roundBreakdown.round1.count > 0 ? Math.round((roundBreakdown.round1.correct / roundBreakdown.round1.count) * 100) : 0}%</strong> ({roundBreakdown.round1.correct} / {roundBreakdown.round1.count})
            </p>
          </div>

          {/* Round 2: Standard Solve (90-180s) */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-sky-500/30 space-y-1.5">
            <span className="text-sky-400 font-bold uppercase block">Round 2: Standard (90-180s)</span>
            <div className="text-2xl font-bold text-white">
              {roundBreakdown.round2.count} <span className="text-xs text-zinc-400">Questions</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Accuracy: <strong className="text-sky-300">{roundBreakdown.round2.count > 0 ? Math.round((roundBreakdown.round2.correct / roundBreakdown.round2.count) * 100) : 0}%</strong> ({roundBreakdown.round2.correct} / {roundBreakdown.round2.count})
            </p>
          </div>

          {/* Round 3: Deep Calculation (>180s) */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-purple-500/30 space-y-1.5">
            <span className="text-purple-400 font-bold uppercase block">Round 3: Deep Sinks (&gt;180s)</span>
            <div className="text-2xl font-bold text-white">
              {roundBreakdown.round3.count} <span className="text-xs text-zinc-400">Questions</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Accuracy: <strong className="text-purple-300">{roundBreakdown.round3.count > 0 ? Math.round((roundBreakdown.round3.correct / roundBreakdown.round3.count) * 100) : 0}%</strong> ({roundBreakdown.round3.correct} / {roundBreakdown.round3.count})
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
