import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Check } from 'lucide-react';
import { springs } from '@/constants/motion';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  action: string;
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    keys: ['Enter', 'Alt + S'],
    action: 'Save & Next',
    description: 'Saves the current answer and advances to next question'
  },
  {
    keys: ['Alt + M'],
    action: 'Save & Mark for Review',
    description: 'Saves answer and marks question for later review'
  },
  {
    keys: ['Alt + C'],
    action: 'Clear Response',
    description: 'Clears selected option or numerical input'
  },
  {
    keys: ['1 - 4', 'A - D'],
    action: 'Select Option',
    description: 'Quickly select MCQ option (A, B, C, or D)'
  },
  {
    keys: ['Ctrl + Shift + 1/2/3', 'Alt + 1/2/3'],
    action: 'Switch Subject',
    description: 'Jump directly to Physics, Chemistry, or Mathematics'
  },
  {
    keys: ['←', '→'],
    action: 'Navigate Questions',
    description: 'Move to previous or next question without saving'
  },
  {
    keys: ['?'],
    action: 'Toggle Cheatsheet',
    description: 'Open or close this keyboard shortcuts guide'
  }
];

export function KeyboardShortcutsModal({
  isOpen,
  onClose
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/35 backdrop-blur-sm"
        />

        {/* Modal Container: strictly compact, overflow-hidden, no scrollbar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={springs.snappy}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-dialog-title"
          className="relative w-full max-w-md bg-[#0c0c0e] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black/80 text-zinc-200 overflow-hidden font-sans select-none z-10"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shrink-0">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <h3 id="shortcuts-dialog-title" className="text-sm font-bold text-white font-display leading-tight">
                  Keyboard Shortcuts
                </h3>
                <p className="text-[10px] font-mono text-zinc-400 leading-tight">
                  Fast CBT Arena Navigation
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close keyboard shortcuts dialog"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-2">
            {SHORTCUTS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/70 hover:border-zinc-700 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <div className="text-xs font-bold text-zinc-200">{item.action}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{item.description}</div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.keys.map((key, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-cyan-300 font-mono text-[11px] shadow-sm font-semibold whitespace-nowrap"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3 border-t border-zinc-800/80 bg-zinc-900/50 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all cursor-pointer shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Got It</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
