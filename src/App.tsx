import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { CommandPalette } from './components/shared/CommandPalette';
import { useStudyBrainStore } from './store/useStudyBrainStore';
import { useAuth } from '@/features/auth';
import { AuthPage } from './features/auth/AuthPage';
import { PageSkeleton } from './components/shared/PageSkeleton';
import { OfflineBanner } from './components/shared/OfflineBanner';

// Pages
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PhysicsPage } from './features/subjects/PhysicsPage';
import { ChemistryPage } from './features/subjects/ChemistryPage';
import { MathsPage } from './features/subjects/MathsPage';
import { PlannerPage } from './features/mission/PlannerPage';
import { RevisionPage } from './features/revision/RevisionPage';
import { MistakesPage } from './features/mistakes/MistakesPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { FocusVaultPage } from './features/focus/FocusVaultPage';
import { AiCoachPage } from './features/coach/AiCoachPage';
import { CoachHistoryPage } from './features/coach/CoachHistoryPage';
import { SettingsPage } from './features/dashboard/SettingsPage';
import { MentorInterviewModal } from './components/mentor/MentorInterviewModal';
import { ChapterEditModal } from './components/shared/ChapterEditModal';
import { ShortcutGuideModal } from './components/ui/ShortcutGuideModal';
import { LevelUpCelebration } from './components/ui/LevelUpCelebration';
import { ConfirmDeleteModal } from './components/ui/ConfirmDeleteModal';
import { MockTestsPage } from './features/mockTests/MockTestsPage';
import { NeuralGraphPage } from './features/neuralLink/NeuralGraphPage';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const loading = useStudyBrainStore(s => s.loading);
  const initializationError = useStudyBrainStore(s => s.initializationError);
  const mentorProfile = useStudyBrainStore(s => s.mentorProfile);
  const levelUpData = useStudyBrainStore(s => s.levelUpData);
  const actions = useStudyBrainStore(s => s.actions);
  const lastSyncError = useStudyBrainStore(s => s.lastSyncError);
  const xp = useStudyBrainStore(s => s.xp);
  const settings = useStudyBrainStore(s => s.settings);
  
  const location = useLocation();
  const navigate = useNavigate();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isMentorInterviewOpen, setIsMentorInterviewOpen] = useState(false);
  const [isResetCacheConfirmOpen, setIsResetCacheConfirmOpen] = useState(false);
  const [isShortcutGuideOpen, setIsShortcutGuideOpen] = useState(false);
  const [levelUpCelebration, setLevelUpCelebration] = useState<{ oldLevel: number; newLevel: number } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('jeeos_sidebar_collapsed');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('jeeos_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Auto launch interview on first visit if profile is incomplete
  useEffect(() => {
    if (!loading && !mentorProfile?.interviewCompleted) {
      setIsMentorInterviewOpen(true);
    }
  }, [loading, mentorProfile?.interviewCompleted]);

  // Global Key Listener for Cmd+K / Ctrl+K, Cmd+B / Ctrl+B, and ?
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      }
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        setIsShortcutGuideOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Monitor level up events
  useEffect(() => {
    if (levelUpData) {
      setLevelUpCelebration({
        oldLevel: levelUpData.oldLevel,
        newLevel: levelUpData.newLevel
      });
    }
  }, [levelUpData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-400 font-sans p-6 fixed inset-0 z-[9999]">
        <div className="w-12 h-12 border-4 border-indigo-900/30 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
        <div className="space-y-4 text-center">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-indigo-400 font-bold mb-6">JEE COCKPIT</div>
          <h2 className="text-base font-display font-bold text-white tracking-wider uppercase mt-4">SYNCING WORKSPACE...</h2>
          <p className="text-[15px] text-zinc-500 max-w-sm mx-auto leading-relaxed mt-4">
            Retrieving syllabus milestones, mistakes logs, and personal preparation notes...
          </p>
        </div>
      </div>
    );
  }

  if (initializationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-400 font-sans p-6 animate-fade-in">
        <div className="max-w-md w-full bg-zinc-900/50 border border-red-900/30 rounded-lg p-6 space-y-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-semibold">System Critical</div>
            <h2 className="text-xs font-display font-bold text-white tracking-wider uppercase">Database Initialization Failed</h2>
            <p className="text-3xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              We detected a connection issue or potential data corruption during workspace bootup.
            </p>
          </div>

          <div className="bg-red-950/20 border border-red-900/30 rounded p-3 text-left font-mono text-[10px] text-red-300 max-h-32 overflow-y-auto scrollbar">
            <span className="text-red-500 font-bold block mb-1">REASON:</span>
            {initializationError}
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded p-3 text-left text-[9px] text-zinc-500 space-y-1">
            <span className="font-semibold text-zinc-400 block mb-1 uppercase tracking-wider text-[8px] font-mono">Safety Recovery Rules Active:</span>
            <p>• Database write protection enabled to prevent further corruption.</p>
            <p>• Offline-ready local sandbox is active with read-only status.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-red-950/25 hover:bg-red-950/40 border border-red-500/30 hover:border-red-500/50 text-white font-mono text-[10px] py-2 px-4 rounded transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:ring-2 focus:ring-red-500/50 uppercase tracking-widest"
            >
              Retry Connection
            </button>
            <button
              onClick={() => setIsResetCacheConfirmOpen(true)}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 font-mono text-xs py-2 px-4 rounded transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:ring-2 focus:ring-zinc-500/50 uppercase tracking-widest cursor-pointer"
            >
              Reset Cache
            </button>
          </div>

          <ConfirmDeleteModal
            isOpen={isResetCacheConfirmOpen}
            title="Clear Local Cache & Reset?"
            message="Are you sure you want to clear local cache and reload? This may resolve corruption by starting a fresh session."
            confirmLabel="Reset & Reload"
            onConfirm={() => {
              localStorage.clear();
              window.location.reload();
            }}
            onClose={() => setIsResetCacheConfirmOpen(false)}
          />
        </div>
      </div>
    );
  }

  const isAiCoach = location.pathname.startsWith('/ai-coach');

  // God Mode & Rot Mode Logic (Based on Streak)
  const isGodMode = (xp?.streak || 0) >= 7 && (settings?.enableGodMode !== false);
  const isRotMode = (xp?.streak || 0) < 3 && (settings?.enableGodMode !== false);
  const themeClass = isGodMode ? 'theme-god-mode' : isRotMode ? 'theme-rot-mode' : '';

  return (
    <div className={`flex min-h-screen bg-zinc-950 text-zinc-400 font-sans antialiased overflow-x-hidden selection:bg-indigo-500/30 selection:text-zinc-100 ${themeClass}`}>
      <OfflineBanner />
      {/* Sidebar Navigation */}
      <Sidebar
        isOpenMobile={isSidebarMobileOpen}
        onCloseMobile={() => setIsSidebarMobileOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar Nav */}
        <Topbar
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcutGuide={() => setIsShortcutGuideOpen(true)}
          onToggleSidebarMobile={() => setIsSidebarMobileOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
        />

        {/* Central Router Stage with Smooth Framer Motion Transition */}
        <main className="flex-1 flex flex-col overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 pb-12 scrollbar relative">
          {lastSyncError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-4 flex items-center justify-between font-mono text-xs shadow-lg animate-fade-in shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                <span>{lastSyncError}</span>
              </div>
              <button
                type="button"
                onClick={() => actions.clearSyncError()}
                className="text-red-400 hover:text-red-200 font-bold px-2 py-0.5 rounded hover:bg-red-500/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:ring-2 focus:ring-red-500/50"
              >
                Dismiss
              </button>
            </div>
          )}
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              {!isAiCoach && (
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <Routes location={location} key={location.pathname}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/physics" element={<PhysicsPage />} />
                    <Route path="/chemistry" element={<ChemistryPage />} />
                    <Route path="/mathematics" element={<MathsPage />} />
                    <Route path="/planner" element={<PlannerPage />} />
                    <Route path="/focus-vault" element={<FocusVaultPage />} />
                    <Route path="/revision" element={<RevisionPage />} />
                    <Route path="/mistakes" element={<MistakesPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/coach-history" element={<CoachHistoryPage />} />
                    <Route path="/mock-tests" element={<MockTestsPage />} />
                    <Route path="/neural-link" element={<NeuralGraphPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Coach Page (Persisted across renders to maintain chat state & network streams) */}
            <div className={`flex-1 flex-col min-h-0 ${isAiCoach ? 'flex animate-fade-in' : 'hidden'}`}>
              <AiCoachPage isActive={isAiCoach} />
            </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Raycast Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Global AI Mentor Onboarding & Reality Interview Modal */}
      <MentorInterviewModal
        isOpen={isMentorInterviewOpen}
        onClose={() => setIsMentorInterviewOpen(false)}
        isMandatory={!mentorProfile?.interviewCompleted}
      />

      {/* Global Chapter Edit & Telemetry Modal */}
      <ChapterEditModal />

      {/* Global Keyboard Shortcut Guide Modal */}
      <ShortcutGuideModal
        isOpen={isShortcutGuideOpen}
        onClose={() => setIsShortcutGuideOpen(false)}
      />

      {/* Level Up Celebration */}
      {levelUpCelebration && (
        <LevelUpCelebration
          isOpen={!!levelUpCelebration}
          oldLevel={levelUpCelebration.oldLevel}
          newLevel={levelUpCelebration.newLevel}
          onClose={() => setLevelUpCelebration(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
