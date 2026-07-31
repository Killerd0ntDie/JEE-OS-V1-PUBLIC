import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onSnapshot, collection, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { StudyBrainRuntime, StudyBrainState } from '../runtime/StudyBrainRuntime';
import { useStudyBrainStore } from '../store/useStudyBrainStore';
import { useAuth } from '../hooks/useAuth';
import { UserRepository } from '../repositories/userRepository';
import { ChapterRepository } from '../repositories/chapterRepository';
import { NoteRepository } from '../repositories/noteRepository';
import { MistakeRepository } from '../repositories/mistakeRepository';
import { StudySessionRepository } from '../repositories/studySessionRepository';
import { MockResultRepository } from '../repositories/mockResultRepository';
import { MockTestRepository } from '../repositories/mockTestRepository';
import { TimelineRepository } from '../repositories/timelineRepository';
import { DEFAULT_COACH_BRIEFING, INITIAL_CHAPTERS, INITIAL_MISTAKES } from '../constants/initialSeeds';
import { StudyBrainActions } from '../actions/StudyBrainActions';
import { Chapter, Mistake, TimelineBlock, UserProfile } from '../types/index';
import { normalizeChapter } from '../utils/academicState';

const validateAndSanitizeChapters = (chaps: any[]): Chapter[] => {
  if (!Array.isArray(chaps)) {
    throw new Error("Chapters database corruption: Chapters data is not an array");
  }
  return chaps.map((c, index) => {
    if (!c || typeof c !== 'object') {
      throw new Error(`Chapters database corruption: Chapter entry at index ${index} is invalid`);
    }
    if (!c.id || typeof c.id !== 'string') {
      throw new Error(`Chapters database corruption: Chapter entry at index ${index} is missing a valid string ID`);
    }
    if (!c.name || typeof c.name !== 'string') {
      throw new Error(`Chapters database corruption: Chapter with ID '${c.id}' has an invalid or missing name`);
    }
    const seed = INITIAL_CHAPTERS.find(ic => ic.id === c.id || ic.name === c.name);
    const rawChap: Chapter = {
      id: c.id,
      subject: c.subject || seed?.subject || 'physics',
      unit: c.unit || seed?.unit || 'General',
      name: c.name,
      hasTelemetry: !!c.hasTelemetry,
      completion: typeof c.completion === 'number' ? c.completion : 0,
      currentLecture: c.hasTelemetry ? (typeof c.currentLecture === 'number' ? c.currentLecture : 0) : 0,
      totalLectures: c.hasTelemetry ? (typeof c.totalLectures === 'number' ? c.totalLectures : (seed?.totalLectures || 10)) : 0,
      theoryComplete: !!c.theoryComplete,
      dppComplete: !!c.dppComplete,
      pyqsComplete: !!c.pyqsComplete,
      formulaComplete: !!c.formulaComplete,
      revisionCount: typeof c.revisionCount === 'number' ? c.revisionCount : 0,
      difficulty: c.difficulty || seed?.difficulty || 'Medium',
      confidence: typeof c.confidence === 'number' ? c.confidence : 0,
      estimatedRemainingTime: c.hasTelemetry ? (typeof c.estimatedRemainingTime === 'number' ? c.estimatedRemainingTime : (seed?.estimatedRemainingTime || 0)) : 0,
      priority: (c.priority === 1 || c.priority === 2 || c.priority === 3) ? c.priority : (seed?.priority || 2),
      dependencies: Array.isArray(c.dependencies) ? c.dependencies : (seed?.dependencies || []),
      weightage: (typeof c.weightage === 'number' && c.weightage > 1) ? c.weightage : (seed?.weightage ?? (typeof c.weightage === 'number' ? c.weightage : 3)),
      weaknessScore: typeof c.weaknessScore === 'number' ? c.weaknessScore : 0,
      status: c.status || 'Not Started',
      solvedQuestions: typeof c.solvedQuestions === 'number' ? c.solvedQuestions : 0,
      lastRevisionDaysAgo: typeof c.lastRevisionDaysAgo === 'number' ? c.lastRevisionDaysAgo : 0,
      syllabusStage: c.syllabusStage,
      lectureProgress: c.hasTelemetry ? c.lectureProgress : undefined,
      practiceProgress: c.hasTelemetry ? c.practiceProgress : undefined,
      revisionProgress: c.revisionProgress,
      revisionStage: c.revisionStage || 'Theory Complete',
      healthScore: typeof c.healthScore === 'number' ? c.healthScore : 100,
      retentionScore: typeof c.retentionScore === 'number' ? c.retentionScore : 100,
      retentionStatus: c.retentionStatus || 'Fresh',
      nextRevisionDueAt: c.nextRevisionDueAt || new Date().toISOString(),
      lastRevisedAt: c.lastRevisedAt || new Date().toISOString(),
      serialNumber: c.serialNumber || seed?.serialNumber,
      chapterOnHold: !!c.chapterOnHold,
      dppOnHold: !!c.dppOnHold,
      pyqOnHold: !!c.pyqOnHold,
    };

    return normalizeChapter(rawChap);
  });
};

