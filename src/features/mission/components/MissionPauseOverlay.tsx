import React from 'react';
import { motion } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { Pause } from 'lucide-react';

export interface MissionPauseOverlayProps {
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  seconds: number;
  formatTime: (totalSecs: number) => string;
  lectureSpeed: number;
  onExit: () => void;
}

export function MissionPauseOverlay({
  isPaused,
  setIsPaused,
  seconds,
  formatTime,
  lectureSpeed,
  onExit
}: MissionPauseOverlayProps) {
  return (
    <Modal
      isOpen={isPaused}
      onClose={() => setIsPaused(false)}
      zIndex={10000}
      className="max-w-lg w-full p-8 sm:p-10 space-y-7 text-center rounded-3xl bg-[#09090b]/90 border border-zinc-800/80 shadow-2xl relative overflow-hidden"
    >
      <div className="relative flex justify-center pt-2">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-44 h-44 rounded-full bg-amber-500/15 blur-2xl -top-2"
        />
        <div className="w-24 h-24 rounded-full border-2 border-amber-500/40 bg-amber-950/30 flex items-center justify-center text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.15)] relative z-10">
          <Pause className="w-10 h-10 animate-pulse" />
        </div>
      </div>

      <div className="space-y-2.5">
        <span className="text-xs font-mono tracking-[0.35em] text-amber-500 font-bold uppercase block">
          FOCUS BLOCKED
        </span>
        <h1 className="text-3xl md:text-4xl font-black font-display text-white tracking-tight">
          Session Paused
        </h1>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
          Chrono tracker is halted. Focus interruptions are being recorded to compute optimal output.
        </p>
      </div>

      <div className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-2xl text-left space-y-3 shadow-inner">
        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">INTERRUPT LOG</span>
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-zinc-400">Active study time</span>
          <span className="text-zinc-200 font-bold">{formatTime(seconds)}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-zinc-400">Pace index</span>
          <span className="text-zinc-200 font-bold">{lectureSpeed}x lecture pace</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 pb-1">
        <button
          onClick={() => setIsPaused(false)}
          className="w-full bg-white hover:bg-zinc-100 text-zinc-950 py-3.5 px-6 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          Resume Cockpit (SPACE)
        </button>
        <button
          onClick={onExit}
          className="w-full border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 py-3.5 px-6 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all active:scale-[0.99] cursor-pointer"
        >
          End Session
        </button>
      </div>
    </Modal>
  );
}
