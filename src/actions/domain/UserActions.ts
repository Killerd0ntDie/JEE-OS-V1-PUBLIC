import { z } from 'zod';
import { BaseActions } from './BaseActions';
import { 
  SubjectId, 
  MentorProfile, 
  DailyCheckin, 
  WeeklyCheckin, 
  MonthlyObjective, 
  UserSettings
} from '@/types/index';
import { UserRepository } from '@/repositories/userRepository';
import { getLocalDateKey } from '@jee-os/engines';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { UserAccountDelegate } from './user/UserAccountDelegate';
import { UserMentorDelegate } from './user/UserMentorDelegate';
import { UserXpDelegate } from './user/UserXpDelegate';

export class UserActions extends BaseActions {
  private accountDelegate: UserAccountDelegate;
  private mentorDelegate: UserMentorDelegate;
  private xpDelegate: UserXpDelegate;

  constructor(runtime: StudyBrainRuntime, userId: string) {
    super(runtime, userId);
    this.accountDelegate = new UserAccountDelegate(runtime, userId);
    this.mentorDelegate = new UserMentorDelegate(runtime, userId);
    this.xpDelegate = new UserXpDelegate(runtime, userId);
  }

  override setUserId(newUid: string) {
    super.setUserId(newUid);
    this.accountDelegate.setUserId(newUid);
    this.mentorDelegate.setUserId(newUid);
    this.xpDelegate.setUserId(newUid);
  }

  // --- Account & Progress Delegation ---
  async purgeUserData() {
    return this.accountDelegate.purgeUserData();
  }

  async resetAllProgress() {
    return this.accountDelegate.resetAllProgress();
  }

  async resetHiddenMissions() {
    return this.accountDelegate.resetHiddenMissions();
  }

  // --- XP & Gamification Delegation ---
  async awardPartialXP(missionId: string, elapsedSecs: number, focusScore: number) {
    return this.xpDelegate.awardPartialXP(missionId, elapsedSecs, focusScore);
  }

  async deductCasinoWager(wagerAmount: number) {
    return this.xpDelegate.deductCasinoWager(wagerAmount);
  }

  async resetXpAndLevel() {
    return this.xpDelegate.resetXpAndLevel();
  }

  // --- Mentor & Coaching Delegation ---
  async updateMentorProfile(profile: Partial<MentorProfile>) {
    return this.mentorDelegate.updateMentorProfile(profile);
  }

  async completeMentorInterview(
    mentorData: Omit<MentorProfile, 'interviewCompleted'>,
    chapterUpdates?: Parameters<UserMentorDelegate['completeMentorInterview']>[1]
  ) {
    return this.mentorDelegate.completeMentorInterview(mentorData, chapterUpdates);
  }

  async submitDailyCheckin(checkin: DailyCheckin) {
    return this.mentorDelegate.submitDailyCheckin(checkin);
  }

  async submitWeeklyCheckin(checkin: WeeklyCheckin) {
    return this.mentorDelegate.submitWeeklyCheckin(checkin);
  }

  async setMonthlyObjective(objective: MonthlyObjective) {
    return this.mentorDelegate.setMonthlyObjective(objective);
  }

  // --- Core User Settings & Session Methods ---
  async clearSyncError() {
    await this.runtime.refresh('SETTINGS_UPDATE', { lastSyncError: null });
  }

