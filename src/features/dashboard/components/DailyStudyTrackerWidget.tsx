
import { motion } from 'motion/react';
import { Zap, Flame, } from 'lucide-react';
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
  xpLevel: _xpLevel,
  xpTotal,
  xpNextLevel: _xpNextLevel
}: DailyStudyTrackerWidgetProps) {
  const studyHours = (studyTime / 60).toFixed(1);
  const quotaHours = dailyQuota || 4;
  const progressPercent = Math.round(Math.min((studyTime / (quotaHours * 60)) * 100, 100));

  // Recalculate level and XP progress using the new system
  const { level: calculatedLevel, currentLevelXP, nextLevelXP: calculatedNextLevelXP, progressPercent: xpProgressPercent } = calculateLevelFromXP(xpTotal);
  const { title, color } = getTitleAndColor(calculatedLevel);

  return (
    <div 
      className="rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden flex-1 flex flex-col justify-between bg-surface-1 border border-border-subtle hover:border-border-muted"
    >
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-sm shrink-0">
            <Flame className="w-4 h-4 text-amber-400 relative z-10" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-white tracking-tight uppercase">
              DAILY STUDY ENGINE
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

      {/* Daily Quota Meter */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-zinc-400 font-medium">Daily Quota</span>
          <span className="text-amber-400 font-bold">{progressPercent}% Completed</span>
        </div>
        <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]"
          />
        </div>
      </div>

      {/* XP Level Progression Meter */}
      <div className="border-t border-border-subtle pt-3 space-y-1.5 relative z-10 font-mono">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-300 flex items-center gap-1.5 font-bold">
            <Zap className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
            LVL {calculatedLevel} · <span className={color}>{title}</span>
          </span>
          <span className="text-zinc-400 text-xs">
            <strong className="text-white font-medium">{currentLevelXP}</strong> / {calculatedNextLevelXP} XP
          </span>
        </div>
        <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-full rounded-full shadow-[0_0_8px_rgba(129,140,248,0.3)]"
          />
        </div>
      </div>
    </div>
  );
}
