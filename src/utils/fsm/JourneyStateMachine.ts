/**
 * JourneyStateMachine.ts — Pure TypeScript Finite State Machine for User Journeys & Timers.
 * 
 * Protocol:
 * - Exact discrete states: 'idle' | 'active' | 'paused' | 'evaluating' | 'completed'
 * - Wall-clock delta time accumulation (Date.now() - startTime) immune to tab backgrounding
 * - Periodic 30s crash recovery checkpoints to StorageAdapter
 * - Atomic rollback snapshot on failure
 * - Complete disallowance of impossible states (e.g. ticking while paused or evaluating)
 */

import { storageAdapter } from '@/services/StorageAdapter';

export type JourneyState = 'idle' | 'active' | 'paused' | 'evaluating' | 'completed';

export type JourneyEvent =
  | { type: 'START'; startTime?: number; payload?: any }
  | { type: 'PAUSE'; timestamp?: number }
  | { type: 'RESUME'; timestamp?: number }
  | { type: 'TICK'; deltaSecs: number }
  | { type: 'EVALUATE'; payload?: any }
  | { type: 'COMPLETE'; payload?: any }
  | { type: 'FAIL'; error?: string }
  | { type: 'RESET' };

export interface JourneySnapshot<T = any> {
  state: JourneyState;
  elapsedSeconds: number;
  totalDurationSeconds: number;
  lastTickTimestamp: number;
  data: T;
  savedAt: number;
}

export interface JourneyConfig<T = any> {
  recoveryKey: string;
  totalDurationSeconds?: number;
  initialData?: T;
  checkpointIntervalMs?: number; // default 30_000 (30 seconds)
  onStateChange?: (state: JourneyState, context: JourneyContext<T>) => void;
  onCheckpoint?: (snapshot: JourneySnapshot<T>) => void;
}

export interface JourneyContext<T = any> {
  state: JourneyState;
  elapsedSeconds: number;
  totalDurationSeconds: number;
  lastTickTimestamp: number;
  data: T;
  rollbackSnapshot: JourneySnapshot<T> | null;
  lastCheckpointAt: number;
  lastCheckpointElapsedSecs: number;
}

export class JourneyStateMachine<T = any> {
  private config: Required<JourneyConfig<T>>;
  private context: JourneyContext<T>;

  constructor(config: JourneyConfig<T>) {
    this.config = {
      recoveryKey: config.recoveryKey,
      totalDurationSeconds: config.totalDurationSeconds ?? 0,
      initialData: config.initialData ?? ({} as T),
      checkpointIntervalMs: config.checkpointIntervalMs ?? 30000,
      onStateChange: config.onStateChange ?? (() => {}),
      onCheckpoint: config.onCheckpoint ?? (() => {})
    };

    // Attempt recovery from storage
    const recovered = this.loadCheckpoint();
    if (recovered) {
      this.context = {
        state: recovered.state === 'active' ? 'paused' : recovered.state, // Never auto-resume after crash
        elapsedSeconds: recovered.elapsedSeconds,
        totalDurationSeconds: recovered.totalDurationSeconds || this.config.totalDurationSeconds,
        lastTickTimestamp: Date.now(),
        data: recovered.data,
        rollbackSnapshot: null,
        lastCheckpointAt: recovered.savedAt,
        lastCheckpointElapsedSecs: recovered.elapsedSeconds
      };
    } else {
      this.context = {
        state: 'idle',
        elapsedSeconds: 0,
        totalDurationSeconds: this.config.totalDurationSeconds,
        lastTickTimestamp: Date.now(),
        data: this.config.initialData,
        rollbackSnapshot: null,
        lastCheckpointAt: Date.now(),
        lastCheckpointElapsedSecs: 0
      };
    }
  }

  public getState(): JourneyState {
    return this.context.state;
  }

  public getContext(): Readonly<JourneyContext<T>> {
    return { ...this.context };
  }

  public getElapsedSeconds(): number {
    return this.context.elapsedSeconds;
  }

