import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { RevisionCardItem } from '@jee-os/engines';
import { Mistake } from '@/types';
import { MathRenderer } from '@/components/MathRenderer';
import { springs } from '@/constants/motion';
import { 
  ArrowLeft, Sparkles, CheckCircle2, 
  Flame, Zap, ArrowRight, Eye, 
  Check, X, Clock, 
} from 'lucide-react';
import { audioEngine } from '@/utils/audioEngine';
import { storageAdapter } from '@/services/StorageAdapter';

interface DailyDoseSessionStageProps {
  cards: RevisionCardItem[];
  mistakes: Mistake[];
  onExit: () => void;
}

export const DailyDoseSessionStage: React.FC<DailyDoseSessionStageProps> = ({
  cards,
  mistakes,
  onExit
}) => {
  const actions = useStudyBrainStore(state => state.actions);

  // Active Phase: 'cards' | 'mistakes' | 'speed_drill' | 'celebration'
  const [phase, setPhase] = useState<'cards' | 'mistakes' | 'speed_drill' | 'celebration'>('cards');

  // Phase 1 State: Flashcards (target up to 10)
  const sessionCards = cards.slice(0, 10);
  const [cardIndex, setCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [gradedCardsCount, setGradedCardsCount] = useState(0);

  // Phase 2 State: Mistakes (target up to 3 unresolved)
  const unresolvedMistakes = mistakes.filter(m => m.revisionStatus !== 'Mastered').slice(0, 3);
  const [mistakeIndex, setMistakeIndex] = useState(0);
  const [isMistakeRevealed, setIsMistakeRevealed] = useState(false);
  const [resolvedMistakesCount, setResolvedMistakesCount] = useState(0);
  const [scratchpadMap, setScratchpadMap] = useState<Record<string, string>>({});

  // Phase 3 State: 30s Speed Drill Blitz
  const speedCards = cards.slice(0, 8);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedTimer, setSpeedTimer] = useState(30);
  const [speedScore, setSpeedScore] = useState(0);
  const [isSpeedActive, setIsSpeedActive] = useState(false);
  const [speedRevealed, setSpeedRevealed] = useState(false);

  // Phase 4 State: Celebration
  const [xpAwarded, setXpAwarded] = useState(false);

  // Audio helper
  const playTap = () => audioEngine.playTap();
  const playSuccess = () => audioEngine.playSuccess();

  // ── PHASE 1: FLASHCARD ACTIONS ──
  const handleGradeCard = (quality: number) => {
    playTap();
    const currentCard = sessionCards[cardIndex];
    if (currentCard) {
      actions.gradeFlashcard(currentCard.id, currentCard.chapterId, quality);
    }
    const newCount = gradedCardsCount + 1;
    setGradedCardsCount(newCount);

    if (cardIndex + 1 < sessionCards.length) {
      setIsCardFlipped(false);
      setCardIndex(prev => prev + 1);
    } else {
      // Transition to Phase 2
      if (unresolvedMistakes.length > 0) {
        setPhase('mistakes');
      } else {
        setPhase('speed_drill');
      }
    }
  };

  // ── PHASE 2: MISTAKE RE-SOLVE ACTIONS ──
  const handleResolveMistake = (mastered: boolean) => {
    playTap();
    const currentMistake = unresolvedMistakes[mistakeIndex];
    if (currentMistake && mastered) {
      actions.updateMistakeStatus(currentMistake.id, 'Mastered');
      playSuccess();
    }
    const newCount = resolvedMistakesCount + (mastered ? 1 : 0);
    setResolvedMistakesCount(newCount);

    if (mistakeIndex + 1 < unresolvedMistakes.length) {
      setIsMistakeRevealed(false);
      setMistakeIndex(prev => prev + 1);
    } else {
      // Transition to Phase 3
      setPhase('speed_drill');
    }
  };

  // ── PHASE 3: SPEED DRILL TIMER ──
  useEffect(() => {
    if (phase === 'speed_drill' && isSpeedActive && speedTimer > 0) {
      const timer = setInterval(() => {
        setSpeedTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (phase === 'speed_drill' && isSpeedActive && speedTimer === 0) {
      // Finish speed drill
      setIsSpeedActive(false);
      handleFinishDailyDose();
    }
  }, [phase, isSpeedActive, speedTimer]);

  const handleSpeedAnswer = (correct: boolean) => {
    playTap();
    if (correct) {
      setSpeedScore(prev => prev + 1);
      playSuccess();
    }
    if (speedIndex + 1 < speedCards.length) {
      setSpeedRevealed(false);
      setSpeedIndex(prev => prev + 1);
    } else {
      handleFinishDailyDose();
    }
  };

  // ── PHASE 4: COMPLETE SESSION ──
  const handleFinishDailyDose = async () => {
    setPhase('celebration');
    if (!xpAwarded) {
      setXpAwarded(true);
      const todayKey = new Date().toISOString().split('T')[0];
      storageAdapter.setItem(`jeeos_daily_dose_${todayKey}`, {
        cardsCompleted: Math.max(gradedCardsCount, 10),
        mistakesCompleted: Math.max(resolvedMistakesCount, unresolvedMistakes.length),
        speedDrillDone: true
      });

      try {
        await actions.completeStudySession({
          type: 'Revision',
          duration: 12,
          questionsSolved: sessionCards.length + unresolvedMistakes.length + speedScore,
          correct: sessionCards.length + resolvedMistakesCount + speedScore,
          accuracy: 95,
          xpEarned: 150
        });
      } catch {}
    }
  };

  const currentCard = sessionCards[cardIndex];
  const currentMistake = unresolvedMistakes[mistakeIndex];
  const currentSpeedCard = speedCards[speedIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left font-sans select-none pb-20">
      
      {/* 1. TOP HEADER & PROGRESS STEPPER */}
      <div className="surface-2 rounded-3xl p-5 md:p-6 border border-zinc-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onExit}
              className="p-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
              title="Exit to Hub"
              aria-label="Back to Command Center"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold text-indigo-400">
                <Sparkles className="w-3 h-3" />
                <span>NTA Calibrated Daily Dose</span>
              </div>
              <h1 className="text-xl font-display font-bold text-white tracking-tight">
                Daily Spaced Routine
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5 shadow-sm">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>+150 XP</span>
            </span>
          </div>
        </div>

        {/* 3-Step Pill Bar */}
        <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
          <div className={`p-2.5 rounded-2xl border text-center transition-all ${
            phase === 'cards' 
              ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300 font-bold shadow-md' 
              : gradedCardsCount >= sessionCards.length 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500'
          }`}>
            <span className="text-[9px] uppercase tracking-wider block">Phase 1</span>
            <span className="text-xs">10 Flashcards</span>
          </div>

          <div className={`p-2.5 rounded-2xl border text-center transition-all ${
            phase === 'mistakes' 
              ? 'bg-red-950/60 border-red-500/50 text-red-300 font-bold shadow-md' 
              : resolvedMistakesCount > 0 || unresolvedMistakes.length === 0
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500'
          }`}>
            <span className="text-[9px] uppercase tracking-wider block">Phase 2</span>
            <span className="text-xs">3 Mistake Re-Solves</span>
          </div>

          <div className={`p-2.5 rounded-2xl border text-center transition-all ${
            phase === 'speed_drill' 
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 font-bold shadow-md' 
              : phase === 'celebration'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500'
          }`}>
            <span className="text-[9px] uppercase tracking-wider block">Phase 3</span>
            <span className="text-xs">30s Speed Blitz</span>
          </div>
        </div>
      </div>

      {/* 2. PHASE CONTENT RENDERER */}
      <AnimatePresence mode="wait">
        
        {/* ══════════════════════════════════════════════════════════════════
            PHASE 1: 10 FORMULA FLASHCARDS
           ══════════════════════════════════════════════════════════════════ */}
        {phase === 'cards' && currentCard && (
          <motion.div
            key={`card-${currentCard.id}-${cardIndex}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={springs.snappy}
            className="surface-2 rounded-3xl p-6 md:p-8 border border-zinc-800 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold uppercase">
                  {currentCard.subject}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {currentCard.chapterName}
                </span>
              </div>
              <span className="font-mono text-xs text-zinc-400">
                Card {cardIndex + 1} of {sessionCards.length}
              </span>
            </div>

            {/* Card Body */}
            <div className="min-h-[160px] flex flex-col justify-center items-center text-center space-y-4 py-4">
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-bold">
                Formula & Core Relationship
              </span>
              <h3 className="text-xl md:text-2xl font-display font-bold text-white max-w-xl">
                {currentCard.title}
              </h3>
              <p className="text-xs text-zinc-400 max-w-lg font-sans">
                {currentCard.concept}
              </p>

              {/* Revealable Solution / Formula */}
              <AnimatePresence>
                {isCardFlipped ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full p-5 rounded-2xl bg-zinc-950/90 border border-indigo-500/30 shadow-inner mt-4"
                  >
                    <div className="text-white text-base md:text-lg font-mono py-2">
                      <MathRenderer text={currentCard.latex || currentCard.formula} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playTap();
                      setIsCardFlipped(true);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer mt-4"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal Formula</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* SM-2 Feedback Buttons (Only visible when flipped) */}
            {isCardFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-white/5 font-mono text-xs"
              >
                <button
                  onClick={() => handleGradeCard(1)}
                  className="py-3 px-2 rounded-2xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-300 font-bold flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <span className="text-[10px] text-red-400">Reset</span>
                  <span>Again (1)</span>
                </button>
                <button
                  onClick={() => handleGradeCard(2)}
                  className="py-3 px-2 rounded-2xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-amber-300 font-bold flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <span className="text-[10px] text-amber-400">Difficult</span>
                  <span>Hard (2)</span>
                </button>
                <button
                  onClick={() => handleGradeCard(4)}
                  className="py-3 px-2 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/40 text-indigo-300 font-bold flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <span className="text-[10px] text-indigo-400">Retained</span>
                  <span>Good (4)</span>
                </button>
                <button
                  onClick={() => handleGradeCard(5)}
                  className="py-3 px-2 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 font-bold flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <span className="text-[10px] text-emerald-400">Instant</span>
                  <span>Easy (5)</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PHASE 2: 3 MISTAKE RE-SOLVES
           ══════════════════════════════════════════════════════════════════ */}
        {phase === 'mistakes' && currentMistake && (
          <motion.div
            key={`mistake-${currentMistake.id}-${mistakeIndex}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={springs.snappy}
            className="surface-2 rounded-3xl p-6 md:p-8 border border-red-500/30 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 font-mono text-[10px] font-bold uppercase">
                  {currentMistake.subject || 'Mistake'}
                </span>
                <span className="text-xs font-mono text-zinc-300">
                  {currentMistake.chapter}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 font-mono text-[10px]">
                  {currentMistake.errorType || 'Concept Error'}
                </span>
              </div>
              <span className="font-mono text-xs text-zinc-400">
                Mistake {mistakeIndex + 1} of {unresolvedMistakes.length}
              </span>
            </div>

            {/* Mistake Statement */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest font-bold block">
                Failed Concept / Trap Question
              </span>
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-200 leading-relaxed font-sans">
                <MathRenderer text={currentMistake.questionText || currentMistake.description || currentMistake.note} />
              </div>
            </div>

            {/* Quick Scratchpad / Work Area */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">
                Your Re-Solve Reasoning or Calculation:
              </label>
              <textarea
                value={scratchpadMap[currentMistake?.id || `mistake_${mistakeIndex}`] || ''}
                onChange={(e) => {
                  const mKey = currentMistake?.id || `mistake_${mistakeIndex}`;
                  setScratchpadMap(prev => ({ ...prev, [mKey]: e.target.value }));
                }}
                placeholder="Write the correct formula, sign convention, or key derivation step..."
                rows={3}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/50 font-mono leading-relaxed"
              />
            </div>

            {/* Reveal Solution */}
            <AnimatePresence>
              {isMistakeRevealed ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200 space-y-2"
                >
                  <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 block">
                    Verified Correct Solution & Antidote:
                  </span>
                  <div className="text-zinc-200">
                    <MathRenderer text={currentMistake.correction || currentMistake.explanation || 'Review chapter fundamentals and recalculate sign factors.'} />
                  </div>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsMistakeRevealed(true)}
                  className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Reveal Key Insight & Verified Correction</span>
                </button>
              )}
            </AnimatePresence>

            {/* Action Bar */}
            {isMistakeRevealed && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleResolveMistake(false)}
                  className="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold transition-colors cursor-pointer"
                >
                  Keep in Review Queue
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveMistake(true)}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mastered! Advance Leitner Box</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PHASE 3: 30-SECOND SPEED DRILL BLITZ
           ══════════════════════════════════════════════════════════════════ */}
        {phase === 'speed_drill' && (
          <motion.div
            key="phase-speed-drill"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={springs.snappy}
            className="surface-2 rounded-3xl p-6 md:p-8 border border-amber-500/30 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Speed Blitz</span>
                </span>
                <span className="text-xs font-mono text-zinc-300">
                  Rapid Formula Recognition
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-zinc-400">Score: <strong className="text-amber-400">{speedScore}</strong></span>
                <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
                  speedTimer <= 10 ? 'bg-red-950/60 border-red-500/50 text-red-300 animate-pulse' : 'bg-zinc-900 border-zinc-700 text-amber-300'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>{speedTimer}s</span>
                </span>
              </div>
            </div>

            {!isSpeedActive ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
                  <Zap className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-display font-bold text-white">
                  30-Second Formula Speed Blitz
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Test instantaneous formula recognition under time pressure to forge indestructible neural reflexes for JEE Advanced.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSpeedActive(true)}
                  className="px-6 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-xl shadow-amber-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Start 30s Blitz Now</span>
                </button>
              </div>
            ) : currentSpeedCard ? (
              <div className="space-y-6">
                <div className="min-h-[140px] flex flex-col justify-center items-center text-center p-6 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-2">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                    {currentSpeedCard.chapterName} • {currentSpeedCard.subject}
                  </span>
                  <h3 className="text-lg md:text-xl font-display font-bold text-white">
                    {currentSpeedCard.title}
                  </h3>
                  {speedRevealed && (
                    <div className="pt-2 text-indigo-300 font-mono text-base">
                      <MathRenderer text={currentSpeedCard.latex || currentSpeedCard.formula} />
                    </div>
                  )}
                </div>

                {!speedRevealed ? (
                  <button
                    type="button"
                    onClick={() => setSpeedRevealed(true)}
                    className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs font-bold uppercase cursor-pointer"
                  >
                    Reveal Formula
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => handleSpeedAnswer(false)}
                      className="py-3 rounded-2xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-300 font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Missed It</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSpeedAnswer(true)}
                      className="py-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Recalled Instantaneously</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PHASE 4: CELEBRATION & COMPLETION DEBRIEF
           ══════════════════════════════════════════════════════════════════ */}
        {phase === 'celebration' && (
          <motion.div
            key="phase-celebration"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springs.snappy}
            className="surface-2 rounded-3xl p-8 md:p-10 border border-emerald-500/30 text-center shadow-2xl space-y-6 relative overflow-hidden"
          >
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <span className="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] uppercase font-bold tracking-widest inline-block">
                Daily Dose Completed
              </span>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                Memory Decay Neutralized
              </h2>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                You executed today's NTA-calibrated spaced retention dose. All reviewed concepts have been scheduled forward on your SuperMemo-2 timeline.
              </p>
            </div>

            {/* Scorecard Strip */}
            <div className="grid grid-cols-3 gap-3 font-mono text-xs max-w-lg mx-auto py-2">
              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Cards</span>
                <span className="text-base font-bold text-indigo-400 font-display">
                  {gradedCardsCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Mistakes</span>
                <span className="text-base font-bold text-red-400 font-display">
                  {resolvedMistakesCount}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-300 uppercase font-bold block">XP Bonus</span>
                <span className="text-base font-bold text-emerald-400 font-display">
                  +150 XP
                </span>
              </div>
            </div>

            {/* Exit Action */}
            <div className="pt-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onExit}
                className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-xl shadow-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Return to Revision Hub</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};
