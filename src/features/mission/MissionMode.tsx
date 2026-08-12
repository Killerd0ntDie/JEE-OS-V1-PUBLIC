import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { calculateCurrentStreak } from '@/utils/streakCalculations';

import { MissionTimerWidget } from './components/MissionTimerWidget';
import { MissionSubjectSwitcherWidget } from './components/MissionSubjectSwitcherWidget';
import { MissionActionBarWidget } from './components/MissionActionBarWidget';
import { MissionChecklistWidget } from './components/MissionChecklistWidget';
import { MissionNotesDrawer } from './components/MissionNotesDrawer';
import { MissionFormulaSheetModal } from './components/MissionFormulaSheetModal';
import { MissionPauseOverlay } from './components/MissionPauseOverlay';
import { MissionCompleteModal } from './components/MissionCompleteModal';
import { MissionDebriefModal } from './components/MissionDebriefModal';
import { MissionTimeUpModal } from './components/MissionTimeUpModal';
import { MissionCoachWidget } from './components/MissionCoachWidget';
import { QuestionViewerWidget } from './components/QuestionViewerWidget';

import { MissionHeader } from './components/MissionHeader';
import { CasinoSetupOverlay, CasinoFailureOverlay } from './components/CasinoOverlays';
import { useMissionState, MissionModeProps } from './hooks/useMissionState';
import { LECTURE_SPEEDS } from './constants/formulas';

