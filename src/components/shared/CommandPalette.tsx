import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { modalVariants, backdropVariants } from '@/constants/motion';
import { PAGES } from '@/types/index';
import { FORMULA_BANK } from '@jee-os/engines';
import { Icon } from '@/components/ui/Icon';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useNavigate } from 'react-router-dom';
import { useStudyBrainStore, useShallow } from '@/store/useStudyBrainStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export type CommandCategory = 'all' | 'actions' | 'navigation' | 'chapters' | 'formulas' | 'mistakes';

export interface CommandPaletteItem {
  id: string;
  category: 'Actions' | 'Navigation' | 'Chapters' | 'Formulas' | 'Mistakes';
  title: string;
  subtitle?: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  onSelect: () => void;
}

interface QuickActionDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge: string;
  badgeColor: string;
  path: string;
}

const QUICK_ACTIONS: QuickActionDef[] = [
  {
    id: 'action-focus',
    title: 'Start Focus Session',
    description: 'Launch deep Pomodoro study cockpit',
    icon: 'Play',
    badge: 'Cockpit',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    path: '/cockpit',
  },
  {
    id: 'action-log-mistake',
    title: 'Log New Mistake',
    description: 'Record an error trap for recovery tracking',
    icon: 'ShieldAlert',
    badge: 'Vault',
    badgeColor: 'text-red-400 bg-red-500/10 border-red-500/20',
    path: '/mistakes',
  },
  {
    id: 'action-speed-drill',
    title: 'Formula Speed Drill',
    description: 'Rapid recall drill on high-yield formulas',
    icon: 'Zap',
    badge: 'Formulas',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    path: '/revision?tab=formulas',
  },
  {
    id: 'action-mock-test',
    title: 'Start Mock Test',
    description: 'Attempt full syllabus or chapter mock test',
    icon: 'GraduationCap',
    badge: 'Exams',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    path: '/mock-tests',
  },
  {
    id: 'action-planner',
    title: 'Weekly Strategy Planner',
    description: 'Review and optimize your syllabus timeline',
    icon: 'Calendar',
    badge: 'Planner',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    path: '/planner',
  },
];

