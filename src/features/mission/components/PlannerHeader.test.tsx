import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlannerHeader } from './PlannerHeader';

describe('PlannerHeader', () => {
  const defaultState = {
    dailyCapHours: 6,
    mentorProfile: { subjectSplitStrategy: '3_a_day' },
    energyLevel: 'High',
    isAutoBalancing: false,
    balanceToast: false,
    handleAutoBalance: vi.fn(),
    setIsAiRevisionModalOpen: vi.fn(),
    setIsCustomMissionModalOpen: vi.fn(),
    isAuditDropdownOpen: false,
    setIsAuditDropdownOpen: vi.fn(),
    setIsWeeklyCheckinModalOpen: vi.fn(),
    setIsInterviewModalOpen: vi.fn(),
  };

  it('renders the header title correctly', () => {
    render(<PlannerHeader state={defaultState} />);
    expect(screen.getByText('Adaptive Master Schedule')).toBeInTheDocument();
  });

  it('displays the correct capacity budget and energy level', () => {
    render(<PlannerHeader state={defaultState} />);
    expect(screen.getByText('6 hrs/day')).toBeInTheDocument();
    expect(screen.getByText('High Energy • Adaptive')).toBeInTheDocument();
  });

  it('calls handleAutoBalance when the auto-balance button is clicked', () => {
    render(<PlannerHeader state={defaultState} />);
    const balanceButton = screen.getByText('Auto-Balance Weekly Plan');
    fireEvent.click(balanceButton);
    expect(defaultState.handleAutoBalance).toHaveBeenCalledTimes(1);
  });

  it('changes button text when auto balancing is active', () => {
    const activeState = { ...defaultState, isAutoBalancing: true };
    render(<PlannerHeader state={activeState} />);
    expect(screen.getByText('Auto-Balancing...')).toBeInTheDocument();
  });

  it('changes button text when balance toast is active', () => {
    const toastState = { ...defaultState, balanceToast: true };
    render(<PlannerHeader state={toastState} />);
    expect(screen.getByText('Plan Auto-Balanced!')).toBeInTheDocument();
  });

  it('toggles the audit dropdown when clicked', () => {
    render(<PlannerHeader state={defaultState} />);
    const auditButton = screen.getByText('AI Audits & Sync');
    fireEvent.click(auditButton);
    expect(defaultState.setIsAuditDropdownOpen).toHaveBeenCalledWith(true);
  });
});