  public getRemainingSeconds(): number {
    return Math.max(0, this.context.totalDurationSeconds - this.context.elapsedSeconds);
  }

  /**
   * Dispatches an event through the state transition matrix.
   */
  public dispatch(event: JourneyEvent): JourneyContext<T> {
    return this.transition(event);
  }

  /**
   * Transitions through the state machine.
   * Throws an Error on illegal transitions to prevent invalid application states.
   */
  public transition(event: JourneyEvent): JourneyContext<T> {
    const currentState = this.context.state;

    switch (currentState) {
      case 'idle': {
        if (event.type === 'START') {
          this.takeSnapshot();
          this.context.state = 'active';
          this.context.lastTickTimestamp = event.startTime ?? Date.now();
          if (event.payload) {
            this.context.data = { ...this.context.data, ...event.payload };
          }
          this.persistCheckpoint();
          this.config.onStateChange(this.context.state, this.context);
          return this.getContext();
        }
        if (event.type === 'RESET') {
          return this.getContext();
        }
        throw new Error(`[JourneyStateMachine] Illegal transition: cannot dispatch "${event.type}" from "idle"`);
      }

      case 'active': {
        if (event.type === 'PAUSE') {
          this.context.state = 'paused';
          this.persistCheckpoint();
          this.config.onStateChange(this.context.state, this.context);
          return this.getContext();
        }
        if (event.type === 'TICK') {
          if (event.deltaSecs <= 0) return this.getContext();
          this.context.elapsedSeconds += event.deltaSecs;
          this.context.lastTickTimestamp = Date.now();

          // Auto-checkpoint every 30s (by wall-clock delta or accumulated elapsed seconds)
          const intervalSecs = Math.max(1, Math.floor(this.config.checkpointIntervalMs / 1000));
          if (
            Date.now() - this.context.lastCheckpointAt >= this.config.checkpointIntervalMs ||
            this.context.elapsedSeconds - this.context.lastCheckpointElapsedSecs >= intervalSecs
          ) {
            this.persistCheckpoint();
          }

          if (this.context.totalDurationSeconds > 0 && this.context.elapsedSeconds >= this.context.totalDurationSeconds) {
            return this.transition({ type: 'EVALUATE' });
          }
          return this.getContext();
        }
        if (event.type === 'EVALUATE') {
          this.takeSnapshot();
          this.context.state = 'evaluating';
          if (event.payload) {
            this.context.data = { ...this.context.data, ...event.payload };
          }
          this.persistCheckpoint();
          this.config.onStateChange(this.context.state, this.context);
          return this.getContext();
        }
        if (event.type === 'COMPLETE') {
          this.context.state = 'completed';
          if (event.payload) {
            this.context.data = { ...this.context.data, ...event.payload };
          }
          this.clearCheckpoint();
          this.config.onStateChange(this.context.state, this.context);
          return this.getContext();
        }
        if (event.type === 'FAIL') {
          return this.rollback();
        }
        if (event.type === 'RESET') {
          return this.reset();
        }
        throw new Error(`[JourneyStateMachine] Illegal transition: cannot dispatch "${event.type}" from "active"`);
      }

      case 'paused': {
        if (event.type === 'RESUME') {
          this.context.state = 'active';
          this.context.lastTickTimestamp = event.timestamp ?? Date.now();
          this.persistCheckpoint();
          this.config.onStateChange(this.context.state, this.context);
          return this.getContext();
        }
        if (event.type === 'RESET') {
          return this.reset();
        }
        if (event.type === 'FAIL') {
          return this.rollback();
        }
        throw new Error(`[JourneyStateMachine] Illegal transition: timer cannot tick or dispatch "${event.type}" while "paused"`);
      }

      case 'evaluating': {
        if (event.type === 'COMPLETE') {
          this.context.state = 'completed';
          if (event.payload) {
            this.context.data = { ...this.context.data, ...event.payload };
          }
          this.clearCheckpoint();
          this.config.onStateChange(this.context.state, this.context);
          return this.getContext();
        }
        if (event.type === 'FAIL') {
          return this.rollback();
        }
        if (event.type === 'RESET') {
          return this.reset();
        }
        throw new Error(`[JourneyStateMachine] Illegal transition: timer cannot tick or dispatch "${event.type}" while "evaluating"`);
      }

      case 'completed': {
        if (event.type === 'RESET') {
          return this.reset();
        }
        throw new Error(`[JourneyStateMachine] Illegal transition: journey is already "completed"`);
      }

      default:
        throw new Error(`[JourneyStateMachine] Unknown state: ${currentState}`);
    }
  }

