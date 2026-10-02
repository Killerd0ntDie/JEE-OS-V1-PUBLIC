import React from 'react';

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  accent?: 'cyan' | 'amber' | 'violet' | 'crimson' | 'emerald' | 'default';
  tabular?: boolean;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
  onClick?: () => void;
}

const accentColors: Record<string, { border: string; glow: string; text: string; bg: string }> = {
  cyan: {
    border: 'border-cyan-500/30 hover:border-cyan-500/60',
    glow: 'shadow-[0_0_16px_rgba(6,182,212,0.12)]',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  amber: {
    border: 'border-amber-500/30 hover:border-amber-500/60',
    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.12)]',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  violet: {
    border: 'border-violet-500/30 hover:border-violet-500/60',
    glow: 'shadow-[0_0_16px_rgba(139,92,246,0.12)]',
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  crimson: {
    border: 'border-rose-500/30 hover:border-rose-500/60',
    glow: 'shadow-[0_0_16px_rgba(244,63,94,0.12)]',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
  emerald: {
    border: 'border-emerald-500/30 hover:border-emerald-500/60',
    glow: 'shadow-[0_0_16px_rgba(16,185,129,0.12)]',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  default: {
    border: 'border-border-muted hover:border-border-strong',
    glow: 'hover:shadow-lg',
    text: 'text-zinc-200',
    bg: 'bg-surface-2',
  },
};

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  subtext,
  accent = 'default',
  tabular = true,
  icon,
  trend,
  className = '',
  onClick,
}) => {
  const styles = accentColors[accent] || accentColors.default;

  return (
    <div
      onClick={onClick}
      className={`relative group flex flex-col justify-between p-4 rounded-xl bg-surface-1 border transition-all duration-200 ${styles.border} ${styles.glow} ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      {/* Header Row: Label & Optional Icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-2xs font-mono font-medium text-zinc-400 uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && (
          <span className={`p-1.5 rounded-md ${styles.bg} ${styles.text} shrink-0`}>
            {icon}
          </span>
        )}
      </div>

      {/* Primary Value */}
      <div className="flex items-baseline gap-2">
        <span
          className={`text-xl sm:text-2xl font-bold font-sans text-white tracking-tight ${
            tabular ? 'tabular-nums font-mono' : ''
          }`}
        >
          {value}
        </span>
        {trend && (
          <span
            className={`text-2xs font-mono font-semibold ${
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {/* Subtext Footer */}
      {subtext && (
        <p className="mt-1.5 text-xs text-zinc-400 font-sans truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};

StatTile.displayName = 'StatTile';
