import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MistakesCbtTestArena } from './MistakesCbtTestArena';
import { Mistake } from '@/types/index';

const mockMistakes: Mistake[] = [
  {
    id: 'm1',
    chapterId: 'p1',
    subject: 'physics',
    chapter: 'Kinematics',
    topic: 'Projectile Motion',
    questionText: 'What is the maximum height of projectile?',
    correctSolution: 'H = u^2/(2g)',
    correctMethod: 'H = u^2/(2g)',
    myAnswer: 'u/g',
    revisionStatus: 'New',
    difficulty: 'Medium'
  } as unknown as Mistake,
  {
    id: 'm2',
    chapterId: 'c1',
    subject: 'chemistry',
    chapter: 'Thermodynamics',
    topic: 'Enthalpy',
    questionText: 'Calculate delta H for combustion reaction.',
    correctSolution: '-285 kJ/mol',
    correctMethod: '-285 kJ/mol',
    myAnswer: '+285 kJ/mol',
    revisionStatus: 'New',
    difficulty: 'Hard'
  } as unknown as Mistake
];

const mockGetSubjectColor = () => ({
  text: 'text-indigo-400',
  bg: 'bg-indigo-950',
  border: 'border-indigo-800',
  badge: 'bg-indigo-600'
});

describe('MistakesCbtTestArena (BUG-02 Navigation & Answer Preservation)', () => {
  it('preserves user answers and does not reset question index when navigating questions', () => {
    const onUpdateStatus = vi.fn();
    const onClose = vi.fn();

    render(
      <MistakesCbtTestArena
        isOpen={true}
        onClose={onClose}
        mistakes={mockMistakes}
        onUpdateStatus={onUpdateStatus}
        getSubjectColor={mockGetSubjectColor}
      />
    );

    // Verify initially on Question 1
    expect(screen.getByText('Question 1')).toBeInTheDocument();

    // Type an answer in Question 1 textarea
    const answerInput = screen.getByPlaceholderText(/Type your final numerical value/i);
    fireEvent.change(answerInput, { target: { value: 'u^2 sin^2 theta / (2g)' } });

    // Click "Save & Next" to navigate to Question 2
    const saveAndNextBtn = screen.getByText('Save & Next');
    fireEvent.click(saveAndNextBtn);

    // Verify successfully moved to Question 2
    expect(screen.getByText('Question 2')).toBeInTheDocument();

    // Navigate back to Question 1 using Previous button
    const prevBtn = screen.getByText('Previous');
    fireEvent.click(prevBtn);

    // Verify back on Question 1
    expect(screen.getByText('Question 1')).toBeInTheDocument();

    // Verify the previously entered answer is preserved and was NOT wiped out
    const recheckedInput = screen.getByPlaceholderText(/Type your final numerical value/i) as HTMLTextAreaElement;
    expect(recheckedInput.value).toBe('u^2 sin^2 theta / (2g)');
  });
});