const validateAndSanitizeMistakes = (msts: any[]): Mistake[] => {
  if (!Array.isArray(msts)) {
    throw new Error("Mistakes database corruption: Mistakes data is not an array");
  }
  return msts.map((m, index) => {
    if (!m || typeof m !== 'object') {
      throw new Error(`Mistakes database corruption: Mistake entry at index ${index} is invalid`);
    }
    if (!m.id || typeof m.id !== 'string') {
      throw new Error(`Mistakes database corruption: Mistake entry at index ${index} is missing a valid string ID`);
    }
    return {
      id: m.id,
      subject: m.subject || 'physics',
      chapter: m.chapter || 'General',
      topic: m.topic || 'General Topic',
      subtopic: m.subtopic || '',
      difficulty: m.difficulty || 'Medium',
      source: m.source || 'Other',
      timeTaken: typeof m.timeTaken === 'number' ? m.timeTaken : 5,
      correctMethod: m.correctMethod || '',
      studentMethod: m.studentMethod || '',
      mistakeTypes: Array.isArray(m.mistakeTypes) ? m.mistakeTypes : ['Silly Mistake'],
      confidence: typeof m.confidence === 'number' ? m.confidence : 0,
      revisionSchedule: m.revisionSchedule || 'Standard',
      masteryImpact: m.masteryImpact || 'Medium',
      attemptNumber: typeof m.attemptNumber === 'number' ? m.attemptNumber : 1,
      revisionStatus: m.revisionStatus || 'New',
      recoveryScore: typeof m.recoveryScore === 'number' ? m.recoveryScore : 0,
      teacherNotes: m.teacherNotes || '',
      personalNotes: m.personalNotes || '',
      aiAdvice: m.aiAdvice || '',
      priority: m.priority || 'Medium',
      dateLogged: m.dateLogged || new Date().toISOString(),
      questionText: m.questionText || '',
      correctSolution: m.correctSolution || '',
    };
  });
};

interface StudyBrainContextType {
  state: StudyBrainState;
  runtime: StudyBrainRuntime;
  actions: StudyBrainActions;
}

const StudyBrainContext = createContext<StudyBrainContextType | null>(null);

