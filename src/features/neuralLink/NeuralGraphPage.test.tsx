import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { NeuralGraphPage } from './NeuralGraphPage';
import { Chapter } from '@jee-os/engines';

// Mock @xyflow/react
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    ReactFlow: ({ children, nodes, onNodeClick }: any) => (
      <div data-testid="react-flow-canvas">
        {nodes?.map((node: any) => (
          <button
            key={node.id}
            data-testid={`flow-node-${node.id}`}
            onClick={(e) => onNodeClick?.(e, node)}
          >
            {node.data?.label || node.data?.chapterName || node.data?.name || node.id}
          </button>
        ))}
        {children}
      </div>
    ),
    Background: () => <div data-testid="flow-background" />,
    Controls: () => <div data-testid="flow-controls" />,
  };
});

const mockChapters: Chapter[] = [
  {
    id: 'p1',
    name: 'Kinematics',
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
    lastRevisionDaysAgo: 2
  } as Chapter,
  {
    id: 'c1',
    name: 'Chemical Bonding',
    subject: 'chemistry',
    unit: 'Inorganic',
    completion: 95,
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
    lastRevisionDaysAgo: 1
  } as Chapter,
  {
    id: 'm1',
    name: 'Calculus',
    subject: 'maths',
    unit: 'Calculus',
    completion: 40,
    currentLecture: 4,
    totalLectures: 12,
    theoryComplete: false,
    dppComplete: false,
    pyqsComplete: false,
    revisionCount: 1,
    difficulty: 'Hard',
    confidence: 60,
    estimatedRemainingTime: 10,
    priority: 1,
    dependencies: [],
    weightage: 8,
    weaknessScore: 30,
    status: 'Learning',
    solvedQuestions: 30,
    lastRevisionDaysAgo: 4
  } as Chapter
];

const mockAddCustomMission = vi.fn();

const mockStoreState = {
  actions: {
    addCustomMission: mockAddCustomMission,
  },
  chapters: mockChapters,
  chapterTelemetryMap: {
    p1: {
      chapterId: 'p1',
      chapterName: 'Kinematics',
      subject: 'physics',
      masteryScore: 80,
      syllabusStage: 'In Progress',
      currentLecture: 8,
      totalLectures: 10,
      weightagePercent: 5,
    }
  }
};

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => selector(mockStoreState)
}));

describe('NeuralGraphPage Feature View (Magnitude 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Neural Link MAGI HUD banner, subject matrix pills, and graph modes', () => {
    render(<NeuralGraphPage />);

    expect(screen.getByText(/MAGI-01 \/\/ NEURAL LINK/i)).toBeInTheDocument();
    expect(screen.getByText(/COHESION/i)).toBeInTheDocument();

    // Subject Matrix
    expect(screen.getByRole('button', { name: 'physics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'chemistry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'maths' })).toBeInTheDocument();

    // View Modes
    expect(screen.getByTitle('Learning Sequence Flow')).toBeInTheDocument();
    expect(screen.getByTitle('Memory Decay')).toBeInTheDocument();
    expect(screen.getByTitle('High Yield')).toBeInTheDocument();

    // React Flow Canvas
    expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
  });

  it('switches active subjects and graph modes', () => {
    render(<NeuralGraphPage />);

    const chemBtn = screen.getByRole('button', { name: 'chemistry' });
    fireEvent.click(chemBtn);
    expect(chemBtn).toBeInTheDocument();

    const decayModeBtn = screen.getByTitle('Memory Decay');
    fireEvent.click(decayModeBtn);
    expect(decayModeBtn).toBeInTheDocument();

    const weightageModeBtn = screen.getByTitle('High Yield');
    fireEvent.click(weightageModeBtn);
    expect(weightageModeBtn).toBeInTheDocument();
  });

  it('triggers AI Audit button to request coach diagnostic navigation', () => {
    const mockNavigate = vi.fn();
    render(<NeuralGraphPage onNavigate={mockNavigate} />);

    const aiAuditBtn = screen.getByRole('button', { name: /AI AUDIT/i });
    fireEvent.click(aiAuditBtn);

    expect(mockNavigate).toHaveBeenCalledWith('ai-coach');
    const storedPrompt = sessionStorage.getItem('pendingCoachPrompt');
    expect(storedPrompt).toContain('physics syllabus graph');
  });
});
