import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { springs } from '@/constants/motion';

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
          initial={{ opacity: 0, scale: 0.95, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={springs.snappy}
          className="pt-1 w-full max-w-md"
        >
          <div className="px-3.5 py-2.5 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 backdrop-blur-md flex items-center justify-between gap-3 shadow-lg text-left">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <p className="text-xs text-zinc-200 leading-snug font-sans truncate">
                "{coachTip}"
              </p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsCoachVisible(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Dismiss Coach HUD"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
