import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MockTestArena } from './MockTestArena';
import { MockTest } from '../../types/mockTest';

// Mock AuthContext
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test_user_123' } })
}));

describe('MockTestArena (BUG-04 Resilience & Lockout Prevention)', () => {
  it('handles empty sections gracefully without getting stuck in an infinite loading lock', async () => {
    const onComplete = vi.fn();
    const onExit = vi.fn();

    const emptyTest: MockTest = {
      id: 'empty-test-1',
      name: 'Empty Corrupt Test',
      durationMinutes: 180,
      totalMarks: 300,
      sections: []
    };

    render(
      <MockTestArena
        test={emptyTest}
        onComplete={onComplete}
        onExit={onExit}
      />
    );

    const emptyHeading = await screen.findByText('Empty or Invalid Mock Test');
    expect(emptyHeading).toBeInTheDocument();
    const exitBtn = screen.getByText('Exit Arena');
    expect(exitBtn).toBeInTheDocument();

    fireEvent.click(exitBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('renders cancel button during initialization to prevent permanent lockup', () => {
    const onComplete = vi.fn();
    const onExit = vi.fn();

    const emptyTest: MockTest = {
      id: 'empty-test-2',
      name: 'Loading Test',
      durationMinutes: 180,
      totalMarks: 300,
      sections: []
    };

    render(
      <MockTestArena
        test={emptyTest}
        onComplete={onComplete}
        onExit={onExit}
      />
    );

    const cancelBtn = screen.getByText('Cancel / Exit');
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('adds and cleans up in-mock-test class on document.body to suppress dock', () => {
    const validTest: MockTest = {
      id: 'valid-test-1',
      name: 'Valid Mock Test',
      durationMinutes: 180,
      totalMarks: 300,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Kinematics',
              topic: '1D Motion',
              difficulty: 'Medium',
              content: 'What is acceleration?',
              options: ['v/t', 'x/t', 'm*v', 'zero'],
              correctAnswer: '0',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    const { unmount } = render(
      <MockTestArena
        test={validTest}
        onComplete={vi.fn()}
        onExit={vi.fn()}
      />
    );

    expect(document.body.classList.contains('in-mock-test')).toBe(true);

    unmount();

    expect(document.body.classList.contains('in-mock-test')).toBe(false);
  });

  it('detects tab switching / window blur and triggers anti-cheat alert', async () => {
    const validTest: MockTest = {
      id: 'valid-test-2',
      name: 'Proctor Test',
      durationMinutes: 180,
      totalMarks: 300,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Kinematics',
              topic: '1D Motion',
              difficulty: 'Medium',
              content: 'What is acceleration?',
              options: ['v/t', 'x/t', 'm*v', 'zero'],
              correctAnswer: '0',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={validTest}
        onComplete={vi.fn()}
        onExit={vi.fn()}
      />
    );

    // Wait for initialization to complete and arena to render
    const qPaperBtn = await screen.findByText('Question Paper');
    expect(qPaperBtn).toBeInTheDocument();

    // Trigger tab switch / visibility change
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    fireEvent(document, new Event('visibilitychange'));

    const alertTitle = await screen.findByText(/Anti-Cheat Alert/i);
    expect(alertTitle).toBeInTheDocument();
    expect(screen.getByText(/WARNING 1\/3/i)).toBeInTheDocument();
  });

  it('opens submit confirmation modal and triggers test submission on confirmation', async () => {
    const onComplete = vi.fn();
    const onExit = vi.fn();

    const validTest: MockTest = {
      id: 'submit-test-1',
      name: 'Submit CBT Test',
      durationMinutes: 180,
      totalMarks: 100,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q-sub-1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Kinematics',
              topic: 'Motion in 1D',
              difficulty: 'Medium',
              content: 'What is 2 + 2?',
              options: ['1', '2', '3', '4'],
              correctAnswer: '3',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={validTest}
        onComplete={onComplete}
        onExit={onExit}
      />
    );

    // Find and click the Submit Test button
    const submitBtn = await screen.findByRole('button', { name: /Submit Test/i });
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn);

    // Verify confirmation modal appears
    const modalHeading = await screen.findByText('Submit CBT Examination?');
    expect(modalHeading).toBeInTheDocument();
    expect(screen.getByText(/Review your attempt telemetry before submitting:/i)).toBeInTheDocument();

    // Click Confirm & Submit
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Submit/i });
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    // Verify submission callback is executed
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      testId: 'submit-test-1',
      questions: expect.any(Object)
    }));
  });

  it('opens question paper overview modal when clicking Question Paper header button', async () => {
    const validTest: MockTest = {
      id: 'qp-test-1',
      name: 'Overview Test',
      durationMinutes: 180,
      totalMarks: 100,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q-qp-1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Kinematics',
              topic: 'Motion in 1D',
              difficulty: 'Medium',
              content: 'Sample test question content',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: '0',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={validTest}
        onComplete={vi.fn()}
        onExit={vi.fn()}
      />
    );

    const qpButton = await screen.findByRole('button', { name: /Question Paper/i });
    fireEvent.click(qpButton);

    const qpModalTitle = await screen.findByText('Question Paper Overview');
    expect(qpModalTitle).toBeInTheDocument();
  });

  it('virtual keypad properly handles digits, dot prefixing, and enter key for save and next', async () => {
    const onComplete = vi.fn();
    const numericalTest: MockTest = {
      id: 'num-test-1',
      name: 'Numerical Keypad Test',
      durationMinutes: 60,
      totalMarks: 8,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q-num-1',
              subject: 'physics',
              type: 'NUMERICAL',
              chapter: 'Kinematics',
              topic: 'Velocity',
              difficulty: 'Easy',
              content: 'Calculate speed in m/s.',
              correctAnswer: '25.5',
              marks: { correct: 4, incorrect: 0 }
            },
            {
              id: 'q-num-2',
              subject: 'physics',
              type: 'NUMERICAL',
              chapter: 'Kinematics',
              topic: 'Acceleration',
              difficulty: 'Easy',
              content: 'Calculate acceleration.',
              correctAnswer: '9.8',
              marks: { correct: 4, incorrect: 0 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={numericalTest}
        onComplete={onComplete}
        onExit={vi.fn()}
      />
    );

    // Question 1 should be active
    const input = await screen.findByPlaceholderText('Click keypad or type number...');
    expect(input).toBeInTheDocument();

    // Click keypad buttons: '2', '5', '.', '5'
    const keypadContainer = screen.getByText('On-Screen Virtual Keypad').closest('.space-y-2') as HTMLElement;
    expect(keypadContainer).toBeInTheDocument();

    const btn2 = within(keypadContainer).getByRole('button', { name: '2' });
    const btn5 = within(keypadContainer).getByRole('button', { name: '5' });
    const btnDot = within(keypadContainer).getByRole('button', { name: '.' });

    fireEvent.click(btn2);
    fireEvent.click(btn5);
    fireEvent.click(btnDot);
    fireEvent.click(btn5);

    expect(input).toHaveValue('25.5');

    // Click '↵' on virtual keypad - should trigger handleSaveAndNext and navigate to Q2
    const enterBtn = within(keypadContainer).getByRole('button', { name: '↵' });
    fireEvent.click(enterBtn);

    // Q2 should now be loaded in the arena
    await waitFor(() => {
      expect(screen.getByText('Calculate acceleration.')).toBeInTheDocument();
    });
  });

  it('bypasses pre-flight briefing when initialExamStarted is true', async () => {
    const validTest: MockTest = {
      id: 'direct-start-test',
      name: 'Direct Start Test',
      durationMinutes: 60,
      totalMarks: 4,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q-direct-1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Electrostatics',
              topic: 'Electrostatics',
              difficulty: 'Easy',
              content: 'What is charge of an electron?',
              options: ['-1.6e-19 C', '1.6e-19 C', '0 C', '1 C'],
              correctAnswer: 'A',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={validTest}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        initialExamStarted={true}
      />
    );

    // Should immediately show the question and NOT show "Pre-Flight Checklist" or "Begin Examination"
    expect(screen.queryByText('Pre-Flight Exam Checklist')).not.toBeInTheDocument();
    expect(await screen.findByText('What is charge of an electron?')).toBeInTheDocument();
  });

  it('restores infractions from localStorage and auto-submits if >= 3', async () => {
    const onComplete = vi.fn();
    const testId = 'infraction-test-1';
    const storageKey = `jeeos_mock_infractions_test_user_123_${testId}`;
    localStorage.setItem(storageKey, '3');

    const validTest: MockTest = {
      id: testId,
      name: 'Anti-Cheat Persistence Test',
      durationMinutes: 60,
      totalMarks: 4,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q-anti-1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Kinematics',
              topic: 'Kinematics',
              difficulty: 'Easy',
              content: 'Distance vs Displacement',
              options: ['Scalar vs Vector', 'Vector vs Scalar', 'Both scalar', 'Both vector'],
              correctAnswer: 'A',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={validTest}
        onComplete={onComplete}
        onExit={vi.fn()}
        initialExamStarted={true}
      />
    );

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });

    localStorage.removeItem(storageKey);
  });

  it('renders Multiple Choice (One or More Correct) badge and allows selecting multiple options concurrently', async () => {
    const onComplete = vi.fn();
    const multiTest: MockTest = {
      id: 'multi-test-select',
      name: 'Chemical Bonding Advanced Drill',
      durationMinutes: 60,
      totalMarks: 4,
      sections: [
        {
          subject: 'chemistry',
          questions: [
            {
              id: 'q-multi-1',
              subject: 'chemistry',
              type: 'MULTI',
              chapter: 'Chemical Bonding',
              topic: 'Resonance',
              difficulty: 'Medium',
              content: 'Find the correct statements regarding SO4^-2.',
              options: [
                'Bond order of S-O bond is 1.5',
                'Bond order of S-O bond is 2.5',
                'It violates Octet Rule.',
                'All S-O bonds are equivalent.'
              ],
              correctAnswer: 'ACD',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={multiTest}
        onComplete={onComplete}
        onExit={vi.fn()}
        initialExamStarted={true}
      />
    );

    // Verify header badge displays Multiple Choice
    expect(await screen.findByText('Section A: Multiple Choice (One or More Correct)')).toBeInTheDocument();

    // Query checkboxes and their label wrappers
    const checkboxes = screen.getAllByRole('checkbox', { hidden: true });
    expect(checkboxes).toHaveLength(4);
    const labels = checkboxes.map(cb => cb.closest('label')!);

    // Initially none are checked
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
    expect(checkboxes[3]).not.toBeChecked();

    // Select Option A (index 0)
    fireEvent.click(labels[0]);
    expect(checkboxes[0]).toBeChecked();

    // Select Option C (index 2) without unchecking Option A!
    fireEvent.click(labels[2]);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();

    // Select Option D (index 3)
    fireEvent.click(labels[3]);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
    expect(checkboxes[3]).toBeChecked();

    // Toggle Option C off by clicking it again
    fireEvent.click(labels[2]);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
    expect(checkboxes[3]).toBeChecked();
  });

  it('validates physical keyboard numerical input to prevent non-numeric characters (HIGH-01)', async () => {
    const numTest: MockTest = {
      id: 'num-validation-test-unique',
      name: 'Numerical Input Validation Test',
      durationMinutes: 180,
      totalMarks: 4,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'qn1',
              subject: 'physics',
              type: 'NUMERICAL',
              chapter: 'Kinematics',
              topic: '1D Motion',
              difficulty: 'Medium',
              content: 'What is the velocity?',
              correctAnswer: '25.5',
              marks: { correct: 4, incorrect: 0 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={numTest}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        initialExamStarted={true}
      />
    );

    const input = await screen.findByPlaceholderText('Click keypad or type number...') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Type valid number
    fireEvent.change(input, { target: { value: '25.5' } });
    expect(input.value).toBe('25.5');

    // Attempt to type invalid characters (letters) -> should be rejected by regex
    fireEvent.change(input, { target: { value: '25.5abc' } });
    expect(input.value).toBe('25.5');

    // Attempt to type multiple decimal points -> should be rejected and reset to previous valid answer
    fireEvent.change(input, { target: { value: '25.5.5' } });
    expect(input.value).toBe('25.5');

    // Negative number is permitted
    fireEvent.change(input, { target: { value: '-42.8' } });
    expect(input.value).toBe('-42.8');
  });

  it('preserves existing unexpired targetEndTime on begin exam instead of resetting (CRITICAL-01)', async () => {
    // Mock requestFullscreen so that isExamStarted evaluates fullscreenElement (false), triggering preflight screen
    const originalRequestFullscreen = document.documentElement.requestFullscreen;
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined as any);

    const testId = 'resume-timer-test';
    const futureEndTime = Date.now() + 25 * 60000; // 25 minutes remaining (not full 180m)
    localStorage.setItem(`jeeos_mock_end_test_user_123_${testId}`, futureEndTime.toString());

    const timedMock: MockTest = {
      id: testId,
      name: 'Timed Resume Test',
      durationMinutes: 180,
      totalMarks: 4,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'qt1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Kinematics',
              topic: '1D Motion',
              difficulty: 'Medium',
              content: 'Speed?',
              options: ['1', '2', '3', '4'],
              correctAnswer: '0',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={timedMock}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        initialExamStarted={false}
      />
    );

    const beginBtn = await screen.findByText('Enter Fullscreen & Begin Exam');
    fireEvent.click(beginBtn);

    // Verify localStorage end time was NOT reset to 180 minutes from now
    const storedEnd = parseInt(localStorage.getItem(`jeeos_mock_end_test_user_123_${testId}`)!, 10);
    expect(storedEnd).toBe(futureEndTime);

    // Clean up
    localStorage.removeItem(`jeeos_mock_end_test_user_123_${testId}`);
    document.documentElement.requestFullscreen = originalRequestFullscreen;
  });

  it('traps browser back button (popstate) and opens exit confirmation modal', async () => {
    const validTest: MockTest = {
      id: 'back-guard-test',
      name: 'Back Guard Test',
      durationMinutes: 180,
      totalMarks: 4,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q-bg-1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Kinematics',
              topic: '1D Motion',
              difficulty: 'Medium',
              content: 'Test back navigation',
              options: ['A', 'B'],
              correctAnswer: '0',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={validTest}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        initialExamStarted={true}
      />
    );

    await screen.findByText('Question 1');

    // Simulate browser back button
    fireEvent(window, new PopStateEvent('popstate', { state: null }));

    // Verify exit confirmation modal is shown
    const exitModalHeading = await screen.findByText('Exit Examination?');
    expect(exitModalHeading).toBeInTheDocument();
    expect(screen.getByText(/Progress in this session will be discarded\./i)).toBeInTheDocument();
  });

  it('detects concurrent tab via storage event and displays duplicate tab exclusivity lock modal', async () => {
    const testId = 'tab-lock-test';
    const validTest: MockTest = {
      id: testId,
      name: 'Tab Lock Test',
      durationMinutes: 180,
      totalMarks: 4,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q-tab-1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Kinematics',
              topic: '1D Motion',
              difficulty: 'Medium',
              content: 'Tab concurrency test',
              options: ['A', 'B'],
              correctAnswer: '0',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={validTest}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        initialExamStarted={true}
      />
    );

    await screen.findByText('Question 1');

    // Simulate another tab claiming the active tab key in localStorage
    const storageEvent = new StorageEvent('storage', {
      key: `jeeos_active_tab_test_user_123_${testId}`,
      newValue: 'different_tab_id_9999'
    });
    fireEvent(window, storageEvent);

    // Verify duplicate tab exclusivity lock modal appears
    const duplicateModalTitle = await screen.findByText('Exam Active in Another Tab');
    expect(duplicateModalTitle).toBeInTheDocument();
    expect(screen.getByText('Resume In This Tab')).toBeInTheDocument();

    // Click resume in this tab to re-claim
    fireEvent.click(screen.getByText('Resume In This Tab'));
    await waitFor(() => {
      expect(screen.queryByText('Exam Active in Another Tab')).not.toBeInTheDocument();
    });
  });

  it('supports Authentic NTA Light mode toggle and persists preference to localStorage', async () => {
    const testId = 'nta-theme-test';
    const validTest: MockTest = {
      id: testId,
      name: 'Theme Switch Test',
      durationMinutes: 180,
      totalMarks: 300,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Electrostatics',
              topic: 'Coulomb Law',
              difficulty: 'Easy',
              content: 'What is electric field?',
              options: ['F/q', 'q/F', 'F*q', 'q^2'],
              correctAnswer: '0',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    localStorage.removeItem('jeeos_mock_theme');

    render(
      <MockTestArena
        test={validTest}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        initialExamStarted={true}
      />
    );

    await screen.findByText('Question 1');

    // Initially in dark mode (default)
    const themeBtn = screen.getByRole('button', { name: /NTA Light/i });
    expect(themeBtn).toBeInTheDocument();
    expect(themeBtn).toHaveAttribute('title', 'Switch to Authentic NTA Light CBT Mode');

    // Click to toggle to Authentic NTA Light mode
    fireEvent.click(themeBtn);

    expect(localStorage.getItem('jeeos_mock_theme')).toBe('nta-classic');
    expect(screen.getByRole('button', { name: /Dark Mode/i })).toBeInTheDocument();

    // Click again to toggle back to modern dark mode
    fireEvent.click(screen.getByRole('button', { name: /Dark Mode/i }));
    expect(localStorage.getItem('jeeos_mock_theme')).toBe('dark');
    expect(screen.getByRole('button', { name: /NTA Light/i })).toBeInTheDocument();
  });

  it('renders ARIA attributes, Deuteranopia shape glyphs, and CSS content-visibility on palette grid', async () => {
    const testId = 'a11y-palette-test';
    const validTest: MockTest = {
      id: testId,
      name: 'Accessibility Palette Test',
      durationMinutes: 180,
      totalMarks: 300,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Optics',
              topic: 'Mirrors',
              difficulty: 'Medium',
              content: 'Focal length of flat mirror?',
              options: ['Infinity', 'Zero', '1m', '2m'],
              correctAnswer: '0',
              marks: { correct: 4, incorrect: -1 }
            },
            {
              id: 'q2',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Optics',
              topic: 'Lenses',
              difficulty: 'Easy',
              content: 'Power of lens formula?',
              options: ['1/f', 'f', 'f^2', '1/f^2'],
              correctAnswer: '0',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={validTest}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        initialExamStarted={true}
      />
    );

    await screen.findByText('Question 1');

    // 1. Check palette region landmark
    const paletteRegion = screen.getByRole('region', { name: 'Question Navigation Palette' });
    expect(paletteRegion).toBeInTheDocument();

    // 2. Check palette button ARIA labels and aria-current
    const q1Btn = screen.getByRole('button', { name: /Question 1/i });
    expect(q1Btn).toHaveAttribute('aria-current', 'true');
    expect(q1Btn.getAttribute('aria-label')).toContain('Currently Selected');

    // 3. Check CSS content-visibility optimization
    expect(q1Btn).toHaveStyle({ contentVisibility: 'auto' });

    // 4. Check Deuteranopia shape indicators in palette legend
    expect(screen.getByTitle(/Answered \(Marked with checkmark\)/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Not Answered \(Marked with cross\)/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Not Visited \(Neutral square\)/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Marked for Review \(Circle\)/i)).toBeInTheDocument();
  });

  it('triggers beforeunload safety rail warning and flushes latest attempt to localStorage', async () => {
    const testId = 'beforeunload-test';
    const validTest: MockTest = {
      id: testId,
      name: 'BeforeUnload Safety Rail Test',
      durationMinutes: 180,
      totalMarks: 300,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              subject: 'physics',
              type: 'MCQ',
              chapter: 'Thermodynamics',
              topic: 'Carnot Engine',
              difficulty: 'Medium',
              content: 'Efficiency of Carnot engine?',
              options: ['1 - Tc/Th', '1 - Th/Tc', 'Tc/Th', 'Th/Tc'],
              correctAnswer: '0',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    };

    render(
      <MockTestArena
        test={validTest}
        onComplete={vi.fn()}
        onExit={vi.fn()}
        initialExamStarted={true}
      />
    );

    await screen.findByText('Question 1');

    // Simulate beforeunload event
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);

    // Verify localStorage has flushed attempt
    const flushed = localStorage.getItem(`jeeos_mock_attempt_test_user_123_${testId}`);
    expect(flushed).toBeTruthy();
    const parsed = JSON.parse(flushed!);
    expect(parsed.testId).toBe(testId);
  });
});



