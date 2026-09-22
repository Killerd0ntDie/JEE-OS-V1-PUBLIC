import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, Activity, Pause } from 'lucide-react';
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
  return (
    <div className="lg:col-span-5 xl:col-span-5 self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar">
      <div 
        style={{
          background: 'rgba(10, 14, 23, 0.85)',
          backdropFilter: 'blur(24px) saturate(190%)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)'
        }}
        className="p-4 md:p-5 rounded-2xl space-y-3.5 shadow-sm relative overflow-hidden text-left font-sans"
      >
        {/* Top Hazard Warning Tape Ribbon */}
        <div 
          className="absolute top-0 inset-x-0 h-1 opacity-75 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(-45deg, #6366f1 0px, #6366f1 8px, transparent 8px, transparent 16px)'
          }}
        />

        {/* Caliper Crosshairs */}
        <span className="absolute top-2.5 left-2.5 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
        <span className="absolute top-2.5 right-2.5 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
        <span className="absolute bottom-2.5 left-2.5 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
        <span className="absolute bottom-2.5 right-2.5 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
        
        <div className="space-y-4 relative z-10">
          
          {/* Compact Header Radar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2.5">
              {/* Animated Kinetic Rings Indicator */}
              <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 30 30" className="eva-kinetic-ring w-full h-full absolute inset-0 animate-[spin_8s_linear_infinite]">
                  <circle cx="15" cy="15" r="13" className="stroke-indigo-400/40 fill-none" strokeWidth="1.5" strokeDasharray="3 3" />
                </svg>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              </div>
              <h3 className="text-base font-bold font-mono text-white tracking-tight uppercase">
                <span className="eva-japanese-badge">戦略誘導 // </span>STRATEGY RADAR
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
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border shadow-sm ${getSubjectBadgeStyle(activeMission.subject)}`}>
                    {activeMission.subject.toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-lg shadow-sm">
                    +{strategyRadar.weightageGain} Marks Gain
                  </span>
                </div>
                <h4 className="text-base font-bold text-white tracking-tight pt-0.5 leading-snug">
                  {activeMission.taskName}
                </h4>
              </div>

              {/* Chapter Vitals */}
              {activeChap ? (
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
                  <span className="text-xs text-zinc-400 font-medium">Est. Time</span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5">{strategyRadar.estimatedMinutes || activeMission?.duration || 45}m</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-center flex flex-col justify-center">
                  <span className="text-xs text-zinc-400 font-medium">Target PYQs</span>
                  <span className="text-sm font-bold text-indigo-400 font-mono mt-0.5">
                    {activeMission.type === 'Watch Lecture'
                      ? 'Theory'
                      : strategyRadar.recommendedPYQs !== undefined
                      ? `${strategyRadar.recommendedPYQs} Qs`
                      : targetPYQs
                      ? `${targetPYQs} Qs`
                      : '15 Qs'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-center flex flex-col justify-center">
                  <span className="text-xs text-zinc-400 font-medium">XP Reward</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5">+{displayXp || ((strategyRadar.estimatedMinutes || activeMission?.duration || 45) > 45 ? 83 : 45)}</span>
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
            ) : (
              <span>{(activeMission?.id && resumableMissions[activeMission.id]) ? 'RESUME FOCUS COCKPIT SESSION' : 'ARM FOCUS COCKPIT SESSION'}</span>
            )}
          </motion.button>
        </div>

      </div>
    </div>
  );
});
