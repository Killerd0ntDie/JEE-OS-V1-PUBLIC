import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Badge } from '../../components/ui/Badge';
import { useStudyBrain } from '../../context/StudyBrainContext';
import { generateWeeklyMatrix, getDayFocusPill, getHeaderBadgeText, WeeklyBlock } from '../../engines/planner/PlannerEngine';
import { SubjectId, Chapter, TodayMission } from '../../types/index';
import { ChapterTelemetry } from '../../engines/chapterInfo';
import { MentorInterviewModal } from '../../components/mentor/MentorInterviewModal';
import { SyllabusDiagnosisModal } from '../../components/mentor/SyllabusDiagnosisModal';
import { WeeklyCheckinModal } from '../../components/mentor/WeeklyCheckinModal';
import { MonthlyObjectiveModal } from '../../components/mentor/MonthlyObjectiveModal';
import { 
  Sparkles, ShieldCheck, Target, Clock, ArrowRight, CheckCircle2, 
  RefreshCw, Sun, Calendar, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Info, SlidersHorizontal,
  Play, BookOpen, PenTool, CheckCircle, Zap, UserCheck, X, LayoutGrid, CalendarDays, BarChart2,
  PieChart, Activity, Layers, CheckSquare, Check, Trash2
} from 'lucide-react';


import { MonthlyCalendarWidget } from './components/MonthlyCalendarWidget';
import { CustomMissionModal } from './components/CustomMissionModal';
import { AiRevisionPlanModal } from '../../components/shared/AiRevisionPlanModal';
import { ConfirmDeleteModal } from '../../components/ui/ConfirmDeleteModal';

