import React from 'react';
import { ModalPortal } from '../../../components/ui/ModalPortal';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Flame } from 'lucide-react';
import { SubjectDetail } from './MissionSubjectSwitcherWidget';
import { useEscapeKey } from '../../../hooks/useEscapeKey';

export interface MissionCompleteModalProps {
  isCompleted: boolean;
  activeDetails: SubjectDetail;
  seconds: number;
  streak: number;
  idleTime: number;
  focusInterruptions: number;
  focusScore: number;
  onComplete: (data: { duration: number; questions: number; xp: number; streak: number; idleTime: number; focusInterruptions: number; focusScore: number; }) => void;
  onNextSubject: () => void;
}

export function MissionCompleteModal({
  isCompleted,
  activeDetails,
  seconds,
  streak,
  onComplete,
  onNextSubject
}: MissionCompleteModalProps) {
  useEscapeKey(onNextSubject, isCompleted);

  return (
    <ModalPortal>
    <AnimatePresence>
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-[#060607]/95 backdrop-blur-xl flex flex-col justify-center items-center text-center p-6"
        >
          
          {/* SPARKLES PARTICLES GRAPHIC DECORATIONS */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], rotate: [0, 360, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 15, repeat: Infinity }}
              className="absolute w-[600px] h-[600px] bg-indigo-500/[0.02] border border-dashed border-indigo-500/10 rounded-full flex items-center justify-center"
            />
            <motion.div 
              animate={{ scale: [1, 0.9, 1], rotate: [0, -20, 0], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 12, repeat: Infinity }}
              className="absolute w-[400px] h-[400px] bg-emerald-500/[0.015] border border-dashed border-emerald-500/10 rounded-full"
            />
          </div>

          <div className="max-w-lg space-y-8 relative z-10">
            
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-3xs font-mono px-3 py-1 rounded-full uppercase tracking-[0.2em] font-bold shadow-md shadow-emerald-500/5">
                <Award className="w-3.5 h-3.5 animate-bounce" />
                STATION COMPLETE LOGGED
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black font-display text-white tracking-tighter leading-none select-none">
                MISSION COMPLETE
              </h1>
              
              <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                Congratulations! You've logged complete task checkpoints for <span className="text-white font-bold">{activeDetails.chapter}</span>. Your memory cells and focus track are successfully cached in JEE OS.
              </p>
            </div>

            {/* CORE PERFORMANCE ANALYTICS SUMMARY */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Stat 1: Study duration */}
              <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 text-left space-y-1.5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">TOTAL DECK RUNTIME</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-white">
                    {Math.floor(seconds / 3600) > 0 ? `${Math.floor(seconds / 3600)}h ` : ''}
                    {Math.floor((seconds % 3600) / 60)}m
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">logged</span>
                </div>
              </div>

              {/* Stat 2: Questions solved */}
              <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 text-left space-y-1.5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">SOLVED CHECKPOINTS</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-white">Pending</span>
                  <span className="text-[10px] font-mono text-zinc-500 font-semibold">Update in Planner</span>
                </div>
              </div>

              {/* Stat 3: XP Earned */}
              <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 text-left space-y-1.5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">XP MULTIPLIER MULTI</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-indigo-400">+{Math.floor(seconds / 60) * 5} XP</span>
                  <span className="text-[10px] font-mono text-zinc-500">Tier-1 scale</span>
                </div>
              </div>

              {/* Stat 4: Streak logged */}
              <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 text-left space-y-1.5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">JEE STREAK DECK</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-white">{streak} Days Active</span>
                  <div className="text-[10px] font-mono text-amber-400 font-semibold flex items-center gap-0.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>(+1)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Action options */}
            <div className="flex flex-col sm:flex-row gap-3.5">
              <button
                onClick={() => {
                  onComplete({
                    duration: seconds,
                    questions: 0,
                    xp: Math.floor(seconds / 60) * 5,
                    streak: streak,
                    idleTime: 0,
                    focusInterruptions: 0,
                    focusScore: 100
                  });
                }}
                className="flex-1 bg-white hover:bg-zinc-200 text-zinc-950 py-4.5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-xl shadow-white/5"
              >
                Return to Dashboard deck
              </button>
              
              <button
                onClick={onNextSubject}
                className="flex-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 text-zinc-300 py-4.5 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all"
              >
                Continue Next Subject Track
              </button>
            </div>

          </div>

        </motion.div>
      )}
    </AnimatePresence>
    </ModalPortal>
  );
}
