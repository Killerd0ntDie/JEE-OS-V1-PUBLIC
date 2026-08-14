import React from 'react';
import { Chapter } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { BookOpen, PenTool, CheckCircle2, SlidersHorizontal, PauseCircle, PlayCircle, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { springs } from '@/constants/motion';

interface ChapterCommandCardProps {
  chapter: Chapter;
  data: any;
  onExpand?: () => void;
}

export const ChapterCommandCard: React.FC<ChapterCommandCardProps> = ({ chapter, data, onExpand }) => {
  const actions = useStudyBrainStore(state => state.actions);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);
  const telemetry = chapterTelemetryMap ? chapterTelemetryMap[chapter.id] : undefined;

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
  const theoryPct = telemetry?.strategyRadar.theoryCompletionPercent ?? (totalLec ? Math.min(100, Math.round((currentLec / totalLec) * 100)) : 0);
  const dppComplete = telemetry?.dppComplete ?? chapter.dppComplete;
  const pyqsComplete = telemetry?.pyqsComplete ?? chapter.pyqsComplete;
  const priorityTier = telemetry?.strategyRadar.jeeWeightageRank || (chapter.weightage ? `Tier ${chapter.priority || 2}` : 'Core');

  return (
    <motion.div 
      whileTap={{ scale: 0.995 }}
      onClick={onExpand}
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
        {/* Lecture Progress */}
        <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-850 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Theory</span>
            <span className="text-indigo-300 font-bold">Lec {currentLec}/{totalLec} ({theoryPct}%)</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${theoryPct}%` }}
            />
          </div>
        </div>

        {/* DPP Status */}
        <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-850 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-emerald-400" /> DPP
            </span>
            <span className="text-xs font-mono font-bold block text-zinc-200">
              {dppComplete ? 'Completed ✓' : 'Incomplete'}
            </span>
          </div>
          {dppComplete ? (
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          ) : (
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">Pending</span>
          )}
        </div>

        {/* PYQ Status */}
        <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-850 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> PYQs
            </span>
            <span className="text-xs font-mono font-bold block text-zinc-200">
              {pyqsComplete ? '25+ Solved ✓' : 'Unattempted'}
            </span>
          </div>
          {pyqsComplete ? (
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            </div>
          ) : (
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">Pending</span>
          )}
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
  );
};
