import { BaseActions } from './BaseActions';
import { Mistake } from '@/types/index';
import { MistakeRepository } from '@/repositories/mistakeRepository';
import { UserRepository } from '@/repositories/userRepository';
import { uploadBase64Image } from '@/utils/imageUploadUtils';
import { calculateLevelFromXP } from '@/utils/levelingCalculations';
import { sanitizeForFirestore } from '@/utils/firestoreSanitizer';
import { doc } from 'firebase/firestore';
import { db } from '@/firebase';

export class MistakeActions extends BaseActions {
  async addMistake(mistake: Omit<Mistake, 'id'>) {
    this.checkWriteBlock();

    // Check for duplicate mistake (same question and concept)
    const isDuplicate = this.state.mistakes.some(m => 
      m.questionText?.trim() === mistake.questionText?.trim() && 
      m.topic?.trim() === mistake.topic?.trim() &&
      m.chapterId === mistake.chapterId
    );
    if (isDuplicate) {
      console.warn('Duplicate mistake detected. Skipping addition.');
      return;
    }
    
    // Process images
    let wrongSolutionImage = mistake.wrongSolutionImage;
    let correctSolutionImage = mistake.correctSolutionImage;
    
    try {
      if (wrongSolutionImage && wrongSolutionImage.startsWith('data:image')) {
        wrongSolutionImage = await uploadBase64Image(this.userId, wrongSolutionImage, 'mistakes');
      }
      if (correctSolutionImage && correctSolutionImage.startsWith('data:image')) {
        correctSolutionImage = await uploadBase64Image(this.userId, correctSolutionImage, 'mistakes');
      }
    } catch (e) {
      console.warn("Failed to upload images, continuing without them", e);
      wrongSolutionImage = undefined;
      correctSolutionImage = undefined;
    }

    const newMistake: Mistake = {
      ...mistake,
      wrongSolutionImage,
      correctSolutionImage,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      dateLogged: mistake.dateLogged || new Date().toISOString()
    };
    const originalSnapshot = {
      mistakes: this.state.mistakes
    };
    const updatedMistakes = [...this.state.mistakes, newMistake];
    this.runtime.updateStateOptimistic({ mistakes: updatedMistakes });
    try {
      if (!this.isGuestUser()) {
        await MistakeRepository.saveMistake(this.userId, newMistake);
      }
      await this.runtime.refresh('MISTAKE_UPDATE', { mistakes: updatedMistakes, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'addMistake');
    }
  }

  async addMistakesBatch(mistakesList: Array<Omit<Mistake, 'id'> | Mistake>) {
    this.checkWriteBlock();
    if (!mistakesList || mistakesList.length === 0) return;

    // Filter out duplicates against existing state and within the batch
    const existingMistakes = this.state.mistakes;
    const validatedNewMistakes: Mistake[] = [];

    for (const mistake of mistakesList) {
      const isDuplicate = existingMistakes.some(m => 
        m.questionText?.trim() === mistake.questionText?.trim() && 
        m.topic?.trim() === mistake.topic?.trim() &&
        m.chapterId === mistake.chapterId
      ) || validatedNewMistakes.some(m =>
        m.questionText?.trim() === mistake.questionText?.trim() &&
        m.topic?.trim() === mistake.topic?.trim() &&
        m.chapterId === mistake.chapterId
      );

      if (!isDuplicate) {
        const id = ('id' in mistake && mistake.id) 
          ? mistake.id 
          : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
        const dateLogged = ('dateLogged' in mistake && mistake.dateLogged)
          ? mistake.dateLogged
          : new Date().toISOString();

        validatedNewMistakes.push({
          ...mistake,
          id,
          dateLogged
        } as Mistake);
      }
    }

    if (validatedNewMistakes.length === 0) return;

    const originalSnapshot = {
      mistakes: this.state.mistakes
    };

    const updatedMistakes = [...this.state.mistakes, ...validatedNewMistakes];
    this.runtime.updateStateOptimistic({ mistakes: updatedMistakes });

    try {
      if (!this.isGuestUser()) {
        await MistakeRepository.saveMistakesBatch(this.userId, validatedNewMistakes);
      }
      await this.runtime.refresh('MISTAKE_UPDATE', { mistakes: updatedMistakes, lastSyncError: null });
      this.triggerToast('Mistakes Logged', `Saved ${validatedNewMistakes.length} mistakes to Mistakes Vault`, 'success');
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'addMistakesBatch');
    }
  }

