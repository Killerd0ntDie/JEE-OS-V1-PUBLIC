import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FloatingDynamicDock } from './FloatingDynamicDock';
import { storageAdapter } from '@/services/StorageAdapter';

// Mock Auth Context
vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: {
      displayName: 'Dock Aspirant',
      email: 'dock@example.com',
      photoURL: '',
      isAnonymous: false
    },
    logout: vi.fn()
  })
}));

// Mock Zustand Store
let customStoreState: any = null;
vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => {
    const defaultState = {
      chapterTelemetryMap: {},
      todayMissions: [{ id: 'm1', completed: false, title: 'Mission 1' }],
      settings: { minStreakHours: 0.5, targetYear: '2026' },
      xp: { level: 7, total: 3500 },
      analytics: { dailyAnalytics: [] },
      studySessions: [{ startTime: Date.now() - 3600000, duration: 90 }],
      actions: { clearSyncError: vi.fn() }
    };
    return selector(customStoreState || defaultState);
  }
}));

// Mock Logo
vi.mock('@/components/shared/JeeOsLogo', () => ({
  JeeOsLogo: () => <div data-testid="dock-logo">Logo</div>
}));

// Mock Toast
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

describe('FloatingDynamicDock (Radical Zero-Chrome Navigation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    customStoreState = null;
  });

  it('renders all 5 high-yield pillars and home logo', () => {
    const onOpenCommandPalette = vi.fn();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock
          onOpenCommandPalette={onOpenCommandPalette}
          onOpenShortcutGuide={vi.fn()}
        />
      </MemoryRouter>
    );

    // Verify Home Logo
    expect(screen.getByTestId('dock-logo')).toBeInTheDocument();

    // Verify 4 High-Yield Pillars
    const dashboardLink = screen.getByLabelText('Dashboard');
    const mockTestsLink = screen.getByLabelText('Mock Tests');
    const plannerLink = screen.getByLabelText('Daily Planner');
    const practiceLink = screen.getByLabelText('Practice & Revision');

    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');

    expect(mockTestsLink).toBeInTheDocument();
    expect(mockTestsLink).toHaveAttribute('href', '/mock-tests');

    expect(plannerLink).toBeInTheDocument();
    expect(plannerLink).toHaveAttribute('href', '/planner');

    expect(practiceLink).toBeInTheDocument();
    expect(practiceLink).toHaveAttribute('href', '/revision');

    // Verify Command Search Button
    const searchBtn = screen.getByLabelText('Search commands (Cmd+K)');
    expect(searchBtn).toBeInTheDocument();
    fireEvent.click(searchBtn);
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
  });

  it('highlights active state for root and nested sub-routes', () => {
    // 1. Root route: /dashboard activates Dashboard pillar
    const { unmount: unmount1 } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock onOpenCommandPalette={vi.fn()} />
      </MemoryRouter>
    );
    const dashboardBtn = screen.getByLabelText('Dashboard');
    expect(dashboardBtn.firstChild).toHaveClass('text-indigo-400');
    unmount1();

    // 2. Mock Tests route: /mock-tests activates Mock Tests pillar
    const { unmount: unmount2 } = render(
      <MemoryRouter initialEntries={['/mock-tests']}>
        <FloatingDynamicDock onOpenCommandPalette={vi.fn()} />
      </MemoryRouter>
    );
    const mockTestsBtn = screen.getByLabelText('Mock Tests');
    expect(mockTestsBtn.firstChild).toHaveClass('text-cyan-400');
    unmount2();

    // 3. Nested practice route: /mistakes activates Practice & Revision pillar
    const { unmount: unmount3 } = render(
      <MemoryRouter initialEntries={['/mistakes']}>
        <FloatingDynamicDock onOpenCommandPalette={vi.fn()} />
      </MemoryRouter>
    );
    const practiceBtn = screen.getByLabelText('Practice & Revision');
    expect(practiceBtn.firstChild).toHaveClass('text-emerald-400');
    unmount3();

    // 5. Planner route: /planner activates Daily Planner pillar
    const { unmount: unmount5 } = render(
      <MemoryRouter initialEntries={['/planner']}>
        <FloatingDynamicDock onOpenCommandPalette={vi.fn()} />
      </MemoryRouter>
    );
    const plannerBtn = screen.getByLabelText('Daily Planner');
    expect(plannerBtn.firstChild).toHaveClass('text-indigo-400');
    unmount5();
  });

  it('hides dock on standalone immersive routes like /cockpit or /diagnostic', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/cockpit']}>
        <FloatingDynamicDock onOpenCommandPalette={vi.fn()} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens user profile menu with system settings and cloud sync', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock
          onOpenCommandPalette={vi.fn()}
        />
      </MemoryRouter>
    );

    const profileBtn = screen.getByLabelText('User Profile');
    fireEvent.click(profileBtn);

    expect(screen.getByText('Dock Aspirant')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();
    expect(screen.getByText('Force Cloud Sync')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('opens notifications flyout with intelligence alerts', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock
          onOpenCommandPalette={vi.fn()}
        />
      </MemoryRouter>
    );

    const notifBtn = screen.getByLabelText('System Notifications');
    fireEvent.click(notifBtn);

    expect(screen.getByText('Intelligence Alerts')).toBeInTheDocument();
  });

  it('automatically closes open popover menu when hovering another dock item so tooltip titles are never obscured', async () => {
    const { waitFor } = await import('@testing-library/react');
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock
          onOpenCommandPalette={vi.fn()}
        />
      </MemoryRouter>
    );

    // Open notifications flyout
    const notifBtn = screen.getByLabelText('System Notifications');
    fireEvent.click(notifBtn);
    expect(screen.getByText('Intelligence Alerts')).toBeInTheDocument();

    // Hover over Dashboard button
    const dashboardBtn = screen.getByLabelText('Dashboard');
    fireEvent.mouseEnter(dashboardBtn);

    // Verify notifications popover immediately closes so the hovered icon's title is never obscured
    await waitFor(() => {
      expect(screen.queryByText('Intelligence Alerts')).not.toBeInTheDocument();
    });
  });

  it('renders telemetry metrics and creative animated elements', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock
          onOpenCommandPalette={vi.fn()}
        />
      </MemoryRouter>
    );

    // Verify streak button renders
    expect(screen.getByLabelText('Consistency Streak')).toBeInTheDocument();

    // Verify study time renders
    expect(screen.getByLabelText("Today's Study Time")).toBeInTheDocument();

    // Verify system notifications render
    expect(screen.getByLabelText('System Notifications')).toBeInTheDocument();

    // Verify user profile avatar renders
    expect(screen.getByLabelText('User Profile')).toBeInTheDocument();
  });

  it('opens monthly streak heatmap calendar grid with fire indicators when clicking streak pill', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock onOpenCommandPalette={vi.fn()} />
      </MemoryRouter>
    );

    const streakBtn = screen.getByLabelText('Consistency Streak');
    fireEvent.click(streakBtn);

    // Verify monthly streak header and fire badge render
    expect(screen.getByText(/Streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Day Fire/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Quota:/i)).toBeInTheDocument();
  });

  it('displays 0 streak and pending quota correctly when 0 minutes are logged', () => {
    customStoreState = {
      chapterTelemetryMap: {},
      todayMissions: [{ id: 'm1', completed: false, title: 'Mission 1' }],
      settings: { minStreakHours: 0.5, targetYear: '2026' },
      xp: { level: 1, total: 0, streak: 0 },
      analytics: { dailyAnalytics: [] },
      studySessions: [],
      actions: { clearSyncError: vi.fn() }
    };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock onOpenCommandPalette={vi.fn()} />
      </MemoryRouter>
    );

    const streakBtn = screen.getByLabelText('Consistency Streak');
    expect(streakBtn).toHaveTextContent('0');

    fireEvent.click(streakBtn);

    // Verify popover displays 0 Day Streak and quota remaining
    expect(screen.getByText('0 Day Streak')).toBeInTheDocument();
    expect(screen.getByText('30m Left')).toBeInTheDocument();
  });

  it('opens monthly study time log grid when clicking study time pill', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock onOpenCommandPalette={vi.fn()} />
      </MemoryRouter>
    );

    const timeBtn = screen.getByLabelText("Today's Study Time");
    fireEvent.click(timeBtn);

    // Verify monthly time log header and total render
    expect(screen.getByText(/\bLog\b/)).toBeInTheDocument();
    expect(screen.getByText(/Total/i)).toBeInTheDocument();
    expect(screen.getByText(/Today:/i)).toBeInTheDocument();
  });

  it('applies accessibility attributes and prevents keyboard traps when dock is hidden', () => {
    // 1. Unpinned / hidden state (default): aria-hidden and inert applied
    const { unmount } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock onOpenCommandPalette={vi.fn()} />
      </MemoryRouter>
    );

    const hiddenDock = screen.getByRole('navigation', { hidden: true });
    expect(hiddenDock).toHaveAttribute('aria-label', 'Application dock');
    expect(hiddenDock).toHaveAttribute('aria-hidden', 'true');
    expect(hiddenDock).toHaveAttribute('inert');
    unmount();

    // 2. Pinned state: dock is visible in accessibility tree with aria-hidden="false"
    vi.spyOn(storageAdapter, 'getDockPinned').mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <FloatingDynamicDock onOpenCommandPalette={vi.fn()} />
      </MemoryRouter>
    );

    const visibleDock = screen.getByRole('navigation', { name: 'Application dock' });
    expect(visibleDock).toBeInTheDocument();
    expect(visibleDock).toHaveAttribute('aria-hidden', 'false');
  });
});
