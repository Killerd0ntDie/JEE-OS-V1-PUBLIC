import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { CalendarDays, LayoutGrid, BarChart2, Calendar, X, Sparkles, SlidersHorizontal } from 'lucide-react';
import { usePlannerState } from './hooks/usePlannerState';
import { PlannerHeader } from './components/PlannerHeader';
import { PlannerCalendarTab } from './components/PlannerCalendarTab';
import { PlannerRoadmapTab } from './components/PlannerRoadmapTab';

import { MentorInterviewModal } from '@/components/mentor/MentorInterviewModal';
import { SyllabusDiagnosisModal } from '@/components/mentor/SyllabusDiagnosisModal';
import { WeeklyCheckinModal } from '@/components/mentor/WeeklyCheckinModal';
import { MonthlyObjectiveModal } from '@/components/mentor/MonthlyObjectiveModal';
import { EditWeeklyGoalsModal } from './components/EditWeeklyGoalsModal';
import { CustomMissionModal } from './components/CustomMissionModal';
import { AiRevisionPlanModal } from '@/components/shared/AiRevisionPlanModal';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { SwapSubjectModal } from './components/SwapSubjectModal';
import { OnHoldReminderBanner } from '@/features/dashboard/components/OnHoldReminderBanner';

export function PlannerPage() {
  const state = usePlannerState();
  const {
    viewMode,
    setViewMode,
    selectedBlock,
    setSelectedBlock,
    isRationaleExpanded,
    setIsRationaleExpanded,
    activeInspectorTelemetry,
    getBadgeStyle,
    isInterviewModalOpen,
    setIsInterviewModalOpen,
    isDiagnosisModalOpen,
    setIsDiagnosisModalOpen,
    isWeeklyCheckinModalOpen,
    setIsWeeklyCheckinModalOpen,
    isMonthlyObjectiveModalOpen,
    setIsMonthlyObjectiveModalOpen,
    isCustomMissionModalOpen,
    setIsCustomMissionModalOpen,
    isAiRevisionModalOpen,
    setIsAiRevisionModalOpen,
    missionToDelete,
    setMissionToDelete,
    missionToSwap,
    setMissionToSwap,
    isEditGoalsOpen,
    setIsEditGoalsOpen,
    weeklyGoals,
    actions,
    chapters,
  } = state;

  return (
    <div className="space-y-6 pb-12 text-left relative">
      <PlannerHeader state={state} />

      {(viewMode === 'daily' || viewMode === 'weekly') && <PlannerCalendarTab state={state} />}
      {viewMode === 'monthly' && <PlannerRoadmapTab state={state} />}

      <Modal
        isOpen={!!selectedBlock}
        onClose={() => setSelectedBlock(null)}
        zIndex={100}
        backdropClassName="bg-[#09090b] font-sans animate-in fade-in duration-300"
        className="w-full max-w-4xl mx-auto flex flex-col flex-1 relative py-12 px-6 overflow-y-auto"
      >
        {selectedBlock && (
          <>
            <button
              onClick={() => setSelectedBlock(null)}
              className="absolute top-6 right-6 p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer z-10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 text-left">
              <div className="space-y-2 pr-12">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getBadgeStyle(selectedBlock.subject)}`}>
                    {selectedBlock.subject}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    {selectedBlock.timeSlot} • {selectedBlock.durationMinutes} minutes
                  </span>
                </div>

                <h3 className="text-lg font-display font-bold text-white tracking-tight">
                  {selectedBlock.chapterName}
                </h3>
                <p className="text-xs font-mono text-indigo-400 font-semibold">
                  {selectedBlock.activity}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                  Chapter Infographics & Mastery Telemetry
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                    <span className="text-[9px] text-zinc-500 block uppercase">Mastery Score</span>
                    <span className="text-sm font-bold text-indigo-400">
                      {activeInspectorTelemetry?.masteryScore || 65}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                    <span className="text-[9px] text-zinc-500 block uppercase">Theory Progress</span>
                    <span className="text-xs font-bold text-white">
                      {activeInspectorTelemetry?.currentLecture || 0} / {activeInspectorTelemetry?.totalLectures || 12} Lecs
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                    <span className="text-[9px] text-zinc-500 block uppercase">DPP Status</span>
                    <span className={`text-xs font-bold ${activeInspectorTelemetry?.dppComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {activeInspectorTelemetry?.dppComplete ? '✓ Mastered' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                    <span className="text-[9px] text-zinc-500 block uppercase">PYQ Status</span>
                    <span className={`text-xs font-bold ${activeInspectorTelemetry?.pyqsComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {activeInspectorTelemetry?.pyqsComplete ? '✓ Mastered' : '⏳ Pending'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                    <span className="text-[9px] text-zinc-500 block uppercase">JEE Weightage</span>
                    <span className="text-xs font-bold text-purple-400">
                      {activeInspectorTelemetry?.weightagePercent || 4.5}% Weight
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-0.5">
                    <span className="text-[9px] text-zinc-500 block uppercase">Retention Score</span>
                    <span className="text-xs font-bold text-sky-400">
                      {activeInspectorTelemetry?.retentionConfidence || 'High'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-indigo-900/40 bg-indigo-950/30 space-y-2 font-sans text-xs">
                <div 
                  onClick={() => setIsRationaleExpanded(!isRationaleExpanded)}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="font-mono text-xs font-bold text-indigo-300 uppercase">
                      AI Mentor Rationale
                    </span>
                  </div>
                  <span className="font-mono text-2xs text-indigo-400 group-hover:underline flex items-center gap-1">
                    {isRationaleExpanded ? 'Minimize ▲' : 'Expand Rationale ▼'}
                  </span>
                </div>

                {isRationaleExpanded ? (
                  <div className="space-y-2 text-zinc-300 text-xs leading-relaxed pt-2 border-t border-indigo-900/30">
                    <p>🎯 <strong>Why Selected:</strong> {selectedBlock.reasoning.whySelected}</p>
                    <p>🔗 <strong>Dependencies Unlocked:</strong> {selectedBlock.reasoning.dependentChapters.join(', ')}</p>
                    <p>⚖️ <strong>Ranking Rationale:</strong> {selectedBlock.reasoning.rankingRationale}</p>
                    <p>📈 <strong>Long-term Impact:</strong> {selectedBlock.reasoning.longTermImpact}</p>
                    <p>⚠️ <strong>Risk of Postponing:</strong> {selectedBlock.reasoning.postponeRisk}</p>
                    <p>🎯 <strong>Target Benchmark:</strong> <span className="text-purple-300 font-bold font-mono">{selectedBlock.reasoning.targetAccuracy}</span></p>
                  </div>
                ) : (
                  <p className="text-zinc-400 text-[11px] line-clamp-1">
                    💡 {selectedBlock.reasoning.whySelected}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-zinc-900/60 mt-4">
                <div className="flex items-center gap-3">
                  {activeInspectorTelemetry && (
                    <button
                      type="button"
                      onClick={() => {
                        actions.openChapterEditModal(activeInspectorTelemetry.chapterId);
                        setSelectedBlock(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border border-zinc-800"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Edit Telemetry
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBlock(null)}
                  className="px-6 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-300 font-mono text-xs font-bold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <MentorInterviewModal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        isMandatory={false}
      />

      <SyllabusDiagnosisModal
        isOpen={isDiagnosisModalOpen}
        onClose={() => setIsDiagnosisModalOpen(false)}
      />

      <WeeklyCheckinModal
        isOpen={isWeeklyCheckinModalOpen}
        onClose={() => setIsWeeklyCheckinModalOpen(false)}
      />

      <MonthlyObjectiveModal
        isOpen={isMonthlyObjectiveModalOpen}
        onClose={() => setIsMonthlyObjectiveModalOpen(false)}
      />

      <CustomMissionModal 
        isOpen={isCustomMissionModalOpen}
        onClose={() => setIsCustomMissionModalOpen(false)}
      />

      <AiRevisionPlanModal
        isOpen={isAiRevisionModalOpen}
        onClose={() => setIsAiRevisionModalOpen(false)}
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

      <SwapSubjectModal
        isOpen={!!missionToSwap}
        onClose={() => setMissionToSwap(null)}
        mission={missionToSwap}
      />

      {isEditGoalsOpen && (
        <EditWeeklyGoalsModal
          initialGoals={weeklyGoals || []}
          onClose={() => setIsEditGoalsOpen(false)}
          onSave={async (goals: any) => {
            await actions.updateWeeklyGoals(goals);
            setIsEditGoalsOpen(false);
          }}
        />
      )}
    </div>
  );
}
