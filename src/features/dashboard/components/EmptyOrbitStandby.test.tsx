import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { EmptyOrbitStandby } from './EmptyOrbitStandby';
import { Chapter } from '@/types/index';
import { WeeklyBlock } from '@jee-os/engines';

// Mock audio engine
vi.mock('@/utils/audioEngine', () => ({
  audioEngine: {
    playMechanicalKey: vi.fn().mockResolvedValue(undefined),
    playTacticalBeep: vi.fn().mockResolvedValue(undefined),
  }
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast })
}));

describe('EmptyOrbitStandby Component', () => {
  const mockChapters = [
    {
      id: 'phy-1',
      name: 'Rotational Motion',
      subject: 'physics',
      status: 'Learning',
      currentLecture: 3,
      totalLectures: 8,
      completion: 35,
      weightage: 8,
      priorityScore: 92,
      unit: 'Mechanics',
    },
    {
      id: 'chem-1',
      name: 'Chemical Thermodynamics',
      subject: 'chemistry',
      status: 'Learning',
      currentLecture: 2,
      totalLectures: 6,
      completion: 30,
      weightage: 7,
      priorityScore: 88,
      unit: 'Physical Chemistry',
    },
    {
      id: 'math-1',
      name: 'Definite Integration',
      subject: 'maths',
      status: 'Learning',
      currentLecture: 4,
      totalLectures: 7,
      completion: 55,
      weightage: 9,
      priorityScore: 95,
      unit: 'Calculus',
    }
  ] as unknown as Chapter[];

  const mockWeeklySchedule: WeeklyBlock[] = [
    {
      id: 'block-1',
      dayIndex: (new Date().getDay() + 6 + 1) % 7, // tomorrow
      dayName: 'Tomorrow',
      timeSlot: 'Morning (07:00 - 09:30)',
      subject: 'physics',
      chapterId: 'phy-1',
      chapterName: 'Rotational Motion',
      unit: 'Mechanics',
      activity: 'Watch Lecture 4',
      taskType: 'Watch Lecture',
      durationMinutes: 60,
      completed: false,
      priorityScore: 90,
      reasoning: {
        whySelected: 'Core mechanics foundation',
        dependentChapters: [],
        rankingRationale: 'High weightage',
        longTermImpact: 'Crucial for JEE',
        postponeRisk: 'Blocks angular momentum',
        targetAccuracy: '85%'
      }
    }
  ];

  it('renders dynamic active chapters instead of hardcoded GOC/Sets/Units', () => {
    const onEngage = vi.fn();
    render(
      <MemoryRouter>
        <EmptyOrbitStandby
          chapters={mockChapters}
          onEngageChapter={onEngage}
        />
      </MemoryRouter>
    );

    // Verify candidate's active chapters are rendered
    expect(screen.getByText('Rotational Motion')).toBeInTheDocument();
    expect(screen.getByText('Chemical Thermodynamics')).toBeInTheDocument();
    expect(screen.getByText('Definite Integration')).toBeInTheDocument();

    // Verify lecture progress badges are displayed
    expect(screen.getByText('LEC 3/8')).toBeInTheDocument();
    expect(screen.getByText('LEC 2/6')).toBeInTheDocument();
    expect(screen.getByText('LEC 4/7')).toBeInTheDocument();

    // Clicking dynamic chapter triggers onEngageChapter with that chapter's id
    const engageRot = screen.getByText(/Engage Rotational Motion/i);
    fireEvent.click(engageRot);
    expect(onEngage).toHaveBeenCalledWith('phy-1', 'Rotational Motion');
  });

  it('falls back to foundational prereqs only when user has no active chapters', () => {
    const onEngage = vi.fn();
    render(
      <MemoryRouter>
        <EmptyOrbitStandby
          chapters={[]}
          onEngageChapter={onEngage}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('General Organic Chemistry')).toBeInTheDocument();
    expect(screen.getByText('Sets, Relations & Functions')).toBeInTheDocument();
    expect(screen.getByText('Units, Dimensions & Vectors')).toBeInTheDocument();
  });

  it('incorporates upcoming tasks from Master Schedule and supports 1-click Advance to Today', () => {
    const onEngage = vi.fn();
    const onAdvance = vi.fn();
    render(
      <MemoryRouter>
        <EmptyOrbitStandby
          chapters={mockChapters}
          weeklySchedule={mockWeeklySchedule}
          onEngageChapter={onEngage}
          onAdvanceScheduleTask={onAdvance}
        />
      </MemoryRouter>
    );

    // Verify Master Schedule section appears
    expect(screen.getByText('Queued in Master Schedule')).toBeInTheDocument();
    expect(screen.getByText('Watch Lecture 4')).toBeInTheDocument();

    // Click "Advance to Today"
    const advanceBtn = screen.getByText('Advance to Today');
    fireEvent.click(advanceBtn);
    expect(onAdvance).toHaveBeenCalledWith(mockWeeklySchedule[0]);
  });
});
