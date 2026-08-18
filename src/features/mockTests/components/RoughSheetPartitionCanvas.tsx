import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileEdit, X, CheckSquare, Trash2, 
  Sparkles, Grid, Printer, BookOpen, AlertCircle 
} from 'lucide-react';
import { audioEngine } from '@/utils/audioEngine';

interface RoughSheetPartitionCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuestionIndex?: number;
}

export function RoughSheetPartitionCanvas({
  isOpen,
  onClose,
  currentQuestionIndex = 0
}: RoughSheetPartitionCanvasProps) {
  const [scratchpadNotes, setScratchpadNotes] = useState<Record<number, string>>({});

  const handleUpdateNote = (boxNum: number, text: string) => {
    setScratchpadNotes(prev => ({ ...prev, [boxNum]: text }));
  };

  const handleClear = () => {
    audioEngine.playMechanicalKey('heavy').catch(() => {});
    setScratchpadNotes({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-lg">
      
      <div className="w-full max-w-4xl bg-[#121318] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] p-6 space-y-5 text-left font-sans">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Grid className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white tracking-tight">
                CBT Official Rough Sheet (6-Box Partition Grid)
              </h3>
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                Simulated NTA / JEE Advanced Scribble Pad Space Allocator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Page</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Golden CBT Scribble Rules Bar */}
        <div className="p-3 rounded-2xl bg-zinc-950/80 border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-zinc-300">
          <div className="flex items-center gap-1.5 text-indigo-300">
            <span className="w-4 h-4 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-[9px] font-bold">1</span>
            <span>Stay inside cell borders</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-4 h-4 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-[9px] font-bold">2</span>
            <span>Box final numerical answer</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300">
            <span className="w-4 h-4 rounded-full bg-amber-950 border border-amber-500/40 flex items-center justify-center text-[9px] font-bold">3</span>
            <span>Check SI units in line 1</span>
          </div>
        </div>

        {/* 6-BOX PARTITION GRID (2 Columns x 3 Rows) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1 overflow-y-auto pr-1">
          {[1, 2, 3, 4, 5, 6].map((boxNum) => {
            const isCurrent = (currentQuestionIndex % 6) + 1 === boxNum;

            return (
              <div
                key={boxNum}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 bg-[linear-gradient(to_right,#181920_1px,transparent_1px),linear-gradient(to_bottom,#181920_1px,transparent_1px)] bg-[size:16px_16px] ${
                  isCurrent 
                    ? 'border-indigo-500/60 bg-zinc-950/90 shadow-md' 
                    : 'border-zinc-800/80 bg-zinc-950/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-bold text-[10px]">
                      BOX {boxNum}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        (Active Q{currentQuestionIndex + 1})
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-zinc-500">SI Units • FBD Space</span>
                </div>

                {/* Scratchpad Textarea */}
                <textarea
                  value={scratchpadNotes[boxNum] || ''}
                  onChange={(e) => handleUpdateNote(boxNum, e.target.value)}
                  placeholder={`Step 1: Write given values with units...\nStep 2: Formula & Substitution...\nAns = [   ]`}
                  className="w-full h-28 bg-transparent text-xs font-mono text-zinc-200 placeholder:text-zinc-700 resize-none focus:outline-none leading-relaxed"
                />

                <div className="border-t border-zinc-850 pt-1.5 flex justify-between items-center text-[9px] font-mono text-zinc-500">
                  <span>Boxed Answer Check</span>
                  <span>Units Verified ✓</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
