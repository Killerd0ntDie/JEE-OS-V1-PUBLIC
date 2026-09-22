import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MistakesPage } from './MistakesPage';
import { Mistake } from '@/types/index';

const mockMistakes: Mistake[] = [
  {
    id: 'm1',
    subject: 'physics',
    chapter: 'Kinematics',
    topic: 'Projectile Motion',
    questionText: 'A ball is projected at an angle of 30 degrees. Calculate maximum height.',
    correctSolution: 'H = u^2/(8g)',
    correctMethod: 'Using H = u^2 sin^2(30)/(2g) = u^2 / (8g)',
    studentMethod: 'u^2 / (2g)',
    revisionStatus: 'New',
    difficulty: 'Medium',
    mistakeTypes: ['Formula Recall', 'Calculation Slip'],
    source: 'JEE Main Full Test 1',
    dateLogged: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), // 48h ago -> Due!
    timeTaken: 3
  } as Mistake,
  {
    id: 'm2',
    subject: 'chemistry',
    chapter: 'Chemical Bonding',
    topic: 'Hybridization',
    questionText: 'Determine the hybridization of central atom in SF4.',
    correctSolution: 'sp3d',
    correctMethod: 'Sulfur has 4 bond pairs and 1 lone pair = 5 steric number -> sp3d',
    studentMethod: 'sp3',
    revisionStatus: 'Reviewed',
    difficulty: 'Hard',
    mistakeTypes: ['Conceptual Gap', 'Trap Option Selected'],
    source: 'DPP 2 CHEMICAL BONDING',
    dateLogged: new Date().toISOString(),
    timeTaken: 2
  } as Mistake,
  {
    id: 'm3',
    subject: 'maths',
    chapter: 'Definite Integrals',
    topic: 'King Property',
    questionText: 'Evaluate integral from 0 to pi of x sin x / (1 + cos^2 x) dx.',
    correctSolution: 'pi^2 / 4',
    correctMethod: 'Applying King Property I = int (pi - x)...',
    studentMethod: 'pi / 4',
    revisionStatus: 'Mastered',
    difficulty: 'Hard',
    mistakeTypes: ['Sign / Negative Error'],
    source: 'JEE Advanced Paper 1',
    dateLogged: new Date().toISOString(),
    timeTaken: 5
  } as Mistake
];

const mockActions = {
  updateMistakeStatus: vi.fn().mockResolvedValue(undefined),
  deleteMistake: vi.fn().mockResolvedValue(undefined),
  addMistake: vi.fn().mockResolvedValue(undefined),
  addMistakesBatch: vi.fn().mockResolvedValue(undefined)
};

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: vi.fn((selector) => {
    const mockState = {
      actions: mockActions,
      mistakes: mockMistakes,
      chapters: [
        { id: 'p1', name: 'Kinematics', subject: 'physics' },
        { id: 'c1', name: 'Chemical Bonding', subject: 'chemistry' },
        { id: 'm1', name: 'Definite Integrals', subject: 'maths' }
      ]
    };
    return selector ? selector(mockState) : mockState;
  })
}));

vi.mock('@/utils/audioEngine', () => ({
  audioEngine: {
    playSuccessChime: vi.fn(),
    playMechanicalKey: vi.fn().mockResolvedValue(undefined),
    playActionClick: vi.fn()
  }
}));

describe('MistakesPage Overhaul (Unified 3-Mode Cockpit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Mistake Studio with hero metrics, Leitner boxes, and error cards', () => {
    render(<MistakesPage />);

    expect(screen.getByText(/Mistakes Analysis & Precision Vault/i)).toBeInTheDocument();
    expect(screen.getByText('Leitner Spaced Repetition Cadence')).toBeInTheDocument();
    expect(screen.getByText(/Box 1 \(Day 1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Box 2 \(Day 3\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Box 3 \(Day 7\)/i)).toBeInTheDocument();

    // Verify all 3 mistakes are rendered initially
    expect(screen.getByText('Kinematics')).toBeInTheDocument();
    expect(screen.getByText('Chemical Bonding')).toBeInTheDocument();
    expect(screen.getByText('Definite Integrals')).toBeInTheDocument();
  });

  it('filters mistakes by subject tabs correctly', () => {
    render(<MistakesPage />);

    // Click on Physics subject filter tab
    const physicsTab = screen.getByRole('button', { name: /^physics/i });
    fireEvent.click(physicsTab);

    // Physics error visible, chemistry and maths hidden
    expect(screen.getByText('Kinematics')).toBeInTheDocument();
    expect(screen.queryByText('Chemical Bonding')).not.toBeInTheDocument();
    expect(screen.queryByText('Definite Integrals')).not.toBeInTheDocument();

    // Click back to All
    const allTab = screen.getByRole('button', { name: /^all/i });
    fireEvent.click(allTab);
    expect(screen.getByText('Chemical Bonding')).toBeInTheDocument();
  });

  it('filters mistakes by search query across statement, chapter, and source', () => {
    render(<MistakesPage />);

    const searchInput = screen.getByPlaceholderText(/Search question, chapter, topic/i);
    fireEvent.change(searchInput, { target: { value: 'SF4' } });

    expect(screen.getByText('Chemical Bonding')).toBeInTheDocument();
    expect(screen.queryByText('Kinematics')).not.toBeInTheDocument();
  });

  it('opens and switches to Remediation Lab when clicking Remediate', async () => {
    render(<MistakesPage />);

    // Click Remediate on the first error card
    const remediateBtns = screen.getAllByRole('button', { name: /Remediate/i });
    fireEvent.click(remediateBtns[0]);

    // Should switch mode to Remediation Lab after exit transition
    expect(await screen.findByText('Interactive Remediation Lab')).toBeInTheDocument();
    expect(screen.getByText('Where Did Your Approach Falter?')).toBeInTheDocument();
    expect(screen.getByText('Analytical Derivation')).toBeInTheDocument();

    // Clicking Exit Lab returns to Studio
    const exitBtn = screen.getByRole('button', { name: /Exit Lab/i });
    fireEvent.click(exitBtn);

    expect(await screen.findByText('Leitner Spaced Repetition Cadence')).toBeInTheDocument();
  });

  it('launches CBT Retest Arena when clicking Retest All Filtered', () => {
    render(<MistakesPage />);

    const retestBtn = screen.getByRole('button', { name: /Retest All Filtered/i });
    fireEvent.click(retestBtn);

    // Should render CBT Retest Arena
    expect(screen.getByText('Mistakes CBT Retest Arena')).toBeInTheDocument();
    expect(screen.getByText(/Time Remaining:/i)).toBeInTheDocument();
    expect(screen.getByText('Question 1')).toBeInTheDocument();
  });

  it('opens Socratic AI Autopsy modal when clicking AI Autopsy button', () => {
    render(<MistakesPage />);

    const aiBtns = screen.getAllByRole('button', { name: /AI Autopsy/i });
    fireEvent.click(aiBtns[0]);

    expect(screen.getByText('Socratic Error Autopsy')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Explain your thought process or ask for a hint/i)).toBeInTheDocument();
  });
});
