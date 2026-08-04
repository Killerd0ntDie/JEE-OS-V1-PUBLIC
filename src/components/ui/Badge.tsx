import { HTMLAttributes, ReactNode } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  key?: any;
  variant?: 'default' | 'secondary' | 'accent' | 'success' | 'destructive';
  className?: string;
  children?: ReactNode;
}

export function Badge({ className = '', variant = 'default', children, ...props }: BadgeProps) {
  const baseStyle =
    'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium tracking-wide font-mono select-none uppercase';

  const variants = {
    default: 'bg-zinc-800/80 text-zinc-300 shadow-sm',
    secondary: 'bg-zinc-900/90 text-zinc-400',
    accent: 'bg-indigo-950/50 text-indigo-300 border border-indigo-900/30',
    success: 'bg-emerald-950/50 text-emerald-300 border border-emerald-900/30',
    destructive: 'bg-red-950/50 text-red-300 border border-red-900/30',
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
