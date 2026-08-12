import React, { useMemo } from 'react';
import { WeeklyBlock } from '@jee-os/engines';
import { Sparkles, RefreshCw, PenTool, SlidersHorizontal, ChevronDown, Calendar, UserCheck, Check, Target } from 'lucide-react';
import { OnHoldReminderBanner } from '@/features/dashboard/components/OnHoldReminderBanner';

export interface PlannerStickySidebarProps {
  state: any;
}

export function PlannerStickySidebar({ state }: PlannerStickySidebarProps) {
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
    setIsInterviewModalOpen,
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
    <aside className="w-[300px] shrink-0 sticky top-0 h-full overflow-y-auto no-scrollbar rounded-xl border border-zinc-800/80 bg-[#0c0d14] p-5 shadow-2xl flex flex-col gap-5 select-none">
      
      {/* HEADER */}
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-indigo-400" />
        <h3 className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-400">
          Academic Strategy Radar
        </h3>
      </div>

      <OnHoldReminderBanner chapters={chapters} onOpenChapter={(id: string) => actions.openChapterEditModal(id)} />

      {/* STRATEGY PARAMETERS */}
      <div className="p-4 rounded-xl bg-[#12131c] border border-zinc-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 font-sans text-[11px] uppercase font-bold tracking-wider">Capacity</span>
          <span className="font-syne font-bold text-white text-sm">{dailyCapHours}h/day</span>
        </div>
        <div className="h-px w-full bg-zinc-800/50" />
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 font-sans text-[11px] uppercase font-bold tracking-wider">Strategy</span>
          <span className="font-syne font-bold text-indigo-300 text-xs truncate max-w-[130px]" title={mentorProfile?.subjectSplitStrategy}>
            {mentorProfile?.subjectSplitStrategy === '1_a_day_alternating' ? '1 Subj Focus' : mentorProfile?.subjectSplitStrategy === '2_a_day_alternating' ? '2 Subjs Alt' : '3 Subjs Daily'}
          </span>
        </div>
        <div className="h-px w-full bg-zinc-800/50" />
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 font-sans text-[11px] uppercase font-bold tracking-wider">Energy</span>
          <span className="status-pill bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px] font-bold uppercase px-2 py-0.5 rounded-full">{energyLevel || 'HIGH'}</span>
        </div>
      </div>

      {/* AI RECOMMENDATION */}
      <div className="p-3.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
        <div className="text-[11px] text-zinc-300 leading-relaxed font-sans">
          <span className="text-orange-400 font-semibold mb-1 block">AI Guidance:</span> 
          {aiRecommendationText}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleAutoBalance}
          disabled={isAutoBalancing}
          className={`w-full py-3 px-4 rounded-xl font-syne font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 ${
            balanceToast
              ? 'bg-emerald-600 border border-emerald-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
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

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setIsAiRevisionModalOpen(true)}
            className="py-2.5 px-3 rounded-xl text-xs font-syne font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Revision</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomMissionModalOpen(true)}
            className="py-2.5 px-3 rounded-xl text-xs font-syne font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-[#12131c] hover:bg-zinc-800 text-zinc-200 border border-zinc-800"
          >
            <PenTool className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="truncate">Mission</span>
          </button>
        </div>

        {/* AI Audits & Sync Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAuditDropdownOpen(!isAuditDropdownOpen)}
            className="w-full py-3 px-4 rounded-xl bg-[#12131c] hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-space-grotesk text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              AI Audits & Sync
            </span>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </button>

          {isAuditDropdownOpen && (
            <div 
              className="absolute right-0 left-0 top-14 rounded-xl border border-zinc-800 bg-[#090a0f] backdrop-blur-2xl p-2 shadow-2xl z-50 space-y-1 text-xs font-space-grotesk"
              onClick={() => setIsAuditDropdownOpen(false)}
            >
              <button
                onClick={() => setIsWeeklyCheckinModalOpen(true)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-indigo-600/20 text-indigo-300 flex items-center gap-2 cursor-pointer font-bold"
              >
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                Sunday Sync Audit
              </button>
              <div className="border-t border-zinc-800 my-1"></div>
              <button
                onClick={() => setIsInterviewModalOpen(true)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-900 text-zinc-200 flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-zinc-400 shrink-0" />
                <div>
                  <div className="font-bold">Re-Interview Mentor</div>
                  <div className="text-[10px] text-zinc-500 font-sans mt-0.5">Adjust strategy parameters</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-zinc-800/80 w-full" />

      {/* METRICS GRID */}
      <div>
        <div className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-500 mb-3 text-center">
          {viewMode === 'daily' ? "Today's Metrics" : "This Week Metrics"}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-[#12131c] border border-zinc-800/40 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold tracking-wider mb-1">Planned</span>
            <span className="font-syne text-xl font-extrabold text-white">{stats.plannedHours}h</span>
          </div>
          <div className="p-3 rounded-xl bg-[#12131c] border border-zinc-800/40 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold tracking-wider mb-1">Completed</span>
            <span className="font-syne text-xl font-extrabold text-emerald-400">{stats.completedHours}h</span>
          </div>
          <div className="p-3 rounded-xl bg-[#12131c] border border-zinc-800/40 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold tracking-wider mb-1">Mocks</span>
            <span className="font-syne text-xl font-extrabold text-indigo-400">{stats.mockCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#12131c] border border-zinc-800/40 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold tracking-wider mb-1">Questions</span>
            <span className="font-syne text-xl font-extrabold text-zinc-200">{stats.estimatedQuestions}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
