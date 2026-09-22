import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MockTestsPage } from './MockTestsPage';
import { MockTest, MockTestAttempt } from '../../types/mockTest';
import { MockResult } from '../../types/index';

vi.mock('./components/UploadPyqPaperModal', () => ({
  UploadPyqPaperModal: () => null
}));

vi.mock('@/features/auth/AuthContext', () => ({
  AuthContext: React.createContext({ user: { uid: 'test_user_123' } }),
  useAuth: () => ({ user: { uid: 'test_user_123' } })
}));

const dummyTest: MockTest = {
  id: 'test-1',
  name: 'JEE Main Full Test 1',
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
          chapter: 'Units and Dimensions',
          topic: 'Dimensional Analysis',
          difficulty: 'Easy',
          content: 'What is the dimension of Planck constant?',
          options: ['ML2T-1', 'MLT-2', 'ML2T-2', 'M0L0T0'],
          correctAnswer: 'A',
          marks: { correct: 4, incorrect: -1 },
          explanation: 'E = hv => h = E/v => ML2T-1'
        }
      ]
    }
  ]
};

const dummyAttempt: MockTestAttempt = {
  testId: 'test-1',
  startTime: new Date().toISOString(),
  endTime: new Date().toISOString(),
  questions: {
    q1: {
      questionId: 'q1',
      subject: 'physics',
      status: 'Answered',
      selectedAnswer: 'A',
      timeSpentSeconds: 60
    }
  }
};

const dummyPastAttempt: MockResult = {
  id: 'attempt-101',
  title: 'JEE Main Full Test 1',
  date: new Date().toISOString(),
  totalScore: 4,
  correct: 1,
  incorrect: 0,
  attempted: 1,
  totalQuestions: 1,
  duration: 1,
  subjectBreakdown: {
    physics: { score: 4, correct: 1, attempted: 1 }
  },
  testSnapshot: dummyTest,
  attemptData: dummyAttempt
};

const mockActions = {
  addMockResult: vi.fn().mockResolvedValue(undefined),
  deleteMockResult: vi.fn().mockResolvedValue(undefined),
  deleteCustomMockTest: vi.fn().mockResolvedValue(undefined),
  addCustomMockTest: vi.fn().mockResolvedValue(undefined),
  addMistakesBatch: vi.fn().mockResolvedValue(undefined),
  addCustomMission: vi.fn().mockResolvedValue(true)
};

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: vi.fn((selector) => {
    const mockState = {
      actions: mockActions,
      customMockTests: [],
      mocks: [dummyPastAttempt],
      chapters: []
    };
    return selector ? selector(mockState) : mockState;
  })
}));

import { MockTestResultPage } from './MockTestResultPage';

