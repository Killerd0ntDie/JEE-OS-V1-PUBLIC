import React, { useEffect, useRef } from 'react';

export interface UseExamTimerAndHeartbeatProps {
  targetEndTime: number;
  isExamStarted: boolean;
  isSubmitting: boolean;
  activeQuestionId: string | undefined;
  dispatch: React.Dispatch<any>;
  handleSubmitTest: () => void;
  activeQAccumulatedSecRef?: React.MutableRefObject<number>;
}

export function useExamTimerAndHeartbeat({
  targetEndTime,
  isExamStarted,
  isSubmitting,
  activeQuestionId,
  dispatch,
  handleSubmitTest,
  activeQAccumulatedSecRef: passedActiveSecRef
}: UseExamTimerAndHeartbeatProps) {
  const localActiveSecRef = useRef<number>(0);
  const activeQAccumulatedSecRef = passedActiveSecRef || localActiveSecRef;
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const activeQuestionIdRef = useRef<string | undefined>(activeQuestionId);
  activeQuestionIdRef.current = activeQuestionId;
  const dispatchRef = useRef<React.Dispatch<any>>(dispatch);
  dispatchRef.current = dispatch;
  const handleSubmitTestRef = useRef<() => void>(handleSubmitTest);
  handleSubmitTestRef.current = handleSubmitTest;

  const flushActiveQuestionTime = (qIdToFlush?: string) => {
    const targetQId = qIdToFlush || activeQuestionIdRef.current;
    const accumulated = activeQAccumulatedSecRef.current;
    if (!targetQId || accumulated <= 0) return;

    activeQAccumulatedSecRef.current = 0;
    dispatchRef.current({ type: 'TICK_TIME', questionId: targetQId, seconds: accumulated });
  };

  // Heartbeat interval for time spent per question: clamps time if gap > 15s (device sleep / tab suspended)
  useEffect(() => {
    if (!activeQuestionId || !isExamStarted || isSubmitting) return;
    lastHeartbeatTimeRef.current = Date.now();
    const currentQId = activeQuestionId;

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastHeartbeatTimeRef.current) / 1000;
      lastHeartbeatTimeRef.current = now;

      if (!document.hidden && deltaSec > 0 && deltaSec < 15) {
        activeQAccumulatedSecRef.current += Math.round(deltaSec);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      flushActiveQuestionTime(currentQId);
    };
  }, [activeQuestionId, isExamStarted, isSubmitting]);

  // Tab visibility change: flush accumulated time before tab hides, reset heartbeat on resume
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        flushActiveQuestionTime();
      }
      lastHeartbeatTimeRef.current = Date.now();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Global timer watcher: schedules auto-submit when targetEndTime is reached
  useEffect(() => {
    if (!isExamStarted || isSubmitting) return;
    const msRemaining = targetEndTime - Date.now();
    if (msRemaining <= 0) {
      handleSubmitTestRef.current();
      return;
    }
    const timeout = setTimeout(() => {
      handleSubmitTestRef.current();
    }, msRemaining);
    return () => clearTimeout(timeout);
  }, [targetEndTime, isExamStarted, isSubmitting]);

  return {
    activeQAccumulatedSecRef,
    flushActiveQuestionTime
  };
}
