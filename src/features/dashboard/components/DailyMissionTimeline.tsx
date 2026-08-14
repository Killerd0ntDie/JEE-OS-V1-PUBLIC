import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { 
  Settings,
  Trash2,
  Pause,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-start">
      
      {/* LEFT COLUMN: 65% width (~720px) — Clean Execution Stream */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
        
        <div className="space-y-4">
          {/* Header */}
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-zinc-900/80 pb-4 px-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase shrink-0">
                TODAY'S MISSION CHECKLIST
              </span>
              <span className="text-[11px] font-mono font-normal tracking-normal text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full flex items-center gap-2 shrink-0 whitespace-nowrap shadow-sm">
                <span>{completedCount}/{totalCount} Done</span>
                <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden shrink-0">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="bg-indigo-400 h-full rounded-full"
                  />
                </div>
              </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-display font-bold text-white tracking-tight flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <span className="whitespace-nowrap shrink-0">Execution Queue</span>
              </h2>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="text-xs font-mono text-zinc-400 hover:text-indigo-300 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-[0.97] shadow-sm whitespace-nowrap shrink-0 select-none"
                >
                  <History className="w-3.5 h-3.5" />
                  History
                </button>

                <button
                  type="button"
                  onClick={onOpenCustomMission}
                  className="text-xs font-mono text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 border border-indigo-900/50 hover:bg-indigo-900/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all duration-150 active:scale-[0.97] shadow-sm whitespace-nowrap shrink-0 select-none"
                >
                  <Icon name="Plus" className="w-3.5 h-3.5" />
                  Add Mission
                </button>
                <a
                  href="#planner"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/planner');
                  }}
                  className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-semibold hover:bg-indigo-950/30 px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-[0.97] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 select-none"
                >
                  Manage in Planner →
                </a>
              </div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-2.5">
            {/* Active Bedtime Banner removed — replaced by full Goodnight Screen below */}

            {isPastDayEnd ? (
              <div className="p-8 flex flex-col items-center gap-5 text-center border border-indigo-900/30 rounded-2xl bg-gradient-to-b from-indigo-950/25 via-zinc-900/40 to-zinc-950/70 shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-900/30">
                  <Icon name="Moon" className="w-7 h-7 text-indigo-400" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-white font-display font-bold text-xl tracking-tight">Time to Rest & Consolidate.</div>
                  <div className="text-zinc-400 text-xs max-w-md mx-auto leading-relaxed font-sans">
                    You've passed your scheduled bedtime ({effectiveEndTime}). Your daily missions are queued for tomorrow starting at {dayStartTime}. Let your brain consolidate memories.
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center pt-2 font-mono">
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-zinc-200 hover:text-white text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    <Icon name="Check" className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sleep Now</span>
                  </button>
                  
                  <div className="relative group">
                    <button
                      type="button"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center gap-2"
                    >
                      <Icon name="Clock" className="w-3.5 h-3.5" />
                      <span>Extend Session</span>
                    </button>
                    
                    {/* Dropdown for extension */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 glass-dropdown bg-zinc-900 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 overflow-hidden flex flex-col z-30 font-mono text-xs">
                      <button onClick={() => actions.extendSession(0.5)} className="px-4 py-2.5 text-zinc-300 hover:bg-indigo-600 hover:text-white text-left cursor-pointer transition-colors border-b border-white/5">+30 mins</button>
                      <button onClick={() => actions.extendSession(1)} className="px-4 py-2.5 text-zinc-300 hover:bg-indigo-600 hover:text-white text-left cursor-pointer transition-colors border-b border-white/5">+1 hour</button>
                      <button onClick={() => actions.extendSession(2)} className="px-4 py-2.5 text-zinc-300 hover:bg-indigo-600 hover:text-white text-left cursor-pointer transition-colors">+2 hours</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : todayMissions.length === 0 ? (
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
            ) : (() => {
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

              return (
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
                        layout
                        style={{ willChange: 'transform, opacity' }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        key={mission.id}
                        onClick={() => {
                          if (sessionState !== 'idle' && selectedMissionId !== mission.id) {
                            handleResetSession();
                          }
                          setSelectedMissionId?.(mission.id);
                        }}
                        className={`group transition-colors duration-200 cursor-pointer focus:outline-none flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border relative mb-2 ${
                          isLive 
                            ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]' 
                            : isDismissed
                            ? 'border-zinc-900/40 bg-zinc-950/30 opacity-40 grayscale cursor-default'
                            : mission.completed
                            ? 'border-zinc-800/40 bg-zinc-900/40 opacity-60'
                            : isSelected
                            ? 'border-indigo-500/30 bg-[#0d0e12]'
                            : 'border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700/60'
                        }`}
                      >
                         <div className="flex items-center gap-3">
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
                                 ? 'w-5 h-5 bg-emerald-500 border-emerald-400 text-white'
                                 : 'w-5 h-5 border-zinc-700 bg-zinc-950/50 text-transparent hover:border-emerald-500 hover:text-emerald-500/60'
                             }`}
                           >
                             <Icon name="Check" className="w-3 h-3 stroke-[3]" />
                           </button>
                           )}
                           {isDismissed && (
                             <div className="w-5 h-5 rounded-full border border-red-900/40 bg-red-950/30 flex items-center justify-center shrink-0">
                               <Icon name="X" className="w-3 h-3 text-red-500/60" />
                             </div>
                           )}
                           
                           <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : mission.completed ? 'bg-emerald-900/30 text-emerald-600' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-800'}`}>
                             <Icon name="Coffee" className="w-3.5 h-3.5" />
                           </div>
                           <div className="flex flex-col">
                             <p className={`text-xs font-medium tracking-tight ${isLive ? 'text-emerald-300 font-bold' : mission.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                               {mission.taskName}
                             </p>
                             <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-0.5">
                               {isLive && <span className="text-emerald-400 font-bold tracking-wider animate-pulse">LIVE NOW</span>}
                               {pushedSlotsMap.has(mission.id) && (
                                 <span className="text-emerald-500/70">
                                   <Icon name="Clock" className="w-3 h-3 inline pb-0.5" /> {pushedSlotsMap.get(mission.id)?.slot}
                                 </span>
                               )}
                             </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-2.5 ml-auto">
                           <span className="text-[11px] font-mono text-zinc-500 bg-zinc-950/60 border border-zinc-800/80 px-2 py-0.5 rounded">
                             {mission.duration}m
                           </span>
                           {!isDismissed && (
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setMissionToDelete(mission.id);
                               }}
                               className="w-6 h-6 rounded border border-zinc-800 bg-zinc-900/40 hover:bg-red-500/20 hover:border-red-500/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
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
                               className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] text-[10px] font-mono font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                             >
                               <Icon name="Play" className="w-3 h-3 fill-white" /> START
                             </button>
                           )}
                         </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      layout
                      style={{ willChange: 'transform, opacity' }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
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
                    className={`group transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 active:scale-[0.99] relative overflow-hidden ${
                        isLive
                          ? 'p-6 md:p-7 rounded-2xl border-2 border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.15)] bg-zinc-900/80 mb-4'
                          : isDismissed
                          ? 'premium-card p-3.5 rounded-xl border-red-900/20 opacity-40 cursor-default'
                          : mission.completed
                          ? 'premium-card p-3.5 rounded-xl border-zinc-900/40 opacity-60'
                          : isSelected
                          ? 'glass-card p-4 rounded-xl border-indigo-500/40 shadow-lg'
                          : 'premium-card p-4 rounded-xl hover:border-zinc-750'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 relative z-10">
                        
                        {/* Circular Checkbox — hidden for dismissed missions */}
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
                          className={`rounded-full border flex items-center justify-center shrink-0 transition-all duration-100 cursor-pointer ${
                            isLive ? 'w-6 h-6 mt-0.5' : 'w-5 h-5'
                          } ${
                            mission.completed
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              : isLive
                              ? 'border-emerald-500 bg-transparent text-transparent hover:text-emerald-500/60'
                              : 'border-zinc-700 hover:border-indigo-400 bg-transparent text-transparent hover:text-indigo-400/60'
                          }`}
                          title={mission.completed ? "Mark incomplete" : "Mark complete"}
                        >
                          <Icon name="Check" className={`${isLive ? 'w-3.5 h-3.5' : 'w-3 h-3'} stroke-[3]`} />
                        </button>
                        )}
                        {isDismissed && (
                          <div className="w-5 h-5 rounded-full border border-red-900/40 bg-red-950/30 flex items-center justify-center shrink-0">
                            <Icon name="X" className="w-3 h-3 text-red-500/60" />
                          </div>
                        )}

                        {/* Content Area */}
                        <div className="space-y-2 min-w-0 flex-1">
                          {/* Badges */}
                          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                            {isDismissed && (
                              <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-red-950/30 text-red-400/70 border-red-900/30">
                                Dismissed
                              </span>
                            )}
                            <span className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeStyle}`}>
                              {mission.subject.toUpperCase()}
                            </span>
                            <span className="text-zinc-400 bg-zinc-900/90 border border-zinc-800 px-1.5 py-0.5 rounded">
                              {mission.type}
                            </span>
                            <span className="bg-amber-950/30 border border-amber-900/40 text-amber-300 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                              <Icon name={priorityTier.iconName as any} className={`w-3 h-3 ${priorityTier.color}`} /> {priorityTier.label} • +{weightageMarks} M
                            </span>
                            {isLive && (
                              <span className="bg-emerald-500 text-emerald-950 font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.5)] flex items-center gap-1.5 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-emerald-100" /> LIVE
                              </span>
                            )}
                            {!isLive && isNextUp && (
                              <span className="bg-indigo-600 text-white font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-md flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-white" /> NEXT UP
                              </span>
                            )}
                            {pushedSlotsMap.has(mission.id) && (
                              <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                <Icon name="Clock" className="w-3 h-3 text-emerald-400" /> {pushedSlotsMap.get(mission.id)?.slot} (Pushed to Live)
                              </span>
                            )}
                            {/* Mini Circular Ebbinghaus Decay Gauge */}
                            {retentionScore !== undefined && (
                              <span 
                                className={`px-2 py-0.5 rounded-md border flex items-center gap-1.5 font-mono text-[10px] font-bold shadow-sm ${
                                  retentionScore < 50 
                                    ? 'bg-red-950/60 border-red-500/50 text-red-300 animate-pulse' 
                                    : retentionScore < 75 
                                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300' 
                                    : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                                }`}
                                title={`Ebbinghaus Retention Index: ${retentionScore}% memory retention probability`}
                              >
                                <svg className="w-3 h-3 -rotate-90 shrink-0" viewBox="0 0 32 32">
                                  <circle cx="16" cy="16" r="12" className="stroke-zinc-800" strokeWidth="3.5" fill="none" />
                                  <circle 
                                    cx="16" cy="16" r="12" 
                                    stroke={retentionScore < 50 ? '#ef4444' : retentionScore < 75 ? '#f59e0b' : '#10b981'} 
                                    strokeWidth="3.5" 
                                    fill="none" 
                                    strokeDasharray="75.4"
                                    strokeDashoffset={75.4 - (75.4 * retentionScore) / 100}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <span>{retentionScore}% Memory</span>
                              </span>
                            )}
                            {!mission.completed && !isDismissed && overBudgetMissionIds.has(mission.id) && (
                              <span className="text-amber-400 bg-amber-950/40 border border-amber-800/60 font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                <Icon name="Moon" className="w-3 h-3 text-amber-400" /> Over Bedtime
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <p className={`tracking-tight transition-colors ${
                              isLive
                                ? 'text-base md:text-lg font-extrabold text-white group-hover:text-emerald-300'
                                : isDismissed ? 'text-xs md:text-sm text-zinc-600 line-through' 
                                : mission.completed ? 'text-xs md:text-sm text-zinc-400 line-through' 
                                : 'text-xs md:text-sm font-semibold text-zinc-100 group-hover:text-indigo-300'
                            }`}>
                            {mission.taskName}
                          </p>

                          {/* Sub-line */}
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 flex-wrap">
                            <span>
                              Unit: <strong className="text-zinc-300 font-medium">{unitName}</strong>
                            </span>

                            <span className="text-zinc-600">•</span>

                            <div className="flex items-center gap-1.5 font-mono text-[10px] shrink-0">
                              {chap && (
                                <>
                                  <span className="text-zinc-400">Lec {currentLec}/{totalLec}</span>
                                  <div className="w-16 bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                                    <div
                                      className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${lecPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-indigo-400 font-bold">{lecPercent}%</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 flex items-center gap-2 flex-wrap">
                            {isLive && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartSession(mission.id);
                                }}
                                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-mono text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                              >
                                <Icon name="Play" className="w-4 h-4 fill-white text-white" />
                                <span>{localStorage.getItem(`jeeos_mission_state_${mission.id}`) ? 'RESUME MISSION' : 'START MISSION'}</span>
                              </button>
                            )}

                            {chap && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actions.openChapterEditModal(chap.id);
                                }}
                                className="text-xs bg-indigo-950/40 hover:bg-indigo-600/30 text-indigo-300 hover:text-white px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.96] border border-indigo-500/30 flex items-center gap-1.5 shadow-sm font-mono font-bold select-none"
                                title="Configure Chapter"
                              >
                                <Icon name="SlidersHorizontal" className="w-3 h-3 text-indigo-400" />
                                <span>Chap Config</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditMission?.(mission);
                              }}
                              className="text-xs bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.96] border border-zinc-800 flex items-center gap-1.5 shadow-sm font-mono font-bold select-none"
                              title="Edit Mission Details"
                            >
                              <Icon name="Edit" className="w-3 h-3 text-zinc-400" />
                              <span>Edit Mission</span>
                            </button>
                          </div>
                        </div>

                        {/* Duration & Chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono text-zinc-300 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <Icon name="Clock" className="w-3 h-3 text-indigo-400" /> {mission.duration}m
                          </span>

                          {/* Delete button — hidden for dismissed missions (already dismissed) */}
                          {!isDismissed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMissionToDelete(mission.id);
                            }}
                            className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-red-500/20 hover:border-red-500/40 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete mission"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedMission(isExpanded ? null : mission.id);
                            }}
                            className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900/40 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                          >
                            <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} className="w-3.5 h-3.5" />
                          </button>
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
                              <div className="flex items-center justify-between text-zinc-300 font-mono text-[10px]">
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
                                  className={`text-[10px] font-bold py-1.5 px-3 rounded-md transition-all cursor-pointer border active:scale-[0.98] hover:scale-[1.02] ${
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
                                    audioEngine.playAlertPop();
                                    actions.deleteMission(mission.id);
                                    setExpandedMission(null);
                                  }}
                                  className="bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 text-[10px] py-1.5 px-3 rounded-md transition-all active:scale-[0.98] hover:scale-[1.02] cursor-pointer border border-zinc-800"
                                >
                                  Skip
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
              );
            })()}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between gap-3 pt-3 mt-4 border-t border-zinc-900/60 text-[11px] font-mono text-zinc-400 px-1">
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
              className="h-6 px-2 text-[10px] font-mono text-zinc-400 hover:text-zinc-300 uppercase"
              onClick={handleResetSession}
            >
              RESET
            </Button>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: 35% width (~400px) — Sleek Strategy & Formula Radar */}
      <div className="lg:col-span-5 xl:col-span-5 self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar">
        <div className="p-4 md:p-5 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl space-y-3.5 shadow-xl">
          
          <div className="space-y-4">
            
            {/* Header Radar Badge */}
            <div className="flex items-center justify-between border-b border-zinc-850/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase">
                  ACADEMIC STRATEGY RADAR
                </span>
              </div>
              
              {activeChap && (
                <button
                  type="button"
                  onClick={() => actions.openChapterEditModal(activeChap.id)}
                  className="text-xs font-mono font-bold text-indigo-300 hover:text-white bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 hover:border-indigo-500/50 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.96] select-none flex items-center gap-1.5 shadow-sm"
                >
                  <Icon name="SlidersHorizontal" className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Configure Chapter</span>
                </button>
              )}
            </div>

            {activeMission ? (
              <div className="space-y-4 text-left">
                
                {/* Active Module Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border shadow-sm ${getSubjectBadgeStyle(activeMission.subject)}`}>
                      {activeMission.subject.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-lg font-bold shadow-sm">
                      +{strategyRadar.weightageGain} Marks Gain
                    </span>
                  </div>
                  <h3 className="text-base font-display font-black text-white tracking-tight pt-0.5">
                    {activeMission.taskName}
                  </h3>
                </div>

                {/* Chapter Vitals */}
                {activeChap ? (
                  <div className="space-y-2 mt-3">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
                      Chapter Vitals
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-850/80 flex flex-col gap-1.5">
                        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Completion</span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white font-mono">{activeChap.completion}%</span>
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${activeChap.completion}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-850/80 flex flex-col gap-1.5">
                        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Confidence</span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white font-mono">{activeChap.confidence}%</span>
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${activeChap.confidence > 70 ? 'bg-emerald-500' : activeChap.confidence > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${activeChap.confidence}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-850/80 flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Difficulty</span>
                        <span className={`text-xs font-bold font-mono ${activeChap.difficulty === 'Hard' ? 'text-rose-400' : activeChap.difficulty === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>{activeChap.difficulty}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-850/80 flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Lectures</span>
                        <span className="text-xs font-bold text-white font-mono">{activeChap.currentLecture} / {activeChap.totalLectures}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-zinc-850/80 bg-zinc-900/40 space-y-1 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono block">No Chapter Data</span>
                    <span className="text-xs text-zinc-400">Mission does not belong to a specific syllabus chapter.</span>
                  </div>
                )}

                {/* Target PYQ Quota & Metrics */}
                <div className={`grid ${targetPYQs !== null ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5 text-center font-mono`}>
                  <div className="p-3 rounded-xl border border-zinc-850 bg-zinc-900/40 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Est. Time</span>
                    <span className="text-sm font-bold text-white">{activeMission.duration}m</span>
                  </div>
                  {targetPYQs !== null && (
                    <div className="p-3 rounded-xl border border-zinc-850 bg-zinc-900/40 space-y-0.5">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Target PYQs</span>
                      <span className="text-sm font-bold text-indigo-400">{targetPYQs} Qs</span>
                    </div>
                  )}
                  <div className="p-3 rounded-xl border border-zinc-850 bg-zinc-900/40 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">XP Award</span>
                    <span className="text-sm font-bold text-emerald-400">+{displayXp}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400 text-xs font-mono">
                All daily modules complete! Select a chapter to review.
              </div>
            )}

          </div>

          {/* Sleek Glowing Gradient Action Button */}
          <div className="pt-2">
            <Button
              onClick={() => {
                if (activeChap && !activeChap.hasTelemetry) {
                  actions.openChapterEditModal(activeChap.id);
                } else {
                  if (activeChap) {
                    actions.setRadarFocusedChapter(activeChap.id);
                    actions.setActiveSubject(activeChap.subject);
                  }
                  handleStartSession(activeMission?.id);
                }
              }}
              className={`w-full py-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg ${
                sessionState === 'active'
                  ? 'bg-indigo-950/80 border border-indigo-500/50 text-indigo-200 shadow-indigo-950/50'
                  : sessionState === 'paused'
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border border-amber-400/40 shadow-amber-500/25'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 border border-indigo-400/20'
              }`}
            >
              {sessionState === 'active' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  PAUSE FOCUS COCKPIT ({formatTimer(secondsElapsed)})
                </span>
              ) : sessionState === 'paused' ? (
                <span className="flex items-center justify-center gap-2">
                  <Pause className="w-3.5 h-3.5" />
                  RESUME FOCUS COCKPIT ({formatTimer(secondsElapsed)})
                </span>
              ) : (
                (activeMission?.id && localStorage.getItem(`jeeos_mission_state_${activeMission.id}`)) ? 'RESUME FOCUS COCKPIT SESSION' : 'ARM FOCUS COCKPIT SESSION'
              )}
            </Button>
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
