import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { easings } from '@/constants/motion';
import { useAuth } from '@/features/auth';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useShallow } from 'zustand/react/shallow';
import { ChapterTelemetry } from '@jee-os/engines';
import { storageAdapter } from '@/services/StorageAdapter';
import { getTodayStudyMinutes } from '@/utils/streakCalculations';
import { calculateLevelFromXP, getTitleAndColor } from '@/utils/levelingCalculations';
import {
  DockNavigation,
  DockTelemetryPills,
  UserProfileDropdown,
  SystemNotification
} from './dock';

export interface FloatingDynamicDockProps {
  onOpenCommandPalette: () => void;
  onOpenShortcutGuide?: () => void;
}

export function FloatingDynamicDock({
  onOpenCommandPalette,
  onOpenShortcutGuide: _onOpenShortcutGuide
}: FloatingDynamicDockProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isStandalone = location.pathname.startsWith('/cockpit') || 
                       location.pathname.startsWith('/dev-cockpit') || 
                       location.pathname.startsWith('/mission') || 
                       location.pathname.startsWith('/diagnostic') ||
                       location.pathname.startsWith('/mock-tests/result') ||
                       location.pathname.startsWith('/result') ||
                       location.pathname.startsWith('/mock-test/result');

  const {
    chapterTelemetryMap,
    todayMissions,
    settings,
    xp,
    analytics,
    studySessions
  } = useStudyBrainStore(useShallow(s => ({
    chapterTelemetryMap: s.chapterTelemetryMap,
    todayMissions: s.todayMissions,
    settings: s.settings,
    xp: s.xp,
    analytics: s.analytics,
    studySessions: s.studySessions || [],
    actions: s.actions
  })));

  // Telemetry Calculations - Canonical Single Source of Truth
  const effectiveStreak = xp?.streak ?? 0;
  const minStreakMins = Math.round((settings?.minStreakHours ?? 0.5) * 60);
  const todayStudyMins = useMemo(() => getTodayStudyMinutes(studySessions), [studySessions]);
  
  const formatStudyTime = (hours: number): string => {
    if (!hours) return '0m';
    const totalMins = Math.round(hours * 60);
    if (totalMins < 60) return `${totalMins}m`;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  const todayHoursStr = formatStudyTime(todayStudyMins / 60);

  // Active popover menu state (telemetry & system)
  const [activeMenu, setActiveMenu] = useState<'streak' | 'time' | 'notifications' | 'profile' | null>(null);
  const [isDockPinned] = useState(() => {
    return storageAdapter.getDockPinned();
  });

  const [isDockHidden, setIsDockHidden] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const dockRef = useRef<HTMLDivElement>(null);

  // Notifications logic
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    return storageAdapter.getReadNotifications();
  });

  useEffect(() => {
    storageAdapter.setReadNotifications(readNotificationIds);
  }, [readNotificationIds]);

  // Compute System Notifications
  const notifications: SystemNotification[] = useMemo(() => {
    const telemetryList = (Object.values(chapterTelemetryMap || {}) as ChapterTelemetry[]);
    const lowRetentionChaps = telemetryList.filter(t => t && t.retentionConfidence === 'Low' && t.syllabusStage !== 'Not Started');
    const bottleneckChaps = telemetryList.filter(t => t?.isBottleneck);
    const pendingMissionsCount = todayMissions.filter(m => !m.completed).length;

    return [
      ...(lowRetentionChaps.length > 0 ? [{
        id: `notif-retention-${lowRetentionChaps[0]?.chapterId}`,
        type: 'warning' as const,
        tag: 'RETENTION DECAY',
        title: `${lowRetentionChaps.length} Chapter${lowRetentionChaps.length > 1 ? 's' : ''} Need Revision`,
        desc: `High-yield retention drop detected in ${lowRetentionChaps[0]?.chapterName}. Practice spaced review now.`,
        targetPath: '/revision',
        time: 'Real-time'
      }] : []),
      ...(bottleneckChaps.length > 0 ? [{
        id: `notif-bottleneck-${bottleneckChaps[0]?.chapterId}`,
        type: 'alert' as const,
        tag: 'BOTTLENECK ALERT',
        title: `Backlog Bottleneck Detected`,
        desc: bottleneckChaps[0]?.bottleneckReason || 'Lecture or DPP backlog requires execution priority.',
        targetPath: '/planner',
        time: 'Real-time'
      }] : []),
      ...(pendingMissionsCount > 0 ? [{
        id: 'notif-audit-daily',
        type: 'info' as const,
        tag: 'DAILY COCKPIT',
        title: 'Daily Execution Queue Active',
        desc: `You have ${pendingMissionsCount} pending missions remaining for today.`,
        targetPath: '/cockpit',
        time: 'Real-time'
      }] : []),
      {
        id: 'notif-streak-current',
        type: 'success' as const,
        tag: 'SYSTEM STREAK',
        title: `${effectiveStreak}-Day Consistency Streak`,
        desc: `XP Level ${xp?.level || 1} • Total XP: ${xp?.total || 0}. Keep momentum going!`,
        targetPath: '/analytics',
        time: 'Active'
      }
    ];
  }, [chapterTelemetryMap, todayMissions, effectiveStreak, xp]);

  const unreadNotifications = notifications.filter(n => !readNotificationIds.includes(n.id));

  // Auto-hide dock on scroll down, show on scroll up or mouse hover near bottom
  const isAiCoach = location.pathname.startsWith('/ai-coach');

  useEffect(() => {
    if (isDockPinned) {
      setIsDockHidden(false);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current + 50 && currentScrollY > 120) {
        setIsDockHidden(true);
        setActiveMenu(null);
      } else if (currentScrollY < lastScrollY.current - 20) {
        setIsDockHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isAiCoach) {
        if (e.clientX > window.innerWidth - 80) {
          setIsDockHidden(false);
        }
      } else {
        if (e.clientY > window.innerHeight - 80) {
          setIsDockHidden(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDockPinned, location.pathname, isAiCoach]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isInMockTest, setIsInMockTest] = useState(() => {
    return typeof document !== 'undefined' && document.body.classList.contains('in-mock-test');
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsInMockTest(document.body.classList.contains('in-mock-test'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (isStandalone || isInMockTest) return null;

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Test Aspirant');
  const userInitial = displayName.charAt(0).toUpperCase();
  const isGodModeStreak = effectiveStreak >= 7;
  const { level, progressPercent } = calculateLevelFromXP(xp?.total || 0);
  const { title, color } = getTitleAndColor(level);

  const toggleMenu = (menu: 'streak' | 'time' | 'notifications' | 'profile') => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  const handleItemHover = (id: string | null) => {
    setHoveredItem(id);
    if (id && activeMenu && id !== activeMenu) {
      setActiveMenu(null);
    }
  };

  const isDashboardActive = location.pathname === '/dashboard' || location.pathname === '/';
  const isMockTestsActive = location.pathname.startsWith('/mock-tests');
  const isPlannerActive = location.pathname.startsWith('/planner');
  const isPracticeActive = location.pathname.startsWith('/revision') || 
                           location.pathname.startsWith('/mistakes') || 
                           location.pathname.startsWith('/formulas');
  const isCoachActive = location.pathname.startsWith('/ai-coach') || 
                        location.pathname.startsWith('/coach-history') || 
                        location.pathname.startsWith('/analytics') || 
                        location.pathname.startsWith('/neural-link');

  const activePillLayoutId = isAiCoach ? "dockActivePillVertical" : "dockActivePillHorizontal";

  const renderDockItems = (isVertical: boolean) => (
    <>
      <DockNavigation
        isVertical={isVertical}
        isAiCoach={isAiCoach}
        isDashboardActive={isDashboardActive}
        isMockTestsActive={isMockTestsActive}
        isPlannerActive={isPlannerActive}
        isPracticeActive={isPracticeActive}
        isCoachActive={isCoachActive}
        activePillLayoutId={activePillLayoutId}
        hoveredItem={hoveredItem}
        handleItemHover={handleItemHover}
        onOpenCommandPalette={onOpenCommandPalette}
        onNavigateHome={() => {
          navigate('/dashboard');
          setActiveMenu(null);
        }}
        onSelectNav={() => setActiveMenu(null)}
      />

      <DockTelemetryPills
        isVertical={isVertical}
        effectiveStreak={effectiveStreak}
        isGodModeStreak={isGodModeStreak}
        todayStudyMins={todayStudyMins}
        minStreakMins={minStreakMins}
        todayHoursStr={todayHoursStr}
        settings={settings}
        studySessions={studySessions}
        analytics={analytics}
        notifications={notifications}
        unreadNotifications={unreadNotifications}
        activeMenu={activeMenu}
        toggleMenu={toggleMenu}
        hoveredItem={hoveredItem}
        handleItemHover={handleItemHover}
        formatStudyTime={formatStudyTime}
        onClearNotifications={() => setReadNotificationIds(notifications.map(n => n.id))}
        onNavigate={(path) => {
          navigate(path);
          setActiveMenu(null);
        }}
      />

      <UserProfileDropdown
        displayName={displayName}
        userInitial={userInitial}
        photoURL={user?.photoURL}
        email={user?.email}
        level={level}
        progressPercent={progressPercent}
        title={title}
        color={color}
        isVertical={isVertical}
        activeMenu={activeMenu}
        toggleMenu={toggleMenu}
        hoveredItem={hoveredItem}
        handleItemHover={handleItemHover}
        onCloseMenu={() => setActiveMenu(null)}
      />
    </>
  );

  return (
    <>
      {/* Invisible Hover Edge Detector for Quick Reveal */}
      <div 
        className={isAiCoach ? "fixed right-0 inset-y-0 w-4 z-40 pointer-events-auto" : "fixed bottom-0 inset-x-0 h-4 z-40 pointer-events-auto"}
        onMouseEnter={() => setIsDockHidden(false)}
      />

      {/* Dynamic Dock Presentation with Orientation Transitions */}
      <AnimatePresence mode="wait">
        {isAiCoach ? (
          <motion.div
            key="vertical-dock-wand"
            ref={dockRef}
            initial={{ opacity: 0, x: 30 }}
            animate={{ 
              opacity: isDockHidden ? 0 : 1, 
              x: isDockHidden ? 80 : 0 
            }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.22, ease: easings.expoOut }}
            className="fixed right-3.5 top-1/2 -translate-y-1/2 z-50 pointer-events-auto"
          >
            <div 
              onMouseLeave={() => handleItemHover(null)}
              className="relative w-12 py-3 px-1.5 flex flex-col items-center gap-2 rounded-3xl surface-elevated ring-1 ring-white/10 select-none"
            >
              {renderDockItems(true)}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="horizontal-dock-capsule"
            ref={dockRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ 
              opacity: isDockHidden ? 0 : 1, 
              y: isDockHidden ? 80 : 0 
            }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.22, ease: easings.expoOut }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[calc(100vw-1.5rem)]"
          >
            <div 
              onMouseLeave={() => handleItemHover(null)}
              className="relative surface-elevated rounded-2xl sm:rounded-full p-1.5 ring-1 ring-white/10 flex flex-row items-center gap-1 sm:gap-1.5 select-none"
            >
              {renderDockItems(false)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
