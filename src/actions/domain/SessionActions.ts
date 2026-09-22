import { BaseActions } from './BaseActions';
import { StudySession, SubjectId } from '@/types/index';
import { StudySessionRepository } from '@/repositories/studySessionRepository';
import { UserRepository } from '@/repositories/userRepository';
import { calculateLevelFromXP } from '@/utils/levelingCalculations';
import { sanitizeForFirestore } from '@/utils/firestoreSanitizer';
import { doc } from 'firebase/firestore';
import { db } from '@/firebase';

export class SessionActions extends BaseActions {
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

    const originalSnapshot = {
      studySessions: this.state.studySessions,
      analytics: this.state.analytics,
      xp: this.state.xp
    };

    try {
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

      const levelUpData = oldLevel !== newLevel ? { oldLevel, newLevel, xp: newXp } : null;

      this.runtime.updateStateOptimistic({
        studySessions: updatedSessions,
        analytics: updatedAnalytics,
        xp: newXp,
        ...(levelUpData ? { levelUpData } : {})
      });
      
      // Save session and user profile updates atomically
      await this.runAtomicBatch((batch) => {
        const sessionDoc = doc(db, 'users', this.userId, 'studySessions', session.id);
        batch.set(sessionDoc, sanitizeForFirestore(session), { merge: true });
        const userDoc = doc(db, 'users', this.userId);
        batch.set(userDoc, sanitizeForFirestore({ analytics: updatedAnalytics, xp: newXp }), { merge: true });
      }, 'completeStudySession');
      
      await this.runtime.refresh('SESSION_UPDATE', { lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic({
        studySessions: originalSnapshot.studySessions,
        analytics: originalSnapshot.analytics,
        xp: originalSnapshot.xp
      });
      await this.handleWriteError(err, 'completeStudySession');
    }
  }

  async recordStudySession(data: {
    subject?: string;
    chapter?: string;
    duration: number;
    questionsSolved?: number;
    questionsCorrect?: number;
    accuracy?: number;
    mode?: string;
    timestamp?: string;
  }) {
    const rawSub = (data.subject || 'physics').toLowerCase();
    const subjectId: SubjectId = (rawSub === 'maths' || rawSub === 'mathematics' || rawSub === 'math')
      ? 'maths'
      : (rawSub === 'chemistry' ? 'chemistry' : 'physics');

    const validTypes: StudySession['type'][] = ['Lecture', 'Practice', 'Mock', 'Revision'];
    const sessionType: StudySession['type'] = validTypes.find(
      t => t.toLowerCase() === (data.mode || '').toLowerCase()
    ) || 'Practice';

    return this.completeStudySession({
      subjectId,
      chapterId: data.chapter,
      duration: data.duration,
      questions: data.questionsSolved,
      correct: data.questionsCorrect,
      accuracy: data.accuracy,
      type: sessionType,
      startTime: data.timestamp
    });
  }

  async undoLatestMission(deductXp: number = 50) {
    this.checkWriteBlock();
    const sessions = this.state.studySessions || [];
    const latestSession = sessions[0];
    
    const currentXp = this.state.xp;
    const newXp = {
      ...currentXp,
      daily: Math.max(0, currentXp.daily - deductXp),
      weekly: Math.max(0, currentXp.weekly - deductXp),
      monthly: Math.max(0, (currentXp.monthly || 0) - deductXp),
      total: Math.max(0, currentXp.total - deductXp)
    };
    
    const originalSnapshot = {
      xp: this.state.xp,
      studySessions: this.state.studySessions
    };

    const newSessions = latestSession ? sessions.filter(s => s.id !== latestSession.id) : sessions;

    this.runtime.updateStateOptimistic({ xp: newXp, studySessions: newSessions });

    try {
      if (latestSession) {
        await this.safeDbCall(() => StudySessionRepository.deleteStudySession(this.userId, latestSession.id), 'deleteStudySession');
      }
      await this.safeDbCall(() => UserRepository.updateUserProfile(this.userId, { xp: newXp }), 'updateUserProfile');
      await this.runtime.refresh('INIT', { xp: newXp, studySessions: newSessions, lastSyncError: null });
      this.triggerToast('Mission Undone', `Deducted ${deductXp} XP and removed latest session`, 'success');
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await this.handleWriteError(err, 'undoLatestMission');
    }
  }

  async runCoachAnalysis(question?: string) {
    return { ...this.state };
  }
}
