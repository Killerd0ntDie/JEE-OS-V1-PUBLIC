import { useEffect } from 'react';
import { onSnapshot, collection, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import { StudyBrainActions } from '@/actions/StudyBrainActions';
import { UserRepository } from '@/repositories/userRepository';
import { ChapterRepository } from '@/repositories/chapterRepository';
import { NoteRepository } from '@/repositories/noteRepository';
import { MistakeRepository } from '@/repositories/mistakeRepository';
import { StudySessionRepository } from '@/repositories/studySessionRepository';
import { MockResultRepository } from '@/repositories/mockResultRepository';
import { MockTestRepository } from '@/repositories/mockTestRepository';
import { restoreNestedArrays } from '@/utils/firestoreSanitizer';
import { MockResult } from '@/types/index';
import { MockTest } from '@/types/mockTest';
import { mockTest1 } from '@/data/mockTests/jeeMain2024Shift1';
import { idbGet, idbSet, idbRemove } from '@/utils/idb';
import { storageAdapter } from '@/services/StorageAdapter';
import { validateAndSanitizeChapters, validateAndSanitizeMistakes } from '../sanitizers';

export interface UseStudyBrainSyncParams {
  user: { uid: string } | null;
  authLoading: boolean;
  runtime: StudyBrainRuntime;
  actions: StudyBrainActions;
}

/**
 * Custom hook encapsulating real-time Firestore synchronization, offline
 * IndexedDB hydration, and background collection parallel rehydration.
 */
export function useStudyBrainSync({ user, authLoading, runtime, actions }: UseStudyBrainSyncParams) {
  useEffect(() => {
    if (authLoading) return;

    let active = true;

    if (!user) {
      runtime.resetToInitialState();
      Promise.all([
        idbGet<MockTest[]>('jeeos_custom_mock_tests'),
        idbGet<MockResult[]>('jeeos_mock_results')
      ]).then(([localMocks, localResults]) => {
        if (!active) return;
        const updates: any = {};
        if (localMocks && localMocks.length > 0) {
          const testMap = new Map<string, MockTest>();
          testMap.set(mockTest1.id, mockTest1);
          localMocks.forEach(t => testMap.set(t.id, t));
          updates.customMockTests = Array.from(testMap.values());
        }
        if (localResults && localResults.length > 0) {
          updates.mocks = localResults;
        }
        if (Object.keys(updates).length > 0) {
          runtime.updateStateOptimistic(updates);
        }
      }).catch(() => {});
      return;
    }

    const currentUid = user.uid;

    const snapshotState: any = {
      chapters: [],
      notes: [],
      mistakes: [],
      studySessions: [],
      mocks: [],
      customMockTests: [mockTest1],
      timeline: [],
      customMissions: [],
    };

    // Magnitude 2.2: Core Bootstrapping flags for instant Time-to-Interactive
    const coreLoadedFlags = {
      profile: false,
      chapters: false,
      timeline: false,
      customMissions: false,
    };

    let isFullyLoaded = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const checkAndInitCore = () => {
      if (!active) return;

      const allCoreLoaded = Object.values(coreLoadedFlags).every(Boolean);

      if (allCoreLoaded && !isFullyLoaded) {
        isFullyLoaded = true;
        runtime.initialize({
          ...snapshotState,
          loading: false,
          initializationError: null,
          writeBlocked: false
        });

        // Sync offline mock results from Tier 2 IndexedDB (with legacy Tier 4 cleanup)
        (async () => {
          try {
            const idbQueue = (await idbGet<MockResult[]>('jeeos_offline_mocks')) || [];
            const legacyQueue = storageAdapter.getItem<MockResult[]>('jeeos_offline_mocks') || [];
            if (legacyQueue.length > 0) {
              storageAdapter.removeItem('jeeos_offline_mocks');
            }
            const offlineQueue = [...idbQueue, ...legacyQueue];

            if (offlineQueue.length > 0) {
              console.log(`Syncing ${offlineQueue.length} offline mock results...`);
              const remainingQueue: MockResult[] = [];
              for (const mock of offlineQueue) {
                try {
                  await actions.addMockResult(mock);
                } catch (e) {
                  console.error("Offline sync failed for mock:", e);
                  remainingQueue.push(mock); // keep it for next time
                }
              }
              if (remainingQueue.length === 0) {
                await idbRemove('jeeos_offline_mocks');
              } else {
                await idbSet('jeeos_offline_mocks', remainingQueue);
              }
            }
          } catch (e) {
            console.error("Error processing offline mocks:", e);
          }
        })();
      } else if (allCoreLoaded && isFullyLoaded) {
        // For subsequent real-time updates after initial load, we update optimistic and trigger a lightweight refresh
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const currentRuntimeState = runtime.getState();
          const mergedState = {
            ...snapshotState,
            mocks: Array.isArray(currentRuntimeState.mocks) ? currentRuntimeState.mocks : snapshotState.mocks,
            customMockTests: Array.isArray(currentRuntimeState.customMockTests) ? currentRuntimeState.customMockTests : snapshotState.customMockTests,
            notes: Array.isArray(currentRuntimeState.notes) ? currentRuntimeState.notes : snapshotState.notes,
            mistakes: Array.isArray(currentRuntimeState.mistakes) ? currentRuntimeState.mistakes : snapshotState.mistakes,
            studySessions: Array.isArray(currentRuntimeState.studySessions) ? currentRuntimeState.studySessions : snapshotState.studySessions,
          };
          snapshotState.mocks = mergedState.mocks;
          snapshotState.customMockTests = mergedState.customMockTests;
          snapshotState.notes = mergedState.notes;
          snapshotState.mistakes = mergedState.mistakes;
          snapshotState.studySessions = mergedState.studySessions;
          runtime.updateStateOptimistic(mergedState);
          runtime.refresh('INIT');
        }, 50);
      }
    };

    const userDocRef = doc(db, 'users', currentUid);

    // 1. Core Profile Listener (Real-Time)
    const unsubProfile = onSnapshot(userDocRef, async (snap) => {
      if (!active) return;
      if (!snap.exists()) {
        // Auto-seed profile and default data if user doc doesn't exist
        const initialProfile = {
          xp: { daily: 0, weekly: 0, total: 0, level: 1, streak: 0, nextLevelXP: 1000, lastActiveDate: '' },
          analytics: { studyTime: 0, focusTime: 0, idleTime: 0, breakTime: 0, questionsSolved: 0, accuracy: 0, tasksCompleted: 0, xpEarned: 0 },
          energyLevel: 'Medium' as const,
          activeSubject: 'physics' as const,
          isMissionModeActive: false,
          coachMessage: 'Welcome to JEE OS. Complete your first study session to generate insights.',
          settings: {
            targetYear: String(new Date().getFullYear() + 2),
            dreamIit: 'IIT Bombay',
            targetBranch: 'Computer Science & Engineering',
            dailyQuota: 6,
            showStatusInBar: true,
            soundEffects: false,
            desktopNotifications: false,
            volume: 75,
            pauseOnTabChange: true,
            migratedToPristine: true
          },
          weeklyGoals: Array.from({ length: 48 }, (_, i) => ({
            weekIndex: i + 1,
            title: `JEE Prep Week ${i + 1}`,
            focus: i === 0 ? 'Diagnostic Tests and Foundation Building' : 'Syllabus Coverage and Practice',
            status: (i === 0 ? 'Active' : 'Upcoming') as "Completed" | "Upcoming" | "Active"
          })),
          scheduleOverrides: {}
        };
        const seeds = await import('@/constants/initialSeeds');
        if (!active) return;
        await UserRepository.saveUserProfile(currentUid, initialProfile);
        await ChapterRepository.seedChapters(currentUid, seeds.INITIAL_CHAPTERS);
        await MistakeRepository.seedMistakes(currentUid, seeds.INITIAL_MISTAKES);
        return; // Will re-trigger snapshot on creation
      }
      try {
        const profile = restoreNestedArrays(snap.data());
        if (profile.xp && !profile.xp.nextLevelXP) profile.xp.nextLevelXP = 1000;

        snapshotState.xp = profile.xp;
        snapshotState.analytics = profile.analytics;
        snapshotState.energyLevel = profile.energyLevel || 'Medium';
        snapshotState.activeSubject = profile.activeSubject || 'physics';
        snapshotState.isMissionModeActive = profile.isMissionModeActive || false;
        snapshotState.coachMessage = profile.coachMessage || '';
        snapshotState.mentorProfile = profile.mentorProfile;
        snapshotState.settings = profile.settings || {};
        snapshotState.weeklyGoals = profile.weeklyGoals;
        snapshotState.deletedMissionIds = profile.deletedMissionIds || [];
        snapshotState.completedPlannerMissionIds = profile.completedPlannerMissionIds || [];
        snapshotState.scheduleOverrides = profile.scheduleOverrides || {};
        snapshotState.bookmarkedFormulaIds = profile.bookmarkedFormulaIds || [];

      } catch (e) {
        console.error("Error processing profile snapshot:", e);
      } finally {
        coreLoadedFlags.profile = true;
        checkAndInitCore();
      }
    }, (error) => {
      console.error("Profile snapshot error:", error);
      coreLoadedFlags.profile = true;
      checkAndInitCore();
    });

    // 2. Core Chapters Listener (Real-Time)
    const unsubChapters = onSnapshot(collection(db, 'users', currentUid, 'chapters'), (snap) => {
      if (!active) return;
      try {
        snapshotState.chapters = validateAndSanitizeChapters(snap.docs.map(d => restoreNestedArrays(d.data())));
      } catch (e) {
        console.error("Error processing chapters snapshot:", e);
      } finally {
        coreLoadedFlags.chapters = true;
        checkAndInitCore();
      }
    }, (error) => {
      console.error("chapters snapshot error:", error);
      coreLoadedFlags.chapters = true;
      checkAndInitCore();
    });

    // 3. Core Timeline Listener (Real-Time)
    const unsubTimeline = onSnapshot(collection(db, 'users', currentUid, 'customTimelineBlocks'), (snap) => {
      if (!active) return;
      try {
        snapshotState.timeline = snap.docs.map(d => restoreNestedArrays(d.data()));
      } catch (e) {
        console.error("Error processing timeline snapshot:", e);
      } finally {
        coreLoadedFlags.timeline = true;
        checkAndInitCore();
      }
    }, (error) => {
      console.error("customTimelineBlocks snapshot error:", error);
      coreLoadedFlags.timeline = true;
      checkAndInitCore();
    });

    // 4. Core Custom Missions Listener (Real-Time)
    const unsubCustomMissions = onSnapshot(collection(db, 'users', currentUid, 'customMissions'), (snap) => {
      if (!active) return;
      try {
        snapshotState.customMissions = snap.docs.map(d => restoreNestedArrays(d.data()));
      } catch (e) {
        console.error("Error processing custom missions snapshot:", e);
      } finally {
        coreLoadedFlags.customMissions = true;
        checkAndInitCore();
      }
    }, (error) => {
      console.error("customMissions snapshot error:", error);
      coreLoadedFlags.customMissions = true;
      checkAndInitCore();
    });

    // Magnitude 2.2: Decoupled Parallel Hydration for Secondary Collections
    // Fetches notes, mistakes, study sessions, and mock tests once without permanent WebSocket polling
    Promise.allSettled([
      NoteRepository.getNotes(currentUid),
      MistakeRepository.getMistakes(currentUid),
      StudySessionRepository.getStudySessions(currentUid, 100),
      MockResultRepository.getMockResults(currentUid),
      MockTestRepository.getCustomMockTests(currentUid),
    ]).then(async ([notesRes, mistakesRes, sessionsRes, mocksRes, customMocksRes]) => {
      if (!active) return;
      const updates: any = {};
      if (notesRes.status === 'fulfilled') {
        snapshotState.notes = notesRes.value.map(d => restoreNestedArrays(d));
        updates.notes = snapshotState.notes;
      }
      if (mistakesRes.status === 'fulfilled') {
        snapshotState.mistakes = validateAndSanitizeMistakes(mistakesRes.value.map(d => restoreNestedArrays(d)));
        updates.mistakes = snapshotState.mistakes;
      }
      if (sessionsRes.status === 'fulfilled') {
        snapshotState.studySessions = sessionsRes.value.map(d => restoreNestedArrays(d));
        updates.studySessions = snapshotState.studySessions;
      }
      let localMockResults: MockResult[] = [];
      try {
        localMockResults = (await idbGet<MockResult[]>('jeeos_mock_results')) || [];
      } catch (e) {
        console.warn("Failed to read local mock results from IndexedDB:", e);
      }

      const remoteMocks: MockResult[] = mocksRes.status === 'fulfilled' ? mocksRes.value.map(d => restoreNestedArrays(d)) : [];
      const currentRuntimeMocks: MockResult[] = runtime.getState().mocks || [];
      const localResultMap = new Map<string, MockResult>();
      localMockResults.forEach(r => localResultMap.set(r.id, r));
      const resultMap = new Map<string, MockResult>();
      localMockResults.forEach(r => resultMap.set(r.id, r));

      remoteMocks.forEach(remoteResult => {
        const localResult = localResultMap.get(remoteResult.id);
        if (localResult && localResult.testSnapshot && remoteResult.testSnapshot) {
          const mergedSections = (remoteResult.testSnapshot.sections || []).map((rSec, sIdx) => {
            const lSec = localResult.testSnapshot?.sections?.find(s => s.subject === rSec.subject) || localResult.testSnapshot?.sections?.[sIdx];
            return {
              ...rSec,
              questions: (rSec.questions || []).map((rQ, qIdx) => {
                const lQ = lSec?.questions?.find(q => q.id === rQ.id) || (localResult.testSnapshot?.sections || []).flatMap(s => s.questions).find(q => q.id === rQ.id) || lSec?.questions?.[qIdx];
                return {
                  ...rQ,
                  imageUrl: rQ.imageUrl || lQ?.imageUrl,
                  hasDiagram: Boolean(rQ.hasDiagram || lQ?.hasDiagram || lQ?.imageUrl)
                };
              })
            };
          });
          resultMap.set(remoteResult.id, {
            ...remoteResult,
            testSnapshot: {
              ...remoteResult.testSnapshot,
              sections: mergedSections
            }
          });
        } else if (localResult && localResult.testSnapshot && !remoteResult.testSnapshot) {
          resultMap.set(remoteResult.id, {
            ...remoteResult,
            testSnapshot: localResult.testSnapshot
          });
        } else {
          resultMap.set(remoteResult.id, remoteResult);
        }
      });

      currentRuntimeMocks.forEach(r => resultMap.set(r.id, r));
      snapshotState.mocks = Array.from(resultMap.values());
      updates.mocks = snapshotState.mocks;
      idbSet('jeeos_mock_results', snapshotState.mocks).catch(() => {});

      let localCustomMocks: MockTest[] = [];
      try {
        localCustomMocks = (await idbGet<MockTest[]>('jeeos_custom_mock_tests')) || [];
      } catch (e) {
        console.warn("Failed to read local custom mock tests from IndexedDB:", e);
      }

      if (customMocksRes.status === 'fulfilled') {
        const userMocks = customMocksRes.value.map(d => restoreNestedArrays(d));
        const localTestMap = new Map<string, MockTest>();
        localCustomMocks.forEach(t => localTestMap.set(t.id, t));

        const testMap = new Map<string, MockTest>();
        testMap.set(mockTest1.id, mockTest1);
        localCustomMocks.forEach(t => testMap.set(t.id, t));

        userMocks.forEach(remoteTest => {
          const localTest = localTestMap.get(remoteTest.id);
          if (localTest) {
            const mergedSections = (remoteTest.sections || []).map((rSec, sIdx) => {
              const lSec = localTest.sections?.find(s => s.subject === rSec.subject) || localTest.sections?.[sIdx];
              return {
                ...rSec,
                questions: (rSec.questions || []).map((rQ, qIdx) => {
                  const lQ = lSec?.questions?.find(q => q.id === rQ.id) || (localTest.sections || []).flatMap(s => s.questions).find(q => q.id === rQ.id) || lSec?.questions?.[qIdx];
                  return {
                    ...rQ,
                    imageUrl: rQ.imageUrl || lQ?.imageUrl,
                    hasDiagram: Boolean(rQ.hasDiagram || lQ?.hasDiagram || lQ?.imageUrl)
                  };
                })
              };
            });
            testMap.set(remoteTest.id, {
              ...remoteTest,
              sections: mergedSections
            });
          } else {
            testMap.set(remoteTest.id, remoteTest);
          }
        });

        snapshotState.customMockTests = Array.from(testMap.values());
        updates.customMockTests = snapshotState.customMockTests;
        idbSet('jeeos_custom_mock_tests', snapshotState.customMockTests).catch(() => {});
      } else if (localCustomMocks.length > 0) {
        const testMap = new Map<string, MockTest>();
        testMap.set(mockTest1.id, mockTest1);
        localCustomMocks.forEach(t => testMap.set(t.id, t));
        snapshotState.customMockTests = Array.from(testMap.values());
        updates.customMockTests = snapshotState.customMockTests;
      }

      runtime.updateStateOptimistic(updates);
      if (isFullyLoaded) {
        runtime.refresh('INIT');
      }
    }).catch((err) => {
      console.error("[StudyBrainProvider] Background hydration error:", err);
    });

    return () => {
      active = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubProfile();
      unsubChapters();
      unsubTimeline();
      unsubCustomMissions();
    };
  }, [user, runtime, authLoading, actions]);
}
