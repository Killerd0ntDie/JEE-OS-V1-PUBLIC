import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { X, Sparkles, SlidersHorizontal } from 'lucide-react';
import { usePlannerState } from './hooks/usePlannerState';
import { PlannerCalendarGrid } from './components/PlannerCalendarGrid';
import { PlannerStickySidebar } from './components/PlannerStickySidebar';
import { PlannerRoadmapTab } from './components/PlannerRoadmapTab';
import { SyllabusDiagnosisModal } from '@/components/mentor/SyllabusDiagnosisModal';
import { WeeklyCheckinModal } from '@/components/mentor/WeeklyCheckinModal';
import { MonthlyObjectiveModal } from '@/components/mentor/MonthlyObjectiveModal';
import { EditWeeklyGoalsModal } from './components/EditWeeklyGoalsModal';
import { CustomMissionModal } from './components/CustomMissionModal';
import { AiRevisionPlanModal } from '@/components/shared/AiRevisionPlanModal';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { SwapSubjectModal } from './components/SwapSubjectModal';

import { motion, AnimatePresence } from 'motion/react';

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
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 select-none py-1">
        {/* LEFT: Date / Week Stepper & Status Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 shadow-md backdrop-blur-xl">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handlePrevDate}
              className="w-7 h-7 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer border border-zinc-800/80"
              title={viewMode === 'weekly' ? 'Previous week' : 'Previous day'}
            >
              <span className="text-sm font-bold">‹</span>
            </motion.button>
            <button
              type="button"
              onClick={() => setSelectedDayIndex(state.currentDayIndex)}
              className={`font-mono font-bold text-xs px-3 min-w-[120px] text-center tracking-tight transition-colors cursor-pointer ${
                selectedDayIndex === state.currentDayIndex
                  ? 'text-indigo-300 hover:text-white'
                  : 'text-zinc-300 hover:text-white'
              }`}
              title="Click to jump to Today"
            >
              {viewMode === 'weekly' ? getWeekRangeString(selectedDayIndex) : getDayDateString(selectedDayIndex)}
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handleNextDate}
              className="w-7 h-7 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer border border-zinc-800/80"
              title={viewMode === 'weekly' ? 'Next week' : 'Next day'}
            >
              <span className="text-sm font-bold">›</span>
            </motion.button>
          </div>

          {/* Jump to Today Button */}
          {selectedDayIndex !== state.currentDayIndex && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelectedDayIndex(state.currentDayIndex)}
              className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 transition-colors cursor-pointer"
            >
              Today
            </motion.button>
          )}

          <span className="text-xs font-mono hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-zinc-400 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span><strong className="text-zinc-200 font-bold">42h</strong> planned this week</span>
          </span>
        </div>

        {/* RIGHT: View Switcher + Add Block CTA */}
        <div className="flex items-center gap-2.5">
          {/* Day / Week / Month Switcher with Spring Glider */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-950/90 border border-zinc-800/90 rounded-2xl relative select-none shadow-md backdrop-blur-xl">
            {(['daily', 'weekly', 'monthly'] as const).map((mode) => {
              const isActive = viewMode === mode;
              const label = mode === 'daily' ? 'Day' : mode === 'weekly' ? 'Week' : 'Month';
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setSlideDirection('forward');
                    setViewMode(mode);
                  }}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-colors cursor-pointer select-none z-10 flex items-center justify-center ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="plannerViewModeGlider"
                      className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/30 -z-10"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Add Block CTA */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setIsCustomMissionModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs tracking-wider uppercase shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
          >
            <span className="text-sm leading-none font-bold">+</span>
            <span>Add Block</span>
          </motion.button>
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
