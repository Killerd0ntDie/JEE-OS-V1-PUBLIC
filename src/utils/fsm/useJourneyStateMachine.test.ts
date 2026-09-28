import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useJourneyStateMachine } from './useJourneyStateMachine';
import { storageAdapter } from '@/services/StorageAdapter';

describe('useJourneyStateMachine Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    if (typeof window !== 'undefined') {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes in idle state and can start journey', () => {
    const { result } = renderHook(() =>
      useJourneyStateMachine({
        recoveryKey: 'test_hook_journey',
        totalDurationSeconds: 1200
      })
    );

    expect(result.current.state).toBe('idle');
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.remainingSeconds).toBe(1200);

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe('active');
  });

  it('accumulates elapsed wall-clock time on auto-tick intervals', () => {
    const { result } = renderHook(() =>
      useJourneyStateMachine({
        recoveryKey: 'test_hook_tick',
        totalDurationSeconds: 1200,
        autoTickIntervalMs: 1000
      })
    );

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe('active');

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(4);
    expect(result.current.remainingSeconds).toBeLessThanOrEqual(1196);
  });

  it('pauses and halts time accumulation, then resumes cleanly', () => {
    const { result } = renderHook(() =>
      useJourneyStateMachine({
        recoveryKey: 'test_hook_pause',
        totalDurationSeconds: 1200,
        autoTickIntervalMs: 1000
      })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const elapsedBeforePause = result.current.elapsedSeconds;
    expect(elapsedBeforePause).toBeGreaterThanOrEqual(2);

    // Pause
    act(() => {
      result.current.pause();
    });

    expect(result.current.state).toBe('paused');

    // Advance 5 seconds while paused -> elapsedSeconds MUST NOT change
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsedSeconds).toBe(elapsedBeforePause);

    // Resume
    act(() => {
      result.current.resume();
    });

    expect(result.current.state).toBe('active');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.elapsedSeconds).toBeGreaterThan(elapsedBeforePause);
  });

  it('recovers crashed journey in paused state to protect against runaway timers', () => {
    const crashKey = 'test_hook_crash_recovery';
    storageAdapter.setCrashCheckpoint(crashKey, {
      state: 'active',
      elapsedSeconds: 450,
      totalDurationSeconds: 1800,
      lastTickTimestamp: Date.now() - 60000,
      data: {},
      savedAt: Date.now() - 30000
    });

    const { result } = renderHook(() =>
      useJourneyStateMachine({
        recoveryKey: crashKey,
        totalDurationSeconds: 1800
      })
    );

    // Recovered state must be 'paused', not 'active'
    expect(result.current.state).toBe('paused');
    expect(result.current.elapsedSeconds).toBe(450);
    expect(result.current.remainingSeconds).toBe(1350);
  });
});
