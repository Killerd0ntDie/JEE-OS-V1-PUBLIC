import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  JourneyStateMachine, 
  JourneyConfig, 
  JourneyContext, 
  JourneyEvent 
} from './JourneyStateMachine';

export interface UseJourneyStateMachineOptions<T = any> extends JourneyConfig<T> {
  autoTickIntervalMs?: number; // default: 1000ms
}

export function useJourneyStateMachine<T = any>(options: UseJourneyStateMachineOptions<T>) {
  const { autoTickIntervalMs = 1000, ...fsmConfig } = options;

  // Stable config ref so callbacks don't recreate the state machine
  const configRef = useRef(options);
  configRef.current = options;

  // Machine instance is created once and preserved
  const machineRef = useRef<JourneyStateMachine<T> | null>(null);
  if (!machineRef.current) {
    machineRef.current = new JourneyStateMachine<T>({
      recoveryKey: fsmConfig.recoveryKey,
      totalDurationSeconds: fsmConfig.totalDurationSeconds,
      initialData: fsmConfig.initialData,
      checkpointIntervalMs: fsmConfig.checkpointIntervalMs,
      onStateChange: (state, ctx) => {
        configRef.current.onStateChange?.(state, ctx);
      },
      onCheckpoint: (snapshot) => {
        configRef.current.onCheckpoint?.(snapshot);
      }
    });
  }

  const machine = machineRef.current;

  // React state synchronized with FSM
  const [context, setContext] = useState<JourneyContext<T>>(() => machine.getContext());
  const lastWallClockRef = useRef<number>(Date.now());

  const syncState = useCallback(() => {
    setContext(machine.getContext());
  }, [machine]);

  // Wall-clock auto-tick interval when active
  useEffect(() => {
    if (context.state !== 'active') {
      return;
    }

    lastWallClockRef.current = Date.now();

    const intervalId = setInterval(() => {
      if (machine.getState() !== 'active') return;

      const now = Date.now();
      const wallDeltaSecs = Math.max(0, (now - lastWallClockRef.current) / 1000);
      lastWallClockRef.current = now;

      if (wallDeltaSecs >= 0.5) {
        machine.dispatch({ type: 'TICK', deltaSecs: Math.round(wallDeltaSecs) });
        syncState();
      }
    }, autoTickIntervalMs);

    return () => clearInterval(intervalId);
  }, [context.state, autoTickIntervalMs, machine, syncState]);

  // Action dispatchers
  const dispatch = useCallback((event: JourneyEvent) => {
    if (event.type === 'START' || event.type === 'RESUME') {
      lastWallClockRef.current = Date.now();
    }
    const updated = machine.dispatch(event);
    setContext({ ...updated });
    return updated;
  }, [machine]);

  const start = useCallback((startTime?: number, payload?: any) => {
    return dispatch({ type: 'START', startTime, payload });
  }, [dispatch]);

  const pause = useCallback(() => {
    return dispatch({ type: 'PAUSE' });
  }, [dispatch]);

  const resume = useCallback(() => {
    return dispatch({ type: 'RESUME' });
  }, [dispatch]);

  const evaluate = useCallback((payload?: any) => {
    return dispatch({ type: 'EVALUATE', payload });
  }, [dispatch]);

  const complete = useCallback((payload?: any) => {
    return dispatch({ type: 'COMPLETE', payload });
  }, [dispatch]);

  const fail = useCallback((error?: string) => {
    return dispatch({ type: 'FAIL', error });
  }, [dispatch]);

  const reset = useCallback(() => {
    return dispatch({ type: 'RESET' });
  }, [dispatch]);

  return {
    state: context.state,
    context,
    elapsedSeconds: context.elapsedSeconds,
    remainingSeconds: Math.max(0, context.totalDurationSeconds - context.elapsedSeconds),
    start,
    pause,
    resume,
    evaluate,
    complete,
    fail,
    reset,
    dispatch
  };
}
