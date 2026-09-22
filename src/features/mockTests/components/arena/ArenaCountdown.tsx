import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const formatTime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export interface ArenaCountdownProps {
  targetEndTime: number;
  isExamStarted: boolean;
  onExpire: () => void;
  variant: 'mobile' | 'desktop' | 'proctor';
}

export function ArenaCountdown({
  targetEndTime,
  isExamStarted,
  onExpire,
  variant
}: ArenaCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000)));

  useEffect(() => {
    if (!isExamStarted) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetEndTime, isExamStarted, onExpire]);

  if (variant === 'mobile') {
    return (
      <div className={`ml-auto lg:hidden flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded ${
        secondsLeft < 300 ? 'bg-rose-950/80 text-rose-300 border border-rose-600/40 animate-pulse' : 'bg-zinc-900 text-emerald-400 border border-zinc-800'
      }`}>
        <Clock className="w-3.5 h-3.5" />
        <span>{formatTime(secondsLeft)}</span>
      </div>
    );
  }

  if (variant === 'proctor') {
    return (
      <span className="text-rose-400 font-bold animate-pulse">Running ({formatTime(secondsLeft)})</span>
    );
  }

  return (
    <div className={`font-mono text-2xl sm:text-3xl font-black tracking-widest text-center py-2 px-3 rounded-lg border ${
      secondsLeft < 300
        ? 'bg-rose-950/70 border-rose-600 text-rose-300 animate-pulse'
        : 'bg-zinc-900 border-zinc-800 text-emerald-400'
    }`}>
      {formatTime(secondsLeft)}
    </div>
  );
}
