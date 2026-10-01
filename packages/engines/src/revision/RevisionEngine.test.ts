import { describe, it, expect } from 'vitest';
import { RevisionEngine, isChapterKnownOrRunning } from './RevisionEngine';
import { Chapter, StudySession } from '../types/index';

describe('RevisionEngine (BUG-10: Subject-Level Bleed Resolution)', () => {
  const engine = new RevisionEngine();

  it('ensures study session for one chapter does not bleed into sibling chapters of the same subject', () => {
    const chapter1: Chapter = {
      id: 'p-kinematics',
      name: 'Kinematics',
      subject: 'physics',
      status: 'Learning',
      completion: 50,
      totalLectures: 10,
      currentLecture: 5,
      theoryComplete: true,
      dppComplete: false,
      pyqsComplete: false
    } as any;

    const chapter2: Chapter = {
      id: 'p-rotation',
      name: 'Rotational Dynamics',
      subject: 'physics',
      status: 'Learning',
      completion: 30,
      totalLectures: 12,
      currentLecture: 3,
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false
    } as any;

    const kinematicsSessionTime = '2026-03-01T10:00:00.000Z';
    const sessions: StudySession[] = [
      {
        id: 's1',
        startTime: kinematicsSessionTime,
        endTime: '2026-03-01T11:00:00.000Z',
        duration: 60,
        type: 'Lecture',
        subjectId: 'physics',
        chapterId: 'p-kinematics',
        xpEarned: 50
      }
    ];

    const result = engine.generateRevisionTelemetry({
      chapters: [chapter1, chapter2],
      chapterTelemetryMap: {},
      sessions,
      mistakes: []
    });

    const kinematicsSummary = [...result.upcomingChapters, ...result.overdueChapters, ...result.masteredChapters]
      .find(c => c.chapterId === 'p-kinematics');
    const rotationSummary = [...result.upcomingChapters, ...result.overdueChapters, ...result.masteredChapters]
      .find(c => c.chapterId === 'p-rotation');

    expect(kinematicsSummary).toBeDefined();
    expect(kinematicsSummary?.lastRevisionDate).toBe(kinematicsSessionTime);

    expect(rotationSummary).toBeDefined();
    // Rotation should NOT receive the kinematics session time despite sharing the physics subject!
    expect(rotationSummary?.lastRevisionDate).toBeUndefined();
  });

  it('correctly calculates reviewedTodayCount using only today\'s revision sessions (BUG-20)', () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const sessions: StudySession[] = [
      {
        id: 'rev-today-1',
        startTime: today,
        endTime: today,
        duration: 30,
        type: 'Revision',
        subjectId: 'physics',
        chapterId: 'p1',
        xpEarned: 25
      },
      {
        id: 'rev-today-2',
        startTime: today,
        endTime: today,
        duration: 45,
        type: 'Revision',
        subjectId: 'maths',
        chapterId: 'm1',
        xpEarned: 35
      },
      {
        id: 'rev-yesterday',
        startTime: yesterday,
        endTime: yesterday,
        duration: 60,
        type: 'Revision',
        subjectId: 'chemistry',
        chapterId: 'c1',
        xpEarned: 50
      },
      {
        id: 'rev-old',
        startTime: twoDaysAgo,
        endTime: twoDaysAgo,
        duration: 40,
        type: 'Revision',
        subjectId: 'physics',
        chapterId: 'p2',
        xpEarned: 30
      },
      {
        id: 'lecture-today',
        startTime: today,
        endTime: today,
        duration: 90,
        type: 'Lecture',
        subjectId: 'physics',
        chapterId: 'p1',
        xpEarned: 60
      }
    ];

    const result = engine.generateRevisionTelemetry({
      chapters: [],
      chapterTelemetryMap: {},
      sessions,
      mistakes: []
    });

    // Out of 4 revision sessions and 1 lecture session, only 2 revisions happened today
    expect(result.stats.reviewedTodayCount).toBe(2);
  });

  it('dynamically generates flashcard items from active student mistakes with SM-2 metadata', () => {
    const chapter: Chapter = {
      id: 'p-kinematics',
      name: 'Kinematics',
      subject: 'physics',
      status: 'Learning',
      completion: 40,
      totalLectures: 10,
      currentLecture: 4,
      theoryComplete: true,
      dppComplete: false,
      pyqsComplete: false
    } as any;

    const mistake = {
      id: 'mistake-projectile-1',
      subject: 'physics' as const,
      chapter: 'Kinematics',
      chapterId: 'p-kinematics',
      topic: 'Trajectory Equation',
      subtopic: 'Range Calculation',
      difficulty: 'JEE Main' as const,
      source: 'Mock Test 1',
      timeTaken: 5,
      correctMethod: 'R = u^2 sin(2θ)/g',
      studentMethod: 'Forgot factor of 2 in sin(2θ)',
      mistakeTypes: ['Formula Recall Error'],
      confidence: 30,
      revisionSchedule: 'Daily',
      masteryImpact: 'High' as const,
      attemptNumber: 1,
      revisionStatus: 'New' as const,
      recoveryScore: 20,
      teacherNotes: 'Review projectile ranges',
      personalNotes: 'Remember sin(2theta)',
      aiAdvice: 'Always check dimensions and double angle identity',
      priority: 'High' as const,
      dateLogged: '2026-03-01T12:00:00.000Z',
      questionText: 'Find range of projectile launched at 45 degrees with 20 m/s',
      correctSolution: 'R = (20)^2 * sin(90) / 10 = 40m'
    };

    const result = engine.generateRevisionTelemetry({
      chapters: [chapter],
      chapterTelemetryMap: {},
      sessions: [],
      mistakes: [mistake]
    });

    const mistakeCard = result.cards.find(c => c.cardType === 'mistake');
    expect(mistakeCard).toBeDefined();
    expect(mistakeCard?.id).toBe('m-mistake-projectile-1');
    expect(mistakeCard?.mistakeId).toBe('mistake-projectile-1');
    expect(mistakeCard?.chapterId).toBe('p-kinematics');
    expect(mistakeCard?.retentionConfidence).toBe('Low');
    expect(mistakeCard?.concept).toContain('Find range of projectile');
    expect(mistakeCard?.formula).toContain('R = (20)^2 * sin(90) / 10 = 40m');
    // Base Low (95) + High priority (15) + High masteryImpact (10) + New status (10) = 130
    expect(mistakeCard?.urgencyRank).toBeGreaterThanOrEqual(100);
    expect(result.urgentCards.some(c => c.id === 'm-mistake-projectile-1')).toBe(true);
  });

  it('synthesizes proof of work note cards into the revision queue', () => {
    const chapter: Chapter = {
      id: 'p-rotation',
      name: 'Rotational Dynamics',
      subject: 'physics',
      status: 'Learning',
      completion: 60,
      totalLectures: 10,
      currentLecture: 6,
      theoryComplete: true,
      dppComplete: true,
      pyqsComplete: false
    } as any;

    const note = {
      id: 'note-pow-1',
      timestamp: '2026-03-01T14:00:00.000Z',
      text: 'Parallel axis theorem: I = I_cm + Md^2. Must use center of mass axis!',
      category: 'Proof of Work',
      subject: 'physics' as const,
      chapter: 'Rotational Dynamics',
      chapterId: 'p-rotation',
      tags: ['ProofOfWork', 'RotationalDynamics']
    };

    const result = engine.generateRevisionTelemetry({
      chapters: [chapter],
      chapterTelemetryMap: {},
      sessions: [],
      mistakes: [],
      notes: [note]
    });

    const noteCard = result.cards.find(c => c.cardType === 'note');
    expect(noteCard).toBeDefined();
    expect(noteCard?.id).toBe('note-pow-1');
    expect(noteCard?.noteId).toBe('note-pow-1');
    expect(noteCard?.title).toBe('Proof of Work: Rotational Dynamics');
    expect(noteCard?.concept).toContain('Parallel axis theorem');
  });

  it('guarantees urgentCards queue strictly excludes note cards and provides real formula cards', () => {
    const chapter: Chapter = {
      id: 'p-rotation',
      name: 'Rotational Dynamics',
      subject: 'physics',
      status: 'Learning',
      completion: 60,
      totalLectures: 10,
      currentLecture: 6,
      theoryComplete: true,
      dppComplete: true,
      pyqsComplete: false
    } as any;

    const note = {
      id: 'note-pow-reflection',
      timestamp: '2026-03-01T14:00:00.000Z',
      text: 'Damn I recovered the session, Using the missions incomplete banner',
      category: 'Proof of Work',
      subject: 'physics' as const,
      chapter: 'Rotational Dynamics',
      chapterId: 'p-rotation',
      tags: ['ProofOfWork']
    };

    const result = engine.generateRevisionTelemetry({
      chapters: [chapter],
      chapterTelemetryMap: {},
      sessions: [],
      mistakes: [],
      notes: [note]
    });

    // urgentCards must NEVER contain note cards
    expect(result.urgentCards.some(c => c.cardType === 'note')).toBe(false);
    expect(result.urgentCards.some(c => c.title.includes('Proof of Work'))).toBe(false);
    expect(result.urgentCards.some(c => c.concept.includes('Damn I recovered'))).toBe(false);
    // urgentCards must be populated with genuine formula cards
    expect(result.urgentCards.length).toBeGreaterThan(0);
    expect(result.urgentCards.every(c => c.cardType === 'formula' || c.cardType === 'mistake')).toBe(true);
  });

  it('populates cards with all 358 formulas from FORMULA_BANK and attaches examNote to all formula cards', () => {
    const result = engine.generateRevisionTelemetry({
      chapters: [],
      chapterTelemetryMap: {},
      sessions: [],
      mistakes: []
    });

    const formulaCards = result.cards.filter(c => c.cardType === 'formula');
    expect(formulaCards.length).toBe(358);
    // Every single formula card must have examNote defined
    for (const card of formulaCards) {
      expect(card.examNote).toBeDefined();
      expect(card.examNote!.length).toBeGreaterThan(0);
    }
  });

  describe('Unstarted Chapter Exclusion Invariant', () => {
    it('isChapterKnownOrRunning correctly identifies running/completed vs unstarted chapters', () => {
      const unstartedChap: Chapter = {
        id: 'p-thermo',
        name: 'Thermodynamics',
        subject: 'physics',
        status: 'Not Started',
        completion: 0,
        totalLectures: 8,
        currentLecture: 0,
        theoryComplete: false,
        dppComplete: false,
        pyqsComplete: false,
        solvedQuestions: 0
      } as any;

      expect(isChapterKnownOrRunning(unstartedChap)).toBe(false);

      // Running chapter with completion
      const inProgressChap: Chapter = {
        ...unstartedChap,
        status: 'Learning',
        completion: 25,
        currentLecture: 2
      };
      expect(isChapterKnownOrRunning(inProgressChap)).toBe(true);

      // Mastered chapter
      const masteredChap: Chapter = {
        ...unstartedChap,
        status: 'Mastered',
        theoryComplete: true
      };
      expect(isChapterKnownOrRunning(masteredChap)).toBe(true);

      // Unstarted chapter with logged mistake becomes active
      expect(isChapterKnownOrRunning(unstartedChap, undefined, 1)).toBe(true);

      // Chapter on hold is excluded
      const onHoldChap: Chapter = {
        ...inProgressChap,
        chapterOnHold: true
      };
      expect(isChapterKnownOrRunning(onHoldChap)).toBe(false);
    });

    it('strictly isolates urgentCards and allCards to running and completed chapters only', () => {
      const activeKinematics: Chapter = {
        id: 'p-kinematics',
        name: 'Kinematics',
        subject: 'physics',
        status: 'Learning',
        completion: 45,
        totalLectures: 10,
        currentLecture: 5,
        theoryComplete: true,
        dppComplete: false,
        pyqsComplete: false
      } as any;

      const unstartedRotation: Chapter = {
        id: 'p-rotation',
        name: 'Rotational Dynamics',
        subject: 'physics',
        status: 'Not Started',
        completion: 0,
        totalLectures: 12,
        currentLecture: 0,
        theoryComplete: false,
        dppComplete: false,
        pyqsComplete: false
      } as any;

      const unstartedAtomic: Chapter = {
        id: 'c-atomic',
        name: 'Atomic Structure',
        subject: 'chemistry',
        status: 'Not Started',
        completion: 0,
        totalLectures: 8,
        currentLecture: 0,
        theoryComplete: false,
        dppComplete: false,
        pyqsComplete: false
      } as any;

      const result = engine.generateRevisionTelemetry({
        chapters: [activeKinematics, unstartedRotation, unstartedAtomic],
        chapterTelemetryMap: {},
        sessions: [],
        mistakes: []
      });

      // 1. All cards in cards pool MUST come ONLY from activeKinematics
      expect(result.cards.length).toBeGreaterThan(0);
      expect(result.cards.every(c => c.chapterId === 'p-kinematics')).toBe(true);

      // 2. Urgent cards MUST come ONLY from activeKinematics
      expect(result.urgentCards.length).toBeGreaterThan(0);
      expect(result.urgentCards.every(c => c.chapterId === 'p-kinematics')).toBe(true);

      // 3. Under no circumstances should unstartedRotation or unstartedAtomic appear in cards or urgentCards
      expect(result.cards.some(c => c.chapterId === 'p-rotation')).toBe(false);
      expect(result.cards.some(c => c.chapterId === 'c-atomic')).toBe(false);
      expect(result.urgentCards.some(c => c.chapterId === 'p-rotation')).toBe(false);
      expect(result.urgentCards.some(c => c.chapterId === 'c-atomic')).toBe(false);

      // 4. Summaries properly segregate unstarted chapters
      expect(result.notStartedChapters.map(c => c.chapterId)).toContain('p-rotation');
      expect(result.notStartedChapters.map(c => c.chapterId)).toContain('c-atomic');
      expect(result.notStartedChapters.map(c => c.chapterId)).not.toContain('p-kinematics');
    });

    it('returns empty cards and urgentCards when all syllabus chapters are unstarted', () => {
      const unstartedRotation: Chapter = {
        id: 'p-rotation',
        name: 'Rotational Dynamics',
        subject: 'physics',
        status: 'Not Started',
        completion: 0,
        totalLectures: 12,
        currentLecture: 0,
        theoryComplete: false,
        dppComplete: false,
        pyqsComplete: false
      } as any;

      const result = engine.generateRevisionTelemetry({
        chapters: [unstartedRotation],
        chapterTelemetryMap: {},
        sessions: [],
        mistakes: []
      });

      // When only unstarted chapters exist, revision & recall queues must be empty
      expect(result.cards).toHaveLength(0);
      expect(result.urgentCards).toHaveLength(0);
      expect(result.notStartedChapters).toHaveLength(1);
    });
  });
});
