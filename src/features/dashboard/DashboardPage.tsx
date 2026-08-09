import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { QuickRevisionModal } from '@/components/ui/QuickRevisionModal';
import { DailyMissionTimeline } from './components/DailyMissionTimeline';
import { CustomMissionModal } from '@/features/mission/components/CustomMissionModal';
import { DailyCheckinCard } from '@/components/mentor/DailyCheckinCard';
import { MonthlyObjectiveModal } from '@/components/mentor/MonthlyObjectiveModal';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { DashboardHeader } from './components/DashboardHeader';
import { RoutineBreakModal } from './components/RoutineBreakModal';
import { DashboardFocusSection } from './components/DashboardFocusSection';
import { BreakActiveModal } from './components/BreakActiveModal';
import { useDashboardState } from './hooks/useDashboardState';

export function DashboardPage() {
  const navigate = useNavigate();
  const { state, handlers, actions } = useDashboardState();
  const [isRoutineBreakModalOpen, setIsRoutineBreakModalOpen] = React.useState(false);

  if (state.loading) return <DashboardSkeleton />;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 font-sans text-zinc-400 relative pb-8">
      
      {/* DASHBOARD HEADER */}
      <DashboardHeader
        getGreeting={state.getGreeting}
        userName={state.userName}
        incompleteTasks={state.incompleteTasks}
        estimatedRemainingHours={Number(state.estimatedRemainingHours) || 0}
        nextTaskName={state.nextTaskName}
        energyLevel={state.energyLevel}
        setEnergyLevel={(level) => actions.setEnergyLevel(level)}
        onOpenRoutineBreak={() => setIsRoutineBreakModalOpen(true)}
        chapters={state.chapters || []}
        onOpenChapter={(chapterId) => actions.openChapterEditModal(chapterId)}
        onSetMonthlyObjective={() => handlers.setIsMonthlyObjectiveModalOpen(true)}
        onSetDailyCapacity={() => navigate('/planner')}
        isHeaderExpanded={state.isHeaderExpanded}
        onToggleExpand={handlers.handleManualToggleHeader}
      />

      <RoutineBreakModal
        isOpen={isRoutineBreakModalOpen}
        onClose={() => setIsRoutineBreakModalOpen(false)}
      />

      <BreakActiveModal
        isOpen={!!state.activeBreakMissionId}
        onClose={() => handlers.setActiveBreakMissionId(null)}
        breakMission={state.todayMissions.find(m => m.id === state.activeBreakMissionId) || null}
      />

      {/* EMBEDDED HERO DAILY CHECK-IN CARD */}
      <DailyCheckinCard />

      <MonthlyObjectiveModal 
        isOpen={state.isMonthlyObjectiveModalOpen} 
        onClose={() => handlers.setIsMonthlyObjectiveModalOpen(false)} 
      />

      {/* TODAY'S MISSIONS HERO SECTION (65%/35% Split Layout) */}
      <DailyMissionTimeline
        sessionState={state.sessionState}
        secondsElapsed={state.secondsElapsed}
        expandedMission={state.expandedMission}
        setExpandedMission={handlers.setExpandedMission}
        handleStartSession={handlers.handleStartSession}
        handleResetSession={handlers.handleResetSession}
        formatTimer={handlers.formatTimer}
        onEditMission={(mission) => {
          handlers.setMissionToEdit(mission);
          handlers.setIsCustomMissionModalOpen(true);
        }}
        onOpenCustomMission={() => handlers.setIsCustomMissionModalOpen(true)}
        selectedMissionId={state.selectedMissionId}
        setSelectedMissionId={handlers.setSelectedMissionId}
      />

      {/* SECONDARY DASHBOARD TABBED VIEWS (Focus & Queue vs Analytics & Readiness) */}
      <DashboardFocusSection
        activeTab={state.activeTab}
        setActiveTab={handlers.setActiveTab}
        revisionQueue={state.revisionQueue}
        onLaunchRevision={handlers.setSelectedRevision}
        targetYear={state.settings?.targetYear || '2026'}
        syllabusProgress={state.syllabusProgress}
        analytics={state.analytics}
        settings={state.settings}
        xp={state.xp}
        studySessions={state.studySessions || []}
        mentorProfile={state.mentorProfile}
        chapters={state.chapters || []}
        projectedReadiness={state.projectedReadiness}
      />

      {/* QUICK REVISION MODAL */}
      {state.selectedRevision && (
        <QuickRevisionModal
          isOpen={!!state.selectedRevision}
          revision={state.selectedRevision}
          onClose={() => handlers.setSelectedRevision(null)}
          onAction={(chapterId, outcome) => {
            if (outcome === 'skip') return;
            const confidence = outcome === 'complete' ? 'High' : outcome === 'needs_another' ? 'Medium' : 'Low';
            actions.completeRevision(chapterId, confidence);
          }}
        />
      )}

      <CustomMissionModal 
        isOpen={state.isCustomMissionModalOpen}
        onClose={() => {
          handlers.setIsCustomMissionModalOpen(false);
          setTimeout(() => handlers.setMissionToEdit(null), 300); // clear after animation
        }}
        missionToEdit={state.missionToEdit}
      />

    </div>
  );
}
