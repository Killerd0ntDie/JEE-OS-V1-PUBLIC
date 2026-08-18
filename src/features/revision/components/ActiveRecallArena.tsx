import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Flame, Skull, CheckCircle2, XCircle, 
  Timer, Sparkles, Trophy, Zap, Clock, ShieldCheck, Check, RotateCcw
} from 'lucide-react';
import { RevisionCardItem } from '@jee-os/engines';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { BlockMath, InlineMath } from 'react-katex';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

interface ActiveRecallArenaProps {
  cards: RevisionCardItem[];
  onExit: () => void;
}

export function ActiveRecallArena({ cards, onExit }: ActiveRecallArenaProps) {
  const actions = useStudyBrainStore(state => state.actions);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ id: string; success: boolean; quality: number }[]>([]);
  const [feedbackFlash, setFeedbackFlash] = useState<'correct' | 'wrong' | null>(null);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [sessionLogged, setSessionLogged] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());
  const sessionFeedbackRef = useRef<Map<string, number[]>>(new Map());

  const currentCard = cards[currentIndex];
  const isFinished = cards.length > 0 && currentIndex >= cards.length;

  const renderMathText = (text: string | undefined | null) => {
    if (!text) return null;
    try {
      const cleanText = text.replace(/\\\$/g, '$');
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
      return <span className="font-mono text-xs text-zinc-300">{text}</span>;
    }
  };

  const showFeedback = useCallback((type: 'correct' | 'wrong', xp: number) => {
    setFeedbackFlash(type);
    setXpToast(xp);
    setTimeout(() => {
      setFeedbackFlash(null);
      setXpToast(null);
    }, 1200);
  }, []);

  // Handle Timeout (Auto-fail card, reveal answer, lock pad & auto-advance)
  const handleTimeUp = useCallback(() => {
    if (!currentCard || isTransitioning) return;
    setIsTransitioning(true);
    setIsRevealed(true);

    const map = sessionFeedbackRef.current;
    if (!map.has(currentCard.chapterId)) {
      map.set(currentCard.chapterId, []);
    }
    map.get(currentCard.chapterId)!.push(0);

    setSessionResults(prev => [...prev, { id: currentCard.id, success: false, quality: 0 }]);
    showFeedback('wrong', 0);

    // Auto-advance after giving the student time to see the answer
    autoAdvanceRef.current = setTimeout(() => {
      setIsRevealed(false);
      setTimeLeft(15);
      setIsTransitioning(false);
      setCurrentIndex(prev => prev + 1);
    }, 1800);
  }, [currentCard, isTransitioning, showFeedback]);

  // Timer countdown logic
  useEffect(() => {
    if (isFinished || isRevealed || isTransitioning || cards.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isFinished, isRevealed, isTransitioning, cards.length, handleTimeUp]);

  // Clean up auto advance timeouts
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // Keyboard Shortcuts (Space = Reveal, 1 = Blackout, 2 = Hard, 3 = Good, 4 = Perfect)
  useEffect(() => {
    if (isFinished || isTransitioning || cards.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        audioEngine.playCardFlip().catch(() => {});
        setIsRevealed(prev => !prev);
      } else if (isRevealed) {
        if (e.key === '1') handleDecision(0, 'Blackout');
        if (e.key === '2') handleDecision(2, 'Hard');
        if (e.key === '3') handleDecision(4, 'Good');
        if (e.key === '4') handleDecision(5, 'Perfect');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, isRevealed, isTransitioning, currentIndex, cards.length]);

  // Log study session when arena finishes
  useEffect(() => {
    if (isFinished && cards.length > 0 && !sessionLogged) {
      setSessionLogged(true);
      const successCount = sessionResults.filter(r => r.success).length;
      const totalXp = successCount * 120 + (cards.length - successCount) * 40;
      actions.completeStudySession({
        type: 'Revision',
        duration: Math.max(1, Math.round((Date.now() - new Date(startTimeRef.current).getTime()) / 60000)),
        questionsSolved: cards.length,
        correct: successCount,
        accuracy: cards.length > 0 ? Math.round((successCount / cards.length) * 100) : 0,
        xpEarned: totalXp,
      }).catch(() => {});

      // Submit batched SM-2 updates
      sessionFeedbackRef.current.forEach((scores, chapterId) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const confidence = avg >= 4 ? 'High' : avg >= 2 ? 'Medium' : 'Low';
        actions.completeRevision(chapterId, confidence);
      });
    }
  }, [isFinished, sessionLogged, cards.length, sessionResults, actions]);

  const handleDecision = (quality: number, label: string) => {
    if (!currentCard || isTransitioning) return;
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setIsTransitioning(true);

    const map = sessionFeedbackRef.current;
    if (!map.has(currentCard.chapterId)) {
      map.set(currentCard.chapterId, []);
    }
    map.get(currentCard.chapterId)!.push(quality);
    
    const isSuccess = quality >= 3;
    if (isSuccess) {
      audioEngine.playMechanicalKey('clack').catch(() => {});
      audioEngine.playTacticalBeep(1318).catch(() => {});
    } else {
      audioEngine.playMechanicalKey('heavy').catch(() => {});
    }

    setSessionResults(prev => [...prev, { id: currentCard.id, success: isSuccess, quality }]);
    
    const xp = quality * 25;
    showFeedback(isSuccess ? 'correct' : 'wrong', xp);

    // Transition to next card smoothly
    setTimeout(() => {
      setIsRevealed(false);
      setTimeLeft(15);
      setIsTransitioning(false);
      setCurrentIndex(prev => prev + 1);
    }, 350);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setTimeLeft(15);
    setIsRevealed(false);
    setIsTransitioning(false);
    setSessionResults([]);
    setSessionLogged(false);
    startTimeRef.current = new Date().toISOString();
    sessionFeedbackRef.current.clear();
  };

  // ── EMPTY STATE (No cards available) ──
  if (cards.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 text-left font-sans select-none pb-16">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onExit}
            className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Back to Command Center"
            aria-label="Back to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="bg-zinc-900/90 border border-white/15 p-12 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-emerald-950/60 rounded-full flex items-center justify-center border border-emerald-500/40 text-emerald-400 shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-white">No Formulas Due for Recall</h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto font-sans leading-relaxed">
              All active formulas in your syllabus are currently within safe memory retention bounds, or you have not yet started any chapters.
            </p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onExit}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            Return to Command Center
          </motion.button>
        </div>
      </div>
    );
  }

  // ── FINISHED SUMMARY DASHBOARD ──
  if (isFinished) {
    const successCount = sessionResults.filter(r => r.success).length;
    const totalXp = successCount * 120 + (cards.length - successCount) * 40;
    const accuracy = cards.length > 0 ? Math.round((successCount / cards.length) * 100) : 0;
    const rating = accuracy >= 85 ? 'S' : accuracy >= 70 ? 'A' : accuracy >= 50 ? 'B' : 'C';
    const ratingColor = rating === 'S' ? 'text-amber-400' : rating === 'A' ? 'text-emerald-400' : rating === 'B' ? 'text-indigo-400' : 'text-zinc-400';

    return (
      <div className="max-w-4xl mx-auto space-y-6 text-left font-sans select-none pb-16">
        
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onExit}
            className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Back to Command Center"
            aria-label="Back to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>

          <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">
            Timed Recall Protocol Concluded
          </span>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springs.fluid}
          className="bg-zinc-900/90 border border-white/15 p-8 md:p-12 rounded-3xl text-center space-y-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 bg-indigo-600/20 rounded-full filter blur-3xl pointer-events-none" />

          <div className="w-20 h-20 mx-auto bg-indigo-950/60 rounded-full flex items-center justify-center border border-indigo-500/40 shadow-xl shadow-indigo-600/30">
            <Trophy className="w-10 h-10 text-indigo-400" />
          </div>

          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
              Active Recall Arena Conquered
            </h2>
            <p className="text-xs text-zinc-300 font-mono max-w-lg mx-auto leading-relaxed">
              Tested {cards.length} concept flashcards under timed pressure. SM-2 memory intervals have been re-calibrated.
            </p>
          </div>
          
          {/* Performance Tier Rating */}
          <div className="py-2">
            <span className={`text-7xl font-display font-black ${ratingColor} drop-shadow-[0_0_30px_rgba(245,158,11,0.35)]`}>
              {rating}
            </span>
            <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest mt-1 font-bold">
              Mastery Tier Rating
            </div>
          </div>

          {/* Core Metrics */}
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto font-mono text-xs">
            <div className="bg-zinc-950/60 border border-emerald-500/30 p-4 rounded-2xl text-center shadow-md">
              <div className="text-2xl font-display font-bold text-emerald-400">{successCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mt-1">Recalled</div>
            </div>
            <div className="bg-zinc-950/60 border border-red-500/30 p-4 rounded-2xl text-center shadow-md">
              <div className="text-2xl font-display font-bold text-red-400">{cards.length - successCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mt-1">Needs Work</div>
            </div>
            <div className="bg-zinc-950/60 border border-indigo-500/30 p-4 rounded-2xl text-center shadow-md">
              <div className="text-2xl font-display font-bold text-indigo-300">{accuracy}%</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mt-1">Accuracy</div>
            </div>
          </div>

          <div className="py-3.5 px-6 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 max-w-md mx-auto flex items-center justify-center gap-3">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="font-mono font-bold text-sm tracking-wider text-indigo-200">
              +{totalXp} XP EARNED FOR MEMORY EXPANSION
            </span>
          </div>

          {/* Breakdown Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto pt-2">
            {sessionResults.map((r, i) => (
              <div 
                key={i}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border transition-all ${
                  r.success 
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-sm' 
                    : 'bg-red-950/60 border-red-500/50 text-red-300'
                }`}
                title={r.success ? 'Recalled' : 'Forgot'}
              >
                {r.success ? '✓' : '✗'}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <motion.button 
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleRestart}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/15 text-zinc-200 hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Arena</span>
            </motion.button>

            <motion.button 
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={onExit}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/30 cursor-pointer"
            >
              Return to Command Center
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  const timePercentage = (timeLeft / 15) * 100;
  const isCritical = timeLeft <= 5;

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left font-sans select-none pb-16">
      
      {/* ── FLOATING FEEDBACK FLASH ── */}
      <AnimatePresence>
        {feedbackFlash && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={springs.snappy}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider shadow-2xl flex items-center gap-3 backdrop-blur-xl ${
              feedbackFlash === 'correct'
                ? 'bg-emerald-600/90 text-white border border-emerald-400/50 shadow-emerald-500/30'
                : 'bg-red-600/90 text-white border border-red-400/50 shadow-red-500/30'
            }`}
          >
            {feedbackFlash === 'correct' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Correct! Memory Pathway Strengthened</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Needs Review — Interval Reset</span>
              </>
            )}
            {xpToast !== null && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-[10px]">+{xpToast} XP</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Stage Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onExit}
            className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Exit Arena"
            aria-label="Exit Arena"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>

          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-wider">
              <span className="px-2.5 py-0.5 rounded-lg border bg-red-950/60 border-red-500/40 text-red-300 flex items-center gap-1">
                <Flame className="w-3 h-3 text-red-400 animate-pulse" />
                <span>Timed Recall Arena</span>
              </span>
              <span className="text-zinc-400">• Card {currentIndex + 1} of {cards.length}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-black text-white tracking-tight">
              Active Recall Sprint
            </h1>
          </div>
        </div>

        {/* Live Timer Meter */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`p-2.5 px-4 rounded-2xl border flex items-center gap-2.5 shadow-md ${
            isCritical 
              ? 'bg-red-950/60 border-red-500/50 text-red-400 animate-pulse' 
              : 'bg-zinc-950/60 border-white/10 text-zinc-300'
          }`}>
            <Clock className={`w-4 h-4 ${isCritical ? 'text-red-400' : 'text-indigo-400'}`} />
            <span>Time Remaining: <strong className="text-white text-sm">{timeLeft}s</strong></span>
          </div>
        </div>
      </div>

      {/* Countdown Progress Bar */}
      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
        <motion.div
          animate={{ width: `${timePercentage}%` }}
          transition={{ duration: 0.3, ease: 'linear' }}
          className={`h-full rounded-full transition-colors ${
            isCritical ? 'bg-red-500' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-indigo-500'
          }`}
        />
      </div>

      {/* Main Focus Prompt Card */}
      {currentCard && (
        <motion.div
          key={currentCard.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={springs.fluid}
          className={`p-6 md:p-10 rounded-3xl border text-left flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden transition-all ${
            isCritical
              ? 'bg-red-950/20 border-red-500/40 shadow-red-950/20'
              : 'bg-zinc-900/90 border-white/15'
          }`}
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-600/10 rounded-full filter blur-3xl pointer-events-none" />

          {/* Card Meta */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-wider">
              <span className={`px-2.5 py-0.5 rounded-lg border ${
                currentCard.subject === 'physics' ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40' :
                currentCard.subject === 'chemistry' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' :
                'bg-amber-950/60 text-amber-300 border-amber-500/40'
              }`}>
                {currentCard.subject}
              </span>
              <span className="text-zinc-300">{currentCard.chapterName}</span>
            </div>

            <span className="text-[10px] font-mono text-zinc-500 font-bold">
              Press [SPACE] to {isRevealed ? 'Hide' : 'Reveal'}
            </span>
          </div>

          {/* Concept Prompt Body */}
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase text-indigo-400 font-bold tracking-wider block">
                Target Concept / Formula:
              </span>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                {renderMathText(currentCard.title)}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-1 shadow-inner">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider block">
                Concept Prompt:
              </span>
              <p className="text-sm text-zinc-200 leading-relaxed font-sans font-medium">
                "{renderMathText(currentCard.concept)}"
              </p>
            </div>

            {/* Revealed Answer Box */}
            <AnimatePresence>
              {isRevealed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springs.fluid}
                  className="space-y-2 overflow-hidden pt-2"
                >
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider block">
                    Formula Expression & Mechanism:
                  </span>
                  <div className="p-5 rounded-2xl bg-zinc-950/90 border border-emerald-500/30 text-emerald-200 font-mono text-sm leading-relaxed overflow-x-auto shadow-inner">
                    {renderMathText(currentCard.formula || 'No formula string mapped')}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Decision Pads / Recall Rating Buttons */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">
                {isTransitioning ? 'Advancing to next concept...' : 'Rate your active recall quality:'}
              </span>
              {!isRevealed && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setIsRevealed(true)}
                  disabled={isTransitioning}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Reveal Formula Answer [Space]</span>
                </motion.button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => handleDecision(0, 'Blackout')}
                disabled={isTransitioning}
                className={`p-3.5 rounded-2xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/40 flex flex-col items-center justify-center gap-1 transition-all shadow-sm ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Skull className="w-3.5 h-3.5" />
                  <span>[1] Blackout</span>
                </div>
                <span className="text-[10px] text-red-400/80">Reset to 1d</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => handleDecision(2, 'Hard')}
                disabled={isTransitioning}
                className={`p-3.5 rounded-2xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 flex flex-col items-center justify-center gap-1 transition-all shadow-sm ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Timer className="w-3.5 h-3.5" />
                  <span>[2] Hard</span>
                </div>
                <span className="text-[10px] text-amber-400/80">Interval: 3d</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => handleDecision(4, 'Good')}
                disabled={isTransitioning}
                className={`p-3.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 flex flex-col items-center justify-center gap-1 transition-all shadow-sm ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>[3] Good</span>
                </div>
                <span className="text-[10px] text-emerald-400/80">Interval: 7d</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => handleDecision(5, 'Perfect')}
                disabled={isTransitioning}
                className={`p-3.5 rounded-2xl bg-indigo-950/50 hover:bg-indigo-900/70 text-indigo-200 border border-indigo-500/40 flex flex-col items-center justify-center gap-1 transition-all shadow-sm ${
                  isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>[4] Perfect</span>
                </div>
                <span className="text-[10px] text-indigo-300/80">Interval: 14d</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
