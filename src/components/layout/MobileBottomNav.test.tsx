import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileBottomNav } from './MobileBottomNav';

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { displayName: 'Mobile Aspirant' },
    logout: vi.fn()
  })
}));

describe('MobileBottomNav', () => {
  it('renders primary navigation tabs on mobile', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileBottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Missions')).toBeInTheDocument();
    expect(screen.getByText('Planner')).toBeInTheDocument();
    expect(screen.getByText('AI Coach')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('opens More bottom sheet on click', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileBottomNav />
      </MemoryRouter>
    );

    const moreBtn = screen.getByLabelText('More navigation options');
    fireEvent.click(moreBtn);

    expect(screen.getByText('Navigation & Features')).toBeInTheDocument();
    expect(screen.getByText('Subjects')).toBeInTheDocument();
    expect(screen.getByText('Practice Vault')).toBeInTheDocument();
    expect(screen.getByText('Intelligence')).toBeInTheDocument();
  });
});
