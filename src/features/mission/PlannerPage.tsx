import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { X, Sparkles, SlidersHorizontal } from 'lucide-react';
import { usePlannerState } from './hooks/usePlannerState';
import { PlannerCalendarGrid } from './components/PlannerCalendarGrid';
import { PlannerStickySidebar } from './components/PlannerStickySidebar';
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

import { motion, AnimatePresence } from 'framer-motion';

export function PlannerPage() {
  const state = usePlannerState();
  const {
    viewMode,
    setViewMode,
    selectedDayIndex,
    setSelectedDayIndex,
    getDayDateString,
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
  } = state;

  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');

  const handlePrevDate = () => {
    setSlideDirection('backward');
    setSelectedDayIndex((prev: number) => Math.max(0, prev - 1));
  };

  const handleNextDate = () => {
    setSlideDirection('forward');
    setSelectedDayIndex((prev: number) => Math.min(6, prev + 1));
  };

  const slideVariants = {
    initial: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? 40 : -40,
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? -40 : 40,
      opacity: 0,
    }),
  };

  const getWeekRangeString = (dayIdx: number) => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sun
    const distToMon = (currentDayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distToMon);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monMonth = monday.toLocaleDateString('en-US', { month: 'short' });
    const monDay = monday.getDate();
    const sunMonth = sunday.toLocaleDateString('en-US', { month: 'short' });
    const sunDay = sunday.getDate();

    if (monMonth === sunMonth) {
      return `${monMonth} ${monDay} – ${sunDay}, ${sunday.getFullYear()}`;
    }
    return `${monMonth} ${monDay} – ${sunMonth} ${sunDay}, ${sunday.getFullYear()}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 font-sans text-zinc-400 relative flex-1 h-[calc(100dvh-2rem)] pb-4">
      {/* PLANNER HEADER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 select-none py-0.5">
        {/* LEFT: Date / Week Stepper & Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0c0d14] border border-zinc-800 shadow-sm">
            <button
              type="button"
              onClick={handlePrevDate}
              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
              title={viewMode === 'weekly' ? 'Previous week' : 'Previous day'}
            >
              ‹
            </button>
            <span className="font-space-grotesk font-bold text-zinc-200 text-xs px-2 min-w-[110px] text-center tracking-wide">
              {viewMode === 'weekly' ? getWeekRangeString(selectedDayIndex) : getDayDateString(selectedDayIndex)}
            </span>
            <button
              type="button"
              onClick={handleNextDate}
              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
              title={viewMode === 'weekly' ? 'Next week' : 'Next day'}
            >
              ›
            </button>
          </div>

          <span className="text-xs text-zinc-400 font-sans hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] text-zinc-400">42h planned this week</span>
          </span>
        </div>

        {/* RIGHT: View Switcher + Add Block CTA */}
        <div className="flex items-center gap-3">
          {/* Day / Week / Month Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[#0c0d14] border border-zinc-800 gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setSlideDirection('forward');
                setViewMode('daily');
              }}
              className={`px-3 py-1 rounded-lg font-syne font-bold text-xs tracking-wider uppercase cursor-pointer transition-all ${
                viewMode === 'daily' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => {
                setSlideDirection('forward');
                setViewMode('weekly');
              }}
              className={`px-3 py-1 rounded-lg font-syne font-bold text-xs tracking-wider uppercase cursor-pointer transition-all ${
                viewMode === 'weekly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => {
                setSlideDirection('forward');
                setViewMode('monthly');
              }}
              className={`px-3 py-1 rounded-lg font-syne font-bold text-xs tracking-wider uppercase cursor-pointer transition-all ${
                viewMode === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Month
            </button>
          </div>

          {/* Add Block CTA */}
          <button
            type="button"
            onClick={() => setIsCustomMissionModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-syne font-bold text-xs tracking-wide shadow-sm transition-all cursor-pointer"
          >
            <span className="text-sm">+</span>
            <span>Add Block</span>
          </button>
        </div>
      </div>

      

      {/* SEPARATE FULL-HEIGHT STANDALONE CARDS WITH DIRECTIONAL SLIDE TRANSITIONS */}
      <AnimatePresence mode="wait" custom={slideDirection}>
        <motion.div
          key={`${viewMode}-${selectedDayIndex}`}
          custom={slideDirection}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-1 overflow-hidden gap-4 min-h-0"
        >
          {viewMode === 'daily' && (
            <>
              <PlannerCalendarGrid state={state} />
              <PlannerStickySidebar state={state} />
            </>
          )}
          {viewMode === 'weekly' && (
            <>
              <PlannerCalendarGrid state={state} />
              <PlannerStickySidebar state={state} />
            </>
          )}
          {viewMode === 'monthly' && (
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <PlannerRoadmapTab state={state} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* AUXILIARY SYSTEM MODALS */}
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
        isOpen={isCustomMissionModalOpen || !!selectedBlock}
        onClose={() => {
          setIsCustomMissionModalOpen(false);
          setSelectedBlock(null);
        }}
        missionToEdit={selectedBlock ? {
          id: selectedBlock.id,
          taskName: selectedBlock.activity || selectedBlock.chapterName || 'Study Session',
          subject: (selectedBlock.subject as any) || 'physics',
          chapter: selectedBlock.chapterName,
          type: ((selectedBlock as any).type as any) || 'Solve DPP',
          duration: selectedBlock.durationMinutes || 60,
          completed: !!selectedBlock.completed,
          xp: 60,
          unlocked: true,
          date: (selectedBlock as any).scheduledDate || getDayDateString(selectedBlock.dayIndex)
        } : null}
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
          initialGoals={state.weeklyGoals || []}
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
