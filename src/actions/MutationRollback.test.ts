import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudyBrainActions } from './StudyBrainActions';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { UserRepository } from '@/repositories/userRepository';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { CustomMissionRepository } from '@/repositories/customMissionRepository';
import { MockResultRepository } from '@/repositories/mockResultRepository';
import { TimelineRepository } from '@/repositories/timelineRepository';
import { MistakeRepository } from '@/repositories/mistakeRepository';
import { NoteRepository } from '@/repositories/noteRepository';

vi.mock('../firebase', () => ({
  db: {}
}));

describe('StudyBrainActions - Optimistic Mutation Rollbacks', () => {
  let runtime: StudyBrainRuntime;
  let actions: StudyBrainActions;

  beforeEach(() => {
    runtime = StudyBrainRuntime.getInstance();
    runtime.updateStateOptimistic({
      chapters: [],
      notes: [],
      mistakes: [],
      studySessions: [],
      mocks: [
        {
          id: 'mock-123',
          examType: 'JEE Mains',
          score: 180,
          date: '2026-09-01'
        } as any
      ],
      customMockTests: [],
      timeline: [
        {
          id: 'custom-time-1',
          subject: 'physics',
          chapter: 'Kinematics',
          activity: 'Morning Theory',
          time: '08:00 AM',
          completed: false
        } as any
      ],
      xp: { daily: 100, weekly: 500, total: 2000, level: 3, streak: 5, nextLevelXP: 3000 },
      analytics: { studyTime: 120, focusTime: 100, idleTime: 10, breakTime: 10, questionsSolved: 20, accuracy: 80, tasksCompleted: 5, xpEarned: 100 },
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
      todayMissions: [
        { id: 'custom-del-1', subject: 'physics', chapter: 'Kinematics', type: 'Solve DPP', taskName: 'Test DPP', duration: 30, completed: false, xp: 50, unlocked: true }
      ],
      customMissions: [
        { id: 'custom-del-1', subject: 'physics', chapter: 'Kinematics', type: 'Solve DPP', taskName: 'Test DPP', duration: 30, completed: false, xp: 50, unlocked: true }
      ],
      deletedMissionIds: [],
      dashboardSummary: null,
      completionPrediction: null,
      subjectPriorities: [],
      syllabusProgress: {
        physics: { total: 0, completed: 0, percentage: 0 },
        chemistry: { total: 0, completed: 0, percentage: 0 },
        maths: { total: 0, completed: 0, percentage: 0 }
      },
      estimatedRemainingHours: '10h',
      plannedQuestions: 50,
      targetFinishTime: '8:00 PM',
      daysRemaining: 100,
      riskProfile: { estimatedReadinessScore: 80, highestRiskSubject: 'Physics', highestRiskChapters: [] },
      chaptersWithData: [],
      loading: false,
      lastRefresh: null,
      lastSyncError: null,
      diagnostics: { cacheHits: 0, cacheMisses: 0, invalidatedEngines: [], refreshCause: 'INIT', lastRefreshDuration: 0, totalEngineRuntime: 0, engineExecutionTimes: {} }
    });

    actions = new StudyBrainActions(runtime, 'test-user-rollback');
  });

  it('1. rolls back activeSubject when setActiveSubject fails remotely', async () => {
    const mockUpdate = vi.spyOn(UserRepository, 'updateUserProfile').mockRejectedValueOnce(new Error('Network disconnected'));

    expect(runtime.getState().activeSubject).toBe('physics');

    await expect(actions.setActiveSubject('chemistry')).rejects.toThrow('Sync Error (setActiveSubject): Network disconnected');

    // Verify rollback restored activeSubject to original state
    expect(runtime.getState().activeSubject).toBe('physics');
    expect(runtime.getState().lastSyncError).toContain('Sync Error (setActiveSubject)');

    mockUpdate.mockRestore();
  });

  it('2. rolls back energyLevel when setEnergyLevel fails remotely', async () => {
    const mockUpdate = vi.spyOn(UserRepository, 'updateUserProfile').mockRejectedValueOnce(new Error('Write timeout'));

    expect(runtime.getState().energyLevel).toBe('Medium');

    await expect(actions.setEnergyLevel('High')).rejects.toThrow('Sync Error (setEnergyLevel): Write timeout');

    // Verify energyLevel rolled back to 'Medium'
    expect(runtime.getState().energyLevel).toBe('Medium');
    expect(runtime.getState().lastSyncError).toContain('Sync Error (setEnergyLevel)');

    mockUpdate.mockRestore();
  });

  it('3. rolls back xp state when awardPartialXP fails remotely', async () => {
    const mockUpdate = vi.spyOn(UserRepository, 'updateUserProfile').mockRejectedValueOnce(new Error('Quota exceeded'));

    const initialTotalXP = runtime.getState().xp.total;
    expect(initialTotalXP).toBe(2000);

    await expect(actions.awardPartialXP('custom-del-1', 900, 80)).rejects.toThrow('Sync Error (awardPartialXP): Quota exceeded');

    // Verify total XP was restored
    expect(runtime.getState().xp.total).toBe(initialTotalXP);
    expect(runtime.getState().lastSyncError).toContain('Sync Error (awardPartialXP)');

    mockUpdate.mockRestore();
  });

  it('4. rolls back chapter progress when updateChapterProgress fails remotely', async () => {
    runtime.updateStateOptimistic({
      chapters: [
        {
          id: 'chap-1',
          name: 'Kinematics',
          subject: 'physics',
          currentLecture: 2,
          totalLectures: 10,
          completed: false,
          status: 'In Progress',
          notes: ''
        } as any
      ]
    });

    const mockSave = vi.spyOn(ChapterRepository, 'saveChapter').mockRejectedValueOnce(new Error('Firestore permission denied'));

    expect(runtime.getState().chapters[0].currentLecture).toBe(2);

    await expect(actions.updateChapterProgress('chap-1', 8)).rejects.toThrow('Sync Error (updateChapterProgress): Firestore permission denied');

    // Verify currentLecture rolled back to 2
    expect(runtime.getState().chapters[0].currentLecture).toBe(2);
    expect(runtime.getState().lastSyncError).toContain('Sync Error (updateChapterProgress)');

    mockSave.mockRestore();
  });

  it('5. rolls back mock results when deleteMockResult fails remotely', async () => {
    const mockDelete = vi.spyOn(MockResultRepository, 'deleteMockResult').mockRejectedValueOnce(new Error('Item not found'));

    expect(runtime.getState().mocks).toHaveLength(1);
    expect(runtime.getState().mocks[0].id).toBe('mock-123');

    await expect(actions.deleteMockResult('mock-123')).rejects.toThrow('Sync Error (deleteMockResult): Item not found');

    // Verify mock list rolled back to containing mock-123
    expect(runtime.getState().mocks).toHaveLength(1);
    expect(runtime.getState().mocks[0].id).toBe('mock-123');
    expect(runtime.getState().lastSyncError).toContain('Sync Error (deleteMockResult)');

    mockDelete.mockRestore();
  });

  it('6. rolls back mission state when deleteMission fails remotely', async () => {
    const mockDelete = vi.spyOn(CustomMissionRepository, 'deleteMission').mockRejectedValueOnce(new Error('Network error'));

    await expect(actions.deleteMission('custom-del-1')).rejects.toThrow('Sync Error (deleteMission): Network error');

    // Verify mission was NOT deleted (preserved in todayMissions & NOT added to deletedMissionIds)
    expect(runtime.getState().todayMissions.some(m => m.id === 'custom-del-1')).toBe(true);
    expect(runtime.getState().deletedMissionIds || []).not.toContain('custom-del-1');
    expect(runtime.getState().lastSyncError).toContain('Sync Error (deleteMission)');

    mockDelete.mockRestore();
  });

  it('7. rolls back timeline when addCustomTimelineBlock fails remotely', async () => {
    const mockSave = vi.spyOn(TimelineRepository, 'saveTimelineBlock').mockRejectedValueOnce(new Error('Conflict'));

    await expect(actions.addCustomTimelineBlock({
      subject: 'maths',
      chapter: 'Calculus',
      activity: 'Evening Math',
      time: '06:00 PM',
      completed: false
    } as any)).rejects.toThrow('Sync Error (addCustomTimelineBlock): Conflict');

    // Verify the failed block was rolled back and NOT persisted in timeline
    expect(runtime.getState().timeline.some(b => b.activity === 'Evening Math')).toBe(false);
    expect(runtime.getState().lastSyncError).toContain('Sync Error (addCustomTimelineBlock)');

    mockSave.mockRestore();
  });

  it('8. rolls back mistakes state when addMistakesBatch fails remotely', async () => {
    const mockSaveBatch = vi.spyOn(MistakeRepository, 'saveMistakesBatch').mockRejectedValueOnce(new Error('Quota exceeded'));

    const mistakesToBatch = [
      {
        questionText: 'Batch error 1',
        topic: 'Rotational Motion',
        chapterId: 'chap-rot-1',
        subject: 'physics' as const
      },
      {
        questionText: 'Batch error 2',
        topic: 'Rotational Motion',
        chapterId: 'chap-rot-1',
        subject: 'physics' as const
      }
    ];

    await expect(actions.addMistakesBatch(mistakesToBatch as any)).rejects.toThrow('Sync Error (addMistakesBatch): Quota exceeded');

    // Verify mistakes list was rolled back to empty
    expect(runtime.getState().mistakes).toHaveLength(0);
    expect(runtime.getState().lastSyncError).toContain('Sync Error (addMistakesBatch)');

    mockSaveBatch.mockRestore();
  });

  it('9. rolls back notes state when addNote fails remotely', async () => {
    const mockSaveNote = vi.spyOn(NoteRepository, 'saveNote').mockRejectedValueOnce(new Error('Disk full'));

    await expect(actions.addNote({
      text: 'Proof of work note content',
      category: 'Proof of Work',
      subject: 'physics',
      chapter: 'Kinematics',
      tags: ['ProofOfWork']
    })).rejects.toThrow('Sync Error (addNote): Disk full');

    // Verify notes list was rolled back to empty
    expect(runtime.getState().notes).toHaveLength(0);
    expect(runtime.getState().lastSyncError).toContain('Sync Error (addNote)');

    mockSaveNote.mockRestore();
  });

  it('10. rolls back notes state when deleteNote fails remotely', async () => {
    const existingNote = {
      id: 'note-rollback-1',
      text: 'Original reflection',
      category: 'Proof of Work' as const,
      subject: 'physics' as const,
      chapter: 'Kinematics',
      timestamp: '2026-09-01T00:00:00.000Z'
    };
    runtime.updateStateOptimistic({ notes: [existingNote] });

    const mockDeleteNote = vi.spyOn(NoteRepository, 'deleteNote').mockRejectedValueOnce(new Error('Permission denied'));

    await expect(actions.deleteNote('note-rollback-1')).rejects.toThrow('Sync Error (deleteNote): Permission denied');

    // Verify note was restored in notes list
    expect(runtime.getState().notes).toHaveLength(1);
    expect(runtime.getState().notes[0].id).toBe('note-rollback-1');
    expect(runtime.getState().lastSyncError).toContain('Sync Error (deleteNote)');

    mockDeleteNote.mockRestore();
  });

  it('11. persists batched flashcard grading and synchronizes mistake status successfully', async () => {
    const chapter = {
      id: 'chap-batch-1',
      name: 'Thermodynamics',
      subject: 'physics' as const,
      status: 'Learning' as const,
      completion: 50,
      flashcardStates: {}
    };
    const mistake = {
      id: 'mst-batch-1',
      subject: 'physics' as const,
      chapter: 'Thermodynamics',
      chapterId: 'chap-batch-1',
      revisionStatus: 'New' as const,
      confidence: 30
    };
    runtime.updateStateOptimistic({
      chapters: [chapter as any],
      mistakes: [mistake as any],
      xp: { total: 100, daily: 100, weekly: 100, monthly: 100, level: 1, nextLevelXP: 200, streak: 0 }
    });

    const mockSaveChapter = vi.spyOn(ChapterRepository, 'saveChapter').mockResolvedValue(undefined as any);
    const mockUpdateUser = vi.spyOn(UserRepository, 'updateUserProfile').mockResolvedValue(undefined as any);
    const mockUpdateMistake = vi.spyOn(MistakeRepository, 'updateMistake').mockResolvedValue(undefined as any);

    await actions.gradeFlashcardsBatch([
      { cardId: 'chap-batch-1-f0', chapterId: 'chap-batch-1', quality: 4 },
      { cardId: 'm-mst-batch-1', chapterId: 'chap-batch-1', quality: 4 }
    ]);

    const state = runtime.getState();
    const updatedChap = state.chapters.find(c => c.id === 'chap-batch-1');
    expect(updatedChap?.flashcardStates?.['chap-batch-1-f0']).toBeDefined();
    expect(updatedChap?.flashcardStates?.['chap-batch-1-f0'].repetitions).toBe(1);
    expect(updatedChap?.flashcardStates?.['m-mst-batch-1']).toBeDefined();
    
    // Mistake revisionStatus should have progressed from 'New' to 'Reviewed'
    const updatedMst = state.mistakes.find(m => m.id === 'mst-batch-1');
    expect(updatedMst?.revisionStatus).toBe('Reviewed');
    expect(updatedMst?.confidence).toBe(85);

    // XP should have increased by 20 (10 XP per card >= 3)
    expect(state.xp.total).toBe(120);

    mockSaveChapter.mockRestore();
    mockUpdateUser.mockRestore();
    mockUpdateMistake.mockRestore();
  });

  it('12. rolls back flashcard states, mistakes, and XP when gradeFlashcardsBatch fails remotely', async () => {
    const initialChapter = {
      id: 'chap-rollback-1',
      name: 'Kinematics',
      subject: 'physics' as const,
      status: 'Learning' as const,
      completion: 40,
      flashcardStates: {}
    };
    const initialMistake = {
      id: 'mst-rollback-1',
      subject: 'physics' as const,
      chapter: 'Kinematics',
      chapterId: 'chap-rollback-1',
      revisionStatus: 'New' as const,
      confidence: 25
    };
    const initialXp = { total: 200, daily: 50, weekly: 100, monthly: 150, level: 2, nextLevelXP: 400, streak: 0 };

    runtime.updateStateOptimistic({
      chapters: [initialChapter as any],
      mistakes: [initialMistake as any],
      xp: initialXp
    });

    const mockSaveChapter = vi.spyOn(ChapterRepository, 'saveChapter').mockRejectedValueOnce(new Error('Network disconnected'));
    const mockUpdateUser = vi.spyOn(UserRepository, 'updateUserProfile').mockResolvedValue(undefined as any);
    const mockUpdateMistake = vi.spyOn(MistakeRepository, 'updateMistake').mockResolvedValue(undefined as any);

    await expect(actions.gradeFlashcardsBatch([
      { cardId: 'm-mst-rollback-1', chapterId: 'chap-rollback-1', quality: 5 }
    ])).rejects.toThrow('Sync Error (gradeFlashcardsBatch): Network disconnected');

    const state = runtime.getState();
    const chap = state.chapters.find(c => c.id === 'chap-rollback-1');
    expect(chap?.flashcardStates?.['m-mst-rollback-1']).toBeUndefined();

    const mst = state.mistakes.find(m => m.id === 'mst-rollback-1');
    expect(mst?.revisionStatus).toBe('New');
    expect(mst?.confidence).toBe(25);

    expect(state.xp.total).toBe(200);
    expect(state.lastSyncError).toContain('Sync Error (gradeFlashcardsBatch)');

    mockSaveChapter.mockRestore();
    mockUpdateUser.mockRestore();
    mockUpdateMistake.mockRestore();
  });
});
