import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 - 100
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'cyan' | 'amber' | 'violet' | 'crimson' | 'emerald' | 'gradient';
  showLabel?: boolean;
  label?: string;
  glow?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

const variantFills = {
  default: 'bg-zinc-200',
  cyan: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]',
  amber: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
  violet: 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]',
  crimson: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]',
  emerald: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  gradient: 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'sm',
  variant = 'cyan',
  showLabel = false,
  label,
  glow = false,
  className = '',
}) => {
  const safePercentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  const roundedPercentage = Math.round(safePercentage);

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between text-xs font-mono mb-1.5 text-zinc-400">
          {label && <span>{label}</span>}
          <span className="tabular-nums font-semibold text-zinc-300 ml-auto">
            {roundedPercentage}%
          </span>
        </div>
      )}
      <div
        className={`w-full bg-surface-2 border border-border-subtle rounded-full overflow-hidden ${
          sizeClasses[size]
        }`}
        role="progressbar"
        aria-valuenow={roundedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            variantFills[variant]
          } ${glow ? 'shadow-[0_0_12px_currentColor]' : ''}`}
          style={{ width: `${safePercentage}%` }}
        />
      </div>
    </div>
  );
};

ProgressBar.displayName = 'ProgressBar';
