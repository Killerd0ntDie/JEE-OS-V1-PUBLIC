import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { CommandOverviewBanner } from './CommandOverviewBanner';
import { MonthlyCampaignBanner } from '@/features/mission/components/MonthlyCampaignBanner';
import { Chapter } from '@/types/index';

interface DashboardHeaderProps {
  getGreeting: () => string;
  userName: string;
  incompleteTasks: any[];
  estimatedRemainingHours: number;
  nextTaskName: string;
  energyLevel: 'Low' | 'Medium' | 'High';
  setEnergyLevel: (level: 'Low' | 'Medium' | 'High') => void;
  chapters: Chapter[];
  onOpenChapter: (chapterId: string) => void;
  onSetMonthlyObjective: () => void;
  onSetDailyCapacity: () => void;
  isHeaderExpanded: boolean;
  onToggleExpand: () => void;
}

export function DashboardHeader({
  getGreeting,
  userName,
  incompleteTasks,
  estimatedRemainingHours,
  nextTaskName,
  energyLevel,
  setEnergyLevel,
  chapters,
  onOpenChapter,
  onSetMonthlyObjective,
  onSetDailyCapacity,
  isHeaderExpanded,
  onToggleExpand
}: DashboardHeaderProps) {
  return (
    <>
      {/* AMBIENT CANVAS GREETING HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-left px-1 pt-1 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-indigo-400 uppercase">
              JEE COMMAND CENTER
            </span>
          </div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-black text-white tracking-tight">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed font-sans">
            <strong className="text-zinc-200">{incompleteTasks.length} missions</strong> remaining today ({estimatedRemainingHours} hrs) • Next up: <span className="text-indigo-400 font-medium font-mono">{nextTaskName}</span>
          </p>
        </div>

        {/* Energy Level Selector Pills */}
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 font-semibold uppercase mr-1 hidden sm:inline">Energy:</span>
          <div className="flex items-center bg-zinc-900/80 border border-zinc-800 p-1 rounded-xl shadow-inner">
            {(['Low', 'Medium', 'High'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setEnergyLevel(level)}
                className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  energyLevel === level
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className="flex items-center gap-1">
                  {level === 'Low' ? (
                    <Icon name="Battery" className="w-3 h-3 text-amber-400" />
                  ) : level === 'Medium' ? (
                    <Icon name="Activity" className="w-3 h-3 text-indigo-400" />
                  ) : (
                    <Icon name="Zap" className="w-3 h-3 text-emerald-400" />
                  )}
                  <span className="hidden sm:inline">{level.toUpperCase()}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <CommandOverviewBanner 
        chapters={chapters || []}
        onOpenChapter={onOpenChapter}
        onSetMonthlyObjective={onSetMonthlyObjective}
        onSetDailyCapacity={onSetDailyCapacity}
        isExpanded={isHeaderExpanded}
        onToggleExpand={onToggleExpand}
      />
    </>
  );
}
