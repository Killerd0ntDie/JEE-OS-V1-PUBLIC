import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Clock, Target, ChevronRight, FileText, Award, Plus, 
  Loader2, X, Sparkles, Search, CheckCircle2, XCircle, ArrowRight,
  BarChart3, Layers, BookOpen, AlertTriangle, RotateCcw
} from 'lucide-react';
import { MockTest, MockTestAttempt, MockQuestion, QuestionType } from '../../types/mockTest';
import { MockTestArena } from './MockTestArena';
import { MockTestResult } from './MockTestResult';
import { MockTestUploader } from './MockTestUploader';
import { UploadPDFModal } from './components/UploadPDFModal';
import { Modal } from '@/components/ui/Modal';
import { v4 as uuidv4 } from 'uuid';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { getSubjectTheme } from '@/constants/subjectTheme';
import { MockResult, SubjectId } from '../../types/index';
import { InlineMath } from 'react-katex';
import { springs } from '@/constants/motion';

import { evaluateMockAttempt } from '@/utils/mockScoring';

type MockTestEngineState = 'LANDING' | 'ARENA' | 'RESULT';
type MockTabMode = 'available' | 'history';

// Helper to render text with inline math: parses text replacing $math$ with <InlineMath math="math"/>
const renderMathText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\$.*?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const math = part.slice(1, -1);
      return <InlineMath key={i} math={math} />;
    }
    return <span key={i}>{part}</span>;
  });
};

interface MockTestsPageProps {
  onNavigate?: (pageId: import('../../types').PageId) => void;
}

