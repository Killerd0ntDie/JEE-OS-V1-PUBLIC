import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from '@/components/ui/Icon';
import { motion, AnimatePresence } from 'motion/react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label="Toggle theme"
        aria-expanded={isOpen}
      >
        <span className="sr-only">Toggle theme</span>
        {theme === 'light' ? (
          <Icon name="Sun" className="w-4 h-4" />
        ) : theme === 'dark' ? (
          <Icon name="Moon" className="w-4 h-4" />
        ) : (
          <Icon name="Monitor" className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-32 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden z-[100]"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="p-1 flex flex-col space-y-0.5">
              <button
                onClick={() => handleSelect('light')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg w-full text-left transition-colors ${
                  theme === 'light' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
                role="menuitem"
              >
                <Icon name="Sun" className="w-3.5 h-3.5" />
                Light
              </button>
              <button
                onClick={() => handleSelect('dark')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg w-full text-left transition-colors ${
                  theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
                role="menuitem"
              >
                <Icon name="Moon" className="w-3.5 h-3.5" />
                Dark
              </button>
              <button
                onClick={() => handleSelect('system')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg w-full text-left transition-colors ${
                  theme === 'system' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
                role="menuitem"
              >
                <Icon name="Monitor" className="w-3.5 h-3.5" />
                System
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
