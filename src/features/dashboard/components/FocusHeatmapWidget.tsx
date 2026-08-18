import React, { useState } from 'react';
import { StudySession } from '@/types';
import { toLocalDateString } from '@/utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '@/constants/motion';
import { Flame, X, Clock, Target, Sparkles, ChevronRight, Activity } from 'lucide-react';
import { audioEngine } from '@/utils/audioEngine';

interface FocusHeatmapWidgetProps {
  studySessions: StudySession[];
}

export const FocusHeatmapWidget: React.FC<FocusHeatmapWidgetProps> = ({ studySessions }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Memoize heavy date and session calculations
  const { days, dailyMinutesMap, dailySessionsMap } = React.useMemo(() => {
    // Generate last 14 days dates (inclusive of today)
    const generatedDays = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    // Calculate total minutes logged per day and group sessions
    const minMap = new Map<string, number>();
    const sessMap = new Map<string, StudySession[]>();

    studySessions.forEach(session => {
      if (!session.startTime) return;
      const sDate = new Date(session.startTime);
      sDate.setHours(0, 0, 0, 0);
      const dateKey = toLocalDateString(sDate);
      
      const existingMin = minMap.get(dateKey) || 0;
      minMap.set(dateKey, existingMin + (session.duration || 0));

      const existingSess = sessMap.get(dateKey) || [];
      sessMap.set(dateKey, [...existingSess, session]);
    });

    return { days: generatedDays, dailyMinutesMap: minMap, dailySessionsMap: sessMap };
  }, [studySessions]);

  // Format date helper
  const formatDateLabel = (d: Date) => {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getDayName = (d: Date) => {
    return d.toLocaleDateString([], { weekday: 'narrow' });
  };

  // Get intensity level based on minutes
  const getIntensity = (mins: number) => {
    if (mins === 0) return 'bg-zinc-900/60 border-zinc-800/80 text-zinc-600';
    if (mins < 90) return 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400';
    if (mins < 240) return 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300 font-bold';
    return 'bg-emerald-500/80 border-emerald-400 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]';
  };

  // Active days count in 14-day window
  const activeDays = days.filter(d => {
    const key = toLocalDateString(d);
    return (dailyMinutesMap.get(key) || 0) > 0;
  }).length;

  const selectedDateKey = selectedDay ? toLocalDateString(selectedDay) : null;
  const selectedDaySessions = selectedDateKey ? dailySessionsMap.get(selectedDateKey) || [] : [];
  const selectedDayMins = selectedDateKey ? dailyMinutesMap.get(selectedDateKey) || 0 : 0;

  return (
    <div 
      style={{
        background: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(24px) saturate(190%)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)'
      }}
      className="rounded-2xl p-5 border text-left relative overflow-hidden flex-1 flex flex-col justify-between shadow-sm"
    >
      {/* Top Emerald Hazard Warning Tape Ribbon */}
      <div 
        className="absolute top-0 inset-x-0 h-1 opacity-75 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(-45deg, #10b981 0px, #10b981 8px, transparent 8px, transparent 16px)'
        }}
      />

      {/* Caliper Crosshairs */}
      <span className="absolute top-2.5 left-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute top-2.5 right-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute bottom-2.5 right-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>

      <div className="flex items-center justify-between mb-3.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-sm">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-tactical font-black text-white tracking-tight uppercase">
              14-DAY FOCUS FLOW
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono block uppercase">
              Consistency & Study Streak (Click day to inspect)
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">{activeDays}/14 DAYS</span>
          <span className="text-[10px] text-zinc-400 font-mono block uppercase">ACTIVE STUDY RATE</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-1 relative">
        {days.map((day, idx) => {
          const dateKey = toLocalDateString(day);
          const mins = dailyMinutesMap.get(dateKey) || 0;
          const hrs = (mins / 60).toFixed(1);
          const isToday = idx === 13;
          const isHovered = activeTooltip === dateKey;
          const isSelected = selectedDay && toLocalDateString(selectedDay) === dateKey;

          // Position tooltip to avoid edge clipping
          const alignmentClass =
            idx >= 11
              ? 'right-0 items-end'
              : idx < 3
              ? 'left-0 items-start'
              : 'left-1/2 -translate-x-1/2 items-center';

          const arrowAlignmentClass =
            idx >= 11
              ? 'mr-3'
              : idx < 3
              ? 'ml-3'
              : '';

          return (
            <div
              key={dateKey}
              onMouseEnter={() => setActiveTooltip(dateKey)}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => {
                audioEngine.playMechanicalKey('click').catch(() => {});
                setSelectedDay(prev => (prev && toLocalDateString(prev) === dateKey ? null : day));
              }}
              className="relative flex flex-col items-center gap-1 cursor-pointer select-none"
            >
              <div
                className={`w-full aspect-square rounded-lg border transition-all duration-200 flex items-center justify-center text-[11px] font-mono ${getIntensity(mins)} ${
                  isToday ? 'ring-1 ring-emerald-400 ring-offset-1 ring-offset-black' : ''
                } ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-black scale-105' : isHovered ? 'scale-110 shadow-md shadow-emerald-500/20' : ''}`}
              >
                {mins > 0 ? (mins >= 60 ? `${Math.round(mins/60)}h` : `${mins}m`) : ''}
              </div>

              <span className="text-[11px] font-mono text-zinc-400 uppercase">
                {getDayName(day)}
              </span>

              {/* Tooltip with AnimatePresence physics pop */}
              <AnimatePresence>
                {isHovered && !selectedDay && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={springs.snappy}
                    className={`absolute bottom-full mb-2 flex flex-col pointer-events-none z-50 ${alignmentClass}`}
                  >
                    <div className="bg-zinc-900/95 border border-zinc-700 text-zinc-200 px-2.5 py-1 rounded-xl text-[11px] font-mono whitespace-nowrap shadow-2xl backdrop-blur-md">
                      <span className="font-bold text-white">{formatDateLabel(day)}</span>: {hrs} hrs ({mins} mins)
                    </div>
                    <div className={`w-1.5 h-1.5 bg-zinc-900 border-b border-r border-zinc-700 rotate-45 -mt-1 ${arrowAlignmentClass}`} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* INTERACTIVE DAY INSPECTOR FLYOUT */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3.5 pt-3.5 border-t border-white/10 space-y-2.5"
          >
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-white font-bold">{selectedDay.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold">
                  {selectedDayMins > 0 ? `${(selectedDayMins / 60).toFixed(1)}h Logged` : 'Zero Study'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedDaySessions.length === 0 ? (
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-850 text-center text-xs font-mono text-zinc-500">
                No active focus sessions logged on this date.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedDaySessions.map((session, idx) => (
                  <div 
                    key={session.id || idx}
                    className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="text-zinc-200 font-semibold truncate">{session.chapterId || session.subject || 'Deep Focus Sprint'}</span>
                      <span className="text-[10px] text-zinc-500">{session.mode || 'Cockpit'}</span>
                    </div>
                    <span className="text-emerald-400 font-bold shrink-0">{session.duration} mins</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-3 border-t border-zinc-850/80 mt-3">
        <span>Less active</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-zinc-900 border border-zinc-800" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-950/40 border border-emerald-800/50" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-600/40 border border-emerald-500/50" />
          <span className="w-2.5 h-2.5 rounded bg-emerald-500 border border-emerald-400" />
        </div>
        <span>High Focus (4h+)</span>
      </div>
    </div>
  );
};
