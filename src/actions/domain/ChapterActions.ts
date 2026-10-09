import { BaseActions } from './BaseActions';
import { Chapter, SubjectId, Mistake, StudySession } from '@/types/index';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { UserRepository } from '@/repositories/userRepository';
import { MistakeRepository } from '@/repositories/mistakeRepository';
import { CustomMissionRepository } from '@/repositories/customMissionRepository';
import { StudySessionRepository } from '@/repositories/studySessionRepository';
import { normalizeChapter } from '@jee-os/engines';
import { calculateLevelFromXP } from '@/utils/levelingCalculations';
import { SpacedRepetitionEngine } from '@jee-os/engines';
import { sanitizeForFirestore } from '@/utils/firestoreSanitizer';
import { doc } from 'firebase/firestore';
import { db } from '@/firebase';

export class ChapterActions extends BaseActions {
  private sm2Engine = new SpacedRepetitionEngine();

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

    if (merged.completion === 100) {
      merged.status = 'Mastered';
      merged.syllabusStage = 'Mastered';
    } else if (merged.completion > 0 && (!merged.status || merged.status === 'Not Started')) {
      merged.status = 'Learning';
      merged.syllabusStage = 'Watching Lectures';
    }

    const updatedChapter = normalizeChapter(merged);
    const updatedChapters = this.state.chapters.map(c => (c.id === chapter.id ? updatedChapter : c));

