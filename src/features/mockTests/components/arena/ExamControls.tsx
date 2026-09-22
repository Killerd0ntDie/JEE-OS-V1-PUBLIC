import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ExamControlsProps {
  isAuthenticTheme: boolean;
  handleSaveAndNext: () => void;
  handleSaveAndMark: () => void;
  handleClear: () => void;
  handleMarkForReview: () => void;
  handlePrev: () => void;
  handleNext: () => void;
}

export function ExamControls({
  isAuthenticTheme,
  handleSaveAndNext,
  handleSaveAndMark,
  handleClear,
  handleMarkForReview,
  handlePrev,
  handleNext
}: ExamControlsProps) {
  return (
    <footer className={`min-h-[3.75rem] h-auto py-2 border-t px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar min-w-0 ${
      isAuthenticTheme ? 'bg-[#eef2f6] border-slate-300' : 'bg-[#0c0c0e] border-zinc-800'
    }`}>
      {/* Left Primary Operations */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
        <button
          type="button"
          onClick={handleSaveAndNext}
          className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-colors shadow-sm shrink-0 cursor-pointer ${
            isAuthenticTheme ? 'bg-[#28a745] hover:bg-[#218838]' : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          <span>Save & Next</span>
          <kbd className={`hidden sm:inline px-1 rounded text-[9px] ${
            isAuthenticTheme ? 'bg-[#1e7e34] text-emerald-100' : 'bg-emerald-800 text-emerald-200'
          }`}>↵</kbd>
        </button>

        <button
          type="button"
          onClick={handleSaveAndMark}
          className={`px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-white text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-colors shadow-sm shrink-0 cursor-pointer ${
            isAuthenticTheme ? 'bg-[#0b3366] hover:bg-[#082245]' : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          <span>Save & Mark</span>
          <kbd className={`hidden sm:inline px-1 rounded text-[9px] ${
            isAuthenticTheme ? 'bg-[#082245] text-blue-100' : 'bg-indigo-800 text-indigo-200'
          }`}>Alt+M</kbd>
        </button>

        <button
          type="button"
          onClick={handleClear}
          className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
            isAuthenticTheme 
              ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300' 
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          }`}
        >
          <span>Clear</span>
          <kbd className={`hidden sm:inline px-1 rounded text-[9px] ${
            isAuthenticTheme ? 'bg-slate-100 text-slate-500' : 'bg-zinc-800 text-zinc-400'
          }`}>⌫</kbd>
        </button>

        <button
          type="button"
          onClick={handleMarkForReview}
          className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
            isAuthenticTheme 
              ? 'bg-[#ffc107] hover:bg-[#e0a800] text-slate-950 font-extrabold' 
              : 'bg-amber-600/90 hover:bg-amber-600 text-white'
          }`}
        >
          <span>Mark for Review</span>
        </button>
      </div>

      {/* Right Navigation Controls */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={handlePrev}
          className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer ${
            isAuthenticTheme 
              ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300' 
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer ${
            isAuthenticTheme 
              ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300' 
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          }`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
}
