import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Flame, CheckCircle2, ArrowRight, Play, 
  BookOpen, AlertCircle, Zap
} from 'lucide-react';
import { springs } from '@/constants/motion';
import { RevisionCardItem } from '@jee-os/engines';
import { Mistake } from '@/types';
import { storageAdapter } from '@/services/StorageAdapter';

interface DailyDoseCommandQueueProps {
  urgentCards: RevisionCardItem[];
  allCards: RevisionCardItem[];
  unresolvedMistakes: Mistake[];
  onStartDailyDose: () => void;
  onLaunchArena: () => void;
  onLaunchSpeedDrill: () => void;
}

export const DailyDoseCommandQueue: React.FC<DailyDoseCommandQueueProps> = ({
  urgentCards,
  unresolvedMistakes,
  onStartDailyDose,
  onLaunchArena,
  onLaunchSpeedDrill,
}) => {
  // Read daily dose status from storageAdapter for persistent session tracking
  const todayKey = new Date().toISOString().split('T')[0];
  const storedProgress = (() => {
    const raw = storageAdapter.getItem<any>(`jeeos_daily_dose_${todayKey}`);
    if (raw) return raw;
    return { cardsCompleted: 0, mistakesCompleted: 0, speedDrillDone: false };
  })();

  const targetCards = 10;
  const targetMistakes = Math.min(3, unresolvedMistakes.length || 3);
  const targetSpeedDrill = 1;
  const totalTasks = targetCards + targetMistakes + targetSpeedDrill;

  const cardsCount = Math.min(targetCards, storedProgress.cardsCompleted || 0);
  const mistakesCount = Math.min(targetMistakes, storedProgress.mistakesCompleted || 0);
  const speedDrillCount = storedProgress.speedDrillDone ? 1 : 0;
  const completedTasks = cardsCount + mistakesCount + speedDrillCount;
  const isFullyComplete = completedTasks >= totalTasks;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="surface-2 rounded-3xl p-5 md:p-6 border border-indigo-500/25 relative overflow-hidden shadow-2xl space-y-4">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-indigo-600/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-64 h-32 bg-amber-500/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>NTA Calibrated Daily Dose</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>+150 XP Bonus</span>
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-display font-bold text-white tracking-tight">
            Daily Spaced Retention Queue
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            A high-efficiency 12-minute daily routine to immunize your memory against forgetting curves: 10 formula cards, 3 mistake re-solves, and 1 speed blitz.
          </p>
        </div>

        {/* Action Button */}
        <div className="shrink-0">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={springs.snappy}
            onClick={onStartDailyDose}
            className={`px-5 py-3 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 shadow-xl transition-all cursor-pointer ${
              isFullyComplete
                ? 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 border border-indigo-400/40'
            }`}
          >
            {isFullyComplete ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Daily Dose Mastered • Re-run</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-white fill-white" />
                <span>Start Daily Dose ({completedTasks}/{totalTasks})</span>
              </>
            )}
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Progress Bar & Stat Strips */}
      <div className="space-y-2 relative z-10 pt-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="font-bold text-white">{completedTasks}</span> of <span>{totalTasks} tasks completed today</span>
          </div>
          <span className={`font-bold ${isFullyComplete ? 'text-emerald-400' : 'text-indigo-300'}`}>
            {progressPercent}%
          </span>
        </div>

        {/* Track */}
        <div className="w-full h-2.5 bg-zinc-950/80 rounded-full overflow-hidden border border-white/10 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              isFullyComplete
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 shadow-sm shadow-indigo-500/50'
            }`}
          />
        </div>
      </div>

      {/* 3 Interactive Workload Slices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 relative z-10">
        
        {/* Slice 1: Spaced Flashcards */}
        <div 
          onClick={onLaunchArena}
          className="p-3.5 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-indigo-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 uppercase font-bold">
                <span>Phase 1</span>
                {cardsCount >= targetCards && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </div>
              <span className="text-xs font-bold text-white block">
                10 Spaced Flashcards
              </span>
              <span className="text-[10px] font-mono text-indigo-300 block">
                {urgentCards.length > 0 ? `${urgentCards.length} overdue in queue` : 'SM-2 Active Recall'}
              </span>
            </div>
          </div>
          <div className="font-mono text-xs text-right shrink-0">
            <span className={`font-bold ${cardsCount >= targetCards ? 'text-emerald-400' : 'text-zinc-300'}`}>
              {cardsCount}/{targetCards}
            </span>
          </div>
        </div>

        {/* Slice 2: Mistake Re-Solves */}
        <div 
          onClick={onStartDailyDose}
          className="p-3.5 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-red-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 group-hover:scale-105 transition-transform">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 uppercase font-bold">
                <span>Phase 2</span>
                {mistakesCount >= targetMistakes && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </div>
              <span className="text-xs font-bold text-white block">
                3 Mistake Re-Solves
              </span>
              <span className="text-[10px] font-mono text-red-300 block">
                {unresolvedMistakes.length > 0 ? `${unresolvedMistakes.length} unresolved traps` : 'Vault Clear'}
              </span>
            </div>
          </div>
          <div className="font-mono text-xs text-right shrink-0">
            <span className={`font-bold ${mistakesCount >= targetMistakes ? 'text-emerald-400' : 'text-zinc-300'}`}>
              {mistakesCount}/{targetMistakes}
            </span>
          </div>
        </div>

        {/* Slice 3: Speed Drill */}
        <div 
          onClick={onLaunchSpeedDrill}
          className="p-3.5 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 uppercase font-bold">
                <span>Phase 3</span>
                {speedDrillCount >= targetSpeedDrill && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </div>
              <span className="text-xs font-bold text-white block">
                30s Speed Blitz
              </span>
              <span className="text-[10px] font-mono text-amber-300 block">
                Instant formula reflex
              </span>
            </div>
          </div>
          <div className="font-mono text-xs text-right shrink-0">
            <span className={`font-bold ${speedDrillCount >= targetSpeedDrill ? 'text-emerald-400' : 'text-zinc-300'}`}>
              {speedDrillCount}/{targetSpeedDrill}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
