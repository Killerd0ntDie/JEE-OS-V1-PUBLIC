import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'accent' | 'outline' | 'danger' | 'destructive' | 'cyan';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', children, ...props }, ref) => {
    // Base Styles with Tactile Micro-Interactions
    const baseStyle =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080a] disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98] select-none';

    // Variant Styles
    const variants: Record<string, string> = {
      default:
        'bg-white text-zinc-950 hover:bg-zinc-100 shadow-[0_1px_2px_rgba(255,255,255,0.08)] hover:shadow-md font-semibold',
      primary:
        'bg-white text-zinc-950 hover:bg-zinc-100 shadow-[0_1px_2px_rgba(255,255,255,0.08)] hover:shadow-md font-semibold',
      secondary:
        'bg-surface-2 text-zinc-100 border border-border-muted hover:bg-surface-elevated hover:text-white hover:border-border-strong hover:shadow-lg',
      ghost:
        'text-zinc-400 hover:bg-surface-2 hover:text-zinc-100 active:bg-surface-1',
      accent:
        'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_1px_2px_rgba(6,182,212,0.3)] hover:shadow-[0_0_16px_rgba(6,182,212,0.4)]',
      cyan:
        'bg-cyan-500 text-black font-semibold hover:bg-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.35)]',
      outline:
        'bg-transparent text-zinc-300 border border-border-muted hover:bg-surface-2 hover:border-border-strong hover:text-white',
      danger:
        'bg-rose-950/40 text-rose-300 border border-rose-900/50 hover:bg-rose-900/30 hover:border-rose-700 hover:text-rose-200 hover:shadow-[0_0_12px_rgba(244,63,94,0.2)]',
      destructive:
        'bg-rose-950/40 text-rose-300 border border-rose-900/50 hover:bg-rose-900/30 hover:border-rose-700 hover:text-rose-200 hover:shadow-[0_0_12px_rgba(244,63,94,0.2)]',
    };

    // Size Styles
    const sizes: Record<string, string> = {
      xs: 'px-2 py-1 text-2xs font-medium gap-1',
      sm: 'px-3 py-1.5 text-xs font-medium gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2',
      icon: 'h-8.5 w-8.5 p-0',
    };

    const combinedClasses = `${baseStyle} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`;

    return (
      <button ref={ref} className={combinedClasses} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
