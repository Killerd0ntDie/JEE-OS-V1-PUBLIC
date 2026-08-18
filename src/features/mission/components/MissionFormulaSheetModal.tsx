import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { BookOpen, X, Search } from 'lucide-react';
import { SubjectDetail } from './MissionSubjectSwitcherWidget';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export interface Formula {
  name: string;
  formula: string;
  description: string;
}

export interface MissionFormulaSheetModalProps {
  isFormulaOpen: boolean;
  setIsFormulaOpen: (open: boolean) => void;
  activeDetails: SubjectDetail;
  formulaSearch: string;
  setFormulaSearch: (search: string) => void;
  filteredFormulas: Formula[];
  handleQuickPresetNote: (preset: string) => void;
}

export function MissionFormulaSheetModal({
  isFormulaOpen,
  setIsFormulaOpen,
  activeDetails,
  formulaSearch,
  setFormulaSearch,
  filteredFormulas,
  handleQuickPresetNote
}: MissionFormulaSheetModalProps) {
  useLockBodyScroll(true);

  useEscapeKey(() => setIsFormulaOpen(false), isFormulaOpen);

  return (
    <Modal isOpen={isFormulaOpen} onClose={() => setIsFormulaOpen(false)} zIndex={10000} className="w-full max-w-xl border border-zinc-800 p-6 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden glass-panel">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3 shrink-0">
              <div className="flex items-center gap-2 text-left">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                  SEARCH CONTEXT FORMULAS // {activeDetails.chapter}
                </span>
              </div>
              <button 
                onClick={() => setIsFormulaOpen(false)}
                className="text-zinc-400 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Box */}
            <div className="mt-4 relative shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={formulaSearch}
                onChange={(e) => setFormulaSearch(e.target.value)}
                placeholder="Type formula keys or names... (Ctrl+F)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-emerald-500"
              />
            </div>

            {/* Formula List container with scroll */}
            <div className="flex-1 overflow-y-auto scrollbar mt-4 space-y-3.5 pr-1 py-1">
              {filteredFormulas.map((f, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    // Insert to notes quickly!
                    handleQuickPresetNote(`${f.name}: ${f.formula}`);
                    setIsFormulaOpen(false);
                  }}
                  className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:bg-emerald-950/[0.04] hover:border-emerald-500/20 text-left transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                      {f.name}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-600 group-hover:text-emerald-500/50 uppercase">
                      Click to capture note ↗
                    </span>
                  </div>
                  
                  {/* Centered equation styling */}
                  <div className="bg-[#0c0c0e]/80 border border-zinc-900/60 py-3 px-4 rounded-lg my-2 flex items-center justify-center">
                    <span className="text-sm font-mono text-emerald-300 font-semibold tracking-wider font-sans select-all">
                      {f.formula}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1.5">
                    {f.description}
                  </p>
                </div>
              ))}

              {filteredFormulas.length === 0 && (
                <div className="text-center py-16 text-zinc-600 text-xs font-mono">
                  No results found matching "{formulaSearch}".
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono text-zinc-400 shrink-0">
              <span>Subject: {activeDetails.name}</span>
              <span>Active Track: Complete formula set</span>
            </div>
    </Modal>
  );
}
