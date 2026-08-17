import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalVariants } from '@/constants/motion';
import { 
  CheckCircle, ChevronLeft, ChevronRight, Eye, 
  RotateCcw, AlertTriangle, BookOpen, Clock, X, Trophy, Sparkles, Check
} from 'lucide-react';
import { Mistake, SubjectId } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { RichTextRenderer } from '@/components/MathRenderer';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEscapeKey } from '@/hooks/useEscapeKey';

export interface BatchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMistakes: Mistake[];
  onUpdateStatus: (id: string, status: Mistake['revisionStatus']) => void;
  getSubjectColor: (sub: SubjectId) => { text: string; bg: string; border: string; badge: string };
  triggerToast: (msg: string, type?: 'success' | 'info') => void;
}

export const BatchReviewModal: React.FC<BatchReviewModalProps> = ({
  isOpen,
  onClose,
  activeMistakes,
  onUpdateStatus,
  getSubjectColor,
  triggerToast,
}) => {
  const actions = useStudyBrainStore(state => state.actions);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<Mistake[]>([]);
  const [userScratchpad, setUserScratchpad] = useState<Record<string, string>>({});
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      setReviewQueue(activeMistakes);
      setCurrentIndex(0);
      setShowSolution(false);
      setUserScratchpad({});
      setResolvedIds(new Set());
      setSecondsElapsed(0);
      setIsFinished(false);

      timerRef.current = setInterval(() => {
        setSecondsElapsed(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, activeMistakes]);

  if (!isOpen) return null;

  const currentItem = reviewQueue[currentIndex];

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleNext = () => {
    setShowSolution(false);
    if (currentIndex < reviewQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    setShowSolution(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleMarkResolved = async (item: Mistake) => {
    onUpdateStatus(item.id, 'Solved Again');
    setResolvedIds(prev => new Set(prev).add(item.id));
    triggerToast(`"${item.chapter}" marked as Solved!`, 'success');
    
    // Reward XP for solving a logged error
    try {
      await actions.completeStudySession({
        type: 'Revision',
        duration: Math.max(1, Math.round(secondsElapsed / 60)),
        questionsSolved: 1,
        correct: 1,
        accuracy: 100,
        xpEarned: 60,
      });
    } catch (_) {}

    handleNext();
  };

  const handleKeepInLog = () => {
    handleNext();
  };

  const subColor = currentItem ? getSubjectColor(currentItem.subject) : { text: '', bg: '', border: '', badge: '' };

  return (
    <div className="fixed inset-0 z-50 bg-black/10 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none">
      <motion.div
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full max-w-4xl max-h-[92vh] rounded-2xl border border-zinc-850/80 shadow-2xl flex flex-col overflow-hidden text-left"
      >
        {/* CBT TOP BAR */}
        <div className="p-4 sm:p-5 border-b border-zinc-850/80 bg-zinc-950 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-display font-bold text-white">Mistakes Retest Arena</h2>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">CBT Focused Error Rehabilitation</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Question Counter Pill */}
            {reviewQueue.length > 0 && !isFinished && (
              <span className="text-xs font-mono font-bold text-zinc-200 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl">
                Question <strong className="text-indigo-400">{currentIndex + 1}</strong> of {reviewQueue.length}
              </span>
            )}

            {/* Stopwatch */}
            <span className="text-xs font-mono text-zinc-300 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formatTime(secondsElapsed)}</span>
            </span>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PROGRESS LINE */}
        {reviewQueue.length > 0 && !isFinished && (
          <div className="w-full bg-zinc-900 h-1 shrink-0">
            <div 
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / reviewQueue.length) * 100}%` }}
            />
          </div>
        )}

        {/* BODY STAGE */}
        {isFinished ? (
          /* COMPLETION SCORECARD */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5 flex-1 overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/20">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-display font-bold text-white tracking-tight">Retest Session Completed!</h3>
              <p className="text-xs font-mono text-zinc-400 max-w-md">
                You stepped through {reviewQueue.length} logged mistakes in {formatTime(secondsElapsed)}.
              </p>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-md font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold">Reviewed</span>
                <span className="text-lg font-bold text-white">{reviewQueue.length}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center">
                <span className="text-[10px] text-emerald-400 block uppercase font-bold">Resolved</span>
                <span className="text-lg font-bold text-emerald-300">{resolvedIds.size}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-center">
                <span className="text-[10px] text-indigo-400 block uppercase font-bold">XP Earned</span>
                <span className="text-lg font-bold text-indigo-300">+{resolvedIds.size * 60}</span>
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/30 cursor-pointer transition-colors"
            >
              Back to Mistakes Log
            </motion.button>
          </div>
        ) : currentItem ? (
          /* QUESTION & SOLVING STAGE */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
            
            {/* Meta Tags Row */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${subColor.badge}`}>
                  {currentItem.subject.toUpperCase()}
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {currentItem.chapter}
                </span>
                <span className="text-zinc-600 font-mono">•</span>
                <span className="text-xs font-mono text-zinc-400 truncate">
                  {currentItem.topic || 'Practice Drill'}
                </span>
              </div>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-zinc-850 bg-zinc-900 text-zinc-400">
                Difficulty: {currentItem.difficulty}
              </span>
            </div>

            {/* Question Stage with LaTeX */}
            <div className="p-5 rounded-2xl border border-zinc-850/80 bg-zinc-900/60 text-zinc-100 text-sm leading-relaxed shadow-inner">
              <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider block mb-2">
                Question Statement
              </span>
              <RichTextRenderer content={currentItem.questionText} />
            </div>

            {/* Student Scratchpad Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase font-bold text-zinc-400 tracking-wider block">
                Your Attempt Workspace / Final Calculation:
              </label>
              <textarea
                value={userScratchpad[currentItem.id] || ''}
                onChange={(e) => setUserScratchpad(prev => ({ ...prev, [currentItem.id]: e.target.value }))}
                placeholder="Write your revised steps, key formula, or final answer here..."
                rows={3}
                className="w-full bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-all custom-scrollbar"
              />
            </div>

            {/* Toggle Solution Reveal */}
            <div className="flex justify-center pt-1">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowSolution(!showSolution)}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider border transition-colors flex items-center gap-2 cursor-pointer ${
                  showSolution 
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                    : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-300 shadow-sm'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showSolution ? 'Hide Solution' : 'Reveal Correct Method & Solution'}</span>
              </motion.button>
            </div>

            {/* Revealed Side-by-Side Diagnostic Comparison */}
            <AnimatePresence>
              {showSolution && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 pt-2"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Previous Faulty Attempt */}
                    <div className="p-4 rounded-xl border border-red-900/40 bg-red-950/15 space-y-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-red-400 tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        Previous Faulty Method
                      </span>
                      <div className="text-xs text-red-200 leading-relaxed font-mono">
                        <RichTextRenderer content={currentItem.studentMethod || 'No prior notes recorded.'} />
                      </div>
                    </div>

                    {/* Correct Analytical Solution */}
                    <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/15 space-y-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Correct Step-by-Step Solution
                      </span>
                      <div className="text-xs text-emerald-200 leading-relaxed">
                        <RichTextRenderer content={currentItem.correctSolution || currentItem.correctMethod || 'No solution recorded.'} />
                      </div>
                    </div>
                  </div>

                  {/* Grading Evaluation Prompt */}
                  <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-mono text-zinc-300 font-bold">
                      Did you resolve this mistake correctly on this retest?
                    </span>
                    <div className="flex items-center gap-2">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleMarkResolved(currentItem)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Solved Correctly</span>
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={handleKeepInLog}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 font-mono text-xs font-bold cursor-pointer"
                      >
                        <span>Still Shaky</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}

        {/* CBT FOOTER NAVIGATION */}
        {!isFinished && reviewQueue.length > 0 && (
          <div className="p-4 border-t border-zinc-850/80 bg-zinc-950 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 disabled:opacity-30 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-colors"
            >
              <span>{currentIndex === reviewQueue.length - 1 ? 'Finish Retest' : 'Next Question'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
