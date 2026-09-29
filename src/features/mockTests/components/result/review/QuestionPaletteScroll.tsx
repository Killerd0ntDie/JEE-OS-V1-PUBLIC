import React from 'react';
import { LayoutGrid, Calendar } from 'lucide-react';
import { EvaluatedMockQuestion } from '@/utils/mockScoring';

export interface QuestionPaletteScrollProps {
  filteredQuestions: EvaluatedMockQuestion[];
  activeQuestionIdx: number;
  analysis: any;
  pinnedQuestions: Record<string, boolean>;
  onQuestionChange: (idx: number) => void;
  activeBtnRef: React.RefObject<HTMLButtonElement | null>;
}

export const QuestionPaletteScroll: React.FC<QuestionPaletteScrollProps> = ({
  filteredQuestions,
  activeQuestionIdx,
  analysis,
  pinnedQuestions,
  onQuestionChange,
  activeBtnRef,
}) => {
  return (
    <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-5 shadow-xl space-y-4">
      <div className="border-b border-zinc-850 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-indigo-400" />
          <span className="font-display font-bold text-white text-sm">
            Question Palette
          </span>
        </div>
        <span className="text-[11px] font-mono font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
          {filteredQuestions.length} Questions
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono bg-zinc-950/80 p-2 rounded-xl border border-zinc-850 text-center">
        <div className="flex items-center justify-center gap-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{analysis.correct} Correct</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-rose-400">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>{analysis.incorrect} Wrong</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
          <span>{analysis.unattempted} Skip</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 max-h-[55vh] overflow-y-auto custom-scrollbar p-1">
        {filteredQuestions.map((item, idx) => {
          const isSelected = idx === activeQuestionIdx;
          return (
            <button
              key={item.question.id}
              ref={isSelected ? activeBtnRef : null}
              type="button"
              onClick={() => onQuestionChange(idx)}
              className={`h-10 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center relative border ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400/50 scale-105 shadow-md shadow-indigo-600/30 z-10'
                  : item.isCorrect
                  ? 'bg-emerald-950/50 border-emerald-800/70 text-emerald-300 hover:bg-emerald-900/60'
                  : item.isIncorrect
                  ? 'bg-rose-950/50 border-rose-800/70 text-rose-300 hover:bg-rose-900/60'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
              }`}
              title={`Q${item.globalIndex} (${item.statusLabel})`}
            >
              <span>{item.globalIndex}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-zinc-850">
        <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-850 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Revision Notebook
            </span>
            <span className="text-[10px] text-zinc-500">
              {Object.keys(pinnedQuestions).length} pinned
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            Pin mistakes or key questions directly to your daily study mission for spaced revision.
          </p>
        </div>
      </div>
    </div>
  );
};
