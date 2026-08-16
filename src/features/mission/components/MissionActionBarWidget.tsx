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
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
            : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
        <span className="hidden sm:inline">Formulas (⌘F)</span>
        <span className="sm:hidden">Formulas</span>
      </motion.button>
    </div>
  );
}
