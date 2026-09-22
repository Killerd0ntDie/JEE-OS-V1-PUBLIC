import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyCampaignBanner } from './MonthlyCampaignBanner';
import { StudyBrainService } from '@/services/studyBrainService';

// Mock StudyBrainService
vi.mock('@/services/studyBrainService', () => ({
  StudyBrainService: {
    getDaysUntilExam: vi.fn(),
  },
}));

// Mutable store mock
let mockStoreState: any = {};

vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => selector(mockStoreState),
}));

describe('MonthlyCampaignBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      xp: { monthly: 1500, total: 5000, level: 3 },
      mentorProfile: {
        monthlyObjective: {
          category: 'Finish Rotational Dynamics',
          targetCount: 1,
        },
      },
      chapters: [
        { id: '1', name: 'Rotational Motion', completion: 100, status: 'Mastered' },
        { id: '2', name: 'Electrostatics', completion: 50, status: 'In Progress' },
        { id: '3', name: 'Thermodynamics', completion: 0, status: 'Backlog' },
      ],
      settings: {
        targetYear: '2026',
      },
    };
  });

  it('calculates exam urgency factor and displays telemetry for exam countdown', () => {
    // Mock 45 days until JEE Main -> urgency factor 1.55 (PEAK COUNTDOWN)
    vi.mocked(StudyBrainService.getDaysUntilExam).mockImplementation((_year, exam) => {
      if (exam === 'JEE Main') return 45;
      return 120;
    });

    render(<MonthlyCampaignBanner />);

    // Check Exam Countdown pill
    expect(screen.getByText(/45d to JEE Main 2026/i)).toBeInTheDocument();

    // Check Ideal Target telemetry pill exists
    expect(screen.getByText(/XP\/d Ideal Target/i)).toBeInTheDocument();

    // Verify Monthly Boss details
    expect(screen.getByText(/MONTHLY BOSS/i)).toBeInTheDocument();
    expect(screen.getByText(/PEAK COUNTDOWN/i)).toBeInTheDocument();
    expect(screen.getByText(/The Rotational Dynamics Boss/i)).toBeInTheDocument();
  });

  it('displays syllabus deficit telemetry when behind ideal student trajectory', () => {
    // 30 days until exam, very little syllabus done -> large deficit
    vi.mocked(StudyBrainService.getDaysUntilExam).mockReturnValue(30);

    mockStoreState.chapters = [
      { id: '1', name: 'Ch 1', completion: 10, status: 'In Progress' },
      { id: '2', name: 'Ch 2', completion: 0, status: 'Backlog' },
      { id: '3', name: 'Ch 3', completion: 0, status: 'Backlog' },
      { id: '4', name: 'Ch 4', completion: 0, status: 'Backlog' },
    ];

    render(<MonthlyCampaignBanner />);

    // Should indicate syllabus deficit
    expect(screen.getByText(/behind ideal trajectory/i)).toBeInTheDocument();
  });

  it('displays on-track badge when syllabus is ahead or aligned with ideal student', () => {
    // Exam is far away (300 days) and student has mastered syllabus
    vi.mocked(StudyBrainService.getDaysUntilExam).mockReturnValue(300);

    mockStoreState.chapters = [
      { id: '1', name: 'Ch 1', completion: 100, status: 'Mastered' },
      { id: '2', name: 'Ch 2', completion: 100, status: 'Mastered' },
    ];

    render(<MonthlyCampaignBanner />);

    expect(screen.getByText(/Syllabus on track/i)).toBeInTheDocument();
  });

  it('renders XP Race vs Ideal Aspirant Ghost with ahead/behind metrics', () => {
    vi.mocked(StudyBrainService.getDaysUntilExam).mockReturnValue(90);
    mockStoreState.xp.monthly = 2500;

    render(<MonthlyCampaignBanner />);

    expect(screen.getByText('Ideal Student XP Race')).toBeInTheDocument();
    expect(screen.getByText(/Ghost = Ideal Aspirant pace/i)).toBeInTheDocument();
  });

  it('indicates SLAIN status when monthly boss target is defeated', () => {
    vi.mocked(StudyBrainService.getDaysUntilExam).mockReturnValue(180);
    // Set earned XP extraordinarily high to guarantee boss defeat
    mockStoreState.xp.monthly = 10000;

    render(<MonthlyCampaignBanner />);

    expect(screen.getByText(/BOSS SLAIN/i)).toBeInTheDocument();
    expect(screen.getByText(/✦ DEFEATED ✦/i)).toBeInTheDocument();
    expect(screen.getByText(/Boss defeated this month!/i)).toBeInTheDocument();
  });
});