  async updateMistakeStatus(mistakeId: string, status: Mistake['revisionStatus']) {
    this.checkWriteBlock();
    const mistake = this.state.mistakes.find(m => m.id === mistakeId);
    if (!mistake) return;

    const wasResolved = mistake.revisionStatus === 'Solved Again' || mistake.revisionStatus === 'Mastered';
    const isNowResolved = status === 'Solved Again' || status === 'Mastered';

    let deltaXp = 0;
    if (!wasResolved && isNowResolved) {
      const baseXP = 60;
      deltaXp = this.isGodModeActive() ? Math.floor(baseXP * 1.5) : baseXP;
    }

    const updatedMistake: Mistake = {
      ...mistake,
      revisionStatus: status,
      recoveryScore: isNowResolved ? Math.max(mistake.recoveryScore || 0, status === 'Mastered' ? 100 : 70) : mistake.recoveryScore
    };

    let newXp = this.state.xp;
    if (deltaXp > 0) {
      const baseXpState = this.getResetXpBase();
      newXp = {
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
    }

    const originalSnapshot = {
      mistakes: this.state.mistakes,
      xp: { ...this.state.xp }
    };

    const updatedMistakes = this.state.mistakes.map(m => m.id === mistakeId ? updatedMistake : m);
    this.runtime.updateStateOptimistic({
      mistakes: updatedMistakes,
      xp: newXp
    });

    try {
      await this.runAtomicBatch((batch) => {
        const mistakeDoc = doc(db, 'users', this.userId, 'mistakes', updatedMistake.id);
        batch.set(mistakeDoc, sanitizeForFirestore(updatedMistake), { merge: true });
        if (deltaXp !== 0) {
          const userDoc = doc(db, 'users', this.userId);
          batch.set(userDoc, sanitizeForFirestore({ xp: newXp }), { merge: true });
        }
      }, 'updateMistakeStatus');

      await this.runtime.refresh('MISTAKE_UPDATE', { 
        mistakes: updatedMistakes, 
        xp: newXp, 
        lastSyncError: null 
      });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'updateMistakeStatus');
    }
  }

