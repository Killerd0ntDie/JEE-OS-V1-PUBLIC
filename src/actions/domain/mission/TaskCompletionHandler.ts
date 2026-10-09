import { BaseActions } from '../BaseActions';
import { TodayMission, SubjectId, StudySession, Chapter, Mistake } from '@/types/index';
import { CustomMissionRepository } from '@/repositories/customMissionRepository';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { UserRepository } from '@/repositories/userRepository';
import { StudySessionRepository } from '@/repositories/studySessionRepository';
import { MistakeRepository } from '@/repositories/mistakeRepository';
import { normalizeChapter, SpacedRepetitionEngine } from '@jee-os/engines';
import { calculateLevelFromXP } from '@/utils/levelingCalculations';
import { getCurrentSessionTimeSlot, formatTimeSlotDisplay } from '@/utils/timeSlotUtils';

export interface TaskCompletionMetrics {
  questions?: number;
  correct?: number;
  confidence?: number;
  focusScore?: number;
  idleTime?: number;
  focusInterruptions?: number;
}

/**
 * Encapsulates the complex task completion pipeline:
 * - Time slot & duration reconciliation
 * - Interleaved break generation & removal
 * - Sequential task unlock cascading
 * - XP award, leveling, and streak progression
 * - Chapter academic telemetry synchronization (lectures, DPP, PYQ, revision)
 * - Study session recording & global analytics updates
 * - Full transactional snapshot and rollback protection
 */
export class TaskCompletionHandler extends BaseActions {
  private sm2Engine = new SpacedRepetitionEngine();

  async completeTask(
    taskId: string,
    durationSecs?: number,
    metrics?: TaskCompletionMetrics
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
      analytics: this.state.analytics,
      mistakes: this.state.mistakes
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
          let sm2EaseFactor = c.sm2EaseFactor ?? 2.5;
          let sm2Interval = c.sm2Interval ?? 0;
          let nextRevisionDueAt = c.nextRevisionDueAt;
          let lastRevisedAt = c.lastRevisedAt;
          let revisionProgress = c.revisionProgress;
          let flashcardStates = c.flashcardStates;

          let statusUpdate: Chapter['status'] | undefined ;

          if (isCompleting) {
            if (mission.type === 'Watch Lecture') {
              currentLecture = Math.min(totalLectures, currentLecture + 1);
              theoryComplete = currentLecture >= totalLectures;
            }
            if (mission.type === 'Solve DPP') dppComplete = true;
            if (mission.type === 'Solve PYQs') pyqsComplete = true;
            if (mission.type === 'Revise Formulas' || mission.type === 'Review Mistakes') {
              let quality = 4;
              if (metrics?.confidence !== undefined) {
                if (metrics.confidence >= 80) quality = 5;
                else if (metrics.confidence >= 50) quality = 3;
                else quality = 2;
              }
              const sm2Result = this.sm2Engine.calculateNextReview(quality, {
                repetitions: c.revisionCount || 0,
                easeFactor: c.sm2EaseFactor ?? 2.5,
                interval: c.sm2Interval ?? 0,
              });

              revisionCount = sm2Result.repetitions;
              lastRevisionDaysAgo = 0;
              sm2EaseFactor = sm2Result.easeFactor;
              sm2Interval = sm2Result.interval;
              nextRevisionDueAt = sm2Result.nextReviewDate;
              const nowIso = new Date().toISOString();
              lastRevisedAt = nowIso;

              const confLabel: 'High' | 'Medium' | 'Low' =
                quality >= 4 ? 'High' : quality >= 3 ? 'Medium' : 'Low';

              revisionProgress = {
                formulaMemoryPercent: quality >= 4 ? 95 : quality >= 3 ? 70 : 40,
                questionSolvingConfidencePercent: c.revisionProgress?.questionSolvingConfidencePercent || 80,
                needRevision: quality < 3,
                retentionScore: quality >= 4 ? 100 : quality >= 3 ? 70 : 40,
                ...(c.revisionProgress || {}),
                lastRevisedDaysAgo: 0,
                retentionConfidence: confLabel,
                lastRevisedAt: nowIso
              };

              if (c.flashcardStates) {
                const updatedCards = { ...c.flashcardStates };
                for (const cardId of Object.keys(updatedCards)) {
                  const card = updatedCards[cardId];
                  const cardSm2 = this.sm2Engine.calculateNextReview(quality, {
                    repetitions: card.repetitions || 0,
                    easeFactor: card.easeFactor || 2.5,
                    interval: card.interval || 0
                  });
                  updatedCards[cardId] = {
                    repetitions: cardSm2.repetitions,
                    easeFactor: cardSm2.easeFactor,
                    interval: cardSm2.interval,
                    nextReviewDate: cardSm2.nextReviewDate,
                    lastReviewDate: nowIso
                  };
                }
                flashcardStates = updatedCards;
              }

              if (c.status === 'Revision Due') {
                statusUpdate = c.theoryComplete ? 'Theory Complete' : 'Learning';
              } else {
                statusUpdate = c.status;
              }
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
            sm2EaseFactor,
            sm2Interval,
            nextRevisionDueAt,
            lastRevisedAt,
            revisionProgress,
            flashcardStates,
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

      let updatedMistakes = this.state.mistakes;
      if (isCompleting && mission.type === 'Review Mistakes' && chapter) {
        const chapterNameLower = chapter.name.toLowerCase();
        const mistakesToUpdate: Mistake[] = [];
        updatedMistakes = this.state.mistakes.map(m => {
          const isChap = (m.chapterId && m.chapterId === chapter.id) ||
                         (m.chapter && m.chapter.toLowerCase() === chapterNameLower);
          if (isChap && m.revisionStatus !== 'Mastered') {
            const updatedM: Mistake = {
              ...m,
              revisionStatus: 'Reviewed',
              confidence: Math.min(100, (m.confidence || 50) + 15)
            };
            mistakesToUpdate.push(updatedM);
            return updatedM;
          }
          return m;
        });

        if (mistakesToUpdate.length > 0) {
          savePromises.push(this.safeDbCall(() => MistakeRepository.saveMistakesBatch(this.userId, mistakesToUpdate), 'saveMistakesBatch'));
        }
      }

      if (isCompleting && mission.type !== 'Break') {
        const isRevisionMission = mission.type === 'Revise Formulas' || mission.type === 'Review Mistakes';
        const effectiveStudyDuration = studySessionDuration > 0 ? studySessionDuration : (isRevisionMission ? (mission.duration || 15) : 0);

        if (effectiveStudyDuration > 0) {
          const sessionId = `session-${Date.now()}`;
          updatedMission.linkedSessionId = sessionId;
          const endTime = new Date();
          const startTime = new Date(endTime.getTime() - effectiveStudyDuration * 60000);
          const sessionPayload: StudySession = {
            id: sessionId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: effectiveStudyDuration,
            type: mission.type === 'Solve Mock' ? 'Mock' : (mission.type === 'Solve DPP' || mission.type === 'Solve PYQs' ? 'Practice' : (isRevisionMission ? 'Revision' : 'Lecture')),
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
        analytics: finalAnalytics,
        mistakes: updatedMistakes
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
          analytics: originalStateSnapshot.analytics,
          mistakes: originalStateSnapshot.mistakes
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
}
