import React from 'react';
import { BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { springs } from '@/constants/motion';

export interface MissionActionBarWidgetProps {
  isNotesOpen: boolean;
  setIsNotesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isFormulaOpen: boolean;
  setIsFormulaOpen: React.Dispatch<React.SetStateAction<boolean>>;
  lectureSpeed: number;
  onCycleSpeed: () => void;
  isCoachVisible: boolean;
  setIsCoachVisible: (v: boolean) => void;
}

export function MissionActionBarWidget({
  isNotesOpen,
  setIsNotesOpen,
  isFormulaOpen,
  setIsFormulaOpen,
  lectureSpeed,
  onCycleSpeed,
  isCoachVisible,
  setIsCoachVisible
}: MissionActionBarWidgetProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-2">
      {/* Formula Sheet Toggle */}
      <motion.button 
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={springs.snappy}
        onClick={() => setIsFormulaOpen(prev => !prev)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm ${
          isFormulaOpen 
            ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
            : 'bg-zinc-950/80 border-white/10 hover:border-emerald-500/40 text-zinc-300 hover:text-white'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
        <span className="hidden sm:inline">FORMULAS (⌘F)</span>
        <span className="sm:hidden">FORMULAS</span>
      </motion.button>
    </div>
  );
}
