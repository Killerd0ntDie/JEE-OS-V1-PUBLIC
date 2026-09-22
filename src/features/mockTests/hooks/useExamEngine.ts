import { useState, useEffect, useMemo, useRef, useReducer } from 'react';
import { SubjectId } from '../../../types';
import { MockTest, MockTestAttempt, MockTestAttemptQuestion } from '../../../types/mockTest';
import { idbGet, idbSet, idbRemove } from '@/utils/idb';
import { TriageCategory } from '../components/LiveStrategyTriageOverlay';
import { isMultiChoiceQuestion } from '@/utils/mockScoring';
import { examReducer } from '../utils/examStateMachine';

export interface UseExamEngineProps {
  test: MockTest;
  userId: string;
  initialExamStarted?: boolean;
  onComplete: (attempt: MockTestAttempt) => void;
  onExit: () => void;
}

export function useExamEngine({
  test,
  userId,
  initialExamStarted = false,
  onComplete,
  onExit
}: UseExamEngineProps) {
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [isQuestionPaperOpen, setIsQuestionPaperOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [isAuthenticTheme, setIsAuthenticTheme] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('jeeos_mock_theme') === 'nta-classic';
    } catch {
      return false;
    }
  });

  const toggleTheme = () => {
    setIsAuthenticTheme(prev => {
      const next = !prev;
      try {
        localStorage.setItem('jeeos_mock_theme', next ? 'nta-classic' : 'dark');
      } catch {}
      return next;
    });
  };

  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof document === 'undefined') return false;
    if (typeof document.documentElement.requestFullscreen !== 'function') return true;
    return !!document.fullscreenElement;
  });

  const [isExamStarted, setIsExamStarted] = useState(() => {
    if (initialExamStarted) return true;
    if (typeof document === 'undefined') return true;
    if (typeof document.documentElement.requestFullscreen !== 'function') return true;
    return !!document.fullscreenElement;
  });

  const [proctorWarnings, setProctorWarnings] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(`jeeos_mock_infractions_${userId}_${test.id}`);
        return saved ? Math.max(0, parseInt(saved, 10)) : 0;
      }
    } catch {}
    return 0;
  });

  const [isProctorAlertOpen, setIsProctorAlertOpen] = useState(false);
  const [proctorAlertMessage, setProctorAlertMessage] = useState('');
  const [triageMap, setTriageMap] = useState<Record<string, TriageCategory>>({});
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentSubject, setCurrentSubject] = useState<SubjectId>(test.sections?.[0]?.subject || ('physics' as SubjectId));
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [targetEndTime, setTargetEndTime] = useState(Date.now() + (test.durationMinutes || 180) * 60000);

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

        const savedPos = localStorage.getItem(`jeeos_mock_pos_${userId}_${test.id}`);
        if (savedPos) {
          const parsed = JSON.parse(savedPos);
          if (parsed.subject) loadedSubject = parsed.subject;
          if (typeof parsed.idx === 'number') loadedIdx = parsed.idx;
        }

        const savedEnd = localStorage.getItem(`jeeos_mock_end_${userId}_${test.id}`);
        if (savedEnd) {
          loadedEndTime = parseInt(savedEnd, 10);
        } else {
          localStorage.setItem(`jeeos_mock_end_${userId}_${test.id}`, loadedEndTime.toString());
        }

        const savedIdb = await idbGet<MockTestAttempt>(`jeeos_mock_attempt_${userId}_${test.id}`);
        if (savedIdb && savedIdb.questions && Object.keys(savedIdb.questions).length > 0) {
          loadedAttempt = savedIdb;
        } else {
          const savedLocal = localStorage.getItem(`jeeos_mock_attempt_${userId}_${test.id}`);
          if (savedLocal) {
            loadedAttempt = JSON.parse(savedLocal);
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
  }, [userId, test.id, test.durationMinutes, test.sections]);

  useEffect(() => {
    if (isInitializing) return;
    try {
      localStorage.setItem(`jeeos_mock_pos_${userId}_${test.id}`, JSON.stringify({ subject: currentSubject, idx: currentQIdx }));
    } catch(e) {
      console.warn('Failed to save mock position metadata:', e);
    }
  }, [currentSubject, currentQIdx, userId, test.id, isInitializing]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');

  const tabIdRef = useRef<string>(Math.random().toString(36).substring(2) + '_' + Date.now());
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

  // Synchronous backup on sudden tab close/refresh to eliminate the 400ms debounce data loss window
  useEffect(() => {
    if (isSubmitting) return;
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem(`jeeos_mock_attempt_${userId}_${test.id}`, JSON.stringify(attempt));
      } catch (e) {
        console.warn('Failed to save synchronous attempt dump on unload:', e);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attempt, test.id, userId, isSubmitting]);

  const activeSection = useMemo(() => (test.sections || []).find(s => s.subject === currentSubject), [test, currentSubject]);
  const activeQuestion = activeSection?.questions?.[currentQIdx];

  const infractionsRef = useRef(proctorWarnings);
  const lastViolationTimeRef = useRef(0);
  const handleSubmitTestRef = useRef<() => void>(() => {});
  const workspaceScrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll position to top whenever active question changes
  useEffect(() => {
    if (workspaceScrollRef.current) {
      workspaceScrollRef.current.scrollTop = 0;
    }
  }, [activeQuestion?.id]);

  // Enforce locked state if previously reached 3 infractions (blocks F5 bypass)
  useEffect(() => {
    if (proctorWarnings >= 3 && !isSubmitting) {
      setProctorAlertMessage('Maximum infractions previously reached (3/3). This exam is locked and being submitted.');
      setIsProctorAlertOpen(true);
      const timer = setTimeout(() => {
        handleSubmitTestRef.current();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const triggerProctorInfraction = (reason: string) => {
    if (isSubmitting) return;
    const now = Date.now();
    // Debounce duplicate events within 2.5s
    if (now - lastViolationTimeRef.current < 2500) return;
    lastViolationTimeRef.current = now;

    infractionsRef.current += 1;
    const count = infractionsRef.current;
    setProctorWarnings(count);
    try {
      localStorage.setItem(`jeeos_mock_infractions_${userId}_${test.id}`, count.toString());
    } catch {}

    if (count >= 3) {
      setProctorAlertMessage(`${reason}\n\nMaximum infractions reached (3/3). Your exam is being automatically submitted for review.`);
      setIsProctorAlertOpen(true);
      setTimeout(() => {
        handleSubmitTestRef.current();
      }, 2500);
    } else {
      setProctorAlertMessage(`${reason}\n\nWarning ${count} of 3. Repeated tab switching, minimizing, or exiting fullscreen will result in immediate automatic submission.`);
      setIsProctorAlertOpen(true);
    }
  };

  // Fullscreen helper functions
  const enterFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (typeof document.documentElement.requestFullscreen === 'function') {
      document.documentElement.requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          setIsExamStarted(true);
          if ('keyboard' in navigator && typeof (navigator as any).keyboard?.lock === 'function') {
            (navigator as any).keyboard.lock(['Escape']).catch(() => {});
          }
        })
        .catch(err => {
          console.warn("Fullscreen request error:", err);
          setIsFullscreen(true);
          setIsExamStarted(true);
        });
    } else {
      setIsFullscreen(true);
      setIsExamStarted(true);
    }
  };

  const handleBeginExam = () => {
    let newEndTime = targetEndTime;
    try {
      const savedEnd = localStorage.getItem(`jeeos_mock_end_${userId}_${test.id}`);
      if (savedEnd) {
        const parsed = parseInt(savedEnd, 10);
        if (Number.isFinite(parsed) && parsed > Date.now()) {
          newEndTime = parsed;
        } else if (Number.isFinite(parsed) && parsed <= Date.now()) {
          handleSubmitTest();
          return;
        }
      } else {
        newEndTime = Date.now() + (test.durationMinutes || 180) * 60000;
        localStorage.setItem(`jeeos_mock_end_${userId}_${test.id}`, newEndTime.toString());
      }
    } catch (e) {
      console.warn("Failed to persist end time:", e);
    }
    setTargetEndTime(newEndTime);
    setIsExamStarted(true);
    enterFullscreen();
  };

  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      enterFullscreen();
    } else {
      if (typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  // 1. Mount & Cleanup: Lock screen, hide dock
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('in-mock-test');

    if (document.fullscreenElement) {
      setIsFullscreen(true);
      setIsExamStarted(true);
      if ('keyboard' in navigator && typeof (navigator as any).keyboard?.lock === 'function') {
        (navigator as any).keyboard.lock(['Escape']).catch(() => {});
      }
    }

    return () => {
      document.body.classList.remove('in-mock-test');
      if ('keyboard' in navigator && typeof (navigator as any).keyboard?.unlock === 'function') {
        (navigator as any).keyboard.unlock();
      }
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // 2. Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && !isSubmitting && !isInitializing && isExamStarted) {
        triggerProctorInfraction("You exited Fullscreen Mode! CBT guidelines require active continuous fullscreen throughout the test.");
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isSubmitting, isInitializing, isExamStarted]);

  // Modal overlay tracking for keyboard handling and proctor anti-cheat protection
  const isAnyModalOpen = isQuestionPaperOpen || isInstructionsOpen || isShortcutsOpen || isConfirmSubmitOpen || isConfirmExitOpen || isProctorAlertOpen || showPrintModal || isDuplicateTab;
  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  isAnyModalOpenRef.current = isAnyModalOpen;

  // 3. Tab switching & window blur listeners
  useEffect(() => {
    if (isInitializing || !isExamStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmitting) {
        triggerProctorInfraction("Tab switched or browser minimized! You must stay on the exam screen.");
      }
    };

    const handleWindowBlur = () => {
      if (isSubmitting || isAnyModalOpenRef.current || document.hidden) {
        return;
      }
      setTimeout(() => {
        if (!document.hasFocus() && !document.hidden && !isSubmitting && !isAnyModalOpenRef.current) {
          triggerProctorInfraction("Focus lost from exam window! Switching applications or tabs is prohibited.");
        }
      }, 150);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isSubmitting, isInitializing, isProctorAlertOpen, isExamStarted]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((!isFullscreen || !isExamStarted) && !isInitializing) return;

      if (e.key === 'Escape') {
        if (isShortcutsOpen) { setIsShortcutsOpen(false); return; }
        if (isQuestionPaperOpen) { setIsQuestionPaperOpen(false); return; }
        if (isInstructionsOpen) { setIsInstructionsOpen(false); return; }
        if (isConfirmSubmitOpen) { setIsConfirmSubmitOpen(false); return; }
        if (isConfirmExitOpen) { setIsConfirmExitOpen(false); return; }
        if (showPrintModal) { setShowPrintModal(false); return; }
      }

      if (isAnyModalOpen) return;

      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (!isInput && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveAndNext();
        return;
      }

      // Alt + 1/2/3 or Ctrl + Shift + 1/2/3 for subject switching
      if ((e.altKey || (e.ctrlKey && e.shiftKey)) && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const targetSecIdx = parseInt(e.key, 10) - 1;
        if (test.sections?.[targetSecIdx]) {
          setCurrentSubject(test.sections[targetSecIdx].subject);
          setCurrentQIdx(0);
        }
        return;
      }

      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveAndNext();
        return;
      }

      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleSaveAndMark();
        return;
      }

      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleClear();
        return;
      }

      if (isInput) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
        return;
      }

      if (activeQuestion?.type === 'MCQ' || activeQuestion?.type === 'MULTI' || (activeQuestion?.options && activeQuestion.options.length > 0)) {
        const keyUpper = e.key.toUpperCase();
        let selectedIdx: number | null = null;
        if (['1', '2', '3', '4'].includes(e.key)) {
          selectedIdx = parseInt(e.key, 10) - 1;
        } else if (['A', 'B', 'C', 'D'].includes(keyUpper)) {
          selectedIdx = keyUpper.charCodeAt(0) - 65;
        }

        if (selectedIdx !== null && activeQuestion.options && selectedIdx < activeQuestion.options.length) {
          e.preventDefault();
          if (isMultiChoiceQuestion(activeQuestion)) {
            const letter = String.fromCharCode(65 + selectedIdx);
            let currentLetters = (currentAnswer || '')
              .replace(/[^A-D]/gi, '')
              .toUpperCase()
              .split('');
            if (currentLetters.length === 0 && currentAnswer) {
              currentLetters = (currentAnswer.match(/[0-3]/g) || []).map(n => String.fromCharCode(65 + parseInt(n, 10)));
            }
            if (currentLetters.includes(letter)) {
              currentLetters = currentLetters.filter(l => l !== letter);
            } else {
              currentLetters.push(letter);
            }
            currentLetters.sort();
            setCurrentAnswer(currentLetters.join(''));
          } else {
            setCurrentAnswer(selectedIdx.toString());
          }
        }
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentQIdx, activeSection, currentSubject, currentAnswer, activeQuestion, test.sections,
    isFullscreen, isExamStarted, isInitializing,
    isAnyModalOpen, isQuestionPaperOpen, isInstructionsOpen, isShortcutsOpen, isConfirmSubmitOpen, isConfirmExitOpen, isProctorAlertOpen, showPrintModal, isDuplicateTab
  ]);

  // Back-button navigation hijack prevention: traps browser back gesture/button and prompts exit confirmation modal
  useEffect(() => {
    if (!isExamStarted || isSubmitting) return;

    try {
      window.history.pushState({ jeeMockExam: true }, '', window.location.href);
    } catch {}

    const handlePopState = () => {
      if (isSubmitting) return;
      try {
        window.history.pushState({ jeeMockExam: true }, '', window.location.href);
      } catch {}
      setIsConfirmExitOpen(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isExamStarted, isSubmitting]);

  // Multi-tab exclusivity lock: prevents race conditions and state desynchronization
  useEffect(() => {
    if (!isExamStarted || isSubmitting) return;

    const myTabId = tabIdRef.current;
    const lockStorageKey = `jeeos_active_tab_${userId}_${test.id}`;
    const channelName = `jeeos_lock_${userId}_${test.id}`;

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(channelName);
      }
    } catch {}

    const handleBroadcast = (msg: any) => {
      if (!msg || msg.tabId === myTabId) return;

      if (msg.type === 'CLAIM_LOCK') {
        channel?.postMessage({ type: 'LOCK_HELD', tabId: myTabId });
      } else if (msg.type === 'LOCK_HELD') {
        setIsDuplicateTab(true);
      } else if (msg.type === 'FORCE_TAKE_LOCK') {
        setIsDuplicateTab(true);
      }
    };

    if (channel) {
      channel.onmessage = (event) => handleBroadcast(event.data);
      channel.postMessage({ type: 'CLAIM_LOCK', tabId: myTabId });
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === lockStorageKey && e.newValue && e.newValue !== myTabId) {
        setIsDuplicateTab(true);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    try {
      localStorage.setItem(lockStorageKey, myTabId);
    } catch {}

    return () => {
      if (channel) {
        channel.postMessage({ type: 'RELEASE_LOCK', tabId: myTabId });
        channel.close();
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isExamStarted, isSubmitting, userId, test.id]);

  const handleResumeInThisTab = () => {
    const myTabId = tabIdRef.current;
    const lockStorageKey = `jeeos_active_tab_${userId}_${test.id}`;
    const channelName = `jeeos_lock_${userId}_${test.id}`;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel(channelName);
        ch.postMessage({ type: 'FORCE_TAKE_LOCK', tabId: myTabId });
        ch.close();
      }
      localStorage.setItem(lockStorageKey, myTabId);
    } catch {}

    setIsDuplicateTab(false);
  };

  // Load current answer when active question changes
  useEffect(() => {
    if (!activeQuestion) return;
    setCurrentAnswer(attempt.questions[activeQuestion.id]?.selectedAnswer || '');
    dispatch({ type: 'VISIT_QUESTION', questionId: activeQuestion.id });
  }, [activeQuestion?.id]);

  const activeQAccumulatedSecRef = useRef<number>(0);
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const activeQuestionIdRef = useRef<string | undefined>(activeQuestion?.id);
  activeQuestionIdRef.current = activeQuestion?.id;

  const flushActiveQuestionTime = (qIdToFlush?: string) => {
    const targetQId = qIdToFlush || activeQuestionIdRef.current;
    const accumulated = activeQAccumulatedSecRef.current;
    if (!targetQId || accumulated <= 0) return;

    activeQAccumulatedSecRef.current = 0;
    dispatch({ type: 'TICK_TIME', questionId: targetQId, seconds: accumulated });
  };

  // Heartbeat interval for time spent per question: clamps time if gap > 15s (device sleep / tab suspended)
  useEffect(() => {
    if (!activeQuestion || !isExamStarted || isSubmitting) return;
    lastHeartbeatTimeRef.current = Date.now();
    const currentQId = activeQuestion.id;

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastHeartbeatTimeRef.current) / 1000;
      lastHeartbeatTimeRef.current = now;

      if (!document.hidden && deltaSec > 0 && deltaSec < 15) {
        activeQAccumulatedSecRef.current += Math.round(deltaSec);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      flushActiveQuestionTime(currentQId);
    };
  }, [activeQuestion?.id, isExamStarted, isSubmitting]);

  // Tab visibility change: flush accumulated time before tab hides, reset heartbeat on resume
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        flushActiveQuestionTime();
      }
      lastHeartbeatTimeRef.current = Date.now();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Global timer watcher: schedules auto-submit when targetEndTime is reached without 1s root re-renders
  useEffect(() => {
    if (!isExamStarted || isSubmitting) return;
    const msRemaining = targetEndTime - Date.now();
    if (msRemaining <= 0) {
      handleSubmitTest();
      return;
    }
    const timeout = setTimeout(() => {
      handleSubmitTest();
    }, msRemaining);
    return () => clearTimeout(timeout);
  }, [targetEndTime, isExamStarted, isSubmitting]);

  // Safety Rail: beforeunload Warning & Synchronous Save Fallback
  useEffect(() => {
    if (!isExamStarted || isSubmitting) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        localStorage.setItem(`jeeos_mock_attempt_${userId}_${test.id}`, JSON.stringify(attempt));
      } catch {}
      e.preventDefault();
      e.returnValue = 'You have an active examination in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isExamStarted, isSubmitting, attempt, userId, test.id]);

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

  // Virtual Keypad Button Press for Numericals
  const handleKeypadPress = (val: string) => {
    if (val === 'CLEAR') {
      setCurrentAnswer('');
    } else if (val === 'BACKSPACE') {
      setCurrentAnswer(prev => prev.slice(0, -1));
    } else if (val === '↵') {
      handleSaveAndNext();
    } else if (val === '.') {
      if (!currentAnswer.includes('.')) {
        if (currentAnswer === '' || currentAnswer === '-') {
          setCurrentAnswer(prev => prev + '0.');
        } else {
          setCurrentAnswer(prev => prev + '.');
        }
      }
    } else if (val === '-') {
      if (currentAnswer.startsWith('-')) {
        setCurrentAnswer(prev => prev.substring(1));
      } else {
        setCurrentAnswer(prev => '-' + prev);
      }
    } else if (val === '00') {
      if (currentAnswer && currentAnswer !== '0' && currentAnswer !== '-' && currentAnswer !== '-0' && currentAnswer.length <= 8) {
        setCurrentAnswer(prev => prev + '00');
      }
    } else {
      if (currentAnswer === '0') {
        setCurrentAnswer(val);
      } else if (currentAnswer === '-0') {
        setCurrentAnswer('-' + val);
      } else if (currentAnswer.length < 10) {
        setCurrentAnswer(prev => prev + val);
      }
    }
  };

  const handleSubmitTest = () => {
    if (isSubmitting) return;
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
      localStorage.removeItem(`jeeos_mock_attempt_${userId}_${test.id}`);
      localStorage.removeItem(`jeeos_mock_end_${userId}_${test.id}`);
      localStorage.removeItem(`jeeos_mock_pos_${userId}_${test.id}`);
      localStorage.removeItem(`jeeos_mock_infractions_${userId}_${test.id}`);
      localStorage.removeItem(`jeeos_active_tab_${userId}_${test.id}`);
    } catch(e) {
      console.warn("Storage removal warning:", e);
    }
    idbRemove(`jeeos_mock_attempt_${userId}_${test.id}`).catch(e => console.warn("IDB removal warning:", e));

    setTimeout(() => {
      onComplete(finalAttempt);
    }, 400);
  };
  handleSubmitTestRef.current = handleSubmitTest;

  const handleConfirmExitAndDiscard = () => {
    setIsConfirmExitOpen(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      localStorage.removeItem(`jeeos_mock_attempt_${userId}_${test.id}`);
      localStorage.removeItem(`jeeos_mock_end_${userId}_${test.id}`);
      localStorage.removeItem(`jeeos_mock_pos_${userId}_${test.id}`);
      localStorage.removeItem(`jeeos_mock_infractions_${userId}_${test.id}`);
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
    isAuthenticTheme,
    toggleTheme,
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    isExamStarted,
    handleBeginExam,
    proctorWarnings,
    isProctorAlertOpen,
    setIsProctorAlertOpen,
    proctorAlertMessage,
    triageMap,
    setTriageMap,
    isInitializing,
    currentSubject,
    setCurrentSubject,
    currentQIdx,
    setCurrentQIdx,
    targetEndTime,
    attempt,
    dispatch,
    isSubmitting,
    isConfirmSubmitOpen,
    setIsConfirmSubmitOpen,
    isConfirmExitOpen,
    setIsConfirmExitOpen,
    isDuplicateTab,
    currentAnswer,
    setCurrentAnswer,
    activeSection,
    activeQuestion,
    questionAttempts,
    counts,
    workspaceScrollRef,
    isMobilePaletteOpen,
    setIsMobilePaletteOpen,
    isQuestionPaperOpen,
    setIsQuestionPaperOpen,
    isInstructionsOpen,
    setIsInstructionsOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    showPrintModal,
    setShowPrintModal,
    handleResumeInThisTab,
    navigateToQuestion,
    handleNext,
    handlePrev,
    handleSaveAndNext,
    handleSaveAndMark,
    handleMarkForReview,
    handleClear,
    handleKeypadPress,
    handleSubmitTest,
    handleConfirmExitAndDiscard
  };
}
