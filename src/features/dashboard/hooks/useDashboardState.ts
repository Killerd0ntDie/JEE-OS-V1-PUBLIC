import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useAuth } from '@/features/auth';
import { RevisionCard } from '@/services/revisionEngineService';
import { audioEngine } from '@/utils/audioEngine';

export function useDashboardState() {
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState<'focus' | 'analytics'>('focus');
  const [isMonthlyObjectiveModalOpen, setIsMonthlyObjectiveModalOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionIdState] = useState<string | null>(
    () => sessionStorage.getItem('jee_selected_mission_id')
  );
  const [activeBreakMissionId, setActiveBreakMissionId] = useState<string | null>(null);

  const setSelectedMissionId = (id: string | null) => {
    setSelectedMissionIdState(id);
    if (id) {
      sessionStorage.setItem('jee_selected_mission_id', id);
    } else {
      sessionStorage.removeItem('jee_selected_mission_id');
    }
  };

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

    // 2. Check if this is the first visit of the day or has bottleneck alert
    const todayStr = new Date().toLocaleDateString('en-CA');
    const lastVisitDate = localStorage.getItem('jee_last_dashboard_expand_date');
    const isFirstVisitOfDay = lastVisitDate !== todayStr;

    if (isFirstVisitOfDay || hasBottleneckAlert) {
      setIsHeaderExpanded(true);
      if (isFirstVisitOfDay) {
        localStorage.setItem('jee_last_dashboard_expand_date', todayStr);
      }
    } else {
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

  // Focus session timer is now strictly handled by MissionMode.tsx
  // Dashboard only holds the static paused value to prevent massive unneeded re-renders.

  const handleStartSession = (missionId?: string) => {
    let targetMissionId = missionId || selectedMissionId;
    if (!targetMissionId) {
      const nextMission = todayMissions.find(m => !m.completed);
      targetMissionId = nextMission?.id || '';
    }
    
    const targetMission = todayMissions.find(m => m.id === targetMissionId);
    const isBreak = targetMission && ((targetMission.subject as string) === 'break' || (targetMission.type as string) === 'BREAK' || targetMission.taskName?.toLowerCase().includes('break'));
    
    if (isBreak) {
      setActiveBreakMissionId(targetMissionId);
      return;
    }

    audioEngine.playClick().catch(() => {});
    navigate(`/cockpit/${targetMissionId}`);
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
    if (hour >= 4 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  };

  const userName = user?.displayName?.split(' ')[0] || (mentorProfile as any)?.name || (mentorProfile as any)?.userName || 'Aspirant';

  const incompleteTasks = useMemo(() => todayMissions.filter(m => !m.completed), [todayMissions]);
  const nextTaskName = incompleteTasks[0]?.taskName || 'All daily tasks complete';

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
    },
    handlers: {
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
    },
    actions
  };
}
