import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, ChevronLeft, ChevronRight, Eye, EyeOff, 
  Sparkles, Award, RotateCcw, AlertTriangle, BookOpen 
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Mistake, SubjectId } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { RichTextRenderer } from '@/components/MathRenderer';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { MissionMode } from '@/features/mission/MissionMode';
import { BlockMath, InlineMath } from '@/components/MathRenderer';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);


  if (!isOpen) return null;

  const currentItem = activeMistakes[currentIndex];

  const handleNext = () => {
    setShowAnswer(false);
    if (currentIndex < activeMistakes.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setShowAnswer(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return isOpen ? (
    <MissionMode 
      mode="mistake" 
      activeSubject="all" 
      customDurationSecs={1800} 
      skipSetup={true}
      onExit={onClose} 
      onComplete={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-review-modal-title"
        className="w-full max-w-3xl h-full max-h-[85vh] bg-[#0e0e11]/80 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-950/40 text-red-400 border border-red-900/40">
              <RotateCcw className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <h2 id="batch-review-modal-title" className="text-sm font-bold text-white font-display">Active Recall Review Session</h2>
              <p className="text-xs text-zinc-400 font-mono">STEP THROUGH ACTIVE MISTAKES FOR SPACED RECALL</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeMistakes.length > 0 && (
              <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                {currentIndex + 1} / {activeMistakes.length}
              </span>
            )}
            <button
              onClick={onClose}
              aria-label="Close Review Session Modal"
              className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-900 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {activeMistakes.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Award className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
              <h3 className="text-sm font-bold text-zinc-200">No Active Errors Pending Review!</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto font-mono">
                All logged mistakes are either mastered or fully reviewed. Log new questions or reset status from the ledger.
              </p>
            </div>
          ) : currentItem ? (
            <div className="space-y-5">
              {/* Question Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className={`text-[11px] ${getSubjectColor(currentItem.subject).badge}`}>
                    {currentItem.subject}
                  </Badge>
                  <span className="text-xs font-bold text-zinc-200">{currentItem.chapter}</span>
                  <span className="text-2xs text-zinc-400 font-mono">/ {currentItem.topic}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-mono text-amber-400 bg-amber-950/30 border border-amber-900/30 px-2 py-0.5 rounded">
                    Priority: {currentItem.priority}
                  </span>
                  <span className="text-2xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {currentItem.difficulty}
                  </span>
                </div>
              </div>

              {/* Question Box */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                  Question (Source: {currentItem.source})
                </span>
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-zinc-200 leading-relaxed whitespace-pre-line shadow-inner">
                  <RichTextRenderer content={currentItem.questionText} />
                </div>
              </div>

              {/* Active Recall Reveal Button */}
              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full py-3 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                >
                  <Eye className="w-4 h-4" />
                  Reveal Faulty vs Correct Method & Solution
                </button>
              ) : (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Split Diagnostic */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-red-950/10 border border-red-950/30 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-mono uppercase text-red-400 tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          My Original Error
                        </span>
                        <p className="text-xs text-zinc-300 font-sans"><RichTextRenderer content={currentItem.studentMethod} /></p>
                      </div>

                      <div className="p-4 bg-emerald-950/10 border border-emerald-950/30 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Correct Approach
                        </span>
                        <p className="text-xs text-zinc-300 font-sans"><RichTextRenderer content={currentItem.correctMethod} /></p>
                      </div>
                    </div>

                    {/* Solution */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        Complete Solution Steps
                      </span>
                      <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                        <RichTextRenderer content={currentItem.correctSolution} />
                      </div>
                    </div>

                    {/* AI Advice */}
                    {currentItem.aiAdvice && (
                      <div className="p-3.5 bg-amber-950/15 border border-amber-900/40 rounded-xl flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-300 font-sans"><RichTextRenderer content={currentItem.aiAdvice} /></p>
                      </div>
                    )}

                    {/* Rate Confidence / Update Status Controls */}
                    <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-2">
                      <span className="text-3xs font-mono uppercase text-zinc-400 tracking-wider">
                        Update Recovery Status for this item:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            onUpdateStatus(currentItem.id, 'Reviewed');
                            triggerToast('Marked as Reviewed (40% Recovery)', 'info');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-2xs font-bold border transition-all cursor-pointer ${
                            currentItem.revisionStatus === 'Reviewed'
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          Reviewed [40%]
                        </button>
                        <button
                          onClick={() => {
                            onUpdateStatus(currentItem.id, 'Solved Again');
                            triggerToast('Marked as Re-Attempted (70% Recovery)', 'info');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-2xs font-bold border transition-all cursor-pointer ${
                            currentItem.revisionStatus === 'Solved Again'
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          Solved Again [70%]
                        </button>
                        <button
                          onClick={() => {
                            onUpdateStatus(currentItem.id, 'Mastered');
                            triggerToast('Marked as Mastered (100% Recovery)!', 'success');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-2xs font-bold border transition-all cursor-pointer ${
                            currentItem.revisionStatus === 'Mastered'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-zinc-950 text-emerald-400 border-emerald-900/60 hover:bg-emerald-900/20'
                          }`}
                        >
                          Mark Mastered [100%]
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowAnswer(false)}
                      className="text-3xs text-zinc-400 hover:text-zinc-300 font-mono flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <EyeOff className="w-3 h-3" />
                      Hide Answer Pane
                    </button>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-900/20 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0 || activeMistakes.length === 0}
            className="flex items-center gap-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-40 text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-3xs font-mono text-zinc-400 hidden sm:inline">
            Press Next to review next question
          </span>

          <button
            onClick={handleNext}
            disabled={currentIndex === activeMistakes.length - 1 || activeMistakes.length === 0}
            className="flex items-center gap-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-40 text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </MissionMode>
  ) : null;
};
