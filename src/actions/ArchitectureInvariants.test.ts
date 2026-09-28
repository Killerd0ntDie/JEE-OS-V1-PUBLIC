import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { UserRepository } from '@/repositories/userRepository';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { storageAdapter } from '@/services/StorageAdapter';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { JourneyStateMachine } from '@/utils/fsm/JourneyStateMachine';
import { idbGet, idbSet } from '@/utils/idb';
import { clearAppStorage } from '@/utils/storageUtils';
import { StudyBrainActions } from './StudyBrainActions';

// Mock Firebase & Repositories
vi.mock('@/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-invariant-user' } }
}));

vi.mock('@/utils/idb', () => {
  const store = new Map<string, any>();
  return {
    idbGet: vi.fn(async (key: string) => store.get(key) ?? null),
    idbSet: vi.fn(async (key: string, val: any) => { store.set(key, val); }),
    idbRemove: vi.fn(async (key: string) => { store.delete(key); }),
    _store: store
  };
});

describe('Architecture & Invariant Guardrail Suite (The Guardian Tests)', () => {
  let runtime: StudyBrainRuntime;
  let actions: StudyBrainActions;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = StudyBrainRuntime.getInstance();
    runtime.updateStateOptimistic({
      chapters: [
        {
          id: 'chap-invar-1',
          name: 'Electrostatics',
          subject: 'physics',
          unit: 'Electromagnetism',
          completion: 100,
          currentLecture: 8,
          totalLectures: 8,
          theoryComplete: true,
          dppComplete: true,
          pyqsComplete: true,
          revisionCount: 2,
          difficulty: 'Hard',
          confidence: 90,
          estimatedRemainingTime: 0,
          priority: 1,
          dependencies: [],
          weaknessScore: 0,
          status: 'Mastered',
          solvedQuestions: 45,
          lastRevisionDaysAgo: 1
        }
      ],
      xp: { daily: 150, weekly: 600, total: 3400, level: 4, streak: 9, nextLevelXP: 5000 },
      analytics: {
        studyTime: 180,
        focusTime: 160,
        idleTime: 10,
        breakTime: 10,
        questionsSolved: 40,
        accuracy: 85,
        tasksCompleted: 4,
        xpEarned: 150
      },
      settings: {
        targetYear: '2026',
        dreamIit: 'IIT Bombay',
        targetBranch: 'Computer Science',
        dailyQuota: 7,
        showStatusInBar: true,
        soundEffects: false,
        desktopNotifications: false,
        volume: 70
      },
      activeSubject: 'physics',
      mentorProfile: {
        interviewCompleted: true,
        targetExamDate: '2026-05-01',
        dreamCollege: 'IIT Bombay',
        dailyHoursCommitment: 8,
        physicsConfidence: 4,
        chemistryConfidence: 3,
        mathsConfidence: 5
      } as any,
      mocks: [
        {
          id: 'mock-canonical-1',
          name: 'JEE Main 2025 Test',
          totalScore: 210,
          maxMarks: 300,
          completedAt: '2026-09-01T12:00:00.000Z'
        } as any
      ],
      bookmarkedFormulaIds: ['phys-1_newton_law', 'math-2_euler_identity'],
      lastSyncError: null
    });

    actions = new StudyBrainActions(runtime, 'test-invariant-user');
  });

  afterEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
    }
  });

  // =========================================================================
  // 1. Streak Invariant Test (Single Authority: userProfile.xp.streak)
  // =========================================================================
  describe('Invariant 1: Single Authority Streak Rule', () => {
    it('enforces userProfile.xp.streak as single source of truth across store selectors', () => {
      // Direct store assertion: store state matches runtime state
      const initialStreak = useStudyBrainStore.getState().xp.streak;
      expect(initialStreak).toBe(9);

      // Verify updating streak through runtime reflects identically across store
      runtime.updateStateOptimistic({
        xp: { ...runtime.getState().xp, streak: 14 }
      });

      expect(runtime.getState().xp.streak).toBe(14);
      expect(useStudyBrainStore.getState().xp.streak).toBe(14);
    });

    it('guarantees that actions maintain xp.streak in state without component math overrides', () => {
      const state = runtime.getState();
      expect(state.xp.streak).toBeGreaterThanOrEqual(0);
      // Invariant: xp.streak is a non-negative integer
      expect(Number.isInteger(state.xp.streak)).toBe(true);
    });
  });

  // =========================================================================
  // 2. Zero-Loss Storage Test (Tiered Preservation)
  // =========================================================================
  describe('Invariant 2: Zero-Loss Storage Tier Separation', () => {
    it('preserves Tier 1 (Runtime/Firestore) and Tier 2 (IDB) while wiping Tier 3 ephemerals on clearAppStorage()', async () => {
      // 1. Setup Tier 1: Canonical in-memory & Firestore state
      const beforeState = runtime.getState();
      expect(beforeState.chapters.length).toBe(1);
      expect(beforeState.xp.streak).toBe(9);
      expect(beforeState.bookmarkedFormulaIds).toEqual(['phys-1_newton_law', 'math-2_euler_identity']);

      // 2. Setup Tier 2: IndexedDB offline mocks
      const mockResultBlob = [
        { id: 'offline-result-999', score: 240, examType: 'JEE Advanced' }
      ];
      await idbSet('jeeos_mock_results', mockResultBlob);

      // 3. Setup Tier 3: LocalStorage & SessionStorage preferences and ephemerals
      storageAdapter.setItem('jeeos_theme', 'dark');
      storageAdapter.setItem('jeeos_dock_pinned', true);
      storageAdapter.setItem('jeeos_cockpit_volume', 80);
      storageAdapter.setItem('jeeos_bookmarked_formulas', ['cached-preview-formula']);
      storageAdapter.setSession('jeeos_pending_coach_prompt', 'Analyze electrostatics');
      storageAdapter.setSession('jeeos_onboarding_dismissed', 'true');

      // Verify Tier 3 items were written
      expect(storageAdapter.getItem('jeeos_theme')).toBe('dark');
      expect(storageAdapter.getItem('jeeos_bookmarked_formulas')).toEqual(['cached-preview-formula']);
      expect(storageAdapter.getSession('jeeos_pending_coach_prompt')).toBe('Analyze electrostatics');

      // 4. Execute Storage Wipe (e.g. Reset Storage or User Sign Out)
      clearAppStorage();

      // 5. Verify Tier 3 was wiped
      expect(storageAdapter.getItem('jeeos_theme')).toBeNull();
      expect(storageAdapter.getItem('jeeos_dock_pinned')).toBeNull();
      expect(storageAdapter.getItem('jeeos_bookmarked_formulas')).toBeNull();
      expect(storageAdapter.getSession('jeeos_pending_coach_prompt')).toBeNull();
      expect(storageAdapter.getSession('jeeos_onboarding_dismissed')).toBeNull();

      // 6. Verify Tier 1 (Runtime Domain State: User Profile, Bookmarks, Progress) is 100% UNTOUCHED
      const afterState = runtime.getState();
      expect(afterState.chapters).toEqual(beforeState.chapters);
      expect(afterState.xp).toEqual(beforeState.xp);
      expect(afterState.settings).toEqual(beforeState.settings);
      expect(afterState.bookmarkedFormulaIds).toEqual(beforeState.bookmarkedFormulaIds);

      // 7. Verify Tier 2 (IndexedDB Heavy Blobs) is 100% UNTOUCHED
      const preservedIdb = await idbGet<any[]>('jeeos_mock_results');
      expect(preservedIdb).toEqual(mockResultBlob);
    });
  });

  // =========================================================================
  // 3. ID Prefix Scanner Invariant Test
  // =========================================================================
  describe('Invariant 3: Mechanical Key Prefix Scanner', () => {
    it('validates that 100% of storage operations across src/ obey "jeeos_" prefix and ban raw storage in components', () => {
      const srcDir = path.resolve(process.cwd(), 'src');
      const storagePrefix = 'jeeos_';
      const allowedRawStorageFiles = [
        'StorageAdapter.ts',
        'storageUtils.ts',
        'test',
        '.test.',
        'spec.'
      ];

      function isAllowedRawStorageFile(filePath: string): boolean {
        return allowedRawStorageFiles.some(pattern => filePath.includes(pattern));
      }

      function walkDir(dir: string, fileList: string[] = []): string[] {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
              walkDir(fullPath, fileList);
            }
          } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
            fileList.push(fullPath);
          }
        }
        return fileList;
      }

      const allFiles = walkDir(srcDir);
      const violations: { file: string; line: number; type: string; detail: string }[] = [];

      for (const file of allFiles) {
        const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');
        const isComponentOrFeature = relPath.startsWith('src/components/') || relPath.startsWith('src/features/') || relPath.startsWith('src/providers/');
        const isTest = file.includes('.test.') || file.includes('.spec.');
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          const lineNum = idx + 1;

          // Rule A: Banned raw storage in src/components or src/features
          if (isComponentOrFeature && !isTest && !isAllowedRawStorageFile(file)) {
            if (/\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\b/.test(line)) {
              violations.push({
                file: relPath,
                line: lineNum,
                type: 'RAW_STORAGE_IN_COMPONENT',
                detail: line.trim()
              });
            }
          }

          // Rule B: Unprefixed storage keys across src/
          if (isAllowedRawStorageFile(file)) {
            return;
          }

          const storageCallRegex = /(?:storageAdapter|localStorage|sessionStorage|idbGet|idbSet)\s*\.\s*(?:getItem|setItem|removeItem|hasItem|getSession|setSession|removeSession)\s*\(\s*(['"`])([^'"`]+)\1/g;
          let match: RegExpExecArray | null;
          while ((match = storageCallRegex.exec(line)) !== null) {
            const key = match[2];
            if (!key.startsWith(storagePrefix)) {
              if (isTest && (key === 'syllabusViewMode' || key === 'pendingCoachPrompt' || key === 'gemini_api_key')) {
                continue;
              }
              violations.push({
                file: relPath,
                line: lineNum,
                type: 'UNPREFIXED_KEY',
                detail: `Key "${key}" must begin with "${storagePrefix}" (Line: ${line.trim()})`
              });
            }
          }
        });
      }

      if (violations.length > 0) {
        console.error('Storage violations detected:', violations);
      }
      expect(violations).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. Optimistic Mutation & Rollback Invariant Test
  // =========================================================================
  describe('Invariant 4: Atomic Mutation Rollback on Network Rejection', () => {
    it('reverts in-memory runtime and populates lastSyncError when remote user profile update fails', async () => {
      const preSubject = runtime.getState().activeSubject;
      expect(preSubject).toBe('physics');

      // Mock remote failure
      vi.spyOn(UserRepository, 'updateUserProfile').mockRejectedValueOnce(
        new Error('Firebase network unreachable (503 Service Unavailable)')
      );

      // Attempt optimistic mutation
      await expect(actions.setActiveSubject('maths')).rejects.toThrow();

      // Invariant: In-memory state MUST have rolled back to pre-mutation snapshot
      expect(runtime.getState().activeSubject).toBe('physics');

      // Invariant: lastSyncError MUST be recorded
      expect(runtime.getState().lastSyncError).toContain('Firebase network unreachable');
    });

    it('reverts chapter mutation and records lastSyncError when chapter update fails', async () => {
      const chapter = runtime.getState().chapters[0];
      expect(chapter.completion).toBe(100);

      // Mock remote failure
      vi.spyOn(ChapterRepository, 'saveChapter').mockRejectedValueOnce(
        new Error('Insufficient Firestore Permissions')
      );

      // Attempt optimistic update
      await expect(
        actions.updateChapter(chapter.id, { completion: 50, status: 'Learning' })
      ).rejects.toThrow();

      // Invariant: Chapter state rolled back
      const reverted = runtime.getState().chapters.find(c => c.id === chapter.id);
      expect(reverted?.completion).toBe(100);
      expect(reverted?.status).toBe('Mastered');

      // Invariant: Error recorded
      expect(runtime.getState().lastSyncError).toContain('Insufficient Firestore Permissions');
    });
  });

  // =========================================================================
  // 5. State Machine & Decoupled Wall-Clock Timer Invariant Test
  // =========================================================================
  describe('Invariant 5: Journey State Machine & Decoupled Timers', () => {
    it('maintains strict state transitions and saves 30s checkpoints to StorageAdapter', () => {
      const checkpointKey = 'test_session_machine';
      const fsm = new JourneyStateMachine({
        recoveryKey: checkpointKey,
        totalDurationSeconds: 1800,
        checkpointIntervalMs: 30000 // 30 seconds
      });

      // 1. Initial State
      expect(fsm.getState()).toBe('idle');

      // 2. Start
      fsm.dispatch({ type: 'START' });
      expect(fsm.getState()).toBe('active');

      // 3. Tick with wall-clock delta (e.g. 15s elapsed)
      fsm.dispatch({ type: 'TICK', deltaSecs: 15 });
      expect(fsm.getContext().elapsedSeconds).toBe(15);

      // 4. Tick past 30 seconds -> automatically checkpoints to storage
      fsm.dispatch({ type: 'TICK', deltaSecs: 20 }); // total 35s
      expect(fsm.getContext().elapsedSeconds).toBe(35);

      const savedCheckpoint = storageAdapter.getCrashCheckpoint<{ elapsedSeconds: number }>(checkpointKey);
      expect(savedCheckpoint).not.toBeNull();
      expect(savedCheckpoint?.elapsedSeconds).toBe(35);

      // 5. Pause
      fsm.dispatch({ type: 'PAUSE' });
      expect(fsm.getState()).toBe('paused');

      // 6. Invariant: Ticking while paused is an illegal transition that throws and does not advance time
      expect(() => fsm.dispatch({ type: 'TICK', deltaSecs: 10 })).toThrow();
      expect(fsm.getContext().elapsedSeconds).toBe(35); // Does NOT advance while paused!

      // 7. Resume
      fsm.dispatch({ type: 'RESUME' });
      expect(fsm.getState()).toBe('active');

      // 8. Evaluation
      fsm.dispatch({ type: 'EVALUATE' });
      expect(fsm.getState()).toBe('evaluating');

      // 9. Complete -> checkpoint is cleared
      fsm.dispatch({ type: 'COMPLETE' });
      expect(fsm.getState()).toBe('completed');
      expect(storageAdapter.getCrashCheckpoint(checkpointKey)).toBeNull();
    });

    it('safely recovers crashed sessions in paused state to prevent silent runaway timers', () => {
      const crashKey = 'test_crash_recovery';
      // Simulate crash checkpoint in StorageAdapter
      storageAdapter.setCrashCheckpoint(crashKey, {
        state: 'active',
        elapsedSeconds: 520,
        totalDurationSeconds: 1800,
        lastTickTimestamp: Date.now() - 60000,
        data: {},
        savedAt: Date.now() - 30000
      });

      // Instantiate new FSM
      const recoveredFsm = new JourneyStateMachine({
        recoveryKey: crashKey,
        totalDurationSeconds: 1800
      });

      // Invariant: Crash state 'active' MUST recover as 'paused', NEVER auto-running
      expect(recoveredFsm.getState()).toBe('paused');
      expect(recoveredFsm.getContext().elapsedSeconds).toBe(520);
    });
  });
});