  async setActiveSubject(subject: SubjectId | 'all') {
    this.checkWriteBlock();
    const originalSubject = this.state.activeSubject;
    this.runtime.updateStateOptimistic({ activeSubject: subject });
    try {
      await UserRepository.updateUserProfile(this.userId, { activeSubject: subject });
      await this.runtime.refresh('SETTINGS_UPDATE', { activeSubject: subject, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic({ activeSubject: originalSubject });
      await this.handleWriteError(err, 'setActiveSubject');
    }
  }

  async setRadarFocusedChapter(chapterId: string) {
    this.checkWriteBlock();
    const chap = this.state.chapters.find(c => c.id === chapterId || c.name === chapterId);
    if (!chap) return;
    await this.runtime.refresh('SETTINGS_UPDATE', { 
      activeSubject: chap.subject,
      radarFocusedChapter: chap.id 
    });
  }

  async setEnergyLevel(level: 'High' | 'Medium' | 'Low') {
    this.checkWriteBlock();
    const originalEnergy = this.state.energyLevel;
    this.runtime.updateStateOptimistic({ energyLevel: level });
    try {
      await UserRepository.updateUserProfile(this.userId, { energyLevel: level });
      await this.runtime.refresh('SETTINGS_UPDATE', { energyLevel: level, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic({ energyLevel: originalEnergy });
      await this.handleWriteError(err, 'setEnergyLevel');
    }
  }

  async setMissionModeActive(active: boolean) {
    this.checkWriteBlock();
    const originalMode = this.state.isMissionModeActive;
    this.runtime.updateStateOptimistic({ isMissionModeActive: active });
    try {
      await UserRepository.updateUserProfile(this.userId, { isMissionModeActive: active });
      await this.runtime.refresh('SETTINGS_UPDATE', { isMissionModeActive: active, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic({ isMissionModeActive: originalMode });
      await this.handleWriteError(err, 'setMissionModeActive');
    }
  }

  async setSettings(newSettings: Partial<UserSettings>) {
    this.checkWriteBlock();

    const SettingsSchema = z.object({
      targetYear: z.string().optional(),
      dreamIit: z.string().optional(),
      targetBranch: z.string().optional(),
      dailyQuota: z.number().min(0).max(16).optional(),
      showStatusInBar: z.boolean().default(true),
      soundEffects: z.boolean().default(true),
      desktopNotifications: z.boolean().default(true),
      prerequisiteEnforcementStrategy: z.enum(['strict', 'parallel']).optional(),
      dayStartTime: z.string().optional(),
      dayEndTime: z.string().optional(),
    }).passthrough();

    const validatedPartial = SettingsSchema.parse(newSettings) as Partial<UserSettings>;
    
    const validatedSettings: UserSettings = {
      ...this.state.settings,
      ...validatedPartial
    };

    const updatedMentor = this.state.mentorProfile ? {
      ...this.state.mentorProfile,
      dailyAvailableHours: validatedSettings.dailyQuota ?? this.state.mentorProfile.dailyAvailableHours,
      targetYear: validatedSettings.targetYear ?? this.state.mentorProfile.targetYear,
      targetCollege: validatedSettings.dreamIit ?? this.state.mentorProfile.targetCollege,
      targetBranch: validatedSettings.targetBranch ?? this.state.mentorProfile.targetBranch
    } : null;

    const originalSnapshot = {
      settings: this.state.settings,
      mentorProfile: this.state.mentorProfile
    };

    this.runtime.updateStateOptimistic({
      settings: validatedSettings,
      ...(updatedMentor ? { mentorProfile: updatedMentor } : {})
    });

    try {
      await UserRepository.updateUserProfile(this.userId, { 
        settings: validatedSettings,
        ...(updatedMentor ? { mentorProfile: updatedMentor } : {})
      });
      await this.runtime.refresh('SETTINGS_UPDATE', { 
        settings: validatedSettings, 
        ...(updatedMentor ? { mentorProfile: updatedMentor } : {}),
        lastSyncError: null 
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'setSettings');
    }
  }

  async updateSettings(newSettings: Partial<UserSettings>) {
    return this.setSettings(newSettings);
  }

  async extendSession(hours: number) {
    this.checkWriteBlock();
    const state = this.runtime.getState();
    if (!state.settings) return;

    const dayStartTime = state.settings?.dayStartTime || '07:00';
    const dayEndTime = state.settings?.dayEndTime || '23:00';

    const parseTimeVal = (val: string | undefined, fallback: number) => {
      const p = parseInt(val || '', 10);
      return isNaN(p) ? fallback : p;
    };
    const startHourVal = parseTimeVal(dayStartTime.split(':')[0], 7);

    const getTimeMins = (tStr: string) => {
      const parts = (tStr || '').split(':');
      let h = parseTimeVal(parts[0], 23);
      const m = parseTimeVal(parts[1], 0);
      if (h < startHourVal) h += 24;
      return h * 60 + m;
    };

    const baseMins = getTimeMins(dayEndTime);
    const now = new Date();
    let realNowHour = now.getHours();
    if (realNowHour < startHourVal) realNowHour += 24;
    const realNowMins = realNowHour * 60 + now.getMinutes();

    const targetStartMins = Math.max(baseMins, realNowMins);
    const newEndMins = targetStartMins + Math.round(hours * 60);

    const newEndHour = Math.floor((newEndMins % 1440) / 60);
    const newEndMin = newEndMins % 60;
    const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`;
    
    const logicalNow = new Date();
    if (logicalNow.getHours() < startHourVal) {
      logicalNow.setDate(logicalNow.getDate() - 1);
    }
    logicalNow.setHours(0, 0, 0, 0);
    const todayDateStr = getLocalDateKey(logicalNow);

    const updatedSettings = {
      ...state.settings,
      sessionExtensionDate: todayDateStr,
      sessionExtensionEnd: newEndTime
    };

    const originalSnapshot = {
      settings: this.state.settings
    };

    this.runtime.updateStateOptimistic({
      settings: updatedSettings
    });

    try {
      await this.safeDbCall(
        () => UserRepository.updateUserProfile(this.userId, {
          settings: updatedSettings
        }),
        'extendSession'
      );
      await this.runtime.refresh('SETTINGS_UPDATE', { settings: updatedSettings });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'extendSession');
    }
  }

  async toggleFormulaBookmark(formulaId: string) {
    this.checkWriteBlock();
    const currentBookmarks = this.state.bookmarkedFormulaIds || [];
    const exists = currentBookmarks.includes(formulaId);
    const updatedBookmarks = exists
      ? currentBookmarks.filter(id => id !== formulaId)
      : [...currentBookmarks, formulaId];

    const originalBookmarks = [...currentBookmarks];
    this.runtime.updateStateOptimistic({ bookmarkedFormulaIds: updatedBookmarks });

    try {
      await this.safeDbCall(
        () => UserRepository.updateUserProfile(this.userId, {
          bookmarkedFormulaIds: updatedBookmarks
        }),
        'toggleFormulaBookmark'
      );
      await this.runtime.refresh('SETTINGS_UPDATE', { bookmarkedFormulaIds: updatedBookmarks, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic({ bookmarkedFormulaIds: originalBookmarks });
      await this.handleWriteError(err, 'toggleFormulaBookmark');
    }
  }

  async setFormulaBookmarks(formulaIds: string[]) {
    this.checkWriteBlock();
    const originalBookmarks = [...(this.state.bookmarkedFormulaIds || [])];
    this.runtime.updateStateOptimistic({ bookmarkedFormulaIds: formulaIds });

    try {
      await this.safeDbCall(
        () => UserRepository.updateUserProfile(this.userId, {
          bookmarkedFormulaIds: formulaIds
        }),
        'setFormulaBookmarks'
      );
      await this.runtime.refresh('SETTINGS_UPDATE', { bookmarkedFormulaIds: formulaIds, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic({ bookmarkedFormulaIds: originalBookmarks });
      await this.handleWriteError(err, 'setFormulaBookmarks');
    }
  }
}
