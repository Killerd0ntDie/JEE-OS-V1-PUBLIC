import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WeeklyBlock } from '@jee-os/engines';
import { 
  Sparkles, RefreshCw, PenTool, SlidersHorizontal, ChevronDown, 
  Calendar, UserCheck, Check, Target, PieChart, Zap, 
  ChevronRight, ChevronLeft, PanelRightClose, PanelRightOpen 
} from 'lucide-react';
import { OnHoldReminderBanner } from '@/features/dashboard/components/OnHoldReminderBanner';
import { motion, AnimatePresence } from 'motion/react';

export interface PlannerStickySidebarProps {
  state: any;
}

export function PlannerStickySidebar({ state }: PlannerStickySidebarProps) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('jeeos_planner_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('jeeos_planner_sidebar_collapsed', String(next));
      return next;
    });
  };

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

  // Calculate Stats and Subject Distribution based on View Mode
  const { stats, subjectDist } = useMemo(() => {
    let totalMinutes = 0;
    let completedMinutes = 0;
    let mockCount = 0;
    const subMins: Record<string, number> = { physics: 0, chemistry: 0, maths: 0, other: 0 };

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

      if (sub.includes('phys')) subMins.physics += duration;
      else if (sub.includes('chem')) subMins.chemistry += duration;
      else if (sub.includes('math')) subMins.maths += duration;
      else subMins.other += duration;
    });

    const plannedHours = Math.round((totalMinutes / 60) * 10) / 10;
    const completedHours = Math.round((completedMinutes / 60) * 10) / 10;
    const estimatedQuestions = Math.round(completedHours * 22);

    const totalSubMins = subMins.physics + subMins.chemistry + subMins.maths || 1;
    const pPct = Math.round((subMins.physics / totalSubMins) * 100);
    const cPct = Math.round((subMins.chemistry / totalSubMins) * 100);
    const mPct = Math.round((subMins.maths / totalSubMins) * 100);

    return {
      stats: {
        plannedHours,
        completedHours,
        mockCount,
        estimatedQuestions,
        completionRate: plannedHours > 0 ? Math.min(100, Math.round((completedHours / plannedHours) * 100)) : 0
      },
      subjectDist: { pPct, cPct, mPct }
    };
  }, [weeklyMatrix, viewMode, selectedDayIndex]);

  const aiRecommendationText = useMemo(() => {
    if (activeBottlenecks && activeBottlenecks.length > 0) {
      return `Address ${activeBottlenecks[0]} to maximize week ROI.`;
    }
    return 'Shift 2h from Maths → Chemistry to address weak area.';
  }, [activeBottlenecks]);

  // COLLAPSED MINIMAL RAIL VIEW
  if (isCollapsed) {
    return (
      <motion.aside
        initial={{ width: 320, opacity: 0.8 }}
        animate={{ width: 56, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="w-14 shrink-0 sticky top-0 h-full rounded-2xl border border-zinc-850/90 bg-zinc-950/95 py-4 px-2 shadow-2xl flex flex-col items-center justify-between select-none z-20"
      >
        {/* Top: Expand Toggle & Target Icon */}
        <div className="flex flex-col items-center gap-3 w-full">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={toggleCollapse}
            className="w-9 h-9 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-indigo-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
            title="Expand Strategy HUD"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>

          <div 
            className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center cursor-pointer hover:bg-indigo-600/30 transition-colors"
            onClick={toggleCollapse}
            title="Strategy Radar (Click to Expand)"
          >
            <Target className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="h-px w-6 bg-zinc-850 my-1" />

          {/* Mini Subject Split Indicator (Vertical bar) */}
          <div 
            className="w-2.5 h-16 bg-zinc-900 rounded-full overflow-hidden flex flex-col border border-zinc-800/80 cursor-pointer"
            onClick={toggleCollapse}
            title={`Subject Split: ${subjectDist.pPct}% Phy, ${subjectDist.cPct}% Chem, ${subjectDist.mPct}% Math`}
          >
            <div className="bg-sky-500 w-full" style={{ height: `${subjectDist.pPct}%` }} />
            <div className="bg-emerald-500 w-full" style={{ height: `${subjectDist.cPct}%` }} />
            <div className="bg-indigo-500 w-full" style={{ height: `${subjectDist.mPct}%` }} />
          </div>
        </div>

        {/* Middle / Quick Action Icons */}
        <div className="flex flex-col items-center gap-2.5 w-full">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleAutoBalance}
            disabled={isAutoBalancing}
            className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-md ${
              isAutoBalancing
                ? 'bg-indigo-950 text-indigo-400'
                : balanceToast
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
            title="Auto-Balance Plan"
          >
            {isAutoBalancing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : balanceToast ? (
              <Check className="w-4 h-4 stroke-[3]" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsAiRevisionModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 flex items-center justify-center cursor-pointer transition-colors"
            title="AI Revision Sprint"
          >
            <Sparkles className="w-4 h-4" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCustomMissionModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer transition-colors"
            title="Add Custom Mission"
          >
            <PenTool className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Bottom: Quick Metric Chip */}
        <div 
          className="flex flex-col items-center cursor-pointer"
          onClick={toggleCollapse}
          title={`This Week: ${stats.plannedHours}h planned, ${stats.completedHours}h completed`}
        >
          <span className="text-[10px] font-mono font-bold text-zinc-400">
            {stats.plannedHours}h
          </span>
        </div>
      </motion.aside>
    );
  }

  // EXPANDED FULL HUD VIEW
  return (
    <motion.aside
      initial={{ width: 56, opacity: 0.8 }}
      animate={{ width: 320, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="w-[320px] shrink-0 sticky top-0 h-full overflow-y-auto no-scrollbar rounded-2xl border border-zinc-850/90 bg-zinc-950/95 p-4 md:p-5 shadow-2xl flex flex-col gap-3.5 select-none z-20"
    >
      {/* HEADER WITH COLLAPSE BUTTON */}
      <div className="flex items-center justify-between border-b border-zinc-850/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h3 className="font-mono text-xs font-bold tracking-wider uppercase text-zinc-200">
            Strategy Radar
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/30 px-2 py-0.5 rounded-md">
            {viewMode.toUpperCase()}
          </span>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={toggleCollapse}
            className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Collapse Strategy HUD"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      <OnHoldReminderBanner chapters={chapters} onOpenChapter={(id: string) => actions.openChapterEditModal(id)} />

      {/* WEEKLY SUBJECT BALANCE SEGMENTED BAR */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-850/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
            <PieChart className="w-3 h-3 text-indigo-400" /> Subject Split
          </span>
          <span className="text-zinc-400 font-medium">
            {subjectDist.pPct}% P • {subjectDist.cPct}% C • {subjectDist.mPct}% M
          </span>
        </div>

        {/* Triple Color Segmented Bar */}
        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800/80">
          <div 
            className="bg-sky-500 h-full transition-all duration-500" 
            style={{ width: `${subjectDist.pPct}%` }}
            title={`Physics: ${subjectDist.pPct}%`}
          />
          <div 
            className="bg-emerald-500 h-full transition-all duration-500" 
            style={{ width: `${subjectDist.cPct}%` }}
            title={`Chemistry: ${subjectDist.cPct}%`}
          />
          <div 
            className="bg-indigo-500 h-full transition-all duration-500" 
            style={{ width: `${subjectDist.mPct}%` }}
            title={`Maths: ${subjectDist.mPct}%`}
          />
        </div>
      </div>

      {/* STRATEGY PARAMETERS */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-850/80 space-y-2.5 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-[11px] uppercase font-bold tracking-wider">Capacity</span>
          <span className="font-bold text-white text-xs px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 shadow-sm">
            {dailyCapHours}h/day
          </span>
        </div>
        <div className="h-px w-full bg-zinc-850/60" />
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-[11px] uppercase font-bold tracking-wider">Strategy</span>
          <span className="font-bold text-indigo-300 text-xs truncate max-w-[140px]" title={mentorProfile?.subjectSplitStrategy}>
            {mentorProfile?.subjectSplitStrategy === '1_a_day_alternating' ? '1 Subj Focus' : mentorProfile?.subjectSplitStrategy === '2_a_day_alternating' ? '2 Subjs Alt' : '3 Subjs Daily'}
          </span>
        </div>
        <div className="h-px w-full bg-zinc-850/60" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-zinc-400 text-[11px] uppercase font-bold tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Energy
          </span>
          <div className="flex items-center gap-1">
            {(['HIGH', 'MED', 'LOW'] as const).map((lvl) => {
              const isSelected = (energyLevel || 'HIGH').toUpperCase().startsWith(lvl);
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => actions.setEnergyLevel && actions.setEnergyLevel(lvl === 'HIGH' ? 'High' : lvl === 'MED' ? 'Medium' : 'Low')}
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    isSelected
                      ? lvl === 'HIGH'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : lvl === 'MED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'bg-zinc-850/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI RECOMMENDATION INSIGHT */}
      <div className="relative group rounded-2xl p-[1px] overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-purple-500/10 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative p-3.5 rounded-2xl bg-zinc-950/90 border border-indigo-500/20 backdrop-blur-md space-y-1.5">
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
            className="py-2 px-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.97] cursor-pointer bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 select-none truncate"
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
            className="w-full py-2 px-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold flex items-center justify-between transition-all duration-150 active:scale-[0.97] cursor-pointer select-none"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              AI Audits & Sync
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {isAuditDropdownOpen && (
            <div 
              className="absolute right-0 left-0 bottom-12 rounded-2xl border border-zinc-800 bg-zinc-950/98 p-2 shadow-2xl z-50 space-y-1 text-xs font-mono"
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
        <div className="font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-2 text-center">
          {viewMode === 'daily' ? "Today's Metrics" : "This Week Metrics"}
        </div>
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-850/80 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-0.5">Planned</span>
            <span className="text-base font-bold text-white font-display">{stats.plannedHours}h</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-850/80 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-0.5">Completed</span>
            <span className="text-base font-bold text-emerald-400 font-display">{stats.completedHours}h</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-850/80 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-0.5">Mocks</span>
            <span className="text-base font-bold text-indigo-400 font-display">{stats.mockCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-850/80 flex flex-col items-center text-center justify-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-0.5">Questions</span>
            <span className="text-base font-bold text-zinc-200 font-display">{stats.estimatedQuestions}</span>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
