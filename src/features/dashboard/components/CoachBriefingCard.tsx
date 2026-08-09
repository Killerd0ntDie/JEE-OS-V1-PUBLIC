import React from 'react';

interface CoachBriefingCardProps {
  coachMessage?: string;
}

export function CoachBriefingCard({ coachMessage }: CoachBriefingCardProps) {
  return (
    <div className="p-4 rounded-xl border border-zinc-900 bg-[#0c0c0e]/30 text-left space-y-3 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-16 bg-indigo-500/5 blur-[20px] rounded-full pointer-events-none" />
      <div className="flex items-center gap-2">
        <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[10px] font-mono text-zinc-400 font-bold tracking-wider uppercase">
          AI MISSION BRIEFING
        </span>
      </div>
      <p className="text-xs text-zinc-300 font-mono italic leading-relaxed">
        "{coachMessage || 'Models synchronized. Prepare for execution of your current targets. Priority is formula recall and lecture watch.'}"
      </p>
      <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 pt-1.5 border-t border-zinc-900">
        <span>COACH: ACTIVE</span>
        <span>CONFIDENCE: 98%</span>
      </div>
    </div>
  );
}
