import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '@/constants/motion';
import { Icon } from '@/components/ui/Icon';
import {
  AnimatedStreakIcon,
  AnimatedClockIcon,
  AnimatedBellIcon,
  AnimatedCalendarDayFire,
  DockTooltip
} from './DockIcons';

export interface SystemNotification {
  id: string;
  type: 'warning' | 'alert' | 'info' | 'success';
  tag: string;
  title: string;
  desc: string;
  targetPath: string;
  time: string;
}

export interface DockTelemetryPillsProps {
  isVertical: boolean;
  effectiveStreak: number;
  isGodModeStreak: boolean;
  todayStudyMins: number;
  minStreakMins: number;
  todayHoursStr: string;
  settings: any;
  studySessions: any[];
  analytics: any;
  notifications: SystemNotification[];
  unreadNotifications: SystemNotification[];
  activeMenu: 'streak' | 'time' | 'notifications' | 'profile' | null;
  toggleMenu: (menu: 'streak' | 'time' | 'notifications') => void;
  hoveredItem: string | null;
  handleItemHover: (id: string | null) => void;
  formatStudyTime: (hours: number) => string;
  onClearNotifications: () => void;
  onNavigate: (path: string) => void;
}

export const DockTelemetryPills: React.FC<DockTelemetryPillsProps> = ({
  isVertical,
  effectiveStreak,
  isGodModeStreak,
  todayStudyMins,
  minStreakMins,
  todayHoursStr,
  settings,
  studySessions,
  analytics,
  notifications,
  unreadNotifications,
  activeMenu,
  toggleMenu,
  hoveredItem,
  handleItemHover,
  formatStudyTime,
  onClearNotifications,
  onNavigate,
}) => {
  return (
    <>
      {/* 5. Status: Streak Counter (Raging Inferno on Active Streak) */}
      <div className="relative">
        <motion.button
          type="button"
          whileHover={{ scale: 1.14, x: isVertical ? -3 : 0, y: isVertical ? 0 : -2 }}
          whileTap={{ scale: 0.92 }}
          transition={springs.snappy}
          onClick={() => toggleMenu('streak')}
          onMouseEnter={() => handleItemHover('streak')}
          onMouseLeave={() => handleItemHover(null)}
          aria-label="Consistency Streak"
          aria-expanded={activeMenu === 'streak'}
          className={`${isVertical ? 'w-9 h-9 p-0' : 'h-8 px-2.5'} rounded-xl sm:rounded-full flex items-center justify-center gap-1 text-xs font-mono transition-all cursor-pointer ${
            effectiveStreak > 0 
              ? isGodModeStreak
                ? 'bg-gradient-to-r from-orange-600/30 via-amber-500/25 to-red-600/25 border border-amber-500/50 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.45)]'
                : 'bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-red-500/15 border border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
              : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <div className="relative z-10 flex items-center justify-center">
            {isVertical ? (
              <div className="flex flex-col items-center justify-center leading-none">
                <AnimatedStreakIcon streak={effectiveStreak} isHovered={hoveredItem === 'streak'} isGodMode={isGodModeStreak} />
                <span className={`font-bold text-[8px] mt-0.5 ${effectiveStreak > 0 ? 'text-amber-300' : 'text-zinc-400'}`}>
                  {effectiveStreak}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <AnimatedStreakIcon streak={effectiveStreak} isHovered={hoveredItem === 'streak'} isGodMode={isGodModeStreak} />
                <motion.span 
                  animate={
                    effectiveStreak > 0
                      ? { scale: [1, 1.08, 1], textShadow: ['0 0 4px rgba(245,158,11,0.4)', '0 0 10px rgba(249,115,22,0.8)', '0 0 4px rgba(245,158,11,0.4)'] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className={`font-bold ${effectiveStreak > 0 ? 'text-amber-300' : 'text-zinc-400'}`}
                >
                  {effectiveStreak}
                </motion.span>
              </div>
            )}
          </div>
          {activeMenu !== 'streak' && (
            <DockTooltip label={`${effectiveStreak}-Day Streak`} isAiCoach={isVertical} isVisible={hoveredItem === 'streak'} />
          )}
        </motion.button>

        {/* Streak Popover - Monthly Heatmap & Fire Grid */}
        <AnimatePresence>
          {activeMenu === 'streak' && (
            <motion.div
              onMouseEnter={() => handleItemHover('streak')}
              initial={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              animate={{ opacity: 1, ...(isVertical ? { x: 0 } : { y: 0 }), scale: 1 }}
              exit={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              transition={springs.snappy}
              className={`absolute ${isVertical ? 'right-full mr-3.5 top-1/2 -translate-y-1/2' : 'bottom-full mb-3.5 right-0 sm:left-1/2 sm:-translate-x-1/2'} p-4 bg-zinc-950/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-50 text-left select-none w-[248px]`}
            >
              {(() => {
                const now = new Date();
                const currentMonthStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const todayDate = now.getDate();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
                const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

                const monthlyHours = new Array(daysInMonth).fill(0);
                const activeDaysSet = new Set<number>();

                studySessions.forEach((s) => {
                  if (!s.startTime) return;
                  const d = new Date(s.startTime);
                  if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    const dayIndex = d.getDate() - 1;
                    if (dayIndex >= 0 && dayIndex < daysInMonth) {
                      monthlyHours[dayIndex] += (s.duration || 0) / 60;
                    }
                  }
                });

                (analytics?.dailyAnalytics || []).forEach((da) => {
                  if (!da.date) return;
                  const d = new Date(da.date);
                  if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    const dayIndex = d.getDate() - 1;
                    if (dayIndex >= 0 && dayIndex < daysInMonth) {
                      if ((da.studyTime || 0) >= minStreakMins || (da.xpEarned || 0) > 0) {
                        activeDaysSet.add(dayIndex);
                      }
                      if ((da.studyTime || 0) > 0 && monthlyHours[dayIndex] === 0) {
                        monthlyHours[dayIndex] = (da.studyTime || 0) / 60;
                      }
                    }
                  }
                });

                if (effectiveStreak > 0) {
                  const todayMet = todayStudyMins >= minStreakMins;
                  const startIndex = todayMet ? todayDate - 1 : todayDate - 2;
                  for (let k = 0; k < effectiveStreak; k++) {
                    const dayIdx = startIndex - k;
                    if (dayIdx >= 0 && dayIdx < daysInMonth) {
                      activeDaysSet.add(dayIdx);
                      if (monthlyHours[dayIdx] === 0) {
                        monthlyHours[dayIdx] = minStreakMins / 60;
                      }
                    }
                  }
                }

                return (
                  <div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center justify-between font-mono">
                      <span>{currentMonthStr} Streak</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Icon name="Flame" className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {effectiveStreak} Day Fire
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1.5 text-center font-mono text-[10px] font-bold text-zinc-500">
                      {weekDays.map((d, i) => <span key={i}>{d}</span>)}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-7 h-7" />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const isFuture = day > todayDate;
                        const hours = monthlyHours[i] || 0;
                        const minStreakHours = settings?.minStreakHours ?? 0.5;
                        const active = (hours >= minStreakHours || activeDaysSet.has(i)) && !isFuture;
                        const isToday = day === todayDate;

                        return (
                          <div 
                            key={day} 
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono relative transition-all ${
                              isFuture 
                                ? 'bg-zinc-900/30 border border-zinc-800/40 text-zinc-700' 
                                : active 
                                  ? 'bg-amber-950/60 border border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                                  : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500'
                            } ${isToday ? 'ring-1.5 ring-amber-400/80 ring-offset-1 ring-offset-zinc-950' : ''}`}
                            title={isFuture ? `${currentMonthStr} ${day}` : `${currentMonthStr} ${day} — ${hours > 0 ? formatStudyTime(hours) : (active ? 'Active' : 'Missed')}`}
                          >
                            {active ? (
                              <AnimatedCalendarDayFire day={day} isToday={isToday} />
                            ) : (
                              <span>{day}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>Daily Quota: <strong className="text-zinc-200">{minStreakMins}m</strong></span>
                      <span className={todayStudyMins >= minStreakMins ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {todayStudyMins >= minStreakMins ? '✓ Quota Met' : `${Math.max(0, minStreakMins - todayStudyMins)}m Left`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6. Utility: Study Time Pill */}
      <div className="relative hidden md:block">
        <motion.button
          type="button"
          whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
          whileTap={{ scale: 0.9 }}
          transition={springs.snappy}
          onClick={() => toggleMenu('time')}
          onMouseEnter={() => handleItemHover('time')}
          onMouseLeave={() => handleItemHover(null)}
          aria-label="Today's Study Time"
          aria-expanded={activeMenu === 'time'}
          className={`${isVertical ? 'w-9 h-9 p-0' : 'h-8 px-2.5'} rounded-xl sm:rounded-full flex items-center justify-center gap-1.5 text-xs font-mono transition-colors cursor-pointer ${
            activeMenu === 'time'
              ? 'bg-indigo-500/18 shadow-[0_0_12px_rgba(99,102,241,0.36)] text-indigo-300'
              : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300'
          }`}
        >
          <div className="relative z-10 flex items-center justify-center">
            {isVertical ? (
              <div className="flex flex-col items-center justify-center leading-none">
                <AnimatedClockIcon isHovered={hoveredItem === 'time'} />
                <span className="font-bold text-indigo-400 text-[8px] mt-0.5">{todayHoursStr}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AnimatedClockIcon isHovered={hoveredItem === 'time'} />
                <span className={`font-bold text-indigo-400 transition-all ${hoveredItem === 'time' ? 'drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]' : ''}`}>
                  {todayHoursStr}
                </span>
              </div>
            )}
          </div>
          {activeMenu !== 'time' && (
            <DockTooltip label="Today's Study Time" isAiCoach={isVertical} isVisible={hoveredItem === 'time'} />
          )}
        </motion.button>

        {/* Time Popover - Monthly Log Grid */}
        <AnimatePresence>
          {activeMenu === 'time' && (
            <motion.div
              onMouseEnter={() => handleItemHover('time')}
              initial={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              animate={{ opacity: 1, ...(isVertical ? { x: 0 } : { y: 0 }), scale: 1 }}
              exit={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              transition={springs.snappy}
              className={`absolute ${isVertical ? 'right-full mr-3.5 top-1/2 -translate-y-1/2' : 'bottom-full mb-3.5 right-0 sm:left-1/2 sm:-translate-x-1/2'} p-4 bg-zinc-950/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-50 text-left select-none w-[320px] max-w-[calc(100vw-2rem)]`}
            >
              {(() => {
                const now = new Date();
                const currentMonthStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const todayDate = now.getDate();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
                const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

                const monthlyHours = new Array(daysInMonth).fill(0);
                studySessions.forEach((s) => {
                  if (!s.startTime) return;
                  const d = new Date(s.startTime);
                  if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    const dayIndex = d.getDate() - 1;
                    if (dayIndex >= 0 && dayIndex < daysInMonth) {
                      monthlyHours[dayIndex] += (s.duration || 0) / 60;
                    }
                  }
                });

                (analytics?.dailyAnalytics || []).forEach((da) => {
                  if (!da.date) return;
                  const d = new Date(da.date);
                  if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    const dayIndex = d.getDate() - 1;
                    if (dayIndex >= 0 && dayIndex < daysInMonth) {
                      if ((da.studyTime || 0) > 0 && monthlyHours[dayIndex] === 0) {
                        monthlyHours[dayIndex] = (da.studyTime || 0) / 60;
                      }
                    }
                  }
                });

                const totalMonthHours = monthlyHours.reduce((a, b) => a + b, 0);

                const formatCompactTime = (h: number): string => {
                  if (!h) return '';
                  const totalM = Math.round(h * 60);
                  if (totalM < 60) return `${totalM}m`;
                  const hrs = Math.floor(totalM / 60);
                  const remM = totalM % 60;
                  return remM === 0 ? `${hrs}h` : `${hrs}.${Math.round(remM / 6)}h`;
                };

                return (
                  <div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center justify-between font-mono">
                      <span>{currentMonthStr} Log</span>
                      <span className="text-indigo-400 font-bold">{formatStudyTime(totalMonthHours)} Total</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1.5 text-center font-mono text-[10px] font-bold text-zinc-500">
                      {weekDays.map((d, i) => <span key={i}>{d}</span>)}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-full h-7" />
                      ))}
                      {monthlyHours.map((hours, i) => {
                        const day = i + 1;
                        const isFuture = day > todayDate;
                        const active = hours > 0;
                        const isToday = day === todayDate;

                        return (
                          <div 
                            key={day} 
                            className={`w-full h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold relative transition-colors ${
                              isFuture 
                                ? 'bg-zinc-900/30 border border-zinc-800/40 text-transparent' 
                                : active 
                                  ? 'bg-indigo-950/60 border border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                                  : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500'
                            } ${isToday ? 'ring-1.5 ring-indigo-400/80 ring-offset-1 ring-offset-zinc-950' : ''}`}
                            title={isFuture ? `${currentMonthStr} ${day}` : `${currentMonthStr} ${day} — ${hours > 0 ? formatStudyTime(hours) : 'No time logged'}`}
                          >
                            {active ? formatCompactTime(hours) : (!isFuture ? '·' : '')}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>Today: <strong className="text-indigo-300">{todayHoursStr}</strong></span>
                      <span className="text-zinc-500">Cockpit Sessions</span>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 7. Utility: Notifications Bell */}
      <div className="relative">
        <motion.button
          type="button"
          whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
          whileTap={{ scale: 0.9 }}
          transition={springs.snappy}
          onClick={() => toggleMenu('notifications')}
          onMouseEnter={() => handleItemHover('notifications')}
          onMouseLeave={() => handleItemHover(null)}
          aria-label="System Notifications"
          aria-expanded={activeMenu === 'notifications'}
          className={`relative ${isVertical ? 'w-9 h-9' : 'w-8 h-8 sm:w-8.5 sm:h-8.5'} rounded-xl sm:rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            activeMenu === 'notifications'
              ? 'text-indigo-300 bg-indigo-500/18 shadow-[0_0_12px_rgba(99,102,241,0.36)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <div className="relative z-10 flex items-center justify-center">
            <AnimatedBellIcon isHovered={hoveredItem === 'notifications'} unreadCount={unreadNotifications.length} />
          </div>
          {activeMenu !== 'notifications' && (
            <DockTooltip label="Intelligence Alerts" isAiCoach={isVertical} isVisible={hoveredItem === 'notifications'} />
          )}
        </motion.button>

        {/* Notifications Popover */}
        <AnimatePresence>
          {activeMenu === 'notifications' && (
            <motion.div
              onMouseEnter={() => handleItemHover('notifications')}
              initial={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              animate={{ opacity: 1, ...(isVertical ? { x: 0 } : { y: 0 }), scale: 1 }}
              exit={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              transition={springs.snappy}
              className={`absolute ${isVertical ? 'right-full mr-3 bottom-0' : 'bottom-full mb-3 right-0 sm:left-1/2 sm:-translate-x-1/2'} w-80 max-w-[calc(100vw-5rem)] bg-zinc-950/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl z-50 text-left space-y-2.5`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                  <Icon name="Bell" className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Intelligence Alerts</span>
                </span>
                {unreadNotifications.length > 0 && (
                  <button
                    onClick={onClearNotifications}
                    className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar pr-1">
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { onNavigate(n.targetPath); }}
                    className="w-full p-2.5 rounded-xl border border-white/5 hover:border-indigo-500/40 bg-zinc-900/60 hover:bg-zinc-850 transition-all text-left space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">{n.tag}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{n.time}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-white">{n.title}</h4>
                    <p className="text-[10.5px] text-zinc-400 leading-tight">{n.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
