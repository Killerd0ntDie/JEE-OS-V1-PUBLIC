import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ExamBriefingModal } from './ExamBriefingModal';
import { MockTest } from '@/types/mockTest';

describe('ExamBriefingModal', () => {
  const dummyTest: MockTest = {
    id: 'test-briefing-1',
    name: 'Full JEE Main Mock Test',
    durationMinutes: 180,
    totalMarks: 300,
    sections: [
      {
        subject: 'physics',
        questions: [
          { id: 'p1', subject: 'physics', type: 'MCQ', chapter: 'Kinematics', topic: 'Motion', difficulty: 'Medium', content: 'Q1', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } }
        ]
      }
    ]
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ExamBriefingModal
        isOpen={false}
        test={dummyTest}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders examination briefing details when open', () => {
    render(
      <ExamBriefingModal
        isOpen={true}
        test={dummyTest}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('CBT Examination Briefing')).toBeInTheDocument();
    expect(screen.getByText('Full JEE Main Mock Test')).toBeInTheDocument();
    expect(screen.getByText('180 Mins')).toBeInTheDocument();
    expect(screen.getByText('300 M')).toBeInTheDocument();
    expect(screen.getByText('+4 Correct')).toBeInTheDocument();
    expect(screen.getByText('-1 Wrong')).toBeInTheDocument();
  });

  it('triggers onConfirm when Begin Examination is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <ExamBriefingModal
        isOpen={true}
        test={dummyTest}
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    const beginBtn = screen.getByText('Begin Examination');
    fireEvent.click(beginBtn);
    expect(handleConfirm).toHaveBeenCalledWith(dummyTest);
  });

  it('triggers onCancel when Cancel is clicked', () => {
    const handleCancel = vi.fn();
    render(
      <ExamBriefingModal
        isOpen={true}
        test={dummyTest}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