export function PlannerPage() {
  const { state, actions } = useStudyBrain();

  // Dynamic Daily Capacity (defaults to AI Mentor Interview response)
  const dailyCapHours = state.mentorProfile?.dailyAvailableHours || state.settings.dailyQuota || 4;

  // View Mode: 'daily' | 'weekly' | 'monthly'
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const currentDayIndex = useMemo(() => {
    const day = new Date().getDay(); // 0 = Sun, 1 = Mon
    return day === 0 ? 6 : day - 1; // Map to 0 = Mon, 6 = Sun
  }, []);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(currentDayIndex);

  // Modals
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [isWeeklyCheckinModalOpen, setIsWeeklyCheckinModalOpen] = useState(false);
  const [isMonthlyObjectiveModalOpen, setIsMonthlyObjectiveModalOpen] = useState(false);
  const [isAuditDropdownOpen, setIsAuditDropdownOpen] = useState(false);
  const [isCustomMissionModalOpen, setIsCustomMissionModalOpen] = useState(false);
  const [isAiRevisionModalOpen, setIsAiRevisionModalOpen] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);

  // Inspector Modal state
  const [selectedBlock, setSelectedBlock] = useState<WeeklyBlock | null>(null);
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(false);

  const [isAutoBalancing, setIsAutoBalancing] = useState(false);
  const [balanceToast, setBalanceToast] = useState(false);

  const mentorProfile = state.mentorProfile;

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Calculate Date String for dayIndex
  const getDayDateString = (dayIndex: number) => {
    const today = new Date();
    const diff = dayIndex - currentDayIndex;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Dynamic Active Bottlenecks from Real Academic State via state.chapterTelemetryMap
  const activeBottlenecks = useMemo(() => {
    const list: string[] = [];
    (Object.values(state.chapterTelemetryMap || {}) as ChapterTelemetry[]).forEach(t => {
      if (t && t.isBottleneck && t.bottleneckReason) {
        list.push(t.bottleneckReason);
      }
    });
    return list.length > 0 
      ? list.slice(0, 3) 
      : ['Physics Mechanics lecture backlog', 'Chemistry GOC reaction mechanism DPPs'];
  }, [state.chapterTelemetryMap]);

  // Generate Clean, Rotated Weekly Schedule Matrix directly from PlannerEngine outputs
  const weeklyMatrix = useMemo<WeeklyBlock[]>(() => {
    const splitStrategy = mentorProfile?.subjectSplitStrategy || '3_a_day';
    const plannerWeekly = state.plannerOutput?.weeklySchedule as any;
    return generateWeeklyMatrix(splitStrategy, state.chapters, state.todayMissions, plannerWeekly, currentDayIndex);
  }, [state.plannerOutput, state.chapters, mentorProfile?.subjectSplitStrategy, state.todayMissions, currentDayIndex]);

  const handleAutoBalance = async () => {
    setIsAutoBalancing(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      setBalanceToast(true);
      setTimeout(() => setBalanceToast(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAutoBalancing(false);
    }
  };

  const selectedDayBlocks = useMemo(() => {
    return weeklyMatrix.filter(b => b.dayIndex === selectedDayIndex);
  }, [weeklyMatrix, selectedDayIndex]);

  const getSubjectStyle = (subject: string) => {
    switch (subject.toLowerCase()) {
      case 'physics': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'chemistry': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'maths': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getBadgeStyle = (arg1: any, arg2?: string) => {
    if (typeof arg1 === 'string') {
      const s = arg1.toLowerCase();
      if (s.includes('phys')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      if (s.includes('chem')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      if (s.includes('math')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
    if (arg1) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    if (arg2?.toLowerCase().includes('pyq')) return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    if (arg2?.toLowerCase().includes('test')) return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
  };

  const activeInspectorTelemetry = useMemo(() => {
    if (!selectedBlock) return null;
    return state.chapterTelemetryMap?.[selectedBlock.chapterId] || null;
  }, [selectedBlock, state.chapterTelemetryMap]);

  return (
    <div className="space-y-6 pb-12 text-left relative">
      
      {/* HEADER & CONTROL BAR */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl space-y-4">
        
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

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            
            {/* Primary Auto-Balance CTA */}
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

            {/* AI Revision Sprint Generator CTA */}
            <button
              type="button"
              onClick={() => setIsAiRevisionModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              AI Revision Sprint
            </button>

            {/* Custom Mission CTA */}
            <button
              type="button"
              onClick={() => setIsCustomMissionModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
            >
              <PenTool className="w-3.5 h-3.5" />
              Add Mission
            </button>

            {/* AI Audits & Sync Dropdown */}
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

        {/* Capacity & Target Badges Bar */}
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
              {state.energyLevel || 'Medium'} Energy • Adaptive
            </span>
          </div>
        </div>

      </div>

      {/* SCHEDULE & STRATEGY MATRIX CONTAINER */}
      <div className="p-5 md:p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl space-y-6">
        
        {/* HEADER BAR WITH 3-WAY SEGMENTED VIEW SWITCHER CONTROL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-display font-bold text-white tracking-tight">
                Academic Schedule & Strategy Engine
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Toggle between Daily Detailed Focus, Weekly 7-Day Matrix, and Monthly Strategy Roadmap.
            </p>
          </div>

          {/* 3-WAY SEGMENTED VIEW SWITCHER */}
          <div className="p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-1 self-start md:self-auto font-mono text-xs">
            
            {/* Daily Focus Button */}
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Daily Focus
            </button>

            {/* Weekly Matrix Button */}
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Weekly Matrix
            </button>

            {/* Monthly Strategy Button */}
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Monthly Strategy
            </button>

          </div>
        </div>

        {/* 1. DAILY FOCUS VIEW MODE */}
        {viewMode === 'daily' && (
          <div className="space-y-6">
            
            {/* Day Selector Header Bar (← Prev Day | TODAY | Next Day →) */}
            <div className="p-4 rounded-xl border border-zinc-850 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDayIndex(prev => Math.max(0, prev - 1))}
                  disabled={selectedDayIndex === 0}
                  className="p-2 rounded-lg border border-zinc-800 hover:bg-zinc-850 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-mono text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev Day
                </button>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-display font-bold text-white">
                      {fullDayNames[selectedDayIndex]}
                    </span>
                    {selectedDayIndex === currentDayIndex ? (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        TODAY
                      </span>
                    ) : selectedDayIndex < currentDayIndex ? (
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                        Past Day History
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                        Upcoming Schedule
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-zinc-400 flex items-center gap-2 flex-wrap">
                    <span>{getDayDateString(selectedDayIndex)} • Daily Capacity Budget: {dailyCapHours} hrs</span>
                    <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded-full uppercase">
                      Strategy: {mentorProfile?.subjectSplitStrategy === '1_a_day_alternating' ? '1 Subject Focus' : mentorProfile?.subjectSplitStrategy === '2_a_day_alternating' ? '2 Subjects Alternating' : '3 Subjects Daily'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedDayIndex !== currentDayIndex && (
                  <button
                    type="button"
                    onClick={() => setSelectedDayIndex(currentDayIndex)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold hover:bg-indigo-600/30 cursor-pointer"
                  >
                    Jump to Today
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDayIndex(prev => Math.min(6, prev + 1))}
                  disabled={selectedDayIndex === 6}
                  className="p-2 rounded-lg border border-zinc-800 hover:bg-zinc-850 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-mono text-xs"
                >
                  Next Day
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Detailed Tasks List for Selected Day */}
            <div className="space-y-4">
              {selectedDayBlocks.map((block) => (
                <div
                  key={block.id}
                  onClick={() => {
                    setSelectedBlock(block);
                    setIsRationaleExpanded(false);
                  }}
                  className={`p-5 rounded-2xl border text-left space-y-3 transition-all cursor-pointer ${getSubjectStyle(block.subject)}`}
                >
                  {/* Task Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900/60 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border uppercase ${getBadgeStyle(block.subject)}`}>
                        {block.subject}
                      </span>
                      <span className="text-xs font-mono font-bold text-white bg-zinc-900/80 px-2.5 py-0.5 rounded border border-zinc-800">
                        {block.timeSlot}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        Duration: {block.durationMinutes} mins
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-950/80 border border-indigo-800/80 px-2.5 py-0.5 rounded">
                        Score: {block.priorityScore}
                      </span>
                      {block.completed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMissionToDelete(block.id);
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete mission"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Task Title & Details */}
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-base font-display font-bold text-white tracking-tight">
                        {block.chapterName}
                      </h3>
                      <span className="text-xs font-mono text-zinc-400">Unit: {block.unit}</span>
                    </div>
                    <p className="text-xs font-mono text-indigo-300 font-semibold">
                      {block.activity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* 2. REFINED WEEKLY MATRIX VIEW MODE (CLEAN 7-DAY OVERVIEW WITHOUT DETAILS TEXT CLUTTER) */}
        {viewMode === 'weekly' && (
          <div className="space-y-4">
            
            {/* Contextual Strategy Header Badge */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-850 bg-zinc-900/40 text-xs font-mono flex-wrap gap-2">
              <span className="text-zinc-400 font-semibold">7-Day Weekly Matrix View</span>
              <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2.5 py-0.5 rounded-full uppercase">
                Strategy: {mentorProfile?.subjectSplitStrategy === '1_a_day_alternating' ? '1 Subject Focus' : mentorProfile?.subjectSplitStrategy === '2_a_day_alternating' ? '2 Subjects Alternating' : '3 Subjects Daily'}
              </span>
            </div>

            {/* 7-COLUMN WEEKLY GRID */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 text-left">
              {daysOfWeek.map((dayName, dayIndex) => {
                const isToday = dayIndex === currentDayIndex;
                const dayBlocks = weeklyMatrix.filter(b => b.dayIndex === dayIndex);

                return (
                  <div 
                    key={dayName}
                    className={`rounded-2xl border p-3 space-y-3 transition-all ${
                      isToday 
                        ? 'border-indigo-500/60 bg-indigo-950/20 shadow-lg shadow-indigo-500/10' 
                        : 'border-zinc-850 bg-zinc-900/30 hover:border-zinc-700'
                    }`}
                  >
                    {/* Day Header — Dynamic Hours Cap & Focus Pill */}
                    <div 
                      onClick={() => {
                        setSelectedDayIndex(dayIndex);
                        setViewMode('daily');
                      }}
                      className="flex flex-col border-b border-zinc-850 pb-2.5 cursor-pointer group gap-1.5"
                      title="Click to view detailed Daily Focus for this day"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isToday && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>}
                          <span className={`text-xs font-mono font-bold uppercase group-hover:text-indigo-400 transition-colors ${isToday ? 'text-indigo-400' : 'text-zinc-300'}`}>
                            {dayName}
                          </span>
                          {isToday && (
                            <span className="text-[8px] font-mono font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-800/80 px-1.5 py-0.2 rounded uppercase">
                              LIVE
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 font-bold group-hover:text-indigo-300">
                          {dailyCapHours}h →
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300 uppercase tracking-wider">
                          {getDayFocusPill(dayIndex, mentorProfile?.subjectSplitStrategy || '3_a_day')}
                        </span>
                      </div>
                    </div>

                    {/* Day Study Blocks — 4 Rotated Slots, Clean without 'Details >' clutter */}
                    <div className="space-y-2.5">
                      {dayBlocks.map(block => (
                        <div
                          key={block.id}
                          onClick={() => {
                            setSelectedBlock(block);
                            setIsRationaleExpanded(false);
                          }}
                          className={`p-3 rounded-xl border text-left space-y-2 transition-all cursor-pointer group shadow-sm ${getSubjectStyle(block.subject)}`}
                        >
                          {/* Subject & Duration Header */}
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getBadgeStyle(block.subject)}`}>
                              {block.subject}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-400 font-semibold">
                              {block.durationMinutes}m
                            </span>
                          </div>

                          {/* Chapter Title */}
                          <h4 className="text-xs font-display font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                            {block.chapterName}
                          </h4>

                          {/* Task Description */}
                          <p className="text-[10px] font-mono text-zinc-400 line-clamp-1 leading-normal">
                            {block.activity}
                          </p>

                          {/* Footer details — CLEAN without 'Details >' text */}
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1.5 border-t border-zinc-900/60">
                            <span>Score: {block.priorityScore}</span>
                            {block.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* 3. MONTHLY STRATEGY VIEW MODE */}
        {viewMode === 'monthly' && (
          <div className="space-y-6">
      <MonthlyCalendarWidget />

            
            {/* Monthly Target Header */}
            <div className="p-5 rounded-2xl border border-purple-900/40 bg-purple-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-purple-300 font-mono text-xs font-bold uppercase tracking-wider flex-wrap">
                  <Target className="w-4 h-4" />
                  <span>Monthly Strategic Objective</span>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2.5 py-0.5 rounded-full uppercase">
                    Split Strategy: {mentorProfile?.subjectSplitStrategy === '1_a_day_alternating' ? '1 Subject Focus' : mentorProfile?.subjectSplitStrategy === '2_a_day_alternating' ? '2 Subjects Alternating' : '3 Subjects Daily'}
                  </span>
                </div>
                <h3 className="text-lg font-display font-bold text-white">
                  {mentorProfile?.monthlyObjective?.category || 'Finish Mechanics & Organic Chemistry Foundations'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {mentorProfile?.monthlyObjective?.description || 'Target completion benchmark: Nov 2026. Required score gain: +35 Marks.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMonthlyObjectiveModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer shrink-0"
              >
                Set Monthly Goal
              </button>
            </div>

            {/* 4-WEEK MILESTONE ROADMAP GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2 font-mono text-xs">
                  <span className="text-indigo-400 font-bold">WEEK 1</span>
                  <span className="text-emerald-400 font-bold">Completed ✓</span>
                </div>
                <h4 className="font-display font-bold text-white text-xs">Mechanics Core & Vectors</h4>
                <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                  Focus: Kinematics, NLM, Work Power Energy. Complete 45 DPPs & 30 PYQs.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-indigo-500/50 bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2 font-mono text-xs">
                  <span className="text-indigo-400 font-bold">WEEK 2</span>
                  <span className="text-indigo-300 font-bold animate-pulse">ACTIVE FOCUS</span>
                </div>
                <h4 className="font-display font-bold text-white text-xs">GOC & Reaction Mechanisms</h4>
                <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                  Focus: Inductive & Resonance Effects, Isomerism, Hydrocarbons.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2 font-mono text-xs">
                  <span className="text-zinc-400 font-bold">WEEK 3</span>
                  <span className="text-zinc-500 font-bold">Upcoming</span>
                </div>
                <h4 className="font-display font-bold text-white text-xs">Algebra & Differential Calculus</h4>
                <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                  Focus: Sets & Relations, Functions, Limits & Continuity.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2 font-mono text-xs">
                  <span className="text-zinc-400 font-bold">WEEK 4</span>
                  <span className="text-zinc-500 font-bold">Consolidation</span>
                </div>
                <h4 className="font-display font-bold text-white text-xs">Full Monthly Mock & Error Audit</h4>
                <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                  Focus: Full-Syllabus Mock Test Session 1 Benchmark & Mistakes Review.
                </p>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* TASK INSPECTOR MODAL — WITH CHAPTER INFOGRAPHICS & STATS (NO LAUNCH SESSION BUTTON) */}
      {selectedBlock && createPortal(
        <div className="fixed inset-0 z-[100] bg-[#09090b] flex flex-col font-sans animate-in fade-in duration-300 overflow-y-auto h-screen w-screen">
          <div className="w-full max-w-4xl mx-auto flex flex-col flex-1 relative py-12 px-6">
            
            <button
              onClick={() => setSelectedBlock(null)}
              className="absolute top-6 right-6 p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer z-10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 text-left">
              {/* Header */}
              <div className="space-y-2 pr-12">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getBadgeStyle(selectedBlock.subject)}`}>
                  {selectedBlock.subject}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {selectedBlock.timeSlot} • {selectedBlock.durationMinutes} minutes
                </span>
              </div>

              <h3 className="text-lg font-display font-bold text-white tracking-tight">
                {selectedBlock.chapterName}
              </h3>
              <p className="text-xs font-mono text-indigo-400 font-semibold">
                {selectedBlock.activity}
              </p>
            </div>

            {/* CHAPTER INFOGRAPHICS & STATS GRID */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                Chapter Infographics & Mastery Telemetry
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                  <span className="text-[9px] text-zinc-500 block uppercase">Mastery Score</span>
                  <span className="text-sm font-bold text-indigo-400">
                    {activeInspectorTelemetry?.masteryScore || 65}%
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                  <span className="text-[9px] text-zinc-500 block uppercase">Theory Progress</span>
                  <span className="text-xs font-bold text-white">
                    {activeInspectorTelemetry?.currentLecture || 0} / {activeInspectorTelemetry?.totalLectures || 12} Lecs
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                  <span className="text-[9px] text-zinc-500 block uppercase">DPP Status</span>
                  <span className={`text-xs font-bold ${activeInspectorTelemetry?.dppComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {activeInspectorTelemetry?.dppComplete ? '✓ Mastered' : '⏳ Pending'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                  <span className="text-[9px] text-zinc-500 block uppercase">PYQ Status</span>
                  <span className={`text-xs font-bold ${activeInspectorTelemetry?.pyqsComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {activeInspectorTelemetry?.pyqsComplete ? '✓ Mastered' : '⏳ Pending'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                  <span className="text-[9px] text-zinc-500 block uppercase">JEE Weightage</span>
                  <span className="text-xs font-bold text-purple-400">
                    {activeInspectorTelemetry?.weightagePercent || 4.5}% Weight
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                  <span className="text-[9px] text-zinc-500 block uppercase">Retention Score</span>
                  <span className="text-xs font-bold text-sky-400">
                    {activeInspectorTelemetry?.retentionConfidence || 'High'}
                  </span>
                </div>
              </div>
            </div>

            {/* MINIMIZED COLLAPSIBLE AI RATIONALE */}
            <div className="p-3.5 rounded-xl border border-indigo-900/40 bg-indigo-950/30 space-y-2 font-sans text-xs">
              <div 
                onClick={() => setIsRationaleExpanded(!isRationaleExpanded)}
                className="flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="font-mono text-xs font-bold text-indigo-300 uppercase">
                    AI Mentor Rationale
                  </span>
                </div>
                <span className="font-mono text-2xs text-indigo-400 group-hover:underline flex items-center gap-1">
                  {isRationaleExpanded ? 'Minimize ▲' : 'Expand Rationale ▼'}
                </span>
              </div>

              {isRationaleExpanded ? (
                <div className="space-y-2 text-zinc-300 text-xs leading-relaxed pt-2 border-t border-indigo-900/30">
                  <p>🎯 <strong>Why Selected:</strong> {selectedBlock.reasoning.whySelected}</p>
                  <p>🔗 <strong>Dependencies Unlocked:</strong> {selectedBlock.reasoning.dependentChapters.join(', ')}</p>
                  <p>⚖️ <strong>Ranking Rationale:</strong> {selectedBlock.reasoning.rankingRationale}</p>
                  <p>📈 <strong>Long-term Impact:</strong> {selectedBlock.reasoning.longTermImpact}</p>
                  <p>⚠️ <strong>Risk of Postponing:</strong> {selectedBlock.reasoning.postponeRisk}</p>
                  <p>🎯 <strong>Target Benchmark:</strong> <span className="text-purple-300 font-bold font-mono">{selectedBlock.reasoning.targetAccuracy}</span></p>
                </div>
              ) : (
                <p className="text-zinc-400 text-[11px] line-clamp-1">
                  💡 {selectedBlock.reasoning.whySelected}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-zinc-900/60 mt-4">
              <div className="flex items-center gap-3">
                {activeInspectorTelemetry && (
                  <button
                    type="button"
                    onClick={() => {
                      actions.openChapterEditModal(activeInspectorTelemetry.chapterId);
                      setSelectedBlock(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border border-zinc-800"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Edit Telemetry
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedBlock(null)}
                className="px-6 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-300 font-mono text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

            </div> {/* Close scrollable container */}
          </div>
        </div>,
        document.body
      )}

      {/* MODALS */}
      <MentorInterviewModal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        isMandatory={false}
      />

      <SyllabusDiagnosisModal
        isOpen={isDiagnosisModalOpen}
        onClose={() => setIsDiagnosisModalOpen(false)}
      />

      <WeeklyCheckinModal
        isOpen={isWeeklyCheckinModalOpen}
        onClose={() => setIsWeeklyCheckinModalOpen(false)}
      />

      <MonthlyObjectiveModal
        isOpen={isMonthlyObjectiveModalOpen}
        onClose={() => setIsMonthlyObjectiveModalOpen(false)}
      />

      <CustomMissionModal 
        isOpen={isCustomMissionModalOpen}
        onClose={() => setIsCustomMissionModalOpen(false)}
      />

      <AiRevisionPlanModal
        isOpen={isAiRevisionModalOpen}
        onClose={() => setIsAiRevisionModalOpen(false)}
      />

      <ConfirmDeleteModal
        isOpen={!!missionToDelete}
        onConfirm={() => {
          if (missionToDelete) {
            actions.deleteMission(missionToDelete);
            setMissionToDelete(null);
          }
        }}
        onClose={() => setMissionToDelete(null)}
      />

    </div>
  );
}
