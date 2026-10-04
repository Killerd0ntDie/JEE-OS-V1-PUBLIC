import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Battery, Activity, Zap, Sun, SunMedium, Sunset, Moon, Clock, ArrowRight } from 'lucide-react';
import { audioEngine } from '@/utils/audioEngine';
import { springs } from '@/constants/motion';

const ENERGY_THEMES = {
  Low: {
    text: 'text-amber-200',
    bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(245, 158, 11, 0.20) 100%)',
    border: 'rgba(245, 158, 11, 0.40)',
    shadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
    icon: Battery,
  },
  Medium: {
    text: 'text-indigo-200',
    bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(129, 140, 248, 0.20) 100%)',
    border: 'rgba(129, 140, 248, 0.40)',
    shadow: '0 4px 16px rgba(129, 140, 248, 0.25)',
    icon: Activity,
  },
  High: {
    text: 'text-emerald-200',
    bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(52, 211, 153, 0.20) 100%)',
    border: 'rgba(52, 211, 153, 0.40)',
    shadow: '0 4px 16px rgba(52, 211, 153, 0.25)',
    icon: Zap,
  },
};

const ENERGY_LEVELS = ['Low', 'Medium', 'High'] as const;

function EnergyGlassGlider({
  energyLevel,
  setEnergyLevel,
}: {
  energyLevel: 'Low' | 'Medium' | 'High';
  setEnergyLevel: (level: 'Low' | 'Medium' | 'High') => void;
}) {
  const currentTheme = ENERGY_THEMES[energyLevel];

  const handleSelect = (level: 'Low' | 'Medium' | 'High') => {
    if (level !== energyLevel) {
      audioEngine.playRadioRelayClick().catch(() => {});
      setEnergyLevel(level);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-1 bg-surface-2 border border-border-subtle p-1 rounded-xl shadow-inner select-none relative">
      {ENERGY_LEVELS.map((level) => {
        const Icon = ENERGY_THEMES[level].icon;
        const isActive = level === energyLevel;
        return (
          <button
            key={level}
            type="button"
            onClick={() => handleSelect(level)}
            className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer select-none z-10 ${
              isActive ? currentTheme.text : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeEnergyGlider"
                transition={springs.fluid}
                className="absolute inset-0 rounded-lg -z-10"
                style={{
                  background: currentTheme.bg,
                  border: `1px solid ${currentTheme.border}`,
                  boxShadow: currentTheme.shadow,
                }}
              />
            )}
            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'drop-shadow-[0_0_8px_currentColor]' : 'opacity-60'}`} />
            <span>{level}</span>
          </button>
        );
      })}
    </div>
  );
}

interface DashboardHeaderProps {
  userName: string;
  incompleteTasks: any[];
  estimatedRemainingHours: number;
  nextTaskName: string;
  energyLevel: 'Low' | 'Medium' | 'High';
  setEnergyLevel: (level: 'Low' | 'Medium' | 'High') => void;
}

export const DashboardHeader = React.memo(function DashboardHeader({
  userName,
  incompleteTasks,
  estimatedRemainingHours,
  nextTaskName,
  energyLevel,
  setEnergyLevel,
}: DashboardHeaderProps) {
  const getSubjectTextColor = (subj?: string, taskName?: string) => {
    const s = (subj || '').toLowerCase();
    const t = (taskName || '').toLowerCase();
    if (s.includes('break') || t.includes('break')) return 'text-amber-400';
    if (s.includes('phys')) return 'text-sky-400';
    if (s.includes('chem')) return 'text-emerald-400';
    if (s.includes('math')) return 'text-purple-400';
    return 'text-indigo-400';
  };

  const nextMission = incompleteTasks[0];
  const targetColorClass = getSubjectTextColor(nextMission?.subject, nextMission?.taskName || nextTaskName);
  const isNextBreak = Boolean(
    (nextMission?.subject || '').toLowerCase().includes('break') ||
    (nextMission?.taskName || nextTaskName || '').toLowerCase().includes('break')
  );

  const timeOfDayMeta = useMemo(() => {
    const hour = new Date().getHours();

    // 1. Dawn / Brahma Muhurta (4 AM - 7 AM): Soft sunrise peach & golden horizon
    if (hour >= 4 && hour < 7) {
      return {
        text: 'Good morning,',
        gradient: 'from-amber-200 via-rose-300 to-amber-300',
        icon: <Sun className="w-4 h-4 text-amber-200 fill-amber-200/20 drop-shadow-[0_0_8px_rgba(253,230,138,0.5)]" />
      };
    }

    // 2. Bright Morning (7 AM - 12 PM): Radiant solar gold & sharp daylight warmth
    if (hour >= 7 && hour < 12) {
      return {
        text: 'Good morning,',
        gradient: 'from-amber-300 via-yellow-100 to-amber-400',
        icon: <Sun className="w-4 h-4 text-amber-300 fill-amber-300/20 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
      };
    }

    // 3. Crisp Afternoon (12 PM - 5 PM): Clear zenith azure sky & crisp cyan daylight
    if (hour >= 12 && hour < 17) {
      return {
        text: 'Good afternoon,',
        gradient: 'from-sky-300 via-cyan-100 to-blue-400',
        icon: <SunMedium className="w-4 h-4 text-sky-300 fill-sky-300/20 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
      };
    }

    // 4. Sunset Twilight (5 PM - 9 PM): Deep dusk amber, tangerine embers & crimson horizon
    if (hour >= 17 && hour < 21) {
      return {
        text: 'Good evening,',
        gradient: 'from-amber-300 via-orange-400 to-rose-400',
        icon: <Sunset className="w-4 h-4 text-orange-400 fill-orange-400/20 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
      };
    }

    // 5. Celestial Night (9 PM - 4 AM): Moonlit silver, starlight frost & calm midnight indigo
    return {
      text: 'Good night,',
      gradient: 'from-sky-200 via-indigo-100 to-indigo-300',
      icon: <Moon className="w-4 h-4 text-sky-200 fill-sky-200/20 drop-shadow-[0_0_8px_rgba(186,230,253,0.5)]" />
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
                <div className="inline-flex items-center gap-1.5 css-glass-pill px-2.5 py-0.5 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  </span>
                  <span className="text-zinc-200 font-bold"><span className="tabular-nums">{incompleteTasks.length}</span> MISSIONS SCHEDULED</span>
                </div>

                <span className="text-zinc-600 font-bold">•</span>

                <div className="inline-flex items-center gap-1.5 text-zinc-300 css-glass-pill px-2 py-0.5">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span className="tabular-nums font-semibold">~{estimatedRemainingHours}H STUDY LOAD</span>
                </div>

                {nextTaskName && (
                  <>
                    <span className="text-zinc-600 font-bold">•</span>
                    <div 
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 css-glass-pill shadow-sm max-w-[340px] transition-colors ${
                        isNextBreak ? 'border-amber-500/35 bg-amber-500/10 text-amber-200' : 'text-zinc-300'
                      }`}
                    >
                      <span className={`text-[10px] font-bold tracking-wider uppercase ${isNextBreak ? 'text-amber-400' : 'text-zinc-400'}`}>NEXT</span>
                      <ArrowRight className={`w-3 h-3 shrink-0 ${isNextBreak ? 'text-amber-400' : 'text-zinc-400'}`} />
                      <span className={`font-bold truncate ${targetColorClass}`}>
                        {nextTaskName}
                      </span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/30 backdrop-blur-md border border-emerald-500/30 text-emerald-400 font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>ALL DAILY MISSIONS COMPLETED · 100% NOMINAL</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls: Energy Switcher */}
        <div className="shrink-0 flex items-center gap-2.5 flex-wrap">
          <EnergyGlassGlider
            energyLevel={energyLevel}
            setEnergyLevel={setEnergyLevel}
          />
        </div>
      </div>
    </>
  );
});
