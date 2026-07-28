import React from 'react';
import { Chapter } from '../../../types/index';
import { useStudyBrain } from '../../../context/StudyBrainContext';
import { Lock, Clock, AlertTriangle, BookOpen, PenTool, CheckCircle2, SlidersHorizontal } from 'lucide-react';

interface ChapterCommandCardProps {
  chapter: Chapter;
  data: any;
  onExpand?: () => void;
  onNavigate?: (page: string) => void;
}

export const ChapterCommandCard: React.FC<ChapterCommandCardProps> = ({ chapter, data, onExpand }) => {
  const { state, actions } = useStudyBrain();
  const telemetry = state.chapterTelemetryMap ? state.chapterTelemetryMap[chapter.id] : undefined;

  // Extract numerical index from chapter ID (e.g. p1 -> P01, c12 -> C12)
  const prefix = chapter.subject === 'physics' ? 'P' : chapter.subject === 'chemistry' ? 'C' : 'M';
  const numMatch = chapter.id.match(/\d+/);
  const numStr = numMatch ? numMatch[0].padStart(2, '0') : '01';
  const curriculumTag = `${prefix}${numStr}`;

  const syllabusStage = telemetry?.syllabusStage || (chapter.status === 'Mastered' || chapter.completion >= 100 ? 'Mastered' : chapter.completion > 0 ? 'In Progress' : 'Not Started');

  const statusColor = 
    syllabusStage === 'Mastered'
      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
      : chapter.status === 'Revision Due'
      ? 'border-amber-500/40 text-amber-400 bg-amber-950/20'
      : syllabusStage === 'In Progress'
      ? 'border-indigo-500/40 text-indigo-400 bg-indigo-950/20'
      : 'border-zinc-800 text-zinc-400 bg-zinc-900/40';

  const currentLec = telemetry?.currentLecture ?? chapter.currentLecture ?? 0;
  const totalLec = telemetry?.totalLectures ?? chapter.totalLectures ?? 8;
  const theoryPct = telemetry?.strategyRadar.theoryCompletionPercent ?? (totalLec ? Math.min(100, Math.round((currentLec / totalLec) * 100)) : 0);
  const dppComplete = telemetry?.dppComplete ?? chapter.dppComplete;
  const pyqsComplete = telemetry?.pyqsComplete ?? chapter.pyqsComplete;
  const priorityTier = telemetry?.strategyRadar.jeeWeightageRank || (chapter.weightage ? `Tier ${chapter.priority || 2}` : 'Core');

  return (
    <div 
      onClick={onExpand}
      className="group relative overflow-hidden rounded-xl border border-zinc-850 hover:border-indigo-500/40 bg-zinc-950/40 hover:bg-zinc-900/40 backdrop-blur-xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-lg space-y-3"
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          {/* Curriculum Index Tag */}
          <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/50 border border-indigo-800/60 px-2 py-0.5 rounded-lg shrink-0">
            {curriculumTag}
          </span>

          {/* Unit Tag */}
          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-lg shrink-0">
            {telemetry?.unit || chapter.unit}
          </span>

          {/* Status Badge */}
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${statusColor}`}>
            {chapter.status || syllabusStage}
          </span>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-zinc-500">
          <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-semibold">
            {priorityTier}
          </span>
        </div>
      </div>

      {/* Chapter Title */}
      <div className="space-y-1">
        <h3 className="text-base font-display font-bold text-white group-hover:text-indigo-300 transition-colors tracking-tight">
          {chapter.name}
        </h3>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* Lecture Progress */}
        <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 space-y-1.5">
          <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-indigo-400" /> Theory</span>
            <span className="text-indigo-300 font-bold">Lec {currentLec}/{totalLec}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${theoryPct}%` }}
            />
          </div>
        </div>

        {/* DPP Status */}
        <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            <span className="flex items-center gap-1"><PenTool className="w-3 h-3 text-emerald-400" /> DPP</span>
            {dppComplete ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="text-[9px] text-zinc-500">Pending</span>
            )}
          </div>
          <span className="text-[10px] font-mono text-zinc-400 font-bold">
            {dppComplete ? 'Completed ✓' : 'Incomplete'}
          </span>
        </div>

        {/* PYQ Status */}
        <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-purple-400" /> PYQs</span>
            {pyqsComplete ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <span className="text-[9px] text-zinc-500">Pending</span>
            )}
          </div>
          <span className="text-[10px] font-mono text-zinc-400 font-bold">
            {pyqsComplete ? '25+ Solved ✓' : 'Unattempted'}
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-900/80">
        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500">
          <span>Est. {chapter.estimatedRemainingTime || 4}h remaining</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              actions.openChapterEditModal(chapter.id);
            }}
            className="px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            title="Edit Chapter Telemetry"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            Edit
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onExpand) onExpand();
            }}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
};
