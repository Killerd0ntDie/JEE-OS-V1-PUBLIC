import React, { useMemo, useState, useEffect } from 'react';
import { Target, Clock, AlertTriangle, TrendingUp, ChevronDown, ChevronUp, ShieldAlert, PauseCircle, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import { useStudyBrain } from '../../../context/StudyBrainContext';
import { ChapterTelemetry } from '../../../engines/chapterInfo';
import { Chapter } from '../../../types';
import { MonthlyCampaignBanner } from '../../mission/components/MonthlyCampaignBanner';

interface CommandOverviewBannerProps {
  chapters: Chapter[];
  onOpenChapter: (chapterId: string) => void;
  onSetMonthlyObjective: () => void;
  onSetDailyCapacity: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function CommandOverviewBanner({
  chapters,
  onOpenChapter,
  onSetMonthlyObjective,
  onSetDailyCapacity,
  isExpanded: externalExpanded,
  onToggleExpand
}: CommandOverviewBannerProps) {
  const { state } = useStudyBrain();
  const { mentorProfile, projectedReadiness, chapterTelemetryMap } = state;

  const [internalExpanded, setInternalExpanded] = useState<boolean>(true);
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;

  const onHoldChapters = useMemo(() => {
    return (chapters || []).filter(c => c.chapterOnHold || c.dppOnHold || c.pyqOnHold);
  }, [chapters]);

  const startedChapters = useMemo(() => {
    return (chapters || []).filter(c => (c.completion > 0 && c.completion < 100) || (c.currentLecture && c.currentLecture > 0) || c.theoryComplete);
  }, [chapters]);

  const allStartedOnHold = startedChapters.length > 0 && startedChapters.every(c => c.chapterOnHold);

  useEffect(() => {
    if (externalExpanded === undefined) {
      setInternalExpanded(true);
      const timer = setTimeout(() => {
        setInternalExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [externalExpanded]);

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const activeBottlenecks = useMemo(() => {
    const list: string[] = [];
    (Object.values(chapterTelemetryMap || {}) as ChapterTelemetry[]).forEach(t => {
      if (t && t.isBottleneck && t.bottleneckReason) {
        list.push(t.bottleneckReason);
      }
    });
    return list.length > 0 ? list : ['None detected. Great momentum!'];
  }, [chapterTelemetryMap]);

  const dailyCapHours = mentorProfile?.dailyAvailableHours || 6.5;

  return (
    <div className="w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 mb-8 font-mono text-left shadow-xl transition-all duration-300">
      {/* Unified Section Header Bar */}
      <div 
        onClick={handleToggle}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <LayoutDashboard className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Prep Command Center
          </span>
          {!isExpanded && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {onHoldChapters.length > 0 && (
                <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                  <PauseCircle className="w-3 h-3 text-amber-400" />
                  {onHoldChapters.length} On Hold
                </span>
              )}
              <span className="text-[10px] text-zinc-300 bg-zinc-800/90 px-2 py-0.5 rounded-md border border-zinc-700">
                {projectedReadiness}% Readiness
              </span>
              <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                {dailyCapHours}h/day Capacity
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-indigo-400/80 hover:text-indigo-300 text-[11px] font-bold shrink-0">
          <span>{isExpanded ? 'Collapse Center' : 'Expand Center'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Merged Collapsible Body */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[800px] opacity-100 mt-3 pt-3 border-t border-zinc-800 space-y-4' : 'max-h-0 opacity-0 mt-0 pt-0 border-t-0 space-y-0'
        }`}
      >
        {/* MONTHLY BOSS ENCOUNTER */}
        <MonthlyCampaignBanner />

        {/* Integrated On-Hold Chapters Box (if any chapters on hold) */}
        {onHoldChapters.length > 0 && (
          <div className="w-full bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-left">
            <div className="flex items-center gap-2 mb-2">
              <PauseCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                {allStartedOnHold
                  ? 'All started chapters are on hold — remove hold or start a new chapter to generate plan'
                  : `${onHoldChapters.length} chapter${onHoldChapters.length > 1 ? 's' : ''} on hold — not being scheduled`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {onHoldChapters.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChapter(c.id);
                  }}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 transition-colors cursor-pointer"
                  title="Click to review or resume"
                >
                  {c.name}
                  {c.chapterOnHold
                    ? ' (Entire Chapter)'
                    : c.dppOnHold && c.pyqOnHold
                    ? ' (DPP + PYQ)'
                    : c.dppOnHold
                    ? ' (DPP)'
                    : ' (PYQ)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Integrated 4 Command Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Target Readiness */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="glass-card rounded-2xl p-4 relative overflow-hidden group border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-xl"
          >
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
            <span className="text-[10px] font-mono text-indigo-300 uppercase font-bold tracking-wider block mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              Target Readiness
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-display font-black text-white tracking-tight">{projectedReadiness}%</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase">
                On Track
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">Est Completion: Nov 2026</p>
          </motion.div>

          {/* Monthly Objective */}
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={onSetMonthlyObjective}
            className="glass-card rounded-2xl p-4 relative overflow-hidden cursor-pointer border border-purple-500/20 bg-purple-950/20 backdrop-blur-xl hover:border-purple-500/40 group"
            title="Click to set or calibrate monthly objective"
          >
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-purple-300 uppercase font-bold tracking-wider block">Monthly Objective</span>
              <Target className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-12 transition-transform" />
            </div>
            <span className="text-sm font-display font-bold text-white truncate block">
              {mentorProfile?.monthlyObjective?.category || 'Finish Mechanics & GOC'}
            </span>
            <p className="text-[10px] text-zinc-400 font-mono truncate mt-1">
              {mentorProfile?.monthlyObjective?.description || 'Click to set or update monthly focus'}
            </p>
          </motion.div>

          {/* Active Bottlenecks */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="glass-card rounded-2xl p-4 relative overflow-hidden border border-amber-500/20 bg-amber-950/20 backdrop-blur-xl group"
          >
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-amber-300 uppercase font-bold tracking-wider block">Active Bottlenecks</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <ul className="text-[10px] text-zinc-300 space-y-0.5 font-mono">
              {activeBottlenecks.map((bot, idx) => (
                <li key={idx} className="truncate text-amber-200/90">• {bot}</li>
              ))}
            </ul>
          </motion.div>

          {/* Daily Time Capacity */}
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={onSetDailyCapacity}
            className="glass-card rounded-2xl p-4 relative overflow-hidden cursor-pointer border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-xl hover:border-emerald-500/40 group"
            title="Click to calibrate today's available hours"
          >
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-emerald-300 uppercase font-bold tracking-wider block">Daily Time Capacity</span>
              <Clock className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-display font-black text-white tracking-tight">{dailyCapHours} <span className="text-xs font-mono text-emerald-400 font-normal">hrs/day</span></span>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">Grounded in reality audit (Click to edit)</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
