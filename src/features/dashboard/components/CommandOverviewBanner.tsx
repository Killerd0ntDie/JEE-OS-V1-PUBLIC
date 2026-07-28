import React, { useMemo } from 'react';
import { Target, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useStudyBrain } from '../../../context/StudyBrainContext';
import { ChapterTelemetry } from '../../../engines/chapterInfo';

interface CommandOverviewBannerProps {
  onSetMonthlyObjective: () => void;
  onSetDailyCapacity: () => void;
}

export function CommandOverviewBanner({ onSetMonthlyObjective, onSetDailyCapacity }: CommandOverviewBannerProps) {
  const { state } = useStudyBrain();
  const { mentorProfile, projectedReadiness, chapterTelemetryMap } = state;

  const activeBottlenecks = useMemo(() => {
    const list: string[] = [];
    (Object.values(chapterTelemetryMap || {}) as ChapterTelemetry[]).forEach(t => {
      if (t && t.isBottleneck && t.bottleneckReason) {
        list.push(t.bottleneckReason);
      }
    });
    return list.length > 0 ? list : ['None detected. Great momentum!'];
  }, [chapterTelemetryMap]);

  const dailyCapHours = mentorProfile?.dailyAvailableHours || 6.5;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8">
      {/* Target Readiness */}
      <motion.div 
        whileHover={{ y: -3, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className="glass-card rounded-2xl p-4 relative overflow-hidden group border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-xl"
      >
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
        <span className="text-[10px] font-mono text-indigo-300 uppercase font-bold tracking-wider block mb-1 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          Target Readiness
        </span>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-display font-black text-white tracking-tight">{projectedReadiness}%</span>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase">
            On Track
          </span>
        </div>
        <p className="text-[10px] text-zinc-400 font-mono mt-1">Est Completion: Nov 2026</p>
      </motion.div>

      {/* Monthly Objective */}
      <motion.div 
        whileHover={{ y: -3, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        onClick={onSetMonthlyObjective}
        className="glass-card rounded-2xl p-4 relative overflow-hidden cursor-pointer border border-purple-500/20 bg-purple-950/20 backdrop-blur-xl hover:border-purple-500/40 group"
        title="Click to set or calibrate monthly objective"
      >
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-purple-300 uppercase font-bold tracking-wider block">Monthly Objective</span>
          <Target className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-12 transition-transform" />
        </div>
        <span className="text-sm font-display font-bold text-white truncate block">
          {mentorProfile?.monthlyObjective?.category || 'Finish Mechanics & GOC'}
        </span>
        <p className="text-[10px] text-zinc-400 font-mono truncate mt-1">
          {mentorProfile?.monthlyObjective?.description || 'Click to set or update monthly focus'}
        </p>
      </motion.div>

      {/* Active Bottlenecks */}
      <motion.div 
        whileHover={{ y: -3, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className="glass-card rounded-2xl p-4 relative overflow-hidden border border-amber-500/20 bg-amber-950/20 backdrop-blur-xl group"
      >
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-amber-300 uppercase font-bold tracking-wider block">Active Bottlenecks</span>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <ul className="text-[10px] text-zinc-300 space-y-0.5 font-mono">
          {activeBottlenecks.map((bot, idx) => (
            <li key={idx} className="truncate text-amber-200/90">• {bot}</li>
          ))}
        </ul>
      </motion.div>

      {/* Daily Time Capacity */}
      <motion.div 
        whileHover={{ y: -3, scale: 1.01 }}
        transition={{ duration: 0.2 }}
        onClick={onSetDailyCapacity}
        className="glass-card rounded-2xl p-4 relative overflow-hidden cursor-pointer border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-xl hover:border-emerald-500/40 group"
        title="Click to calibrate today's available hours"
      >
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-emerald-300 uppercase font-bold tracking-wider block">Daily Time Capacity</span>
          <Clock className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
        </div>
        <span className="text-2xl font-display font-black text-white tracking-tight">{dailyCapHours} <span className="text-xs font-mono text-emerald-400 font-normal">hrs/day</span></span>
        <p className="text-[10px] text-zinc-400 font-mono mt-1">Grounded in reality audit (Click to edit)</p>
      </motion.div>
    </div>
  );
}
