import { BaseActions } from '../BaseActions';
import { 
  MentorProfile, 
  DailyCheckin, 
  WeeklyCheckin, 
  MonthlyObjective, 
  Chapter, 
  ChapterStatus,
  LectureProgress,
  PlannerOutputs,
  SubjectId
} from '@/types/index';
import { UserRepository } from '@/repositories/userRepository';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { toLocalDateString } from '@/utils/dateUtils';

export class UserMentorDelegate extends BaseActions {
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
    const chaptersToSave: Chapter[] = [];
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

          chaptersToSave.push(updatedChap);
          updatedChapters = updatedChapters.map(c => c.id === update.id ? updatedChap : c);
        }
      }

      if (chaptersToSave.length > 0) {
        try {
          if (typeof ChapterRepository.saveChaptersBatch === 'function' && chaptersToSave.length > 1) {
            await ChapterRepository.saveChaptersBatch(this.userId, chaptersToSave);
          } else {
            for (const chap of chaptersToSave) {
              await ChapterRepository.saveChapter(this.userId, chap);
            }
          }
        } catch (chapterSaveErr) {
          console.error('[MentorInterview] Chapter save FAILED:', chapterSaveErr);
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
}
