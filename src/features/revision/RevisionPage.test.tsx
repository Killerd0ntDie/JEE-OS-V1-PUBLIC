import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevisionPage } from './RevisionPage';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

// Mock Toast
const mockToast = vi.fn();
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock FormulaVaultPage to isolate RevisionPage Formula browsing
vi.mock('@/features/formulas/FormulaVaultPage', () => ({
  FormulaVaultPage: ({ onBack }: any) => (
    <div data-testid="formula-vault-page">
      <div>JEE FORMULA REPOSITORY</div>
      <div>Formula & Theorem Vault</div>
      {onBack && (
        <button type="button" onClick={onBack}>
          Back to Spaced Revision
        </button>
      )}
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
    subject: 'physics' as const,
    title: 'Velocity-Time Equation',
    concept: 'Constant acceleration kinematics',
    formula: 'v = u + at',
    latex: 'v = u + at',
    masteryScore: 80,
    retentionConfidence: 'High' as const,
    retentionScore: 80,
    nextReviewDays: 3,
    intervalStage: '3d',
    recalledCount: 2,
    urgencyRank: 20
  },
  {
    id: 'card-2',
    chapterId: 'c1',
    chapterName: 'Thermodynamics',
    subject: 'chemistry' as const,
    title: 'First Law of Thermodynamics',
    concept: 'Internal energy conservation',
    formula: '\\Delta U = q + w',
    latex: '\\Delta U = q + w',
    masteryScore: 40,
    retentionConfidence: 'Low' as const,
    retentionScore: 40,
    nextReviewDays: 1,
    intervalStage: '1d',
    recalledCount: 1,
    urgencyRank: 90
  }
];

const mockDueChapter = {
  chapterId: 'c1',
  chapterName: 'Thermodynamics',
  subject: 'chemistry' as const,
  status: 'Revision Due',
  completion: 60,
  revisionCount: 1,
  daysOverdue: 2,
  urgency: 'overdue' as const,
  dueReason: 'Overdue by 2 days',
  formulaCardsCount: 8,
  mistakeCardsCount: 0,
  totalCardsCount: 8,
  cards: [mockCards[1]]
};

const mockUpcomingChapter = {
  chapterId: 'p1',
  chapterName: 'Kinematics',
  subject: 'physics' as const,
  status: 'Active',
  completion: 80,
  revisionCount: 2,
  nextRevisionDueAt: new Date(Date.now() + 2 * 86400000).toISOString(),
  daysOverdue: 0,
  urgency: 'upcoming' as const,
  dueReason: 'Scheduled SM-2 review',
  formulaCardsCount: 5,
  mistakeCardsCount: 0,
  totalCardsCount: 5,
  cards: [mockCards[0]]
};

const defaultStoreState = {
  actions: {
    gradeFlashcard: vi.fn(),
    recordStudySession: vi.fn(),
    openChapterEditModal: vi.fn(),
    gradeFlashcardsBatch: vi.fn().mockResolvedValue(undefined),
    completeRevision: vi.fn().mockResolvedValue(undefined)
  },
  studySessions: [],
  mistakes: [],
  revisionTelemetry: {
    cards: mockCards,
    urgentCards: [mockCards[1]],
    overdueChapters: [],
    upcomingChapters: [],
    masteredChapters: [],
    notStartedChapters: [],
    dueChapters: [mockDueChapter],
    dueCards: [mockCards[1]],
    upcomingDueChapters: [mockUpcomingChapter],
    stats: {
      totalOverdue: 1,
      totalUpcoming: 1,
      totalMastered: 1,
      totalNotStarted: 0,
      avgRetentionScore: 78,
      reviewedTodayCount: 1
    }
  }
};

const mockStore = vi.fn((selector: any) => selector(defaultStoreState));

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: Object.assign(
    (selector: any) => mockStore(selector),
    {
      mockImplementationOnce: (impl: any) => mockStore.mockImplementationOnce(impl),
      getState: () => defaultStoreState
    }
  )
}));