export function MissionMode(props: MissionModeProps) {
  const { mode = 'learning', children } = props;
  const [isClosing, setIsClosing] = React.useState(false);
  const [showDebrief, setShowDebrief] = React.useState(false);
  const pendingCompleteData = React.useRef<any>(null);
  const actions = useStudyBrainStore(state => state.actions);
  const studySessions = useStudyBrainStore(state => state.studySessions || []);
  const settings = useStudyBrainStore(state => state.settings);
  
  const minStreakMins = Math.round((settings?.minStreakHours ?? 0.5) * 60);
  const computedStreak = React.useMemo(() => calculateCurrentStreak(studySessions, minStreakMins), [studySessions, minStreakMins]);
  
  const parentOnExitRef = React.useRef(props.onExit);
  parentOnExitRef.current = props.onExit;

  // Smooth exit interceptors
  const handleSmoothExit = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      if (parentOnExitRef.current) parentOnExitRef.current();
    }, 250);
  }, []);

  const { state, setters, handlers, refs } = useMissionState({
    ...props,
    onExit: handleSmoothExit
  });

  const handleSmoothComplete = (data?: any) => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      handlers.handleMissionComplete(data);
    }, 250);
  };

  return (
    <Modal
      isOpen={!isClosing}
      onClose={handleSmoothExit}
      zIndex={9999}
      fullScreen={true}
      className="bg-[#070708] text-zinc-100 flex flex-col font-sans overflow-hidden select-none fixed inset-0 w-full h-full rounded-none border-none"
    >
        
        <CasinoSetupOverlay 
          isSettingUp={state.isSettingUp} 
          xpTotal={state.xp?.total || 0} 
          xpWager={state.xpWager} 
          setXpWager={setters.setXpWager}
          onAccept={() => {
            setters.setIsSettingUp(false);
            setters.setIsPaused(false);
          }} 
        />

        <CasinoFailureOverlay 
          missionFailed={state.missionFailed} 
          xpWager={state.xpWager} 
          onExit={handleSmoothExit} 
        />



        <MissionHeader onExit={handleSmoothExit} />

        {/* MAIN TWO-COLUMN DECK WORKSPACE */}
        <main className="flex-1 min-h-0 relative z-10 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden w-full max-w-5xl mx-auto p-3 sm:p-4 md:p-6 gap-4 md:gap-6 lg:gap-8 justify-center items-center pt-20 md:pt-24 my-auto">
          
          {/* LEFT COMPONENT COLUMN (TIMER & CONTENT COCKPIT) */}
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto md:mx-0 h-full min-h-0">
            
            <MissionTimerWidget
              progressPercent={state.timeProgressPercent}
              seconds={state.seconds}
              focusScore={state.focusScore}
              lectureSpeed={state.lectureSpeed}
              formatTime={handlers.formatTime}
              onResetTimer={handlers.handleResetTimer}
              onCycleSpeed={() => {
                const currIdx = LECTURE_SPEEDS.indexOf(state.lectureSpeed);
                const nextSpeed = LECTURE_SPEEDS[(currIdx + 1) % LECTURE_SPEEDS.length];
                setters.setLectureSpeed(nextSpeed);
                setters.setCoachTip(`Lecture speed calibrated to ${nextSpeed}x.`);
              }}
            />

            {mode === 'learning' && (
              <MissionSubjectSwitcherWidget
                activeSubject={state.activeSubject}
                activeDetails={state.activeDetails}
                subjectsDetails={state.subjectsDetails}
                onChangeSubject={(subj) => {
                  setters.setActiveSubject(subj);
                  setters.setCoachTip(`Selected track: ${state.subjectsDetails[subj].name}. Roadmaps updated.`);
                  setters.setChecklist({
                    'Watch lecture': false,
                    'Make notes': false,
                    'Solve DPP': false,
                    'Mark doubts': false,
                    'Revise formulas': false,
                  });
                }}
              />
            )}

            <MissionCoachWidget
              isCoachVisible={state.isCoachVisible}
              setIsCoachVisible={setters.setIsCoachVisible}
              coachTip={state.coachTip}
            />

            {mode === 'learning' && (
              <MissionActionBarWidget
                isNotesOpen={state.isNotesOpen}
                setIsNotesOpen={setters.setIsNotesOpen}
                isFormulaOpen={state.isFormulaOpen}
                setIsFormulaOpen={setters.setIsFormulaOpen}
                lectureSpeed={state.lectureSpeed}
                onCycleSpeed={() => {
                  const currIdx = LECTURE_SPEEDS.indexOf(state.lectureSpeed);
                  const nextSpeed = LECTURE_SPEEDS[(currIdx + 1) % LECTURE_SPEEDS.length];
                  setters.setLectureSpeed(nextSpeed);
                  setters.setCoachTip(`Lecture speed calibrated to ${nextSpeed}x.`);
                }}
                isCoachVisible={state.isCoachVisible}
                setIsCoachVisible={setters.setIsCoachVisible}
              />
            )}

          </div>

          {/* RIGHT COMPONENT COLUMN (PRACTICE OR CHECKLIST) */}
          <div className="flex-1 w-full max-w-xl mx-auto flex flex-col h-full bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/[0.08] overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative">
            <div className="flex-1 flex flex-col min-h-0 relative">
              {children ? (
                children
              ) : state.isPracticeMission && state.activeChap ? (
                <QuestionViewerWidget 
                  chapterId={state.activeChap.id} 
                  subject={state.activeSubject} 
                  onExitPractice={() => {
                    setIsClosing(true);
                    setTimeout(() => {
                      props.onComplete?.({
                        missionId: state.activeSubjectMission?.id,
                        duration: Math.max(60, state.seconds),
                        questions: 0,
                        xp: Math.max(5, Math.floor(state.seconds / 60) * 5),
                        streak: 0,
                        idleTime: state.idleTime,
                        focusInterruptions: state.focusInterruptions,
                        focusScore: state.focusScore
                      });
                    }, 250);
                    setters.setForcePracticeMode(false);
                  }}
                />
              ) : (
                <MissionChecklistWidget
                  progressPercent={state.checklistProgressPercent}
                  checklist={state.checklist}
                  onToggleTask={handlers.handleToggleTask}
                  isPaused={state.isPaused}
                  onTogglePause={() => setters.setIsPaused(prev => {
                    if (!prev) handlers.incrementInterruption();
                    return !prev;
                  })}
                  onCompleteAll={() => {
                    if (!state.activeSubjectMission) {
                      console.warn(`[MissionMode] "Complete" pressed for ${state.activeSubject} but no pending mission exists for this subject — skipping completion.`);
                      setters.setCoachTip(`No pending ${state.subjectsDetails[state.activeSubject].name} mission right now — switch subject or check your Daily Missions list.`);
                      return;
                    }
                    // ONLY set checklist to full and show modal here. 
                    // The actual completion (DB save and XP) runs when the modal is closed via handleSmoothComplete.
                    setters.setChecklist(prev => {
                      const allDone: Record<string, boolean> = {};
                      Object.keys(prev).forEach(k => { allDone[k] = true; });
                      return allDone;
                    });
                    setters.setIsCompleted(true);
                  }}
                  onStartPractice={() => setters.setForcePracticeMode(true)}
                  onAddTask={handlers.handleAddCustomTask}
                  onRemoveTask={handlers.handleRemoveTask}
                />
              )}
            </div>
          </div>

        </main>

        <MissionNotesDrawer
          isNotesOpen={state.isNotesOpen}
          setIsNotesOpen={setters.setIsNotesOpen}
          activeNoteCategory={state.activeNoteCategory}
          setActiveNoteCategory={setters.setActiveNoteCategory}
          notes={state.notes}
          setNotes={setters.setNotes}
          notesEndRef={refs.notesEndRef}
          noteInput={state.noteInput}
          setNoteInput={setters.setNoteInput}
          handleAddNote={handlers.handleAddNote}
          handleQuickPresetNote={handlers.handleQuickPresetNote}
        />

        <MissionFormulaSheetModal
          isFormulaOpen={state.isFormulaOpen}
          setIsFormulaOpen={setters.setIsFormulaOpen}
          activeDetails={state.activeDetails}
          formulaSearch={state.formulaSearch}
          setFormulaSearch={setters.setFormulaSearch}
          filteredFormulas={state.filteredFormulas}
          handleQuickPresetNote={handlers.handleQuickPresetNote}
        />

        <MissionPauseOverlay
          isPaused={state.isPaused && !state.isPauseOverlayDismissed}
          setIsPaused={setters.setIsPaused}
          seconds={state.seconds}
          formatTime={handlers.formatTime}
          lectureSpeed={state.lectureSpeed}
          onExit={handleSmoothExit}
        />

        <MissionCompleteModal
          isCompleted={state.isCompleted && !showDebrief}
          activeDetails={state.activeDetails}
          seconds={state.seconds}
          streak={computedStreak}
          idleTime={state.idleTime}
          focusInterruptions={state.focusInterruptions}
          focusScore={state.focusScore}
          onComplete={(data) => {
            pendingCompleteData.current = data;
            setShowDebrief(true);
          }}
          onNextSubject={handlers.handleNextSubject}
        />

        <MissionDebriefModal
          isOpen={showDebrief}
          onSubmit={(debrief) => {
            const base = pendingCompleteData.current || {
              duration: state.seconds,
              questions: 0,
              xp: Math.floor(state.seconds / 60) * 5,
              streak: computedStreak,
              idleTime: state.idleTime,
              focusInterruptions: state.focusInterruptions,
              focusScore: state.focusScore,
            };
            handleSmoothComplete({
              ...base,
              questions: debrief.questions,
              correct: debrief.correct,
              confidence: debrief.confidence,
            });
          }}
          onSkip={() => {
            handleSmoothComplete(pendingCompleteData.current);
          }}
        />

        <MissionTimeUpModal 
          isOpen={state.isTimeUpModalOpen}
          xpWager={state.xpWager}
          onFail={() => {
            setters.setIsTimeUpModalOpen(false);
            setters.setMissionFailed(true);
            setters.setCoachTip('CASINO PENALTY: You failed to provide Proof of Work. Wager lost.');
          }}
          onComplete={() => {
            setters.setIsTimeUpModalOpen(false);
            setters.setChecklist({
              'Watch lecture': true,
              'Make notes': true,
              'Solve DPP': true,
              'Mark doubts': true,
              'Revise formulas': true,
            });
            setters.setIsCompleted(true);
          }}
          onAddExtraTime={(mins) => {
            setters.setExtraTimeAdded(prev => prev + mins);
            setters.setHasTriggeredTimeUp(false);
            setters.setIsTimeUpModalOpen(false);
          }}
        />

    </Modal>
  );
}