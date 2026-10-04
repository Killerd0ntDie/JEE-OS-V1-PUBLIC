import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle2, RotateCw, BookOpen, 
  AlertCircle, ShieldCheck
} from 'lucide-react';
import { RevisionCardItem } from '@jee-os/engines';
import { BlockMath, InlineMath } from 'react-katex';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

export interface RevisionSessionProps {
  cards: RevisionCardItem[];
  chapterTitle?: string;
  chapterId?: string;
  onClose: () => void;
  onFinish?: () => void;
}

function renderMathText(text: string | undefined | null) {
  if (!text) return null;
  try {
    let cleanText = text.replace(/\\\$/g, '$');
    if (!cleanText.includes('$') && /\\(?:frac|sqrt|text|vec|hat|bar|Delta|nabla|times|cdot|pm|approx|equiv|implies|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|pi|rho|sigma|tau|phi|omega|tan|cos|sin|ln|log)\b|[=<>]\s*[-\\+0-9a-zA-Z]/.test(cleanText)) {
      cleanText = `$${cleanText}$`;
    }
    const parts = cleanText.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
    return parts.map((part, i) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2);
        return <BlockMath key={i} math={math} errorColor="#ef4444" />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        return <InlineMath key={i} math={math} errorColor="#ef4444" />;
      }
      return <span key={i}>{part}</span>;
    });
  } catch {
    return <span className="font-mono text-sm text-zinc-300">{text}</span>;
  }
}

