import React from 'react';
import { Target, X } from 'lucide-react';

interface MissionHeaderProps {
  onExit: () => void;
}

export function MissionHeader({ onExit }: MissionHeaderProps) {
  return (
    <div className="absolute top-0 left-0 w-full z-50 flex justify-between items-center p-5 md:p-6 pointer-events-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0c0c0e] border border-zinc-800 shadow-md flex items-center justify-center shrink-0">
          <Target className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-wider font-mono uppercase text-zinc-100 leading-tight">
            MISSION <span className="text-indigo-400">CONTROL</span>
          </h2>
          <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5 uppercase tracking-widest font-semibold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LINK ACTIVE
            </span>
            <span>•</span>
            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          type="button"
          onClick={onExit}
          className="w-10 h-10 rounded-xl border border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700 hover:text-white transition-all flex items-center justify-center bg-zinc-950 text-zinc-400 cursor-pointer"
          title="Exit Session"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
