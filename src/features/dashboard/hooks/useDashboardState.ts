import { useState, useEffect, useMemo } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useAuth } from '@/features/auth';
import { RevisionCard } from '@/services/revisionEngineService';

export function useDashboardState() {
  const actions = useStudyBrainStore(s => s.actions);
  const chapterTelemetryMap = useStudyBrainStore(s => s.chapterTelemetryMap);
  const mentorProfile = useStudyBrainStore(s => s.mentorProfile);
  const estimatedRemainingHours = useStudyBrainStore(s => s.estimatedRemainingHours);
  const plannedQuestions = useStudyBrainStore(s => s.plannedQuestions);
  const targetFinishTime = useStudyBrainStore(s => s.targetFinishTime);
  const todayMissions = useStudyBrainStore(s => s.todayMissions);
  const activeSubject = useStudyBrainStore(s => s.activeSubject);
  const isMissionModeActive = useStudyBrainStore(s => s.isMissionModeActive);
  const energyLevel = useStudyBrainStore(s => s.energyLevel);
  const chapters = useStudyBrainStore(s => s.chapters);
  const revisionQueue = useStudyBrainStore(s => s.revisionQueue);
  const settings = useStudyBrainStore(s => s.settings);
  const syllabusProgress = useStudyBrainStore(s => s.syllabusProgress);
  const analytics = useStudyBrainStore(s => s.analytics);
  const xp = useStudyBrainStore(s => s.xp);
  const studySessions = useStudyBrainStore(s => s.studySessions);
  const projectedReadiness = useStudyBrainStore(s => s.projectedReadiness);
  const loading = useStudyBrainStore(s => s.loading);
  const { user } = useAuth();

  // Focus session state
  const [sessionState, setSessionState] = useState<'idle' | 'active' | 'paused'>('idle');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<RevisionCard | null>(null);
  const [isCustomMissionModalOpen, setIsCustomMissionModalOpen] = useState(false);
  const [missionToEdit, setMissionToEdit] = useState<any>(null);
  const [isShortcutGuideOpen, setIsShortcutGuideOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'focus' | 'analytics'>('focus');
  const [isMonthlyObjectiveModalOpen, setIsMonthlyObjectiveModalOpen] = useState(false);

  // Header cards smart expand/collapse state
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(false);

  const hasBottleneckAlert = useMemo(() => {
    const list = (Object.values(chapterTelemetryMap || {}) as any[]).filter(
      t => t && t.isBottleneck && t.bottleneckReason
    );
    return list.length > 0;
  }, [chapterTelemetryMap]);

  useEffect(() => {
    // 1. Check if user already manually toggled the panel in this session
    const sessionOverride = sessionStorage.getItem('jee_command_center_override');
    if (sessionOverride) {
      setIsHeaderExpanded(sessionOverride === 'expanded');
      return;
    }

    // 2. Check if this is the first visit of the day
    const todayStr = new Date().toISOString().split('T')[0];
    const lastVisitDate = localStorage.getItem('jee_last_dashboard_expand_date');
    const isFirstVisitOfDay = lastVisitDate !== todayStr;

    // 3. Determine if smart auto-expand should trigger
    if (isFirstVisitOfDay || hasBottleneckAlert) {
      setIsHeaderExpanded(true);

      // Record first visit of day if applicable
      if (isFirstVisitOfDay) {
        localStorage.setItem('jee_last_dashboard_expand_date', todayStr);
      }

      // Dynamic duration: 8 seconds for bottleneck alert, 5 seconds for normal first visit of day
      const duration = hasBottleneckAlert ? 8000 : 5000;
      const timer = setTimeout(() => {
        setIsHeaderExpanded(false);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Routine visit on same day with no bottleneck alert -> stay collapsed by default
      setIsHeaderExpanded(false);
    }
  }, [hasBottleneckAlert]);

  const handleManualToggleHeader = () => {
    setIsHeaderExpanded(prev => {
      const next = !prev;
      sessionStorage.setItem('jee_command_center_override', next ? 'expanded' : 'collapsed');
      return next;
    });
  };

  // Global Shift+? shortcut to open guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Prevent opening if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        setIsShortcutGuideOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus session timer effect
  useEffect(() => {
    let interval: any = null;
    if (sessionState === 'active') {
      interval = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [sessionState]);

  const handleStartSession = () => {
    if (sessionState === 'active') {
      setSessionState('paused');
      actions.setMissionModeActive(true);
    } else {
      setSessionState('active');
      actions.setMissionModeActive(true);
    }
  };

  const handleResetSession = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessionState('idle');
    setSecondsElapsed(0);
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.displayName?.split(' ')[0] || (mentorProfile?.coachingName ? 'Mani' : 'Aspirant');

  const incompleteTasks = todayMissions.filter(m => !m.completed);
  const nextTaskName = incompleteTasks[0]?.taskName || 'All daily tasks complete';

  const missionModeSubject: 'physics' | 'chemistry' | 'maths' = (() => {
    if (activeSubject !== 'all' && incompleteTasks.some(m => m.subject === activeSubject)) {
      return activeSubject;
    }
    const nextSubject = incompleteTasks[0]?.subject;
    if (nextSubject === 'physics' || nextSubject === 'chemistry' || nextSubject === 'maths') {
      return nextSubject;
    }
    return 'physics';
  })();

  return {
    state: {
      loading,
      sessionState,
      secondsElapsed,
      expandedMission,
      selectedRevision,
      isCustomMissionModalOpen,
      missionToEdit,
      isShortcutGuideOpen,
      activeTab,
      isMonthlyObjectiveModalOpen,
      isHeaderExpanded,
      userName,
      getGreeting,
      incompleteTasks,
      nextTaskName,
      missionModeSubject,
      // Store state
      mentorProfile,
      estimatedRemainingHours,
      plannedQuestions,
      targetFinishTime,
      todayMissions,
      activeSubject,
      isMissionModeActive,
      energyLevel,
      chapters,
      revisionQueue,
      settings,
      syllabusProgress,
      analytics,
      xp,
      studySessions,
      projectedReadiness,
    },
    handlers: {
      setExpandedMission,
      setSelectedRevision,
      setIsCustomMissionModalOpen,
      setMissionToEdit,
      setIsShortcutGuideOpen,
      setActiveTab,
      setIsMonthlyObjectiveModalOpen,
      handleManualToggleHeader,
      handleStartSession,
      handleResetSession,
      formatTimer,
      setSecondsElapsed,
      setSessionState,
    },
    actions
  };
}
