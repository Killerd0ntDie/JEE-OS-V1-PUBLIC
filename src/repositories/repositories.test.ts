import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock batch state
const mockBatchOperations: {
  set: Array<{ docRef: any; data: any; options?: any }>;
  delete: Array<{ docRef: any }>;
  update: Array<{ docRef: any; data: any }>;
} = {
  set: [],
  delete: [],
  update: []
};

const mockBatch = {
  set: vi.fn((docRef, data, options) => {
    mockBatchOperations.set.push({ docRef, data, options });
  }),
  delete: vi.fn((docRef) => {
    mockBatchOperations.delete.push({ docRef });
  }),
  update: vi.fn((docRef, data) => {
    mockBatchOperations.update.push({ docRef, data });
  }),
  commit: vi.fn().mockResolvedValue(undefined)
};

// Mock Firestore
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockGetDocsFromCache = vi.fn();

vi.mock('@/firebase', () => ({
  db: { _type: 'mockFirestoreDb' }
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...pathSegments) => ({
    _type: 'collection',
    path: pathSegments.join('/')
  })),
  doc: vi.fn((_db, ...pathSegments) => ({
    _type: 'doc',
    id: pathSegments[pathSegments.length - 1],
    path: pathSegments.join('/')
  })),
  query: vi.fn((colRef, ..._constraints) => ({
    ...colRef,
    _type: 'query'
  })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  orderBy: vi.fn((field, direction) => ({ field, direction })),
  limit: vi.fn((count) => ({ limit: count })),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  getDocsFromCache: (...args: any[]) => mockGetDocsFromCache(...args),
  writeBatch: vi.fn(() => mockBatch)
}));

// Import repositories
import { UserRepository } from './userRepository';
import { ChapterRepository } from './chapterRepository';
import { MistakeRepository } from './mistakeRepository';
import { StudySessionRepository } from './studySessionRepository';
import { QuestionRepository } from './questionRepository';
import { CustomMissionRepository } from './customMissionRepository';
import { MockTestRepository } from './mockTestRepository';
import { MockResultRepository } from './mockResultRepository';
import { NoteRepository } from './noteRepository';
import { TimelineRepository } from './timelineRepository';

import { UserProfile, Chapter, Mistake, StudySession, TodayMission, Note, TimelineBlock, MockResult } from '@/types/index';
import { MockTest } from '@/types/mockTest';
import { Question } from '@/types/curriculum';

