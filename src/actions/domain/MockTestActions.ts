import { BaseActions } from './BaseActions';
import { MockResult, StudySession, TodayMission } from '@/types/index';
import { MockTest } from '@/types/mockTest';
import { MockResultRepository } from '@/repositories/mockResultRepository';
import { MockTestRepository } from '@/repositories/mockTestRepository';
import { CustomMissionRepository } from '@/repositories/customMissionRepository';
import { calculateLevelFromXP } from '@/utils/levelingCalculations';
import { calculateMockScorePercent } from '@/utils/mockScoring';
import { sanitizeForFirestore } from '@/utils/firestoreSanitizer';
import { doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { idbSet } from '@/utils/idb';

export class MockTestActions extends BaseActions {
  async addMockResult(result: Omit<MockResult, 'id'> | MockResult): Promise<MockResult> {
    this.checkWriteBlock();
    const newMockResult: MockResult = {
      ...result,
      id: (result as any).id || Date.now().toString()
    };

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

    // Synthesize StudySession for analytics and streak continuity
    const sessionDuration = Math.max(1, Math.round(result.duration || 0));
    const questionsAttempted = result.attempted || 0;
    const sessionAccuracy = questionsAttempted > 0 
      ? Math.round(((result.correct || 0) / questionsAttempted) * 100) 
      : 100;

    const fallbackSubject = this.state.activeSubject === 'all' ? 'physics' : this.state.activeSubject;
    const breakdownSubjects = result.subjectBreakdown ? (Object.keys(result.subjectBreakdown) as import('@/types/index').SubjectId[]) : [];
    const dominantSubject = breakdownSubjects.length > 0 ? breakdownSubjects[0] : fallbackSubject;

    const studySession: StudySession = {
      id: Date.now().toString(),
      startTime: new Date(Date.now() - sessionDuration * 60000).toISOString(),
      endTime: new Date().toISOString(),
      duration: sessionDuration,
      type: 'Mock',
      subjectId: dominantSubject as import('@/types/index').SubjectId,
      questionsSolved: questionsAttempted,
      accuracy: sessionAccuracy,
      xpEarned: mockXP
    };

    const updatedSessions = [...this.state.studySessions, studySession];

    // Update analytics with the mock test session
    const oldQuestions = this.state.analytics.questionsSolved || 0;
    const newQuestions = oldQuestions + questionsAttempted;
    const updatedAnalytics = {
      ...this.state.analytics,
      studyTime: (this.state.analytics.studyTime || 0) + sessionDuration,
      focusTime: (this.state.analytics.focusTime || 0) + sessionDuration,
      questionsSolved: newQuestions,
      accuracy: newQuestions > 0 && questionsAttempted > 0
        ? Math.round(((this.state.analytics.accuracy || 0) * oldQuestions + sessionAccuracy * questionsAttempted) / newQuestions)
        : (this.state.analytics.accuracy || 0),
      tasksCompleted: (this.state.analytics.tasksCompleted || 0) + 1,
      xpEarned: (this.state.analytics.xpEarned || 0) + mockXP
    };

    this.evaluateAndUpdateStreak(newXp, updatedSessions);

    // Bidirectional sync: find active 'Solve Mock' mission in todayMissions
    const updatedTodayMissions: TodayMission[] = [...(this.state.todayMissions || [])];
    const updatedCompletedMissionIds: string[] = [...(this.state.completedPlannerMissionIds || [])];
    const mockMissionIdx = updatedTodayMissions.findIndex(m => m.type === 'Solve Mock' && !m.completed);
    let matchedMission: TodayMission | null = null;

    if (mockMissionIdx !== -1) {
      matchedMission = {
        ...updatedTodayMissions[mockMissionIdx],
        completed: true,
        completedAt: new Date().toISOString(),
        linkedSessionId: studySession.id
      };
      updatedTodayMissions[mockMissionIdx] = matchedMission;
      if (!updatedCompletedMissionIds.includes(matchedMission.id)) {
        updatedCompletedMissionIds.push(matchedMission.id);
      }
    }

    const _originalSnapshot = {
      mocks: this.state.mocks,
      studySessions: this.state.studySessions,
      analytics: this.state.analytics,
      xp: this.state.xp,
      todayMissions: this.state.todayMissions,
      completedPlannerMissionIds: this.state.completedPlannerMissionIds
    };

    const updatedMocks = [...this.state.mocks, newMockResult];
    const levelUpData = oldLevel !== newLevel ? { oldLevel, newLevel, xp: newXp } : null;

    this.runtime.updateStateOptimistic({
      mocks: updatedMocks,
      studySessions: updatedSessions,
      analytics: updatedAnalytics,
      xp: newXp,
      todayMissions: updatedTodayMissions,
      completedPlannerMissionIds: updatedCompletedMissionIds,
      ...(levelUpData ? { levelUpData } : {})
    });

    // Immediate local persistence guarantees the mock attempt is NEVER lost in Tier 2 IndexedDB
    try {
      await idbSet('jeeos_mock_results', updatedMocks);
    } catch (e) {
      console.warn("Failed to persist mock result to IndexedDB:", e);
    }

    try {
      // Strip base64 diagram image data URLs from Firestore payload so the document never exceeds 1MB limit.
      // High-res diagrams are safely preserved locally in IndexedDB.
      const firestoreMockResult = {
        ...newMockResult,
        testSnapshot: newMockResult.testSnapshot ? {
          ...newMockResult.testSnapshot,
          sections: newMockResult.testSnapshot.sections.map(sec => ({
            ...sec,
            questions: sec.questions.map(q => {
              const { imageUrl, ...rest } = q;
              return {
                ...rest,
                hasDiagram: Boolean(q.hasDiagram || imageUrl)
              };
            })
          }))
        } : undefined
      };

      await this.runAtomicBatch((batch) => {
        const mockDoc = doc(db, 'users', this.userId, 'mockResults', newMockResult.id);
        batch.set(mockDoc, sanitizeForFirestore(firestoreMockResult), { merge: true });
        const sessionDoc = doc(db, 'users', this.userId, 'studySessions', studySession.id);
        batch.set(sessionDoc, sanitizeForFirestore(studySession), { merge: true });
        const userDoc = doc(db, 'users', this.userId);
        batch.set(userDoc, sanitizeForFirestore({ 
          analytics: updatedAnalytics, 
          xp: newXp,
          completedPlannerMissionIds: updatedCompletedMissionIds
        }), { merge: true });
      }, 'addMockResult');

      if (matchedMission?.isCustom) {
        try {
          await CustomMissionRepository.saveMission(this.userId, matchedMission);
        } catch (e) {
          console.warn("Failed to persist custom mock mission status:", e);
        }
      }

      await this.runtime.refresh('MOCK_UPDATE', {
        mocks: updatedMocks,
        studySessions: updatedSessions,
        analytics: updatedAnalytics,
        xp: newXp,
        todayMissions: updatedTodayMissions,
        completedPlannerMissionIds: updatedCompletedMissionIds,
        lastSyncError: null,
        levelUpData
      });
    } catch (err) {
      console.warn("Firestore sync failed for mock result, but retained locally in IndexedDB & memory:", err);
      // Retain in-memory and IndexedDB attempts so user NEVER loses their exam results
      await this.runtime.refresh('MOCK_UPDATE', {
        mocks: updatedMocks,
        studySessions: updatedSessions,
        analytics: updatedAnalytics,
        xp: newXp,
        todayMissions: updatedTodayMissions,
        completedPlannerMissionIds: updatedCompletedMissionIds,
        lastSyncError: null,
        levelUpData
      });
    }
    return newMockResult;
  }

  async addCustomMockTest(testData: MockTest) {
    this.checkWriteBlock();
    const newTest: MockTest = { 
      ...testData, 
      id: testData.id || `user-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: testData.createdAt || Date.now(),
      isCustom: true
    };
    const currentList = this.state.customMockTests || [];
    // Prepend newly created test at the beginning of the list pushing old tests down
    const updatedTests = [newTest, ...currentList.filter(t => t.id !== newTest.id)];
    this.runtime.updateStateOptimistic({ customMockTests: updatedTests });

    try {
      await idbSet('jeeos_custom_mock_tests', updatedTests);
    } catch (e) {
      console.warn("Failed to write custom mock test to IndexedDB:", e);
    }

    if (!this.isGuestUser()) {
      try {
        const firestoreTest: MockTest = {
          ...newTest,
          sections: (newTest.sections || []).map(sec => ({
            ...sec,
            questions: (sec.questions || []).map(q => {
              const { imageUrl, ...rest } = q;
              return {
                ...rest,
                hasDiagram: Boolean(q.hasDiagram || imageUrl)
              };
            })
          }))
        };
        await MockTestRepository.saveCustomMockTest(this.userId, firestoreTest);
      } catch (err) {
        console.warn("Firestore sync for customMockTest failed, test preserved locally:", err);
      }
    }

    await this.runtime.refresh('INIT', { customMockTests: updatedTests, lastSyncError: null });
  }

  async deleteCustomMockTest(testId: string) {
    this.checkWriteBlock();
    const currentList = this.state.customMockTests || [];
    const updatedTests = currentList.filter(t => t.id !== testId);
    this.runtime.updateStateOptimistic({ customMockTests: updatedTests });

    try {
      await idbSet('jeeos_custom_mock_tests', updatedTests);
    } catch (e) {
      console.warn("Failed to update IndexedDB on deleteCustomMockTest:", e);
    }

    if (!this.isGuestUser()) {
      try {
        await MockTestRepository.deleteCustomMockTest(this.userId, testId);
      } catch (err) {
        console.warn("Firestore delete failed for customMockTest:", err);
      }
    }

    await this.runtime.refresh('INIT', { customMockTests: updatedTests, lastSyncError: null });
  }

  async deleteChapterCustomMockTests(testIdsToDelete: string[]) {
    this.checkWriteBlock();
    if (!testIdsToDelete || testIdsToDelete.length === 0) return;
    const deleteSet = new Set(testIdsToDelete);
    const currentList = this.state.customMockTests || [];
    const updatedTests = currentList.filter(t => !deleteSet.has(t.id));
    this.runtime.updateStateOptimistic({ customMockTests: updatedTests });

    try {
      await idbSet('jeeos_custom_mock_tests', updatedTests);
    } catch (e) {
      console.warn("Failed to update IndexedDB on deleteChapterCustomMockTests:", e);
    }

    if (!this.isGuestUser()) {
      try {
        await Promise.all(testIdsToDelete.map(id => MockTestRepository.deleteCustomMockTest(this.userId, id).catch(() => {})));
      } catch (err) {
        console.warn("Firestore bulk delete failed for chapter customMockTests:", err);
      }
    }

    await this.runtime.refresh('INIT', { customMockTests: updatedTests, lastSyncError: null });
  }

  async deleteMockResult(resultId: string) {
    this.checkWriteBlock();
    const originalSnapshot = {
      mocks: this.state.mocks
    };
    const updatedMocks = this.state.mocks.filter(m => m.id !== resultId);
    this.runtime.updateStateOptimistic({ mocks: updatedMocks });
    try {
      await MockResultRepository.deleteMockResult(this.userId, resultId);
      await idbSet('jeeos_mock_results', updatedMocks).catch(() => {});
      await this.runtime.refresh('MOCK_UPDATE', { mocks: updatedMocks, lastSyncError: null });
    } catch (err) {
      this.runtime.updateStateOptimistic(originalSnapshot);
      await idbSet('jeeos_mock_results', originalSnapshot.mocks).catch(() => {});
      await this.handleWriteError(err, 'deleteMockResult');
    }
  }
}
