import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { useStudyBrain } from '../../context/StudyBrainContext';
import { audioEngine } from '../../utils/audioEngine';
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
import { calculateFocusScore } from '../../utils/focusScore';
import { 
  Play, 
  Pause, 
  X, 
  Check, 
  BookOpen, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  Search, 
  Terminal, 
  Target, 
  Award, 
  Flame, 
  Plus, 
  CheckCircle2, 
  ListTodo, 
  RotateCcw, 
  Zap, 
  Volume2, 
  Keyboard, 
  Eye, 
  FileText 
} from 'lucide-react';

interface MissionModeProps {
  mode?: 'learning' | 'mock' | 'revision' | 'mistake';
  children?: React.ReactNode;
  customDurationSecs?: number;
  activeSubject: 'physics' | 'chemistry' | 'maths' | 'all';
  initialPaused?: boolean;
  initialSeconds?: number;
  onExit: (currentSeconds?: number) => void;
  onComplete: (stats: {
    missionId: string | undefined;
    duration: number;
    questions: number;
    xp: number;
    streak: number;
    idleTime: number;
    focusInterruptions: number;
    focusScore: number;
  }) => void;
}

interface Formula {
  name: string;
  formula: string;
  description: string;
}

const FORMULAS: Record<string, Formula[]> = {
  physics: [
    { name: 'Moment of Inertia', formula: 'I = ∑ m_i r_i^2', description: 'Measure of rotational inertia of a rigid body relative to an axis.' },
    { name: 'Torque', formula: 'τ = r × F = I α', description: 'Rotational analog of force, causing angular acceleration.' },
    { name: 'Angular Momentum', formula: 'L = r × p = I ω', description: 'Quantity of rotation, conserved in absence of external torque.' },
    { name: 'Rotational Kinetic Energy', formula: 'K = 1/2 I ω^2', description: 'Kinetic energy of a body rotating around a fixed axis.' },
    { name: 'Parallel Axis Theorem', formula: 'I = I_cm + M d^2', description: 'Calculates moment of inertia about an axis parallel to a centroidal one.' },
    { name: 'Perpendicular Axis Theorem', formula: 'I_z = I_x + I_y', description: 'Applicable for 2D laminar bodies in a flat plane.' }
  ],
  chemistry: [
    { name: 'Nucleophilic Addition', formula: 'Nu⁻ + C=O ➔ Nu-C-O⁻', description: 'Carbonyl carbon is highly electrophilic and susceptible to attack.' },
    { name: 'Grignard Reaction', formula: 'R-MgX + R\'CHO ➔ Sec. Alcohol', description: 'Strong carbanion nucleophile attacks the carbonyl group.' },
    { name: 'Tollens\' Oxidation', formula: 'R-CHO + 2Ag(NH3)2⁺ ➔ R-COO⁻ + 2Ag↓', description: 'Aldehydes reduce Tollens reagent to give a bright silver mirror.' },
    { name: 'Fehling\'s Reaction', formula: 'RCHO + 2Cu²⁺ + 5OH⁻ ➔ RCOO⁻ + Cu2O↓', description: 'Aliphatic aldehydes reduce Cu²⁺ to a red cuprous oxide precipitate.' },
    { name: 'Aldol Condensation', formula: '2 R-CH2-CHO ➔ β-hydroxyaldehyde', description: 'Base-catalyzed reaction requiring α-hydrogen on the carbonyl.' }
  ],
  maths: [
    { name: 'Sine Reduction Formula', formula: 'I_n = - (sin^(n-1)x cos x)/n + (n-1)/n I_(n-2)', description: 'Simplifies integration of higher trigonometric power factors.' },
    { name: 'Wallis\' Formula', formula: '∫₀^π/2 sinⁿx dx = (n-1)/n * (n-3)/(n-2) ...', description: 'Extremely efficient evaluation of definite integrals over quarter-period.' },
    { name: 'Leibniz Integral Rule', formula: 'd/dx ∫_u(x)^v(x) f(t) dt = f(v)v\' - f(u)u\'', description: 'Differentiating an integral under the integral sign.' },
    { name: 'Integration by Parts', formula: '∫ u dv = u v - ∫ v du', description: 'Fundamental method for integrating product of two functions.' },
    { name: 'King\'s Property', formula: '∫_a^b f(x) dx = ∫_a^b f(a+b-x) dx', description: 'Crucial identity for symmetry-based definite integrations.' }
  ]
};

