import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, X, Check, RotateCcw, Star, 
  ArrowRight, ShieldCheck, HelpCircle, Sparkles, ChevronRight 
} from 'lucide-react';
import { FormulaEntry, ChapterFormulas, FORMULA_BANK } from '@/constants/formulaBank';
import { MathRenderer } from '@/components/MathRenderer';
import { audioEngine } from '@/utils/audioEngine';
import { useToast } from '@/components/ui/ToastProvider';

interface FlattenedFormula extends FormulaEntry {
  chapterName: string;
  chapterId: string;
  subject: string;
  uniqueKey: string;
}

interface FormulaSpeedDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSubject?: 'all' | 'physics' | 'chemistry' | 'maths';
  onBookmarkFormula: (key: string, title: string) => void;
  bookmarkedKeys: string[];
}

export function FormulaSpeedDrillModal({
  isOpen,
  onClose,
  selectedSubject = 'all',
  onBookmarkFormula,
  bookmarkedKeys
}: FormulaSpeedDrillModalProps) {
  const { toast } = useToast();
  
  // Flatten and filter formula bank
  const allFormulas: FlattenedFormula[] = useMemo(() => {
    const list: FlattenedFormula[] = [];
    FORMULA_BANK.forEach(c => {
      if (selectedSubject !== 'all' && c.subject !== selectedSubject) return;
      c.formulas.forEach((f, idx) => {
        list.push({
          ...f,
          chapterName: c.chapterName,
          chapterId: c.chapterId,
          subject: c.subject,
          uniqueKey: `${c.chapterId}_${idx}`
        });
      });
    });
    // Shuffle cards
    return list.sort(() => Math.random() - 0.5);
  }, [selectedSubject, isOpen]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [recalledCount, setRecalledCount] = useState(0);
  const [forgotCount, setForgotCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsRevealed(false);
      setRecalledCount(0);
      setForgotCount(0);
      setIsFinished(false);
    }
  }, [isOpen, selectedSubject]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen || isFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isRevealed) {
          setIsRevealed(true);
          audioEngine.playMechanicalKey('click').catch(() => {});
        }
      } else if (isRevealed) {
        if (e.key === '1' || e.key === 'g' || e.key === 'ArrowRight') {
          handleAnswer(true);
        } else if (e.key === '2' || e.key === 'r' || e.key === 'ArrowDown') {
          handleAnswer(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRevealed, currentIndex, isFinished]);

  if (!isOpen) return null;

  const currentCard = allFormulas[currentIndex];

  const handleAnswer = (recalled: boolean) => {
    audioEngine.playMechanicalKey(recalled ? 'clack' : 'heavy').catch(() => {});
    if (recalled) {
      setRecalledCount(prev => prev + 1);
    } else {
      setForgotCount(prev => prev + 1);
      // Auto-bookmark forgotten formula if not already starred
      if (currentCard && !bookmarkedKeys.includes(currentCard.uniqueKey)) {
        onBookmarkFormula(currentCard.uniqueKey, currentCard.title);
      }
    }

    if (currentIndex + 1 < allFormulas.length) {
      setCurrentIndex(prev => prev + 1);
      setIsRevealed(false);
    } else {
      setIsFinished(true);
    }
  };

  const accuracy = Math.round((recalledCount / Math.max(1, recalledCount + forgotCount)) * 100);

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
      
      <div className="w-full max-w-xl bg-[#121318] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 text-left font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white tracking-tight">
                Formula Recall Speed Drill
              </h3>
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                {selectedSubject.toUpperCase()} • Spacebar to Reveal • Keys 1/2
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ACTIVE CARD OR FINAL REPORT */}
        {!isFinished && currentCard ? (
          <div className="space-y-6">
            
            {/* Card Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>Card {currentIndex + 1} of {allFormulas.length}</span>
                <span>{Math.round(((currentIndex) / allFormulas.length) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all"
                  style={{ width: `${((currentIndex + 1) / allFormulas.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Main Flashcard Stage */}
            <div className="p-6 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-5 min-h-[220px] flex flex-col justify-between shadow-inner">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-indigo-400 font-bold uppercase">{currentCard.chapterName}</span>
                  <span className="text-zinc-500 uppercase">{currentCard.subject}</span>
                </div>
                <h2 className="text-lg font-bold text-white font-display">
                  {currentCard.title}
                </h2>
                <p className="text-xs text-zinc-400 font-sans italic leading-relaxed">
                  {currentCard.concept}
                </p>
              </div>

              {/* Revealed LaTeX Formula Box */}
              <AnimatePresence mode="wait">
                {isRevealed ? (
                  <motion.div
                    key="formula-revealed"
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-center font-mono text-base text-white shadow-lg"
                  >
                    <MathRenderer text={currentCard.formula} />
                  </motion.div>
                ) : (
                  <motion.button
                    key="reveal-prompt"
                    type="button"
                    onClick={() => {
                      setIsRevealed(true);
                      audioEngine.playMechanicalKey('click').catch(() => {});
                    }}
                    className="w-full py-4 rounded-xl border border-dashed border-zinc-700 hover:border-indigo-500 text-zinc-400 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer bg-zinc-900/40 flex items-center justify-center gap-2 select-none"
                  >
                    <span>Tap or Press [Spacebar] to Reveal Formula</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Answer Control Buttons */}
            {isRevealed ? (
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleAnswer(false)}
                  className="py-3 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <X className="w-4 h-4 text-red-400" />
                  <span>[2] Forgot / Star Formula</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAnswer(true)}
                  className="py-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>[1] Instantly Recalled</span>
                </button>
              </div>
            ) : null}

          </div>
        ) : (
          /* FINAL SUMMARY REPORT */
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold font-display text-white">Speed Drill Completed!</h3>
              <p className="text-xs text-zinc-400 font-mono">
                Formula recall agility test results
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-0.5">
                <span className="text-[10px] text-zinc-400 uppercase">Accuracy</span>
                <div className="text-lg font-bold text-emerald-400">{accuracy}%</div>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-0.5">
                <span className="text-[10px] text-zinc-400 uppercase">Recalled</span>
                <div className="text-lg font-bold text-white">{recalledCount}</div>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-0.5">
                <span className="text-[10px] text-zinc-400 uppercase">Starred</span>
                <div className="text-lg font-bold text-amber-400">{forgotCount}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setIsRevealed(false);
                  setRecalledCount(0);
                  setForgotCount(0);
                  setIsFinished(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold border border-zinc-800 transition-colors cursor-pointer"
              >
                Drill Again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors cursor-pointer"
              >
                Return to Formula Vault
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
