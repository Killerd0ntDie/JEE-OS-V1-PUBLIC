import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { audioEngine } from '@/utils/audioEngine';
import { calculateFocusScore } from '@/utils/focusScore';
import { LECTURE_SPEEDS, FORMULAS } from '../constants/formulas';

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
  const { initialPaused = false, initialSeconds = 0, skipSetup = false, customDurationSecs, onExit, onComplete, activeMissionId } = props;
  
  const safeInitial = (props.activeSubject === 'all' || !['physics', 'chemistry', 'maths'].includes(props.activeSubject)) ? 'physics' : (props.activeSubject as 'physics' | 'chemistry' | 'maths');
  const [activeSubject, setActiveSubject] = useState<'physics' | 'chemistry' | 'maths'>(safeInitial);
  
  const settings = useStudyBrainStore(state => state.settings);
  const isCasinoEnabled = settings.enablePomodoroCasino ?? false;

  const [isPaused, setIsPaused] = useState(initialPaused && isCasinoEnabled);
  const [isPauseOverlayDismissed, setIsPauseOverlayDismissed] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(initialSeconds === 0 && !skipSetup && isCasinoEnabled);
  const [targetQuestions, setTargetQuestions] = useState(25);
  const [xpWager, setXpWager] = useState(50);
  const [missionFailed, setMissionFailed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [focusScore, setFocusScore] = useState(100);
  const [lectureSpeed, setLectureSpeed] = useState(1.25);
  
  const [idleTime, setIdleTime] = useState(0);
  const [focusInterruptions, setFocusInterruptions] = useState(0);
  const [extraTimeAdded, setExtraTimeAdded] = useState(0);
  const [isTimeUpModalOpen, setIsTimeUpModalOpen] = useState(false);
  const [hasTriggeredTimeUp, setHasTriggeredTimeUp] = useState(false);
  
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isFormulaOpen, setIsFormulaOpen] = useState(false);
  const [formulaSearch, setFormulaSearch] = useState('');

  const [notes, setNotes] = useState<{ id: string; timestamp: string; text: string; category: string }[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [activeNoteCategory, setActiveNoteCategory] = useState('Quick Notes');

  const [coachTip, setCoachTip] = useState('Cockpit armed. High retention mode is actively analyzing your pace.');
  const [isCoachVisible, setIsCoachVisible] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const notesEndRef = useRef<HTMLDivElement>(null);
  
  const actions = useStudyBrainStore(state => state.actions);
  // settings is already defined above
  const todayMissions = useStudyBrainStore(state => state.todayMissions);
  const chapters = useStudyBrainStore(state => state.chapters);
  const chaptersWithData = useStudyBrainStore(state => state.chaptersWithData);
  const xp = useStudyBrainStore(state => state.xp);
  const radarFocusedChapter = useStudyBrainStore(state => (state as any).radarFocusedChapter);
  
  const pauseOnTabChangeEnabled = settings.pauseOnTabChange ?? true;
  const uninterruptedSecondsRef = useRef(0);
  const focusInterruptionsRef = useRef(0);
  const idleTimeRef = useRef(0);
  const secondsRef = useRef(initialSeconds);

  const incrementInterruption = () => {
    focusInterruptionsRef.current += 1;
    setFocusInterruptions(prev => prev + 1);
  };

  const handleExit = () => {
    onExit(secondsRef.current);
  };

  const dynamicChecklist = useMemo(() => {
    let activeSubjectMission = todayMissions.find(m => m.subject === activeSubject && !m.completed);
    if (activeMissionId) {
      const explicitMission = todayMissions.find(m => m.id === activeMissionId);
      if (explicitMission) activeSubjectMission = explicitMission;
    }
    
    const initialList: Record<string, boolean> = {};
    if (!activeSubjectMission) {
      initialList['Watch lecture'] = false;
      initialList['Make notes'] = false;
      initialList['Solve DPP'] = false;
      initialList['Mark doubts'] = false;
      initialList['Revise formulas'] = false;
    } else {
      const type = activeSubjectMission.type.toLowerCase();
      if (type.includes('theory') || type.includes('lecture')) {
        initialList['Watch lecture'] = false;
        initialList['Make active notes'] = false;
        initialList['Review key concepts'] = false;
        initialList['Read textbook summary'] = false;
      } else if (type.includes('practice') || type.includes('dpp') || type.includes('pyq')) {
        initialList['Solve problem set (timer on)'] = false;
        initialList['Analyze mistakes'] = false;
        initialList['Log errors to Error Book'] = false;
        initialList['Revise formulas used'] = false;
      } else if (type.includes('revision') || type.includes('recall')) {
        initialList['Active recall via flashcards'] = false;
        initialList['Review short notes'] = false;
        initialList['Test retention (mini-quiz)'] = false;
      } else {
        initialList['Complete core task'] = false;
        initialList['Review work'] = false;
        initialList['Log progress'] = false;
      }
    }
    return initialList;
  }, [todayMissions, activeSubject]);

  const [checklist, setChecklist] = useState<Record<string, boolean>>(dynamicChecklist);

  useEffect(() => {
    setChecklist(dynamicChecklist);
  }, [dynamicChecklist]);

  const subjectsDetails = useMemo(() => {
    const getActiveChapterInfo = (subj: 'physics' | 'chemistry' | 'maths') => {
      const subjChaps = chapters.filter(c => c.subject === subj);
      const focusedId = radarFocusedChapter;
      const focusedChap = focusedId
        ? subjChaps.find(c => c.id === focusedId || c.name === focusedId)
        : undefined;
      let mission = todayMissions.find(m => m.subject === subj && !m.completed);
      if (activeMissionId) {
        const explicitMission = todayMissions.find(m => m.id === activeMissionId && m.subject === subj);
        if (explicitMission) mission = explicitMission;
      }
      
      let activeChap = focusedChap || subjChaps.find(c => c.completion < 100) || subjChaps[0];
      if (mission && mission.chapterId) {
        const mc = subjChaps.find(c => c.id === mission.chapterId);
        if (mc) activeChap = mc;
      }

      if (!activeChap) {
        return {
          name: subj === 'physics' ? 'Physics' : subj === 'chemistry' ? 'Chemistry' : 'Mathematics',
          chapter: mission?.chapterName || mission?.chapter || 'Syllabus Core',
          lecture: mission?.taskName || 'Lecture 1: Introduction',
          duration: mission?.duration ? `${mission.duration}m remaining` : '0h',
          color: subj === 'physics' ? 'sky' : subj === 'chemistry' ? 'emerald' : 'purple',
          textClass: subj === 'physics' ? 'text-sky-400' : subj === 'chemistry' ? 'text-emerald-400' : 'text-indigo-400',
          bgGlow: subj === 'physics' ? 'bg-sky-500/10' : subj === 'chemistry' ? 'bg-emerald-500/10' : 'bg-indigo-500/10',
          borderClass: subj === 'physics' ? 'border-sky-500/20' : subj === 'chemistry' ? 'border-emerald-500/20' : 'border-indigo-500/20'
        };
      }

      const nextLec = Math.min(activeChap.totalLectures, activeChap.currentLecture + 1);
      let durationStr = '';
      if (mission && mission.duration) {
        durationStr = `${mission.duration}m remaining`;
      } else {
        const activeChapData = chaptersWithData.find(c => c.chapter.id === activeChap.id)?.data;
        const estTime = activeChapData ? Math.max(1, activeChapData.estimatedRemainingTime) : 5;
        durationStr = `${estTime}h remaining`;
      }

      return {
        name: subj === 'physics' ? 'Physics' : subj === 'chemistry' ? 'Chemistry' : 'Mathematics',
        chapter: mission?.chapterName || mission?.chapter || activeChap.name,
        lecture: mission?.taskName || (nextLec > 0 ? `Lecture ${nextLec}: Core Foundations` : `Lecture 1: Introduction`),
        duration: durationStr,
        color: subj === 'physics' ? 'sky' : subj === 'chemistry' ? 'emerald' : 'purple',
        textClass: subj === 'physics' ? 'text-sky-400' : subj === 'chemistry' ? 'text-emerald-400' : 'text-indigo-400',
        bgGlow: subj === 'physics' ? 'bg-sky-500/10' : subj === 'chemistry' ? 'bg-emerald-500/10' : 'bg-indigo-500/10',
        borderClass: subj === 'physics' ? 'border-sky-500/20' : subj === 'chemistry' ? 'border-emerald-500/20' : 'border-indigo-500/20'
      };
    };

    return {
      physics: getActiveChapterInfo('physics'),
      chemistry: getActiveChapterInfo('chemistry'),
      maths: getActiveChapterInfo('maths')
    };
  }, [chapters, radarFocusedChapter, todayMissions, chaptersWithData, activeMissionId]);

  const activeDetails = subjectsDetails[activeSubject];

  const activeSubjectMission = useMemo(() => {
    if (activeMissionId) {
      const explicitMission = todayMissions.find(m => m.id === activeMissionId);
      if (explicitMission) return explicitMission;
    }
    return todayMissions.find(m => m.subject.toLowerCase() === activeSubject.toLowerCase() && !m.completed);
  }, [todayMissions, activeSubject, activeMissionId]);

  const activeChap = useMemo(() => {
    const subjChaps = chapters.filter(c => c.subject === activeSubject);
    if (radarFocusedChapter) {
      const focused = subjChaps.find(c => c.id === radarFocusedChapter || c.name === radarFocusedChapter);
      if (focused) return focused;
    }
    return subjChaps.find(c => c.completion < 100) || subjChaps[0];
  }, [chapters, radarFocusedChapter, activeSubject]);

  const isCompletedChapter = useMemo(() => {
    if (!activeChap) return false;
    return activeChap.completion >= 100 || activeChap.status === 'Mastered';
  }, [activeChap]);

  const [forcePracticeMode, setForcePracticeMode] = useState<boolean>(false);

  const isPracticeMission = useMemo(() => {
    if (forcePracticeMode) return true;
    let activeSubjMission = todayMissions.find(m => m.subject === activeSubject && !m.completed);
    if (activeMissionId) {
      const explicitMission = todayMissions.find(m => m.id === activeMissionId);
      if (explicitMission) activeSubjMission = explicitMission;
    }
    if (!activeSubjMission) return false;
    const type = activeSubjMission.type.toLowerCase();
    return type.includes('practice') || type.includes('pyq') || type.includes('revision');
  }, [todayMissions, activeSubject, forcePracticeMode, activeMissionId]);

  const sessionDurationSecs = useMemo(() => {
    if (customDurationSecs) return customDurationSecs + extraTimeAdded * 60;
    let activeSubjMission = todayMissions.find(m => m.subject === activeSubject && !m.completed);
    if (activeMissionId) {
      const explicitMission = todayMissions.find(m => m.id === activeMissionId);
      if (explicitMission) activeSubjMission = explicitMission;
    }
    return (activeSubjMission?.duration || 60) * 60 + extraTimeAdded * 60;
  }, [customDurationSecs, todayMissions, activeSubject, extraTimeAdded, activeMissionId]);

  const timeProgressPercent = Math.min(100, (seconds / sessionDurationSecs) * 100);

  const [hasPlayedStartChime, setHasPlayedStartChime] = useState(false);
  useEffect(() => {
    if (!hasPlayedStartChime && settings.soundEffects) {
      audioEngine.playStartChime(settings.volume / 100);
      setHasPlayedStartChime(true);
    }
  }, [hasPlayedStartChime, settings]);

  useEffect(() => {
    let lastTick = Date.now();
    let interval: any = null;
    if (!isSettingUp && !isCompleted && !isTimeUpModalOpen && !missionFailed) {
      interval = setInterval(() => {
        const now = Date.now();
        const deltaSecs = Math.floor((now - lastTick) / 1000);
        
        if (deltaSecs > 0) {
          if (!isPaused) {
            setSeconds(prev => {
              const next = prev + deltaSecs;
              secondsRef.current = next;
              return next;
            });
            
            uninterruptedSecondsRef.current += deltaSecs;
            setFocusScore(calculateFocusScore({
              interruptions: focusInterruptionsRef.current,
              idleSeconds: idleTimeRef.current,
              uninterruptedSeconds: uninterruptedSecondsRef.current,
            }));
          } else {
            setIdleTime(prev => prev + deltaSecs);
            idleTimeRef.current += deltaSecs;
            uninterruptedSecondsRef.current = 0;
          }
          lastTick += deltaSecs * 1000; 
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, isCompleted, isTimeUpModalOpen, isSettingUp, missionFailed]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isSettingUp && !isPaused && !isCompleted && !missionFailed) {
        if (pauseOnTabChangeEnabled) {
          setIsPaused(true);
          incrementInterruption();
          setCoachTip('Session auto-paused due to tab switch. Focus lost.');
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPaused, isCompleted, pauseOnTabChangeEnabled, isSettingUp, missionFailed]);

  useEffect(() => {
    if (seconds >= sessionDurationSecs && !hasTriggeredTimeUp && !isCompleted) {
      setIsTimeUpModalOpen(true);
      setHasTriggeredTimeUp(true);
    }
  }, [seconds, sessionDurationSecs, hasTriggeredTimeUp, isCompleted]);

  useEffect(() => {
    const coachTips = [
      'Excellent pace! Your focus score is in the top 2% of JEE aspirants.',
      'Active learning logged. Try pausing to verify torque vector direction manually.',
      'Formula sheets updated. Revise "Parallel Axis Theorem" for complex planar body problems.',
      'You are crushing this block. 15m left of optimal focus retention.',
      'Take a micro 1-minute deep breathing break to flush out mental load.',
      'Average lecture speed calibrated to 1.25x. Efficient mental bandwidth uptake.'
    ];

    const coachInterval = setInterval(() => {
      if (!isSettingUp && !isPaused && !isCompleted && !missionFailed) {
        const randTip = coachTips[Math.floor(Math.random() * coachTips.length)];
        setCoachTip(randTip);
      }
    }, 25000);

    return () => clearInterval(coachInterval);
  }, [isPaused, isCompleted, isSettingUp, missionFailed]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isPaused) {
      setIsPauseOverlayDismissed(false);
    }
  }, [isPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          setIsPaused(prev => {
            const next = !prev;
            if (next) incrementInterruption();
            return next;
          });
          break;
        case 'enter':
          e.preventDefault();
          setChecklist(prev => {
            const next = { ...prev };
            const firstUnchecked = Object.keys(next).find(k => !next[k]);
            if (firstUnchecked) {
              next[firstUnchecked] = true;
              setCoachTip(`Task completed: "${firstUnchecked}"!`);
            }
            return next;
          });
          break;
        case 'tab':
          e.preventDefault();
          const subjects: ('physics' | 'chemistry' | 'maths')[] = ['physics', 'chemistry', 'maths'];
          const nextIdx = (subjects.indexOf(activeSubject) + 1) % subjects.length;
          setActiveSubject(subjects[nextIdx]);
          setCoachTip(`Switched track to ${subjectsDetails[subjects[nextIdx]].name}. Checklist reset.`);
          break;

        case 'n':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsNotesOpen(prev => !prev);
          }
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsFormulaOpen(prev => !prev);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSubject, handleExit, isPaused, subjectsDetails]);

  const handleToggleTask = (task: string) => {
    setChecklist(prev => ({
      ...prev,
      [task]: !prev[task]
    }));
  };

  const handleAddCustomTask = (task: string) => {
    setChecklist(prev => ({
      ...prev,
      [task]: false
    }));
  };

  const handleRemoveTask = (task: string) => {
    setChecklist(prev => {
      const next = { ...prev };
      delete next[task];
      return next;
    });
  };

  const checklistProgressPercent = useMemo(() => {
    const total = Object.keys(checklist).length;
    if (total === 0) return 0;
    const completed = Object.values(checklist).filter(Boolean).length;
    return Math.round((completed / total) * 100);
  }, [checklist]);

  useEffect(() => {
    if (checklistProgressPercent === 100 && !isCompleted) {
      if (!activeSubjectMission) {
        console.warn(`[MissionMode] Checklist completed for ${activeSubject} but no pending mission exists for this subject — skipping auto-completion.`);
        setCoachTip(`No pending ${subjectsDetails[activeSubject].name} mission right now — switch subject or check your Daily Missions list.`);
        return;
      }
      setTimeout(() => {
        setIsCompleted(true);
        if (settings.soundEffects) {
          audioEngine.playSuccessChime(settings.volume / 100);
        }
      }, 300);
    }
  }, [checklistProgressPercent, isCompleted, settings, activeSubjectMission, activeSubject, subjectsDetails]);

  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noteInput.trim()) return;

    const newNote = {
      id: Date.now().toString(),
      timestamp: formatTime(seconds),
      text: noteInput.trim(),
      category: activeNoteCategory
    };

    setNotes(prev => [...prev, newNote]);
    setNoteInput('');
    setCoachTip('Note captured with active session timestamp.');

    setTimeout(() => {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleQuickPresetNote = (presetText: string) => {
    const newNote = {
      id: Date.now().toString(),
      timestamp: formatTime(seconds),
      text: presetText,
      category: activeNoteCategory
    };
    setNotes(prev => [...prev, newNote]);
    setCoachTip(`Quick note logged: "${presetText}"`);
    setTimeout(() => {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const filteredFormulas = useMemo(() => {
    const list = FORMULAS[activeSubject] || [];
    if (!formulaSearch.trim()) return list;
    return list.filter(f => 
      f.name.toLowerCase().includes(formulaSearch.toLowerCase()) || 
      f.formula.toLowerCase().includes(formulaSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(formulaSearch.toLowerCase())
    );
  }, [activeSubject, formulaSearch]);

  const handleNextSubject = async () => {
    if (activeSubjectMission?.id) {
      await actions.completeTask(activeSubjectMission.id, Math.max(60, seconds));
    } else {
      console.warn(`[MissionMode] "Next subject" pressed for ${activeSubject} but no matching mission was found — nothing was marked complete.`);
    }
    
    const allIncompleteMissions = todayMissions.filter(m => !m.completed);
    const currentMissionIdx = allIncompleteMissions.findIndex(m => m.subject === activeSubject);
    const nextMission = allIncompleteMissions[currentMissionIdx + 1] || allIncompleteMissions[0];
    
    if (nextMission && nextMission.subject) {
      let nextSubjRaw = nextMission.subject.toLowerCase();
      if (nextSubjRaw === 'math') nextSubjRaw = 'maths';
      
      const validSubjects = ['physics', 'chemistry', 'maths'];
      if (validSubjects.includes(nextSubjRaw)) {
        setActiveSubject(nextSubjRaw as 'physics' | 'chemistry' | 'maths');
        setCoachTip(`Commencing next mission: ${nextMission.taskName}. Focus locked.`);
      } else {
        setActiveSubject('physics');
        setCoachTip('All missions completed for today! Starting fresh cycle.');
      }
    } else {
      const subjects: ('physics' | 'chemistry' | 'maths')[] = ['physics', 'chemistry', 'maths'];
      setActiveSubject(subjects[0]);
      setCoachTip('All missions completed for today! Starting fresh cycle.');
    }
    
    setChecklist({
      'Watch lecture': false,
      'Make notes': false,
      'Solve DPP': false,
      'Mark doubts': false,
      'Revise formulas': false,
    });
    setIsCompleted(false);
    setSeconds(0);
    setFocusScore(100);
    uninterruptedSecondsRef.current = 0;
    focusInterruptionsRef.current = 0;
    idleTimeRef.current = 0;
    setIdleTime(0);
    setFocusInterruptions(0);
    setFocusScore(100);
    setIsSettingUp(true);
  };

  const handleMissionComplete = async (data?: any) => {
    if (activeSubjectMission?.id) {
      await actions.completeTask(activeSubjectMission.id, data?.duration ?? Math.max(60, seconds));
    } else {
      console.warn(`[MissionMode] Complete pressed for ${activeSubject} but no matching mission was found — nothing was marked complete in store.`);
    }

    if (onComplete) {
      onComplete({
        missionId: activeSubjectMission?.id,
        duration: data?.duration ?? Math.max(60, seconds), // Ensure at least 60s
        questions: data?.questions ?? 0, 
        correct: data?.correct ?? 0,
        confidence: data?.confidence ?? 3,
        xp: data?.xp ?? Math.max(5, Math.floor(seconds / 60) * 5),
        streak: 0,
        idleTime: data?.idleTime ?? idleTime,
        focusInterruptions: data?.focusInterruptions ?? focusInterruptions,
        focusScore: data?.focusScore ?? focusScore
      });
    } else {
      onExit(seconds);
    }
  };

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
    xpWager, missionFailed, isCompleted, seconds, focusScore, lectureSpeed,
    idleTime, focusInterruptions, extraTimeAdded, isTimeUpModalOpen,
    hasTriggeredTimeUp, isNotesOpen, isFormulaOpen, formulaSearch,
    checklist, notes, noteInput, activeNoteCategory, coachTip,
    isCoachVisible, showShortcuts, subjectsDetails, activeDetails,
    activeSubjectMission, activeChap, isCompletedChapter, forcePracticeMode,
    isPracticeMission, sessionDurationSecs, timeProgressPercent,
    checklistProgressPercent, filteredFormulas, xp
  ]);
}
