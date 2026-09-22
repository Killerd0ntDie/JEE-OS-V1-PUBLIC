import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { EvaluatedMockQuestion } from '@/utils/mockScoring';
import { ExplanationRenderer } from '@/components/MathRenderer';
import { isPlaceholderExplanation } from '../../hooks/useResultAnalytics';

export interface AiExplanationCardProps {
  qItem: EvaluatedMockQuestion;
  customExplanation?: string;
  isGenerating?: boolean;
  onGenerate: (qItem: EvaluatedMockQuestion) => void;
}

export function AiExplanationCard({
  qItem,
  customExplanation,
  isGenerating = false,
  onGenerate
}: AiExplanationCardProps) {
  const effectiveExplanation = customExplanation || qItem.question.explanation;
  const isPlaceholder = isPlaceholderExplanation(effectiveExplanation);

  if (isPlaceholder) {
    if (isGenerating) {
      return (
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-300 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
          <div className="space-y-0.5 text-xs">
            <p className="font-bold text-indigo-200">Deriving Step-by-Step Analytical Solution...</p>
            <p className="text-indigo-400/80 text-[11px] font-sans">Synthesizing molecular structure, formal charges, and verified JEE methodology.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-amber-200">Standard Coaching Answer Key Recorded</p>
            <p className="text-amber-300/80 leading-relaxed font-sans">
              {effectiveExplanation || 'Official coaching answer key recorded. Full step-by-step derivation available on demand.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onGenerate(qItem)}
          disabled={isGenerating}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>✨ Generate Step-by-Step AI Derivation</span>
        </button>
      </div>
    );
  }

  return <ExplanationRenderer content={effectiveExplanation} />;
}
