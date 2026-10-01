import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Binary, Star, Copy, Zap, ArrowUpRight, Sparkles, BookOpen 
} from 'lucide-react';
import { Chapter } from '@/types/index';
import { FORMULA_BANK, FormulaEntry } from '@/constants/formulaBank';
import { BlockMath, MathRenderer } from '@/components/MathRenderer';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { storageAdapter } from '@/services/StorageAdapter';
import { audioEngine } from '@/utils/audioEngine';
import { useToast } from '@/components/ui/ToastProvider';

export interface ChapterFormulasTabProps {
  chapter: Chapter;
  onCloseModal: () => void;
  navigate: (path: string) => void;
}

export const ChapterFormulasTab: React.FC<ChapterFormulasTabProps> = ({
  chapter,
  onCloseModal,
  navigate
}) => {
  const { toast } = useToast();
  const actions = useStudyBrainStore(s => s.actions);
  const runtimeBookmarks = useStudyBrainStore(s => s.bookmarkedFormulaIds);

  const [localBookmarks, setLocalBookmarks] = useState<string[]>(() => {
    return storageAdapter.getItem<string[]>('jeeos_bookmarked_formulas') || [];
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const bookmarkedFormulas = useMemo(() => {
    if (runtimeBookmarks && runtimeBookmarks.length > 0) return runtimeBookmarks;
    return localBookmarks;
  }, [runtimeBookmarks, localBookmarks]);

  // Find formulas for this chapter from FORMULA_BANK
  const chapterData = useMemo(() => {
    if (!chapter) return null;
    const chapIdLower = (chapter.id || '').toLowerCase().trim();
    const chapNameLower = (chapter.name || '').toLowerCase().trim();

    return FORMULA_BANK.find(c => {
      const bankId = c.chapterId.toLowerCase().trim();
      const bankName = c.chapterName.toLowerCase().trim();
      return (
        bankId === chapIdLower ||
        bankName === chapNameLower ||
        bankName.includes(chapNameLower) ||
        chapNameLower.includes(bankName)
      );
    }) || null;
  }, [chapter]);

  const formulas: FormulaEntry[] = chapterData ? chapterData.formulas : [];

  const cleanFormulaString = (raw: string): string => {
    if (!raw) return '';
    return raw.trim().replace(/^\$\$([\s\S]*?)\$\$$|^\\\[([\s\S]*?)\\\]$|^\$([\s\S]*?)\$$/, (_m, p1, p2, p3) => (p1 || p2 || p3).trim()).trim();
  };

  const toggleBookmark = (formulaKey: string, title: string) => {
    audioEngine.playMechanicalKey('click').catch(() => {});
    const exists = bookmarkedFormulas.includes(formulaKey);
    const next = exists ? bookmarkedFormulas.filter(id => id !== formulaKey) : [...bookmarkedFormulas, formulaKey];

    setLocalBookmarks(next);
    storageAdapter.setItem('jeeos_bookmarked_formulas', next);
    actions.toggleFormulaBookmark?.(formulaKey).catch(() => {});

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

  return (
    <motion.div
      key="chapter-formulas"
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      {/* Top Banner & Quick Actions */}
      <div className="p-4 rounded-2xl border border-zinc-855/80 bg-zinc-950/60 flex items-center justify-between gap-3 shadow-inner flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Binary className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                {chapter.name} Formulas
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                {formulas.length} High-Yield
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Authentic JEE equations, theorems & ranker shortcuts for this chapter.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onCloseModal();
              navigate(`/revision?tab=speed_drill`);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Launch Timed Formula Speed Drill"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Speed Drill</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCloseModal();
              navigate(`/revision?tab=formulas&chapterId=${chapterData?.chapterId || chapter.id}`);
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Open in Full Formula Vault"
          >
            <span>Open Vault</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Formula Cards List */}
      {formulas.length > 0 ? (
        <div className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
          {formulas.map((formula, idx) => {
            const formulaKey = `${chapterData?.chapterId || chapter.id}_${formula.title}`;
            const isStarred = bookmarkedFormulas.includes(formulaKey);
            const isCopied = copiedKey === formulaKey;

            return (
              <div
                key={formulaKey || idx}
                className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-850 hover:border-zinc-700/80 transition-all space-y-3 shadow-md"
              >
                {/* Header: Title + Concept + Star + Copy */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white font-display tracking-tight leading-snug">
                      {formula.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      {formula.concept}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
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
                      className="p-1.5 rounded-lg border border-white/5 bg-white/[0.03] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      title="Copy LaTeX formula"
                    >
                      {isCopied ? <Copy className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* KaTeX Formula Display Box */}
                <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-white/5 text-center text-white overflow-x-auto shadow-inner">
                  <BlockMath math={cleanFormulaString(formula.formula)} />
                </div>

                {/* JEE Pro Tip */}
                {formula.examNote && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 font-mono flex items-start gap-2 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 mr-1.5">[JEE Pro Tip]</span>
                      <MathRenderer text={formula.examNote} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
          <h4 className="text-sm font-bold text-zinc-300 font-display">No Formulas Mapped</h4>
          <p className="text-xs text-zinc-500">
            Formulas for this chapter can be browsed in the main Formula Vault.
          </p>
        </div>
      )}
    </motion.div>
  );
};
