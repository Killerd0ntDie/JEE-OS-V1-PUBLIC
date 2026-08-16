import React, { useState } from 'react';
import { Target, BarChart3 } from 'lucide-react';
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
    { id: 'focus', label: "Today's Focus & Revision Queue", icon: Target },
    { id: 'analytics', label: 'Analytics, Heatmap & Trajectory', icon: BarChart3 },
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
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl relative select-none w-full sm:w-auto shadow-inner">
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
                className={`relative px-4 py-1.5 sm:px-5 rounded-lg text-xs font-semibold transition-colors cursor-pointer select-none z-10 flex items-center justify-center gap-2 min-w-[150px] sm:min-w-[200px] text-center ${
                  isActive ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="dashboardFocusTabSlider"
                    className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                    transition={springs.snappy}
                  />
                )}
                <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span className="truncate">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>

        <span className="text-xs text-zinc-400 font-medium hidden sm:inline-block">
          {activeTab === 'focus' ? 'Active study queues' : 'Long-term exam readiness'}
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
                  studyTime={React.useMemo(() => getTodayStudyMinutes(studySessions || []), [studySessions])}
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
