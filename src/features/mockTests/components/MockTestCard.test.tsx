import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MockTestCard } from './MockTestCard';
import { MockTest } from '@/types/mockTest';

describe('MockTestCard', () => {
  const dummyTest: MockTest = {
    id: 'test-card-1',
    name: 'Gravitation & Fluid Mechanics Drill',
    durationMinutes: 45,
    totalMarks: 60,
    sections: [
      {
        subject: 'physics',
        questions: [
          { id: '1', subject: 'physics', type: 'MCQ', chapter: 'Gravitation', topic: 'Kepler', difficulty: 'Hard', content: 'Q1', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } },
          { id: '2', subject: 'physics', type: 'MCQ', chapter: 'Gravitation', topic: 'Kepler', difficulty: 'Hard', content: 'Q2', correctAnswer: '0', marks: { correct: 4, incorrect: -1 } },
        ]
      }
    ]
  };

  it('renders test card metadata and difficulty badge correctly', () => {
    render(
      <MockTestCard
        test={dummyTest}
        onStart={vi.fn()}
        onPrint={vi.fn()}
        onDelete={vi.fn()}
        isCustom={false}
        navigate={vi.fn()}
      />
    );

    expect(screen.getByText('Gravitation & Fluid Mechanics Drill')).toBeInTheDocument();
    expect(screen.getByText('45 Mins')).toBeInTheDocument();
    expect(screen.getByText('2 Qs • 60 M')).toBeInTheDocument();
    expect(screen.getByText('Challenging')).toBeInTheDocument();
    expect(screen.getByText('Unattempted CBT Simulation')).toBeInTheDocument();
  });

  it('triggers onStart when Start Test button is clicked', () => {
    const handleStart = vi.fn();
    render(
      <MockTestCard
        test={dummyTest}
        onStart={handleStart}
        onPrint={vi.fn()}
        onDelete={vi.fn()}
        isCustom={false}
        navigate={vi.fn()}
      />
    );

    const startBtn = screen.getByText('Start Test');
    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalledWith(dummyTest);
  });
});
