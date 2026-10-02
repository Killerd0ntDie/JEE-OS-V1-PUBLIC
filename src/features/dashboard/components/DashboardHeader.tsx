import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Coffee, Battery, Activity, Zap, Sun, SunMedium, Sunset, Moon, Clock, ArrowRight } from 'lucide-react';
import { Chapter } from '@/types/index';
import { audioEngine } from '@/utils/audioEngine';
import { Button } from '@/components/ui';

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
  onSetMonthlyObjective?: () => void;
  onSetDailyCapacity: () => void;
  isHeaderExpanded: boolean;
  onToggleExpand: () => void;
}

export const DashboardHeader = React.memo(function DashboardHeader({
  getGreeting: _getGreeting,
  userName,
  incompleteTasks,
  estimatedRemainingHours,
  nextTaskName,
  energyLevel,
  setEnergyLevel,
  onOpenRoutineBreak,
  chapters: _chapters,
  onOpenChapter: _onOpenChapter,
  onSetMonthlyObjective: _onSetMonthlyObjective,
  onSetDailyCapacity: _onSetDailyCapacity,
  isHeaderExpanded: _isHeaderExpanded,
  onToggleExpand: _onToggleExpand
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

  const timeOfDayMeta = useMemo(() => {
    const hour = new Date().getHours();

    // 1. Dawn / Brahma Muhurta (4 AM - 7 AM): Soft sunrise peach & golden horizon
    if (hour >= 4 && hour < 7) {
      return {
        text: 'Good morning,',
        gradient: 'from-amber-200 via-rose-300 to-amber-300',
        icon: (
          <motion.div
            animate={{ rotate: [0, 12, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <Sun className="w-4 h-4 text-amber-200 fill-amber-200/20 drop-shadow-[0_0_10px_rgba(253,230,138,0.7)]" />
          </motion.div>
        )
      };
    }

    // 2. Bright Morning (7 AM - 12 PM): Radiant solar gold & sharp daylight warmth
    if (hour >= 7 && hour < 12) {
      return {
        text: 'Good morning,',
        gradient: 'from-amber-300 via-yellow-100 to-amber-400',
        icon: (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="inline-flex"
          >
            <Sun className="w-4 h-4 text-amber-300 fill-amber-300/20 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
          </motion.div>
        )
      };
    }

    // 3. Crisp Afternoon (12 PM - 5 PM): Clear zenith azure sky & crisp cyan daylight
    if (hour >= 12 && hour < 17) {
      return {
        text: 'Good afternoon,',
        gradient: 'from-sky-300 via-cyan-100 to-blue-400',
        icon: (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <SunMedium className="w-4 h-4 text-sky-300 fill-sky-300/20 drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]" />
          </motion.div>
        )
      };
    }

    // 4. Sunset Twilight (5 PM - 9 PM): Deep dusk amber, tangerine embers & crimson horizon
    if (hour >= 17 && hour < 21) {
      return {
        text: 'Good evening,',
        gradient: 'from-amber-300 via-orange-400 to-rose-400',
        icon: (
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <Sunset className="w-4 h-4 text-orange-400 fill-orange-400/20 drop-shadow-[0_0_10px_rgba(251,146,60,0.7)]" />
          </motion.div>
        )
      };
    }

    // 5. Celestial Night (9 PM - 4 AM): Moonlit silver, starlight frost & calm midnight indigo (zero pink/magenta)
    return {
      text: 'Good night,',
      gradient: 'from-sky-200 via-indigo-100 to-indigo-300',
      icon: (
        <motion.div
          animate={{ rotate: [-6, 6, -6], scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex"
        >
          <Moon className="w-4 h-4 text-sky-200 fill-sky-200/20 drop-shadow-[0_0_10px_rgba(186,230,253,0.75)]" />
        </motion.div>
      )
    };
  }, []);

  return (
    <>
      {/* AMBIENT COMPACT GREETING HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left px-0.5 pt-0.5 pb-1 border-b border-border-subtle">
        <div className="space-y-1">
          {/* MODERN GREETING WITH CLEAN ATMOSPHERIC TIME-OF-DAY ACCENT */}
          <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-white flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              {timeOfDayMeta.icon}
              <span className={`font-normal bg-gradient-to-r ${timeOfDayMeta.gradient} bg-clip-text text-transparent`}>
                {timeOfDayMeta.text}
              </span>
            </span>
            <span className="font-extrabold text-zinc-100 tracking-tight select-none">
              {userName}
            </span>
          </h1>

          {/* INTEL SUBTITLE */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono flex-wrap">
            {incompleteTasks.length > 0 ? (
              <>
                <div className="inline-flex items-center gap-1.5 bg-surface-2 border border-border-subtle px-2 py-0.5 rounded-md shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  </span>
                  <span className="text-zinc-200 font-bold"><span className="tabular-nums">{incompleteTasks.length}</span> MISSIONS SCHEDULED</span>
                </div>

                <span className="text-zinc-600 font-bold">•</span>

                <div className="inline-flex items-center gap-1.5 text-zinc-300 bg-surface-2 border border-border-subtle px-1.5 py-0.5 rounded">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span className="tabular-nums font-semibold">~{estimatedRemainingHours}H STUDY LOAD</span>
                </div>

                {nextTaskName && (
                  <>
                    <span className="text-zinc-600 font-bold">•</span>
                    <div 
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-2 border border-border-subtle text-zinc-400 shadow-sm max-w-[340px]"
                    >
                      <span className="text-zinc-500 text-[10px] font-bold tracking-wider uppercase">NEXT</span>
                      <ArrowRight className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span className={`font-bold truncate ${targetColorClass}`}>
                        {nextTaskName}
                      </span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>ALL DAILY MISSIONS COMPLETED · 100% NOMINAL</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls: Routine Break + Energy Switcher */}
        <div className="shrink-0 flex items-center gap-2.5 flex-wrap">
          {onOpenRoutineBreak && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                audioEngine.playRadioRelayClick().catch(() => {});
                onOpenRoutineBreak();
              }}
              className="gap-2 text-zinc-300 hover:text-amber-200 hover:border-amber-500/40"
              title="Take Routine Break (Lunch, Dinner, Exercise)"
            >
              <Coffee className="w-3.5 h-3.5 text-focus-amber" />
              <span>Routine Break</span>
            </Button>
          )}

          {/* Real Icon Energy Level Selector */}
          <div className="flex items-center gap-1 bg-surface-2 border border-border-subtle p-1 rounded-xl shadow-inner">
            {(['Low', 'Medium', 'High'] as const).map((level) => {
              const isActive = energyLevel === level;
              const LevelIcon = level === 'Low' ? Battery : level === 'Medium' ? Activity : Zap;
              const activeColor = 
                level === 'Low' 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : level === 'Medium' 
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    audioEngine.playRadioRelayClick().catch(() => {});
                    setEnergyLevel(level);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive 
                      ? `${activeColor} border shadow-xs font-bold` 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-elevated'
                  }`}
                >
                  <LevelIcon className="w-3.5 h-3.5" />
                  <span>{level}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
});
