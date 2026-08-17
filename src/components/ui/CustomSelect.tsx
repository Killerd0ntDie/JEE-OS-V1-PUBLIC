import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { springs } from '@/constants/motion';

export interface SelectOption {
  value: string | number;
  label: string;
  badge?: string;
}

interface CustomSelectProps {
  id?: string;
  label?: string;
  value: string | number;
  options: SelectOption[];
  onChange: (value: any) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function CustomSelect({
  id,
  label,
  value,
  options,
  onChange,
  className = '',
  placeholder = 'Select option...',
  disabled = false,
  size = 'md'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-xs font-mono font-medium text-zinc-300 block mb-2">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <motion.button
        id={id}
        type="button"
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.99 }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-zinc-950/95  border ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-white/5'
            : isOpen 
              ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
              : 'border-white/15 hover:border-white/30 cursor-pointer'
        } text-zinc-100 rounded-2xl ${
          size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-xs'
        } font-mono flex items-center justify-between transition-all select-none text-left shadow-inner`}
      >
        <span className="truncate block font-mono pr-2">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={springs.snappy}
          className="shrink-0 text-zinc-400"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.button>

      {/* Floating Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={springs.snappy}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl p-1.5 max-h-64 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-zinc-950/95"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-mono flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/40' 
                      : 'text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="truncate block font-mono">{opt.label}</span>
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
