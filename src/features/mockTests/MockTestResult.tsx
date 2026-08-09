import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Target, Clock, Award, X, AlertTriangle, ArrowRight, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useStudyBrainStore } from '../../store/useStudyBrainStore';
import { MockTest, MockTestAttempt, MockQuestion, MockTestAttemptQuestion } from '../../types/mockTest';
import { SubjectId } from '../../types/index';
import { RichTextRenderer } from '@/components/MathRenderer';



interface MockTestResultProps {
  test: MockTest;
  attempt: MockTestAttempt;
  onClose: () => void;
  onNavigate?: (pageId: import('../../types').PageId) => void;
}

const calculateRank = (score: number, maxMarks: number) => {
  const normalizedScore = Math.max(0, (score / maxMarks) * 300);
  if (normalizedScore >= 280) return Math.floor(Math.max(1, (300 - normalizedScore) * 5));
  if (normalizedScore >= 250) return Math.floor(100 + (280 - normalizedScore) * 30);
  if (normalizedScore >= 200) return Math.floor(1000 + (250 - normalizedScore) * 150);
  if (normalizedScore >= 150) return Math.floor(8500 + (200 - normalizedScore) * 400);
  if (normalizedScore >= 100) return Math.floor(28500 + (150 - normalizedScore) * 1000);
  if (normalizedScore >= 50) return Math.floor(78500 + (100 - normalizedScore) * 3000);
  return Math.floor(228500 + (50 - normalizedScore) * 10000);
};

