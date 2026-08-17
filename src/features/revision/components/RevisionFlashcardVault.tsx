import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Sparkles, Search, Skull, Timer, 
  CheckCircle2, Check, ChevronRight, Zap, Layers, 
  Flame, AlertTriangle, ShieldCheck, BookOpen, Activity, RotateCw, Eye, EyeOff
} from 'lucide-react';
import { RevisionCardItem, ChapterRevisionSummary } from '@jee-os/engines';
import { BlockMath, InlineMath } from 'react-katex';
import { audioEngine } from '@/utils/audioEngine';

export interface RevisionFlashcardVaultProps {
  cards: RevisionCardItem[];
  urgentCards: RevisionCardItem[];
  overdueChapters?: ChapterRevisionSummary[];
  upcomingChapters?: ChapterRevisionSummary[];
  masteredChapters?: ChapterRevisionSummary[];
  notStartedChapters?: ChapterRevisionSummary[];
  activeSubject: 'all' | 'physics' | 'chemistry' | 'maths';
  setActiveSubject: (sub: 'all' | 'physics' | 'chemistry' | 'maths') => void;
  filterScope: 'urgent' | 'overdue' | 'all';
  setFilterScope: (scope: 'urgent' | 'overdue' | 'all') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onCompleteRevision: (chapterId: string, difficulty: 'High' | 'Medium' | 'Low') => void;
  onPracticeWithAI: (chapterId: string, subject: string) => void;
  onInspectChapter: (chapterId: string) => void;
  onBackToHub: () => void;
}

