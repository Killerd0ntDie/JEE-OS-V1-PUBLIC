import { useState, useMemo } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { WeeklyBlock, getDayFocusPill, getHeaderBadgeText } from '@jee-os/engines';
import { TodayMission, SubjectId } from '@/types/index';

export function usePlannerState() {
  const actions = useStudyBrainStore(state => state.actions);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const settings = useStudyBrainStore(state => state.settings);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);
  const plannerOutput = useStudyBrainStore(state => state.plannerOutput);
  const chapters = useStudyBrainStore(state => state.chapters);
  const todayMissions = useStudyBrainStore(state => state.todayMissions);
  const energyLevel = useStudyBrainStore(state => state.energyLevel);
  const weeklyGoals = useStudyBrainStore(state => state.weeklyGoals);

  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [isEditGoalsOpen, setIsEditGoalsOpen] = useState(false);

  const dailyCapHours = mentorProfile?.dailyAvailableHours || settings.dailyQuota || 4;

  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const currentDayIndex = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  }, []);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(currentDayIndex);

  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [isWeeklyCheckinModalOpen, setIsWeeklyCheckinModalOpen] = useState(false);
  const [isMonthlyObjectiveModalOpen, setIsMonthlyObjectiveModalOpen] = useState(false);
  const [isAuditDropdownOpen, setIsAuditDropdownOpen] = useState(false);
  const [isCustomMissionModalOpen, setIsCustomMissionModalOpen] = useState(false);
  const [isAiRevisionModalOpen, setIsAiRevisionModalOpen] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);
  const [missionToSwap, setMissionToSwap] = useState<TodayMission | null>(null);

  const [selectedBlock, setSelectedBlock] = useState<WeeklyBlock | null>(null);
  const [isRationaleExpanded, setIsRationaleExpanded] = useState(false);

  const [isAutoBalancing, setIsAutoBalancing] = useState(false);
  const [balanceToast, setBalanceToast] = useState(false);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getDayDateString = (dayIndex: number) => {
    const today = new Date();
    const diff = dayIndex - currentDayIndex;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const activeBottlenecks = useMemo(() => {
    const list: string[] = [];
    Object.values(chapterTelemetryMap || {}).forEach((t: any) => {
      if (t && t.isBottleneck && t.bottleneckReason) {
        list.push(t.bottleneckReason);
      }
    });
    return list.length > 0 
      ? list.slice(0, 3) 
      : ['Physics Mechanics lecture backlog', 'Chemistry GOC reaction mechanism DPPs'];
  }, [chapterTelemetryMap]);

  const deletedMissionIds = useStudyBrainStore(s => s.deletedMissionIds) || [];



  const weeklyMatrix = useStudyBrainStore(s => s.weeklySchedule) || [];
  const handleAutoBalance = async () => {
    setIsAutoBalancing(true);
    try {
      if (actions?.rebalancePlan) {
        await actions.rebalancePlan();
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
      setBalanceToast(true);
      setTimeout(() => setBalanceToast(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAutoBalancing(false);
    }
  };

  const selectedDayBlocks = useMemo(() => {
    return weeklyMatrix.filter(b => {
      // In weeklyMatrix, today's blocks might have 'today-' prefix in their ID
      const originalId = b.id.startsWith('today-') ? b.id.slice(6) : b.id;
      return b.dayIndex === selectedDayIndex && !deletedMissionIds.includes(originalId);
    });
  }, [weeklyMatrix, selectedDayIndex, deletedMissionIds]);

  const getSubjectStyle = (subject: string) => {
    switch (subject.toLowerCase()) {
      case 'physics': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'chemistry': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'maths': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getBadgeStyle = (arg1: any, arg2?: string) => {
    if (typeof arg1 === 'string') {
      const s = arg1.toLowerCase();
      if (s.includes('phys')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      if (s.includes('chem')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      if (s.includes('math')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
    if (arg1) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    if (arg2?.toLowerCase().includes('pyq')) return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    if (arg2?.toLowerCase().includes('test')) return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
  };

  const activeInspectorTelemetry = useMemo(() => {
    if (!selectedBlock) return null;
    return chapterTelemetryMap?.[selectedBlock.chapterId] || null;
  }, [selectedBlock, chapterTelemetryMap]);




  const handleMoveBlock = (blockId: string, targetDayIndex: number, newTimeSlot: string) => {
    const timeMatch = newTimeSlot.match(/(\d{1,2}:\d{2}\s*(am|pm|AM|PM)?)/);
    const scheduledTime = timeMatch ? timeMatch[1] : undefined;
    const scheduledDate = getDayDateString(targetDayIndex);

    if (actions.updateScheduleBlock) {
      actions.updateScheduleBlock(blockId, {
        dayIndex: targetDayIndex,
        timeSlot: newTimeSlot,
        scheduledDate,
        scheduledTime,
      });
    }
  };



  return {
    actions,
    mentorProfile,
    settings,
    chapterTelemetryMap,
    plannerOutput,
    chapters,
    todayMissions,
    energyLevel,
    weeklyGoals,

    isSandboxMode, setIsSandboxMode,
    isEditGoalsOpen, setIsEditGoalsOpen,
    dailyCapHours,
    viewMode, setViewMode,
    currentDayIndex,
    selectedDayIndex, setSelectedDayIndex,

    isInterviewModalOpen, setIsInterviewModalOpen,
    isDiagnosisModalOpen, setIsDiagnosisModalOpen,
    isWeeklyCheckinModalOpen, setIsWeeklyCheckinModalOpen,
    isMonthlyObjectiveModalOpen, setIsMonthlyObjectiveModalOpen,
    isAuditDropdownOpen, setIsAuditDropdownOpen,
    isCustomMissionModalOpen, setIsCustomMissionModalOpen,
    isAiRevisionModalOpen, setIsAiRevisionModalOpen,
    missionToDelete, setMissionToDelete,
    missionToSwap, setMissionToSwap,

    selectedBlock, setSelectedBlock,
    isRationaleExpanded, setIsRationaleExpanded,

    isAutoBalancing, setIsAutoBalancing,
    balanceToast, setBalanceToast,

    daysOfWeek,
    fullDayNames,
    getDayDateString,
    activeBottlenecks,
    weeklyMatrix,
    handleMoveBlock,
    handleAutoBalance,
    selectedDayBlocks,
    getSubjectStyle,
    getBadgeStyle,
    activeInspectorTelemetry
  };
}
