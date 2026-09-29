import { useState, useRef } from 'react';
import { MockTest, MockTestAttempt } from '../../../types/mockTest';
import { TriageCategory } from '../components/LiveStrategyTriageOverlay';
import { useExamUiState } from './exam/useExamUiState';
import { useExamProctoring } from './exam/useExamProctoring';
import { useExamExclusivity } from './exam/useExamExclusivity';
import { useExamTimerAndHeartbeat } from './exam/useExamTimerAndHeartbeat';
import { useExamInputAndKeypad } from './exam/useExamInputAndKeypad';
import { useExamNavigationAndSubmit } from './exam/useExamNavigationAndSubmit';

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
  const [triageMap, setTriageMap] = useState<Record<string, TriageCategory>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [targetEndTime, setTargetEndTime] = useState(Date.now() + (test.durationMinutes || 180) * 60000);

  // Submit test ref forwarding so circular callbacks can trigger submission
  const submitTestRef = useRef<() => void>(() => {});
  const invokeSubmitTest = () => {
    submitTestRef.current();
  };

  const flushTimerRef = useRef<(qId?: string) => void>(() => {});
  const activeQAccumulatedSecRef = useRef<number>(0);

  // UI Modals, Fullscreen, and NTA Classic Theme
  const uiState = useExamUiState({
    test,
    userId,
    initialExamStarted,
    targetEndTime,
    setTargetEndTime,
    handleSubmitTest: invokeSubmitTest
  });

  // Navigation, Attempt Reducer, and Submission Logic
  const navAndSubmit = useExamNavigationAndSubmit({
    test,
    userId,
    onComplete,
    onExit,
    targetEndTime,
    setTargetEndTime,
    currentAnswer,
    setCurrentAnswer,
    flushActiveQuestionTime: (qId) => flushTimerRef.current(qId),
    activeQAccumulatedSecRef,
    setIsMobilePaletteOpen: uiState.setIsMobilePaletteOpen
  });

  submitTestRef.current = navAndSubmit.handleSubmitTest;

  // Timer and Question Heartbeat tracking
  const timer = useExamTimerAndHeartbeat({
    targetEndTime,
    isExamStarted: uiState.isExamStarted,
    isSubmitting: navAndSubmit.isSubmitting,
    activeQuestionId: navAndSubmit.activeQuestion?.id,
    dispatch: navAndSubmit.dispatch,
    handleSubmitTest: navAndSubmit.handleSubmitTest,
    activeQAccumulatedSecRef
  });

  flushTimerRef.current = timer.flushActiveQuestionTime;

  // Proctoring, Infraction tracking, and Anti-cheat
  const isAnyModalOpen =
    uiState.isQuestionPaperOpen ||
    uiState.isInstructionsOpen ||
    uiState.isShortcutsOpen ||
    navAndSubmit.isConfirmSubmitOpen ||
    navAndSubmit.isConfirmExitOpen ||
    uiState.showPrintModal;

  const proctoring = useExamProctoring({
    userId,
    testId: test.id,
    isSubmitting: navAndSubmit.isSubmitting,
    isInitializing: navAndSubmit.isInitializing,
    isExamStarted: uiState.isExamStarted,
    isAnyModalOpen,
    setIsFullscreen: uiState.setIsFullscreen,
    handleSubmitTest: navAndSubmit.handleSubmitTest
  });

  // Tab Exclusivity and popstate/beforeunload safety rails
  const exclusivity = useExamExclusivity({
    userId,
    testId: test.id,
    attempt: navAndSubmit.attempt,
    isExamStarted: uiState.isExamStarted,
    isSubmitting: navAndSubmit.isSubmitting,
    setIsConfirmExitOpen: navAndSubmit.setIsConfirmExitOpen
  });

  // Virtual Keypad and Physical Keyboard Shortcuts
  const isCombinedModalOpen = isAnyModalOpen || proctoring.isProctorAlertOpen || exclusivity.isDuplicateTab;
  const inputAndKeypad = useExamInputAndKeypad({
    currentAnswer,
    setCurrentAnswer,
    activeQuestion: navAndSubmit.activeQuestion,
    testSections: test.sections || [],
    isFullscreen: uiState.isFullscreen,
    isExamStarted: uiState.isExamStarted,
    isInitializing: navAndSubmit.isInitializing,
    isAnyModalOpen: isCombinedModalOpen,
    modalStates: {
      isShortcutsOpen: uiState.isShortcutsOpen,
      setIsShortcutsOpen: uiState.setIsShortcutsOpen,
      isQuestionPaperOpen: uiState.isQuestionPaperOpen,
      setIsQuestionPaperOpen: uiState.setIsQuestionPaperOpen,
      isInstructionsOpen: uiState.isInstructionsOpen,
      setIsInstructionsOpen: uiState.setIsInstructionsOpen,
      isConfirmSubmitOpen: navAndSubmit.isConfirmSubmitOpen,
      setIsConfirmSubmitOpen: navAndSubmit.setIsConfirmSubmitOpen,
      isConfirmExitOpen: navAndSubmit.isConfirmExitOpen,
      setIsConfirmExitOpen: navAndSubmit.setIsConfirmExitOpen,
      showPrintModal: uiState.showPrintModal,
      setShowPrintModal: uiState.setShowPrintModal
    },
    navigation: {
      setCurrentSubject: navAndSubmit.setCurrentSubject,
      setCurrentQIdx: navAndSubmit.setCurrentQIdx,
      handleSaveAndNext: navAndSubmit.handleSaveAndNext,
      handleSaveAndMark: navAndSubmit.handleSaveAndMark,
      handleClear: navAndSubmit.handleClear,
      handleNext: navAndSubmit.handleNext,
      handlePrev: navAndSubmit.handlePrev
    }
  });

  return {
    isAuthenticTheme: uiState.isAuthenticTheme,
    toggleTheme: uiState.toggleTheme,
    isFullscreen: uiState.isFullscreen,
    toggleFullscreen: uiState.toggleFullscreen,
    enterFullscreen: uiState.enterFullscreen,
    isExamStarted: uiState.isExamStarted,
    handleBeginExam: uiState.handleBeginExam,
    proctorWarnings: proctoring.proctorWarnings,
    isProctorAlertOpen: proctoring.isProctorAlertOpen,
    setIsProctorAlertOpen: proctoring.setIsProctorAlertOpen,
    proctorAlertMessage: proctoring.proctorAlertMessage,
    triageMap,
    setTriageMap,
    isInitializing: navAndSubmit.isInitializing,
    currentSubject: navAndSubmit.currentSubject,
    setCurrentSubject: navAndSubmit.setCurrentSubject,
    currentQIdx: navAndSubmit.currentQIdx,
    setCurrentQIdx: navAndSubmit.setCurrentQIdx,
    targetEndTime,
    attempt: navAndSubmit.attempt,
    dispatch: navAndSubmit.dispatch,
    isSubmitting: navAndSubmit.isSubmitting,
    isConfirmSubmitOpen: navAndSubmit.isConfirmSubmitOpen,
    setIsConfirmSubmitOpen: navAndSubmit.setIsConfirmSubmitOpen,
    isConfirmExitOpen: navAndSubmit.isConfirmExitOpen,
    setIsConfirmExitOpen: navAndSubmit.setIsConfirmExitOpen,
    isDuplicateTab: exclusivity.isDuplicateTab,
    currentAnswer,
    setCurrentAnswer,
    activeSection: navAndSubmit.activeSection,
    activeQuestion: navAndSubmit.activeQuestion,
    questionAttempts: navAndSubmit.questionAttempts,
    counts: navAndSubmit.counts,
    workspaceScrollRef: navAndSubmit.workspaceScrollRef,
    isMobilePaletteOpen: uiState.isMobilePaletteOpen,
    setIsMobilePaletteOpen: uiState.setIsMobilePaletteOpen,
    isQuestionPaperOpen: uiState.isQuestionPaperOpen,
    setIsQuestionPaperOpen: uiState.setIsQuestionPaperOpen,
    isInstructionsOpen: uiState.isInstructionsOpen,
    setIsInstructionsOpen: uiState.setIsInstructionsOpen,
    isShortcutsOpen: uiState.isShortcutsOpen,
    setIsShortcutsOpen: uiState.setIsShortcutsOpen,
    showPrintModal: uiState.showPrintModal,
    setShowPrintModal: uiState.setShowPrintModal,
    handleResumeInThisTab: exclusivity.handleResumeInThisTab,
    navigateToQuestion: navAndSubmit.navigateToQuestion,
    handleNext: navAndSubmit.handleNext,
    handlePrev: navAndSubmit.handlePrev,
    handleSaveAndNext: navAndSubmit.handleSaveAndNext,
    handleSaveAndMark: navAndSubmit.handleSaveAndMark,
    handleMarkForReview: navAndSubmit.handleMarkForReview,
    handleClear: navAndSubmit.handleClear,
    handleKeypadPress: inputAndKeypad.handleKeypadPress,
    handleSubmitTest: navAndSubmit.handleSubmitTest,
    handleConfirmExitAndDiscard: navAndSubmit.handleConfirmExitAndDiscard
  };
}
