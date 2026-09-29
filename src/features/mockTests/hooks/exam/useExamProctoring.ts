import { useState, useEffect, useRef } from 'react';
import { storageAdapter } from '@/services/StorageAdapter';

export interface UseExamProctoringProps {
  userId: string;
  testId: string;
  isSubmitting: boolean;
  isInitializing: boolean;
  isExamStarted: boolean;
  isAnyModalOpen: boolean;
  setIsFullscreen: (isFull: boolean) => void;
  handleSubmitTest: () => void;
}

export function useExamProctoring({
  userId,
  testId,
  isSubmitting,
  isInitializing,
  isExamStarted,
  isAnyModalOpen,
  setIsFullscreen,
  handleSubmitTest
}: UseExamProctoringProps) {
  const [proctorWarnings, setProctorWarnings] = useState(() => {
    try {
      const saved = storageAdapter.getItem<string>(`jeeos_mock_infractions_${userId}_${testId}`);
      return saved ? Math.max(0, parseInt(saved, 10)) : 0;
    } catch {}
    return 0;
  });

  const [isProctorAlertOpen, setIsProctorAlertOpen] = useState(false);
  const [proctorAlertMessage, setProctorAlertMessage] = useState('');

  const infractionsRef = useRef(proctorWarnings);
  const lastViolationTimeRef = useRef(0);
  const handleSubmitTestRef = useRef<() => void>(handleSubmitTest);
  handleSubmitTestRef.current = handleSubmitTest;
  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  isAnyModalOpenRef.current = isAnyModalOpen;

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
    if (now - lastViolationTimeRef.current < 2500) return;
    lastViolationTimeRef.current = now;

    infractionsRef.current += 1;
    const count = infractionsRef.current;
    setProctorWarnings(count);
    try {
      storageAdapter.setItem(`jeeos_mock_infractions_${userId}_${testId}`, count.toString());
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

  // Mount & Cleanup: Lock screen, hide dock
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('in-mock-test');

    if (document.fullscreenElement) {
      setIsFullscreen(true);
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

  // Fullscreen change listener
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

  // Tab switching & window blur listeners
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
  }, [isSubmitting, isInitializing, isExamStarted]);

  return {
    proctorWarnings,
    isProctorAlertOpen,
    setIsProctorAlertOpen,
    proctorAlertMessage,
    triggerProctorInfraction
  };
}