export function MockTestResult({ test, attempt, onClose, onNavigate }: MockTestResultProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const hasLoggedMistakes = useRef(false);

  const analysis = useMemo(() => {
    let totalScore = 0;
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    
    const subjectStats: Record<string, { correct: number; incorrect: number; unattempted: number; score: number }> = {};
    test.sections.forEach(sec => {
      subjectStats[sec.subject] = { correct: 0, incorrect: 0, unattempted: 0, score: 0 };
    });

    const incorrectQuestions: any[] = [];

    test.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const a = attempt.questions[q.id];
        const isAnswered = a.status === 'Answered' || a.status === 'Answered & Marked for Review';
        
        if (isAnswered && a.selectedAnswer) {
          const isCorrectAnswer = q.type === 'NUMERICAL' 
            ? parseFloat(a.selectedAnswer) === parseFloat(q.correctAnswer) 
            : a.selectedAnswer.trim() === q.correctAnswer.trim();
            
          if (isCorrectAnswer) {
            totalScore += q.marks.correct;
            correct++;
            subjectStats[sec.subject].correct++;
            subjectStats[sec.subject].score += q.marks.correct;
          } else {
            totalScore += q.marks.incorrect;
            incorrect++;
            subjectStats[sec.subject].incorrect++;
            subjectStats[sec.subject].score += q.marks.incorrect;
            
            incorrectQuestions.push({
              question: q,
              attempt: a
            });
          }
        } else {
          unattempted++;
          subjectStats[sec.subject].unattempted++;
        }
      });
    });

    const totalTimeSpent = (Object.values(attempt.questions) as any[]).reduce((acc, q) => acc + q.timeSpentSeconds, 0);

    // AI Autopsy Calculator (What-If Analysis)
    // What if the student had just left incorrect answers blank instead of guessing? (Eliminates negative marking)
    let whatIfScore = totalScore;
    test.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const a = attempt.questions[q.id];
        const isAnswered = a.status === 'Answered' || a.status === 'Answered & Marked for Review';
        if (isAnswered && a.selectedAnswer) {
          const isCorrectAnswer = q.type === 'NUMERICAL' 
            ? parseFloat(a.selectedAnswer) === parseFloat(q.correctAnswer) 
            : a.selectedAnswer.trim() === q.correctAnswer.trim();
            
          if (!isCorrectAnswer) {
            // Refund the negative penalty only
            whatIfScore += Math.abs(q.marks.incorrect);
          }
        }
      });
    });

    const actualRank = calculateRank(totalScore, test.totalMarks);
    const whatIfRank = calculateRank(whatIfScore, test.totalMarks);

    return { totalScore, correct, incorrect, unattempted, subjectStats, totalTimeSpent, incorrectQuestions, whatIfScore, actualRank, whatIfRank };
  }, [test, attempt]);



  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Test Analysis</h1>
          </div>
          <p className="text-sm text-zinc-400 font-mono">{test.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const prompt = `I just completed the Mock Test "${test.name}". I scored ${analysis.totalScore} out of ${test.totalMarks}. I attempted ${analysis.correct + analysis.incorrect} questions, got ${analysis.correct} correct and ${analysis.incorrect} incorrect. Can you analyze my performance and suggest a revision strategy?`;
              sessionStorage.setItem('pendingCoachPrompt', prompt);
              onNavigate?.('ai-coach');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/20 font-mono text-sm font-semibold transition-all"
          >
            Consult AI Mentor
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* The Autopsy Room (Rank Predictor & What-If) */}
      <div className="bg-[#121318] border border-red-900/40 rounded-3xl p-8 relative overflow-hidden group shadow-[0_0_50px_rgba(239,68,68,0.05)]">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <AlertTriangle className="w-64 h-64 text-red-500" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          
          {/* Actual Score & Rank */}
          <div className="flex-1 space-y-2">
            <div className="text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider">Actual Performance</div>
            <div className="flex items-end gap-3">
              <div className="text-5xl font-display font-bold text-white">{analysis.totalScore} <span className="text-xl text-zinc-600">/ {test.totalMarks}</span></div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-xs text-zinc-400 font-mono">Predicted AIR:</span>
              <span className="text-sm font-bold text-indigo-400">{analysis.actualRank.toLocaleString()}</span>
            </div>
          </div>

          {/* The Delta / Transition */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center px-4">
            <div className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-widest mb-2 bg-red-950/40 px-3 py-1 rounded-full border border-red-900/50">
              {analysis.incorrect} Mistakes Cost You
            </div>
            <div className="h-0.5 w-24 bg-gradient-to-r from-zinc-800 via-red-500/50 to-zinc-800 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#121318] border border-red-900/50 rounded-full flex items-center justify-center">
                <ArrowRight className="w-3 h-3 text-red-400" />
              </div>
            </div>
            <div className="mt-3 text-xs font-mono text-zinc-400">
              <span className="text-red-400 font-bold">+{analysis.whatIfScore - analysis.totalScore}</span> Penalty Avoided
            </div>
          </div>

          {/* What-If Score & Rank */}
          <div className="flex-1 space-y-2 text-right">
            <div className="text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider flex justify-end items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              What-If Analysis
            </div>
            <div className="flex items-end justify-end gap-3">
              <div className="text-5xl font-display font-bold text-zinc-700 opacity-50">{analysis.whatIfScore} <span className="text-xl text-zinc-800">/ {test.totalMarks}</span></div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
              <span className="text-xs text-emerald-600 font-mono">Potential AIR:</span>
              <span className="text-sm font-bold text-emerald-400">{analysis.whatIfRank.toLocaleString()}</span>
            </div>
          </div>

        </div>

        {/* Delta Banner */}
        <div className="relative z-10 mt-8 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80 flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            If you fixed these <strong className="text-white">{analysis.incorrect}</strong> incorrect answers, your rank would jump by
          </div>
          <div className="text-2xl font-display font-bold text-emerald-400">
            +{(analysis.actualRank - analysis.whatIfRank).toLocaleString()} Ranks
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#121318] border border-zinc-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">Accuracy</div>
          <div className="text-3xl font-display font-bold text-emerald-400">
            {analysis.correct + analysis.incorrect > 0 ? Math.round((analysis.correct / (analysis.correct + analysis.incorrect)) * 100) : 0}%
          </div>
        </div>

        <div className="bg-[#121318] border border-zinc-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">Questions Profile</div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-display font-bold text-emerald-500">{analysis.correct}</span>
            <span className="text-2xl font-display font-bold text-rose-500">{analysis.incorrect}</span>
            <span className="text-2xl font-display font-bold text-zinc-600">{analysis.unattempted}</span>
          </div>
        </div>

        <div className="bg-[#121318] border border-zinc-800 rounded-2xl p-5 relative overflow-hidden group">
          <div className="text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">Time Taken</div>
          <div className="text-3xl font-display font-bold text-zinc-200 mt-1">{formatTime(analysis.totalTimeSpent)}</div>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-mono">Subject Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(analysis.subjectStats).map(([subj, stats]: [string, any]) => (
            <div key={subj} className="bg-[#121318] border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-lg font-bold text-white capitalize mb-4 flex items-center justify-between">
                {subj}
                <span className="text-sm font-mono text-indigo-400">{stats.score} Marks</span>
              </h3>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Correct</span>
                  <span className="text-emerald-400 font-bold">{stats.correct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Incorrect</span>
                  <span className="text-rose-400 font-bold">{stats.incorrect}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Unattempted</span>
                  <span className="text-zinc-600 font-bold">{stats.unattempted}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mistake Auto-log Notice */}
      {analysis.incorrect > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 flex gap-4 items-start">
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-rose-300 font-bold mb-1">Mistakes Auto-Logged</h3>
            <p className="text-sm text-rose-200/70 leading-relaxed mb-4">
              {analysis.incorrect} incorrect questions have been automatically pipelined into your StudyBrain. They are tagged as "Uncategorized Mock Error". Head over to the Mistakes page to categorize them and view explanations.
            </p>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Question-by-Question Detailed Analysis Section */}
      <QuestionAnalysisSection test={test} attempt={attempt} />
    </div>
  );
}

