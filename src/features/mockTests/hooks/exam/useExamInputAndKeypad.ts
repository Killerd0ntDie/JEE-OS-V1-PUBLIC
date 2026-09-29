import { useEffect } from 'react';
import { SubjectId } from '../../../../types';
import { isMultiChoiceQuestion } from '@/utils/mockScoring';

export interface UseExamInputAndKeypadProps {
  currentAnswer: string;
  setCurrentAnswer: React.Dispatch<React.SetStateAction<string>>;
  activeQuestion: any;
  testSections: any[];
  isFullscreen: boolean;
  isExamStarted: boolean;
  isInitializing: boolean;
  isAnyModalOpen: boolean;
  modalStates: {
    isShortcutsOpen: boolean;
    setIsShortcutsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
    isQuestionPaperOpen: boolean;
    setIsQuestionPaperOpen: (open: boolean) => void;
    isInstructionsOpen: boolean;
    setIsInstructionsOpen: (open: boolean) => void;
    isConfirmSubmitOpen: boolean;
    setIsConfirmSubmitOpen: (open: boolean) => void;
    isConfirmExitOpen: boolean;
    setIsConfirmExitOpen: (open: boolean) => void;
    showPrintModal: boolean;
    setShowPrintModal: (open: boolean) => void;
  };
  navigation: {
    setCurrentSubject: (sub: SubjectId) => void;
    setCurrentQIdx: (idx: number) => void;
    handleSaveAndNext: () => void;
    handleSaveAndMark: () => void;
    handleClear: () => void;
    handleNext: () => void;
    handlePrev: () => void;
  };
}

export function useExamInputAndKeypad({
  currentAnswer,
  setCurrentAnswer,
  activeQuestion,
  testSections,
  isFullscreen,
  isExamStarted,
  isInitializing,
  isAnyModalOpen,
  modalStates,
  navigation
}: UseExamInputAndKeypadProps) {

  const {
    isShortcutsOpen,
    setIsShortcutsOpen,
    isQuestionPaperOpen,
    setIsQuestionPaperOpen,
    isInstructionsOpen,
    setIsInstructionsOpen,
    isConfirmSubmitOpen,
    setIsConfirmSubmitOpen,
    isConfirmExitOpen,
    setIsConfirmExitOpen,
    showPrintModal,
    setShowPrintModal
  } = modalStates;

  const {
    setCurrentSubject,
    setCurrentQIdx,
    handleSaveAndNext,
    handleSaveAndMark,
    handleClear,
    handleNext,
    handlePrev
  } = navigation;

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
        if (testSections?.[targetSecIdx]) {
          setCurrentSubject(testSections[targetSecIdx].subject);
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
    activeQuestion, testSections, isFullscreen, isExamStarted, isInitializing,
    isAnyModalOpen, isShortcutsOpen, isQuestionPaperOpen, isInstructionsOpen,
    isConfirmSubmitOpen, isConfirmExitOpen, showPrintModal, currentAnswer,
    setIsShortcutsOpen, setIsQuestionPaperOpen, setIsInstructionsOpen,
    setIsConfirmSubmitOpen, setIsConfirmExitOpen, setShowPrintModal,
    setCurrentSubject, setCurrentQIdx, handleSaveAndNext, handleSaveAndMark,
    handleClear, handleNext, handlePrev
  ]);

  return {
    currentAnswer,
    setCurrentAnswer,
    handleKeypadPress
  };
}
