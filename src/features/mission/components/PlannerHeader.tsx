import React from 'react';
import { Sparkles, RefreshCw, PenTool, SlidersHorizontal, ChevronDown, Calendar, UserCheck, Check } from 'lucide-react';

export function PlannerHeader({ state }: { state: any }) {
  const {
    dailyCapHours,
    mentorProfile,
    energyLevel,
    isAutoBalancing,
    balanceToast,
    handleAutoBalance,
    setIsAiRevisionModalOpen,
    setIsCustomMissionModalOpen,
    isAuditDropdownOpen,
    setIsAuditDropdownOpen,
    setIsWeeklyCheckinModalOpen,
    setIsInterviewModalOpen,
  } = state;

  return (
    <div className="relative z-20 p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-pulse" />
              IIT AI Mentor Engine • Strategy Cockpit
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Synced to Dashboard Hub
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Adaptive Master Schedule
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleAutoBalance}
            disabled={isAutoBalancing}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
              balanceToast
                ? 'bg-emerald-600 border border-emerald-500 text-white shadow-emerald-600/25'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
            }`}
          >
            {isAutoBalancing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : balanceToast ? (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {isAutoBalancing ? 'Auto-Balancing...' : balanceToast ? 'Plan Auto-Balanced!' : 'Auto-Balance Weekly Plan'}
          </button>

          <button
            type="button"
            onClick={() => setIsAiRevisionModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            AI Revision Sprint
          </button>

          <button
            type="button"
            onClick={() => setIsCustomMissionModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
          >
            <PenTool className="w-3.5 h-3.5" />
            Add Mission
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAuditDropdownOpen(!isAuditDropdownOpen)}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              AI Audits & Sync
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {isAuditDropdownOpen && (
              <div 
                className="absolute right-0 top-12 w-56 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl z-50 space-y-1 text-xs font-mono"
                onClick={() => setIsAuditDropdownOpen(false)}
              >
                <button
                  onClick={() => setIsWeeklyCheckinModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-900 text-indigo-300 flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Sunday Sync Audit
                </button>

                <div className="border-t border-zinc-900 my-1"></div>

                <button
                  onClick={() => setIsInterviewModalOpen(true)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-900 text-zinc-300 flex items-center gap-3 cursor-pointer border border-transparent hover:border-zinc-800 transition-all"
                >
                  <UserCheck className="w-5 h-5 text-zinc-400" />
                  <div>
                    <div className="font-bold">Re-Interview AI Mentor</div>
                    <div className="text-xs opacity-70">Adjust pedagogy & subject split</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-900/60 flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-500">
        <div className="flex items-center gap-1.5">
          <span>Capacity Budget:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-900/40 text-indigo-300 font-semibold">
            {dailyCapHours} hrs/day
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span>Subject Split:</span>
          <span className="px-2 py-0.5 rounded bg-purple-950/40 border border-purple-900/40 text-purple-300 font-semibold">
            {mentorProfile?.subjectSplitStrategy === '1_a_day_alternating' ? '1 Subject Focus' : mentorProfile?.subjectSplitStrategy === '2_a_day_alternating' ? '2 Subjects Alternating' : '3 Subjects Daily'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span>Strategy Mode:</span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 font-semibold uppercase">
            {energyLevel || 'Medium'} Energy • Adaptive
          </span>
        </div>
      </div>
    </div>
  );
}