const CATEGORY_TABS: Array<{ id: CommandCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'actions', label: 'Actions' },
  { id: 'navigation', label: 'Pages' },
  { id: 'chapters', label: 'Chapters' },
  { id: 'formulas', label: 'Formulas' },
  { id: 'mistakes', label: 'Mistakes' },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CommandCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { chapters, mistakes } = useStudyBrainStore(
    useShallow(state => ({
      chapters: state.chapters || [],
      mistakes: state.mistakes || [],
    }))
  );

  const flatFormulas = useMemo(() => {
    return FORMULA_BANK.flatMap(chap =>
      chap.formulas.map(f => ({
        title: f.title,
        concept: f.concept,
        formula: f.formula,
        examNote: f.examNote,
        chapterId: chap.chapterId,
        chapterName: chap.chapterName,
        subject: chap.subject,
      }))
    );
  }, []);

  const items = useMemo<CommandPaletteItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const results: CommandPaletteItem[] = [];

    // 1. Quick Actions
    if (activeCategory === 'all' || activeCategory === 'actions') {
      const matchedActions = QUICK_ACTIONS.filter(act => {
        if (!q) return true;
        return act.title.toLowerCase().includes(q) || act.description.toLowerCase().includes(q);
      });
      for (const act of matchedActions) {
        results.push({
          id: act.id,
          category: 'Actions',
          title: act.title,
          subtitle: act.description,
          icon: act.icon,
          badge: act.badge,
          badgeColor: act.badgeColor,
          onSelect: () => {
            navigate(act.path);
            onClose();
          },
        });
      }
    }

    // 2. Navigation / Pages
    if (activeCategory === 'all' || activeCategory === 'navigation') {
      const matchedPages = PAGES.filter(page => {
        if (!q) return true;
        return (
          page.label.toLowerCase().includes(q) ||
          page.description.toLowerCase().includes(q) ||
          page.id.toLowerCase().includes(q)
        );
      });
      for (const page of matchedPages) {
        results.push({
          id: `page-${page.id}`,
          category: 'Navigation',
          title: page.label,
          subtitle: page.description,
          icon: page.icon,
          badge: page.badge,
          badgeColor: 'text-zinc-400 bg-white/[0.04] border-white/10',
          onSelect: () => {
            navigate(`/${page.id}`);
            onClose();
          },
        });
      }
    }

    // 3. Syllabus Chapters
    if (activeCategory === 'all' || activeCategory === 'chapters') {
      const matchedChapters = chapters
        .filter(chap => {
          if (!q) return activeCategory === 'chapters';
          return (
            chap.name.toLowerCase().includes(q) ||
            (chap.unit?.toLowerCase().includes(q)) ||
            chap.subject.toLowerCase().includes(q)
          );
        })
        .slice(0, 8);

      for (const chap of matchedChapters) {
        const subjectLabel = chap.subject.charAt(0).toUpperCase() + chap.subject.slice(1);
        const subjectColor =
          chap.subject === 'physics'
            ? 'text-cyber-cyan bg-cyan-500/10 border-cyan-500/20'
            : chap.subject === 'chemistry'
            ? 'text-focus-amber bg-amber-500/10 border-amber-500/20'
            : 'text-precision-violet bg-purple-500/10 border-purple-500/20';

        results.push({
          id: `chap-${chap.id}`,
          category: 'Chapters',
          title: chap.name,
          subtitle: `${subjectLabel} • ${chap.unit || 'Core Unit'} • ${chap.completion || 0}% Complete`,
          icon: chap.subject === 'physics' ? 'Atom' : chap.subject === 'chemistry' ? 'FlaskConical' : 'Binary',
          badge: subjectLabel,
          badgeColor: subjectColor,
          onSelect: () => {
            navigate(`/${chap.subject}?chapterId=${chap.id}`);
            onClose();
          },
        });
      }
    }

    // 4. Formula Bank
    if (activeCategory === 'all' || activeCategory === 'formulas') {
      const matchedFormulas = flatFormulas
        .filter(f => {
          if (!q) return activeCategory === 'formulas';
          return (
            f.title.toLowerCase().includes(q) ||
            f.concept.toLowerCase().includes(q) ||
            f.chapterName.toLowerCase().includes(q) ||
            f.formula.toLowerCase().includes(q)
          );
        })
        .slice(0, 8);

      for (const f of matchedFormulas) {
        const subjectLabel = f.subject.charAt(0).toUpperCase() + f.subject.slice(1);
        const subjectColor =
          f.subject === 'physics'
            ? 'text-cyber-cyan bg-cyan-500/10 border-cyan-500/20'
            : f.subject === 'chemistry'
            ? 'text-focus-amber bg-amber-500/10 border-amber-500/20'
            : 'text-precision-violet bg-purple-500/10 border-purple-500/20';

        results.push({
          id: `formula-${f.chapterId}-${f.title}`,
          category: 'Formulas',
          title: f.title,
          subtitle: `${f.chapterName} • ${f.concept}`,
          icon: 'Sigma',
          badge: subjectLabel,
          badgeColor: subjectColor,
          onSelect: () => {
            navigate(`/revision?tab=formulas&search=${encodeURIComponent(f.title)}`);
            onClose();
          },
        });
      }
    }

    // 5. Mistake Vault
    if (activeCategory === 'all' || activeCategory === 'mistakes') {
      const matchedMistakes = mistakes
        .filter(m => {
          if (!q) return activeCategory === 'mistakes';
          const types = Array.isArray(m.mistakeTypes) ? m.mistakeTypes.join(' ') : '';
          return (
            (m.questionText?.toLowerCase().includes(q)) ||
            (m.topic?.toLowerCase().includes(q)) ||
            (m.chapter?.toLowerCase().includes(q)) ||
            types.toLowerCase().includes(q)
          );
        })
        .slice(0, 8);

      for (const m of matchedMistakes) {
        const subjectLabel = m.subject ? m.subject.charAt(0).toUpperCase() + m.subject.slice(1) : 'Mistake';
        results.push({
          id: `mistake-${m.id}`,
          category: 'Mistakes',
          title: m.topic || m.questionText.slice(0, 60),
          subtitle: `${m.chapter || 'Vault'} • ${m.mistakeTypes?.join(', ') || 'Uncategorized'}`,
          icon: 'ShieldAlert',
          badge: subjectLabel,
          badgeColor: 'text-critical-crimson bg-red-500/10 border-red-500/20',
          onSelect: () => {
            navigate(`/mistakes?search=${encodeURIComponent(m.topic || m.questionText)}`);
            onClose();
          },
        });
      }
    }

    return results;
  }, [searchQuery, activeCategory, chapters, mistakes, flatFormulas, navigate, onClose]);

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);

  // Hotkey listener for navigation, closing, and category cycling
  useEffect(() => {
    if (!isOpen) return;

    const timeout = setTimeout(() => inputRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (items.length > 0 ? (prev + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].onSelect();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = CATEGORY_TABS.findIndex(t => t.id === activeCategory);
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + CATEGORY_TABS.length) % CATEGORY_TABS.length
          : (currentIndex + 1) % CATEGORY_TABS.length;
        setActiveCategory(CATEGORY_TABS[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, items, selectedIndex, activeCategory]);

  // Reset selected index on query or category change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, activeCategory]);

  // Auto-scroll list to keep selected item in view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const selectedItem = listRef.current.querySelector(`[data-item-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedItem && typeof selectedItem.scrollIntoView === 'function') {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-start justify-center p-4 pt-[10vh]"
          aria-label="Command Palette Overlay"
        >
          {/* Backdrop with physics-based entrance */}
          <motion.div
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Container */}
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
            className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative border border-border-subtle surface-elevated glass-panel"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle bg-white/[0.02]">
              <Icon name="Search" aria-hidden="true" className="w-5 h-5 text-indigo-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search commands, chapters, formulas, mistakes..."
                aria-label="Search commands, chapters, formulas, or mistakes"
                className="flex-grow bg-transparent text-sm text-white outline-none border-none ring-0 focus:outline-none focus:ring-0 placeholder-zinc-500 font-sans"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                  ESC
                </span>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border-subtle bg-white/[0.01] overflow-x-auto hide-scrollbar">
              {CATEGORY_TABS.map(tab => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer select-none shrink-0 border ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold shadow-sm'
                        : 'bg-transparent text-zinc-400 border-transparent hover:bg-white/[0.04] hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              role="listbox"
              aria-label="Command results"
              className="max-h-[420px] overflow-y-auto p-2 space-y-0.5 hide-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
                  <div className="text-zinc-500 flex justify-center">
                    <Icon name="SearchX" className="w-8 h-8 opacity-40" />
                  </div>
                  <p>No results found matching &quot;{searchQuery}&quot;</p>
                  <p className="text-[10px] font-mono text-zinc-600">
                    Try searching with another keyword or press Tab to switch categories
                  </p>
                </div>
              ) : (
                items.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const showCategoryHeader = idx === 0 || items[idx - 1].category !== item.category;

                  return (
                    <div key={item.id}>
                      {showCategoryHeader && (
                        <div className="px-3 pt-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                          {item.category}
                        </div>
                      )}
                      <button
                        type="button"
                        role="option"
                        data-item-index={idx}
                        aria-selected={isSelected}
                        onClick={item.onSelect}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center gap-3 cursor-pointer border select-none ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500/40 text-white shadow-sm'
                            : 'bg-transparent border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg border shrink-0 ${
                            isSelected
                              ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                              : 'bg-white/[0.04] border-white/10 text-zinc-400'
                          }`}
                        >
                          <Icon name={item.icon} className="w-4 h-4" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold leading-tight truncate text-zinc-100">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded border ${
                                  item.badgeColor || 'border-zinc-800 text-zinc-400 bg-zinc-850'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-[10.5px] text-zinc-400 truncate mt-0.5">{item.subtitle}</p>
                          )}
                        </div>
                        <div className="flex items-center shrink-0">
                          {isSelected && (
                            <span className="text-[10px] font-mono text-indigo-300 flex items-center gap-1 bg-indigo-950/60 border border-indigo-900/60 px-2 py-0.5 rounded-md">
                              <span>⏎</span>
                              <span>Go</span>
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Keyboard Shortcuts Footer */}
            <div className="px-4 py-2 border-t border-border-subtle bg-white/[0.01] flex items-center justify-between text-[10px] font-mono text-zinc-500 shrink-0">
              <div className="flex items-center gap-3">
                <span>
                  <strong className="text-zinc-400 font-bold">↑↓</strong> Navigate
                </span>
                <span>
                  <strong className="text-zinc-400 font-bold">↵</strong> Select
                </span>
                <span>
                  <strong className="text-zinc-400 font-bold">Tab</strong> Category
                </span>
                <span>
                  <strong className="text-zinc-400 font-bold">ESC</strong> Close
                </span>
              </div>
              <span className="tabular-nums">{items.length} items</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
