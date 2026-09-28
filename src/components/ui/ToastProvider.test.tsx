import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from './ToastProvider';

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: vi.fn(() => ({
    soundEffects: false,
    desktopNotifications: false
  }))
}));

vi.mock('@/utils/audioEngine', () => ({
  audioEngine: {
    playAlertPop: vi.fn()
  }
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

function TestToastConsumer() {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', message: 'Test message', duration: 3000 })}>
        Trigger Toast
      </button>
    </div>
  );
}

describe('ToastProvider Timer Management', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders a toast and auto-dismisses after duration', () => {
    render(
      <ToastProvider>
        <TestToastConsumer />
      </ToastProvider>
    );

    const triggerBtn = screen.getByText('Trigger Toast');
    act(() => {
      fireEvent.click(triggerBtn);
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    // Fast-forward 3000ms
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
  });

  it('clears timeout when toast is manually dismissed', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    render(
      <ToastProvider>
        <TestToastConsumer />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Trigger Toast'));
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    // Click close button
    const closeBtn = screen.getByRole('button', { name: '' });
    act(() => {
      fireEvent.click(closeBtn);
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();

    clearTimeoutSpy.mockRestore();
  });

  it('cleans up pending timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { unmount } = render(
      <ToastProvider>
        <TestToastConsumer />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Trigger Toast'));
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
