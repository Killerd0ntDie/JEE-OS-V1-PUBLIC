import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Brain, Flame, Skull, CheckCircle2, XCircle, ArrowRight, Timer, Sparkles, Trophy, Zap, TrendingUp } from 'lucide-react';
import { RevisionCardItem } from '@/engines/revision';
import { useStudyBrain } from '@/context/StudyBrainContext';
import { BlockMath, InlineMath } from 'react-katex';

interface ActiveRecallArenaProps {
  cards: RevisionCardItem[];
  onExit: () => void;
}

export function ActiveRecallArena({ cards, onExit }: ActiveRecallArenaProps) {
  const { actions } = useStudyBrain();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ id: string; success: boolean }[]>([]);
  const [feedbackFlash, setFeedbackFlash] = useState<'correct' | 'wrong' | null>(null);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [sessionLogged, setSessionLogged] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  const currentCard = cards[currentIndex];
  const isFinished = currentIndex >= cards.length || cards.length === 0;

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

  // Timer logic
  useEffect(() => {
    if (isFinished || isRevealed) {
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
  }, [currentIndex, isFinished, isRevealed]);

  // Log study session when arena finishes
  useEffect(() => {
    if (isFinished && cards.length > 0 && !sessionLogged) {
      setSessionLogged(true);
      const successCount = sessionResults.filter(r => r.success).length;
      const totalXp = successCount * 150 + (cards.length - successCount) * 50;
      actions.completeStudySession({
        type: 'Revision',
        duration: Math.round((Date.now() - new Date(startTimeRef.current).getTime()) / 60000),
        questionsSolved: cards.length,
        correct: successCount,
        accuracy: cards.length > 0 ? Math.round((successCount / cards.length) * 100) : 0,
        xpEarned: totalXp,
      }).catch(() => {});
    }
  }, [isFinished, sessionLogged]);

  const showFeedback = useCallback((type: 'correct' | 'wrong', xp: number) => {
    setFeedbackFlash(type);
    setXpToast(xp);
    setTimeout(() => {
      setFeedbackFlash(null);
      setXpToast(null);
    }, 1200);
  }, []);

  const handleTimeUp = () => {
    setIsRevealed(true);
    if (currentCard) {
      actions.completeRevision(currentCard.chapterId, 'Low');
      setSessionResults(prev => [...prev, { id: currentCard.id, success: false }]);
      showFeedback('wrong', 50);
    }
  };

  const handleSuccess = () => {
    if (!currentCard || isRevealed) return;
    setIsRevealed(true);
    actions.completeRevision(currentCard.chapterId, 'High');
    setSessionResults(prev => [...prev, { id: currentCard.id, success: true }]);
    showFeedback('correct', 150);
  };

  const handleFailure = () => {
    if (!currentCard || isRevealed) return;
    setIsRevealed(true);
    actions.completeRevision(currentCard.chapterId, 'Low');
    setSessionResults(prev => [...prev, { id: currentCard.id, success: false }]);
    showFeedback('wrong', 50);
  };

  const nextCard = () => {
    setIsRevealed(false);
    setTimeLeft(15);
    setCurrentIndex(prev => prev + 1);
  };

  // ── FINISHED SUMMARY SCREEN ──
  if (isFinished) {
    const successCount = sessionResults.filter(r => r.success).length;
    const totalXp = successCount * 150 + (cards.length - successCount) * 50;
    const accuracy = cards.length > 0 ? Math.round((successCount / cards.length) * 100) : 0;
    const rating = accuracy >= 80 ? 'S' : accuracy >= 60 ? 'A' : accuracy >= 40 ? 'B' : 'C';
    const ratingColor = rating === 'S' ? 'text-yellow-400' : rating === 'A' ? 'text-emerald-400' : rating === 'B' ? 'text-blue-400' : 'text-zinc-400';

    return (
      <Card className="p-8 border-indigo-500/30 bg-indigo-950/20 text-center max-w-2xl mx-auto space-y-6 shadow-[0_0_50px_rgba(99,102,241,0.1)] animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 mx-auto bg-indigo-900/50 rounded-full flex items-center justify-center border border-indigo-500/50">
          <Trophy className="w-10 h-10 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-3xl font-display font-bold text-white mb-2">Arena Conquered!</h2>
          <p className="text-zinc-400">You faced {cards.length} decaying concepts and survived.</p>
        </div>
        
        {/* Performance Rating */}
        <div className="py-2">
          <span className={`text-6xl font-display font-black ${ratingColor}`}>{rating}</span>
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mt-1">Performance Rating</div>
        </div>

        <div className="flex justify-center gap-8 py-4">
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-emerald-400">{successCount}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Recalled</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-red-400">{cards.length - successCount}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-indigo-400">{accuracy}%</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Accuracy</div>
          </div>
        </div>

        <div className="py-3 px-6 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center gap-3">
          <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
          <span className="font-mono font-bold text-lg tracking-wider text-indigo-300">
            +{totalXp} XP EARNED
          </span>
        </div>

        {/* Per-card result breakdown */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-2">
          {sessionResults.map((r, i) => (
            <div 
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                r.success 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                  : 'bg-red-950/40 border-red-500/40 text-red-400'
              }`}
              title={r.success ? 'Recalled' : 'Forgot'}
            >
              {r.success ? '✓' : '✗'}
            </div>
          ))}
        </div>

        <button 
          onClick={onExit}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          Return to Hub
        </button>
      </Card>
    );
  }

  const timePercentage = (timeLeft / 15) * 100;
  const isCritical = timeLeft <= 5;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 relative">
      
      {/* ── FLOATING FEEDBACK FLASH ── */}
      {feedbackFlash && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl font-mono text-sm font-bold uppercase tracking-wider shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          feedbackFlash === 'correct'
            ? 'bg-emerald-600 text-white border border-emerald-400/50 shadow-emerald-500/30'
            : 'bg-red-600 text-white border border-red-400/50 shadow-red-500/30'
        }`}>
          {feedbackFlash === 'correct' ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Correct! Retention boosted</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5" />
              <span>Needs Review — Queued for retry</span>
            </>
          )}
          {xpToast !== null && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">+{xpToast} XP</span>
          )}
        </div>
      )}

      {/* Header Stats */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-red-950/50 border border-red-900/50 text-red-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Arena Active
          </div>
          <span className="text-xs font-mono text-zinc-500 font-bold uppercase tracking-wider">
            Card {currentIndex + 1} of {cards.length}
          </span>
        </div>

        {/* Running XP Tally */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-indigo-950/50 border border-indigo-900/40 text-indigo-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            {sessionResults.filter(r => r.success).length * 150 + sessionResults.filter(r => !r.success).length * 50} XP
          </div>
          <button onClick={onExit} className="text-[10px] font-mono text-zinc-500 hover:text-white uppercase tracking-wider transition-colors cursor-pointer">
            Abort
          </button>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex gap-1 px-2">
        {cards.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < currentIndex
                ? sessionResults[i]?.success
                  ? 'bg-emerald-500'
                  : 'bg-red-500'
                : i === currentIndex
                ? 'bg-indigo-500 animate-pulse'
                : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {/* Main Card */}
      <Card className={`relative overflow-hidden transition-all duration-500 ${
        isRevealed 
          ? sessionResults[currentIndex]?.success 
            ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)] bg-emerald-950/10'
            : 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)] bg-red-950/10'
          : isCritical 
            ? 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] bg-red-950/10' 
            : 'border-indigo-500/30 bg-zinc-950'
      }`}>
        
        {/* Timer Bar */}
        {!isRevealed && (
          <div className="absolute top-0 inset-x-0 h-1.5 bg-zinc-900">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${isCritical ? 'bg-red-500' : 'bg-indigo-500'}`}
              style={{ width: `${timePercentage}%` }}
            />
          </div>
        )}

        <div className="p-8 md:p-12 text-center min-h-[300px] flex flex-col items-center justify-center relative">
          
          {/* Big Timer Background */}
          {!isRevealed && (
            <div className={`absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none transition-transform duration-1000 ${isCritical ? 'scale-110' : 'scale-100'}`}>
              <span className="text-[20rem] font-display font-bold leading-none">{timeLeft}</span>
            </div>
          )}

          <div className="relative z-10 w-full">
            <div className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-widest mb-4">
              {currentCard.subject} • {currentCard.chapterName}
            </div>
            
            <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-8">
              {renderMathText(currentCard.title)}
            </h3>

            {isRevealed ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Feedback Banner */}
                <div className={`mb-6 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-mono text-sm font-bold uppercase tracking-wider ${
                  sessionResults[currentIndex]?.success
                    ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400'
                    : 'bg-red-950/40 border border-red-500/30 text-red-400'
                }`}>
                  {sessionResults[currentIndex]?.success ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Excellent! Retention Reinforced — +150 XP</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>Needs Review — Interval Reset — +50 XP</span>
                    </>
                  )}
                </div>

                <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 text-left mb-8 max-w-2xl mx-auto space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-semibold">
                      Concept
                    </span>
                    <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                      {renderMathText(currentCard.concept)}
                    </p>
                  </div>
                  
                  {currentCard.formula && currentCard.formula !== "Conceptual" && (
                    <div className="space-y-1.5 pt-4 border-t border-zinc-800">
                      <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                        Formula Expression
                      </span>
                      <div className="font-mono text-sm text-indigo-200 bg-zinc-950 p-4 rounded-xl border border-indigo-900/30 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {renderMathText(currentCard.formula)}
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={nextCard}
                  className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 mx-auto cursor-pointer"
                >
                  {currentIndex < cards.length - 1 ? 'Next Concept' : 'Finish Arena'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={handleFailure}
                  className="w-full sm:w-48 px-6 py-4 rounded-xl border border-red-900/50 bg-red-950/30 text-red-400 font-mono text-sm font-bold uppercase tracking-wider hover:bg-red-900/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Skull className="w-4 h-4" /> Forgot It
                </button>
                <button 
                  onClick={handleSuccess}
                  className="w-full sm:w-48 px-6 py-4 rounded-xl border border-emerald-900/50 bg-emerald-950/30 text-emerald-400 font-mono text-sm font-bold uppercase tracking-wider hover:bg-emerald-900/50 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Recalled
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
