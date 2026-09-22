import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { FocusVaultPage } from './FocusVaultPage';

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@jee-os.com' }
  })
}));

const mockCompleteStudySession = vi.fn();
vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => {
    const state = {
      actions: {
        completeStudySession: mockCompleteStudySession,
      }
    };
    return selector(state);
  }
}));

describe('FocusVaultPage Feature View (Magnitude 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders Focus Vault timer banner, subject selector, and lo-fi stream player', () => {
    render(<FocusVaultPage />);

    expect(screen.getByText(/Focus Vault/i)).toBeInTheDocument();
    expect(screen.getByText(/A minimalist deep-work zone/i)).toBeInTheDocument();

    // Verify subject selectors
    expect(screen.getByRole('button', { name: 'physics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'chemistry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'maths' })).toBeInTheDocument();

    // Default 50 minutes input
    const minutesInput = screen.getByLabelText('Custom session duration in minutes');
    expect(minutesInput).toHaveValue(50);
    expect(screen.getByText(':00')).toBeInTheDocument();

    // Start, reset, and early end buttons
    expect(screen.getByLabelText('Start Session')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset Timer')).toBeInTheDocument();
    expect(screen.getByLabelText('End & Log Session Early')).toBeInTheDocument();

    // Lo-Fi Player
    expect(screen.getByText('Lofi Girl Radio')).toBeInTheDocument();
  });

  it('changes target subject and custom duration', () => {
    render(<FocusVaultPage />);

    // Select Chemistry
    const chemBtn = screen.getByRole('button', { name: 'chemistry' });
    fireEvent.click(chemBtn);
    expect(chemBtn.className).toContain('text-emerald-300');

    // Change minutes to 25
    const minutesInput = screen.getByLabelText('Custom session duration in minutes');
    fireEvent.change(minutesInput, { target: { value: '25' } });
    expect(minutesInput).toHaveValue(25);
  });

  it('starts, pauses, and resets timer session', () => {
    vi.useFakeTimers();

    render(<FocusVaultPage />);

    const startBtn = screen.getByLabelText('Start Session');
    fireEvent.click(startBtn);

    // Button label toggles to Pause
    expect(screen.getByLabelText('Pause Session')).toBeInTheDocument();

    // Advance timer 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Pause
    const pauseBtn = screen.getByLabelText('Pause Session');
    fireEvent.click(pauseBtn);
    expect(screen.getByLabelText('Start Session')).toBeInTheDocument();

    // Reset
    const resetBtn = screen.getByLabelText('Reset Timer');
    fireEvent.click(resetBtn);

    const minutesInput = screen.getByLabelText('Custom session duration in minutes');
    expect(minutesInput).toHaveValue(50);

    vi.useRealTimers();
  });

  it('cycles Lo-Fi music stations and toggles mute audio', () => {
    render(<FocusVaultPage />);

    expect(screen.getByText('Lofi Girl Radio')).toBeInTheDocument();

    // Next station
    const nextBtn = screen.getByLabelText('Next Station');
    fireEvent.click(nextBtn);
    expect(screen.getByText('Synthwave Radio')).toBeInTheDocument();

    // Mute toggle
    const muteBtn = screen.getByLabelText('Mute Lofi Audio');
    fireEvent.click(muteBtn);
    expect(screen.getByLabelText('Unmute Lofi Audio')).toBeInTheDocument();
  });
});
