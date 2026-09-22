import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MockTestEvaluatingScreen } from './MockTestEvaluatingScreen';
import { MockTest } from '@/types/mockTest';

describe('MockTestEvaluatingScreen', () => {
  const dummyTest: MockTest = {
    id: 'eval-test-1',
    name: 'Full JEE Grand Simulation 2026',
    durationMinutes: 180,
    totalMarks: 300,
    sections: [
      {
        subject: 'physics',
        questions: [
          { id: 'q1', subject: 'physics', type: 'MCQ', chapter: 'Mechanics', topic: 'Kinematics', difficulty: 'Medium', content: 'Sample', correctAnswer: 'A', marks: { correct: 4, incorrect: -1 } }
        ]
      }
    ]
  };

  it('renders evaluating screen with progress and diagnostic steps', () => {
    render(
      <MockTestEvaluatingScreen
        test={dummyTest}
        statusMessage="Custom evaluation message test"
      />
    );

    expect(screen.getByText('Evaluating Test Responses')).toBeInTheDocument();
    expect(screen.getByText('Test Submitted')).toBeInTheDocument();
    expect(screen.getByText('Custom evaluation message test')).toBeInTheDocument();
    expect(screen.getByText('Full JEE Grand Simulation 2026')).toBeInTheDocument();
    expect(screen.getByText(/1 Qs • 180m/)).toBeInTheDocument();
    expect(screen.getByText('Saving candidate responses')).toBeInTheDocument();
    expect(screen.getByText('Evaluating answers & scoring sections')).toBeInTheDocument();
  });
});
