import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { CommandPalette } from './components/shared/CommandPalette';
import { useStudyBrainStore } from './store/useStudyBrainStore';
import { useAuth } from '@/features/auth';
import { AuthPage } from './features/auth/AuthPage';
import { PageSkeleton } from './components/shared/PageSkeleton';
import { CockpitPage } from './features/mission/CockpitPage';


// Lazy-loaded Pages for Code-Splitting
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PhysicsPage = lazy(() => import('./features/subjects/PhysicsPage').then(m => ({ default: m.PhysicsPage })));
const ChemistryPage = lazy(() => import('./features/subjects/ChemistryPage').then(m => ({ default: m.ChemistryPage })));
const MathsPage = lazy(() => import('./features/subjects/MathsPage').then(m => ({ default: m.MathsPage })));
const PlannerPage = lazy(() => import('./features/mission/PlannerPage').then(m => ({ default: m.PlannerPage })));
const RevisionPage = lazy(() => import('./features/revision/RevisionPage').then(m => ({ default: m.RevisionPage })));
const MistakesPage = lazy(() => import('./features/mistakes/MistakesPage').then(m => ({ default: m.MistakesPage })));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const FocusVaultPage = lazy(() => import('./features/focus/FocusVaultPage').then(m => ({ default: m.FocusVaultPage })));
const AiCoachPage = lazy(() => import('./features/coach/AiCoachPage').then(m => ({ default: m.AiCoachPage })));
const CoachHistoryPage = lazy(() => import('./features/coach/CoachHistoryPage').then(m => ({ default: m.CoachHistoryPage })));
const SettingsPage = lazy(() => import('./features/dashboard/SettingsPage').then(m => ({ default: m.SettingsPage })));
const MockTestsPage = lazy(() => import('./features/mockTests/MockTestsPage').then(m => ({ default: m.MockTestsPage })));
const NeuralGraphPage = lazy(() => import('./features/neuralLink/NeuralGraphPage').then(m => ({ default: m.NeuralGraphPage })));
const DiagnosticPage = lazy(() => import('./features/onboarding/DiagnosticPage').then(m => ({ default: m.DiagnosticPage })));
import { ChapterEditModal } from './components/shared/ChapterEditModal';
import { ShortcutGuideModal } from './components/ui/ShortcutGuideModal';
import { LevelUpCelebration } from './components/ui/LevelUpCelebration';
import { ConfirmDeleteModal } from './components/ui/ConfirmDeleteModal';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Icon } from '@/components/ui/Icon';
import { audioEngine } from './utils/audioEngine';

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
  const { isOnline } = useNetworkStatus();
  
  const location = useLocation();
  const navigate = useNavigate();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
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
    const hasDismissed = sessionStorage.getItem('onboarding_dismissed');
    if (!loading && !mentorProfile?.interviewCompleted && !hasDismissed) {
      if (location.pathname !== '/diagnostic') {
        navigate('/diagnostic', { replace: true });
      }
    }
  }, [loading, mentorProfile?.interviewCompleted, location.pathname, navigate]);

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
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
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
      audioEngine.playSuccess();
    }
  }, [levelUpData]);



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-400 font-sans p-6 fixed inset-0 z-[9999]">
        <div className="w-12 h-12 border-4 border-indigo-900/30 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
        <div className="space-y-4 text-center">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-indigo-400 font-bold mb-6">JEE COCKPIT</div>
          <h2 className="text-base font-display font-bold text-white tracking-wider uppercase mt-4">SYNCING WORKSPACE...</h2>
          <p className="text-[15px] text-zinc-400 max-w-sm mx-auto leading-relaxed mt-4">
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

          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded p-3 text-left text-[11px] text-zinc-400 space-y-1">
            <span className="font-semibold text-zinc-400 block mb-1 uppercase tracking-wider text-[11px] font-mono">Safety Recovery Rules Active:</span>
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
  const isRotMode = (xp?.streak || 0) > 0 && (xp?.streak || 0) < 3 && settings?.enableGodMode === true;
  const themeClass = isGodMode ? 'theme-god-mode' : isRotMode ? 'theme-rot-mode' : '';

  return (
    <div className={`flex min-h-screen bg-zinc-950 text-zinc-400 font-sans antialiased overflow-x-hidden selection:bg-indigo-500/30 selection:text-zinc-100 ${themeClass}`}>
      {/* Sidebar Navigation */}
      {!location.pathname.startsWith('/diagnostic') && (
        <Sidebar
          isOpenMobile={isSidebarMobileOpen}
          onCloseMobile={() => setIsSidebarMobileOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
      )}

      {/* Main Workspace Frame */}
      <div className={`flex-1 flex flex-col min-w-0 h-[100dvh] ${location.pathname.startsWith('/planner') || location.pathname.startsWith('/cockpit') || location.pathname.startsWith('/diagnostic') ? 'overflow-hidden' : 'overflow-y-auto scrollbar'} relative`}>
        {/* Topbar Nav (Disabled for Planner, Cockpit, and Diagnostic pages) */}
        {!location.pathname.startsWith('/planner') && !location.pathname.startsWith('/cockpit') && !location.pathname.startsWith('/diagnostic') && (
          <Topbar
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenShortcutGuide={() => setIsShortcutGuideOpen(true)}
            onToggleSidebarMobile={() => setIsSidebarMobileOpen(true)}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebarCollapse={toggleSidebarCollapse}
          />
        )}

        {/* Central Router Stage with Smooth Framer Motion Transition */}
        <main id="main-content" className={`flex-1 flex flex-col relative min-h-0 ${location.pathname.startsWith('/diagnostic') ? '' : 'px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 pb-12'}`}>
          {!isOnline && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-xl mb-4 flex items-center justify-center font-mono text-xs shadow-lg animate-fade-in shrink-0">
              <div className="flex items-center gap-2">
                <Icon name="WifiOff" className="w-4 h-4" />
                <span>You are offline. Changes will be saved locally and synced when you reconnect.</span>
              </div>
            </div>
          )}
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1, ease: "linear" }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <Suspense fallback={<PageSkeleton />}>
                    <Routes location={location} key={location.pathname}>
                      <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
                      <Route path="/cockpit/:missionId?" element={<ErrorBoundary><CockpitPage /></ErrorBoundary>} />
                      <Route path="/physics" element={<ErrorBoundary><PhysicsPage /></ErrorBoundary>} />
                      <Route path="/chemistry" element={<ErrorBoundary><ChemistryPage /></ErrorBoundary>} />
                      <Route path="/maths" element={<ErrorBoundary><MathsPage /></ErrorBoundary>} />
                      <Route path="/planner" element={<ErrorBoundary><PlannerPage /></ErrorBoundary>} />
                      <Route path="/focus-vault" element={<ErrorBoundary><FocusVaultPage /></ErrorBoundary>} />
                      <Route path="/revision" element={<ErrorBoundary><RevisionPage /></ErrorBoundary>} />
                      <Route path="/mistakes" element={<ErrorBoundary><MistakesPage /></ErrorBoundary>} />
                      <Route path="/analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
                      <Route path="/coach-history" element={<ErrorBoundary><CoachHistoryPage /></ErrorBoundary>} />
                      <Route path="/mock-tests" element={<ErrorBoundary><MockTestsPage /></ErrorBoundary>} />
                      <Route path="/neural-link" element={<ErrorBoundary><NeuralGraphPage onNavigate={(pageId) => navigate(`/${pageId}`)} /></ErrorBoundary>} />
                      <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
                      <Route path="/diagnostic" element={<ErrorBoundary><DiagnosticPage /></ErrorBoundary>} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Suspense>
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
