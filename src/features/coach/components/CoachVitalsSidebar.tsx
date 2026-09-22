import React from 'react';
import { motion } from 'motion/react';
import { 
  Flame, ShieldAlert, Award, TrendingUp, 
  Activity, ArrowUpRight, Sparkles, BookOpen 
} from 'lucide-react';
import { ChapterRevisionSummary } from '@jee-os/engines';
import { Mistake } from '@/types';

interface CoachVitalsSidebarProps {
  targetCollege?: string;
  targetYear?: string;
  targetBranch?: string;
  accuracy: number;
  mockAverageScore?: number;
  mockTrend?: number;
  overdueChapters: ChapterRevisionSummary[];
  unresolvedMistakes: Mistake[];
  onSelectPrompt: (promptText: string) => void;
}

export const CoachVitalsSidebar: React.FC<CoachVitalsSidebarProps> = ({
  targetCollege = 'IIT',
  targetYear = '2026',
  targetBranch = 'Engineering',
  accuracy = 85,
  mockAverageScore = 180,
  mockTrend = 0,
  overdueChapters = [],
  unresolvedMistakes = [],
  onSelectPrompt
}) => {
  const quickDiagnostics = [
    { label: 'Diagnose Negative Marks', prompt: 'Analyze my recent mistakes and recommend strategies to stop negative marking traps.' },
    { label: 'Clear Active Backlog', prompt: 'How should I allocate my 70/30 time split to clear in-flight backlog fast?' },
    { label: 'Top High-Yield Chapters', prompt: 'What are the top 5 high-yield chapters I should prioritize for maximum score uplift?' },
    { label: 'Exam Time Allocation', prompt: 'Give me an optimal time management matrix for the 3-hour JEE test paper.' }
  ];

  return (
    <div className="w-full h-full flex flex-col space-y-4 text-left font-sans select-none overflow-y-auto pr-1 pt-4 sm:pt-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* 1. Candidate Telemetry Strip */}
      <div className="space-y-2 pt-1">
        <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-zinc-400 block px-1">
          Live Candidate Telemetry
        </span>

        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          {/* Accuracy */}
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1 shadow-sm">
            <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>Accuracy</span>
            </span>
            <span className="text-base font-bold text-emerald-400 font-display block">
              {accuracy}%
            </span>
          </div>

          {/* Mock Score Avg */}
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1 shadow-sm">
            <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-indigo-400" />
              <span>Mock Avg</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-base font-bold text-white font-display">
                {mockAverageScore > 0 ? mockAverageScore : 'N/A'}
              </span>
              {mockTrend !== 0 && (
                <span className={`text-[10px] font-bold ${mockTrend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {mockTrend > 0 ? `+${mockTrend}` : mockTrend}
                </span>
              )}
            </div>
          </div>

          {/* Decaying Chapters */}
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1 shadow-sm">
            <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400" />
              <span>Decaying</span>
            </span>
            <span className={`text-base font-bold font-display block ${
              overdueChapters.length > 0 ? 'text-red-400' : 'text-zinc-400'
            }`}>
              {overdueChapters.length}
            </span>
          </div>

          {/* Unresolved Mistakes */}
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1 shadow-sm">
            <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>Error Traps</span>
            </span>
            <span className={`text-base font-bold font-display block ${
              unresolvedMistakes.length > 0 ? 'text-amber-400' : 'text-zinc-400'
            }`}>
              {unresolvedMistakes.length}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Decaying Chapters Highlight (If any) */}
      {overdueChapters.length > 0 && (
        <div className="surface-2 rounded-2xl p-3.5 border border-red-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-red-300 font-bold uppercase flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400" />
              <span>Memory Decay Alert</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400">{overdueChapters.length} Ch</span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 [scrollbar-width:none]">
            {overdueChapters.slice(0, 3).map(ch => (
              <div
                key={ch.chapterId}
                onClick={() => onSelectPrompt(`How can I quickly rescue ${ch.chapterName} (${ch.subject}) before my memory decays further?`)}
                className="p-2 rounded-xl bg-zinc-950/60 hover:bg-zinc-900 border border-red-500/20 text-xs flex items-center justify-between cursor-pointer group transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-white font-medium truncate block text-[11px] group-hover:text-red-300">
                    {ch.chapterName}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">
                    {ch.subject}
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-red-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Strategic Diagnostic Chips */}
      <div className="space-y-2 pt-1">
        <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-zinc-400 block px-1">
          Tactical Diagnostics
        </span>
        <div className="space-y-1.5">
          {quickDiagnostics.map((diag, dIdx) => (
            <button
              key={dIdx}
              type="button"
              onClick={() => onSelectPrompt(diag.prompt)}
              className="w-full text-left p-2.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-850 border border-zinc-800/80 hover:border-indigo-500/40 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-between group text-xs font-mono shadow-sm"
            >
              <span className="truncate pr-2">{diag.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
