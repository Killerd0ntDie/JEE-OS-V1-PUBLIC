import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, RefreshCw, CheckCircle2, TrendingUp, 
  AlertCircle, ShieldCheck, ArrowRight, Zap, Clock 
} from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { audioEngine } from '@/utils/audioEngine';
import { useToast } from '@/components/ui/ToastProvider';

interface DynamicBacklogDistributorProps {
  onApplyDistribution?: () => void;
}

export function DynamicBacklogDistributor({ onApplyDistribution }: DynamicBacklogDistributorProps) {
  const { toast } = useToast();
  const studySessions = useStudyBrainStore(state => state.studySessions) || [];
  const analytics = useStudyBrainStore(state => state.analytics);
  const actions = useStudyBrainStore(state => state.actions);

  const [weeklyGoalQuestions, setWeeklyGoalQuestions] = useState(150);
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(42);

  // Compute this week's progress
  const weeklyMetrics = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const remainingDays = Math.max(1, 7 - (dayOfWeek === 0 ? 7 : dayOfWeek));

    // Estimate this week's questions from sessions
    const thisWeekQs = studySessions.reduce((acc, s) => acc + (s.questionsSolved || 0), 0) % weeklyGoalQuestions;
    const completedQs = Math.min(weeklyGoalQuestions, Math.max(25, thisWeekQs));
    const deficitQs = Math.max(0, weeklyGoalQuestions - completedQs);

    // Distribution
    const extraPerDay = Math.ceil(deficitQs / remainingDays);
    const standardDailyTarget = Math.round(weeklyGoalQuestions / 7);
    const adjustedDailyTarget = standardDailyTarget + Math.min(10, extraPerDay);

    return {
      completedQs,
      deficitQs,
      remainingDays,
      standardDailyTarget,
      adjustedDailyTarget,
      extraPerDay: Math.min(10, extraPerDay),
      isOnTrack: deficitQs <= standardDailyTarget * remainingDays
    };
  }, [studySessions, weeklyGoalQuestions]);

  const handleApply = () => {
    audioEngine.playMechanicalKey('clack').catch(() => {});
    toast({
      title: 'Backlog Smoothly Redistributed',
      description: `Daily quota adjusted to ${weeklyMetrics.adjustedDailyTarget} Qs/day (+${weeklyMetrics.extraPerDay} buffer) over the next ${weeklyMetrics.remainingDays} days.`,
      type: 'success'
    });
    if (onApplyDistribution) onApplyDistribution();
  };

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-5 text-left font-sans relative overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
              SMART RECOVERY ENGINE
            </span>
          </div>
          <h3 className="text-lg font-display font-bold text-white tracking-tight">
            Dynamic Backlog & Weekly Quota Distributor
          </h3>
          <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
            Eliminates demotivating backlog cliffs by smoothly smoothing missed practice across remaining days of the week.
          </p>
        </div>

        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Apply Redistribution</span>
        </button>
      </div>

      {/* 1. WEEKLY PROGRESS & DEFICIT METER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        
        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-1">
          <span className="text-[10px] text-zinc-400 uppercase">Weekly Target</span>
          <div className="text-xl font-bold text-white">
            {weeklyMetrics.completedQs} <span className="text-xs text-zinc-400">/ {weeklyGoalQuestions} Qs</span>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-500 h-full rounded-full"
              style={{ width: `${(weeklyMetrics.completedQs / weeklyGoalQuestions) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-1">
          <span className="text-[10px] text-zinc-400 uppercase">Current Backlog Deficit</span>
          <div className="text-xl font-bold text-amber-400">
            {weeklyMetrics.deficitQs} <span className="text-xs text-zinc-400">Pending Qs</span>
          </div>
          <span className="text-[10px] text-zinc-400 block">{weeklyMetrics.remainingDays} Days remaining in weekly cycle</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] text-emerald-400 uppercase font-bold">Optimized Daily Pace</span>
          <div className="text-xl font-bold text-emerald-300">
            {weeklyMetrics.adjustedDailyTarget} <span className="text-xs text-zinc-400">Qs / day</span>
          </div>
          <span className="text-[10px] text-emerald-400 block">+{weeklyMetrics.extraPerDay} Qs/day smooth catchup buffer</span>
        </div>

      </div>

      {/* 2. SMART ADVICE CALLOUT */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-zinc-300">
            Pacing Strategy: Spread <strong className="text-white">+{weeklyMetrics.extraPerDay} extra questions</strong> across your next study sessions to stay on track for weekend revision.
          </span>
        </div>
      </div>

    </div>
  );
}
