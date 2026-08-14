import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, PenTool, SlidersHorizontal, ChevronDown, Calendar, UserCheck, Check, CalendarDays, LayoutGrid, BarChart2 } from 'lucide-react';
import { OnHoldReminderBanner } from '@/features/dashboard/components/OnHoldReminderBanner';

export function PlannerHeader({ state }: { state: any }) {
  const navigate = useNavigate();
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
    viewMode,
    setViewMode,
    chapters,
    actions,
  } = state;

  return (
    <div className="relative z-20 p-5 md:p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl space-y-4 text-left">
      {/* Row 1: Header Title + Status Pills + On Hold Pill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-pulse" />
              Academic Schedule & Strategy Engine
            </span>
            <span className="text-[10px] font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Synced to Dashboard
            </span>
            <OnHoldReminderBanner chapters={chapters} onOpenChapter={(id: string) => actions.openChapterEditModal(id)} />
          </div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
            Adaptive Master Schedule
          </h1>
        </div>

        {/* Capacity & Strategy Summary Info Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            Capacity: <strong className="text-zinc-200 font-semibold">{dailyCapHours}h/day</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            Split: <strong className="text-zinc-200 font-semibold">
              {mentorProfile?.subjectSplitStrategy === '1_a_day_alternating' ? '1 Subj Focus' : mentorProfile?.subjectSplitStrategy === '2_a_day_alternating' ? '2 Subjs Alt' : '3 Subjs Daily'}
            </strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            Mode: <strong className="text-zinc-200 font-semibold uppercase">{energyLevel || 'Medium'} Energy</strong>
          </span>
        </div>
      </div>

      {/* Row 2: Visually Separated View Switcher Segment & Action Toolbar */}
      <div className="pt-4 border-t border-zinc-900/80 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* GROUP A: View Mode Segmented Control */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold shrink-0">VIEW:</span>
          <div className="p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-1 font-mono text-xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'daily'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              Daily Focus
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'weekly'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              Weekly Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'monthly'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 shrink-0" />
              Monthly Strategy
            </button>
          </div>

          {/* Design Comparison Toggle */}
          {state.designLayout && state.setDesignLayout && (
            <div className="p-1 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-center gap-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => state.setDesignLayout('grid')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer font-bold ${
                  state.designLayout === 'grid'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ⚡ Grid Design
              </button>
              <button
                type="button"
                onClick={() => state.setDesignLayout('classic')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer font-bold ${
                  state.designLayout === 'classic'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📋 Classic View
              </button>
            </div>
          )}
        </div>

        {/* GROUP B: Action Toolbar (Separated visually) */}
        <div className="flex items-center gap-2 flex-wrap xl:border-l xl:border-zinc-800/80 xl:pl-4">
          <button
            type="button"
            onClick={handleAutoBalance}
            disabled={isAutoBalancing}
            className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 active:scale-[0.97] cursor-pointer shadow-lg select-none ${
              isAutoBalancing
                ? 'bg-indigo-900/50 text-indigo-300 cursor-not-allowed opacity-80'
                : balanceToast
                ? 'bg-emerald-600 text-white shadow-emerald-600/25'
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
            {isAutoBalancing ? 'Auto-Balancing...' : balanceToast ? 'Plan Balanced!' : 'Auto-Balance Weekly Plan'}
          </button>

          <button
            type="button"
            onClick={() => setIsAiRevisionModalOpen(true)}
            className="px-3 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 active:scale-[0.97] cursor-pointer bg-zinc-900 hover:bg-zinc-850 text-emerald-400 border border-zinc-800 hover:border-emerald-500/40 select-none"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            AI Revision Sprint
          </button>

          <button
            type="button"
            onClick={() => setIsCustomMissionModalOpen(true)}
            className="px-3 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-150 active:scale-[0.97] cursor-pointer bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 select-none"
          >
            <PenTool className="w-3.5 h-3.5 text-zinc-400" />
            Add Mission
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAuditDropdownOpen(!isAuditDropdownOpen)}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold flex items-center gap-2 transition-all duration-150 active:scale-[0.97] cursor-pointer select-none"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              AI Audits & Sync
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
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
                  onClick={() => navigate('/diagnostic')}
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
    </div>
  );
}
