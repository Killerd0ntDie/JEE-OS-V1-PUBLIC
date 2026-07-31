import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Clock, Target, ChevronRight, FileText, Award, Plus, Loader2, X, Sparkles } from 'lucide-react';
import { MockTest, MockTestAttempt, MockQuestion, QuestionType } from '../../types/mockTest';
import { MockTestArena } from './MockTestArena';
import { MockTestResult } from './MockTestResult';
import { MockTestUploader } from './MockTestUploader';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { v4 as uuidv4 } from 'uuid';
import { useStudyBrain } from '../../context/StudyBrainContext';
import { MockResult } from '../../types/index';
import { InlineMath } from 'react-katex';

type MockTestEngineState = 'LANDING' | 'ARENA' | 'RESULT';

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
  const { state, actions } = useStudyBrain();
  const [engineState, setEngineState] = useState<MockTestEngineState>('LANDING');
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<MockTestAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showAiSelector, setShowAiSelector] = useState(false);
  const [isGeneratingAiTest, setIsGeneratingAiTest] = useState(false);
  const [aiGenError, setAiGenError] = useState<string | null>(null);
  const [selectedPastAttempt, setSelectedPastAttempt] = useState<MockResult | null>(null);

  // Lock body scroll when a full-page modal is open
  useEffect(() => {
    const isModalOpen = engineState !== 'LANDING' || isGeneratingAiTest || showUploader || !!selectedPastAttempt;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [engineState, isGeneratingAiTest, showUploader, selectedPastAttempt]);

  const handleStartTest = (test: MockTest) => {
    setSelectedTest(test);
    setEngineState('ARENA');
  };

  const handleTestComplete = async (attempt: MockTestAttempt) => {
    setCurrentAttempt(attempt);
    setEngineState('RESULT');

    if (selectedTest) {
      let totalScore = 0;
      let correct = 0;
      let incorrect = 0;
      let totalTimeSpent = 0;
      const subjectStats: Record<string, { correct: number; incorrect: number; attempted: number; score: number }> = {};
      
      selectedTest.sections.forEach(sec => {
        subjectStats[sec.subject] = { correct: 0, incorrect: 0, attempted: 0, score: 0 };
        sec.questions.forEach(q => {
          const a = attempt.questions[q.id];
          if (a) {
            totalTimeSpent += a.timeSpentSeconds || 0;
            const isAnswered = a.status === 'Answered' || a.status === 'Answered & Marked for Review';
            if (isAnswered && a.selectedAnswer) {
              subjectStats[sec.subject].attempted++;
              if (a.selectedAnswer === q.correctAnswer) {
                totalScore += q.marks.correct;
                correct++;
                subjectStats[sec.subject].correct++;
                subjectStats[sec.subject].score += q.marks.correct;
              } else {
                totalScore += q.marks.incorrect;
                incorrect++;
                subjectStats[sec.subject].incorrect++;
                subjectStats[sec.subject].score += q.marks.incorrect;
              }
            }
          }
        });
      });

      const mockResultData = {
        date: new Date().toISOString(),
        title: selectedTest.name,
        totalScore,
        totalQuestions: selectedTest.sections.reduce((acc, sec) => acc + sec.questions.length, 0),
        attempted: correct + incorrect,
        correct,
        incorrect,
        duration: Math.round(totalTimeSpent / 60),
        subjectBreakdown: Object.entries(subjectStats).reduce((acc, [subj, stats]) => {
          acc[subj as import('../../types').SubjectId] = {
            score: stats.score,
            attempted: stats.attempted,
            correct: stats.correct
          };
          return acc;
        }, {} as Record<import('../../types').SubjectId, { score: number; attempted: number; correct: number }>),
        testSnapshot: selectedTest,
        attemptData: attempt
      };

      try {
        await actions.addMockResult(mockResultData);
      } catch (err) {
        console.error("Failed to save completed mock test result to Firestore:", err);
      }
    }
  };

  const handleReturnToDashboard = () => {
    setEngineState('LANDING');
    setSelectedTest(null);
    setCurrentAttempt(null);
  };

  const handleGenerateAiMock = async (chapterId: string, subject: string, chapterName: string) => {
    setShowAiSelector(false);
    setIsGeneratingAiTest(true);
    setAiGenError(null);
    
    try {
      const userStr = localStorage.getItem('auth_user');
      const token = userStr ? JSON.parse(userStr).token : '';
      
      const res = await fetch('/api/mocktest/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chapterId,
          chapterName,
          subject,
          count: 10,
          difficulty: 'JEE_MAIN'
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        throw new Error(res.ok ? 'Received invalid response from server' : `Server Error (${res.status}): ${responseText.substring(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to generate mock test (Status ${res.status})`);
      }

      const generatedQuestions = data.questions || [];

      // Map Question[] to MockQuestion[]
      const mockQuestions: MockQuestion[] = generatedQuestions.map((q: any, idx: number) => {
        const isMcq = q.type.startsWith('MCQ');
        const qType: QuestionType = isMcq ? 'MCQ' : 'NUMERICAL';
        
        let correctAns = '';
        if (isMcq && q.solution?.correctOptionIds?.length) {
          const char = q.solution.correctOptionIds[0];
          const mappedIndex = char.charCodeAt(0) - 65;
          correctAns = mappedIndex >= 0 && mappedIndex <= 3 ? mappedIndex.toString() : '0';
        } else if (!isMcq) {
          correctAns = q.solution?.correctNumericalValue?.toString() || '0';
        }

        return {
          id: q.id || uuidv4(),
          subject: subject as import('../../types').SubjectId,
          type: qType,
          chapter: chapterName,
          topic: q.topic || 'General',
          difficulty: 'Medium',
          content: q.content,
          options: q.options ? q.options.map((o:any) => o.text) : undefined,
          correctAnswer: correctAns,
          marks: { correct: 4, incorrect: -1 },
          explanation: q.solution?.text || ''
        };
      });

      const aiMockTest: MockTest = {
        id: uuidv4(),
        name: `AI Mini-Mock: ${chapterName}`,
        durationMinutes: 30,
        totalMarks: mockQuestions.length * 4,
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-zinc-100 overflow-hidden relative">
      <AnimatePresence mode="wait">
        {engineState === 'LANDING' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 overflow-y-auto p-6 lg:p-8 relative"
          >
            {isGeneratingAiTest && (
              <ModalPortal>
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-3">Synthesizing AI Mock Test</h3>
                  <p className="text-zinc-400 font-mono text-base">Generating highly realistic PYQs via AI Backend...</p>
                </div>
              </ModalPortal>
            )}
            
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Target className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-display font-bold text-white tracking-tight">Mock Test Engine</h1>
                    <p className="text-sm text-zinc-400 font-mono mt-1">Full-Length NTA Simulated Examinations</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <button 
                    onClick={() => setShowAiSelector(true)}
                    className="flex items-center justify-center gap-2 bg-indigo-900/40 hover:bg-indigo-600/60 border border-indigo-500/30 text-white px-5 py-3.5 rounded-xl font-bold transition-all text-sm group"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" />
                    AI Chapter Mini-Mock
                  </button>
                  <button 
                    onClick={() => setShowUploader(true)}
                    className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 px-5 py-3.5 rounded-xl font-bold transition-all text-sm group"
                  >
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    Log External Score
                  </button>
                </div>
              </div>

              {aiGenError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <X className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-red-400">AI Generation Failed</h4>
                      <p className="text-xs text-red-300 mt-0.5">{aiGenError}</p>
                    </div>
                  </div>
                  <button onClick={() => setAiGenError(null)} className="text-red-400 hover:text-red-300 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Available Custom Tests */}
              {state.customMockTests && state.customMockTests.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-zinc-900">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 font-mono">Available Tests</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {state.customMockTests.slice().reverse().map((test) => (
                      <div 
                        key={test.id} 
                        onClick={() => handleStartTest(test)}
                        className="bg-zinc-900/40 border border-zinc-800 hover:border-indigo-500/30 hover:bg-zinc-800/60 rounded-2xl p-4 cursor-pointer transition-all group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-sm font-bold text-zinc-200 truncate pr-2 group-hover:text-indigo-300 transition-colors">{test.name}</h3>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                          <span>{test.durationMinutes} minutes</span>
                          <span>{test.totalMarks} Marks / {test.sections.reduce((acc, sec) => acc + sec.questions.length, 0)} Qs</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Attempts */}
              {state.mocks && state.mocks.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-zinc-900">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 font-mono">Past Attempts</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {state.mocks.slice().reverse().map((mock) => (
                      <div 
                        key={mock.id} 
                        onClick={() => setSelectedPastAttempt(mock)}
                        className="bg-zinc-900/40 border border-zinc-800 hover:border-indigo-500/30 hover:bg-zinc-800/60 rounded-2xl p-4 cursor-pointer transition-all group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-sm font-bold text-zinc-200 truncate pr-2 group-hover:text-indigo-300 transition-colors">{mock.title}</h3>
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            {new Date(mock.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-zinc-950/50 rounded-lg p-2 border border-zinc-800/50">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Score</span>
                            <span className="text-lg font-bold text-indigo-400">{mock.totalScore}</span>
                          </div>
                          <div className="bg-zinc-950/50 rounded-lg p-2 border border-zinc-800/50">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Accuracy</span>
                            <span className="text-lg font-bold text-emerald-400">
                              {mock.attempted > 0 ? Math.round((mock.correct / mock.attempted) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                          <span>{mock.duration} minutes</span>
                          <span>{mock.correct}C / {mock.incorrect}W / {mock.totalQuestions - mock.attempted}S</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {showUploader && (
              <MockTestUploader 
                onUpload={(test) => {
                  actions.addCustomMockTest(test);
                  setShowUploader(false);
                }} 
                onCancel={() => setShowUploader(false)} 
              />
            )}
          </motion.div>
        )}

        {engineState === 'ARENA' && selectedTest && (
          <ModalPortal>
            <motion.div
              key="arena"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#090a0f] flex flex-col"
            >
              <MockTestArena 
                test={selectedTest} 
                onComplete={handleTestComplete}
                onExit={handleReturnToDashboard}
              />
            </motion.div>
          </ModalPortal>
        )}

        {engineState === 'RESULT' && selectedTest && currentAttempt && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto p-6 lg:p-8"
          >
            <MockTestResult 
              test={selectedTest!} 
              attempt={currentAttempt!} 
              onClose={handleReturnToDashboard}
              onNavigate={onNavigate}
            />
          </motion.div>
        )}

        {selectedPastAttempt && (
          <motion.div
            key="past-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#09090b] overflow-y-auto"
          >
            {selectedPastAttempt.testSnapshot && selectedPastAttempt.attemptData ? (
              <div className="p-6 lg:p-8 min-h-screen">
                <MockTestResult 
                  test={selectedPastAttempt.testSnapshot} 
                  attempt={selectedPastAttempt.attemptData} 
                  onClose={() => setSelectedPastAttempt(null)}
                  onNavigate={onNavigate}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-screen p-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Basic Score Log</h3>
                  <p className="text-zinc-400 mb-6 text-sm">This is an externally logged score or older attempt. Detailed question analysis is not available for this record.</p>
                  <button 
                    onClick={() => setSelectedPastAttempt(null)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold transition-colors w-full"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chapter Selector Modal */}
      {showAiSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowAiSelector(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">AI Mini-Mock Setup</h3>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar">
              {['physics', 'chemistry', 'maths'].map(sub => (
                <div key={sub} className="space-y-2">
                  <h4 className="text-xs font-mono font-bold uppercase text-zinc-500 tracking-wider sticky top-0 bg-zinc-950 py-1">{sub}</h4>
                  {state.chapters.filter(c => c.subject === sub).map(chapter => (
                    <button
                      key={chapter.id}
                      onClick={() => {
                        handleGenerateAiMock(chapter.id, chapter.subject, chapter.name);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-indigo-950/30 hover:border-indigo-500/30 hover:text-indigo-300 text-zinc-300 text-sm font-semibold transition-all"
                    >
                      {chapter.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