  /**
   * High-accuracy wall-clock delta calculation:
   * (Date.now() - lastTickTimestamp) prevents drift when browser background tabs throttle timers.
   */
  public tick(currentTime = Date.now()): number {
    if (this.context.state !== 'active') return 0;

    const deltaMs = currentTime - this.context.lastTickTimestamp;
    const deltaSecs = Math.floor(deltaMs / 1000);

    if (deltaSecs > 0) {
      this.context.lastTickTimestamp += deltaSecs * 1000;
      this.transition({ type: 'TICK', deltaSecs });
    }
    return deltaSecs;
  }

  /**
   * Takes a synchronous snapshot for optimistic rollback protection.
   */
  private takeSnapshot(): void {
    this.context.rollbackSnapshot = {
      state: this.context.state,
      elapsedSeconds: this.context.elapsedSeconds,
      totalDurationSeconds: this.context.totalDurationSeconds,
      lastTickTimestamp: this.context.lastTickTimestamp,
      data: JSON.parse(JSON.stringify(this.context.data)),
      savedAt: Date.now()
    };
  }

  /**
   * Reverts to the previous snapshot on persistence failure.
   */
  public rollback(): JourneyContext<T> {
    if (this.context.rollbackSnapshot) {
      const snap = this.context.rollbackSnapshot;
      this.context.state = snap.state;
      this.context.elapsedSeconds = snap.elapsedSeconds;
      this.context.totalDurationSeconds = snap.totalDurationSeconds;
      this.context.data = snap.data;
      this.context.rollbackSnapshot = null;
      this.persistCheckpoint();
      this.config.onStateChange(this.context.state, this.context);
    } else {
      this.reset();
    }
    return this.getContext();
  }

  /**
   * Resets the FSM to idle and purges local recovery checkpoints.
   */
  public reset(): JourneyContext<T> {
    this.context.state = 'idle';
    this.context.elapsedSeconds = 0;
    this.context.lastTickTimestamp = Date.now();
    this.context.rollbackSnapshot = null;
    this.clearCheckpoint();
    this.config.onStateChange(this.context.state, this.context);
    return this.getContext();
  }

  /**
   * Checkpoint persistence to StorageAdapter (Recovery key)
   */
  public persistCheckpoint(): void {
    if (!this.config.recoveryKey) return;
    const snapshot: JourneySnapshot<T> = {
      state: this.context.state,
      elapsedSeconds: this.context.elapsedSeconds,
      totalDurationSeconds: this.context.totalDurationSeconds,
      lastTickTimestamp: this.context.lastTickTimestamp,
      data: this.context.data,
      savedAt: Date.now()
    };
    storageAdapter.setCrashCheckpoint(this.config.recoveryKey, snapshot);
    this.context.lastCheckpointAt = Date.now();
    this.context.lastCheckpointElapsedSecs = this.context.elapsedSeconds;
    this.config.onCheckpoint(snapshot);
  }

  private loadCheckpoint(): JourneySnapshot<T> | null {
    if (!this.config.recoveryKey) return null;
    return storageAdapter.getCrashCheckpoint<JourneySnapshot<T>>(this.config.recoveryKey);
  }

  public clearCheckpoint(): void {
    if (!this.config.recoveryKey) return;
    storageAdapter.clearCrashCheckpoint(this.config.recoveryKey);
  }
}
