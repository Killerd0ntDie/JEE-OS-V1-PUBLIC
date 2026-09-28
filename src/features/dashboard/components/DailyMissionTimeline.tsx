import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { 
  History,
  Plus,
  Moon,
  Clock,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '@/constants/motion';
import { TodayMission, SubjectId } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { CustomMissionHistoryModal } from '@/features/mission/components/CustomMissionHistoryModal';
import { audioEngine } from '@/utils/audioEngine';
import { getStartMinutesFromTimeSlot, parseTimeSlotToRange } from '@/utils/timeSlotUtils';
import { useToast } from '@/components/ui/ToastProvider';
import { EmptyOrbitStandby } from './EmptyOrbitStandby';
import { TacticalMissionConsole } from './TacticalMissionConsole';
import { TimelineMissionItem } from './TimelineMissionItem';
import { storageAdapter } from '@/services/StorageAdapter';

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

const getSubjectBadgeStyle = (subj: SubjectId | string) => {
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

export const DailyMissionTimeline = React.memo(function DailyMissionTimeline({
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
  const estimatedRemainingHours = useStudyBrainStore(s => s.estimatedRemainingHours);
  const plannedQuestions = useStudyBrainStore(s => s.plannedQuestions);
  const targetFinishTime = useStudyBrainStore(s => s.targetFinishTime);
  const chapters = useStudyBrainStore(s => s.chapters);
  const chapterTelemetryMap = useStudyBrainStore(s => s.chapterTelemetryMap);
  const settings = useStudyBrainStore(s => s.settings);
  const weeklySchedule = useStudyBrainStore(s => s.weeklySchedule) || [];
  const { toast } = useToast();

  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isExtendMenuOpen, setIsExtendMenuOpen] = useState(false);
  const [extensionConfirmation, setExtensionConfirmation] = useState<{
    isOpen: boolean;
    label: string;
    newEndTime: string;
  } | null>(null);
  const extendMenuRef = useRef<HTMLDivElement>(null);

  const [resumableMissions, setResumableMissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (extendMenuRef.current && !extendMenuRef.current.contains(e.target as Node)) {
        setIsExtendMenuOpen(false);
      }
    };
    if (isExtendMenuOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isExtendMenuOpen]);

  useEffect(() => {
    const checkResumable = () => {
      const map: Record<string, boolean> = {};
      todayMissions.forEach(m => {
        if (storageAdapter.getItem(`jeeos_mission_state_${m.id}`)) {
          map[m.id] = true;
        }
      });
      setResumableMissions(map);
    };
    checkResumable();
    window.addEventListener('focus', checkResumable);
    return () => window.removeEventListener('focus', checkResumable);
  }, [todayMissions]);

  const completedCount = todayMissions.filter(m => m.completed && !m.dismissed).length;
  const totalCount = todayMissions.filter(m => !m.dismissed).length;

  // Active mission selection logic: automatically advance focus to next incomplete mission upon task completion
  const incompleteMissions = todayMissions.filter(m => !m.completed);
  const selectedMission = todayMissions.find(m => m.id === selectedMissionId);
  const effectiveSelectedId = (selectedMission && !selectedMission.completed) ? selectedMissionId : null;

  // Calculate if it's past end time
  const now = new Date();
  const dayStartTime = settings?.dayStartTime || '07:00';
  const dayEndTime = settings?.dayEndTime || '23:00';

  const parseTimeVal = (val: string | undefined, fallback: number) => {
    const p = parseInt(val || '', 10);
    return isNaN(p) ? fallback : p;
  };
  const startHourVal = parseTimeVal(dayStartTime.split(':')[0], 7);

  let logicalRealCurrentHour = now.getHours();
  if (logicalRealCurrentHour < startHourVal) {
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
  if (todayDateObj.getHours() < startHourVal) {
    todayDateObj.setDate(todayDateObj.getDate() - 1);
  }
  todayDateObj.setHours(0, 0, 0, 0);
  const todayDateStr = getLocalDateKey(todayDateObj);

  const getTimeMins = (tStr: string) => {
    const parts = (tStr || '').split(':');
    let h = parseTimeVal(parts[0], 23);
    const m = parseTimeVal(parts[1], 0);
    if (h < startHourVal) h += 24;
    return h * 60 + m;
  };

  let effectiveEndTime = dayEndTime;
  const calendarDateStr = getLocalDateKey(new Date());
  const isSessionExtended = ((settings as any)?.sessionExtensionDate === todayDateStr || (settings as any)?.sessionExtensionDate === calendarDateStr) && !!(settings as any)?.sessionExtensionEnd;
  if (isSessionExtended) {
    const extEnd = (settings as any).sessionExtensionEnd;
    if (getTimeMins(extEnd) > getTimeMins(dayEndTime)) {
      effectiveEndTime = extEnd;
    }
  }

  const endMinsTotal = getTimeMins(effectiveEndTime);
  const isPastDayEnd = realMinsTotal > endMinsTotal;

  const handleExtendSession = async (hours: number, label: string) => {
    setIsExtendMenuOpen(false);
    audioEngine.playPowerUp().catch(() => {});
    try {
      await actions.extendSession(hours);

      const baseMins = getTimeMins(dayEndTime);
      const targetStartMins = Math.max(baseMins, realMinsTotal);
      const newEndMins = targetStartMins + Math.round(hours * 60);
      const newEndH = Math.floor((newEndMins % 1440) / 60).toString().padStart(2, '0');
      const newEndM = (newEndMins % 60).toString().padStart(2, '0');
      const calculatedNewEndTime = `${newEndH}:${newEndM}`;

      setExtensionConfirmation({
        isOpen: true,
        label,
        newEndTime: calculatedNewEndTime
      });

      toast({
        title: `Session Extended (+${label})`,
        description: `Study bedtime extended to ${calculatedNewEndTime}. Overtime active!`,
        type: 'success'
      });
    } catch {
      toast({
        title: 'Extension Failed',
        description: 'Could not update session extension.',
        type: 'error'
      });
    }
  };

  const handleWrapUpSession = async () => {
    audioEngine.playTacticalBeep(800).catch(() => {});
    try {
      await actions.updateSettings({
        sessionExtensionDate: undefined,
        sessionExtensionEnd: undefined
      });
      toast({
        title: 'Session Wrapped Up',
        description: 'Great work tonight! Rest up and recharge for tomorrow.',
        type: 'info'
      });
    } catch {
      // fallback
    }
  };
  
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
    recommendedPYQs: rawRadar?.recommendedPYQs || undefined,
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
    targetPYQs = Math.max(1, Math.round((activeMission?.duration || 60) / 3));
  }

  // Resolve XP Award
  let displayXp = activeMission?.xp || 0;
  if (displayXp === 0) {
    displayXp = targetPYQs ? Math.round(targetPYQs * 2) : Math.round((activeMission?.duration || 60) * 1.5);
  }

  const memoizedTimelineState = useMemo(() => {
    const extractLecNum = (name: string): number => {
      const match = (name || '').match(/Lecture\s+(\d+)/i);
      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    };

    const getEffectiveLecScore = (m: (typeof todayMissions)[0]): number => {
      const isLec = m.type === 'Watch Lecture' || /Lecture\s+\d+/i.test(m.taskName || '');
      if (isLec) {
        return extractLecNum(m.taskName);
      }
      const isBreak = m.subject === 'break' || m.type === 'Break' || m.taskName?.toLowerCase().includes('break');
      if (isBreak) {
        const linkedId = m.id.replace(/^today-break-/, '').replace(/^break-/, '').replace(/^break-after-/, '');
        const parent = todayMissions.find(x => x.id === linkedId);
        if (parent) {
          const pNum = extractLecNum(parent.taskName);
          if (pNum !== Number.MAX_SAFE_INTEGER) return pNum + 0.5;
        }
      }
      return Number.MAX_SAFE_INTEGER;
    };

    const getMissionChapter = (m: (typeof todayMissions)[0]): string => {
      const isBreak = m.subject === 'break' || m.type === 'Break' || m.taskName?.toLowerCase().includes('break');
      if (isBreak) {
        const linkedId = m.id.replace(/^today-break-/, '').replace(/^break-/, '').replace(/^break-after-/, '');
        const parent = todayMissions.find(x => x.id === linkedId);
        if (parent?.chapter) return parent.chapter.toLowerCase();
      }
      return (m.chapter || m.chapterName || '').toLowerCase();
    };

    const sortedMissions = [...todayMissions].sort((a, b) => {
      // 1. Sort order: active (0) → completed (1) → dismissed (2)
      const rank = (m: typeof a) => m.dismissed ? 2 : m.completed ? 1 : 0;
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;

      // 2. Sequential order for same-chapter lectures and their linked breaks:
      const chapA = getMissionChapter(a);
      const chapB = getMissionChapter(b);
      const sameChapter = Boolean(chapA && chapB && chapA === chapB);
      if (sameChapter) {
        const scoreA = getEffectiveLecScore(a);
        const scoreB = getEffectiveLecScore(b);
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
      }

      // 3. Chronological timeSlot if available to sync with Planner
      const minA = getStartMinutesFromTimeSlot(a.timeSlot);
      const minB = getStartMinutesFromTimeSlot(b.timeSlot);
      if (minA !== minB) return minA - minB;

      // 4. Linked break ordering fallback
      if (a.id === `break-${b.id}` || a.id === `today-break-${b.id}` || a.id === `break-after-${b.id}`) return 1;
      if (b.id === `break-${a.id}` || b.id === `today-break-${a.id}` || b.id === `break-after-${a.id}`) return -1;

      // 5. Total tie-breaker by ID
      return (a.id || '').localeCompare(b.id || '');
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

      uncompletedMissions.forEach((m) => {
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
          pushedSlotsMap.set(m.id, { slot: `${sH}:${sM} - ${eH}:${eM}`, isPushed: true });
        } else if (m.timeSlot) {
          pushedSlotsMap.set(m.id, { slot: m.timeSlot, isPushed: false });
        }

        if (endMins > endMinsTotal) {
          overBudgetMissionIds.add(m.id);
        }

        runningPushMins = endMins;
      });
    }

    if (uncompletedMissions.length > 0) {
      liveMissionId = uncompletedMissions[0].id;
    }
    if (uncompletedMissions.length > 1) {
      nextUpMissionId = uncompletedMissions[1].id;
    } else if (uncompletedMissions.length === 1) {
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
                  <div className="relative" ref={extendMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsExtendMenuOpen(prev => !prev)}
                      aria-expanded={isExtendMenuOpen}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5 select-none"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Extend</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExtendMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Controlled Dropdown for extension on Mobile, iPad, and PC */}
                    {isExtendMenuOpen && (
                      <div className="absolute top-full right-0 mt-1.5 w-44 bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col z-50 font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
                        <button 
                          type="button"
                          onClick={() => handleExtendSession(0.5, '30 mins')} 
                          className="px-3.5 py-2.5 text-zinc-300 hover:bg-indigo-600 hover:text-white text-left cursor-pointer transition-colors border-b border-white/5 active:bg-indigo-700 flex items-center justify-between"
                        >
                          <span className="font-semibold">+30 mins</span>
                          <span className="text-[10px] text-zinc-500">Fast sprint</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleExtendSession(1, '1 hour')} 
                          className="px-3.5 py-2.5 text-zinc-300 hover:bg-indigo-600 hover:text-white text-left cursor-pointer transition-colors border-b border-white/5 active:bg-indigo-700 flex items-center justify-between"
                        >
                          <span className="font-semibold">+1 hour</span>
                          <span className="text-[10px] text-zinc-500">Standard</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleExtendSession(2, '2 hours')} 
                          className="px-3.5 py-2.5 text-zinc-300 hover:bg-indigo-600 hover:text-white text-left cursor-pointer transition-colors active:bg-indigo-700 flex items-center justify-between"
                        >
                          <span className="font-semibold">+2 hours</span>
                          <span className="text-[10px] text-zinc-500">Deep study</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Overtime Study Session Active Banner */}
            {isSessionExtended && !isPastDayEnd && (
              <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-amber-500/30 rounded-2xl bg-gradient-to-r from-amber-950/30 via-zinc-900/70 to-indigo-950/30 shadow-lg mb-3 font-mono">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-white font-display font-bold text-xs sm:text-sm tracking-tight flex items-center gap-2">
                      <span>Overtime Session Active</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono uppercase font-bold">
                        Extended to {effectiveEndTime}
                      </span>
                    </div>
                    <div className="text-zinc-400 text-xs font-sans mt-0.5">
                      Bedtime extended. Remaining missions unlocked for tonight. Wrap up whenever you are ready.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleExtendSession(0.5, '30 mins')}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-amber-400" />
                    <span>+30m</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleWrapUpSession}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Wrap Up
                  </button>
                </div>
              </div>
            )}

            {todayMissions.length === 0 ? (
              <EmptyOrbitStandby
                chapters={chapters}
                weeklySchedule={weeklySchedule}
                onEngageChapter={(chapterId, chapterName) => {
                  actions.setEnergyLevel("High");
                  const chap = chapters.find(c => c.id === chapterId);
                  const nextLec = (chap?.currentLecture && chap.currentLecture > 0) ? chap.currentLecture : 1;
                  actions.updateChapterData(chapterId, { status: "Learning" });
                  const taskTitle = chap?.totalLectures 
                    ? `Lecture ${nextLec}/${chap.totalLectures}: ${chapterName}` 
                    : `Lecture ${nextLec}: ${chapterName}`;
                  actions.addTodayMission({
                    id: `mission-eng-${Date.now()}`,
                    subject: (chap?.subject || 'physics') as SubjectId,
                    chapter: chapterName,
                    chapterId: chapterId,
                    type: 'Watch Lecture',
                    taskName: taskTitle,
                    duration: 45,
                    xp: 30,
                    completed: false,
                    unlocked: true,
                    priorityScore: 90,
                    timeSlot: 'Current Session',
                    scheduledDate: todayDateStr
                  });
                  toast({
                    title: `Mission Initialized: ${chapterName}`,
                    description: `Active orbit engaged with ${taskTitle}!`,
                    type: 'success'
                  });
                }}
                onAdvanceScheduleTask={async (task) => {
                  audioEngine.playPowerUp().catch(() => {});
                  await actions.addTodayMission({
                    id: `mission-adv-${Date.now()}`,
                    subject: task.subject as SubjectId,
                    chapter: task.chapterName,
                    chapterId: task.chapterId,
                    type: task.taskType,
                    taskName: task.activity,
                    duration: task.durationMinutes || 45,
                    xp: Math.round((task.durationMinutes || 45) * 0.5),
                    completed: false,
                    unlocked: true,
                    priorityScore: task.priorityScore || 85,
                    timeSlot: 'Current Session',
                    scheduledDate: todayDateStr
                  });
                  toast({
                    title: `Task Activated: ${task.activity}`,
                    description: `Pulled from ${task.dayName} schedule into today's active execution queue!`,
                    type: 'success'
                  });
                }}
                onOpenCustomMission={onOpenCustomMission}
              />
            ) : (
              <AnimatePresence mode="popLayout">
                {visibleMissions.map((mission) => {
                  const isDismissed = !!mission.dismissed;
                  const badgeStyle = getSubjectBadgeStyle(mission.subject);
                  const isExpanded = expandedMission === mission.id;
                  const isSelected = activeMission?.id === mission.id;
                  const isLive = mission.id === liveMissionId;
                  const isNextUp = mission.id === nextUpMissionId;

                  const chap = chapters.find(c => 
                    c.name.toLowerCase() === (mission.chapter || mission.chapterName || '').toLowerCase() || 
                    (mission.chapterId && c.id === mission.chapterId)
                  );

                  return (
                    <TimelineMissionItem
                      key={mission.id}
                      mission={mission}
                      chap={chap}
                      chapterTelemetryMap={chapterTelemetryMap}
                      isLive={isLive}
                      isNextUp={isNextUp}
                      isSelected={isSelected}
                      isExpanded={isExpanded}
                      isDismissed={isDismissed}
                      isResumable={!!resumableMissions[mission.id]}
                      sessionState={sessionState}
                      selectedMissionId={selectedMissionId}
                      badgeStyle={badgeStyle}
                      slotText={pushedSlotsMap.get(mission.id)?.slot}
                      isOverBudget={overBudgetMissionIds.has(mission.id)}
                      onSelect={() => {
                        setSelectedMissionId?.(mission.id);
                        if (chap) {
                          actions.setRadarFocusedChapter(chap.id);
                        }
                      }}
                      onToggleComplete={() => {
                        actions.completeTask(mission.id);
                        if (!mission.completed) {
                          audioEngine.playSuccess();
                        } else {
                          audioEngine.playAlert();
                        }
                      }}
                      onDelete={() => setMissionToDelete(mission.id)}
                      onToggleExpand={() => setExpandedMission(isExpanded ? null : mission.id)}
                      onEditMission={() => onEditMission?.(mission)}
                      onStartSession={() => handleStartSession(mission.id)}
                      onOpenChapterEditModal={(chapId) => actions.openChapterEditModal(chapId)}
                      handleResetSession={handleResetSession}
                    />
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
      <TacticalMissionConsole
        activeMission={activeMission || undefined}
        activeChap={activeChap || undefined}
        strategyRadar={strategyRadar}
        targetPYQs={targetPYQs || undefined}
        displayXp={displayXp}
        sessionState={sessionState}
        secondsElapsed={secondsElapsed}
        formatTimer={formatTimer}
        resumableMissions={resumableMissions}
        onStartSession={handleStartSession}
        onOpenChapterEditModal={(chapterId) => actions.openChapterEditModal(chapterId)}
        onSetRadarFocusedChapter={(chapterId) => actions.setRadarFocusedChapter(chapterId)}
        onSetActiveSubject={(subject) => actions.setActiveSubject(subject)}
      />

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

      {/* Explicit Session Extension Confirmation Modal */}
      <AnimatePresence>
        {extensionConfirmation?.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100050] flex items-center justify-center p-4 font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={springs.snappy}
              className="max-w-md w-full p-6 rounded-3xl border border-amber-500/40 bg-zinc-950/95 shadow-2xl shadow-amber-500/20 text-center relative overflow-hidden flex flex-col items-center space-y-4"
            >
              {/* Top ambient glow */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/30">
                <Sparkles className="w-7 h-7 animate-pulse text-amber-400" />
              </div>

              <div className="space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                  OVERTIME ACTIVATED · +{extensionConfirmation.label}
                </span>
                <h3 className="text-xl font-display font-bold text-white tracking-tight">
                  Study Session Extended!
                </h3>
                <p className="text-xs text-zinc-300 max-w-sm font-sans leading-relaxed">
                  Your bedtime cutoff has been extended to <span className="font-bold text-amber-300 font-mono">{extensionConfirmation.newEndTime}</span>.
                  All missions are unlocked for tonight. Keep your study streak alive!
                </p>
              </div>

              <div className="w-full pt-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playMechanicalKey('click').catch(() => {});
                    setExtensionConfirmation(null);
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/30 active:scale-95 cursor-pointer"
                >
                  Got It · Continue Studying
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
