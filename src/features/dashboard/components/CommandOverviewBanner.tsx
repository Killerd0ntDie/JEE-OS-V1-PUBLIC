import { useMemo, useState, useRef, useEffect } from 'react';
import { Target, Clock, AlertTriangle, TrendingUp, ChevronDown, PauseCircle, LayoutDashboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { ChapterTelemetry } from '@jee-os/engines';
import { Chapter } from '@/types';
import { MonthlyCampaignBanner } from '@/features/mission/components/MonthlyCampaignBanner';
import { Modal, Button } from '@/components/ui';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';
import { storageAdapter } from '@/services/StorageAdapter';

interface CommandOverviewBannerProps {
  chapters: Chapter[];
  onOpenChapter: (chapterId: string) => void;
  onSetMonthlyObjective?: () => void;
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
  const mentorProfile = useStudyBrainStore(s => s.mentorProfile);
  const rawReadiness = useStudyBrainStore(s => s.projectedReadiness);
  const safeReadiness = typeof rawReadiness === 'number' && !Number.isNaN(rawReadiness) ? rawReadiness : 0;
  const chapterTelemetryMap = useStudyBrainStore(s => s.chapterTelemetryMap);
  const energyLevel = useStudyBrainStore(s => s.energyLevel);
  const settings = useStudyBrainStore(s => s.settings);

  const [internalExpanded, setInternalExpanded] = useState<boolean>(() => {
    return storageAdapter.getSession('jeeos_command_center_override') === 'expanded';
  });
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  
  const [isBottlenecksModalOpen, setIsBottlenecksModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onHoldChapters = useMemo(() => {
    return (chapters || []).filter(c => c.chapterOnHold || c.dppOnHold || c.pyqOnHold);
  }, [chapters]);

  const startedChapters = useMemo(() => {
    return (chapters || []).filter(c => (c.completion > 0 && c.completion < 100) || (c.currentLecture && c.currentLecture > 0) || c.theoryComplete);
  }, [chapters]);

  const allStartedOnHold = startedChapters.length > 0 && startedChapters.every(c => c.chapterOnHold);

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // Close floating dropdown when clicking outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (onToggleExpand) {
          onToggleExpand();
        } else {
          setInternalExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, onToggleExpand]);

  const activeBottlenecks = useMemo(() => {
    const list: string[] = [];
    (Object.values(chapterTelemetryMap || {}) as ChapterTelemetry[]).forEach(t => {
      if (t?.isBottleneck && t.bottleneckReason) {
        list.push(t.bottleneckReason);
      }
    });
    return list.length > 0 ? list : ['None detected. Great momentum!'];
  }, [chapterTelemetryMap]);

  const energyMultiplier = energyLevel === 'Low' ? 0.5 : energyLevel === 'High' ? 1.25 : 1.0;
  // Canonical Authority (Guardrail Rule 5): strictly settings.dailyQuota
  const rawCap = (settings?.dailyQuota && settings.dailyQuota <= 14 ? settings.dailyQuota : 6);
  const dailyCapHours = Math.round(Math.min(14, Math.max(1, rawCap)) * energyMultiplier * 10) / 10;

  return (
    <div ref={containerRef} className="w-full z-10 mb-2 font-sans text-left">
      
      {/* Unified Compact Header Bar */}
      <div 
        onClick={() => {
          audioEngine.playRadioRelayClick().catch(() => {});
          handleToggle();
        }}
        className="w-full bg-surface-1 border border-border-subtle hover:border-border-muted rounded-2xl p-2.5 px-3.5 shadow-xl transition-all duration-150 cursor-pointer select-none group flex items-center justify-between"
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="p-1.5 rounded-lg bg-surface-2 border border-border-subtle text-cyan-400 group-hover:border-cyan-500/40 transition-all shadow-sm"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
          </motion.div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white tracking-wide uppercase">
              PREP INTEL
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            {onHoldChapters.length > 0 && (
              <span className="text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-md font-medium flex items-center gap-1.5 shadow-xs">
                <PauseCircle className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="tabular-nums font-bold">{onHoldChapters.length}</span> On Hold
              </span>
            )}
            <span className="text-cyan-300 bg-cyan-950/40 px-2.5 py-0.5 rounded-md border border-cyan-500/30 font-medium inline-flex items-center gap-1.5 shadow-xs">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
              </span>
              <span className="tabular-nums font-bold">{safeReadiness}%</span> Readiness
            </span>
            <span className="text-emerald-300 bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-500/30 font-medium inline-flex items-center gap-1.5 shadow-xs">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
              </span>
              <span className="tabular-nums font-bold">{dailyCapHours}h</span>/day Cap
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            audioEngine.playRadioRelayClick().catch(() => {});
            handleToggle();
          }}
          className="gap-1.5 font-mono text-xs font-bold"
        >
          <span>{isExpanded ? 'Collapse' : 'Strategy'}</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={springs.snappy}
          >
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </motion.div>
        </Button>
      </div>

      {/* In-Flow Smooth Collapsible Panel (Pushes content down cleanly without obscuring) */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={springs.fluid}
            className="overflow-hidden mt-3"
          >
            <div className="rounded-3xl p-5 md:p-6 space-y-4 text-left relative overflow-hidden bg-surface-1 border border-border-muted shadow-2xl">
              {/* MONTHLY BOSS ENCOUNTER */}
              <MonthlyCampaignBanner />

              {/* Integrated On-Hold Chapters Box */}
              {onHoldChapters.length > 0 && (
                <div className="w-full rounded-2xl p-4 text-left bg-surface-2 border border-amber-500/30 relative overflow-hidden shadow-inner">
                  <div className="flex items-center gap-2 mb-2.5">
                    <PauseCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest">
                      {allStartedOnHold
                        ? 'ALL STARTED CHAPTERS ON HOLD — GENERATE PLAN BY RESUMING'
                        : `${onHoldChapters.length} CHAPTER${onHoldChapters.length > 1 ? 'S' : ''} ON HOLD — NOT BEING SCHEDULED`}
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
                        className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 transition-all active:scale-95 cursor-pointer select-none shadow-sm"
                        title="Click to review or resume"
                      >
                        {c.name}
                        {c.chapterOnHold
                          ? ' (ENTIRE CHAPTER)'
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

              {/* Row of 4 Core Directives & Progress Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Card 1: Target Milestone */}
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  onClick={onSetMonthlyObjective}
                  className="p-4 rounded-xl bg-surface-2 border border-border-subtle hover:border-cyan-500/40 transition-all cursor-pointer group flex flex-col justify-between select-none shadow-sm"
                >
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-cyan-300">Monthly Target</span>
                    <Target className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-sm font-sans font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors uppercase">
                    {mentorProfile?.monthlyObjective?.category || 'Set Monthly Focus'}
                  </span>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1">Milestone goal (Click to edit)</p>
                </motion.div>

                {/* Card 2: Projected Readiness */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border-subtle flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-sky-300">Exam Readiness</span>
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-black text-white tracking-tight tabular-nums">{safeReadiness}%</span>
                    <span className="text-[10px] font-mono text-zinc-400">weighted</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-1.5 border border-border-subtle">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, safeReadiness)}%` }}
                    />
                  </div>
                </div>

                {/* Card 3: Active Bottlenecks Trigger */}
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsBottlenecksModalOpen(true)}
                  className="p-4 rounded-xl bg-surface-2 border border-border-subtle hover:border-amber-500/40 transition-all cursor-pointer group flex flex-col justify-between select-none shadow-sm"
                >
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-amber-300">Bottlenecks</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-sm font-mono font-bold text-amber-300 line-clamp-1 uppercase">
                      {activeBottlenecks.length === 1 && activeBottlenecks[0].includes('None')
                        ? '0 Active'
                        : `${activeBottlenecks.length} Identified`}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1">Diagnostic scan (Click to view)</p>
                </motion.div>

                {/* Card 4: Daily Available Capacity */}
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  onClick={onSetDailyCapacity}
                  className="p-4 rounded-xl bg-surface-2 border border-border-subtle hover:border-emerald-500/40 transition-all cursor-pointer group flex flex-col justify-between select-none shadow-sm"
                >
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-emerald-300">Daily Capacity</span>
                    <Clock className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-black text-white tracking-tight tabular-nums">{dailyCapHours}</span>
                    <span className="text-xs font-mono text-zinc-400">hours/day</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1">Planner quota (Click to configure)</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottlenecks Modal */}
      <Modal
        isOpen={isBottlenecksModalOpen}
        onClose={() => setIsBottlenecksModalOpen(false)}
        zIndex={100}
        className="w-full max-w-lg border border-border-strong rounded-3xl p-6 shadow-2xl text-left bg-surface-elevated"
      >
        <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-lg text-white">Active Syllabus Bottlenecks</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsBottlenecksModalOpen(false)}
            className="p-2 rounded-xl hover:bg-surface-2 text-zinc-400 hover:text-white transition-colors cursor-pointer select-none active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
          {activeBottlenecks.map((reason, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-border-subtle bg-surface-2 space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block">Bottleneck #{idx + 1}</span>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono">{reason}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-border-subtle flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsBottlenecksModalOpen(false)}
          >
            Dismiss
          </Button>
        </div>
      </Modal>
    </div>
  );
}
