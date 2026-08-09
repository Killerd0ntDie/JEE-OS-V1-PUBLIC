import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Volume2 } from 'lucide-react';

export interface MissionTimerWidgetProps {
  progressPercent: number;
  seconds: number;
  focusScore: number;
  lectureSpeed: number;
  formatTime: (totalSecs: number) => string;
}

export function MissionTimerWidget({
  progressPercent,
  seconds,
  focusScore,
  lectureSpeed,
  formatTime
}: MissionTimerWidgetProps) {
  return (
    <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center rounded-full border-[6px] border-zinc-850 bg-zinc-950/80 shadow-[0_0_100px_rgba(245,158,11,0.4)] shrink-0">
      {/* Glowing SVG circular track */}
      <svg viewBox="0 0 288 288" className="absolute inset-0 w-full h-full -rotate-90">
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
      <div className="relative text-center space-y-2 z-10">
        <span className="text-[10px] font-mono tracking-[0.25em] text-amber-400/90 uppercase block font-bold">
          FOCUS RUNTIME
        </span>
        
        {/* Massive Timer */}
        <span 
          className="text-5xl md:text-6xl font-black font-mono tabular-nums tracking-wider text-white leading-none block select-none"
          style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"zero" 0' }}
        >
          {formatTime(seconds)}
        </span>

        {/* Demoted Muted Focus Score & Lecture Speed Indicator */}
        <div className="pt-1 flex items-center justify-center gap-3 text-[11px] font-mono text-zinc-400 font-medium">
          <span className="flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-amber-400/70" />
            <span>Focus {focusScore}%</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Volume2 className="w-2.5 h-2.5 text-zinc-400" />
            <span>{lectureSpeed}x Speed</span>
          </span>
        </div>
      </div>
    </div>
  );
}