describe('RevisionPage Overhauled View (Magnitude 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders single unified header with chapter, card, and time estimate', () => {
    render(<RevisionPage />);

    expect(screen.getByText(/Today: 1 chapter · 1 card · ~5 min/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start revision/i })).toBeInTheDocument();
  });

  it('renders Due Today chapters list with Revise button', () => {
    render(<RevisionPage />);

    expect(screen.getByText('Due Today')).toBeInTheDocument();
    expect(screen.getByText('Thermodynamics')).toBeInTheDocument();
    expect(screen.getByText('Overdue by 2 days')).toBeInTheDocument();
    expect(screen.getByText(/8 cards/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Revise$/i })).toBeInTheDocument();
  });

  it('renders Coming Up (Next 7 Days) section with upcoming chapters', () => {
    render(<RevisionPage />);

    expect(screen.getByText('Coming Up (Next 7 Days)')).toBeInTheDocument();
    expect(screen.getByText('Kinematics')).toBeInTheDocument();
  });

  it('launches RevisionSession when clicking Start revision button', async () => {
    render(<RevisionPage />);

    const startBtn = screen.getByRole('button', { name: /Start revision/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      // RevisionSession should render the active card
      expect(screen.getByText('First Law of Thermodynamics')).toBeInTheDocument();
      expect(screen.getByText(/Show Answer/i)).toBeInTheDocument();
    });
  });

  it('launches RevisionSession when clicking Revise on a chapter card', async () => {
    render(<RevisionPage />);

    const reviseBtn = screen.getByRole('button', { name: /^Revise$/i });
    fireEvent.click(reviseBtn);

    await waitFor(() => {
      expect(screen.getByText('First Law of Thermodynamics')).toBeInTheDocument();
      expect(screen.getByText(/Show Answer/i)).toBeInTheDocument();
    });
  });

  it('switches to Formula Vault when clicking Browse Formula Vault and back to Spaced Revision', async () => {
    render(<RevisionPage />);

    // Click Browse Formula Vault in header
    const browseBtn = screen.getByRole('button', { name: /Browse Formula Vault/i });
    fireEvent.click(browseBtn);

    await waitFor(() => {
      expect(screen.getByTestId('formula-vault-page')).toBeInTheDocument();
      expect(screen.getByText('Back to Spaced Revision')).toBeInTheDocument();
    });

    // Click Back to Spaced Revision
    const backBtn = screen.getByRole('button', { name: /Back to Spaced Revision/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText(/Today: 1 chapter · 1 card · ~5 min/i)).toBeInTheDocument();
    });
  });

  it('renders pending mistakes reminder banner when unmastered mistakes exist', () => {
    (useStudyBrainStore as any).mockImplementationOnce((selector: any) => {
      const state = {
        actions: {
          gradeFlashcard: vi.fn(),
          recordStudySession: vi.fn(),
          openChapterEditModal: vi.fn(),
          gradeFlashcardsBatch: vi.fn().mockResolvedValue(undefined),
          completeRevision: vi.fn().mockResolvedValue(undefined)
        },
        studySessions: [],
        mistakes: [
          { id: 'm1', revisionStatus: 'New', topic: 'Friction' }
        ],
        revisionTelemetry: {
          cards: [],
          urgentCards: [],
          overdueChapters: [],
          upcomingChapters: [],
          masteredChapters: [],
          notStartedChapters: [],
          dueChapters: [],
          dueCards: [],
          upcomingDueChapters: [],
          stats: {
            totalOverdue: 0,
            totalUpcoming: 0,
            totalMastered: 1,
            totalNotStarted: 0,
            avgRetentionScore: 85,
            reviewedTodayCount: 0,
            pendingMistakesCount: 1
          }
        }
      };
      return selector(state);
    });

    render(<RevisionPage />);
    expect(screen.getByText(/1 Mistake Pending Review/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review in Mistake Vault/i })).toBeInTheDocument();
    expect(screen.getByText('All Caught Up for Today!')).toBeInTheDocument();
  });
});

