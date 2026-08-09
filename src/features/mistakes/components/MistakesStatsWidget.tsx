import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Award, Activity } from 'lucide-react';

export interface MistakesStatsWidgetProps {
  totalMistakes: number;
  unresolvedCount: number;
  resolvedCount: number;
  resolutionRate: number;
}

export function MistakesStatsWidget({
  totalMistakes,
  unresolvedCount,
  resolvedCount,
  resolutionRate
}: MistakesStatsWidgetProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
      <motion.div 
        whileHover={{ y: -2, scale: 1.01 }}
        className="glass-card rounded-2xl p-4 border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl relative overflow-hidden group shadow-lg"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block tracking-wider">Total Logged Errors</span>
          <Activity className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
        </div>
        <span className="text-2xl font-black text-white tracking-tight font-display">{totalMistakes}</span>
      </motion.div>

      <motion.div 
        whileHover={{ y: -2, scale: 1.01 }}
        className="glass-card rounded-2xl p-4 border border-rose-500/20 bg-rose-950/20 backdrop-blur-xl relative overflow-hidden group shadow-lg"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-rose-300 uppercase font-semibold block tracking-wider">Active Unresolved</span>
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <span className="text-2xl font-black text-rose-400 tracking-tight font-display">{unresolvedCount}</span>
      </motion.div>

      <motion.div 
        whileHover={{ y: -2, scale: 1.01 }}
        className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-xl relative overflow-hidden group shadow-lg"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-emerald-300 uppercase font-semibold block tracking-wider">Mastered & Fixed</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <span className="text-2xl font-black text-emerald-400 tracking-tight font-display">{resolvedCount}</span>
      </motion.div>

      <motion.div 
        whileHover={{ y: -2, scale: 1.01 }}
        className="glass-card rounded-2xl p-4 border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-xl relative overflow-hidden group shadow-lg"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-indigo-300 uppercase font-semibold block tracking-wider">Resolution Rate</span>
          <Award className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <span className="text-2xl font-black text-gradient-indigo tracking-tight font-display">{resolutionRate}%</span>
      </motion.div>
    </div>
  );
}
