import React from 'react';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, Clock, Send } from 'lucide-react';

export interface MissionNote {
  id: string;
  text: string;
  category: string;
  timestamp: string;
}

export interface MissionNotesDrawerProps {
  isNotesOpen: boolean;
  setIsNotesOpen: (open: boolean) => void;
  activeNoteCategory: string;
  setActiveNoteCategory: (cat: string) => void;
  notes: MissionNote[];
  setNotes: React.Dispatch<React.SetStateAction<MissionNote[]>>;
  notesEndRef: React.RefObject<HTMLDivElement | null>;
  noteInput: string;
  setNoteInput: (val: string) => void;
  handleAddNote: (e?: React.FormEvent) => void;
  handleQuickPresetNote: (preset: string) => void;
}

export function MissionNotesDrawer({
  isNotesOpen,
  setIsNotesOpen,
  activeNoteCategory,
  setActiveNoteCategory,
  notes,
  setNotes,
  notesEndRef,
  noteInput,
  setNoteInput,
  handleAddNote,
  handleQuickPresetNote
}: MissionNotesDrawerProps) {
  return (
    <ModalPortal>
    <AnimatePresence>
      {isNotesOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNotesOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[110]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-[110] w-80 md:w-96 border-l border-zinc-800 bg-[#09090b] shadow-2xl flex flex-col justify-between"
          >
            <div className="p-5 border-b border-zinc-900/60 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-left">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px] font-mono font-bold tracking-widest text-indigo-400 uppercase">
                  COCKPIT MEMORY DECK (NOTES)
                </span>
              </div>
              <button 
                onClick={() => setIsNotesOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex border-b border-zinc-900/60 px-2 shrink-0">
              {['Quick Notes', 'Important Formula', 'Doubts', 'Bookmarks'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveNoteCategory(cat)}
                  className={`flex-1 text-[10px] py-2 border-b-2 font-mono font-medium transition-all ${
                    activeNoteCategory === cat
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {cat.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Dynamic Note Entries with Scroll */}
            <div className="flex-1 p-5 overflow-y-auto scrollbar space-y-4">
              <div className="space-y-3.5">
                {notes.filter(n => n.category === activeNoteCategory).map(note => (
                  <div 
                    key={note.id} 
                    className="p-3 rounded-lg border border-zinc-900 bg-zinc-950/40 text-left space-y-1.5 group hover:border-zinc-800 transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1 bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded text-indigo-400 font-bold">
                        <Clock className="w-3 h-3" />
                        {note.timestamp}
                      </span>
                      <button 
                        onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-[12px] text-zinc-300 leading-normal select-text whitespace-pre-wrap">
                      {note.text}
                    </p>
                  </div>
                ))}
                
                {notes.filter(n => n.category === activeNoteCategory).length === 0 && (
                  <div className="text-center py-12 text-zinc-600 text-xs font-mono">
                    No memory logs logged in this category.
                  </div>
                )}

                <div ref={notesEndRef} />
              </div>
            </div>

            {/* Preset suggestions & capture controls */}
            <div className="p-4 border-t border-zinc-900/60 space-y-3 shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Hard question',
                  'Revise again',
                  'Derivation important',
                  'Ask teacher'
                ].map(preset => (
                  <button
                    key={preset}
                    onClick={() => handleQuickPresetNote(preset)}
                    className="text-[9px] font-mono px-2 py-1 rounded bg-[#0c0c0e] border border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Capture live note... (Enter)"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-800 bg-zinc-950/60 text-zinc-100 placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!noteInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </ModalPortal>
  );
}
