import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { audioEngine } from '@/utils/audioEngine';

export interface UseMissionChecklistProps {
  activeSubject: 'physics' | 'chemistry' | 'maths';
  setActiveSubject: (sub: 'physics' | 'chemistry' | 'maths') => void;
  activeMissionId?: string;
  activeSubjectMission: any;
  subjectsDetails: any;
  isCompleted: boolean;
  setIsCompleted: (comp: boolean) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean | ((prev: boolean) => boolean)) => void;
  incrementInterruption: () => void;
  setIsNotesOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsFormulaOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setCoachTip: (tip: string) => void;
}

export function useMissionChecklist({
  activeSubject,
  setActiveSubject,
  activeMissionId,
  activeSubjectMission,
  subjectsDetails,
  isCompleted,
  setIsCompleted,
  isPaused: _isPaused,
  setIsPaused,
  incrementInterruption,
  setIsNotesOpen,
  setIsFormulaOpen,
  setCoachTip
}: UseMissionChecklistProps) {
  const settings = useStudyBrainStore(state => state.settings);
  const todayMissions = useStudyBrainStore(state => state.todayMissions);

  const dynamicChecklist = useMemo(() => {
    let mission = todayMissions.find(m => m.subject === activeSubject && !m.completed);
    if (activeMissionId) {
      const explicitMission = todayMissions.find(m => m.id === activeMissionId);
      if (explicitMission && explicitMission.subject.toLowerCase() === activeSubject.toLowerCase()) {
        mission = explicitMission;
      }
    }
    
    const initialList: Record<string, boolean> = {};
    if (!mission) {
      initialList['Watch lecture'] = false;
      initialList['Make notes'] = false;
      initialList['Solve DPP'] = false;
      initialList['Mark doubts'] = false;
      initialList['Revise formulas'] = false;
    } else {
      const type = mission.type.toLowerCase();
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
  }, [todayMissions, activeSubject, activeMissionId]);

  const [checklist, setChecklist] = useState<Record<string, boolean>>(dynamicChecklist);
  const checklistInitializedRef = useRef<string | null>(null);
  const checklistCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeMissionId && activeMissionId !== checklistInitializedRef.current) {
      setChecklist(dynamicChecklist);
      checklistInitializedRef.current = activeMissionId;
    }
  }, [activeMissionId, dynamicChecklist]);

  const handleToggleTask = useCallback((task: string) => {
    setChecklist(prev => ({
      ...prev,
      [task]: !prev[task]
    }));
  }, []);

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
    if (checklistCompleteTimerRef.current) {
      clearTimeout(checklistCompleteTimerRef.current);
      checklistCompleteTimerRef.current = null;
    }
    if (checklistProgressPercent === 100 && !isCompleted) {
      if (!activeSubjectMission) {
        console.warn(`[MissionMode] Checklist completed for ${activeSubject} but no pending mission exists for this subject.`);
        setCoachTip(`No pending ${subjectsDetails[activeSubject].name} mission right now — switch subject or check your Daily Missions list.`);
      }
      checklistCompleteTimerRef.current = setTimeout(() => {
        setIsCompleted(true);
        if (settings.soundEffects) {
          audioEngine.playSuccessChime();
        }
      }, 300);
    }
  }, [checklistProgressPercent, isCompleted, settings, activeSubjectMission, activeSubject, subjectsDetails, setIsCompleted, setCoachTip]);

  // Keyboard navigation
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
        case 'tab': {
          e.preventDefault();
          const subjects: ('physics' | 'chemistry' | 'maths')[] = ['physics', 'chemistry', 'maths'];
          const nextIdx = (subjects.indexOf(activeSubject) + 1) % subjects.length;
          setActiveSubject(subjects[nextIdx]);
          setCoachTip(`Switched track to ${subjectsDetails[subjects[nextIdx]].name}. Checklist reset.`);
          break;
        }

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
  }, [activeSubject, setActiveSubject, setIsPaused, incrementInterruption, setIsNotesOpen, setIsFormulaOpen, setCoachTip, subjectsDetails]);

  return {
    checklist,
    setChecklist,
    checklistProgressPercent,
    handleToggleTask,
    handleAddCustomTask,
    handleRemoveTask
  };
}
