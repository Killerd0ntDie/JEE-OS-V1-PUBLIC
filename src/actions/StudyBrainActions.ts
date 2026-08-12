import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { MistakeRepository } from '@/repositories/mistakeRepository';
import { StudySessionRepository } from '@/repositories/studySessionRepository';
import { TimelineRepository } from '@/repositories/timelineRepository';
import { UserRepository } from '@/repositories/userRepository';
import { MockResultRepository } from '@/repositories/mockResultRepository';
import { MockTestRepository } from '@/repositories/mockTestRepository';
import { CustomMissionRepository } from '@/repositories/customMissionRepository';
import { TodayMission, SubjectId, TimelineBlock, Mistake, Chapter, StudySession, MentorProfile, PlannerOutputs, DailyCheckin, WeeklyCheckin, MonthlyObjective, MockResult } from '@/types/index';
import { MockTest } from '@/types/mockTest';
import { normalizeChapter } from '@/utils/academicState';
import { calculateLevelFromXP } from '@/utils/levelingCalculations';
import { getCurrentSessionTimeSlot, formatTimeSlotDisplay, parseTimeSlotToRange } from '@/utils/timeSlotUtils';
import { toLocalDateString } from '@/utils/dateUtils';
import { calculateMockScorePercent } from '@/utils/mockScoring';
import { collection, getDocs, writeBatch, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { 
  XPLevelConfig,
  XPState,
  getLocalDateKey
} from '@jee-os/engines';

export class StudyBrainActions {
  private runtime: StudyBrainRuntime;
  private userId: string;

  constructor(runtime: StudyBrainRuntime, userId: string) {
    this.runtime = runtime;
    this.userId = userId;
  }

  private get state() {
    return this.runtime.getState();
  }

  private checkWriteBlock() {
    if (this.state.writeBlocked) {
      const errMsg = "Write operations are blocked due to a failed or corrupt database initialization.";
      console.error(errMsg);
      throw new Error(errMsg);
    }
  }

  private async handleWriteError(err: any, actionName: string): Promise<never> {
    const errorMsg = `Sync Error (${actionName}): ${err?.message || 'Database write failed'}`;
    console.error(errorMsg, err);
    this.triggerToast('Sync Error', errorMsg, 'error');
    await this.runtime.refresh('SETTINGS_UPDATE', { lastSyncError: errorMsg });
    throw new Error(errorMsg);
  }

  private async safeDbCall<T>(operation: () => Promise<T>, actionName: string): Promise<T | void> {
    try {
      return await operation();
    } catch (err: any) {
      await this.handleWriteError(err, actionName);
    }
  }

  private triggerToast(title: string, message?: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('global-toast', {
        detail: { title, message, type }
      }));
    }
  }

  /**
   * Returns a copy of the current XP state with daily/weekly counters
   * reset to 0 if the calendar day or ISO week has changed since lastActiveDate.
   */
  private getResetXpBase() {
    const xp = { ...this.state.xp };
    const today = toLocalDateString();
    const lastActive = xp.lastActiveDate;

    if (lastActive && lastActive !== today) {
      // New day → reset daily
      xp.daily = 0;

      // New ISO week → reset weekly
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
      
      // New month → reset monthly
      if (lastActive.substring(0, 7) !== today.substring(0, 7)) {
        xp.monthly = 0;
      }
    }
    
    // Ensure monthly is initialized if it's undefined
    if (xp.monthly === undefined) {
      xp.monthly = 0;
    }
    
    return xp;
  }

  private isGodModeActive(): boolean {
    return (this.state.xp?.streak || 0) >= 7 && (this.state.settings?.enableGodMode !== false);
  }

  private evaluateAndUpdateStreak(xp: any, updatedSessions: StudySession[]) {
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

  async clearSyncError() {
    await this.runtime.refresh('SETTINGS_UPDATE', { lastSyncError: null });
  }

  async setActiveSubject(subject: SubjectId | 'all') {
    this.checkWriteBlock();
    // Optimistic Update
    await this.runtime.refresh('SETTINGS_UPDATE', { activeSubject: subject, lastSyncError: null });
    try {
      await UserRepository.updateUserProfile(this.userId, { activeSubject: subject });
    } catch (err) {
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
    // Optimistic Update
    await this.runtime.refresh('INIT', { energyLevel: level, plannerOutput: null, todayMissions: [], lastSyncError: null });
    try {
      await UserRepository.updateUserProfile(this.userId, { energyLevel: level });
    } catch (err) {
      await this.handleWriteError(err, 'setEnergyLevel');
    }
  }

  async setMissionModeActive(active: boolean) {
    this.checkWriteBlock();
    // Optimistic Update
    await this.runtime.refresh('SETTINGS_UPDATE', { isMissionModeActive: active, lastSyncError: null });
    try {
      await UserRepository.updateUserProfile(this.userId, { isMissionModeActive: active });
    } catch (err) {
      await this.handleWriteError(err, 'setMissionModeActive');
    }
  }

  async completeTask(taskId: string, durationSecs?: number) {
    this.checkWriteBlock();
    const missionIndex = this.state.todayMissions.findIndex(m => m.id === taskId);
    if (missionIndex === -1) return;

    const mission = this.state.todayMissions[missionIndex];
    const isCompleting = !mission.completed;

    const updatedMissions = [...this.state.todayMissions];
    const updatedMission: any = {
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
        // Shrink visual block to 1 minute to avoid massive fake calendar blocks
        durationMins = 1;
        // But give full credit for velocity calculations (amount of chapter completed)
        studySessionDuration = mission.duration || 60;
      }
      
      const timeSlot = getCurrentSessionTimeSlot(durationMins);
      updatedMission.scheduledTime = timeSlot.start;
      updatedMission.timeSlot = formatTimeSlotDisplay(timeSlot);
      updatedMission.duration = durationMins;
      
      // We will link the generated session ID once created
      updatedMission.linkedSessionId = null; 
    } else {
      // Un-completing: restore original values
      if (mission.originalDuration) {
        updatedMission.duration = mission.originalDuration;
        delete updatedMission.originalDuration;
      }
      if (mission.originalTimeSlot) {
        updatedMission.timeSlot = mission.originalTimeSlot;
        delete updatedMission.originalTimeSlot;
      }
    }

    updatedMissions[missionIndex] = updatedMission;

    if (isCompleting && missionIndex + 1 < updatedMissions.length) {
      updatedMissions[missionIndex + 1] = {
        ...updatedMissions[missionIndex + 1],
        unlocked: true
      };
    }

    // Base mission XP: 50 (slower progression)
    const baseXp = 50;
    const gainedXp = mission.xp || baseXp;

    let deltaXp = 0;
    if (isCompleting) {
      const finalGainedXp = this.isGodModeActive() ? Math.floor(gainedXp * 1.5) : gainedXp;
      updatedMission.xpEarned = finalGainedXp;
      deltaXp = finalGainedXp;
    } else {
      deltaXp = -( (mission as any).xpEarned || (this.isGodModeActive() ? Math.floor(gainedXp * 1.5) : gainedXp) );
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

    // Calculate level using proper scaling formula from calculateLevelFromXP
    const { level: newLevel, nextLevelXP: xpNeededForNext } = calculateLevelFromXP(newXp.total);
    const newLevelValue = newLevel;
    newXp.level = newLevelValue;
    newXp.nextLevelXP = xpNeededForNext;

    // Streak is derived from actual study sessions and the configured daily threshold.
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
          const deltaQs = mission.type === 'Solve PYQs' ? 15 : mission.type === 'Solve DPP' ? 10 : 5;
          const addedQs = isCompleting ? deltaQs : -deltaQs;
          const deltaConf = isCompleting ? 5 : -5;
          
          let theoryComplete = c.theoryComplete;
          let dppComplete = c.dppComplete;
          let pyqsComplete = c.pyqsComplete;
          let revisionCount = c.revisionCount || 0;
          let lastRevisionDaysAgo = c.lastRevisionDaysAgo;
          let currentLecture = c.currentLecture || 0;
          const totalLectures = c.totalLectures || 12;
          
          if (isCompleting) {
             if (mission.type === 'Watch Lecture') {
               // Extract the actual lecture number from taskName (e.g. 'Lecture 7/20: Chemical Bonding' → 7)
               // to avoid blindly incrementing when out-of-order lectures are completed.
               const lecMatch = (mission.taskName || '').match(/Lecture\s+(\d+)/i);
               const completedLecNum = lecMatch ? parseInt(lecMatch[1], 10) : currentLecture + 1;
               currentLecture = Math.min(totalLectures, Math.max(currentLecture, completedLecNum));
               theoryComplete = currentLecture >= totalLectures;
             }
            if (mission.type === 'Solve DPP') dppComplete = true;
            if (mission.type === 'Solve PYQs') pyqsComplete = true;
            if (mission.type === 'Revise Formulas' || mission.type === 'Review Mistakes') {
              revisionCount += 1;
              lastRevisionDaysAgo = 0;
              // Reset retention decay flag instantly (Bug 3.2)
              c.status = 'Learning';
              if (this.state.chapterTelemetryMap && this.state.chapterTelemetryMap[c.id]) {
                this.state.chapterTelemetryMap[c.id].retentionConfidence = 'High';
              }
            }
          } else {
            if (mission.type === 'Watch Lecture') {
              const lecMatch = (mission.taskName || '').match(/Lecture\s+(\d+)/i);
              const uncheckedLecNum = lecMatch ? parseInt(lecMatch[1], 10) : null;
              
              if (uncheckedLecNum !== null && currentLecture === uncheckedLecNum) {
                // Only decrement if we are unchecking the latest lecture (Bug 2.2)
                currentLecture = Math.max(0, currentLecture - 1);
              } else if (uncheckedLecNum === null) {
                currentLecture = Math.max(0, currentLecture - 1);
              }
              theoryComplete = false;
            }
            if (mission.type === 'Solve DPP') dppComplete = false;
            if (mission.type === 'Solve PYQs') pyqsComplete = false;
          }

          // Keep lectureProgress.completedLectures in sync with currentLecture so that
          // normalizeChapter → getAcademicState doesn't silently overwrite the updated
          // value with the stale nested field (getAcademicState prefers lectureProgress
          // .completedLectures over the top-level currentLecture field).
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
      const savePromises: Promise<any>[] = [
        this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, { xp: newXp }), 'updateUserProfile')
      ];

      if (chapter) {
        const updatedChap = updatedChapters.find(c => c.id === chapter.id);
        if (updatedChap) {
          savePromises.push(this.safeDbCall(() => ChapterRepository.saveChapter(this.userId, updatedChap), 'saveChapter'));
        }
      }

      let updatedCustomMissions = this.state.customMissions;
      const isCustom = this.state.customMissions.some(cm => cm.id === taskId);
      const updatedCustomMission = updatedMissions[missionIndex];
      
      // Only save to CustomMissionRepository if it's truly a custom mission
      // Planner missions should NOT pollute the custom missions collection
      let updatedCompletedPlannerMissionIds = this.state.completedPlannerMissionIds || [];
      if (isCustom) {
        savePromises.push(this.safeDbCall(() => CustomMissionRepository.saveMission(this.userId, updatedCustomMission), 'saveMission'));
        updatedCustomMissions = this.state.customMissions.map(cm => cm.id === taskId ? updatedCustomMission : cm);
      } else {
        // For planner missions, don't save to CustomMissionRepository
        // Their completed state will be preserved through the runtime's mission mapping logic
        updatedCustomMissions = this.state.customMissions;
        
        if (isCompleting) {
          updatedCompletedPlannerMissionIds = Array.from(new Set([...updatedCompletedPlannerMissionIds, taskId]));
          savePromises.push(this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, { completedPlannerMissionIds: updatedCompletedPlannerMissionIds }), 'updateUserProfile'));
        } else {
          updatedCompletedPlannerMissionIds = updatedCompletedPlannerMissionIds.filter((id: string) => id !== taskId);
          savePromises.push(this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, { completedPlannerMissionIds: updatedCompletedPlannerMissionIds }), 'updateUserProfile'));
        }
      }

      // Trigger level-up event if applicable
      const levelUpData = oldLevel !== newLevel && isCompleting ? { oldLevel, newLevel, xp: newXp } : null;

      // Create a StudySession to ensure Doomsday velocity gets updated
      if (isCompleting && studySessionDuration > 0) {
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
          xpEarned: deltaXp
        };
        savePromises.push(this.safeDbCall(() => StudySessionRepository.saveStudySession(this.userId, sessionPayload), 'saveStudySession'));
      } else if (!isCompleting && mission.linkedSessionId) {
        // Delete the associated study session when un-completing
        savePromises.push(this.safeDbCall(() => StudySessionRepository.deleteStudySession(this.userId, mission.linkedSessionId), 'deleteStudySession'));
        updatedMission.linkedSessionId = undefined;
      }

      // Optimistic update - refresh UI immediately before saving


      // Await heavy IO tasks so errors are caught by the outer try/catch
      await Promise.all(savePromises);

      // Trigger matrix regeneration
      // Use INIT instead of SESSION_UPDATE to trigger generateWeeklyMatrix
      await this.runtime.refresh('INIT', {
        todayMissions: updatedMissions,
        customMissions: updatedCustomMissions,
        completedPlannerMissionIds: updatedCompletedPlannerMissionIds,
        xp: newXp,
        chapters: updatedChapters,
        lastSyncError: null,
        levelUpData
      });

      // Trigger success toast for task completion if we just completed it
      if (isCompleting) {
        this.triggerToast('Mission Accomplished', `${mission.taskName} finished successfully!`, 'success');
      } else {
        this.triggerToast('Mission Restored', `${mission.taskName} added back to queue.`, 'info');
      }
    } catch (err) {
      await this.handleWriteError(err, 'completeTask');
    }
  }

  async deleteMission(taskId: string) {
    this.checkWriteBlock();
    const updatedDeletedMissionIds = Array.from(new Set([...(this.state.deletedMissionIds || []), taskId]));

    // For custom missions: hard-delete from Firestore and remove from list entirely.
    // For planner missions: mark dismissed so they sink to the bottom with a strikethrough
    // rather than disappearing and being replaced by new planner missions.
    const isCustom = this.state.customMissions.some(cm => cm.id === taskId);

    const updatedCustomMissions = isCustom
      ? this.state.customMissions.filter(m => m.id !== taskId)
      : this.state.customMissions;

    // Completely remove the deleted mission from the queue
    const updatedTodayMissions = this.state.todayMissions.filter(m => m.id !== taskId);

    try {
      if (isCustom) {
        await CustomMissionRepository.deleteMission(this.userId, taskId);
      }
      // Persist the deleted-mission blocklist to Firestore so it survives reloads.
      // AI-planner missions regenerate every session with deterministic IDs, so without
      // this they'd reappear every time the page is refreshed.
      await UserRepository.updateUserProfile(this.userId, { deletedMissionIds: updatedDeletedMissionIds });
      await this.runtime.refresh('SESSION_UPDATE', {
        todayMissions: updatedTodayMissions,
        customMissions: updatedCustomMissions,
        deletedMissionIds: updatedDeletedMissionIds,
        lastSyncError: null
      });
      this.triggerToast('Mission Removed', 'Task successfully removed from your queue.', 'info');
    } catch (err) {
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
      xp: Math.round((missionData.duration || 60) * 0.5), // Reduced from 1.5 to 0.5
      priorityScore: 1.0,
      selectionReason: "Manually added by student"
    };

    const updatedMissions = [...this.state.todayMissions, newMission];
    const updatedCustomMissions = [...this.state.customMissions, newMission];

    try {
      await CustomMissionRepository.saveMission(this.userId, newMission);
      await this.runtime.refresh('SESSION_UPDATE', { 
        todayMissions: updatedMissions,
        customMissions: updatedCustomMissions,
        lastSyncError: null
      });
      this.triggerToast('Mission Created', `Custom mission "${newMission.taskName}" added to queue.`, 'success');
    } catch (err) {
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

    try {
      await CustomMissionRepository.saveMission(this.userId, newMission);
      await this.runtime.refresh('SESSION_UPDATE', { 
        todayMissions: updatedMissions,
        customMissions: updatedCustomMissions,
        lastSyncError: null
      });
    } catch (err) {
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
      xp: updates.duration ? Math.round(updates.duration * 0.5) : mission.xp // Reduced from 1.5 to 0.5
    };
    
    const updatedMissions = [...this.state.todayMissions];
    updatedMissions[missionIndex] = updatedMission;
    
    let updatedCustomMissions = this.state.customMissions;
    const isCustom = this.state.customMissions.some(cm => cm.id === taskId);
    
    try {
      // Only save to CustomMissionRepository if it's truly a custom mission
      if (isCustom) {
        await CustomMissionRepository.saveMission(this.userId, updatedMission);
        updatedCustomMissions = this.state.customMissions.map(cm => cm.id === taskId ? updatedMission : cm);
      } else {
        // For planner missions, don't save to CustomMissionRepository
        updatedCustomMissions = this.state.customMissions;
      }
      
      await this.runtime.refresh('SESSION_UPDATE', {
        todayMissions: updatedMissions,
        customMissions: updatedCustomMissions,
        lastSyncError: null
      });
    } catch (err) {
      await this.handleWriteError(err, 'updateMissionDetails');
    }
  }

  async updateChapter(chapterIdOrObject: string | Chapter, updates?: Partial<Chapter>): Promise<void> {
    this.checkWriteBlock();
    let chapterId: string;
    let actualUpdates: Partial<Chapter>;

    if (typeof chapterIdOrObject === 'string') {
      chapterId = chapterIdOrObject;
      actualUpdates = updates || {};
    } else {
      chapterId = chapterIdOrObject.id;
      actualUpdates = chapterIdOrObject;
    }

    const chapter = this.state.chapters.find(c => c.id === chapterId || c.name === chapterId);
    if (!chapter) return;

    const merged = { ...chapter, ...actualUpdates };

    if (actualUpdates.completion === undefined) {
      let tasksCompleted = 0;
      if (merged.theoryComplete) tasksCompleted++;
      if (merged.dppComplete) tasksCompleted++;
      if (merged.pyqsComplete) tasksCompleted++;
      if (merged.formulaComplete) tasksCompleted++;

      merged.completion = Math.round((tasksCompleted / 4) * 100);
    }

    if (merged.completion === 100) {
      merged.status = 'Mastered';
      merged.syllabusStage = 'Mastered';
    } else if (merged.completion > 0 && (!merged.status || merged.status === 'Not Started')) {
      merged.status = 'Learning';
      merged.syllabusStage = 'Watching Lectures';
    }

    const updatedChapter = normalizeChapter(merged);
    const updatedChapters = this.state.chapters.map(c => (c.id === chapter.id ? updatedChapter : c));

    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'updateChapter');
    }
  }

  openChapterEditModal(chapterId: string) {
    this.runtime.updateStateOptimistic({ activeEditChapterId: chapterId });
  }

  async addCustomChapter(input: {
    name: string;
    subject: SubjectId;
    unit: string;
    serialNumber?: string;
    totalLectures: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  }): Promise<void> {
    this.checkWriteBlock();

    const id = `custom_${input.subject}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Use provided serial number or auto-generate based on highest existing number for this subject
    let serialNumber = input.serialNumber;
    if (!serialNumber) {
      const subjectChapters = this.state.chapters.filter(c => c.subject === input.subject);
      let maxNum = 0;
      subjectChapters.forEach(ch => {
        if (ch.serialNumber && ch.serialNumber.startsWith('CH')) {
          const numStr = ch.serialNumber.slice(2);
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      serialNumber = `CH${maxNum + 1}`;
    } else {
      // Auto-prepend CH if not already present
      serialNumber = serialNumber.startsWith('CH') ? serialNumber : `CH${serialNumber}`;
    }

    // Follows the exact shape of the system's INITIAL_CHAPTERS seed data,
    // just starting from a fresh "Not Started" state.
    const newChapter: Chapter = normalizeChapter({
      id,
      subject: input.subject,
      unit: input.unit,
      name: input.name,
      weightage: 3,
      completion: 0,
      currentLecture: 0,
      totalLectures: input.totalLectures,
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0,
      difficulty: input.difficulty,
      confidence: 0,
      estimatedRemainingTime: Math.round(input.totalLectures * 1.5),
      priority: 2,
      dependencies: [],
      weaknessScore: 0,
      status: 'Not Started',
      solvedQuestions: 0,
      lastRevisionDaysAgo: 0,
      isCustom: true,
      serialNumber
    });

    const updatedChapters = [...this.state.chapters, newChapter];

    try {
      await ChapterRepository.saveChapter(this.userId, newChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'addCustomChapter');
    }
  }

  closeChapterEditModal() {
    this.runtime.updateStateOptimistic({ activeEditChapterId: null });
  }

  async updateChapterProgress(
    chapterId: string, 
    updates: Partial<Chapter> | number, 
    theoryComplete?: boolean, 
    dppComplete?: boolean, 
    pyqsComplete?: boolean
  ) {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === chapterId || c.name === chapterId);
    if (!chapter) return;

    let updatedChapter: Chapter;
    if (typeof updates === 'object' && updates !== null) {
      updatedChapter = normalizeChapter({ ...chapter, ...updates });
    } else {
      updatedChapter = normalizeChapter({
        ...chapter,
        currentLecture: typeof updates === 'number' ? updates : chapter.currentLecture,
        theoryComplete: theoryComplete !== undefined ? theoryComplete : chapter.theoryComplete,
        dppComplete: dppComplete !== undefined ? dppComplete : chapter.dppComplete,
        pyqsComplete: pyqsComplete !== undefined ? pyqsComplete : chapter.pyqsComplete
      });
    }

    const updatedChapters = this.state.chapters.map(c => (c.id === chapter.id ? updatedChapter : c));
    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'updateChapterProgress');
    }
  }

  async skipTask(taskId: string) {
    this.checkWriteBlock();
    const missionIndex = this.state.todayMissions.findIndex(m => m.id === taskId);
    if (missionIndex === -1) return;

    const updatedMissions = [...this.state.todayMissions];
    updatedMissions[missionIndex] = {
      ...updatedMissions[missionIndex],
      completed: true
    };

    if (missionIndex + 1 < updatedMissions.length) {
      updatedMissions[missionIndex + 1] = {
        ...updatedMissions[missionIndex + 1],
        unlocked: true
      };
    }

    try {
      const skippedMission = updatedMissions[missionIndex];
      const savePromises = [];

      // Save the skipped mission to database just like completeTask does
      if (skippedMission.id.startsWith('mission-') || skippedMission.id.includes('custom')) {
        savePromises.push(this.safeDbCall(() => CustomMissionRepository.saveMission(this.userId, skippedMission), 'saveMission'));
      }

      await Promise.all(savePromises);
      await this.runtime.refresh('SESSION_UPDATE', { todayMissions: updatedMissions });
    } catch (err) {
      await this.handleWriteError(err, 'skipTask');
    }
  }

  async completeStudySession(sessionData: Partial<Omit<StudySession, 'id'>> & { focusTime?: number; questions?: number; correct?: number; idleTime?: number; focusInterruptions?: number; focusScore?: number; }) {
    this.checkWriteBlock();
    let duration = sessionData.duration ?? sessionData.focusTime ?? 0;
    if (Number.isNaN(duration)) duration = 0;
    const questionsSolved = sessionData.questionsSolved ?? sessionData.questions ?? 0;
    const correct = sessionData.correct ?? questionsSolved;
    const accuracy = sessionData.accuracy ?? (questionsSolved > 0 ? Math.round((correct / questionsSolved) * 100) : 100);
    const session: StudySession = {
      id: Date.now().toString(),
      startTime: sessionData.startTime || new Date(Date.now() - duration * 60000).toISOString(),
      endTime: sessionData.endTime || new Date().toISOString(),
      duration: duration,
      type: sessionData.type || 'Practice',
      subjectId: sessionData.subjectId || (this.state.activeSubject === 'all' ? 'physics' : this.state.activeSubject),
      questionsSolved: questionsSolved,
      accuracy: accuracy,
      xpEarned: sessionData.xpEarned || Math.max(10, Math.round(duration * 0.2 + questionsSolved * 0.5)), // Reduced from 0.5 to 0.2 and 1 to 0.5
      idleTime: sessionData.idleTime,
      focusInterruptions: sessionData.focusInterruptions,
      focusScore: sessionData.focusScore
    };
    if (sessionData.chapterId !== undefined) {
      session.chapterId = sessionData.chapterId;
    }

    // Apply God Mode XP Multiplier (1.5x) if active and enabled
    if (this.isGodModeActive() && session.xpEarned) {
      session.xpEarned = Math.floor(session.xpEarned * 1.5);
    }

    try {
      await StudySessionRepository.saveStudySession(this.userId, session);
      const updatedSessions = [...this.state.studySessions, session];
      
      // Update analytics with the new session data — weighted accuracy average
      const oldTotal = this.state.analytics.questionsSolved;
      const newTotal = oldTotal + questionsSolved;
      const updatedAnalytics = {
        ...this.state.analytics,
        studyTime: this.state.analytics.studyTime + duration,
        focusTime: this.state.analytics.focusTime + duration,
        questionsSolved: newTotal,
        accuracy: newTotal > 0 && questionsSolved > 0
          ? Math.round((this.state.analytics.accuracy * oldTotal + accuracy * questionsSolved) / newTotal)
          : this.state.analytics.accuracy,
        tasksCompleted: this.state.analytics.tasksCompleted + 1,
        xpEarned: this.state.analytics.xpEarned + (session.xpEarned || 0)
      };
      
      // Update XP from session (with daily/weekly reset)
      const oldLevel = this.state.xp.level;
      const baseXpState = this.getResetXpBase();
      const newXp = {
        ...baseXpState,
        total: baseXpState.total + (session.xpEarned || 0),
        daily: baseXpState.daily + (session.xpEarned || 0),
        weekly: baseXpState.weekly + (session.xpEarned || 0),
        monthly: (baseXpState.monthly || 0) + (session.xpEarned || 0)
      };
      
      // Calculate new level
      const { level: newLevel, nextLevelXP: xpNeededForNext } = calculateLevelFromXP(newXp.total);
      newXp.level = newLevel;
      newXp.nextLevelXP = xpNeededForNext;
      
      this.evaluateAndUpdateStreak(newXp, updatedSessions);
      
      // Save analytics and XP back to user profile
      await UserRepository.updateUserProfile(this.userId, { analytics: updatedAnalytics, xp: newXp });
      
      // Trigger level-up event if applicable
      const levelUpData = oldLevel !== newLevel ? { oldLevel, newLevel, xp: newXp } : null;
      
      await this.runtime.refresh('SESSION_UPDATE', { studySessions: updatedSessions, analytics: updatedAnalytics, xp: newXp, lastSyncError: null, levelUpData });
    } catch (err) {
      await this.handleWriteError(err, 'completeStudySession');
    }
  }

  async completeRevision(cardId: string, confidence: 'Low' | 'Medium' | 'High') {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === cardId);
    if (chapter) {
      const confScore = confidence === 'High' ? 100 : confidence === 'Medium' ? 70 : 40;

      // Award XP for revision completion (reduced from higher values to match new system)
      const baseRevisionXP = confidence === 'High' ? 150 : confidence === 'Medium' ? 100 : 50;
      const revisionXP = this.isGodModeActive() ? Math.floor(baseRevisionXP * 1.5) : baseRevisionXP;
      const oldLevel = this.state.xp.level;
      const baseXpState = this.getResetXpBase();
      const newXp = {
        ...baseXpState,
        total: baseXpState.total + revisionXP,
        daily: baseXpState.daily + revisionXP,
        weekly: baseXpState.weekly + revisionXP,
        monthly: (baseXpState.monthly || 0) + revisionXP
      };

      // Calculate new level
      const { level: newLevel, nextLevelXP: xpNeededForNext } = calculateLevelFromXP(newXp.total);
      newXp.level = newLevel;
      newXp.nextLevelXP = xpNeededForNext;

      // Save XP updates
      await UserRepository.updateUserProfile(this.userId, { xp: newXp });

      // Trigger level-up event if applicable
      const levelUpData = oldLevel !== newLevel ? { oldLevel, newLevel, xp: newXp } : null;
      
      let easeFactor = chapter.sm2EaseFactor ?? 2.5;
      let interval = chapter.sm2Interval ?? 0;
      let revisionCount = chapter.revisionCount || 0;
      
      let quality = 0;
      if (confidence === 'High') quality = 5;
      else if (confidence === 'Medium') quality = 3;
      else quality = 1;
      
      if (quality >= 3) {
        revisionCount += 1;
        if (revisionCount === 1) {
          interval = 1;
        } else if (revisionCount === 2) {
          interval = 6;
        } else {
          interval = Math.round(interval * easeFactor);
        }
      } else {
        revisionCount = 0;
        interval = 1;
      }
      
      easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;
      
      const nextRevisionDueAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString();

      const updatedChapter = { 
        ...chapter, 
        revisionCount,
        confidence: Math.round(((chapter.confidence || 0) + confScore) / 2),
        sm2EaseFactor: easeFactor,
        sm2Interval: interval,
        nextRevisionDueAt,
        lastRevisedAt: new Date().toISOString()
      };
      try {
        await ChapterRepository.saveChapter(this.userId, updatedChapter);
        const updatedChapters = this.state.chapters.map(c => c.id === cardId ? updatedChapter : c);
        await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, xp: newXp, lastSyncError: null, levelUpData });
      } catch (err) {
        await this.handleWriteError(err, 'completeRevision');
      }
    }
  }

  async toggleChapterStatus(chapterId: string) {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const isMastering = chapter.status !== 'Mastered' && chapter.completion !== 100;
    const newStatus: Chapter['status'] = isMastering ? 'Mastered' : 'Learning';
    const completion = isMastering ? 100 : 0;
    
    const updatedChapter: Chapter = { 
      ...chapter, 
      status: newStatus,
      completion,
      theoryComplete: isMastering,
      dppComplete: isMastering,
      pyqsComplete: isMastering,
      formulaComplete: isMastering,
      currentLecture: isMastering ? chapter.totalLectures : 0
    };
    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      const updatedChapters = this.state.chapters.map(c => c.id === chapterId ? updatedChapter : c);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'toggleChapterStatus');
    }
  }

  async updateChapterStatus(chapterId: string, status: Chapter['status']) {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const updatedChapter = { ...chapter, status };
    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      const updatedChapters = this.state.chapters.map(c => c.id === chapterId ? updatedChapter : c);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'updateChapterStatus');
    }
  }

  // --- MOCK TEST ACTIONS ---

  async addMockResult(result: Omit<MockResult, 'id'>) {
    this.checkWriteBlock();
    const newMockResult = { ...result, id: Date.now().toString() };

    // Award XP for mock test completion using the actual mark total when available.
    const scorePercent = calculateMockScorePercent({
      totalScore: result.totalScore,
      totalQuestions: result.totalQuestions,
      totalMarks: result.testSnapshot?.totalMarks,
      testSnapshot: result.testSnapshot,
    });
    const baseMockXP = Math.round(200 + (scorePercent / 100) * 300);
    const mockXP = this.isGodModeActive() ? Math.floor(baseMockXP * 1.5) : baseMockXP;

    const oldLevel = this.state.xp.level;
    const baseXpState = this.getResetXpBase();
    const newXp = {
      ...baseXpState,
      total: baseXpState.total + mockXP,
      daily: baseXpState.daily + mockXP,
      weekly: baseXpState.weekly + mockXP,
      monthly: (baseXpState.monthly || 0) + mockXP
    };

    // Calculate new level
    const { level: newLevel, nextLevelXP: xpNeededForNext } = calculateLevelFromXP(newXp.total);
    newXp.level = newLevel;
    newXp.nextLevelXP = xpNeededForNext;

    try {
      await MockResultRepository.saveMockResult(this.userId, newMockResult);
      await UserRepository.updateUserProfile(this.userId, { xp: newXp });
      const updatedMocks = [...this.state.mocks, newMockResult];

      // Trigger level-up event if applicable
      const levelUpData = oldLevel !== newLevel ? { oldLevel, newLevel, xp: newXp } : null;

      await this.runtime.refresh('MOCK_UPDATE', { mocks: updatedMocks, xp: newXp, lastSyncError: null, levelUpData });
    } catch (err) {
      await this.handleWriteError(err, 'addMockResult');
    }
  }

  async addCustomMockTest(testData: MockTest) {
    this.checkWriteBlock();
    const newTest = { ...testData, id: testData.id || `user-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
    try {
      await MockTestRepository.saveCustomMockTest(this.userId, newTest);
      const updatedTests = [...this.state.customMockTests, newTest];
      await this.runtime.refresh('INIT', { customMockTests: updatedTests, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'addCustomMockTest');
    }
  }

  // --- MISTAKE ACTIONS ---

  async addMistake(mistake: Omit<Mistake, 'id' | 'createdAt'>) {
    this.checkWriteBlock();
    const newMistake = { ...mistake, id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
    try {
      await MistakeRepository.saveMistake(this.userId, newMistake);
      const updatedMistakes = [...this.state.mistakes, newMistake];
      await this.runtime.refresh('MISTAKE_UPDATE', { mistakes: updatedMistakes, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'addMistake');
    }
  }

  async updateMistakeStatus(mistakeId: string, status: Mistake['revisionStatus']) {
    this.checkWriteBlock();
    const mistake = this.state.mistakes.find(m => m.id === mistakeId);
    if (!mistake) return;
    const updatedMistake = { ...mistake, revisionStatus: status };
    try {
      await MistakeRepository.saveMistake(this.userId, updatedMistake);
      const updatedMistakes = this.state.mistakes.map(m => m.id === mistakeId ? updatedMistake : m);
      await this.runtime.refresh('MISTAKE_UPDATE', { mistakes: updatedMistakes, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'updateMistakeStatus');
    }
  }

  async updateChapterData(chapterId: string, updates: Partial<Chapter>) {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const updatedChapter = { ...chapter, ...updates };

    let tasksCompleted = 0;
    if (updatedChapter.theoryComplete) tasksCompleted++;
    if (updatedChapter.dppComplete) tasksCompleted++;
    if (updatedChapter.pyqsComplete) tasksCompleted++;
    if (updatedChapter.formulaComplete) tasksCompleted++;

    updatedChapter.completion = Math.round((tasksCompleted / 4) * 100);
    if (updatedChapter.completion === 100) {
      updatedChapter.status = 'Mastered';
    } else if (updatedChapter.completion > 0 && updatedChapter.status === 'Not Started') {
      updatedChapter.status = 'Learning';
    }

    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      const updatedChapters = this.state.chapters.map(c => c.id === chapterId ? updatedChapter : c);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'updateChapterData');
    }
  }

  async deleteChapter(chapterId: string) {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    try {
      await ChapterRepository.deleteChapter(this.userId, chapterId);
      const updatedChapters = this.state.chapters.filter(c => c.id !== chapterId);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'deleteChapter');
    }
  }

  async updateWeeklyGoals(weeklyGoals: { weekIndex: number; title: string; focus: string; status: 'Completed' | 'Active' | 'Upcoming' }[]) {
    this.checkWriteBlock();
    try {
      await UserRepository.updateUserProfile(this.userId, { weeklyGoals });
      await this.runtime.refresh('SETTINGS_UPDATE', { 
        settings: { ...this.state.settings },
        weeklyGoals,
        lastSyncError: null 
      });
    } catch (err) {
      await this.handleWriteError(err, 'updateWeeklyGoals');
    }
  }

  async deleteMistake(mistakeId: string) {
    this.checkWriteBlock();
    try {
      await MistakeRepository.deleteMistake(this.userId, mistakeId);
      const updatedMistakes = this.state.mistakes.filter(m => m.id !== mistakeId);
      await this.runtime.refresh('MISTAKE_UPDATE', { mistakes: updatedMistakes, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'deleteMistake');
    }
  }

  async updateMistakeTestResult(mistakeId: string, isCorrect: boolean) {
    this.checkWriteBlock();
    const mistake = this.state.mistakes.find(m => m.id === mistakeId);
    if (!mistake) return;

    let newRecoveryScore = mistake.recoveryScore;
    let newRevisionStatus = mistake.revisionStatus;

    if (isCorrect) {
      newRecoveryScore = Math.min(100, mistake.recoveryScore + 40);
      if (newRecoveryScore >= 100) {
        newRevisionStatus = 'Mastered';
      } else {
        newRevisionStatus = 'Solved Again';
      }
    } else {
      newRecoveryScore = Math.max(0, mistake.recoveryScore - 20);
      newRevisionStatus = 'Reviewed';
    }

    const updatedMistake: Mistake = {
      ...mistake,
      recoveryScore: newRecoveryScore,
      revisionStatus: newRevisionStatus
    };

    try {
      await MistakeRepository.saveMistake(this.userId, updatedMistake);
      const updatedMistakes = this.state.mistakes.map(m => m.id === mistakeId ? updatedMistake : m);
      await this.runtime.refresh('MISTAKE_UPDATE', { mistakes: updatedMistakes, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'updateMistakeTestResult');
    }
  }

  async toggleTimelineBlockComplete(blockId: string) {
    this.checkWriteBlock();
    if (blockId.startsWith('mission-')) {
      const taskId = blockId.replace('mission-', '');
      await this.completeTask(taskId);
      return;
    }
    const block = this.state.timeline.find(b => b.id === blockId);
    if (!block) return;
    const updatedBlock = { ...block, completed: !block.completed };
    try {
      await TimelineRepository.saveTimelineBlock(this.userId, updatedBlock);
      const updatedBlocks = this.state.timeline.map(b => b.id === blockId ? updatedBlock : b);
      await this.runtime.refresh('SESSION_UPDATE', { timeline: updatedBlocks, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'toggleTimelineBlockComplete');
    }
  }

  async runCoachAnalysis(question?: string) {
    await this.runtime.runCoachAnalysis(question);
  }

  async setSettings(newSettings: any) {
    this.checkWriteBlock();
    const updatedMentor = this.state.mentorProfile ? {
      ...this.state.mentorProfile,
      dailyAvailableHours: newSettings.dailyQuota ?? this.state.mentorProfile.dailyAvailableHours,
      targetYear: newSettings.targetYear ?? this.state.mentorProfile.targetYear,
      targetCollege: newSettings.dreamIit ?? this.state.mentorProfile.targetCollege,
      targetBranch: newSettings.targetBranch ?? this.state.mentorProfile.targetBranch
    } : null;

    try {
      await UserRepository.updateUserProfile(this.userId, { 
        settings: newSettings,
        ...(updatedMentor ? { mentorProfile: updatedMentor } : {})
      });
      await this.runtime.refresh('SETTINGS_UPDATE', { 
        settings: newSettings, 
        ...(updatedMentor ? { mentorProfile: updatedMentor } : {}),
        lastSyncError: null 
      });
    } catch (err) {
      await this.handleWriteError(err, 'setSettings');
    }
  }

  /**
   * Resets the user's XP, level, and streak to zero while preserving all other
   * progress (chapters, missions, deleted-mission blocklist, etc.).
   * Persists immediately to Firestore so the reset survives page reloads.
   */
  async resetHiddenMissions() {
    this.checkWriteBlock();
    try {
      await UserRepository.updateUserProfile(this.userId, { deletedMissionIds: [] });
      await this.runtime.refresh('SESSION_UPDATE', {
        deletedMissionIds: [],
        lastSyncError: null
      });
    } catch (err) {
      await this.handleWriteError(err, 'resetHiddenMissions');
    }
  }

  async resetXpAndLevel() {
    this.checkWriteBlock();
    const resetXp = {
      daily: 0,
      weekly: 0,
      total: 0,
      level: 1,
      streak: 0,
      nextLevelXP: calculateLevelFromXP(0).nextLevelXP,
      lastActiveDate: ''
    };
    try {
      await UserRepository.updateUserProfile(this.userId, { xp: resetXp });
      await this.runtime.refresh('SETTINGS_UPDATE', { xp: resetXp, lastSyncError: null });
    } catch (err) {
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
      'customTimelineBlocks'
    ];

    for (const colName of collectionsToDelete) {
      try {
        const colRef = collection(db, 'users', this.userId, colName);
        const snapshot = await getDocs(colRef);
        if (snapshot.size > 0) {
          const CHUNK_SIZE = 450;
          const docs = snapshot.docs;
          for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
            const chunk = docs.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(docSnap => {
              batch.delete(docSnap.ref);
            });
            await batch.commit();
          }
        }
      } catch (err: any) {
        console.error(`Error deleting collection ${colName}:`, err);
        throw new Error(`Failed to delete collection ${colName}: ${err.message}`);
      }
    }

    try {
      await deleteDoc(doc(db, 'users', this.userId));
    } catch (err: any) {
      console.error(`Error deleting user document ${this.userId}:`, err);
      throw new Error(`Failed to delete account data: ${err.message}`);
    }
  }

  async resetAllProgress() {
    this.checkWriteBlock();
    
    // 1. Delete all subcollections
    const collectionsToDelete = [
      'chapters',
      'mistakes',
      'notes',
      'studySessions',
      'mockResults',
      'customTimelineBlocks'
    ];

    for (const colName of collectionsToDelete) {
      try {
        const colRef = collection(db, 'users', this.userId, colName);
        const snapshot = await getDocs(colRef);
        if (snapshot.size > 0) {
          const CHUNK_SIZE = 450;
          const docs = snapshot.docs;
          for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
            const chunk = docs.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(docSnap => {
              batch.delete(docSnap.ref);
            });
            await batch.commit();
          }
        }
      } catch (err) {
        console.error(`Error deleting collection ${colName}:`, err);
      }
    }

    // 2. Reset user document
    const initialProfile = {
      xp: { daily: 0, weekly: 0, total: 0, level: 1, streak: 0, nextLevelXP: calculateLevelFromXP(0).nextLevelXP },
      analytics: { studyTime: 0, focusTime: 0, idleTime: 0, breakTime: 0, questionsSolved: 0, accuracy: 0, tasksCompleted: 0, xpEarned: 0 },
      energyLevel: 'Medium' as const,
      activeSubject: 'physics' as const,
      isMissionModeActive: false,
      coachMessage: 'Ready',
      mentorProfile: {
        interviewCompleted: false
      },
      settings: {
        targetYear: '2027',
        dreamIit: 'IIT Bombay',
        targetBranch: 'Computer Science & Engineering',
        dailyQuota: 6,
        showStatusInBar: true,
        soundEffects: false,
        pauseOnTabChange: true,
        migratedToPristine: true
      }
    };
    await UserRepository.saveUserProfile(this.userId, initialProfile as any);

    // 3. Re-seed Chapters & Mistakes
    const { INITIAL_CHAPTERS } = await import('../constants/initialSeeds');
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
      mentorProfile: { interviewCompleted: false } as any,
      settings: initialProfile.settings as any,
      initializationError: null,
      writeBlocked: false,
      loading: false
    });
  }

  async addTodayMission(mission: TodayMission) {
    this.checkWriteBlock();
    const updatedMissions = [...(this.state.todayMissions || []), mission];
    await this.runtime.refresh('INIT', { todayMissions: updatedMissions, plannerOutput: null });
  }

  async clearTodayMissions() {
    this.checkWriteBlock();
    await this.runtime.refresh('INIT', { todayMissions: [], plannerOutput: null });
  }

  async addCustomTimelineBlock(block: any, arg1?: any, arg2?: any, arg3?: any) {
    this.checkWriteBlock();
    let newBlock: TimelineBlock;
    if (typeof block === 'string') {
      newBlock = {
        id: `user-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        subject: block as any,
        chapter: (arg1 || '').trim().substring(0, 80),
        activity: (arg2 || '').trim().substring(0, 150),
        time: (arg3 || '').trim().substring(0, 25),
        completed: false
      };
    } else {
      newBlock = {
        ...block,
        id: `user-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        chapter: (block.chapter || '').trim().substring(0, 80),
        activity: (block.activity || '').trim().substring(0, 150),
        time: (block.time || '').trim().substring(0, 25),
      };
    }

    if (!newBlock.time || !newBlock.chapter || !newBlock.activity) {
      throw new Error("Validation Error: Custom timeline block fields cannot be empty.");
    }

    try {
      await TimelineRepository.saveTimelineBlock(this.userId, newBlock);
      const updatedBlocks = [...this.state.timeline, newBlock];
      await this.runtime.refresh('SESSION_UPDATE', { timeline: updatedBlocks, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'addCustomTimelineBlock');
    }
  }

  async updateCustomTimelineBlock(id: string, updates: Partial<TimelineBlock>) {
    this.checkWriteBlock();
    const block = this.state.timeline.find(b => b.id === id);
    if (!block) return;

    const sanitizedUpdates: Partial<TimelineBlock> = { ...updates };
    if (updates.chapter !== undefined) sanitizedUpdates.chapter = (updates.chapter || '').trim().substring(0, 80);
    if (updates.activity !== undefined) sanitizedUpdates.activity = (updates.activity || '').trim().substring(0, 150);
    if (updates.time !== undefined) sanitizedUpdates.time = (updates.time || '').trim().substring(0, 25);

    const updatedBlock = { ...block, ...sanitizedUpdates };
    if (!updatedBlock.time || !updatedBlock.chapter || !updatedBlock.activity) {
      throw new Error("Validation Error: Custom timeline block fields cannot be empty.");
    }

    try {
      await TimelineRepository.saveTimelineBlock(this.userId, updatedBlock);
      const updatedBlocks = this.state.timeline.map(b => b.id === id ? updatedBlock : b);
      await this.runtime.refresh('SESSION_UPDATE', { timeline: updatedBlocks, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'updateCustomTimelineBlock');
    }
  }

  async deleteCustomTimelineBlock(id: string) {
    this.checkWriteBlock();
    try {
      await TimelineRepository.deleteTimelineBlock(this.userId, id);
      const updatedBlocks = this.state.timeline.filter(b => b.id !== id);
      await this.runtime.refresh('SESSION_UPDATE', { timeline: updatedBlocks, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'deleteCustomTimelineBlock');
    }
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

    // 1. Batch update chapters in repository if student updated reality
    let updatedChapters = [...this.state.chapters];
    if (chapterUpdates && chapterUpdates.length > 0) {
      for (const update of chapterUpdates) {
        const chap = updatedChapters.find(c => c.id === update.id);
        if (chap) {
          const mappedStatus = update.status === 'Completed' ? 'Mastered' : update.status === 'In Progress' ? 'Learning' : 'Not Started';
          // Use provided completion or derive from status
          const completion = update.completion !== undefined ? update.completion :
            (update.status === 'Completed' ? 100 : update.status === 'In Progress' ? 50 : 0);
          const conf = update.confidence !== undefined ? update.confidence :
            (update.status === 'Completed' ? 85 : update.status === 'In Progress' ? 50 : 20);
          
          const dppComplete = update.dppDone === true;
          const pyqsComplete = update.pyqsDone === true;
          
          // Build a clean lectureProgress with NO undefined fields (Firestore rejects undefined)
          const cleanLectureProgress: Record<string, any> = {
            totalLectures: update.totalLectures ?? chap.totalLectures ?? 12,
            completedLectures: update.lecturesWatched ?? chap.currentLecture ?? 0,
            avgLectureDurationMinutes: update.avgLectureDuration ?? chap.lectureProgress?.avgLectureDurationMinutes ?? 75,
          };
          // Only include optional string fields if they are actually defined
          if (chap.lectureProgress?.teacher) cleanLectureProgress.teacher = chap.lectureProgress.teacher;
          if (chap.lectureProgress?.lectureSeries) cleanLectureProgress.lectureSeries = chap.lectureProgress.lectureSeries;
          if (chap.lectureProgress?.estimatedRemainingHours !== undefined) cleanLectureProgress.estimatedRemainingHours = chap.lectureProgress.estimatedRemainingHours;

          // Helper to strip undefined from any object before Firestore write
          const removeUndefined = (obj: Record<string, any>): Record<string, any> =>
            Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

          const updatedChap: Chapter = removeUndefined({
            ...chap,
            status: mappedStatus,
            completion,
            confidence: conf,
            currentLecture: update.lecturesWatched ?? chap.currentLecture ?? 0,
            totalLectures: update.totalLectures ?? chap.totalLectures ?? 12,
            theoryComplete: update.status === 'Completed' || (update.lecturesWatched !== undefined && update.totalLectures !== undefined && update.lecturesWatched >= update.totalLectures),
            dppComplete,
            pyqsComplete,
            lectureProgress: cleanLectureProgress,
          }) as Chapter;
          
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
    } as any;

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
      riskLevel: (opt?.scheduleStatus === 'Behind Schedule' ? 'At Risk' : opt?.scheduleStatus) || 'On Track',
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
      // Rethrow so the UI can show the error
      throw profileSaveErr;
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

    const updatedDailyCheckins = [...(mentor.dailyCheckins || []), checkin];

    const updatedMentor: MentorProfile = {
      ...mentor,
      dailyAvailableHours: checkin.actualHoursAvailable,
      dailyCheckins: updatedDailyCheckins
    };

    const updatedSettings = {
      ...this.state.settings,
      dailyQuota: checkin.actualHoursAvailable
    };

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
      await this.handleWriteError(err, 'submitDailyCheckin');
    }
  }

  async submitWeeklyCheckin(checkin: WeeklyCheckin) {
    this.checkWriteBlock();
    const mentor = this.state.mentorProfile;
    if (!mentor) return;

    const updatedWeeklyCheckins = [...(mentor.weeklyCheckins || []), checkin];
    
    const updatedMentor: MentorProfile = {
      ...mentor,
      weeklyCheckins: updatedWeeklyCheckins
    };

    try {
      await UserRepository.updateUserProfile(this.userId, {
        mentorProfile: updatedMentor
      });

      await this.runtime.refresh('SETTINGS_UPDATE', {
        mentorProfile: updatedMentor,
        lastSyncError: null
      });
    } catch (err) {
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

    try {
      await UserRepository.updateUserProfile(this.userId, {
        mentorProfile: updatedMentor
      });

      await this.runtime.refresh('SETTINGS_UPDATE', {
        mentorProfile: updatedMentor,
        lastSyncError: null
      });
    } catch (err) {
      await this.handleWriteError(err, 'setMonthlyObjective');
    }
  }

  async updateChapterDetailedDiagnosis(chapterId: string, updates: Partial<Chapter>) {
    this.checkWriteBlock();
    const chap = this.state.chapters.find(c => c.id === chapterId);
    if (!chap) return;

    const mergedChapter: Chapter = {
      ...chap,
      ...updates
    };

    const updatedChapter = normalizeChapter(mergedChapter);
    const updatedChapters = this.state.chapters.map(c => c.id === chapterId ? updatedChapter : c);

    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'updateChapterDetailedDiagnosis');
    }
  }

  async rebalancePlan() {
    this.checkWriteBlock();

    // 1. Wipe all schedule overrides to remove drag-and-drop glitches & overlaps
    const emptyOverrides = {};

    // 2. Determine dayStartTime and currentDayIndex
    const now = new Date();
    const currentDayIndex = (now.getDay() + 6) % 7;
    const dayStartTime = this.state.settings?.dayStartTime || "07:00";

    // 3. Sort missions so completed tasks stay at top, and uncompleted tasks are ordered sequentially (Lecture 1, Lecture 2, etc.)
    const missions = [...(this.state.todayMissions || [])];
    
    const getSortKey = (m: any) => {
      const match = (m.taskName || '').match(/Lecture (\d+)/i);
      const num = match ? parseInt(match[1], 10) : 999;
      return (m.completed ? 0 : 1000) + num;
    };

    missions.sort((a, b) => getSortKey(a) - getSortKey(b));

    // Wipe timeSlot on uncompleted missions so they are freshly calculated in order
    const cleanedMissions = missions.map(m => {
      if (!m.completed) {
        return {
          ...m,
          timeSlot: undefined,
          isManualOverride: false
        };
      }
      return m;
    });

    // 4. Generate fresh non-overlapping weekly schedule
    const { generateWeeklyMatrix } = await import('@jee-os/engines');
    const updatedWeekly = (generateWeeklyMatrix as any)(
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
      this.state.settings
    );

    // 5. Map back to todayMissions
    const currentDayBlocks = updatedWeekly.filter((b: any) => b.dayIndex === currentDayIndex);
    
    // If no blocks were generated at all, preserve existing missions to prevent clearing out the dashboard on error
    let updatedTodayMissions;
    if (updatedWeekly.length === 0 && cleanedMissions.length > 0) {
      // Preserve existing missions if planner generated NOTHING AT ALL
      updatedTodayMissions = cleanedMissions;
    } else {
      updatedTodayMissions = currentDayBlocks.map((b: any) => {
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
          scheduledDate: (b as any).scheduledDate,
          scheduledTime: (b as any).scheduledTime
        };
      });
    }

    // Don't update customMissions - planner missions should stay separate
    await this.runtime.refresh('INIT', {
      scheduleOverrides: emptyOverrides,
      todayMissions: updatedTodayMissions,
      weeklySchedule: updatedWeekly
    });
  }

  async updateScheduleBlock(id: string, updates: { dayIndex?: number; timeSlot?: string; scheduledDate?: string; scheduledTime?: string }) {
    this.checkWriteBlock();
    
    // Support saving overrides for planner grid
    const overrides = { ...(this.state.scheduleOverrides || {}) };
    const baseId = id.replace('today-', '').replace('plan-', '');
    overrides[baseId] = {
      ...(overrides[baseId] || {}),
      ...updates
    };

    const updatedBlocks = (this.state.timeline || []).map(b => 
      (b.id === id || b.id === `mission-${baseId}`) ? { ...b, time: updates.timeSlot || b.time } : b
    );

    try {
      await UserRepository.updateUserProfile(this.userId, {
        scheduleOverrides: overrides
      });
      
      await this.runtime.refresh('INIT', { 
        scheduleOverrides: overrides,
        timeline: updatedBlocks as any 
      });
    } catch (err) {
      await this.handleWriteError(err, 'updateScheduleBlock');
    }
  }

  async resetCustomMissions() {
    this.checkWriteBlock();
    await this.runtime.refresh('INIT', { todayMissions: [] });
  }

  async extendSession(hours: number) {
    this.checkWriteBlock();
    const state = this.runtime.getState();
    if (!state.settings) return;

    const now = new Date();
    // Calculate new end time logically
    let currentHour = now.getHours();
    let currentMinute = now.getMinutes();

    let additionalMinutes = hours * 60;
    currentMinute += additionalMinutes;
    while (currentMinute >= 60) {
      currentHour += 1;
      currentMinute -= 60;
    }

    const newEndTime = `${(currentHour % 24).toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    now.setHours(0,0,0,0);
    const todayDateStr = getLocalDateKey(now);

    const updatedSettings = {
      ...state.settings,
      sessionExtensionDate: todayDateStr,
      sessionExtensionEnd: newEndTime
    };

    try {
      await UserRepository.updateUserProfile(this.userId, {
        settings: updatedSettings
      });
      await this.runtime.refresh('INIT', { settings: updatedSettings });
    } catch (err) {
      await this.handleWriteError(err, 'extendSession');
    }
  }
}
