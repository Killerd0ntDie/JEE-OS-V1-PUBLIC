import React from 'react';
import { Chapter } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { SlidersHorizontal, PauseCircle, PlayCircle, } from 'lucide-react';
import { motion, } from 'motion/react';
import { audioEngine } from '@/utils/audioEngine';
import { Button } from '@/components/ui/Button';

interface ChapterCommandCardProps {
  chapter: Chapter;
  data: any;
  onExpand?: () => void;
}

export const ChapterCommandCard: React.FC<ChapterCommandCardProps> = ({ chapter, data: _data, onExpand }) => {
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
      ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40'
      : 'border-border-muted text-zinc-400 bg-surface-2';

  const currentLec = telemetry?.currentLecture ?? chapter.currentLecture ?? 0;
  const totalLec = telemetry?.totalLectures ?? chapter.totalLectures ?? 8;
  const theoryPct = telemetry?.strategyRadar?.theoryCompletionPercent ?? (totalLec ? Math.min(100, Math.round((currentLec / totalLec) * 100)) : 0);
  const dppComplete = telemetry?.dppComplete ?? chapter.dppComplete;
  const pyqsComplete = telemetry?.pyqsComplete ?? chapter.pyqsComplete;
  const priorityTier = telemetry?.strategyRadar?.jeeWeightageRank || (chapter.weightage ? `Tier ${chapter.priority || 2}` : 'Core');
  const retentionScore = telemetry?.strategyRadar?.retentionConfidenceScore ?? chapter.revisionProgress?.retentionScore ?? (chapter.status === 'Mastered' ? 95 : theoryPct > 0 ? 78 : 45);

  return (
    <div className="relative">
      <motion.div 
        whileTap={{ scale: 0.995 }}
        onClick={onExpand}
        className="group relative overflow-hidden rounded-xl border border-border-subtle hover:border-border-strong bg-surface-1 hover:bg-surface-2 p-4 sm:p-5 transition-all duration-150 cursor-pointer shadow-lg space-y-3.5 text-left select-none"
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
        <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span>Est. {chapter.estimatedRemainingTime || 4}h remaining</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={chapter.chapterOnHold ? 'secondary' : 'ghost'}
              size="xs"
              onClick={async (e) => {
                e.stopPropagation();
                audioEngine.playMechanicalKey('click').catch(() => {});
                await actions.updateChapter(chapter.id, { chapterOnHold: !chapter.chapterOnHold });
              }}
              title={chapter.chapterOnHold ? 'Release chapter hold' : 'Put entire chapter on hold'}
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>{chapter.chapterOnHold ? 'On Hold' : 'Hold'}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                audioEngine.playMechanicalKey('clack').catch(() => {});
                actions.openChapterEditModal(chapter.id);
              }}
              title="Configure Chapter Telemetry & Practice"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Configure</span>
            </Button>

            {chapter.status !== 'Learning' && chapter.status !== 'Mastered' && chapter.completion < 100 && (
              <Button
                type="button"
                variant="primary"
                size="xs"
                onClick={async (e) => {
                  e.stopPropagation();
                  audioEngine.playMechanicalKey('clack').catch(() => {});
                  await actions.updateChapterData(chapter.id, { status: 'Learning' });
                }}
                title="Start learning this chapter"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Start</span>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
