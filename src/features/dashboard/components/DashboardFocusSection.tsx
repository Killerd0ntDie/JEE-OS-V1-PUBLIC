import React, { useState, useMemo } from 'react';
import { Target, BarChart3 } from 'lucide-react';
import { SmartRevisionQueueWidget } from './SmartRevisionQueueWidget';
import { ExamReadinessWidget } from './ExamReadinessWidget';
import { DailyStudyTrackerWidget } from './DailyStudyTrackerWidget';
import { FocusHeatmapWidget } from './FocusHeatmapWidget';
import { WeeklyStrategyWidget } from './WeeklyStrategyWidget';
import { MomentumRadarWidget } from './MomentumRadarWidget';
import { RevisionCard } from '@/services/revisionEngineService';
import { getTodayStudyMinutes } from '@/utils/streakCalculations';

import { motion, AnimatePresence, Variants } from 'motion/react';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

interface DashboardFocusSectionProps {
  activeTab: 'focus' | 'analytics';
  setActiveTab: (tab: 'focus' | 'analytics') => void;
  revisionQueue: RevisionCard[];
  onLaunchRevision: (rev: RevisionCard) => void;
  targetYear: string;
  syllabusProgress: any;
  analytics: any;
  settings: any;
  xp: any;
  studySessions: any[];
  mentorProfile: any;
  chapters: any[];
  projectedReadiness: any;
}

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 24 : -24,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { duration: 0.14, ease: [0.16, 1, 0.3, 1] as const },
      opacity: { duration: 0.12, ease: 'easeOut' },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 24 : -24,
    opacity: 0,
    transition: {
      x: { duration: 0.10, ease: [0.16, 1, 0.3, 1] as const },
      opacity: { duration: 0.08, ease: 'easeIn' },
    },
  }),
};

export function DashboardFocusSection({
  activeTab,
  setActiveTab,
  revisionQueue,
  onLaunchRevision,
  targetYear,
  syllabusProgress,
  analytics,
  settings,
  xp,
  studySessions,
  mentorProfile,
  chapters,
  projectedReadiness
}: DashboardFocusSectionProps) {
  const [direction, setDirection] = useState<number>(0);
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'strategy' | 'radar'>('radar');

  const todayStudyMinutes = useMemo(() => getTodayStudyMinutes(studySessions || []), [studySessions]);

  const tabs = [
    { 
      id: 'focus', 
      label: (
        <span>
          <span className="eva-japanese-badge">焦点復習 // </span>
          <span>Focus & Revision</span>
        </span>
      ), 
      icon: Target 
    },
    { 
      id: 'analytics', 
      label: (
        <span>
          <span className="eva-japanese-badge">分析評価 // </span>
          <span>Analytics & Trajectory</span>
        </span>
      ), 
      icon: BarChart3 
    },
  ];

  const handleTabChange = (newTabId: 'focus' | 'analytics') => {
    if (newTabId === activeTab) return;
    audioEngine.playRadioRelayClick().catch(() => {});
    const dir = newTabId === 'analytics' ? 1 : -1;
    setDirection(dir);
    setActiveTab(newTabId);
  };

  return (
    <div className="space-y-4 pt-2 font-sans">
      {/* Tab Toggle Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 flex-wrap gap-3">
        <div 
          style={{
            background: 'rgba(10, 14, 23, 0.78)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderTop: '1.5px solid rgba(255, 255, 255, 0.20)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
          }}
          className="flex items-center gap-1.5 p-1 rounded-2xl relative select-none w-full sm:w-auto shadow-inner"
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={(e) => {
                  e.preventDefault();
                  handleTabChange(tab.id as any);
                }}
                className={`relative px-4 py-2 sm:px-5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer select-none z-10 flex items-center justify-center gap-2 min-w-[150px] sm:min-w-[200px] text-center ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="dashboardFocusTabSlider"
                    className="absolute inset-0 bg-indigo-600/40 border border-indigo-400/60 rounded-xl shadow-md -z-10"
                    transition={springs.snappy}
                  />
                )}
                <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-300' : 'text-zinc-500'}`} />
                <span className="truncate">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        <span className="text-xs text-zinc-400 font-mono hidden sm:inline-block">
          <span className="eva-japanese-badge">MAGI // </span>
          <span>{activeTab === 'focus' ? 'ACTIVE REVISION QUEUE' : 'SYLLABUS TRAJECTORY MATRIX'}</span>
        </span>
      </div>

      {/* Tab Content Panels - Directional Sliding Transition with responsive auto-height on mobile */}
      <div className="relative h-auto lg:h-[500px] overflow-visible lg:overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {activeTab === 'focus' ? (
            <motion.div
              key="focus"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 text-left items-stretch h-full w-full"
            >
              <SmartRevisionQueueWidget
                revisionQueue={revisionQueue}
                onLaunchRevision={onLaunchRevision}
              />

              <ExamReadinessWidget
                targetYear={targetYear}
                syllabusProgress={syllabusProgress}
                studySessions={studySessions}
              />
            </motion.div>
          ) : (
            <motion.div
              key="analytics"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 text-left items-stretch h-full w-full"
            >
              <div className="flex flex-col gap-4 h-full justify-between">
                <DailyStudyTrackerWidget
                  studyTime={todayStudyMinutes}
                  dailyQuota={mentorProfile?.dailyAvailableHours || 6.5}
                  xpLevel={xp?.level || 1}
                  xpTotal={xp?.total || 0}
                  xpNextLevel={xp?.nextLevelXP || 100}
                />
                <FocusHeatmapWidget studySessions={studySessions || []} />
              </div>

              <div className="flex flex-col gap-3 h-full justify-between">
                {/* Subtab Switcher */}
                <div className="flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950/80 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setAnalyticsSubTab('radar')}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        analyticsSubTab === 'radar' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Tri-Axis Radar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsSubTab('strategy')}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        analyticsSubTab === 'strategy' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Weekly Strategy
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest hidden sm:inline">TELEMETRY MATRIX</span>
                </div>

                {analyticsSubTab === 'radar' ? (
                  <MomentumRadarWidget
                    chapters={chapters || []}
                    studySessions={studySessions || []}
                    dailyTargetHours={mentorProfile?.dailyAvailableHours || 6.5}
                  />
                ) : (
                  <WeeklyStrategyWidget
                    mentorProfile={mentorProfile}
                    chapters={chapters || []}
                    projectedReadiness={projectedReadiness}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
