import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { modalVariants, backdropVariants } from '@/constants/motion';
import { PAGES } from '@/types/index';
import { Icon } from '@/components/ui/Icon';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useNavigate } from 'react-router-dom';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter pages based on search
  const filteredPages = PAGES.filter(page =>
    page.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);

  // Hotkey listener for closing and arrow navigation
  useEffect(() => {
    if (!isOpen) return;

    // Auto focus
    setTimeout(() => inputRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredPages.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredPages.length) % Math.max(1, filteredPages.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredPages[selectedIndex]) {
          navigate(`/${filteredPages[selectedIndex].id}`);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredPages, selectedIndex, navigate, onClose]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Auto-scroll list to keep selected item in view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-start justify-center p-4 pt-[12vh]"
          aria-label="Command Palette Overlay"
        >
          {/* Backdrop with physics-based entrance */}
          <motion.div
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 bg-black/10 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Container */}
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
            className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative border border-zinc-800/80"
            onClick={e => e.stopPropagation()}
          >
            {/* Search header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800/50 bg-transparent">
              <Icon name="Search" aria-hidden="true" className="w-5 h-5 text-indigo-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search commands, subjects, planners, or settings..."
                aria-label="Search commands, subjects, planners, or settings"
                className="flex-grow bg-transparent text-sm text-white outline-none border-none ring-0 focus:outline-none focus:ring-0 placeholder-zinc-500 font-sans"
              />
              <div className="flex items-center gap-1">
                <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                  ESC
                </span>
              </div>
            </div>

            {/* Results list - hidden scrollbar */}
            <div 
              ref={listRef} 
              className="max-h-[380px] overflow-y-auto p-2 space-y-1 hide-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {filteredPages.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  No pages or modules found matching "{searchQuery}"
                </div>
              ) : (
                filteredPages.map((page, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={page.id}
                      onClick={() => {
                        navigate(`/${page.id}`);
                        onClose();
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-3.5 cursor-pointer border select-none ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500/30 text-white shadow-sm'
                          : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg border ${
                        isSelected ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400'
                      }`}>
                        <Icon name={page.icon} className="w-4 h-4" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold leading-tight">{page.label}</span>
                          {page.badge && (
                            <span className="text-[11px] font-mono font-medium px-1.5 bg-zinc-850 rounded border border-zinc-800 text-zinc-400">
                              {page.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{page.description}</p>
                      </div>
                      <div className="flex items-center shrink-0">
                        {isSelected && (
                          <span className="text-[10px] font-mono text-indigo-300 flex items-center gap-1 bg-indigo-950/60 border border-indigo-900/60 px-2 py-0.5 rounded-md">
                            <span>⏎</span>
                            <span>Go</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
