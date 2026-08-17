import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Command, Keyboard } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Modal } from '@/components/ui/Modal';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface ShortcutGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { group: 'Cockpit / Mission Mode', keys: [
    { key: 'Space', desc: 'Pause / Resume active session' },
    { key: 'Enter', desc: 'Complete next active task in checklist' },
    { key: 'Tab', desc: 'Cycle active subject track' },
    { key: 'ESC', desc: 'End session and exit cockpit' },
    { key: 'Ctrl/Cmd + N', desc: 'Toggle Scratchpad Notes' },
    { key: 'Ctrl/Cmd + F', desc: 'Toggle Formula Sheet' },
  ]},
  { group: 'Global Navigation', keys: [
    { key: 'Shift + ?', desc: 'Open this Shortcut Guide' },
    { key: 'ESC', desc: 'Close any active overlay or modal' },
  ]},
];

export function ShortcutGuideModal({ isOpen, onClose }: ShortcutGuideModalProps) {
  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={999}
      backdropClassName="bg-black/40 backdrop-blur-sm"
      className="relative w-full max-w-lg border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10"
    >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-zinc-900 bg-zinc-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 id="shortcut-guide-modal-title" className="text-lg font-display font-bold text-white">Keyboard Shortcuts</h2>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">SPEED AND EFFICIENCY</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close shortcut guide"
                  className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-6 overflow-y-auto">
                {SHORTCUTS.map((group, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-bold pl-1">
                      {group.group}
                    </h3>
                    <div className="space-y-1.5">
                      {group.keys.map((s, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                          <span className="text-sm text-zinc-300 font-medium">{s.desc}</span>
                          <kbd className="px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 shadow-sm">
                            {s.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-900 bg-zinc-900/20 text-center">
                <p className="text-xs text-zinc-400">
                  You can also click anywhere outside this dialog to close it.
                </p>
              </div>
    </Modal>
  );
}
