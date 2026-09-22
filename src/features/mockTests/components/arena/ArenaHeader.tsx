import React from 'react';
import { 
  BookOpen, HelpCircle, Keyboard, Sun, Moon, 
  Minimize2, Maximize2, Shield, ShieldAlert, User 
} from 'lucide-react';
import { MockTest } from '../../../../types/mockTest';

export interface ArenaHeaderProps {
  test: MockTest;
  candidateName: string;
  isAuthenticTheme: boolean;
  toggleTheme: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  proctorWarnings: number;
  setIsQuestionPaperOpen: (val: boolean) => void;
  setIsInstructionsOpen: (val: boolean) => void;
  setIsShortcutsOpen: (val: boolean) => void;
}

export function ArenaHeader({
  test,
  candidateName,
  isAuthenticTheme,
  toggleTheme,
  isFullscreen,
  toggleFullscreen,
  proctorWarnings,
  setIsQuestionPaperOpen,
  setIsInstructionsOpen,
  setIsShortcutsOpen
}: ArenaHeaderProps) {
  return (
    <header className={`h-14 border-b flex items-center justify-between px-4 shrink-0 gap-4 ${
      isAuthenticTheme ? 'bg-[#0b3366] text-white border-[#08264d]' : 'bg-[#0c0c0e] border-zinc-800'
    }`}>
      {/* Left: Test Title & Details */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-white text-xs shrink-0 tracking-wider ${
          isAuthenticTheme ? 'bg-orange-600' : 'bg-indigo-600'
        }`}>
          NTA
        </div>
        <div className="truncate">
          <h1 className={`text-xs sm:text-sm font-bold truncate ${
            isAuthenticTheme ? 'text-white' : 'text-zinc-100'
          }`}>{test.name}</h1>
          <p className={`text-[10px] font-mono hidden sm:block ${
            isAuthenticTheme ? 'text-blue-200' : 'text-zinc-500'
          }`}>
            JEE (Main) Computer Based Test • Maximum Marks: {test.totalMarks}
          </p>
        </div>
      </div>

      {/* Center/Right Actions: Question Paper, Instructions, Shortcuts, Theme, Fullscreen */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setIsQuestionPaperOpen(true)}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            isAuthenticTheme 
              ? 'bg-[#154681] hover:bg-[#1c559c] text-white border border-[#2463b2]' 
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          }`}
        >
          <BookOpen className={`w-3.5 h-3.5 ${isAuthenticTheme ? 'text-blue-200' : 'text-indigo-400'}`} />
          <span>Question Paper</span>
        </button>

        <button
          type="button"
          onClick={() => setIsInstructionsOpen(true)}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            isAuthenticTheme 
              ? 'bg-[#154681] hover:bg-[#1c559c] text-white border border-[#2463b2]' 
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          }`}
        >
          <HelpCircle className={`w-3.5 h-3.5 ${isAuthenticTheme ? 'text-amber-300' : 'text-amber-400'}`} />
          <span>Instructions</span>
        </button>

        <button
          type="button"
          onClick={() => setIsShortcutsOpen(true)}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            isAuthenticTheme 
              ? 'bg-[#154681] hover:bg-[#1c559c] text-white border border-[#2463b2]' 
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          }`}
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className={`w-3.5 h-3.5 ${isAuthenticTheme ? 'text-cyan-200' : 'text-cyan-400'}`} />
          <span className="hidden xl:inline">Shortcuts</span>
          <kbd className={`text-[10px] font-mono px-1 py-0.2 rounded border ${
            isAuthenticTheme ? 'bg-[#0b3366] text-blue-200 border-[#2463b2]' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
          }`}>?</kbd>
        </button>

        {/* Authentic NTA Light / Modern Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
            isAuthenticTheme 
              ? 'bg-[#154681] hover:bg-[#1c559c] text-amber-300 border-[#2463b2]' 
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          }`}
          title={isAuthenticTheme ? "Switch to Modern Dark Mode" : "Switch to Authentic NTA Light CBT Mode"}
        >
          {isAuthenticTheme ? <Moon className="w-3.5 h-3.5 text-blue-200" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
          <span className="hidden sm:inline font-mono">{isAuthenticTheme ? "Dark Mode" : "NTA Light"}</span>
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isAuthenticTheme 
              ? 'bg-[#154681] hover:bg-[#1c559c] text-white border border-[#2463b2]' 
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
          }`}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Live Proctoring Status Pill */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border ${
          proctorWarnings === 0 
            ? isAuthenticTheme ? 'bg-emerald-900/60 text-emerald-200 border-emerald-400/40' : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' 
            : proctorWarnings === 1 
              ? isAuthenticTheme ? 'bg-amber-900/60 text-amber-200 border-amber-400/40' : 'bg-amber-950/40 text-amber-400 border-amber-500/30' 
              : 'bg-rose-950/50 text-rose-300 border-rose-500/50 animate-pulse'
        }`}>
          {proctorWarnings > 0 ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <Shield className={`w-3.5 h-3.5 shrink-0 ${isAuthenticTheme ? 'text-emerald-300' : 'text-emerald-400'}`} />
          )}
          <span className="hidden md:inline">PROCTOR ACTIVE</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10">
            {proctorWarnings}/3
          </span>
        </div>

        {/* Candidate Profile Pill */}
        <div className={`hidden lg:flex items-center gap-2 pl-2 border-l ${
          isAuthenticTheme ? 'border-[#154681]' : 'border-zinc-800'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border ${
            isAuthenticTheme ? 'bg-[#154681] text-white border-[#2463b2]' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
          }`}>
            <User className="w-4 h-4" />
          </div>
          <div className="text-right">
            <div className={`text-xs font-semibold ${isAuthenticTheme ? 'text-white' : 'text-zinc-200'}`}>{candidateName}</div>
            <div className={`text-[10px] font-mono ${isAuthenticTheme ? 'text-blue-200' : 'text-zinc-500'}`}>Roll: JEE-2026-CBT</div>
          </div>
        </div>
      </div>
    </header>
  );
}
