import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  Coffee, 
  Clock, 
  Trash2, 
  Play, 
  Flame, 
  Moon, 
  SlidersHorizontal, 
  Edit, 
  ChevronDown 
} from 'lucide-react';
import { springs } from '@/constants/motion';
import { TodayMission, Chapter } from '@/types/index';
import { audioEngine } from '@/utils/audioEngine';

export interface TimelineMissionItemProps {
  mission: TodayMission;
  chap?: Chapter;
  chapterTelemetryMap?: Record<string, any>;
  isLive: boolean;
  isNextUp: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  isDismissed: boolean;
  isResumable: boolean;
  sessionState: 'idle' | 'active' | 'paused';
  selectedMissionId?: string | null;
  badgeStyle: string;
  slotText?: string;
  isOverBudget: boolean;
  onSelect: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onToggleExpand: () => void;
  onEditMission?: () => void;
  onStartSession: () => void;
  onOpenChapterEditModal?: (chapterId: string) => void;
  handleResetSession: () => void;
}

export const TimelineMissionItem = React.memo(function TimelineMissionItem({
  mission,
  chap,
  chapterTelemetryMap,
  isLive,
  isNextUp,
  isSelected,
  isExpanded,
  isDismissed,
  isResumable,
  sessionState,
  selectedMissionId,
  badgeStyle,
  slotText,
  isOverBudget,
  onSelect,
  onToggleComplete,
  onDelete,
  onToggleExpand,
  onEditMission,
  onStartSession,
  onOpenChapterEditModal,
  handleResetSession
}: TimelineMissionItemProps) {
  const isBreak = (mission.subject as string) === 'break' || (mission.type as string) === 'BREAK' || mission.taskName?.toLowerCase().includes('break');

  if (isBreak) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={springs.snappy}
        key={mission.id}
        onClick={() => {
          if (sessionState !== 'idle' && selectedMissionId !== mission.id) {
            handleResetSession();
          }
          onSelect();
        }}
        style={{
          background: isLive ? 'rgba(28, 18, 10, 0.92)' : 'rgba(20, 14, 10, 0.85)',
          backdropFilter: 'blur(20px)',
          border: isLive ? '1.5px solid rgba(245, 158, 11, 0.75)' : '1px solid rgba(245, 158, 11, 0.3)',
          borderTop: isLive ? '2.5px solid rgba(245, 158, 11, 0.95)' : '1.5px solid rgba(245, 158, 11, 0.6)',
          boxShadow: isLive
            ? '0 0 35px rgba(245, 158, 11, 0.35), 0 0 70px rgba(245, 158, 11, 0.16), 0 16px 40px rgba(0, 0, 0, 0.8), inset 0 0 25px rgba(245, 158, 11, 0.12)'
            : '0 8px 25px rgba(0, 0, 0, 0.5)'
        }}
        className={`group transition-all duration-150 cursor-pointer focus:outline-none flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 py-3 rounded-2xl relative mb-3 overflow-hidden ${
          isDismissed
            ? 'opacity-40 grayscale cursor-default'
            : mission.completed
            ? 'opacity-60'
            : 'hover:border-amber-500/50'
        }`}
      >
        {/* Live Break Radiant Atmosphere */}
        {isLive && (
          <div 
            className="absolute inset-0 bg-radial from-amber-500/12 via-amber-500/4 to-transparent pointer-events-none" 
          />
        )}

        {/* Top Amber Hazard Stripes Ribbon */}
        <div 
          className="absolute top-0 inset-x-0 h-1 opacity-75 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(-45deg, #f59e0b 0px, #f59e0b 8px, transparent 8px, transparent 16px)'
          }}
        />
        {/* Caliper Crosshairs */}
        <span className="absolute top-2 left-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
        <span className="absolute top-2 right-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
        <span className="absolute bottom-2 left-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
        <span className="absolute bottom-2 right-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>

        <div className="flex items-center gap-3 relative z-10">
          {!isDismissed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete();
              }}
              className={`rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                mission.completed
                  ? 'w-5 h-5 bg-amber-500 border-amber-400 text-zinc-950 font-bold'
                  : 'w-5 h-5 border-zinc-700 bg-zinc-950/50 text-transparent hover:border-amber-500 hover:text-amber-500/60'
              }`}
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </button>
          )}
          {isDismissed && (
            <div className="w-5 h-5 rounded-full border border-red-900/40 bg-red-950/30 flex items-center justify-center shrink-0">
              <X className="w-3 h-3 text-red-500/60" />
            </div>
          )}
          
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isLive ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : mission.completed ? 'bg-amber-950/40 text-amber-600' : 'bg-zinc-900/80 text-zinc-400 border border-white/10'}`}>
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <p className={`text-xs font-tactical font-bold tracking-tight uppercase ${isLive ? 'text-amber-300' : mission.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
              {mission.taskName}
            </p>
            <div className="flex items-center gap-2 text-xs opacity-75 font-mono text-zinc-400 mt-0.5">
              {isLive && <span className="text-amber-400 font-bold tracking-wider animate-pulse">LIVE NOW</span>}
              {slotText && (
                <span className="text-amber-400/80 flex items-center gap-1">
                  <Clock className="w-3 h-3 inline" /> {slotText}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 ml-auto relative z-10 font-mono">
          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-lg">
            {mission.duration}m
          </span>
          {!isDismissed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-6 h-6 rounded-lg border border-white/10 bg-zinc-950/60 hover:bg-red-500/20 hover:border-red-500/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
              title="Delete break"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {isLive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartSession();
              }}
              className="px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.4)] text-xs opacity-75 font-mono font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-3 h-3 fill-current" /> START
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Chapter metadata & Ebbinghaus decay telemetry
  const chapTelemetry = chap && chapterTelemetryMap ? chapterTelemetryMap[chap.id] : null;
  const retentionScore = chapTelemetry?.strategyRadar?.retentionConfidenceScore 
    ?? chap?.revisionProgress?.retentionScore 
    ?? (chap?.confidence !== undefined ? (chap.confidence >= 4 ? 88 : chap.confidence >= 2 ? 65 : 42) : (chap?.completion && chap.completion > 0 ? 70 : undefined));

  const currentLec = chap?.currentLecture ?? 0;
  const totalLec = chap?.totalLectures ?? 12;
  const lecPercent = totalLec > 0 ? Math.min(100, Math.round((currentLec / totalLec) * 100)) : 0;
  const weightageMarks = (chap?.weightage || 4) * 3;
  const unitName = chap?.unit || 'Core Module';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={springs.snappy}
      key={mission.id}
      onClick={() => {
        if (sessionState !== 'idle' && selectedMissionId !== mission.id) {
          handleResetSession();
        }
        onSelect();
      }}
      style={{
        background: isLive
          ? 'rgba(8, 26, 18, 0.92)'
          : isSelected
          ? 'rgba(18, 14, 28, 0.88)'
          : 'rgba(10, 14, 23, 0.80)',
        backdropFilter: 'blur(24px) saturate(190%)',
        border: isLive
          ? '1.5px solid rgba(16, 185, 129, 0.75)'
          : isSelected
          ? '1.5px solid rgba(99, 102, 241, 0.5)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: isLive
          ? '2.5px solid rgba(16, 185, 129, 0.95)'
          : isSelected
          ? '2px solid rgba(99, 102, 241, 0.75)'
          : '1.5px solid rgba(255, 255, 255, 0.18)',
        boxShadow: isLive
          ? '0 0 35px rgba(16, 185, 129, 0.4), 0 0 70px rgba(16, 185, 129, 0.2), 0 20px 50px rgba(0, 0, 0, 0.8), inset 0 0 25px rgba(16, 185, 129, 0.12)'
          : isSelected
          ? '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.1)'
          : '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}
      className={`group transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 active:scale-[0.99] relative overflow-hidden ${
        isLive
          ? 'p-4.5 sm:p-5 rounded-2xl mb-3'
          : isDismissed
          ? 'p-3.5 rounded-2xl opacity-40 cursor-default'
          : mission.completed
          ? 'p-3.5 rounded-2xl opacity-60'
          : 'p-4 rounded-2xl hover:border-indigo-500/40 mb-2.5'
      }`}
    >
      {/* Live Sortie Ambient Luminous Atmosphere */}
      {isLive && (
        <div 
          className="absolute inset-0 bg-radial from-emerald-500/15 via-emerald-500/5 to-transparent pointer-events-none" 
        />
      )}

      {/* Top Hazard Warning Stripes Ribbon for Live Sortie */}
      {isLive && (
        <div 
          className="absolute top-0 inset-x-0 h-1 opacity-85 pointer-events-none"
          style={{
            background: mission.subject === 'maths' 
              ? 'repeating-linear-gradient(-45deg, #a855f7 0px, #a855f7 8px, transparent 8px, transparent 16px)'
              : mission.subject === 'physics'
              ? 'repeating-linear-gradient(-45deg, #0ea5e9 0px, #0ea5e9 8px, transparent 8px, transparent 16px)'
              : 'repeating-linear-gradient(-45deg, #10b981 0px, #10b981 8px, transparent 8px, transparent 16px)'
          }}
        />
      )}

      {/* Caliper Crosshairs */}
      <span className="absolute top-2 left-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute top-2 right-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute bottom-2 left-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute bottom-2 right-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <div className="flex items-start justify-between gap-4 relative z-10">
        
        {/* Circular Checkbox — hidden for dismissed missions */}
        {!isDismissed && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.14 }}
            whileTap={{ scale: 0.88 }}
            transition={springs.snappy}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete();
            }}
            className={`rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
              isLive ? 'w-6 h-6 mt-0.5 border-2 border-emerald-400' : 'w-5 h-5'
            } ${
              mission.completed
                ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : isLive
                ? 'border-emerald-400 bg-transparent text-transparent hover:text-emerald-400/60'
                : 'border-zinc-700 hover:border-indigo-400 bg-transparent text-transparent hover:text-indigo-400/60'
            }`}
            title={mission.completed ? "Mark incomplete" : "Mark complete"}
          >
            <Check className={`${isLive ? 'w-3.5 h-3.5' : 'w-3 h-3'} stroke-[3]`} />
          </motion.button>
        )}
        {isDismissed && (
          <div className="w-5 h-5 rounded-full border border-red-900/40 bg-red-950/30 flex items-center justify-center shrink-0">
            <X className="w-3 h-3 text-red-500/60" />
          </div>
        )}

        {/* Content Area */}
        <div className={`${isLive ? 'space-y-2.5' : 'space-y-2'} min-w-0 flex-1`}>
          {/* Consolidated Decluttered 1-Row Label Header with Merged Time */}
          <div className="flex items-center gap-2 flex-wrap text-xs leading-none">
            {isDismissed && (
              <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-red-950/30 text-red-400/70 border-red-900/30 text-xs opacity-75 shrink-0">
                Dismissed
              </span>
            )}

            {/* Subject Badge */}
            <span className={`font-bold uppercase tracking-wider ${isLive ? 'px-2.5 py-0.5 text-xs opacity-90' : 'px-2 py-0.5 text-xs opacity-75'} rounded-md border shrink-0 ${badgeStyle}`}>
              {mission.subject.toUpperCase()}
            </span>

            {/* Merged Status + Time Pill for Live & Next Up */}
            {isLive ? (
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm text-xs opacity-90 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE {slotText ? `· ${slotText}` : ''}
              </span>
            ) : isNextUp ? (
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 text-xs opacity-75 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                NEXT UP {slotText ? `· ${slotText}` : ''}
              </span>
            ) : slotText ? (
              <span className="text-zinc-400 flex items-center gap-1 text-xs font-mono shrink-0">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>{slotText}</span>
              </span>
            ) : null}

            <span className="text-zinc-600 hidden sm:inline">•</span>

            {/* Mission Type */}
            <span className="text-zinc-300 font-sans text-xs shrink-0">
              {mission.type}
            </span>

            <span className="text-zinc-600">•</span>

            {/* Marks Leverage */}
            <span className="text-amber-400 font-medium flex items-center gap-1 text-xs shrink-0">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>+{weightageMarks}M</span>
            </span>

            {/* Urgent Memory Decay Badge */}
            {retentionScore !== undefined && (retentionScore < 60 || mission.type === 'Revise Formulas' || mission.type === 'Review Mistakes') && (
              <span 
                className={`px-1.5 py-0.5 rounded border flex items-center gap-1 font-mono text-xs opacity-75 font-bold ${
                  retentionScore < 50 
                    ? 'bg-rose-950/50 border-rose-500/40 text-rose-300 animate-pulse' 
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}
                title={`Ebbinghaus Retention Index: ${retentionScore}% retention`}
              >
                <span>{retentionScore}% Memory</span>
              </span>
            )}

            {/* Bedtime badge */}
            {!mission.completed && !isDismissed && isOverBudget && (
              <span className="text-amber-400 bg-amber-950/30 border border-amber-800/40 text-xs opacity-75 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Moon className="w-2.5 h-2.5 text-amber-400" /> Bedtime
              </span>
            )}
          </div>

          {/* Title */}
          <p className={`tracking-tight transition-colors ${
              isLive
                ? 'text-lg sm:text-xl font-tactical font-black text-white group-hover:text-emerald-300 leading-snug'
                : isDismissed ? 'text-xs md:text-sm font-tactical text-zinc-600 line-through' 
                : mission.completed ? 'text-xs md:text-sm font-tactical text-zinc-400 line-through' 
                : 'text-xs md:text-sm font-tactical font-bold text-zinc-100 group-hover:text-indigo-300'
            }`}>
            {mission.taskName}
          </p>

          {/* Sub-line */}
          <div className={`flex items-center gap-2 text-zinc-400 flex-wrap ${isLive ? 'text-xs sm:text-sm' : 'text-xs'} font-sans`}>
            <span>
              Unit: <strong className="text-zinc-200 font-medium">{unitName}</strong>
            </span>

            {chap && (
              <>
                <span className="text-zinc-600">•</span>
                <div className="flex items-center gap-1.5 font-mono text-xs opacity-75 shrink-0">
                  <span className="text-zinc-400">Lec {currentLec}/{totalLec}</span>
                  <div className={`${isLive ? 'w-20 h-1.5' : 'w-16 h-1.5'} bg-zinc-950 rounded-full overflow-hidden border border-white/10`}>
                    <div
                      className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${lecPercent}%` }}
                    />
                  </div>
                  <span className="text-indigo-400 font-medium font-mono">{lecPercent}%</span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons: 1-Row Sleek Layout */}
          <div className="pt-2 flex items-center gap-2 flex-wrap font-mono">
            {isLive && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={springs.snappy}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartSession();
                }}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] border border-emerald-400/40 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>{isResumable ? 'Resume Mission' : 'Start Mission'}</span>
              </motion.button>
            )}

            {chap && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                transition={springs.snappy}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChapterEditModal?.(chap.id);
                }}
                className="text-xs bg-zinc-950/70 hover:bg-zinc-850 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl cursor-pointer transition-colors border border-white/10 flex items-center gap-1.5 shadow-sm font-mono font-bold uppercase select-none"
                title="Configure Chapter"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Configure</span>
              </motion.button>
            )}

            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              transition={springs.snappy}
              onClick={(e) => {
                e.stopPropagation();
                onEditMission?.();
              }}
              className="text-xs bg-zinc-950/70 hover:bg-zinc-850 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl cursor-pointer transition-colors border border-white/10 flex items-center gap-1.5 shadow-sm font-mono font-bold uppercase select-none"
              title="Edit Mission Details"
            >
              <Edit className="w-3.5 h-3.5 text-zinc-400" />
              <span>Edit</span>
            </motion.button>
          </div>
        </div>

        {/* Duration & Chevron */}
        <div className="flex items-center gap-2 shrink-0 font-mono">
          <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-950/80 border border-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3 h-3 text-indigo-400" /> {mission.duration}m
          </span>

          {/* Delete button — hidden for dismissed missions */}
          {!isDismissed && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={springs.snappy}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-red-500/20 hover:border-red-500/40 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
              title="Delete mission"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          )}

          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={springs.snappy}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900/40 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={springs.snappy}>
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </motion.button>
        </div>

      </div>

      {/* Expandable Details Drawer */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-zinc-900/60"
          >
            <div className="px-3 py-2.5 mt-2.5 bg-zinc-950/40 text-xs text-zinc-400 space-y-2 rounded-xl">
              <div className="flex items-center justify-between text-zinc-300 font-mono text-xs opacity-75">
                <span>Estimated Time: <strong className="text-white">{mission.duration} mins</strong></span>
                <span>XP Award: <strong className="text-indigo-400">+{mission.xp} XP</strong></span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onToggleComplete();
                    onToggleExpand();
                  }}
                  className={`text-xs opacity-75 font-bold py-1.5 px-3 rounded-md transition-all cursor-pointer border active:scale-[0.98] hover:scale-[1.02] ${
                    mission.completed 
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60 hover:bg-emerald-950/60 hover:text-emerald-300' 
                      : 'bg-zinc-800 hover:bg-emerald-600/90 text-zinc-300 hover:text-white border-zinc-700 hover:border-emerald-500 shadow-sm'
                  }`}
                >
                  {mission.completed ? 'Mark Incomplete' : 'Complete Module'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    onToggleExpand();
                  }}
                  className="bg-transparent hover:bg-red-950/40 text-zinc-400 hover:text-red-300 text-xs opacity-75 py-1.5 px-3 rounded-md transition-all active:scale-[0.98] hover:scale-[1.02] cursor-pointer border border-zinc-800 hover:border-red-900/60 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Mission</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
});
