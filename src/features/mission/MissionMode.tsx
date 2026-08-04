import React from 'react';
import { Modal } from '@/components/ui/Modal';

import { MissionTimerWidget } from './components/MissionTimerWidget';
import { MissionSubjectSwitcherWidget } from './components/MissionSubjectSwitcherWidget';
import { MissionActionBarWidget } from './components/MissionActionBarWidget';
import { MissionChecklistWidget } from './components/MissionChecklistWidget';
import { MissionNotesDrawer } from './components/MissionNotesDrawer';
import { MissionFormulaSheetModal } from './components/MissionFormulaSheetModal';
import { MissionPauseOverlay } from './components/MissionPauseOverlay';
import { MissionCompleteModal } from './components/MissionCompleteModal';
import { MissionTimeUpModal } from './components/MissionTimeUpModal';
import { MissionCoachWidget } from './components/MissionCoachWidget';
import { QuestionViewerWidget } from './components/QuestionViewerWidget';

import { MissionHeader } from './components/MissionHeader';
import { CasinoSetupOverlay, CasinoFailureOverlay } from './components/CasinoOverlays';
import { useMissionState, MissionModeProps } from './hooks/useMissionState';
import { LECTURE_SPEEDS } from './constants/formulas';

export function MissionMode(props: MissionModeProps) {
  const { mode = 'learning', children } = props;
  
  const { state, setters, handlers, refs } = useMissionState(props);

  return (
    <Modal
      isOpen={true}
      onClose={handlers.handleExit}
      zIndex={9999}
      className="bg-[#070708] text-zinc-100 flex flex-col font-sans overflow-hidden select-none w-full h-full"
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
          onExit={handlers.handleExit} 
        />

        {/* GLOWING AMBIENT FIELD BACKGROUND */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full" />
          <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-emerald-500/3 blur-[120px] rounded-full" />
        </div>

        <MissionHeader onExit={handlers.handleExit} />

        {/* MAIN TWO-COLUMN DECK WORKSPACE */}
        <main className="flex-1 relative z-10 flex flex-col md:flex-row overflow-hidden w-full max-w-5xl mx-auto p-3 sm:p-4 md:p-6 gap-4 md:gap-6 lg:gap-8 justify-center items-center pt-20 md:pt-24 my-auto">
          
          {/* LEFT COMPONENT COLUMN (TIMER & CONTENT COCKPIT) */}
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto md:mx-0 h-full min-h-0">
            
            <MissionTimerWidget
              progressPercent={state.timeProgressPercent}
              seconds={state.seconds}
              focusScore={state.focusScore}
              lectureSpeed={state.lectureSpeed}
              formatTime={handlers.formatTime}
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
          <div className="flex-1 w-full max-w-xl mx-auto flex flex-col h-full bg-zinc-950/60 rounded-3xl border border-zinc-800/80 overflow-hidden shadow-2xl relative">
            <div className="flex-1 flex flex-col min-h-0 relative">
              {children ? (
                children
              ) : state.isPracticeMission && state.activeChap ? (
                <QuestionViewerWidget 
                  chapterId={state.activeChap.id} 
                  subject={state.activeSubject} 
                  onExitPractice={() => {
                    props.onComplete({
                      missionId: state.activeSubjectMission?.id,
                      duration: Math.max(60, state.seconds),
                      questions: 0,
                      xp: Math.max(5, Math.floor(state.seconds / 60) * 5),
                      streak: 0,
                      idleTime: state.idleTime,
                      focusInterruptions: state.focusInterruptions,
                      focusScore: state.focusScore
                    });
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
          onExit={handlers.handleExit}
        />

        <MissionCompleteModal
          isCompleted={state.isCompleted}
          activeDetails={state.activeDetails}
          seconds={state.seconds}
          streak={state.xp?.streak || 0}
          idleTime={state.idleTime}
          focusInterruptions={state.focusInterruptions}
          focusScore={state.focusScore}
          onComplete={handlers.handleMissionComplete}
          onNextSubject={handlers.handleNextSubject}
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