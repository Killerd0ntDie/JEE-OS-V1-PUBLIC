import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SmartRevisionQueueWidget } from './SmartRevisionQueueWidget';
import { Chapter } from '@/types/index';
import { RevisionCard } from '@/services/revisionEngineService';

// Mock audio engine
vi.mock('@/utils/audioEngine', () => ({
  audioEngine: {
    playPowerUp: vi.fn().mockResolvedValue(undefined),
    playRadioRelayClick: vi.fn().mockResolvedValue(undefined),
  }
}));

let mockStoreState: any = {};

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => selector(mockStoreState)
}));

describe('SmartRevisionQueueWidget - Vault Telemetry & Doomsday Synergy', () => {
  const mockChapters = [
    {
      id: 'phy-1',
      name: 'Rotational Motion',
      subject: 'physics',
      status: 'Mastered',
      completion: 100,
      confidence: 85,
      theoryComplete: true,
      dppComplete: true,
    },
    {
      id: 'chem-1',
      name: 'Thermodynamics',
      subject: 'chemistry',
      status: 'Mastered',
      completion: 100,
      confidence: 90,
      theoryComplete: true,
      dppComplete: true,
    },
    {
      id: 'math-1',
      name: 'Differential Equations',
      subject: 'maths',
      status: 'Revision Due',
      completion: 80,
      confidence: 70,
      theoryComplete: true,
      dppComplete: false,
    }
  ] as unknown as Chapter[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      chapters: mockChapters,
      settings: {
        dayStartTime: '07:00'
      }
    };
  });

  it('renders Vault Telemetry and Doomsday Velocity Safeguard when queue is 0 DUE', () => {
    render(
      <MemoryRouter>
        <SmartRevisionQueueWidget
          revisionQueue={[]}
          onLaunchRevision={vi.fn()}
        />
      </MemoryRouter>
    );

    // Verify 0 DUE and Memory Vault Secure
    expect(screen.getByText('0 DUE')).toBeInTheDocument();
    expect(screen.getByText('MEMORY VAULT SECURE')).toBeInTheDocument();

    // Verify Vault Health telemetry with chapters locked
    expect(screen.getByText(/3 locked/i)).toBeInTheDocument();
    expect(screen.getByText(/Vault Health/i)).toBeInTheDocument();

    // Verify Doomsday Velocity Safeguard Callout
    expect(screen.getByText(/DOOMSDAY VELOCITY SAFEGUARD/i)).toBeInTheDocument();
    expect(screen.getByText(/3 in Vault/i)).toBeInTheDocument();
    expect(screen.getByText(/protects your 3 studied chapters against Ebbinghaus decay/i)).toBeInTheDocument();

    // Verify Proactive Drill CTA
    expect(screen.getByText(/Proactive Speed Recall Drill/i)).toBeInTheDocument();

    // Verify Revision Hub bottom button
    expect(screen.getByText('Revision Hub')).toBeInTheDocument();
  });

  it('renders Decay Risk alert banner and overdue items when queue has due items', () => {
    const mockDueQueue: RevisionCard[] = [
      {
        chapterId: 'phy-1',
        chapterName: 'Rotational Motion',
        healthScore: 45,
        priorityScore: 92,
        estimatedTime: 20,
        reason: 'Interval Overdue by 4 days',
        retentionStatus: 'Fading',
        isCritical: true,
      } as any
    ];

    const onLaunch = vi.fn();

    render(
      <MemoryRouter>
        <SmartRevisionQueueWidget
          revisionQueue={mockDueQueue}
          onLaunchRevision={onLaunch}
        />
      </MemoryRouter>
    );

    // Verify badge
    expect(screen.getByText('1 DUE')).toBeInTheDocument();

    // Verify Decay Risk banner linking to Doomsday Pace
    expect(screen.getByText(/1 Chapter in Decay Risk/i)).toBeInTheDocument();
    expect(screen.getByText(/Protect Velocity/i)).toBeInTheDocument();

    // Verify chapter card
    expect(screen.getByText('Rotational Motion')).toBeInTheDocument();
    expect(screen.getByText('Interval Overdue by 4 days')).toBeInTheDocument();

    // Click revise
    const reviseBtn = screen.getByText('Revise');
    fireEvent.click(reviseBtn);
    expect(onLaunch).toHaveBeenCalledWith(mockDueQueue[0]);
  });
});
