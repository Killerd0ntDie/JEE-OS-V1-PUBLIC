import React from 'react';
import { ModalPortal } from '../../../components/ui/ModalPortal';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, CheckCircle2 } from 'lucide-react';
import { useEscapeKey } from '../../../hooks/useEscapeKey';

export interface MissionTimeUpModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onAddExtraTime: (minutes: number) => void;
}

export function MissionTimeUpModal({
  isOpen,
  onComplete,
  onAddExtraTime
}: MissionTimeUpModalProps) {
  useEscapeKey(onComplete, isOpen);

  return (
    <ModalPortal>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-[#060607]/80 backdrop-blur-md flex flex-col justify-center items-center text-center p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mission-time-up-modal-title"
            className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6"
          >
            
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>

            <div className="space-y-2">
              <h1 id="mission-time-up-modal-title" className="text-2xl font-black font-display text-white tracking-tight leading-none">
                Time's Up!
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                You've reached the allocated time for this session. Do you want to wrap up now, or add some extra time to finish your tasks?
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex gap-3">
                <button
                  onClick={() => onAddExtraTime(15)}
                  className="flex-1 py-3 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  15 Mins
                </button>
                <button
                  onClick={() => onAddExtraTime(30)}
                  className="flex-1 py-3 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  30 Mins
                </button>
              </div>

              <button
                onClick={onComplete}
                className="w-full bg-white hover:bg-zinc-200 text-zinc-950 py-3.5 px-4 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-white/5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete Session
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </ModalPortal>
  );
}
