import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { SmartRevisionQueueWidget } from './SmartRevisionQueueWidget';
import { ExamReadinessWidget } from './ExamReadinessWidget';
import { DailyStudyTrackerWidget } from './DailyStudyTrackerWidget';
import { FocusHeatmapWidget } from './FocusHeatmapWidget';
import { WeeklyStrategyWidget } from './WeeklyStrategyWidget';
import { RevisionCard } from '@/services/revisionEngineService';
import { getTodayStudyMinutes } from '@/utils/streakCalculations';

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
  return (
    <div className="space-y-4 pt-2">
      {/* Tab Toggle Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-850/80 pb-3">
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('focus')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer border flex items-center gap-2 ${
              activeTab === 'focus'
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            <Icon name="Target" className="w-4 h-4 text-indigo-400" />
            <span>Today's Focus & Revision Queue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer border flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            <Icon name="BarChart2" className="w-4 h-4 text-indigo-400" />
            <span>Analytics, Heatmap & Trajectory</span>
          </button>
        </div>

        <span className="text-xs font-mono text-zinc-400 hidden sm:inline-block">
          {activeTab === 'focus' ? 'Active study queues' : 'Long-term exam readiness'}
        </span>
      </div>

      {/* Tab 1: Today's Focus & Revision Queue */}
      {activeTab === 'focus' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 text-left items-stretch animate-fade-in">
          <SmartRevisionQueueWidget
            revisionQueue={revisionQueue}
            onLaunchRevision={onLaunchRevision}
          />

          <ExamReadinessWidget
            targetYear={targetYear}
            syllabusProgress={syllabusProgress}
            studySessions={studySessions}
          />
        </div>
      )}

      {/* Tab 2: Analytics, Heatmap & Trajectory */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 text-left items-stretch animate-fade-in">
          <div className="flex flex-col gap-4 lg:gap-6">
            <DailyStudyTrackerWidget
              studyTime={getTodayStudyMinutes(studySessions || [])}
              dailyQuota={mentorProfile?.dailyAvailableHours || 6.5}
              xpLevel={xp?.level || 1}
              xpTotal={xp?.total || 0}
              xpNextLevel={xp?.nextLevelXP || 100}
            />
            <FocusHeatmapWidget studySessions={studySessions || []} />
          </div>

          <div className="flex flex-col gap-4 lg:gap-6">
            <WeeklyStrategyWidget
              mentorProfile={mentorProfile}
              chapters={chapters || []}
              projectedReadiness={projectedReadiness}
            />
          </div>
        </div>
      )}
    </div>
  );
}
