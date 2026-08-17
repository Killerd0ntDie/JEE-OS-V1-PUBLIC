import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { RevisionCardItem } from '@jee-os/engines';
import { ArrowLeft, Clock, Zap, Sparkles, Trophy, Flame, RotateCcw, Check, X, Eye, EyeOff } from 'lucide-react';
import { BlockMath, InlineMath } from 'react-katex';
import { audioEngine } from '@/utils/audioEngine';

interface FormulaSpeedDrillStageProps {
  cards: RevisionCardItem[];
  onBackToHub: () => void;
}

export const FormulaSpeedDrillStage: React.FC<FormulaSpeedDrillStageProps> = ({
  cards,
  onBackToHub
}) => {
  const actions = useStudyBrainStore(state => state.actions);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isFlipped, setIsFlipped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [scoreCount, setScoreCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionLogged, setSessionLogged] = useState(false);

  const sessionFeedbackRef = useRef<Map<string, number[]>>(new Map());
  const lastInputTimeRef = useRef<number>(0);

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

  const toggleFlip = () => {
    setIsFlipped(prev => {
      audioEngine.playCardFlip();
      return !prev;
    });
  };

  // 30-Second Countdown Timer Effect
  useEffect(() => {
    if (isFinished || cards.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFinished(true);
          audioEngine.playSuccess();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, cards.length]);

  // Submit batch feedback on finish
  useEffect(() => {
    if (isFinished && !sessionLogged && reviewedCount > 0 && cards.length > 0) {
      setSessionLogged(true);
      sessionFeedbackRef.current.forEach((scores, chapterId) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const confidence = avg >= 4 ? 'High' : avg >= 2 ? 'Medium' : 'Low';
        actions.completeRevision(chapterId, confidence);
      });

      const totalXp = scoreCount * 25 + maxStreak * 5;
      actions.completeStudySession({
        type: 'Revision',
        duration: 1,
        questionsSolved: reviewedCount,
        correct: scoreCount,
        accuracy: reviewedCount > 0 ? Math.round((scoreCount / reviewedCount) * 100) : 0,
        xpEarned: totalXp
      }).catch(() => {});
    }
  }, [isFinished, sessionLogged, reviewedCount, scoreCount, maxStreak, cards.length, actions]);

  // Keyboard Shortcuts (Space = Reveal, A = Forgot/Skip, D = Recalled)
  useEffect(() => {
    if (isFinished || cards.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleFlip();
      } else if (e.code === 'KeyA' || e.key === 'a' || e.key === 'A') {
        handleRecall('Low');
      } else if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D') {
        handleRecall('High');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, isFlipped, currentIndex, reviewedCount, cards.length]);

  const currentCard = cards.length > 0 ? cards[currentIndex % cards.length] : null;

  const handleRecall = (difficulty: 'High' | 'Low') => {
    if (!currentCard || isFinished) return;

    // Fast debounce (120ms) for snappy rapid-fire responses
    const now = Date.now();
    if (now - lastInputTimeRef.current < 120) return;
    lastInputTimeRef.current = now;

    // Accumulate score
    const map = sessionFeedbackRef.current;
    if (!map.has(currentCard.chapterId)) {
      map.set(currentCard.chapterId, []);
    }
    const numericScore = difficulty === 'High' ? 5 : 0;
    map.get(currentCard.chapterId)!.push(numericScore);

    if (difficulty === 'High') {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > maxStreak) setMaxStreak(nextStreak);
      setScoreCount(prev => prev + 1);

      if (nextStreak > 0 && nextStreak % 5 === 0) {
        audioEngine.playStreakChime(nextStreak);
      } else {
        audioEngine.playClick();
      }
    } else {
      setStreak(0);
      audioEngine.playHover();
    }

    setIsFlipped(false);
    setReviewedCount(prev => prev + 1);
    setCurrentIndex(prev => prev + 1);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setTimeLeft(30);
    setIsFlipped(false);
    setStreak(0);
    setMaxStreak(0);
    setScoreCount(0);
    setIsFinished(false);
    setReviewedCount(0);
    setSessionLogged(false);
    sessionFeedbackRef.current.clear();
    audioEngine.playStartChime();
  };

  const totalXP = scoreCount * 25 + maxStreak * 5;

  // ── EMPTY STATE GUARD ──
  if (cards.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 text-left font-sans select-none pb-16">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={onBackToHub}
            className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Back to Command Center"
            aria-label="Back to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-zinc-900/90 border border-white/15 p-12 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-amber-950/60 rounded-full flex items-center justify-center border border-amber-500/40 text-amber-400 shadow-lg">
            <Zap className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-white">No Formulas Available for Speed Drill</h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto font-sans leading-relaxed">
              Start studying chapters in your syllabus to populate formula flashcards for instantaneous 30-second sprint drills.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToHub}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            Return to Command Center
          </button>
        </div>
      </div>
    );
  }

  // ── FINISHED SUMMARY SCREEN ──
  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 text-left font-sans select-none pb-16">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={onBackToHub}
            className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Back to Command Center"
            aria-label="Back to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
            30s Sprint Completed
          </span>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-zinc-900/90 border border-white/15 p-8 md:p-12 rounded-3xl text-center space-y-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 bg-amber-600/20 rounded-full filter blur-3xl pointer-events-none" />

          <div className="w-20 h-20 mx-auto bg-amber-950/60 rounded-full flex items-center justify-center border border-amber-500/40 shadow-xl shadow-amber-600/30">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>

          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
              Speed Sprint Completed
            </h2>
            <p className="text-xs text-zinc-300 font-mono max-w-lg mx-auto leading-relaxed">
              Processed {reviewedCount} flashcards in 30 seconds. Instant recognition pathways calibrated.
            </p>
          </div>

          {/* Metric Highlights */}
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto font-mono text-xs">
            <div className="bg-zinc-950/60 border border-emerald-500/30 p-4 rounded-2xl text-center shadow-md">
              <div className="text-2xl font-display font-bold text-emerald-400">{scoreCount}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mt-1">Recalled</div>
            </div>
            <div className="bg-zinc-950/60 border border-amber-500/30 p-4 rounded-2xl text-center shadow-md">
              <div className="text-2xl font-display font-bold text-amber-400 flex items-center justify-center gap-1">
                <span>{maxStreak}</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mt-1">Max Streak</div>
            </div>
            <div className="bg-zinc-950/60 border border-indigo-500/30 p-4 rounded-2xl text-center shadow-md">
              <div className="text-2xl font-display font-bold text-indigo-300">+{totalXP}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mt-1">XP Earned</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button 
              type="button"
              onClick={handleRestart}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/15 text-zinc-200 hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Sprint Again (30s)</span>
            </button>

            <button 
              type="button"
              onClick={onBackToHub}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/30 cursor-pointer"
            >
              Return to Command Center
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const isCritical = timeLeft <= 7;
  const timePercentage = (timeLeft / 30) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left font-sans select-none pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHub}
            className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Exit Sprint"
            aria-label="Exit Sprint"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-wider">
              <span className="px-2.5 py-0.5 rounded-lg border bg-amber-950/60 border-amber-500/40 text-amber-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>30-Second Rapid Sprint</span>
              </span>
              <span className="text-zinc-400">• Cards Cleared: {scoreCount}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-black text-white tracking-tight">
              Formula Speed Drill
            </h1>
          </div>
        </div>

        {/* Live Metrics: Streak & Timer */}
        <div className="flex items-center gap-2.5 font-mono text-xs">
          {streak > 0 && (
            <div className="p-2 px-3 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 shadow-sm animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{streak}x Streak</span>
            </div>
          )}

          <div className={`p-2 px-4 rounded-2xl border flex items-center gap-2 shadow-md ${
            isCritical ? 'bg-red-950/60 border-red-500/50 text-red-400 animate-pulse' : 'bg-zinc-950/60 border-white/10 text-zinc-300'
          }`}>
            <Clock className={`w-4 h-4 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
            <span>Time Left: <strong className="text-white text-sm">{timeLeft}s</strong></span>
          </div>
        </div>
      </div>

      {/* Speed Countdown Meter */}
      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
        <div
          style={{ width: `${timePercentage}%` }}
          className={`h-full rounded-full transition-all duration-300 ease-linear ${
            isCritical ? 'bg-red-500' : 'bg-amber-500'
          }`}
        />
      </div>

      {/* Main Sprint Formula Card */}
      {currentCard && (
        <motion.div
          key={currentCard.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className={`p-6 md:p-10 rounded-3xl border text-left flex flex-col justify-between space-y-6 shadow-2xl relative transition-all min-h-[380px] ${
            isFlipped 
              ? 'bg-indigo-950/30 border-indigo-500/40 shadow-indigo-950/20' 
              : isCritical 
              ? 'bg-zinc-900/80 border-amber-500/40 shadow-amber-950/20' 
              : 'bg-zinc-900/90 border-white/15'
          }`}
        >
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

            <button
              type="button"
              onClick={toggleFlip}
              className="text-[10px] font-mono text-zinc-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
            >
              {isFlipped ? <EyeOff className="w-3 h-3 text-indigo-400" /> : <Eye className="w-3 h-3 text-amber-400" />}
              <span>[SPACE] {isFlipped ? 'Hide Answer' : 'Reveal Answer'}</span>
            </button>
          </div>

          {/* Prompt / Answer Body */}
          <div 
            onClick={toggleFlip}
            className="space-y-4 py-2 cursor-pointer group flex-1"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider block">
                Target Theorem / Concept:
              </span>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                {renderMathText(currentCard.title)}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-1 shadow-inner">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider block">
                Concept Clue:
              </span>
              <p className="text-sm text-zinc-200 leading-relaxed font-sans font-medium">
                "{renderMathText(currentCard.concept)}"
              </p>
            </div>

            {/* Answer Display */}
            {isFlipped ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                className="space-y-1.5 pt-1"
              >
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider block">
                  Formula Expression & Mechanics:
                </span>
                <div className="p-4 rounded-2xl bg-zinc-950/95 border border-emerald-500/40 text-emerald-200 font-mono text-sm leading-relaxed overflow-x-auto shadow-inner">
                  {renderMathText(currentCard.formula || 'No formula mapped')}
                </div>
              </motion.div>
            ) : (
              <div className="text-center text-[11px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors pt-2 flex items-center justify-center gap-1.5">
                <Eye className="w-3 h-3 text-amber-400" />
                <span>Click or press [SPACEBAR] to reveal formula answer</span>
              </div>
            )}
          </div>

          {/* Rapid Binary Decision Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 font-mono text-xs">
            <button
              type="button"
              onClick={() => handleRecall('Low')}
              className="p-4 rounded-2xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/40 flex items-center justify-center gap-2 cursor-pointer font-bold transition-all active:scale-95 shadow-sm"
            >
              <X className="w-4 h-4" />
              <span>[A] Forgot / Skip</span>
            </button>

            <button
              type="button"
              onClick={() => handleRecall('High')}
              className="p-4 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 flex items-center justify-center gap-2 cursor-pointer font-bold transition-all active:scale-95 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>[D] Recalled (+25 XP)</span>
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
