import { BaseActions } from './BaseActions';
import { TodayMission, SubjectId, StudySession, Chapter, Note } from '@/types/index';
import { CustomMissionRepository } from '@/repositories/customMissionRepository';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { UserRepository } from '@/repositories/userRepository';
import { StudySessionRepository } from '@/repositories/studySessionRepository';
import { NoteRepository } from '@/repositories/noteRepository';
import { normalizeChapter } from '@/utils/academicState';
import { calculateLevelFromXP } from '@/utils/levelingCalculations';
import { getCurrentSessionTimeSlot, formatTimeSlotDisplay } from '@/utils/timeSlotUtils';
import { toLocalDateString } from '@/utils/dateUtils';

export class MissionActions extends BaseActions {
  async completeTask(
    taskId: string,
    durationSecs?: number,
    metrics?: {
      questions?: number;
      correct?: number;
      confidence?: number;
      focusScore?: number;
      idleTime?: number;
      focusInterruptions?: number;
    }
  ) {
    this.checkWriteBlock();

    // Save snapshot of original state for rollback
    const originalStateSnapshot = {
      todayMissions: this.state.todayMissions,
      customMissions: this.state.customMissions,
      completedPlannerMissionIds: this.state.completedPlannerMissionIds,
      xp: this.state.xp,
      chapters: this.state.chapters,
      studySessions: this.state.studySessions,
      analytics: this.state.analytics
    };

    const missionIndex = this.state.todayMissions.findIndex(m => m.id === taskId);
    if (missionIndex === -1) return;

    const mission = this.state.todayMissions[missionIndex];
    const isCompleting = !mission.completed;

    const updatedMissions = [...this.state.todayMissions];
    const updatedMission: TodayMission = {
      ...mission,
      completed: isCompleting,
      unlocked: true
    };

    // Adjust the scheduled time to match reality when completing (using standardized time slot calculation)
    let studySessionDuration = 0;

    if (isCompleting) {
      // Save original values so we can restore them if un-completed
      updatedMission.originalDuration = mission.duration;
      updatedMission.originalTimeSlot = mission.timeSlot;

      let durationMins = 0;
      if (durationSecs !== undefined && durationSecs > 0) {
        // Completed via cockpit timer
        durationMins = Math.ceil(durationSecs / 60);
        studySessionDuration = durationMins;
      } else {
        // Completed instantly via dashboard checkbox (offline completion)
        durationMins = 1;
        studySessionDuration = 0;
      }

      const timeSlot = getCurrentSessionTimeSlot(durationMins);
      updatedMission.scheduledTime = timeSlot.start;
      updatedMission.timeSlot = formatTimeSlotDisplay(timeSlot);
      updatedMission.duration = durationMins;

      updatedMission.linkedSessionId = null;
    } else {
      if (mission.originalDuration) {
        updatedMission.duration = mission.originalDuration;
        delete updatedMission.originalDuration;
      }
      delete updatedMission.originalTimeSlot;
    }

    updatedMissions[missionIndex] = updatedMission;

    if (isCompleting && mission.type !== 'Break') {
      const actualMinutes = durationSecs !== undefined ? Math.round(durationSecs / 60) : mission.duration;
      const breakDuration = actualMinutes >= 60 ? 10 : 5;
      const breakId = `break-after-${mission.id.replace(/^today-/, '')}`;
      const hasExistingBreak = updatedMissions.some(m => m.id === breakId || m.id === `break-${mission.id}`);

      if (!hasExistingBreak) {
        const localBreak: any = {
          id: breakId,
          subject: 'break',
          chapter: 'Rest',
          type: 'Break',
          taskName: `${breakDuration}m Break`,
          duration: breakDuration,
          timeSlot: mission.timeSlot,
          scheduledTime: mission.scheduledTime,
          completed: false,
          xp: 0,
          unlocked: true,
          isManualOverride: false
        };
        updatedMissions.splice(missionIndex + 1, 0, localBreak);
      }
    } else if (!isCompleting && mission.type !== 'Break') {
      const breakId = `break-after-${mission.id.replace(/^today-/, '')}`;
      const existingBreakIndex = updatedMissions.findIndex(m => m.id === breakId || m.id === `break-${mission.id}`);
      if (existingBreakIndex !== -1) {
        updatedMissions.splice(existingBreakIndex, 1);
      }
    }

    const updatedCustomMissions = [...this.state.customMissions];
    if (isCompleting) {
      let nextIdx = missionIndex + 1;
      while (nextIdx < updatedMissions.length) {
        updatedMissions[nextIdx] = {
          ...updatedMissions[nextIdx],
          unlocked: true
        };
        const customIdx = updatedCustomMissions.findIndex(cm => cm.id === updatedMissions[nextIdx].id);
        if (customIdx !== -1) {
          updatedCustomMissions[customIdx] = { ...updatedCustomMissions[customIdx], unlocked: true };
        }
        if (updatedMissions[nextIdx].type !== 'Break') break;
        nextIdx++;
      }
    }

    // Base mission XP: 50 (slower progression)
    const baseXp = 50;
    const gainedXp = mission.xp || baseXp;

    let deltaXp = 0;
    if (isCompleting) {
      const finalGainedXp = this.isGodModeActive() ? Math.floor(gainedXp * 1.5) : gainedXp;
      const previousPartialXp = mission.partialXpAwarded || 0;
      updatedMission.xpEarned = finalGainedXp;
      deltaXp = finalGainedXp - previousPartialXp;
      delete updatedMission.partialXpAwarded;
    } else {
      deltaXp = -( mission.xpEarned || (this.isGodModeActive() ? Math.floor(gainedXp * 1.5) : gainedXp) );
      updatedMission.xpEarned = 0;
    }

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

    const chapter = this.state.chapters.find(c =>
      (mission.chapterId && c.id === mission.chapterId) ||
      (mission.chapterName && c.name.toLowerCase() === mission.chapterName.toLowerCase()) ||
      c.name === mission.chapter ||
      c.id === mission.chapter ||
      c.name.toLowerCase() === (mission.chapter || '').toLowerCase()
    );

    let updatedChapters = this.state.chapters;
    if (chapter) {
      updatedChapters = this.state.chapters.map(c => {
        if (c.id === chapter.id) {
          const deltaQs = metrics?.questions ?? (mission.type === 'Solve PYQs' ? 15 : mission.type === 'Solve DPP' ? 10 : 5);
          const addedQs = isCompleting ? deltaQs : -deltaQs;
          const deltaConf = isCompleting ? 5 : -5;

          let theoryComplete = c.theoryComplete;
          let dppComplete = c.dppComplete;
          let pyqsComplete = c.pyqsComplete;
          let revisionCount = c.revisionCount || 0;
          let lastRevisionDaysAgo = c.lastRevisionDaysAgo;
          let currentLecture = c.currentLecture || 0;
          const totalLectures = c.totalLectures || 12;

          let statusUpdate: Chapter['status'] | undefined = undefined;

          if (isCompleting) {
            if (mission.type === 'Watch Lecture') {
              currentLecture = Math.min(totalLectures, currentLecture + 1);
              theoryComplete = currentLecture >= totalLectures;
            }
            if (mission.type === 'Solve DPP') dppComplete = true;
            if (mission.type === 'Solve PYQs') pyqsComplete = true;
            if (mission.type === 'Revise Formulas' || mission.type === 'Review Mistakes') {
              revisionCount += 1;
              lastRevisionDaysAgo = 0;
              statusUpdate = 'Learning';
            }
          } else {
            if (mission.type === 'Watch Lecture') {
              currentLecture = Math.max(0, currentLecture - 1);
              theoryComplete = false;
            }
            if (mission.type === 'Solve DPP') dppComplete = false;
            if (mission.type === 'Solve PYQs') pyqsComplete = false;
          }

          const updatedLectureProgress = c.lectureProgress
            ? {
                ...c.lectureProgress,
                completedLectures: currentLecture,
                totalLectures,
              }
            : { completedLectures: currentLecture, totalLectures, avgLectureDurationMinutes: 60 };

          const updatedPracticeProgress = c.practiceProgress
            ? {
                ...c.practiceProgress,
                dppCompleted: dppComplete ? true : c.practiceProgress.dppCompleted,
                dppPercent: dppComplete ? 100 : c.practiceProgress.dppPercent,
                pyqsCompleted: pyqsComplete ? true : c.practiceProgress.pyqsCompleted,
                pyqPercent: pyqsComplete ? 100 : c.practiceProgress.pyqPercent,
              }
            : {
                dppCompleted: dppComplete || false,
                dppPercent: dppComplete ? 100 : 0,
                pyqsCompleted: pyqsComplete || false,
                pyqPercent: pyqsComplete ? 100 : 0,
                moduleCompleted: false,
                accuracyPercent: 0,
                confidencePercent: 0
              };

          const updatedChap: Chapter = {
            ...c,
            ...(statusUpdate ? { status: statusUpdate } : {}),
            currentLecture,
            lectureProgress: updatedLectureProgress,
            practiceProgress: updatedPracticeProgress,
            theoryComplete,
            dppComplete,
            pyqsComplete,
            revisionCount,
            lastRevisionDaysAgo,
            solvedQuestions: Math.max(0, (c.solvedQuestions || 0) + addedQs),
            confidence: Math.min(100, Math.max(0, (c.confidence || 0) + deltaConf))
          };
          return normalizeChapter(updatedChap);
        }
        return c;
      });
    }

    try {
      const userProfileUpdates: any = { xp: newXp };
      const savePromises: Promise<any>[] = [];

      if (chapter) {
        const updatedChap = updatedChapters.find(c => c.id === chapter.id);
        if (updatedChap) {
          savePromises.push(this.safeDbCall(() => ChapterRepository.saveChapter(this.userId, updatedChap), 'saveChapter'));
        }
      }

      const isCustom = this.state.customMissions.some(cm => cm.id === taskId);
      const updatedCustomMission = updatedMissions[missionIndex];

      let updatedCompletedPlannerMissionIds = this.state.completedPlannerMissionIds || [];
      if (isCustom) {
        savePromises.push(this.safeDbCall(() => CustomMissionRepository.saveMission(this.userId, updatedCustomMission), 'saveMission'));
        const cIdx = updatedCustomMissions.findIndex(cm => cm.id === taskId);
        if (cIdx !== -1) updatedCustomMissions[cIdx] = updatedCustomMission;
      } else {
        if (isCompleting) {
          updatedCompletedPlannerMissionIds = Array.from(new Set([...updatedCompletedPlannerMissionIds, taskId])).slice(-1000);
        } else {
          updatedCompletedPlannerMissionIds = updatedCompletedPlannerMissionIds.filter((id: string) => id !== taskId);
        }
        userProfileUpdates.completedPlannerMissionIds = updatedCompletedPlannerMissionIds;
      }

      const levelUpData = oldLevel !== newLevel && isCompleting ? { oldLevel, newLevel, xp: newXp } : null;

      let updatedStudySessions = this.state.studySessions;
      let finalAnalytics = this.state.analytics;

      if (isCompleting && mission.type !== 'Break') {
        if (studySessionDuration > 0) {
          const sessionId = `session-${Date.now()}`;
          updatedMission.linkedSessionId = sessionId;
          const endTime = new Date();
          const startTime = new Date(endTime.getTime() - studySessionDuration * 60000);
          const sessionPayload: StudySession = {
            id: sessionId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: studySessionDuration,
            type: mission.type === 'Solve Mock' ? 'Mock' : (mission.type === 'Solve DPP' || mission.type === 'Solve PYQs' ? 'Practice' : (mission.type === 'Revise Formulas' || mission.type === 'Review Mistakes' ? 'Revision' : 'Lecture')),
            subjectId: mission.subject as SubjectId,
            chapterId: chapter?.id,
            xpEarned: deltaXp,
            questionsSolved: metrics?.questions,
            accuracy: metrics?.questions && metrics?.correct !== undefined ? Math.round((metrics.correct / metrics.questions) * 100) : undefined,
            focusScore: metrics?.focusScore,
            idleTime: metrics?.idleTime,
            focusInterruptions: metrics?.focusInterruptions
          };
          savePromises.push(this.safeDbCall(() => StudySessionRepository.saveStudySession(this.userId, sessionPayload), 'saveStudySession'));
          updatedStudySessions = [sessionPayload, ...this.state.studySessions];
        }

        const questionsAttempted = metrics?.questions || 0;
        const questionsCorrect = metrics?.correct || 0;
        const accuracy = questionsAttempted > 0 ? Math.round((questionsCorrect / questionsAttempted) * 100) : 0;
        const oldTotal = this.state.analytics.questionsSolved || 0;
        const newTotal = oldTotal + questionsAttempted;

        const updatedAnalytics = {
          ...this.state.analytics,
          studyTime: (this.state.analytics.studyTime || 0) + studySessionDuration,
          focusTime: (this.state.analytics.focusTime || 0) + studySessionDuration,
          questionsSolved: newTotal,
          accuracy: newTotal > 0 && questionsAttempted > 0
            ? Math.round(((this.state.analytics.accuracy || 0) * oldTotal + accuracy * questionsAttempted) / newTotal)
            : (this.state.analytics.accuracy || 0),
          tasksCompleted: (this.state.analytics.tasksCompleted || 0) + 1,
          xpEarned: (this.state.analytics.xpEarned || 0) + deltaXp
        };
        userProfileUpdates.analytics = updatedAnalytics;
        finalAnalytics = updatedAnalytics;
      } else if (!isCompleting && mission.linkedSessionId) {
        savePromises.push(this.safeDbCall(() => StudySessionRepository.deleteStudySession(this.userId, mission.linkedSessionId), 'deleteStudySession'));
        updatedStudySessions = this.state.studySessions.filter(s => s.id !== mission.linkedSessionId);
        updatedMission.linkedSessionId = undefined;
      }

      savePromises.push(this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, userProfileUpdates), 'updateUserProfile'));

