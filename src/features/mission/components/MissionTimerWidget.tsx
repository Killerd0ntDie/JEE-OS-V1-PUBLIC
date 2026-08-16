import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, RotateCcw, Flame, Timer, Hourglass } from 'lucide-react';
import { springs } from '@/constants/motion';
import { FocusPresetMode } from './MissionHeader';

export interface MissionTimerWidgetProps {
  progressPercent: number;
  seconds: number;
  focusScore: number;
  activeSubject?: 'physics' | 'chemistry' | 'maths' | string;
  formatTime: (totalSecs: number) => string;
  onResetTimer?: () => void;
  stage?: 'standby' | 'magi' | 'active' | 'revealed';
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  focusPreset?: FocusPresetMode;
  targetDurationMins?: number;
}

export const MissionTimerWidget = forwardRef<HTMLDivElement, MissionTimerWidgetProps>(function MissionTimerWidget({
  progressPercent,
  seconds,
  focusScore,
  activeSubject = 'physics',
  formatTime,
  onResetTimer,
  stage = 'revealed',
  isZenMode = false,
  onToggleZenMode,
  focusPreset = 'deep60',
  targetDurationMins = 60
}, ref) {
  const radius = 115;
  const circumference = 2 * Math.PI * radius;

  // Berserk Overdrive State (>95% focus for 45+ minutes)
  const isBerserk = (seconds >= 2700 && focusScore >= 95);

  // Dynamic Subject Theme
  const getTheme = () => {
    const s = (activeSubject || '').toLowerCase();
    if (s.includes('chem')) {
      return {
        stroke: 'stroke-emerald-400',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
        primary: '#10b981',
        glowStyle: { 
          boxShadow: isBerserk 
            ? '0 0 70px rgba(239,68,68,0.45), 0 0 100px rgba(16,185,129,0.3)' 
            : '0 0 50px rgba(16,185,129,0.16)' 
        },
      };
    }
    if (s.includes('math')) {
      return {
        stroke: 'stroke-purple-400',
        text: 'text-purple-400',
        dot: 'bg-purple-400',
        primary: '#c084fc',
        glowStyle: { 
          boxShadow: isBerserk 
            ? '0 0 70px rgba(239,68,68,0.45), 0 0 100px rgba(192,132,252,0.3)' 
            : '0 0 50px rgba(192,132,252,0.16)' 
        },
      };
    }
    // Default / Physics: Sky Blue
    return {
      stroke: 'stroke-sky-400',
      text: 'text-sky-400',
      dot: 'bg-sky-400',
      primary: '#38bdf8',
      glowStyle: { 
        boxShadow: isBerserk 
          ? '0 0 70px rgba(239,68,68,0.45), 0 0 100px rgba(56,189,248,0.3)' 
          : '0 0 50px rgba(56,189,248,0.16)' 
      },
    };
  };

  const theme = getTheme();

  return (
    <motion.div 
      ref={ref}
      onDoubleClick={onToggleZenMode}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: isZenMode ? 1.06 : 1, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        ...theme.glowStyle,
        background: isBerserk ? 'rgba(20, 10, 15, 0.85)' : 'rgba(10, 14, 23, 0.78)',
        backdropFilter: 'blur(24px) saturate(190%) contrast(105%)',
        border: isBerserk ? '1.5px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
        borderTop: isBerserk ? '2px solid rgba(239, 68, 68, 0.8)' : '1.5px solid rgba(255, 255, 255, 0.25)',
      }}
      className="relative w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 flex items-center justify-center rounded-full shrink-0 group select-none transition-shadow duration-500 overflow-hidden cursor-pointer"
      title="Double-click to toggle Zen Stealth Focus Mode (Z)"
    >
      {/* 1. AUDIO-REACTIVE LIQUID GLASS PULSE LAYER */}
      {stage === 'active' && (
        <motion.div
          initial={{ opacity: 0.35, scale: 1 }}
          animate={{
            opacity: [0.35, 0.95, 0.4, 0.9, 0.35, 0.95, 0.4, 0.9, 0.4, 0.95, 0.35],
            scale: [1, 1.025, 1, 1.02, 1, 1.025, 1, 1.02, 1, 1.03, 1],
          }}
          transition={{
            duration: 3.2,
            times: [0, 0.15, 0.22, 0.30, 0.37, 0.45, 0.60, 0.75, 0.82, 0.90, 1.0],
            ease: 'easeInOut'
          }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: `inset 0 0 25px ${theme.primary}50, 0 0 35px ${theme.primary}40`,
            border: `1.5px solid ${theme.primary}70`
          }}
        />
      )}

      {/* Berserk Overdrive Animated Pulse Ring */}
      {isBerserk && (
        <motion.div
          animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.03, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full pointer-events-none border-2 border-red-500 shadow-[inset_0_0_20px_rgba(239,68,68,0.4)]"
        />
      )}

      {/* Specular Liquid Glass Highlight Sheen */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)'
        }}
      />

      {/* Subtle Eva Center Reticle */}
      <div className="absolute inset-4 pointer-events-none opacity-15 flex items-center justify-center">
        <div className="w-full h-px bg-white/30" />
        <div className="h-full w-px bg-white/30 absolute" />
      </div>

      {/* Reset Timer Button */}
      {onResetTimer && (
        <motion.button
          whileHover={{ scale: 1.15, rotate: -90 }}
          whileTap={{ scale: 0.9 }}
          transition={springs.snappy}
          onClick={(e) => {
            e.stopPropagation();
            onResetTimer();
          }}
          title="Reset Timer"
          aria-label="Reset Timer"
          className="absolute top-2 right-2 z-20 p-2 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-zinc-400 shadow-xl hover:text-red-400 hover:border-red-500/50 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </motion.button>
      )}

      {/* Concentric Chronometer SVG Rings */}
      <svg viewBox="0 0 288 288" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
        {/* Outer subtle ticks circle */}
        <circle 
          cx="144" 
          cy="144" 
          r="132" 
          className="stroke-zinc-800/40 fill-none" 
          strokeWidth="1.5"
          strokeDasharray="4 8"
        />

        {/* Background track circle */}
        <circle 
          cx="144" 
          cy="144" 
          r={radius} 
          className="stroke-zinc-800/40 fill-none" 
          strokeWidth="6"
        />

        {/* Active Dynamic Progress Ring */}
        <motion.circle 
          key={focusPreset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - Math.min(progressPercent, 100) / 100) }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          cx="144" 
          cy="144" 
          r={radius} 
          className={`${isBerserk ? 'stroke-red-500' : theme.stroke} fill-none`} 
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 8px ${isBerserk ? '#ef4444' : theme.primary})`
          }}
        />
      </svg>

      {/* Central Chronometer HUD */}
      <div className="relative text-center flex flex-col items-center justify-center z-10 w-full px-6 space-y-1.5 pointer-events-none">
        <div className="flex items-center justify-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isBerserk ? 'bg-red-400' : theme.dot} animate-pulse`} />
          <span className={`text-[10px] font-mono tracking-[0.25em] ${isBerserk ? 'text-red-300' : theme.text} uppercase font-bold text-center`}>
            {isBerserk ? '暴走状態 // OVERDRIVE' : '集中持続 // FOCUS RUNTIME'}
          </span>
        </div>
        
        {/* Massive High-Contrast Timer */}
        <span 
          className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono tabular-nums tracking-tight text-white leading-none block select-none drop-shadow-sm"
          style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"zero" 0' }}
        >
          {formatTime(seconds)}
        </span>

        {/* Clean, Clear Focus Score Badge & Mode Indicator */}
        <div className="pt-0.5 flex items-center justify-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-mono font-medium shadow-sm border ${
            isBerserk
              ? 'bg-red-950/40 border-red-500/50 text-red-300'
              : 'bg-zinc-900/90 border-zinc-800/90 text-zinc-300'
          }`}>
            <Zap className={`w-3 h-3 ${isBerserk ? 'text-amber-400 animate-pulse' : 'text-amber-400'}`} />
            <span>Focus {focusScore}%</span>
            {isBerserk && <span className="text-amber-400 font-bold ml-0.5">(1.5x XP)</span>}
          </span>

          {/* Active Focus Preset Micro Indicator */}
          <AnimatePresence mode="wait">
            <motion.span
              key={focusPreset}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springs.snappy}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border shadow-sm ${
                focusPreset === 'pomodoro'
                  ? 'bg-sky-950/40 border-sky-500/40 text-sky-300'
                  : focusPreset === 'speedDrill'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
              }`}
            >
              {focusPreset === 'pomodoro' ? (
                <>
                  <Hourglass className="w-2.5 h-2.5" />
                  <span>25/5</span>
                </>
              ) : focusPreset === 'speedDrill' ? (
                <>
                  <Zap className="w-2.5 h-2.5" />
                  <span>DRILL</span>
                </>
              ) : (
                <>
                  <Timer className="w-2.5 h-2.5" />
                  <span>{targetDurationMins}M</span>
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
});
