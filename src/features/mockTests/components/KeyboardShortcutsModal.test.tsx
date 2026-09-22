import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

describe('KeyboardShortcutsModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <KeyboardShortcutsModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders keyboard shortcuts when isOpen is true', () => {
    render(
      <KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Save & Next')).toBeInTheDocument();
    expect(screen.getByText('Save & Mark for Review')).toBeInTheDocument();
    expect(screen.getByText('Clear Response')).toBeInTheDocument();
    expect(screen.getByText('Select Option')).toBeInTheDocument();
  });

  it('triggers onClose when Got It button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <KeyboardShortcutsModal isOpen={true} onClose={handleClose} />
    );

    const gotItBtn = screen.getByText('Got It');
    fireEvent.click(gotItBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
