import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { ChapterRevisionInspectorModal } from '@/components/mentor/ChapterRevisionInspectorModal';
import { AiPracticeModal } from '@/components/mentor/AiPracticeModal';
import { ActiveRecallArena } from './components/ActiveRecallArena';
import { FormulaSpeedDrillStage } from './components/FormulaSpeedDrillStage';
import { FeynmanSandboxStage } from './components/FeynmanSandboxStage';
import { RevisionFlashcardVault } from './components/RevisionFlashcardVault';
import { DailyDoseCommandQueue } from './components/DailyDoseCommandQueue';
import { DailyDoseSessionStage } from './components/DailyDoseSessionStage';
import { EbbinghausDecayCurve } from './components/EbbinghausDecayCurve';
import { 
  Flame, Brain, Sparkles, ShieldCheck, 
  Zap, ArrowRight
} from 'lucide-react';

function useOptionalLocation() {
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: router context fallback for test environments
    return useLocation();
  } catch {
    return null;
  }
}

export function RevisionPage() {
  const location = useOptionalLocation();
  const _studySessions = useStudyBrainStore(s => s.studySessions) || [];
  const revisionTelemetry = useStudyBrainStore(s => s.revisionTelemetry);
  const mistakes = useStudyBrainStore(s => s.mistakes) || [];

  // Sub-page navigation: 'hub' | 'vault' | 'arena' | 'speed_drill' | 'feynman' | 'daily_dose'
  const [activeView, setActiveView] = useState<'hub' | 'vault' | 'arena' | 'speed_drill' | 'feynman' | 'daily_dose'>(() => {
    if ((location?.state as any)?.autoLaunchArena) return 'arena';
    if ((location?.state as any)?.chapterId) return 'vault';
    return 'hub';
  });

  // Filter states for Flashcard Vault
  const [activeSubject, setActiveSubject] = useState<'all' | 'physics' | 'chemistry' | 'maths'>('all');
  const [filterScope, setFilterScope] = useState<'urgent' | 'overdue' | 'all'>(() => {
    if ((location?.state as any)?.chapterId) return 'all';
    return 'urgent';
  });
  const [searchQuery, setSearchQuery] = useState(() => (location?.state as any)?.chapterName || '');
  
  // Inspector modal state
  const [inspectorChapterId, setInspectorChapterId] = useState<string | null>(
    () => (location?.state as any)?.chapterId || null
  );
  const [aiPracticeConfig, setAiPracticeConfig] = useState<{ chapterId: string; subject: string } | null>(null);

  // Consume central RevisionEngine output
  const revisionData = revisionTelemetry;

  // Chapter summaries from RevisionEngine
  const overdueChapters = revisionData?.overdueChapters || [];
  const upcomingChapters = revisionData?.upcomingChapters || [];
  const masteredChapters = revisionData?.masteredChapters || [];
  const notStartedChapters = revisionData?.notStartedChapters || [];
  const stats = revisionData?.stats || {
    totalOverdue: 0,
    totalUpcoming: 0,
    totalMastered: 0,
    totalNotStarted: 0,
    avgRetentionScore: 75,
    reviewedTodayCount: 0
  };

  const cards = revisionData?.cards || [];
  const urgentCards = revisionData?.urgentCards || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left relative pb-32 sm:pb-36 font-sans select-none">
      
      <AnimatePresence mode="wait">
        
        {/* ══════════════════════════════════════════════════════════════════
            VIEW 1: REVISION COMMAND CENTER & RETENTION HUB
            ══════════════════════════════════════════════════════════════════ */}
        {activeView === 'hub' && (
          <motion.div
            key="revision-hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* 1. COMPACT HERO BANNER & REAL-TIME VITALS */}
            <div className="surface-2 p-5 md:p-6 rounded-3xl shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
              {/* Ambient glow */}
              <div className={`absolute top-0 right-0 w-80 h-32 rounded-full filter blur-3xl pointer-events-none ${
                stats.totalOverdue > 0 ? 'bg-red-600/15' : 'bg-indigo-600/15'
              }`} />

              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-widest">
                  <span className={`px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 shadow-sm ${
                    stats.totalOverdue > 0
                      ? 'bg-red-950/60 border-red-500/40 text-red-300' 
                      : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  }`}>
                    {stats.totalOverdue > 0 ? (
                      <>
                        <Flame className="w-3 h-3 text-red-400 animate-pulse" />
                        <span>{stats.totalOverdue} Chapters Decaying</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Memory Vault Secure</span>
                      </>
                    )}
                  </span>
                  <span className="text-zinc-400">• Spaced Repetition Engine</span>
                </div>

                <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
                  Chapter Retention & Formula Hub
                </h1>
                <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
                  Automated SM-2 spaced repetition schedules. Practice formula flashcards, launch timed recall sprints, and inspect syllabus retention.
                </p>
              </div>

              {/* 5-Point Unified Vitals Strip */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 font-mono text-xs shrink-0 relative z-10">
                <div className="bg-zinc-950/60 border border-red-500/30 p-2.5 px-3 rounded-2xl text-center shadow-md">
                  <span className="text-[9px] text-zinc-400 uppercase font-bold block">Overdue</span>
                  <span className="text-sm font-bold text-red-400 font-display">{stats.totalOverdue}</span>
                </div>
                <div className="bg-zinc-950/60 border border-amber-500/30 p-2.5 px-3 rounded-2xl text-center shadow-md">
                  <span className="text-[9px] text-zinc-400 uppercase font-bold block">Review Soon</span>
                  <span className="text-sm font-bold text-amber-400 font-display">{stats.totalUpcoming}</span>
                </div>
                <div className="bg-zinc-950/60 border border-emerald-500/30 p-2.5 px-3 rounded-2xl text-center shadow-md">
                  <span className="text-[9px] text-zinc-400 uppercase font-bold block">Safe</span>
                  <span className="text-sm font-bold text-emerald-400 font-display">{stats.totalMastered}</span>
                </div>
                <div className="bg-zinc-950/60 border border-white/10 p-2.5 px-3 rounded-2xl text-center shadow-md">
                  <span className="text-[9px] text-zinc-400 uppercase font-bold block">Unstarted</span>
                  <span className="text-sm font-bold text-zinc-400 font-display">{stats.totalNotStarted}</span>
                </div>
                <div className="bg-zinc-950/60 border border-indigo-500/40 p-2.5 px-3 rounded-2xl text-center shadow-md col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-indigo-300 uppercase font-bold block">Avg Score</span>
                  <span className="text-sm font-bold text-indigo-300 font-display">{stats.avgRetentionScore}%</span>
                </div>
              </div>
            </div>

            {/* 2. NTA-CALIBRATED DAILY DOSE COMMAND QUEUE */}
            <DailyDoseCommandQueue
              urgentCards={urgentCards}
              allCards={cards}
              unresolvedMistakes={mistakes.filter(m => m.revisionStatus !== 'Mastered')}
              onStartDailyDose={() => setActiveView('daily_dose')}
              onLaunchArena={() => setActiveView('arena')}
              onLaunchSpeedDrill={() => setActiveView('speed_drill')}
            />

            {/* 3. PRIMARY REVISION HUBS GRID (4 DEDICATED ACTION HUBS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Active Recall Vault & Syllabus Retention Matrix */}
              <div className="surface-2 rounded-3xl p-6 relative overflow-hidden transition-all shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">
                    Active Recall Vault & Syllabus Matrix
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Interactive LaTeX KaTeX formula flashcards and complete 70-chapter syllabus retention decay matrix with instant search and AI practice generation.
                  </p>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveView('vault')}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-100 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
                >
                  <span>Open Vault & Matrix ({cards.length} Cards • 70 Ch)</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Card 2: Timed Spaced Recall Arena (Color-Sensitive to Decay State) */}
              <div className={`surface-2 rounded-3xl p-6 relative overflow-hidden transition-all shadow-xl flex flex-col justify-between space-y-4 ${
                stats.totalOverdue > 0 ? '!border-red-500/40 hover:!border-red-500/60' : '!border-emerald-500/30 hover:!border-emerald-500/50'
              }`}>
                <div className="space-y-2">
                  <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-sm ${
                    stats.totalOverdue > 0 
                      ? 'bg-red-950/60 border-red-500/40 text-red-400' 
                      : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {stats.totalOverdue > 0 ? (
                      <Flame className="w-5 h-5 text-red-400 animate-pulse" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">
                    Timed Active Recall Arena
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {stats.totalOverdue > 0 
                      ? `Urgent: ${stats.totalOverdue} chapter${stats.totalOverdue > 1 ? 's are' : ' is'} decaying past retention threshold. Enter countdown arena to reset SM-2 intervals.`
                      : 'All active formulas are within safe memory retention bounds. Launch arena to proactively strengthen schema pathways.'}
                  </p>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveView('arena')}
                  className={`w-full py-3.5 rounded-2xl border font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                    stats.totalOverdue > 0
                      ? 'bg-red-950/40 hover:bg-red-900/50 border-red-500/40 text-red-300'
                      : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {stats.totalOverdue > 0 ? (
                    <>
                      <Flame className="w-4 h-4 text-red-400" />
                      <span>Enter Timed Arena ({stats.totalOverdue} Decaying Qs)</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Launch Practice Arena (Memory Secure)</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Card 3: 30-Second Rapid Speed Drill */}
              <div className="surface-2 rounded-3xl p-6 relative overflow-hidden transition-all shadow-xl flex flex-col justify-between space-y-4 hover:border-amber-500/40">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">
                    30-Second Rapid Speed Drill
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Rapid-fire 30-second sprint testing instantaneous formula recognition with streak multipliers and XP bonuses.
                  </p>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveView('speed_drill')}
                  className="w-full py-3.5 rounded-2xl bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>Launch 30s Speed Drill</span>
                </motion.button>
              </div>

              {/* Card 4: Feynman Technique Sandbox */}
              <div className="surface-2 rounded-3xl p-6 relative overflow-hidden transition-all shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                    <Brain className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">
                    Feynman Technique Studio
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Explain complex formulas in simple terms without jargon to verify deep conceptual understanding and upgrade retention intervals.
                  </p>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveView('feynman')}
                  className="w-full py-3.5 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  <Brain className="w-4 h-4" />
                  <span>Open Feynman Studio</span>
                </motion.button>
              </div>

            </div>

            {/* 4. INTEGRATED EBBINGHAUS DECAY CURVE & RETENTION SIMULATOR */}
            <div className="pt-2">
              <EbbinghausDecayCurve
                avgRetentionScore={stats.avgRetentionScore}
                overdueCount={stats.totalOverdue}
                overdueChapters={overdueChapters}
                upcomingChapters={upcomingChapters}
                masteredChapters={masteredChapters}
                onInspectChapter={(chId) => setInspectorChapterId(chId)}
                onLaunchArena={() => setActiveView('arena')}
              />
            </div>

          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW: DAILY DOSE SESSION RUNNER
           ══════════════════════════════════════════════════════════════════ */}
        {activeView === 'daily_dose' && (
          <motion.div
            key="revision-daily-dose-stage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <DailyDoseSessionStage
              cards={urgentCards.length > 0 ? urgentCards : (cards.slice(0, 10))}
              mistakes={mistakes}
              onExit={() => setActiveView('hub')}
            />
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW 2: DEDICATED FLASHCARD & SYLLABUS MATRIX STAGE
           ══════════════════════════════════════════════════════════════════ */}
        {activeView === 'vault' && (
          <motion.div
            key="revision-vault-stage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <RevisionFlashcardVault
              cards={revisionData?.cards || []}
              urgentCards={revisionData?.urgentCards || []}
              overdueChapters={overdueChapters}
              upcomingChapters={upcomingChapters}
              masteredChapters={masteredChapters}
              notStartedChapters={notStartedChapters}
              activeSubject={activeSubject}
              setActiveSubject={setActiveSubject}
              filterScope={filterScope}
              setFilterScope={setFilterScope}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onGradeFlashcard={(cardId, chapterId, quality) => useStudyBrainStore.getState().actions.gradeFlashcard(cardId, chapterId, quality)}
              onPracticeWithAI={(chapterId, subject) => setAiPracticeConfig({ chapterId, subject })}
              onInspectChapter={(chapterId) => setInspectorChapterId(chapterId)}
              onBackToHub={() => setActiveView('hub')}
            />
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW 3: DEDICATED TIMED ACTIVE RECALL ARENA STAGE
           ══════════════════════════════════════════════════════════════════ */}
        {activeView === 'arena' && (
          <motion.div
            key="revision-arena-stage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ActiveRecallArena
              cards={revisionData?.urgentCards?.length ? revisionData.urgentCards : (revisionData?.cards?.slice(0, 10) || [])}
              onExit={() => setActiveView('hub')}
            />
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW 4: DEDICATED 30-SECOND SPEED DRILL STAGE
           ══════════════════════════════════════════════════════════════════ */}
        {activeView === 'speed_drill' && (
          <motion.div
            key="revision-speed-drill-stage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <FormulaSpeedDrillStage
              cards={revisionData?.cards || []}
              onBackToHub={() => setActiveView('hub')}
            />
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            VIEW 5: DEDICATED FEYNMAN TECHNIQUE STUDIO STAGE
           ══════════════════════════════════════════════════════════════════ */}
        {activeView === 'feynman' && (
          <motion.div
            key="revision-feynman-stage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <FeynmanSandboxStage
              cards={revisionData?.cards || []}
              onBackToHub={() => setActiveView('hub')}
            />
          </motion.div>
        )}

      </AnimatePresence>

      {/* Chapter Revision Inspector Modal */}
      <ChapterRevisionInspectorModal
        chapterId={inspectorChapterId}
        onClose={() => setInspectorChapterId(null)}
        onPracticeWithAI={(chapterId, subject) => setAiPracticeConfig({ chapterId, subject })}
      />

      {/* AI Practice Generator Modal */}
      <AiPracticeModal
        isOpen={aiPracticeConfig !== null}
        onClose={() => setAiPracticeConfig(null)}
        chapterId={aiPracticeConfig?.chapterId || null}
        subject={aiPracticeConfig?.subject || 'physics'}
      />

    </div>
  );
}
