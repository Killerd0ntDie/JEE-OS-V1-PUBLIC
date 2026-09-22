import { writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { StudyBrainRuntime, StudyBrainState } from '@/runtime/StudyBrainRuntime';
import { StudySession, XPState } from '@/types/index';
import { toLocalDateString } from '@/utils/dateUtils';

export class BaseActions {
  public runtime: StudyBrainRuntime;
  public userId: string;

  constructor(runtime: StudyBrainRuntime, userId: string) {
    this.runtime = runtime;
    this.userId = userId;
  }

  public isGuestUser(): boolean {
    return !this.userId || this.userId === 'guest';
  }

  public setUserId(newUid: string) {
    if (newUid && newUid !== this.userId) {
      this.userId = newUid;
    }
  }

  public get state(): StudyBrainState {
    return this.runtime.getState();
  }

  public checkWriteBlock() {
    if (this.state.writeBlocked) {
      const errMsg = "Write operations are blocked due to a failed or corrupt database initialization.";
      console.error(errMsg);
      throw new Error(errMsg);
    }
  }

  public async handleWriteError(err: any, actionName: string): Promise<never> {
    const errorMsg = `Sync Error (${actionName}): ${err?.message || 'Database write failed'}`;
    console.error(errorMsg, err);
    this.triggerToast('Sync Error', errorMsg, 'error');
    await this.runtime.refresh('SETTINGS_UPDATE', { lastSyncError: errorMsg });
    throw new Error(errorMsg);
  }

  public async runAtomicBatch(
    populateBatch: (batch: ReturnType<typeof writeBatch>) => void | Promise<void>,
    actionName: string
  ): Promise<void> {
    if (this.isGuestUser()) {
      return;
    }
    const batch = writeBatch(db);
    await populateBatch(batch);
    try {
      await batch.commit();
    } catch (err: any) {
      await this.handleWriteError(err, actionName);
    }
  }

  public async safeDbCall<T>(operation: () => Promise<T>, actionName: string): Promise<T | void> {
    if (this.isGuestUser()) {
      return undefined;
    }
    try {
      return await operation();
    } catch (err: any) {
      await this.handleWriteError(err, actionName);
    }
  }

  public triggerToast(title: string, message?: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('global-toast', {
        detail: { title, message, type }
      }));
    }
  }

  public getResetXpBase(): XPState {
    const xp = { ...this.state.xp };
    const today = toLocalDateString();
    const lastActive = xp.lastActiveDate;

    if (lastActive && lastActive !== today) {
      xp.daily = 0;
      const getISOWeek = (dateStr: string) => {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
        const jan4 = new Date(d.getFullYear(), 0, 4);
        return Math.round(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 6) / 7);
      };
      if (getISOWeek(lastActive) !== getISOWeek(today)) {
        xp.weekly = 0;
      }
      if (lastActive.substring(0, 7) !== today.substring(0, 7)) {
        xp.monthly = 0;
      }
    }
    if (xp.monthly === undefined) {
      xp.monthly = 0;
    }
    return xp;
  }

  public isGodModeActive(): boolean {
    return (this.state.xp?.streak || 0) >= 7 && (this.state.settings?.enableGodMode !== false);
  }

  public evaluateAndUpdateStreak(xp: any, updatedSessions: StudySession[]) {
    const today = toLocalDateString();
    const minThresholdMins = Math.round((this.state.settings?.minStreakHours ?? 0.5) * 60);
    
    const todayMinutes = updatedSessions
      .filter(s => toLocalDateString(new Date(s.startTime)) === today)
      .reduce((sum, s) => sum + (typeof s.duration === 'number' ? s.duration : 0), 0);

    if (todayMinutes >= minThresholdMins) {
      const prevDate = xp.lastActiveDate;
      if (prevDate !== today) {
        if (prevDate) {
          const last = new Date(`${prevDate}T00:00:00`);
          const curr = new Date(`${today}T00:00:00`);
          const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            xp.streak = (xp.streak || 0) + 1;
          } else {
            xp.streak = 1;
          }
        } else {
          xp.streak = 1;
        }
        xp.lastActiveDate = today;
      }
      if (!xp.streak) xp.streak = 1;
    }
    return xp;
  }
}
