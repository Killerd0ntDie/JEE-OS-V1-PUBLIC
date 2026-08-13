import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PAGES, PageId } from '@/types/index';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useShallow } from 'zustand/react/shallow';
import { JeeOsLogo } from '@/components/shared/JeeOsLogo';
import { ChapterTelemetry } from '@jee-os/engines';
import { useToast } from '@/components/ui/ToastProvider';
import { calculateCurrentStreak, getTodayStudyMinutes } from '@/utils/streakCalculations';

interface TopbarProps {
  onOpenCommandPalette: () => void;
  onOpenShortcutGuide?: () => void;
  onToggleSidebarMobile: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
}

export function Topbar({
  onOpenCommandPalette,
  onOpenShortcutGuide,
  onToggleSidebarMobile,
  isSidebarCollapsed,
  onToggleSidebarCollapse
}: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activePageId = location.pathname.split('/')[1] || 'dashboard';
  const activePage = PAGES.find(p => p.id === activePageId);
  const { user, logout } = useAuth();
  
  const {
    chapterTelemetryMap,
    todayMissions,
    settings,
    xp,
    analytics,
    studySessions,
    actions
  } = useStudyBrainStore(useShallow(s => ({
    chapterTelemetryMap: s.chapterTelemetryMap,
    todayMissions: s.todayMissions,
    settings: s.settings,
    xp: s.xp,
    analytics: s.analytics,
    studySessions: s.studySessions || [],
    actions: s.actions
  })));

  const minStreakMins = Math.round((settings?.minStreakHours ?? 0.5) * 60);
  const computedStreak = useMemo(() => calculateCurrentStreak(studySessions, minStreakMins), [studySessions, minStreakMins]);
  const effectiveStreak = computedStreak;
  const todayStudyMins = useMemo(() => getTodayStudyMinutes(studySessions), [studySessions]);
  
  const formatStudyTime = (hours: number): string => {
    if (!hours) return '0m';
    const totalMins = Math.round(hours * 60);
    if (totalMins < 60) {
      return `${totalMins}m`;
    }
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (m === 0) {
      return `${h}h`;
    }
    return `${h}h ${m}m`;
  };

  const todayHoursStr = formatStudyTime(todayStudyMins / 60);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBreadcrumbMenuOpen, setIsBreadcrumbMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jeeos_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('jeeos_read_notifications', JSON.stringify(readNotificationIds));
    } catch (e) {
      console.warn("Failed to persist notification read IDs:", e);
    }
  }, [readNotificationIds]);

  const notifRef = useRef<HTMLDivElement>(null);
  const breadcrumbRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  // User details
  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Aspirant');
  const userInitial = displayName.charAt(0).toUpperCase();
  const isCloudSynced = user && !user.isAnonymous;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (breadcrumbRef.current && !breadcrumbRef.current.contains(e.target as Node)) {
        setIsBreadcrumbMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (streakRef.current && !streakRef.current.contains(e.target as Node)) {
        setIsStreakOpen(false);
      }
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) {
        setIsTimeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute System Notifications from Real Engine Telemetry
  const notifications = useMemo(() => {
    const telemetryList = (Object.values(chapterTelemetryMap || {}) as ChapterTelemetry[]);
    const lowRetentionChaps = telemetryList.filter(t => t && t.retentionConfidence === 'Low');
    const bottleneckChaps = telemetryList.filter(t => t && t.isBottleneck);
    const pendingMissionsCount = todayMissions.filter(m => !m.completed).length;

    return [
      ...(lowRetentionChaps.length > 0 ? [{
        id: `notif-retention-${lowRetentionChaps[0]?.chapterId}`,
        type: 'warning' as const,
        tag: 'RETENTION DECAY',
        title: `${lowRetentionChaps.length} Chapter${lowRetentionChaps.length > 1 ? 's' : ''} Need Revision`,
        desc: `High-yield retention drop detected in ${lowRetentionChaps[0]?.chapterName}. Practice spaced review now.`,
        targetPage: 'revision' as PageId,
        time: 'Real-time'
      }] : []),
      ...(bottleneckChaps.length > 0 ? [{
        id: `notif-bottleneck-${bottleneckChaps[0]?.chapterId}`,
        type: 'alert' as const,
        tag: 'BOTTLENECK ALERT',
        title: `Backlog Bottleneck Detected`,
        desc: bottleneckChaps[0]?.bottleneckReason || 'Lecture or DPP backlog requires execution priority.',
        targetPage: 'planner' as PageId,
        time: 'Real-time'
      }] : []),
      ...(pendingMissionsCount > 0 ? [{
        id: 'notif-audit-daily',
        type: 'info' as const,
        tag: 'DAILY COCKPIT',
        title: 'Daily Execution Queue Active',
        desc: `You have ${pendingMissionsCount} pending missions remaining for today.`,
        targetPage: 'mission' as PageId,
        time: 'Real-time'
      }] : []),
      {
        id: 'notif-streak-current',
        type: 'success' as const,
        tag: 'SYSTEM STREAK',
        title: `${computedStreak}-Day Consistency Streak`,
        desc: `XP Level ${xp?.level || 1} • Total XP: ${xp?.total || 0}. Keep momentum going!`,
        targetPage: 'analytics' as PageId,
        time: 'Active'
      }
    ];
  }, [chapterTelemetryMap, todayMissions, computedStreak, xp]);

  const unreadNotifications = notifications.filter(n => !readNotificationIds.includes(n.id));

  const { toast } = useToast();
  const [prevUnreadCount, setPrevUnreadCount] = useState(unreadNotifications.length);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (hasMountedRef.current && unreadNotifications.length > prevUnreadCount) {
      const latestNotif = unreadNotifications[0];
      if (latestNotif) {
        toast({
          title: latestNotif.title,
          message: latestNotif.desc,
          type: (latestNotif.type === 'alert' ? 'warning' : latestNotif.type) as 'info' | 'success' | 'warning' | 'error',
        });
      }
    }
    hasMountedRef.current = true;
    setPrevUnreadCount(unreadNotifications.length);
  }, [unreadNotifications.length]);

  const handleMarkAllRead = () => {
    setReadNotificationIds(notifications.map(n => n.id));
  };

  return (
    <header className="h-14 shrink-0 glass-panel border-b-0 border-white/10 flex items-center justify-between px-4 sticky top-0 z-30 select-none shadow-xl">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-12 bg-indigo-600/10 filter blur-3xl pointer-events-none" />
      
      {/* Left: Interactive Brand Logo & Breadcrumb Navigation */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          aria-label="Open Navigation Menu"
          className="md:hidden p-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:ring-2 focus:ring-zinc-500/50"
          title="Open Menu"
        >
          <Icon name="Menu" aria-hidden="true" className="w-4 h-4" />
        </button>

        {/* Brand & Breadcrumb Sequence (Clickable logo & text to return to Dashboard) */}
        <div className="flex items-center gap-2 text-xs font-mono">
          
          {/* Clickable Brand Logo & Text */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800/80 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:shadow-[0_0_15px_rgba(99,102,241,0.25)] focus-visible:bg-indigo-900/20 cursor-pointer group text-left shrink-0"
            title="Click to go to Dashboard"
          >
            <JeeOsLogo size="sm" />
            <div className="flex items-center gap-1.5 font-display font-black text-white text-sm tracking-tight group-hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0">
              <span>JEE OS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>
          </button>

          <span className="text-zinc-700 font-bold">/</span>

          {/* Clickable Active Page Breadcrumb Dropdown */}
          <div className="relative" ref={breadcrumbRef}>
            <button
              type="button"
              onClick={() => setIsBreadcrumbMenuOpen(!isBreadcrumbMenuOpen)}
              aria-expanded={isBreadcrumbMenuOpen}
              aria-label="Switch current page"
              className="flex items-center gap-1.5 font-bold text-white bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800/80 px-2.5 py-1 rounded-xl shadow-sm cursor-pointer transition-all duration-200 hover:border-indigo-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
              title="Click to jump to another page"
            >
              {activePage && <Icon name={activePage.icon} aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{activePage?.label || 'Dashboard'}</span>
              <Icon name="ChevronDown" aria-hidden="true" className={`w-3 h-3 text-zinc-400 transition-transform ${isBreadcrumbMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Page Jump Popover Menu */}
            <div className={`absolute top-full left-0 mt-2 w-48 bg-[#0e0e11]/95 border border-zinc-800/90 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-md transition-all duration-150 ease-out transform-gpu will-change-transform origin-top-left ${
              isBreadcrumbMenuOpen ? 'opacity-100 scale-100 translate-y-0 visible pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 invisible pointer-events-none'
            }`}>
              <div className="text-[11px] font-mono font-bold uppercase text-zinc-400 px-2.5 py-1 tracking-wider">
                Quick Page Switch
              </div>
              <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar">
                {PAGES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigate(`/${p.id}`);
                      setIsBreadcrumbMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50 ${
                      activePageId === p.id 
                        ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30' 
                        : 'text-zinc-400 hover:bg-zinc-850 hover:text-white'
                    }`}
                  >
                    <Icon name={p.icon} className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="hidden sm:flex flex-1 max-w-xs md:max-w-sm mx-4">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Search commands and topics (Cmd+K)"
          className="w-full h-8.5 px-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-left text-zinc-400 hover:text-zinc-200 hover:border-indigo-500/40 hover:bg-zinc-900/70 flex items-center justify-between text-xs transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50 cursor-pointer font-sans shadow-inner group"
        >
          <span className="flex items-center gap-2 min-w-0 mr-2">
            <Icon name="Search" aria-hidden="true" className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-400 transition-colors shrink-0" />
            <span className="truncate text-xs">Search commands & topics...</span>
          </span>
          <div className="flex items-center gap-1 shrink-0 font-mono text-xs text-zinc-400 bg-zinc-950/80 border border-zinc-800 px-1.5 py-0.5 rounded-md">
            <span>⌘K</span>
          </div>
        </button>
      </div>

      {/* Right: College Goal Tag + Quick Stats + Interactive Notification Bell + Profile */}
      <div className="flex items-center gap-2.5">
        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Open Command Search"
          className="sm:hidden p-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white cursor-pointer"
        >
          <Icon name="Search" aria-hidden="true" className="w-4 h-4" />
        </button>

        {/* Quick Stat Pill: Streak */}
        <div className="hidden md:block relative" ref={streakRef}>
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={isStreakOpen}
          onClick={() => { setIsStreakOpen(o => !o); setIsTimeOpen(false); }}
          className="group flex items-center gap-1 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded-full text-xs font-mono text-zinc-300 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          title="Study Streak"
        >
          <Icon name="Zap" className="w-3 h-3 text-amber-400" />
          <span className="font-bold text-amber-400">{effectiveStreak}d</span>
          
          <div className={`absolute top-full right-0 mt-2 p-4 bg-[#0e0e11]/95 border border-zinc-800 rounded-2xl shadow-2xl transition-all duration-150 ease-out transform-gpu will-change-transform origin-top-right z-50 ${
            isStreakOpen
              ? 'opacity-100 scale-100 translate-y-0 visible pointer-events-auto'
              : 'opacity-0 invisible scale-95 -translate-y-2 pointer-events-none group-hover:scale-100 group-hover:translate-y-0 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-focus-within:scale-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto'
          }`}>
            {(() => {
              const now = new Date();
              const currentMonthStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              const todayDate = now.getDate();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
              const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun
              const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

              // Aggregate real session data
              const monthlyHours = new Array(daysInMonth).fill(0);
              const activeDaysSet = new Set<number>();

              studySessions.forEach((s: any) => {
                const d = new Date(s.startTime);
                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                  const dayIndex = d.getDate() - 1;
                  monthlyHours[dayIndex] += (s.duration || 0) / 60;
                }
              });

              // Include daily analytics activity
              ((analytics as any)?.dailyAnalytics || []).forEach((da: any) => {
                if (!da.date) return;
                const d = new Date(da.date);
                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                  if ((da.studyTime || 0) >= minStreakMins || (da.xpEarned || 0) > 0) {
                    activeDaysSet.add(d.getDate() - 1);
                  }
                }
              });

              // Ensure current active streak days are highlighted in the current month
              if (effectiveStreak > 0) {
                const todayMet = todayStudyMins >= minStreakMins;
                const startIndex = todayMet ? todayDate - 1 : todayDate - 2;
                for (let k = 0; k < effectiveStreak; k++) {
                  const dayIdx = startIndex - k;
                  if (dayIdx >= 0 && dayIdx < daysInMonth) {
                    activeDaysSet.add(dayIdx);
                  }
                }
              }

              return (
                <div className="w-[190px]">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>{currentMonthStr} Streak</span>
                    <span className="text-amber-400">{effectiveStreak} Day Fire</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
                    {weekDays.map((d, i) => <span key={i} className="text-[11px] font-bold text-zinc-600">{d}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-6 h-6" />
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
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] relative transition-colors ${
                            isFuture ? 'bg-zinc-800/20 border border-zinc-800/60 text-transparent' :
                            active ? 'bg-amber-950/40 border border-amber-900/50 text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.15)]' : 
                            'bg-red-950/20 border border-red-900/30 text-red-900/60' // Break days in subtle red
                          } ${isToday ? 'ring-1 ring-white/30 ring-offset-1 ring-offset-zinc-950' : ''}`}
                          title={isFuture ? `${currentMonthStr} ${day}` : `${currentMonthStr} ${day} - ${hours > 0 ? formatStudyTime(hours) : (active ? 'Active' : 'Missed')}`}
                        >
                          {active ? <Icon name="Zap" className="w-3 h-3 text-amber-400 fill-amber-400" /> : (!isFuture ? '·' : '')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </button>
        </div>

        {/* Quick Stat Pill: Study Time */}
        <div className="hidden md:block relative" ref={timeRef}>
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={isTimeOpen}
          onClick={() => { setIsTimeOpen(o => !o); setIsStreakOpen(false); }}
          className="group flex items-center gap-1 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded-full text-xs font-mono text-zinc-300 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          title="Today's Study Time"
        >
          <Icon name="Clock" className="w-3 h-3 text-indigo-400" />
          <span className="font-bold text-indigo-400">{todayHoursStr}</span>
          
          <div className={`absolute top-full right-0 mt-2 p-4 bg-[#0e0e11]/95 border border-zinc-800 rounded-2xl shadow-2xl transition-all duration-150 ease-out transform-gpu will-change-transform origin-top-right z-50 ${
            isTimeOpen
              ? 'opacity-100 scale-100 translate-y-0 visible pointer-events-auto'
              : 'opacity-0 invisible scale-95 -translate-y-2 pointer-events-none group-hover:scale-100 group-hover:translate-y-0 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-focus-within:scale-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto'
          }`}>
            {(() => {
              const now = new Date();
              const currentMonthStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              const todayDate = now.getDate();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
              const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun
              const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

              // Aggregate real session data
              const monthlyHours = new Array(daysInMonth).fill(0);
              studySessions.forEach((s: any) => {
                const d = new Date(s.startTime);
                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                  const dayIndex = d.getDate() - 1;
                  monthlyHours[dayIndex] += (s.duration || 0) / 60;
                }
              });
              const totalMonthHours = monthlyHours.reduce((a, b) => a + b, 0);

              return (
                <div className="w-[320px]">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>{currentMonthStr} Log</span>
                    <span className="text-indigo-400">{formatStudyTime(totalMonthHours)} Total</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
                    {weekDays.map((d, i) => <span key={i} className="text-[11px] font-bold text-zinc-600">{d}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
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
                          className={`w-full h-7 rounded-md flex items-center justify-center text-[10px] whitespace-nowrap tracking-tight font-bold relative transition-colors ${
                            isFuture ? 'bg-zinc-800/20 border border-zinc-800/60 text-transparent' :
                            active ? 'bg-indigo-900/40 border border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 
                            'bg-zinc-800/50 border border-zinc-700/60 text-zinc-400' // Break days in brighter grey
                          } ${isToday ? 'ring-1 ring-white/30 ring-offset-1 ring-offset-zinc-950' : ''}`}
                          title={`${currentMonthStr} ${day}`}
                        >
                          {active ? formatStudyTime(hours) : (!isFuture ? '-' : '')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </button>
        </div>

        {/* Keyboard Shortcuts Trigger Button */}
        {onOpenShortcutGuide && (
          <button
            type="button"
            onClick={onOpenShortcutGuide}
            aria-label="Keyboard Shortcuts Guide (?)"
            className="p-1.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer font-mono text-xs flex items-center justify-center w-8 h-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            title="Keyboard Shortcuts (?)"
          >
            <Icon name="Keyboard" aria-hidden="true" className="w-4 h-4" />
          </button>
        )}

        {/* FUNCTIONAL NOTIFICATIONS POPOVER BELL */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            aria-expanded={isNotificationsOpen}
            aria-label="System Notifications and Alerts"
            className={`p-1.5 rounded-xl border transition-all cursor-pointer shrink-0 relative ${
              isNotificationsOpen 
                ? 'border-indigo-500 text-indigo-300 bg-indigo-950/30' 
                : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
            title="System Notifications & Telemetry Alerts"
          >
            <Icon name="Bell" aria-hidden="true" className="w-4 h-4" />
            {unreadNotifications.length > 0 && (
              <>
                <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
              </>
            )}
          </button>

          {/* NOTIFICATION CENTER DROPDOWN PANEL */}
          <div className={`absolute top-full right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#0e0e11]/95 border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-md text-left space-y-3 transition-all duration-150 ease-out transform-gpu will-change-transform origin-top-right ${
            isNotificationsOpen ? 'opacity-100 scale-100 translate-y-0 visible pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 invisible pointer-events-none'
          }`}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                  <Icon name="Bell" className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Intelligence Alerts</span>
                </span>
                {unreadNotifications.length > 0 && (
                  <span className="bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                    {unreadNotifications.length} New
                  </span>
                )}
              </div>
              {unreadNotifications.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-mono text-zinc-400 hover:text-zinc-300 cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar pr-1">
              {notifications.map((n) => {
                const isRead = readNotificationIds.includes(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      navigate(`/${n.targetPage}`);
                      setReadNotificationIds(prev => [...prev, n.id]);
                      setIsNotificationsOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
                      isRead 
                        ? 'bg-zinc-950/40 border-zinc-850 opacity-60' 
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        n.type === 'warning' ? 'bg-amber-950/30 text-amber-400 border border-amber-900/40' :
                        n.type === 'alert' ? 'bg-red-950/30 text-red-400 border border-red-900/40' :
                        n.type === 'success' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40' :
                        'bg-indigo-950/30 text-indigo-400 border border-indigo-900/40'
                      }`}>
                        {n.tag}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">{n.time}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white tracking-tight">{n.title}</h4>
                    <p className="text-[10.5px] text-zinc-400 leading-relaxed font-sans">{n.desc}</p>
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* Theme Toggle Removed - Hardcoded Dark Mode */}

        {/* User Profile Pill */}
        <div className="relative border-l border-zinc-850/80 pl-2.5 shrink-0" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-expanded={isProfileOpen}
            aria-label="User Profile Options"
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-zinc-900/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 cursor-pointer"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-mono text-xs font-bold text-indigo-400 shrink-0">
                {userInitial}
              </div>
            )}
            <div className="hidden xl:block text-left leading-tight shrink-0">
              <p className="text-[11px] font-semibold text-white truncate max-w-[85px]">{displayName}</p>
              <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                {isCloudSynced ? 'CLOUD SYNC' : 'OFFLINE GUEST'}
              </p>
            </div>
          </button>

          {/* USER PROFILE DROPDOWN */}
          <div className={`absolute top-full right-0 mt-2 w-56 bg-[#0e0e11]/95 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-md text-left transition-all duration-150 ease-out transform-gpu will-change-transform origin-top-right ${
            isProfileOpen ? 'opacity-100 scale-100 translate-y-0 visible pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 invisible pointer-events-none'
          }`}>
            <div className="px-3 py-2 border-b border-zinc-850 mb-1">
              <p className="text-xs font-bold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user?.email || 'Guest Account'}</p>
            </div>
            
            <button
              type="button"
              onClick={() => {
                navigate('/settings');
                setIsProfileOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Icon name="SlidersHorizontal" className="w-4 h-4 text-zinc-400" />
              System Settings
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  const { StudyBrainRuntime } = await import('@/runtime/StudyBrainRuntime');
                  const runtime = StudyBrainRuntime.getInstance();
                  await runtime.refresh('INIT');
                  toast({ title: 'Sync Complete', message: 'All data refreshed and synced with cloud.', type: 'success' });
                } catch (e) {
                  toast({ title: 'Sync Failed', message: String(e), type: 'error' });
                }
                setIsProfileOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Icon name="RefreshCw" className="w-4 h-4 opacity-80" />
              Force Cloud Sync
            </button>
            
            <button
              type="button"
              onClick={async () => {
                try {
                  await logout();
                  navigate('/login');
                } catch (e) {
                  console.error("Logout failed", e);
                }
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors flex items-center gap-2 mt-1 border-t border-zinc-850/50 cursor-pointer"
            >
              <Icon name="LogOut" className="w-4 h-4 opacity-80" />
              Sign Out
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
