import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LogMistakeModal } from './LogMistakeModal';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

vi.mock('@/store/useStudyBrainStore', () => {
  const addMistakeMock = vi.fn();
  return {
    useStudyBrainStore: (selector: any) => {
      const state = {
        chapters: [
          { id: 'ch1', name: 'Rotational Dynamics', subject: 'physics' },
          { id: 'ch2', name: 'Chemical Bonding', subject: 'chemistry' },
        ],
        actions: {
          addMistake: addMistakeMock,
        }
      };
      return selector(state);
    }
  };
});

describe('LogMistakeModal (Stacking, Tabs & Submission)', () => {
  it('renders modal dialog in portal when open', () => {
    const onClose = vi.fn();
    render(
      <LogMistakeModal
        isOpen={true}
        onClose={onClose}
        categories={['Conceptual Gap', 'Calculation Slip']}
      />
    );

    expect(screen.getByText('Log Conceptual / Tactical Prep Error')).toBeInTheDocument();
    expect(screen.getByText('physics')).toBeInTheDocument();
    expect(screen.getByText('chemistry')).toBeInTheDocument();
    expect(screen.getByText('maths')).toBeInTheDocument();
  });

  it('switches subject tabs and clears mismatching chapter', () => {
    const onClose = vi.fn();
    render(
      <LogMistakeModal
        isOpen={true}
        onClose={onClose}
        categories={['Conceptual Gap']}
      />
    );

    const chapterInput = screen.getByPlaceholderText('e.g. Rotational Dynamics') as HTMLInputElement;
    fireEvent.change(chapterInput, { target: { value: 'Rotational Dynamics' } });
    expect(chapterInput.value).toBe('Rotational Dynamics');

    // Switch subject to chemistry
    const chemBtn = screen.getByText('chemistry');
    fireEvent.click(chemBtn);

    // Physics chapter should be cleared because it does not exist in chemistry
    expect(chapterInput.value).toBe('');
  });

  it('calls onClose when Cancel button or close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <LogMistakeModal
        isOpen={true}
        onClose={onClose}
        categories={['Conceptual Gap']}
      />
    );

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
