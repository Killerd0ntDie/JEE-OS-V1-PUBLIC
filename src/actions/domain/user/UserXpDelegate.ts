import { BaseActions } from '../BaseActions';
import { UserRepository } from '@/repositories/userRepository';
import { calculateLevelFromXP } from '@/utils/levelingCalculations';

export class UserXpDelegate extends BaseActions {
  async awardPartialXP(missionId: string, elapsedSecs: number, focusScore: number) {
    this.checkWriteBlock();
    const mission = this.state.todayMissions.find(m => m.id === missionId);
    if (!mission || mission.completed) return;

    if (focusScore < 30) {
      console.warn('Partial XP rejected: Focus score too low, indicating AFK behavior.');
      return;
    }

    const missionDurationSecs = (mission.duration || 60) * 60;
    const timeRatio = Math.min(0.95, elapsedSecs / missionDurationSecs);
    const focusMultiplier = Math.min(1, focusScore / 100);
    const baseXp = mission.xp || 50;
    let partialXP = Math.max(5, Math.floor(baseXp * timeRatio * focusMultiplier));

    if (this.isGodModeActive()) {
      partialXP = Math.floor(partialXP * 1.5);
    }

    const previousPartialXp = mission.partialXpAwarded || 0;
    const deltaXp = partialXP - previousPartialXp;

    if (deltaXp <= 0) return;

    const updatedMissions = this.state.todayMissions.map(m =>
      m.id === missionId ? { ...m, partialXpAwarded: partialXP } : m
    );

    const oldLevel = this.state.xp.level;
    const baseXpState = this.getResetXpBase();
    const newXp = {
      ...baseXpState,
      daily: Math.max(0, baseXpState.daily + deltaXp),
      weekly: Math.max(0, baseXpState.weekly + deltaXp),
      monthly: Math.max(0, (baseXpState.monthly || 0) + deltaXp),
      total: Math.max(0, baseXpState.total + deltaXp)
    };

    const { level: newLevel, nextLevelXP: xpNeededForNext } = calculateLevelFromXP(newXp.total);
    newXp.level = newLevel;
    newXp.nextLevelXP = xpNeededForNext;
    this.evaluateAndUpdateStreak(newXp, this.state.studySessions);

    const originalSnapshot = {
      todayMissions: this.state.todayMissions,
      xp: this.state.xp
    };

    this.runtime.updateStateOptimistic({
      todayMissions: updatedMissions,
      xp: newXp
    });

    try {
      await UserRepository.updateUserProfile(this.userId, {
        xp: newXp
      });
      await this.runtime.refresh('SESSION_UPDATE', {
        todayMissions: updatedMissions,
        xp: newXp,
        lastSyncError: null,
        ...(newLevel > oldLevel ? { levelUpData: { oldLevel, newLevel, xp: newXp } } : {})
      });
    } catch (err) {
      this.runtime.updateStateOptimistic({
        todayMissions: originalSnapshot.todayMissions,
        xp: originalSnapshot.xp
      });
      await this.handleWriteError(err, 'awardPartialXP');
    }

    console.log(`[PartialXP] Awarded ${partialXP} XP for ${Math.round(elapsedSecs / 60)}m work on mission ${missionId} (focus: ${focusScore}%)`);
  }

  async deductCasinoWager(wagerAmount: number) {
    this.checkWriteBlock();
    if (!wagerAmount || wagerAmount <= 0) return;

    const newXp = {
      ...this.state.xp,
      total: Math.max(0, this.state.xp.total - wagerAmount)
    };

    const { level: newLevel, nextLevelXP: xpNeededForNext } = calculateLevelFromXP(newXp.total);
    newXp.level = newLevel;
    newXp.nextLevelXP = xpNeededForNext;

    const originalSnapshot = {
      xp: this.state.xp
    };

    this.runtime.updateStateOptimistic({ xp: newXp });

    try {
      await UserRepository.updateUserProfile(this.userId, { xp: newXp });
      await this.runtime.refresh('SESSION_UPDATE', { xp: newXp, lastSyncError: null });
      console.log(`[Casino] Deducted ${wagerAmount} XP for failed Proof of Work.`);
    } catch (err) {
      this.runtime.updateStateOptimistic({ xp: originalSnapshot.xp });
      await this.handleWriteError(err, 'deductCasinoWager');
    }
  }

  async resetXpAndLevel() {
    this.checkWriteBlock();
    const resetXp = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      total: 0,
      level: 1,
      streak: 0,
      nextLevelXP: calculateLevelFromXP(0).nextLevelXP,
      lastActiveDate: ''
    };

    const originalSnapshot = {
      xp: this.state.xp
    };
    this.runtime.updateStateOptimistic({ xp: resetXp });

    try {
      await UserRepository.updateUserProfile(this.userId, { xp: resetXp });
      await this.runtime.refresh('SETTINGS_UPDATE', { xp: resetXp, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic({ xp: originalSnapshot.xp });
      await this.handleWriteError(err, 'resetXpAndLevel');
    }
  }
}
