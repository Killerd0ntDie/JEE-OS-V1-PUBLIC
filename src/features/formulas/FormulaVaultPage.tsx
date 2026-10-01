import { useState, useMemo, useEffect } from 'react';
import { 
  Search, Star, Copy, Check, Printer, 
  Atom, FlaskConical, Binary, Sparkles, 
  ChevronRight, BookOpen, X, Zap,
  Scale, Eye, EyeOff, ArrowLeft, ArrowUpRight
} from 'lucide-react';
import { FORMULA_BANK, } from '@/constants/formulaBank';
import { MathRenderer, BlockMath } from '@/components/MathRenderer';
import { audioEngine } from '@/utils/audioEngine';
import { useToast } from '@/components/ui/ToastProvider';
import { FormulaSpeedDrillModal } from './components/FormulaSpeedDrillModal';
import { DimensionalAnalysisModal } from './components/DimensionalAnalysisModal';
import { storageAdapter } from '@/services/StorageAdapter';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

export function FormulaVaultPage({ initialChapterId }: { initialChapterId?: string } = {}) {
  const { toast } = useToast();
  const [activeSubject, setActiveSubject] = useState<'all' | 'physics' | 'chemistry' | 'maths'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>(() => {
    if (initialChapterId) return initialChapterId;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlChap = urlParams.get('chapterId');
      if (urlChap) return urlChap;
    } catch {}
    return 'all';
  });
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
          chap.chapterName.toLowerCase().includes(q) ||
          (f.examNote?.toLowerCase().includes(q))
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

  // Current chapter navigation helpers for chapter tab mode
  const currentChapterIndex = useMemo(() => {
    if (selectedChapter === 'all') return -1;
    return chapterOptions.findIndex(c => c.chapterId === selectedChapter || c.chapterName === selectedChapter);
  }, [chapterOptions, selectedChapter]);

  const activeChapterData = useMemo(() => {
    if (currentChapterIndex >= 0) return chapterOptions[currentChapterIndex];
    return null;
  }, [chapterOptions, currentChapterIndex]);

  const goToPrevChapter = () => {
    if (currentChapterIndex > 0) {
      audioEngine.playMechanicalKey('click').catch(() => {});
      setSelectedChapter(chapterOptions[currentChapterIndex - 1].chapterId);
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < chapterOptions.length - 1) {
      audioEngine.playMechanicalKey('click').catch(() => {});
      setSelectedChapter(chapterOptions[currentChapterIndex + 1].chapterId);
    }
  };

  // State for expanded chapters in chapter list mode
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Default to expanding the first chapter for immediate preview
    if (FORMULA_BANK.length > 0) {
      initial.add(FORMULA_BANK[0].chapterId);
    }
    return initial;
  });

  const toggleChapterExpand = (chapterId: string) => {
    audioEngine.playMechanicalKey('click').catch(() => {});
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const _expandAllChapters = () => {
    audioEngine.playMechanicalKey('clack').catch(() => {});
    setExpandedChapters(new Set(filteredChapters.map(c => c.chapterId)));
  };

  const _collapseAllChapters = () => {
    audioEngine.playMechanicalKey('clack').catch(() => {});
    setExpandedChapters(new Set());
  };

  // Auto-expand chapters when user is searching or selects a specific chapter
  useEffect(() => {
    if (searchQuery.trim() || selectedChapter !== 'all') {
      setExpandedChapters(new Set(filteredChapters.map(c => c.chapterId)));
    }
  }, [searchQuery, selectedChapter, filteredChapters]);

  const cleanFormulaString = (raw: string): string => {
    if (!raw) return '';
    return raw.trim().replace(/^\$\$([\s\S]*?)\$\$$|^\\\[([\s\S]*?)\\\]$|^\$([\s\S]*?)\$$/, (_m, p1, p2, p3) => (p1 || p2 || p3).trim()).trim();
  };

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

        {/* Chapter Tabs Strip (Mock Tests style) */}
        <div role="tablist" aria-label="Chapter formula tabs" className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <button
            type="button"
            role="tab"
            aria-selected={selectedChapter === 'all'}
            onClick={() => {
              audioEngine.playMechanicalKey('click').catch(() => {});
              setSelectedChapter('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border select-none ${
              selectedChapter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <span>All Chapters</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedChapter === 'all' ? 'bg-indigo-700 text-indigo-100' : 'bg-zinc-800 text-zinc-400'}`}>
              {chapterOptions.length}
            </span>
          </button>

          {chapterOptions.map(chap => {
            const isSelected = selectedChapter === chap.chapterId || selectedChapter === chap.chapterName;
            const starredInChap = chap.formulas.filter(f => bookmarkedFormulas.includes(`${chap.chapterId}_${f.title}`)).length;
            return (
              <button
                key={chap.chapterId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  audioEngine.playMechanicalKey('click').catch(() => {});
                  setSelectedChapter(chap.chapterId);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border select-none ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
              >
                <span>{chap.chapterName}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-zinc-800 text-zinc-400'}`}>
                  {chap.formulas.length}
                </span>
                {starredInChap > 0 && (
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Results Counter & Navigation Indicator */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span>Displaying <strong className="text-white">{totalFormulaCount}</strong> formulas across <strong className="text-white">{filteredChapters.length}</strong> chapters</span>
            {onlyBookmarked && (
              <span className="text-amber-400">
                • <span>Showing Starred Only</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedChapter !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playMechanicalKey('click').catch(() => {});
                  setSelectedChapter('all');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to All Chapters</span>
              </button>
            ) : (
              <span className="text-zinc-500 text-[10px]">Select any chapter tab to view dedicated formula sheet</span>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* 3. STRUCTURED CHAPTER LIST WITH FORMULAS */}
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
        <div className="space-y-4">
          {/* Focused Chapter Hero Bar (Mock Tests Style) */}
          {selectedChapter !== 'all' && activeChapterData && (
            <div className="surface-1 rounded-2xl border border-white/5 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playMechanicalKey('click').catch(() => {});
                    setSelectedChapter('all');
                  }}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Back to All Chapters"
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-400" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                      {activeChapterData.subject.toUpperCase()}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Chapter {currentChapterIndex + 1} of {chapterOptions.length}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
                    {activeChapterData.chapterName} Formula Sheet
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentChapterIndex <= 0}
                  onClick={goToPrevChapter}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  &lt; Prev Chapter
                </button>
                <button
                  type="button"
                  disabled={currentChapterIndex >= chapterOptions.length - 1}
                  onClick={goToNextChapter}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Next Chapter &gt;
                </button>
              </div>
            </div>
          )}

          {filteredChapters.map(chapter => {
            const isExpanded = expandedChapters.has(chapter.chapterId);
            const starredInChapter = chapter.formulas.filter(f => bookmarkedFormulas.includes(`${chapter.chapterId}_${f.title}`)).length;

            const subjectTheme = 
              chapter.subject === 'physics' 
                ? 'border-sky-500/30 text-sky-400 bg-sky-950/20' 
                : chapter.subject === 'chemistry' 
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20' 
                : 'border-purple-500/30 text-purple-400 bg-purple-950/20';

            return (
              <div 
                key={chapter.chapterId} 
                className="surface-1 rounded-2xl border border-white/5 transition-all overflow-hidden shadow-lg"
              >
                {/* Chapter Card Header / Accordion Bar */}
                <div 
                  onClick={() => toggleChapterExpand(chapter.chapterId)}
                  className="p-4 md:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg border shrink-0 ${subjectTheme}`}>
                      {chapter.subject}
                    </span>
                    <h2 className="text-base sm:text-lg font-display font-bold text-white tracking-tight truncate">
                      {chapter.chapterName}
                    </h2>
                    {starredInChapter > 0 && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        {starredInChapter}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {selectedChapter === 'all' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          audioEngine.playMechanicalKey('click').catch(() => {});
                          setSelectedChapter(chapter.chapterId);
                        }}
                        className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 border border-transparent hover:border-indigo-500/30 transition-all cursor-pointer"
                        title="Focus Chapter Sheet"
                      >
                        <span>Focus Tab</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-xs font-mono text-zinc-400 bg-zinc-900/60 px-2.5 py-1 rounded-lg border border-white/5">
                      {chapter.formulas.length} Formula{chapter.formulas.length > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      aria-label={isExpanded ? 'Collapse chapter formulas' : 'Expand chapter formulas'}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-indigo-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Formula Cards for Chapter (Rendered inside each chapter) */}
                {isExpanded && (
                  <div className="p-4 md:p-5 pt-0 border-t border-white/5 bg-black/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      {chapter.formulas.map((formula) => {
                        const formulaKey = `${chapter.chapterId}_${formula.title}`;
                        const isStarred = bookmarkedFormulas.includes(formulaKey);
                        const isCopied = copiedKey === formulaKey;

                        return (
                          <div
                            key={formulaKey}
                            className="p-5 rounded-2xl surface-2 transition-all flex flex-col justify-between space-y-4 shadow-lg relative group border border-white/5 hover:border-white/10"
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
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                                </button>
                              </div>
                            </div>

                            {/* Real KaTeX Display Math Block or Cloze Placeholder */}
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
                              <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 overflow-x-auto text-center font-mono text-zinc-100 shadow-inner relative">
                                {isClozeMode && (
                                  <span className="absolute top-1.5 right-2 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded shadow-sm">
                                    Revealed
                                  </span>
                                )}
                                <BlockMath math={cleanFormulaString(formula.formula)} />
                              </div>
                            )}

                            {/* High-Yield JEE Exam Tip Badge */}
                            {formula.examNote && (
                              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono leading-relaxed shadow-sm">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 mr-1.5">
                                    JEE Pro Tip
                                  </span>
                                  <span className="text-zinc-200">
                                    <MathRenderer text={formula.examNote} />
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
