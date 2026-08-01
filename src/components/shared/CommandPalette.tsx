import { useState, useEffect, useRef } from 'react';
import { PAGES, PageId, PageDefinition } from '@/types/index';
import { Icon } from '@/components/ui/Icon';

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

  // Hotkey listener for closing and arrow navigation
  useEffect(() => {
    if (!isOpen) return;

    // Auto focus
    setTimeout(() => inputRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
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
  }, [isOpen, filteredPages, selectedIndex]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-[12vh]"
      onClick={onClose}
      aria-label="Command Palette Overlay"
    >
      {/* Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        className="w-full max-w-xl bg-zinc-950/95 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-900 bg-zinc-950">
          <Icon name="Search" aria-hidden="true" className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search commands, subjects, planners, or settings..."
            aria-label="Search commands, subjects, planners, or settings"
            className="flex-grow bg-transparent text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 placeholder-zinc-600 font-sans"
          />
          <div className="flex items-center gap-1">
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-mono">
              ESC
            </span>
          </div>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[340px] overflow-y-auto p-2 space-y-1 divide-y divide-zinc-950 scrollbar">
          {filteredPages.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
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
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-3.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-zinc-900 border-zinc-800 text-white'
                      : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg border ${
                    isSelected ? 'bg-zinc-950 border-zinc-700 text-zinc-100' : 'bg-zinc-900/60 border-zinc-850 text-zinc-500'
                  }`}>
                    <Icon name={page.icon} className="w-4 h-4" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold leading-tight">{page.label}</span>
                      {page.badge && (
                        <span className="text-[9px] font-mono font-medium px-1.5 bg-zinc-850 rounded border border-zinc-800 text-zinc-500">
                          {page.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{page.description}</p>
                  </div>
                  <div className="flex items-center shrink-0">
                    {isSelected && (
                      <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 bg-zinc-950 border border-zinc-850 px-1.5 py-0.5 rounded">
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

        {/* Footer */}
        <div className="px-4 py-2 bg-zinc-900/40 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="bg-zinc-900 px-1 py-0.2 rounded border border-zinc-850">↑↓</span> Navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-zinc-900 px-1 py-0.2 rounded border border-zinc-850">⏎</span> Select
            </span>
          </div>
          <div>
            <span>JEE OS Command Launcher</span>
          </div>
        </div>
      </div>
    </div>
  );
}
