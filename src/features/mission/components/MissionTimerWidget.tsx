import React from 'react';
import { motion } from 'motion/react';
import { Zap, Volume2, RotateCcw } from 'lucide-react';

export interface MissionTimerWidgetProps {
  progressPercent: number;
  seconds: number;
  focusScore: number;
  lectureSpeed: number;
  formatTime: (totalSecs: number) => string;
  onResetTimer?: () => void;
  onCycleSpeed?: () => void;
}

export function MissionTimerWidget({
  progressPercent,
  seconds,
  focusScore,
  lectureSpeed,
  formatTime,
  onResetTimer,
  onCycleSpeed
}: MissionTimerWidgetProps) {
  return (
    <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 flex items-center justify-center rounded-full border-[4px] sm:border-[5px] lg:border-[6px] border-zinc-850 bg-zinc-950/80 shadow-[0_0_70px_rgba(245,158,11,0.3)] shrink-0 group">
      {/* Reset Timer — floating badge outside the ring, top-right corner */}
      {onResetTimer && (
        <button
          onClick={onResetTimer}
          title="Reset Timer"
          aria-label="Reset Timer"
          className="absolute -top-1 -right-1 z-20 p-1.5 sm:p-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 shadow-lg hover:text-red-400 hover:border-red-500/50 transition-colors cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
      )}

      {/* Glowing SVG circular track */}
      <svg viewBox="0 0 288 288" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
        {/* Background track circle */}
        <circle 
          cx="144" 
          cy="144" 
          r="128" 
          className="stroke-zinc-850 fill-none" 
          strokeWidth="6"
        />
        {/* Active Dynamic Progress Ring */}
        <motion.circle 
          cx="144" 
          cy="144" 
          r="128" 
          className="stroke-amber-400 fill-none drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]" 
          strokeWidth="6"
          strokeDasharray={2 * Math.PI * 128}
          animate={{ strokeDashoffset: (2 * Math.PI * 128) * (1 - progressPercent / 100) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>

      {/* Central Chronometer HUD */}
      <div className="relative text-center space-y-1 sm:space-y-1.5 z-10 w-full px-3 sm:px-4">
        <div className="flex items-center justify-center relative">
          <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] text-amber-400/90 uppercase block font-bold text-center w-full">
            FOCUS RUNTIME
          </span>
        </div>
        
        {/* Massive Responsive Timer */}
        <span 
          className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tabular-nums tracking-wider text-white leading-none block select-none"
          style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"zero" 0' }}
        >
          {formatTime(seconds)}
        </span>

        {/* Demoted Muted Focus Score & Lecture Speed Indicator */}
        <div className="pt-0.5 sm:pt-1 flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono text-zinc-400 font-medium">
          <span className="flex items-center gap-1 px-2 py-1 bg-zinc-900/50 rounded-md">
            <Zap className="w-2.5 h-2.5 text-amber-400/70" />
            <span>Focus {focusScore}%</span>
          </span>
          
          {onCycleSpeed ? (
            <button 
              onClick={onCycleSpeed}
              className="flex items-center gap-1 px-2 py-1 bg-zinc-900/50 hover:bg-zinc-800 hover:text-zinc-200 rounded-md transition-colors cursor-pointer active:scale-95"
              title="Change Lecture Speed"
            >
              <Volume2 className="w-2.5 h-2.5" />
              <span>{lectureSpeed}x Speed</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 bg-zinc-900/50 rounded-md">
              <Volume2 className="w-2.5 h-2.5 text-zinc-400" />
              <span>{lectureSpeed}x Speed</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
