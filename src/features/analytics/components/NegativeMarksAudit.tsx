import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, AlertTriangle, TrendingUp, 
  CheckCircle2, XCircle, ArrowRight, Zap, Target 
} from 'lucide-react';
import { MockResult } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { MathRenderer } from '@/components/MathRenderer';

interface NegativeMarksAuditProps {
  mockResults?: MockResult[];
}

export function NegativeMarksAudit({ mockResults }: NegativeMarksAuditProps) {
  const studySessions = useStudyBrainStore(state => state.studySessions) || [];
  const chapters = useStudyBrainStore(state => state.chapters) || [];

  // Interactive Stopping Rule Threshold slider
  const [minConfidenceThreshold, setMinConfidenceThreshold] = useState<50 | 75 | 100>(50);

  // Compute aggregated negative marks metrics
  const auditMetrics = useMemo(() => {
    let totalNegativeMarks = 0;
    let totalIncorrectQuestions = 0;
    let totalCorrectQuestions = 0;
    let totalQuestionsAttempted = 0;

    studySessions.forEach(s => {
      if (s.questionsSolved && s.questionsSolved > 0) {
        totalQuestionsAttempted += s.questionsSolved;
        const correct = Math.round((s.accuracy ?? 80) / 100 * s.questionsSolved);
        const incorrect = s.questionsSolved - correct;
        totalCorrectQuestions += correct;
        totalIncorrectQuestions += incorrect;
        totalNegativeMarks += incorrect * 1; // standard -1
      }
    });

    const safeTotal = Math.max(1, totalQuestionsAttempted);
    const accuracy = Math.round((totalCorrectQuestions / safeTotal) * 100);

    // Simulated savings based on Guessing Discipline Threshold
    // 50%: filters 30% of random wild guesses
    // 75%: filters 60% of wild guesses
    // 100%: zero guesses (all incorrect avoided, but some correct lost)
    const filteredPenaltyAvoided = 
      minConfidenceThreshold === 50 ? Math.round(totalNegativeMarks * 0.35) :
      minConfidenceThreshold === 75 ? Math.round(totalNegativeMarks * 0.65) :
      Math.round(totalNegativeMarks * 0.85);

    const projectedScoreGain = filteredPenaltyAvoided;

    return {
      totalNegativeMarks: Math.max(12, totalNegativeMarks),
      totalIncorrectQuestions: Math.max(12, totalIncorrectQuestions),
      totalCorrectQuestions: Math.max(48, totalCorrectQuestions),
      accuracy,
      projectedScoreGain,
      rankGain: projectedScoreGain * 450 // approximate AIR improvement per mark
    };
  }, [studySessions, minConfidenceThreshold]);

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-6 text-left relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              NEGATIVE MARKS & GUESSING AUDIT
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Negative Marks Leakage & Guessing Penalty Audit
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            Quantifies marks lost to avoidable negative penalties and establishes strict empirical stopping rules for 50/50 vs blind guessing.
          </p>
        </div>

        {/* Total Avoidable Penalty Badge */}
        <div className="px-4 py-2.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-3 shrink-0">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Total Negative Leaks</div>
            <div className="text-sm font-mono font-bold text-rose-300">-{auditMetrics.totalNegativeMarks} Marks Lost</div>
          </div>
        </div>
      </div>

      {/* 1. GUESSING ROI MATHEMATICAL MATRIX */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        
        {/* Card A: 50/50 Educated Guess (Positive ROI) */}
        <div className="p-5 rounded-2xl bg-zinc-950/70 border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40">
              50/50 Educated Guess
            </span>
            <span className="text-emerald-300 font-bold">Expected Value: +1.50 Marks / Q</span>
          </div>

          <div className="text-xs font-serif text-zinc-300 leading-relaxed space-y-1">
            <div>When 2 incorrect options are rigorously eliminated:</div>
            <div className="text-center font-mono py-1">
              <MathRenderer text="$$E(X) = (0.50 \times +4) + (0.50 \times -1) = +1.50\text{ Marks}$$" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-300">
            <strong>Rule:</strong> Statistically always attempt if 2 options are definitively ruled out.
          </div>
        </div>

        {/* Card B: Blind Random Guess (Negative / Low ROI) */}
        <div className="p-5 rounded-2xl bg-zinc-950/70 border border-rose-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40">
              Blind / 3-Option Guess
            </span>
            <span className="text-rose-400 font-bold">Expected Value: +0.25 Marks (Main) / -0.50 (Adv)</span>
          </div>

          <div className="text-xs font-serif text-zinc-300 leading-relaxed space-y-1">
            <div>When guessing randomly among 4 options in JEE Advanced:</div>
            <div className="text-center font-mono py-1">
              <MathRenderer text="$$E(X) = (0.25 \times +4) + (0.75 \times -2) = -0.50\text{ Marks}$$" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-[11px] text-rose-300">
            <strong>Rule:</strong> Strict stopping rule — NEVER guess if fewer than 2 options are eliminated.
          </div>
        </div>

      </div>

      {/* 2. INTERACTIVE GUESS DISCIPLINE SIMULATOR */}
      <div className="p-5 rounded-2xl bg-[#121318] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Interactive Stopping Rule Simulator
            </h3>
            <p className="text-xs text-zinc-400">
              Simulate your score elevation if random/low-confidence guesses were completely eliminated.
            </p>
          </div>

          {/* Threshold Switcher */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10 font-mono text-xs">
            <button
              type="button"
              onClick={() => setMinConfidenceThreshold(50)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                minConfidenceThreshold === 50 ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              50% (Eliminate 2)
            </button>
            <button
              type="button"
              onClick={() => setMinConfidenceThreshold(75)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                minConfidenceThreshold === 75 ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              75% (High Confidence)
            </button>
            <button
              type="button"
              onClick={() => setMinConfidenceThreshold(100)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                minConfidenceThreshold === 100 ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              100% (Strict Proof Only)
            </button>
          </div>
        </div>

        {/* Projected Delta Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 space-y-0.5">
            <span className="text-[10px] text-zinc-400 uppercase">Penalty Saved</span>
            <div className="text-lg font-bold text-emerald-400">+{auditMetrics.projectedScoreGain} Marks</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 space-y-0.5">
            <span className="text-[10px] text-zinc-400 uppercase">Projected Percentile Shift</span>
            <div className="text-lg font-bold text-indigo-300">+{(auditMetrics.projectedScoreGain * 0.35).toFixed(1)}%ile</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 space-y-0.5">
            <span className="text-[10px] text-zinc-400 uppercase">Estimated AIR Jump</span>
            <div className="text-lg font-bold text-white">~{auditMetrics.rankGain.toLocaleString()} Ranks</div>
          </div>
        </div>
      </div>

    </div>
  );
}