describe('TEST-02: Firestore Repository Layer Unit Tests', () => {
  const userId = 'test-user-456';

  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchOperations.set = [];
    mockBatchOperations.delete = [];
    mockBatchOperations.update = [];
  });

  describe('1. UserRepository', () => {
    it('getUserProfile returns profile when document exists', async () => {
      const mockProfile: Partial<UserProfile> = {
        energyLevel: 'High',
        activeSubject: 'physics',
        coachMessage: 'Keep pushing!'
      };
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockProfile
      });

      const profile = await UserRepository.getUserProfile(userId);
      expect(profile).toEqual(mockProfile);
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });

    it('getUserProfile returns null when document does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => null
      });

      const profile = await UserRepository.getUserProfile(userId);
      expect(profile).toBeNull();
    });

    it('saveUserProfile sanitizes undefined fields and merges to users/{userId}', async () => {
      const dirtyProfile: any = {
        energyLevel: 'Medium',
        activeSubject: 'maths',
        undefinedField: undefined
      };

      await UserRepository.saveUserProfile(userId, dirtyProfile);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const [docRef, data, options] = mockSetDoc.mock.calls[0];
      expect(docRef.path).toBe(`users/${userId}`);
      expect(data.energyLevel).toBe('Medium');
      expect(data).not.toHaveProperty('undefinedField');
      expect(options).toEqual({ merge: true });
    });

    it('updateUserProfile applies partial updates with merge', async () => {
      await UserRepository.updateUserProfile(userId, { energyLevel: 'Low' });
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}` }),
        { energyLevel: 'Low' },
        { merge: true }
      );
    });

    it('resetAllUserData chunks subcollections > 450 items into multiple batch commits', async () => {
      // Mock subcollection with 500 documents
      const docs = Array.from({ length: 500 }, (_, i) => ({
        ref: { path: `users/${userId}/mistakes/m-${i}` }
      }));
      mockGetDocs.mockResolvedValueOnce({
        size: 500,
        docs
      });

      await UserRepository.resetAllUserData(userId, ['mistakes']);

      // 500 docs / 450 chunk size = 2 batches (450 + 50)
      expect(mockBatch.commit).toHaveBeenCalledTimes(2);
      expect(mockBatchOperations.delete).toHaveLength(500);
    });

    it('deleteUser calls deleteDoc on user document', async () => {
      await UserRepository.deleteUser(userId);
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}` })
      );
    });
  });

  describe('2. ChapterRepository', () => {
    it('getChapters fetches and maps chapter documents', async () => {
      const mockChapters: Partial<Chapter>[] = [
        { id: 'chap-1', name: 'Kinematics', subject: 'physics', completion: 80 },
        { id: 'chap-2', name: 'Thermodynamics', subject: 'physics', completion: 40 }
      ];
      mockGetDocs.mockResolvedValueOnce({
        docs: mockChapters.map(c => ({ data: () => c }))
      });

      const chapters = await ChapterRepository.getChapters(userId);
      expect(chapters).toHaveLength(2);
      expect(chapters[0].name).toBe('Kinematics');
    });

    it('saveChapter sanitizes and merges chapter at users/{userId}/chapters/{chapterId}', async () => {
      const chapter: Chapter = {
        id: 'chap-p1',
        name: 'Rotational Motion',
        subject: 'physics',
        unit: 'Mechanics',
        completion: 60,
        currentLecture: 6,
        totalLectures: 10,
        theoryComplete: false,
        pyqsComplete: false,
        revisionCount: 1,
        difficulty: 'Hard',
        confidence: 70,
        estimatedRemainingTime: 5,
        priority: 1,
        dependencies: [],
        weaknessScore: 30,
        status: 'Learning',
        solvedQuestions: 45,
        lastRevisionDaysAgo: 2
      };

      await ChapterRepository.saveChapter(userId, chapter);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/chapters/chap-p1` }),
        expect.objectContaining({ name: 'Rotational Motion' }),
        { merge: true }
      );
    });

    it('updateChapter updates chapter via updateDoc', async () => {
      await ChapterRepository.updateChapter(userId, 'chap-p1', { confidence: 85 });
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/chapters/chap-p1` }),
        { confidence: 85 }
      );
    });

    it('seedChapters splits batches correctly when seeding initial syllabus (>450 chapters)', async () => {
      const manyChapters: Chapter[] = Array.from({ length: 460 }, (_, i) => ({
        id: `c-${i}`,
        name: `Chapter ${i}`,
        subject: 'physics',
        unit: 'General',
        completion: 0,
        currentLecture: 0,
        totalLectures: 10,
        theoryComplete: false,
        pyqsComplete: false,
        revisionCount: 0,
        difficulty: 'Medium',
        confidence: 0,
        estimatedRemainingTime: 10,
        priority: 2,
        dependencies: [],
        weaknessScore: 0,
        status: 'Not Started',
        solvedQuestions: 0,
        lastRevisionDaysAgo: 0
      }));

      await ChapterRepository.seedChapters(userId, manyChapters);
      expect(mockBatch.commit).toHaveBeenCalledTimes(2); // 450 + 10
      expect(mockBatchOperations.set).toHaveLength(460);
    });

    it('deleteChapter deletes chapter document', async () => {
      await ChapterRepository.deleteChapter(userId, 'chap-p1');
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/chapters/chap-p1` })
      );
    });
  });

  describe('3. MistakeRepository', () => {
    it('getMistakes fetches all mistake records for user', async () => {
      const mockMistakes: Partial<Mistake>[] = [
        { id: 'm-1', questionText: 'Torque calculation error', revisionStatus: 'New' }
      ];
      mockGetDocs.mockResolvedValueOnce({
        docs: mockMistakes.map(m => ({ data: () => m }))
      });

      const mistakes = await MistakeRepository.getMistakes(userId);
      expect(mistakes).toHaveLength(1);
      expect(mistakes[0].id).toBe('m-1');
    });

    it('saveMistake saves mistake with merge and sanitization', async () => {
      const mistake: Mistake = {
        id: 'm-1',
        chapterId: 'chap-1',
        chapter: 'Rotational Motion',
        topic: 'Angular Momentum',
        subtopic: 'Conservation',
        subject: 'physics',
        difficulty: 'Hard',
        source: 'PYQ 2022',
        timeTaken: 5,
        correctMethod: 'Apply torque balance',
        studentMethod: 'Direct velocity integration',
        mistakeTypes: ['Conceptual Error'],
        confidence: 40,
        revisionSchedule: 'Daily',
        masteryImpact: 'High',
        attemptNumber: 1,
        revisionStatus: 'New',
        recoveryScore: 0,
        teacherNotes: '',
        personalNotes: '',
        aiAdvice: '',
        priority: 'High',
        dateLogged: '2026-09-04T12:00:00Z',
        questionText: 'Angular momentum mistake',
        correctSolution: 'T = dL/dt'
      };

      await MistakeRepository.saveMistake(userId, mistake);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/mistakes/m-1` }),
        expect.objectContaining({ questionText: 'Angular momentum mistake' }),
        { merge: true }
      );
    });

    it('updateMistake updates mistake status', async () => {
      await MistakeRepository.updateMistake(userId, 'm-1', { revisionStatus: 'Mastered' });
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/mistakes/m-1` }),
        { revisionStatus: 'Mastered' }
      );
    });

    it('deleteMistake removes mistake record', async () => {
      await MistakeRepository.deleteMistake(userId, 'm-1');
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/mistakes/m-1` })
      );
    });

    it('saveMistakesBatch commits multiple mistakes atomically using writeBatch', async () => {
      const mistakes: Partial<Mistake>[] = [
        { id: 'm-1', questionText: 'Mistake 1' },
        { id: 'm-2', questionText: 'Mistake 2' }
      ];

      await MistakeRepository.saveMistakesBatch(userId, mistakes as Mistake[]);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
      expect(mockBatchOperations.set).toHaveLength(2);
    });
  });

  describe('4. StudySessionRepository', () => {
    it('getStudySessions attempts cache first and falls back to server getDocs on cache miss', async () => {
      mockGetDocsFromCache.mockRejectedValueOnce(new Error('Cache miss'));
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => ({ id: 'sess-1', duration: 60 }) }]
      });

      const sessions = await StudySessionRepository.getStudySessions(userId, 20);
      expect(sessions).toHaveLength(1);
      expect(mockGetDocsFromCache).toHaveBeenCalledTimes(1);
      expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    it('saveStudySession saves session with merge and sanitization', async () => {
      const session: StudySession = {
        id: 'sess-1',
        type: 'Lecture',
        subjectId: 'chemistry',
        chapterId: 'chem-bonding',
        duration: 75,
        startTime: '2026-09-04T10:00:00Z',
        endTime: '2026-09-04T11:15:00Z',
        xpEarned: 120
      };

      await StudySessionRepository.saveStudySession(userId, session);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/studySessions/sess-1` }),
        expect.objectContaining({ duration: 75 }),
        { merge: true }
      );
    });

    it('deleteStudySession removes session record', async () => {
      await StudySessionRepository.deleteStudySession(userId, 'sess-1');
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/studySessions/sess-1` })
      );
    });
  });

  describe('5. QuestionRepository', () => {
    it('getQuestionsByChapter fetches questions and deduplicates seenIds', async () => {
      const dupDocs = [
        { id: 'q-1', data: () => ({ text: 'Q1' }) },
        { id: 'q-2', data: () => ({ text: 'Q2' }) },
        { id: 'q-1', data: () => ({ text: 'Q1 Duplicate' }) } // Duplicate ID
      ];
      mockGetDocsFromCache.mockResolvedValueOnce({
        empty: false,
        forEach: (fn: any) => dupDocs.forEach(fn)
      });

      const questions = await QuestionRepository.getQuestionsByChapter('chap-1');
      expect(questions).toHaveLength(2); // Deduplicated
      expect(questions.map(q => q.id)).toEqual(['q-1', 'q-2']);
    });

    it('saveQuestion saves question to pyq_bank collection', async () => {
      const question: Question = {
        id: 'q-pyq-1',
        subject: 'physics',
        chapterId: 'chap-1',
        type: 'MCQ_SINGLE',
        difficulty: 'MEDIUM',
        content: 'Solve for tension T...',
        options: [{ id: 'A', text: '10N' }],
        solution: { text: 'T = mg = 10N', correctOptionIds: ['A'] }
      };

      await QuestionRepository.saveQuestion(question);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'pyq_bank/q-pyq-1' }),
        question
      );
    });

    it('saveQuestionsBatch chunks > 450 questions into multiple batches', async () => {
      const questions: Question[] = Array.from({ length: 500 }, (_, i) => ({
        id: `q-${i}`,
        subject: 'physics',
        chapterId: 'chap-1',
        type: 'MCQ_SINGLE',
        difficulty: 'EASY',
        content: `Question ${i}`,
        options: [],
        solution: { text: 'Sol', correctOptionIds: [] }
      }));

      await QuestionRepository.saveQuestionsBatch(questions);
      expect(mockBatch.commit).toHaveBeenCalledTimes(2);
      expect(mockBatchOperations.set).toHaveLength(500);
    });
  });

  describe('6. CustomMissionRepository & Mock Repositories', () => {
    it('CustomMissionRepository saves, fetches, and deletes custom missions', async () => {
      const mission: TodayMission = {
        id: 'cm-1',
        subject: 'maths',
        chapter: 'Definite Integrals',
        chapterId: 'math-def-int',
        type: 'Solve PYQs',
        taskName: 'Solve 2023 PYQs',
        duration: 60,
        completed: false,
        xp: 80,
        unlocked: true,
        priorityScore: 90,
        reasoning: {
          whySelected: 'High weightage',
          dependentChapters: [],
          rankingRationale: 'Priority',
          longTermImpact: 'High',
          postponeRisk: 'Low',
          targetAccuracy: '80%'
        }
      };

      await CustomMissionRepository.saveMission(userId, mission);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/customMissions/cm-1` }),
        expect.objectContaining({ chapter: 'Definite Integrals' })
      );

      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => mission }]
      });
      const missions = await CustomMissionRepository.getMissions(userId);
      expect(missions).toHaveLength(1);

      await CustomMissionRepository.deleteMission(userId, 'cm-1');
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/customMissions/cm-1` })
      );
    });

    it('MockTestRepository saves and fetches custom mock tests', async () => {
      const mockTest: MockTest = {
        id: 'mt-1',
        name: 'Full JEE Main Mock 1',
        durationMinutes: 180,
        totalMarks: 300,
        sections: [{ subject: 'physics', questions: [] }]
      };

      await MockTestRepository.saveCustomMockTest(userId, mockTest);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/customMockTests/mt-1` }),
        expect.objectContaining({ name: 'Full JEE Main Mock 1' }),
        { merge: true }
      );

      await MockTestRepository.deleteCustomMockTest(userId, 'mt-1');
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/customMockTests/mt-1` })
      );
    });

    it('MockResultRepository saves and fetches mock test results', async () => {
      const mockResult: MockResult = {
        id: 'res-1',
        title: 'Full JEE Main Mock 1',
        date: '2026-09-04T15:00:00Z',
        totalScore: 210,
        totalQuestions: 75,
        attempted: 61,
        correct: 51,
        incorrect: 10,
        duration: 180,
        subjectBreakdown: {
          physics: { score: 75, attempted: 20, correct: 18 },
          chemistry: { score: 70, attempted: 22, correct: 18 },
          maths: { score: 65, attempted: 19, correct: 15 }
        }
      };

      await MockResultRepository.saveMockResult(userId, mockResult);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/mockResults/res-1` }),
        expect.objectContaining({ totalScore: 210 }),
        { merge: true }
      );

      await MockResultRepository.deleteMockResult(userId, 'res-1');
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/mockResults/res-1` })
      );
    });
  });

  describe('7. NoteRepository & TimelineRepository', () => {
    it('NoteRepository handles note CRUD and seeding', async () => {
      const note: Note = {
        id: 'note-1',
        chapter: 'Rotational Motion',
        text: 'I = 1/2 MR^2',
        category: 'Formulas',
        subject: 'physics',
        timestamp: '2026-09-04T12:00:00Z'
      };

      await NoteRepository.saveNote(userId, note);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/notes/note-1` }),
        expect.objectContaining({ text: 'I = 1/2 MR^2' })
      );

      await NoteRepository.deleteNote(userId, 'note-1');
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/notes/note-1` })
      );

      await NoteRepository.seedNotes(userId, [note]);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('TimelineRepository handles custom block CRUD and seeding', async () => {
      const block: TimelineBlock = {
        id: 'tb-1',
        subject: 'physics',
        time: '09:00 - 10:30',
        chapter: 'Kinematics',
        activity: 'Morning Kinematics Session',
        completed: false
      };

      await TimelineRepository.saveTimelineBlock(userId, block);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/customTimelineBlocks/tb-1` }),
        expect.objectContaining({ activity: 'Morning Kinematics Session' })
      );

      await TimelineRepository.deleteTimelineBlock(userId, 'tb-1');
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${userId}/customTimelineBlocks/tb-1` })
      );

      await TimelineRepository.seedTimelineBlocks(userId, [block]);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
  });
});