export function MockTestsPage({ onNavigate }: MockTestsPageProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const customMockTests = useStudyBrainStore(state => state.customMockTests);
  const mocks = useStudyBrainStore(state => state.mocks);
  const chapters = useStudyBrainStore(state => state.chapters) || [];

  const [engineState, setEngineState] = useState<MockTestEngineState>('LANDING');
  const [activeTab, setActiveTab] = useState<MockTabMode>('available');
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<MockTestAttempt | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [showPdfUploader, setShowPdfUploader] = useState(false);
  const [showAiSelector, setShowAiSelector] = useState(false);
  const [aiSelectedSubject, setAiSelectedSubject] = useState<SubjectId>('physics');
  const [aiChapterSearch, setAiChapterSearch] = useState('');
  const [isGeneratingAiTest, setIsGeneratingAiTest] = useState(false);
  const [aiGenError, setAiGenError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedPastAttempt, setSelectedPastAttempt] = useState<MockResult | null>(null);

  // Lock body scroll when a full-page modal/arena is open
  useEffect(() => {
    const isModalOpen = engineState !== 'LANDING' || isGeneratingAiTest || showUploader || showPdfUploader || !!selectedPastAttempt;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [engineState, isGeneratingAiTest, showUploader, showPdfUploader, selectedPastAttempt]);

  const handleStartTest = (test: MockTest) => {
    setSelectedTest(test);
    setEngineState('ARENA');
  };

  const handleReturnToDashboard = () => {
    setEngineState('LANDING');
    setSelectedTest(null);
    setCurrentAttempt(null);
  };

  const handleTestComplete = async (attempt: MockTestAttempt) => {
    setCurrentAttempt(attempt);
    setEngineState('RESULT');

    if (selectedTest) {
      const evaluation = evaluateMockAttempt(selectedTest, attempt, chapters);

      const newMockResult: MockResult = {
        id: uuidv4(),
        title: selectedTest.name,
        date: new Date().toISOString(),
        totalScore: evaluation.totalScore,
        correct: evaluation.correct,
        incorrect: evaluation.incorrect,
        attempted: evaluation.attempted,
        totalQuestions: evaluation.totalQuestions,
        duration: Math.round(evaluation.totalTimeSpent / 60),
        subjectBreakdown: evaluation.subjectStats as any,
        testSnapshot: selectedTest,
        attemptData: attempt
      };

      try {
        await actions.addMockResult(newMockResult);
      } catch (e) {
        console.error("Failed to save mock result:", e);
      }

      if (evaluation.mistakesToLog.length > 0) {
        try {
          for (const m of evaluation.mistakesToLog) {
            await actions.addMistake(m);
          }
        } catch (e) {
          console.error("Failed to auto-log mistakes:", e);
        }
      }
    }
  };

  const handleGenerateAiMock = async (chapterId: string, subject: string, chapterName: string) => {
    setShowAiSelector(false);
    setIsGeneratingAiTest(true);
    setAiGenError(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/generate-chapter-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId, subject, chapterName }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("Invalid question format received from AI.");
      }

      const mockQuestions: MockQuestion[] = data.questions.map((q: any, i: number) => ({
        id: `ai_q_${Date.now()}_${i}`,
        type: (q.type as QuestionType) || 'MCQ',
        content: q.content,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || 'Detailed explanation provided by AI.',
        difficulty: q.difficulty || 'Medium',
        chapter: chapterName,
        topic: q.topic || chapterName,
        marks: { correct: 4, incorrect: -1 }
      }));

      const aiMockTest: MockTest = {
        id: `ai_mock_${Date.now()}`,
        name: `AI Mini-Mock: ${chapterName}`,
        durationMinutes: 30,
        totalMarks: mockQuestions.reduce((sum, q) => sum + (q.marks?.correct ?? 4), 0),
        sections: [
          {
            subject: subject as import('../../types').SubjectId,
            questions: mockQuestions
          }
        ]
      };

      actions.addCustomMockTest(aiMockTest);
      setSelectedTest(aiMockTest);
      setEngineState('ARENA');
    } catch (err: any) {
      console.error("AI Mock Generation failed", err);
      setAiGenError(err.message || "Failed to generate AI Mock Test.");
    } finally {
      setIsGeneratingAiTest(false);
    }
  };

  // Filtered available custom mock tests
  const filteredAvailableTests = useMemo(() => {
    if (!customMockTests) return [];
    return customMockTests.filter(test => {
      const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (selectedSubject === 'all') return matchesSearch;

      const hasSubject = test.sections.some(s => s.subject === selectedSubject);
      return matchesSearch && hasSubject;
    });
  }, [customMockTests, searchQuery, selectedSubject]);

  // Filtered past attempts
  const filteredPastAttempts = useMemo(() => {
    if (!mocks) return [];
    return mocks.filter(mock => {
      const matchesSearch = mock.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (selectedSubject === 'all') return matchesSearch;
      
      const isSubj = Object.keys(mock.subjectBreakdown || {}).includes(selectedSubject);
      return matchesSearch && isSubj;
    });
  }, [mocks, searchQuery, selectedSubject]);

  // Aggregate Vitals
  const totalMocksAttempted = mocks?.length || 0;
  const avgAccuracy = useMemo(() => {
    if (!mocks || mocks.length === 0) return 0;
    const totalAttempted = mocks.reduce((acc, m) => acc + (m.attempted || 0), 0);
    const totalCorrect = mocks.reduce((acc, m) => acc + (m.correct || 0), 0);
    return totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  }, [mocks]);

  const avgScore = useMemo(() => {
    if (!mocks || mocks.length === 0) return 0;
    const sum = mocks.reduce((acc, m) => acc + (m.totalScore || 0), 0);
    return Math.round(sum / mocks.length);
  }, [mocks]);

  return (
    <div className="space-y-5 text-left relative font-sans select-none pb-12">
      <AnimatePresence mode="wait">
        {engineState === 'LANDING' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* 1. TOP HEADER & ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-950/70 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
                    Mock Test Engine
                  </h1>
                </div>
                <p className="text-xs text-zinc-400 font-mono pl-8">
                  FULL-LENGTH NTA SIMULATION & AI CHAPTER MINI-MOCKS
                </p>
              </div>

              {/* Action Buttons (Solid Colors, Zero Gradients, Standardized Sizing) */}
              <div className="flex items-center gap-2 flex-wrap font-mono text-xs shrink-0 self-start sm:self-auto">
                <motion.button 
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShowAiSelector(true)}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl font-bold transition-all shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  <span>AI Chapter Mini-Mock</span>
                </motion.button>

                <motion.button 
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShowPdfUploader(true)}
                  className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Score Grader</span>
                </motion.button>

                <motion.button 
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShowUploader(true)}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition-all cursor-pointer"
                  title="Import Custom JSON Test"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Error Alert */}
            {aiGenError && (
              <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs font-mono text-red-200">{aiGenError}</span>
                </div>
                <button onClick={() => setAiGenError(null)} className="text-red-400 hover:text-red-300 p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 2. EXAM COCKPIT & PERFORMANCE VITALS STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-wider block">
                  Tests Completed
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-display font-bold text-white">{totalMocksAttempted}</span>
                  <span className="text-[11px] font-mono text-zinc-500">Attempted</span>
                </div>
              </div>

              <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-wider block">
                  Average Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-display font-bold text-indigo-400">{avgScore}</span>
                  <span className="text-[11px] font-mono text-zinc-500">Marks / Test</span>
                </div>
              </div>

              <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-wider block">
                  Accuracy Rate
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-display font-bold text-emerald-400">{avgAccuracy}%</span>
                  <span className="text-[11px] font-mono text-emerald-500/80">Precision</span>
                </div>
              </div>

              <div className="bg-[#121318] border border-zinc-800/80 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-wider block">
                  Available Tests
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-display font-bold text-zinc-200">{customMockTests?.length || 0}</span>
                  <span className="text-[11px] font-mono text-zinc-500">Ready</span>
                </div>
              </div>
            </div>

            {/* 3. SEGMENTED MODE GLIDER & FILTER BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#121318] border border-zinc-800/80 rounded-2xl">
              
              {/* Primary Glider Tabs */}
              <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl font-mono text-xs relative select-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('available')}
                  className={`relative px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1.5 ${
                    activeTab === 'available' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {activeTab === 'available' && (
                    <motion.div
                      layoutId="mockMainActiveTabGlider"
                      className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md shadow-indigo-600/30 -z-10"
                      transition={springs.fluid}
                    />
                  )}
                  <Layers className="w-3.5 h-3.5" />
                  <span>Available Tests ({customMockTests?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`relative px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1.5 ${
                    activeTab === 'history' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {activeTab === 'history' && (
                    <motion.div
                      layoutId="mockMainActiveTabGlider"
                      className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md shadow-indigo-600/30 -z-10"
                      transition={springs.fluid}
                    />
                  )}
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Past Attempts ({mocks?.length || 0})</span>
                </button>
              </div>

              {/* Subject Filter Pills with Smooth Sliding Glider & Search */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex gap-0.5 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg font-mono text-[10px] relative select-none">
                  {(['all', 'physics', 'chemistry', 'maths'] as const).map(subj => {
                    const isActive = selectedSubject === subj;
                    return (
                      <button
                        key={subj}
                        onClick={() => setSelectedSubject(subj)}
                        className={`relative px-2.5 py-1 rounded-md font-bold uppercase transition-colors cursor-pointer select-none z-10 ${
                          isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="mockLandingSubjectGlider"
                            className="absolute inset-0 bg-indigo-600 rounded-md -z-10 shadow-sm"
                            transition={springs.fluid}
                          />
                        )}
                        <span>{subj}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search test..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-7 py-1 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 font-sans"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1.5 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 4. TAB CONTENT: AVAILABLE TESTS VS PAST ATTEMPTS */}
            <AnimatePresence mode="wait">
              {activeTab === 'available' ? (
                <motion.div
                  key="available-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {filteredAvailableTests.length === 0 ? (
                    searchQuery || selectedSubject !== 'all' ? (
                      <div className="p-12 text-center bg-[#121318] border border-zinc-800 rounded-3xl space-y-3">
                        <Search className="w-10 h-10 text-zinc-600 mx-auto" />
                        <h3 className="text-base font-display font-bold text-white">
                          No tests matching {searchQuery ? `"${searchQuery}"` : `subject: ${selectedSubject}`}
                        </h3>
                        <p className="text-xs font-mono text-zinc-400 max-w-sm mx-auto">
                          Try searching for a different chapter, formula keyword, or reset your search filters.
                        </p>
                        <button
                          onClick={() => { setSearchQuery(''); setSelectedSubject('all'); }}
                          className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Search & Filters</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-[#121318] border border-zinc-800 rounded-3xl space-y-3">
                        <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
                        <h3 className="text-base font-display font-bold text-white">No Mock Tests Found</h3>
                        <p className="text-xs font-mono text-zinc-400 max-w-sm mx-auto">
                          Generate a new test in 1-click using the AI Mini-Mock button above or import custom JSON.
                        </p>
                        <button
                          onClick={() => setShowAiSelector(true)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                          <span>Generate First AI Mini-Mock</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredAvailableTests.slice().reverse().map((test) => {
                        const firstSectionSubject = test.sections[0]?.subject || 'physics';
                        const theme = getSubjectTheme(firstSectionSubject);
                        const totalQuestions = test.sections.reduce((acc, sec) => acc + sec.questions.length, 0);

                        return (
                          <motion.div
                            key={test.id}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleStartTest(test)}
                            className="bg-[#121318] border border-zinc-800/80 hover:border-indigo-500/40 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-lg hover:shadow-indigo-600/10 group flex flex-col justify-between space-y-3 text-left"
                          >
                            <div className="space-y-2">
                              {/* Subject Badge & Question Count */}
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase ${theme.badge}`}>
                                  {firstSectionSubject}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                                  {test.totalMarks} Marks
                                </span>
                              </div>

                              {/* Title */}
                              <h3 className="text-sm font-display font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                                {renderMathText(test.name)}
                              </h3>
                            </div>

                            {/* Footer Metrics & CTA */}
                            <div className="pt-2.5 border-t border-zinc-850/80 flex items-center justify-between text-[11px] font-mono">
                              <div className="flex items-center gap-1 text-zinc-400">
                                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                <span>{test.durationMinutes} mins • {totalQuestions} Qs</span>
                              </div>

                              <span className="text-indigo-400 group-hover:text-indigo-300 font-bold flex items-center gap-1">
                                <span>Start Test</span>
                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ) : (
                /* HISTORY / PAST ATTEMPTS GALLERY */
                <motion.div
                  key="history-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {filteredPastAttempts.length === 0 ? (
                    searchQuery || selectedSubject !== 'all' ? (
                      <div className="p-12 text-center bg-[#121318] border border-zinc-800 rounded-3xl space-y-3">
                        <Search className="w-10 h-10 text-zinc-600 mx-auto" />
                        <h3 className="text-base font-display font-bold text-white">
                          No past attempts matching {searchQuery ? `"${searchQuery}"` : `subject: ${selectedSubject}`}
                        </h3>
                        <p className="text-xs font-mono text-zinc-400 max-w-sm mx-auto">
                          Try searching for a different mock title or reset your filters.
                        </p>
                        <button
                          onClick={() => { setSearchQuery(''); setSelectedSubject('all'); }}
                          className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Search & Filters</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-[#121318] border border-zinc-800 rounded-3xl space-y-3">
                        <BarChart3 className="w-10 h-10 text-zinc-600 mx-auto" />
                        <h3 className="text-base font-display font-bold text-white">No Past Test Records</h3>
                        <p className="text-xs font-mono text-zinc-400 max-w-sm mx-auto">
                          Complete your first simulated exam to view detailed analytical scorecards and rank projections.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredPastAttempts.slice().reverse().map((mock) => {
                        const accuracy = mock.attempted > 0 ? Math.round((mock.correct / mock.attempted) * 100) : 0;
                        const maxTestMarks = mock.testSnapshot?.totalMarks || (mock.totalQuestions * 4);

                        return (
                          <motion.div
                            key={mock.id}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedPastAttempt(mock)}
                            className="bg-[#121318] border border-zinc-800/80 hover:border-indigo-500/40 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-lg hover:shadow-indigo-600/10 group flex flex-col justify-between space-y-3 text-left"
                          >
                            <div className="space-y-2.5">
                              {/* Header & Date */}
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-sm font-display font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                                  {mock.title}
                                </h3>
                                <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                  {new Date(mock.date).toLocaleDateString()}
                                </span>
                              </div>

                              {/* Stats Row */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-850">
                                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono font-bold block mb-0.5">Score</span>
                                  <span className="text-base font-display font-bold text-indigo-400">
                                    {mock.totalScore} <span className="text-[10px] text-zinc-600">/ {maxTestMarks}</span>
                                  </span>
                                </div>
                                <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-850">
                                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono font-bold block mb-0.5">Accuracy</span>
                                  <span className="text-base font-display font-bold text-emerald-400">
                                    {accuracy}%
                                  </span>
                                </div>
                              </div>

                              {/* Breakdown Badges */}
                              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 font-bold">
                                  {mock.correct} Correct
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-rose-950/50 border border-rose-800/60 text-rose-300 font-bold">
                                  {mock.incorrect} Wrong
                                </span>
                                <span className="text-zinc-500 ml-auto">
                                  {mock.duration}m
                                </span>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="pt-2.5 border-t border-zinc-850/80 flex items-center justify-between text-xs font-mono text-indigo-400 group-hover:text-indigo-300 font-bold">
                              <span>Inspect Full Test Autopsy</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom JSON Uploader Modal */}
            <MockTestUploader 
              isOpen={showUploader}
              onUpload={(test) => {
                actions.addCustomMockTest(test);
                setShowUploader(false);
              }} 
              onCancel={() => setShowUploader(false)} 
            />

            {/* PDF Uploader Modal */}
            <UploadPDFModal
              isOpen={showPdfUploader}
              onSuccess={() => setShowPdfUploader(false)}
              onCancel={() => setShowPdfUploader(false)}
            />
          </motion.div>
        )}

        {/* FULLSCREEN CBT EXAM ARENA */}
        {engineState === 'ARENA' && selectedTest && (
          <MockTestArena 
            test={selectedTest} 
            onComplete={handleTestComplete}
            onExit={handleReturnToDashboard}
          />
        )}

        {/* FULLSCREEN TEST RESULT & AUTOPSY */}
        {engineState === 'RESULT' && selectedTest && currentAttempt && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] glass-panel overflow-y-auto p-4 sm:p-6 lg:p-8"
          >
            <MockTestResult 
              test={selectedTest!} 
              attempt={currentAttempt!} 
              onClose={handleReturnToDashboard}
              onNavigate={onNavigate}
            />
          </motion.div>
        )}

        {/* PAST ATTEMPT RESULT MODAL */}
        {selectedPastAttempt && (
          <motion.div
            key="past-result"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] glass-panel overflow-y-auto"
          >
            {selectedPastAttempt.testSnapshot && selectedPastAttempt.attemptData ? (
              <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
                <MockTestResult 
                  test={selectedPastAttempt.testSnapshot} 
                  attempt={selectedPastAttempt.attemptData} 
                  onClose={() => setSelectedPastAttempt(null)}
                  onNavigate={onNavigate}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full space-y-4 shadow-2xl">
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white">Basic Score Record</h3>
                  <p className="text-zinc-400 text-xs font-mono">
                    This is an externally logged score record. Detailed question-by-question analytics are only stored for tests attempted within JEE OS.
                  </p>
                  <button 
                    onClick={() => setSelectedPastAttempt(null)}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close Record
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chapter Selector Modal with Glass-Panel & Sliding Subject Glider */}
      <Modal 
        isOpen={showAiSelector} 
        onClose={() => setShowAiSelector(false)} 
        zIndex={60} 
        backdropClassName="bg-black/10 backdrop-blur-md p-4" 
        className="w-full max-w-lg glass-panel bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative text-left"
      >
        <button 
          onClick={() => setShowAiSelector(false)}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900/60 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-display font-bold text-white">AI Chapter Mini-Mock</h3>
            <p className="text-[11px] font-mono text-zinc-400">Select any chapter to generate 10 high-yield PYQ questions</p>
          </div>
        </div>

        {/* Subject Switcher Glider */}
        <div className="flex gap-1 bg-black/40 border border-white/10 p-1 rounded-xl font-mono text-xs mb-3 relative select-none">
          {(['physics', 'chemistry', 'maths'] as const).map(sub => {
            const isActive = aiSelectedSubject === sub;
            return (
              <button
                key={sub}
                onClick={() => setAiSelectedSubject(sub)}
                className={`relative flex-1 py-1.5 rounded-lg uppercase font-bold text-center transition-colors cursor-pointer select-none z-10 ${
                  isActive
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="aiModalSubjectGlider"
                    className="absolute inset-0 bg-indigo-600 rounded-lg -z-10 shadow-sm"
                    transition={springs.fluid}
                  />
                )}
                <span>{sub}</span>
              </button>
            );
          })}
        </div>

        {/* Chapter Search Bar */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={aiChapterSearch}
            onChange={(e) => setAiChapterSearch(e.target.value)}
            placeholder={`Search ${aiSelectedSubject} chapter...`}
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500/80 font-sans"
          />
        </div>
        
        {/* Chapter List */}
        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
          {chapters
            .filter(c => c.subject === aiSelectedSubject)
            .filter(c => c.name.toLowerCase().includes(aiChapterSearch.toLowerCase()))
            .map(chapter => (
              <motion.button
                key={chapter.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleGenerateAiMock(chapter.id, chapter.subject, chapter.name)}
                className="w-full text-left p-3.5 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-indigo-600/15 hover:border-indigo-500/40 text-zinc-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-between cursor-pointer group"
              >
                <span className="truncate">{chapter.name}</span>
                <span className="text-[10px] font-mono text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-1 font-bold">
                  Generate 10 Qs →
                </span>
              </motion.button>
            ))}
        </div>
      </Modal>

      {/* Loading Modal for AI Mock Generation with Glass-Panel */}
      <Modal 
        isOpen={isGeneratingAiTest} 
        onClose={() => setIsGeneratingAiTest(false)} 
        zIndex={100} 
        backdropClassName="bg-black/10 backdrop-blur-md flex flex-col items-center justify-center" 
        className="flex flex-col items-center justify-center p-8 text-center glass-panel bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-3 shadow-xl shadow-indigo-600/20">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <h3 className="text-lg font-display font-bold text-white mb-1">Synthesizing AI Mock Test</h3>
        <p className="text-xs text-zinc-400 font-mono">Generating high-yield exam PYQs via AI Backend...</p>
      </Modal>
    </div>
  );
}
