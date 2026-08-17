import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, User, X, Check, Bookmark, Target, AlertCircle, AlertTriangle, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import { SubjectId } from '../../types';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { MockTest, MockTestAttempt, MockTestAttemptQuestion, QuestionStatus } from '../../types/mockTest';
import { MissionMode } from '../mission/MissionMode';
import { RichTextRenderer } from '@/components/MathRenderer';
import { useAuth } from '@/features/auth';
import { idbGet, idbSet, idbRemove } from '@/utils/idb';

interface MockTestArenaProps {
  test: MockTest;
  onComplete: (attempt: MockTestAttempt) => void;
  onExit: () => void;
}

export function MockTestArena({ test, onComplete, onExit }: MockTestArenaProps) {
  const { user } = useAuth();
  const userId = user?.uid || 'guest';
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<SubjectId>(() => {
    try {
      const saved = localStorage.getItem(`jeeos_mock_pos_${userId}_${test.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.subject) return parsed.subject;
      }
    } catch(e) {}
    return test.sections[0].subject;
  });

  const [currentQIdx, setCurrentQIdx] = useState(() => {
    try {
      const saved = localStorage.getItem(`jeeos_mock_pos_${userId}_${test.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.idx === 'number') return parsed.idx;
      }
    } catch(e) {}
    return 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`jeeos_mock_pos_${userId}_${test.id}`, JSON.stringify({ subject: currentSubject, idx: currentQIdx }));
    } catch(e) {
      console.warn('Failed to save mock position metadata:', e);
    }
  }, [currentSubject, currentQIdx, userId, test.id]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  const [targetEndTime] = useState(() => {
    try {
      const saved = localStorage.getItem(`jeeos_mock_end_${userId}_${test.id}`);
      if (saved) return parseInt(saved, 10);
    } catch(e) {}
    const end = Date.now() + test.durationMinutes * 60000;
    try {
      localStorage.setItem(`jeeos_mock_end_${userId}_${test.id}`, end.toString());
    } catch(e) {
      console.warn('Failed to save mock end time metadata:', e);
    }
    return end;
  });

  const [timeLeft, setTimeLeft] = useState(() => {
    return Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000));
  });

  // Initialize attempt state
  const [attempt, setAttempt] = useState<MockTestAttempt>(() => {
    try {
      const saved = localStorage.getItem(`jeeos_mock_attempt_${userId}_${test.id}`);
      if (saved) return JSON.parse(saved);
    } catch(e) {
      console.error('Failed to load mock attempt from local storage fallback', e);
    }

    const initialQuestions: Record<string, MockTestAttemptQuestion> = {};
    test.sections.forEach(sec => {
      sec.questions.forEach((q, idx) => {
        initialQuestions[q.id] = {
          questionId: q.id,
          subject: sec.subject,
          status: (sec.subject === test.sections[0].subject && idx === 0) ? 'Not Answered' : 'Not Visited',
          timeSpentSeconds: 0
        };
      });
    });
    return {
      testId: test.id,
      startTime: new Date().toISOString(),
      questions: initialQuestions
    };
  });

  // Asynchronously load attempt from IndexedDB on initial mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const savedIdb = await idbGet<MockTestAttempt>(`jeeos_mock_attempt_${userId}_${test.id}`);
        if (active && savedIdb && savedIdb.questions && Object.keys(savedIdb.questions).length > 0) {
          setAttempt(savedIdb);
        }
      } catch (e) {
        console.warn('Failed to load mock attempt from IndexedDB:', e);
      }
    })();
    return () => {
      active = false;
    };
  }, [test.id, userId]);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced asynchronous persist to IndexedDB to eliminate LocalStorage 5MB quota crash
  useEffect(() => {
    if (isSubmitting) return;
    saveTimerRef.current = setTimeout(() => {
      idbSet(`jeeos_mock_attempt_${userId}_${test.id}`, attempt).catch(err => {
        console.warn('IndexedDB mock save warning:', err);
      });
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [attempt, test.id, userId, isSubmitting]);

  const [currentAnswer, setCurrentAnswer] = useState<string>('');

  const activeSection = useMemo(() => test.sections.find(s => s.subject === currentSubject)!, [test, currentSubject]);
  const activeQuestion = activeSection.questions[currentQIdx];



  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);

  // Comprehensive Keyboard Navigation (CBT High-Speed Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      // Handle Escape for exit modal
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.warn(err));
        }
        setIsConfirmExitOpen(true);
        return;
      }

      // Enter key saves & navigates next
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveAndNext();
        return;
      }

      // Alt + Section switching (Alt+1: Physics, Alt+2: Chemistry, Alt+3: Mathematics)
      if (e.altKey && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const targetSecIdx = parseInt(e.key, 10) - 1;
        if (test.sections[targetSecIdx]) {
          setCurrentSubject(test.sections[targetSecIdx].subject);
          setCurrentQIdx(0);
        }
        return;
      }

      // Alt+S: Save & Next
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveAndNext();
        return;
      }

      // Alt+M: Save & Mark for Review
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleSaveAndMark();
        return;
      }

      // Alt+C: Clear Response
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleClear();
        return;
      }

      // Don't intercept single character shortcuts if typing in numerical input
      if (isInput) return;

      // Arrow keys for rapid flipping
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentQIdx > 0) setCurrentQIdx(currentQIdx - 1);
        return;
      }

      // Option selection for MCQ via 1-4 or A-D
      if (activeQuestion.type === 'MCQ') {
        const keyUpper = e.key.toUpperCase();
        let selectedIdx: number | null = null;
        if (['1', '2', '3', '4'].includes(e.key)) {
          selectedIdx = parseInt(e.key, 10) - 1;
        } else if (['A', 'B', 'C', 'D'].includes(keyUpper)) {
          selectedIdx = keyUpper.charCodeAt(0) - 65;
        }

        if (selectedIdx !== null && activeQuestion.options && selectedIdx < activeQuestion.options.length) {
          e.preventDefault();
          setCurrentAnswer(selectedIdx.toString());
        }
      }

      // Backspace or Delete to clear
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentQIdx, activeSection, currentSubject, currentAnswer, activeQuestion, test.sections]);

  // Load current answer when question changes
  useEffect(() => {
    setCurrentAnswer(attempt.questions[activeQuestion.id].selectedAnswer || '');
    
    // Mark as Not Answered if it was Not Visited
    if (attempt.questions[activeQuestion.id].status === 'Not Visited') {
      updateQuestionState(activeQuestion.id, { status: 'Not Answered' });
    }
  }, [activeQuestion.id]);

  const entryTimeRef = useRef<number>(Date.now());
  const activeQuestionIdRef = useRef<string>(activeQuestion.id);

  // Timer logic - Global countdown only
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetEndTime]);

  // Auto-submit when time is up
  useEffect(() => {
    if (timeLeft <= 0 && !isSubmitting) {
      handleSubmitTest();
    }
  }, [timeLeft, isSubmitting]);

  // Track time spent per question
  useEffect(() => {
    entryTimeRef.current = Date.now();
    activeQuestionIdRef.current = activeQuestion.id;

    return () => {
      const timeSpent = Math.floor((Date.now() - entryTimeRef.current) / 1000);
      if (timeSpent > 0) {
        setAttempt(prev => {
          const qId = activeQuestionIdRef.current;
          if (!prev.questions[qId]) return prev;
          return {
            ...prev,
            questions: {
              ...prev.questions,
              [qId]: {
                ...prev.questions[qId],
                timeSpentSeconds: (prev.questions[qId].timeSpentSeconds || 0) + timeSpent
              }
            }
          };
        });
      }
    };
  }, [activeQuestion.id]);

  const updateQuestionState = (qId: string, update: Partial<MockTestAttemptQuestion>) => {
    setAttempt(prev => ({
      ...prev,
      questions: {
        ...prev.questions,
        [qId]: { ...prev.questions[qId], ...update }
      }
    }));
  };

  const navigateToQuestion = (idx: number) => {
    setCurrentQIdx(idx);
    setIsMobilePaletteOpen(false);
  };

  const handleNext = () => {
    if (currentQIdx < activeSection.questions.length - 1) {
      setCurrentQIdx(currentQIdx + 1);
    } else {
      // Find next subject
      const subIdx = test.sections.findIndex(s => s.subject === currentSubject);
      if (subIdx < test.sections.length - 1) {
        setCurrentSubject(test.sections[subIdx + 1].subject);
        setCurrentQIdx(0);
      }
    }
  };

  const handleSaveAndNext = () => {
    const newStatus = currentAnswer ? 'Answered' : 'Not Answered';
    updateQuestionState(activeQuestion.id, { status: newStatus, selectedAnswer: currentAnswer });
    handleNext();
  };

  const handleSaveAndMark = () => {
    const newStatus = currentAnswer ? 'Answered & Marked for Review' : 'Marked for Review';
    updateQuestionState(activeQuestion.id, { status: newStatus, selectedAnswer: currentAnswer });
    handleNext();
  };

  const handleMarkForReview = () => {
    const newStatus = currentAnswer ? 'Answered & Marked for Review' : 'Marked for Review';
    updateQuestionState(activeQuestion.id, { status: newStatus, selectedAnswer: currentAnswer });
    handleNext();
  };

  const handleClear = () => {
    setCurrentAnswer('');
    updateQuestionState(activeQuestion.id, { status: 'Not Answered', selectedAnswer: '' });
  };

  const handleSubmitTest = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    
    // Add time for current question before submitting
    const timeSpent = Math.floor((Date.now() - entryTimeRef.current) / 1000);
    
    const finalAttempt = {
      ...attempt,
      endTime: new Date().toISOString(),
      questions: { ...attempt.questions }
    };
    
    if (timeSpent > 0 && finalAttempt.questions[activeQuestion.id]) {
      finalAttempt.questions[activeQuestion.id] = {
        ...finalAttempt.questions[activeQuestion.id],
        timeSpentSeconds: finalAttempt.questions[activeQuestion.id].timeSpentSeconds + timeSpent
      };
    }

    try {
      localStorage.removeItem(`jeeos_mock_attempt_${userId}_${test.id}`);
      localStorage.removeItem(`jeeos_mock_end_${userId}_${test.id}`);
      localStorage.removeItem(`jeeos_mock_pos_${userId}_${test.id}`);
    } catch(e) {
      console.warn("Storage removal warning:", e);
    }
    idbRemove(`jeeos_mock_attempt_${userId}_${test.id}`).catch(e => console.warn("IDB removal warning:", e));

    // Let animation play for a split second
    setTimeout(() => {
      onComplete(finalAttempt);
    }, 500);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: QuestionStatus) => {
    switch (status) {
      case 'Answered': return 'bg-emerald-500 text-white';
      case 'Not Answered': return 'bg-rose-500 text-white';
      case 'Marked for Review': return 'bg-indigo-500 text-white rounded-full';
      case 'Answered & Marked for Review': return 'bg-indigo-500 text-white rounded-full border-2 border-emerald-400 relative after:content-[""] after:absolute after:w-2 after:h-2 after:bg-emerald-400 after:rounded-full after:-bottom-0.5 after:-right-0.5';
      default: return 'bg-zinc-200 text-zinc-800'; // Not visited
    }
  };

  return (
    <Modal isOpen={true} onClose={onExit} zIndex={50} backdropClassName="bg-[#020202] text-zinc-300 font-sans flex overflow-hidden" className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 md:p-6 gap-6 max-w-[1600px] mx-auto w-full bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10">
        {/* Left Panel: Question Area */}
        <div className="flex-1 flex flex-col bg-[#070708] rounded-[22px] border border-zinc-800/50 shadow-2xl overflow-hidden">
          {/* Subject Tabs */}
          <div className="flex border-b border-zinc-800 bg-[#0c0c0e]">
            {test.sections.map(sec => (
              <button
                key={sec.subject}
                onClick={() => {
                  setCurrentSubject(sec.subject);
                  setCurrentQIdx(0);
                }}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                  currentSubject === sec.subject
                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)] z-10 border-b-2 border-indigo-400'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {sec.subject}
              </button>
            ))}
          </div>

          {/* Question Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4 gap-2 flex-wrap">
              <div className="flex items-center gap-2 sm:gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-zinc-100">Question {currentQIdx + 1}</h2>
                <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-500">of {activeSection.questions.length}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Mobile Palette Drawer Toggle */}
                <button
                  onClick={() => setIsMobilePaletteOpen(prev => !prev)}
                  className="lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-mono text-xs font-bold transition-colors cursor-pointer"
                  title="Toggle Question Palette"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Palette</span>
                  <span className="text-[10px] bg-indigo-500/30 px-1 rounded">{currentQIdx + 1}/{activeSection.questions.length}</span>
                  {isMobilePaletteOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Mobile Timer Display */}
                <div className={`lg:hidden flex items-center gap-1 font-mono text-xs font-bold px-2 py-1 rounded-md ${
                  timeLeft < 300 ? 'text-rose-400 bg-rose-950/60 border border-rose-500/40' : 'text-emerald-400 bg-zinc-900 border border-zinc-800'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(timeLeft)}</span>
                </div>

                <span className="hidden sm:inline-block text-xs font-mono bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-400">
                  {activeQuestion.type === 'MCQ' ? 'Multiple Choice' : 'Numerical'}
                </span>
                <span className="text-xs font-mono bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded text-indigo-400">
                  +{activeQuestion.marks.correct} / {activeQuestion.marks.incorrect}
                </span>
              </div>
            </div>

            <div className="text-base text-zinc-300 leading-relaxed mb-8">
              <RichTextRenderer content={activeQuestion.content} />
            </div>

            {/* Answer Input Area */}
            <div className="mt-auto max-w-xl">
              {activeQuestion.type === 'MCQ' ? (
                <div className="space-y-2.5">
                  {activeQuestion.options?.map((opt, idx) => {
                    const optionLetter = String.fromCharCode(65 + idx);
                    const isSelected = currentAnswer === idx.toString();
                    return (
                      <label 
                        key={idx}
                        className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-md'
                            : 'bg-[#121318] border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`q-${activeQuestion.id}`}
                          checked={isSelected}
                          onChange={() => setCurrentAnswer(idx.toString())}
                          className="hidden"
                        />
                        <div className={`w-6 h-6 rounded-lg border flex-shrink-0 flex items-center justify-center font-mono text-xs font-bold ${
                          isSelected 
                            ? 'bg-indigo-500 text-white border-indigo-400' 
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                        }`}>
                          {optionLetter}
                        </div>
                        <span className="text-sm font-medium flex-1"><RichTextRenderer content={opt} /></span>
                        <kbd className="hidden sm:inline-block text-[9px] font-mono text-zinc-400 bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800">
                          {idx + 1}
                        </kbd>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Enter numerical answer (Press Enter to Save):
                  </label>
                  <input 
                    type="number"
                    value={currentAnswer === 0 ? '' : currentAnswer} placeholder="0"
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="e.g. 40"
                    className="w-full bg-[#121318] border border-zinc-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-lg font-mono text-white focus:outline-none transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Footer with Accelerator Badges */}
          <div className="bg-[#0c0c0e] border-t border-zinc-800 p-3 sm:p-4 flex flex-wrap gap-2.5 sm:gap-3 shrink-0">
            <button 
              onClick={handleSaveAndNext} 
              className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <span>Save & Next</span>
              <kbd className="hidden sm:inline bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded text-[9px]">↵</kbd>
            </button>
            <button 
              onClick={handleClear} 
              className="flex-1 min-w-[120px] py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono font-bold uppercase tracking-wider transition-all border border-zinc-700/80 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>Clear</span>
              <kbd className="hidden sm:inline bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px]">⌫</kbd>
            </button>
            <button 
              onClick={handleSaveAndMark} 
              className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <span>Save & Mark</span>
              <kbd className="hidden sm:inline bg-indigo-800/80 text-indigo-200 px-1.5 py-0.5 rounded text-[9px]">Alt+M</kbd>
            </button>
            <button 
              onClick={handleMarkForReview} 
              className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <span>Mark & Next</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Palette & Profile (Collapsible Drawer on Mobile, Docked Sidebar on Desktop) */}
        <div className={`w-full lg:w-80 bg-[#121318] border-t lg:border-l lg:border-t-0 border-zinc-800 flex flex-col shrink-0 rounded-xl lg:rounded-none lg:rounded-r-[22px] transition-all duration-200 overflow-hidden ${
          isMobilePaletteOpen 
            ? 'max-h-[65vh] flex shadow-2xl border-indigo-500/40 ring-1 ring-indigo-500/20' 
            : 'hidden lg:flex max-h-full'
        }`}>
          {/* Profile & Timer Area */}
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-200">Candidate</div>
                  <div className="text-xs text-zinc-400">JEE Main Aspirant</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-zinc-900/80 rounded-xl p-3 border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Time Left</span>
              </div>
              <div className={`font-mono text-xl font-black tracking-wider ${
                timeLeft < 300 
                  ? 'text-rose-400 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-md shadow-sm' 
                  : 'text-emerald-400'
              }`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div className="p-4 border-b border-zinc-800 grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-white">
                {(Object.values(attempt.questions) as MockTestAttemptQuestion[]).filter(q => q.status === 'Answered').length}
              </div>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-rose-500 rounded flex items-center justify-center text-white">
                {(Object.values(attempt.questions) as MockTestAttemptQuestion[]).filter(q => q.status === 'Not Answered').length}
              </div>
              <span>Not Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-zinc-200 rounded flex items-center justify-center text-zinc-800">
                {(Object.values(attempt.questions) as MockTestAttemptQuestion[]).filter(q => q.status === 'Not Visited').length}
              </div>
              <span>Not Visited</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white">
                {(Object.values(attempt.questions) as MockTestAttemptQuestion[]).filter(q => q.status === 'Marked for Review').length}
              </div>
              <span>Marked Review</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <div className="w-6 h-6 bg-indigo-500 rounded-full border-2 border-emerald-400 relative after:content-[''] after:absolute after:w-1.5 after:h-1.5 after:bg-emerald-400 after:rounded-full after:-bottom-0.5 after:-right-0.5 flex items-center justify-center text-white">
                {(Object.values(attempt.questions) as MockTestAttemptQuestion[]).filter(q => q.status === 'Answered & Marked for Review').length}
              </div>
              <span>Answered & Marked Review (will be evaluated)</span>
            </div>
          </div>

          {/* Palette */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#090a0f]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">{currentSubject} Palette</h3>
            <div className="grid grid-cols-5 gap-2">
              {activeSection.questions.map((q, idx) => {
                const entry = attempt.questions[q.id];
                const status = entry?.status ?? 'Not Visited';
                const colorClass = getStatusColor(status);
                const isCurrent = currentQIdx === idx;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => navigateToQuestion(idx)}
                    className={`h-10 text-xs font-bold flex items-center justify-center transition-transform ${colorClass} ${
                      isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-[#090a0f] scale-110 z-10' : 'hover:opacity-80'
                    } ${
                      status === 'Not Visited' || status === 'Not Answered' || status === 'Answered' ? 'rounded' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            {/* Added Submit Test Button for MissionMode layout */}
            <div className="mt-8 pt-4 border-t border-zinc-800/50">
              <button 
                onClick={() => setIsConfirmSubmitOpen(true)}
                className="w-full py-3 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono tracking-widest uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Submit Exam Early
              </button>
            </div>
          </div>
        </div>

      <Modal
        isOpen={isConfirmSubmitOpen}
        onClose={() => setIsConfirmSubmitOpen(false)}
        className="max-w-md bg-zinc-950 border border-emerald-500/30 p-6 rounded-2xl shadow-2xl"
      >
        <div className="flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-white">Submit Exam Early?</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Are you sure you want to finish and submit your exam now? All answered questions will be scored and recorded.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              onClick={() => setIsConfirmSubmitOpen(false)}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsConfirmSubmitOpen(false);
                handleSubmitTest();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-colors shadow-lg cursor-pointer"
            >
              Yes, Submit Exam
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isConfirmExitOpen}
        onClose={() => setIsConfirmExitOpen(false)}
        className="max-w-md bg-zinc-950 border border-amber-500/30 p-6 rounded-2xl shadow-2xl"
      >
        <div className="flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-white">Exit Mock Test?</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Are you sure you want to exit? Your exam progress will not be saved.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              onClick={() => setIsConfirmExitOpen(false)}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono transition-colors cursor-pointer"
            >
              Resume Exam
            </button>
            <button
              onClick={() => {
                setIsConfirmExitOpen(false);
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                try {
                  localStorage.removeItem(`jeeos_mock_attempt_${userId}_${test.id}`);
                  localStorage.removeItem(`jeeos_mock_end_${userId}_${test.id}`);
                  localStorage.removeItem(`jeeos_mock_pos_${userId}_${test.id}`);
                } catch(e) {
                  console.warn("Storage removal warning:", e);
                }
                idbRemove(`jeeos_mock_attempt_${userId}_${test.id}`).catch(e => console.warn("IDB removal warning:", e));
                onExit();
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors shadow-lg cursor-pointer"
            >
              Exit & Discard
            </button>
          </div>
        </div>
      </Modal>
      {isSubmitting && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-[22px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-emerald-400 font-mono font-bold uppercase tracking-widest animate-pulse">Submitting Exam...</div>
          </div>
        </div>
      )}
    </Modal>
  );
}
