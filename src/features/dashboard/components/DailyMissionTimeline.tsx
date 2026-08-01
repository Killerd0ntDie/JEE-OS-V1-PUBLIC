import React, { useState } from 'react';
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

interface DailyMissionTimelineProps {
  sessionState: 'idle' | 'active' | 'paused';
  secondsElapsed: number;
  expandedMission: string | null;
  setExpandedMission: (id: string | null) => void;
  handleStartSession: () => void;
  handleResetSession: (e?: React.MouseEvent) => void;
  formatTimer: (totalSecs: number) => string;
  onOpenCustomMission?: () => void;
  onEditMission?: (mission: TodayMission) => void;
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
  onEditMission
}: DailyMissionTimelineProps) {
  const actions = useStudyBrainStore(s => s.actions);
  const todayMissions = useStudyBrainStore(s => s.todayMissions);
  const energyLevel = useStudyBrainStore(s => s.energyLevel);
  const estimatedRemainingHours = useStudyBrainStore(s => s.estimatedRemainingHours);
  const plannedQuestions = useStudyBrainStore(s => s.plannedQuestions);
  const targetFinishTime = useStudyBrainStore(s => s.targetFinishTime);
  const chapters = useStudyBrainStore(s => s.chapters);
  const chapterTelemetryMap = useStudyBrainStore(s => s.chapterTelemetryMap);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const completedCount = todayMissions.filter(m => m.completed && !m.dismissed).length;
  const totalCount = todayMissions.filter(m => !m.dismissed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Active mission selection logic: automatically advance focus to next incomplete mission upon task completion
  const incompleteMissions = todayMissions.filter(m => !m.completed);
  const selectedMission = todayMissions.find(m => m.id === selectedMissionId);
  const effectiveSelectedId = (selectedMission && !selectedMission.completed) ? selectedMissionId : null;

  const activeMission = todayMissions.find(m => m.id === effectiveSelectedId) || incompleteMissions[0] || todayMissions[0];

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
    recommendedPYQs: rawRadar?.recommendedPYQs || 25,
    weightageGain: rawRadar?.weightageGain || rawRadar?.examWeightagePercent || (activeMission?.subject === 'chemistry' ? 18 : activeMission?.subject === 'physics' ? 16 : 14),
    conceptTags: rawRadar?.conceptTags || ['Formula Recall', 'PYQ Solving', 'Concept Application']
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-start">
      
      {/* LEFT COLUMN: 65% width (~720px) — Clean Execution Stream */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
        
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-900/80 pb-3 px-1">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase">
                  TODAY'S MISSION CHECKLIST
                </span>
                <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                  {completedCount}/{totalCount} Done ({progressPercent}%)
                </span>
                <span className="text-[9px] font-mono font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  Derived from Weekly Master Plan
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-display font-bold text-white tracking-tight">
                  Execution Queue
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="text-xs font-mono text-zinc-400 hover:text-indigo-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    History
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCustomMission}
                    className="text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    + Add Mission
                  </button>
                  <a
                    href="#planner"
                    onClick={(e) => {
                      e.preventDefault();
                      window.dispatchEvent(new CustomEvent('navigate-page', { detail: 'planner' }));
                    }}
                    className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Manage in Planner →
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-24 bg-zinc-900/80 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="bg-indigo-500 h-full rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-2.5">
            {todayMissions.length === 0 ? (
              <div className="p-8 flex flex-col items-center gap-4 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/30">
                <div className="text-zinc-300 font-display font-medium text-base">Execution Queue is Empty</div>
                <div className="text-zinc-500 text-xs max-w-sm">
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
              [...todayMissions]
                .sort((a, b) => {
                  // Sort order: active → completed → dismissed
                  const rank = (m: typeof a) => m.dismissed ? 2 : m.completed ? 1 : 0;
                  return rank(a) - rank(b);
                })
                .map((mission, idx) => {
                  const isDismissed = !!mission.dismissed;
                  const badgeStyle = getSubjectBadgeStyle(mission.subject);
                  const isExpanded = expandedMission === mission.id;
                  const isSelected = activeMission?.id === mission.id;
                  const isNextUp = !mission.completed && idx === 0;

                  // Chapter metadata
                  const chap = chapters.find(c => 
                    c.name.toLowerCase() === (mission.chapter || mission.chapterName || '').toLowerCase() || 
                    (mission.chapterId && c.id === mission.chapterId)
                  );

                  const currentLec = chap?.currentLecture ?? 0;
                  const totalLec = chap?.totalLectures ?? 12;
                  const lecPercent = totalLec > 0 ? Math.min(100, Math.round((currentLec / totalLec) * 100)) : 0;

                  const weightageMarks = (chap?.weightage || 4) * 3;
                  const priorityTier = chap?.priority === 1
                    ? { icon: '🔥', label: 'Tier 1' }
                    : chap?.priority === 2
                    ? { icon: '⚡', label: 'Tier 2' }
                    : { icon: '⭐', label: 'Tier 3' };
                  
                  const unitName = chap?.unit || 'Core Module';

                  return (
                    <div
                      key={mission.id}
                      onClick={() => {
                        if (sessionState !== 'idle' && activeMission?.id !== mission.id) {
                          handleResetSession();
                        }
                        setSelectedMissionId(mission.id);
                        if (chap) {
                          actions.setRadarFocusedChapter(chap.id);
                        }
                      }}
                    className={`group rounded-xl border p-4 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 active:scale-[0.99] ${
                        isDismissed
                          ? 'bg-zinc-950/10 border-red-900/20 opacity-40 cursor-default'
                          : mission.completed
                          ? 'bg-zinc-950/20 border-zinc-900/40 opacity-60'
                          : isSelected
                          ? 'bg-indigo-950/[0.25] border-indigo-500/50 shadow-[0_4px_25px_rgba(99,102,241,0.08)]'
                          : 'bg-zinc-900/30 border-zinc-850/80 hover:border-zinc-800 hover:bg-zinc-900/50 hover:shadow-lg hover:shadow-zinc-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        
                        {/* Circular Checkbox — hidden for dismissed missions */}
                        {!isDismissed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.completeTask(mission.id);
                          }}
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-100 cursor-pointer ${
                            mission.completed
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              : 'border-zinc-700 hover:border-indigo-400 bg-transparent text-transparent hover:text-indigo-400/60'
                          }`}
                          title={mission.completed ? "Mark incomplete" : "Mark complete"}
                        >
                          <Icon name="Check" className="w-3 h-3 stroke-[3]" />
                        </button>
                        )}
                        {isDismissed && (
                          <div className="w-5 h-5 rounded-full border border-red-900/40 bg-red-950/30 flex items-center justify-center shrink-0">
                            <Icon name="X" className="w-3 h-3 text-red-500/60" />
                          </div>
                        )}

                        {/* Content Area */}
                        <div className="space-y-1 min-w-0 flex-1">
                          {/* Badges */}
                          <div className="flex items-center gap-2 flex-wrap text-[9px] font-mono">
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
                              {priorityTier.icon} {priorityTier.label} • +{weightageMarks} M
                            </span>
                            {isNextUp && (
                              <span className="text-indigo-400 font-bold flex items-center gap-1 animate-pulse">
                                ● NEXT
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <p className={`text-xs md:text-sm font-semibold tracking-tight transition-colors ${
                              isDismissed ? 'text-zinc-600 line-through' : mission.completed ? 'text-zinc-500 line-through' : 'text-zinc-100 group-hover:text-indigo-300'
                            }`}>
                            {mission.taskName}
                          </p>

                          {/* Sub-line */}
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
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
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      actions.openChapterEditModal(chap.id);
                                    }}
                                    className="ml-2 text-[9px] bg-indigo-950/40 hover:bg-indigo-600/90 text-indigo-300 hover:text-white px-2 py-0.5 rounded-md cursor-pointer transition-all border border-indigo-500/30 hover:border-indigo-400 flex items-center gap-1 shadow-sm"
                                    title="Chapter Info / Telemetry"
                                  >
                                    <Settings className="w-2.5 h-2.5" /> Chap
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditMission?.(mission);
                                }}
                                className="ml-1 text-[9px] bg-emerald-950/40 hover:bg-emerald-600/90 text-emerald-300 hover:text-white px-2 py-0.5 rounded-md cursor-pointer transition-all border border-emerald-500/30 hover:border-emerald-400 flex items-center gap-1 shadow-sm"
                                title="Edit Mission Details"
                              >
                                Edit Mission
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Duration & Chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono text-zinc-300 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-lg">
                            ⏱️ {mission.duration}m
                          </span>

                          {/* Delete button — hidden for dismissed missions (already dismissed) */}
                          {!isDismissed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMissionToDelete(mission.id);
                            }}
                            className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-red-500/20 hover:border-red-500/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
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
                            className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900/40 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                          >
                            <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>

                      {/* Expandable Details Drawer */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-zinc-900/60 px-3 py-2.5 mt-2.5 bg-zinc-950/40 text-xs text-zinc-400 space-y-2"
                          >
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
                                    audioEngine.playSuccessChime();
                                    setExpandedMission(null);
                                  } else {
                                    audioEngine.playAlertPop();
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
                                className="bg-transparent hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 text-[10px] py-1.5 px-3 rounded-md transition-all active:scale-[0.98] hover:scale-[1.02] cursor-pointer border border-zinc-800"
                              >
                                Skip
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  );
                })
            )}
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
              className="h-6 px-2 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 uppercase"
              onClick={handleResetSession}
            >
              RESET
            </Button>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: 35% width (~400px) — Sleek Strategy & Formula Radar */}
      <div className="lg:col-span-5 xl:col-span-5 self-start sticky top-6">
        <div className="p-5 md:p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl space-y-4">
          
          <div className="space-y-4">
            
            {/* Header Radar Badge */}
            <div className="flex items-center justify-between border-b border-zinc-900/80 pb-3">
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
                  className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-900/60 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  ⚙️ Configure Chapter
                </button>
              )}
            </div>

            {activeMission ? (
              <div className="space-y-4 text-left">
                
                {/* Active Module Header */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSubjectBadgeStyle(activeMission.subject)}`}>
                      {activeMission.subject.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-mono text-amber-300 bg-amber-950/30 border border-amber-900/40 px-2 py-0.5 rounded font-semibold">
                      +{strategyRadar.weightageGain} Marks Gain
                    </span>
                  </div>
                  <h3 className="text-base font-display font-bold text-white tracking-tight pt-1">
                    {activeMission.taskName}
                  </h3>
                </div>

                {/* Key Concepts to Recall */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest block">
                    Key Concept Formulae
                  </span>
                  <div className="space-y-1">
                    {strategyRadar.formulas.map((formula, fIdx) => (
                      <div key={fIdx} className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-850/80 text-xs font-mono text-indigo-300 flex items-center gap-2">
                        <span className="text-indigo-500 font-bold">⚡</span>
                        <span className="truncate">{formula}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Common Pitfall Warning */}
                <div className="p-3 rounded-xl border border-amber-900/30 bg-amber-950/10 space-y-1 text-xs text-amber-200/90 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                    <span aria-hidden="true">⚠️</span>
                    <span>Common Exam Pitfall</span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    {strategyRadar.pitfalls}
                  </p>
                </div>

                {/* Target PYQ Quota & Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2.5 rounded-xl border border-zinc-900 bg-zinc-900/40 space-y-0.5">
                    <span className="text-xs text-zinc-500 uppercase block">Est. Time</span>
                    <span className="text-xs font-bold text-white">{activeMission.duration}m</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-zinc-900 bg-zinc-900/40 space-y-0.5">
                    <span className="text-xs text-zinc-500 uppercase block">Target PYQs</span>
                    <span className="text-xs font-bold text-indigo-400">{strategyRadar.recommendedPYQs} Qs</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-zinc-900 bg-zinc-900/40 space-y-0.5">
                    <span className="text-xs text-zinc-500 uppercase block">XP Award</span>
                    <span className="text-xs font-bold text-emerald-400">+{activeMission.xp}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono">
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
                  handleStartSession();
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
                'ARM FOCUS COCKPIT SESSION'
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
