
import { motion, AnimatePresence } from 'motion/react';
import { QuickRevisionModal } from '@/components/ui/QuickRevisionModal';
import { DailyMissionTimeline } from './components/DailyMissionTimeline';
import { CustomMissionModal } from '@/features/mission/components/CustomMissionModal';
import { DailyCheckinCard } from '@/components/mentor/DailyCheckinCard';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardFocusSection } from './components/DashboardFocusSection';
import { useDashboardState } from './hooks/useDashboardState';

export interface RecoverableSession {
  missionId: string;
  chapterName: string;
  elapsedMinutes: number;
  focusScore: number;
  timestamp: number;
}

function SessionRecoveryBanner({ session, onResume, onDiscard }: {
  session: RecoverableSession;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-zinc-900/60 backdrop-blur-sm shadow-lg shadow-amber-950/20"
    >
      {/* Animated glow accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 animate-pulse pointer-events-none" />
      
      <div className="relative flex items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <span className="text-amber-400 text-lg">⏱</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-200 truncate">
              Unfinished {session.elapsedMinutes}-minute session detected
            </p>
            <p className="text-xs text-amber-400/70 font-mono mt-0.5 truncate">
              {session.chapterName} · Focus: {session.focusScore}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onResume}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95 shadow-md shadow-amber-500/25"
          >
            Resume Cockpit
          </button>
          <button
            onClick={onDiscard}
            className="px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-300 text-xs font-mono font-medium rounded-lg border border-zinc-700/50 transition-all cursor-pointer active:scale-95"
          >
            Discard
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const { state, handlers } = useDashboardState();
  
  const recoverableSession = state.recoverableSession;
  const handleResumeSession = handlers.handleResumeSession;
  const handleDiscardSession = handlers.handleDiscardSession;

  if (state.loading) return <DashboardSkeleton />;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 font-sans text-zinc-400 relative pb-32 sm:pb-36">
      
      {/* SESSION RECOVERY BANNER */}
      <AnimatePresence>
        {recoverableSession && (
          <SessionRecoveryBanner
            session={recoverableSession}
            onResume={handleResumeSession}
            onDiscard={handleDiscardSession}
          />
        )}
      </AnimatePresence>

      {/* DASHBOARD HEADER */}
      <DashboardHeader
        getGreeting={state.getGreeting}
        userName={state.userName}
        incompleteTasks={state.incompleteTasks}
        estimatedRemainingHours={Number(state.estimatedRemainingHours) || 0}
        nextTaskName={state.nextTaskName}
        energyLevel={state.energyLevel}
        setEnergyLevel={handlers.handleSetEnergyLevel}
        chapters={state.chapters || []}
        onOpenChapter={handlers.handleOpenChapter}
        onSetDailyCapacity={handlers.handleNavigatePlanner}
        isHeaderExpanded={state.isHeaderExpanded}
        onToggleExpand={handlers.handleManualToggleHeader}
      />

      {/* EMBEDDED HERO DAILY CHECK-IN CARD */}
      <DailyCheckinCard />

      {/* TODAY'S MISSIONS HERO SECTION (65%/35% Split Layout) */}
      <DailyMissionTimeline
        sessionState={state.sessionState}
        secondsElapsed={state.secondsElapsed}
        expandedMission={state.expandedMission}
        setExpandedMission={handlers.setExpandedMission}
        handleStartSession={handlers.handleStartSession}
        handleResetSession={handlers.handleResetSession}
        formatTimer={handlers.formatTimer}
        onEditMission={handlers.handleEditMission}
        onOpenCustomMission={handlers.handleOpenCustomMission}
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
          onAction={handlers.handleQuickRevisionAction}
        />
      )}

      <CustomMissionModal 
        isOpen={state.isCustomMissionModalOpen}
        onClose={handlers.handleCloseCustomMission}
        missionToEdit={state.missionToEdit}
      />

    </div>
  );
}

