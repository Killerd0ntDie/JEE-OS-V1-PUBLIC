import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, 
  BookOpen, Sparkles, AlertTriangle, Clock,
  Check, RotateCcw, Trash2, Calendar, Brain, Search
} from 'lucide-react';
import { Mistake, SubjectId } from '@/types/index';
import { RichTextRenderer } from '@/components/MathRenderer';

export interface HorizontalMistakeStageProps {
  mistakes: Mistake[];
  activeSubject: SubjectId | 'all';
  setActiveSubject: (sub: SubjectId | 'all') => void;
  statusFilter: 'all' | 'unresolved' | 'resolved';
  setStatusFilter: (st: 'all' | 'unresolved' | 'resolved') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
  onUpdateStatus: (id: string, status: Mistake['revisionStatus']) => void;
  onPinToPlanner: (item: Mistake) => void;
  onDelete: (id: string) => void;
  onStartRetest: (item?: Mistake) => void;
  getSubjectColor: (sub: SubjectId) => { text: string; bg: string; border: string; badge: string };
  getStatusBadge: (status: Mistake['revisionStatus']) => { label: string; style: 'destructive' | 'accent' | 'default' | 'success' };
}

export const HorizontalMistakeStage: React.FC<HorizontalMistakeStageProps> = ({
  mistakes,
  activeSubject,
  setActiveSubject,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  onUpdateStatus,
  onPinToPlanner,
  onDelete,
  getSubjectColor,
  getStatusBadge,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showRetestPad, setShowRetestPad] = useState(false);
  const [scratchpadText, setScratchpadText] = useState<Record<string, string>>({});

  // Automatically clamp activeIdx if list size changes (e.g. status filter or delete)
  React.useEffect(() => {
    if (mistakes.length === 0) {
      setActiveIdx(0);
    } else if (activeIdx >= mistakes.length) {
      setActiveIdx(mistakes.length - 1);
    }
  }, [mistakes.length, activeIdx]);

  // Ensure activeIdx is within bounds
  const currentMistake = mistakes.length > 0 ? mistakes[Math.min(activeIdx, mistakes.length - 1)] : null;

  const handlePrev = () => {
    setShowRetestPad(false);
    setActiveIdx(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setShowRetestPad(false);
    setActiveIdx(prev => Math.min(mistakes.length - 1, prev + 1));
  };

  const subColor = currentMistake ? getSubjectColor(currentMistake.subject) : { text: '', bg: '', border: '', badge: '' };
  const isSolved = currentMistake?.revisionStatus === 'Solved Again' || currentMistake?.revisionStatus === 'Mastered';

  const explanationText = currentMistake ? (currentMistake.correctMethod || currentMistake.correctSolution || 'No formal analytical derivation recorded.') : '';
  const hasDistinctMethod = currentMistake && !!currentMistake.correctMethod && currentMistake.correctMethod !== currentMistake.correctSolution;

  // Keyboard Shortcuts Navigation: ← / → for Prev/Next, S for Scratchpad, M for Mark Solved
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowRetestPad(prev => !prev);
      } else if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && currentMistake) {
        e.preventDefault();
        onUpdateStatus(currentMistake.id, isSolved ? 'New' : 'Solved Again');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIdx, mistakes.length, currentMistake, isSolved]);

  return (
    <div className="space-y-4 text-left">
      
      {/* 1. COMPACT UNIFIED FILTER CONTROLS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-[#121318] border border-zinc-800 rounded-2xl">
        
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All ({mistakes.length})
          </button>
          <button
            onClick={() => setStatusFilter('unresolved')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'unresolved'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-300" />
            <span>Unresolved ({mistakes.filter(m => m.revisionStatus !== 'Solved Again' && m.revisionStatus !== 'Mastered').length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Solved ({mistakes.filter(m => m.revisionStatus === 'Solved Again' || m.revisionStatus === 'Mastered').length})</span>
          </button>
        </div>

        {/* Subject Filter & Search Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 border-t md:border-t-0 md:border-l border-zinc-800 pt-2 md:pt-0 md:pl-3">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">Subject:</span>
            <div className="flex gap-1 font-mono text-[10px]">
              {(['all', 'physics', 'chemistry', 'maths'] as const).map(subj => (
                <button
                  key={subj}
                  onClick={() => setActiveSubject(subj)}
                  className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                    activeSubject === subj
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 font-sans"
            />
          </div>
        </div>
      </div>

      {/* 2. HORIZONTAL QUESTION PALETTE & STEPPERS */}
      <div className="flex items-center justify-between gap-3 p-3 bg-[#121318] border border-zinc-800 rounded-2xl overflow-hidden">
        
        {/* Previous Button */}
        <button
          onClick={handlePrev}
          disabled={activeIdx === 0}
          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 disabled:opacity-30 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
          title="Previous Question [←]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
          <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono border border-zinc-700">←</kbd>
        </button>

        {/* Horizontal Question Pills Strip */}
        <div className="flex-1 overflow-x-auto py-1 px-2 flex items-center justify-start sm:justify-center gap-2 custom-scrollbar">
          {mistakes.map((m, idx) => {
            const isSelected = idx === activeIdx;
            const isItemSolved = m.revisionStatus === 'Solved Again' || m.revisionStatus === 'Mastered';

            return (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  setActiveIdx(idx);
                  setShowRetestPad(false);
                }}
                className={`relative px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer select-none shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400'
                    : isItemSolved
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/50 text-rose-300'
                }`}
              >
                <span>Q{idx + 1}</span>
                {isItemSolved ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={activeIdx === mistakes.length - 1}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-indigo-600/20 transition-colors"
          title="Next Question [→]"
        >
          <span className="hidden sm:inline">Next</span>
          <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 rounded bg-indigo-700/90 text-indigo-100 font-mono border border-indigo-500/40">→</kbd>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. THE DETAILED QUESTION & STEP-BY-STEP DERIVATION STAGE */}
      {!currentMistake ? (
        <div className="p-12 text-center bg-[#121318] border border-zinc-800 rounded-3xl space-y-3">
          <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-display font-bold text-white">No Question Found</h3>
          <p className="text-xs font-mono text-zinc-400">No mistakes match the active subject or status filters.</p>
        </div>
      ) : (
        <motion.div
          key={currentMistake.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-[#121318] border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden"
        >
          {/* Header Line (Q1 • PHYSICS • Kinematics • MCQ • Medium • Status) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-white">
                Q{activeIdx + 1}
              </span>
              <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${subColor.badge}`}>
                {currentMistake.subject.toUpperCase()}
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {currentMistake.chapter}
              </span>
              {currentMistake.topic && currentMistake.topic !== currentMistake.chapter && (
                <>
                  <span className="text-zinc-600 font-mono">•</span>
                  <span className="text-xs font-mono text-zinc-400">
                    {currentMistake.topic}
                  </span>
                </>
              )}
              <span className="text-zinc-600 font-mono">•</span>
              <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                MCQ • {currentMistake.difficulty}
              </span>
            </div>

            {/* Status & Time */}
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                isSolved
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
              }`}>
                {isSolved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                <span>{isSolved ? 'Solved' : 'Needs Review'}</span>
              </span>

              <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>{currentMistake.timeTaken || 1}m</span>
              </span>
            </div>
          </div>

          {/* Question Statement in KaTeX LaTeX */}
          <div className="text-base text-zinc-100 leading-relaxed font-sans">
            <RichTextRenderer content={currentMistake.questionText} />
          </div>

          {/* Diagnostic Misconception (Red Card) */}
          <div className="p-4 rounded-2xl border border-red-900/40 bg-red-950/15 space-y-2">
            <span className="text-[10px] font-mono uppercase font-bold text-red-400 tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              Your Faulty Attempt / Misconception
            </span>
            <div className="text-xs text-red-200 leading-relaxed font-mono bg-red-950/40 p-3 rounded-xl border border-red-900/30 space-y-2">
              <RichTextRenderer content={currentMistake.studentMethod || 'No misconception note recorded.'} />
              {currentMistake.wrongSolutionImage && (
                <div className="mt-2 pt-2 border-t border-red-900/40">
                  <span className="text-[10px] font-mono uppercase text-red-400 block mb-1">Attached Diagram / Attempt:</span>
                  <img src={currentMistake.wrongSolutionImage} alt="Attempt diagram" className="max-h-64 rounded-lg border border-red-900/50 object-contain bg-black/40" />
                </div>
              )}
            </div>
          </div>

          {/* STEP-BY-STEP SOLUTION & EXPLANATION */}
          <div className="p-5 sm:p-6 rounded-2xl border border-indigo-900/40 bg-[#0d0e12] space-y-4">
            <div className="border-b border-zinc-800/80 pb-2.5">
              <span className="text-xs font-mono uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Step-by-Step Solution & Analytical Explanation
              </span>
            </div>

            {/* Derivation with KaTeX Math Rendering */}
            <div className="text-sm text-zinc-200 leading-relaxed space-y-3 font-sans">
              <RichTextRenderer content={explanationText} />
              {currentMistake.correctSolutionImage && (
                <div className="mt-3 pt-3 border-t border-indigo-900/40">
                  <span className="text-[10px] font-mono uppercase text-indigo-400 block mb-1">Attached Solution Diagram:</span>
                  <img src={currentMistake.correctSolutionImage} alt="Solution diagram" className="max-h-64 rounded-lg border border-indigo-900/50 object-contain bg-black/40" />
                </div>
              )}
            </div>

            {/* Key Final Result */}
            {currentMistake.correctSolution && hasDistinctMethod && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs font-mono text-emerald-300">
                <span className="font-bold text-emerald-400 uppercase text-[10px] shrink-0">Key Final Result:</span>
                <div className="font-bold text-emerald-200">
                  <RichTextRenderer content={currentMistake.correctSolution} />
                </div>
              </div>
            )}
          </div>

          {/* AI Concept Safeguard */}
          {currentMistake.aiAdvice && (
            <div className="p-4 rounded-2xl border border-indigo-900/40 bg-indigo-950/20 space-y-1.5">
              <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                AI Concept Safeguard & Exam Strategy
              </span>
              <div className="text-xs text-indigo-200 leading-relaxed font-sans">
                <RichTextRenderer content={currentMistake.aiAdvice} />
              </div>
            </div>
          )}

          {/* Interactive Re-Test Scratchpad */}
          {showRetestPad && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3"
            >
              <label className="text-xs font-mono font-bold text-white block">
                Re-Test Scratchpad (Solve without looking above):
              </label>
              <textarea
                rows={3}
                value={scratchpadText[currentMistake.id] || ''}
                onChange={e => setScratchpadText(prev => ({ ...prev, [currentMistake.id]: e.target.value }))}
                placeholder="Write your revised derivation or final answer here..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => onUpdateStatus(currentMistake.id, 'Solved Again')}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold cursor-pointer"
                >
                  ✓ Confirm Solved (+60 XP)
                </button>
              </div>
            </motion.div>
          )}

          {/* Action Ribbon Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center gap-2">
              {!isSolved ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onUpdateStatus(currentMistake.id, 'Solved Again')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-colors"
                  title="Mark as Solved [M]"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Mark as Solved</span>
                  <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-emerald-700/90 text-emerald-100 font-mono">M</kbd>
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onUpdateStatus(currentMistake.id, 'New')}
                  className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Reopen for Review [M]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reopen for Review</span>
                  <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-amber-900/80 text-amber-200 font-mono border border-amber-700/50">M</kbd>
                </motion.button>
              )}

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowRetestPad(!showRetestPad)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Toggle Scratchpad [S]"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{showRetestPad ? 'Close Scratchpad' : 'Quick Scratchpad'}</span>
                <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-indigo-900/80 text-indigo-200 font-mono border border-indigo-700/50">S</kbd>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => onPinToPlanner(currentMistake)}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pin to Planner</span>
              </motion.button>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => onDelete(currentMistake.id)}
                className="p-2 rounded-xl hover:bg-red-950/40 text-zinc-500 hover:text-red-400 border border-transparent hover:border-red-900/40 transition-colors cursor-pointer"
                title="Delete mistake log entry"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

        </motion.div>
      )}
    </div>
  );
};
