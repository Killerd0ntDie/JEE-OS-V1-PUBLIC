import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock StudyBrainStore
vi.mock('@/store/useStudyBrainStore', () => ({
  useStudyBrainStore: (selector: any) => {
    const state = {
      chapters: [
        {
          id: 'p1',
          name: 'Units & Dimensions',
          subject: 'physics',
          unit: 'Mechanics',
          completion: 100,
        },
        {
          id: 'p7',
          name: 'Rotational Motion',
          subject: 'physics',
          unit: 'Mechanics',
          completion: 45,
        },
        {
          id: 'm12',
          name: 'Definite Integration',
          subject: 'maths',
          unit: 'Calculus',
          completion: 80,
        },
      ],
      mistakes: [
        {
          id: 'm-101',
          questionText: 'Calculate moment of inertia of disc about tangent',
          topic: 'Tangent Axis MOI',
          chapter: 'Rotational Motion',
          subject: 'physics',
          mistakeTypes: ['Calculation Error', 'Theorem Misapplication'],
        },
      ],
    };
    return selector(state);
  },
  useShallow: (fn: any) => fn,
}));

describe('CommandPalette (Universal Tactical Command Bar)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <MemoryRouter>
        <CommandPalette isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders search input, category tabs, and quick actions when open', () => {
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search commands, chapters, formulas, mistakes/i)).toBeInTheDocument();
    expect(screen.getByText('Start Focus Session')).toBeInTheDocument();
    expect(screen.getByText('Log New Mistake')).toBeInTheDocument();
    expect(screen.getByText('Formula Speed Drill')).toBeInTheDocument();
  });

  it('filters results by search query across multiple domains', () => {
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search commands, chapters, formulas, mistakes/i);
    fireEvent.change(input, { target: { value: 'Rotational' } });

    // Should find Rotational Motion chapter and Rotational mistake
    expect(screen.getByText('Rotational Motion')).toBeInTheDocument();
    expect(screen.getByText('Tangent Axis MOI')).toBeInTheDocument();
  });

  it('filters formulas from FORMULA_BANK when searching', () => {
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search commands, chapters, formulas, mistakes/i);
    fireEvent.change(input, { target: { value: 'Error Propagation' } });

    expect(screen.getByText(/Error Propagation for Products & Powers/i)).toBeInTheDocument();
  });

  it('navigates to page and closes palette when clicking an item', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={onClose} />
      </MemoryRouter>
    );

    const focusAction = screen.getByText('Start Focus Session');
    fireEvent.click(focusAction);

    expect(mockNavigate).toHaveBeenCalledWith('/cockpit');
    expect(onClose).toHaveBeenCalled();
  });

  it('filters by category tab when clicked', () => {
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    const chaptersTab = screen.getByRole('button', { name: 'Chapters' });
    fireEvent.click(chaptersTab);

    // Should now show chapters in the list
    expect(screen.getByText('Units & Dimensions')).toBeInTheDocument();
    expect(screen.getByText('Rotational Motion')).toBeInTheDocument();
    expect(screen.getByText('Definite Integration')).toBeInTheDocument();
  });

  it('navigates with Enter key on selected item', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={onClose} />
      </MemoryRouter>
    );

    // Initial selected item is Start Focus Session (index 0)
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/cockpit');
    expect(onClose).toHaveBeenCalled();
  });

  it('moves selection down with ArrowDown key', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={onClose} />
      </MemoryRouter>
    );

    // Press ArrowDown to select index 1 (Log New Mistake)
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/mistakes');
    expect(onClose).toHaveBeenCalled();
  });
});
