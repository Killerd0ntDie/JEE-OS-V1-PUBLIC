import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Battery, Activity, Zap, Sun, SunMedium, Sunset, Moon, Clock, ArrowRight } from 'lucide-react';
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

export const DashboardHeader = React.memo(function DashboardHeader({
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
  const [isBreakHovered, setIsBreakHovered] = useState(false);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left px-0.5 pt-0.5 pb-0">
        <div className="space-y-1">
          {/* MODERN GREETING WITH CLEAN ATMOSPHERIC TIME-OF-DAY ACCENT */}
          <h1 className="text-xl sm:text-2xl font-tactical font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              {timeOfDayMeta.icon}
              <span className={`font-normal bg-gradient-to-r ${timeOfDayMeta.gradient} bg-clip-text text-transparent`}>
                {timeOfDayMeta.text}
              </span>
            </span>
            <motion.span 
              whileHover={{ scale: 1.02 }}
              className="font-extrabold text-zinc-100 tracking-tight drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)] select-none"
            >
              {userName}
            </motion.span>
          </h1>

          {/* INTEL SUBTITLE */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono flex-wrap">
            {incompleteTasks.length > 0 ? (
              <>
                <div className="inline-flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 px-2 py-0.5 rounded-md shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  </span>
                  <span className="text-zinc-200 font-bold">{incompleteTasks.length} MISSIONS SCHEDULED</span>
                </div>

                <span className="text-zinc-600 font-bold">•</span>

                <div className="inline-flex items-center gap-1.5 text-zinc-300 bg-zinc-900/40 px-1.5 py-0.5 rounded">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>~{estimatedRemainingHours}H STUDY LOAD</span>
                </div>

                {nextTaskName && (
                  <>
                    <span className="text-zinc-600 font-bold">•</span>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900/80 border border-zinc-800 text-zinc-400 shadow-sm transition-all hover:border-zinc-700 max-w-[340px]"
                    >
                      <span className="text-zinc-500 text-[10px] font-bold tracking-wider uppercase">NEXT</span>
                      <motion.div
                        animate={{ x: [0, 2.5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                        className="inline-flex"
                      >
                        <ArrowRight className="w-3 h-3 text-zinc-500" />
                      </motion.div>
                      <span className={`font-bold truncate ${targetColorClass}`}>
                        {nextTaskName}
                      </span>
                    </motion.div>
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
            <motion.button
              type="button"
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={springs.snappy}
              onMouseEnter={() => setIsBreakHovered(true)}
              onMouseLeave={() => setIsBreakHovered(false)}
              onClick={() => {
                audioEngine.playRadioRelayClick().catch(() => {});
                onOpenRoutineBreak();
              }}
              className="px-3 py-1.5 bg-zinc-900/90 hover:bg-amber-950/20 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-200 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-sm hover:shadow-[0_0_18px_rgba(245,158,11,0.25)] group relative"
              title="Take Routine Break (Lunch, Dinner, Exercise)"
            >
              <div className="relative flex items-center justify-center">
                {/* Organic Multi-Wisp Rising Steam Animation — ONLY mounts and renders when hovered */}
                <AnimatePresence>
                  {isBreakHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -2 }}
                      transition={{ duration: 0.2 }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 pointer-events-none overflow-visible"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full overflow-visible"
                      >
                        <defs>
                          <linearGradient id="coffeeSteamGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
                            <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.85" />
                            <stop offset="70%" stopColor="#fef3c7" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="coffeeSteamGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
                            <stop offset="30%" stopColor="#fde68a" stopOpacity="0.85" />
                            <stop offset="70%" stopColor="#fef3c7" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                          </linearGradient>
                        </defs>

                        {/* Left Rising Wisp */}
                        <motion.path
                          d="M 5 15 C 3 11, 7 8, 4 3 C 3 1, 5 0, 4 -2"
                          stroke="url(#coffeeSteamGrad1)"
                          strokeWidth="1.1"
                          strokeLinecap="round"
                          fill="none"
                          animate={{
                            y: [0, -5],
                            x: [0, -1, 0.5, 0],
                            opacity: [0, 0.85, 0]
                          }}
                          transition={{
                            duration: 2.2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                          }}
                        />

                        {/* Right Rising Wisp */}
                        <motion.path
                          d="M 11 15 C 13 11, 9 8, 12 3 C 13 1, 11 0, 12 -2"
                          stroke="url(#coffeeSteamGrad2)"
                          strokeWidth="1.1"
                          strokeLinecap="round"
                          fill="none"
                          animate={{
                            y: [0, -5.5],
                            x: [0, 1, -0.5, 0],
                            opacity: [0, 0.85, 0]
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            delay: 0.8,
                            ease: 'easeInOut'
                          }}
                        />

                        {/* Center Delicate Wisp */}
                        <motion.path
                          d="M 8 14 C 7 11, 9 8, 8 4"
                          stroke="url(#coffeeSteamGrad1)"
                          strokeWidth="0.9"
                          strokeLinecap="round"
                          fill="none"
                          animate={{
                            y: [0, -4.5],
                            x: [0, 0.5, -0.5, 0],
                            opacity: [0, 0.7, 0]
                          }}
                          transition={{
                            duration: 1.9,
                            repeat: Infinity,
                            delay: 1.4,
                            ease: 'easeInOut'
                          }}
                        />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Coffee className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="font-semibold tracking-wide">Routine Break</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 group-hover:bg-amber-300" />
            </motion.button>
          )}

          {/* Real Icon Energy Level Selector with Hover-Only Ambient Aura */}
          <div className="flex items-center gap-1 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 p-1 rounded-xl shadow-inner relative">
            {(['Low', 'Medium', 'High'] as const).map((level) => {
              const isActive = energyLevel === level;
              
              // Clean, matte tactical active state at rest; aura and glow strictly on hover
              const energyProfiles = {
                Low: {
                  icon: Battery,
                  activeBg: 'bg-amber-600 border border-amber-500/40 text-white',
                  glowClass: 'group-hover:shadow-[0_0_16px_rgba(245,158,11,0.5)]',
                  auraBg: 'bg-amber-500/40',
                  inactiveColor: 'text-amber-400/80 group-hover:text-amber-300',
                  animatedIcon: (
                    <motion.div
                      animate={{ scale: [1, 0.92, 1], opacity: [0.85, 1, 0.85] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="flex items-center"
                    >
                      <Battery className="w-3.5 h-3.5 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.7)]" />
                    </motion.div>
                  )
                },
                Medium: {
                  icon: Activity,
                  activeBg: 'bg-indigo-600 border border-indigo-500/40 text-white',
                  glowClass: 'group-hover:shadow-[0_0_16px_rgba(99,102,241,0.5)]',
                  auraBg: 'bg-indigo-500/40',
                  inactiveColor: 'text-indigo-400/80 group-hover:text-indigo-300',
                  animatedIcon: (
                    <motion.div
                      animate={{ scale: [1, 1.25, 0.95, 1.15, 1] }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        times: [0, 0.15, 0.25, 0.35, 1],
                        ease: 'easeInOut'
                      }}
                      className="flex items-center"
                    >
                      <Activity className="w-3.5 h-3.5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                    </motion.div>
                  )
                },
                High: {
                  icon: Zap,
                  activeBg: 'bg-emerald-600 border border-emerald-500/40 text-white',
                  glowClass: 'group-hover:shadow-[0_0_16px_rgba(16,185,129,0.5)]',
                  auraBg: 'bg-emerald-400/40',
                  inactiveColor: 'text-emerald-400/80 group-hover:text-emerald-300',
                  animatedIcon: (
                    <motion.div
                      animate={{
                        scale: [1, 1.22, 1, 1.18, 1],
                        rotate: [0, -6, 6, -3, 0]
                      }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        repeatDelay: 0.5,
                        ease: 'easeInOut'
                      }}
                      className="flex items-center"
                    >
                      <Zap className="w-3.5 h-3.5 text-white fill-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
                    </motion.div>
                  )
                }
              };

              const profile = energyProfiles[level];
              const LevelIcon = profile.icon;

              return (
                <motion.button
                  key={level}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => {
                    audioEngine.playRadioRelayClick().catch(() => {});
                    setEnergyLevel(level);
                  }}
                  className={`group relative px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer select-none flex items-center gap-1.5 z-10 ${
                    isActive 
                      ? 'text-white font-bold' 
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <>
                      {/* Ambient Energy Aura Ring — strictly hover-only */}
                      <motion.div
                        layoutId="activeEnergyAura"
                        className={`absolute -inset-0.5 rounded-lg -z-20 blur-xs ${profile.auraBg} opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}
                      />

                      {/* Dynamic Sliding Pill Fill — matte at rest, glowing strictly on hover */}
                      <motion.div
                        layoutId="activeEnergyIndicator"
                        className={`absolute inset-0 rounded-lg ${profile.activeBg} ${profile.glowClass} transition-shadow duration-200 -z-10`}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    </>
                  )}

                  {isActive ? (
                    profile.animatedIcon
                  ) : (
                    <LevelIcon className={`w-3.5 h-3.5 ${profile.inactiveColor} group-hover:scale-110 transition-transform duration-200`} />
                  )}
                  <span className="tracking-wide">{level}</span>
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
});
