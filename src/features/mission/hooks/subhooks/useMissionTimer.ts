import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { calculateFocusScore } from '@/utils/focusScore';
import { storageAdapter } from '@/services/StorageAdapter';

export interface UseMissionTimerProps {
  activeMissionId?: string;
  initialPaused?: boolean;
  initialSeconds?: number;
  skipSetup?: boolean;
  sessionDurationSecs: number;
  setCoachTip: (tip: string) => void;
}

export function useMissionTimer({
  activeMissionId,
  initialPaused = false,
  initialSeconds = 0,
  skipSetup = false,
  sessionDurationSecs,
  setCoachTip
}: UseMissionTimerProps) {
  const settings = useStudyBrainStore(state => state.settings);
  const isCasinoEnabled = settings.enablePomodoroCasino ?? false;
  const pauseOnTabChangeEnabled = settings.pauseOnTabChange ?? true;

  const storageKey = activeMissionId ? `jeeos_mission_state_${activeMissionId}` : null;
  const savedState = useMemo(() => {
    if (!storageKey) return null;
    try {
      const parsed = storageAdapter.getItem<any>(storageKey);
      return parsed ?? null;
    } catch (e) {
      console.warn('Corrupted mission state in storageAdapter, purging key:', storageKey, e);
      try {
        storageAdapter.removeItem(storageKey);
      } catch {}
      return null;
    }
  }, [storageKey]);

  const [isPaused, setIsPaused] = useState(savedState?.isPaused ?? (initialPaused && isCasinoEnabled));
  const [isPauseOverlayDismissed, setIsPauseOverlayDismissed] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(savedState ? false : (initialSeconds === 0 && !skipSetup && isCasinoEnabled));
  const [targetQuestions, setTargetQuestions] = useState(25);
  const [xpWager, setXpWager] = useState(50);
  const [missionFailed, setMissionFailed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const [seconds, setSeconds] = useState(savedState?.seconds ?? initialSeconds);
  const [focusScore, setFocusScore] = useState(savedState?.focusScore ?? 100);
  const [lectureSpeed, setLectureSpeed] = useState(1.25);
  
  const [idleTime, setIdleTime] = useState(savedState?.idleTime ?? 0);
  const [focusInterruptions, setFocusInterruptions] = useState(savedState?.focusInterruptions ?? 0);
  const [isTimeUpModalOpen, setIsTimeUpModalOpen] = useState(false);
  const [hasTriggeredTimeUp, setHasTriggeredTimeUp] = useState(false);

  const uninterruptedSecondsRef = useRef(0);
  const focusInterruptionsRef = useRef(0);
  const idleTimeRef = useRef(0);
  const secondsRef = useRef(initialSeconds);
  const lastPersistRef = useRef<number>(0);

  const incrementInterruption = () => {
    focusInterruptionsRef.current += 1;
    setFocusInterruptions(prev => prev + 1);
  };

  // Throttled session storage persistence for timer state (every 30s, or immediate on pause/completion/unload)
  const persistState = useCallback(() => {
    if (!storageKey || isSettingUp || isCompleted || missionFailed) return;
    try {
      storageAdapter.setItem(storageKey, {
        isPaused, 
        seconds, 
        focusScore, 
        idleTime, 
        focusInterruptions,
        timestamp: Date.now()
      });
      lastPersistRef.current = Date.now();
    } catch (e) {
      console.warn('Failed to save mission snapshot to storageAdapter', e);
    }
  }, [storageKey, isSettingUp, isCompleted, missionFailed, isPaused, seconds, focusScore, idleTime, focusInterruptions]);

  useEffect(() => {
    if (!storageKey || isSettingUp || isCompleted || missionFailed) return;

    const now = Date.now();
    if (isPaused || now - lastPersistRef.current >= 30000) {
      persistState();
      return;
    }

    const timer = setTimeout(persistState, 30000 - (now - lastPersistRef.current));
    return () => clearTimeout(timer);
  }, [storageKey, isSettingUp, isCompleted, missionFailed, isPaused, seconds, focusScore, idleTime, focusInterruptions, persistState]);

  // Guaranteed persist on browser tab close or refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      persistState();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      persistState();
    };
  }, [persistState]);
  
  // Recover timer state on mount with staleness check
  useEffect(() => {
    if (savedState?.timestamp) {
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;
      if (Date.now() - savedState.timestamp > TWELVE_HOURS) {
        if (storageKey) storageAdapter.removeItem(storageKey);
        setSeconds(initialSeconds);
        setFocusScore(100);
        setIdleTime(0);
        setFocusInterruptions(0);
      }
    }
  }, []);

  // Wall-clock delta ticking
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

  // Tab switch listener
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
  }, [isPaused, isCompleted, pauseOnTabChangeEnabled, isSettingUp, missionFailed, setCoachTip]);

  // Time-up trigger
  useEffect(() => {
    if (seconds >= sessionDurationSecs && !hasTriggeredTimeUp && !isCompleted) {
      setIsTimeUpModalOpen(true);
      setHasTriggeredTimeUp(true);
    }
  }, [seconds, sessionDurationSecs, hasTriggeredTimeUp, isCompleted]);

  useEffect(() => {
    if (isPaused) {
      setIsPauseOverlayDismissed(false);
    }
  }, [isPaused]);

  const formatTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResetTimer = useCallback(() => {
    setSeconds(0);
    secondsRef.current = 0;
    setIdleTime(0);
    idleTimeRef.current = 0;
    setFocusScore(100);
    focusInterruptionsRef.current = 0;
    uninterruptedSecondsRef.current = 0;
    
    if (storageKey) {
      storageAdapter.removeItem(storageKey);
    }
  }, [storageKey]);

  return {
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
  };
}
