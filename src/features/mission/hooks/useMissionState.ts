import React, { useMemo } from 'react';
import { useMissionSubjectInfo } from './subhooks/useMissionSubjectInfo';
import { useMissionTimer } from './subhooks/useMissionTimer';
import { useMissionChecklist } from './subhooks/useMissionChecklist';
import { useMissionNotesAndFormulas } from './subhooks/useMissionNotesAndFormulas';
import { useMissionLifecycle } from './subhooks/useMissionLifecycle';

export interface MissionModeProps {
  mode?: 'learning' | 'mock' | 'revision' | 'mistake';
  children?: React.ReactNode;
  activeMissionId?: string;
  customDurationSecs?: number;
  activeSubject: 'physics' | 'chemistry' | 'maths' | 'all';
  initialPaused?: boolean;
  initialSeconds?: number;
  skipSetup?: boolean;
  onExit: (currentSeconds?: number) => void;
  onComplete?: (stats: {
    missionId?: string;
    duration: number;
    questions: number;
    correct?: number;
    confidence?: number;
    xp: number;
    streak: number;
    idleTime: number;
    focusInterruptions: number;
    focusScore: number;
  }) => void;
}

export function useMissionState(props: MissionModeProps) {
  const {
    initialPaused = false,
    initialSeconds = 0,
    skipSetup = false,
    customDurationSecs,
    onExit,
    onComplete,
    activeMissionId
  } = props;

  // 1. Subject and Chapter metadata
  const subjectInfo = useMissionSubjectInfo({
    activeSubjectProp: props.activeSubject,
    activeMissionId,
    customDurationSecs
  });

  const {
    activeSubject,
    setActiveSubject,
    extraTimeAdded,
    setExtraTimeAdded,
    forcePracticeMode,
    setForcePracticeMode,
    subjectsDetails,
    activeDetails,
    activeSubjectMission,
    activeChap,
    isCompletedChapter,
    isPracticeMission,
    sessionDurationSecs,
    xp
  } = subjectInfo;

  // Placeholder ref to bridge coach tip setting between timer and notes
  const setCoachTipRef = React.useRef<(tip: string) => void>(() => {});

  // 2. Timer, wall-clock intervals, and throttled persistence
  const timer = useMissionTimer({
    activeMissionId,
    initialPaused,
    initialSeconds,
    skipSetup,
    sessionDurationSecs,
    setCoachTip: (tip: string) => setCoachTipRef.current(tip)
  });

  const {
    storageKey,
    isPaused,
    setIsPaused,
    isPauseOverlayDismissed,
    setIsPauseOverlayDismissed,
    isSettingUp,
    setIsSettingUp,
    targetQuestions,
    setTargetQuestions,
    xpWager,
    setXpWager,
    missionFailed,
    setMissionFailed,
    isCompleted,
    setIsCompleted,
    seconds,
    setSeconds,
    secondsRef,
    focusScore,
    setFocusScore,
    lectureSpeed,
    setLectureSpeed,
    idleTime,
    setIdleTime,
    focusInterruptions,
    setFocusInterruptions,
    isTimeUpModalOpen,
    setIsTimeUpModalOpen,
    hasTriggeredTimeUp,
    setHasTriggeredTimeUp,
    uninterruptedSecondsRef,
    focusInterruptionsRef,
    idleTimeRef,
    incrementInterruption,
    formatTime,
    handleResetTimer
  } = timer;

  // 3. Notes, Formulas, and periodic coach tips
  const notesAndFormulas = useMissionNotesAndFormulas({
    activeSubject,
    isSettingUp,
    isPaused,
    isCompleted,
    missionFailed,
    formatTime,
    seconds
  });

  const {
    isNotesOpen,
    setIsNotesOpen,
    isFormulaOpen,
    setIsFormulaOpen,
    formulaSearch,
    setFormulaSearch,
    notes,
    setNotes,
    noteInput,
    setNoteInput,
    activeNoteCategory,
    setActiveNoteCategory,
    coachTip,
    setCoachTip,
    isCoachVisible,
    setIsCoachVisible,
    showShortcuts,
    setShowShortcuts,
    notesEndRef,
    handleAddNote,
    handleQuickPresetNote,
    filteredFormulas
  } = notesAndFormulas;

  setCoachTipRef.current = setCoachTip;

  // 4. Checklist state and keyboard shortcuts
  const checklistHook = useMissionChecklist({
    activeSubject,
    setActiveSubject,
    activeMissionId,
    activeSubjectMission,
    subjectsDetails,
    isCompleted,
    setIsCompleted,
    isPaused,
    setIsPaused,
    incrementInterruption,
    setIsNotesOpen,
    setIsFormulaOpen,
    setCoachTip
  });

  const {
    checklist,
    setChecklist,
    checklistProgressPercent,
    handleToggleTask,
    handleAddCustomTask,
    handleRemoveTask
  } = checklistHook;

  // 5. Mission completion, subject switching, and session exit
  const lifecycle = useMissionLifecycle({
    activeSubject,
    setActiveSubject,
    activeSubjectMission,
    seconds,
    secondsRef,
    focusScore,
    idleTime,
    focusInterruptions,
    storageKey,
    uninterruptedSecondsRef,
    focusInterruptionsRef,
    idleTimeRef,
    setSeconds,
    setFocusScore,
    setIdleTime,
    setFocusInterruptions,
    setIsCompleted,
    setIsSettingUp,
    setChecklist,
    setCoachTip,
    subjectsDetails,
    onExit,
    onComplete
  });

  const {
    handleExit,
    handleNextSubject,
    handleMissionComplete
  } = lifecycle;

  const timeProgressPercent = Math.min(100, (seconds / sessionDurationSecs) * 100);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({
    state: {
      activeSubject,
      isPaused,
      isPauseOverlayDismissed,
      isSettingUp,
      targetQuestions,
      xpWager,
      missionFailed,
      isCompleted,
      seconds,
      focusScore,
      lectureSpeed,
      idleTime,
      focusInterruptions,
      extraTimeAdded,
      isTimeUpModalOpen,
      hasTriggeredTimeUp,
      isNotesOpen,
      isFormulaOpen,
      formulaSearch,
      checklist,
      notes,
      noteInput,
      activeNoteCategory,
      coachTip,
      isCoachVisible,
      showShortcuts,
      subjectsDetails,
      activeDetails,
      activeSubjectMission,
      activeChap,
      isCompletedChapter,
      forcePracticeMode,
      isPracticeMission,
      sessionDurationSecs,
      targetDurationMins: Math.round(sessionDurationSecs / 60),
      timeProgressPercent,
      checklistProgressPercent,
      filteredFormulas,
      xp
    },
    setters: {
      setActiveSubject,
      setIsPaused,
      setIsPauseOverlayDismissed,
      setIsSettingUp,
      setTargetQuestions,
      setXpWager,
      setMissionFailed,
      setIsCompleted,
      setSeconds,
      setFocusScore,
      setLectureSpeed,
      setIdleTime,
      setFocusInterruptions,
      setExtraTimeAdded,
      setIsTimeUpModalOpen,
      setHasTriggeredTimeUp,
      setIsNotesOpen,
      setIsFormulaOpen,
      setFormulaSearch,
      setChecklist,
      setNotes,
      setNoteInput,
      setActiveNoteCategory,
      setCoachTip,
      setIsCoachVisible,
      setShowShortcuts,
      setForcePracticeMode,
    },
    handlers: {
      incrementInterruption,
      handleExit,
      handleResetTimer,
      handleToggleTask,
      handleAddCustomTask,
      handleRemoveTask,
      handleAddNote,
      handleQuickPresetNote,
      formatTime,
      handleNextSubject,
      handleMissionComplete
    },
    refs: {
      notesEndRef
    }
  }), [
    activeSubject, isPaused, isPauseOverlayDismissed, isSettingUp,
    targetQuestions, xpWager, missionFailed, isCompleted, seconds, focusScore, lectureSpeed,
    idleTime, focusInterruptions, extraTimeAdded, isTimeUpModalOpen,
    hasTriggeredTimeUp, isNotesOpen, isFormulaOpen, formulaSearch,
    checklist, notes, noteInput, activeNoteCategory, coachTip,
    isCoachVisible, showShortcuts, subjectsDetails, activeDetails,
    activeSubjectMission, activeChap, isCompletedChapter, forcePracticeMode,
    isPracticeMission, sessionDurationSecs, timeProgressPercent,
    checklistProgressPercent, filteredFormulas, xp
  ]);
}
