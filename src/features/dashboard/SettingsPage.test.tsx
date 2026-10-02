import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';

// Mock auth
vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { email: 'test@jee-os.com', displayName: 'Student' },
    loginWithGoogle: vi.fn(),
    loginWithEmail: vi.fn(),
    registerWithEmail: vi.fn(),
    logout: vi.fn(),
  })
}));

// Mock audio engine
vi.mock('@/utils/audioEngine', () => ({
  audioEngine: {
    getCockpitVolume: () => 0.5,
    setVolume: vi.fn(),
    setCockpitVolume: vi.fn(),
    playSuccess: vi.fn(),
    requestNotificationPermission: vi.fn().mockResolvedValue(false),
    sendDesktopNotification: vi.fn(),
  }
}));

const mockSetSettings = vi.fn().mockResolvedValue(undefined);
const mockUpdateMentorProfile = vi.fn().mockResolvedValue(undefined);
const mockPurgeUserData = vi.fn().mockResolvedValue(undefined);

const mockStoreState = {
  actions: {
    setSettings: mockSetSettings,
    updateMentorProfile: mockUpdateMentorProfile,
    purgeUserData: mockPurgeUserData,
    undoLatestMission: vi.fn(),
    triggerToast: vi.fn(),
    resetAllXp: vi.fn(),
    unhideAllHiddenMissions: vi.fn(),
    clearCustomMissions: vi.fn(),
  },
  settings: {
    targetYear: '2026',
    dreamIit: 'IIT Bombay',
    targetBranch: 'Computer Science & Engineering',
    dailyQuota: 6,
    soundEffects: true,
    desktopNotifications: false,
    volume: 80,
    cockpitVolume: 50,
    pauseOnTabChange: true,
    enableGodMode: true,
    dayStartTime: '07:00',
    dayEndTime: '23:00',
    minStreakHours: 0.5,
    prerequisiteEnforcementStrategy: 'parallel',
    themeMode: 'evangelion',
  },
  mentorProfile: {
    subjectSplitStrategy: '3_a_day',
    twoDaySplitConfig: undefined,
    targetYear: '2026',
    targetCollege: 'IIT Bombay',
    targetBranch: 'Computer Science & Engineering',
    dailyAvailableHours: 6,
  }
};

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => selector(mockStoreState)
}));

describe('SettingsPage Feature View (Magnitude 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Workspace Settings title and all modular settings sections', () => {
    render(<SettingsPage />);

    expect(screen.getByText('System Control & Configuration Center')).toBeInTheDocument();
    expect(screen.getByText('Workspace Settings')).toBeInTheDocument();

    // Verify key section titles or labels exist
    expect(screen.getByText(/Target Exam Year/i)).toBeInTheDocument();
    expect(screen.getByText(/Dream Institute \/ Goal/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Branch \/ Focus/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Available Study Capacity/i)).toBeInTheDocument();

    // Save button
    expect(screen.getByRole('button', { name: /Save Workspace Configuration/i })).toBeInTheDocument();
  });

  it('submits settings form and dispatches store actions', async () => {
    render(<SettingsPage />);

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Save Workspace Configuration/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSetSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          targetYear: '2026',
          dreamIit: 'IIT Bombay',
          dailyQuota: 6,
        })
      );
      expect(mockUpdateMentorProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyAvailableHours: 6,
          targetYear: '2026',
        })
      );
    });
  });

  it('changes daily study quota input', () => {
    render(<SettingsPage />);

    const sliders = screen.getAllByRole('slider');
    const quotaSlider = sliders[0];
    expect(quotaSlider).toHaveValue('6');

    fireEvent.change(quotaSlider, { target: { value: '8' } });

    expect(quotaSlider).toHaveValue('8');
    expect(screen.getByText('8 Hours / Day')).toBeInTheDocument();
  });

  it('toggles theme mode between Evangelion and Modern', async () => {
    render(<SettingsPage />);

    // Find Modern Theme clickable card
    const modernCard = screen.getByText(/Modern Minimalist \(Clean Glass\)/i);
    fireEvent.click(modernCard);

    await waitFor(() => {
      expect(mockSetSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          themeMode: 'modern'
        })
      );
    });
  });
});
