import { z } from 'zod';
import { BaseActions } from './BaseActions';
import { 
  SubjectId, 
  MentorProfile, 
  DailyCheckin, 
  WeeklyCheckin, 
  MonthlyObjective, 
  Chapter, 
  PlannerOutputs,
  UserProfile,
  UserSettings,
  LectureProgress,
  ChapterStatus
} from '@/types/index';
import { UserRepository } from '@/repositories/userRepository';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { MistakeRepository } from '@/repositories/mistakeRepository';
import { calculateLevelFromXP } from '@/utils/levelingCalculations';
import { toLocalDateString } from '@/utils/dateUtils';
import { getLocalDateKey } from '@jee-os/engines';

export class UserActions extends BaseActions {
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

    console.log(`[PartialXP] Awarded ${partialXP} XP for ${Math.round(elapsedSecs/60)}m work on mission ${missionId} (focus: ${focusScore}%)`);
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
    const { INITIAL_CHAPTERS } = await import('../../constants/initialSeeds');
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

  async updateMentorProfile(profile: Partial<MentorProfile>) {
    this.checkWriteBlock();
    const currentMentor = this.state.mentorProfile || {
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

    const updatedMentor: MentorProfile = {
      ...currentMentor,
      ...profile
    };

    const updatedSettings = {
      ...this.state.settings,
      targetYear: updatedMentor.targetYear || this.state.settings.targetYear,
      dreamIit: updatedMentor.targetCollege || this.state.settings.dreamIit,
      targetBranch: updatedMentor.targetBranch || this.state.settings.targetBranch,
      dailyQuota: updatedMentor.dailyAvailableHours || this.state.settings.dailyQuota
    };

    const originalSnapshot = {
      mentorProfile: this.state.mentorProfile,
      settings: this.state.settings
    };

    this.runtime.updateStateOptimistic({
      mentorProfile: updatedMentor,
      settings: updatedSettings
    });

    try {
      await UserRepository.updateUserProfile(this.userId, {
        mentorProfile: updatedMentor,
        settings: updatedSettings
      });

      await this.runtime.refresh('INIT', {
        mentorProfile: updatedMentor,
        settings: updatedSettings,
        plannerOutput: null,
        todayMissions: [],
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'updateMentorProfile');
    }
  }

  async completeMentorInterview(
    mentorData: Omit<MentorProfile, 'interviewCompleted'>,
    chapterUpdates?: Array<{
      id: string;
      status: 'Not Started' | 'In Progress' | 'Completed';
      confidence?: number;
      lecturesWatched?: number;
      totalLectures?: number;
      avgLectureDuration?: number;
      dppDone?: boolean | 'partial';
      pyqsDone?: boolean;
      completion?: number;
    }>
  ) {
    this.checkWriteBlock();

    const originalSnapshot = {
      mentorProfile: this.state.mentorProfile,
      settings: this.state.settings,
      chapters: this.state.chapters
    };

    // 1. Batch update chapters in repository if student updated reality
    let updatedChapters = [...this.state.chapters];
    if (chapterUpdates && chapterUpdates.length > 0) {
      for (const update of chapterUpdates) {
        const chap = updatedChapters.find(c => c.id === update.id);
        if (chap) {
          const mappedStatus: ChapterStatus = update.status === 'Completed' ? 'Mastered' : update.status === 'In Progress' ? 'Learning' : 'Not Started';
          const completion = update.completion !== undefined ? update.completion :
            (update.status === 'Completed' ? 100 : update.status === 'In Progress' ? 50 : 0);
          const conf = update.confidence !== undefined ? update.confidence :
            (update.status === 'Completed' ? 85 : update.status === 'In Progress' ? 50 : 20);
          
          const dppComplete = update.dppDone === true;
          const pyqsComplete = update.pyqsDone === true;
          
          const cleanLectureProgress: LectureProgress = {
            totalLectures: update.totalLectures ?? chap.totalLectures ?? 12,
            completedLectures: update.lecturesWatched ?? chap.currentLecture ?? 0,
            avgLectureDurationMinutes: update.avgLectureDuration ?? chap.lectureProgress?.avgLectureDurationMinutes ?? 75,
            ...(chap.lectureProgress?.teacher ? { teacher: chap.lectureProgress.teacher } : {}),
            ...(chap.lectureProgress?.lectureSeries ? { lectureSeries: chap.lectureProgress.lectureSeries } : {}),
            ...(chap.lectureProgress?.estimatedRemainingHours !== undefined ? { estimatedRemainingHours: chap.lectureProgress.estimatedRemainingHours } : {})
          };

          const removeUndefined = <T extends object>(obj: T): T =>
            Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

          const totalLectures = update.totalLectures ?? chap.totalLectures ?? 12;
          const rawCurrent = update.lecturesWatched ?? chap.currentLecture ?? 0;
          const validCurrentLecture = Math.min(Math.max(0, rawCurrent), totalLectures);

          const updatedChap: Chapter = removeUndefined<Chapter>({
            ...chap,
            status: mappedStatus,
            completion,
            confidence: conf,
            currentLecture: validCurrentLecture,
            totalLectures: totalLectures,
            theoryComplete: update.status === 'Completed' || (validCurrentLecture >= totalLectures),
            dppComplete,
            pyqsComplete,
            lectureProgress: cleanLectureProgress,
          });
          
          try {
            await ChapterRepository.saveChapter(this.userId, updatedChap);
          } catch (chapterSaveErr) {
            console.error(`[MentorInterview] Chapter save FAILED for ${update.id}:`, chapterSaveErr);
          }
          updatedChapters = updatedChapters.map(c => c.id === update.id ? updatedChap : c);
        }
      }
    }

    // 2. Refresh runtime to trigger engines with new reality
    const updatedSettings = {
      ...this.state.settings,
      targetYear: mentorData.targetYear,
      dreamIit: mentorData.targetCollege,
      targetBranch: mentorData.targetBranch,
      dailyQuota: mentorData.dailyAvailableHours
    };

    const tempMentorProfile: MentorProfile = {
      ...mentorData,
      interviewCompleted: false
    };

    await this.runtime.refresh('SETTINGS_UPDATE', {
      mentorProfile: tempMentorProfile,
      settings: updatedSettings,
      chapters: updatedChapters
    });

    // 3. Build AI Strategic Roadmap dynamically from PlannerEngine / OptimizationEngine
    const opt = this.state.optimizationResult;
    const plan = this.state.plannerOutput;

    const physPct = this.state.syllabusProgress?.physics?.percentage || 0;
    const chemPct = this.state.syllabusProgress?.chemistry?.percentage || 0;
    const mathsPct = this.state.syllabusProgress?.maths?.percentage || 0;
    const avgPct = Math.round((physPct + chemPct + mathsPct) / 3);
    const safeRemainingPct = Math.max(0, Math.min(100, 100 - (isNaN(avgPct) ? 0 : avgPct)));

    const plannerOutputs: PlannerOutputs = {
      currentPosition: plan?.reasoningPipelineSummary?.academicStateOverview || `Class ${mentorData.currentClass} student preparing for ${mentorData.targetExams.join(', ')} (${mentorData.targetYear}).`,
      remainingSyllabusPercent: safeRemainingPct,
      estimatedCompletionDate: opt?.predictedCompletionDate?.split('T')[0] || `${mentorData.targetYear}-11-30`,
      riskLevel: opt?.scheduleStatus === 'Behind Schedule' ? 'Critical' : opt?.scheduleStatus === 'At Risk' ? 'At Risk' : 'On Track',
      currentBottlenecks: [
        ...(plan?.reasoningPipelineSummary?.detectedPrerequisiteGaps || []),
        ...(plan?.reasoningPipelineSummary?.detectedWeakAreas || [])
      ].slice(0, 3),
      projectedReadinessPercent: plan?.completionProbability || 88,
      successCriteria: [
        'Complete all Tier-1 weightage chapters before October.',
        'Maintain > 75% accuracy on DPPs and PYQs.',
        'Solve minimum 30 PYQs per completed chapter.'
      ],
      mentorDecisionExplanations: [
        plan?.reasoningPipelineSummary?.strategicTakeaway || 'Prioritized Mechanics & Calculus because 14 upcoming chapters directly depend on them.',
        `Set daily target to ${mentorData.dailyAvailableHours} hours based on your capacity budget.`
      ]
    };

    const predTime = (opt?.predictedCompletionDate && !isNaN(new Date(opt.predictedCompletionDate).getTime())) 
      ? new Date(opt.predictedCompletionDate).getTime() 
      : Date.now();

    const roadmap = {
      generatedAt: new Date().toISOString(),
      overallStrategy: `Targeting ${mentorData.targetExams.join(', ')} (${mentorData.targetYear}) for ${mentorData.targetCollege} (${mentorData.targetBranch}). Based on your ${mentorData.currentClass} profile and ${mentorData.dailyAvailableHours}h daily availability, we execute high-yield priority coverage with strictly verified chapter realities.`,
      weeklyTargets: [
        {
          weekNumber: 1,
          title: 'Immediate Priority Tasks',
          focusSubject: (opt?.neglectedSubjects?.[0] || 'physics') as SubjectId,
          keyChapters: Array.from(new Set(plan?.todaysMission?.map(t => t.chapterName) || [])).slice(0, 3),
          status: 'active' as const
        },
        {
          weekNumber: 2,
          title: 'Upcoming Priority Coverage',
          focusSubject: (opt?.neglectedSubjects?.[1] || 'chemistry') as SubjectId,
          keyChapters: Array.from(new Set(plan?.carryForward?.map(t => t.chapterName) || [])).slice(0, 3),
          status: 'upcoming' as const
        },
        {
          weekNumber: 3,
          title: 'Advanced Mastery',
          focusSubject: 'maths' as SubjectId,
          keyChapters: Array.from(new Set(plan?.carryForward?.map(t => t.chapterName) || [])).slice(3, 6),
          status: 'upcoming' as const
        }
      ],
      milestones: [
        {
          id: 'ms-1',
          title: 'Chapter Reality Diagnostic & Baseline Sync',
          targetDate: toLocalDateString(),
          description: 'Zero assumptions. Confirm all pending vs completed lecture modules.',
          status: 'achieved' as const
        },
        {
          id: 'ms-2',
          title: 'Full Syllabus Coverage Lock',
          targetDate: opt?.predictedCompletionDate?.split('T')[0] || toLocalDateString(new Date(Date.now() + 30 * 86400000)),
          description: 'Master Tier-1 weightage chapters across Physics, Chemistry, and Maths.',
          status: 'pending' as const
        },
        {
          id: 'ms-3',
          title: 'Full Mock Test Simulation & Percentile Audit',
          targetDate: toLocalDateString(new Date(predTime + 15 * 86400000)),
          description: `Targeting ${mentorData.targetPercentile} percentile benchmark on ${mentorData.targetExams?.[0] || 'JEE Main'}.`,
          status: 'pending' as const
        }
      ]
    };

    const fullMentorProfile: MentorProfile = {
      ...mentorData,
      interviewCompleted: true,
      interviewCompletedAt: new Date().toISOString(),
      realityAuditCompleted: true,
      plannerOutputs,
      roadmap
    };

    // 4. Update mentor profile permanently
    try {
      await UserRepository.updateUserProfile(this.userId, {
        mentorProfile: fullMentorProfile,
        settings: updatedSettings
      });
      console.log('[MentorInterview] Profile saved successfully for user:', this.userId);
    } catch (profileSaveErr) {
      console.error('[MentorInterview] Profile save FAILED:', profileSaveErr);
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(profileSaveErr, 'completeMentorInterview');
    }

    await this.runtime.refresh('INIT', {
      mentorProfile: fullMentorProfile,
      settings: updatedSettings,
      chapters: updatedChapters,
      plannerOutput: null,
      todayMissions: []
    });
  }

  async submitDailyCheckin(checkin: DailyCheckin) {
    this.checkWriteBlock();
    const mentor = this.state.mentorProfile;
    if (!mentor) return;

    const filteredCheckins = (mentor.dailyCheckins || []).filter(c => c.date !== checkin.date);
    const updatedDailyCheckins = [...filteredCheckins, checkin].slice(-30);

    const updatedMentor: MentorProfile = {
      ...mentor,
      dailyAvailableHours: checkin.actualHoursAvailable,
      dailyCheckins: updatedDailyCheckins
    };

    const updatedSettings = {
      ...this.state.settings,
      dailyQuota: checkin.actualHoursAvailable
    };

    const originalSnapshot = {
      mentorProfile: this.state.mentorProfile,
      settings: this.state.settings,
      energyLevel: this.state.energyLevel
    };

    this.runtime.updateStateOptimistic({
      mentorProfile: updatedMentor,
      settings: updatedSettings,
      energyLevel: checkin.energyLevel
    });

    try {
      await UserRepository.updateUserProfile(this.userId, {
        mentorProfile: updatedMentor,
        settings: updatedSettings
      });

      await this.runtime.refresh('SETTINGS_UPDATE', {
        mentorProfile: updatedMentor,
        settings: updatedSettings,
        energyLevel: checkin.energyLevel,
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'submitDailyCheckin');
    }
  }

  async submitWeeklyCheckin(checkin: WeeklyCheckin) {
    this.checkWriteBlock();
    const mentor = this.state.mentorProfile;
    if (!mentor) return;

    const updatedWeeklyCheckins = [...(mentor.weeklyCheckins || []), checkin].slice(-12);
    
    const updatedMentor: MentorProfile = {
      ...mentor,
      weeklyCheckins: updatedWeeklyCheckins
    };

    const originalSnapshot = {
      mentorProfile: this.state.mentorProfile
    };

    this.runtime.updateStateOptimistic({
      mentorProfile: updatedMentor
    });

    try {
      await UserRepository.updateUserProfile(this.userId, {
        mentorProfile: updatedMentor
      });

      await this.runtime.refresh('SETTINGS_UPDATE', {
        mentorProfile: updatedMentor,
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'submitWeeklyCheckin');
    }
  }

  async setMonthlyObjective(objective: MonthlyObjective) {
    this.checkWriteBlock();
    const mentor = this.state.mentorProfile;
    if (!mentor) return;

    const updatedMentor: MentorProfile = {
      ...mentor,
      monthlyObjective: objective
    };

    const originalSnapshot = {
      mentorProfile: this.state.mentorProfile
    };

    this.runtime.updateStateOptimistic({
      mentorProfile: updatedMentor
    });

    try {
      await UserRepository.updateUserProfile(this.userId, {
        mentorProfile: updatedMentor
      });

      await this.runtime.refresh('SETTINGS_UPDATE', {
        mentorProfile: updatedMentor,
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'setMonthlyObjective');
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
}

