import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { springs } from '@/constants/motion';

export interface GlassSelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface GlassSelectProps<T extends string = string> {
  value: T;
  onChange: (val: T) => void;
  options: GlassSelectOption<T>[];
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
}

export function GlassSelect<T extends string = string>({
  value,
  onChange,
  options,
  icon,
  placeholder = 'Select option',
  className = '',
  menuClassName = ''
}: GlassSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={containerRef} className={`relative inline-block select-none ${className}`}>
      {/* Trigger Button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 bg-zinc-900/70 hover:bg-zinc-850/80 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-200 transition-colors cursor-pointer shadow-sm backdrop-blur-md ${
          isOpen ? 'ring-2 ring-indigo-500/40 border-indigo-500/50' : ''
        }`}
      >
        {icon && <span className="text-zinc-400 shrink-0">{icon}</span>}
        {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
        <span className="truncate max-w-[200px]">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} />
      </motion.button>

      {/* Sliding Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute right-0 top-full mt-1.5 z-[100] min-w-[220px] max-h-[300px] overflow-y-auto rounded-2xl bg-zinc-950/98 border border-zinc-800  p-1.5 shadow-2xl space-y-0.5 hide-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${menuClassName}`}
          >
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