  async deleteMistake(mistakeId: string) {
    this.checkWriteBlock();
    if (!mistakeId) return;
    const originalSnapshot = {
      mistakes: this.state.mistakes
    };
    const updatedMistakes = this.state.mistakes.filter(m => m.id !== mistakeId);
    this.runtime.updateStateOptimistic({ mistakes: updatedMistakes });
    try {
      if (!this.isGuestUser()) {
        await MistakeRepository.deleteMistake(this.userId, mistakeId);
      }
      await this.runtime.refresh('MISTAKE_UPDATE', { mistakes: updatedMistakes, lastSyncError: null });
      this.triggerToast('Mistake Deleted', 'Removed from Mistakes Vault', 'info');
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'deleteMistake');
    }
  }

  async deleteMistakesBatch(mistakeIds: string[]) {
    this.checkWriteBlock();
    if (!mistakeIds || mistakeIds.length === 0) return;
    const idsSet = new Set(mistakeIds);
    const originalSnapshot = {
      mistakes: this.state.mistakes
    };
    const updatedMistakes = this.state.mistakes.filter(m => !idsSet.has(m.id));
    this.runtime.updateStateOptimistic({ mistakes: updatedMistakes });
    try {
      if (!this.isGuestUser()) {
        await MistakeRepository.deleteMistakesBatch(this.userId, mistakeIds);
      }
      await this.runtime.refresh('MISTAKE_UPDATE', { mistakes: updatedMistakes, lastSyncError: null });
      this.triggerToast('Mistakes Deleted', `Removed ${mistakeIds.length} mistakes from Mistakes Vault`, 'info');
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'deleteMistakesBatch');
    }
  }

  async updateMistakeTestResult(mistakeId: string, isCorrect: boolean) {
    this.checkWriteBlock();
    const mistake = this.state.mistakes.find(m => m.id === mistakeId);
    if (!mistake) return;

    const wasResolved = mistake.revisionStatus === 'Solved Again' || mistake.revisionStatus === 'Mastered';
    let newRecoveryScore = mistake.recoveryScore || 0;
    let newRevisionStatus = mistake.revisionStatus;

    if (isCorrect) {
      newRecoveryScore = Math.min(100, (mistake.recoveryScore || 0) + 40);
      if (newRecoveryScore >= 100) {
        newRevisionStatus = 'Mastered';
      } else {
        newRevisionStatus = 'Solved Again';
      }
    } else {
      newRecoveryScore = Math.max(0, (mistake.recoveryScore || 0) - 20);
      newRevisionStatus = 'Reviewed';
    }

    const isNowResolved = newRevisionStatus === 'Solved Again' || newRevisionStatus === 'Mastered';
    let deltaXp = 0;
    const baseXP = 60;
    const resolvedXP = this.isGodModeActive() ? Math.floor(baseXP * 1.5) : baseXP;

    if (!wasResolved && isNowResolved) {
      deltaXp = resolvedXP;
    } else if (wasResolved && !isNowResolved) {
      deltaXp = -resolvedXP;
    }

    let newXp = this.state.xp;
    if (deltaXp !== 0) {
      const baseXpState = this.getResetXpBase();
      newXp = {
        ...baseXpState,
        daily: Math.max(0, baseXpState.daily + deltaXp),
        weekly: Math.max(0, baseXpState.weekly + deltaXp),
        monthly: Math.max(0, (baseXpState.monthly || 0) + deltaXp),
        total: Math.max(0, baseXpState.total + deltaXp)
      };
      const { level: newLevel, nextLevelXP: xpNeededForNext } = calculateLevelFromXP(newXp.total);
      newXp.level = newLevel;
      newXp.nextLevelXP = xpNeededForNext;
      if (deltaXp > 0) {
        this.evaluateAndUpdateStreak(newXp, this.state.studySessions);
      }
    }

    const updatedMistake: Mistake = {
      ...mistake,
      attemptNumber: (mistake.attemptNumber || 1) + 1,
      recoveryScore: newRecoveryScore,
      revisionStatus: newRevisionStatus
    };

    const originalSnapshot = {
      mistakes: this.state.mistakes,
      xp: { ...this.state.xp }
    };

    const updatedMistakes = this.state.mistakes.map(m => m.id === mistakeId ? updatedMistake : m);

    this.runtime.updateStateOptimistic({
      mistakes: updatedMistakes,
      xp: newXp
    });

    try {
      await this.runAtomicBatch((batch) => {
        const mistakeDoc = doc(db, 'users', this.userId, 'mistakes', updatedMistake.id);
        batch.set(mistakeDoc, sanitizeForFirestore(updatedMistake), { merge: true });
        if (deltaXp !== 0) {
          const userDoc = doc(db, 'users', this.userId);
          batch.set(userDoc, sanitizeForFirestore({ xp: newXp }), { merge: true });
        }
      }, 'updateMistakeTestResult');

      await this.runtime.refresh('MISTAKE_UPDATE', { 
        mistakes: updatedMistakes, 
        xp: newXp,
        lastSyncError: null 
      });
    } catch (err) {
      this.runtime.updateStateOptimistic({
        mistakes: originalSnapshot.mistakes,
        xp: originalSnapshot.xp
      });
      await this.handleWriteError(err, 'updateMistakeTestResult');
    }
  }
}
