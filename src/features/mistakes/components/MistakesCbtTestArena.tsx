import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalVariants } from '@/constants/motion';
import { 
  Clock, X, Check, Award, AlertTriangle, CheckCircle2, 
  XCircle, ChevronRight, ChevronLeft, RotateCcw, Trophy, ArrowRight
} from 'lucide-react';
import { Mistake, SubjectId } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { RichTextRenderer } from '@/components/MathRenderer';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEscapeKey } from '@/hooks/useEscapeKey';

export interface MistakesCbtTestArenaProps {
  isOpen: boolean;
  onClose: () => void;
  mistakes: Mistake[];
  onUpdateStatus: (id: string, status: Mistake['revisionStatus']) => void;
  getSubjectColor: (sub: SubjectId) => { text: string; bg: string; border: string; badge: string };
}

type QuestionAttemptStatus = 'NOT_VISITED' | 'NOT_ANSWERED' | 'ANSWERED' | 'MARKED_FOR_REVIEW';

export const MistakesCbtTestArena: React.FC<MistakesCbtTestArenaProps> = ({
  isOpen,
  onClose,
  mistakes,
  onUpdateStatus,
  getSubjectColor,
}) => {
  const actions = useStudyBrainStore(state => state.actions);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionAttemptStatus>>({});
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<Record<string, number>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [selfGrades, setSelfGrades] = useState<Record<string, boolean>>({});

  const totalDurationSeconds = useMemo(() => Math.max(300, mistakes.length * 180), [mistakes.length]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen && mistakes.length > 0) {
      setCurrentIdx(0);
      setUserAnswers({});
      setIsSubmitted(false);
      setIsConfirmSubmitOpen(false);
      setSelfGrades({});
      setTimeSpentSeconds({});
      setSecondsRemaining(totalDurationSeconds);

      // Initialize statuses
      const initStatuses: Record<string, QuestionAttemptStatus> = {};
      mistakes.forEach((m, idx) => {
        initStatuses[m.id] = idx === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED';
      });
      setQuestionStatuses(initStatuses);

      timerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsSubmitted(true);
            return 0;
          }
          return prev - 1;
        });

        // Track active question time
        setTimeSpentSeconds(prev => {
          const currentId = mistakes[currentIdx]?.id;
          if (!currentId) return prev;
          return {
            ...prev,
            [currentId]: (prev[currentId] || 0) + 1
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, mistakes, totalDurationSeconds, currentIdx]);

  if (!isOpen || mistakes.length === 0) return null;

  const currentMistake = mistakes[currentIdx];
  const currentAnswer = userAnswers[currentMistake?.id] || '';

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleSelectQuestion = (idx: number) => {
    if (!currentMistake || !mistakes[idx]) return;
    const prevAnswer = (userAnswers[currentMistake.id] || '').trim();
    setQuestionStatuses(prev => {
      const currentStatus = prev[currentMistake.id];
      let updatedStatus: QuestionAttemptStatus = currentStatus;
      if (currentStatus === 'MARKED_FOR_REVIEW') {
        updatedStatus = 'MARKED_FOR_REVIEW';
      } else if (prevAnswer.length > 0) {
        updatedStatus = 'ANSWERED';
      } else {
        updatedStatus = 'NOT_ANSWERED';
      }

      const targetId = mistakes[idx].id;
      const targetAnswer = (userAnswers[targetId] || '').trim();
      const targetStatus = prev[targetId];
      let newTargetStatus: QuestionAttemptStatus = targetStatus;
      if (targetStatus === 'NOT_VISITED') {
        newTargetStatus = targetAnswer.length > 0 ? 'ANSWERED' : 'NOT_ANSWERED';
      }

      return {
        ...prev,
        [currentMistake.id]: updatedStatus,
        [targetId]: newTargetStatus
      };
    });
    setCurrentIdx(idx);
  };

  const handleSaveAndNext = () => {
    if (currentAnswer.trim()) {
      setQuestionStatuses(prev => ({ ...prev, [currentMistake.id]: 'ANSWERED' }));
    } else {
      setQuestionStatuses(prev => ({ ...prev, [currentMistake.id]: 'NOT_ANSWERED' }));
    }

    if (currentIdx < mistakes.length - 1) {
      handleSelectQuestion(currentIdx + 1);
    }
  };

  const handleMarkForReview = () => {
    setQuestionStatuses(prev => ({ ...prev, [currentMistake.id]: 'MARKED_FOR_REVIEW' }));
    if (currentIdx < mistakes.length - 1) {
      handleSelectQuestion(currentIdx + 1);
    }
  };

  const handleClearResponse = () => {
    setUserAnswers(prev => ({ ...prev, [currentMistake.id]: '' }));
    setQuestionStatuses(prev => ({ ...prev, [currentMistake.id]: 'NOT_ANSWERED' }));
  };

  const handleSubmitTest = async () => {
    setIsConfirmSubmitOpen(false);
    setIsSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleToggleSelfGrade = async (id: string, isCorrect: boolean) => {
    setSelfGrades(prev => ({ ...prev, [id]: isCorrect }));
    if (actions.updateMistakeTestResult) {
      await actions.updateMistakeTestResult(id, isCorrect);
    } else {
      onUpdateStatus(id, isCorrect ? 'Solved Again' : 'New');
    }
  };

  // Status badge styling helper
  const getCbtBadgeColor = (status: QuestionAttemptStatus) => {
    switch (status) {
      case 'ANSWERED': return 'bg-emerald-600 text-white border-emerald-500';
      case 'MARKED_FOR_REVIEW': return 'bg-purple-600 text-white border-purple-400';
      case 'NOT_ANSWERED': return 'bg-rose-600 text-white border-rose-500';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-750';
    }
  };

  const answeredCount = Object.values(questionStatuses).filter(s => s === 'ANSWERED').length;
  const markedCount = Object.values(questionStatuses).filter(s => s === 'MARKED_FOR_REVIEW').length;
  const notAnsweredCount = Object.values(questionStatuses).filter(s => s === 'NOT_ANSWERED').length;
  const notVisitedCount = Object.values(questionStatuses).filter(s => s === 'NOT_VISITED').length;

  // Post test calculation
  const totalSolvedInTest = Object.values(selfGrades).filter(Boolean).length;
  const testAccuracy = answeredCount > 0 ? Math.round((totalSolvedInTest / mistakes.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 text-zinc-100 flex flex-col overflow-hidden select-none font-sans">
      
      {/* 1. CBT TOP NAVBAR */}
      <div className="h-14 border-b border-zinc-850 bg-zinc-950 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-950/70 border border-red-800/60 flex items-center justify-center text-red-400">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-white tracking-tight">
              Mistakes CBT Retest Arena
            </h2>
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Strict Timed Exam Mode • Zero Hints
            </p>
          </div>
        </div>

        {/* Center Countdown Timer */}
        {!isSubmitted && (
          <div className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 border shadow-inner ${
            secondsRemaining < 180 
              ? 'bg-red-950/80 border-red-500/60 text-red-300 animate-pulse' 
              : 'bg-zinc-900 border-zinc-800 text-indigo-300'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>Time Remaining: <strong className="text-white text-sm">{formatTimer(secondsRemaining)}</strong></span>
          </div>
        )}

        {/* Right Submit / Exit */}
        <div className="flex items-center gap-2">
          {!isSubmitted ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsConfirmSubmitOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-600/25 transition-colors cursor-pointer"
            >
              Submit Retest
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* 2. MAIN STAGE */}
      {isSubmitted ? (
        /* POST-TEST AUTOPSY & STEP-BY-STEP SOLUTION VERIFICATION */
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 max-w-5xl mx-auto w-full custom-scrollbar text-left">
          
          {/* Summary Banner */}
          <div className="p-6 rounded-3xl bg-[#121318] border border-zinc-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg">
                <Trophy className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xl font-display font-bold text-white">Retest Examination Completed</h3>
                <p className="text-xs font-mono text-zinc-400">
                  Compare your submitted responses against step-by-step analytical derivations below to confirm resolution.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 font-mono text-xs shrink-0 flex-wrap">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center min-w-[80px]">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold">Tested</span>
                <span className="text-base font-bold text-white">{mistakes.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center min-w-[80px]">
                <span className="text-[10px] text-emerald-400 block uppercase font-bold">Resolved</span>
                <span className="text-base font-bold text-emerald-300">{totalSolvedInTest}</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-center min-w-[90px]">
                <span className="text-[10px] text-indigo-300 block uppercase font-bold">Avg Speed</span>
                <span className="text-base font-bold text-indigo-200">
                  {(() => {
                    const avg = mistakes.length > 0 
                      ? Math.round(Object.values(timeSpentSeconds).reduce((a, b) => a + b, 0) / mistakes.length) 
                      : 0;
                    return `${Math.floor(avg / 60)}m ${avg % 60}s`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Question-by-Question Solution Autopsy */}
          <div className="space-y-5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              Step-by-Step Solution Autopsy & Verification
            </h4>

            {mistakes.map((m, idx) => {
              const myAnswer = userAnswers[m.id] || 'No answer submitted';
              const isMarkedSolved = selfGrades[m.id] ?? (m.revisionStatus === 'Solved Again');
              const qTime = timeSpentSeconds[m.id] || 0;
              const qMins = Math.floor(qTime / 60);
              const qSecs = qTime % 60;
              const timeBadgeStyle = qTime < 120
                ? 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40'
                : qTime < 180
                ? 'text-amber-400 border-amber-800/60 bg-amber-950/40'
                : 'text-rose-400 border-rose-800/60 bg-rose-950/40';

              return (
                <div 
                  key={m.id}
                  className="p-6 rounded-3xl bg-[#121318] border border-zinc-800/90 space-y-5 shadow-xl text-left"
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-white">
                        Q{idx + 1}
                      </span>
                      <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                        {m.subject} • {m.chapter}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${timeBadgeStyle}`}>
                        <Clock className="w-3 h-3" />
                        <span>{qMins}m {qSecs}s</span>
                      </span>
                    </div>

                    {/* Self-Grade Verification Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSelfGrade(m.id, true)}
                        className={`px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isMarkedSolved
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Solved Correctly (+60 XP)</span>
                      </button>
                      <button
                        onClick={() => handleToggleSelfGrade(m.id, false)}
                        className={`px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          !isMarkedSolved
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        <span>Still Shaky</span>
                      </button>
                    </div>
                  </div>

                  {/* Question */}
                  <div className="text-sm text-zinc-200 leading-relaxed font-sans">
                    <RichTextRenderer content={m.questionText} />
                  </div>

                  {/* Your Retest Answer */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold mb-1">Your Retest Answer / Derivation:</span>
                    <span className="text-white">{myAnswer}</span>
                  </div>

                  {/* Step-by-Step Formal Explanation */}
                  <div className="p-5 rounded-2xl bg-[#0d0e12] border border-indigo-900/40 space-y-3">
                    <span className="text-xs font-mono uppercase font-bold text-indigo-400 block tracking-wider">
                      Step-by-Step Analytical Derivation & Formal Solution:
                    </span>
                    <div className="text-xs text-zinc-300 leading-relaxed space-y-2">
                      <RichTextRenderer content={m.correctMethod || m.correctSolution || 'No formal solution recorded.'} />
                    </div>
                    {m.correctSolution && m.correctMethod && m.correctMethod !== m.correctSolution && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-xs font-mono text-emerald-300">
                        <strong>Key Result: </strong>{m.correctSolution}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pb-8">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Return to Precision Vault
            </button>
          </div>
        </div>
      ) : (
        /* LIVE STRICT CBT TEST STAGE */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left / Center: Question & Answer Workspace */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0e12] p-5 sm:p-7 space-y-6 text-left">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-white">
                  Question {currentIdx + 1}
                </span>
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                  {currentMistake.subject} • {currentMistake.chapter}
                </span>
                <span className="text-zinc-600 font-mono">•</span>
                <span className="text-xs font-mono text-zinc-400 truncate">
                  {currentMistake.topic || 'Practice Problem'}
                </span>
              </div>

              <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
                Marking: +4 / -1
              </span>
            </div>

            {/* Question Statement in KaTeX (STRICT TEST - ZERO HINTS OR ANSWERS) */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-base text-zinc-100 leading-relaxed font-sans">
              <RichTextRenderer content={currentMistake.questionText} />
            </div>

            {/* Answer Input Workspace */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <label className="text-xs font-mono font-bold text-zinc-300 block">
                Enter Your Final Calculation / Option Choice:
              </label>
              <textarea
                rows={2}
                value={currentAnswer}
                onChange={e => setUserAnswers(prev => ({ ...prev, [currentMistake.id]: e.target.value }))}
                placeholder="Type your final numerical value, option letter (A/B/C/D), or step derivation..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* CBT Navigation Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearResponse}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Clear Response
                </button>
                <button
                  onClick={handleMarkForReview}
                  className="px-3.5 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/70 border border-purple-800/60 text-purple-300 font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Mark for Review & Next
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => currentIdx > 0 && handleSelectQuestion(currentIdx - 1)}
                  disabled={currentIdx === 0}
                  className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 disabled:opacity-30 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={handleSaveAndNext}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
                >
                  Save & Next
                </motion.button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: CBT Question Palette & Legend */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-850 bg-[#070709] p-5 flex flex-col justify-between shrink-0 text-left">
            <div className="space-y-4">
              
              {/* Question Palette Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Question Palette
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {mistakes.map((m, idx) => {
                    const status = questionStatuses[m.id] || 'NOT_VISITED';
                    const isSelected = idx === currentIdx;

                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelectQuestion(idx)}
                        className={`h-9 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer select-none flex items-center justify-center ${
                          getCbtBadgeColor(status)
                        } ${isSelected ? 'ring-2 ring-white scale-105' : ''}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CBT Legend */}
              <div className="space-y-2 pt-3 border-t border-zinc-850/80 font-mono text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-md bg-emerald-600 border border-emerald-500 flex items-center justify-center text-white text-[9px] font-bold">✓</span>
                  <span className="text-zinc-300">Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-md bg-rose-600 border border-rose-500 flex items-center justify-center text-white text-[9px] font-bold">✕</span>
                  <span className="text-zinc-300">Not Answered ({notAnsweredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-md bg-purple-600 border border-purple-400 flex items-center justify-center text-white text-[9px] font-bold">?</span>
                  <span className="text-zinc-300">Marked for Review ({markedCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 text-[9px] font-bold">-</span>
                  <span className="text-zinc-400">Not Visited ({notVisitedCount})</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-zinc-850">
              <button
                onClick={() => setIsConfirmSubmitOpen(true)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-colors cursor-pointer"
              >
                Submit Retest Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION CONFIRMATION MODAL */}
      {isConfirmSubmitOpen && (
        <div className="fixed inset-0 z-[60] bg-black/10 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="w-full max-w-md border border-zinc-800 rounded-2xl p-6 space-y-4 text-left">
            <h3 className="text-base font-display font-bold text-white">Submit Retest Exam?</h3>
            <p className="text-xs font-mono text-zinc-400 leading-relaxed">
              You have answered <strong className="text-emerald-400">{answeredCount}</strong> of {mistakes.length} questions. Are you ready to finish and review the step-by-step solution derivations?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono text-xs font-bold cursor-pointer"
              >
                Continue Test
              </button>
              <button
                onClick={handleSubmitTest}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Confirm Submit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
