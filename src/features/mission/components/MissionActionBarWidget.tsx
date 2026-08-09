import React from 'react';
import { FileText, BookOpen, RotateCcw, Sparkles } from 'lucide-react';

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
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-1">
      


      {/* Formula Sheet Toggle */}
      <button 
        onClick={() => setIsFormulaOpen(prev => !prev)}
        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg border text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all ${
          isFormulaOpen 
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' 
            : 'bg-[#0c0c0e]/40 border-zinc-800 hover:border-zinc-700 text-zinc-300'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Formulas (⌘F)</span>
        <span className="sm:hidden">Formulas</span>
      </button>


    </div>
  );
}
