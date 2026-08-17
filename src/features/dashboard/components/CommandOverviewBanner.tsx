import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Target, Clock, AlertTriangle, TrendingUp, ChevronDown, ChevronUp, PauseCircle, LayoutDashboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { ChapterTelemetry } from '@jee-os/engines';
import { Chapter } from '@/types';
import { MonthlyCampaignBanner } from '@/features/mission/components/MonthlyCampaignBanner';
import { Modal } from '@/components/ui/Modal';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

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
  const mentorProfile = useStudyBrainStore(s => s.mentorProfile);
  const projectedReadiness = useStudyBrainStore(s => s.projectedReadiness);
  const chapterTelemetryMap = useStudyBrainStore(s => s.chapterTelemetryMap);

  const [internalExpanded, setInternalExpanded] = useState<boolean>(() => {
    return sessionStorage.getItem('jee_command_center_override') === 'expanded';
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
      if (t && t.isBottleneck && t.bottleneckReason) {
        list.push(t.bottleneckReason);
      }
    });
    return list.length > 0 ? list : ['None detected. Great momentum!'];
  }, [chapterTelemetryMap]);

  const dailyCapHours = mentorProfile?.dailyAvailableHours || 6.5;

  return (
    <div ref={containerRef} className="w-full z-10 mb-2 font-sans text-left">
      
      {/* Unified Compact Header Bar */}
      <div 
        onClick={() => {
          audioEngine.playRadioRelayClick().catch(() => {});
          handleToggle();
        }}
        style={{
          background: 'rgba(10, 14, 23, 0.78)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          borderTop: '1.5px solid rgba(255, 255, 255, 0.20)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
        }}
        className="w-full hover:border-indigo-500/40 rounded-2xl p-2.5 px-3.5 shadow-sm transition-all duration-150 cursor-pointer select-none group flex items-center justify-between"
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <div className="p-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 group-hover:border-indigo-500/60 transition-colors shadow-sm">
            <LayoutDashboard className="w-3.5 h-3.5" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white tracking-wide uppercase">
              <span className="eva-japanese-badge">全般統制 // </span>PREP COMMAND
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            {onHoldChapters.length > 0 && (
              <span className="text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-lg font-medium flex items-center gap-1">
                <PauseCircle className="w-3 h-3 text-amber-400" />
                {onHoldChapters.length} On Hold
              </span>
            )}
            <span className="text-sky-300 bg-sky-950/40 px-2.5 py-0.5 rounded-lg border border-sky-500/30 font-medium">
              {projectedReadiness}% Readiness
            </span>
            <span className="text-emerald-300 bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 font-medium">
              {dailyCapHours}h/day Cap
            </span>
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          transition={springs.snappy}
          onClick={(e) => {
            e.stopPropagation();
            audioEngine.playRadioRelayClick().catch(() => {});
            handleToggle();
          }}
          className="flex items-center gap-1.5 text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 px-3 py-1 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <span>{isExpanded ? 'Collapse' : 'Overview'}</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={springs.snappy}
          >
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </motion.div>
        </motion.button>
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
            <div 
              style={{
                background: 'rgba(10, 14, 23, 0.90)',
                backdropFilter: 'blur(24px) saturate(190%)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
              }}
              className="rounded-3xl p-5 md:p-6 space-y-4 text-left relative overflow-hidden"
            >
            {/* Top Hazard Caution Tape Ribbon */}
            <div 
              className="absolute top-0 inset-x-0 h-1 opacity-75 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(-45deg, #6366f1 0px, #6366f1 8px, transparent 8px, transparent 16px)'
              }}
            />

            {/* Caliper Crosshairs */}
            <span className="absolute top-2.5 left-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
            <span className="absolute top-2.5 right-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
            <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
            <span className="absolute bottom-2.5 right-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>

            {/* MONTHLY BOSS ENCOUNTER */}
            <MonthlyCampaignBanner />

            {/* Integrated On-Hold Chapters Box */}
            {onHoldChapters.length > 0 && (
              <div 
                style={{
                  background: 'rgba(25, 16, 10, 0.85)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderTop: '1.5px solid rgba(245, 158, 11, 0.65)'
                }}
                className="w-full rounded-2xl p-4 text-left shadow-inner relative overflow-hidden"
              >
                {/* Top Amber Hazard Stripes */}
                <div 
                  className="absolute top-0 inset-x-0 h-0.5 opacity-70 pointer-events-none"
                  style={{
                    background: 'repeating-linear-gradient(-45deg, #f59e0b 0px, #f59e0b 8px, transparent 8px, transparent 16px)'
                  }}
                />
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
                      className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 transition-all active:scale-95 cursor-pointer select-none shadow-sm"
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
                style={{
                  background: 'rgba(12, 16, 26, 0.85)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: '1.5px solid rgba(255, 255, 255, 0.20)'
                }}
                className="p-4 rounded-2xl hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col justify-between select-none shadow-sm relative overflow-hidden"
              >
                <span className="absolute top-2 left-2 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
                <span className="absolute top-2 right-2 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-indigo-300">Monthly Target</span>
                  <Target className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-sm font-tactical font-black text-white line-clamp-1 group-hover:text-indigo-300 transition-colors uppercase">
                  {mentorProfile?.monthlyObjective?.category || 'Set Monthly Focus'}
                </span>
                <p className="text-[10px] text-zinc-400 font-mono mt-1">Milestone goal (Click to edit)</p>
              </motion.div>

              {/* Card 2: Projected Readiness */}
              <div 
                style={{
                  background: 'rgba(12, 16, 26, 0.85)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: '1.5px solid rgba(255, 255, 255, 0.20)'
                }}
                className="p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden"
              >
                <span className="absolute top-2 left-2 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
                <span className="absolute top-2 right-2 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-sky-300">Exam Readiness</span>
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-black text-white tracking-tight">{projectedReadiness}%</span>
                  <span className="text-[10px] font-mono text-zinc-400">weighted</span>
                </div>
                <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/5">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, projectedReadiness)}%` }}
                  />
                </div>
              </div>

              {/* Card 3: Active Bottlenecks Trigger */}
              <motion.div 
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsBottlenecksModalOpen(true)}
                style={{
                  background: 'rgba(12, 16, 26, 0.85)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: '1.5px solid rgba(255, 255, 255, 0.20)'
                }}
                className="p-4 rounded-2xl hover:border-amber-500/40 transition-all cursor-pointer group flex flex-col justify-between select-none shadow-sm relative overflow-hidden"
              >
                <span className="absolute top-2 left-2 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
                <span className="absolute top-2 right-2 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
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
                style={{
                  background: 'rgba(12, 16, 26, 0.85)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: '1.5px solid rgba(255, 255, 255, 0.20)'
                }}
                className="p-4 rounded-2xl hover:border-emerald-500/40 transition-all cursor-pointer group flex flex-col justify-between select-none shadow-sm relative overflow-hidden"
              >
                <span className="absolute top-2 left-2 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
                <span className="absolute top-2 right-2 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-emerald-300">Daily Capacity</span>
                  <Clock className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-black text-white tracking-tight">{dailyCapHours}</span>
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
        className="w-full max-w-lg bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 shadow-2xl text-left"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-lg text-white">Active Syllabus Bottlenecks</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsBottlenecksModalOpen(false)}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer select-none active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
          {activeBottlenecks.map((reason, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-white/10 bg-zinc-950/60 space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block">Bottleneck #{idx + 1}</span>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono">{reason}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={() => setIsBottlenecksModalOpen(false)}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-mono text-xs font-bold transition-colors cursor-pointer active:scale-95 select-none"
          >
            Dismiss
          </button>
        </div>
      </Modal>
    </div>
  );
}
