import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParsedQuestionsReviewModal } from './ParsedQuestionsReviewModal';
import { MockTest } from '@/types/mockTest';

// Mock MathRenderer to simplify DOM assertions
vi.mock('@/components/MathRenderer', () => ({
  RichTextRenderer: ({ content }: { content: string }) => <span>{content}</span>
}));

const mockTest: MockTest = {
  id: 'test_preview_1',
  name: 'Allen Physics & Chem Practice DPP',
  durationMinutes: 45,
  totalMarks: 12,
  sections: [
    {
      subject: 'physics',
      questions: [
        {
          id: 'q_p_1',
          content: 'Calculate the apex height of a projectile with $u = 20\\text{ m/s}$.',
          options: ['10 m', '20 m', '30 m', '40 m'],
          correctAnswer: '1', // B
          type: 'MCQ',
          subject: 'physics',
          marks: { correct: 4, incorrect: -1 },
          explanation: 'Using $H = u^2 / (2g)$, we get $400 / 20 = 20\\text{ m}$. Hence, Option (B) is correct.'
        },
        {
          id: 'q_p_2',
          content: 'Find the integer value of force $F$ in Newtons.',
          correctAnswer: '50',
          type: 'NUMERICAL',
          subject: 'physics',
          marks: { correct: 4, incorrect: 0 },
          explanation: 'Using $F = ma$, $F = 5 \\times 10 = 50\\text{ N}$.'
        }
      ]
    },
    {
      subject: 'chemistry',
      questions: [
        {
          id: 'q_c_1',
          content: 'Which molecule exhibits $sp^3d^2$ hybridization?',
          options: ['SF6', 'PCl5', 'CH4', 'NH3'],
          correctAnswer: '0', // A
          type: 'MCQ',
          subject: 'chemistry',
          marks: { correct: 4, incorrect: -1 }
        }
      ]
    }
  ]
};

describe('ParsedQuestionsReviewModal Component (CRIT-03)', () => {
  it('renders all questions and displays overall statistics accurately', () => {
    const onSave = vi.fn();
    const onStart = vi.fn();
    const onClose = vi.fn();

    render(
      <ParsedQuestionsReviewModal
        isOpen={true}
        test={mockTest}
        onClose={onClose}
        onSave={onSave}
        onStart={onStart}
      />
    );

    expect(screen.getByDisplayValue('Allen Physics & Chem Practice DPP')).toBeInTheDocument();
    expect(screen.getByText('Review & Calibration Studio')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 total questions
    expect(screen.getByText('Calculate the apex height of a projectile with $u = 20\\text{ m/s}$.')).toBeInTheDocument();
    expect(screen.getByText('Find the integer value of force $F$ in Newtons.')).toBeInTheDocument();
    expect(screen.getByText('Which molecule exhibits $sp^3d^2$ hybridization?')).toBeInTheDocument();
  });

  it('allows clicking an option to update the active answer key', () => {
    const onStart = vi.fn();

    render(
      <ParsedQuestionsReviewModal
        isOpen={true}
        test={mockTest}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onStart={onStart}
      />
    );

    // In Q1, options are ['10 m', '20 m', '30 m', '40 m']
    // Let's click on '40 m' (index 3, letter D)
    const optionD = screen.getByText('40 m');
    fireEvent.click(optionD);

    // Click "Launch Timed Drill"
    const launchBtn = screen.getByRole('button', { name: /launch timed drill/i });
    fireEvent.click(launchBtn);

    expect(onStart).toHaveBeenCalledTimes(1);
    const updatedTest: MockTest = onStart.mock.calls[0][0];
    expect(updatedTest.sections[0].questions[0].correctAnswer).toBe('3');
  });

  it('updates numerical answer key input', () => {
    const onStart = vi.fn();

    render(
      <ParsedQuestionsReviewModal
        isOpen={true}
        test={mockTest}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onStart={onStart}
      />
    );

    // Q2 is numerical with value 50
    const numInput = screen.getByDisplayValue('50');
    fireEvent.change(numInput, { target: { value: '75' } });

    const launchBtn = screen.getByRole('button', { name: /launch timed drill/i });
    fireEvent.click(launchBtn);

    const updatedTest: MockTest = onStart.mock.calls[0][0];
    expect(updatedTest.sections[0].questions[1].correctAnswer).toBe('75');
  });

  it('filters questions by subject when subject filter chips are clicked', () => {
    render(
      <ParsedQuestionsReviewModal
        isOpen={true}
        test={mockTest}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onStart={vi.fn()}
      />
    );

    // Filter by chemistry
    const chemFilterBtn = screen.getByRole('button', { name: /^chemistry$/i });
    fireEvent.click(chemFilterBtn);

    // Physics questions should now be hidden
    expect(screen.queryByText(/Calculate the apex height/i)).not.toBeInTheDocument();
    // Chemistry question should be visible
    expect(screen.getByText(/Which molecule exhibits/i)).toBeInTheDocument();
  });

  it('deletes a question when delete icon is clicked and recalculates total marks and counts', () => {
    const onSave = vi.fn();

    render(
      <ParsedQuestionsReviewModal
        isOpen={true}
        test={mockTest}
        onClose={vi.fn()}
        onSave={onSave}
        onStart={vi.fn()}
      />
    );

    const deleteBtns = screen.getAllByTitle('Delete question from test');
    expect(deleteBtns.length).toBe(3);

    // Delete the first question
    fireEvent.click(deleteBtns[0]);

    // Now there should be 2 questions left
    expect(screen.queryByText(/Calculate the apex height/i)).not.toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /save to available tests/i });
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const updatedTest: MockTest = onSave.mock.calls[0][0];
    const totalRemaining = updatedTest.sections.reduce((sum, s) => sum + s.questions.length, 0);
    expect(totalRemaining).toBe(2);
  });
});
