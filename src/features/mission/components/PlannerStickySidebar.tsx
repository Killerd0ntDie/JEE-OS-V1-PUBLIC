import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WeeklyBlock } from '@jee-os/engines';
import { Sparkles, RefreshCw, PenTool, SlidersHorizontal, ChevronDown, Calendar, UserCheck, Check, Target } from 'lucide-react';
import { OnHoldReminderBanner } from '@/features/dashboard/components/OnHoldReminderBanner';

export interface PlannerStickySidebarProps {
  state: any;
}

export function PlannerStickySidebar({ state }: PlannerStickySidebarProps) {
  const navigate = useNavigate();
  const {
    viewMode,
    weeklyMatrix,
    selectedDayIndex,
    dailyCapHours,
    mentorProfile,
    energyLevel,
    chapters,
    actions,
    isAutoBalancing,
    balanceToast,
    handleAutoBalance,
    setIsAiRevisionModalOpen,
    setIsCustomMissionModalOpen,
    isAuditDropdownOpen,
    setIsAuditDropdownOpen,
    setIsWeeklyCheckinModalOpen,
    activeBottlenecks
  } = state;

  // Calculate Stats based on View Mode
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let completedMinutes = 0;
    let mockCount = 0;

    const matrixToUse = viewMode === 'daily' 
      ? weeklyMatrix.filter((b: WeeklyBlock) => b.dayIndex === selectedDayIndex)
      : weeklyMatrix;

    matrixToUse.forEach((b: WeeklyBlock) => {
      const duration = b.durationMinutes || 120;
      totalMinutes += duration;
      if (b.completed) {
        completedMinutes += duration;
      }
      const act = (b.activity || '').toLowerCase();
      const sub = (b.subject || '').toLowerCase();
      if (act.includes('mock') || act.includes('paper') || sub.includes('mock')) {
        mockCount++;
      }
    });

    const plannedHours = Math.round((totalMinutes / 60) * 10) / 10;
    const completedHours = Math.round((completedMinutes / 60) * 10) / 10;
    const estimatedQuestions = Math.round(completedHours * 22);

    return {
      plannedHours,
      completedHours,
      mockCount,
      estimatedQuestions,
    };
  }, [weeklyMatrix, viewMode, selectedDayIndex]);

  const aiRecommendationText = useMemo(() => {
    if (activeBottlenecks && activeBottlenecks.length > 0) {
      return `Address ${activeBottlenecks[0]} to maximize week ROI.`;
    }
    return 'Shift 2h from Maths → Chemistry to address weak area.';
  }, [activeBottlenecks]);

  return (
    <aside className="w-[310px] shrink-0 sticky top-0 h-full overflow-y-auto no-scrollbar rounded-2xl border border-zinc-850/80 bg-zinc-950/60 backdrop-blur-xl p-5 shadow-2xl flex flex-col gap-4 select-none">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h3 className="font-mono text-xs font-bold tracking-wider uppercase text-zinc-200">
            Strategy Radar
          </h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-md">
          {viewMode.toUpperCase()}
        </span>
      </div>

      <OnHoldReminderBanner chapters={chapters} onOpenChapter={(id: string) => actions.openChapterEditModal(id)} />

      {/* STRATEGY PARAMETERS */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850/80 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-[11px] uppercase font-bold tracking-wider">Capacity</span>
          <span className="font-bold text-white text-xs px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60">{dailyCapHours}h/day</span>
        </div>
        <div className="h-px w-full bg-zinc-800/60" />
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-[11px] uppercase font-bold tracking-wider">Strategy</span>
          <span className="font-bold text-indigo-300 text-xs truncate max-w-[140px]" title={mentorProfile?.subjectSplitStrategy}>
            {mentorProfile?.subjectSplitStrategy === '1_a_day_alternating' ? '1 Subj Focus' : mentorProfile?.subjectSplitStrategy === '2_a_day_alternating' ? '2 Subjs Alt' : '3 Subjs Daily'}
          </span>
        </div>
        <div className="h-px w-full bg-zinc-800/60" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-zinc-400 text-[11px] uppercase font-bold tracking-wider">Energy</span>
          <div className="flex items-center gap-1">
            {(['HIGH', 'MED', 'LOW'] as const).map((lvl) => {
              const isSelected = (energyLevel || 'HIGH').toUpperCase().startsWith(lvl);
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => actions.setEnergyLevel && actions.setEnergyLevel(lvl === 'HIGH' ? 'High' : lvl === 'MED' ? 'Medium' : 'Low')}
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                    isSelected
                      ? lvl === 'HIGH'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : lvl === 'MED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-zinc-750'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI RECOMMENDATION - PREMIUM REDESIGN */}
      <div className="relative group rounded-2xl p-[1px] overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-purple-500/10 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative p-3.5 rounded-2xl bg-zinc-950/80 border border-indigo-500/20 backdrop-blur-md space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-300">
              AI Insight
            </span>
          </div>
          <div className="text-xs text-zinc-300 leading-snug font-sans font-medium">
            {aiRecommendationText}
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleAutoBalance}
          disabled={isAutoBalancing}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all duration-150 active:scale-[0.97] cursor-pointer select-none ${
            isAutoBalancing
              ? 'bg-indigo-950/50 text-indigo-300 cursor-not-allowed opacity-80 border border-indigo-800/50'
              : balanceToast
              ? 'bg-emerald-600 text-white shadow-emerald-600/25'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
          }`}
        >
          {isAutoBalancing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : balanceToast ? (
            <Check className="w-4 h-4 stroke-[3]" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>{isAutoBalancing ? 'Balancing...' : balanceToast ? 'Plan Balanced!' : 'Auto-Balance Plan'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsAiRevisionModalOpen(true)}
            className="py-2 px-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.97] cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 select-none truncate"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Revision</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomMissionModalOpen(true)}
            className="py-2 px-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.97] cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 select-none truncate"
          >
            <PenTool className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">Mission</span>
          </button>
        </div>

        {/* AI Audits & Sync Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAuditDropdownOpen(!isAuditDropdownOpen)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold flex items-center justify-between transition-all duration-150 active:scale-[0.97] cursor-pointer select-none"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              AI Audits & Sync
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {isAuditDropdownOpen && (
            <div 
              className="absolute right-0 left-0 bottom-12 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl p-2 shadow-2xl z-50 space-y-1 text-xs font-mono"
              onClick={() => setIsAuditDropdownOpen(false)}
            >
              <button
                onClick={() => setIsWeeklyCheckinModalOpen(true)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-indigo-600/20 text-indigo-300 flex items-center gap-2 cursor-pointer font-bold"
              >
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                Sunday Sync Audit
              </button>
              <div className="border-t border-zinc-850 my-1"></div>
              <button
                onClick={() => navigate('/diagnostic')}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-900 text-zinc-200 flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-zinc-400 shrink-0" />
                <div>
                  <div className="font-bold">Re-Interview Mentor</div>
                  <div className="text-[10px] text-zinc-400 font-sans mt-0.5">Adjust strategy parameters</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-zinc-850/80 w-full" />

      {/* METRICS GRID */}
      <div>
        <div className="font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-2.5 text-center">
          {viewMode === 'daily' ? "Today's Metrics" : "This Week Metrics"}
        </div>
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850/60 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Planned</span>
            <span className="text-base font-bold text-white">{stats.plannedHours}h</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850/60 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Completed</span>
            <span className="text-base font-bold text-emerald-400">{stats.completedHours}h</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850/60 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Mocks</span>
            <span className="text-base font-bold text-indigo-400">{stats.mockCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850/60 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Questions</span>
            <span className="text-base font-bold text-zinc-200">{stats.estimatedQuestions}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
