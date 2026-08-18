import React from 'react';
import { motion } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { Pause, Play, LogOut, Clock, Gauge, Zap, AlertTriangle, ShieldAlert } from 'lucide-react';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

export interface MissionPauseOverlayProps {
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  seconds: number;
  formatTime: (totalSecs: number) => string;
  lectureSpeed: number;
  onExit: () => void;
  activeSubject?: string;
  focusScore?: number;
  focusInterruptions?: number;
}

export function MissionPauseOverlay({
  isPaused,
  setIsPaused,
  seconds,
  formatTime,
  lectureSpeed,
  onExit,
  activeSubject = 'physics',
  focusScore = 100,
  focusInterruptions = 1
}: MissionPauseOverlayProps) {
  return (
    <Modal
      isOpen={isPaused}
      onClose={() => setIsPaused(false)}
      zIndex={10000}
      backdropClassName="bg-black/10 backdrop-blur-md"
      className="max-w-lg w-full p-6 sm:p-8 space-y-6 text-center rounded-3xl relative overflow-hidden glass-panel"
      style={{
        background: 'rgba(10, 14, 23, 0.90)',
        backdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
        border: '1.5px solid rgba(245, 158, 11, 0.4)',
        borderTop: '2px solid rgba(245, 158, 11, 0.7)',
        boxShadow: '0 30px 90px rgba(0, 0, 0, 0.85), 0 0 60px rgba(245, 158, 11, 0.18)'
      }}
    >
      {/* Top Hazard Warning Tape Ribbon */}
      <div 
        className="absolute top-0 inset-x-0 h-1.5 opacity-60"
        style={{
          background: 'repeating-linear-gradient(-45deg, #f59e0b 0px, #f59e0b 8px, transparent 8px, transparent 16px)'
        }}
      />

      {/* Cybernetic AT-Field Pause Emblem */}
      <div className="relative flex justify-center pt-2">
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.45, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-40 h-40 rounded-full bg-amber-500/25 blur-3xl -top-3"
        />
        <div className="relative z-10 w-20 h-20 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/60 to-black/80 flex items-center justify-center text-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.25)]">
          <Pause className="w-8 h-8 animate-pulse stroke-[2.5]" />
          
          {/* Micro Corner Caliper Accents */}
          <div className="absolute top-1 left-1.5 text-[8px] font-mono text-amber-500/70 font-bold">+</div>
          <div className="absolute top-1 right-1.5 text-[8px] font-mono text-amber-500/70 font-bold">+</div>
          <div className="absolute bottom-1 left-1.5 text-[8px] font-mono text-amber-500/70 font-bold">+</div>
          <div className="absolute bottom-1 right-1.5 text-[8px] font-mono text-amber-500/70 font-bold">+</div>
        </div>
      </div>

      {/* Tactical Titles */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-amber-950/50 border border-amber-500/50 text-amber-400 text-[9px] font-mono font-bold tracking-widest uppercase shadow-sm">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>通信中断 // AT-FIELD SUSPENDED</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight leading-none uppercase drop-shadow-sm">
          一時停止 : SESSION PAUSED
        </h2>
        
        <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
          Chronometer is halted. Focus telemetry is safely cached in JEE OS.
        </p>
      </div>

      {/* 4-Cell Sci-Fi Metric Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-zinc-950/70 border border-white/10 text-left shadow-inner">
        
        {/* Cell 1: Active Time */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[8.5px] font-mono text-zinc-500 uppercase font-bold">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>活動時間</span>
          </div>
          <div className="text-sm font-black font-mono text-white">
            {formatTime(seconds)}
          </div>
          <span className="text-[8px] font-mono text-zinc-500 block">Active Time</span>
        </div>

        {/* Cell 2: Focus Score */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[8.5px] font-mono text-zinc-500 uppercase font-bold">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>集中度</span>
          </div>
          <div className="text-sm font-black font-mono text-amber-300">
            {focusScore}%
          </div>
          <span className="text-[8px] font-mono text-emerald-400 block font-semibold">Locked</span>
        </div>

        {/* Cell 3: Lecture Pace */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[8.5px] font-mono text-zinc-500 uppercase font-bold">
            <Gauge className="w-3 h-3 text-indigo-400" />
            <span>速度指数</span>
          </div>
          <div className="text-sm font-black font-mono text-white">
            {lectureSpeed}x
          </div>
          <span className="text-[8px] font-mono text-zinc-500 block">Pace Index</span>
        </div>

        {/* Cell 4: Interruption Count */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[8.5px] font-mono text-zinc-500 uppercase font-bold">
            <ShieldAlert className="w-3 h-3 text-orange-400" />
            <span>中断回数</span>
          </div>
          <div className="text-sm font-black font-mono text-orange-400">
            {focusInterruptions}
          </div>
          <span className="text-[8px] font-mono text-zinc-500 block">Interrupts</span>
        </div>

      </div>

      {/* Primary Cybernetic Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={springs.snappy}
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            setIsPaused(false);
          }}
          className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Resume Cockpit</span>
          <span className="ml-1 px-1.5 py-0.5 rounded bg-black/30 border border-white/20 text-[9px] font-mono text-white/90">
            SPACE
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={springs.snappy}
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            onExit();
          }}
          className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-zinc-900/80 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-zinc-400 hover:text-red-300 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>End Session</span>
        </motion.button>
      </div>

    </Modal>
  );
}
