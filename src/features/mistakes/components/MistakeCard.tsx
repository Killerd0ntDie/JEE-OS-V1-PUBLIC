import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle, 
  BookOpen, Sparkles, Trash2, Skull 
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Mistake, SubjectId } from '../../../types/index';

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
          <Badge variant="default" className={`text-[9px] ${subColor.badge}`}>
            {item.subject}
          </Badge>
          <h3 className="text-xs font-extrabold text-zinc-200">{item.chapter}</h3>
          <span className="text-[10px] text-zinc-500 font-mono">/ {item.topic}</span>
          <span className="text-3xs text-zinc-600 font-mono shrink-0">Logged {item.dateLogged}</span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-400 border border-zinc-800/60 bg-zinc-950 px-2 py-0.5 rounded-full">
              {item.difficulty}
            </span>
            <Badge variant={statusInfo.style} className="text-[9px]">
              {statusInfo.label}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
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
              {/* Question Snapshot */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                  Question Snapshot (Source: {item.source})
                </span>
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-line shadow-inner">
                  {item.questionText}
                </div>
              </div>

              {/* Split Diagnostic Pane */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Student's Wrong Attempt */}
                <div className="p-4 bg-red-950/10 border border-red-950/30 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono uppercase text-red-400 tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    My Faulty Attempt Method
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
                    {item.studentMethod}
                  </p>
                </div>

                {/* Correct Analytical Approach */}
                <div className="p-4 bg-emerald-950/10 border border-emerald-950/30 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Correct Analytical Method
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
                    {item.correctMethod}
                  </p>
                </div>
              </div>

              {/* Correct Solution step by step */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                  Step-by-Step Correct Solution
                </span>
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl font-sans text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                  {item.correctSolution}
                </div>
              </div>

              {/* AI Advice Block */}
              <div className="p-4 bg-amber-950/15 border border-amber-900/40 rounded-xl flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider">
                    AI Diagnostics & Coaching Advice
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans font-semibold">
                    {item.aiAdvice}
                  </p>
                </div>
              </div>

              {/* Classroom Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Teacher Feedback</span>
                  <p className="text-zinc-400 font-mono italic">"{item.teacherNotes}"</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">My Cockpit Reminders</span>
                  <p className="text-zinc-400 font-mono italic">"{item.personalNotes}"</p>
                </div>
              </div>

              {/* Mistake Class tags */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide mr-2">Tags:</span>
                {item.mistakeTypes.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[9px] lowercase">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Expanded Interactive Action controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-900 pt-4 bg-zinc-950/10 p-3 rounded-xl">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-2xs font-mono text-zinc-500 uppercase mr-1.5">Promotion:</span>

                  {item.revisionStatus !== 'Reviewed' && item.revisionStatus !== 'Mastered' && (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'Reviewed')}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded text-2xs font-semibold cursor-pointer transition-colors"
                    >
                      Mark Reviewed [40%]
                    </button>
                  )}

                  {item.revisionStatus !== 'Solved Again' && item.revisionStatus !== 'Mastered' && (
                    <button
                      onClick={() => onUpdateStatus(item.id, 'Solved Again')}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded text-2xs font-semibold cursor-pointer transition-colors"
                    >
                      Re-Attempted [70%]
                    </button>
                  )}

                  {item.revisionStatus !== 'Mastered' && (
                    <button
                      onClick={onPracticeWithAI}
                      className="bg-red-950/40 hover:bg-red-900/40 border border-red-900/50 text-red-400 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-[0_0_15px_rgba(220,38,38,0.15)] flex items-center gap-1.5 ml-2"
                    >
                      <Skull className="w-3.5 h-3.5 text-red-500" />
                      ENTER INTERROGATION ROOM
                    </button>
                  )}

                  {item.revisionStatus === 'Mastered' && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 rounded-lg text-[10px] font-bold select-none ml-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      MISTAKE EXORCISED
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
