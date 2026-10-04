import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormulaVaultPage } from './FormulaVaultPage';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

// Mock Toast
const mockToast = vi.fn();
vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock audioEngine
vi.mock('@/utils/audioEngine', () => ({
  audioEngine: {
    playMechanicalKey: vi.fn().mockResolvedValue(undefined),
    playHover: vi.fn(),
    playTap: vi.fn(),
  }
}));

// Mock MathRenderer to avoid expensive KaTeX DOM generation in JSDOM
vi.mock('@/components/MathRenderer', () => ({
  MathRenderer: ({ text, content }: any) => <div data-testid="math-renderer">{text || content}</div>,
  RichTextRenderer: ({ content }: any) => <div data-testid="rich-text-renderer">{content}</div>,
  BlockMath: ({ math }: any) => <div>{math}</div>,
  InlineMath: ({ math }: any) => <span>{math}</span>,
}));

describe('FormulaVaultPage Feature View (Magnitude 5.1)', { timeout: 40000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useStudyBrainStore.setState({ bookmarkedFormulaIds: [] });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders Formula Vault header, search bar, and subject pills', () => {
    render(<FormulaVaultPage />);

    expect(screen.getByText('Formula Vault')).toBeInTheDocument();

    // Verify Subject filters (strictly Physics, Chemistry, Maths; All removed)
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Physics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chemistry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Maths/i })).toBeInTheDocument();

    // Verify Search Input
    expect(
      screen.getByPlaceholderText('Search formulas...')
    ).toBeInTheDocument();
  });

  it('filters formulas when typing in the search input', async () => {
    render(<FormulaVaultPage />);

    const searchInput = screen.getByPlaceholderText('Search formulas...');
    fireEvent.change(searchInput, { target: { value: 'Kinematics' } });

    // Should display filtered results or chapter
    expect(screen.getByRole('heading', { name: 'Kinematics' })).toBeInTheDocument();

    // Now search something nonexistent
    fireEvent.change(searchInput, { target: { value: 'xyzrandomnonexistentformula' } });
    expect(screen.getByText(/No Formulas Found/i)).toBeInTheDocument();

    // Click Reset Filters
    const resetBtn = screen.getByRole('button', { name: 'Reset Filters' });
    fireEvent.click(resetBtn);
    expect(screen.queryByText(/No Formulas Found/i)).not.toBeInTheDocument();
  });

  it('switches subject tabs to filter formula repository and isolates chapters', () => {
    render(<FormulaVaultPage />);

    // Initially Physics: Units & Measurements should be rendered
    expect(screen.getByRole('heading', { name: 'Units & Measurements' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Some Basic Concepts of Chemistry' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sets, Relations & Functions' })).not.toBeInTheDocument();

    // Switch to Chemistry
    const chemistryBtn = screen.getByRole('button', { name: /Chemistry/i });
    fireEvent.click(chemistryBtn);
    expect(screen.getByText(/Displaying/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Some Basic Concepts of Chemistry' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Units & Measurements' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sets, Relations & Functions' })).not.toBeInTheDocument();

    // Switch to Maths
    const mathsBtn = screen.getByRole('button', { name: /Maths/i });
    fireEvent.click(mathsBtn);
    expect(screen.getByText(/Displaying/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sets, Relations & Functions' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Units & Measurements' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Some Basic Concepts of Chemistry' })).not.toBeInTheDocument();
  });

  it('bookmarks a formula and toggles starred view', async () => {
    render(<FormulaVaultPage />);

    // Find the first bookmark button
    const bookmarkButtons = screen.getAllByTitle('Bookmark Formula');
    expect(bookmarkButtons.length).toBeGreaterThan(0);

    // Click first bookmark
    fireEvent.click(bookmarkButtons[0]);

    // Check localStorage is NOT used (Tier 4 violation fixed) and canonical store was updated
    expect(localStorage.getItem('jeeos_bookmarked_formulas')).toBeNull();
    const storeBookmarks = useStudyBrainStore.getState().bookmarkedFormulaIds;
    expect(storeBookmarks).toHaveLength(1);

    // Filter to Starred
    const starredFilterBtn = screen.getByTitle('Filter Starred Formulas');
    fireEvent.click(starredFilterBtn);

    expect(screen.getByText('Showing Starred Only')).toBeInTheDocument();
  });

  it('copies formula LaTeX code to clipboard', () => {
    render(<FormulaVaultPage />);

    const copyButtons = screen.getAllByTitle('Copy LaTeX formula');
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'LaTeX Formula Copied'
      })
    );
  });

  it('toggles Cloze Recall mode and allows revealing hidden formula', () => {
    render(<FormulaVaultPage />);

    // Click Cloze Recall button
    const clozeBtn = screen.getByRole('button', { name: /Cloze Recall/i });
    fireEvent.click(clozeBtn);

    // Should indicate Cloze is active
    expect(screen.getByText('Cloze Active')).toBeInTheDocument();

    // Look for cloze reveal buttons
    const revealBtns = screen.getAllByText('[ ? Click to Reveal Formula ]');
    expect(revealBtns.length).toBeGreaterThan(0);

    // Click first reveal button
    fireEvent.click(revealBtns[0]);

    // First card should now show Revealed badge
    expect(screen.getByText('Revealed')).toBeInTheDocument();
  });

  it('opens and closes the Dimensional Analysis & Physical Constants modal', async () => {
    render(<FormulaVaultPage />);

    // Find and click Dimensions & Units button
    const dimsBtn = screen.getByRole('button', { name: /Dimensions & Units/i });
    fireEvent.click(dimsBtn);

    // Modal header should be present
    expect(screen.getByText('High-Yield JEE Constants & Dimensions')).toBeInTheDocument();
    expect(screen.getByText('Universal Gravitational Constant')).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: 'Close Dimensions Modal' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('High-Yield JEE Constants & Dimensions')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('renders high-yield JEE exam tip badges on formula cards', () => {
    render(<FormulaVaultPage />);
    const proTips = screen.getAllByText('JEE Pro Tip');
    expect(proTips.length).toBeGreaterThan(0);
  });
});
