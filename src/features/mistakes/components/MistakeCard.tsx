import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, 
  BookOpen, Sparkles, Trash2, Brain 
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Mistake, SubjectId } from '@/types/index';
import { MathRenderer } from '@/components/MathRenderer';
import { QuestionTrapBadge, QuestionArchetype } from './QuestionTrapClassifier';

export interface MistakeCardProps {
  item: Mistake;
  isExpanded: boolean;
  onToggleExpand: (id: string | null) => void;
  getSubjectColor: (sub: SubjectId) => { text: string; bg: string; border: string; badge: string };
  getStatusBadge: (status: Mistake['revisionStatus']) => { label: string; style: 'destructive' | 'accent' | 'default' | 'success' };
  onUpdateStatus: (id: string, status: Mistake['revisionStatus']) => void;
  onPinToPlanner: (item: Mistake) => void;
  onDelete: (id: string) => void;
  onPracticeWithAI?: () => void;
}

export const MistakeCard: React.FC<MistakeCardProps> = ({
  item,
  isExpanded,
  onToggleExpand,
  getSubjectColor,
  getStatusBadge,
  onUpdateStatus,
  onPinToPlanner,
  onDelete,
  onPracticeWithAI,
}) => {
  const subColor = getSubjectColor(item.subject);
  const statusInfo = getStatusBadge(item.revisionStatus);

  return (
    <div
      className={`glass-card border rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-xl ${
        isExpanded
          ? 'border-indigo-500/40 bg-zinc-950/60 shadow-2xl ring-1 ring-indigo-500/20'
          : 'border-zinc-850/80 bg-zinc-950/40 hover:border-zinc-700'
      }`}
    >
      {/* Collapsed Header Bar */}
      <div
        onClick={() => onToggleExpand(isExpanded ? null : item.id)}
        className="p-4 bg-zinc-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge variant="default" className={`text-[11px] ${subColor.badge}`}>
            {item.subject}
          </Badge>
          <h3 className="text-xs font-bold text-zinc-200">{item.chapter}</h3>
          <span className="text-[10px] text-zinc-400 font-mono">/ {item.topic}</span>
          <span className="text-3xs text-zinc-500 font-mono shrink-0">Logged {item.dateLogged}</span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-400 border border-zinc-800/60 bg-zinc-950 px-2 py-0.5 rounded-full">
              {item.difficulty}
            </span>
            <Badge variant={statusInfo.style} className="text-[11px]">
              {statusInfo.label}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
          )}
        </div>
      </div>

      {/* Expandable Panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-zinc-900"
          >
            <div className="p-5 space-y-5">
              {/* Question Snapshot & Trap Classification */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-bold">
                    Question Statement (Source: {item.source})
                  </span>
                  <QuestionTrapBadge 
                    archetype={
                      item.difficulty === 'JEE Advanced' ? 'Algebraic Boundary Trap' :
                      item.difficulty === 'JEE Main' ? 'Multi-Step Derivation' : 'Single Concept Direct'
                    }
                    showDetails={false}
                  />
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-line shadow-inner">
                  <MathRenderer text={item.questionText} />
                </div>
              </div>

              {/* Split Diagnostic Pane */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Student's Wrong Attempt */}
                <div className="p-4 bg-red-950/15 border border-red-900/30 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono uppercase text-red-400 tracking-wider flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    Student's Initial Slip / Faulty Method
                  </span>
                  <div className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
                    <MathRenderer text={item.studentMethod || 'No faulty work step recorded.'} />
                  </div>
                </div>

                {/* Correct Analytical Approach */}
                <div className="p-4 bg-emerald-950/15 border border-emerald-900/30 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 font-bold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Correct Problem-Solving Logic
                  </span>
                  <div className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
                    <MathRenderer text={item.correctMethod || item.correctSolution || 'No solution logic recorded.'} />
                  </div>
                </div>
              </div>

              {/* Correct Solution step by step */}
              {item.correctSolution && item.correctSolution !== item.correctMethod && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                    Detailed Step-by-Step Derivation
                  </span>
                  <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl font-sans text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                    <MathRenderer text={item.correctSolution} />
                  </div>
                </div>
              )}

              {/* AI Advice Block */}
              {item.aiAdvice && (
                <div className="p-4 bg-amber-950/15 border border-amber-900/40 rounded-xl flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider font-bold">
                      Diagnostic Concept Feedback
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
                      {item.aiAdvice}
                    </p>
                  </div>
                </div>
              )}

              {/* Personal Notes */}
              {item.personalNotes && (
                <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">Exam Strategy & Trap Reminder</span>
                  <p className="text-zinc-300 font-sans text-xs italic">"{item.personalNotes}"</p>
                </div>
              )}

              {/* Mistake Class tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide mr-2">Error Types:</span>
                {item.mistakeTypes.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[11px] font-mono">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Expanded Interactive Action controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-900 pt-4 bg-zinc-950/20 p-3 rounded-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-zinc-400 uppercase mr-1">Status:</span>

                  {item.revisionStatus !== 'Reviewed' && item.revisionStatus !== 'Mastered' && (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'Reviewed')}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors"
                    >
                      Mark Reviewed (Step 1)
                    </button>
                  )}

                  {item.revisionStatus !== 'Solved Again' && item.revisionStatus !== 'Mastered' && (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'Solved Again')}
                      className="bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors"
                    >
                      Solved Correctly (Step 2)
                    </button>
                  )}

                  {item.revisionStatus !== 'Mastered' && (
                    <button
                      onClick={onPracticeWithAI}
                      className="bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/40 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      Concept Diagnostic
                    </button>
                  )}

                  {item.revisionStatus === 'Mastered' && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-mono font-bold select-none">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolved & Mastered ✓
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPinToPlanner(item)}
                    className="text-zinc-400 hover:text-white border border-zinc-900 hover:bg-zinc-900 px-3 py-1 rounded-lg text-2xs font-mono font-semibold cursor-pointer transition-all"
                    title="Add revision slot to planner timeline"
                  >
                    Pin to Planner
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-red-500/80 hover:text-red-400 hover:bg-red-950/20 px-2.5 py-1 rounded-lg text-2xs font-bold cursor-pointer transition-colors border border-transparent hover:border-red-950"
                    title="Delete mistake record permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
