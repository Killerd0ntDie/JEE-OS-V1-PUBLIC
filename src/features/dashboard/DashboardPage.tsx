import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MissionMode } from '../mission/MissionMode';
import { useStudyBrain } from '../../context/StudyBrainContext';
import { QuickRevisionModal } from '../../components/ui/QuickRevisionModal';
import { RevisionCard } from '../../services/revisionEngineService';
import { DailyMissionTimeline } from './components/DailyMissionTimeline';
import { FocusHeatmapWidget } from './components/FocusHeatmapWidget';
import { useAuth } from '../../context/AuthContext';
import { ExamReadinessWidget } from './components/ExamReadinessWidget';
import { DailyStudyTrackerWidget } from './components/DailyStudyTrackerWidget';
import { WeeklyStrategyWidget } from './components/WeeklyStrategyWidget';
import { SmartRevisionQueueWidget } from './components/SmartRevisionQueueWidget';
import { CommandOverviewBanner } from './components/CommandOverviewBanner';
import { CustomMissionModal } from '../mission/components/CustomMissionModal';
import { ShortcutGuideModal } from '../../components/ui/ShortcutGuideModal';
import { DailyCheckinCard } from '../../components/mentor/DailyCheckinCard';
import { OnHoldReminderBanner } from './components/OnHoldReminderBanner';
import { Keyboard } from 'lucide-react';

