import { useState, useMemo } from 'react';
import { 
  Search, Star, Copy, Check, Printer, 
  Atom, FlaskConical, Binary, Sparkles, 
  BookOpen, X, Zap, Scale, Eye, EyeOff, 
  ArrowLeft, Flame, Play, ChevronLeft, ChevronRight
} from 'lucide-react';
import { FORMULA_BANK, ChapterFormulas } from '@/constants/formulaBank';
import { MathRenderer, BlockMath } from '@/components/MathRenderer';
import { audioEngine } from '@/utils/audioEngine';
import { useToast } from '@/components/ui/ToastProvider';
import { FormulaSpeedDrillModal } from './components/FormulaSpeedDrillModal';
import { DimensionalAnalysisModal } from './components/DimensionalAnalysisModal';
import { RevisionSession } from '@/features/revision/components/RevisionSession';
import { RevisionCardItem } from '@jee-os/engines';
import { useStudyBrainStore, useShallow } from '@/store/useStudyBrainStore';

export interface FormulaVaultPageProps {
  initialChapterId?: string;
  onBack?: () => void;
}

export function FormulaVaultPage({ initialChapterId, onBack }: FormulaVaultPageProps = {}) {
  const { toast } = useToast();

  // Infer initial subject and chapter from initialChapterId or URL param
  const initialData = useMemo(() => {
    let chapId = initialChapterId;
    if (!chapId) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        chapId = urlParams.get('chapterId') || undefined;
      } catch {}
    }
    if (chapId) {
      const found = FORMULA_BANK.find(
        c => c.chapterId === chapId || c.chapterName.toLowerCase() === chapId?.toLowerCase()
      );
      if (found) {
        return { 
          subject: found.subject as 'physics' | 'chemistry' | 'maths', 
          chapterId: found.chapterId 
        };
      }
    }
    // Default to physics and first physics chapter
    const firstPhysics = FORMULA_BANK.find(c => c.subject === 'physics');
    return {
      subject: 'physics' as const,
      chapterId: firstPhysics?.chapterId || 'p-units'
    };
  }, [initialChapterId]);

  const [activeSubject, setActiveSubject] = useState<'physics' | 'chemistry' | 'maths'>(initialData.subject);
  const [selectedChapter, setSelectedChapter] = useState<string>(initialData.chapterId);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [onlyHighWeightage, setOnlyHighWeightage] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSpeedDrillOpen, setIsSpeedDrillOpen] = useState(false);
  const [isDimensionsOpen, setIsDimensionsOpen] = useState(false);
  const [isClozeMode, setIsClozeMode] = useState(false);
  const [revealedClozeKeys, setRevealedClozeKeys] = useState<Set<string>>(new Set());
  const [drillSession, setDrillSession] = useState<{
    chapterId: string;
    chapterName: string;
    cards: RevisionCardItem[];
  } | null>(null);

  const { actions, runtimeBookmarks, chapters } = useStudyBrainStore(
    useShallow(state => ({
      actions: state.actions,
      runtimeBookmarks: state.bookmarkedFormulaIds,
      chapters: state.chapters || []
    }))
  );

  const bookmarkedFormulas = useMemo(() => runtimeBookmarks || [], [runtimeBookmarks]);

  const highWeightageSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of chapters) {
      if ((c.weightage && c.weightage >= 6) || c.priority === 1) {
        set.add(c.id.toLowerCase());
        set.add(c.name.toLowerCase());
      }
    }
    const canonical = [
      'rotational', 'thermodynamics', 'electrostatics', 'current electricity',
      'magnetic', 'optics', 'modern physics', 'chemical bonding',
      'coordination', 'aldehyde', 'ketone', 'equilibrium', 'calculus',
      'integration', 'matrices', 'determinants', 'coordinate geometry',
      'conic', 'complex numbers', 'probability', 'vectors'
    ];
    for (const item of canonical) {
      set.add(item);
    }
    return set;
  }, [chapters]);

  const isHighWeightage = (chap: ChapterFormulas) => {
    const chapIdLower = chap.chapterId.toLowerCase();
    const chapNameLower = chap.chapterName.toLowerCase();
    if (highWeightageSet.has(chapIdLower) || highWeightageSet.has(chapNameLower)) return true;
    for (const item of highWeightageSet) {
      if (chapNameLower.includes(item)) return true;
    }
    return false;
  };

  const handleSubjectChange = (newSubject: 'physics' | 'chemistry' | 'maths') => {
    audioEngine.playMechanicalKey('click').catch(() => {});
    setActiveSubject(newSubject);
    // Automatically select the first chapter of the new subject
    const firstChap = FORMULA_BANK.find(c => c.subject === newSubject);
    if (firstChap) {
      setSelectedChapter(firstChap.chapterId);
    }
  };

  const launchChapterDrill = (chapter: ChapterFormulas) => {
    audioEngine.playMechanicalKey('click').catch(() => {});
    const cards: RevisionCardItem[] = chapter.formulas.map((f, idx) => ({
      id: `fv-${chapter.chapterId}-${idx}`,
      chapterId: chapter.chapterId,
      chapterName: chapter.chapterName,
      subject: chapter.subject,
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
    setDrillSession({
      chapterId: chapter.chapterId,
      chapterName: chapter.chapterName,
      cards
    });
  };

  const toggleBookmark = (formulaId: string, title: string) => {
    audioEngine.playMechanicalKey('click').catch(() => {});
    const exists = bookmarkedFormulas.includes(formulaId);
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



  // Filtered formula database strictly for the currently selected subject
  const filteredChapters = useMemo(() => {
    return FORMULA_BANK.filter(chap => {
      if (chap.subject !== activeSubject) return false;
      if (onlyHighWeightage && !isHighWeightage(chap)) return false;
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
          (f.subtopic?.toLowerCase().includes(q)) ||
          (f.examNote?.toLowerCase().includes(q))
        );
      });

      return {
        ...chap,
        formulas: matchingFormulas
      };
    }).filter(chap => chap.formulas.length > 0);
  }, [activeSubject, onlyBookmarked, onlyHighWeightage, searchQuery, bookmarkedFormulas, highWeightageSet]);

  const totalFormulaCount = useMemo(() => {
    return filteredChapters.reduce((acc, c) => acc + c.formulas.length, 0);
  }, [filteredChapters]);

  // Active chapter within the filtered list of the active subject
  const activeChapterData = useMemo(() => {
    if (filteredChapters.length === 0) return null;
    const match = filteredChapters.find(
      c => c.chapterId === selectedChapter || c.chapterName === selectedChapter
    );
    return match || filteredChapters[0];
  }, [filteredChapters, selectedChapter]);

  const currentChapterIndex = useMemo(() => {
    if (!activeChapterData) return -1;
    return filteredChapters.findIndex(c => c.chapterId === activeChapterData.chapterId);
  }, [filteredChapters, activeChapterData]);

  const goToPrevChapter = () => {
    if (currentChapterIndex > 0) {
      audioEngine.playMechanicalKey('click').catch(() => {});
      setSelectedChapter(filteredChapters[currentChapterIndex - 1].chapterId);
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < filteredChapters.length - 1) {
      audioEngine.playMechanicalKey('click').catch(() => {});
      setSelectedChapter(filteredChapters[currentChapterIndex + 1].chapterId);
    }
  };

  const cleanFormulaString = (raw: string): string => {
    if (!raw) return '';
    return raw.trim().replace(/^\$\$([\s\S]*?)\$\$$|^\\\[([\s\S]*?)\\\]$|^\$([\s\S]*?)\$$/, (_m, p1, p2, p3) => (p1 || p2 || p3).trim()).trim();
  };

  const handlePrint = () => {
    audioEngine.playMechanicalKey('clack').catch(() => {});
    window.print();
  };

  // Render formula sheet for active chapter
  const renderChapterFormulas = (chapter: ChapterFormulas) => {
    const subtopicMap = new Map<string, typeof chapter.formulas>();
    for (const f of chapter.formulas) {
      const topic = f.subtopic || 'Core Formulas';
      if (!subtopicMap.has(topic)) subtopicMap.set(topic, []);
      subtopicMap.get(topic)!.push(f);
    }
    const groups = Array.from(subtopicMap.entries());

    const subjectTheme = 
      chapter.subject === 'physics' 
        ? 'border-sky-500/30 text-sky-400 bg-sky-950/20' 
        : chapter.subject === 'chemistry' 
        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20' 
        : 'border-purple-500/30 text-purple-400 bg-purple-950/20';

    return (
      <div key={chapter.chapterId} className="space-y-6">
        {/* Chapter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${subjectTheme}`}>
                {chapter.subject}
              </span>
              {isHighWeightage(chapter) && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5 fill-rose-400" />
                  High Weightage
                </span>
              )}
              <span className="text-[10px] font-mono text-zinc-500">
                {chapter.formulas.length} {chapter.formulas.length === 1 ? 'formula' : 'formulas'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight truncate">
              {chapter.chapterName}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => launchChapterDrill(chapter)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/50 border border-indigo-400/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="Practice active recall flashcards for this chapter"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Practice Drill</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentChapterIndex <= 0}
                onClick={goToPrevChapter}
                className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous Chapter"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={currentChapterIndex >= filteredChapters.length - 1}
                onClick={goToNextChapter}
                className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next Chapter"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Formulas Grouped by Subtopic */}
        <div className="space-y-6">
          {groups.map(([subtopicName, formulaList]) => (
            <div key={subtopicName} className="space-y-3">
              {groups.length > 1 && (
                <div className="flex items-center gap-2.5 pt-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-0.5 rounded-md">
                    {subtopicName}
                  </span>
                  <div className="h-px bg-white/5 flex-1" />
                  <span className="text-[10px] font-mono text-zinc-500">
                    {formulaList.length} {formulaList.length === 1 ? 'formula' : 'formulas'}
                  </span>
                </div>
              )}

              <div className="flex flex-col space-y-4 w-full">
                {formulaList.map((formula) => {
                  const formulaKey = `${chapter.chapterId}_${formula.title}`;
                  const isStarred = bookmarkedFormulas.includes(formulaKey);
                  const isCopied = copiedKey === formulaKey;

                  return (
                    <div
                      key={formulaKey}
                      className="w-full p-4 sm:p-5 rounded-2xl surface-1 transition-all flex flex-col justify-between space-y-4 shadow-lg relative group border border-white/5 hover:border-white/10"
                    >
                      {/* Header: Title + Star + Copy */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0 flex-1">
                          {formula.subtopic && groups.length === 1 && (
                            <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 inline-block mb-0.5">
                              {formula.subtopic}
                            </span>
                          )}
                          <h3 className="text-sm sm:text-base font-bold text-white font-display tracking-tight leading-snug">
                            {formula.title}
                          </h3>
                          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                            {formula.concept}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 print:hidden">
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
                          className="w-full py-5 px-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/30 text-amber-300 font-mono text-xs flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer shadow-inner"
                          title="Click to reveal formula and test recall"
                        >
                          <div className="flex items-center gap-2 font-bold">
                            <Eye className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                            <span>[ ? Click to Reveal Formula ]</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-sans">Active Recall Challenge</span>
                        </button>
                      ) : (
                        <div className="w-full p-4 sm:p-5 rounded-xl bg-black/60 border border-white/5 overflow-x-auto text-center font-mono text-zinc-100 shadow-inner relative">
                          {isClozeMode && (
                            <span className="absolute top-2 right-2.5 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded shadow-sm">
                              Revealed
                            </span>
                          )}
                          <BlockMath math={cleanFormulaString(formula.formula)} />
                        </div>
                      )}

                      {/* High-Yield JEE Exam Tip Badge */}
                      {formula.examNote && (
                        <div className="w-full flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono leading-relaxed shadow-sm">
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
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 text-left pb-32 sm:pb-36 font-sans">
      
      {/* 1. CLEAN UNCLUTTERED TOP BAR (~48px) */}
      <div className="surface-1 px-4 py-2 sm:px-5 rounded-2xl border border-white/5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-300 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
              title="Return to Spaced Revision"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <h1 className="text-base sm:text-lg font-display font-bold text-white tracking-tight">
            Formula Vault
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
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
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isClozeMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300'
            }`}
            title="Toggle Cloze Active Recall: hide equations behind interactive reveal buttons"
          >
            {isClozeMode ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{isClozeMode ? 'Cloze Active' : 'Cloze Recall'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playMechanicalKey('click').catch(() => {});
              setIsDimensionsOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-950/30 hover:bg-sky-900/40 text-sky-200 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Physical Constants, SI Units & Dimensional Analysis"
          >
            <Scale className="w-3.5 h-3.5 text-sky-400" />
            <span>Dimensions & Units</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSpeedDrillOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30"
            title="Launch Timed Formula Flashcard Drill"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Speed Drill</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Print or Save as Clean PDF"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* 2. MASTER-DETAIL WORKSPACE (Both columns placed directly on the page) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* === LEFT MASTER SIDEBAR (Directly on page, sticky when scrolling) === */}
        <div className="lg:col-span-4 xl:col-span-3.5 space-y-3 lg:sticky lg:top-4 self-start print:hidden">
          
          {/* Minimized Compact Search Input (h-8) */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search formulas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 bg-zinc-900/90 border border-zinc-800 rounded-xl pl-8 pr-7 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-all placeholder-zinc-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Subject Selector Glider: Strictly Physics, Chemistry, Maths (No 'All') */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-950/80 border border-white/5">
            <button
              type="button"
              onClick={() => handleSubjectChange('physics')}
              className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubject === 'physics'
                  ? 'bg-sky-500/25 border border-sky-500/50 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <Atom className="w-3.5 h-3.5 text-sky-400" />
              <span>Physics</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubjectChange('chemistry')}
              className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubject === 'chemistry'
                  ? 'bg-emerald-500/25 border border-emerald-500/50 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chemistry</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubjectChange('maths')}
              className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubject === 'maths'
                  ? 'bg-purple-500/25 border border-purple-500/50 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
              }`}
            >
              <Binary className="w-3.5 h-3.5 text-purple-400" />
              <span>Maths</span>
            </button>
          </div>

          {/* Quick Filters: High Weightage & Starred */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                audioEngine.playMechanicalKey('click').catch(() => {});
                setOnlyHighWeightage(prev => !prev);
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                onlyHighWeightage
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Filter High-Weightage JEE Chapters (Tier-1 Yield)"
            >
              <Flame className={`w-3 h-3 ${onlyHighWeightage ? 'text-rose-400 fill-rose-400' : ''}`} />
              <span>High Yield</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playMechanicalKey('click').catch(() => {});
                setOnlyBookmarked(prev => !prev);
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                onlyBookmarked
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Filter Starred Formulas"
            >
              <Star className={`w-3 h-3 ${onlyBookmarked ? 'text-amber-400 fill-amber-400' : ''}`} />
              <span>Starred ({bookmarkedFormulas.length})</span>
            </button>
          </div>

          {/* Chapter List Header & Results Counter */}
          <div className="text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span>Displaying <strong className="text-white">{totalFormulaCount}</strong> formulas across <strong className="text-white">{filteredChapters.length}</strong> chapters</span>
            </div>
            {onlyBookmarked && (
              <div className="text-amber-400 font-semibold">
                Showing Starred Only
              </div>
            )}
          </div>

          {/* Scrollable Chapter List strictly for activeSubject */}
          <div role="tablist" aria-label="Formula chapters" className="space-y-1 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {filteredChapters.map(chap => {
              const isSelected = activeChapterData?.chapterId === chap.chapterId;
              const starredInChap = chap.formulas.filter(f => bookmarkedFormulas.includes(`${chap.chapterId}_${f.title}`)).length;
              const highYield = isHighWeightage(chap);

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
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between gap-2 border cursor-pointer select-none ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-bold ring-1 ring-indigo-500/30'
                      : 'bg-zinc-900/40 hover:bg-zinc-800/60 border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate text-zinc-200 min-w-0 flex-1">
                    {chap.chapterName}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {highYield && (
                      <span title="High Weightage JEE Topic">
                        <Flame className="w-3 h-3 text-rose-400 fill-rose-400" />
                      </span>
                    )}
                    {starredInChap > 0 && (
                      <span title="Starred formulas present">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 font-bold">
                      {chap.formulas.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* === RIGHT DETAIL PANE (Directly on page, full-width list view) === */}
        <div className="lg:col-span-8 xl:col-span-8.5 space-y-6 min-w-0">
          {filteredChapters.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl surface-1 space-y-3">
              <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Formulas Found in {activeSubject.toUpperCase()}</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">
                No formulas match your search or filter criteria in {activeSubject}. Try clearing the search query or reset filters.
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setOnlyBookmarked(false); setOnlyHighWeightage(false); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : activeChapterData ? (
            renderChapterFormulas(activeChapterData)
          ) : null}
        </div>

      </div>

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

      {/* ACTIVE RECALL DRILL MODAL BRIDGE */}
      {drillSession && (
        <RevisionSession
          cards={drillSession.cards}
          chapterTitle={drillSession.chapterName}
          chapterId={drillSession.chapterId}
          onClose={() => setDrillSession(null)}
          onFinish={() => setDrillSession(null)}
        />
      )}

    </div>
  );
}
