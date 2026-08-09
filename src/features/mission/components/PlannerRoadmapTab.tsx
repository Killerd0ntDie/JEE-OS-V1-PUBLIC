import React from 'react';
import { ArrowRightLeft, PenTool } from 'lucide-react';
import { WarRoomSandbox } from './WarRoomSandbox';
import { MonthlyCampaignBanner } from './MonthlyCampaignBanner';
import { MonthlyCalendarWidget } from './MonthlyCalendarWidget';

export function PlannerRoadmapTab({ state }: { state: any }) {
  const { isSandboxMode, setIsSandboxMode, weeklyGoals, setIsEditGoalsOpen } = state;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono font-bold text-zinc-300 uppercase tracking-wider">Monthly War Room</h2>
        <button
          onClick={() => setIsSandboxMode(!isSandboxMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
            isSandboxMode 
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          {isSandboxMode ? 'Exit Sandbox' : 'Simulate Strategy'}
        </button>
      </div>

      {isSandboxMode ? (
        <WarRoomSandbox />
      ) : (
        <>
          <MonthlyCampaignBanner />
          <MonthlyCalendarWidget />
        </>
      )}

      {/* 4-WEEK MILESTONE ROADMAP GRID */}
      <div className="relative mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-sm font-bold text-zinc-400 uppercase tracking-widest">Milestone Roadmap</h3>
          <button
            onClick={() => setIsEditGoalsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <PenTool className="w-3 h-3" />
            Edit Goals
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(weeklyGoals || [
            { weekIndex: 1, title: 'Mechanics Core & Vectors', focus: 'Focus: Kinematics, NLM, Work Power Energy. Complete 45 DPPs & 30 PYQs.', status: 'Completed' },
            { weekIndex: 2, title: 'GOC & Reaction Mechanisms', focus: 'Focus: Inductive & Resonance Effects, Isomerism, Hydrocarbons.', status: 'Active' },
            { weekIndex: 3, title: 'Algebra & Differential Calculus', focus: 'Focus: Sets & Relations, Functions, Limits & Continuity.', status: 'Upcoming' },
            { weekIndex: 4, title: 'Full Monthly Mock & Error Audit', focus: 'Focus: Full-Syllabus Mock Test Session 1 Benchmark & Mistakes Review.', status: 'Upcoming' }
          ]).map((goal: any, idx: number) => {
            let borderStyle = 'border-zinc-800';
            let bgStyle = 'bg-zinc-900/30';
            let textStyle = 'text-zinc-400';
            let statusEl = <span className="text-zinc-400 font-bold">Upcoming</span>;
            
            if (goal.status === 'Completed') {
              statusEl = <span className="text-emerald-400 font-bold">Completed ✓</span>;
              textStyle = 'text-indigo-400';
            } else if (goal.status === 'Active') {
              statusEl = <span className="text-indigo-300 font-bold animate-pulse">ACTIVE FOCUS</span>;
              borderStyle = 'border-indigo-500/50';
              bgStyle = 'bg-indigo-950/20';
              textStyle = 'text-indigo-400';
            }
            
            return (
              <div key={idx} className={`p-4 rounded-xl border ${borderStyle} ${bgStyle} space-y-3`}>
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2 font-mono text-xs">
                  <span className={`${textStyle} font-bold`}>WEEK {goal.weekIndex}</span>
                  {statusEl}
                </div>
                <h4 className="font-display font-bold text-white text-xs">{goal.title || `Week ${goal.weekIndex} Goal`}</h4>
                <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                  {goal.focus || 'No specific focus set.'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
