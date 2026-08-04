import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies default variant styles if no variant is provided', () => {
    render(<Badge data-testid="badge-default">Default</Badge>);
    const badge = screen.getByTestId('badge-default');
    expect(badge.className).toContain('bg-zinc-800');
  });

  it('applies success variant styles correctly', () => {
    render(<Badge variant="success" data-testid="badge-success">Success</Badge>);
    const badge = screen.getByTestId('badge-success');
    expect(badge.className).toContain('bg-emerald-950/40');
  });

  it('applies destructive variant styles correctly', () => {
    render(<Badge variant="destructive" data-testid="badge-destructive">Error</Badge>);
    const badge = screen.getByTestId('badge-destructive');
    expect(badge.className).toContain('bg-red-950/40');
  });

  it('appends custom class names correctly', () => {
    render(<Badge className="custom-test-class" data-testid="badge-custom">Custom</Badge>);
    const badge = screen.getByTestId('badge-custom');
    expect(badge.className).toContain('custom-test-class');
  });
});