describe('MockTestsPage Routing & Result View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders landing page with available tests and past attempts tab', () => {
    render(
      <MemoryRouter initialEntries={['/mock-tests']}>
        <Routes>
          <Route path="/mock-tests" element={<MockTestsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Mock Test Engine')).toBeDefined();
    expect(screen.getByText('Available Tests')).toBeDefined();
    expect(screen.getByText(/Past Attempts/)).toBeDefined();
  });

  it('opens result autopsy view when clicking past attempt in history tab', async () => {
    render(
      <MemoryRouter initialEntries={['/mock-tests']}>
        <Routes>
          <Route path="/mock-tests" element={<MockTestsPage />} />
          <Route path="/mock-tests/result/:attemptId?" element={<MockTestResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Switch to Past Attempts tab
    const historyTabBtn = screen.getByRole('button', { name: /Past Attempts/i });
    fireEvent.click(historyTabBtn);

    // Should display the past attempt card
    const autopsyBtn = await screen.findByText('View Solutions & Scorecard');
    expect(autopsyBtn).toBeDefined();

    // Click on the past attempt card
    fireEvent.click(autopsyBtn);

    // Result autopsy page must now be rendered on screen via separate page route
    expect(await screen.findByText('Questions Studio')).toBeDefined();
    expect(await screen.findByText('Performance Forensics')).toBeDefined();
  });

  it('directly routes and opens result page when routed to /mock-tests/result', () => {
    render(
      <MemoryRouter initialEntries={['/mock-tests/result']}>
        <Routes>
          <Route path="/mock-tests/result/:attemptId?" element={<MockTestResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Directly renders the result page for the latest mock
    expect(screen.getByText('Questions Studio')).toBeDefined();
    expect(screen.getByText('Performance Forensics')).toBeDefined();
    expect(screen.getByText('JEE Main Full Test 1')).toBeDefined();
  });

  it('closes result page and returns to landing library when Close Analysis is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/mock-tests/result']}>
        <Routes>
          <Route path="/mock-tests/result/:attemptId?" element={<MockTestResultPage />} />
          <Route path="/mock-tests" element={<MockTestsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Questions Studio')).toBeDefined();

    // Click close button
    const closeBtn = screen.getByTitle('Close Analysis');
    fireEvent.click(closeBtn);

    // Should return to library landing
    expect(screen.getByText('Mock Test Engine')).toBeDefined();
  });

  it('accurately computes duration and subjectBreakdown on mock test completion', async () => {
    // Render MockTestsPage with dummyTest
    render(
      <MemoryRouter initialEntries={['/mock-tests']}>
        <Routes>
          <Route path="/mock-tests" element={<MockTestsPage />} />
          <Route path="/mock-tests/result/:attemptId" element={<div data-testid="mock-result-page">Result Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Find and click the Start button for the available test
    const startBtns = screen.getAllByRole('button', { name: /Start/i });
    expect(startBtns.length).toBeGreaterThan(0);
    fireEvent.click(startBtns[0]);

    // Exam Briefing modal should appear; click Begin Examination
    const proceedBtn = await screen.findByRole('button', { name: /Begin Examination/i });
    expect(proceedBtn).toBeInTheDocument();
    fireEvent.click(proceedBtn);

    // Arena is now active. Let's submit the test.
    const submitBtn = await screen.findByRole('button', { name: /Submit Test/i });
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn);

    const confirmBtn = await screen.findByRole('button', { name: /Confirm & Submit/i });
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    // Verify evaluating transition screen is displayed immediately (no landing flash)
    expect(await screen.findByText('Evaluating Test Responses')).toBeInTheDocument();

    // Verify addMockResult was called with computed duration and defined subjectBreakdown
    await vi.waitFor(() => {
      expect(mockActions.addMockResult).toHaveBeenCalled();
    }, { timeout: 3000 });

    const savedResult = mockActions.addMockResult.mock.calls[0][0];
    expect(savedResult.duration).toBeGreaterThan(0);
    expect(savedResult.duration).toBeLessThanOrEqual(180);
    expect(savedResult.correct).toBeDefined();
    expect(typeof savedResult.correct).toBe('number');
    expect(savedResult.incorrect).toBeDefined();
    expect(typeof savedResult.incorrect).toBe('number');
    expect(savedResult.attempted).toBeDefined();
    expect(typeof savedResult.attempted).toBe('number');
    expect(savedResult.subjectBreakdown.physics).toBeDefined();
    expect(typeof savedResult.subjectBreakdown.physics.score).toBe('number');
  });

  it('renders contextual No Matches Found state when search query matches no past attempts', async () => {
    render(
      <MemoryRouter initialEntries={['/mock-tests']}>
        <Routes>
          <Route path="/mock-tests" element={<MockTestsPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Switch to Past Attempts tab
    const historyTabBtn = screen.getByRole('button', { name: /Past Attempts/i });
    fireEvent.click(historyTabBtn);

    // Enter a search query that has no match
    const searchInput = await screen.findByPlaceholderText(/Search past attempts/i);
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Test XYZ' } });

    // Should render contextual No Matches Found
    expect(await screen.findByText('No Matches Found')).toBeInTheDocument();
    expect(screen.getByText(/No past attempts match/)).toBeInTheDocument();

    // Clicking Clear Search restores the past attempt list
    const clearBtn = screen.getByRole('button', { name: /Clear Search/i });
    fireEvent.click(clearBtn);

    expect(await screen.findByText('JEE Main Full Test 1')).toBeInTheDocument();
  });

  it('deletes past test attempt when delete button is clicked and confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/mock-tests']}>
        <Routes>
          <Route path="/mock-tests" element={<MockTestsPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Switch to Past Attempts tab
    const historyTabBtn = screen.getByRole('button', { name: /Past Attempts/i });
    fireEvent.click(historyTabBtn);

    const deleteBtn = await screen.findByTitle('Delete this attempt and all associated data');
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(mockActions.deleteMockResult).toHaveBeenCalledWith('attempt-101');
  });
});

