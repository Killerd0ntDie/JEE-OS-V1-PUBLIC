import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SmartRevisionQueueWidget } from './SmartRevisionQueueWidget';
import { ExamReadinessWidget } from './ExamReadinessWidget';
import { DailyStudyTrackerWidget } from './DailyStudyTrackerWidget';
import { FocusHeatmapWidget } from './FocusHeatmapWidget';
import { WeeklyStrategyWidget } from './WeeklyStrategyWidget';
import { RevisionCard } from '@/services/revisionEngineService';
import { getTodayStudyMinutes } from '@/utils/streakCalculations';

import { motion, AnimatePresence, Variants } from 'motion/react';
import { springs } from '@/constants/motion';

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

  const tabs = [
    { id: 'focus', label: "Today's Focus & Revision Queue", icon: 'Target' as const },
    { id: 'analytics', label: 'Analytics, Heatmap & Trajectory', icon: 'BarChart2' as const },
  ];

  const handleTabChange = (newTabId: 'focus' | 'analytics') => {
    if (newTabId === activeTab) return;
    const dir = newTabId === 'analytics' ? 1 : -1;
    setDirection(dir);
    setActiveTab(newTabId);
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Tab Toggle Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-850/80 pb-3 flex-wrap gap-3">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950/80 border border-zinc-850 rounded-2xl relative select-none w-full sm:w-auto">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={(e) => {
                  e.preventDefault();
                  handleTabChange(tab.id as any);
                }}
                className={`relative px-4 py-2 sm:px-6 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer select-none z-10 flex items-center justify-center gap-2 min-w-[170px] sm:min-w-[260px] text-center ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="dashboardFocusSectionPill"
                    className="absolute inset-0 bg-indigo-600/25 border border-indigo-500/40 rounded-xl shadow-md shadow-indigo-600/20 -z-10"
                    transition={springs.snappy}
                  />
                )}
                <Icon name={tab.icon} className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                <span className="truncate">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        <span className="text-xs font-mono text-zinc-400 hidden sm:inline-block">
          {activeTab === 'focus' ? 'Active study queues' : 'Long-term exam readiness'}
        </span>
      </div>

      {/* Tab Content Panels - Directional Sliding Transition with locked equal height */}
      <div className="relative min-h-[500px] lg:h-[500px] overflow-hidden">
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
                  studyTime={getTodayStudyMinutes(studySessions || [])}
                  dailyQuota={mentorProfile?.dailyAvailableHours || 6.5}
                  xpLevel={xp?.level || 1}
                  xpTotal={xp?.total || 0}
                  xpNextLevel={xp?.nextLevelXP || 100}
                />
                <FocusHeatmapWidget studySessions={studySessions || []} />
              </div>

              <div className="flex flex-col gap-4 h-full justify-between">
                <WeeklyStrategyWidget
                  mentorProfile={mentorProfile}
                  chapters={chapters || []}
                  projectedReadiness={projectedReadiness}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
