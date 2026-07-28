import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudyBrainActions } from './StudyBrainActions';
import { StudyBrainRuntime } from '../runtime/StudyBrainRuntime';
import { MistakeRepository } from '../repositories/mistakeRepository';
import { UserRepository } from '../repositories/userRepository';
import { CustomMissionRepository } from '../repositories/customMissionRepository';

vi.mock('../firebase', () => ({
  db: {}
}));

vi.mock('../repositories/customMissionRepository', () => ({
  CustomMissionRepository: {
    deleteMission: vi.fn().mockResolvedValue(undefined),
    saveMission: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('StudyBrainActions - Write Failure & Sync Error Handling', () => {
  let runtime: StudyBrainRuntime;
  let actions: StudyBrainActions;

  beforeEach(() => {
    runtime = StudyBrainRuntime.getInstance();
    runtime.initialize({
      chapters: [],
      notes: [],
      mistakes: [],
      studySessions: [],
      mocks: [],
      customMockTests: [],
      timeline: [],
      xp: { daily: 0, weekly: 0, total: 0, level: 1, streak: 0, nextLevelXP: 1000 },
      analytics: { studyTime: 0, focusTime: 0, idleTime: 0, breakTime: 0, questionsSolved: 0, accuracy: 0, tasksCompleted: 0, xpEarned: 0 },
      energyLevel: 'Medium',
      activeSubject: 'physics',
      isMissionModeActive: false,
      coachMessage: 'Ready',
      settings: {
        targetYear: '2027',
        dreamIit: 'IIT Bombay',
        targetBranch: 'CSE',
        dailyQuota: 6,
        showStatusInBar: true,
        soundEffects: false,
        desktopNotifications: false,
        volume: 75
      },
      knowledgeGraph: [],
      plannerOutput: null,
      optimizationResult: null,
      analyticsSummary: null,
      coachAnalysis: null,
      revisionTelemetry: null,
      revisionQueue: [],
      todayMissions: [],
      customMissions: [],
      dashboardSummary: {},
      completionPrediction: {},
      subjectPriorities: [],
      syllabusProgress: {
        physics: { total: 0, completed: 0, percentage: 0 },
        chemistry: { total: 0, completed: 0, percentage: 0 },
        maths: { total: 0, completed: 0, percentage: 0 }
      },
      estimatedRemainingHours: '0h',
      plannedQuestions: 0,
      targetFinishTime: '8:00 PM',
      daysRemaining: 100,
      riskProfile: { estimatedReadinessScore: 80, highestRiskSubject: 'Physics', highestRiskChapters: [] },
      chaptersWithData: [],
      loading: false,
      lastRefresh: null,
      diagnostics: { cacheHits: 0, cacheMisses: 0, invalidatedEngines: [], refreshCause: 'INIT', lastRefreshDuration: 0, totalEngineRuntime: 0, engineExecutionTimes: {} }
    });

    actions = new StudyBrainActions(runtime, 'test-user-123');
  });

  describe('Method 1: addMistake', () => {
    it('surfaces lastSyncError and DOES NOT advance state when repository write fails', async () => {
      const mockSave = vi.spyOn(MistakeRepository, 'saveMistake').mockRejectedValueOnce(new Error('Firestore connection offline'));

      await expect(actions.addMistake({
        subject: 'physics',
        chapter: 'Kinematics',
        topic: 'Vectors',
        subtopic: '',
        difficulty: 'Medium',
        source: 'Test',
        timeTaken: 5,
        correctMethod: '',
        studentMethod: '',
        mistakeTypes: ['Silly Mistake'],
        confidence: 50,
        revisionSchedule: 'Standard',
        masteryImpact: 'Medium',
        attemptNumber: 1,
        revisionStatus: 'New',
        recoveryScore: 0,
        teacherNotes: '',
        personalNotes: '',
        aiAdvice: '',
        priority: 'Medium',
        dateLogged: new Date().toISOString(),
        questionText: 'Vector addition Q',
        correctSolution: 'R = sqrt(A^2 + B^2)'
      })).rejects.toThrow('Sync Error (addMistake): Firestore connection offline');

      // Verify state was NOT updated with the failed mistake
      expect(runtime.getState().mistakes).toHaveLength(0);
      // Verify sync error is surfaced in state for UI display
      expect(runtime.getState().lastSyncError).toContain('Sync Error (addMistake)');

      mockSave.mockRestore();
    });

    it('advances state and clears lastSyncError when repository write succeeds', async () => {
      const mockSave = vi.spyOn(MistakeRepository, 'saveMistake').mockResolvedValueOnce();

      await actions.addMistake({
        subject: 'physics',
        chapter: 'Kinematics',
        topic: 'Vectors',
        subtopic: '',
        difficulty: 'Medium',
        source: 'Test',
        timeTaken: 5,
        correctMethod: '',
        studentMethod: '',
        mistakeTypes: ['Silly Mistake'],
        confidence: 50,
        revisionSchedule: 'Standard',
        masteryImpact: 'Medium',
        attemptNumber: 1,
        revisionStatus: 'New',
        recoveryScore: 0,
        teacherNotes: '',
        personalNotes: '',
        aiAdvice: '',
        priority: 'Medium',
        dateLogged: new Date().toISOString(),
        questionText: 'Vector addition Q',
        correctSolution: 'R = sqrt(A^2 + B^2)'
      });

      expect(runtime.getState().mistakes).toHaveLength(1);
      expect(runtime.getState().lastSyncError).toBeNull();

      mockSave.mockRestore();
    });
  });

  describe('Method 2: setSettings', () => {
    it('surfaces lastSyncError and DOES NOT update settings state when repository write fails', async () => {
      const mockUpdate = vi.spyOn(UserRepository, 'updateUserProfile').mockRejectedValueOnce(new Error('Permission denied'));

      const initialTargetYear = runtime.getState().settings.targetYear;

      await expect(actions.setSettings({
        ...runtime.getState().settings,
        targetYear: '2030'
      })).rejects.toThrow('Sync Error (setSettings): Permission denied');

      // Verify settings were NOT updated in state
      expect(runtime.getState().settings.targetYear).toBe(initialTargetYear);
      // Verify sync error is surfaced in state for UI display
      expect(runtime.getState().lastSyncError).toContain('Sync Error (setSettings)');

      mockUpdate.mockRestore();
    });

    it('advances settings state and clears lastSyncError when repository write succeeds', async () => {
      const mockUpdate = vi.spyOn(UserRepository, 'updateUserProfile').mockResolvedValueOnce();

      await actions.setSettings({
        ...runtime.getState().settings,
        targetYear: '2028'
      });

      expect(runtime.getState().settings.targetYear).toBe('2028');
      expect(runtime.getState().lastSyncError).toBeNull();

      mockUpdate.mockRestore();
    });
  });

  describe('Method 3: deleteMission', () => {
    it('removes mission from state and tracks in deletedMissionIds', async () => {
      runtime.updateStateOptimistic({
        todayMissions: [
          { id: 'custom-del-1', subject: 'physics', chapter: 'Kinematics', type: 'Solve DPP', taskName: 'Test DPP', duration: 30, completed: false, xp: 50, unlocked: true }
        ],
        customMissions: [
          { id: 'custom-del-1', subject: 'physics', chapter: 'Kinematics', type: 'Solve DPP', taskName: 'Test DPP', duration: 30, completed: false, xp: 50, unlocked: true }
        ]
      });

      await actions.deleteMission('custom-del-1');

      const state = runtime.getState();
      expect(state.todayMissions.find(m => m.id === 'custom-del-1')).toBeUndefined();
      expect(state.customMissions.find(m => m.id === 'custom-del-1')).toBeUndefined();
      expect(state.deletedMissionIds).toContain('custom-del-1');
    });
  });
});
