import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Bookmark, Star, Copy, Check, Printer, 
  Atom, FlaskConical, Binary, Filter, Sparkles, 
  ChevronRight, BookOpen, Download, Layers, X, Zap,
  Scale, Eye, EyeOff
} from 'lucide-react';
import { FORMULA_BANK, ChapterFormulas, FormulaEntry } from '@/constants/formulaBank';
import { MathRenderer, BlockMath } from '@/components/MathRenderer';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';
import { useToast } from '@/components/ui/ToastProvider';
import { FormulaSpeedDrillModal } from './components/FormulaSpeedDrillModal';
import { DimensionalAnalysisModal } from './components/DimensionalAnalysisModal';
import { storageAdapter } from '@/services/StorageAdapter';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

export function FormulaVaultPage() {
  const { toast } = useToast();
  const [activeSubject, setActiveSubject] = useState<'all' | 'physics' | 'chemistry' | 'maths'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSpeedDrillOpen, setIsSpeedDrillOpen] = useState(false);
  const [isDimensionsOpen, setIsDimensionsOpen] = useState(false);
  const [isClozeMode, setIsClozeMode] = useState(false);
  const [revealedClozeKeys, setRevealedClozeKeys] = useState<Set<string>>(new Set());

  const actions = useStudyBrainStore(s => s.actions);
  const runtimeBookmarks = useStudyBrainStore(s => s.bookmarkedFormulaIds);

  // Persistent bookmarked formulas: runtime/Firestore is single source of truth,
  // with storageAdapter as mirror/offline fallback cache
  const [localBookmarks, setLocalBookmarks] = useState<string[]>(() => {
    return storageAdapter.getItem<string[]>('jeeos_bookmarked_formulas') || [];
  });

  // Effective bookmarks combines runtime state (authoritative) or local fallback
  const bookmarkedFormulas = useMemo(() => {
    if (runtimeBookmarks && runtimeBookmarks.length > 0) {
      return runtimeBookmarks;
    }
    return localBookmarks;
  }, [runtimeBookmarks, localBookmarks]);

  // Synchronize legacy local cache to runtime on initial mount if runtime is unseeded
  useEffect(() => {
    const cached = storageAdapter.getItem<string[]>('jeeos_bookmarked_formulas');
    if (cached && cached.length > 0 && (!runtimeBookmarks || runtimeBookmarks.length === 0)) {
      actions.setFormulaBookmarks?.(cached).catch(() => {});
    }
  }, []);

  const toggleBookmark = (formulaId: string, title: string) => {
    audioEngine.playMechanicalKey('click').catch(() => {});
    const exists = bookmarkedFormulas.includes(formulaId);
    const next = exists ? bookmarkedFormulas.filter(id => id !== formulaId) : [...bookmarkedFormulas, formulaId];
    
    setLocalBookmarks(next);
    storageAdapter.setItem('jeeos_bookmarked_formulas', next);
    actions.toggleFormulaBookmark?.(formulaId).catch(() => {});

    toast({
      title: exists ? 'Removed from Starred' : 'Saved to Starred Vault',
      description: `Formula: ${title}`,
      type: exists ? 'info' : 'success'
    });
  };

  const copyFormulaLatex = (latex: string, key: string) => {
    audioEngine.playMechanicalKey('click').catch(() => {});
    navigator.clipboard.writeText(latex);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: 'LaTeX Formula Copied',
      description: 'Formula code copied to clipboard.',
      type: 'success'
    });
  };

  // Chapter options for filter dropdown
  const chapterOptions = useMemo(() => {
    let list = FORMULA_BANK;
    if (activeSubject !== 'all') {
      list = list.filter(c => c.subject === activeSubject);
    }
    return list;
  }, [activeSubject]);

  // Filtered formula database
  const filteredChapters = useMemo(() => {
    return FORMULA_BANK.filter(chap => {
      if (activeSubject !== 'all' && chap.subject !== activeSubject) return false;
      if (selectedChapter !== 'all' && chap.chapterId !== selectedChapter && chap.chapterName !== selectedChapter) return false;
      return true;
    }).map(chap => {
      const matchingFormulas = chap.formulas.filter(f => {
        const formulaKey = `${chap.chapterId}_${f.title}`;
        if (onlyBookmarked && !bookmarkedFormulas.includes(formulaKey)) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          f.title.toLowerCase().includes(q) ||
          f.concept.toLowerCase().includes(q) ||
          f.formula.toLowerCase().includes(q) ||
          chap.chapterName.toLowerCase().includes(q)
        );
      });

      return {
        ...chap,
        formulas: matchingFormulas
      };
    }).filter(chap => chap.formulas.length > 0);
  }, [activeSubject, selectedChapter, onlyBookmarked, searchQuery, bookmarkedFormulas]);

  const totalFormulaCount = useMemo(() => {
    return filteredChapters.reduce((acc, c) => acc + c.formulas.length, 0);
  }, [filteredChapters]);

  const handlePrint = () => {
    audioEngine.playMechanicalKey('clack').catch(() => {});
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left pb-32 sm:pb-36 font-sans">
      
      {/* 1. ACADEMIC HEADER & QUICK ACTIONS */}
      <div className="surface-1 p-6 md:p-7 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 print:hidden">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
              JEE FORMULA REPOSITORY
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              KaTeX High-Resolution Rendering
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Formula & Theorem Vault
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Fast, high-yield mathematical and theoretical cheat sheets for Physics, Chemistry, and Mathematics. Bookmark frequently missed equations for rapid last-minute revision.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => {
              audioEngine.playMechanicalKey('clack').catch(() => {});
              setIsClozeMode(prev => {
                const next = !prev;
                if (next) {
                  setRevealedClozeKeys(new Set());
                  toast({
                    title: 'Cloze Active Recall Enabled',
                    description: 'Formulas hidden. Click any card to reveal and test your recall.',
                    type: 'info'
                  });
                }
                return next;
              });
            }}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
              isClozeMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-amber-500/10'
                : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300'
            }`}
            title="Toggle Cloze Active Recall: hide equations behind interactive reveal buttons"
          >
            {isClozeMode ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
            <span>{isClozeMode ? 'Cloze Active' : 'Cloze Recall'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playMechanicalKey('click').catch(() => {});
              setIsDimensionsOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl border border-sky-500/30 bg-sky-950/30 hover:bg-sky-900/40 text-sky-200 text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            title="Physical Constants, SI Units & Dimensional Analysis"
          >
            <Scale className="w-4 h-4 text-sky-400" />
            <span>Dimensions & Units</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSpeedDrillOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
            title="Launch Timed Formula Flashcard Drill"
          >
            <Zap className="w-4 h-4" />
            <span>Speed Drill</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            title="Print or Save as Clean PDF"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* 2. SUBJECT SELECTOR & LIVE FILTER TOOLBAR */}
      <div className="sticky -top-6 z-20 pt-6 pb-2 -mt-6 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/80 shadow-2xl print:hidden">
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Subject Switcher Glider */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950/80 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => { setActiveSubject('all'); setSelectedChapter('all'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeSubject === 'all' ? 'bg-indigo-600/30 border border-indigo-500/40 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => { setActiveSubject('physics'); setSelectedChapter('all'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeSubject === 'physics' ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Atom className="w-3.5 h-3.5" />
              Physics
            </button>
            <button
              type="button"
              onClick={() => { setActiveSubject('chemistry'); setSelectedChapter('all'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeSubject === 'chemistry' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Chemistry
            </button>
            <button
              type="button"
              onClick={() => { setActiveSubject('maths'); setSelectedChapter('all'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeSubject === 'maths' ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              Maths
            </button>
          </div>

          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search formulas, concepts, theorems, or symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-10 pr-9 py-2 text-xs font-mono text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-zinc-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter: Chapter Dropdown + Bookmarks */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">All Chapters</option>
              {chapterOptions.map(c => (
                <option key={c.chapterId} value={c.chapterId}>{c.chapterName}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                audioEngine.playMechanicalKey('click').catch(() => {});
                setOnlyBookmarked(prev => !prev);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-colors cursor-pointer shrink-0 ${
                onlyBookmarked
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Filter Starred Formulas"
            >
              <Star className={`w-3.5 h-3.5 ${onlyBookmarked ? 'text-amber-400 fill-amber-400' : ''}`} />
              <span>Starred ({bookmarkedFormulas.length})</span>
            </button>
          </div>

        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/5">
          <span>Displaying <strong className="text-white">{totalFormulaCount}</strong> formulas across <strong className="text-white">{filteredChapters.length}</strong> chapters</span>
          {onlyBookmarked && <span className="text-amber-400">Showing Starred Only</span>}
        </div>
        </div>
      </div>

      {/* 3. FORMULA SECTIONS & CARDS GRID */}
      {filteredChapters.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl surface-1 space-y-3">
          <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Formulas Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">
            No formulas match your search or filter criteria. Try clearing the search query or changing subjects.
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setSelectedChapter('all'); setOnlyBookmarked(false); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredChapters.map(chapter => {
            const subjectTheme = 
              chapter.subject === 'physics' 
                ? 'border-sky-500/30 text-sky-400 bg-sky-950/20' 
                : chapter.subject === 'chemistry' 
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20' 
                : 'border-purple-500/30 text-purple-400 bg-purple-950/20';

            return (
              <div key={chapter.chapterId} className="space-y-3">
                {/* Chapter Section Header */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-lg border ${subjectTheme}`}>
                      {chapter.subject}
                    </span>
                    <h2 className="text-lg font-display font-bold text-white tracking-tight">
                      {chapter.chapterName}
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {chapter.formulas.length} Formula{chapter.formulas.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Formula Cards for Chapter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chapter.formulas.map((formula, idx) => {
                    const formulaKey = `${chapter.chapterId}_${formula.title}`;
                    const isStarred = bookmarkedFormulas.includes(formulaKey);
                    const isCopied = copiedKey === formulaKey;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className="p-5 rounded-2xl surface-2 transition-all flex flex-col justify-between space-y-4 shadow-lg relative group"
                      >
                        {/* Header: Title + Star + Copy */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-white font-display tracking-tight leading-snug">
                              {formula.title}
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                              {formula.concept}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 print:hidden">
                            <button
                              type="button"
                              onClick={() => toggleBookmark(formulaKey, formula.title)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isStarred
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                  : 'bg-white/[0.03] border-white/5 text-zinc-500 hover:text-zinc-300'
                              }`}
                              title={isStarred ? "Remove Bookmark" : "Bookmark Formula"}
                            >
                              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400' : ''}`} />
                            </button>

                            <button
                              type="button"
                              onClick={() => copyFormulaLatex(formula.formula, formulaKey)}
                              className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                              title="Copy LaTeX formula"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* KaTeX Math Box or Cloze Placeholder */}
                        {isClozeMode && !revealedClozeKeys.has(formulaKey) ? (
                          <button
                            type="button"
                            onClick={() => {
                              audioEngine.playMechanicalKey('click').catch(() => {});
                              setRevealedClozeKeys(prev => {
                                const next = new Set(prev);
                                next.add(formulaKey);
                                return next;
                              });
                            }}
                            className="w-full py-4 px-3 rounded-xl border border-dashed border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/30 text-amber-300 font-mono text-xs flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer shadow-inner"
                            title="Click to reveal formula and test recall"
                          >
                            <div className="flex items-center gap-2 font-bold">
                              <Eye className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                              <span>[ ? Click to Reveal Formula ]</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-sans">Active Recall Challenge</span>
                          </button>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 overflow-x-auto text-center font-mono text-zinc-100 shadow-inner relative">
                            {isClozeMode && (
                              <span className="absolute top-1.5 right-2 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded shadow-sm">
                                Revealed
                              </span>
                            )}
                            <MathRenderer text={formula.formula} />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FORMULA SPEED DRILL MODAL */}
      <FormulaSpeedDrillModal
        isOpen={isSpeedDrillOpen}
        onClose={() => setIsSpeedDrillOpen(false)}
        selectedSubject={activeSubject}
        onBookmarkFormula={toggleBookmark}
        bookmarkedKeys={bookmarkedFormulas}
      />

      {/* DIMENSIONAL ANALYSIS & PHYSICAL CONSTANT INSPECTOR MODAL */}
      <DimensionalAnalysisModal
        isOpen={isDimensionsOpen}
        onClose={() => setIsDimensionsOpen(false)}
      />

    </div>
  );
}