const LECTURE_SPEEDS = [1.0, 1.25, 1.5, 1.75, 2.0];

export function MissionMode({ 
  mode = 'learning',
  children,
  customDurationSecs,
  activeSubject: initialSubject, 
  initialPaused = false,
  initialSeconds = 0,
  onExit, 
  onComplete 
}: MissionModeProps) {
  // State variables matching requirements
  const safeInitial = (initialSubject === 'all' || !['physics', 'chemistry', 'maths'].includes(initialSubject)) ? 'physics' : (initialSubject as 'physics' | 'chemistry' | 'maths');
  const [activeSubject, setActiveSubject] = useState<'physics' | 'chemistry' | 'maths'>(safeInitial);
  const [isPaused, setIsPaused] = useState(initialPaused);
  // Tracks whether the pause OVERLAY has been dismissed with ESC while the mission
  // stays paused underneath. Reset to false any time a fresh pause begins (see effect below),
  // so the overlay always reappears the next time the mission is actually paused.
  const [isPauseOverlayDismissed, setIsPauseOverlayDismissed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [focusScore, setFocusScore] = useState(100);
  const [lectureSpeed, setLectureSpeed] = useState(1.25);
  
  // Simulated stats tracking
  const [idleTime, setIdleTime] = useState(0);
  const [focusInterruptions, setFocusInterruptions] = useState(0);
  const [extraTimeAdded, setExtraTimeAdded] = useState(0); // in minutes
  const [isTimeUpModalOpen, setIsTimeUpModalOpen] = useState(false);
  const [hasTriggeredTimeUp, setHasTriggeredTimeUp] = useState(false);
  
  // Custom interactive features
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isFormulaOpen, setIsFormulaOpen] = useState(false);
  const [formulaSearch, setFormulaSearch] = useState('');
  
  const { state, actions } = useStudyBrain();
  const pauseOnTabChangeEnabled = state.settings.pauseOnTabChange ?? true;
  const uninterruptedSecondsRef = useRef(0);
  const focusInterruptionsRef = useRef(0);
  const idleTimeRef = useRef(0);
  // Always-current snapshot of seconds for use in closures that must not re-register on every tick
  const secondsRef = useRef(initialSeconds);

  const incrementInterruption = () => {
    focusInterruptionsRef.current += 1;
    setFocusInterruptions(prev => prev + 1);
  };

  const handleExit = () => {
    onExit(secondsRef.current);
  };

  // Dynamically build micro-steps checklist based on the current active mission type for this subject
  const dynamicChecklist = useMemo(() => {
    const activeSubjectMission = state.todayMissions.find(m => m.subject === activeSubject && !m.completed);
    
    const initialList: Record<string, boolean> = {};
    if (!activeSubjectMission) {
      // Default fallback
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
  }, [state.todayMissions, activeSubject]);

  // Checklist driving completion state
  const [checklist, setChecklist] = useState<Record<string, boolean>>(dynamicChecklist);

  useEffect(() => {
    setChecklist(dynamicChecklist);
  }, [dynamicChecklist]);

  // Timestamped Notes (initially empty per user request)
  const [notes, setNotes] = useState<{ id: string; timestamp: string; text: string; category: string }[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [activeNoteCategory, setActiveNoteCategory] = useState('Quick Notes');

  // AI Coach state
  const [coachTip, setCoachTip] = useState('Cockpit armed. High retention mode is actively analyzing your pace.');
  const [isCoachVisible, setIsCoachVisible] = useState(true);

  // Ref for note scrolling
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut instructions toggle
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Details for subjects computed dynamically from the database
  const subjectsDetails = useMemo(() => {
    const getActiveChapterInfo = (subj: 'physics' | 'chemistry' | 'maths') => {
      const subjChaps = state.chapters.filter(c => c.subject === subj);
      // Respect the chapter the user actually launched the cockpit for (Radar Focused Chapter)
      // instead of always defaulting to "first incomplete chapter" — this was why the cockpit
      // could show/start a totally different chapter than the one the user clicked into.
      const focusedId = (state as any).radarFocusedChapter;
      const focusedChap = focusedId
        ? subjChaps.find(c => c.id === focusedId || c.name === focusedId)
        : undefined;
      const activeChap = focusedChap || subjChaps.find(c => c.completion < 100) || subjChaps[0];

      if (!activeChap) {
        return {
          name: subj === 'physics' ? 'Physics' : subj === 'chemistry' ? 'Chemistry' : 'Mathematics',
          chapter: 'Syllabus Core',
          lecture: 'Lecture 1: Introduction',
          duration: '0h',
          color: subj === 'physics' ? 'sky' : subj === 'chemistry' ? 'emerald' : 'purple',
          textClass: subj === 'physics' ? 'text-sky-400' : subj === 'chemistry' ? 'text-emerald-400' : 'text-indigo-400',
          bgGlow: subj === 'physics' ? 'bg-sky-500/10' : subj === 'chemistry' ? 'bg-emerald-500/10' : 'bg-indigo-500/10',
          borderClass: subj === 'physics' ? 'border-sky-500/20' : subj === 'chemistry' ? 'border-emerald-500/20' : 'border-indigo-500/20'
        };
      }

      const nextLec = Math.min(activeChap.totalLectures, activeChap.currentLecture + 1);
      
      const mission = state.todayMissions.find(m => m.subject === subj && !m.completed);
      let durationStr = '';
      if (mission && mission.duration) {
        durationStr = `${mission.duration}m remaining`;
      } else {
        const activeChapData = state.chaptersWithData.find(c => c.chapter.id === activeChap.id)?.data;
        const estTime = activeChapData ? Math.max(1, activeChapData.estimatedRemainingTime) : 5;
        // The user wants session time, which is usually smaller. If no mission, give a default session size
        durationStr = `60m remaining`; 
      }


      return {
        name: subj === 'physics' ? 'Physics' : subj === 'chemistry' ? 'Chemistry' : 'Mathematics',
        chapter: activeChap.name,
        lecture: nextLec > 0 ? `Lecture ${nextLec}: Core Foundations` : `Lecture 1: Introduction`,
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
  }, [state.chapters, (state as any).radarFocusedChapter]);

  const activeDetails = subjectsDetails[activeSubject];

  // Resolve active chapter for the active subject (preferring Radar focused chapter if set)
  const activeChap = useMemo(() => {
    const subjChaps = state.chapters.filter(c => c.subject === activeSubject);
    if ((state as any).radarFocusedChapter) {
      const focused = subjChaps.find(c => c.id === (state as any).radarFocusedChapter || c.name === (state as any).radarFocusedChapter);
      if (focused) return focused;
    }
    return subjChaps.find(c => c.completion < 100) || subjChaps[0];
  }, [state.chapters, (state as any).radarFocusedChapter, activeSubject]);

  const isCompletedChapter = useMemo(() => {
    if (!activeChap) return false;
    return activeChap.completion >= 100 || activeChap.status === 'Mastered';
  }, [activeChap]);

  const [forcePracticeMode, setForcePracticeMode] = useState<boolean>(false);

  // Determine if this is a Practice/PYQ mission
  const isPracticeMission = useMemo(() => {
    if (forcePracticeMode) return true;
    const activeSubjectMission = state.todayMissions.find(m => m.subject === activeSubject && !m.completed);
    if (!activeSubjectMission) return false;
    const type = activeSubjectMission.type.toLowerCase();
    return type.includes('practice') || type.includes('pyq') || type.includes('revision');
  }, [state.todayMissions, activeSubject, forcePracticeMode]);

  // Session Duration tracking
  const sessionDurationSecs = useMemo(() => {
    if (customDurationSecs) return customDurationSecs + extraTimeAdded * 60;
    const activeSubjectMission = state.todayMissions.find(m => m.subject === activeSubject && !m.completed);
    return (activeSubjectMission?.duration || 60) * 60 + extraTimeAdded * 60;
  }, [customDurationSecs, state.todayMissions, activeSubject, extraTimeAdded]);

  const timeProgressPercent = Math.min(100, (seconds / sessionDurationSecs) * 100);

  // Play start chime once
  const [hasPlayedStartChime, setHasPlayedStartChime] = useState(false);
  useEffect(() => {
    if (!hasPlayedStartChime && state.settings.soundEffects) {
      audioEngine.playStartChime(state.settings.volume / 100);
      setHasPlayedStartChime(true);
    }
  }, [hasPlayedStartChime, state.settings]);

  // Sync session timer and idle timer with absolute time deltas to prevent background throttling
  useEffect(() => {
    let lastTick = Date.now();
    let interval: any = null;
    if (!isCompleted && !isTimeUpModalOpen) {
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
          // Adjust last tick precisely by the discrete seconds counted
          lastTick += deltaSecs * 1000; 
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, isCompleted, isTimeUpModalOpen]);

  // Telemetry: Auto-pause and log interruption if tab loses focus/visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isPaused && !isCompleted && pauseOnTabChangeEnabled) {
        setIsPaused(true);
        incrementInterruption();
        setCoachTip('Session auto-paused due to tab switch. Focus lost.');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPaused, isCompleted, pauseOnTabChangeEnabled]);

  // Monitor for time up
  useEffect(() => {
    if (seconds >= sessionDurationSecs && !hasTriggeredTimeUp && !isCompleted) {
      setIsTimeUpModalOpen(true);
      setHasTriggeredTimeUp(true);
    }
  }, [seconds, sessionDurationSecs, hasTriggeredTimeUp, isCompleted]);

  // AI Coach advice cycler
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
      if (!isPaused && !isCompleted) {
        const randTip = coachTips[Math.floor(Math.random() * coachTips.length)];
        setCoachTip(randTip);
      }
    }, 25000);

    return () => clearInterval(coachInterval);
  }, [isPaused, isCompleted]);

  // Helper to format duration
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcut hook
  useEffect(() => {
    if (isPaused) {
      setIsPauseOverlayDismissed(false);
    }
  }, [isPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcut interference inside inputs
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
          // Check off next unchecked task
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
          // Cycle subject
          const subjects: ('physics' | 'chemistry' | 'maths')[] = ['physics', 'chemistry', 'maths'];
          const nextIdx = (subjects.indexOf(activeSubject) + 1) % subjects.length;
          setActiveSubject(subjects[nextIdx]);
          setCoachTip(`Switched track to ${subjectsDetails[subjects[nextIdx]].name}. Checklist reset.`);
          // Reset subject checklist is handled by useEffect dependency on activeSubject
          break;
        case 'escape':
          e.preventDefault();
          setIsPaused(false);
          handleExit();
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
  }, [activeSubject, handleExit, isPaused]);

  // Handle checking checklist item
  const handleToggleTask = (task: string) => {
    setChecklist(prev => ({
      ...prev,
      [task]: !prev[task]
    }));
  };

  // Let the user add their own custom checklist items for this session
  const handleAddCustomTask = (task: string) => {
    setChecklist(prev => ({
      ...prev,
      [task]: false
    }));
  };

  // Let the user remove any checklist item (default or custom)
  const handleRemoveTask = (task: string) => {
    setChecklist(prev => {
      const next = { ...prev };
      delete next[task];
      return next;
    });
  };

  // Compute checklist completion percentage
  const checklistProgressPercent = useMemo(() => {
    const total = Object.keys(checklist).length;
    if (total === 0) return 0;
    const completed = Object.values(checklist).filter(Boolean).length;
    return Math.round((completed / total) * 100);
  }, [checklist]);

  // Monitor checklist to auto-trigger completion
  useEffect(() => {
    if (checklistProgressPercent === 100 && !isCompleted) {
      setTimeout(() => {
        setIsCompleted(true);
        if (state.settings.soundEffects) {
          audioEngine.playSuccessChime(state.settings.volume / 100);
        }
      }, 300);
    }
  }, [checklistProgressPercent, isCompleted, state.settings]);

  // Handle adding custom timestamped note
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

    // Auto scroll notes container
    setTimeout(() => {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  // Quick preset notes triggers
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

  // Filtered formula list based on search and current subject
  const filteredFormulas = useMemo(() => {
    const list = FORMULAS[activeSubject] || [];
    if (!formulaSearch.trim()) return list;
    return list.filter(f => 
      f.name.toLowerCase().includes(formulaSearch.toLowerCase()) || 
      f.formula.toLowerCase().includes(formulaSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(formulaSearch.toLowerCase())
    );
  }, [activeSubject, formulaSearch]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070708] text-zinc-100 flex flex-col font-sans overflow-hidden select-none">
      
      {/* GLOWING AMBIENT FIELD BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-emerald-500/3 blur-[120px] rounded-full" />
      </div>

      {/* TOP HEADER STATUS BAR */}
      <div className="absolute top-0 left-0 w-full z-50 flex justify-between items-center p-5 md:p-6 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0c0c0e] border border-zinc-800 shadow-md flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider font-mono uppercase text-zinc-100 leading-tight">
              MISSION <span className="text-indigo-400">CONTROL</span>
            </h2>
            <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5 uppercase tracking-widest font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LINK ACTIVE
              </span>
              <span>•</span>
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Shortcut Quicktip */}
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleExit}
            className="w-10 h-10 rounded-xl border border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700 hover:text-white transition-all flex items-center justify-center bg-zinc-950 text-zinc-400 cursor-pointer"
            title="Exit Session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>



      {/* MAIN TWO-COLUMN DECK WORKSPACE */}
      <main className="flex-1 relative z-10 flex flex-col md:flex-row overflow-hidden w-full max-w-5xl mx-auto p-3 sm:p-4 md:p-6 gap-4 md:gap-6 lg:gap-8 justify-center items-center pt-20 md:pt-24 my-auto">
        
        {/* LEFT COMPONENT COLUMN (TIMER & CONTENT COCKPIT) */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto md:mx-0 h-full min-h-0">
          
          <MissionTimerWidget
            progressPercent={timeProgressPercent}
            seconds={seconds}
            focusScore={focusScore}
            lectureSpeed={lectureSpeed}
            formatTime={formatTime}
          />

          {mode === 'learning' && (
            <MissionSubjectSwitcherWidget
              activeSubject={activeSubject}
              activeDetails={activeDetails}
              subjectsDetails={subjectsDetails}
              onChangeSubject={(subj) => {
                setActiveSubject(subj);
                setCoachTip(`Selected track: ${subjectsDetails[subj].name}. Roadmaps updated.`);
                setChecklist({
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
            isCoachVisible={isCoachVisible}
            setIsCoachVisible={setIsCoachVisible}
            coachTip={coachTip}
          />

          {mode === 'learning' && (
            <MissionActionBarWidget
              isNotesOpen={isNotesOpen}
              setIsNotesOpen={setIsNotesOpen}
              isFormulaOpen={isFormulaOpen}
              setIsFormulaOpen={setIsFormulaOpen}
              lectureSpeed={lectureSpeed}
              onCycleSpeed={() => {
                const currIdx = LECTURE_SPEEDS.indexOf(lectureSpeed);
                const nextSpeed = LECTURE_SPEEDS[(currIdx + 1) % LECTURE_SPEEDS.length];
                setLectureSpeed(nextSpeed);
                setCoachTip(`Lecture speed calibrated to ${nextSpeed}x.`);
              }}
              isCoachVisible={isCoachVisible}
              setIsCoachVisible={setIsCoachVisible}
            />
          )}

        </div>

        <div className="flex-1 w-full max-w-xl mx-auto flex flex-col h-full bg-zinc-950/60 rounded-3xl border border-zinc-800/80 overflow-hidden shadow-2xl relative">

          <div className="flex-1 flex flex-col min-h-0 relative">
            {children ? (
              children
            ) : isPracticeMission && activeChap ? (
              <QuestionViewerWidget 
                chapterId={activeChap.id} 
                subject={activeSubject} 
                onExitPractice={() => {
                  // Save practice session before exiting (duration in seconds for consistency)
                  onComplete({
                    missionId: state.todayMissions.find(m => m.subject === activeSubject && !m.completed)?.id,
                    duration: Math.max(60, seconds),  // Send in seconds, minimum 1 minute
                    questions: 0,  // No specific questions tracked in practice mode
                    xp: Math.max(5, Math.floor(seconds / 60) * 5),
                    streak: 0,
                    idleTime,
                    focusInterruptions,
                    focusScore
                  });
                  setForcePracticeMode(false);
                }}
              />
            ) : (
              <MissionChecklistWidget
                progressPercent={checklistProgressPercent}
                checklist={checklist}
                onToggleTask={handleToggleTask}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused(prev => {
                  if (!prev) incrementInterruption();
                  return !prev;
                })}
                onCompleteAll={() => {
                  setChecklist({
                    'Watch lecture': true,
                    'Make notes': true,
                    'Solve DPP': true,
                    'Mark doubts': true,
                    'Revise formulas': true,
                  });
                  setIsCompleted(true);
                }}
                onStartPractice={() => setForcePracticeMode(true)}
                onAddTask={handleAddCustomTask}
                onRemoveTask={handleRemoveTask}
              />
            )}
          </div>
        </div>

      </main>

      <MissionNotesDrawer
        isNotesOpen={isNotesOpen}
        setIsNotesOpen={setIsNotesOpen}
        activeNoteCategory={activeNoteCategory}
        setActiveNoteCategory={setActiveNoteCategory}
        notes={notes}
        setNotes={setNotes}
        notesEndRef={notesEndRef}
        noteInput={noteInput}
        setNoteInput={setNoteInput}
        handleAddNote={handleAddNote}
        handleQuickPresetNote={handleQuickPresetNote}
      />

      <MissionFormulaSheetModal
        isFormulaOpen={isFormulaOpen}
        setIsFormulaOpen={setIsFormulaOpen}
        activeDetails={activeDetails}
        formulaSearch={formulaSearch}
        setFormulaSearch={setFormulaSearch}
        filteredFormulas={filteredFormulas}
        handleQuickPresetNote={handleQuickPresetNote}
      />

      <MissionPauseOverlay
        isPaused={isPaused && !isPauseOverlayDismissed}
        setIsPaused={setIsPaused}
        seconds={seconds}
        formatTime={formatTime}
        lectureSpeed={lectureSpeed}
        onExit={handleExit}
      />

      <MissionCompleteModal
        isCompleted={isCompleted}
        activeDetails={activeDetails}
        seconds={seconds}
        streak={state.xp?.streak || 0}
        idleTime={idleTime}
        focusInterruptions={focusInterruptions}
        focusScore={focusScore}
        onComplete={(data) => {
          const activeSubjectMission = state.todayMissions.find(m => m.subject === activeSubject && !m.completed);
          // First, mark the current mission as complete
          if (activeSubjectMission?.id) {
            actions.completeTask(activeSubjectMission.id);
          }
          onComplete({
            missionId: activeSubjectMission?.id,
            duration: seconds,
            questions: 15,
            xp: activeSubjectMission?.xp || 200,
            streak: 12,
            idleTime,
            focusInterruptions,
            focusScore
          });
        }}
        onNextSubject={() => {
          // Mark current mission complete and get the next incomplete mission
          const activeSubjectMission = state.todayMissions.find(m => m.subject === activeSubject && !m.completed);
          if (activeSubjectMission?.id) {
            actions.completeTask(activeSubjectMission.id);
          }
          
          // Find the next incomplete mission from the full list
          const allIncompleteMissions = state.todayMissions.filter(m => !m.completed);
          const currentMissionIdx = allIncompleteMissions.findIndex(m => m.subject === activeSubject);
          const nextMission = allIncompleteMissions[currentMissionIdx + 1] || allIncompleteMissions[0];
          
          if (nextMission && nextMission.subject) {
            const nextSubj = nextMission.subject as 'physics' | 'chemistry' | 'maths';
            setActiveSubject(nextSubj);
            setCoachTip(`Commencing next mission: ${nextMission.taskName}. Focus locked.`);
          } else {
            // All missions complete, cycle back to first subject
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
        }}
      />

      <MissionTimeUpModal 
        isOpen={isTimeUpModalOpen}
        onComplete={() => {
          setIsTimeUpModalOpen(false);
          setChecklist({
            'Watch lecture': true,
            'Make notes': true,
            'Solve DPP': true,
            'Mark doubts': true,
            'Revise formulas': true,
          });
          setIsCompleted(true);
        }}
        onAddExtraTime={(mins) => {
          setExtraTimeAdded(prev => prev + mins);
          setHasTriggeredTimeUp(false);
          setIsTimeUpModalOpen(false);
        }}
      />

    </div>
  );
}