export const StudyBrainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const runtime = StudyBrainRuntime.getInstance();

  const actions = useMemo(() => new StudyBrainActions(runtime, user?.uid || 'guest'), [runtime, user]);

  useEffect(() => {
    useStudyBrainStore.getState().setActions(actions);
    
    const unsubscribe = runtime.subscribe((newState) => {
      useStudyBrainStore.getState().setState({ ...newState });
    });
    return unsubscribe;
  }, [runtime, actions]);

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    if (!user) {
      runtime.initialize({
        loading: false,
        initializationError: null,
        writeBlocked: true
      });
      return;
    }
    const currentUid = user.uid;

    const snapshotState: any = {
      chapters: [],
      notes: [],
      mistakes: [],
      studySessions: [],
      mocks: [],
      customMockTests: [],
      timeline: [],
      customMissions: [],
    };

    const loadedFlags = {
      profile: false,
      chapters: false,
      notes: false,
      mistakes: false,
      studySessions: false,
      mocks: false,
      customMocks: false,
      timeline: false,
      customMissions: false,
    };

    let isFullyLoaded = false;

    const checkAndInit = () => {
      if (!active) return;
      
      const allLoaded = Object.values(loadedFlags).every(Boolean);
      
      if (allLoaded && !isFullyLoaded) {
        isFullyLoaded = true;
        runtime.initialize({
          ...snapshotState,
          loading: false,
          initializationError: null,
          writeBlocked: false
        });
      } else if (allLoaded && isFullyLoaded) {
        // For subsequent real-time updates after initial load, we updateoptimistic and trigger a lightweight refresh
        runtime.updateStateOptimistic(snapshotState);
        runtime.refresh('INIT');
      }
    };

    const userDocRef = doc(db, 'users', currentUid);
    
    // 1. Profile Listener
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
          coachMessage: DEFAULT_COACH_BRIEFING ? DEFAULT_COACH_BRIEFING[0] : 'Ready',
          settings: {
            targetYear: '2027',
            dreamIit: 'IIT Bombay',
            targetBranch: 'Computer Science & Engineering',
            dailyQuota: 30,
            showStatusInBar: true,
            soundEffects: false,
            desktopNotifications: false,
            volume: 75,
            pauseOnTabChange: true,
            migratedToPristine: true
          },
          weeklyGoals: [
            { weekIndex: 1, title: 'Mechanics Core & Vectors', focus: 'Focus: Kinematics, NLM, Work Power Energy. Complete 45 DPPs & 30 PYQs.', status: 'Completed' as const },
            { weekIndex: 2, title: 'GOC & Reaction Mechanisms', focus: 'Focus: Inductive & Resonance Effects, Isomerism, Hydrocarbons.', status: 'Active' as const },
            { weekIndex: 3, title: 'Algebra & Differential Calculus', focus: 'Focus: Sets & Relations, Functions, Limits & Continuity.', status: 'Upcoming' as const },
            { weekIndex: 4, title: 'Full Monthly Mock & Error Audit', focus: 'Focus: Full-Syllabus Mock Test Session 1 Benchmark & Mistakes Review.', status: 'Upcoming' as const }
          ]
        };
        await UserRepository.saveUserProfile(currentUid, initialProfile);
        await ChapterRepository.seedChapters(currentUid, INITIAL_CHAPTERS);
        await MistakeRepository.seedMistakes(currentUid, INITIAL_MISTAKES);
        return; // Will re-trigger snapshot on creation
      }
      
      const profile = snap.data();
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
      // Restore the user's deleted-mission blocklist so planner-regenerated missions
      // that were previously dismissed don't reappear after a page reload.
      snapshotState.deletedMissionIds = profile.deletedMissionIds || [];
      
      loadedFlags.profile = true;
      checkAndInit();
    }, (error) => {
      console.error("Profile snapshot error:", error);
    });

    // 2. Chapters Listener
    const unsubChapters = onSnapshot(collection(db, 'users', currentUid, 'chapters'), (snap) => {
      if (!active) return;
      snapshotState.chapters = validateAndSanitizeChapters(snap.docs.map(d => d.data()));
      loadedFlags.chapters = true;
      checkAndInit();
    });

    // 3. Notes Listener
    const unsubNotes = onSnapshot(collection(db, 'users', currentUid, 'notes'), (snap) => {
      if (!active) return;
      snapshotState.notes = snap.docs.map(d => d.data());
      loadedFlags.notes = true;
      checkAndInit();
    });

    // 4. Mistakes Listener
    const unsubMistakes = onSnapshot(collection(db, 'users', currentUid, 'mistakes'), (snap) => {
      if (!active) return;
      snapshotState.mistakes = validateAndSanitizeMistakes(snap.docs.map(d => d.data()));
      loadedFlags.mistakes = true;
      checkAndInit();
    });

    // 5. Study Sessions Listener
    const unsubSessions = onSnapshot(collection(db, 'users', currentUid, 'studySessions'), (snap) => {
      if (!active) return;
      snapshotState.studySessions = snap.docs.map(d => d.data());
      loadedFlags.studySessions = true;
      checkAndInit();
    });

    // 6. Mock Results Listener
    const unsubMocks = onSnapshot(collection(db, 'users', currentUid, 'mockResults'), (snap) => {
      if (!active) return;
      snapshotState.mocks = snap.docs.map(d => d.data());
      loadedFlags.mocks = true;
      checkAndInit();
    });

    // 7. Custom Mock Tests Listener
    const unsubCustomMocks = onSnapshot(collection(db, 'users', currentUid, 'customMockTests'), (snap) => {
      if (!active) return;
      snapshotState.customMockTests = snap.docs.map(d => d.data());
      loadedFlags.customMocks = true;
      checkAndInit();
    });

    // 8. Timeline Listener
    const unsubTimeline = onSnapshot(collection(db, 'users', currentUid, 'timelineBlocks'), (snap) => {
      if (!active) return;
      snapshotState.timeline = snap.docs.map(d => d.data());
      loadedFlags.timeline = true;
      checkAndInit();
    });

    // 9. Custom Missions Listener
    const unsubCustomMissions = onSnapshot(collection(db, 'users', currentUid, 'customMissions'), (snap) => {
      if (!active) return;
      snapshotState.customMissions = snap.docs.map(d => d.data());
      loadedFlags.customMissions = true;
      checkAndInit();
    });

    return () => {
      active = false;
      unsubProfile();
      unsubChapters();
      unsubNotes();
      unsubMistakes();
      unsubSessions();
      unsubMocks();
      unsubCustomMocks();
      unsubTimeline();
      unsubCustomMissions();
    };
  }, [user, runtime, authLoading]);

  // We no longer provide a context value, children just render and use Zustand
  return <>{children}</>;
};

export const useStudyBrain = () => {
  const state = useStudyBrainStore(s => s.state);
  const actions = useStudyBrainStore(s => s.actions);

  if (!state || !actions) {
    throw new Error('useStudyBrain must be used within a StudyBrainProvider initialized state');
  }
  return { state, actions, runtime: StudyBrainRuntime.getInstance() };
};
