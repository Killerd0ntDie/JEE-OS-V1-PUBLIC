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
    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
      
      {/* Note Side Toggle */}
      <button 
        onClick={() => setIsNotesOpen(prev => !prev)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider transition-all ${
          isNotesOpen 
            ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-400' 
            : 'bg-[#0c0c0e]/40 border-zinc-800 hover:border-zinc-700 text-zinc-300'
        }`}
      >
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span>Notes (⌘N)</span>
      </button>

      {/* Formula Sheet Toggle */}
      <button 
        onClick={() => setIsFormulaOpen(prev => !prev)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider transition-all ${
          isFormulaOpen 
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' 
            : 'bg-[#0c0c0e]/40 border-zinc-800 hover:border-zinc-700 text-zinc-300'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span>Formulas (⌘F)</span>
      </button>

      {/* Adjust Speed Button */}
      <button 
        onClick={onCycleSpeed}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-[#0c0c0e]/40 text-xs font-mono text-zinc-400 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>{lectureSpeed}x Speed</span>
      </button>

      {/* AI Coach Toggle */}
      {!isCoachVisible && (
        <button 
          onClick={() => setIsCoachVisible(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-900/40 bg-indigo-950/20 hover:bg-indigo-950/40 text-xs font-mono text-indigo-400 transition-all"
          title="Show AI Coach HUD"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Coach</span>
        </button>
      )}
    </div>
  );
}
