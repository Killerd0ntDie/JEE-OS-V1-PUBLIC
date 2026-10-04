import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { FormulaVaultPage } from '@/features/formulas/FormulaVaultPage';
import { RevisionSession } from './components/RevisionSession';
import { RevisionCardItem, findMatchingBankChapter } from '@jee-os/engines';
import { 
  ArrowRight, BookOpen,
  CheckCircle2, Clock, Calendar, Play, AlertTriangle
} from 'lucide-react';

function useOptionalLocation() {
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: router context fallback for test environments
    return useLocation();
  } catch {
    return null;
  }
}

function useOptionalNavigate() {
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: router context fallback for test environments
    return useNavigate();
  } catch {
    return null;
  }
}

function formatDaysAgo(dateStr: string, nowMs: number): string {
  try {
    const timestamp = new Date(dateStr).getTime();
    if (Number.isNaN(timestamp)) return 'Never';
    const diffDays = Math.floor((nowMs - timestamp) / 86400000);
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
  } catch {
    return 'Never';
  }
}

function formatUpcomingDue(dateStr?: string): string {
  if (!dateStr) return 'Scheduled soon';
  try {
    const dueTime = new Date(dateStr).getTime();
    if (Number.isNaN(dueTime)) return 'Scheduled soon';
    const now = Date.now();
    const diffDays = Math.ceil((dueTime - now) / 86400000);
    if (diffDays <= 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  } catch {
    return 'Scheduled soon';
  }
}

export function RevisionPage() {
  const location = useOptionalLocation();
  const navigate = useOptionalNavigate();
  const revisionTelemetry = useStudyBrainStore(s => s.revisionTelemetry);

  // Parse query params (?tab=formulas) or location state
  const queryTab = location?.search ? new URLSearchParams(location.search).get('tab') : null;
  const stateTab = (location?.state as any)?.tab;

  const [activeTab, setActiveTab] = useState<'spaced_review' | 'formulas'>(() => {
    if (queryTab === 'formulas' || queryTab === 'formula-vault' || stateTab === 'formulas') {
      return 'formulas';
    }
    return 'spaced_review';
  });

  // Keep activeTab in sync if query param changes
  useEffect(() => {
    if (queryTab === 'formulas' || queryTab === 'formula-vault' || stateTab === 'formulas') {
      setActiveTab('formulas');
    } else {
      setActiveTab('spaced_review');
    }
  }, [queryTab, stateTab]);

  const cards = revisionTelemetry?.cards || [];
  const urgentCards = revisionTelemetry?.urgentCards || [];
  const overdueChapters = revisionTelemetry?.overdueChapters || [];

  const dueChapters = revisionTelemetry?.dueChapters || overdueChapters.map(o => ({
    chapterId: o.chapterId,
    chapterName: o.chapterName,
    subject: o.subject,
    status: 'Revision Due',
    completion: 60,
    revisionCount: 1,
    daysOverdue: 1,
    urgency: 'overdue' as const,
    dueReason: 'Overdue for review',
    formulaCardsCount: 5,
    mistakeCardsCount: 0,
    totalCardsCount: o.totalCardsCount || 5,
    cards: []
  }));

  const mistakes = useStudyBrainStore(s => s.mistakes || []);

  const dueCards = useMemo(() => {
    if (dueChapters.length === 0) return [];
    return revisionTelemetry?.dueCards || urgentCards || [];
  }, [dueChapters.length, revisionTelemetry?.dueCards, urgentCards]);

  const pendingMistakesCount = useMemo(() => {
    if (typeof revisionTelemetry?.stats?.pendingMistakesCount === 'number') {
      return revisionTelemetry.stats.pendingMistakesCount;
    }
    return mistakes.filter(m => m.revisionStatus !== 'Mastered').length;
  }, [revisionTelemetry?.stats?.pendingMistakesCount, mistakes]);

  const [sessionCards, setSessionCards] = useState<RevisionCardItem[] | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string | undefined>(undefined);
  const [sessionChapterId, setSessionChapterId] = useState<string | undefined>(undefined);

  // Estimated study time in minutes (~0.7 min per card)
  const estimatedMinutes = dueCards.length === 0 ? 0 : Math.max(5, Math.round(dueCards.length * 0.7));

  // Upcoming chapters scheduled in the next 7 days
  const upcoming7Days = useMemo(() => {
    const canonical = revisionTelemetry?.upcomingDueChapters;
    if (canonical && canonical.length > 0) {
      const now = Date.now();
      const sevenDaysMs = 7 * 86400000;
      return canonical.filter(ch => {
        if (!ch.nextRevisionDueAt) return true;
        const dueTime = new Date(ch.nextRevisionDueAt).getTime();
        if (Number.isNaN(dueTime)) return true;
        const diff = dueTime - now;
        return diff > 0 && diff <= sevenDaysMs;
      }).slice(0, 6);
    }

    const fallback = (revisionTelemetry?.upcomingChapters || []).map(u => ({
      chapterId: u.chapterId,
      chapterName: u.chapterName,
      subject: u.subject,
      totalCardsCount: u.totalCardsCount || 5,
      nextRevisionDueAt: u.lastRevisionDate ? new Date(new Date(u.lastRevisionDate).getTime() + 3 * 86400000).toISOString() : undefined
    }));
    return fallback.slice(0, 6);
  }, [revisionTelemetry?.upcomingDueChapters, revisionTelemetry?.upcomingChapters]);

  // Active recall full-screen modal session
  if (sessionCards) {
    return (
      <RevisionSession
        cards={sessionCards}
        chapterTitle={sessionTitle}
        chapterId={sessionChapterId}
        onClose={() => {
          setSessionCards(null);
          setSessionTitle(undefined);
          setSessionChapterId(undefined);
        }}
        onFinish={() => {
          setSessionCards(null);
          setSessionTitle(undefined);
          setSessionChapterId(undefined);
        }}
      />
    );
  }

  // Formula Vault browsing subview
  if (activeTab === 'formulas') {
    return (
      <FormulaVaultPage
        onBack={() => {
          setActiveTab('spaced_review');
          if (navigate && location) {
            navigate('/revision', { replace: true });
          }
        }}
      />
    );
  }

  // Canonical Clean Spaced Repetition Page
  return (
    <div className="space-y-8 max-w-6xl mx-auto text-left relative pb-32 sm:pb-36 font-sans select-none">
      
      {/* 1. ONE HEADER: "Today: 4 chapters · 38 cards · ~25 min" + Start Revision Button */}
      <div className="surface-2 rounded-3xl p-6 sm:p-8 border border-zinc-800/80 shadow-2xl relative overflow-hidden">
        {/* Subtle ambient accent */}
        <div className="absolute top-0 right-0 w-96 h-40 bg-indigo-600/10 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                Spaced Repetition
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 text-xs font-mono">SM-2 Active Recall</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Today: {dueChapters.length} {dueChapters.length === 1 ? 'chapter' : 'chapters'} · {dueCards.length} {dueCards.length === 1 ? 'card' : 'cards'} · ~{estimatedMinutes} min
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              Active recall flashcards for key formulas and unresolved mistakes. Honest self-grading schedules your next review automatically.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {dueCards.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSessionCards(dueCards);
                  setSessionTitle("Today's Spaced Review Queue");
                  setSessionChapterId(undefined);
                }}
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 border border-indigo-400/40 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start revision</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveTab('formulas');
                if (navigate && location) {
                  navigate('?tab=formulas', { replace: true });
                }
              }}
              className="px-4 py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white font-mono text-xs font-bold tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Browse Formula Vault</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* PENDING MISTAKES REMINDER BANNER */}
      {pendingMistakesCount > 0 && (
        <div className="surface-2 rounded-2xl p-4 sm:p-5 border border-amber-500/30 bg-amber-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {pendingMistakesCount} {pendingMistakesCount === 1 ? 'Mistake' : 'Mistakes'} Pending Review
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Mistake Vault
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Past test mistakes are tracked in your dedicated Mistake Vault. Review and re-solve them to eliminate recurrence.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (navigate) {
                navigate('/mistakes');
              } else {
                window.location.href = '/mistakes';
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto shadow-sm"
          >
            <span>Review in Mistake Vault</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. DUE TODAY: List of Chapters, Each with a Revise Button */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
              Due Today
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/10 text-zinc-300 font-mono text-xs font-bold">
              {dueChapters.length}
            </span>
          </div>
        </div>

        {dueChapters.length === 0 ? (
          <div className="surface-2 rounded-2xl p-8 border border-zinc-800/80 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">All Caught Up for Today!</h3>
            <p className="text-xs text-zinc-400 max-w-md">
              No chapters are currently due for spaced review. Check upcoming chapters below or browse the Formula Vault to practice ahead.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {dueChapters.map(ch => {
              const resolveCardsForChapter = (): RevisionCardItem[] => {
                if (ch.cards && ch.cards.length > 0) return ch.cards;
                const directMatches = cards.filter(c => 
                  c.chapterId === ch.chapterId || 
                  (c.chapterName && ch.chapterName && c.chapterName.toLowerCase() === ch.chapterName.toLowerCase())
                );
                if (directMatches.length > 0) return directMatches;

                const matchedBank = findMatchingBankChapter({ id: ch.chapterId, name: ch.chapterName, subject: ch.subject } as any);
                if (matchedBank && matchedBank.formulas.length > 0) {
                  return matchedBank.formulas.map((f, idx) => ({
                    id: `fb-${matchedBank.chapterId}-${idx}`,
                    chapterId: ch.chapterId,
                    chapterName: matchedBank.chapterName,
                    subject: matchedBank.subject,
                    title: f.title,
                    concept: f.concept,
                    formula: f.formula,
                    examNote: f.examNote,
                    questionPrompt: f.questionPrompt || `Key Concept: ${f.concept}. State the governing formula and conditions.`,
                    subtopic: f.subtopic || 'Key Formulas',
                    cardType: 'formula' as const,
                    retentionConfidence: 'Medium' as const,
                    retentionScore: 70,
                    nextReviewDays: 1,
                    intervalStage: '1d',
                    recalledCount: 0,
                    urgencyRank: 1
                  }));
                }
                return [];
              };

              const chCards = resolveCardsForChapter();
              const cardCount = ch.totalCardsCount || chCards.length || 5;

              return (
                <div
                  key={ch.chapterId}
                  className="surface-2 p-5 rounded-2xl border border-zinc-800/80 hover:border-indigo-500/40 transition-colors flex flex-col justify-between space-y-4 shadow-lg text-left"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                        ch.subject === 'physics'
                          ? 'bg-blue-950/60 border-blue-500/30 text-blue-300'
                          : ch.subject === 'chemistry'
                          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                          : 'bg-purple-950/60 border-purple-500/30 text-purple-300'
                      }`}>
                        {ch.subject}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                        ch.urgency === 'overdue'
                          ? 'bg-red-950/50 border-red-500/30 text-red-300'
                          : 'bg-amber-950/50 border-amber-500/30 text-amber-300'
                      }`}>
                        {ch.dueReason}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white line-clamp-1" title={ch.chapterName}>
                      {ch.chapterName}
                    </h3>

                    <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{cardCount} cards</span>
                      </span>
                      {ch.lastRevisedAt && (
                        <span className="text-zinc-500">
                          · Last revised {formatDaysAgo(ch.lastRevisedAt, Date.now())}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (chCards.length > 0) {
                        setSessionCards(chCards);
                        setSessionTitle(ch.chapterName);
                        setSessionChapterId(ch.chapterId);
                      }
                    }}
                    disabled={chCards.length === 0}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-indigo-950/50"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Revise</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. COMING UP (NEXT 7 DAYS): Small List of Upcoming Chapter Dates */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <h2 className="text-base sm:text-lg font-display font-bold text-white tracking-tight">
              Coming Up (Next 7 Days)
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/10 text-zinc-400 font-mono text-xs">
              {upcoming7Days.length}
            </span>
          </div>
        </div>

        {upcoming7Days.length === 0 ? (
          <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs font-mono text-zinc-500">
            No chapters scheduled for review in the next 7 days.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming7Days.map(ch => (
              <div
                key={ch.chapterId}
                className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-900 border border-white/10 text-zinc-400">
                      {ch.subject}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {formatUpcomingDue(ch.nextRevisionDueAt)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-200 truncate">
                    {ch.chapterName}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                  {ch.totalCardsCount || 5} cards
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. A LINK TO THE FORMULA VAULT FOR BROWSING */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Formula & Theorem Vault</span>
          </h4>
          <p className="text-xs text-zinc-400">
            Explore all 300+ JEE formulas across Physics, Chemistry, and Mathematics with KaTeX LaTeX notation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setActiveTab('formulas');
            if (navigate && location) {
              navigate('?tab=formulas', { replace: true });
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors shadow-sm"
        >
          <span>Browse All Formulas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
