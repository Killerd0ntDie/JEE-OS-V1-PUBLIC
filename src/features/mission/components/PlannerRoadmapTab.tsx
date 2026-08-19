import React, { useMemo } from 'react';
import { ArrowRightLeft, PenTool, Calendar, Target, Sparkles, BookOpen, Layers, CheckCircle2, TrendingUp, Zap, ChevronRight } from 'lucide-react';
import { MonthlyCalendarWidget } from './MonthlyCalendarWidget';
import { CognitivePairingMatrix } from '@/features/planner/components/CognitivePairingMatrix';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { Chapter } from '@/types';

export function PlannerRoadmapTab({ state }: { state: any }) {
  const { setViewMode, setSelectedDayIndex } = state;
  const chapters = useStudyBrainStore(state => state.chapters) || [];
  const weeklyMatrix = useStudyBrainStore(state => (state as any).weeklyMatrix) || [];
  const studySessions = useStudyBrainStore(state => state.studySessions) || [];
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const settings = useStudyBrainStore(state => state.settings);

  const today = new Date();
  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate Monthly Macro Metrics
  const macroMetrics = useMemo(() => {
    let completedMinutes = 0;
    studySessions.forEach(s => {
      completedMinutes += s.duration || 0;
    });

    const plannedWeeklyHours = weeklyMatrix.reduce((acc, b) => acc + (b.durationMinutes || 75), 0) / 60;
    const estimatedMonthTargetHours = Math.round(plannedWeeklyHours * 4);
    const completedHours = Math.round((completedMinutes / 60) * 10) / 10;
    const progressPercent = estimatedMonthTargetHours > 0 
      ? Math.min(100, Math.round((completedHours / estimatedMonthTargetHours) * 100))
      : 0;

    // High yield active chapters (In-flight: Started but not Mastered)
    const activeChapters = chapters.filter(c => c.status && c.status !== 'Not Started' && c.status !== 'Mastered');
    const activeCount = activeChapters.length;

    // Subject breakdown
    const pChaps = chapters.filter(c => c.subject === 'physics');
    const cChaps = chapters.filter(c => c.subject === 'chemistry');
    const mChaps = chapters.filter(c => c.subject === 'maths');

    const getSubjectStats = (chaps: Chapter[]) => {
      if (chaps.length === 0) return { theoryPct: 0, practicePct: 0, count: 0, completedCount: 0 };
      const completed = chaps.filter(c => c.completion >= 100 || c.status === 'Mastered');
      const totalTheory = chaps.filter(c => c.theoryComplete).length;
      const totalPractice = chaps.filter(c => c.dppComplete || c.pyqsComplete).length;
      return {
        theoryPct: Math.round((totalTheory / chaps.length) * 100),
        practicePct: Math.round((totalPractice / chaps.length) * 100),
        count: chaps.length,
        completedCount: completed.length
      };
    };

    const mocksScheduled = weeklyMatrix.filter(b => b.activity?.toLowerCase().includes('mock')).length || 1;
    const projectedMarksGain = activeCount * 4;

    return {
      estimatedMonthTargetHours: Math.max(120, estimatedMonthTargetHours),
      completedHours,
      progressPercent,
      activeCount,
      mocksScheduled,
      projectedMarksGain,
      physics: getSubjectStats(pChaps),
      chemistry: getSubjectStats(cChaps),
      maths: getSubjectStats(mChaps)
    };
  }, [studySessions, weeklyMatrix, chapters]);

  return (
    <div className="space-y-6 pb-6 select-none">
      
      {/* MACRO MONTHLY HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-850/90 bg-zinc-950/80 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Target className="w-4 h-4" />
            <span>Monthly Strategy Board</span>
          </div>
          <h2 className="text-xl font-bold font-display text-white tracking-tight">
            {monthName} Campaign
          </h2>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            Macro-level milestones and syllabus distribution.
          </p>
        </div>
      </div>

      {/* MONTH KPI OVERVIEW TILES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/70 backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] uppercase font-bold tracking-wider">
                <span>Month Hours</span>
                <span className="text-emerald-400">{macroMetrics.progressPercent}%</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold font-display text-white">
                  {macroMetrics.completedHours}h <span className="text-xs font-mono font-normal text-zinc-400">/ {macroMetrics.estimatedMonthTargetHours}h</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mt-2 border border-zinc-800">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${macroMetrics.progressPercent}%` }} />
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">Target: {settings.dailyQuota || 6}h daily quota</span>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/70 backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] uppercase font-bold tracking-wider">
                <span>Active Chapters</span>
                <span className="text-indigo-400">In-Flight</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold font-display text-white">
                  {macroMetrics.activeCount} <span className="text-xs font-mono font-normal text-zinc-400">Chapters</span>
                </div>
                <div className="text-xs text-zinc-400 mt-1 truncate">
                  Under active sprint & retention tracking
                </div>
              </div>
              <span className="text-[10px] font-mono text-indigo-300">⚡ Sunk Cost prioritized</span>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/70 backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] uppercase font-bold tracking-wider">
                <span>Full Mocks</span>
                <span className="text-rose-400">Scheduled</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold font-display text-white">
                  {macroMetrics.mocksScheduled} <span className="text-xs font-mono font-normal text-zinc-400">{macroMetrics.mocksScheduled === 1 ? 'Exam' : 'Exams'}</span>
                </div>
                <div className="text-xs text-zinc-400 mt-1 truncate">
                  Full Syllabus Benchmark Sessions
                </div>
              </div>
              <span className="text-[10px] font-mono text-rose-300">Target Score: {(mentorProfile as any)?.targetScore || 220}+</span>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/70 backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] uppercase font-bold tracking-wider">
                <span>Projected Gain</span>
                <span className="text-emerald-400">+{macroMetrics.projectedMarksGain} M</span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold font-display text-emerald-400">
                  +{macroMetrics.projectedMarksGain} – {macroMetrics.projectedMarksGain + 8} <span className="text-xs font-mono font-normal text-zinc-400">Marks</span>
                </div>
                <div className="text-xs text-zinc-400 mt-1 truncate">
                  Estimated score uplift on sprint finish
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">Syllabus coverage delta</span>
            </div>
          </div>

          {/* MONTHLY CALENDAR GRID HEATMAP */}
          <MonthlyCalendarWidget state={state} />

          {/* SUBJECT SYLLABUS HEALTH SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl border border-sky-900/30 bg-sky-950/10 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-sky-400">
                  Physics Syllabus
                </span>
                <span className="text-[10px] font-mono font-bold text-zinc-400">
                  {macroMetrics.physics.completedCount} / {macroMetrics.physics.count} Mastered
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-zinc-300">
                  <span>Theory Coverage</span>
                  <span>{macroMetrics.physics.theoryPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${macroMetrics.physics.theoryPct}%` }} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-900/30 bg-emerald-950/10 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Chemistry Syllabus
                </span>
                <span className="text-[10px] font-mono font-bold text-zinc-400">
                  {macroMetrics.chemistry.completedCount} / {macroMetrics.chemistry.count} Mastered
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-zinc-300">
                  <span>Theory Coverage</span>
                  <span>{macroMetrics.chemistry.theoryPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${macroMetrics.chemistry.theoryPct}%` }} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-indigo-900/30 bg-indigo-950/10 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Mathematics Syllabus
                </span>
                <span className="text-[10px] font-mono font-bold text-zinc-400">
                  {macroMetrics.maths.completedCount} / {macroMetrics.maths.count} Mastered
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-zinc-300">
                  <span>Theory Coverage</span>
                  <span>{macroMetrics.maths.theoryPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${macroMetrics.maths.theoryPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* COGNITIVE CHAPTER PAIRING SYNERGY MATRIX */}
          <div className="pt-2">
            <CognitivePairingMatrix />
          </div>
    </div>
  );
}
