import { useState } from 'react';
import { MockTest } from '../../../../types/mockTest';
import { storageAdapter } from '@/services/StorageAdapter';

export interface UseExamUiStateProps {
  test: MockTest;
  userId: string;
  initialExamStarted?: boolean;
  targetEndTime: number;
  setTargetEndTime: (time: number) => void;
  handleSubmitTest: () => void;
}

export function useExamUiState({
  test,
  userId,
  initialExamStarted = false,
  targetEndTime,
  setTargetEndTime,
  handleSubmitTest
}: UseExamUiStateProps) {
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [isQuestionPaperOpen, setIsQuestionPaperOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [isAuthenticTheme, setIsAuthenticTheme] = useState(() => {
    try {
      return storageAdapter.getItem<string>('jeeos_mock_theme') === 'nta-classic';
    } catch {
      return false;
    }
  });

  const toggleTheme = () => {
    setIsAuthenticTheme(prev => {
      const next = !prev;
      try {
        storageAdapter.setItem('jeeos_mock_theme', next ? 'nta-classic' : 'dark');
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

  const handleBeginExam = () => {
    let newEndTime = targetEndTime;
    try {
      const savedEnd = storageAdapter.getItem<string>(`jeeos_mock_end_${userId}_${test.id}`);
      if (savedEnd) {
        const parsed = parseInt(String(savedEnd), 10);
        if (Number.isFinite(parsed) && parsed > Date.now()) {
          newEndTime = parsed;
        } else if (Number.isFinite(parsed) && parsed <= Date.now()) {
          handleSubmitTest();
          return;
        }
      } else {
        newEndTime = Date.now() + (test.durationMinutes || 180) * 60000;
        storageAdapter.setItem(`jeeos_mock_end_${userId}_${test.id}`, newEndTime.toString());
      }
    } catch (e) {
      console.warn("Failed to persist end time:", e);
    }
    setTargetEndTime(newEndTime);
    setIsExamStarted(true);
    enterFullscreen();
  };

  return {
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
    isAuthenticTheme,
    toggleTheme,
    isFullscreen,
    setIsFullscreen,
    toggleFullscreen,
    enterFullscreen,
    isExamStarted,
    setIsExamStarted,
    handleBeginExam
  };
}
