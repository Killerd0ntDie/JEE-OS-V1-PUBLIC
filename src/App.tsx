import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageId } from './types';
import { getInitialPageIdFromUrl, updateUrlForPage, isPageId } from './utils/router';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { CommandPalette } from './components/shared/CommandPalette';
import { useStudyBrain } from './context/StudyBrainContext';
import { useAuth } from './context/AuthContext';
import { AuthPage } from './features/auth/AuthPage';
import { PageSkeleton } from './components/shared/PageSkeleton';

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
import { ErrorBoundary } from './components/shared/ErrorBoundary';

export default function App() {
  const { user } = useAuth();
  const { state, actions } = useStudyBrain();
  const [activePageId, setActivePageId] = useState<PageId>(getInitialPageIdFromUrl);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
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

  const handlePageNavigate = (nextPageId: PageId) => {
    if (!isPageId(nextPageId) || nextPageId === activePageId) return;

    if (activePageId === 'focus-vault' && sessionStorage.getItem('vault-active') === 'true') {
      if (!window.confirm("You have an active Focus Vault session. Leaving will lose your progress. Are you sure you want to exit?")) {
        return;
      }
      sessionStorage.removeItem('vault-active'); // Clean up if they accept
    }

    setActivePageId(nextPageId);
    updateUrlForPage(nextPageId);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('jeeos_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Auto launch interview on first visit if profile is incomplete
  useEffect(() => {
    if (!state.loading && !state.mentorProfile?.interviewCompleted) {
      setIsMentorInterviewOpen(true);
    }
  }, [state.loading, state.mentorProfile?.interviewCompleted]);

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

  // Sync activePageId when browser Back/Forward or URL Hash changes
  useEffect(() => {
    const handleUrlChange = () => {
      const pageFromUrl = getInitialPageIdFromUrl();
      if (pageFromUrl !== activePageId) {
        setActivePageId(pageFromUrl);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [activePageId]);

  // Sync initial URL hash on mount if clean
  useEffect(() => {
    updateUrlForPage(activePageId);
  }, []);

  // Monitor level up events
  useEffect(() => {
    if (state.levelUpData) {
      setLevelUpCelebration({
        oldLevel: state.levelUpData.oldLevel,
        newLevel: state.levelUpData.newLevel
      });
    }
  }, [state.levelUpData]);

  // Global Navigation Listener
  useEffect(() => {
    const handleNavigationEvent = (e: Event) => {
      const customEvent = e as CustomEvent<unknown>;
      if (isPageId(customEvent.detail)) {
        handlePageNavigate(customEvent.detail);
      }
    };
    window.addEventListener('navigate-page', handleNavigationEvent);
    return () => window.removeEventListener('navigate-page', handleNavigationEvent);
  }, [activePageId]);

  if (state.loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-zinc-400 font-sans p-6 animate-fade-in">
        <div className="max-w-md w-full space-y-6 text-center">
          {/* Simple Loading Ring */}
          <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          </div>
          
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold animate-pulse">JEE Cockpit</div>
            <h2 className="text-xs font-display font-bold text-white tracking-wider uppercase">Loading Workspace...</h2>
            <p className="text-3xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
              Retrieving syllabus milestones, mistakes logs, and personal preparation notes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state.initializationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-zinc-400 font-sans p-6 animate-fade-in">
        <div className="max-w-md w-full bg-[#18181b]/50 border border-red-900/30 rounded-lg p-6 space-y-6 text-center shadow-2xl">
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
            {state.initializationError}
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded p-3 text-left text-[9px] text-zinc-500 space-y-1">
            <span className="font-semibold text-zinc-400 block mb-1 uppercase tracking-wider text-[8px] font-mono">Safety Recovery Rules Active:</span>
            <p>• Database write protection enabled to prevent further corruption.</p>
            <p>• Offline-ready local sandbox is active with read-only status.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-red-950/25 hover:bg-red-950/40 border border-red-500/30 hover:border-red-500/50 text-white font-mono text-[10px] py-2 px-4 rounded transition duration-200 uppercase tracking-widest"
            >
              Retry Connection
            </button>
            <button
              onClick={() => setIsResetCacheConfirmOpen(true)}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 font-mono text-xs py-2 px-4 rounded transition duration-200 uppercase tracking-widest cursor-pointer"
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

  if (!user) {
    return <AuthPage />;
  }

  // Handle Dynamic Page Rendering
  const renderActivePage = () => {
    if (isPageTransitioning) {
      return <PageSkeleton />;
    }

    switch (activePageId) {
      case 'dashboard':
        return <DashboardPage onNavigate={handlePageNavigate} />;
      case 'physics':
        return <PhysicsPage onNavigate={handlePageNavigate} />;
      case 'chemistry':
        return <ChemistryPage onNavigate={handlePageNavigate} />;
      case 'mathematics':
        return <MathsPage onNavigate={handlePageNavigate} />;
      case 'planner':
        return <PlannerPage />;
      case 'focus-vault':
        return <FocusVaultPage />;
      case 'revision':
        return <RevisionPage />;
      case 'mistakes':
        return <MistakesPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'ai-coach':
        return null; // Rendered outside AnimatePresence to preserve state
      case 'coach-history':
        return <CoachHistoryPage onNavigate={handlePageNavigate} />;
      case 'mock-tests':
        return <MockTestsPage onNavigate={handlePageNavigate} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={handlePageNavigate} />;
    }
  };

  // God Mode & Rot Mode Logic (Based on Streak)
  const isGodMode = (state.xp?.streak || 0) >= 7 && (state.settings?.enableGodMode !== false);
  const isRotMode = (state.xp?.streak || 0) < 3 && (state.settings?.enableGodMode !== false);
  const themeClass = isGodMode ? 'theme-god-mode' : isRotMode ? 'theme-rot-mode' : '';

  return (
    <div className={`flex min-h-screen bg-[#09090b] text-zinc-400 font-sans antialiased overflow-x-hidden selection:bg-indigo-500/30 selection:text-zinc-100 ${themeClass}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        activePageId={activePageId}
        onNavigate={handlePageNavigate}
        isOpenMobile={isSidebarMobileOpen}
        onCloseMobile={() => setIsSidebarMobileOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar Nav */}
        <Topbar
          activePageId={activePageId}
          onNavigate={handlePageNavigate}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcutGuide={() => setIsShortcutGuideOpen(true)}
          onToggleSidebarMobile={() => setIsSidebarMobileOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
        />

        {/* Central Router Stage with Smooth Framer Motion Transition */}
        <main className="flex-1 flex flex-col overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 pb-12 scrollbar relative">
          {state.lastSyncError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-4 flex items-center justify-between font-mono text-xs shadow-lg animate-fade-in shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                <span>{state.lastSyncError}</span>
              </div>
              <button
                type="button"
                onClick={() => actions.clearSyncError()}
                className="text-red-400 hover:text-red-200 font-bold px-2 py-0.5 rounded hover:bg-red-500/20 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              {activePageId !== 'ai-coach' && (
                <motion.div
                  key={activePageId}
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {renderActivePage()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Coach Page (Persisted across renders to maintain chat state & network streams) */}
            <div className={`flex-1 flex-col min-h-0 ${activePageId === 'ai-coach' ? 'flex animate-fade-in' : 'hidden'}`}>
              <AiCoachPage onNavigate={handlePageNavigate} isActive={activePageId === 'ai-coach'} />
            </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Raycast Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handlePageNavigate}
      />

      {/* Global AI Mentor Onboarding & Reality Interview Modal */}
      <MentorInterviewModal
        isOpen={isMentorInterviewOpen}
        onClose={() => setIsMentorInterviewOpen(false)}
        isMandatory={!state.mentorProfile?.interviewCompleted}
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
