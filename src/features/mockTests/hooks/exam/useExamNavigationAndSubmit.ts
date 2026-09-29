import React, { useState, useEffect, useMemo, useRef, useReducer } from 'react';
import { SubjectId } from '../../../../types';
import { MockTest, MockTestAttempt, MockTestAttemptQuestion } from '../../../../types/mockTest';
import { idbGet, idbSet, idbRemove } from '@/utils/idb';
import { examReducer } from '../../utils/examStateMachine';
import { storageAdapter } from '@/services/StorageAdapter';
import { safelyParseJSON } from '@/utils/jsonParser';

export interface UseExamNavigationAndSubmitProps {
  test: MockTest;
  userId: string;
  onComplete: (attempt: MockTestAttempt) => void;
  onExit: () => void;
  targetEndTime: number;
  setTargetEndTime: (time: number) => void;
  currentAnswer: string;
  setCurrentAnswer: (ans: string) => void;
  flushActiveQuestionTime: (qId?: string) => void;
  activeQAccumulatedSecRef: React.MutableRefObject<number>;
  setIsMobilePaletteOpen: (open: boolean) => void;
}

export function useExamNavigationAndSubmit({
  test,
  userId,
  onComplete,
  onExit,
  targetEndTime: _targetEndTime,
  setTargetEndTime,
  currentAnswer,
  setCurrentAnswer,
  flushActiveQuestionTime,
  activeQAccumulatedSecRef,
  setIsMobilePaletteOpen
}: UseExamNavigationAndSubmitProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentSubject, setCurrentSubject] = useState<SubjectId>(test.sections?.[0]?.subject || ('physics' as SubjectId));
  const [currentQIdx, setCurrentQIdx] = useState(0);

  const [attempt, dispatch] = useReducer(examReducer, undefined, () => {
    const initialQuestions: Record<string, MockTestAttemptQuestion> = {};
    (test.sections || []).forEach(sec => {
      (sec.questions || []).forEach((q, idx) => {
        initialQuestions[q.id] = {
          questionId: q.id,
          subject: sec.subject,
          status: (sec.subject === test.sections?.[0]?.subject && idx === 0) ? 'Not Answered' : 'Not Visited',
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

  // Asynchronously load attempt and position on initial mount
  useEffect(() => {
    let active = true;
    (async () => {
      let loadedSubject = test.sections?.[0]?.subject || ('physics' as SubjectId);
      let loadedIdx = 0;
      let loadedEndTime = Date.now() + (test.durationMinutes || 180) * 60000;
      let loadedAttempt: MockTestAttempt | null = null;

      try {
        await new Promise(r => setTimeout(r, 0));

        const savedPos = storageAdapter.getItem<string>(`jeeos_mock_pos_${userId}_${test.id}`);
        if (savedPos) {
          const parsed = typeof savedPos === 'string' ? JSON.parse(savedPos) : savedPos;
          if (parsed.subject) loadedSubject = parsed.subject;
          if (typeof parsed.idx === 'number') loadedIdx = parsed.idx;
        }

        const savedEnd = storageAdapter.getItem<string>(`jeeos_mock_end_${userId}_${test.id}`);
        if (savedEnd) {
          loadedEndTime = parseInt(String(savedEnd), 10);
        } else {
          storageAdapter.setItem(`jeeos_mock_end_${userId}_${test.id}`, loadedEndTime.toString());
        }

        const savedIdb = await idbGet<MockTestAttempt>(`jeeos_mock_attempt_${userId}_${test.id}`);
        if (savedIdb?.questions && Object.keys(savedIdb.questions).length > 0) {
          loadedAttempt = savedIdb;
        } else {
          const savedLocal = storageAdapter.getItem<MockTestAttempt | string>(`jeeos_mock_attempt_${userId}_${test.id}`);
          if (savedLocal) {
            loadedAttempt = typeof savedLocal === 'string'
              ? safelyParseJSON<MockTestAttempt | null>(savedLocal, null)
              : savedLocal;
          }
        }
      } catch(e) {
        console.warn('Failed to load mock metadata asynchronously:', e);
      } finally {
        if (active) {
          setCurrentSubject(loadedSubject);
          setCurrentQIdx(loadedIdx);
          setTargetEndTime(loadedEndTime);
          if (loadedAttempt) {
            dispatch({ type: 'RESTORE_ATTEMPT', attempt: loadedAttempt });
          }
          setIsInitializing(false);
        }
      }
    })();
    return () => { active = false; };
  }, [userId, test.id, test.durationMinutes, test.sections, setTargetEndTime]);

  useEffect(() => {
    if (isInitializing) return;
    try {
      storageAdapter.setItem(`jeeos_mock_pos_${userId}_${test.id}`, JSON.stringify({ subject: currentSubject, idx: currentQIdx }));
    } catch(e) {
      console.warn('Failed to save mock position metadata:', e);
    }
  }, [currentSubject, currentQIdx, userId, test.id, isInitializing]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced asynchronous persist to IndexedDB
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

  const activeSection = useMemo(() => (test.sections || []).find(s => s.subject === currentSubject), [test, currentSubject]);
  const activeQuestion = activeSection?.questions?.[currentQIdx];

  const workspaceScrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll position to top whenever active question changes
  useEffect(() => {
    if (workspaceScrollRef.current) {
      workspaceScrollRef.current.scrollTop = 0;
    }
  }, [activeQuestion?.id]);

  // Load current answer when active question changes
  useEffect(() => {
    if (!activeQuestion) return;
    setCurrentAnswer(attempt.questions[activeQuestion.id]?.selectedAnswer || '');
    dispatch({ type: 'VISIT_QUESTION', questionId: activeQuestion.id });
  }, [activeQuestion?.id, setCurrentAnswer]);

  const navigateToQuestion = (idx: number) => {
    setCurrentQIdx(idx);
    setIsMobilePaletteOpen(false);
  };

  const handleNext = () => {
    if (activeSection && currentQIdx < (activeSection.questions?.length || 0) - 1) {
      setCurrentQIdx(currentQIdx + 1);
    } else if (test.sections) {
      const subIdx = test.sections.findIndex(s => s.subject === currentSubject);
      if (subIdx >= 0 && subIdx < test.sections.length - 1) {
        setCurrentSubject(test.sections[subIdx + 1].subject);
        setCurrentQIdx(0);
      }
    }
  };

  const handlePrev = () => {
    if (currentQIdx > 0) {
      setCurrentQIdx(currentQIdx - 1);
    } else if (test.sections) {
      const subIdx = test.sections.findIndex(s => s.subject === currentSubject);
      if (subIdx > 0) {
        const prevSec = test.sections[subIdx - 1];
        setCurrentSubject(prevSec.subject);
        setCurrentQIdx(Math.max(0, prevSec.questions.length - 1));
      }
    }
  };

  const handleSaveAndNext = () => {
    if (activeQuestion) {
      dispatch({ type: 'SAVE_ANSWER', questionId: activeQuestion.id, answer: currentAnswer });
    }
    handleNext();
  };

  const handleSaveAndMark = () => {
    if (activeQuestion) {
      dispatch({ type: 'MARK_FOR_REVIEW', questionId: activeQuestion.id, answer: currentAnswer });
    }
    handleNext();
  };

  const handleMarkForReview = () => {
    handleSaveAndMark();
  };

  const handleClear = () => {
    if (activeQuestion) {
      setCurrentAnswer('');
      dispatch({ type: 'CLEAR_RESPONSE', questionId: activeQuestion.id });
    }
  };

  const handleSubmitTest = () => {
    if (isSubmittingRef.current || isSubmitting) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    
    flushActiveQuestionTime();
    const currentQId = activeQuestion?.id;
    const unflushedSecs = activeQAccumulatedSecRef.current;
    activeQAccumulatedSecRef.current = 0;

    const finalAttempt = {
      ...attempt,
      endTime: new Date().toISOString(),
      questions: { ...attempt.questions }
    };
    
    if (currentQId && finalAttempt.questions[currentQId]) {
      const currentQ = finalAttempt.questions[currentQId];
      let updatedSelectedAnswer = currentQ.selectedAnswer;
      let updatedStatus = currentQ.status;

      if (currentAnswer && currentAnswer.trim().length > 0) {
        updatedSelectedAnswer = currentAnswer;
        if (currentQ.status === 'Marked for Review') {
          updatedStatus = 'Answered & Marked for Review';
        } else if (currentQ.status !== 'Answered & Marked for Review') {
          updatedStatus = 'Answered';
        }
      }

      finalAttempt.questions[currentQId] = {
        ...currentQ,
        selectedAnswer: updatedSelectedAnswer,
        status: updatedStatus,
        timeSpentSeconds: (currentQ.timeSpentSeconds || 0) + Math.max(0, unflushedSecs)
      };
    }

    try {
      storageAdapter.removeItem(`jeeos_mock_attempt_${userId}_${test.id}`);
      storageAdapter.removeItem(`jeeos_mock_end_${userId}_${test.id}`);
      storageAdapter.removeItem(`jeeos_mock_pos_${userId}_${test.id}`);
      storageAdapter.removeItem(`jeeos_mock_infractions_${userId}_${test.id}`);
      storageAdapter.removeItem(`jeeos_active_tab_${userId}_${test.id}`);
    } catch(e) {
      console.warn("Storage removal warning:", e);
    }
    idbRemove(`jeeos_mock_attempt_${userId}_${test.id}`).catch(e => console.warn("IDB removal warning:", e));

    setTimeout(() => {
      onComplete(finalAttempt);
    }, 400);
  };

  const handleConfirmExitAndDiscard = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsConfirmExitOpen(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      storageAdapter.removeItem(`jeeos_mock_attempt_${userId}_${test.id}`);
      storageAdapter.removeItem(`jeeos_mock_end_${userId}_${test.id}`);
      storageAdapter.removeItem(`jeeos_mock_pos_${userId}_${test.id}`);
      storageAdapter.removeItem(`jeeos_mock_infractions_${userId}_${test.id}`);
    } catch(e) {
      console.warn("Storage removal warning:", e);
    }
    idbRemove(`jeeos_mock_attempt_${userId}_${test.id}`).catch(e => console.warn("IDB removal warning:", e));
    onExit();
  };

  // Aggregated status counts for the current test
  const { questionAttempts, counts } = useMemo(() => {
    const list = Object.values(attempt.questions) as MockTestAttemptQuestion[];
    return {
      questionAttempts: list,
      counts: {
        answered: list.filter(q => q.status === 'Answered').length,
        notAnswered: list.filter(q => q.status === 'Not Answered').length,
        notVisited: list.filter(q => q.status === 'Not Visited').length,
        markedReview: list.filter(q => q.status === 'Marked for Review').length,
        answeredMarked: list.filter(q => q.status === 'Answered & Marked for Review').length,
      }
    };
  }, [attempt.questions]);

  return {
    isInitializing,
    currentSubject,
    setCurrentSubject,
    currentQIdx,
    setCurrentQIdx,
    attempt,
    dispatch,
    isSubmitting,
    isConfirmSubmitOpen,
    setIsConfirmSubmitOpen,
    isConfirmExitOpen,
    setIsConfirmExitOpen,
    activeSection,
    activeQuestion,
    workspaceScrollRef,
    navigateToQuestion,
    handleNext,
    handlePrev,
    handleSaveAndNext,
    handleSaveAndMark,
    handleMarkForReview,
    handleClear,
    handleSubmitTest,
    handleConfirmExitAndDiscard,
    questionAttempts,
    counts
  };
}
