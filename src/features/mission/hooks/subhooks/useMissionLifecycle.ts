import React from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { getCurrentSessionTimeSlot, formatTimeSlotDisplay } from '@/utils/timeSlotUtils';
import { storageAdapter } from '@/services/StorageAdapter';

export interface UseMissionLifecycleProps {
  activeSubject: 'physics' | 'chemistry' | 'maths';
  setActiveSubject: (sub: 'physics' | 'chemistry' | 'maths') => void;
  activeSubjectMission: any;
  seconds: number;
  secondsRef: React.MutableRefObject<number>;
  focusScore: number;
  idleTime: number;
  focusInterruptions: number;
  storageKey: string | null;
  uninterruptedSecondsRef: React.MutableRefObject<number>;
  focusInterruptionsRef: React.MutableRefObject<number>;
  idleTimeRef: React.MutableRefObject<number>;
  setSeconds: (s: number) => void;
  setFocusScore: (score: number) => void;
  setIdleTime: (idle: number) => void;
  setFocusInterruptions: (int: number) => void;
  setIsCompleted: (comp: boolean) => void;
  setIsSettingUp: (setup: boolean) => void;
  setChecklist: (list: Record<string, boolean>) => void;
  setCoachTip: (tip: string) => void;
  subjectsDetails: any;
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

export function useMissionLifecycle({
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
  subjectsDetails: _subjectsDetails,
  onExit,
  onComplete
}: UseMissionLifecycleProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const xp = useStudyBrainStore(state => state.xp);

  const handleExit = () => {
    if (activeSubjectMission && secondsRef.current > 0) {
      const durationMins = Math.ceil(secondsRef.current / 60);
      const timeSlot = getCurrentSessionTimeSlot(durationMins);
      
      actions?.updateMissionDetails(activeSubjectMission.id, {
        timeSlot: formatTimeSlotDisplay(timeSlot),
        scheduledTime: timeSlot.start
      });
    }
    
    onExit(secondsRef.current);
  };

  const handleNextSubject = async () => {
    if (activeSubjectMission?.id) {
      await actions.completeTask(activeSubjectMission.id, Math.max(60, seconds), {
        focusScore,
        idleTime,
        focusInterruptions
      });
    } else {
      console.warn(`[MissionMode] "Next subject" pressed for ${activeSubject} but no matching mission was found — nothing was marked complete.`);
    }
    
    const latestTodayMissions = useStudyBrainStore.getState().todayMissions;
    const allIncompleteMissions = latestTodayMissions.filter(m => !m.completed);
    const currentMissionIdx = allIncompleteMissions.findIndex(m => m.subject === activeSubject);
    const nextMission = allIncompleteMissions[currentMissionIdx + 1] || allIncompleteMissions[0];
    
    if (nextMission?.subject) {
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
    secondsRef.current = 0;
    setFocusScore(100);
    uninterruptedSecondsRef.current = 0;
    focusInterruptionsRef.current = 0;
    idleTimeRef.current = 0;
    setIdleTime(0);
    setFocusInterruptions(0);
    setIsSettingUp(true);
  };

  const handleMissionComplete = async (data?: any) => {
    if (activeSubjectMission?.id) {
      if (storageKey) {
        storageAdapter.removeItem(storageKey);
      }
      await actions.completeTask(activeSubjectMission.id, data?.duration ?? Math.max(60, seconds), {
        questions: data?.questions,
        correct: data?.correct,
        confidence: data?.confidence,
        focusScore: data?.focusScore ?? focusScore,
        idleTime: data?.idleTime ?? idleTime,
        focusInterruptions: data?.focusInterruptions ?? focusInterruptions
      });
    } else {
      console.warn(`[MissionMode] Complete pressed for ${activeSubject} but no matching mission was found — nothing was marked complete in store.`);
    }

    if (onComplete) {
      onComplete({
        missionId: activeSubjectMission?.id,
        duration: data?.duration ?? Math.max(60, seconds),
        questions: data?.questions ?? 0, 
        correct: data?.correct ?? 0,
        confidence: data?.confidence ?? 3,
        xp: data?.xp ?? Math.max(5, Math.floor(seconds / 60) * 5),
        streak: xp?.streak ?? 0,
        idleTime: data?.idleTime ?? idleTime,
        focusInterruptions: data?.focusInterruptions ?? focusInterruptions,
        focusScore: data?.focusScore ?? focusScore
      });
    } else {
      onExit(seconds);
    }
  };

  return {
    handleExit,
    handleNextSubject,
    handleMissionComplete
  };
}
