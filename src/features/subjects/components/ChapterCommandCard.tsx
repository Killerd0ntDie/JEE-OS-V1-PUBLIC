import React, { useState, useRef, useEffect } from 'react';
import { Chapter } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { BookOpen, PenTool, CheckCircle2, SlidersHorizontal, PauseCircle, PlayCircle, ChevronRight, Sparkles, Zap, Brain, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

interface ChapterCommandCardProps {
  chapter: Chapter;
  data: any;
  onExpand?: () => void;
}

export const ChapterCommandCard: React.FC<ChapterCommandCardProps> = ({ chapter, data, onExpand }) => {
  const actions = useStudyBrainStore(state => state.actions);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);
  const telemetry = chapterTelemetryMap ? chapterTelemetryMap[chapter.id] : undefined;

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 450);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Use serial number for custom chapters, otherwise extract numerical index from chapter ID
  const curriculumTag = chapter.serialNumber ? (chapter.serialNumber.length > 10 ? chapter.serialNumber.slice(0, 10) + '...' : chapter.serialNumber) : (() => {
    const numMatch = chapter.id.match(/\d+/);
    const numStr = numMatch ? numMatch[0].padStart(2, '0') : '01';
    return `CH${numStr}`;
  })();

  const syllabusStage = telemetry?.syllabusStage || (chapter.status === 'Mastered' || chapter.completion >= 100 ? 'Mastered' : chapter.completion > 0 ? 'In Progress' : 'Not Started');

  const statusColor = 
    syllabusStage === 'Mastered'
      ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40'
      : chapter.status === 'Revision Due'
      ? 'border-amber-500/40 text-amber-300 bg-amber-950/40'
      : syllabusStage === 'In Progress'
      ? 'border-indigo-500/40 text-indigo-300 bg-indigo-950/40'
      : 'border-zinc-800 text-zinc-400 bg-zinc-900/60';

  const currentLec = telemetry?.currentLecture ?? chapter.currentLecture ?? 0;
  const totalLec = telemetry?.totalLectures ?? chapter.totalLectures ?? 8;
  const theoryPct = telemetry?.strategyRadar?.theoryCompletionPercent ?? (totalLec ? Math.min(100, Math.round((currentLec / totalLec) * 100)) : 0);
  const dppComplete = telemetry?.dppComplete ?? chapter.dppComplete;
  const pyqsComplete = telemetry?.pyqsComplete ?? chapter.pyqsComplete;
  const priorityTier = telemetry?.strategyRadar?.jeeWeightageRank || (chapter.weightage ? `Tier ${chapter.priority || 2}` : 'Core');
  const retentionScore = telemetry?.strategyRadar?.retentionConfidenceScore ?? chapter.revisionProgress?.retentionScore ?? (chapter.status === 'Mastered' ? 95 : theoryPct > 0 ? 78 : 45);

  return (
    <div className="relative">
      {/* Floating Hover Quick-Peek Telemetry Card (Opens after 450ms hover) */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full left-0 right-0 mb-2 p-4 rounded-2xl border border-indigo-500/40 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl z-40 space-y-3 pointer-events-auto select-none"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 font-mono text-xs">
              <span className="text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> {chapter.name} Telemetry
              </span>
              <span className="text-[10px] text-zinc-400 font-semibold">{curriculumTag} • {telemetry?.unit || chapter.unit}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2.5 font-mono text-xs text-center">
              <div className="p-2 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                <span className="text-zinc-500 block text-[9.5px] uppercase tracking-wider font-semibold">Memory Retention</span>
                <span className="text-indigo-300 font-bold text-sm">{retentionScore}%</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                <span className="text-zinc-500 block text-[9.5px] uppercase tracking-wider font-semibold">Estimated Study</span>
                <span className="text-emerald-300 font-bold text-sm">{chapter.estimatedRemainingTime || 4}h Left</span>
              </div>
              <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/20">
                <span className="text-zinc-500 block text-[9.5px] uppercase tracking-wider font-semibold">Problem Accuracy</span>
                <span className="text-amber-300 font-bold text-sm">{dppComplete ? '84% Avg' : 'Pending'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playMechanicalKey('click').catch(() => {});
                  actions.openChapterEditModal(chapter.id);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 cursor-pointer flex items-center gap-1"
              >
                <span>Edit chapter notes & formulas</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              <span className="text-zinc-500 text-[10px]">Click card to inspect</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        whileTap={{ scale: 0.995 }}
        onClick={onExpand}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative overflow-hidden rounded-2xl border border-zinc-850/80 hover:border-indigo-500/40 bg-zinc-950/40 hover:bg-zinc-900/40 backdrop-blur-xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-lg space-y-3.5 text-left select-none"
      >
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Curriculum Index Tag */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.openChapterEditModal(chapter.id);
              }}
              className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-800/60 px-2.5 py-0.5 rounded-lg shrink-0 cursor-pointer hover:bg-indigo-600/30 hover:text-white transition-colors"
              title="Click to configure chapter serial & priority"
            >
              {curriculumTag}
            </button>

            {/* Unit Tag */}
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-2.5 py-0.5 rounded-lg shrink-0">
              {telemetry?.unit || chapter.unit}
            </span>

            {/* Status Badge */}
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${statusColor}`}>
              {chapter.status || syllabusStage}
            </span>

            {chapter.isCustom && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                CUSTOM
              </span>
            )}
            {(chapter.chapterOnHold || chapter.dppOnHold || chapter.pyqOnHold) && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300">
                {chapter.chapterOnHold ? 'CHAPTER HOLD' : 'ON HOLD'}
              </span>
            )}
          </div>

          {/* Priority Tier Tag */}
          <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
            <span className="bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-lg text-zinc-400 font-semibold">
              {priorityTier}
            </span>
          </div>
        </div>

        {/* Chapter Title */}
        <div>
          <h3 className="text-base font-display font-bold text-white group-hover:text-indigo-300 transition-colors tracking-tight">
            {chapter.name}
          </h3>
        </div>

        {/* 4-SEGMENT HOLOGRAPHIC LED TELEMETRY GAUGE */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-xl bg-black/40 border border-white/5 font-mono text-xs">
          {/* Segment 1: Theory [🔵] */}
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
            theoryPct >= 100 
              ? 'bg-blue-950/50 border-blue-500/40 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
              : theoryPct > 0 
              ? 'bg-blue-950/30 border-blue-500/20 text-blue-400'
              : 'bg-zinc-950/40 border-white/5 text-zinc-500'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              theoryPct >= 100 
                ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' 
                : theoryPct > 0 
                ? 'bg-blue-500 animate-pulse' 
                : 'bg-zinc-700'
            }`} />
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] text-zinc-500 uppercase leading-none">Theory</span>
              <span className="font-bold truncate text-[11px]">Lec {currentLec}/{totalLec}</span>
            </div>
          </div>

          {/* Segment 2: DPP [🟢] */}
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
            dppComplete
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
              : 'bg-zinc-950/40 border-white/5 text-zinc-500'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              dppComplete 
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' 
                : 'bg-zinc-700'
            }`} />
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] text-zinc-500 uppercase leading-none">DPP Practice</span>
              <span className="font-bold truncate text-[11px]">{dppComplete ? 'Complete ✓' : 'Pending'}</span>
            </div>
          </div>

          {/* Segment 3: PYQs [🟡] */}
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
            pyqsComplete
              ? 'bg-amber-950/50 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
              : 'bg-zinc-950/40 border-white/5 text-zinc-500'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              pyqsComplete 
                ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' 
                : 'bg-zinc-700'
            }`} />
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] text-zinc-500 uppercase leading-none">PYQ Drill</span>
              <span className="font-bold truncate text-[11px]">{pyqsComplete ? '25+ Solved ✓' : 'Unattempted'}</span>
            </div>
          </div>

          {/* Segment 4: Memory Retention / Decay [🔴/🟢] */}
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
            chapter.status === 'Revision Due' || (retentionScore !== undefined && retentionScore < 60)
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.25)] animate-pulse'
              : syllabusStage === 'Mastered'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-zinc-950/40 border-white/5 text-zinc-500'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              chapter.status === 'Revision Due' || (retentionScore !== undefined && retentionScore < 60)
                ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                : syllabusStage === 'Mastered'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-zinc-700'
            }`} />
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] text-zinc-500 uppercase leading-none">Retention</span>
              <span className="font-bold truncate text-[11px]">
                {chapter.status === 'Revision Due' ? 'Decay Alert' : `${retentionScore}% Secure`}
              </span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-850/80">
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span>Est. {chapter.estimatedRemainingTime || 4}h remaining</span>
          </div>

          <div className="flex items-center gap-2">
            {chapter.status !== 'Learning' && chapter.status !== 'Mastered' && chapter.completion < 100 && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                transition={springs.snappy}
                onClick={async (e) => {
                  e.stopPropagation();
                  audioEngine.playMechanicalKey('clack').catch(() => {});
                  await actions.updateChapterData(chapter.id, { status: 'Learning' });
                }}
                className="px-3 py-1 rounded-xl bg-emerald-950/40 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Start learning this chapter"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                START
              </motion.button>
            )}

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              onClick={async (e) => {
                e.stopPropagation();
                audioEngine.playMechanicalKey('click').catch(() => {});
                await actions.updateChapter(chapter.id, { chapterOnHold: !chapter.chapterOnHold });
              }}
              className={`px-3 py-1 rounded-xl border font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                chapter.chapterOnHold
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title={chapter.chapterOnHold ? 'Release chapter hold' : 'Put entire chapter on hold'}
            >
              <PauseCircle className="w-3.5 h-3.5" />
              {chapter.chapterOnHold ? 'ON HOLD' : 'HOLD'}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              onClick={(e) => {
                e.stopPropagation();
                audioEngine.playMechanicalKey('clack').catch(() => {});
                actions.openChapterEditModal(chapter.id);
              }}
              className="px-3.5 py-1 rounded-xl bg-indigo-950/50 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Configure Chapter Telemetry & Practice"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Configure</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
