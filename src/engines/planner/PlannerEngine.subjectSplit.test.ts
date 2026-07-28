import { describe, it, expect } from 'vitest';
import { PlannerEngine } from './PlannerEngine';
import { KnowledgeEngine, SyllabusNode } from '../knowledge';
import { PlannerInput } from './types';
import { Chapter } from '../../types/index';

const MOCK_SYLLABUS_3_SUBJECTS: SyllabusNode[] = [
  {
    id: 'p1',
    name: 'Physics Chap 1',
    subject: 'physics',
    module: 'Mechanics',
    prerequisites: [],
    unlockedChapters: [],
    lectureCount: 5,
    estimatedHours: 10,
    weightage: 8,
    dppCount: 1,
    pyqCount: 50,
    revisionPriority: 'High',
    difficulty: 'Medium',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: []
  },
  {
    id: 'c1',
    name: 'Chem Chap 1',
    subject: 'chemistry',
    module: 'Physical Chem',
    prerequisites: [],
    unlockedChapters: [],
    lectureCount: 5,
    estimatedHours: 10,
    weightage: 8,
    dppCount: 1,
    pyqCount: 50,
    revisionPriority: 'High',
    difficulty: 'Medium',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: []
  },
  {
    id: 'm1',
    name: 'Maths Chap 1',
    subject: 'maths',
    module: 'Calculus',
    prerequisites: [],
    unlockedChapters: [],
    lectureCount: 5,
    estimatedHours: 10,
    weightage: 8,
    dppCount: 1,
    pyqCount: 50,
    revisionPriority: 'High',
    difficulty: 'Medium',
    revisionDefaults: { intervals: [1, 3, 7] },
    tags: []
  }
];

// Reference dates in Jan 2024:
// 2024-01-01 is Monday (Day 0)
// 2024-01-02 is Tuesday (Day 1)
// 2024-01-03 is Wednesday (Day 2)
// 2024-01-04 is Thursday (Day 3)
// 2024-01-05 is Friday (Day 4)
// 2024-01-06 is Saturday (Day 5)
// 2024-01-07 is Sunday (Day 6)
function getDateForDayIdx(dayIdx: number): string {
  const day = (dayIdx + 1).toString().padStart(2, '0');
  return `2024-01-${day}T10:00:00.000Z`;
}

