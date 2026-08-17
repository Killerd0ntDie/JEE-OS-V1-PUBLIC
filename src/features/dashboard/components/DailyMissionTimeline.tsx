import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { 
  Settings,
  Trash2,
  Pause,
  History,
  Plus,
  Moon,
  Clock,
  Check,
  X,
  Coffee,
  Play,
  Flame,
  SlidersHorizontal,
  Edit,
  ChevronDown,
  Activity,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '@/constants/motion';
import { TodayMission, SubjectId, Chapter } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { CustomMissionHistoryModal } from '@/features/mission/components/CustomMissionHistoryModal';
import { audioEngine } from '@/utils/audioEngine';
import { getStartMinutesFromTimeSlot, parseTimeSlotToRange } from '@/utils/timeSlotUtils';
import { useToast } from '@/components/ui/ToastProvider';

interface DailyMissionTimelineProps {
  sessionState: 'idle' | 'active' | 'paused';
  secondsElapsed: number;
  expandedMission: string | null;
  setExpandedMission: (id: string | null) => void;
  handleStartSession: (missionId?: string) => void;
  handleResetSession: (e?: React.MouseEvent) => void;
  formatTimer: (totalSecs: number) => string;
  onOpenCustomMission?: () => void;
  onEditMission?: (mission: TodayMission) => void;
  selectedMissionId?: string | null;
  setSelectedMissionId?: (id: string | null) => void;
}



const getSubjectBadgeStyle = (subj: SubjectId) => {
  switch (subj) {
    case 'physics':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'chemistry':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'maths':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    default:
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  }
};

export function DailyMissionTimeline({
  sessionState,
  secondsElapsed,
  expandedMission,
  setExpandedMission,
  handleStartSession,
  handleResetSession,
  formatTimer,
  onOpenCustomMission,
  onEditMission,
  selectedMissionId,
  setSelectedMissionId
}: DailyMissionTimelineProps) {
  const navigate = useNavigate();
  
  const actions = useStudyBrainStore(state => state.actions);
  const todayMissions = useStudyBrainStore(s => s.todayMissions);
  const energyLevel = useStudyBrainStore(s => s.energyLevel);
  const estimatedRemainingHours = useStudyBrainStore(s => s.estimatedRemainingHours);
  const plannedQuestions = useStudyBrainStore(s => s.plannedQuestions);
  const targetFinishTime = useStudyBrainStore(s => s.targetFinishTime);
  const chapters = useStudyBrainStore(s => s.chapters);
  const chapterTelemetryMap = useStudyBrainStore(s => s.chapterTelemetryMap);
  const settings = useStudyBrainStore(s => s.settings);
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const { toast } = useToast();

  const completedCount = todayMissions.filter(m => m.completed && !m.dismissed).length;
  const totalCount = todayMissions.filter(m => !m.dismissed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Active mission selection logic: automatically advance focus to next incomplete mission upon task completion
  const incompleteMissions = todayMissions.filter(m => !m.completed);
  const selectedMission = todayMissions.find(m => m.id === selectedMissionId);
  const effectiveSelectedId = (selectedMission && !selectedMission.completed) ? selectedMissionId : null;

  // Calculate if it's past end time
  const now = new Date();
  const dayStartTime = settings?.dayStartTime || '07:00';
  const dayEndTime = settings?.dayEndTime || '23:00';
  let logicalRealCurrentHour = now.getHours();
  if (logicalRealCurrentHour < (parseInt(dayStartTime.split(':')[0]) || 7)) {
    logicalRealCurrentHour += 24;
  }
  const realMinsTotal = logicalRealCurrentHour * 60 + now.getMinutes();

  const getLocalDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const d2 = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d2}`;
  };
  const todayDateObj = new Date();
  todayDateObj.setHours(0,0,0,0);
  const todayDateStr = getLocalDateKey(todayDateObj);

  const parseTimeVal = (val: string | undefined, fallback: number) => {
    const p = parseInt(val || '', 10);
    return isNaN(p) ? fallback : p;
  };

  const startHourVal = parseTimeVal(dayStartTime.split(':')[0], 7);

  const getTimeMins = (tStr: string) => {
    const parts = (tStr || '').split(':');
    let h = parseTimeVal(parts[0], 23);
    const m = parseTimeVal(parts[1], 0);
    if (h < startHourVal) h += 24;
    return h * 60 + m;
  };

  let effectiveEndTime = dayEndTime;
  if ((settings as any)?.sessionExtensionDate === todayDateStr && (settings as any)?.sessionExtensionEnd) {
    const extEnd = (settings as any).sessionExtensionEnd;
    if (getTimeMins(extEnd) > getTimeMins(dayEndTime)) {
      effectiveEndTime = extEnd;
    }
  }

  const endMinsTotal = getTimeMins(effectiveEndTime);

  const isPastDayEnd = realMinsTotal > endMinsTotal;
  
  // Safe mission selection with null checks to prevent crashes
  const activeMission = todayMissions.find(m => m.id === effectiveSelectedId) || 
                           (incompleteMissions.length > 0 ? incompleteMissions[0] : null) || 
                           (todayMissions.length > 0 ? todayMissions[0] : null);

  // Strategy Radar data for active mission
  const activeChap = activeMission ? chapters.find(c => 
    c.name.toLowerCase() === (activeMission.chapter || activeMission.chapterName || '').toLowerCase() || 
    (activeMission.chapterId && c.id === activeMission.chapterId)
  ) : null;

  const activeTelemetry = activeChap && chapterTelemetryMap ? chapterTelemetryMap[activeChap.id] : null;
  const rawRadar = activeTelemetry?.strategyRadar;
  const strategyRadar = {
    formulas: rawRadar?.formulas || [
      'Core Concept Derivations & Standard Identity Forms',
      'High-Yield PYQ Pattern Recognition',
      'Formula Speed Memory Recall'
    ],
    pitfalls: rawRadar?.pitfalls || 'Verify calculations carefully to avoid silly sign and unit mistakes!',
    recommendedPYQs: rawRadar?.recommendedPYQs || undefined, // handled dynamically below
    weightageGain: rawRadar?.weightageGain || rawRadar?.examWeightagePercent || (activeMission?.subject === 'chemistry' ? 18 : activeMission?.subject === 'physics' ? 16 : 14),
    conceptTags: rawRadar?.conceptTags || ['Formula Recall', 'PYQ Solving', 'Concept Application']
  };

  // Resolve Target PYQs
  let targetPYQs: number | null = null;
  if (activeMission?.targetPYQs !== undefined) {
    targetPYQs = activeMission.targetPYQs;
  } else if (strategyRadar.recommendedPYQs !== undefined) {
    targetPYQs = strategyRadar.recommendedPYQs;
  } else if (activeMission?.type === 'Solve PYQs' || activeMission?.type === 'Solve DPP' || activeMission?.taskName.toLowerCase().includes('pyq')) {
    targetPYQs = Math.max(1, Math.round((activeMission?.duration || 60) / 3)); // 3 mins per question
  }

  // Resolve XP Award
  let displayXp = activeMission?.xp || 0;
  if (displayXp === 0) {
    displayXp = targetPYQs ? Math.round(targetPYQs * 2) : Math.round((activeMission?.duration || 60) * 1.5);
  }

  const memoizedTimelineState = React.useMemo(() => {
    const sortedMissions = [...todayMissions].sort((a, b) => {
      // Sort order: active → completed → dismissed
      const rank = (m: typeof a) => m.dismissed ? 2 : m.completed ? 1 : 0;
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;

      // Secondary sort by chronological timeSlot if available to sync with Planner's Single Source of Truth
      const minA = getStartMinutesFromTimeSlot(a.timeSlot);
      const minB = getStartMinutesFromTimeSlot(b.timeSlot);
      if (minA !== minB) return minA - minB;

      // Tertiary sort: same-chapter lectures must be in sequential order (Lecture 5 before Lecture 7)
      const sameChapter = (a.chapter || '').toLowerCase() === (b.chapter || '').toLowerCase();
      const extractLecNum = (name: string): number => {
        const match = (name || '').match(/Lecture\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
      };
      const aIsLec = (a.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(a.taskName || ''));
      const bIsLec = (b.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(b.taskName || ''));
      if (sameChapter && aIsLec && bIsLec) {
        return extractLecNum(a.taskName) - extractLecNum(b.taskName);
      }
      return 0;
    });

    const uncompletedMissions = sortedMissions.filter(m => !m.completed && !m.dismissed);
    
    const nowMins = realMinsTotal;

    let liveMissionId: string | null = null;
    let nextUpMissionId: string | null = null;
    const pushedSlotsMap = new Map<string, { slot: string; isPushed: boolean }>();
    const overBudgetMissionIds = new Set<string>();
    
    // When past bedtime, don't run push cascade — keep original slots and mark all as over-budget
    if (isPastDayEnd) {
      uncompletedMissions.forEach(m => {
        overBudgetMissionIds.add(m.id);
      });
    } else {
      let runningPushMins = nowMins;

      uncompletedMissions.forEach((m, idx) => {
        let duration = m.duration || 60;
        let startMins = runningPushMins;
        let endMins = startMins + duration;
        
        if (m.timeSlot) {
          const range = parseTimeSlotToRange(m.timeSlot);
          if (range) {
            const origStart = range.startMins;
            const origEnd = range.endMins;
            if (origEnd > origStart) duration = origEnd - origStart;
            if (m.isManualOverride && origStart >= runningPushMins) {
              startMins = origStart;
              endMins = startMins + duration;
            }
          }
        }

        const shouldSnapToLive = !m.isManualOverride || startMins < runningPushMins;
        if (shouldSnapToLive) {
          startMins = runningPushMins;
          endMins = startMins + duration;
          
          const sH = Math.floor((startMins % 1440) / 60).toString().padStart(2, '0');
          const sM = (startMins % 60).toString().padStart(2, '0');
          const eH = Math.floor((endMins % 1440) / 60).toString().padStart(2, '0');
          const eM = (endMins % 60).toString().padStart(2, '0');
          
          pushedSlotsMap.set(m.id, {
            slot: `${sH}:${sM} - ${eH}:${eM}`,
            isPushed: true
          });
        }

        // If this uncompleted mission's cascaded start time reaches bedtime or spills past bedtime (and it's not the live mission), mark as over budget
        if (startMins >= endMinsTotal || (endMins > endMinsTotal && idx > 0)) {
          overBudgetMissionIds.add(m.id);
        }

        if (nowMins >= startMins && nowMins < endMins && startMins < endMinsTotal) {
          if (!liveMissionId) {
            liveMissionId = m.id;
          }
        }

        runningPushMins = endMins;
      });
    }

    // Find Next Up Mission
    if (liveMissionId) {
      const liveIdx = uncompletedMissions.findIndex(m => m.id === liveMissionId);
      nextUpMissionId = uncompletedMissions[liveIdx + 1]?.id || null;
    } else if (uncompletedMissions.length > 0) {
      nextUpMissionId = uncompletedMissions[0].id;
    }

    const visibleMissions = sortedMissions;

    return { visibleMissions, liveMissionId, nextUpMissionId, pushedSlotsMap, overBudgetMissionIds };
  }, [todayMissions, isPastDayEnd, endMinsTotal, realMinsTotal]);

  const { visibleMissions, liveMissionId, nextUpMissionId, pushedSlotsMap, overBudgetMissionIds } = memoizedTimelineState;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-start">
      
      {/* LEFT COLUMN: 65% width (~720px) — Clean Execution Stream */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
        
        <div className="space-y-3">
          {/* Modern Execution Queue Header */}
          <div className="flex items-center justify-between gap-3 border-b border-zinc-850 pb-2.5 px-0.5">
            {/* Left: Modern Title + Counter */}
            <div className="flex items-center gap-2">
              <h2 className="text-base font-tactical font-black text-white tracking-tight flex items-center gap-2 uppercase">
                <span><span className="eva-japanese-badge">出撃指令 // </span>EXECUTION QUEUE</span>
                <span className="text-xs font-mono font-bold text-zinc-500">({completedCount}/{totalCount})</span>
              </h2>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 text-xs">


              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={springs.snappy}
                onClick={() => setIsHistoryModalOpen(true)}
                className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm font-medium"
                title="History"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">History</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={springs.snappy}
                onClick={onOpenCustomMission}
                className="px-2.5 py-1 text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 rounded-lg flex items-center gap-1.5 font-medium cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Add Mission</span>
              </motion.button>

              <motion.a
                href="#planner"
                whileHover={{ scale: 1.03, x: 2 }}
                whileTap={{ scale: 0.95 }}
                transition={springs.snappy}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/planner');
                }}
                className="px-2.5 py-1 text-indigo-400 hover:text-indigo-300 font-medium hover:bg-indigo-950/30 rounded-lg transition-colors cursor-pointer hidden md:flex items-center gap-1"
              >
                <span>Planner →</span>
              </motion.a>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-2.5">
            {/* Bedtime Wind-Down Ambient Alert Banner */}
            {isPastDayEnd && (
              <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-900/40 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-zinc-900/60 to-zinc-950/80 shadow-xl mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center shrink-0 shadow-md">
                    <Moon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-white font-display font-bold text-sm tracking-tight">Passed Scheduled Bedtime ({effectiveEndTime})</div>
                    <div className="text-zinc-400 text-xs font-sans">
                      Remaining tasks are queued for tomorrow ({dayStartTime}). You can wrap up or extend your session.
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 font-mono shrink-0 w-full sm:w-auto justify-end">
                  <div className="relative group">
                    <button
                      type="button"
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Extend</span>
                    </button>
                    
                    {/* Dropdown for extension */}
                    <div className="absolute top-full right-0 mt-1 w-36 bg-zinc-950/95 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 overflow-hidden flex flex-col z-30 font-mono text-xs">
                      <button onClick={() => actions.extendSession(0.5)} className="px-3 py-2 text-zinc-300 hover:bg-indigo-600 hover:text-white text-left cursor-pointer transition-colors border-b border-white/5">+30 mins</button>
                      <button onClick={() => actions.extendSession(1)} className="px-3 py-2 text-zinc-300 hover:bg-indigo-600 hover:text-white text-left cursor-pointer transition-colors border-b border-white/5">+1 hour</button>
                      <button onClick={() => actions.extendSession(2)} className="px-3 py-2 text-zinc-300 hover:bg-indigo-600 hover:text-white text-left cursor-pointer transition-colors">+2 hours</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {todayMissions.length === 0 ? (
              <div className="p-8 flex flex-col items-center gap-4 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/30">
                <div className="text-zinc-300 font-display font-medium text-base">Execution Queue is Empty</div>
                <div className="text-zinc-400 text-xs max-w-sm font-sans">
                  You have no active chapters in progress. Pick a foundational module to start your journey.
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const c = chapters.find(ch => ch.name.includes("General Organic"));
                      if (c) {
                        actions.updateChapterData(c.id, { status: "Learning", currentLecture: 1 });
                        actions.setEnergyLevel("High");
                      }
                    }}
                    className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 rounded-lg text-rose-300 text-xs font-mono transition-colors shadow-lg cursor-pointer"
                  >
                    Start GOC (Chem)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const c = chapters.find(ch => ch.name.includes("Sets"));
                      if (c) {
                        actions.updateChapterData(c.id, { status: "Learning", currentLecture: 1 });
                        actions.setEnergyLevel("High");
                      }
                    }}
                    className="px-4 py-2.5 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-900/50 rounded-lg text-indigo-300 text-xs font-mono transition-colors shadow-lg cursor-pointer"
                  >
                    Start Sets (Maths)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const c = chapters.find(ch => ch.name.includes("Units") || ch.name.includes("Kinematics"));
                      if (c) {
                        actions.updateChapterData(c.id, { status: "Learning", currentLecture: 1 });
                        actions.setEnergyLevel("High");
                      }
                    }}
                    className="px-4 py-2.5 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-900/50 rounded-lg text-cyan-300 text-xs font-mono transition-colors shadow-lg cursor-pointer"
                  >
                    Start Physics
                  </button>
                </div>
              </div>
            ) : (
                <AnimatePresence mode="popLayout">
                  {visibleMissions.map((mission, idx) => {
                  const isDismissed = !!mission.dismissed;
                  const badgeStyle = getSubjectBadgeStyle(mission.subject);
                  const isExpanded = expandedMission === mission.id;
                  const isSelected = activeMission?.id === mission.id;
                  
                  const isLive = mission.id === liveMissionId;
                  const isNextUp = mission.id === nextUpMissionId;

                  // Chapter metadata & Ebbinghaus decay telemetry
                  const chap = chapters.find(c => 
                    c.name.toLowerCase() === (mission.chapter || mission.chapterName || '').toLowerCase() || 
                    (mission.chapterId && c.id === mission.chapterId)
                  );

                  const chapTelemetry = chap && chapterTelemetryMap ? chapterTelemetryMap[chap.id] : null;
                  const retentionScore = chapTelemetry?.strategyRadar?.retentionConfidenceScore 
                    ?? chap?.revisionProgress?.retentionScore 
                    ?? (chap?.confidence !== undefined ? (chap.confidence >= 4 ? 88 : chap.confidence >= 2 ? 65 : 42) : (chap?.completion && chap.completion > 0 ? 70 : undefined));

                  const currentLec = chap?.currentLecture ?? 0;
                  const totalLec = chap?.totalLectures ?? 12;
                  const lecPercent = totalLec > 0 ? Math.min(100, Math.round((currentLec / totalLec) * 100)) : 0;

                  const weightageMarks = (chap?.weightage || 4) * 3;
                  const priorityTier = chap?.priority === 1
                    ? { iconName: 'Flame', label: 'Tier 1', color: 'text-amber-400' }
                    : chap?.priority === 2
                    ? { iconName: 'Zap', label: 'Tier 2', color: 'text-sky-400' }
                    : { iconName: 'Star', label: 'Tier 3', color: 'text-indigo-400' };
                  
                  const unitName = chap?.unit || 'Core Module';

                  const isBreak = (mission.subject as string) === 'break' || (mission.type as string) === 'BREAK' || mission.taskName?.toLowerCase().includes('break');

                  if (isBreak) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={springs.snappy}
                        key={mission.id}
                        onClick={() => {
                          if (sessionState !== 'idle' && selectedMissionId !== mission.id) {
                            handleResetSession();
                          }
                          setSelectedMissionId?.(mission.id);
                        }}
                        style={{
                          background: 'rgba(20, 14, 10, 0.85)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderTop: '1.5px solid rgba(245, 158, 11, 0.6)',
                          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)'
                        }}
                        className={`group transition-all duration-150 cursor-pointer focus:outline-none flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 py-3 rounded-2xl relative mb-3 overflow-hidden ${
                          isDismissed
                            ? 'opacity-40 grayscale cursor-default'
                            : mission.completed
                            ? 'opacity-60'
                            : 'hover:border-amber-500/50'
                        }`}
                      >
                         {/* Top Amber Hazard Stripes Ribbon */}
                         <div 
                           className="absolute top-0 inset-x-0 h-1 opacity-75 pointer-events-none"
                           style={{
                             background: 'repeating-linear-gradient(-45deg, #f59e0b 0px, #f59e0b 8px, transparent 8px, transparent 16px)'
                           }}
                         />
                         {/* Caliper Crosshairs */}
                         <span className="absolute top-2 left-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
                         <span className="absolute top-2 right-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
                         <span className="absolute bottom-2 left-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
                         <span className="absolute bottom-2 right-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>

                         <div className="flex items-center gap-3 relative z-10">
                           {!isDismissed && (
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               actions.completeTask(mission.id);
                               if (!mission.completed) {
                                 audioEngine.playSuccess();
                               } else {
                                 audioEngine.playAlert();
                               }
                             }}
                             className={`rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                               mission.completed
                                 ? 'w-5 h-5 bg-amber-500 border-amber-400 text-zinc-950 font-bold'
                                 : 'w-5 h-5 border-zinc-700 bg-zinc-950/50 text-transparent hover:border-amber-500 hover:text-amber-500/60'
                             }`}
                           >
                             <Check className="w-3 h-3 stroke-[3]" />
                           </button>
                           )}
                           {isDismissed && (
                             <div className="w-5 h-5 rounded-full border border-red-900/40 bg-red-950/30 flex items-center justify-center shrink-0">
                               <X className="w-3 h-3 text-red-500/60" />
                             </div>
                           )}
                           
                           <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isLive ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : mission.completed ? 'bg-amber-950/40 text-amber-600' : 'bg-zinc-900/80 text-zinc-400 border border-white/10'}`}>
                             <Coffee className="w-3.5 h-3.5 text-amber-400" />
                           </div>
                           <div className="flex flex-col">
                             <p className={`text-xs font-tactical font-bold tracking-tight uppercase ${isLive ? 'text-amber-300' : mission.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                               {mission.taskName}
                             </p>
                             <div className="flex items-center gap-2 text-xs opacity-75 font-mono text-zinc-400 mt-0.5">
                               {isLive && <span className="text-amber-400 font-bold tracking-wider animate-pulse">LIVE NOW</span>}
                               {pushedSlotsMap.has(mission.id) && (
                                 <span className="text-amber-400/80 flex items-center gap-1">
                                   <Clock className="w-3 h-3 inline" /> {pushedSlotsMap.get(mission.id)?.slot}
                                 </span>
                               )}
                             </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-2.5 ml-auto relative z-10 font-mono">
                           <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-lg">
                             {mission.duration}m
                           </span>
                           {!isDismissed && (
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setMissionToDelete(mission.id);
                               }}
                               className="w-6 h-6 rounded-lg border border-white/10 bg-zinc-950/60 hover:bg-red-500/20 hover:border-red-500/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                               title="Delete break"
                             >
                               <Trash2 className="w-3 h-3" />
                             </button>
                           )}
                           {isLive && (
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleStartSession(mission.id);
                               }}
                               className="px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.4)] text-xs opacity-75 font-mono font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                             >
                               <Play className="w-3 h-3 fill-current" /> START
                             </button>
                           )}
                         </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={springs.snappy}
                      key={mission.id}
                        onClick={() => {
                          if (sessionState !== 'idle' && selectedMissionId !== mission.id) {
                            handleResetSession();
                          }
                          setSelectedMissionId?.(mission.id);
                          if (chap) {
                            actions.setRadarFocusedChapter(chap.id);
                          }
                        }}
                      style={{
                        background: isLive
                          ? 'rgba(10, 22, 18, 0.88)'
                          : isSelected
                          ? 'rgba(18, 14, 28, 0.88)'
                          : 'rgba(10, 14, 23, 0.80)',
                        backdropFilter: 'blur(24px) saturate(190%)',
                        border: isLive
                          ? '1.5px solid rgba(16, 185, 129, 0.55)'
                          : isSelected
                          ? '1.5px solid rgba(99, 102, 241, 0.5)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        borderTop: isLive
                          ? '2px solid rgba(16, 185, 129, 0.85)'
                          : isSelected
                          ? '2px solid rgba(99, 102, 241, 0.75)'
                          : '1.5px solid rgba(255, 255, 255, 0.18)',
                        boxShadow: isLive
                          ? '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.12)'
                          : isSelected
                          ? '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.1)'
                          : '0 8px 24px rgba(0, 0, 0, 0.4)'
                      }}
                      className={`group transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 active:scale-[0.99] relative overflow-hidden ${
                          isLive
                            ? 'p-4.5 sm:p-5 rounded-2xl mb-3'
                            : isDismissed
                            ? 'p-3.5 rounded-2xl opacity-40 cursor-default'
                            : mission.completed
                            ? 'p-3.5 rounded-2xl opacity-60'
                            : 'p-4 rounded-2xl hover:border-indigo-500/40 mb-2.5'
                        }`}
                      >
                      {/* Top Hazard Warning Stripes Ribbon for Live Sortie */}
                      {isLive && (
                        <div 
                          className="absolute top-0 inset-x-0 h-1 opacity-85 pointer-events-none"
                          style={{
                            background: mission.subject === 'maths' 
                              ? 'repeating-linear-gradient(-45deg, #a855f7 0px, #a855f7 8px, transparent 8px, transparent 16px)'
                              : mission.subject === 'physics'
                              ? 'repeating-linear-gradient(-45deg, #0ea5e9 0px, #0ea5e9 8px, transparent 8px, transparent 16px)'
                              : 'repeating-linear-gradient(-45deg, #10b981 0px, #10b981 8px, transparent 8px, transparent 16px)'
                          }}
                        />
                      )}

                      {/* Caliper Crosshairs */}
                      <span className="absolute top-2 left-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
                      <span className="absolute top-2 right-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
                      <span className="absolute bottom-2 left-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
                      <span className="absolute bottom-2 right-2 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
                      <div className="flex items-start justify-between gap-4 relative z-10">
                        
                        {/* Circular Checkbox — hidden for dismissed missions */}
                        {!isDismissed && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.14 }}
                          whileTap={{ scale: 0.88 }}
                          transition={springs.snappy}
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.completeTask(mission.id);
                            if (!mission.completed) {
                              audioEngine.playSuccess();
                            } else {
                              audioEngine.playAlert();
                            }
                          }}
                          className={`rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isLive ? 'w-6 h-6 mt-0.5 border-2 border-emerald-400' : 'w-5 h-5'
                          } ${
                            mission.completed
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              : isLive
                              ? 'border-emerald-400 bg-transparent text-transparent hover:text-emerald-400/60'
                              : 'border-zinc-700 hover:border-indigo-400 bg-transparent text-transparent hover:text-indigo-400/60'
                          }`}
                          title={mission.completed ? "Mark incomplete" : "Mark complete"}
                        >
                          <Check className={`${isLive ? 'w-3.5 h-3.5' : 'w-3 h-3'} stroke-[3]`} />
                        </motion.button>
                        )}
                        {isDismissed && (
                          <div className="w-5 h-5 rounded-full border border-red-900/40 bg-red-950/30 flex items-center justify-center shrink-0">
                            <X className="w-3 h-3 text-red-500/60" />
                          </div>
                        )}

                        {/* Content Area */}
                        <div className={`${isLive ? 'space-y-2.5' : 'space-y-2'} min-w-0 flex-1`}>
                          {/* Consolidated Decluttered 1-Row Label Header with Merged Time */}
                          <div className="flex items-center gap-2 flex-wrap text-xs leading-none">
                            {isDismissed && (
                              <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-red-950/30 text-red-400/70 border-red-900/30 text-xs opacity-75 shrink-0">
                                Dismissed
                              </span>
                            )}

                            {/* Subject Badge */}
                            <span className={`font-bold uppercase tracking-wider ${isLive ? 'px-2.5 py-0.5 text-xs opacity-90' : 'px-2 py-0.5 text-xs opacity-75'} rounded-md border shrink-0 ${badgeStyle}`}>
                              {mission.subject.toUpperCase()}
                            </span>

                            {/* Merged Status + Time Pill for Live & Next Up */}
                            {isLive ? (
                              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm text-xs opacity-90 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE {pushedSlotsMap.has(mission.id) ? `· ${pushedSlotsMap.get(mission.id)?.slot}` : ''}
                              </span>
                            ) : isNextUp ? (
                              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 text-xs opacity-75 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                NEXT UP {pushedSlotsMap.has(mission.id) ? `· ${pushedSlotsMap.get(mission.id)?.slot}` : ''}
                              </span>
                            ) : pushedSlotsMap.has(mission.id) ? (
                              <span className="text-zinc-400 flex items-center gap-1 text-xs font-mono shrink-0">
                                <Clock className="w-3 h-3 text-zinc-500" />
                                <span>{pushedSlotsMap.get(mission.id)?.slot}</span>
                              </span>
                            ) : null}

                            <span className="text-zinc-600 hidden sm:inline">•</span>

                            {/* Mission Type (Quiet Clean Text) */}
                            <span className="text-zinc-300 font-sans text-xs shrink-0">
                              {mission.type}
                            </span>

                            <span className="text-zinc-600">•</span>

                            {/* Marks Leverage */}
                            <span className="text-amber-400 font-medium flex items-center gap-1 text-xs shrink-0">
                              <Flame className="w-3 h-3 text-amber-400" />
                              <span>+{weightageMarks}M</span>
                            </span>

                            {/* Urgent Memory Decay Badge */}
                            {retentionScore !== undefined && (retentionScore < 60 || mission.type === 'Revise Formulas' || mission.type === 'Review Mistakes') && (
                              <span 
                                className={`px-1.5 py-0.5 rounded border flex items-center gap-1 font-mono text-xs opacity-75 font-bold ${
                                  retentionScore < 50 
                                    ? 'bg-rose-950/50 border-rose-500/40 text-rose-300 animate-pulse' 
                                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                                }`}
                                title={`Ebbinghaus Retention Index: ${retentionScore}% retention`}
                              >
                                <span>{retentionScore}% Memory</span>
                              </span>
                            )}

                            {/* Bedtime badge */}
                            {!mission.completed && !isDismissed && overBudgetMissionIds.has(mission.id) && (
                              <span className="text-amber-400 bg-amber-950/30 border border-amber-800/40 text-xs opacity-75 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Moon className="w-2.5 h-2.5 text-amber-400" /> Bedtime
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <p className={`tracking-tight transition-colors ${
                              isLive
                                ? 'text-lg sm:text-xl font-tactical font-black text-white group-hover:text-emerald-300 leading-snug'
                                : isDismissed ? 'text-xs md:text-sm font-tactical text-zinc-600 line-through' 
                                : mission.completed ? 'text-xs md:text-sm font-tactical text-zinc-400 line-through' 
                                : 'text-xs md:text-sm font-tactical font-bold text-zinc-100 group-hover:text-indigo-300'
                            }`}>
                            {mission.taskName}
                          </p>

                          {/* Sub-line */}
                          <div className={`flex items-center gap-2 text-zinc-400 flex-wrap ${isLive ? 'text-xs sm:text-sm' : 'text-xs'} font-sans`}>
                            <span>
                              Unit: <strong className="text-zinc-200 font-medium">{unitName}</strong>
                            </span>

                            {chap && (
                              <>
                                <span className="text-zinc-600">•</span>
                                <div className="flex items-center gap-1.5 font-mono text-xs opacity-75 shrink-0">
                                  <span className="text-zinc-400">Lec {currentLec}/{totalLec}</span>
                                  <div className={`${isLive ? 'w-20 h-1.5' : 'w-16 h-1.5'} bg-zinc-950 rounded-full overflow-hidden border border-white/10`}>
                                    <div
                                      className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${lecPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-indigo-400 font-medium font-mono">{lecPercent}%</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Action Buttons: 1-Row Sleek Layout */}
                          <div className="pt-2 flex items-center gap-2 flex-wrap font-mono">
                            {isLive && (
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.95 }}
                                transition={springs.snappy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartSession(mission.id);
                                }}
                                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] border border-emerald-400/40 active:scale-95"
                              >
                                <Play className="w-3.5 h-3.5 fill-white text-white" />
                                <span>{localStorage.getItem(`jeeos_mission_state_${mission.id}`) ? 'Resume Mission' : 'Start Mission'}</span>
                              </motion.button>
                            )}

                            {chap && (
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.95 }}
                                transition={springs.snappy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actions.openChapterEditModal(chap.id);
                                }}
                                className="text-xs bg-zinc-950/70 hover:bg-zinc-850 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl cursor-pointer transition-colors border border-white/10 flex items-center gap-1.5 shadow-sm font-mono font-bold uppercase select-none"
                                title="Configure Chapter"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Configure</span>
                              </motion.button>
                            )}

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.95 }}
                              transition={springs.snappy}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditMission?.(mission);
                              }}
                              className="text-xs bg-zinc-950/70 hover:bg-zinc-850 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl cursor-pointer transition-colors border border-white/10 flex items-center gap-1.5 shadow-sm font-mono font-bold uppercase select-none"
                              title="Edit Mission Details"
                            >
                              <Edit className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Edit</span>
                            </motion.button>
                          </div>
                        </div>

                        {/* Duration & Chevron */}
                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-950/80 border border-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3 h-3 text-indigo-400" /> {mission.duration}m
                          </span>

                          {/* Delete button — hidden for dismissed missions (already dismissed) */}
                          {!isDismissed && (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={springs.snappy}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMissionToDelete(mission.id);
                            }}
                            className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-red-500/20 hover:border-red-500/40 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete mission"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                          )}

                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={springs.snappy}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedMission(isExpanded ? null : mission.id);
                            }}
                            className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900/40 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                          >
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={springs.snappy}>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </motion.div>
                          </motion.button>
                        </div>

                      </div>

                      {/* Expandable Details Drawer */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden border-t border-zinc-900/60"
                          >
                            <div className="px-3 py-2.5 mt-2.5 bg-zinc-950/40 text-xs text-zinc-400 space-y-2 rounded-xl">
                              <div className="flex items-center justify-between text-zinc-300 font-mono text-xs opacity-75">
                                <span>Estimated Time: <strong className="text-white">{mission.duration} mins</strong></span>
                                <span>XP Award: <strong className="text-indigo-400">+{mission.xp} XP</strong></span>
                              </div>

                              <div className="pt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    actions.completeTask(mission.id);
                                    if (!mission.completed) {
                                      audioEngine.playSuccess();
                                      setExpandedMission(null);
                                    } else {
                                      audioEngine.playAlert();
                                    }
                                  }}
                                  className={`text-xs opacity-75 font-bold py-1.5 px-3 rounded-md transition-all cursor-pointer border active:scale-[0.98] hover:scale-[1.02] ${
                                    mission.completed 
                                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60 hover:bg-emerald-950/60 hover:text-emerald-300' 
                                      : 'bg-zinc-800 hover:bg-emerald-600/90 text-zinc-300 hover:text-white border-zinc-700 hover:border-emerald-500 shadow-sm'
                                  }`}
                                >
                                  {mission.completed ? 'Mark Incomplete' : 'Complete Module'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMissionToDelete(mission.id);
                                    setExpandedMission(null);
                                  }}
                                  className="bg-transparent hover:bg-red-950/40 text-zinc-400 hover:text-red-300 text-xs opacity-75 py-1.5 px-3 rounded-md transition-all active:scale-[0.98] hover:scale-[1.02] cursor-pointer border border-zinc-800 hover:border-red-900/60 flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remove Mission</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>
                  );
                })}
                </AnimatePresence>
              )}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between gap-3 pt-3 mt-4 border-t border-zinc-900/60 text-xs font-mono text-zinc-400 px-1">
          <div className="flex items-center gap-3">
            <span>Remaining: <strong className="text-white">{estimatedRemainingHours} hrs</strong></span>
            <span>•</span>
            <span>Questions: <strong className="text-white">{plannedQuestions} Qs</strong></span>
            <span>•</span>
            <span>Target: <strong className="text-indigo-400">{targetFinishTime || '8:30 PM'}</strong></span>
          </div>

          {sessionState !== 'idle' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs opacity-75 font-mono text-zinc-400 hover:text-zinc-300 uppercase"
              onClick={handleResetSession}
            >
              RESET
            </Button>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: 35% width (~400px) — Sleek Strategy & Formula Radar */}
      <div className="lg:col-span-5 xl:col-span-5 self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar">
        <div 
          style={{
            background: 'rgba(10, 14, 23, 0.85)',
            backdropFilter: 'blur(24px) saturate(190%)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)'
          }}
          className="p-4 md:p-5 rounded-2xl space-y-3.5 shadow-sm relative overflow-hidden text-left font-sans"
        >
          {/* Top Hazard Warning Tape Ribbon */}
          <div 
            className="absolute top-0 inset-x-0 h-1 opacity-75 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(-45deg, #6366f1 0px, #6366f1 8px, transparent 8px, transparent 16px)'
            }}
          />

          {/* Caliper Crosshairs */}
          <span className="absolute top-2.5 left-2.5 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
          <span className="absolute top-2.5 right-2.5 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
          <span className="absolute bottom-2.5 left-2.5 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
          <span className="absolute bottom-2.5 right-2.5 text-xs opacity-50 font-mono text-zinc-600 select-none pointer-events-none">+</span>
          
          <div className="space-y-4 relative z-10">
            
            {/* Compact Header Radar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2.5">
                {/* Animated Kinetic Rings Indicator */}
                <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 30 30" className="eva-kinetic-ring w-full h-full absolute inset-0 animate-[spin_8s_linear_infinite]">
                    <circle cx="15" cy="15" r="13" className="stroke-indigo-400/40 fill-none" strokeWidth="1.5" strokeDasharray="3 3" />
                  </svg>
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                </div>
                <h3 className="text-base font-bold font-mono text-white tracking-tight uppercase">
                  <span className="eva-japanese-badge">戦略誘導 // </span>STRATEGY RADAR
                </h3>
              </div>
              
              {activeChap && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springs.snappy}
                  onClick={() => {
                    audioEngine.playRadioRelayClick().catch(() => {});
                    actions.openChapterEditModal(activeChap.id);
                  }}
                  className="text-xs font-mono font-bold text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 px-2.5 py-1 rounded-xl cursor-pointer transition-colors select-none flex items-center gap-1.5 shadow-sm uppercase tracking-wider"
                >
                  <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                  <span>Configure</span>
                </motion.button>
              )}
            </div>

            <AnimatePresence mode="wait">
            {activeMission ? (
              <motion.div
                key={activeMission.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 text-left"
              >
                
                {/* Active Module Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border shadow-sm ${getSubjectBadgeStyle(activeMission.subject)}`}>
                      {activeMission.subject.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-lg shadow-sm">
                      +{strategyRadar.weightageGain} Marks Gain
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white tracking-tight pt-0.5 leading-snug">
                    {activeMission.taskName}
                  </h4>
                </div>

                {/* Chapter Vitals */}
                {activeChap ? (
                  <div className="space-y-2 mt-2">
                    <span className="text-xs font-semibold text-zinc-400 block">
                      Chapter Vitals
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col gap-1.5">
                        <span className="text-xs text-zinc-400 font-medium">Completion</span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white font-mono">{activeChap.completion}%</span>
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${activeChap.completion}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className="h-full bg-indigo-500 rounded-full" 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col gap-1.5">
                        <span className="text-xs text-zinc-400 font-medium">Confidence</span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white font-mono">{activeChap.confidence}%</span>
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${activeChap.confidence}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className={`h-full rounded-full ${activeChap.confidence > 70 ? 'bg-emerald-500' : activeChap.confidence > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col gap-1">
                        <span className="text-xs text-zinc-400 font-medium">Difficulty</span>
                        <span className={`text-xs font-semibold ${activeChap.difficulty === 'Hard' ? 'text-rose-400' : activeChap.difficulty === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>{activeChap.difficulty}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col gap-1">
                        <span className="text-xs text-zinc-400 font-medium">Lectures</span>
                        <span className="text-xs font-bold text-white font-mono">{activeChap.currentLecture} / {activeChap.totalLectures}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400">
                    Custom task selected — chapter telemetry unavailable.
                  </div>
                )}

                {/* Performance Metrics: Clean 3-Box Row */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-center flex flex-col justify-center">
                    <span className="text-xs text-zinc-400 font-medium">Est. Time</span>
                    <span className="text-sm font-bold text-white font-mono mt-0.5">{(strategyRadar as any).estimatedMinutes || activeMission?.duration || 45}m</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-center flex flex-col justify-center">
                    <span className="text-xs text-zinc-400 font-medium">Target PYQs</span>
                    <span className="text-sm font-bold text-indigo-400 font-mono mt-0.5">{strategyRadar.recommendedPYQs} Qs</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-center flex flex-col justify-center">
                    <span className="text-xs text-zinc-400 font-medium">XP Reward</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5">+{((strategyRadar as any).estimatedMinutes || activeMission?.duration || 45) > 45 ? 83 : 45}</span>
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-sm">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="text-xs text-zinc-400 max-w-xs mx-auto font-sans leading-relaxed">
                  Select a mission from the Execution Queue to view strategic telemetry and formula radar.
                </div>
              </div>
            )}
            </AnimatePresence>

            {/* Launch Focus Cockpit Session CTA Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={springs.snappy}
              onClick={() => {
                if (activeChap) {
                  actions.setRadarFocusedChapter(activeChap.id);
                  actions.setActiveSubject(activeChap.subject);
                }
                handleStartSession(activeMission?.id);
              }}
              className={`w-full py-3 px-4 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                sessionState === 'active'
                  ? 'bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 hover:bg-indigo-900'
                  : sessionState === 'paused'
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                  : 'bg-white hover:bg-zinc-100 text-zinc-950'
              }`}
            >
              {sessionState === 'active' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span>PAUSE FOCUS COCKPIT ({formatTimer(secondsElapsed)})</span>
                </span>
              ) : sessionState === 'paused' ? (
                <span className="flex items-center justify-center gap-2">
                  <Pause className="w-3.5 h-3.5" />
                  <span>RESUME FOCUS COCKPIT ({formatTimer(secondsElapsed)})</span>
                </span>
              ) : (
                <span>{(activeMission?.id && localStorage.getItem(`jeeos_mission_state_${activeMission.id}`)) ? 'RESUME FOCUS COCKPIT SESSION' : 'ARM FOCUS COCKPIT SESSION'}</span>
              )}
            </motion.button>
          </div>

        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={!!missionToDelete}
        onConfirm={() => {
          if (missionToDelete) {
            actions.deleteMission(missionToDelete);
            setMissionToDelete(null);
          }
        }}
        onClose={() => setMissionToDelete(null)}
      />

      <CustomMissionHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
      />
    </div>
  );
}
