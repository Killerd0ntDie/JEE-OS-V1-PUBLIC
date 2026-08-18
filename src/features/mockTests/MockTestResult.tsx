import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, Clock, Award, X, AlertTriangle, ArrowRight, CheckCircle2, 
  XCircle, MinusCircle, ChevronLeft, ChevronRight, BookOpen, 
  BarChart3, Brain, Sparkles, Check, RotateCcw, Calendar
} from 'lucide-react';
import { MockTest, MockTestAttempt, MockQuestion, MockTestAttemptQuestion } from '../../types/mockTest';
import { SubjectId } from '../../types/index';
import { RichTextRenderer } from '@/components/MathRenderer';
import { getSubjectTheme } from '@/constants/subjectTheme';
import { springs } from '@/constants/motion';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

import { evaluateMockAttempt, formatCorrectAnswerKey } from '@/utils/mockScoring';

import { TestForensicsSection } from './components/TestForensicsSection';

interface MockTestResultProps {
  test: MockTest;
  attempt: MockTestAttempt;
  onClose: () => void;
  onNavigate?: (pageId: import('../../types').PageId) => void;
}

export function MockTestResult({ test, attempt, onClose, onNavigate }: MockTestResultProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const chapters = useStudyBrainStore(state => state.chapters) || [];
  const [activeTab, setActiveTab] = useState<'questions' | 'forensics'>('questions');
  const [tabDirection, setTabDirection] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState<'ALL' | SubjectId>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED'>('ALL');
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  const [pinnedQuestions, setPinnedQuestions] = useState<Record<string, boolean>>({});

  const handleTabChange = (newTab: 'questions' | 'forensics') => {
    const tabOrder: Record<'questions' | 'forensics', number> = { questions: 0, forensics: 1 };
    const newIdx = tabOrder[newTab];
    const oldIdx = tabOrder[activeTab];
    if (newIdx !== oldIdx) {
      setTabDirection(newIdx > oldIdx ? 1 : -1);
      setActiveTab(newTab);
    }
  };

  const handleQuestionChange = (newIdx: number) => {
    if (newIdx !== activeQuestionIdx) {
      setActiveQuestionIdx(newIdx);
    }
  };

  // Compute test analysis telemetry using unified scoring engine
  const analysis = useMemo(() => {
    return evaluateMockAttempt(test, attempt, chapters);
  }, [test, attempt, chapters]);

  // Filtered question set for horizontal stepper
  const filteredQuestions = useMemo(() => {
    return analysis.detailedQuestions.filter(item => {
      const matchSubj = selectedSubject === 'ALL' || item.sectionSubject === selectedSubject;
      const matchStatus = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'CORRECT' ? item.isCorrect :
        statusFilter === 'INCORRECT' ? item.isIncorrect :
        item.isUnattempted;
      return matchSubj && matchStatus;
    });
  }, [analysis.detailedQuestions, selectedSubject, statusFilter]);

  const currentQItem = filteredQuestions[Math.min(activeQuestionIdx, Math.max(0, filteredQuestions.length - 1))];

  // Enhanced Keyboard Navigation in Questions Studio
  React.useEffect(() => {
    if (activeTab !== 'questions') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'h') {
        e.preventDefault();
        handleQuestionChange(Math.max(0, activeQuestionIdx - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        handleQuestionChange(Math.min(filteredQuestions.length - 1, activeQuestionIdx + 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleQuestionChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        handleQuestionChange(filteredQuestions.length - 1);
      } else if (e.key >= '1' && e.key <= '9') {
        const targetIdx = parseInt(e.key, 10) - 1;
        if (targetIdx < filteredQuestions.length) {
          e.preventDefault();
          handleQuestionChange(targetIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeQuestionIdx, filteredQuestions.length]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const accuracyRate = analysis.correct + analysis.incorrect > 0 
    ? Math.round((analysis.correct / (analysis.correct + analysis.incorrect)) * 100) 
    : 0;

  return (
    <div className="w-full space-y-4 text-left font-sans select-none pb-8">
      
      {/* 1. SINGLE UNIFIED HEADER & NAVIGATION CONTROL BAR */}
      <div className="bg-[#121318] border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl text-left">
        
        {/* Top Row: Title, Score Badges, and Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-display font-bold text-white tracking-tight">
                  {test.name}
                </h1>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2.5 py-0.5 rounded-md">
                  {analysis.totalScore} / {test.totalMarks} Marks
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-md">
                  {accuracyRate}% Accuracy
                </span>
              </div>
            </div>
          </div>

          {/* Mode Glider & Actions */}
          <div className="flex items-center gap-2 flex-wrap font-mono text-xs self-start lg:self-auto">
            {/* Segmented Mode Glider with Spring Indicator */}
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl relative select-none">
              <button
                onClick={() => handleTabChange('questions')}
                className={`relative px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1.5 ${
                  activeTab === 'questions' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {activeTab === 'questions' && (
                  <motion.div
                    layoutId="activeAnalysisTabGlider"
                    className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                    transition={springs.fluid}
                  />
                )}
                <BookOpen className="w-3.5 h-3.5" />
                <span>Questions Studio</span>
              </button>

              <button
                onClick={() => handleTabChange('forensics')}
                className={`relative px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1.5 ${
                  activeTab === 'forensics' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {activeTab === 'forensics' && (
                  <motion.div
                    layoutId="activeAnalysisTabGlider"
                    className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                    transition={springs.fluid}
                  />
                )}
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Exam Forensics & Score Autopsy</span>
              </button>
            </div>

            <button
              onClick={() => {
                const prompt = `I just completed the Mock Test "${test.name}". I scored ${analysis.totalScore} out of ${test.totalMarks}. I attempted ${analysis.correct + analysis.incorrect} questions, got ${analysis.correct} correct and ${analysis.incorrect} incorrect. Can you analyze my performance and suggest a revision strategy?`;
                sessionStorage.setItem('pendingCoachPrompt', prompt);
                onNavigate?.('ai-coach');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30 font-bold transition-colors cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Mentor</span>
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              title="Close Analysis"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2 (Integrated within same header bar): Status & Subject Filters + Question Stepper */}
        {activeTab === 'questions' && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-0.5">
            
            {/* Left: Gliding Filter Group */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter Glider */}
              <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-850 p-1 rounded-xl font-mono text-xs relative select-none">
                {(['ALL', 'CORRECT', 'INCORRECT', 'UNATTEMPTED'] as const).map(status => {
                  const isActive = statusFilter === status;
                  return (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); handleQuestionChange(0); }}
                      className={`relative px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1.5 text-[11px] ${
                        isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeAnalysisStatusFilterGlider"
                          className={`absolute inset-0 rounded-lg -z-10 shadow-sm ${
                            status === 'CORRECT' ? 'bg-emerald-600' :
                            status === 'INCORRECT' ? 'bg-rose-600' :
                            status === 'UNATTEMPTED' ? 'bg-zinc-700' : 'bg-indigo-600'
                          }`}
                          transition={springs.fluid}
                        />
                      )}
                      {status === 'CORRECT' && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
                      {status === 'INCORRECT' && <XCircle className="w-3 h-3 text-rose-300" />}
                      {status === 'UNATTEMPTED' && <MinusCircle className="w-3 h-3 text-zinc-400" />}
                      <span>
                        {status === 'ALL' ? `All (${analysis.detailedQuestions.length})` :
                         status === 'CORRECT' ? `Correct (${analysis.correct})` :
                         status === 'INCORRECT' ? `Wrong (${analysis.incorrect})` :
                         `Skipped (${analysis.unattempted})`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Subject Filter Glider */}
              <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-850 p-1 rounded-lg font-mono text-[10px] relative select-none">
                {(['ALL', 'physics', 'chemistry', 'maths'] as const).map(sub => {
                  const isActive = selectedSubject === sub;
                  return (
                    <button
                      key={sub}
                      onClick={() => { setSelectedSubject(sub); handleQuestionChange(0); }}
                      className={`relative px-2.5 py-1 rounded-md font-bold uppercase transition-colors cursor-pointer select-none z-10 ${
                        isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeAnalysisSubjectFilterGlider"
                          className="absolute inset-0 bg-indigo-600 rounded-md -z-10 shadow-sm"
                          transition={springs.fluid}
                        />
                      )}
                      <span>{sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Question Number Stepper Strip & Keyboard Shortcuts */}
            <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto custom-scrollbar py-0.5">
              <button
                onClick={() => handleQuestionChange(Math.max(0, activeQuestionIdx - 1))}
                disabled={activeQuestionIdx === 0}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 disabled:opacity-30 border border-zinc-800 text-zinc-300 cursor-pointer transition-colors flex items-center gap-1"
                title="Previous Question (← or H)"
              >
                <ChevronLeft className="w-4 h-4" />
                <kbd className="hidden sm:inline-block text-[9px] font-mono text-zinc-500 bg-zinc-950 px-1 py-0.2 rounded border border-zinc-800">←</kbd>
              </button>

              <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-850 p-1 rounded-xl relative select-none">
                {filteredQuestions.map((item, idx) => {
                  const isSelected = idx === activeQuestionIdx;
                  return (
                    <button
                      key={item.question.id}
                      onClick={() => handleQuestionChange(idx)}
                      className={`relative px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer select-none shrink-0 flex items-center gap-1 z-10 ${
                        isSelected
                          ? 'text-white'
                          : item.isCorrect
                          ? 'text-emerald-400 hover:text-emerald-200'
                          : item.isIncorrect
                          ? 'text-rose-400 hover:text-rose-200'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title={`Jump to Q${item.globalIndex}${idx < 9 ? ` (Key ${idx + 1})` : ''}`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="activeQuestionPaletteGlider"
                          className="absolute inset-0 bg-indigo-600 rounded-lg -z-10 shadow-md shadow-indigo-600/30"
                          transition={springs.fluid}
                        />
                      )}
                      <span>Q{item.globalIndex}</span>
                      {item.isCorrect ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      ) : item.isIncorrect ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handleQuestionChange(Math.min(filteredQuestions.length - 1, activeQuestionIdx + 1))}
                disabled={activeQuestionIdx === filteredQuestions.length - 1}
                className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white cursor-pointer transition-colors flex items-center gap-1"
                title="Next Question (→ or L)"
              >
                <kbd className="hidden sm:inline-block text-[9px] font-mono text-indigo-200 bg-indigo-800/80 px-1 py-0.2 rounded border border-indigo-700">→</kbd>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>

      {/* 2. TAB CONTENT: UNIFIED MASTER QUESTION STAGE VS SCORE AUTOPSY */}
      {activeTab === 'questions' ? (
        <div>
          {!currentQItem ? (
            <div className="p-12 text-center bg-[#121318] border border-zinc-800 rounded-3xl space-y-3">
              <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-display font-bold text-white">No Questions in Filter</h3>
              <p className="text-xs font-mono text-zinc-400">Try changing the status or subject filter.</p>
            </div>
          ) : (
            <div className="bg-[#121318] border border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl text-left">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80 items-start">
                
                {/* LEFT HALF: QUESTION STATEMENT & OPTIONS (6 cols) */}
                <div className="lg:col-span-6 lg:pr-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Header line with Question index & badge */}
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                          Question {currentQItem.globalIndex}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">
                          {currentQItem.sectionSubject} • {currentQItem.question.chapter}
                        </span>
                      </div>

                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        currentQItem.isCorrect
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : currentQItem.isIncorrect
                          ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}>
                        {currentQItem.isCorrect ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> :
                         currentQItem.isIncorrect ? <XCircle className="w-3 h-3 text-rose-400" /> :
                         <MinusCircle className="w-3 h-3 text-zinc-400" />}
                        <span>{currentQItem.statusLabel} ({currentQItem.isCorrect ? `+${currentQItem.question.marks.correct}` : currentQItem.isIncorrect ? `${currentQItem.question.marks.incorrect}` : '0'})</span>
                      </span>
                    </div>

                    {/* Question Content */}
                    <div className="text-sm text-zinc-200 leading-relaxed font-sans overflow-x-auto custom-scrollbar">
                      <RichTextRenderer content={currentQItem.question.content} />
                    </div>

                    {/* Options Breakdown for MCQ with Resilient Math Layout */}
                    {currentQItem.question.type === 'MCQ' && currentQItem.question.options && (
                      <div className="space-y-2">
                        {currentQItem.question.options.map((opt, optIdx) => {
                          const optKey = String.fromCharCode(65 + optIdx); // 'A', 'B', 'C', 'D'
                          const isSelected = currentQItem.attempt.selectedAnswer === optKey || currentQItem.attempt.selectedAnswer === String(optIdx);
                          
                          let normalizedCorrect = currentQItem.question.correctAnswer.trim();
                          if (['0', '1', '2', '3'].includes(normalizedCorrect)) {
                            normalizedCorrect = String.fromCharCode(65 + parseInt(normalizedCorrect, 10));
                          }
                          const isCorrect = normalizedCorrect.toUpperCase() === optKey || currentQItem.question.correctAnswer === String(optIdx);

                          let cardStyle = 'bg-zinc-900/60 border-zinc-800 text-zinc-300';
                          if (isCorrect) {
                            cardStyle = 'bg-emerald-950/40 border-emerald-700/80 text-emerald-200 ring-1 ring-emerald-500/40';
                          } else if (isSelected && !isCorrect) {
                            cardStyle = 'bg-rose-950/40 border-rose-700/80 text-rose-200 ring-1 ring-rose-500/40';
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 transition-all ${cardStyle}`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1 overflow-x-auto custom-scrollbar">
                                <span className={`w-5 h-5 rounded-md font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : isSelected && !isCorrect
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-zinc-800 text-zinc-300'
                                }`}>
                                  {optKey}
                                </span>

                                <div className="flex-1 text-xs font-sans leading-relaxed min-w-0 overflow-x-auto custom-scrollbar">
                                  <RichTextRenderer content={opt} />
                                </div>
                              </div>

                              {isSelected && !isCorrect && (
                                <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60 shrink-0 self-start sm:self-center">
                                  YOUR ANSWER ✕
                                </span>
                              )}
                              {isCorrect && isSelected && (
                                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 shrink-0 self-start sm:self-center">
                                  YOUR ANSWER ✓
                                </span>
                              )}
                              {isCorrect && !isSelected && (
                                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 shrink-0 self-start sm:self-center">
                                  CORRECT OPTION ✓
                                </span>
                              )}
                            </div>
                          );
                        })}
                        </div>
                      )}

                    {/* Numerical Response Comparison */}
                    {currentQItem.question.type === 'NUMERICAL' && (
                      <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono">
                        <div className="space-y-1">
                          <span className="text-zinc-500 uppercase font-bold text-[9px] block">Your Submitted Value:</span>
                          <div className={`text-sm font-bold ${currentQItem.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {currentQItem.attempt.selectedAnswer || 'Not Attempted'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-zinc-500 uppercase font-bold text-[9px] block">Official Key Value:</span>
                          <div className="text-sm font-bold text-emerald-400">
                            {currentQItem.question.correctAnswer}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Footer: Pre-populated Pin Mission with Dynamic Time */}
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs mt-3 flex-wrap gap-2">
                    {(() => {
                      const isPinned = !!pinnedQuestions[currentQItem.question.id];
                      const chapterName = currentQItem.question.chapter || 'Chapter Revision';
                      const topicName = currentQItem.question.topic || chapterName;
                      const recommendedDuration = Math.max(15, Math.min(45, Math.ceil(((currentQItem.attempt.timeSpentSeconds || 120) * 1.5) / 60 / 5) * 5));

                      return (
                        <button
                          disabled={isPinned}
                          onClick={async () => {
                            await actions.addCustomMission({
                              taskName: `Fix Mistake: ${topicName} (Q${currentQItem.globalIndex})`,
                              subject: currentQItem.sectionSubject,
                              chapter: chapterName,
                              type: 'Review Mistakes',
                              duration: recommendedDuration,
                              xp: 40
                            });
                            setPinnedQuestions(prev => ({ ...prev, [currentQItem.question.id]: true }));
                          }}
                          className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                            isPinned
                              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-bold'
                              : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {isPinned ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Pinned to Planner ({recommendedDuration}m)</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Pin to Daily Planner ({recommendedDuration}m)</span>
                            </>
                          )}
                        </button>
                      );
                    })()}

                    <span className="text-zinc-500 text-[11px] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{currentQItem.attempt.timeSpentSeconds || 0}s spent</span>
                    </span>
                  </div>
                </div>    

                {/* RIGHT HALF: STEP-BY-STEP FORMAL MATHEMATICAL DERIVATION (6 cols) */}
                <div className="lg:col-span-6 lg:pl-6 pt-4 lg:pt-0 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="border-b border-zinc-800/80 pb-2 flex items-center justify-between">
                      <span className="text-xs font-mono uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        Step-by-Step Analytical Explanation
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                        Correct: {formatCorrectAnswerKey(currentQItem.question.correctAnswer)}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed space-y-3 font-sans max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                      <RichTextRenderer content={currentQItem.question.explanation || 'No step-by-step analytical explanation recorded for this problem.'} />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      ) : (
        /* 2. TAB B: UNIFIED EXAM FORENSICS & SCORE AUTOPSY */
        <div className="space-y-6 text-left">
          
          {/* 2A. SCORE VITALS & WHAT-IF RANK SIMULATOR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* LEFT COLUMN: HERO RANK WHAT-IF CARD */}
            <div className="lg:col-span-7 bg-[#121318] border border-red-900/40 rounded-3xl p-6 relative overflow-hidden shadow-xl space-y-5">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <AlertTriangle className="w-48 h-48 text-red-500" />
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex flex-col sm:flex-row gap-6 items-start justify-between">
                  {/* Actual Score & Rank/Mastery */}
                  <div className="space-y-1.5">
                    <span className="text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider block">
                      Actual Performance
                    </span>
                    <div className="text-4xl font-display font-bold text-white">
                      {analysis.totalScore} <span className="text-lg text-zinc-600">/ {test.totalMarks}</span>
                    </div>
                    {test.totalMarks >= 150 ? (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                        <span className="text-xs text-zinc-400 font-mono">Predicted AIR:</span>
                        <span className="text-xs font-bold text-indigo-400">{analysis.actualRank.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
                        <span className="text-xs text-zinc-400 font-mono">Mastery Level:</span>
                        <span className="text-xs font-bold text-indigo-400">{Math.max(0, Math.round((analysis.totalScore / test.totalMarks) * 100))}%</span>
                      </div>
                    )}
                  </div>

                  {/* The Delta Transition */}
                  <div className="flex flex-col items-center justify-center pt-2">
                    <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-widest mb-1.5 bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-900/50">
                      {analysis.incorrect} Mistakes Penalty
                    </span>
                    <div className="text-xs font-mono text-zinc-400">
                      <span className="text-red-400 font-bold">+{analysis.whatIfScore - analysis.totalScore}</span> Avoidable Penalty
                    </div>
                  </div>

                  {/* What-If Score & Rank/Mastery */}
                  <div className="space-y-1.5 sm:text-right">
                    <span className="text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center sm:justify-end gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      What-If Zero-Penalty
                    </span>
                    <div className="text-4xl font-display font-bold text-zinc-600 opacity-60">
                      {analysis.whatIfScore} <span className="text-lg text-zinc-800">/ {test.totalMarks}</span>
                    </div>
                    {test.totalMarks >= 150 ? (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
                        <span className="text-xs text-emerald-600 font-mono">Potential AIR:</span>
                        <span className="text-xs font-bold text-emerald-400">{analysis.whatIfRank.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
                        <span className="text-xs text-emerald-600 font-mono">Potential Mastery:</span>
                        <span className="text-xs font-bold text-emerald-400">{Math.max(0, Math.round((analysis.whatIfScore / test.totalMarks) * 100))}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delta Banner */}
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs text-zinc-400">
                    Fixing these <strong className="text-white">{analysis.incorrect}</strong> errors would elevate your {test.totalMarks >= 150 ? 'rank' : 'mastery'} by:
                  </span>
                  {test.totalMarks >= 150 ? (
                    <span className="text-lg font-display font-bold text-emerald-400">
                      +{(analysis.actualRank - analysis.whatIfRank).toLocaleString()} Ranks
                    </span>
                  ) : (
                    <span className="text-lg font-display font-bold text-emerald-400">
                      +{Math.round(((analysis.whatIfScore - analysis.totalScore) / test.totalMarks) * 100)}% Mastery
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: PERFORMANCE VITALS & SUBJECT DISTRIBUTION */}
            <div className="lg:col-span-5 space-y-3.5">
              {/* Vitals Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-3.5">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block mb-0.5">Accuracy</span>
                  <div className="text-xl font-display font-bold text-emerald-400">
                    {accuracyRate}%
                  </div>
                </div>

                <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-3.5">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block mb-0.5">Profile</span>
                  <div className="text-xs font-mono font-bold text-zinc-300">
                    <span className="text-emerald-400">{analysis.correct}C</span> • <span className="text-rose-400">{analysis.incorrect}W</span> • <span className="text-zinc-500">{analysis.unattempted}S</span>
                  </div>
                </div>

                <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block mb-0.5">Time & Speed</span>
                  <div className="space-y-1">
                    <div className="text-sm font-display font-bold text-zinc-200">
                      {formatTime(analysis.totalTimeSpent)}
                    </div>
                    {analysis.attempted > 0 && (
                      <div className="text-[10px] font-mono text-zinc-500">
                        ~{Math.round(analysis.totalTimeSpent / analysis.attempted)}s / Q
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject Distribution */}
              <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-4 space-y-2.5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                  Subject Score Distribution
                </span>
                <div className="space-y-2">
                  {Object.entries(analysis.subjectStats).map(([subj, stats]) => (
                    <div key={subj} className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white capitalize">{subj}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold">{stats.correct}C</span>
                        <span className="text-rose-400 font-bold">{stats.incorrect}W</span>
                        <span className="text-indigo-400 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                          {stats.score} M
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* 2B. 3-PART EXAM FORENSICS & TIME-ALLOCATION AUDIT */}
          <div className="pt-2">
            <TestForensicsSection
              analysis={analysis}
              onSelectQuestion={(idx) => {
                setActiveTab('questions');
                handleQuestionChange(idx);
              }}
            />
          </div>

        </div>
      )}

    </div>
  );
}
