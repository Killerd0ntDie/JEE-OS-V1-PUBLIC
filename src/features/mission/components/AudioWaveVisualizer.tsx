import React from 'react';
import { motion } from 'motion/react';

interface AudioWaveVisualizerProps {
  isPlaying: boolean;
  activeSubject?: 'physics' | 'chemistry' | 'maths' | string;
  className?: string;
}

export function AudioWaveVisualizer({
  isPlaying,
  activeSubject = 'physics',
  className = ''
}: AudioWaveVisualizerProps) {
  const getSubjectColor = () => {
    const s = (activeSubject || '').toLowerCase();
    if (s.includes('chem')) {
      return {
        bar: 'bg-emerald-400',
        glow: 'shadow-[0_0_10px_rgba(16,185,129,0.7)]',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400'
      };
    }
    if (s.includes('math')) {
      return {
        bar: 'bg-purple-400',
        glow: 'shadow-[0_0_10px_rgba(192,132,252,0.7)]',
        border: 'border-purple-500/30',
        text: 'text-purple-400'
      };
    }
    return {
      bar: 'bg-sky-400',
      glow: 'shadow-[0_0_10px_rgba(56,189,248,0.7)]',
      border: 'border-sky-500/30',
      text: 'text-sky-400'
    };
  };

  const theme = getSubjectColor();
  const barDurations = [0.65, 0.45, 0.8, 0.5, 0.7, 0.55, 0.6];
  const barHeights = [
    [4, 18, 6, 14, 4],
    [6, 22, 10, 20, 6],
    [8, 26, 12, 24, 8],
    [10, 28, 14, 28, 10],
    [8, 24, 10, 22, 8],
    [6, 20, 8, 18, 6],
    [4, 14, 6, 12, 4]
  ];

  return (
    <div
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-sm select-none ${className}`}
      title={isPlaying ? "Live Audio & Synchro Telemetry Active" : "Telemetry Paused"}
    >
      <div className="flex items-center gap-0.5 h-6">
        {barHeights.map((heightSequence, idx) => (
          <motion.span
            key={idx}
            className={`w-[2.5px] rounded-full ${theme.bar} ${isPlaying ? theme.glow : 'opacity-40'}`}
            animate={
              isPlaying
                ? {
                    height: heightSequence,
                    opacity: [0.7, 1, 0.8, 1, 0.7]
                  }
                : {
                    height: 3,
                    opacity: 0.35
                  }
            }
            transition={
              isPlaying
                ? {
                    duration: barDurations[idx],
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                    delay: idx * 0.08
                  }
                : {
                    duration: 0.3
                  }
            }
          />
        ))}
      </div>
      <span className={`text-[9px] font-mono font-bold tracking-widest uppercase ml-1 hidden lg:inline ${theme.text}`}>
        {isPlaying ? 'RELAY' : 'IDLE'}
      </span>
    </div>
  );
}
