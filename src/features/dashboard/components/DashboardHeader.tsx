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
  onOpenRoutineBreak?: () => void;
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
  onOpenRoutineBreak,
  chapters,
  onOpenChapter,
  onSetMonthlyObjective,
  onSetDailyCapacity,
  isHeaderExpanded,
  onToggleExpand
}: DashboardHeaderProps) {
  const getSubjectTextColor = (subj?: string) => {
    const s = (subj || '').toLowerCase();
    if (s.includes('phys')) return 'text-sky-400';
    if (s.includes('chem')) return 'text-emerald-400';
    if (s.includes('math')) return 'text-purple-400';
    return 'text-indigo-400';
  };

  const nextSubject = incompleteTasks[0]?.subject;
  const targetColorClass = getSubjectTextColor(nextSubject);

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

          {/* COMPACT SUBTLE GREETING */}
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-300 flex items-center gap-1.5">
            <span className="text-zinc-200">{getGreeting()},</span>
            <span className="text-white font-extrabold">{userName}.</span>
          </h1>

          {/* SUBTITLE & DYNAMICALLY COLORED NEXT TARGET */}
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            You have <strong className="text-white font-bold">{incompleteTasks.length} missions</strong> remaining today ({estimatedRemainingHours} hrs) • Next target: <span className={`${targetColorClass} font-mono font-semibold`}>{nextTaskName}</span>
          </p>
        </div>

        {/* Energy Level Selector Pills + Take Routine Break Button */}
        <div className="shrink-0 flex items-center gap-3 flex-wrap">
          {onOpenRoutineBreak && (
            <button
              type="button"
              onClick={onOpenRoutineBreak}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 rounded-xl font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Take Routine Break (Lunch, Dinner, Exercise)"
            >
              <Icon name="Coffee" className="w-3.5 h-3.5 text-amber-400" />
              <span>Take Routine Break</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase mr-1 hidden sm:inline">Energy:</span>
            <div className="flex items-center bg-zinc-900/80 border border-zinc-800 p-1 rounded-xl shadow-inner">
              {(['Low', 'Medium', 'High'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setEnergyLevel(level)}
                  className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer ${
                    energyLevel === level
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-300'
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