function QuestionAnalysisSection({ test, attempt }: { test: MockTest; attempt: MockTestAttempt }) {
  const [questionFilter, setQuestionFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED'>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectId>('ALL');
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({});

  const allQuestionsDetailed = useMemo(() => {
    const list: Array<{
      sectionSubject: SubjectId;
      question: MockQuestion;
      attempt: MockTestAttemptQuestion;
      isCorrect: boolean;
      isIncorrect: boolean;
      isUnattempted: boolean;
      statusLabel: 'Correct' | 'Incorrect' | 'Unattempted';
      globalIndex: number;
    }> = [];

    let idx = 1;
    test.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const a = attempt.questions[q.id] || {
          questionId: q.id,
          subject: sec.subject,
          status: 'Not Visited',
          timeSpentSeconds: 0
        };
        
        const isAnswered = a.status === 'Answered' || a.status === 'Answered & Marked for Review';
        let isCorrect = false;
        let isIncorrect = false;
        let isUnattempted = true;
        let statusLabel: 'Correct' | 'Incorrect' | 'Unattempted' = 'Unattempted';

        if (isAnswered && a.selectedAnswer) {
          isUnattempted = false;
          const isCorrectAnswer = q.type === 'NUMERICAL' 
            ? parseFloat(a.selectedAnswer) === parseFloat(q.correctAnswer) 
            : a.selectedAnswer.trim() === q.correctAnswer.trim();
            
          if (isCorrectAnswer) {
            isCorrect = true;
            statusLabel = 'Correct';
          } else {
            isIncorrect = true;
            statusLabel = 'Incorrect';
          }
        }

        list.push({
          sectionSubject: sec.subject,
          question: q,
          attempt: a,
          isCorrect,
          isIncorrect,
          isUnattempted,
          statusLabel,
          globalIndex: idx++
        });
      });
    });

    return list;
  }, [test, attempt]);

  const [visibleCount, setVisibleCount] = useState(10);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(10);
  }, [questionFilter, subjectFilter]);

  const filteredQuestions = useMemo(() => {
    return allQuestionsDetailed.filter(q => {
      if (subjectFilter !== 'ALL' && q.sectionSubject !== subjectFilter) return false;
      if (questionFilter === 'CORRECT') return q.isCorrect;
      if (questionFilter === 'INCORRECT') return q.isIncorrect;
      if (questionFilter === 'UNATTEMPTED') return q.isUnattempted;
      return true;
    });
  }, [allQuestionsDetailed, questionFilter, subjectFilter]);

  const visibleQuestions = useMemo(() => {
    return filteredQuestions.slice(0, visibleCount);
  }, [filteredQuestions, visibleCount]);

  const toggleQuestionExpanded = (id: string) => {
    setExpandedQuestionIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    allQuestionsDetailed.forEach(item => { all[item.question.id] = true; });
    setExpandedQuestionIds(all);
  };

  const collapseAll = () => {
    setExpandedQuestionIds({});
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-6 pt-6 border-t border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white font-display">Detailed Question Analysis</h2>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
            {filteredQuestions.length} {filteredQuestions.length === 1 ? 'Question' : 'Questions'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={expandAll}
            className="text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            Expand All
          </button>
          <button 
            onClick={collapseAll}
            className="text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-[#121318] border border-zinc-800 rounded-2xl">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2 flex-1">
          <button
            onClick={() => setQuestionFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
              questionFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All ({allQuestionsDetailed.length})
          </button>
          <button
            onClick={() => setQuestionFilter('CORRECT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
              questionFilter === 'CORRECT'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Correct ({allQuestionsDetailed.filter(q => q.isCorrect).length})
          </button>
          <button
            onClick={() => setQuestionFilter('INCORRECT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
              questionFilter === 'INCORRECT'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Incorrect ({allQuestionsDetailed.filter(q => q.isIncorrect).length})
          </button>
          <button
            onClick={() => setQuestionFilter('UNATTEMPTED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
              questionFilter === 'UNATTEMPTED'
                ? 'bg-zinc-700 text-white shadow-lg shadow-zinc-500/20'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5 text-zinc-400" />
            Unattempted ({allQuestionsDetailed.filter(q => q.isUnattempted).length})
          </button>
        </div>

        {/* Subject Filter Dropdown / Buttons */}
        <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-zinc-800 pt-3 md:pt-0 md:pl-4">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Subject:</span>
          <div className="flex gap-1.5">
            {['ALL', ...test.sections.map(s => s.subject)].map(subj => (
              <button
                key={subj}
                onClick={() => setSubjectFilter(subj as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                  subjectFilter === subj
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-300 border border-zinc-800'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-[#121318] border border-zinc-800 rounded-2xl p-12 text-center">
            <p className="text-zinc-400 font-mono text-sm">No questions match the selected filter criteria.</p>
          </div>
        ) : (
          filteredQuestions.map(({ question: q, attempt: a, isCorrect, isIncorrect, isUnattempted, statusLabel, sectionSubject, globalIndex }) => {
            const isExpanded = expandedQuestionIds[q.id] ?? (isIncorrect || isCorrect);

            return (
              <div 
                key={q.id}
                className={`bg-[#121318] border rounded-2xl overflow-hidden transition-all ${
                  isCorrect 
                    ? 'border-emerald-500/30' 
                    : isIncorrect 
                      ? 'border-rose-500/30' 
                      : 'border-zinc-800'
                }`}
              >
                {/* Card Header Bar */}
                <div 
                  onClick={() => toggleQuestionExpanded(q.id)}
                  className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-zinc-900/50 transition-colors select-none"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-bold text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                      Q{globalIndex}
                    </span>
                    
                    <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {sectionSubject}
                    </span>

                    {q.chapter && (
                      <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                        {q.chapter}
                      </span>
                    )}

                    <span className="text-xs font-mono text-zinc-400">
                      {q.type} • {q.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {isCorrect && (
                        <span className="flex items-center gap-1.5 text-xs font-bold font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Correct (+{q.marks.correct})
                        </span>
                      )}
                      {isIncorrect && (
                        <span className="flex items-center gap-1.5 text-xs font-bold font-mono px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3.5 h-3.5" />
                          Incorrect ({q.marks.incorrect})
                        </span>
                      )}
                      {isUnattempted && (
                        <span className="flex items-center gap-1.5 text-xs font-bold font-mono px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                          <MinusCircle className="w-3.5 h-3.5" />
                          Unattempted (0)
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {a.timeSpentSeconds || 0}s
                    </span>

                    <div className="text-zinc-400 hover:text-white transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Card Expanded Content */}
                {isExpanded && (
                  <div className="p-5 md:p-6 border-t border-zinc-800/80 bg-zinc-950/40 space-y-6">
                    {/* Question Text */}
                    <div className="text-base text-zinc-200 leading-relaxed font-sans">
                      <RichTextRenderer content={q.content} />
                    </div>

                    {/* Options or Numerical Output */}
                    {q.type === 'MCQ' && q.options && (
                      <div className="space-y-3 max-w-2xl">
                        {q.options.map((optText, optIdx) => {
                          const optIndexStr = optIdx.toString();
                          const isUserSelected = a.selectedAnswer?.trim() === optIndexStr;
                          const isOfficialCorrect = q.correctAnswer?.trim() === optIndexStr;

                          let optStyle = "bg-[#121318] border-zinc-800 text-zinc-400";
                          let badge = null;

                          if (isOfficialCorrect && isUserSelected) {
                            optStyle = "bg-emerald-500/10 border-emerald-500 text-white font-medium";
                            badge = <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500 text-black ml-auto">Your Answer ✓</span>;
                          } else if (isOfficialCorrect) {
                            optStyle = "bg-emerald-500/10 border-emerald-500/60 text-emerald-200";
                            badge = <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-auto">Correct Answer</span>;
                          } else if (isUserSelected) {
                            optStyle = "bg-rose-500/10 border-rose-500 text-white";
                            badge = <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500 text-white ml-auto">Your Answer ✗</span>;
                          }

                          return (
                            <div 
                              key={optIdx}
                              className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-sm ${optStyle}`}
                            >
                              <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center border shrink-0 ${
                                isOfficialCorrect 
                                  ? 'bg-emerald-500 border-emerald-400 text-black' 
                                  : isUserSelected 
                                    ? 'bg-rose-500 border-rose-400 text-white' 
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                              }`}>
                                {optionLetters[optIdx]}
                              </span>
                              <span className="flex-1"><RichTextRenderer content={optText} /></span>
                              {badge}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'NUMERICAL' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                        <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/40' : isIncorrect ? 'bg-rose-500/10 border-rose-500/40' : 'bg-zinc-900 border-zinc-800'}`}>
                          <span className="text-xs font-mono text-zinc-400 block mb-1">Your Entered Response</span>
                          <span className={`text-lg font-mono font-bold ${isCorrect ? 'text-emerald-400' : isIncorrect ? 'text-rose-400' : 'text-zinc-400'}`}>
                            {a.selectedAnswer || 'Not Entered'}
                          </span>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40">
                          <span className="text-xs font-mono text-zinc-400 block mb-1">Official Correct Answer</span>
                          <span className="text-lg font-mono font-bold text-emerald-400">
                            {q.correctAnswer}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Solution / Explanation Box */}
                    {q.explanation && (
                      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 md:p-5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                          <BookOpen className="w-4 h-4" />
                          Step-by-Step Solution & Explanation
                        </div>
                        <div className="text-sm text-zinc-300 leading-relaxed font-sans pt-1">
                          <RichTextRenderer content={q.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {visibleCount < filteredQuestions.length && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setVisibleCount(v => v + 15)}
            className="px-6 py-3 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors font-mono text-sm font-bold shadow-sm"
          >
            Load More Questions ({filteredQuestions.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
