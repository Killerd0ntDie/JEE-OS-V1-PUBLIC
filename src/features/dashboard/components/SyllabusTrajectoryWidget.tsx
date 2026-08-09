import React from 'react';
import { Card } from '@/components/ui/Card';

interface SyllabusTrajectoryWidgetProps {
  completionProbability: number;
  estimatedReadinessScore: number;
  estCompletionDate: string;
  dailyHoursRequired: number;
  highestRiskSubject: string;
  highestRiskChapters: Array<{ name: string; [key: string]: any }>;
  currentPaceCompletion: string;
  plusOneHourCompletion: string;
  avgDailyHours: number;
}

export function SyllabusTrajectoryWidget({
  completionProbability,
  estimatedReadinessScore,
  estCompletionDate,
  dailyHoursRequired,
  highestRiskSubject,
  highestRiskChapters,
  currentPaceCompletion,
  plusOneHourCompletion,
  avgDailyHours
}: SyllabusTrajectoryWidgetProps) {
  return (
    <Card className="p-5 md:p-6 border-zinc-800 text-left space-y-5 relative overflow-hidden bg-zinc-950/[0.05]">
      <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-500/5 blur-[40px] rounded-full pointer-events-none" />
      
      <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
        <div className="space-y-0.5">
          <span className="text-[11px] font-mono tracking-widest text-indigo-400 font-bold uppercase block">
            STUDYBRAIN COGNITIVE PREDICTIONS
          </span>
          <h2 className="text-base font-display font-bold text-white tracking-tight">
            Syllabus Trajectory & Readiness Projections
          </h2>
        </div>
        <div className="text-[10px] font-mono text-zinc-400">
          MODEL: KNOWLEDGE-NET-V1
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Box 1: Readiness & Probability */}
        <div className="p-4 rounded-xl border border-zinc-900 bg-[#0c0c0e]/30 space-y-3">
          <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
            READINESS & TRAJECTORY
          </span>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-zinc-400">Completion Prob.</span>
              <span className="text-sm font-mono font-bold text-emerald-400">{completionProbability}%</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-zinc-400">Readiness Score</span>
              <span className="text-sm font-mono font-bold text-indigo-400">{estimatedReadinessScore}/100</span>
            </div>
          </div>
        </div>

        {/* Box 2: Target & Demand */}
        <div className="p-4 rounded-xl border border-zinc-900 bg-[#0c0c0e]/30 space-y-3">
          <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
            COMPLETION DEADLINES
          </span>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-zinc-400">Est. Completion</span>
              <span className="text-sm font-mono font-bold text-zinc-200">{estCompletionDate}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-zinc-400">Required Hours</span>
              <span className="text-sm font-mono font-bold text-zinc-200">{(Number(dailyHoursRequired) || 0).toFixed(1)} hrs/day</span>
            </div>
          </div>
        </div>

        {/* Box 3: Subject Risk */}
        <div className="p-4 rounded-xl border border-zinc-900 bg-[#0c0c0e]/30 space-y-3">
          <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
            HIGH RISK VECTORS
          </span>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-zinc-400">Highest Risk Subj.</span>
              <span className="text-sm font-mono font-bold text-red-400">{highestRiskSubject}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-400 block">Top At-Risk Chapters:</span>
              <span className="text-xs text-zinc-300 truncate block">
                {highestRiskChapters && highestRiskChapters.length > 0 ? highestRiskChapters.map(c => c.name || (c as any).chapterName || String(c)).join(', ') : 'None'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Trajectory Simulation compare section */}
      <div className="p-4 rounded-xl border border-zinc-900 bg-indigo-950/[0.02] space-y-3.5">
        <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
          TRAJECTORY ACCELERATION CONTROLLER
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-900/60 bg-[#070708]/50">
            <div className="space-y-0.5 text-left">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest block">CURRENT PACE</span>
              <span className="text-xs font-semibold text-zinc-300">Projected: {currentPaceCompletion}</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
              {avgDailyHours} hrs/day
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-indigo-950/40 bg-indigo-950/[0.04]">
            <div className="space-y-0.5 text-left">
              <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-widest block">ACCELERATED TRAJECTORY (+1 HR)</span>
              <span className="text-xs font-semibold text-indigo-300">Projected: {plusOneHourCompletion}</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded font-bold">
              {avgDailyHours + 1} hrs/day
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
