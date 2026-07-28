import React from 'react';
import { motion } from 'motion/react';
import { Zap, Target } from 'lucide-react';

interface DailyStudyTrackerWidgetProps {
  studyTime: number; // in seconds
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

  return (
    <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl space-y-4 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-indigo-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-indigo-400" />
          DAILY STUDY TRACKER
        </span>
        <span className="text-xs font-mono font-bold text-white bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
          {studyHours} / {quotaHours} hrs
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="w-full bg-zinc-900/80 rounded-full h-2.5 overflow-hidden border border-zinc-800 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-400 h-full rounded-full shadow-[0_0_12px_rgba(99,102,241,0.5)]"
          />
        </div>
        <p className="text-[10px] text-zinc-400 font-mono text-right">
          {progressPercent}% of daily quota completed
        </p>
      </div>

      <div className="border-t border-zinc-900/80 pt-3 flex items-center justify-between text-xs">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            Level {xpLevel} Mastery
          </span>
          <p className="text-xs font-mono font-bold text-gradient-indigo">
            {xpTotal} / {xpNextLevel} XP
          </p>
        </div>
        <div className="w-36 bg-zinc-900/80 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((xpTotal / xpNextLevel) * 100, 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]"
          />
        </div>
      </div>
    </div>
  );
}
