import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineMissionItem } from './TimelineMissionItem';

describe('TimelineMissionItem - Subject-Specific Live Glow', () => {
  const defaultProps = {
    chap: null,
    chapterTelemetryMap: {},
    isLive: true,
    isNextUp: false,
    isSelected: false,
    isExpanded: false,
    isDismissed: false,
    isResumable: false,
    sessionState: 'idle' as const,
    selectedMissionId: null,
    badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    slotText: '12:45 PM - 02:45 PM',
    isOverBudget: false,
    onSelect: vi.fn(),
    onToggleComplete: vi.fn(),
    onDelete: vi.fn(),
    onToggleExpand: vi.fn(),
    onEditMission: vi.fn(),
    onStartSession: vi.fn(),
    onOpenChapterEditModal: vi.fn(),
    handleResetSession: vi.fn(),
  };

  it('renders Mathematics live sortie with indigo theme, NOT hardcoded emerald', () => {
    const mathMission = {
      id: 'm1',
      subject: 'maths',
      taskName: 'Complex Numbers & Quadratic Equations',
      chapter: 'Complex Numbers',
      type: 'Lecture',
      duration: 120,
      completed: false,
      unlocked: true,
      xp: 100,
    };

    render(<TimelineMissionItem {...defaultProps} mission={mathMission as any} />);

    // Live pill should use indigo theme
    const livePill = screen.getByText(/LIVE · 12:45 PM - 02:45 PM/i);
    expect(livePill.className).toContain('text-indigo-300');
    expect(livePill.className).not.toContain('text-emerald-300');

    // Start mission button should be solid indigo, without gradient
    const startButton = screen.getByRole('button', { name: /start mission/i });
    expect(startButton.className).toContain('bg-indigo-600');
    expect(startButton.className).not.toContain('bg-gradient-to-r');
    expect(startButton.className).not.toContain('bg-emerald-600');
  });

  it('renders Physics live sortie with sky theme', () => {
    const physMission = {
      id: 'p1',
      subject: 'physics',
      taskName: 'Rotational Motion',
      chapter: 'Rotational Motion',
      type: 'Lecture',
      duration: 90,
      completed: false,
      unlocked: true,
      xp: 80,
    };

    render(
      <TimelineMissionItem
        {...defaultProps}
        mission={physMission as any}
        badgeStyle="bg-sky-500/20 text-sky-300 border-sky-500/30"
      />
    );

    const livePill = screen.getByText(/LIVE · 12:45 PM - 02:45 PM/i);
    expect(livePill.className).toContain('text-sky-300');
    expect(livePill.className).not.toContain('text-emerald-300');

    const startButton = screen.getByRole('button', { name: /start mission/i });
    expect(startButton.className).toContain('bg-sky-600');
    expect(startButton.className).not.toContain('bg-gradient-to-r');
  });

  it('renders Chemistry live sortie with emerald theme', () => {
    const chemMission = {
      id: 'c1',
      subject: 'chemistry',
      taskName: 'Thermodynamics & Thermochemistry',
      chapter: 'Thermodynamics',
      type: 'Lecture',
      duration: 90,
      completed: false,
      unlocked: true,
      xp: 80,
    };

    render(
      <TimelineMissionItem
        {...defaultProps}
        mission={chemMission as any}
        badgeStyle="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      />
    );

    const livePill = screen.getByText(/LIVE · 12:45 PM - 02:45 PM/i);
    expect(livePill.className).toContain('text-emerald-300');

    const startButton = screen.getByRole('button', { name: /start mission/i });
    expect(startButton.className).toContain('bg-emerald-600');
    expect(startButton.className).not.toContain('bg-gradient-to-r');
  });

  it('renders Break live sortie with amber theme', () => {
    const breakMission = {
      id: 'b1',
      subject: 'break',
      taskName: 'Power Nap & Refreshment',
      chapter: 'Break',
      type: 'BREAK',
      duration: 15,
      completed: false,
      unlocked: true,
      xp: 0,
    };

    render(<TimelineMissionItem {...defaultProps} mission={breakMission as any} />);

    expect(screen.getByText(/LIVE NOW/i)).toBeInTheDocument();
    expect(screen.getByText(/Power Nap & Refreshment/i)).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /start/i });
    expect(startBtn.className).toContain('bg-amber-500');
  });
});
