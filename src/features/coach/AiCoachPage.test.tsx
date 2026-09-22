import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AiCoachPage } from './AiCoachPage';

// Mock CoachEngine
const mockGetAnalysis = vi.fn().mockResolvedValue({
  analysis: 'Mock Coach Strategy: Focus on Electrodynamics and Calculus.',
  actions: [
    {
      type: 'ADD_MISSION',
      payload: {
        title: 'Solve 15 Electrostatics PYQs',
        chapterId: 'p12',
        subject: 'physics',
        duration: 45
      }
    }
  ]
});

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}

vi.mock('@jee-os/engines', async (importOriginal) => {
  const actual = await importOriginal<any>();
  function MockCoachEngine() {
    return {
      getAnalysis: mockGetAnalysis
    };
  }
  return {
    ...actual,
    CoachEngine: MockCoachEngine
  };
});

const mockAddAiMission = vi.fn();
const mockSetSettings = vi.fn();

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => {
    const state = {
      actions: {
        addAiMission: mockAddAiMission,
        updateChapterStatus: vi.fn(),
        setSettings: mockSetSettings,
        clearTodayMissions: vi.fn(),
      },
      settings: {
        targetYear: '2026',
        dreamIit: 'IIT Bombay',
        targetBranch: 'Computer Science',
      },
      chapterTelemetryMap: {},
      chapters: [
        { id: 'p12', name: 'Electrostatics', subject: 'physics', completion: 50, status: 'Learning' }
      ],
      mistakes: [],
      todayMissions: [],
      plannerOutput: null,
      mentorProfile: null,
      analyticsSummary: null,
      analytics: { studyTime: 120, questionsSolved: 40, accuracy: 88 },
    };
    return selector(state);
  }
}));

describe('AiCoachPage Feature View (Magnitude 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders initial tactical syllabus strategy briefing and preset suggestion pills', () => {
    render(
      <MemoryRouter>
        <AiCoachPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Tactical Syllabus Strategy/i)).toBeInTheDocument();
    expect(screen.queryByText(/Target Mission/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/IIT Bombay/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/All Strategy/i)).not.toBeInTheDocument();

    // Preset suggestion pills
    expect(screen.getByText('Analyze high-yield syllabus gaps')).toBeInTheDocument();
    expect(screen.getByText('Clear active backlog fast')).toBeInTheDocument();
    expect(screen.getByText('Recommend 3 priorities for Physics')).toBeInTheDocument();
    expect(screen.getByText('Generate 3-day emergency revision drill')).toBeInTheDocument();

    // Input bar
    expect(screen.getByPlaceholderText('Ask AI Mentor anything...')).toBeInTheDocument();
  });

  it('submits a user prompt and renders AI Coach response with tactical actions', async () => {
    render(
      <MemoryRouter>
        <AiCoachPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Ask AI Mentor anything...');
    fireEvent.change(input, { target: { value: 'How should I study Physics today?' } });

    // Submit form
    const form = input.closest('form')!;
    fireEvent.submit(form);

    // User message should appear immediately
    expect(screen.getByText('How should I study Physics today?')).toBeInTheDocument();

    // Wait for CoachEngine reply
    await waitFor(() => {
      expect(mockGetAnalysis).toHaveBeenCalled();
      expect(screen.getByText(/Mock Coach Strategy: Focus on Electrodynamics and Calculus/i)).toBeInTheDocument();
    });

    // Recommended tactical actions should be rendered
    expect(screen.getByText('Recommended Tactical Actions')).toBeInTheDocument();
    expect(screen.getByText('Solve 15 Electrostatics PYQs')).toBeInTheDocument();

    // Click "Add to Plan"
    const addPlanBtn = screen.getByRole('button', { name: /Add to Plan/i });
    fireEvent.click(addPlanBtn);

    await waitFor(() => {
      expect(mockAddAiMission).toHaveBeenCalledWith(
        expect.objectContaining({
          taskName: 'Solve 15 Electrostatics PYQs',
          chapter: 'p12',
          subject: 'physics'
        })
      );
    });
  });

  it('triggers a preset suggestion pill directly', async () => {
    render(
      <MemoryRouter>
        <AiCoachPage />
      </MemoryRouter>
    );

    const presetBtn = screen.getByText('Analyze high-yield syllabus gaps');
    fireEvent.click(presetBtn);

    // Preset query should appear in messages
    expect(screen.getAllByText('Analyze high-yield syllabus gaps').length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(mockGetAnalysis).toHaveBeenCalled();
    });
  });

  it('toggles session history drawer', async () => {
    render(
      <MemoryRouter>
        <AiCoachPage />
      </MemoryRouter>
    );

    const historyBtn = screen.getByTitle('Session History');
    fireEvent.click(historyBtn);

    await waitFor(() => {
      expect(screen.getByText('Session History')).toBeInTheDocument();
    });
  });
});
