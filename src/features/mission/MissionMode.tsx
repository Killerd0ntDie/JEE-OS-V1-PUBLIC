import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { calculateCurrentStreak } from '@/utils/streakCalculations';
import { Shield, Zap, Sparkles, Coffee, Hourglass, Timer } from 'lucide-react';
import { springs } from '@/constants/motion';

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
import { QuestionViewerWidget } from './components/QuestionViewerWidget';

import { MissionHeader, FocusPresetMode } from './components/MissionHeader';
import { CasinoSetupOverlay, CasinoFailureOverlay } from './components/CasinoOverlays';
import { useMissionState, MissionModeProps } from './hooks/useMissionState';
import { audioEngine } from '@/utils/audioEngine';
import { CockpitTransitionEngine, CockpitAnimMode } from './CockpitTransitionEngine';

export function MissionMode(props: MissionModeProps) {
  const { mode = 'learning', children } = props;
  const [isClosing, setIsClosing] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const pendingCompleteData = useRef<any>(null);
  const actions = useStudyBrainStore(state => state.actions);
  const studySessions = useStudyBrainStore(state => state.studySessions || []);
  const settings = useStudyBrainStore(state => state.settings);
  
  const minStreakMins = Math.round((settings?.minStreakHours ?? 0.5) * 60);
  const computedStreak = useMemo(() => calculateCurrentStreak(studySessions, minStreakMins), [studySessions, minStreakMins]);
  
  const parentOnExitRef = useRef(props.onExit);
  parentOnExitRef.current = props.onExit;

  // Zen / Stealth Focus Mode (Z key or Double-Click)
  const [isZenMode, setIsZenMode] = useState(false);

  // Focus Preset Mode ('deep60', 'pomodoro', 'speedDrill')
  const [focusPreset, setFocusPreset] = useState<FocusPresetMode>('deep60');
  const [isPomodoroBreak, setIsPomodoroBreak] = useState(false);
  const [pomodoroBreakSecs, setPomodoroBreakSecs] = useState(300); // 5 mins break
  const [presetToast, setPresetToast] = useState<{ text: string; icon: any; id: number } | null>(null);

  // Synchro Animation Mode & Speed Persistence (Default: 'positronSparkle' & 0.5x speed)
  const [animMode, setAnimMode] = useState<CockpitAnimMode>(() => {
    try {
      const saved = localStorage.getItem('jeeos_cockpit_anim_pref');
      if (saved) return saved as CockpitAnimMode;
    } catch { /* ignore */ }
    return 'positronSparkle';
  });

  const [speedMultiplier, setSpeedMultiplier] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('jeeos_cockpit_speed_pref');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch { /* ignore */ }
    return 0.5;
  });

  const [stage, setStage] = useState<'standby' | 'magi' | 'active' | 'revealed'>('standby');
  const timerRef = useRef<HTMLDivElement | null>(null);
  const [originCoords, setOriginCoords] = useState<{ x: number; y: number; pctX: number; pctY: number }>({
    x: 0,
    y: 0,
    pctX: 28,
    pctY: 50
  });

  // Calculate exact coordinates of the Timer Widget
  const updateOriginCoords = useCallback(() => {
    if (!timerRef.current) {
      setOriginCoords({
        x: window.innerWidth * 0.28,
        y: window.innerHeight * 0.5,
        pctX: 28,
        pctY: 50
      });
      return;
    }

    const rect = timerRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const pctX = (x / window.innerWidth) * 100;
    const pctY = (y / window.innerHeight) * 100;

    setOriginCoords({ x, y, pctX, pctY });
  }, []);

  useEffect(() => {
    updateOriginCoords();
    window.addEventListener('resize', updateOriginCoords);
    return () => window.removeEventListener('resize', updateOriginCoords);
  }, [updateOriginCoords]);

  // Stop BGM on unmount
  useEffect(() => {
    return () => {
      audioEngine.stopCockpitTheme();
    };
  }, []);

  const initialSubject = props.activeSubject || 'physics';
  const activeSubjRef = useRef<string>(initialSubject);

  // Smooth exit interceptors
  const handleSmoothExit = useCallback(() => {
    audioEngine.playCruelAngelsThesisExit(activeSubjRef.current).catch(() => {});
    setIsClosing(true);
    setTimeout(() => {
      if (parentOnExitRef.current) parentOnExitRef.current();
    }, 250);
  }, []);

  const { state, setters, handlers, refs } = useMissionState({
    ...props,
    onExit: handleSmoothExit
  });

  // Keep ref in sync with active subject
  useEffect(() => {
    if (state.activeSubject) {
      activeSubjRef.current = state.activeSubject;
    }
  }, [state.activeSubject]);

  const [userPracticeMode, setUserPracticeMode] = useState<boolean | null>(null);
  const isPracticing = userPracticeMode !== null ? userPracticeMode : (state.isPracticeMission ?? false);

  const handleSmoothComplete = (data?: any) => {
    if (isClosing) return;
    audioEngine.playCruelAngelsThesisExit(state.activeSubject).catch(() => {});
    setIsClosing(true);
    setTimeout(() => {
      handlers.handleMissionComplete(data);
    }, 250);
  };

  const handleReplaySynchro = () => {
    updateOriginCoords();
    setStage('standby');
  };

  // Pomodoro Interval Handler (25m Focus -> 5m AT-Field Break)
  useEffect(() => {
    if (focusPreset === 'pomodoro' && state.seconds > 0 && state.seconds % 1500 === 0 && !isPomodoroBreak) {
      audioEngine.playAlert();
      setIsPomodoroBreak(true);
      setPomodoroBreakSecs(300);
    }
  }, [focusPreset, state.seconds, isPomodoroBreak]);

  // Break Countdown
  useEffect(() => {
    if (!isPomodoroBreak) return;
    const interval = setInterval(() => {
      setPomodoroBreakSecs(prev => {
        if (prev <= 1) {
          setIsPomodoroBreak(false);
          audioEngine.playSuccess();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPomodoroBreak]);

  // Handle Preset Switching with HUD Transition Feedback
  const handleSelectFocusPreset = (preset: FocusPresetMode) => {
    setFocusPreset(preset);
    audioEngine.playTacticalSwitch().catch(() => {});
    
    let text = 'DEEP FOCUS // 60-MIN TARGET ENGAGED';
    let icon = Timer;
    if (preset === 'pomodoro') {
      text = 'POMODORO 25/5 // 25M SPRINT + AT-FIELD REST';
      icon = Hourglass;
      setUserPracticeMode(false);
      setters.setForcePracticeMode(false);
    } else if (preset === 'speedDrill') {
      text = 'SPEED DRILL // AUTO-PACED PRACTICE ENGAGED';
      icon = Zap;
      setUserPracticeMode(true);
      setters.setForcePracticeMode(true);
    } else {
      setUserPracticeMode(false);
      setters.setForcePracticeMode(false);
    }

    setPresetToast({ text, icon, id: Date.now() });
    setTimeout(() => {
      setPresetToast(prev => (prev?.text === text ? null : prev));
    }, 2200);
  };

  // Keyboard Shortcuts (Space for Pause/Skip, ESC for Exit, Z for Zen Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (stage !== 'revealed') {
          setStage('revealed');
        } else {
          setters.setIsPaused(!state.isPaused);
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSmoothExit();
      }
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        audioEngine.playRadioRelayClick().catch(() => {});
        setIsZenMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, state.isPaused, setters, handleSmoothExit]);

  const isRevealed = stage === 'revealed';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ 
        opacity: isClosing ? 0 : 1, 
        scale: isClosing ? 0.985 : 1, 
      }}
      transition={{ 
        duration: 0.25, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      onDoubleClick={(e) => {
        // Double-click background to toggle Zen mode
        if (e.target === e.currentTarget) {
          audioEngine.playRadioRelayClick().catch(() => {});
          setIsZenMode(prev => !prev);
        }
      }}
      className="text-zinc-100 flex flex-col font-sans overflow-hidden select-none fixed inset-0 w-full h-full bg-[#020306] z-[60]"
    >
      {/* 1. CINEMATIC TIMER-ANCHORED SYNCHRO ENGINE */}
      <CockpitTransitionEngine
        activeSubject={state.activeSubject}
        animMode={animMode}
        speedMultiplier={speedMultiplier}
        originCoords={originCoords}
        stage={stage}
        onStageChange={setStage}
      />

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

      {/* HUD MODE SWITCH TOAST NOTIFICATION */}
      <AnimatePresence>
        {presetToast && (
          <motion.div
            key={presetToast.id}
            initial={{ opacity: 0, y: -25, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.92 }}
            transition={springs.snappy}
            className="fixed top-18 inset-x-0 mx-auto w-fit z-50 pointer-events-none px-4"
          >
            <div 
              style={{
                background: 'rgba(10, 14, 23, 0.90)',
                backdropFilter: 'blur(28px)',
                border: '1.5px solid rgba(99, 102, 241, 0.5)',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.25)'
              }}
              className="px-5 py-2 rounded-2xl flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white"
            >
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>{presetToast.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AT-FIELD POMODORO REST BREAK OVERLAY */}
      <AnimatePresence>
        {isPomodoroBreak && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={springs.snappy}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020306]/95 backdrop-blur-3xl p-6"
          >
            <div 
              style={{
                background: 'rgba(10, 14, 23, 0.92)',
                backdropFilter: 'blur(30px)',
                border: '1.5px solid rgba(56, 189, 248, 0.4)',
                boxShadow: '0 0 80px rgba(56, 189, 248, 0.2)'
              }}
              className="max-w-md w-full rounded-3xl p-8 text-center space-y-6 relative overflow-hidden"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/40 border border-sky-500/40 text-sky-400 text-xs font-mono font-bold uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                <span>AT-FIELD REST PROTOCOL</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black font-mono text-white tracking-tight">SYNCHRO COOLING</h2>
                <p className="text-xs text-zinc-400">25m sprint concluded. Stand up, hydrate, and relax your eyes.</p>
              </div>

              {/* Breathing Guide Circle */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full border-2 border-sky-400/40 bg-sky-500/10"
                />
                <div className="text-3xl font-black font-mono text-white">
                  {Math.floor(pomodoroBreakSecs / 60)}:{(pomodoroBreakSecs % 60).toString().padStart(2, '0')}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPomodoroBreak(false)}
                className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-sky-900/30"
              >
                Resume Focus Sprint
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING ZEN STEALTH FOCUS BOTTOM PILL (SEPARATED, ZERO COLLISION) */}
      <AnimatePresence>
        {isZenMode && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.95 }}
            transition={springs.snappy}
            className="fixed bottom-8 inset-x-0 mx-auto w-fit z-30 pointer-events-none px-4"
          >
            <div 
              style={{
                background: 'rgba(10, 14, 23, 0.88)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(245, 158, 11, 0.15)'
              }}
              className="px-4 sm:px-5 py-2 rounded-full flex items-center gap-2 text-[10.5px] sm:text-xs font-mono font-bold uppercase tracking-wider text-amber-300 shadow-xl"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>ZEN FOCUS MODE • PRESS 'Z' OR DOUBLE-CLICK TO EXPAND</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. LIQUID GLASS COCKPIT HUD CONTAINER */}
      <motion.div
        style={{
          clipPath: !isRevealed
            ? `circle(0% at ${originCoords.pctX}% ${originCoords.pctY}%)`
            : 'circle(180% at 50% 50%)',
          transition: isRevealed 
            ? `clip-path ${0.75 / speedMultiplier}s cubic-bezier(0.16, 1, 0.3, 1)` 
            : 'none'
        }}
        className="w-full h-full flex flex-col relative z-10"
      >
        <MissionHeader 
          onExit={handleSmoothExit} 
          animMode={animMode}
          onAnimModeChange={setAnimMode}
          speedMultiplier={speedMultiplier}
          onSpeedChange={setSpeedMultiplier}
          onReplay={handleReplaySynchro}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode(prev => !prev)}
          focusPreset={focusPreset}
          onSelectFocusPreset={handleSelectFocusPreset}
          targetDurationMins={state.targetDurationMins}
        />

        {/* Ambient Subject-Themed Deep Space Focus Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0 opacity-40">
          <div className={`absolute top-1/3 left-1/4 w-96 h-96 rounded-full blur-[140px] transition-colors duration-700 ${
            state.activeSubject === 'chemistry'
              ? 'bg-emerald-500/[0.12]'
              : state.activeSubject === 'maths'
              ? 'bg-purple-500/[0.12]'
              : 'bg-sky-500/[0.12]'
          }`} />
          <div className={`absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full blur-[160px] transition-colors duration-700 ${
            state.activeSubject === 'chemistry'
              ? 'bg-teal-500/[0.08]'
              : state.activeSubject === 'maths'
              ? 'bg-indigo-500/[0.08]'
              : 'bg-blue-500/[0.08]'
          }`} />
        </div>

        {/* MAIN WORKSPACE DECK CONTAINER (BUTTERY SMOOTH LAYOUT TRANSITION) */}
        <motion.main 
          layout
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 min-h-0 relative z-10 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden w-full max-w-5xl mx-auto px-4 sm:px-6 py-2 gap-6 justify-center items-center pt-16 md:pt-20 my-auto max-h-[calc(100vh-4rem)]"
        >
          
          {/* LEFT COMPONENT COLUMN (TIMER & CONTENT COCKPIT) */}
          <motion.div 
            layout
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`flex flex-col items-center justify-center h-full min-h-0 space-y-3 transition-all duration-300 ${
              isZenMode ? 'w-full max-w-lg mx-auto' : 'flex-1 w-full max-w-lg mx-auto md:mx-0'
            }`}
          >
            
            <MissionTimerWidget
              ref={timerRef}
              stage={stage}
              progressPercent={state.timeProgressPercent}
              seconds={state.seconds}
              focusScore={state.focusScore}
              activeSubject={state.activeSubject}
              formatTime={handlers.formatTime}
              onResetTimer={handlers.handleResetTimer}
              isZenMode={isZenMode}
              onToggleZenMode={() => setIsZenMode(prev => !prev)}
              focusPreset={focusPreset}
              targetDurationMins={state.targetDurationMins}
            />

            {mode === 'learning' && !isZenMode && (
              <MissionSubjectSwitcherWidget
                activeSubject={state.activeSubject}
                activeDetails={state.activeDetails}
                subjectsDetails={state.subjectsDetails}
                onChangeSubject={(subj) => {
                  setters.setActiveSubject(subj);
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

            {mode === 'learning' && !isZenMode && (
              <MissionActionBarWidget
                isNotesOpen={state.isNotesOpen}
                setIsNotesOpen={setters.setIsNotesOpen}
                isFormulaOpen={state.isFormulaOpen}
                setIsFormulaOpen={setters.setIsFormulaOpen}
                lectureSpeed={state.lectureSpeed}
                onCycleSpeed={() => {}}
                isCoachVisible={false}
                setIsCoachVisible={() => {}}
              />
            )}

          </motion.div>

          {/* RIGHT COMPONENT COLUMN (DIRECTIVES DECK - SLIDES OUT SMOOTHLY IN ZEN MODE) */}
          <AnimatePresence mode="popLayout">
            {!isZenMode && (
              <motion.div 
                key="directives-deck"
                layout
                initial={{ opacity: 0, scale: 0.95, x: 25 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: 25 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: 'rgba(10, 14, 23, 0.78)',
                  backdropFilter: 'blur(24px) saturate(190%) contrast(105%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                }}
                className="flex-1 w-full max-w-xl mx-auto flex flex-col h-full rounded-3xl overflow-hidden shadow-2xl relative"
              >
                <div className="flex-1 flex flex-col min-h-0 relative z-10">
                  {children ? (
                    children
                  ) : isPracticing && state.activeChap ? (
                    <QuestionViewerWidget 
                      chapterId={state.activeChap.id} 
                      chapterName={state.activeChap.name}
                      subject={state.activeSubject} 
                      onExitPractice={() => {
                        setUserPracticeMode(false);
                        setters.setForcePracticeMode(false);
                      }}
                    />
                  ) : (
                    <MissionChecklistWidget
                      progressPercent={state.checklistProgressPercent}
                      checklist={state.checklist}
                      activeSubject={state.activeSubject}
                      onToggleTask={handlers.handleToggleTask}
                      isPaused={state.isPaused}
                      onTogglePause={() => setters.setIsPaused(prev => {
                        if (!prev) handlers.incrementInterruption();
                        return !prev;
                      })}
                      onCompleteAll={() => {
                        if (!state.activeSubjectMission) {
                          console.warn(`[MissionMode] "Complete" pressed for ${state.activeSubject} but no pending mission exists for this subject — skipping completion.`);
                          return;
                        }
                        setters.setChecklist(prev => {
                          const allDone: Record<string, boolean> = {};
                          Object.keys(prev).forEach(k => { allDone[k] = true; });
                          return allDone;
                        });
                        setters.setIsCompleted(true);
                      }}
                      onStartPractice={() => {
                        setUserPracticeMode(true);
                        setters.setForcePracticeMode(true);
                      }}
                      onAddTask={handlers.handleAddCustomTask}
                      onRemoveTask={handlers.handleRemoveTask}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.main>
      </motion.div>

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
        activeSubject={state.activeSubject}
        focusScore={state.focusScore}
        focusInterruptions={state.focusInterruptions}
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
          const isBerserk = (state.seconds >= 2700 && state.focusScore >= 95);
          const baseXP = Math.floor(state.seconds / 60) * 5;
          const finalXP = isBerserk ? Math.floor(baseXP * 1.5) : baseXP;

          const base = pendingCompleteData.current || {
            duration: state.seconds,
            questions: 0,
            xp: finalXP,
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

    </motion.div>
  );
}