      this.runtime.updateStateOptimistic({
        todayMissions: updatedMissions,
        customMissions: updatedCustomMissions,
        completedPlannerMissionIds: updatedCompletedPlannerMissionIds,
        xp: newXp,
        chapters: updatedChapters,
        studySessions: updatedStudySessions,
        analytics: finalAnalytics
      });

      try {
        await Promise.all(savePromises);
      } catch (err) {
        this.runtime.updateStateOptimistic({
          todayMissions: originalStateSnapshot.todayMissions,
          customMissions: originalStateSnapshot.customMissions,
          completedPlannerMissionIds: originalStateSnapshot.completedPlannerMissionIds,
          xp: originalStateSnapshot.xp,
          chapters: originalStateSnapshot.chapters,
          studySessions: originalStateSnapshot.studySessions,
          analytics: originalStateSnapshot.analytics
        });
        throw err;
      }

      await new Promise(resolve => setTimeout(resolve, 350));

      await this.runtime.refresh('SESSION_UPDATE', {
        lastSyncError: null,
        levelUpData
      });

      if (isCompleting) {
        this.triggerToast('Mission Accomplished', `${mission.taskName} finished successfully!`, 'success');
      }
    } catch (err) {
      await this.handleWriteError(err, 'completeTask');
    }
  }

  async deleteMission(taskId: string) {
    this.checkWriteBlock();
    const updatedDeletedMissionIds = Array.from(new Set([...(this.state.deletedMissionIds || []), taskId]));

    const isCustom = this.state.customMissions.some(cm => cm.id === taskId);

    const updatedCustomMissions = isCustom
      ? this.state.customMissions.filter(m => m.id !== taskId)
      : this.state.customMissions;

    const updatedTodayMissions = this.state.todayMissions.filter(m => m.id !== taskId);

    const originalSnapshot = {
      todayMissions: this.state.todayMissions,
      customMissions: this.state.customMissions,
      deletedMissionIds: this.state.deletedMissionIds
    };

    this.runtime.updateStateOptimistic({
      todayMissions: updatedTodayMissions,
      customMissions: updatedCustomMissions,
      deletedMissionIds: updatedDeletedMissionIds
    });

    try {
      if (isCustom) {
        await CustomMissionRepository.deleteMission(this.userId, taskId);
      }
      await UserRepository.updateUserProfile(this.userId, { deletedMissionIds: updatedDeletedMissionIds });
      await this.runtime.refresh('SESSION_UPDATE', {
        todayMissions: updatedTodayMissions,
        customMissions: updatedCustomMissions,
        deletedMissionIds: updatedDeletedMissionIds,
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'deleteMission');
    }
  }

  async addCustomMission(missionData: Omit<TodayMission, 'id' | 'completed' | 'unlocked'>) {
    this.checkWriteBlock();
    const newMission: TodayMission = {
      ...missionData,
      id: `user-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      completed: false,
      unlocked: true,
      xp: missionData.xp || Math.round((missionData.duration || 60) * 0.5),
      priorityScore: 1.0,
      selectionReason: "Manually added by student",
      isManualOverride: true,
      timeSlot: 'Manual (Ad Hoc)'
    };

    const updatedMissions = [...this.state.todayMissions, newMission];
    const updatedCustomMissions = [...this.state.customMissions, newMission];

    const originalSnapshot = {
      todayMissions: this.state.todayMissions,
      customMissions: this.state.customMissions
    };

    this.runtime.updateStateOptimistic({
      todayMissions: updatedMissions,
      customMissions: updatedCustomMissions
    });

    try {
      await CustomMissionRepository.saveMission(this.userId, newMission);
      await this.runtime.refresh('SESSION_UPDATE', { 
        todayMissions: updatedMissions,
        customMissions: updatedCustomMissions,
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.rollbackMission(newMission.id, null);
      this.runtime.updateStateOptimistic({
        customMissions: this.state.customMissions.filter(m => m.id !== newMission.id)
      });
      await this.handleWriteError(err, 'addCustomMission');
    }
  }

  async addAiMission(missionData: Omit<TodayMission, 'id' | 'completed' | 'unlocked'>) {
    this.checkWriteBlock();
    const newMission: TodayMission = {
      ...missionData,
      id: `mission-ai-${Date.now()}`,
      completed: false,
      unlocked: true,
      xp: missionData.xp || Math.round((missionData.duration || 60) * 0.5),
      priorityScore: 1.0,
      selectionReason: "Generated by AI Coach"
    };

    const updatedMissions = [...this.state.todayMissions, newMission];
    const updatedCustomMissions = [...this.state.customMissions, newMission];

    this.runtime.updateStateOptimistic({
      todayMissions: updatedMissions,
      customMissions: updatedCustomMissions
    });

    try {
      await CustomMissionRepository.saveMission(this.userId, newMission);
      await this.runtime.refresh('SESSION_UPDATE', { 
        todayMissions: updatedMissions,
        customMissions: updatedCustomMissions,
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.rollbackMission(newMission.id, null);
      this.runtime.updateStateOptimistic({
        customMissions: this.state.customMissions.filter(m => m.id !== newMission.id)
      });
      await this.handleWriteError(err, 'addAiMission');
    }
  }

  async updateMissionDetails(taskId: string, updates: Partial<TodayMission>) {
    this.checkWriteBlock();
    
    const missionIndex = this.state.todayMissions.findIndex(m => m.id === taskId);
    if (missionIndex === -1) return;

    const mission = this.state.todayMissions[missionIndex];
    const updatedMission = { 
      ...mission, 
      ...updates, 
      xp: updates.duration ? Math.round(updates.duration * 0.5) : mission.xp
    };
    
    const updatedMissions = [...this.state.todayMissions];
    updatedMissions[missionIndex] = updatedMission;
    
    const isCustom = this.state.customMissions.some(cm => cm.id === taskId);
    const updatedCustomMissions = isCustom
      ? this.state.customMissions.map(cm => cm.id === taskId ? updatedMission : cm)
      : this.state.customMissions;

    const originalSnapshot = {
      todayMissions: this.state.todayMissions,
      customMissions: this.state.customMissions
    };

    this.runtime.updateStateOptimistic({
      todayMissions: updatedMissions,
      customMissions: updatedCustomMissions
    });
    
    try {
      if (isCustom) {
        await CustomMissionRepository.saveMission(this.userId, updatedMission);
      }
      
      await this.runtime.refresh('SESSION_UPDATE', {
        todayMissions: updatedMissions,
        customMissions: updatedCustomMissions,
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'updateMissionDetails');
    }
  }

  async skipTask(taskId: string) {
    this.checkWriteBlock();
    const missionIndex = this.state.todayMissions.findIndex(m => m.id === taskId);
    if (missionIndex === -1) return;

    const updatedMissions = [...this.state.todayMissions];
    updatedMissions[missionIndex] = {
      ...updatedMissions[missionIndex],
      dismissed: true
    };

    if (missionIndex + 1 < updatedMissions.length) {
      updatedMissions[missionIndex + 1] = {
        ...updatedMissions[missionIndex + 1],
        unlocked: true
      };
    }

    const skippedMission = updatedMissions[missionIndex];
    const isCustomOrPrefixed = skippedMission.id.startsWith('mission-') || skippedMission.id.includes('custom');
    const updatedDismissedPlannerMissionIds = !isCustomOrPrefixed
      ? Array.from(new Set([...(this.state.dismissedPlannerMissionIds || []), taskId])).slice(-1000)
      : this.state.dismissedPlannerMissionIds;

    const originalSnapshot = {
      todayMissions: this.state.todayMissions,
      dismissedPlannerMissionIds: this.state.dismissedPlannerMissionIds
    };

    this.runtime.updateStateOptimistic({
      todayMissions: updatedMissions,
      ...(!isCustomOrPrefixed ? { dismissedPlannerMissionIds: updatedDismissedPlannerMissionIds } : {})
    });

    try {
      const savePromises = [];

      if (isCustomOrPrefixed) {
        savePromises.push(this.safeDbCall(() => CustomMissionRepository.saveMission(this.userId, skippedMission), 'saveMission'));
      } else {
        savePromises.push(this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, { dismissedPlannerMissionIds: updatedDismissedPlannerMissionIds }), 'updateUserProfile'));
      }

      await Promise.all(savePromises);
      await this.runtime.refresh('SESSION_UPDATE', { 
        todayMissions: updatedMissions,
        ...(!isCustomOrPrefixed ? { dismissedPlannerMissionIds: updatedDismissedPlannerMissionIds } : {}),
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'skipTask');
    }
  }

  async addTodayMission(mission: TodayMission) {
    const missionWithOverrides: TodayMission = {
      ...mission,
      unlocked: true,
      isManualOverride: true,
      scheduledDate: mission.scheduledDate || toLocalDateString()
    };
    const updatedToday = [...(this.state.todayMissions || []).filter(m => m.id !== mission.id), missionWithOverrides];
    const updatedCustom = [...(this.state.customMissions || []).filter(m => m.id !== mission.id), missionWithOverrides];

    const originalSnapshot = {
      todayMissions: this.state.todayMissions,
      customMissions: this.state.customMissions
    };

    this.runtime.updateStateOptimistic({
      todayMissions: updatedToday,
      customMissions: updatedCustom
    });

    try {
      await this.safeDbCall(
        () => CustomMissionRepository.saveMission(this.userId, missionWithOverrides),
        'addTodayMission'
      );
      await this.runtime.refresh('SESSION_UPDATE', {
        todayMissions: updatedToday,
        customMissions: updatedCustom,
        lastSyncError: null
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'addTodayMission');
    }
  }

  async clearTodayMissions() {
    this.runtime.updateStateOptimistic({ todayMissions: [] });
    await this.runtime.refresh('SESSION_UPDATE', { todayMissions: [] });
  }

  async rebalancePlan() {
    this.checkWriteBlock();

    const emptyOverrides = {};

    const now = new Date();
    const currentDayIndex = (now.getDay() + 6) % 7;

    // Filter out synthetic auto-generated breaks before rebalancing.
    // generateWeeklyMatrix will freshly regenerate and interleave breaks between sessions.
    const nonAutoBreakMissions = (this.state.todayMissions || []).filter(m => 
      !(m.subject === 'break' && (m.id.startsWith('break-') || m.id.startsWith('today-break-')) && !m.isManualOverride)
    );
    
    const extractLecNum = (name: string): number => {
      const match = (name || '').match(/Lecture\s+(\d+)/i);
      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    };

    const sortedMissions = [...nonAutoBreakMissions].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? -1 : 1;
      if (a.dismissed !== b.dismissed) return a.dismissed ? 1 : -1;
      if (a.isManualOverride && !b.isManualOverride) return -1;
      if (!a.isManualOverride && b.isManualOverride) return 1;

      const sameChapter = (a.chapter || '').toLowerCase() === (b.chapter || '').toLowerCase();
      const aIsLec = (a.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(a.taskName || ''));
      const bIsLec = (b.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(b.taskName || ''));
      if (sameChapter && aIsLec && bIsLec) {
        const diff = extractLecNum(a.taskName) - extractLecNum(b.taskName);
        if (diff !== 0) return diff;
      }

      const prioDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
      if (prioDiff !== 0) return prioDiff;

      return (a.id || '').localeCompare(b.id || '');
    });

    const cleanedMissions = sortedMissions.map(m => {
      if (!m.completed && !m.isManualOverride) {
        return {
          ...m,
          timeSlot: undefined,
          isManualOverride: false
        };
      }
      return m;
    });

    const { generateWeeklyMatrix } = await import('@jee-os/engines');
    const rawQuota = this.state.settings?.dailyQuota || this.state.mentorProfile?.dailyAvailableHours || 4.5;
    const baseDailyHours = (rawQuota > 14) ? 4.5 : Math.max(2.0, rawQuota);
    const energyMultiplier = this.state.energyLevel === 'Low' ? 0.5 : this.state.energyLevel === 'Medium' ? 1.0 : 1.25;
    const totalDailyQuotaHours = Math.round(baseDailyHours * energyMultiplier * 10) / 10;

    const matrixSettings = {
      ...(this.state.settings || {}),
      energyLevel: this.state.energyLevel,
      effectiveDailyStudyHours: totalDailyQuotaHours,
      dailyCapHours: totalDailyQuotaHours
    };
    const updatedWeekly = generateWeeklyMatrix(
      this.state.mentorProfile?.subjectSplitStrategy || '3_a_day',
      this.state.chapters,
      cleanedMissions,
      null,
      currentDayIndex,
      this.state.mentorProfile?.twoDaySplitConfig,
      this.state.deletedMissionIds || [],
      emptyOverrides,
      this.state.settings?.dayStartTime || "07:00",
      this.state.settings?.dayEndTime || "22:30",
      matrixSettings
    );

    const currentDayBlocks = updatedWeekly.filter(b => b.dayIndex === currentDayIndex);
    
    let updatedTodayMissions;
    if (updatedWeekly.length === 0 && cleanedMissions.length > 0) {
      updatedTodayMissions = cleanedMissions;
    } else {
      updatedTodayMissions = currentDayBlocks.map(b => {
        const originalId = b.id.startsWith('today-') ? b.id.slice(6) : b.id;
        const original = cleanedMissions.find(m => m.id === originalId);
        return {
          id: originalId,
          subject: b.subject,
          chapter: b.chapterName,
          chapterId: b.chapterId,
          type: b.taskType,
          taskName: b.activity,
          duration: b.durationMinutes,
          timeSlot: b.timeSlot,
          completed: original ? original.completed : b.completed,
          xp: original ? original.xp : Math.round(b.priorityScore),
          unlocked: true,
          priorityScore: b.priorityScore,
          reasoning: b.reasoning,
          dismissed: original?.dismissed ?? false,
          isManualOverride: false,
          scheduledDate: b.scheduledDate,
          scheduledTime: b.scheduledTime
        };
      });
    }

    const originalSnapshot = {
      scheduleOverrides: this.state.scheduleOverrides,
      todayMissions: this.state.todayMissions,
      weeklySchedule: this.state.weeklySchedule
    };

    this.runtime.updateStateOptimistic({
      scheduleOverrides: emptyOverrides,
      todayMissions: updatedTodayMissions,
      weeklySchedule: updatedWeekly
    });

    try {
      await this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, { scheduleOverrides: emptyOverrides }), 'updateUserProfile');
      await this.runtime.refresh('INIT', {
        scheduleOverrides: emptyOverrides,
        todayMissions: updatedTodayMissions,
        weeklySchedule: updatedWeekly
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'rebalancePlan');
    }
  }

  async resetCustomMissions() {
    this.checkWriteBlock();
    const originalSnapshot = {
      todayMissions: this.state.todayMissions
    };
    this.runtime.updateStateOptimistic({ todayMissions: [] });
    try {
      await this.runtime.refresh('INIT', { todayMissions: [] });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'resetCustomMissions');
    }
  }

  async addNote(noteData: Omit<Note, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) {
    this.checkWriteBlock();
    const id = noteData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    const timestamp = noteData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newNote: Note = {
      ...noteData,
      id,
      timestamp,
      category: noteData.category || 'Quick Notes',
      subject: noteData.subject,
      chapter: noteData.chapter,
      chapterId: noteData.chapterId,
      tags: noteData.tags || []
    };

    const originalSnapshot = {
      notes: this.state.notes
    };

    const updatedNotes = [newNote, ...this.state.notes];
    this.runtime.updateStateOptimistic({ notes: updatedNotes });

    try {
      if (!this.isGuestUser()) {
        await NoteRepository.saveNote(this.userId, newNote);
      }
      await this.runtime.refresh('SESSION_UPDATE', { notes: updatedNotes, lastSyncError: null });
      return newNote;
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'addNote');
    }
  }

  async addProofOfWorkNote(params: {
    text: string;
    subject: SubjectId;
    chapter: string;
    chapterId?: string;
    missionId?: string;
    xpWager?: number;
  }) {
    const note = await this.addNote({
      text: params.text,
      category: 'Proof of Work',
      subject: params.subject,
      chapter: params.chapter,
      chapterId: params.chapterId,
      tags: ['ProofOfWork', 'Casino', params.subject]
    });

    const rewardText = params.xpWager ? ` (${Math.round(params.xpWager * 2.5)} XP Payout Verified)` : '';
    this.triggerToast('Proof of Work Saved', `Reflection saved to Cockpit Memory Deck${rewardText}`, 'success');
    return note;
  }

  async deleteNote(noteId: string) {
    this.checkWriteBlock();
    const originalSnapshot = {
      notes: this.state.notes
    };

    const updatedNotes = this.state.notes.filter(n => n.id !== noteId);
    this.runtime.updateStateOptimistic({ notes: updatedNotes });

    try {
      if (!this.isGuestUser()) {
        await NoteRepository.deleteNote(this.userId, noteId);
      }
      await this.runtime.refresh('SESSION_UPDATE', { notes: updatedNotes, lastSyncError: null });
      this.triggerToast('Note Deleted', 'Note removed from session memory deck', 'info');
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'deleteNote');
    }
  }
}