    this.runtime.updateStateOptimistic({
      chapters: updatedChapters
    });

    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      this.runtime.rollbackChapter(chapter.id, chapter);
      await this.handleWriteError(err, 'updateChapter');
    }
  }

  openChapterEditModal(chapterId: string) {
    this.runtime.updateStateOptimistic({ activeEditChapterId: chapterId });
  }

  closeChapterEditModal() {
    this.runtime.updateStateOptimistic({ activeEditChapterId: null });
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

    let serialNumber = input.serialNumber;
    if (!serialNumber) {
      const subjectChapters = this.state.chapters.filter(c => c.subject === input.subject);
      let maxNum = 0;
      subjectChapters.forEach(ch => {
        if (ch.serialNumber?.startsWith('CH')) {
          const numStr = ch.serialNumber.slice(2);
          const num = parseInt(numStr, 10);
          if (!Number.isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      serialNumber = `CH${maxNum + 1}`;
    } else {
      serialNumber = serialNumber.startsWith('CH') ? serialNumber : `CH${serialNumber}`;
    }

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

    this.runtime.updateStateOptimistic({
      chapters: updatedChapters
    });

    try {
      await ChapterRepository.saveChapter(this.userId, newChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      this.runtime.rollbackChapter(newChapter.id, null);
      await this.handleWriteError(err, 'addCustomChapter');
    }
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
      const newLec = typeof updates === 'number' ? updates : chapter.currentLecture;
      updatedChapter = normalizeChapter({
        ...chapter,
        currentLecture: newLec,
        lectureProgress: chapter.lectureProgress ? { ...chapter.lectureProgress, completedLectures: newLec } : undefined,
        theoryComplete: theoryComplete !== undefined ? theoryComplete : chapter.theoryComplete,
        dppComplete: dppComplete !== undefined ? dppComplete : chapter.dppComplete,
        pyqsComplete: pyqsComplete !== undefined ? pyqsComplete : chapter.pyqsComplete
      });
    }

    const totalLectures = updatedChapter.totalLectures || 12;
    if (updatedChapter.currentLecture !== undefined) {
      updatedChapter.currentLecture = Math.min(Math.max(0, updatedChapter.currentLecture), totalLectures);
      if (updatedChapter.lectureProgress) {
        updatedChapter.lectureProgress.completedLectures = updatedChapter.currentLecture;
      }
    }

    const updatedChapters = this.state.chapters.map(c => (c.id === chapter.id ? updatedChapter : c));

    this.runtime.updateStateOptimistic({
      chapters: updatedChapters
    });

    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      this.runtime.rollbackChapter(chapter.id, chapter);
      await this.handleWriteError(err, 'updateChapterProgress');
    }
  }

  async completeRevision(cardIdOrChapterId: string, confidence: 'Low' | 'Medium' | 'High') {
    this.checkWriteBlock();
    let chapter = this.state.chapters.find(c => c.id === cardIdOrChapterId);
    if (!chapter) {
      chapter = this.state.chapters.find(c =>
        Boolean((c as { flashcards?: Array<{ id: string }> }).flashcards?.some(f => f.id === cardIdOrChapterId)) ||
        cardIdOrChapterId.startsWith(`${c.id}_`) ||
        cardIdOrChapterId.includes(c.id)
      );
    }
    if (chapter) {
      const confScore = confidence === 'High' ? 100 : confidence === 'Medium' ? 70 : 40;

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

      const { level: newLevel, nextLevelXP: xpNeededForNext } = calculateLevelFromXP(newXp.total);
      newXp.level = newLevel;
      newXp.nextLevelXP = xpNeededForNext;

      const levelUpData = oldLevel !== newLevel ? { oldLevel, newLevel, xp: newXp } : null;
      
      let quality = 1;
      if (confidence === 'High') quality = 5;
      else if (confidence === 'Medium') quality = 3;

      const sm2Result = this.sm2Engine.calculateNextReview(quality, {
        repetitions: chapter.revisionCount || 0,
        easeFactor: chapter.sm2EaseFactor ?? 2.5,
        interval: chapter.sm2Interval ?? 0,
      });

      const nextStatus = chapter.status === 'Revision Due'
        ? (chapter.theoryComplete ? 'Theory Complete' : 'Learning')
        : chapter.status;

      const updatedChapter: Chapter = { 
        ...chapter, 
        status: nextStatus,
        revisionCount: sm2Result.repetitions,
        confidence: confScore,
        lastRevisionDaysAgo: 0,
        revisionProgress: {
          formulaMemoryPercent: confidence === 'High' ? 95 : confidence === 'Medium' ? 70 : 40,
          questionSolvingConfidencePercent: chapter.revisionProgress?.questionSolvingConfidencePercent || 80,
          needRevision: confidence === 'Low',
          retentionScore: confScore,
          ...(chapter.revisionProgress || {}),
          lastRevisedDaysAgo: 0,
          retentionConfidence: confidence,
          lastRevisedAt: new Date().toISOString()
        },
        sm2EaseFactor: sm2Result.easeFactor,
        sm2Interval: sm2Result.interval,
        nextRevisionDueAt: sm2Result.nextReviewDate,
        lastRevisedAt: new Date().toISOString()
      };

      // Synchronize matching todayMissions: mark them completed
      const chapterIdStr = chapter.id;
      const chapterNameLower = chapter.name.toLowerCase();

      let hasMissionChanges = false;
      let updatedCompletedPlannerMissionIds = Array.from(new Set(this.state.completedPlannerMissionIds || []));
      const updatedCustomMissions = [...this.state.customMissions];

      const updatedTodayMissions = this.state.todayMissions.map(m => {
        const matchesChapter = (m.chapterId && m.chapterId === chapterIdStr) ||
          (m.chapter && m.chapter.toLowerCase() === chapterNameLower) ||
          (m.chapterName && m.chapterName.toLowerCase() === chapterNameLower);
        const isRevisionType = m.type === 'Revise Formulas' || m.type === 'Review Mistakes' ||
          (m.taskName?.toLowerCase().includes('revise'));

        if (matchesChapter && isRevisionType && !m.completed) {
          hasMissionChanges = true;
          const isCustom = updatedCustomMissions.some(cm => cm.id === m.id);
          const updatedM = {
            ...m,
            completed: true,
            unlocked: true
          };
          if (isCustom) {
            const cIdx = updatedCustomMissions.findIndex(cm => cm.id === m.id);
            if (cIdx !== -1) updatedCustomMissions[cIdx] = updatedM;
          } else {
            updatedCompletedPlannerMissionIds = Array.from(new Set([...updatedCompletedPlannerMissionIds, m.id])).slice(-1000);
          }
          return updatedM;
        }
        return m;
      });

      // Record a canonical StudySession for this revision
      const now = new Date();
      const sessionId = `session-${Date.now()}`;
      const sessionPayload: StudySession = {
        id: sessionId,
        startTime: new Date(now.getTime() - 15 * 60000).toISOString(),
        endTime: now.toISOString(),
        duration: 15,
        type: 'Revision',
        subjectId: chapter.subject,
        chapterId: chapter.id,
        xpEarned: revisionXP
      };
      const updatedStudySessions = [sessionPayload, ...this.state.studySessions];

      const originalSnapshot = {
        chapters: this.state.chapters,
        xp: this.state.xp,
        todayMissions: this.state.todayMissions,
        customMissions: this.state.customMissions,
        completedPlannerMissionIds: this.state.completedPlannerMissionIds,
        studySessions: this.state.studySessions
      };

      try {
        const updatedChapters = this.state.chapters.map(c => c.id === chapter.id ? updatedChapter : c);
        
        this.runtime.updateStateOptimistic({
          chapters: updatedChapters,
          xp: newXp,
          todayMissions: updatedTodayMissions,
          customMissions: updatedCustomMissions,
          completedPlannerMissionIds: updatedCompletedPlannerMissionIds,
          studySessions: updatedStudySessions,
          ...(levelUpData ? { levelUpData } : {})
        });

        if (!this.isGuestUser()) {
          const promises: Promise<any>[] = [
            UserRepository.updateUserProfile(this.userId, { 
              xp: newXp,
              completedPlannerMissionIds: updatedCompletedPlannerMissionIds 
            }),
            ChapterRepository.saveChapter(this.userId, updatedChapter),
            StudySessionRepository.saveStudySession(this.userId, sessionPayload)
          ];
          if (hasMissionChanges) {
            updatedCustomMissions.forEach(cm => {
              if (this.state.todayMissions.some(m => m.id === cm.id && !m.completed && updatedTodayMissions.find(u => u.id === cm.id)?.completed)) {
                promises.push(CustomMissionRepository.saveMission(this.userId, cm));
              }
            });
          }
          await Promise.all(promises);
        }

        await this.runtime.refresh('CHAPTER_UPDATE', { 
          chapters: updatedChapters, 
          xp: newXp, 
          todayMissions: updatedTodayMissions,
          customMissions: updatedCustomMissions,
          completedPlannerMissionIds: updatedCompletedPlannerMissionIds,
          studySessions: updatedStudySessions,
          lastSyncError: null, 
          levelUpData 
        });
      } catch (err) {
        this.runtime.updateStateOptimistic(originalSnapshot);
        await this.handleWriteError(err, 'completeRevision');
      }
    }
  }

  async gradeFlashcardsBatch(grades: Array<{ cardId: string; chapterId: string; quality: number }>) {
    this.checkWriteBlock();
    if (!grades || grades.length === 0) return;

    const smEngine = new SpacedRepetitionEngine();

    // Group grades by chapterId
    const gradesByChapter = new Map<string, Array<{ cardId: string; quality: number }>>();
    grades.forEach(g => {
      if (!gradesByChapter.has(g.chapterId)) {
        gradesByChapter.set(g.chapterId, []);
      }
      gradesByChapter.get(g.chapterId)!.push({ cardId: g.cardId, quality: g.quality });
    });

    let totalFlashcardXP = 0;
    const modifiedChaptersMap = new Map<string, Chapter>();
    const modifiedMistakesMap = new Map<string, Mistake>();

    gradesByChapter.forEach((cardGrades, chapterId) => {
      const chapter = this.state.chapters.find(c => c.id === chapterId);
      if (!chapter) return;

      const currentFlashcardStates = { ...(chapter.flashcardStates || {}) };

      cardGrades.forEach(({ cardId, quality }) => {
        const existingState = currentFlashcardStates[cardId] || 
          smEngine.legacyConfidenceToState(
            chapter.revisionProgress?.retentionConfidence || 
            (chapter.confidence > 80 ? 'High' : chapter.confidence > 40 ? 'Medium' : 'Low')
          );

        const newState = smEngine.calculateNextReview(quality, existingState);
        const updatedCardState = {
          ...newState,
          lastReviewDate: new Date().toISOString()
        };

        currentFlashcardStates[cardId] = updatedCardState;

        const baseFlashcardXP = quality >= 3 ? 10 : 5;
        const cardXP = this.isGodModeActive() ? Math.floor(baseFlashcardXP * 1.5) : baseFlashcardXP;
        totalFlashcardXP += cardXP;

        // If card is a student mistake card, advance mistake status
        if (cardId.startsWith('m-')) {
          const mistakeId = cardId.replace(/^m-/, '');
          const mistake = this.state.mistakes.find(m => m.id === mistakeId);
          if (mistake) {
            let nextStatus = mistake.revisionStatus;
            if (quality >= 4 && updatedCardState.repetitions >= 3) {
              nextStatus = 'Mastered';
            } else if (quality >= 3 && mistake.revisionStatus === 'New') {
              nextStatus = 'Reviewed';
            } else if (quality >= 4 && mistake.revisionStatus === 'Reviewed' && updatedCardState.repetitions >= 1) {
              nextStatus = 'Solved Again';
            }

            if (nextStatus !== mistake.revisionStatus) {
              const updatedMistake: Mistake = {
                ...mistake,
                revisionStatus: nextStatus,
                confidence: Math.min(100, Math.max(mistake.confidence || 0, quality >= 4 ? 85 : 65))
              };
              modifiedMistakesMap.set(mistakeId, updatedMistake);
            }
          }
        }
      });

      const avgQuality = Math.round(cardGrades.reduce((sum, g) => sum + g.quality, 0) / cardGrades.length);
      const chapterSm2 = smEngine.calculateNextReview(avgQuality, {
        repetitions: chapter.revisionCount || 0,
        easeFactor: chapter.sm2EaseFactor ?? 2.5,
        interval: chapter.sm2Interval ?? 0,
      });

      const nextStatus = chapter.status === 'Revision Due'
        ? (chapter.theoryComplete ? 'Theory Complete' : 'Learning')
        : chapter.status;

      const nowIso = new Date().toISOString();
      const confLabel: 'High' | 'Medium' | 'Low' =
        avgQuality >= 4 ? 'High' : avgQuality >= 3 ? 'Medium' : 'Low';

      modifiedChaptersMap.set(chapterId, {
        ...chapter,
        status: nextStatus,
        revisionCount: chapterSm2.repetitions,
        sm2EaseFactor: chapterSm2.easeFactor,
        sm2Interval: chapterSm2.interval,
        nextRevisionDueAt: chapterSm2.nextReviewDate,
        lastRevisedAt: nowIso,
        lastRevisionDaysAgo: 0,
        revisionProgress: {
          formulaMemoryPercent: avgQuality >= 4 ? 95 : avgQuality >= 3 ? 70 : 40,
          questionSolvingConfidencePercent: chapter.revisionProgress?.questionSolvingConfidencePercent || 80,
          needRevision: avgQuality < 3,
          retentionScore: avgQuality >= 4 ? 100 : avgQuality >= 3 ? 70 : 40,
          ...(chapter.revisionProgress || {}),
          lastRevisedDaysAgo: 0,
          retentionConfidence: confLabel,
          lastRevisedAt: nowIso
        },
        flashcardStates: currentFlashcardStates
      });
    });

    if (modifiedChaptersMap.size === 0) return;

    const oldLevel = this.state.xp.level;
    const baseXpState = this.getResetXpBase();
    const newXp = {
      ...baseXpState,
      total: baseXpState.total + totalFlashcardXP,
      daily: baseXpState.daily + totalFlashcardXP,
      weekly: baseXpState.weekly + totalFlashcardXP,
      monthly: (baseXpState.monthly || 0) + totalFlashcardXP
    };
    const { level: newLevel, nextLevelXP: xpNeededForNext } = calculateLevelFromXP(newXp.total);
    newXp.level = newLevel;
    newXp.nextLevelXP = xpNeededForNext;

    const levelUpData = oldLevel !== newLevel ? { oldLevel, newLevel, xp: newXp } : null;

    const updatedChapters = this.state.chapters.map(c => modifiedChaptersMap.get(c.id) || c);
    const updatedMistakes = modifiedMistakesMap.size > 0
      ? this.state.mistakes.map(m => modifiedMistakesMap.get(m.id) || m)
      : this.state.mistakes;

    // Synchronize matching todayMissions for modified chapters
    const modifiedChapterIds = new Set(modifiedChaptersMap.keys());
    const modifiedChapterNames = new Set(Array.from(modifiedChaptersMap.values()).map(c => c.name.toLowerCase()));

    let hasMissionChanges = false;
    let updatedCompletedPlannerMissionIds = Array.from(new Set(this.state.completedPlannerMissionIds || []));
    const updatedCustomMissions = [...this.state.customMissions];

    const updatedTodayMissions = this.state.todayMissions.map(m => {
      const matchesChapter = (m.chapterId && modifiedChapterIds.has(m.chapterId)) ||
        (m.chapter && modifiedChapterNames.has(m.chapter.toLowerCase())) ||
        (m.chapterName && modifiedChapterNames.has(m.chapterName.toLowerCase()));
      const isRevisionType = m.type === 'Revise Formulas' || m.type === 'Review Mistakes' ||
        (m.taskName?.toLowerCase().includes('revise'));

      if (matchesChapter && isRevisionType && !m.completed) {
        hasMissionChanges = true;
        const isCustom = updatedCustomMissions.some(cm => cm.id === m.id);
        const updatedM = {
          ...m,
          completed: true,
          unlocked: true
        };
        if (isCustom) {
          const cIdx = updatedCustomMissions.findIndex(cm => cm.id === m.id);
          if (cIdx !== -1) updatedCustomMissions[cIdx] = updatedM;
        } else {
          updatedCompletedPlannerMissionIds = Array.from(new Set([...updatedCompletedPlannerMissionIds, m.id])).slice(-1000);
        }
        return updatedM;
      }
      return m;
    });

    // Record StudySession
    const now = new Date();
    const primaryChap = Array.from(modifiedChaptersMap.values())[0];
    const sessionId = `session-${Date.now()}`;
    const sessionPayload: StudySession = {
      id: sessionId,
      startTime: new Date(now.getTime() - 15 * 60000).toISOString(),
      endTime: now.toISOString(),
      duration: 15,
      type: 'Revision',
      subjectId: primaryChap?.subject || 'physics',
      chapterId: primaryChap?.id,
      xpEarned: totalFlashcardXP
    };
    const updatedStudySessions = [sessionPayload, ...this.state.studySessions];

    const originalSnapshot = {
      chapters: this.state.chapters,
      xp: this.state.xp,
      mistakes: this.state.mistakes,
      todayMissions: this.state.todayMissions,
      customMissions: this.state.customMissions,
      completedPlannerMissionIds: this.state.completedPlannerMissionIds,
      studySessions: this.state.studySessions
    };

    this.runtime.updateStateOptimistic({
      chapters: updatedChapters,
      xp: newXp,
      mistakes: updatedMistakes,
      todayMissions: updatedTodayMissions,
      customMissions: updatedCustomMissions,
      completedPlannerMissionIds: updatedCompletedPlannerMissionIds,
      studySessions: updatedStudySessions,
      ...(levelUpData ? { levelUpData } : {})
    });

    try {
      if (!this.isGuestUser()) {
        const promises: Promise<any>[] = [
          UserRepository.updateUserProfile(this.userId, { 
            xp: newXp,
            completedPlannerMissionIds: updatedCompletedPlannerMissionIds 
          }),
          StudySessionRepository.saveStudySession(this.userId, sessionPayload)
        ];
        modifiedChaptersMap.forEach(chap => {
          promises.push(ChapterRepository.saveChapter(this.userId, chap));
        });
        modifiedMistakesMap.forEach(mst => {
          promises.push(MistakeRepository.updateMistake(this.userId, mst.id, {
            revisionStatus: mst.revisionStatus,
            confidence: mst.confidence
          }));
        });
        if (hasMissionChanges) {
          updatedCustomMissions.forEach(cm => {
            if (this.state.todayMissions.some(m => m.id === cm.id && !m.completed && updatedTodayMissions.find(u => u.id === cm.id)?.completed)) {
              promises.push(CustomMissionRepository.saveMission(this.userId, cm));
            }
          });
        }
        await Promise.all(promises);
      }
      await this.runtime.refresh('CHAPTER_UPDATE', { 
        chapters: updatedChapters, 
        xp: newXp, 
        mistakes: updatedMistakes,
        todayMissions: updatedTodayMissions,
        customMissions: updatedCustomMissions,
        completedPlannerMissionIds: updatedCompletedPlannerMissionIds,
        studySessions: updatedStudySessions,
        lastSyncError: null, 
        levelUpData 
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'gradeFlashcardsBatch');
    }
  }

  async gradeFlashcard(cardId: string, chapterId: string, quality: number) {
    return this.gradeFlashcardsBatch([{ cardId, chapterId, quality }]);
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

    const updatedChapters = this.state.chapters.map(c => c.id === chapterId ? updatedChapter : c);

    this.runtime.updateStateOptimistic({
      chapters: updatedChapters
    });

    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      this.runtime.rollbackChapter(chapterId, chapter);
      await this.handleWriteError(err, 'toggleChapterStatus');
    }
  }

  async updateChapterStatus(chapterId: string, status: Chapter['status']) {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const updatedChapter = { ...chapter, status };

    const updatedChapters = this.state.chapters.map(c => c.id === chapterId ? updatedChapter : c);

    this.runtime.updateStateOptimistic({
      chapters: updatedChapters
    });

    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      this.runtime.rollbackChapter(chapterId, chapter);
      await this.handleWriteError(err, 'updateChapterStatus');
    }
  }

  async updateChapterData(chapterId: string, updates: Partial<Chapter>) {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    const updatedChapter = normalizeChapter({ ...chapter, ...updates });

    const updatedChapters = this.state.chapters.map(c => c.id === chapterId ? updatedChapter : c);
    this.runtime.updateStateOptimistic({ chapters: updatedChapters });

    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      this.runtime.rollbackChapter(chapterId, chapter);
      await this.handleWriteError(err, 'updateChapterData');
    }
  }

  async deleteChapter(chapterId: string) {
    this.checkWriteBlock();
    const chapter = this.state.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const originalSnapshot = {
      chapters: this.state.chapters,
      mistakes: this.state.mistakes,
      notes: this.state.notes,
      todayMissions: this.state.todayMissions,
      customMissions: this.state.customMissions,
      timeline: this.state.timeline
    };

    const updatedChapters = this.state.chapters
      .filter(c => c.id !== chapterId)
      .map(c => {
        if (c.dependencies?.includes(chapterId)) {
          return {
            ...c,
            dependencies: c.dependencies.filter(d => d !== chapterId)
          };
        }
        return c;
      });

    const associatedMistakes = (this.state.mistakes || []).filter(m => 
      m.chapterId === chapterId || (chapter.name && m.chapter === chapter.name)
    );
    const updatedMistakes = (this.state.mistakes || []).filter(m => 
      m.chapterId !== chapterId && (!chapter.name || m.chapter !== chapter.name)
    );

    const associatedNotes = (this.state.notes || []).filter(n => 
      n.chapter === chapterId || (chapter.name && n.chapter === chapter.name)
    );
    const updatedNotes = (this.state.notes || []).filter(n => 
      n.chapter !== chapterId && (!chapter.name || n.chapter !== chapter.name)
    );

    const associatedCustomMissions = (this.state.customMissions || []).filter(cm => cm.chapterId === chapterId);
    const updatedCustomMissions = (this.state.customMissions || []).filter(cm => cm.chapterId !== chapterId);

    const updatedTodayMissions = (this.state.todayMissions || []).filter(m => 
      m.chapterId !== chapterId && (!chapter.name || (m.chapter !== chapter.name && m.chapterName !== chapter.name))
    );
    const updatedTimeline = (this.state.timeline || []).filter(t => 
      t.chapter !== chapterId && (!chapter.name || t.chapter !== chapter.name)
    );

    this.runtime.updateStateOptimistic({
      chapters: updatedChapters,
      mistakes: updatedMistakes,
      notes: updatedNotes,
      todayMissions: updatedTodayMissions,
      customMissions: updatedCustomMissions,
      timeline: updatedTimeline
    });

    try {
      await this.runAtomicBatch((batch) => {
        const chapterDoc = doc(db, 'users', this.userId, 'chapters', chapterId);
        batch.delete(chapterDoc);

        associatedMistakes.forEach(m => {
          const mDoc = doc(db, 'users', this.userId, 'mistakes', m.id);
          batch.delete(mDoc);
        });

        associatedNotes.forEach(n => {
          const nDoc = doc(db, 'users', this.userId, 'notes', n.id);
          batch.delete(nDoc);
        });

        associatedCustomMissions.forEach(cm => {
          const cmDoc = doc(db, 'users', this.userId, 'customMissions', cm.id);
          batch.delete(cmDoc);
        });

        updatedChapters.forEach(c => {
          const orig = originalSnapshot.chapters.find(oc => oc.id === c.id);
          if (orig?.dependencies?.includes(chapterId)) {
            const cDoc = doc(db, 'users', this.userId, 'chapters', c.id);
            batch.set(cDoc, sanitizeForFirestore({ dependencies: c.dependencies }), { merge: true });
          }
        });
      }, 'deleteChapter');

      await this.runtime.refresh('CHAPTER_UPDATE', { 
        chapters: updatedChapters, 
        mistakes: updatedMistakes,
        notes: updatedNotes,
        todayMissions: updatedTodayMissions,
        customMissions: updatedCustomMissions,
        timeline: updatedTimeline,
        lastSyncError: null 
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'deleteChapter');
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

    this.runtime.updateStateOptimistic({
      chapters: updatedChapters
    });

    try {
      await ChapterRepository.saveChapter(this.userId, updatedChapter);
      await this.runtime.refresh('CHAPTER_UPDATE', { chapters: updatedChapters, lastSyncError: null });
    } catch (err) {
      this.runtime.rollbackChapter(chapterId, chap);
      await this.handleWriteError(err, 'updateChapterDetailedDiagnosis');
    }
  }
}
