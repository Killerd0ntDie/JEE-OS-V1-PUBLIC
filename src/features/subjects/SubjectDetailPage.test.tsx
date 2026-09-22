import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SubjectDetailPage } from './SubjectDetailPage';
import { Chapter } from '@/types/index';

const mockChapters: Chapter[] = [
  {
    id: 'p1',
    name: 'Kinematics 1D & 2D',
    subject: 'physics',
    unit: 'Mechanics',
    completion: 80,
    currentLecture: 8,
    totalLectures: 10,
    theoryComplete: true,
    dppComplete: true,
    pyqsComplete: false,
    revisionCount: 2,
    difficulty: 'Medium',
    confidence: 80,
    estimatedRemainingTime: 2,
    priority: 1,
    dependencies: [],
    weightage: 5,
    weaknessScore: 20,
    status: 'Learning',
    solvedQuestions: 50,
    lastRevisionDaysAgo: 2,
    notes: 'Key formulas: projectile motion'
  } as Chapter,
  {
    id: 'p2',
    name: 'Electrostatics & Gauss Law',
    subject: 'physics',
    unit: 'Electrodynamics',
    completion: 100,
    currentLecture: 10,
    totalLectures: 10,
    theoryComplete: true,
    dppComplete: true,
    pyqsComplete: true,
    revisionCount: 4,
    difficulty: 'Hard',
    confidence: 95,
    estimatedRemainingTime: 0,
    priority: 1,
    dependencies: [],
    weightage: 6,
    weaknessScore: 5,
    status: 'Mastered',
    solvedQuestions: 90,
    lastRevisionDaysAgo: 1,
    notes: 'Flux through closed Gaussian surface'
  } as Chapter,
  {
    id: 'c1',
    name: 'Chemical Bonding',
    subject: 'chemistry',
    unit: 'Inorganic',
    completion: 50,
    currentLecture: 5,
    totalLectures: 10,
    theoryComplete: true,
    dppComplete: false,
    pyqsComplete: false,
    revisionCount: 1,
    difficulty: 'Hard',
    confidence: 70,
    estimatedRemainingTime: 5,
    priority: 1,
    dependencies: [],
    weightage: 7,
    weaknessScore: 25,
    status: 'Learning',
    solvedQuestions: 30,
    lastRevisionDaysAgo: 3
  } as Chapter
];

const mockActions = {
  updateChapter: vi.fn(),
  updateChapterStatus: vi.fn(),
  addCustomMission: vi.fn(),
  openChapterEditModal: vi.fn(),
  addChapter: vi.fn(),
};

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => {
    const state = {
      actions: mockActions,
      chapters: mockChapters,
      chapterTelemetryMap: {
        p1: {
          chapterId: 'p1',
          chapterName: 'Kinematics 1D & 2D',
          subject: 'physics',
          masteryScore: 80,
          syllabusStage: 'In Progress',
          weightagePercent: 5,
        },
        p2: {
          chapterId: 'p2',
          chapterName: 'Electrostatics & Gauss Law',
          subject: 'physics',
          masteryScore: 100,
          syllabusStage: 'Mastered',
          weightagePercent: 6,
        }
      }
    };
    return selector(state);
  }
}));

describe('SubjectDetailPage Feature View (Magnitude 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Physics SubjectCommandCenter with header, progress badge, and chapter list', () => {
    render(
      <SubjectDetailPage
        subjectId="physics"
        subjectTitle="Physics"
        subjectSubtitle="Mechanics, Electrodynamics & Modern Physics."
        subjectIcon="Atom"
        unitCategories={['All', 'Mechanics', 'Electrodynamics']}
      />
    );

    expect(screen.getByRole('heading', { name: 'Physics' })).toBeInTheDocument();
    expect(screen.getByText(/1\/2 Mastered/i)).toBeInTheDocument();
    expect(screen.getByText('Mechanics, Electrodynamics & Modern Physics.')).toBeInTheDocument();

    // Verify chapters rendered in chapter list
    expect(screen.getByRole('heading', { level: 3, name: 'Kinematics 1D & 2D' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Electrostatics & Gauss Law' })).toBeInTheDocument();

    // Chemistry chapter should NOT be in physics view
    expect(screen.queryByText('Chemical Bonding')).not.toBeInTheDocument();
  });

  it('filters chapters by unit category pill', async () => {
    render(
      <SubjectDetailPage
        subjectId="physics"
        subjectTitle="Physics"
        subjectSubtitle="Physics command center."
        subjectIcon="Atom"
        unitCategories={['All', 'Mechanics', 'Electrodynamics']}
      />
    );

    // Click 'Mechanics' unit
    const mechanicsPill = screen.getByRole('button', { name: 'Mechanics' });
    fireEvent.click(mechanicsPill);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'Kinematics 1D & 2D' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 3, name: 'Electrostatics & Gauss Law' })).not.toBeInTheDocument();
    });
  });

  it('filters chapters using search bar', () => {
    render(
      <SubjectDetailPage
        subjectId="physics"
        subjectTitle="Physics"
        subjectSubtitle="Physics command center."
        subjectIcon="Atom"
        unitCategories={['All', 'Mechanics', 'Electrodynamics']}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search Physics chapters/i);
    fireEvent.change(searchInput, { target: { value: 'Gauss' } });

    expect(screen.queryByRole('heading', { level: 3, name: 'Kinematics 1D & 2D' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Electrostatics & Gauss Law' })).toBeInTheDocument();
  });

  it('toggles view mode between List and Tree (RPG)', () => {
    render(
      <SubjectDetailPage
        subjectId="physics"
        subjectTitle="Physics"
        subjectSubtitle="Physics command center."
        subjectIcon="Atom"
        unitCategories={['All']}
      />
    );

    const treeBtn = screen.getByRole('button', { name: /Tree/i });
    fireEvent.click(treeBtn);

    expect(localStorage.getItem('syllabusViewMode')).toBe('rpg');
  });

  it('opens Add Custom Chapter modal when clicking Add Chapter button', () => {
    render(
      <SubjectDetailPage
        subjectId="physics"
        subjectTitle="Physics"
        subjectSubtitle="Physics command center."
        subjectIcon="Atom"
        unitCategories={['All']}
      />
    );

    const addChapterBtn = screen.getByRole('button', { name: /Add Chapter/i });
    fireEvent.click(addChapterBtn);

    expect(screen.getByText('Add Custom Chapter')).toBeInTheDocument();
  });

  it('toggles view mode to ROI Matrix and renders weightage data', () => {
    render(
      <SubjectDetailPage
        subjectId="physics"
        subjectTitle="Physics"
        subjectSubtitle="Physics command center."
        subjectIcon="Atom"
        unitCategories={['All']}
      />
    );

    const matrixBtn = screen.getByRole('button', { name: /ROI Matrix/i });
    fireEvent.click(matrixBtn);

    expect(localStorage.getItem('syllabusViewMode')).toBe('matrix');
    expect(screen.getByText(/Chapter ROI & JEE Weightage Matrix/i)).toBeInTheDocument();
  });
});
