import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, CheckCircle2, XCircle, RefreshCw, AlertCircle, Eye } from 'lucide-react';
import { Mistake } from '@/types';
import { useStudyBrain } from '@/context/StudyBrainContext';
import { soundSystem } from '@/utils/audioEffects';
import { BlockMath, InlineMath } from 'react-katex';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface MistakeTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  mistakes: Mistake[];
}

export function MistakeTestModal({ isOpen, onClose, mistakes }: MistakeTestModalProps) {
  useLockBodyScroll(isOpen || false);

  const { actions, state } = useStudyBrain();
  
  // Filter only mistakes that are not Mastered and have question text
  const [testQueue, setTestQueue] = useState<Mistake[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionResults, setSessionResults] = useState<{correct: number, wrong: number}>({ correct: 0, wrong: 0 });

  useEffect(() => {
    if (isOpen) {
      // Shuffle and pick up to 20 unmastered mistakes that have questionText
      const eligible = mistakes.filter(m => m.revisionStatus !== 'Mastered' && m.questionText && m.questionText.trim().length > 0);
      const shuffled = [...eligible].sort(() => 0.5 - Math.random());
      setTestQueue(shuffled.slice(0, 20));
      setCurrentIndex(0);
      setIsRevealed(false);
      setCompleted(false);
      setSessionResults({ correct: 0, wrong: 0 });
    }
  }, [isOpen, mistakes]);

  if (!isOpen) return null;

  const currentMistake = testQueue[currentIndex];

  const handleReveal = () => {
    setIsRevealed(true);
    if (state.settings.soundEffects) {
      soundSystem.playSuccess(true, state.settings.volume);
    }
  };

  const handleScore = async (isCorrect: boolean) => {
    if (!currentMistake) return;
    
    // Update Mistake
    await actions.updateMistakeTestResult(currentMistake.id, isCorrect);
    
    // Update local session stats
    setSessionResults(prev => ({
      ...prev,
      [isCorrect ? 'correct' : 'wrong']: prev[isCorrect ? 'correct' : 'wrong'] + 1
    }));

    // Move to next
    if (currentIndex < testQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsRevealed(false);
    } else {
      setCompleted(true);
    }
  };

  const renderMathText = (text: string | undefined | null) => {
    if (!text) return null;
    const cleanText = text.replace(/\\\$/g, '$');
    const parts = cleanText.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
    return parts.map((part, i) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2);
        return <BlockMath key={i} math={math} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        return <InlineMath key={i} math={math} />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] bg-[#09090b] flex flex-col font-sans animate-in fade-in duration-300 overflow-hidden">
        <div
          className="w-full h-full flex flex-col"
        >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-white leading-none">Mistake Recovery Test</h2>
              <p className="text-xs text-zinc-400 mt-1">
                {!completed && testQueue.length > 0 
                  ? `Question ${currentIndex + 1} of ${testQueue.length}` 
                  : 'Session Complete'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {testQueue.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 mb-6 border border-zinc-800">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-2">No Eligible Mistakes Found</h3>
              <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                You don't have any logged mistakes with 'Question Text' filled out, or you have already Mastered them all. 
                Log some detailed mistakes first!
              </p>
              <button 
                onClick={onClose}
                className="mt-8 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : completed ? (
            <div className="text-center py-16 space-y-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/30">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-3xl font-display font-black text-white tracking-tight">Test Complete!</h3>
                <p className="text-zinc-400 font-mono mt-2">You reviewed {testQueue.length} mistakes.</p>
              </div>
              
              <div className="flex items-center justify-center gap-6 max-w-sm mx-auto">
                <div className="flex-1 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-2xl font-black text-emerald-400">{sessionResults.correct}</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-500/70 mt-1">Correct</div>
                </div>
                <div className="flex-1 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <div className="text-2xl font-black text-rose-400">{sessionResults.wrong}</div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-rose-500/70 mt-1">Needs Work</div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="px-8 py-4 rounded-xl bg-zinc-100 text-black font-mono font-bold hover:bg-white transition-colors mt-8 cursor-pointer"
              >
                Return to Mistake Log
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMistake.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Meta Row */}
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold">
                    {currentMistake.chapter}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-mono">
                    {currentMistake.topic}
                  </span>
                </div>

                {/* Question */}
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <h4 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Question</h4>
                  <div className="text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans text-lg">
                    {renderMathText(currentMistake.questionText)}
                  </div>
                </div>

                {/* Solution Reveal */}
                {!isRevealed ? (
                  <div className="pt-8 text-center">
                    <button
                      onClick={handleReveal}
                      className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 hover:scale-105 text-white font-mono font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2 mx-auto cursor-pointer"
                    >
                      <Eye className="w-5 h-5" />
                      Reveal Solution
                    </button>
                    <p className="text-xs text-zinc-500 font-mono mt-4">Solve this on paper, then reveal to check your answer.</p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6"
                  >
                    <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
                      <h4 className="text-xs font-mono text-emerald-500 uppercase tracking-widest mb-4">Correct Solution & Method</h4>
                      <div className="text-emerald-100 leading-relaxed whitespace-pre-wrap font-sans">
                        {renderMathText(currentMistake.correctSolution || currentMistake.correctMethod || 'No solution recorded.')}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                      <button
                        onClick={() => handleScore(false)}
                        className="flex-1 py-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono font-bold hover:bg-rose-500/20 transition-colors flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-6 h-6 mb-1" />
                        Got it Wrong
                        <span className="text-[10px] font-sans font-normal opacity-70">(-20 Recovery Score)</span>
                      </button>
                      <button
                        onClick={() => handleScore(true)}
                        className="flex-1 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold hover:bg-emerald-500/20 transition-colors flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-6 h-6 mb-1" />
                        Got it Right
                        <span className="text-[10px] font-sans font-normal opacity-70">(+40 Recovery Score)</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