export const RevisionFlashcardVault: React.FC<RevisionFlashcardVaultProps> = ({
  cards,
  urgentCards,
  overdueChapters = [],
  upcomingChapters = [],
  masteredChapters = [],
  notStartedChapters = [],
  activeSubject,
  setActiveSubject,
  filterScope,
  setFilterScope,
  searchQuery,
  setSearchQuery,
  onCompleteRevision,
  onPracticeWithAI,
  onInspectChapter,
  onBackToHub
}) => {
  // Vault Mode: 'cards' (Formula Flashcards) | 'matrix' (Syllabus Retention Matrix)
  const [vaultView, setVaultView] = useState<'cards' | 'matrix'>('cards');
  const [matrixScope, setMatrixScope] = useState<'active' | 'overdue' | 'mastered' | 'all'>('active');

  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [animatingCard, setAnimatingCard] = useState<{ id: string; type: 'success' | 'fail' } | null>(null);
  const [recalledToast, setRecalledToast] = useState<{ title: string; xp: number } | null>(null);

  // Filter formula cards based on scope, subject, and search query / regex
  const cardsToDisplay = useMemo(() => {
    let pool: RevisionCardItem[] = [];
    if (filterScope === 'urgent') {
      pool = urgentCards;
    } else if (filterScope === 'overdue') {
      pool = cards.filter(c => c.retentionConfidence === 'Low');
    } else {
      pool = cards;
    }

    if (activeSubject !== 'all') {
      pool = pool.filter(c => c.subject === activeSubject);
    }

    // Query / Regex filtering
    if (searchQuery.trim()) {
      const q = searchQuery.trim();

      // Check if user entered regex (e.g. /sin|cos/i)
      let regex: RegExp | null = null;
      if (q.startsWith('/') && q.lastIndexOf('/') > 0) {
        const pattern = q.slice(1, q.lastIndexOf('/'));
        const flags = q.slice(q.lastIndexOf('/') + 1) || 'i';
        try {
          regex = new RegExp(pattern, flags);
        } catch {}
      }

      if (regex) {
        pool = pool.filter(c => 
          regex!.test(c.title) || 
          regex!.test(c.chapterName) || 
          regex!.test(c.concept) ||
          (c.formula && regex!.test(c.formula))
        );
      } else {
        const lowerQ = q.toLowerCase();
        pool = pool.filter(c => 
          c.title.toLowerCase().includes(lowerQ) || 
          c.chapterName.toLowerCase().includes(lowerQ) || 
          c.concept.toLowerCase().includes(lowerQ) ||
          (c.formula && c.formula.toLowerCase().includes(lowerQ))
        );
      }
    }

    return pool;
  }, [cards, urgentCards, filterScope, activeSubject, searchQuery]);

  // Filtered chapters for the Retention Matrix
  const matrixChaptersToDisplay = useMemo(() => {
    const allSummaries = [...overdueChapters, ...upcomingChapters, ...masteredChapters, ...notStartedChapters];
    let pool: ChapterRevisionSummary[] = [];

    if (matrixScope === 'active') {
      pool = allSummaries.filter(c => c.retentionConfidence !== 'Not Started');
      if (pool.length === 0) pool = allSummaries;
    } else if (matrixScope === 'overdue') {
      pool = overdueChapters;
    } else if (matrixScope === 'mastered') {
      pool = masteredChapters;
    } else {
      pool = allSummaries;
    }

    if (activeSubject !== 'all') {
      pool = pool.filter(c => c.subject === activeSubject);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pool = pool.filter(c => c.chapterName.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q));
    }

    return pool;
  }, [overdueChapters, upcomingChapters, masteredChapters, notStartedChapters, matrixScope, activeSubject, searchQuery]);

  const toggleFlip = (id: string) => {
    audioEngine.playCardFlip();
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderMathText = (text: string | undefined | null) => {
    if (!text) return null;
    try {
      const cleanText = text.replace(/\\\$/g, '$');
      const parts = cleanText.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
      return parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          return <BlockMath key={i} math={math} errorColor="#ef4444" />;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          return <InlineMath key={i} math={math} errorColor="#ef4444" />;
        }
        return <span key={i}>{part}</span>;
      });
    } catch {
      return <span className="font-mono text-xs text-zinc-300">{text}</span>;
    }
  };

  const markCardRecall = (card: RevisionCardItem, difficulty: 'High' | 'Medium' | 'Low') => {
    setAnimatingCard({ id: card.id, type: difficulty === 'Low' ? 'fail' : 'success' });
    onCompleteRevision(card.chapterId, difficulty);

    const xpEarned = difficulty === 'High' ? 100 : difficulty === 'Medium' ? 50 : 20;

    if (difficulty !== 'Low') {
      audioEngine.playSuccess();
      setRecalledToast({ title: card.title, xp: xpEarned });
      setTimeout(() => setRecalledToast(null), 3000);
    } else {
      audioEngine.playHover();
    }

    setTimeout(() => {
      setAnimatingCard(null);
      setFlippedCards(prev => ({ ...prev, [card.id]: false }));
    }, 250);
  };

  const getConfidenceBadge = (confidence: 'High' | 'Medium' | 'Low' | 'Not Started') => {
    switch (confidence) {
      case 'High':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-sm';
      case 'Medium':
        return 'bg-amber-950/60 text-amber-400 border-amber-500/40 shadow-sm';
      case 'Low':
        return 'bg-red-950/60 text-red-400 border-red-500/40 shadow-sm';
      case 'Not Started':
        return 'bg-zinc-950/60 text-zinc-400 border-white/10';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left relative font-sans select-none pb-16">
      
      {/* Floating Success Toast */}
      <AnimatePresence>
        {recalledToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed top-6 right-6 z-50 bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 font-mono"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Recalled <strong>{recalledToast.title}</strong> (+{recalledToast.xp} XP)</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHub}
            className="p-2.5 rounded-2xl bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Back to Command Center"
            aria-label="Back to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-xl md:text-2xl font-display font-black text-white tracking-tight">
              Active Recall & Revision Vault
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Spaced repetition flashcards & full syllabus retention decay matrix.
            </p>
          </div>
        </div>

        {/* View Switcher: Flashcards vs Matrix */}
        <div className="flex items-center gap-1 bg-zinc-950/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 border border-white/10 p-1 rounded-2xl font-mono text-xs relative shrink-0">
          <button
            onClick={() => {
              setVaultView('cards');
              audioEngine.playClick();
            }}
            className={`relative px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1.5 ${
              vaultView === 'cards' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {vaultView === 'cards' && (
              <motion.div
                layoutId="rev_vault_subview_glider"
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/30 -z-10"
                transition={{ duration: 0.15 }}
              />
            )}
            <Zap className="w-3.5 h-3.5" />
            <span>Formula Flashcards ({cards.length})</span>
          </button>

          <button
            onClick={() => {
              setVaultView('matrix');
              audioEngine.playClick();
            }}
            className={`relative px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1.5 ${
              vaultView === 'matrix' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {vaultView === 'matrix' && (
              <motion.div
                layoutId="rev_vault_subview_glider"
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/30 -z-10"
                transition={{ duration: 0.15 }}
              />
            )}
            <Layers className="w-3.5 h-3.5" />
            <span>Syllabus Matrix (70)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Search & Scope Selectors) */}
      <div className="bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-5 space-y-3.5 shadow-xl">
        
        {/* Row 1: Search Bar & Subject Filter Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={vaultView === 'cards' ? 'Search formulas, concepts, or regex (e.g. /sin|cos/i)...' : 'Search chapters, units, or subjects...'}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Subject Switcher Glider */}
          <div className="flex gap-1 bg-zinc-950/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 border border-white/10 p-1 rounded-2xl font-mono text-xs shrink-0">
            {(['all', 'physics', 'chemistry', 'maths'] as const).map(sub => {
              const isActive = activeSubject === sub;
              return (
                <button
                  key={sub}
                  onClick={() => {
                    setActiveSubject(sub);
                    audioEngine.playClick();
                  }}
                  className={`relative px-3.5 py-1.5 rounded-xl font-bold uppercase transition-colors cursor-pointer select-none z-10 ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="rev_vault_subject_glider"
                      className="absolute inset-0 bg-zinc-800 rounded-xl border border-white/15 shadow-sm -z-10"
                      transition={{ duration: 0.15 }}
                    />
                  )}
                  <span>{sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Mode-Specific Scope Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3 font-mono text-xs">
          
          {vaultView === 'cards' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-zinc-400 uppercase font-bold">Recall Scope:</span>
              <div className="flex gap-1">
                {[
                  { id: 'urgent', label: `Urgent Recall (${urgentCards.length})`, icon: AlertTriangle },
                  { id: 'overdue', label: 'Overdue Only', icon: Flame },
                  { id: 'all', label: `All Formulas (${cards.length})`, icon: BookOpen }
                ].map(scope => {
                  const isActive = filterScope === scope.id;
                  const ScopeIcon = scope.icon;
                  return (
                    <button
                      key={scope.id}
                      onClick={() => {
                        setFilterScope(scope.id as any);
                        audioEngine.playClick();
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                        isActive 
                          ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200 shadow-sm' 
                          : 'bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <ScopeIcon className="w-3.5 h-3.5" />
                      <span>{scope.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-zinc-400 uppercase font-bold">Matrix Scope:</span>
              <div className="flex gap-1">
                {[
                  { id: 'active', label: 'Active Syllabus', icon: Activity },
                  { id: 'overdue', label: `Overdue (${overdueChapters.length})`, icon: Flame },
                  { id: 'mastered', label: `Mastered (${masteredChapters.length})`, icon: ShieldCheck },
                  { id: 'all', label: 'All 70 Chapters', icon: Layers }
                ].map(scope => {
                  const isActive = matrixScope === scope.id;
                  const ScopeIcon = scope.icon;
                  return (
                    <button
                      key={scope.id}
                      onClick={() => {
                        setMatrixScope(scope.id as any);
                        audioEngine.playClick();
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                        isActive 
                          ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200 shadow-sm' 
                          : 'bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <ScopeIcon className="w-3.5 h-3.5" />
                      <span>{scope.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-[11px] text-zinc-400">
            Showing <strong className="text-white">{vaultView === 'cards' ? cardsToDisplay.length : matrixChaptersToDisplay.length}</strong> items
          </div>
        </div>

      </div>

      {/* ── STAGE 1: FORMULA FLASHCARDS GRID ── */}
      {vaultView === 'cards' && (
        <>
          {cardsToDisplay.length === 0 ? (
            <div className="p-12 text-center bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-900/60 border border-white/10 rounded-3xl space-y-3 font-mono shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-display font-bold text-white uppercase tracking-wider">
                No Matching Formula Flashcards
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed font-sans">
                Try switching your recall scope or clearing the search query to view more formulas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cardsToDisplay.map((card) => {
                const isFlipped = !!flippedCards[card.id];
                const isAnimating = animatingCard?.id === card.id;
                const isUrgent = card.retentionConfidence === 'Low';
                const isMedium = card.retentionConfidence === 'Medium';

                return (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ 
                      opacity: isAnimating ? 0.4 : 1, 
                      scale: isAnimating ? (animatingCard?.type === 'success' ? 1.02 : 0.98) : 1 
                    }}
                    transition={{ duration: 0.15 }}
                    className={`p-5 rounded-3xl border text-left flex flex-col justify-between space-y-4 bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 backdrop-blur-2xl transition-all shadow-lg ${
                      isFlipped
                        ? 'bg-indigo-950/25 border-indigo-500/40 shadow-indigo-950/20'
                        : isUrgent 
                        ? 'bg-red-950/20 border-red-500/40 hover:border-red-500/70 shadow-red-950/20' 
                        : isMedium
                        ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/60 shadow-amber-950/20'
                        : 'bg-zinc-900/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold tracking-wider">
                          <span className={`px-2 py-0.5 rounded-lg border ${
                            card.subject === 'physics' ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40' :
                            card.subject === 'chemistry' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' :
                            'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          }`}>
                            {card.subject}
                          </span>
                          <span className="text-zinc-400 truncate block max-w-[140px]">{card.chapterName}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-white truncate block">
                          {renderMathText(card.title)}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0 ${getConfidenceBadge(card.retentionConfidence)}`}>
                        {card.retentionConfidence}
                      </span>
                    </div>

                    {/* Upright Clean Flip Card Body */}
                    <div 
                      onClick={() => toggleFlip(card.id)}
                      className={`cursor-pointer min-h-[140px] flex flex-col justify-between rounded-2xl p-4 bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 transition-all shadow-inner group relative select-none ${
                        isFlipped 
                          ? 'bg-zinc-950/90 border border-indigo-500/40' 
                          : 'bg-zinc-950/80 border border-white/5 hover:border-white/15'
                      }`}
                    >
                      {isFlipped ? (
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider block">
                            Formula Expression:
                          </span>
                          <div className="font-mono text-xs text-emerald-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {renderMathText(card.formula || 'No formula string mapped')}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider block">
                            Concept Prompt:
                          </span>
                          <p className="text-xs text-zinc-200 leading-relaxed font-sans font-medium">
                            "{renderMathText(card.concept)}"
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <span className={`px-2 py-0.5 rounded-lg bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 border text-[9px] font-mono transition-colors flex items-center gap-1 shadow-sm ${
                          isFlipped
                            ? 'bg-indigo-900/60 border-indigo-500/30 text-indigo-300'
                            : 'bg-zinc-900/90 border border-white/10 text-zinc-400 group-hover:text-indigo-300'
                        }`}>
                          <RotateCw className="w-2.5 h-2.5" />
                          <span>{isFlipped ? 'Show Prompt' : 'Reveal Formula'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Actions (SM-2 Grading Buttons) */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => markCardRecall(card, 'Low')}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                        title="Blackout: Reset interval to 1 day"
                      >
                        <Skull className="w-3 h-3" />
                        <span>Blackout</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => markCardRecall(card, 'Medium')}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                        title="Hard: Reinforce interval to 3 days"
                      >
                        <Timer className="w-3 h-3" />
                        <span>Hard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => markCardRecall(card, 'High')}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                        title="Good: Expand interval to 7+ days"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Good</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── STAGE 2: SYLLABUS RETENTION MATRIX GRID ── */}
      {vaultView === 'matrix' && (
        <>
          {matrixChaptersToDisplay.length === 0 ? (
            <div className="p-12 text-center bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-zinc-900/60 border border-white/10 rounded-3xl space-y-3 font-mono shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-display font-bold text-white uppercase tracking-wider">
                No Chapters Match Filter
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed font-sans">
                Try selecting "All 70 Chapters" or clearing your subject filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {matrixChaptersToDisplay.map((chap) => {
                const isOverdue = chap.retentionConfidence === 'Low';
                const isMastered = chap.retentionConfidence === 'High';
                const isNotStarted = chap.retentionConfidence === 'Not Started';

                return (
                  <div
                    key={chap.chapterId}
                    onClick={() => onInspectChapter(chap.chapterId)}
                    className={`p-4 rounded-3xl border bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 backdrop-blur-2xl transition-all cursor-pointer flex flex-col justify-between space-y-3 group shadow-md ${
                      isOverdue
                        ? 'bg-red-950/25 border-red-500/40 hover:border-red-500/70 shadow-red-950/20'
                        : isMastered
                        ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-950/20'
                        : isNotStarted
                        ? 'bg-zinc-950/50 border-white/5 hover:border-white/15 opacity-70'
                        : 'bg-zinc-900/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <span className={`px-2 py-0.5 rounded-lg border font-mono text-[9px] font-bold uppercase tracking-wider ${
                          chap.subject === 'physics' ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40' :
                          chap.subject === 'chemistry' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' :
                          'bg-amber-950/60 text-amber-300 border-amber-500/40'
                        }`}>
                          {chap.subject}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate block group-hover:text-indigo-300 transition-colors pt-1">
                          {chap.chapterName}
                        </h4>
                      </div>

                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0 ${getConfidenceBadge(chap.retentionConfidence)}`}>
                        {chap.retentionConfidence}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">Memory Retention:</span>
                        <span className={`font-bold ${
                          isOverdue ? 'text-red-400' : isMastered ? 'text-emerald-400' : 'text-zinc-300'
                        }`}>
                          {chap.retentionScore !== undefined ? `${chap.retentionScore}%` : 'Not Started'}
                        </span>
                      </div>

                      {chap.retentionScore !== undefined && (
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOverdue ? 'bg-red-500' : isMastered ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${chap.retentionScore}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>{chap.lastRevisionDate ? `Revised ${chap.lastRevisionDate}` : 'Never revised'}</span>
                      <span className="text-indigo-400 group-hover:text-indigo-300 font-bold flex items-center gap-1">
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
};
