import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'accent' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', children, ...props }, ref) => {
    // Base Styles
    const baseStyle =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:ring-offset-1 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    // Variant Styles
    const variants = {
      default:
        'bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_1px_2px_rgba(255,255,255,0.08)] active:scale-[0.98]',
      secondary:
        'bg-zinc-900 text-zinc-100 border border-zinc-800 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 active:scale-[0.98]',
      ghost:
        'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 active:bg-zinc-850',
      accent:
        'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_1px_2px_rgba(99,102,241,0.3)] hover:shadow-[0_0_12px_rgba(99,102,241,0.2)] active:scale-[0.98]',
      outline:
        'bg-transparent text-zinc-300 border border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700 hover:text-white',
      danger:
        'bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/30 hover:border-red-800 hover:text-red-300 active:scale-[0.98]',
    };

    // Size Styles
    const sizes = {
      sm: 'px-3 py-1.5 text-xs font-medium',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
      icon: 'h-9 w-9 p-0',
    };

    const combinedClasses = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button ref={ref} className={combinedClasses} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