describe('PlannerEngine - Subject Split Strategy Stress Tests', () => {
  const knowledgeEngine = new KnowledgeEngine(MOCK_SYLLABUS_3_SUBJECTS);
  const planner = new PlannerEngine(knowledgeEngine);

  const baseProgress = {
    p1: {  currentLecture: 1, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, isMastered: false },
    c1: {  currentLecture: 1, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, isMastered: false },
    m1: {  currentLecture: 1, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, isMastered: false }
  };

  const baseChapters: Chapter[] = [
    {
      id: 'p1',
      name: 'Physics Chap 1',
      subject: 'physics',
      unit: 'Mechanics',
      
      currentLecture: 1,
      totalLectures: 5,
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0,
      difficulty: 'Medium',
      confidence: 70,
      estimatedRemainingTime: 8,
      priority: 1,
      dependencies: [],
      weightage: 8,
      weaknessScore: 30,
      status: 'Learning', completion: 0,
      solvedQuestions: 10,
      lastRevisionDaysAgo: 0
    },
    {
      id: 'c1',
      name: 'Chem Chap 1',
      subject: 'chemistry',
      unit: 'Physical Chem',
      
      currentLecture: 1,
      totalLectures: 5,
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0,
      difficulty: 'Medium',
      confidence: 70,
      estimatedRemainingTime: 8,
      priority: 1,
      dependencies: [],
      weightage: 8,
      weaknessScore: 30,
      status: 'Learning', completion: 0,
      solvedQuestions: 10,
      lastRevisionDaysAgo: 0
    },
    {
      id: 'm1',
      name: 'Maths Chap 1',
      subject: 'maths',
      unit: 'Calculus',
      
      currentLecture: 1,
      totalLectures: 5,
      theoryComplete: false,
      dppComplete: false,
      pyqsComplete: false,
      revisionCount: 0,
      difficulty: 'Medium',
      confidence: 70,
      estimatedRemainingTime: 8,
      priority: 1,
      dependencies: [],
      weightage: 8,
      weaknessScore: 30,
      status: 'Learning', completion: 0,
      solvedQuestions: 10,
      lastRevisionDaysAgo: 0
    }
  ];

  describe('Requirement 1 & 2: Strategy Rotation Verification across Days 0..6', () => {
    it('3_a_day: keeps Physics, Chemistry, and Maths active on all days 0..6', () => {
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const input: PlannerInput = {
          studyHours: 4,
          chapterTelemetryMap: baseProgress as any,
          chapters: baseChapters,
          revisionBacklog: [],
          userPreferences: { targetYear: '2026', subjectSplitStrategy: '3_a_day' },
          remainingDaysUntilJEE: 180,
          currentDate: getDateForDayIdx(dayIdx)
        };

        const output = planner.generateDailyPlan(input);

        // Verify todaysMission allowed subjects
        const missionSubjects = new Set(output.todaysMission.map(t => t.subjectId));
        missionSubjects.forEach(sub => {
          expect(['physics', 'chemistry', 'maths']).toContain(sub);
        });

        // Verify weeklySchedule for days 0..6
        for (let wDay = 0; wDay < 7; wDay++) {
          const dayTasks = output.weeklySchedule?.[wDay] || [];
          dayTasks.map(t => t.subjectId).forEach(sub => {
            expect(['physics', 'chemistry', 'maths']).toContain(sub);
          });
        }
      }
    });

    it('2_a_day_alternating: Day 0 -> Phys+Chem, Day 1 -> Chem+Maths, Day 2 -> Maths+Phys (repeats for 3..6)', () => {
      const expectedAllowed = [
        ['physics', 'chemistry'],
        ['chemistry', 'maths'],
        ['maths', 'physics'],
        ['physics', 'chemistry'],
        ['chemistry', 'maths'],
        ['maths', 'physics'],
        ['physics', 'chemistry']
      ];

      const expectedForbidden = [
        ['maths'],
        ['physics'],
        ['chemistry'],
        ['maths'],
        ['physics'],
        ['chemistry'],
        ['maths']
      ];

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const input: PlannerInput = {
          studyHours: 4,
          chapterTelemetryMap: baseProgress as any,
          chapters: baseChapters,
          revisionBacklog: [],
          userPreferences: { targetYear: '2026', subjectSplitStrategy: '2_a_day_alternating' },
          remainingDaysUntilJEE: 180,
          currentDate: getDateForDayIdx(dayIdx)
        };

        const output = planner.generateDailyPlan(input);
        const missionSubjects = output.todaysMission.map(t => t.subjectId);

        missionSubjects.forEach(sub => {
          expect(expectedAllowed[dayIdx]).toContain(sub);
          expect(expectedForbidden[dayIdx]).not.toContain(sub);
        });
      }
    });

    it('1_a_day_alternating: Day 0 -> Phys, Day 1 -> Chem, Day 2 -> Maths (repeats for 3..6)', () => {
      const expectedAllowed = [
        ['physics'],
        ['chemistry'],
        ['maths'],
        ['physics'],
        ['chemistry'],
        ['maths'],
        ['physics']
      ];

      const expectedForbidden = [
        ['chemistry', 'maths'],
        ['physics', 'maths'],
        ['physics', 'chemistry'],
        ['chemistry', 'maths'],
        ['physics', 'maths'],
        ['physics', 'chemistry'],
        ['chemistry', 'maths']
      ];

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const input: PlannerInput = {
          studyHours: 4,
          chapterTelemetryMap: baseProgress as any,
          chapters: baseChapters,
          revisionBacklog: [],
          userPreferences: { targetYear: '2026', subjectSplitStrategy: '1_a_day_alternating' },
          remainingDaysUntilJEE: 180,
          currentDate: getDateForDayIdx(dayIdx)
        };

        const output = planner.generateDailyPlan(input);
        const missionSubjects = output.todaysMission.map(t => t.subjectId);

        missionSubjects.forEach(sub => {
          expect(expectedAllowed[dayIdx]).toContain(sub);
          expect(expectedForbidden[dayIdx]).not.toContain(sub);
        });
      }
    });
  });

  describe('Requirement 3: Candidate Selection Strict Exclusion & Inactive Subject Filtering', () => {
    it('strictly excludes inactive subjects in todaysMission when active subject candidates exist', () => {
      const input: PlannerInput = {
        studyHours: 4,
        chapterTelemetryMap: baseProgress as any,
        chapters: baseChapters,
        revisionBacklog: [
          { chapterId: 'm1', daysOverdue: 10, retentionScore: 40 }
        ],
        userPreferences: { targetYear: '2026', subjectSplitStrategy: '1_a_day_alternating' },
        remainingDaysUntilJEE: 180,
        currentDate: getDateForDayIdx(0) // Day 0 = Physics day
      };

      const output = planner.generateDailyPlan(input);

      // Physics candidate exists (p1), so Maths (m1) must be strictly excluded from todaysMission
      const missionSubjects = output.todaysMission.map(t => t.subjectId);
      expect(missionSubjects.every(sub => sub === 'physics')).toBe(true);
      expect(missionSubjects).not.toContain('maths');
      expect(missionSubjects).not.toContain('chemistry');
    });

    it('detects Fallback Flaw in todaysCandidates when allowed subject has 0 candidate tasks', () => {
      // Setup syllabus where student ONLY has Maths progress/chapters
      const mathsOnlyProgress = {
        m1: {  currentLecture: 1, totalLectures: 5, theoryComplete: false, dppComplete: false, pyqsComplete: false, isMastered: false }
      };
      const mathsOnlyChapters: Chapter[] = [
        {
          id: 'm1',
          name: 'Maths Chap 1',
          subject: 'maths',
          unit: 'Calculus',
          
          currentLecture: 1,
          totalLectures: 5,
          theoryComplete: false,
          dppComplete: false,
          pyqsComplete: false,
          revisionCount: 0,
          difficulty: 'Medium',
          confidence: 70,
          estimatedRemainingTime: 8,
          priority: 1,
          dependencies: [],
          weightage: 8,
          weaknessScore: 30,
          status: 'Learning', completion: 0,
          solvedQuestions: 10,
          lastRevisionDaysAgo: 0
        }
      ];

      const input: PlannerInput = {
        studyHours: 4,
        chapterTelemetryMap: mathsOnlyProgress as any,
        chapters: mathsOnlyChapters,
        revisionBacklog: [],
        userPreferences: { targetYear: '2026', subjectSplitStrategy: '1_a_day_alternating' },
        remainingDaysUntilJEE: 180,
        currentDate: getDateForDayIdx(0) // Day 0 = Physics day
      };

      const output = planner.generateDailyPlan(input);

      // Observation: filteredTodaysCandidates is empty because allowed subject is 'physics' but only 'maths' tasks exist.
      // PlannerEngine line 512 falls back to all candidates: `const todaysCandidates = filteredTodaysCandidates.length > 0 ? filteredTodaysCandidates : candidates;`
      // This causes Maths (inactive) to leak into todaysMission.
      const leakedSubjects = output.todaysMission.map(t => t.subjectId);
      expect(leakedSubjects).toContain('maths');
    });
  });

  describe('Weekly Schedule Matrix Integrity', () => {
    it('populates weeklySchedule for days 0..6 according to each day rotation scheme', () => {
      const input: PlannerInput = {
        studyHours: 4,
        chapterTelemetryMap: baseProgress as any,
        chapters: baseChapters,
        revisionBacklog: [],
        userPreferences: { targetYear: '2026', subjectSplitStrategy: '2_a_day_alternating' },
        remainingDaysUntilJEE: 180,
        currentDate: getDateForDayIdx(0)
      };

      const output = planner.generateDailyPlan(input);

      const expectedRotation = [
        ['physics', 'chemistry'],
        ['chemistry', 'maths'],
        ['maths', 'physics'],
        ['physics', 'chemistry'],
        ['chemistry', 'maths'],
        ['maths', 'physics'],
        ['physics', 'chemistry']
      ];

      for (let day = 0; day < 7; day++) {
        const tasks = output.weeklySchedule?.[day] || [];
        expect(tasks.length).toBeGreaterThan(0);
        tasks.forEach(t => {
          expect(expectedRotation[day]).toContain(t.subjectId);
        });
      }
    });
  });
});
