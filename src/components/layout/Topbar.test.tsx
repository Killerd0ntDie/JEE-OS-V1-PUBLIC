import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Topbar } from './Topbar';

// Mock Auth Context
vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: {
      displayName: 'Top Aspirant',
      email: 'top@example.com',
      photoURL: '',
      isAnonymous: false
    },
    logout: vi.fn()
  })
}));

// Mock Zustand Store
vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => {
    const state = {
      chapterTelemetryMap: {},
      todayMissions: [{ id: 'm1', completed: false, title: 'Mission 1' }],
      settings: { minStreakHours: 0.5, targetYear: '2026' },
      xp: { level: 5, total: 2500 },
      analytics: { dailyAnalytics: [] },
      studySessions: [{ startTime: Date.now() - 3600000, duration: 60 }],
      actions: { clearSyncError: vi.fn() }
    };
    return selector(state);
  }
}));

// Mock Logo
vi.mock('@/components/shared/JeeOsLogo', () => ({
  JeeOsLogo: () => <div data-testid="topbar-logo">Logo</div>
}));

// Mock Toast
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

describe('Topbar (Floating Command HUD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the floating breadcrumb and command search trigger', () => {
    const onOpenCommandPalette = vi.fn();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Topbar
          onOpenCommandPalette={onOpenCommandPalette}
          onOpenShortcutGuide={vi.fn()}
          onToggleSidebarMobile={vi.fn()}
          isSidebarCollapsed={true}
          onToggleSidebarCollapse={vi.fn()}
        />
      </MemoryRouter>
    );

    // Verify Brand Logo and Active Page
    expect(screen.getByTestId('topbar-logo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch current page/i })).toHaveTextContent('Dashboard');

    // Verify Command Search Button (⌘K)
    const searchBtn = screen.getByLabelText('Search commands and topics (Cmd+K)');
    expect(searchBtn).toBeInTheDocument();
    fireEvent.click(searchBtn);
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
  });

  it('displays streak and study time pills and notification button', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Topbar
          onOpenCommandPalette={vi.fn()}
          onOpenShortcutGuide={vi.fn()}
          onToggleSidebarMobile={vi.fn()}
          isSidebarCollapsed={true}
          onToggleSidebarCollapse={vi.fn()}
        />
      </MemoryRouter>
    );

    // Notification bell button
    const bellBtn = screen.getByLabelText('System Notifications and Alerts');
    expect(bellBtn).toBeInTheDocument();

    // Open notifications
    fireEvent.click(bellBtn);
    expect(screen.getByText('Intelligence Alerts')).toBeInTheDocument();
  });

  it('opens user profile menu on click', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Topbar
          onOpenCommandPalette={vi.fn()}
          onOpenShortcutGuide={vi.fn()}
          onToggleSidebarMobile={vi.fn()}
          isSidebarCollapsed={true}
          onToggleSidebarCollapse={vi.fn()}
        />
      </MemoryRouter>
    );

    const profileBtn = screen.getByLabelText('User Profile Options');
    expect(profileBtn).toBeInTheDocument();

    fireEvent.click(profileBtn);
    expect(screen.getByText('System Settings')).toBeInTheDocument();
    expect(screen.getByText('Force Cloud Sync')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });
});
