import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowRight, ShieldAlert, Target, Plus } from 'lucide-react';

interface MistakesAutopsyHeroProps {
  totalMistakes: number;
  unresolvedCount: number;
  resolvedCount: number;
  resolutionRate: number;
  onOpenLogModal: () => void;
}

export const MistakesAutopsyHero: React.FC<MistakesAutopsyHeroProps> = ({
  totalMistakes,
  unresolvedCount,
  resolvedCount,
  resolutionRate,
  onOpenLogModal,
}) => {
  const marksAtStake = unresolvedCount * 5;

  return (
    <div className="space-y-4">
      {/* 1. TOP TITLE HEADER (SINGLE CLEAN LOG ACTION) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Target className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
              Mistakes Analysis & Precision Vault
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono pl-8">
            SYLLABUS ERROR REHABILITATION & STEP-BY-STEP ANALYTICAL DERIVATIONS
          </p>
        </div>

        {/* Clean Log Mistake Action */}
        <div className="flex items-center gap-2 font-mono text-xs shrink-0 self-start sm:self-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onOpenLogModal}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 font-bold" />
            <span>Log Mistake</span>
          </motion.button>
        </div>
      </div>

      {/* 2. ERROR PRECISION & IMPACT HERO CARD (ZERO REDUNDANCY) */}
      <div className="bg-[#121318] border border-zinc-800 rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-[0_0_50px_rgba(79,70,229,0.04)] text-left">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <ShieldAlert className="w-64 h-64 text-indigo-500" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center justify-between">
          
          {/* Active Error Vault Queue */}
          <div className="flex-1 space-y-2 text-left w-full md:w-auto">
            <div className="text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider">
              Pending Error Queue
            </div>
            <div className="flex items-end gap-2.5">
              <div className="text-4xl sm:text-5xl font-display font-bold text-rose-400">
                {unresolvedCount} <span className="text-xl text-zinc-600">/ {totalMistakes}</span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/20 border border-rose-900/30">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-xs text-rose-300 font-mono font-semibold">
                {unresolvedCount} Errors Require Re-Solving
              </span>
            </div>
          </div>

          {/* The JEE Impact Delta */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center px-4 my-2 md:my-0">
            <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest mb-2 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-900/50 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              ~{marksAtStake} JEE Marks at Stake
            </div>
            <div className="h-0.5 w-28 bg-gradient-to-r from-zinc-800 via-indigo-500/50 to-zinc-800 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#121318] border border-indigo-900/50 rounded-full flex items-center justify-center">
                <ArrowRight className="w-3 h-3 text-indigo-400" />
              </div>
            </div>
            <div className="mt-3 text-xs font-mono text-zinc-400 text-center">
              Re-solving errors prevents repeat mistakes in test
            </div>
          </div>

          {/* Recovery & Precision Score */}
          <div className="flex-1 space-y-2 text-left md:text-right w-full md:w-auto">
            <div className="text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center md:justify-end gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Precision Recovery Rate
            </div>
            <div className="flex items-end md:justify-end gap-2.5">
              <div className="text-4xl sm:text-5xl font-display font-bold text-emerald-400">
                {resolutionRate}%
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
              <span className="text-xs text-emerald-400 font-mono font-semibold">
                {resolvedCount} of {totalMistakes} Mastered & Solved
              </span>
            </div>
          </div>

        </div>

        {/* Action Strategy Banner */}
        <div className="relative z-10 mt-6 p-3.5 sm:p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs sm:text-sm text-zinc-300">
            🎯 <strong className="text-white">Precision Target:</strong> Step through questions in Practice Mode or launch the Timed CBT Retest Arena to lock in 100% precision.
          </div>
          <div className="text-xs font-mono font-bold text-indigo-400 shrink-0">
            {resolvedCount} Solved • {unresolvedCount} Remaining
          </div>
        </div>
      </div>
    </div>
  );
};
