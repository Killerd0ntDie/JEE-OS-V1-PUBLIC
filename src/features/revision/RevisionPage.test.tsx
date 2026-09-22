import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RevisionPage } from './RevisionPage';

// Mock audioEngine
vi.mock('@/utils/audioEngine', () => ({
  audioEngine: {
    playTap: vi.fn(),
    playSuccess: vi.fn(),
    playError: vi.fn(),
    playFanfare: vi.fn(),
    playWarning: vi.fn(),
    playBgm: vi.fn(),
    stopBgm: vi.fn(),
    playHover: vi.fn(),
    setBgmVolume: vi.fn(),
    setSfxVolume: vi.fn(),
    toggleMute: vi.fn(),
  }
}));

const mockCards = [
  {
    id: 'card-1',
    chapterId: 'p1',
    chapterName: 'Kinematics',
    subject: 'physics',
    title: 'Velocity-Time Equation',
    concept: 'Constant acceleration kinematics',
    formula: 'v = u + at',
    latex: 'v = u + at',
    masteryScore: 80,
    retentionConfidence: 'High',
    lastReviewedDaysAgo: 1,
    nextReviewDueDays: 3,
    difficulty: 'Easy'
  },
  {
    id: 'card-2',
    chapterId: 'c1',
    chapterName: 'Thermodynamics',
    subject: 'chemistry',
    title: 'First Law of Thermodynamics',
    concept: 'Internal energy conservation',
    formula: '\\Delta U = q + w',
    latex: '\\Delta U = q + w',
    masteryScore: 40,
    retentionConfidence: 'Low',
    lastReviewedDaysAgo: 7,
    nextReviewDueDays: -2,
    difficulty: 'Hard'
  }
];

const mockSummaries = [
  {
    chapterId: 'p1',
    chapterName: 'Kinematics',
    subject: 'physics',
    masteryScore: 80,
    retentionConfidence: 'High',
    overdueDays: 0,
    formulaCount: 5,
    lastRevisionDate: new Date().toISOString()
  },
  {
    chapterId: 'c1',
    chapterName: 'Thermodynamics',
    subject: 'chemistry',
    masteryScore: 40,
    retentionConfidence: 'Low',
    overdueDays: 4,
    formulaCount: 8,
    lastRevisionDate: new Date(Date.now() - 7 * 86400000).toISOString()
  }
];

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: Object.assign(
    (selector: any) => {
      const state = {
        actions: {
          gradeFlashcard: vi.fn(),
          recordStudySession: vi.fn(),
          openChapterEditModal: vi.fn(),
        },
        studySessions: [],
        revisionTelemetry: {
          cards: mockCards,
          urgentCards: [mockCards[1]],
          overdueChapters: [mockSummaries[1]],
          upcomingChapters: [],
          masteredChapters: [mockSummaries[0]],
          notStartedChapters: [],
          stats: {
            totalOverdue: 1,
            totalUpcoming: 0,
            totalMastered: 1,
            totalNotStarted: 0,
            avgRetentionScore: 78,
            reviewedTodayCount: 1
          }
        }
      };
      return selector(state);
    },
    {
      getState: () => ({
        actions: {
          gradeFlashcard: vi.fn(),
          recordStudySession: vi.fn(),
        }
      })
    }
  )
}));

describe('RevisionPage Feature View (Magnitude 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Revision Command Center Hub with vitals and 4 action cards', () => {
    render(<RevisionPage />);

    expect(screen.getByText('Chapter Retention & Formula Hub')).toBeInTheDocument();
    expect(screen.getByText(/1 Chapters Decaying/i)).toBeInTheDocument();

    // Verify 4 hub cards
    expect(screen.getByText('Active Recall Vault & Syllabus Matrix')).toBeInTheDocument();
    expect(screen.getByText('Timed Active Recall Arena')).toBeInTheDocument();
    expect(screen.getByText('30-Second Rapid Speed Drill')).toBeInTheDocument();
    expect(screen.getByText('Feynman Technique Studio')).toBeInTheDocument();
  });

  it('navigates to Flashcard Vault stage and back to Hub', async () => {
    render(<RevisionPage />);

    // Open Vault
    const openVaultBtn = screen.getByRole('button', { name: /Open Vault & Matrix/i });
    fireEvent.click(openVaultBtn);

    await waitFor(() => {
      expect(screen.getByText('Active Recall & Revision Vault')).toBeInTheDocument();
    });

    // Return to Hub
    const backBtn = screen.getByLabelText('Back to Command Center');
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Chapter Retention & Formula Hub')).toBeInTheDocument();
    });
  });

  it('navigates to Timed Active Recall Arena stage and back to Hub', async () => {
    render(<RevisionPage />);

    // Open Arena
    const enterArenaBtn = screen.getByRole('button', { name: /Enter Timed Arena/i });
    fireEvent.click(enterArenaBtn);

    await waitFor(() => {
      expect(screen.getByText('Active Recall Sprint')).toBeInTheDocument();
    });

    // Click back / exit
    const exitBtn = screen.getByLabelText('Exit Arena');
    fireEvent.click(exitBtn);

    await waitFor(() => {
      expect(screen.getByText('Chapter Retention & Formula Hub')).toBeInTheDocument();
    });
  });

  it('navigates to 30-Second Speed Drill stage and back to Hub', async () => {
    render(<RevisionPage />);

    // Open Speed Drill
    const drillBtn = screen.getByRole('button', { name: /Launch 30s Speed Drill/i });
    fireEvent.click(drillBtn);

    await waitFor(() => {
      expect(screen.getByText('Formula Speed Drill')).toBeInTheDocument();
    });

    // Return to hub
    const backBtn = screen.getByLabelText('Exit Sprint');
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Chapter Retention & Formula Hub')).toBeInTheDocument();
    });
  });

  it('navigates to Feynman Technique Studio stage and back to Hub', async () => {
    render(<RevisionPage />);

    // Open Feynman
    const feynmanBtn = screen.getByRole('button', { name: /Open Feynman Studio/i });
    fireEvent.click(feynmanBtn);

    await waitFor(() => {
      expect(screen.getByText('Conceptual Explanation & Intuition Canvas')).toBeInTheDocument();
    });

    // Return to hub
    const backBtn = screen.getByLabelText('Back to Command Center');
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Chapter Retention & Formula Hub')).toBeInTheDocument();
    });
  });

  it('renders and navigates into Daily Spaced Retention Queue (Daily Dose) and back to Hub', async () => {
    render(<RevisionPage />);

    expect(screen.getByText('Daily Spaced Retention Queue')).toBeInTheDocument();
    expect(screen.getByText(/NTA Calibrated Daily Dose/i)).toBeInTheDocument();

    const startDailyDoseBtn = screen.getByRole('button', { name: /Start Daily Dose/i });
    fireEvent.click(startDailyDoseBtn);

    await waitFor(() => {
      expect(screen.getByText('Daily Spaced Routine')).toBeInTheDocument();
    });

    const exitBtn = screen.getByLabelText('Back to Command Center');
    fireEvent.click(exitBtn);

    await waitFor(() => {
      expect(screen.getByText('Chapter Retention & Formula Hub')).toBeInTheDocument();
    });
  });
});

