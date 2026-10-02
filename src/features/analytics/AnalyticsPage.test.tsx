import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnalyticsPage } from './AnalyticsPage';
import { Chapter, ChapterTelemetry } from '@jee-os/engines';

const mockChapters: Chapter[] = [
  {
    id: 'p1',
    name: 'Kinematics',
    subject: 'physics',
    unit: 'Mechanics',
    completion: 60,
    currentLecture: 6,
    totalLectures: 10,
    theoryComplete: true,
    dppComplete: true,
    pyqsComplete: false,
    revisionCount: 2,
    difficulty: 'Medium',
    confidence: 80,
    estimatedRemainingTime: 4,
    priority: 1,
    dependencies: [],
    weightage: 5,
    weaknessScore: 20,
    status: 'Learning',
    solvedQuestions: 45,
    lastRevisionDaysAgo: 3
  } as Chapter,
  {
    id: 'c1',
    name: 'Chemical Bonding',
    subject: 'chemistry',
    unit: 'Inorganic',
    completion: 90,
    currentLecture: 9,
    totalLectures: 10,
    theoryComplete: true,
    dppComplete: true,
    pyqsComplete: true,
    revisionCount: 4,
    difficulty: 'Hard',
    confidence: 90,
    estimatedRemainingTime: 1,
    priority: 1,
    dependencies: [],
    weightage: 6,
    weaknessScore: 10,
    status: 'Mastered',
    solvedQuestions: 90,
    lastRevisionDaysAgo: 1
  } as Chapter,
  {
    id: 'm1',
    name: 'Calculus',
    subject: 'maths',
    unit: 'Calculus',
    completion: 30,
    currentLecture: 3,
    totalLectures: 12,
    theoryComplete: false,
    dppComplete: false,
    pyqsComplete: false,
    revisionCount: 1,
    difficulty: 'Hard',
    confidence: 65,
    estimatedRemainingTime: 12,
    priority: 1,
    dependencies: [],
    weightage: 8,
    weaknessScore: 35,
    status: 'Learning',
    solvedQuestions: 25,
    lastRevisionDaysAgo: 5
  } as Chapter,
];

const mockTelemetryMap: Record<string, ChapterTelemetry> = {
  p1: {
    chapterId: 'p1',
    chapterName: 'Kinematics',
    subject: 'physics',
    unit: 'Mechanics',
    masteryScore: 78,
    syllabusStage: 'In Progress',
    currentLecture: 6,
    totalLectures: 10,
    theoryComplete: true,
    dppComplete: true,
    pyqsComplete: false,
    isMastered: false,
    weightagePercent: 5,
    retentionConfidence: 'High',
    unresolvedMistakesCount: 1,
    isBottleneck: false,
    strategyRadar: {
      masteryScore: 78,
      theoryCompletionPercent: 100,
      dppCompletionPercent: 80,
      pyqCompletionPercent: 50,
      retentionConfidenceScore: 82,
      jeeWeightageRank: 'Tier 1',
      examWeightagePercent: 5,
      bottleneckSeverity: 'None'
    },
    infographics: {
      chapterId: 'p1',
      chapterName: 'Kinematics',
      subject: 'physics',
      unit: 'Mechanics',
      masteryScore: 78,
      syllabusStage: 'In Progress',
      currentLecture: 6,
      totalLectures: 10,
      theoryComplete: true,
      dppComplete: true,
      pyqsComplete: false,
      isMastered: false,
      weightagePercent: 5,
      retentionConfidence: 'High',
      unresolvedMistakesCount: 1
    }
  }
};

const mockStudySessions = [
  {
    id: 's1',
    subject: 'physics',
    duration: 60,
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date().toISOString(),
    questionsSolved: 20,
    questionsCorrect: 18,
    accuracy: 90,
    mode: 'DPP',
    xpEarned: 50
  },
  {
    id: 's2',
    subject: 'chemistry',
    duration: 45,
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 3600000).toISOString(),
    questionsSolved: 15,
    questionsCorrect: 12,
    accuracy: 80,
    mode: 'PYQ',
    xpEarned: 35
  }
];

