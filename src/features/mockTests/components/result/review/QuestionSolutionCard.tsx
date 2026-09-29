import React from 'react';
import { Sparkles, Brain, LayoutGrid, Printer } from 'lucide-react';
import { EvaluatedMockQuestion, formatCorrectAnswerKey } from '@/utils/mockScoring';
import { AiExplanationCard } from '../AiExplanationCard';

export interface QuestionSolutionCardProps {
  qItem: EvaluatedMockQuestion;
  customExplanation?: string;
  isGenerating: boolean;
  onGenerate: (qItem: EvaluatedMockQuestion) => Promise<void>;
  onAskAi: () => void;
  onOpenPalette: () => void;
  onOpenPdf: () => void;
}

export const QuestionSolutionCard: React.FC<QuestionSolutionCardProps> = ({
  qItem,
  customExplanation,
  isGenerating,
  onGenerate,
  onAskAi,
  onOpenPalette,
  onOpenPdf,
}) => {
  return (
    <div className="bg-[#101116] border border-indigo-900/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl min-w-0">
      <div className="border-b border-zinc-800/80 pb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white font-display">
            Detailed Solution & Derivation
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-lg">
            Key: {formatCorrectAnswerKey(qItem.question.correctAnswer)}
          </span>
          <button
            type="button"
            onClick={onAskAi}
            className="px-2 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Ask AI Mentor about this solution"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline text-[11px]">Ask AI</span>
          </button>
          <button
            type="button"
            onClick={onOpenPalette}
            className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Open Question Palette Matrix (Press P)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline text-[11px]">Palette (P)</span>
          </button>
          <button
            type="button"
            onClick={onOpenPdf}
            className="p-1 sm:px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="Print Authentic NTA Exam Booklet & Solutions (PDF)"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline text-[11px]">PDF</span>
          </button>
        </div>
      </div>

      {/* Direct Detailed Solution Body */}
      <div className="min-w-0">
        <AiExplanationCard
          qItem={qItem}
          customExplanation={customExplanation}
          isGenerating={isGenerating}
          onGenerate={onGenerate}
        />
      </div>
    </div>
  );
};
