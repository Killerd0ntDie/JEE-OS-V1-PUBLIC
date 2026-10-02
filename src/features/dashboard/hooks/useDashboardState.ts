import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '@/features/auth';
import { RevisionCard } from '@/services/revisionEngineService';
import { audioEngine } from '@/utils/audioEngine';
import { storageAdapter } from '@/services/StorageAdapter';

export function useDashboardState() {
  const navigate = useNavigate();
  
  const {
    actions,
    chapterTelemetryMap,
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
    loading
  } = useStudyBrainStore(useShallow(s => ({
    actions: s.actions,
    chapterTelemetryMap: s.chapterTelemetryMap,
    mentorProfile: s.mentorProfile,
    estimatedRemainingHours: s.estimatedRemainingHours,
    plannedQuestions: s.plannedQuestions,
    targetFinishTime: s.targetFinishTime,
    todayMissions: s.todayMissions,
    activeSubject: s.activeSubject,
    isMissionModeActive: s.isMissionModeActive,
    energyLevel: s.energyLevel,
    chapters: s.chapters,
    revisionQueue: s.revisionQueue,
    settings: s.settings,
    syllabusProgress: s.syllabusProgress,
    analytics: s.analytics,
    xp: s.xp,
    studySessions: s.studySessions,
    projectedReadiness: s.projectedReadiness,
    loading: s.loading
  })));

  const { user } = useAuth();

  // Focus session state
  const [sessionState, setSessionState] = useState<'idle' | 'active' | 'paused'>('idle');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<RevisionCard | null>(null);
  const [isCustomMissionModalOpen, setIsCustomMissionModalOpen] = useState(false);
  const [missionToEdit, setMissionToEdit] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'focus' | 'analytics'>('focus');
  const [isMonthlyObjectiveModalOpen, setIsMonthlyObjectiveModalOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionIdState] = useState<string | null>(
    () => storageAdapter.getSession<string>('jeeos_selected_mission_id')
  );
  const [activeBreakMissionId, setActiveBreakMissionId] = useState<string | null>(null);

  const setSelectedMissionId = (id: string | null) => {
    setSelectedMissionIdState(id);
    if (id) {
      storageAdapter.setSession('jeeos_selected_mission_id', id);
    } else {
      storageAdapter.removeSession('jeeos_selected_mission_id');
    }
  };

  // Header cards smart expand/collapse state
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(false);

  const hasBottleneckAlert = useMemo(() => {
    const list = Object.values(chapterTelemetryMap || {}).filter(
      t => t?.isBottleneck && t.bottleneckReason
    );
    return list.length > 0;
  }, [chapterTelemetryMap]);

  const [recoverableSession, setRecoverableSession] = useState<any | null>(null);

  useEffect(() => {
    if (loading || !todayMissions?.length) return;

    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const mission of todayMissions) {
      if (mission.completed) continue;
      const key = `jeeos_mission_state_${mission.id}`;
      const saved = storageAdapter.getItem<any>(key);
      if (!saved) continue;

      try {
        if (!saved.seconds || saved.seconds < 60) continue;
        
        if (saved.timestamp && (now - saved.timestamp) > STALE_THRESHOLD_MS) {
          storageAdapter.removeItem(key);
          continue;
        }

        setRecoverableSession({
          missionId: mission.id,
          chapterName: mission.chapterName || mission.chapter || mission.taskName || 'Unknown',
          elapsedMinutes: Math.round(saved.seconds / 60),
          focusScore: Math.round(saved.focusScore ?? 100),
          timestamp: saved.timestamp || now
        });
        break;
      } catch {
        // ignore
      }
    }
  }, [loading, todayMissions]);

  const handleResumeSession = useCallback(() => {
    if (!recoverableSession) return;
    audioEngine.playClick().catch(() => {});
    navigate(`/cockpit/${recoverableSession.missionId}`);
    setRecoverableSession(null);
  }, [recoverableSession, navigate]);

  const handleDiscardSession = useCallback(() => {
    if (!recoverableSession) return;
    storageAdapter.removeItem(`jeeos_mission_state_${recoverableSession.missionId}`);
    setRecoverableSession(null);
  }, [recoverableSession]);

  useEffect(() => {
    // 1. Check if user already manually toggled the panel in this session
    const sessionOverride = storageAdapter.getSession<string>('jeeos_command_center_override');
    if (sessionOverride) {
      setIsHeaderExpanded(sessionOverride === 'expanded');
      return;
    }

    // 2. Check if this is the first visit of the day or has bottleneck alert
    const todayStr = new Date().toLocaleDateString('en-CA');
    const lastVisitDate = storageAdapter.getItem<string>('jeeos_last_dashboard_expand_date');
    const isFirstVisitOfDay = lastVisitDate !== todayStr;

    if (isFirstVisitOfDay || hasBottleneckAlert) {
      setIsHeaderExpanded(true);
      if (isFirstVisitOfDay) {
        storageAdapter.setItem('jeeos_last_dashboard_expand_date', todayStr);
      }
    } else {
      setIsHeaderExpanded(false);
    }
  }, [hasBottleneckAlert]);

  const handleManualToggleHeader = useCallback(() => {
    setIsHeaderExpanded(prev => {
      const next = !prev;
      storageAdapter.setSession('jeeos_command_center_override', next ? 'expanded' : 'collapsed');
      return next;
    });
  }, []);

  // Focus session timer is now strictly handled by MissionMode.tsx
  // Dashboard only holds the static paused value to prevent massive unneeded re-renders.

  const handleStartSession = useCallback((missionId?: string) => {
    let targetMissionId = missionId || selectedMissionId;
    if (!targetMissionId) {
      const nextMission = todayMissions.find(m => !m.completed);
      targetMissionId = nextMission?.id || '';
    }
    
    const targetMission = todayMissions.find(m => m.id === targetMissionId);
    const isBreak = Boolean(
      targetMission && (
        (targetMission.subject as string)?.toLowerCase() === 'break' ||
        (targetMission.type as string)?.toLowerCase() === 'break' ||
        targetMission.taskName?.toLowerCase().includes('break')
      )
    );
    
    if (isBreak) {
      audioEngine.playClick().catch(() => {});
      setActiveBreakMissionId(targetMissionId);
      return;
    }

    audioEngine.playClick().catch(() => {});
    navigate(`/cockpit/${targetMissionId}`);
  }, [selectedMissionId, todayMissions, navigate]);

  const handleResetSession = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessionState('idle');
    setSecondsElapsed(0);
  }, []);

  const formatTimer = useCallback((totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Dynamic Greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
  }, []);

  const userName = user?.displayName?.split(' ')[0] || mentorProfile?.name || mentorProfile?.userName || 'Aspirant';

  const incompleteTasks = useMemo(() => todayMissions.filter(m => !m.completed), [todayMissions]);
  const nextTaskName = incompleteTasks[0]?.taskName || 'All daily tasks complete';

  // Routine Break Modal state
  const [isRoutineBreakModalOpen, setIsRoutineBreakModalOpen] = useState(false);

  const handleOpenRoutineBreak = useCallback(() => setIsRoutineBreakModalOpen(true), []);
  const handleCloseRoutineBreak = useCallback(() => setIsRoutineBreakModalOpen(false), []);

  const handleSetEnergyLevel = useCallback((level: 'High' | 'Medium' | 'Low') => {
    actions.setEnergyLevel(level);
  }, [actions]);

  const handleOpenChapter = useCallback((chapterId: string) => {
    actions.openChapterEditModal(chapterId);
  }, [actions]);

  const handleOpenMonthlyObjective = useCallback(() => {
    setIsMonthlyObjectiveModalOpen(true);
  }, []);

  const handleCloseMonthlyObjective = useCallback(() => {
    setIsMonthlyObjectiveModalOpen(false);
  }, []);

  const handleNavigatePlanner = useCallback(() => {
    navigate('/planner');
  }, [navigate]);

  const handleEditMission = useCallback((mission: any) => {
    setMissionToEdit(mission);
    setIsCustomMissionModalOpen(true);
  }, []);

  const handleOpenCustomMission = useCallback(() => {
    setIsCustomMissionModalOpen(true);
  }, []);

  const handleCloseCustomMission = useCallback(() => {
    setIsCustomMissionModalOpen(false);
    setTimeout(() => setMissionToEdit(null), 300);
  }, []);

  const handleCloseActiveBreak = useCallback(() => {
    setActiveBreakMissionId(null);
  }, []);

  const handleQuickRevisionAction = useCallback((chapterId: string, outcome: 'complete' | 'difficult' | 'needs_another' | 'skip', _notes?: string) => {
    if (outcome === 'skip') return;
    const confidence = outcome === 'complete' ? 'High' : outcome === 'needs_another' ? 'Medium' : 'Low';
    actions.completeRevision(chapterId, confidence);
  }, [actions]);

  const handlers = useMemo(() => ({
    setExpandedMission,
    setSelectedRevision,
    setIsCustomMissionModalOpen,
    setMissionToEdit,
    setActiveTab,
    setIsMonthlyObjectiveModalOpen,
    handleManualToggleHeader,
    handleStartSession,
    handleResetSession,
    formatTimer,
    setSecondsElapsed,
    setSessionState,
    setSelectedMissionId,
    setActiveBreakMissionId,
    handleResumeSession,
    handleDiscardSession,
    handleSetEnergyLevel,
    handleOpenRoutineBreak,
    handleCloseRoutineBreak,
    handleOpenChapter,
    handleOpenMonthlyObjective,
    handleCloseMonthlyObjective,
    handleNavigatePlanner,
    handleEditMission,
    handleOpenCustomMission,
    handleCloseCustomMission,
    handleCloseActiveBreak,
    handleQuickRevisionAction,
  }), [
    handleManualToggleHeader,
    handleStartSession,
    handleResetSession,
    formatTimer,
    handleResumeSession,
    handleDiscardSession,
    handleSetEnergyLevel,
    handleOpenRoutineBreak,
    handleCloseRoutineBreak,
    handleOpenChapter,
    handleOpenMonthlyObjective,
    handleCloseMonthlyObjective,
    handleNavigatePlanner,
    handleEditMission,
    handleOpenCustomMission,
    handleCloseCustomMission,
    handleCloseActiveBreak,
    handleQuickRevisionAction,
  ]);

  return {
    state: {
      loading,
      sessionState,
      secondsElapsed,
      expandedMission,
      selectedRevision,
      isCustomMissionModalOpen,
      missionToEdit,
      activeTab,
      isMonthlyObjectiveModalOpen,
      isRoutineBreakModalOpen,
      isHeaderExpanded,
      userName,
      getGreeting,
      incompleteTasks,
      nextTaskName,
      selectedMissionId,
      activeBreakMissionId,
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
      recoverableSession,
    },
    handlers,
    actions
  };
}
