import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { RevisionCardItem } from '@jee-os/engines';
import { ChapterRevisionInspectorModal } from '@/components/mentor/ChapterRevisionInspectorModal';
import { AiPracticeModal } from '@/components/mentor/AiPracticeModal';
import { ActiveRecallArena } from './components/ActiveRecallArena';
import { Flame, Brain, Skull, Timer, CheckCircle2, Sparkles, Check } from 'lucide-react';

export function RevisionPage() {
  const chapters = useStudyBrainStore(s => s.chapters);
  const runtime = useStudyBrainStore(s => s); // Need runtime for the engine call
  const actions = useStudyBrainStore(s => s.actions);

  const [activeSubject, setActiveSubject] = useState<'all' | 'physics' | 'chemistry' | 'maths'>('all');
  const [filterScope, setFilterScope] = useState<'urgent' | 'overdue' | 'all'>('urgent');
  const [isArenaActive, setIsArenaActive] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [recalledToast, setRecalledToast] = useState<string | null>(null);

  const revisionTelemetry = useStudyBrainStore(s => s.revisionTelemetry);
  
  // Inspector modal state
  const [inspectorChapterId, setInspectorChapterId] = useState<string | null>(null);
  const [aiPracticeConfig, setAiPracticeConfig] = useState<{ chapterId: string; subject: string } | null>(null);

  // Consume central RevisionEngine output
  const revisionData = revisionTelemetry;

  // Chapter summaries from RevisionEngine
  const overdueChapters = revisionData?.overdueChapters || [];
  const upcomingChapters = revisionData?.upcomingChapters || [];
  const masteredChapters = revisionData?.masteredChapters || [];
  // BUGFIX: chapters not yet started used to be silently merged into
  // `masteredChapters` with a fabricated ~95% "High" retention score. They're now a
  // distinct bucket so the Retention Matrix can label them honestly.
  const notStartedChapters = revisionData?.notStartedChapters || [];
  const stats = revisionData?.stats || {
    totalOverdue: 0,
    totalUpcoming: 0,
    totalMastered: 0,
    totalNotStarted: 0,
    avgRetentionScore: 75,
    reviewedTodayCount: 0
  };

  // Group chapters by subject for the Retention Matrix
  const chaptersBySubject = useMemo(() => {
    const allSummaries = [...overdueChapters, ...upcomingChapters, ...masteredChapters, ...notStartedChapters];
    return {
      physics: allSummaries.filter(c => c.subject === 'physics'),
      chemistry: allSummaries.filter(c => c.subject === 'chemistry'),
      maths: allSummaries.filter(c => c.subject === 'maths')
    };
  }, [overdueChapters, upcomingChapters, masteredChapters, notStartedChapters]);

  // Filter formula cards based on scope and subject
  const cardsToDisplay = useMemo(() => {
    if (!revisionData) return [];

    let pool: RevisionCardItem[] = [];
    if (filterScope === 'urgent') {
      pool = revisionData.urgentCards; // Top 6 urgent cards by default
    } else if (filterScope === 'overdue') {
      pool = revisionData.cards.filter(c => c.retentionConfidence === 'Low');
    } else {
      pool = revisionData.cards;
    }

    if (activeSubject !== 'all') {
      pool = pool.filter(c => c.subject === activeSubject);
    }

    return pool;
  }, [revisionData, filterScope, activeSubject]);

  const [animatingCard, setAnimatingCard] = useState<{ id: string, type: 'success' | 'fail' } | null>(null);

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const markCardRecall = (card: RevisionCardItem, difficulty: 'High' | 'Medium' | 'Low') => {
    setAnimatingCard({ id: card.id, type: difficulty === 'Low' ? 'fail' : 'success' });
    actions.completeRevision(card.chapterId, difficulty);

    if (difficulty !== 'Low') {
      setRecalledToast(`Recalled "${card.title}"! Interval extended.`);
      setTimeout(() => setRecalledToast(null), 3000);
    }

    setTimeout(() => {
      setAnimatingCard(null);
      setFlippedCards(prev => ({ ...prev, [card.id]: false }));
    }, 600);
  };

  const getConfidenceBadge = (confidence: 'High' | 'Medium' | 'Low' | 'Not Started') => {
    switch (confidence) {
      case 'High':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60';
      case 'Medium':
        return 'bg-amber-950/40 text-amber-400 border-amber-800/60';
      case 'Low':
        return 'bg-red-950/40 text-red-400 border-red-800/60';
      case 'Not Started':
        return 'bg-zinc-900/60 text-zinc-500 border-zinc-800/60';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto text-left relative pb-12 font-sans">
      
      {/* Floating dynamic success toast */}
      {recalledToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950/95 border border-emerald-500/60 text-emerald-300 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce font-mono">
          <Icon name="Check" className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{recalledToast}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      {!isArenaActive && (
        <div className="p-6 rounded-2xl border border-red-900/40 bg-red-950/10 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden mb-8">
          
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Flame className="w-32 h-32 text-red-500" />
          </div>

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Brain className="w-4 h-4" />
              Decay Heatmap Linked
            </div>
            <h2 className="text-2xl font-display font-bold text-white">The High-Stakes Arena</h2>
            <p className="text-xs text-zinc-400 max-w-lg">
              {stats.totalOverdue} chapters are actively decaying in your memory. Enter the timed arena to force active recall and reset their retention scores.
            </p>
          </div>

          <button
            onClick={() => setIsArenaActive(true)}
            className="relative z-10 px-6 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-105 flex items-center gap-3 shrink-0 cursor-pointer"
          >
            <Flame className="w-5 h-5" /> Enter the Arena
          </button>
        </div>
      )}

      {isArenaActive ? (
        <ActiveRecallArena 
          cards={revisionData?.urgentCards || []} 
          onExit={() => setIsArenaActive(false)} 
        />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850/80 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
                <Icon name="Bookmark" className="w-3.5 h-3.5" />
                <span>Spaced Repetition & Retention Engine</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
                Chapter Retention & Formula Vault
              </h1>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                Revision schedules are calculated exclusively for started and completed chapters by <strong className="text-zinc-200">RevisionEngine</strong> across all 70 NTA/NCERT JEE chapters.
              </p>
            </div>

            {/* Global Retention Stats Cards */}
        <div className="flex flex-wrap gap-2.5 shrink-0 font-mono">
          <div className="bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-2 rounded-xl text-center min-w-[95px] shadow-sm">
            <span className="text-[9px] text-zinc-500 block uppercase font-semibold">Overdue</span>
            <span className="text-lg font-bold text-red-400">{stats.totalOverdue}</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-2 rounded-xl text-center min-w-[95px] shadow-sm">
            <span className="text-[9px] text-zinc-500 block uppercase font-semibold">Review Soon</span>
            <span className="text-lg font-bold text-amber-400">{stats.totalUpcoming}</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-2 rounded-xl text-center min-w-[95px] shadow-sm">
            <span className="text-[9px] text-zinc-500 block uppercase font-semibold">Safe</span>
            <span className="text-lg font-bold text-emerald-400">{stats.totalMastered}</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-2 rounded-xl text-center min-w-[95px] shadow-sm">
            <span className="text-[9px] text-zinc-500 block uppercase font-semibold">Not Started</span>
            <span className="text-lg font-bold text-zinc-500">{stats.totalNotStarted}</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-2 rounded-xl text-center min-w-[95px] shadow-sm">
            <span className="text-[9px] text-zinc-500 block uppercase font-semibold">Avg Score</span>
            <span className="text-lg font-bold text-indigo-400">{stats.avgRetentionScore}%</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: CHAPTER RETENTION OVERVIEW MATRIX */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Syllabus Retention Matrix (70 Chapters)
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              • Click any chapter to inspect revision history & stats
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> High (90%)
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium (70%)
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Low (40%)
            </span>
            <span className="flex items-center gap-1 text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-zinc-600" /> Not Started
            </span>
          </div>
        </div>

        {/* 3-Column Subject Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['physics', 'chemistry', 'maths'] as const).map(sub => {
            const list = chaptersBySubject[sub];
            const subTitle = sub.toUpperCase();
            const subColor = sub === 'physics' ? 'text-sky-400 border-sky-900/50 bg-sky-950/20' : sub === 'chemistry' ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20' : 'text-indigo-400 border-indigo-900/50 bg-indigo-950/20';

            return (
              <div key={sub} className="bg-zinc-950/60 border border-zinc-850/80 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${subColor}`}>
                    {subTitle} ({list.length})
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {list.filter(t => t.retentionConfidence === 'Low').length} Overdue
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto scrollbar pr-1">
                  {list.map(t => (
                    <div
                      key={t.chapterId}
                      onClick={() => setInspectorChapterId(t.chapterId)}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all duration-150 flex items-center justify-between gap-2 group hover:scale-[1.01] ${
                        t.retentionConfidence === 'Low'
                          ? 'bg-red-950/20 border-red-900/40 hover:border-red-500/50'
                          : t.retentionConfidence === 'Medium'
                          ? 'bg-amber-950/15 border-amber-900/30 hover:border-amber-500/50'
                          : t.retentionConfidence === 'Not Started'
                          ? 'bg-zinc-950/40 border-zinc-900 opacity-70 hover:opacity-100 hover:border-zinc-700'
                          : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-700'
                      }`}
                      title={t.retentionConfidence === 'Not Started' ? 'Not yet started — no revision needed' : 'Click to inspect revision history & stats'}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-white group-hover:text-indigo-300 truncate block">
                          {t.chapterName}
                        </span>
                        {t.retentionConfidence === 'Not Started' ? (
                          <span className="text-[9px] font-mono text-zinc-600 mt-1 block">
                            Not started yet — no retention data
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  t.retentionConfidence === 'Low' ? 'bg-red-500' : t.retentionConfidence === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${t.retentionScore}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500 shrink-0">
                              {t.retentionScore}%
                            </span>
                          </div>
                        )}
                      </div>

                      <Badge variant="secondary" className={`text-[9px] font-mono px-1.5 py-0.2 shrink-0 border ${getConfidenceBadge(t.retentionConfidence)}`}>
                        {t.retentionConfidence}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: TUCKED-AWAY ACTIVE RECALL VAULT */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-display font-bold text-white tracking-tight flex items-center gap-2">
              <span>Active Recall Vault</span>
              <span className="text-[10px] font-mono font-normal text-zinc-500">
                (Showing {cardsToDisplay.length} Cards)
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Targeted formula recall. Cards are tucked away cleanly to keep your workspace fast and focused.
            </p>
          </div>

          {/* Scope & Subject Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
            {/* Scope Filter */}
            <div className="flex gap-1 bg-zinc-950/80 border border-zinc-850 p-1 rounded-xl">
              <button
                onClick={() => setFilterScope('urgent')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterScope === 'urgent' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Urgent (6)
              </button>
              <button
                onClick={() => setFilterScope('overdue')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterScope === 'overdue' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Overdue Only
              </button>
              <button
                onClick={() => setFilterScope('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterScope === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                All Cards
              </button>
            </div>

            {/* Subject Filter */}
            <div className="flex gap-1 bg-zinc-950/80 border border-zinc-850 p-1 rounded-xl">
              {(['all', 'physics', 'chemistry', 'maths'] as const).map(sub => (
                <button
                  key={sub}
                  onClick={() => {
                    setActiveSubject(sub);
                    setFlippedCards({});
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                    activeSubject === sub ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Compact 2-Column Grid for Cards */}
        {cardsToDisplay.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-zinc-950/60 border border-emerald-900/30 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-display font-bold text-white">All Systems Optimal!</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto font-mono">
              No chapters currently require spaced-repetition revision under this filter. Outstanding work maintaining your retention memory!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cardsToDisplay.map(card => {
            const isFlipped = !!flippedCards[card.id];

            return (
              <Card
                key={card.id}
                className={`min-h-[210px] flex flex-col justify-between transition-all duration-300 relative border overflow-hidden text-left ${
                  animatingCard?.id === card.id 
                    ? (animatingCard.type === 'success' ? 'border-emerald-500 bg-emerald-950/40 scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-red-500 bg-red-950/40 scale-95 shadow-[0_0_20px_rgba(239,68,68,0.2)]')
                    : isFlipped
                    ? 'border-indigo-500/40 bg-zinc-900/60 shadow-xl'
                    : card.retentionConfidence === 'Low'
                    ? 'border-red-950/60 bg-red-950/10 hover:border-red-900/80'
                    : card.retentionConfidence === 'Medium'
                    ? 'border-amber-950/60 bg-amber-950/10 hover:border-amber-900/80'
                    : 'border-zinc-850 bg-zinc-950/40 hover:border-zinc-750'
                }`}
              >
                {/* Header */}
                <div className="p-4 pb-2 border-b border-zinc-900/60 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase block truncate">
                      {card.subject.toUpperCase()} • {card.chapterName}
                    </span>
                    <h4 className="text-xs md:text-sm font-display font-bold text-white truncate">{card.title}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="secondary" className={`text-[9px] font-mono px-1.5 py-0.2 border ${getConfidenceBadge(card.retentionConfidence)}`}>
                      {card.retentionConfidence}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col justify-center items-center text-center flex-1">
                  {isFlipped ? (
                    <div className="w-full text-left space-y-1.5">
                      <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                        Formula Expression:
                      </span>
                      <pre className="font-mono text-xs text-indigo-200 bg-zinc-950/80 p-3 rounded-xl border border-indigo-900/30 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {card.formula}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-semibold">
                        Concept Question
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans max-w-md">
                        "{card.concept}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="p-3 border-t border-zinc-900/60 bg-zinc-950/30 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFlip(card.id)}
                    className="text-[10px] h-7 font-mono text-zinc-300 border-zinc-800 hover:text-white cursor-pointer"
                  >
                    {isFlipped ? 'Show Prompt' : 'Reveal Formula'}
                  </Button>

                  {isFlipped && (
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => markCardRecall(card, 'Low')}
                        className="text-[10px] font-mono font-bold py-1 px-2 rounded-lg border border-red-900/50 bg-red-950/60 text-red-400 hover:bg-red-900/80 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Skull className="w-3 h-3" /> Blackout
                      </button>
                      <button 
                        onClick={() => markCardRecall(card, 'Medium')}
                        className="text-[10px] font-mono font-bold py-1 px-2 rounded-lg border border-orange-900/50 bg-orange-950/60 text-orange-400 hover:bg-orange-900/80 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Timer className="w-3 h-3" /> Hard
                      </button>
                      <button 
                        onClick={() => markCardRecall(card, 'High')}
                        className="text-[10px] font-mono font-bold py-1 px-2 rounded-lg border border-emerald-900/50 bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/80 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Good
                      </button>
                      <button 
                        onClick={() => markCardRecall(card, 'High')}
                        className="text-[10px] font-mono font-bold py-1 px-2 rounded-lg border border-blue-900/50 bg-blue-950/60 text-blue-400 hover:bg-blue-900/80 transition-colors flex items-center gap-1 shadow-[0_0_10px_rgba(59,130,246,0.15)] cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Perfect
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        )}

        {/* Footer controls when viewing urgent mode */}
        {filterScope === 'urgent' && revisionData && revisionData.cards.length > 6 && (
          <div className="text-center pt-2">
            <button
              onClick={() => setFilterScope('all')}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 hover:bg-indigo-950/60 border border-indigo-900/40 px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>View All {revisionData.cards.length} Formula Cards</span>
              <Icon name="ChevronDown" className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
        </>
      )}

      {/* Chapter Revision Inspector Modal */}
      <ChapterRevisionInspectorModal
        chapterId={inspectorChapterId}
        onClose={() => setInspectorChapterId(null)}
        onPracticeWithAI={(chapterId, subject) => setAiPracticeConfig({ chapterId, subject })}
      />

      <AiPracticeModal
        isOpen={aiPracticeConfig !== null}
        onClose={() => setAiPracticeConfig(null)}
        chapterId={aiPracticeConfig?.chapterId || null}
        subject={aiPracticeConfig?.subject || 'physics'}
      />

    </div>
  );
}
