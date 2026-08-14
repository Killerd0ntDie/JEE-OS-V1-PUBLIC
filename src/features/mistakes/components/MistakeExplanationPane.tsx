import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle, AlertTriangle, Trash2, 
  Sparkles, RotateCcw, Calendar, BookOpen,
  Tag, Clock, Check, Lightbulb, ArrowRight, Brain
} from 'lucide-react';
import { Mistake, SubjectId } from '@/types/index';
import { RichTextRenderer } from '@/components/MathRenderer';

export interface MistakeExplanationPaneProps {
  item: Mistake | null;
  getSubjectColor: (sub: SubjectId) => { text: string; bg: string; border: string; badge: string };
  getStatusBadge: (status: Mistake['revisionStatus']) => { label: string; style: 'destructive' | 'accent' | 'default' | 'success' };
  onUpdateStatus: (id: string, status: Mistake['revisionStatus']) => void;
  onPinToPlanner: (item: Mistake) => void;
  onDelete: (id: string) => void;
  onStartRetestItem?: (item: Mistake) => void;
}

export const MistakeExplanationPane: React.FC<MistakeExplanationPaneProps> = ({
  item,
  getSubjectColor,
  getStatusBadge,
  onUpdateStatus,
  onPinToPlanner,
  onDelete,
  onStartRetestItem,
}) => {
  if (!item) {
    return (
      <div className="h-full min-h-[560px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-zinc-850 bg-zinc-950/40 backdrop-blur-xl space-y-3 select-none">
        <div className="w-14 h-14 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/10">
          <BookOpen className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-display font-bold text-white">Select a Mistake to Inspect</h3>
          <p className="text-xs font-mono text-zinc-400 max-w-sm">
            Select any logged problem from the master list to review its complete formulation, student misconception, and full step-by-step LaTeX derivation.
          </p>
        </div>
      </div>
    );
  }

  const subColor = getSubjectColor(item.subject);
  const statusInfo = getStatusBadge(item.revisionStatus);

  // Derive comprehensive analytical explanation text
  const hasDistinctMethod = !!item.correctMethod && item.correctMethod !== item.correctSolution;
  const explanationText = item.correctMethod || item.correctSolution || 'No step-by-step analytical explanation recorded for this problem.';

  return (
    <div className="h-full flex flex-col rounded-2xl border border-zinc-850/80 bg-zinc-950/70 backdrop-blur-2xl shadow-2xl overflow-hidden text-left">
      
      {/* 1. STUDIO HEADER */}
      <div className="p-4 sm:p-5 border-b border-zinc-850/80 bg-zinc-950/90 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${subColor.badge}`}>
              {item.subject.toUpperCase()}
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {item.chapter}
            </span>
            <span className="text-zinc-600 font-mono">•</span>
            <span className="text-xs font-mono text-zinc-400">
              {item.topic || 'General Practice'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-zinc-850 bg-zinc-900 text-zinc-300">
              {item.difficulty}
            </span>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border ${
              statusInfo.style === 'destructive' 
                ? 'bg-red-950/60 border-red-800/60 text-red-300'
                : statusInfo.style === 'success'
                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                : 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300'
            }`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Metadata Chips */}
        <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 flex-wrap pt-0.5">
          {item.source && (
            <span className="flex items-center gap-1">
              <span className="text-zinc-500">Source:</span> <strong className="text-zinc-300">{item.source}</strong>
            </span>
          )}
          <span className="text-zinc-700">•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Time: <strong className="text-zinc-300">{item.timeTaken || 5}m</strong></span>
          </span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>Logged: <strong className="text-zinc-300">{item.dateLogged ? new Date(item.dateLogged).toLocaleDateString() : 'Recent'}</strong></span>
          </span>
        </div>
      </div>

      {/* 2. MAIN SCROLLABLE CONTENT BODY */}
      <div className="flex-1 p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar">
        
        {/* QUESTION STATEMENT (WITH PRISTINE LATEX) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Question Formulation
            </span>
            <span className="text-[10px] font-mono text-zinc-500">LaTeX KaTeX Math</span>
          </div>
          <div className="p-5 rounded-2xl border border-zinc-850/90 bg-zinc-900/80 text-zinc-100 text-sm leading-relaxed shadow-inner">
            <RichTextRenderer content={item.questionText} />
          </div>
        </div>

        {/* DIAGNOSTIC ERROR COMPARISON */}
        <div className="space-y-4">
          
          {/* A. Faulty Attempt / Misconception */}
          <div className="p-4 rounded-2xl border border-red-900/40 bg-red-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-red-400 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                My Faulty Attempt / Misconception
              </span>
              <span className="text-[10px] font-mono text-red-400/80">Identified Error Step</span>
            </div>
            <div className="text-xs text-red-200 leading-relaxed font-mono bg-red-950/40 p-3.5 rounded-xl border border-red-900/30">
              <RichTextRenderer content={item.studentMethod || 'No prior misconception details recorded.'} />
            </div>
          </div>

          {/* B. Comprehensive Step-by-Step Analytical Explanation & Derivation */}
          <div className="p-5 rounded-2xl border border-emerald-900/50 bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Step-by-Step Analytical Explanation & Derivation
              </span>
              <span className="text-[10px] font-mono text-emerald-400/80">Formal Proof</span>
            </div>

            {/* Step by step derivation */}
            <div className="p-4 rounded-xl border border-emerald-900/30 bg-zinc-950/80 text-xs text-emerald-100 leading-relaxed space-y-2 font-sans shadow-inner">
              <RichTextRenderer content={explanationText} />
            </div>

            {/* Final Answer Highlight (if distinct) */}
            {item.correctSolution && hasDistinctMethod && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs font-mono text-emerald-300">
                <span className="font-bold text-emerald-400 uppercase text-[10px] shrink-0">Key Final Result:</span>
                <span className="font-bold">{item.correctSolution}</span>
              </div>
            )}
          </div>
        </div>

        {/* AI CONCEPT SAFEGUARD & REASONING TIPS */}
        {item.aiAdvice && (
          <div className="p-4 rounded-2xl border border-indigo-900/40 bg-indigo-950/20 space-y-2">
            <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              AI Concept Safeguard & Exam Advice
            </span>
            <div className="text-xs text-indigo-200 leading-relaxed font-sans">
              <RichTextRenderer content={item.aiAdvice} />
            </div>
          </div>
        )}

        {/* ROOT-CAUSE CLASSIFICATION TAGS */}
        {item.mistakeTypes && item.mistakeTypes.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              Root-Cause Classifications
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {item.mistakeTypes.map((t, idx) => (
                <span 
                  key={idx}
                  className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg border border-red-900/40 bg-red-950/40 text-red-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PERSONAL REFLECTION NOTES */}
        {item.personalNotes && (
          <div className="p-3.5 rounded-xl border border-zinc-850/80 bg-zinc-900/40 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider block">
              Personal Reflection Notes
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {item.personalNotes}
            </p>
          </div>
        )}
      </div>

      {/* 3. STUDIO ACTION FOOTER */}
      <div className="p-4 border-t border-zinc-850/80 bg-zinc-950/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          {item.revisionStatus !== 'Solved Again' ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onUpdateStatus(item.id, 'Solved Again')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Mark as Solved</span>
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onUpdateStatus(item.id, 'New')}
              className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen for Review</span>
            </motion.button>
          )}

          {onStartRetestItem && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onStartRetestItem(item)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Re-Solve in Test Mode</span>
            </motion.button>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onPinToPlanner(item)}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pin to Planner</span>
          </motion.button>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-xl hover:bg-red-950/40 text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-900/40 transition-colors cursor-pointer"
          title="Delete mistake log entry"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};
