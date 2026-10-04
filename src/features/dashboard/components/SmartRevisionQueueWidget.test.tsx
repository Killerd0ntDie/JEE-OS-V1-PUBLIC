import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DailyChapterReviewWidget, SmartRevisionQueueWidget } from './SmartRevisionQueueWidget';
import { Chapter } from '@/types/index';

// Mock audio engine
vi.mock('@/utils/audioEngine', () => ({
  audioEngine: {
    playPowerUp: vi.fn().mockResolvedValue(undefined),
    playRadioRelayClick: vi.fn().mockResolvedValue(undefined),
  }
}));

let mockStoreState: any = {};

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => selector(mockStoreState)
}));

describe('DailyChapterReviewWidget (Clean Chapter Review Task List)', () => {
  const mockChapters = [
    {
      id: 'phy-1',
      name: 'Rotational Motion',
      subject: 'physics',
      status: 'Mastered',
      completion: 100,
      confidence: 85,
      theoryComplete: true,
      dppComplete: true,
      lastRevisionDaysAgo: 2,
      revisionCount: 2,
      solvedQuestions: 45
    },
    {
      id: 'chem-1',
      name: 'Thermodynamics',
      subject: 'chemistry',
      status: 'Mastered',
      completion: 100,
      confidence: 90,
      theoryComplete: true,
      dppComplete: true,
      lastRevisionDaysAgo: 1,
      revisionCount: 3,
      solvedQuestions: 60
    },
    {
      id: 'math-1',
      name: 'Differential Equations',
      subject: 'maths',
      status: 'Revision Due',
      completion: 80,
      confidence: 70,
      theoryComplete: true,
      dppComplete: false,
      lastRevisionDaysAgo: 9,
      revisionCount: 1,
      weaknessScore: 48,
      solvedQuestions: 20
    }
  ] as unknown as Chapter[];

  const mockActions = {
    openChapterEditModal: vi.fn(),
    completeRevision: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      chapters: mockChapters,
      actions: mockActions
    };
  });

  it('renders Daily Chapter Review header, subject filters, and due review items', () => {
    render(
      <MemoryRouter>
        <DailyChapterReviewWidget />
      </MemoryRouter>
    );

    // Verify title and badge
    expect(screen.getByText('Daily Chapter Review')).toBeInTheDocument();
    expect(screen.getByText('1 DUE')).toBeInTheDocument();

    // Verify subject tabs
    expect(screen.getByRole('button', { name: /^all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^physics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^chemistry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^maths/i })).toBeInTheDocument();

    // Verify chapter card details
    expect(screen.getByText('Differential Equations')).toBeInTheDocument();
    expect(screen.getByText('Revision Due')).toBeInTheDocument();
    expect(screen.getByText(/Revised 9d ago/i)).toBeInTheDocument();
    expect(screen.getByText(/48% Weakness/i)).toBeInTheDocument();

    // Verify footer links
    expect(screen.getByText('Formulas')).toBeInTheDocument();
    expect(screen.getByText('Mistakes')).toBeInTheDocument();
    expect(screen.getByText('Planner')).toBeInTheDocument();
  });

  it('triggers openChapterEditModal when clicking Review button', () => {
    render(
      <MemoryRouter>
        <SmartRevisionQueueWidget />
      </MemoryRouter>
    );

    const reviewBtn = screen.getByRole('button', { name: /review/i });
    fireEvent.click(reviewBtn);

    expect(mockActions.openChapterEditModal).toHaveBeenCalledWith('math-1');
  });

  it('marks chapter reviewed and triggers completeRevision when clicking Done button', async () => {
    render(
      <MemoryRouter>
        <DailyChapterReviewWidget />
      </MemoryRouter>
    );

    const doneBtn = screen.getByRole('button', { name: /done/i });
    fireEvent.click(doneBtn);

    expect(mockActions.completeRevision).toHaveBeenCalledWith('math-1', 'High');
  });

  it('displays clean All Reviewed empty state when no chapters are overdue', () => {
    // Set all chapters to recently reviewed
    mockStoreState = {
      chapters: [
        {
          id: 'phy-1',
          name: 'Kinematics',
          subject: 'physics',
          status: 'Mastered',
          completion: 100,
          theoryComplete: true,
          lastRevisionDaysAgo: 2,
          revisionCount: 2
        }
      ],
      actions: mockActions
    };

    render(
      <MemoryRouter>
        <DailyChapterReviewWidget />
      </MemoryRouter>
    );

    expect(screen.getByText('ALL REVIEWED')).toBeInTheDocument();
    expect(screen.getByText('All Studied Chapters Reviewed')).toBeInTheDocument();
    expect(screen.getByText('Review Formulas')).toBeInTheDocument();
    expect(screen.getByText('Review Mistakes')).toBeInTheDocument();
  });
});
