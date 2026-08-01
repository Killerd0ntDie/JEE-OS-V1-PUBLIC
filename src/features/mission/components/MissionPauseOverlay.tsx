import React from 'react';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { motion, AnimatePresence } from 'framer-motion';
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
    <ModalPortal>
    <AnimatePresence>
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-[#070708]/85 backdrop-blur-xl flex flex-col justify-center items-center text-center p-6"
        >
          <div className="max-w-md space-y-6">
            
            <div className="relative flex justify-center mb-4">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-40 h-40 rounded-full bg-amber-500/15 blur-2xl"
              />
              <div className="w-24 h-24 rounded-full border-2 border-amber-500/40 bg-amber-950/20 flex items-center justify-center text-amber-400">
                <Pause className="w-10 h-10 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono tracking-[0.35em] text-amber-500 font-bold uppercase block">
                FOCUS BLOCKED
              </span>
              <h1 className="text-3xl md:text-4xl font-black font-display text-white tracking-tight">
                Session Paused
              </h1>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-normal">
                Chrono tracker is halted. Focus interruptions are being recorded to compute optimal output.
              </p>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-xl text-left space-y-2">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">INTERRUPT LOG</span>
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-zinc-400">Active study time</span>
                <span className="text-zinc-200">{formatTime(seconds)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-zinc-400">Pace index</span>
                <span className="text-zinc-200">{lectureSpeed}x lecture pace</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full bg-white hover:bg-zinc-200 text-zinc-950 py-3 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all"
              >
                Resume Cockpit (SPACE)
              </button>
              <button
                onClick={onExit}
                className="w-full border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 text-zinc-400 py-3 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all"
              >
                End Session
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </ModalPortal>
  );
}
