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
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

interface RecoverableSession {
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
  const navigate = useNavigate();
  const { state, handlers, actions } = useDashboardState();
  const [isRoutineBreakModalOpen, setIsRoutineBreakModalOpen] = React.useState(false);
  const todayMissions = useStudyBrainStore(s => s.todayMissions);
  const [recoverableSession, setRecoverableSession] = React.useState<RecoverableSession | null>(null);

  // Scan localStorage for unfinished cockpit sessions on mount
  React.useEffect(() => {
    if (state.loading || !todayMissions.length) return;

    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    for (const mission of todayMissions) {
      if (mission.completed) continue;
      const key = `jeeos_mission_state_${mission.id}`;
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const saved = JSON.parse(raw);
        if (!saved.seconds || saved.seconds < 60) continue; // Ignore trivial sessions (<1 min)
        
        // Auto-discard stale sessions older than 24h
        if (saved.timestamp && (now - saved.timestamp) > STALE_THRESHOLD_MS) {
          localStorage.removeItem(key);
          continue;
        }

        setRecoverableSession({
          missionId: mission.id,
          chapterName: mission.chapterName || mission.chapter || mission.taskName || 'Unknown',
          elapsedMinutes: Math.round(saved.seconds / 60),
          focusScore: Math.round(saved.focusScore ?? 100),
          timestamp: saved.timestamp || now
        });
        break; // Only show the first recoverable session
      } catch {
        // Corrupted localStorage entry — ignore
      }
    }
  }, [state.loading, todayMissions]);

  const handleResumeSession = React.useCallback(() => {
    if (!recoverableSession) return;
    navigate(`/cockpit/${recoverableSession.missionId}`);
    setRecoverableSession(null);
  }, [recoverableSession, navigate]);

  const handleDiscardSession = React.useCallback(() => {
    if (!recoverableSession) return;
    localStorage.removeItem(`jeeos_mission_state_${recoverableSession.missionId}`);
    setRecoverableSession(null);
  }, [recoverableSession]);

  if (state.loading) return <DashboardSkeleton />;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 font-sans text-zinc-400 relative pb-8">
      
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