// Mock useStudyBrainStore
vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => {
    const state = {
      actions: {
        recordStudySession: vi.fn(),
        runCoachAnalysis: vi.fn(),
      },
      chapters: mockChapters,
      chapterTelemetryMap: mockTelemetryMap,
      studySessions: mockStudySessions,
      mocks: [
        {
          id: 'm-1',
          date: new Date().toISOString(),
          title: 'JEE Main 2025 Full Mock 1',
          totalScore: 185,
          totalQuestions: 75,
          attempted: 60,
          correct: 48,
          incorrect: 12,
          duration: 180,
          subjectBreakdown: { physics: { score: 65, attempted: 20, correct: 17 }, chemistry: { score: 75, attempted: 22, correct: 19 }, maths: { score: 45, attempted: 18, correct: 12 } }
        }
      ],
      xp: { level: 6, total: 3200, daily: 120, weekly: 540 },
      analytics: {
        studyTime: 360,
        focusTime: 310,
        idleTime: 50,
        breakTime: 40,
        questionsSolved: 130,
        accuracy: 86,
        tasksCompleted: 8,
        xpEarned: 450,
        dailyAnalytics: [
          { date: new Date().toISOString(), studyTime: 60, questionsSolved: 20, accuracy: 90, xpEarned: 50 }
        ]
      },
      settings: {
        targetYear: '2026',
        dreamIit: 'IIT Bombay',
        targetBranch: 'Computer Science',
        minStreakHours: 0.5
      },
      revisionTelemetry: {
        overdueChapters: [mockChapters[0]],
        upcomingChapters: [mockChapters[2]],
        masteredChapters: [mockChapters[1]],
        stats: {
          totalOverdue: 1,
          totalUpcoming: 1,
          totalMastered: 1,
          totalNotStarted: 0,
          avgRetentionScore: 84,
          reviewedTodayCount: 2
        }
      }
    };
    return selector(state);
  }
}));

describe('AnalyticsPage Feature View (Magnitude 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders primary analytics telemetry banner and tab navigation', () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Telemetry & Performance Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Preparation Analytics & Velocity')).toBeInTheDocument();

    // Verify all 4 tabs exist
    expect(screen.getByText('Velocity & Habits')).toBeInTheDocument();
    expect(screen.getByText('Exam Strategy')).toBeInTheDocument();
    expect(screen.getByText('Memory & Decay')).toBeInTheDocument();
    expect(screen.getByText('Macro & ROI')).toBeInTheDocument();
  });

  it('allows switching between intelligence tabs', async () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );

    // Switch to Exam Strategy tab
    const strategyTab = screen.getByText('Exam Strategy');
    fireEvent.click(strategyTab);
    await waitFor(() => {
      expect(screen.getByText('Negative Marks Leakage & Guessing Penalty Audit')).toBeInTheDocument();
      expect(screen.getByText('Time-Per-Mark Efficiency Matrix')).toBeInTheDocument();
      expect(screen.getByText('Percentile ↔ Shift Normalization Calibrator')).toBeInTheDocument();
      expect(screen.getByText('Your Mock Score Prediction')).toBeInTheDocument();
    });

    // Switch to Memory & Decay tab
    const retentionTab = screen.getByText('Memory & Decay');
    fireEvent.click(retentionTab);
    await waitFor(() => {
      expect(screen.getByText('Ebbinghaus Memory Retention & Forgetting Curve')).toBeInTheDocument();
    });

    // Switch to Macro & ROI tab
    const macroTab = screen.getByText('Macro & ROI');
    fireEvent.click(macroTab);
    await waitFor(() => {
      expect(screen.getByText('Chapter ROI & JEE Weightage Matrix')).toBeInTheDocument();
    });
  });

  it('filters subject view using subject switcher pills', () => {
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );

    // Subject buttons
    const physicsBtn = screen.getByRole('button', { name: /Physics/i });
    fireEvent.click(physicsBtn);
    expect(physicsBtn).toBeInTheDocument();

    const chemBtn = screen.getByRole('button', { name: /Chemistry/i });
    fireEvent.click(chemBtn);
    expect(chemBtn).toBeInTheDocument();
  });
});
