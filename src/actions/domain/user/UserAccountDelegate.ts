import { BaseActions } from '../BaseActions';
import { MentorProfile, UserProfile, UserSettings } from '@/types/index';
import { UserRepository } from '@/repositories/userRepository';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { MistakeRepository } from '@/repositories/mistakeRepository';
import { calculateLevelFromXP } from '@/utils/levelingCalculations';

export class UserAccountDelegate extends BaseActions {
  async resetHiddenMissions() {
    this.checkWriteBlock();
    const originalSnapshot = {
      deletedMissionIds: this.state.deletedMissionIds
    };
    this.runtime.updateStateOptimistic({ deletedMissionIds: [] });
    try {
      await UserRepository.updateUserProfile(this.userId, { deletedMissionIds: [] });
      await this.runtime.refresh('SESSION_UPDATE', {
        deletedMissionIds: [],
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'resetHiddenMissions');
    }
  }

  async purgeUserData() {
    this.checkWriteBlock();

    const collectionsToDelete = [
      'chapters',
      'mistakes',
      'notes',
      'studySessions',
      'mockResults',
      'customTimelineBlocks',
      'customMissions'
    ];

    try {
      await UserRepository.resetAllUserData(this.userId, collectionsToDelete);
      await UserRepository.deleteUser(this.userId);
    } catch (err: unknown) {
      console.error(`Error purging user data for ${this.userId}:`, err);
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to delete account data: ${message}`);
    }
  }

  async resetAllProgress() {
    this.checkWriteBlock();

    // 1. Delete all subcollections via repository encapsulation
    const collectionsToDelete = [
      'chapters',
      'mistakes',
      'notes',
      'studySessions',
      'mockResults',
      'customTimelineBlocks',
      'customMissions'
    ];

    await UserRepository.resetAllUserData(this.userId, collectionsToDelete);

    // 2. Reset user document
    const initialMentorProfile: MentorProfile = {
      targetExams: ['JEE Main', 'JEE Advanced'],
      targetYear: '2027',
      targetPercentile: '99.5+',
      targetRank: 'AIR 1000',
      targetCollege: 'IIT Bombay',
      targetBranch: 'Computer Science & Engineering',
      currentClass: '12th',
      coachingType: 'Online Coaching',
      dailyAvailableHours: 6,
      subjectSplitStrategy: '3_a_day',
      interviewCompleted: false
    };

    const initialSettings: UserSettings = {
      targetYear: '2027',
      dreamIit: 'IIT Bombay',
      targetBranch: 'Computer Science & Engineering',
      dailyQuota: 6,
      showStatusInBar: true,
      soundEffects: false,
      desktopNotifications: false,
      volume: 80,
      pauseOnTabChange: true,
      migratedToPristine: true
    };

    const initialProfile: UserProfile = {
      xp: { daily: 0, weekly: 0, monthly: 0, total: 0, level: 1, streak: 0, nextLevelXP: calculateLevelFromXP(0).nextLevelXP, lastActiveDate: '' },
      analytics: { studyTime: 0, focusTime: 0, idleTime: 0, breakTime: 0, questionsSolved: 0, accuracy: 0, tasksCompleted: 0, xpEarned: 0 },
      energyLevel: 'Medium',
      activeSubject: 'physics',
      isMissionModeActive: false,
      coachMessage: 'Ready',
      mentorProfile: initialMentorProfile,
      settings: initialSettings
    };
    await UserRepository.saveUserProfile(this.userId, initialProfile);

    // 3. Re-seed Chapters & Mistakes
    const { INITIAL_CHAPTERS } = await import('@/constants/initialSeeds');
    await ChapterRepository.seedChapters(this.userId, INITIAL_CHAPTERS);
    await MistakeRepository.seedMistakes(this.userId, []);

    // 4. Force state reload in runtime & reset mentorProfile so interview modal re-opens
    await this.runtime.initialize({
      chapters: INITIAL_CHAPTERS,
      notes: [],
      mistakes: [],
      studySessions: [],
      mocks: [],
      timeline: [],
      xp: initialProfile.xp,
      analytics: initialProfile.analytics,
      energyLevel: initialProfile.energyLevel,
      activeSubject: initialProfile.activeSubject,
      isMissionModeActive: initialProfile.isMissionModeActive,
      coachMessage: initialProfile.coachMessage,
      mentorProfile: initialMentorProfile,
      settings: initialSettings,
      initializationError: null,
      writeBlocked: false,
      loading: false
    });
  }
}