export function RevisionSession({
  cards = [],
  chapterTitle,
  chapterId,
  onClose,
  onFinish
}: RevisionSessionProps) {
  const actions = useStudyBrainStore(state => state.actions);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedGrades, setCompletedGrades] = useState<Array<{ cardId: string; chapterId: string; quality: number }>>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCard = cards[currentIndex];
  const progressPct = cards.length > 0 ? Math.round((currentIndex / cards.length) * 100) : 0;

  const handleGrade = useCallback((quality: number) => {
    if (!currentCard || isSubmitting) return;

    const newGrade = {
      cardId: currentCard.id,
      chapterId: currentCard.chapterId,
      quality
    };
    const updatedGrades = [...completedGrades, newGrade];
    setCompletedGrades(updatedGrades);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      // Finished all cards in this session
      setIsSubmitting(true);
      (async () => {
        try {
          if (actions.gradeFlashcardsBatch && updatedGrades.length > 0) {
            await actions.gradeFlashcardsBatch(updatedGrades);
          }
          if (chapterId && actions.completeRevision) {
            const avgQuality = updatedGrades.reduce((sum, g) => sum + g.quality, 0) / updatedGrades.length;
            const overallConf: 'High' | 'Medium' | 'Low' = avgQuality >= 4 ? 'High' : avgQuality >= 3 ? 'Medium' : 'Low';
            await actions.completeRevision(chapterId, overallConf);
          }
        } catch (err) {
          console.error('[RevisionSession] Failed to persist review session:', err);
        } finally {
          setIsSubmitting(false);
          setIsFinished(true);
        }
      })();
    }
  }, [currentCard, isSubmitting, completedGrades, currentIndex, cards.length, actions, chapterId]);

  // Keyboard Shortcuts: Space to flip, 1-4 to grade
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || isSubmitting) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (isFlipped) {
        if (e.key === '1') {
          e.preventDefault();
          handleGrade(1);
        } else if (e.key === '2') {
          e.preventDefault();
          handleGrade(2);
        } else if (e.key === '3') {
          e.preventDefault();
          handleGrade(4); // Good
        } else if (e.key === '4') {
          e.preventDefault();
          handleGrade(5); // Easy
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isFinished, isSubmitting, handleGrade]);

  if (!cards || cards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="surface-2 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-display font-bold text-white">All Caught Up!</h3>
          <p className="text-xs text-zinc-400">There are no cards due for review in this queue right now.</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Finished Session Screen
  if (isFinished) {
    const successfulRecalls = completedGrades.filter(g => g.quality >= 3).length;
    const accuracyRate = completedGrades.length > 0 ? Math.round((successfulRecalls / completedGrades.length) * 100) : 100;
    const xpGained = completedGrades.reduce((acc, g) => acc + (g.quality >= 3 ? 15 : 5), 0);

    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="surface-2 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/40">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-display font-bold text-white tracking-tight">Review Complete</h2>
            <p className="text-xs text-zinc-400">
              {chapterTitle ? `Spaced repetition progress saved for ${chapterTitle}.` : 'Session progress saved to your spaced repetition records.'}
            </p>
          </div>

          {/* Real Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Cards Reviewed</span>
              <span className="text-lg font-bold text-white">{completedGrades.length}</span>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Recall Accuracy</span>
              <span className={`text-lg font-bold ${accuracyRate >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {accuracyRate}%
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">XP Earned</span>
              <span className="text-lg font-bold text-indigo-400">+{xpGained}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onFinish?.();
                onClose();
              }}
              className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-indigo-950/50 cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      
      {/* Top Header & Progress Bar */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 font-mono text-xs font-bold uppercase tracking-wider">
            {currentCard?.subject}
          </span>
          <span className="text-sm font-semibold text-zinc-200 truncate max-w-xs sm:max-w-md">
            {chapterTitle || currentCard?.chapterName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-400 font-bold">
            {currentIndex + 1} / {cards.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Exit Session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Thin Progress Line */}
      <div className="max-w-3xl w-full mx-auto h-1 rounded-full bg-zinc-800 overflow-hidden mb-4">
        <div 
          className="h-full bg-indigo-500 transition-all duration-300 rounded-full" 
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main Flashcard Card */}
      <div className="flex-1 max-w-3xl w-full mx-auto flex flex-col justify-center my-auto py-2">
        <motion.div
          key={currentCard?.id || currentIndex}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
          className="surface-2 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 min-h-[360px] sm:min-h-[420px] flex flex-col justify-between shadow-2xl relative overflow-hidden"
        >
          {/* Card Meta Badge */}
          <div className="flex items-center justify-between mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border ${
              currentCard?.cardType === 'mistake'
                ? 'bg-rose-950/50 text-rose-300 border-rose-500/30'
                : 'bg-indigo-950/50 text-indigo-300 border-indigo-500/30'
            }`}>
              {currentCard?.cardType === 'mistake' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Mistake Review</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Formula Concept</span>
                </>
              )}
            </span>

            <span className="font-mono text-[11px] text-zinc-500">
              Space = Flip
            </span>
          </div>

          {/* Question / Front Section */}
          <div className="space-y-4 my-auto">
            <h3 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
              {currentCard?.title}
            </h3>

            {currentCard?.concept && (
              <div className="text-sm text-zinc-300 leading-relaxed font-sans bg-zinc-950/40 p-4 rounded-2xl border border-white/5">
                {renderMathText(currentCard.concept)}
              </div>
            )}

            {/* Answer / Back Section */}
            <AnimatePresence>
              {isFlipped && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-3 border-t border-zinc-800/80 space-y-3"
                >
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider block">
                    {currentCard?.cardType === 'mistake' ? 'Correct Method / Solution:' : 'Formula & Key Takeaway:'}
                  </span>

                  <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-sm font-medium leading-relaxed">
                    {renderMathText(currentCard?.formula)}
                  </div>

                  {currentCard?.examNote && (
                    <p className="text-xs text-amber-300/90 italic bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl">
                      Exam Tip: {currentCard.examNote}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reveal Button or 4-Button SM-2 Grading Strip */}
          <div className="mt-6 pt-4 border-t border-zinc-800/80">
            {!isFlipped ? (
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>Show Answer (Press Space)</span>
              </button>
            ) : (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold text-center block">
                  Self-Grade Your Retrieval:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleGrade(1)}
                    className="py-3 px-2 rounded-2xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm"
                  >
                    <span>Again [1]</span>
                    <span className="text-[9px] text-rose-400/80 font-normal">Failed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGrade(2)}
                    className="py-3 px-2 rounded-2xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm"
                  >
                    <span>Hard [2]</span>
                    <span className="text-[9px] text-amber-400/80 font-normal">Difficult</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGrade(4)}
                    className="py-3 px-2 rounded-2xl bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/40 text-sky-300 font-mono text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm"
                  >
                    <span>Good [3]</span>
                    <span className="text-[9px] text-sky-400/80 font-normal">Recalled</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGrade(5)}
                    className="py-3 px-2 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm"
                  >
                    <span>Easy [4]</span>
                    <span className="text-[9px] text-emerald-400/80 font-normal">Instant</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="max-w-3xl w-full mx-auto text-center py-2">
        <span className="font-mono text-[11px] text-zinc-500">
          Keys: [Space] Flip • [1] Again • [2] Hard • [3] Good • [4] Easy
        </span>
      </div>

    </div>
  );
}
