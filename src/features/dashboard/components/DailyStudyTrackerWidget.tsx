import React from 'react';
import { motion } from 'motion/react';
import { Zap, Target, Flame, Sparkles } from 'lucide-react';
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
    <div 
      style={{
        background: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(24px) saturate(190%)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)'
      }}
      className="rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden flex-1 flex flex-col justify-between"
    >
      {/* Top Amber Hazard Warning Tape Ribbon */}
      <div 
        className="absolute top-0 inset-x-0 h-1 opacity-75 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(-45deg, #f59e0b 0px, #f59e0b 8px, transparent 8px, transparent 16px)'
        }}
      />

      {/* Caliper Crosshairs */}
      <span className="absolute top-2.5 left-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute top-2.5 right-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute bottom-2.5 right-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          {/* Animated Kinetic Ring Badge */}
          <div className="relative w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
            <svg viewBox="0 0 40 40" className="eva-kinetic-ring w-full h-full absolute inset-0 animate-[spin_10s_linear_infinite]">
              <circle cx="20" cy="20" r="16" className="stroke-amber-400/40 fill-none" strokeWidth="1.5" strokeDasharray="4 4" />
            </svg>
            <svg viewBox="0 0 40 40" className="eva-kinetic-ring w-full h-full absolute inset-0 animate-[spin_6s_linear_infinite_reverse]">
              <circle cx="20" cy="20" r="12" className="stroke-orange-400/50 fill-none" strokeWidth="1.5" strokeDasharray="6 3" />
            </svg>
            <Flame className="w-4 h-4 text-amber-400 relative z-10 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-white tracking-tight uppercase">
              <span className="eva-japanese-badge">稼働追跡 // </span>DAILY STUDY ENGINE
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Target Capacity & Output
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 rounded-xl shadow-sm uppercase">
          {studyHours} / {quotaHours} HRS
        </span>
      </div>

      <div className="space-y-1.5 relative z-10">
        <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
          />
        </div>
        <div className="flex justify-between items-center text-[10.5px] font-mono">
          <span className="text-zinc-500">EFFICIENCY QUOTA</span>
          <span className="text-amber-400 font-bold">{progressPercent}% COMPLETED</span>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs relative z-10 font-mono">
        <div className="space-y-0.5">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-bold">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            LVL {calculatedLevel} <span className={`${color}`}>{title}</span>
          </span>
          <p className="text-xs font-mono font-medium text-zinc-300">
            {currentLevelXP} / {calculatedNextLevelXP} XP
          </p>
        </div>
        <div className="w-40 bg-zinc-950 rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full shadow-[0_0_8px_rgba(129,140,248,0.5)]"
          />
        </div>
      </div>
    </div>
  );
}
