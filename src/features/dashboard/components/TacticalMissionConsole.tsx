import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, Activity, Pause, Coffee } from 'lucide-react';
import { springs } from '@/constants/motion';
import { TodayMission, SubjectId, Chapter } from '@/types/index';
import { audioEngine } from '@/utils/audioEngine';

interface TacticalMissionConsoleProps {
  activeMission?: TodayMission;
  activeChap?: Chapter;
  strategyRadar: {
    weightageGain: number;
    recommendedPYQs?: number;
    estimatedMinutes?: number;
    [key: string]: any;
  };
  targetPYQs?: number;
  displayXp?: number;
  sessionState: 'idle' | 'active' | 'paused';
  secondsElapsed: number;
  formatTimer: (totalSecs: number) => string;
  resumableMissions: Record<string, boolean>;
  onStartSession: (missionId?: string) => void;
  onOpenChapterEditModal: (chapterId: string) => void;
  onSetRadarFocusedChapter: (chapterId: string) => void;
  onSetActiveSubject: (subject: SubjectId) => void;
}

const getSubjectBadgeStyle = (subj: SubjectId | string) => {
  switch (subj) {
    case 'physics':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'chemistry':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'maths':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    default:
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  }
};

export const TacticalMissionConsole = React.memo(function TacticalMissionConsole({
  activeMission,
  activeChap,
  strategyRadar,
  targetPYQs,
  displayXp,
  sessionState,
  secondsElapsed,
  formatTimer,
  resumableMissions,
  onStartSession,
  onOpenChapterEditModal,
  onSetRadarFocusedChapter,
  onSetActiveSubject
}: TacticalMissionConsoleProps) {
  const isBreak = Boolean(
    activeMission && (
      (activeMission.subject as string)?.toLowerCase() === 'break' ||
      (activeMission.type as string)?.toLowerCase() === 'break' ||
      activeMission.taskName?.toLowerCase().includes('break')
    )
  );

  return (
    <div className="lg:col-span-5 xl:col-span-5 self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar">
      <div 
        className="p-4 md:p-5 rounded-2xl space-y-3.5 bg-surface-1 border border-border-subtle hover:border-border-muted shadow-2xl relative overflow-hidden text-left font-sans"
      >
        <div className="space-y-4 relative z-10">
          
          {/* Compact Header Radar */}
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase">
                STRATEGY RADAR
              </h3>
            </div>
            
            {activeChap && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                transition={springs.snappy}
                onClick={() => {
                  audioEngine.playRadioRelayClick().catch(() => {});
                  onOpenChapterEditModal(activeChap.id);
                }}
                className="text-xs font-mono font-bold text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 px-2.5 py-1 rounded-xl cursor-pointer transition-colors select-none flex items-center gap-1.5 shadow-sm uppercase tracking-wider"
              >
                <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                <span>Configure</span>
              </motion.button>
            )}
          </div>

          <AnimatePresence mode="wait">
          {activeMission ? (
            <motion.div
              key={activeMission.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 text-left"
            >
              
              {/* Active Module Header */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border shadow-sm ${
                    isBreak
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : getSubjectBadgeStyle(activeMission.subject)
                  }`}>
                    {isBreak ? 'ROUTINE BREAK' : activeMission.subject.toUpperCase()}
                  </span>
                  {isBreak ? (
                    <span className="text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-lg shadow-sm">
                      Rest & Neuro-Reset
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-lg shadow-sm">
                      +{strategyRadar.weightageGain} Marks Gain
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-white tracking-tight pt-0.5 leading-snug">
                  {activeMission.taskName}
                </h4>
              </div>

              {/* Chapter Vitals or Break Guidance */}
              {isBreak ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-300 block font-display">Cognitive Reset Protocol</span>
                    <span className="text-zinc-300">Step away from the screen, stretch, hydrate, and relax your eyes.</span>
                  </div>
                </div>
              ) : activeChap ? (
                <div className="space-y-2 mt-2">
                  <span className="text-xs font-semibold text-zinc-400 block">
                    Chapter Vitals
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col gap-1.5">
                      <span className="text-xs text-zinc-400 font-medium">Completion</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">{activeChap.completion}%</span>
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${activeChap.completion}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full bg-indigo-500 rounded-full" 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col gap-1.5">
                      <span className="text-xs text-zinc-400 font-medium">Confidence</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">{activeChap.confidence}%</span>
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${activeChap.confidence}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={`h-full rounded-full ${activeChap.confidence > 70 ? 'bg-emerald-500' : activeChap.confidence > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col gap-1">
                      <span className="text-xs text-zinc-400 font-medium">Difficulty</span>
                      <span className={`text-xs font-semibold ${activeChap.difficulty === 'Hard' ? 'text-rose-400' : activeChap.difficulty === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>{activeChap.difficulty}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col gap-1">
                      <span className="text-xs text-zinc-400 font-medium">Lectures</span>
                      <span className="text-xs font-bold text-white font-mono">{activeChap.currentLecture} / {activeChap.totalLectures}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400">
                  Custom task selected — chapter telemetry unavailable.
                </div>
              )}

              {/* Performance Metrics: Clean 3-Box Row */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-center flex flex-col justify-center">
                  <span className="text-xs text-zinc-400 font-medium">{isBreak ? 'Duration' : 'Est. Time'}</span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5">{isBreak ? `${activeMission?.duration || 15}m` : `${strategyRadar.estimatedMinutes || activeMission?.duration || 45}m`}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-center flex flex-col justify-center">
                  <span className="text-xs text-zinc-400 font-medium">{isBreak ? 'Focus Boost' : 'Target PYQs'}</span>
                  <span className={`text-sm font-bold font-mono mt-0.5 ${isBreak ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {isBreak
                      ? '+High'
                      : activeMission.type === 'Watch Lecture'
                      ? 'Theory'
                      : `${strategyRadar.recommendedPYQs || targetPYQs || 15} Qs`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-center flex flex-col justify-center">
                  <span className="text-xs text-zinc-400 font-medium">{isBreak ? 'Status' : 'XP Reward'}</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                    {isBreak
                      ? (activeMission.completed ? 'Done' : 'Ready')
                      : `+${displayXp || (activeMission?.xp ?? Math.round((strategyRadar.estimatedMinutes || activeMission?.duration || 45) * 1.5))}`}
                  </span>
                </div>
              </div>

            </motion.div>
          ) : (
            <div className="p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <div className="text-xs text-zinc-400 max-w-xs mx-auto font-sans leading-relaxed">
                Select a mission from the Execution Queue to view strategic telemetry and formula radar.
              </div>
            </div>
          )}
          </AnimatePresence>

          {/* Launch Focus Cockpit Session CTA Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={springs.snappy}
            onClick={() => {
              if (activeChap) {
                onSetRadarFocusedChapter(activeChap.id);
                onSetActiveSubject(activeChap.subject);
              }
              onStartSession(activeMission?.id);
            }}
            className={`w-full py-3 px-4 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
              sessionState === 'active'
                ? 'bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 hover:bg-indigo-900'
                : sessionState === 'paused'
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                : isBreak
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20 active:scale-95'
                : 'bg-white hover:bg-zinc-100 text-zinc-950'
            }`}
          >
            {sessionState === 'active' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span>PAUSE FOCUS COCKPIT ({formatTimer(secondsElapsed)})</span>
              </span>
            ) : sessionState === 'paused' ? (
              <span className="flex items-center justify-center gap-2">
                <Pause className="w-3.5 h-3.5" />
                <span>RESUME FOCUS COCKPIT ({formatTimer(secondsElapsed)})</span>
              </span>
            ) : isBreak ? (
              <span className="flex items-center justify-center gap-2">
                <Coffee className="w-3.5 h-3.5" />
                <span>START BREAK SESSION</span>
              </span>
            ) : (
              <span>{(activeMission?.id && resumableMissions[activeMission.id]) ? 'RESUME FOCUS COCKPIT SESSION' : 'ARM FOCUS COCKPIT SESSION'}</span>
            )}
          </motion.button>
        </div>

      </div>
    </div>
  );
});
