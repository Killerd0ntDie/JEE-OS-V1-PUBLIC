import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PAGES, PageId } from '@/types/index';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { JeeOsLogo } from '@/components/shared/JeeOsLogo';
import { ChapterTelemetry } from '@jee-os/engines';
import { useToast } from '@/components/ui/ToastProvider';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

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
  const { user } = useAuth();
  
  const chapterTelemetryMap = useStudyBrainStore(s => s.chapterTelemetryMap);
  const todayMissions = useStudyBrainStore(s => s.todayMissions);
  const settings = useStudyBrainStore(s => s.settings);
  const xp = useStudyBrainStore(s => s.xp);
  const analytics = useStudyBrainStore(s => s.analytics);
  const actions = useStudyBrainStore(s => s.actions);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBreadcrumbMenuOpen, setIsBreadcrumbMenuOpen] = useState(false);
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute System Notifications from Real Engine Telemetry
  const telemetryList = (Object.values(chapterTelemetryMap || {}) as ChapterTelemetry[]);
  const lowRetentionChaps = telemetryList.filter(t => t && t.retentionConfidence === 'Low');
  const bottleneckChaps = telemetryList.filter(t => t && t.isBottleneck);
  const pendingMissionsCount = todayMissions.filter(m => !m.completed).length;

  const notifications = [
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
      desc: `${pendingMissionsCount} daily missions pending allocation for ${settings?.dreamIit || 'IIT'}.`,
      targetPage: 'dashboard' as PageId,
      time: 'Today'
    }] : []),
    {
      id: 'notif-streak-current',
      type: 'success' as const,
      tag: 'SYSTEM STREAK',
      title: `${xp?.streak || 0}-Day Consistency Streak`,
      desc: `XP Level ${xp?.level || 1} • Total XP: ${xp?.total || 0}. Keep momentum going!`,
      targetPage: 'analytics' as PageId,
      time: 'Active'
    }
  ];

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
    <header className="h-14 border-b border-white/10 bg-zinc-950/80 backdrop-blur-2xl flex items-center justify-between px-4 sticky top-0 z-30 select-none shadow-xl">
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
            className="flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800/80 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50 cursor-pointer group text-left"
            title="Click to go to Dashboard"
          >
            <JeeOsLogo size="sm" />
            <div className="flex items-center gap-1.5 font-display font-black text-white text-sm tracking-tight group-hover:text-indigo-400 transition-colors">
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
              <Icon name="ChevronDown" aria-hidden="true" className={`w-3 h-3 text-zinc-500 transition-transform ${isBreadcrumbMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Page Jump Popover Menu */}
            {isBreadcrumbMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in backdrop-blur-2xl">
                <div className="text-[9px] font-mono font-bold uppercase text-zinc-500 px-2.5 py-1 tracking-wider">
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
            )}
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
            <Icon name="Search" aria-hidden="true" className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 transition-colors shrink-0" />
            <span className="truncate text-xs">Search commands & topics...</span>
          </span>
          <div className="flex items-center gap-1 shrink-0 font-mono text-xs text-zinc-500 bg-zinc-950/80 border border-zinc-800 px-1.5 py-0.5 rounded-md">
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

        {/* Target College Badge */}
        <div className="hidden lg:flex items-center gap-1.5 bg-indigo-950/40 border border-indigo-900/50 text-indigo-300 text-xs font-mono px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 shadow-sm">
          <Icon name="Target" aria-hidden="true" className="w-3 h-3 text-indigo-400 animate-pulse shrink-0" />
          <span>{settings?.dreamIit} • {settings?.targetBranch === 'Computer Science & Engineering' ? 'CSE' : settings?.targetBranch}</span>
        </div>

        {/* Quick Stat Pill: Streak */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 px-2.5 py-1 rounded-full text-xs font-mono text-zinc-300">
          <span aria-hidden="true">⚡</span>
          <span className="font-bold text-amber-400">{xp?.streak || 0}d</span>
        </div>

        {/* Quick Stat Pill: Study Time */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 px-2.5 py-1 rounded-full text-xs font-mono text-zinc-300">
          <span aria-hidden="true">⏱️</span>
          <span className="font-bold text-indigo-400">{(analytics?.studyTime / 60 || 0).toFixed(1)}h</span>
        </div>

        {/* Keyboard Shortcuts Trigger Button */}
        {onOpenShortcutGuide && (
          <button
            type="button"
            onClick={onOpenShortcutGuide}
            aria-label="Keyboard Shortcuts Guide (?)"
            className="p-1.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer font-mono text-xs flex items-center justify-center w-8 h-8"
            title="Keyboard Shortcuts (?)"
          >
            <span>?</span>
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
          {isNotificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-[#0e0e11] border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in backdrop-blur-2xl text-left space-y-3">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Icon name="Bell" className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Intelligence Alerts</span>
                  </span>
                  {unreadNotifications.length > 0 && (
                    <span className="bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                      {unreadNotifications.length} New
                    </span>
                  )}
                </div>
                {unreadNotifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 cursor-pointer"
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
                    <div
                      key={n.id}
                      onClick={() => {
                        navigate(`/${n.targetPage}`);
                        setReadNotificationIds(prev => [...prev, n.id]);
                        setIsNotificationsOpen(false);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1 ${
                        isRead 
                          ? 'bg-zinc-950/40 border-zinc-850 opacity-60' 
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          n.type === 'warning' ? 'bg-amber-950/30 text-amber-400 border border-amber-900/40' :
                          n.type === 'alert' ? 'bg-red-950/30 text-red-400 border border-red-900/40' :
                          n.type === 'success' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40' :
                          'bg-indigo-950/30 text-indigo-400 border border-indigo-900/40'
                        }`}>
                          {n.tag}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">{n.time}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white tracking-tight">{n.title}</h4>
                      <p className="text-[10.5px] text-zinc-400 leading-relaxed font-sans">{n.desc}</p>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center shrink-0 pr-2">
          <ThemeToggle />
        </div>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 border-l border-zinc-850/80 pl-2.5 shrink-0">
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
            <p className="text-[8px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              {isCloudSynced ? 'CLOUD SYNC' : 'OFFLINE GUEST'}
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}
