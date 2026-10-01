import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevisionPage } from './RevisionPage';

// Mock Toast
const mockToast = vi.fn();
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock FormulaVaultPage to isolate RevisionPage tab switching tests
vi.mock('@/features/formulas/FormulaVaultPage', () => ({
  FormulaVaultPage: () => (
    <div data-testid="formula-vault-page">
      <div>JEE FORMULA REPOSITORY</div>
      <div>Formula & Theorem Vault</div>
    </div>
  )
}));

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

  it('renders Revision Command Center Hub with vitals and 3 action cards', () => {
    render(<RevisionPage />);

    expect(screen.getByText('Chapter Retention & Formula Hub')).toBeInTheDocument();
    expect(screen.getByText(/1 Chapters Decaying/i)).toBeInTheDocument();

    // Verify 3 hub cards
    expect(screen.getByText('Active Recall Vault & Syllabus Matrix')).toBeInTheDocument();
    expect(screen.getByText('Timed Active Recall Arena')).toBeInTheDocument();
    expect(screen.getByText('30-Second Rapid Speed Drill')).toBeInTheDocument();
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

  it('renders top-level navigation tabs [Formula Vault] | [Spaced Review & Recall] | [30s Speed Drill]', () => {
    render(<RevisionPage />);

    expect(screen.getByRole('button', { name: /^Formula Vault$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Spaced Review & Recall$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^30s Speed Drill$/i })).toBeInTheDocument();
  });

  it('switches between Formula Vault and Spaced Review tabs', async () => {
    render(<RevisionPage />);

    // Click Formula Vault tab
    const formulaVaultTab = screen.getByRole('button', { name: /^Formula Vault$/i });
    fireEvent.click(formulaVaultTab);

    // Should embed Formula Vault
    await waitFor(() => {
      expect(screen.getByText('JEE FORMULA REPOSITORY')).toBeInTheDocument();
      expect(screen.getByText('Formula & Theorem Vault')).toBeInTheDocument();
    });

    // Switch back to Spaced Review & Recall tab
    const spacedReviewTab = screen.getByRole('button', { name: /^Spaced Review & Recall$/i });
    fireEvent.click(spacedReviewTab);

    await waitFor(() => {
      expect(screen.getByText('Chapter Retention & Formula Hub')).toBeInTheDocument();
    });
  });

  it('switches to 30s Speed Drill via top navigation tab', async () => {
    render(<RevisionPage />);

    const speedDrillTab = screen.getByRole('button', { name: /^30s Speed Drill$/i });
    fireEvent.click(speedDrillTab);

    await waitFor(() => {
      expect(screen.getByText('Formula Speed Drill')).toBeInTheDocument();
    });
  });

  it('guarantees mutual exclusivity: clicking Formula Vault tab while inside a subview cleanly hides the subview', async () => {
    render(<RevisionPage />);

    // 1. Open Flashcard Vault subview
    const openVaultBtn = screen.getByRole('button', { name: /Open Vault & Matrix/i });
    fireEvent.click(openVaultBtn);

    await waitFor(() => {
      expect(screen.getByText('Active Recall & Revision Vault')).toBeInTheDocument();
    });

    // 2. Switch to Formula Vault tab
    const formulaVaultTab = screen.getByRole('button', { name: /^Formula Vault$/i });
    fireEvent.click(formulaVaultTab);

    // 3. Formula Vault is visible, and Flashcard Vault subview is NOT rendered
    await waitFor(() => {
      expect(screen.getByText('JEE FORMULA REPOSITORY')).toBeInTheDocument();
      expect(screen.queryByText('Active Recall & Revision Vault')).not.toBeInTheDocument();
    });
  });
});


