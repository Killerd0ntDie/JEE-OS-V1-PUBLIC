import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadDppModal } from './UploadDppModal';
import { PdfPaperParserService } from '../services/PdfPaperParserService';

// Mock zustand store
vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => {
    const mockStore = {
      actions: {
        addCustomMockTest: vi.fn().mockResolvedValue(undefined)
      },
      chapters: [
        { id: 'p1', name: 'Ray Optics and Optical Instruments', subject: 'physics' },
        { id: 'p2', name: 'Rotational Motion', subject: 'physics' },
        { id: 'c1', name: 'Chemical Bonding', subject: 'chemistry' },
        { id: 'm1', name: 'Definite Integration', subject: 'maths' }
      ]
    };
    return selector(mockStore);
  }
}));

describe('UploadDppModal Component Overhaul', () => {
  const onCloseMock = vi.fn();
  const onTestCreatedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with subject theming and default physics configuration', () => {
    render(
      <UploadDppModal
        isOpen={true}
        onClose={onCloseMock}
        onTestCreated={onTestCreatedMock}
        initialSubject="physics"
      />
    );

    expect(screen.getByText('Coaching DPP & Assignment Solver')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
    expect(screen.getByText('Drop coaching DPP or worksheet PDF here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /extract & build interactive dpp drill/i })).toBeDisabled();
  });

  it('switches subject theme when selecting Chemistry or Maths', () => {
    render(
      <UploadDppModal
        isOpen={true}
        onClose={onCloseMock}
        onTestCreated={onTestCreatedMock}
        initialSubject="physics"
      />
    );

    // Switch to Chemistry
    const chemBtn = screen.getByRole('button', { name: /chemistry/i });
    fireEvent.click(chemBtn);

    expect(screen.getByText('Chemistry')).toBeInTheDocument();
    expect(screen.getByText(/1 Chemistry Chapters Available/i)).toBeInTheDocument();

    // Switch to Maths
    const mathBtn = screen.getByRole('button', { name: /maths/i });
    fireEvent.click(mathBtn);

    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText(/1 Mathematics Chapters Available/i)).toBeInTheDocument();
  });

  it('auto-fills title, subject, chapter, and duration on PDF selection via AI analyzer', async () => {
    vi.spyOn(PdfPaperParserService, 'analyzeDppMetadata').mockResolvedValue({
      title: 'Allen Physics DPP #04 - Rotational Motion',
      sheetName: 'DPP #04',
      subject: 'physics',
      chapterName: 'Rotational Motion',
      recommendedDurationMinutes: 30,
      questionCountEstimate: 10,
      detectedInstitute: 'Allen',
      confidence: 'high'
    });

    render(
      <UploadDppModal
        isOpen={true}
        onClose={onCloseMock}
        onTestCreated={onTestCreatedMock}
      />
    );

    const file = new File(['%PDF-1.4 mock'], 'Allen_Rotational_Motion_DPP.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file]
    });
    fireEvent.change(input);

    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText(/e\.g\. Allen Physics DPP/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Allen Physics DPP #04 - Rotational Motion');
    });

    expect(screen.getByText(/Auto-filled/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Inferred: Allen Physics DPP #04 - Rotational Motion/i)).toBeInTheDocument();
    expect(screen.getAllByText(/30m/i).length).toBeGreaterThanOrEqual(1);
  });

  it('handles duration preset selection changes', () => {
    render(
      <UploadDppModal
        isOpen={true}
        onClose={onCloseMock}
        onTestCreated={onTestCreatedMock}
      />
    );

    const speedBtn = screen.getByRole('button', { name: /30m \(Speed\)/i });
    fireEvent.click(speedBtn);
    expect(speedBtn).toBeInTheDocument();
  });

  it('auto-switches targetSubject to chemistry and matches Chemical Bonding when ChemicalbondingDPP-01.pdf is inferred', async () => {
    vi.spyOn(PdfPaperParserService, 'analyzeDppMetadata').mockResolvedValue({
      title: 'Chemical Bonding DPP 01',
      sheetName: 'DPP 01',
      subject: 'chemistry',
      chapterName: 'Chemical Bonding',
      recommendedDurationMinutes: 45,
      questionCountEstimate: 21,
      detectedInstitute: undefined,
      confidence: 'high'
    });

    render(
      <UploadDppModal
        isOpen={true}
        onClose={onCloseMock}
        onTestCreated={onTestCreatedMock}
        initialSubject="physics"
      />
    );

    const file = new File(['%PDF-1.4 mock'], 'ChemicalbondingDPP-01.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file]
    });
    fireEvent.change(input);

    await waitFor(() => {
      // Should automatically switch subject to Chemistry
      expect(screen.getByText(/1 Chemistry Chapters Available/i)).toBeInTheDocument();
      // Dropdown should be set to Chemical Bonding
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('Chemical Bonding');
    });

    // Verify AI banner does NOT display "null •"
    expect(screen.queryByText(/null •/i)).not.toBeInTheDocument();
  });

  it('opens Review & Calibrate Studio without obscuring when clicking review button', async () => {
    vi.spyOn(PdfPaperParserService, 'detectScannedPdf').mockResolvedValue({
      isScanned: false,
      pageCount: 1,
      charCount: 200
    });

    vi.spyOn(PdfPaperParserService, 'analyzeDppMetadata').mockResolvedValue({
      title: 'Rotational Motion DPP #01',
      sheetName: 'DPP 1',
      subject: 'physics',
      chapterName: 'Rotational Motion',
      recommendedDurationMinutes: 30,
      questionCountEstimate: 2,
      confidence: 'high'
    } as any);

    vi.spyOn(PdfPaperParserService, 'parseDppToMockTest').mockResolvedValue({
      id: 'dpp_test_1',
      name: 'Rotational Motion DPP #01',
      durationMinutes: 30,
      totalMarks: 8,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              content: 'What is the moment of inertia of a ring?',
              options: ['MR^2', 'MR^2/2', '2MR^2', 'MR^2/4'],
              correctAnswer: '0',
              type: 'MCQ',
              marks: { correct: 4, incorrect: -1 }
            },
            {
              id: 'q2',
              content: 'Calculate angular momentum in SI units.',
              correctAnswer: '20',
              type: 'NUMERICAL',
              marks: { correct: 4, incorrect: 0 }
            }
          ]
        }
      ]
    } as any);

    render(
      <UploadDppModal
        isOpen={true}
        onClose={onCloseMock}
        onTestCreated={onTestCreatedMock}
        initialSubject="physics"
      />
    );

    const file = new File(['%PDF-1.4 valid mock'], 'Rotational_DPP.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file]
    });
    fireEvent.change(input);

    const extractBtn = screen.getByRole('button', { name: /extract & build interactive dpp drill/i });
    await waitFor(() => {
      expect(extractBtn).toBeEnabled();
    });
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(screen.getByText(/Review questions in studio/i)).toBeInTheDocument();
    });

    const reviewBtn = screen.getByRole('button', { name: /review questions in studio/i });
    fireEvent.click(reviewBtn);

    // The review studio header should now be visible on screen
    expect(screen.getByText('Review & Calibration Studio')).toBeInTheDocument();
    expect(screen.getByText('What is the moment of inertia of a ring?')).toBeInTheDocument();
  }, 15000);

  it('saves test to available tests and launches drill without triggering discard confirm prompt', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    vi.spyOn(PdfPaperParserService, 'detectScannedPdf').mockResolvedValue({
      isScanned: false,
      pageCount: 1,
      charCount: 200
    });

    vi.spyOn(PdfPaperParserService, 'analyzeDppMetadata').mockResolvedValue({
      title: 'Rotational Motion DPP #01',
      sheetName: 'DPP 1',
      subject: 'physics',
      chapterName: 'Rotational Motion',
      recommendedDurationMinutes: 30,
      questionCountEstimate: 1,
      confidence: 'high'
    } as any);

    vi.spyOn(PdfPaperParserService, 'parseDppToMockTest').mockResolvedValue({
      id: 'dpp_test_saved',
      name: 'Rotational Motion DPP #01',
      durationMinutes: 30,
      totalMarks: 4,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              content: 'What is torque?',
              options: ['r x F', 'r . F', 'm a', 'v / t'],
              correctAnswer: '0',
              type: 'MCQ',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    } as any);

    render(
      <UploadDppModal
        isOpen={true}
        onClose={onCloseMock}
        onTestCreated={onTestCreatedMock}
        initialSubject="physics"
      />
    );

    const file = new File(['%PDF-1.4 valid mock'], 'Rotational_DPP.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file]
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /extract & build interactive dpp drill/i })).toBeEnabled();
    }, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: /extract & build interactive dpp drill/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save to available tests/i })).toBeInTheDocument();
    }, { timeout: 4000 });

    // Click Save to Available Tests
    const saveBtn = screen.getByRole('button', { name: /save to available tests/i });
    fireEvent.click(saveBtn);

    // Verify window.confirm was NEVER called to prompt discard
    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    }, { timeout: 4000 });
  });

  it('saves test from Review & Calibrate Studio without triggering discard confirm prompt', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    vi.spyOn(PdfPaperParserService, 'detectScannedPdf').mockResolvedValue({
      isScanned: false,
      pageCount: 1,
      charCount: 200
    });

    vi.spyOn(PdfPaperParserService, 'analyzeDppMetadata').mockResolvedValue({
      title: 'Rotational Motion DPP #01',
      sheetName: 'DPP 1',
      subject: 'physics',
      chapterName: 'Rotational Motion',
      recommendedDurationMinutes: 30,
      questionCountEstimate: 1,
      confidence: 'high'
    } as any);

    vi.spyOn(PdfPaperParserService, 'parseDppToMockTest').mockResolvedValue({
      id: 'dpp_test_saved_studio',
      name: 'Rotational Motion DPP #01',
      durationMinutes: 30,
      totalMarks: 4,
      sections: [
        {
          subject: 'physics',
          questions: [
            {
              id: 'q1',
              content: 'What is angular velocity?',
              options: ['dθ/dt', 'θ/t', 'ω/t', 'v/r'],
              correctAnswer: '0',
              type: 'MCQ',
              marks: { correct: 4, incorrect: -1 }
            }
          ]
        }
      ]
    } as any);

    render(
      <UploadDppModal
        isOpen={true}
        onClose={onCloseMock}
        onTestCreated={onTestCreatedMock}
        initialSubject="physics"
      />
    );

    const file = new File(['%PDF-1.4 valid mock'], 'Rotational_DPP.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file]
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /extract & build interactive dpp drill/i })).toBeEnabled();
    }, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: /extract & build interactive dpp drill/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /review questions in studio/i })).toBeInTheDocument();
    }, { timeout: 4000 });

    // Open Review Studio
    const reviewBtn = screen.getByRole('button', { name: /review questions in studio/i });
    fireEvent.click(reviewBtn);

    expect(screen.getByText('Review & Calibration Studio')).toBeInTheDocument();

    // Click "Save to Available Tests" inside Review Studio
    const saveBtns = screen.getAllByRole('button', { name: /save to available tests/i });
    fireEvent.click(saveBtns[saveBtns.length - 1]);

    // Verify window.confirm was NEVER called to prompt discard
    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    }, { timeout: 4000 });
  });
});
