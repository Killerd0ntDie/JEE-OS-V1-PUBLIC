import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
    render(<MemoryRouter><PlannerHeader state={defaultState} /></MemoryRouter>);
    expect(screen.getByText('Adaptive Master Schedule')).toBeInTheDocument();
  });

  it('displays the correct capacity budget and energy level', () => {
    render(<MemoryRouter><PlannerHeader state={defaultState} /></MemoryRouter>);
    expect(screen.getByText(/6\s*h\/day/)).toBeInTheDocument();
    expect(screen.getByText(/High\s*Energy/i)).toBeInTheDocument();
  });

  it('calls handleAutoBalance when the auto-balance button is clicked', () => {
    render(<MemoryRouter><PlannerHeader state={defaultState} /></MemoryRouter>);
    const balanceButton = screen.getByText('Auto-Balance Weekly Plan');
    fireEvent.click(balanceButton);
    expect(defaultState.handleAutoBalance).toHaveBeenCalledTimes(1);
  });

  it('changes button text when auto balancing is active', () => {
    const activeState = { ...defaultState, isAutoBalancing: true };
    render(<MemoryRouter><PlannerHeader state={activeState} /></MemoryRouter>);
    expect(screen.getByText('Auto-Balancing...')).toBeInTheDocument();
  });

  it('changes button text when balance toast is active', () => {
    const toastState = { ...defaultState, balanceToast: true };
    render(<MemoryRouter><PlannerHeader state={toastState} /></MemoryRouter>);
    expect(screen.getByText('Plan Balanced!')).toBeInTheDocument();
  });

  it('toggles the audit dropdown when clicked', () => {
    render(<MemoryRouter><PlannerHeader state={defaultState} /></MemoryRouter>);
    const auditButton = screen.getByText('AI Audits & Sync');
    fireEvent.click(auditButton);
    expect(defaultState.setIsAuditDropdownOpen).toHaveBeenCalledWith(true);
  });
});
