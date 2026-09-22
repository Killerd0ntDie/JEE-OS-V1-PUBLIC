import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { Icon, iconMap } from './Icon';

describe('Icon component', () => {
  it('has ShieldAlert and GraduationCap mapped in iconMap', () => {
    expect(iconMap.ShieldAlert).toBeDefined();
    expect(iconMap.GraduationCap).toBeDefined();
    expect(iconMap.BrainCircuit).toBeDefined();
  });

  it('renders ShieldAlert icon for Mistake Vault without error', () => {
    const { container } = render(<Icon name="ShieldAlert" className="w-4 h-4" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders GraduationCap icon for Mock Tests without error', () => {
    const { container } = render(<Icon name="GraduationCap" className="w-4 h-4" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
