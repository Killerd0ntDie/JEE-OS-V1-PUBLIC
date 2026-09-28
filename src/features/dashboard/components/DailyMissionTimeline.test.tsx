import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DailyMissionTimeline } from './DailyMissionTimeline';

// Mock audio engine
vi.mock('@/utils/audioEngine', () => ({
  audioEngine: {
    playPowerUp: vi.fn().mockResolvedValue(undefined),
    playTacticalBeep: vi.fn().mockResolvedValue(undefined),
  }
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast })
}));

const mockExtendSession = vi.fn().mockResolvedValue(undefined);
const mockUpdateSettings = vi.fn().mockResolvedValue(undefined);
const mockUpdateChapterData = vi.fn().mockResolvedValue(undefined);
const mockSetEnergyLevel = vi.fn();
const mockAddTodayMission = vi.fn().mockResolvedValue(undefined);

let mockStoreState: any = {};

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => selector(mockStoreState)
}));

describe('DailyMissionTimeline - Bedtime & Extend Session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      actions: {
        extendSession: mockExtendSession,
        updateSettings: mockUpdateSettings,
        updateChapterData: mockUpdateChapterData,
        setEnergyLevel: mockSetEnergyLevel,
        addTodayMission: mockAddTodayMission,
      },
      todayMissions: [],
      customMissions: [],
      estimatedRemainingHours: 0,
      plannedQuestions: 0,
      targetFinishTime: '23:00',
      chapters: [],
      chapterTelemetryMap: {},
      weeklySchedule: [],
      settings: {
        dayStartTime: '07:00',
        dayEndTime: '08:00', // early end time so current time is past day end
      }
    };
  });

  it('renders bedtime banner when past day end and toggles extend dropdown on click without hover', async () => {
    render(
      <MemoryRouter>
        <DailyMissionTimeline
          sessionState="idle"
          secondsElapsed={0}
          expandedMission={null}
          setExpandedMission={vi.fn()}
          handleStartSession={vi.fn()}
          handleResetSession={vi.fn()}
          formatTimer={vi.fn()}
        />
      </MemoryRouter>
    );

    // Verify bedtime banner is visible
    expect(screen.getByText(/Passed Scheduled Bedtime/i)).toBeInTheDocument();

    // Extend button exists
    const extendBtn = screen.getByRole('button', { name: /extend/i });
    expect(extendBtn).toBeInTheDocument();

    // Menu options are initially not open
    expect(screen.queryByText('+30 mins')).not.toBeInTheDocument();

    // Clicking extend button (mobile / touch simulation) opens dropdown
    fireEvent.click(extendBtn);
    expect(screen.getByText('+30 mins')).toBeInTheDocument();
    expect(screen.getByText('+1 hour')).toBeInTheDocument();
    expect(screen.getByText('+2 hours')).toBeInTheDocument();

    // Clicking +30 mins calls extendSession and shows toast
    fireEvent.click(screen.getByText('+30 mins'));
    expect(mockExtendSession).toHaveBeenCalledWith(0.5);
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('+30 mins'),
          type: 'success'
        })
      );
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Overtime Session Active banner when session is extended', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 23, 15, 0));

    const todayDateStr = '2026-09-07';

    mockStoreState.settings = {
      dayStartTime: '07:00',
      dayEndTime: '23:00',
      sessionExtensionDate: todayDateStr,
      sessionExtensionEnd: '23:59' // later than bedtime and current time
    };

    render(
      <MemoryRouter>
        <DailyMissionTimeline
          sessionState="idle"
          secondsElapsed={0}
          expandedMission={null}
          setExpandedMission={vi.fn()}
          handleStartSession={vi.fn()}
          handleResetSession={vi.fn()}
          formatTimer={vi.fn()}
        />
      </MemoryRouter>
    );

    // Overtime active banner renders
    expect(screen.getByText('Overtime Session Active')).toBeInTheDocument();
    expect(screen.getByText(/Extended to 23:59/i)).toBeInTheDocument();

    // Wrap Up button calls updateSettings to reset extension
    const wrapUpBtn = screen.getByRole('button', { name: /wrap up/i });
    fireEvent.click(wrapUpBtn);
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      sessionExtensionDate: undefined,
      sessionExtensionEnd: undefined
    });
  });
});
