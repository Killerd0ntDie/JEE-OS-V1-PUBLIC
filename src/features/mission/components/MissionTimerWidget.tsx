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
    <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center shrink-0">
      {/* Outer pulsing decoration glow */}
      <div className="absolute inset-4 rounded-full bg-indigo-500/5 blur-2xl" />

      {/* Glowing SVG circular track */}
      <svg viewBox="0 0 288 288" className="absolute inset-0 w-full h-full -rotate-90">
        {/* Background track circle */}
        <circle 
          cx="144" 
          cy="144" 
          r="128" 
          className="stroke-zinc-800/90 fill-none" 
          strokeWidth="4"
        />
        {/* Active Dynamic Progress Ring */}
        <motion.circle 
          cx="144" 
          cy="144" 
          r="128" 
          className="stroke-indigo-500 fill-none drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
          strokeWidth="4"
          strokeDasharray={2 * Math.PI * 128}
          animate={{ strokeDashoffset: (2 * Math.PI * 128) * (1 - progressPercent / 100) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>

      {/* Central Chronometer HUD */}
      <div className="relative text-center space-y-2">
        <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase block font-bold">
          FOCUS RUNTIME
        </span>
        
        {/* Massive Timer */}
        <span className="text-5xl md:text-6xl font-black font-mono tracking-wider text-white leading-none block select-none">
          {formatTime(seconds)}
        </span>

        {/* Subtext: Focus Score & Lecture Speed Indicator */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <div className="bg-indigo-950/40 border border-indigo-900/40 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center gap-1">
            <Zap className="w-3 h-3 animate-pulse" />
            <span>FOCUS {focusScore}%</span>
          </div>
          
          <div className="bg-zinc-900/60 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            <span>{lectureSpeed}X SPEED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
