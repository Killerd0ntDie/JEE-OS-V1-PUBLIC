import React from 'react';
import { motion } from 'motion/react';
import { Zap, Target } from 'lucide-react';
import { calculateLevelFromXP, getTitleAndColor } from '@/utils/levelingCalculations';

interface DailyStudyTrackerWidgetProps {
  studyTime: number; // in minutes
  dailyQuota: number; // in hours
  xpLevel: number;
  xpTotal: number;
  xpNextLevel: number;
}

export function DailyStudyTrackerWidget({
  studyTime,
  dailyQuota,
  xpLevel,
  xpTotal,
  xpNextLevel
}: DailyStudyTrackerWidgetProps) {
  const studyHours = (studyTime / 60).toFixed(1);
  const quotaHours = dailyQuota || 4;
  const progressPercent = Math.round(Math.min((studyTime / (quotaHours * 60)) * 100, 100));

  // Recalculate level and XP progress using the new system
  const { level: calculatedLevel, currentLevelXP, nextLevelXP: calculatedNextLevelXP, progressPercent: xpProgressPercent } = calculateLevelFromXP(xpTotal);
  const { title, color } = getTitleAndColor(calculatedLevel);

  return (
    <div className="premium-card rounded-2xl p-5 border border-zinc-800 space-y-4 shadow-sm relative overflow-hidden flex-1 flex flex-col justify-between bg-gradient-to-br from-zinc-900/70 via-zinc-950/80 to-zinc-950">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-sm">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Daily Study Tracker
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono">
              Target Study Capacity
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 px-2.5 py-1 rounded-xl shadow-sm">
          {studyHours} / {quotaHours} hrs
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-indigo-500 h-full rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"
          />
        </div>
        <p className="text-[11px] font-mono text-zinc-400 text-right">
          {progressPercent}% of daily quota completed
        </p>
      </div>

      <div className="border-t border-zinc-850 pt-3 flex items-center justify-between text-xs">
        <div className="space-y-0.5">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            Level {calculatedLevel} <span className={`${color} font-semibold`}>{title}</span>
          </span>
          <p className="text-xs font-mono font-medium text-zinc-300">
            {currentLevelXP} / {calculatedNextLevelXP} XP
          </p>
        </div>
        <div className="w-40 bg-zinc-900/80 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-indigo-400 h-full rounded-full shadow-[0_0_8px_rgba(129,140,248,0.5)]"
          />
        </div>
      </div>
    </div>
  );
}
