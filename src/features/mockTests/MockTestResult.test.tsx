import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MockTestResult } from './MockTestResult';
import { MockTest, MockTestAttempt } from '../../types/mockTest';

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: vi.fn((selector) => {
    const mockState = {
      actions: {
        addCustomMission: vi.fn().mockResolvedValue(true)
      },
      chapters: []
    };
    return selector ? selector(mockState) : mockState;
  })
}));

describe('MockTestResult (Revamped UI & Smart Focus)', () => {
  const dummyTest: MockTest = {
    id: 'test-dpp-bonding',
    name: 'DPP 2 CHEMICAL BONDING',
    durationMinutes: 60,
    totalMarks: 8,
    sections: [
      {
        subject: 'chemistry',
        questions: [
          {
            id: 'q1',
            subject: 'chemistry',
            topic: 'Molecular Geometry',
            difficulty: 'Medium',
            type: 'MCQ',
            content: 'Which molecule has trigonal planar geometry?',
            options: ['NH3', 'SO3', 'H2O', 'CH4'],
            correctAnswer: 'B',
            marks: { correct: 4, incorrect: -1 },
            chapter: 'Chemical Bonding and Molecular Structure',
            explanation: 'SO3 has 3 bond pairs and 0 lone pairs on sulfur, giving a symmetric trigonal planar structure.'
          },
          {
            id: 'q2',
            subject: 'chemistry',
            topic: 'VSEPR Theory',
            difficulty: 'Medium',
            type: 'NUMERICAL',
            content: 'Calculate the total number of lone pairs in XeF4.',
            correctAnswer: '2',
            marks: { correct: 4, incorrect: 0 },
            chapter: 'Chemical Bonding and Molecular Structure',
            explanation: 'XeF4 has square planar geometry with 2 lone pairs on Xenon.'
          }
        ]
      }
    ]
  };

  const dummyAttempt: MockTestAttempt = {
    testId: 'test-dpp-bonding',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    questions: {
      q1: {
        questionId: 'q1',
        subject: 'chemistry',
        status: 'Answered',
        selectedAnswer: 'B',
        timeSpentSeconds: 45
      },
      q2: {
        questionId: 'q2',
        subject: 'chemistry',
        status: 'Not Answered',
        timeSpentSeconds: 20
      }
    }
  };

  it('renders clean top app bar with title and telemetry', () => {
    render(<MockTestResult test={dummyTest} attempt={dummyAttempt} onClose={vi.fn()} />);

    expect(screen.getByText('DPP 2 CHEMICAL BONDING')).toBeInTheDocument();
    expect(screen.getAllByText(/2 Questions/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Questions Studio/)).toBeInTheDocument();
    expect(screen.getByText(/Performance Forensics/)).toBeInTheDocument();
  });

  it('displays the question content and options in a spacious layout', () => {
    render(<MockTestResult test={dummyTest} attempt={dummyAttempt} onClose={vi.fn()} />);

    expect(screen.getByText(/Which molecule has trigonal planar geometry\?/)).toBeInTheDocument();
    expect(screen.getAllByText((_content, element) => element?.textContent?.includes('SO3') ?? false).length).toBeGreaterThan(0);
    expect(screen.getByText(/YOUR CHOICE \(CORRECT\)/)).toBeInTheDocument();
    expect(screen.getByText(/Detailed Solution/)).toBeInTheDocument();
  });

  it('navigates to next question on Next button click', () => {
    render(<MockTestResult test={dummyTest} attempt={dummyAttempt} onClose={vi.fn()} />);

    const nextButtons = screen.getAllByRole('button', { name: /Next/i });
    fireEvent.click(nextButtons[0]);

    expect(screen.getAllByText((_content, element) => element?.textContent?.includes('Calculate the total number of lone pairs') ?? false).length).toBeGreaterThan(0);
  });

  it('switches between Questions Studio and Performance Forensics tabs smoothly', () => {
    render(<MockTestResult test={dummyTest} attempt={dummyAttempt} onClose={vi.fn()} />);

    const forensicsTab = screen.getByRole('button', { name: /Performance Forensics/i });
    fireEvent.click(forensicsTab);

    expect(screen.getByText(/Subject Time Allocation vs JEE Benchmark/i)).toBeInTheDocument();
  });

  it('renders Split Cockpit as default workspace and allows switching modes', () => {
    render(<MockTestResult test={dummyTest} attempt={dummyAttempt} onClose={vi.fn()} />);

    // Split Cockpit is default
    expect(screen.getByRole('button', { name: /Split Cockpit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reader Stream/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Blind Re-Attempt/i })).toBeInTheDocument();

    // Streamlined Solution Studio renders Detailed Solution directly (no sub-tab clutter)
    expect(screen.getByText(/Detailed Solution & Derivation/i)).toBeInTheDocument();
    expect(screen.getAllByText((_content, element) => element?.textContent?.includes('trigonal planar structure') ?? false).length).toBeGreaterThan(0);

    // Verify removed sub-tabs are no longer present
    expect(screen.queryByRole('button', { name: /Key Formula/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /JEE Trap/i })).not.toBeInTheDocument();

    // Opens In-Modal AI Mentor Quick Chat without navigating away
    const aiMentorBtn = screen.getByRole('button', { name: /Ask AI Mentor/i });
    fireEvent.click(aiMentorBtn);
    expect(screen.getByText(/AI Mentor Quick Chat/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask about Question 1/i)).toBeInTheDocument();

    // Close AI mentor modal
    const closeMentorBtn = screen.getByTitle(/Close AI Mentor/i);
    fireEvent.click(closeMentorBtn);

    // Switch workspace mode to Reader Stream
    fireEvent.click(screen.getByRole('button', { name: /Reader Stream/i }));
    expect(screen.getByText(/Question Palette/i)).toBeInTheDocument();

    // Switch workspace mode to Blind Re-Attempt
    fireEvent.click(screen.getByRole('button', { name: /Blind Re-Attempt/i }));
    expect(screen.getByText(/Mastery Confirmation|Mistake Recovery/i)).toBeInTheDocument();
  });

  it('renders only active subjects in forensics and scales targets for single-subject test', () => {
    render(<MockTestResult test={dummyTest} attempt={dummyAttempt} onClose={vi.fn()} />);

    const forensicsTab = screen.getByRole('button', { name: /Performance Forensics/i });
    fireEvent.click(forensicsTab);

    // Chemistry should be present in time allocation
    expect(screen.getAllByText('Chemistry').length).toBeGreaterThan(0);
    // In dummyTest (Chemistry only, 60m duration, 65s total spent = ~1m duration),
    // Chemistry card should be rendered without displaying empty Physics or Maths cards
    expect(screen.queryByText('Physics')).not.toBeInTheDocument();
    expect(screen.queryByText('Mathematics')).not.toBeInTheDocument();
  });

  it('resets activeQuestionIdx to 0 when status filter changes to prevent desync', () => {
    render(<MockTestResult test={dummyTest} attempt={dummyAttempt} onClose={vi.fn()} />);

    // Initially Q1 is active
    expect(screen.getByText(/Which molecule has trigonal planar geometry\?/)).toBeInTheDocument();

    // Navigate to Q2
    const nextButtons = screen.getAllByRole('button', { name: /Next/i });
    fireEvent.click(nextButtons[0]);
    expect(screen.getByText(/Calculate the total number of lone pairs/)).toBeInTheDocument();

    // Now filter by Correct (Q1 was Correct, Q2 was Unattempted)
    const correctFilterBtn = screen.getByRole('button', { name: /Correct/i });
    fireEvent.click(correctFilterBtn);

    // Should immediately reset to index 0 (which in 'Correct' filter is Q1) without index desync
    expect(screen.getByText(/Which molecule has trigonal planar geometry\?/)).toBeInTheDocument();
  });

  it('renders Generate Step-by-Step AI Derivation button when question has placeholder explanation', async () => {
    const placeholderTest: MockTest = {
      ...dummyTest,
      sections: [
        {
          subject: 'chemistry',
          questions: [
            {
              id: 'q-placeholder',
              subject: 'chemistry',
              topic: 'Chemical Bonding',
              difficulty: 'Hard',
              type: 'MCQ',
              content: 'Which of the following represents the correct bond angle order?',
              options: ['H2O > NH3 > CH4', 'CH4 > NH3 > H2O', 'NH3 > H2O > CH4', 'CH4 > H2O > NH3'],
              correctAnswer: 'B',
              marks: { correct: 4, incorrect: -1 },
              explanation: 'Official coaching answer key: 2. Review theoretical concepts and standard JEE methodology.'
            }
          ]
        }
      ]
    };

    const placeholderAttempt: MockTestAttempt = {
      testId: 'test-dpp-bonding',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      questions: {
        'q-placeholder': {
          questionId: 'q-placeholder',
          subject: 'chemistry',
          status: 'Not Answered',
          timeSpentSeconds: 15
        }
      }
    };

    // Mock fetch for the endpoint using vi.spyOn
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          explanation: 'Detailed Derivation: Bond angle decreases with increase in lone pairs due to lp-bp repulsion. CH4 (109.5°) > NH3 (107°) > H2O (104.5°).'
        })
      } as any)
    );
    const windowSpy = vi.spyOn(window, 'fetch').mockImplementation(mockFetch);
    const globalSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);

    try {
      render(<MockTestResult test={placeholderTest} attempt={placeholderAttempt} onClose={vi.fn()} />);

      // Verify fetch was automatically called with /api/mocktest/generate-explanation on view
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/mocktest/generate-explanation'),
          expect.objectContaining({
            method: 'POST'
          })
        );
      });

      // Verify newly derived explanation is rendered seamlessly without requiring manual clicks
      expect(await screen.findByText(/Detailed Derivation: Bond angle decreases/i)).toBeInTheDocument();
    } finally {
      windowSpy.mockRestore();
      globalSpy.mockRestore();
    }
  });

  it('marks both semantically equivalent options (Option A and B) as correct in Q7 bond order review', () => {
    const bondOrderTest: MockTest = {
      id: 'test-bond-order-equiv',
      name: 'Chemical Bonding DPP',
      durationMinutes: 60,
      totalMarks: 4,
      sections: [
        {
          subject: 'chemistry',
          questions: [
            {
              id: 'q-bond-7',
              subject: 'chemistry',
              type: 'MCQ',
              content: 'The correct order of Cl - O bond order is:',
              options: [
                '$\\text{ClO}_4^- > \\text{ClO}_3^- > \\text{ClO}_2^- > \\text{ClO}^-$',
                '$\\text{ClO}^- < \\text{ClO}_2^- < \\text{ClO}_3^- < \\text{ClO}_4^-$',
                '$\\text{ClO}_3^- < \\text{ClO}_2^- > \\text{ClO}^- > \\text{ClO}_4^-$',
                '$\\text{ClO}_2^- < \\text{ClO}_3^- < \\text{ClO}_4^- < \\text{ClO}^-$'
              ],
              correctAnswer: 'A', // Official key lists A
              marks: { correct: 4, incorrect: -1 },
              chapter: 'Chemical Bonding and Molecular Structure',
              explanation: 'Decreasing and increasing orders are physically identical.'
            }
          ]
        }
      ]
    };

    // Student selected Option B ('1')
    const attempt: MockTestAttempt = {
      testId: 'test-bond-order-equiv',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      questions: {
        'q-bond-7': {
          questionId: 'q-bond-7',
          subject: 'chemistry',
          status: 'Answered',
          selectedAnswer: '1', // Index 1 is Option B
          timeSpentSeconds: 50
        }
      }
    };

    render(<MockTestResult test={bondOrderTest} attempt={attempt} onClose={vi.fn()} />);

    // Must be awarded +4 M instead of -1 M!
    expect(screen.getByText('+4 M')).toBeInTheDocument();
    expect(screen.queryByText('-1 M')).not.toBeInTheDocument();

    // Option B should show "YOUR CHOICE (CORRECT)"
    expect(screen.getByText('YOUR CHOICE (CORRECT)')).toBeInTheDocument();

    // Option A should show "CORRECT ANSWER"
    expect(screen.getByText('CORRECT ANSWER')).toBeInTheDocument();
  });
});

