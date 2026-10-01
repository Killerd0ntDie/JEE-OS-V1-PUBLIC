import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, X, Check, ShieldCheck, Sparkles, 
} from 'lucide-react';
import { FormulaEntry, FORMULA_BANK } from '@/constants/formulaBank';
import { MathRenderer, BlockMath } from '@/components/MathRenderer';
import { Modal } from '@/components/ui/Modal';
import { audioEngine } from '@/utils/audioEngine';
import { springs } from '@/constants/motion';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { isChapterKnownOrRunning } from '@jee-os/engines';

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
  const chapters = useStudyBrainStore(state => state.chapters) || [];
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);

  // Flatten and filter formula bank: strictly only running and completed chapters
  const allFormulas: FlattenedFormula[] = useMemo(() => {
    const list: FlattenedFormula[] = [];
    const hasSyllabus = chapters.length > 0;

    FORMULA_BANK.forEach(c => {
      if (selectedSubject !== 'all' && c.subject !== selectedSubject) return;

      if (hasSyllabus) {
        const matchingChap = chapters.find(
          ch => ch.id === c.chapterId || ch.name.toLowerCase() === c.chapterName.toLowerCase()
        );
        const telemetry = matchingChap ? chapterTelemetryMap?.[matchingChap.id] : undefined;
        const isStarted = matchingChap ? isChapterKnownOrRunning(matchingChap, telemetry) : false;

        c.formulas.forEach((f, idx) => {
          const uniqueKey = `${c.chapterId}_${idx}`;
          const isBookmarked = bookmarkedKeys.includes(uniqueKey);
          if (isStarted || isBookmarked) {
            list.push({
              ...f,
              chapterName: c.chapterName,
              chapterId: c.chapterId,
              subject: c.subject,
              uniqueKey
            });
          }
        });
      } else {
        // Fallback for test environments without syllabus initialized
        c.formulas.forEach((f, idx) => {
          list.push({
            ...f,
            chapterName: c.chapterName,
            chapterId: c.chapterId,
            subject: c.subject,
            uniqueKey: `${c.chapterId}_${idx}`
          });
        });
      }
    });
    // Shuffle cards
    return list.sort(() => Math.random() - 0.5);
  }, [selectedSubject, isOpen, chapters, chapterTelemetryMap, bookmarkedKeys]);

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

  const cleanFormulaString = (raw: string | undefined | null): string => {
    if (!raw) return '';
    return raw.trim().replace(/^\$\$([\s\S]*?)\$\$$|^\\\[([\s\S]*?)\\\]$|^\$([\s\S]*?)\$$/, (_m, p1, p2, p3) => (p1 || p2 || p3).trim()).trim();
  };

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={100010}
      backdropClassName="bg-black/35 backdrop-blur-sm"
      className="w-full max-w-xl bg-[#0e0f14] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 text-left font-sans"
    >
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
          className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ZERO FORMULAS EMPTY STATE */}
      {!isFinished && allFormulas.length === 0 && (
        <div className="p-8 rounded-2xl bg-zinc-950/80 border border-white/10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-amber-950/60 rounded-full flex items-center justify-center border border-amber-500/40 text-amber-400 shadow-md">
            <Zap className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-display font-bold text-white">
              No Formulas Available in Speed Drill
            </h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Speed drills only test formulas from chapters you have started or completed. Start studying chapters in your syllabus to unlock rapid recall drills!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close Drill
          </button>
        </div>
      )}

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
              <motion.div 
                className="bg-indigo-500 h-full"
                initial={false}
                animate={{ width: `${((currentIndex + 1) / allFormulas.length) * 100}%` }}
                transition={springs.snappy}
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
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={springs.snappy}
                  className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-center font-mono text-base text-white shadow-lg space-y-3"
                >
                  <BlockMath math={cleanFormulaString(currentCard.formula)} />
                  {currentCard.examNote && (
                    <div className="pt-2 border-t border-indigo-500/20 text-xs font-mono text-amber-300 flex items-start gap-2 text-left">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300 mr-1.5">[JEE Pro Tip]</span>
                        <MathRenderer text={currentCard.examNote} />
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.button
                  key="reveal-prompt"
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={springs.snappy}
                  onClick={() => {
                    setIsRevealed(true);
                    audioEngine.playMechanicalKey('click').catch(() => {});
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-xl border border-dashed border-zinc-700 hover:border-indigo-500 text-zinc-400 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer bg-zinc-900/40 flex items-center justify-center gap-2 select-none"
                >
                  <span>Tap or Press [Spacebar] to Reveal Formula</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Answer Control Buttons */}
          <AnimatePresence>
            {isRevealed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={springs.snappy}
                className="grid grid-cols-2 gap-3 font-mono text-xs"
              >
                <motion.button
                  type="button"
                  onClick={() => handleAnswer(false)}
                  whileTap={{ scale: 0.97 }}
                  className="py-3 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <X className="w-4 h-4 text-red-400" />
                  <span>[2] Forgot / Star Formula</span>
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => handleAnswer(true)}
                  whileTap={{ scale: 0.97 }}
                  className="py-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>[1] Instantly Recalled</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      ) : (
        /* FINAL SUMMARY REPORT */
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={springs.gentle}
          className="space-y-6 text-center py-4"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springs.bouncy}
            className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400"
          >
            <ShieldCheck className="w-8 h-8" />
          </motion.div>

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
            <motion.button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                setIsRevealed(false);
                setRecalledCount(0);
                setForgotCount(0);
                setIsFinished(false);
              }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold border border-zinc-800 transition-colors cursor-pointer"
            >
              Drill Again
            </motion.button>
            <motion.button
              type="button"
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors cursor-pointer"
            >
              Return to Formula Vault
            </motion.button>
          </div>
        </motion.div>
      )}

    </Modal>
  );
}
