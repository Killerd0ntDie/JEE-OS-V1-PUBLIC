import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export interface MissionCoachWidgetProps {
  isCoachVisible: boolean;
  setIsCoachVisible: (visible: boolean) => void;
  coachTip: string;
}

export function MissionCoachWidget({
  isCoachVisible,
  setIsCoachVisible,
  coachTip
}: MissionCoachWidgetProps) {
  return (
    <AnimatePresence>
      {isCoachVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="pt-1"
        >
          <div className="px-3.5 py-2.5 rounded-xl border border-indigo-900/40 bg-indigo-950/25 backdrop-blur-md flex items-center justify-between gap-2.5 shadow-md text-left">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
              <p className="text-[11px] text-zinc-300 leading-snug font-sans truncate">
                "{coachTip}"
              </p>
            </div>
            <button
              onClick={() => setIsCoachVisible(false)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors shrink-0"
              title="Dismiss Coach HUD"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
