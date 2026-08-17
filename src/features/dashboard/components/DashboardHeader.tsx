import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Battery, Activity, Zap } from 'lucide-react';
import { CommandOverviewBanner } from './CommandOverviewBanner';
import { MonthlyCampaignBanner } from '@/features/mission/components/MonthlyCampaignBanner';
import { Chapter } from '@/types/index';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

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
  const navigate = useNavigate();
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
      {/* AMBIENT COMPACT GREETING HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left px-0.5 pt-0.5 pb-0">
        <div className="space-y-1">
          {/* MODERN GREETING WITH CLEAN ATMOSPHERIC TIME-OF-DAY ACCENT */}
          <h1 className="text-xl sm:text-2xl font-tactical font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
            {(() => {
              const hour = new Date().getHours();
              if (hour >= 4 && hour < 12) {
                return (
                  <span className="font-normal bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">
                    Good morning,
                  </span>
                );
              }
              if (hour >= 12 && hour < 17) {
                return (
                  <span className="font-normal bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                    Good afternoon,
                  </span>
                );
              }
              if (hour >= 17 && hour < 22) {
                return (
                  <span className="font-normal bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">
                    Good evening,
                  </span>
                );
              }
              return (
                <span className="font-normal bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Good night,
                </span>
              );
            })()}
            <span className="font-extrabold text-zinc-100">{userName}</span>
          </h1>

          {/* INTEL SUBTITLE */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono flex-wrap">
            {incompleteTasks.length > 0 ? (
              <>
                <span className="text-zinc-300 font-bold">{incompleteTasks.length} MISSIONS SCHEDULED</span>
                <span className="text-zinc-600 font-bold">•</span>
                <span className="text-zinc-300">~{estimatedRemainingHours}H STUDY LOAD</span>
                {nextTaskName && (
                  <>
                    <span className="text-zinc-600 font-bold">•</span>
                    <span className="text-zinc-400 truncate max-w-[280px]">
                      NEXT: <span className={`font-bold ${targetColorClass}`}>{nextTaskName}</span>
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-emerald-400 font-bold">ALL DAILY MISSIONS COMPLETED · 100% NOMINAL</span>
            )}
          </div>
        </div>

        {/* Action Controls: Routine Break + Tactical HUD + Energy Switcher */}
        <div className="shrink-0 flex items-center gap-2.5 flex-wrap">


          {onOpenRoutineBreak && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={springs.snappy}
              onClick={onOpenRoutineBreak}
              className="px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm group"
              title="Take Routine Break (Lunch, Dinner, Exercise)"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform duration-200" />
              <span>Routine Break</span>
            </motion.button>
          )}

          {/* Real Icon Energy Level Selector with Sliding Layout Pill */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl shadow-inner relative">
            {(['Low', 'Medium', 'High'] as const).map((level) => {
              const isActive = energyLevel === level;
              const EnergyIcon = level === 'Low' ? Battery : level === 'Medium' ? Activity : Zap;
              const iconColor = level === 'Low' ? 'text-amber-400' : level === 'Medium' ? 'text-indigo-400' : 'text-emerald-400';

              return (
                <motion.button
                  key={level}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setEnergyLevel(level)}
                  className={`relative px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer select-none flex items-center gap-1.5 z-10 ${
                    isActive 
                      ? 'text-white font-bold' 
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeEnergyIndicator"
                      className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                      transition={springs.snappy}
                    />
                  )}
                  <EnergyIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : iconColor}`} />
                  <span>{level}</span>
                </motion.button>
              );
            })}
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