export function DashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { state, actions } = useStudyBrain();
  const { user } = useAuth();

  // Focus session state
  const [sessionState, setSessionState] = useState<'idle' | 'active' | 'paused'>('idle');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<RevisionCard | null>(null);
  const [isCustomMissionModalOpen, setIsCustomMissionModalOpen] = useState(false);
  const [missionToEdit, setMissionToEdit] = useState<any>(null);
  const [isShortcutGuideOpen, setIsShortcutGuideOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'focus' | 'analytics'>('focus');

  // Global Shift+? shortcut to open guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Prevent opening if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        setIsShortcutGuideOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus session timer effect
  useEffect(() => {
    let interval: any = null;
    if (sessionState === 'active') {
      interval = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [sessionState]);

  const handleStartSession = () => {
    if (sessionState === 'active') {
      setSessionState('paused');
      actions.setMissionModeActive(true);
    } else {
      setSessionState('active');
      actions.setMissionModeActive(true);
    }
  };

  const handleResetSession = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessionState('idle');
    setSecondsElapsed(0);
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.displayName?.split(' ')[0] || (state.mentorProfile?.coachingName ? 'Mani' : 'Aspirant');

  const estimatedRemainingHours = state.estimatedRemainingHours;
  const plannedQuestions = state.plannedQuestions;
  const targetFinishTime = state.targetFinishTime;

  const incompleteTasks = state.todayMissions.filter(m => !m.completed);
  const nextTaskName = incompleteTasks[0]?.taskName || 'All daily tasks complete';

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 font-sans text-zinc-400 relative pb-8">
      
      {/* FULL-SCREEN FOCUS MODE (MISSION MODE) OVERLAY */}
      {createPortal(
        <AnimatePresence>
          {state.isMissionModeActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[100] bg-[#070708] font-sans antialiased text-zinc-400"
            >
              <MissionMode 
                activeSubject={state.activeSubject === 'all' ? 'physics' : state.activeSubject}
                initialPaused={sessionState === 'paused'}
                onExit={() => {
                  actions.setMissionModeActive(false);
                  setSessionState('paused');
                }}
                onComplete={(stats) => {
                  if (stats.missionId) {
                    actions.completeTask(stats.missionId);
                  }
                  // Convert duration from seconds to minutes (duration is always sent in seconds from MissionMode)
                  const durationMinutes = Math.max(1, Math.ceil(stats.duration / 60));
                  actions.completeStudySession({
                    duration: durationMinutes,
                    focusTime: durationMinutes,
                    questions: stats.questions,
                    correct: stats.questions,
                    type: 'Practice',
                    subjectId: state.activeSubject === 'all' ? 'physics' : state.activeSubject,
                    idleTime: stats.idleTime ? Math.ceil(stats.idleTime / 60) : 0,
                    focusInterruptions: stats.focusInterruptions,
                    focusScore: stats.focusScore
                  });
                  actions.setMissionModeActive(false);
                  setSessionState('idle');
                  setSecondsElapsed(0);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* AMBIENT CANVAS GREETING HEADER (Clean, borderless, single visual anchor below) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left px-1 pt-1 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-indigo-400 uppercase">
              JEE COMMAND CENTER
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 max-w-xl leading-relaxed font-sans">
            <strong className="text-zinc-200">{incompleteTasks.length} missions</strong> remaining today ({estimatedRemainingHours} hrs) • Next up: <span className="text-indigo-400 font-medium font-mono">{nextTaskName}</span>
          </p>
        </div>

        {/* Energy Level Selector Pills */}
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 font-semibold uppercase mr-1">Energy:</span>
          <div className="flex items-center bg-zinc-900/80 border border-zinc-800 p-1 rounded-xl shadow-inner">
            {(['Low', 'Medium', 'High'] as const).map((level) => (
              <button
                key={level}
                onClick={() => actions.setEnergyLevel(level)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  state.energyLevel === level
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {level === 'Low' ? '🔋' : level === 'Medium' ? '⚖️' : '⚡'} {level.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* EMBEDDED HERO DAILY CHECK-IN CARD */}
      <DailyCheckinCard />

      <OnHoldReminderBanner
        chapters={state.chapters}
        onOpenChapter={(chapterId) => actions.openChapterEditModal(chapterId)}
      />

      <CommandOverviewBanner 
        onSetMonthlyObjective={() => onNavigate('planner')}
        onSetDailyCapacity={() => onNavigate('planner')}
      />

      {/* TODAY'S MISSIONS HERO SECTION (65%/35% Split Layout) */}
      <DailyMissionTimeline
        todayMissions={state.todayMissions}
        energyLevel={state.energyLevel}
        sessionState={sessionState}
        secondsElapsed={secondsElapsed}
        expandedMission={expandedMission}
        setExpandedMission={setExpandedMission}
        handleStartSession={handleStartSession}
        handleResetSession={handleResetSession}
        formatTimer={formatTimer}
        estimatedRemainingHours={estimatedRemainingHours}
        plannedQuestions={plannedQuestions}
        targetFinishTime={targetFinishTime}
        onEditMission={(mission) => {
          setMissionToEdit(mission);
          setIsCustomMissionModalOpen(true);
        }}
        onCompleteTask={(id) => actions.completeTask(id)}
        onSkipTask={(id) => actions.skipTask(id)}
        onOpenCustomMission={() => setIsCustomMissionModalOpen(true)}
      />

      {/* SECONDARY DASHBOARD TABBED VIEWS (Focus & Queue vs Analytics & Readiness) */}
      <div className="space-y-4 pt-2">
        {/* Tab Toggle Navigation */}
        <div className="flex items-center justify-between border-b border-zinc-850/80 pb-3">
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('focus')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer border ${
                activeTab === 'focus'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              🎯 Today's Focus & Revision Queue
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer border ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              📊 Analytics, Heatmap & Trajectory
            </button>
          </div>

          <span className="text-xs font-mono text-zinc-500 hidden sm:inline-block">
            {activeTab === 'focus' ? 'Active study queues' : 'Long-term exam readiness'}
          </span>
        </div>

        {/* Tab 1: Today's Focus & Revision Queue */}
        {activeTab === 'focus' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left items-stretch animate-fade-in">
            <SmartRevisionQueueWidget
              revisionQueue={state.revisionQueue}
              onNavigate={onNavigate}
              setSelectedRevision={setSelectedRevision}
            />

            <ExamReadinessWidget
              targetYear={state.settings.targetYear || '2026'}
              syllabusProgress={state.syllabusProgress}
            />
          </div>
        )}

        {/* Tab 2: Analytics, Heatmap & Trajectory */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left items-stretch animate-fade-in">
            <div className="flex flex-col gap-6">
              <DailyStudyTrackerWidget
                studyTime={state.analytics.studyTime}
                dailyQuota={state.settings.dailyQuota}
                xpLevel={state.xp.level}
                xpTotal={state.xp.total}
                xpNextLevel={state.xp.nextLevelXP}
              />
              <FocusHeatmapWidget studySessions={state.studySessions} />
            </div>

            <div className="flex flex-col gap-6">
              <WeeklyStrategyWidget
                mentorProfile={state.mentorProfile}
                chapters={state.chapters}
                projectedReadiness={state.projectedReadiness}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        )}
      </div>

      {/* QUICK REVISION MODAL */}
      {selectedRevision && (
        <QuickRevisionModal
          isOpen={!!selectedRevision}
          revision={selectedRevision}
          onClose={() => setSelectedRevision(null)}
          onAction={(chapterId, outcome) => {
            if (outcome === 'skip') return;
            const confidence = outcome === 'complete' ? 'High' : outcome === 'needs_another' ? 'Medium' : 'Low';
            actions.completeRevision(chapterId, confidence);
          }}
        />
      )}

      <CustomMissionModal 
        isOpen={isCustomMissionModalOpen}
        onClose={() => {
          setIsCustomMissionModalOpen(false);
          setTimeout(() => setMissionToEdit(null), 300); // clear after animation
        }}
        missionToEdit={missionToEdit}
      />

    </div>
  );
}
