import { StudyBrainRuntime } from '../runtime/StudyBrainRuntime';
import { ChapterRepository } from '../repositories/chapterRepository';
import { MistakeRepository } from '../repositories/mistakeRepository';
import { StudySessionRepository } from '../repositories/studySessionRepository';
import { TimelineRepository } from '../repositories/timelineRepository';
import { UserRepository } from '../repositories/userRepository';
import { MockResultRepository } from '../repositories/mockResultRepository';
import { MockTestRepository } from '../repositories/mockTestRepository';
import { CustomMissionRepository } from '../repositories/customMissionRepository';
import { TodayMission, SubjectId, TimelineBlock, Mistake, Chapter, StudySession, MentorProfile, PlannerOutputs, DailyCheckin, WeeklyCheckin, MonthlyObjective, MockResult } from '../types/index';
import { MockTest } from '../types/mockTest';
import { normalizeChapter } from '../utils/academicState';
import { calculateLevelFromXP } from '../utils/levelingCalculations';
import { collection, getDocs, writeBatch, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

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
    await this.runtime.refresh('SETTINGS_UPDATE', { lastSyncError: errorMsg });
    throw new Error(errorMsg);
  }

  async clearSyncError() {
    await this.runtime.refresh('SETTINGS_UPDATE', { lastSyncError: null });
  }

  async setActiveSubject(subject: SubjectId | 'all') {
    this.checkWriteBlock();
    try {
      await UserRepository.updateUserProfile(this.userId, { activeSubject: subject });
      await this.runtime.refresh('SETTINGS_UPDATE', { activeSubject: subject, lastSyncError: null });
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
    try {
      await UserRepository.updateUserProfile(this.userId, { energyLevel: level });
      await this.runtime.refresh('INIT', { energyLevel: level, plannerOutput: null, todayMissions: [], lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'setEnergyLevel');
    }
  }

  async setMissionModeActive(active: boolean) {
    this.checkWriteBlock();
    try {
      await UserRepository.updateUserProfile(this.userId, { isMissionModeActive: active });
      await this.runtime.refresh('SETTINGS_UPDATE', { isMissionModeActive: active, lastSyncError: null });
    } catch (err) {
      await this.handleWriteError(err, 'setMissionModeActive');
    }
  }

  async completeTask(taskId: string) {
    this.checkWriteBlock();
    const missionIndex = this.state.todayMissions.findIndex(m => m.id === taskId);
    if (missionIndex === -1) return;

    const mission = this.state.todayMissions[missionIndex];
    const isCompleting = !mission.completed;

    const updatedMissions = [...this.state.todayMissions];
    updatedMissions[missionIndex] = {
      ...mission,
      completed: isCompleting,
      unlocked: true
    };

    if (isCompleting && missionIndex + 1 < updatedMissions.length) {
      updatedMissions[missionIndex + 1] = {
        ...updatedMissions[missionIndex + 1],
        unlocked: true
      };
    }

    // Base mission XP: 50 (slower progression)
    const baseXp = 50;
    const gainedXp = mission.xp || baseXp;
    const deltaXp = isCompleting ? gainedXp : -gainedXp;
    
    const oldLevel = this.state.xp.level;
    const newXp = {
      ...this.state.xp,
      daily: Math.max(0, this.state.xp.daily + deltaXp),
      weekly: Math.max(0, this.state.xp.weekly + deltaXp),
      total: Math.max(0, this.state.xp.total + deltaXp)
    };

    // Calculate level using proper scaling formula from calculateLevelFromXP
    const { level: newLevel, nextLevelXP: xpNeededForNext } = calculateLevelFromXP(newXp.total);
    const newLevelValue = newLevel;
    newXp.level = newLevelValue;
    newXp.nextLevelXP = xpNeededForNext;

    // Streak Calculation (only when completing a task, not when unchecking)
    if (isCompleting) {
      const today = new Date().toISOString().split('T')[0];
      const lastActive = this.state.xp.lastActiveDate;
      
      if (!lastActive) {
        newXp.streak = 1;
      } else if (lastActive !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastActive === yesterdayStr) {
          newXp.streak = (this.state.xp.streak || 0) + 1;
        } else {
          // Missed a day, streak resets to 1 for today's action
          newXp.streak = 1;
        }
      }
      newXp.lastActiveDate = today;
    }

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
              currentLecture = Math.min(totalLectures, currentLecture + 1);
              theoryComplete = currentLecture >= totalLectures;
            }
            if (mission.type === 'Solve DPP') dppComplete = true;
            if (mission.type === 'Solve PYQs') pyqsComplete = true;
            if (mission.type === 'Revise Formulas' || mission.type === 'Review Mistakes') {
              revisionCount += 1;
              lastRevisionDaysAgo = 0;
            }
          } else {
            if (mission.type === 'Watch Lecture') {
              currentLecture = Math.max(0, currentLecture - 1);
              theoryComplete = false;
            }
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
            : { completedLectures: currentLecture, totalLectures };
          
          const updatedPracticeProgress = c.practiceProgress
            ? {
                ...c.practiceProgress,
                dppCompleted: dppComplete ? true : c.practiceProgress.dppCompleted,
                dppPercent: dppComplete ? 100 : c.practiceProgress.dppPercent,
                pyqsCompleted: pyqsComplete ? true : c.practiceProgress.pyqsCompleted,
                pyqPercent: pyqsComplete ? 100 : c.practiceProgress.pyqPercent,
              }
            : { 
                dppCompleted: dppComplete, 
                dppPercent: dppComplete ? 100 : 0,
                pyqsCompleted: pyqsComplete,
                pyqPercent: pyqsComplete ? 100 : 0
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
        UserRepository.updateUserProfile(this.userId, { xp: newXp })
      ];

      if (chapter) {
        const updatedChap = updatedChapters.find(c => c.id === chapter.id);
        if (updatedChap) {
          savePromises.push(ChapterRepository.saveChapter(this.userId, updatedChap));
        }
      }

      let updatedCustomMissions = this.state.customMissions;
      if (taskId.startsWith('custom-')) {
        const updatedCustomMission = updatedMissions[missionIndex];
        savePromises.push(CustomMissionRepository.saveMission(this.userId, updatedCustomMission));
        updatedCustomMissions = this.state.customMissions.map(cm => updatedMissions.find(um => um.id === cm.id) || cm);
      }

      // Trigger level-up event if applicable
      const levelUpData = oldLevel !== newLevel && isCompleting ? { oldLevel, newLevel, xp: newXp } : null;

      // Optimistic update - refresh UI immediately before saving
      await this.runtime.refresh('SESSION_UPDATE', {
        todayMissions: updatedMissions,
        customMissions: updatedCustomMissions,
        xp: newXp,
        chapters: updatedChapters,
        lastSyncError: null,
        levelUpData
      });

      await Promise.all(savePromises);
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
    const isCustom = taskId.startsWith('custom-');

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
      await UserRepository.updateUserProfile(this.userId, { deletedMissionIds: updatedDeletedMissionIds } as any);
      await this.runtime.refresh('SESSION_UPDATE', {
        todayMissions: updatedTodayMissions,
        customMissions: updatedCustomMissions,
        deletedMissionIds: updatedDeletedMissionIds,
        lastSyncError: null
      });
    } catch (err) {
      await this.handleWriteError(err, 'deleteMission');
    }
  }

  async addCustomMission(missionData: Omit<TodayMission, 'id' | 'completed' | 'unlocked'>) {
    this.checkWriteBlock();
    const newMission: TodayMission = {
      ...missionData,
      id: `custom-${Date.now()}`,
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
    } catch (err) {
      await this.handleWriteError(err, 'addCustomMission');
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
      // Always save to CustomMissionRepository to ensure persistence even for standard missions that were edited
      await CustomMissionRepository.saveMission(this.userId, updatedMission);
      
      if (isCustom) {
        updatedCustomMissions = this.state.customMissions.map(cm => cm.id === taskId ? updatedMission : cm);
      } else {
        // If it wasn't custom before, we make it custom so it persists across reloads
        updatedCustomMissions = [...this.state.customMissions, updatedMission];
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

    await this.runtime.refresh('SESSION_UPDATE', { todayMissions: updatedMissions });
  }

  async completeStudySession(sessionData: Partial<Omit<StudySession, 'id'>> & { focusTime?: number; questions?: number; correct?: number; idleTime?: number; focusInterruptions?: number; focusScore?: number; }) {
    this.checkWriteBlock();
    const duration = sessionData.duration ?? sessionData.focusTime ?? 0;
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
    try {
      await StudySessionRepository.saveStudySession(this.userId, session);
      const updatedSessions = [...this.state.studySessions, session];
      
      // Update analytics with the new session data
      const updatedAnalytics = {
        ...this.state.analytics,
        studyTime: this.state.analytics.studyTime + duration,
        focusTime: this.state.analytics.focusTime + duration,
        questionsSolved: this.state.analytics.questionsSolved + questionsSolved,
        accuracy: questionsSolved > 0 ? Math.round((this.state.analytics.accuracy + accuracy) / 2) : this.state.analytics.accuracy,
        tasksCompleted: this.state.analytics.tasksCompleted + 1,
        xpEarned: this.state.analytics.xpEarned + (session.xpEarned || 0)
      };
      
      // Update XP from session
      const oldLevel = this.state.xp.level;
      const newXp = {
        ...this.state.xp,
        total: this.state.xp.total + (session.xpEarned || 0),
        daily: this.state.xp.daily + (session.xpEarned || 0),
        weekly: this.state.xp.weekly + (session.xpEarned || 0)
      };
      
      // Calculate new level using LevelingSystem
      const { level: newLevel, nextLevelXP: xpNeededForNext } = require('../services/studyBrainService').LevelingSystem.calculateLevel(newXp.total);
      newXp.level = newLevel;
      newXp.nextLevelXP = xpNeededForNext;
      
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
      const revisionXP = confidence === 'High' ? 150 : confidence === 'Medium' ? 100 : 50;
      const oldLevel = this.state.xp.level;
      const newXp = {
        ...this.state.xp,
        total: this.state.xp.total + revisionXP,
        daily: this.state.xp.daily + revisionXP,
        weekly: this.state.xp.weekly + revisionXP
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
      const revisionCount = (chapter.revisionCount || 0) + 1;
      
      let quality = 0;
      if (confidence === 'High') quality = 5;
      else if (confidence === 'Medium') quality = 3;
      else quality = 1;
      
      if (quality >= 3) {
        if (revisionCount === 1) {
          interval = 1;
        } else if (revisionCount === 2) {
          interval = 6;
        } else {
          interval = Math.round(interval * easeFactor);
        }
      } else {
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

    // Award XP for mock test completion based on score
    const scorePercent = (result.totalScore / (result.totalQuestions * 4)) * 100; // Assuming 4 marks per question
    const mockXP = Math.round(200 + (scorePercent / 100) * 300); // Base 200 XP + up to 300 bonus for high scores

    const oldLevel = this.state.xp.level;
    const newXp = {
      ...this.state.xp,
      total: this.state.xp.total + mockXP,
      daily: this.state.xp.daily + mockXP,
      weekly: this.state.xp.weekly + mockXP
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
    const newTest = { ...testData, id: testData.id || `custom-${Date.now()}` };
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
    const newMistake = { ...mistake, id: Date.now().toString(), createdAt: new Date().toISOString() };
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
      await UserRepository.updateUserProfile(this.userId, { deletedMissionIds: [] } as any);
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
      nextLevelXP: 1000,
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
          const batch = writeBatch(db);
          snapshot.docs.forEach(docSnap => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      } catch (err) {
        console.error(`Error deleting collection ${colName}:`, err);
      }
    }

    try {
      await deleteDoc(doc(db, 'users', this.userId));
    } catch (err) {
      console.error(`Error deleting user document ${this.userId}:`, err);
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
          const batch = writeBatch(db);
          snapshot.docs.forEach(docSnap => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      } catch (err) {
        console.error(`Error deleting collection ${colName}:`, err);
      }
    }

    // 2. Reset user document
    const initialProfile = {
      xp: { daily: 0, weekly: 0, total: 0, level: 1, streak: 0, nextLevelXP: 1000 },
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
        id: `custom-${Date.now()}`,
        subject: block as any,
        chapter: (arg1 || '').trim().substring(0, 80),
        activity: (arg2 || '').trim().substring(0, 150),
        time: (arg3 || '').trim().substring(0, 25),
        completed: false
      };
    } else {
      newBlock = {
        ...block,
        id: `custom-${Date.now()}`,
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
          targetDate: new Date().toISOString().split('T')[0],
          description: 'Zero assumptions. Confirm all pending vs completed lecture modules.',
          status: 'achieved' as const
        },
        {
          id: 'ms-2',
          title: 'Full Syllabus Coverage Lock',
          targetDate: opt?.predictedCompletionDate?.split('T')[0] || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          description: 'Master Tier-1 weightage chapters across Physics, Chemistry, and Maths.',
          status: 'pending' as const
        },
        {
          id: 'ms-3',
          title: 'Full Mock Test Simulation & Percentile Audit',
          targetDate: new Date(predTime + 15 * 86400000).toISOString().split('T')[0],
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
}
