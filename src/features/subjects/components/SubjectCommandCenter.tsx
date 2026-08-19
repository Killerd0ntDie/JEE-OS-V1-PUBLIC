import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getSubjectTheme } from '@/constants/subjectTheme';
import { SubjectId, Chapter } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { ChapterTelemetry } from '@jee-os/engines';
import { ChapterCommandCard } from './ChapterCommandCard';
import { Icon } from '@/components/ui/Icon';
import { Search, Filter, ArrowUpDown, Network, ListFilter, Plus, Target, ArrowRight, Activity, Sparkles } from 'lucide-react';
import { GlassSelect, GlassSelectOption } from '@/components/ui/GlassSelect';
import { AddCustomChapterModal } from './AddCustomChapterModal';
import { RpgKnowledgeTreeWidget } from './RpgKnowledgeTreeWidget';
import { springs } from '@/constants/motion';

interface SubjectCommandCenterProps {
  subjectId: SubjectId;
  subjectTitle: string;
  subjectSubtitle: string;
  subjectIcon: string;
  unitCategories?: string[];
}

type FilterType = 'All' | 'Learning' | 'Revision Due' | 'Mastered' | 'On Hold';
type SortType = 'default' | 'mastery-desc' | 'mastery-asc' | 'priority' | 'time-asc' | 'name-asc';

export function SubjectCommandCenter({
  subjectId,
  subjectTitle,
  subjectSubtitle,
  subjectIcon,
  unitCategories = ['All']
}: SubjectCommandCenterProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const chapters = useStudyBrainStore(state => state.chapters);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [activeUnit, setActiveUnit] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortType>('default');
  const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'rpg'>(() => {
    return (localStorage.getItem('syllabusViewMode') as 'list' | 'rpg') || 'list';
  });

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '/' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('syllabusViewMode', viewMode);
  }, [viewMode]);

  // Subject specific chapters
  const subjectChapters = useMemo(() => {
    return chapters.filter(c => c.subject === subjectId);
  }, [chapters, subjectId]);

  // Sort chapters by serial number if available, otherwise by numerical index
  const sortedSubjectChapters = useMemo(() => {
    return [...subjectChapters].sort((a, b) => {
      if (a.serialNumber && b.serialNumber) {
        const numA = parseInt(a.serialNumber.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.serialNumber.replace(/\D/g, ''), 10) || 0;
        const strA = numA.toString().padStart(2, '0');
        const strB = numB.toString().padStart(2, '0');
        return strA.localeCompare(strB);
      }
      if (a.serialNumber) return -1;
      if (b.serialNumber) return 1;
      const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [subjectChapters]);

  // Filter & Search Logic with precise unit matching
  const filteredChapters = useMemo(() => {
    let result = sortedSubjectChapters;

    // Precise Unit filter
    if (activeUnit !== 'All' && activeUnit !== 'All Units') {
      const u = activeUnit.toLowerCase().trim();
      result = result.filter(c => {
        const cu = (c.unit || '').toLowerCase().trim();
        if (cu === u) return true;
        // Word boundary matching: "organic" matches "organic chemistry" but NOT "inorganic chemistry"
        const words = cu.split(/\s+/);
        return words.includes(u) || cu.startsWith(u);
      });
    }

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => c.name.toLowerCase().includes(q) || (c.unit || '').toLowerCase().includes(q));
    }

    // Status filter
    if (activeFilter !== 'All') {
      switch (activeFilter) {
        case 'Learning':
          result = result.filter(c => (c.completion > 0 && c.completion < 100) || c.status === 'Learning');
          break;
        case 'Revision Due':
          result = result.filter(c => 
            c.status === 'Revision Due' || 
            (c.lastRevisionDaysAgo != null && c.lastRevisionDaysAgo >= 7) || 
            c.retentionStatus === 'Fading' || 
            c.retentionStatus === 'Forgotten'
          );
          break;
        case 'Mastered':
          result = result.filter(c => c.status === 'Mastered' || c.completion >= 100);
          break;
        case 'On Hold':
          result = result.filter(c => c.chapterOnHold || c.dppOnHold || c.pyqOnHold);
          break;
      }
    }

    // Sorting
    switch (sortBy) {
      case 'mastery-desc':
        result = [...result].sort((a, b) => (b.completion || 0) - (a.completion || 0));
        break;
      case 'mastery-asc':
        result = [...result].sort((a, b) => (a.completion || 0) - (b.completion || 0));
        break;
      case 'priority':
        result = [...result].sort((a, b) => (a.priority || 2) - (b.priority || 2));
        break;
      case 'time-asc':
        result = [...result].sort((a, b) => (a.estimatedRemainingTime || 0) - (b.estimatedRemainingTime || 0));
        break;
      case 'name-asc':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'default':
      default:
        break;
    }

    return result;
  }, [sortedSubjectChapters, searchQuery, activeFilter, activeUnit, sortBy]);

  const totalCount = subjectChapters.length;
  const masteredCount = subjectChapters.filter(c => c.status === 'Mastered' || c.completion >= 100).length;
  const learningCount = subjectChapters.filter(c => (c.completion > 0 && c.completion < 100) || c.status === 'Learning').length;
  const onHoldCount = subjectChapters.filter(c => c.chapterOnHold).length;
  const unstartedCount = Math.max(0, totalCount - masteredCount - learningCount);

  const subjectProgressPercent = totalCount > 0 
    ? Math.round((masteredCount / totalCount) * 100)
    : 0;

  // Active Recommended Focus Chapter
  const recommendedChapter = useMemo(() => {
    const learningChaps = subjectChapters.filter(c => (c.completion > 0 && c.completion < 100) && !c.chapterOnHold);
    if (learningChaps.length > 0) return learningChaps[0];
    return subjectChapters.find(c => c.completion === 0 && !c.chapterOnHold) || subjectChapters[0];
  }, [subjectChapters]);

  const theme = getSubjectTheme(subjectId);

  // Filter & Sort Options for GlassSelect
  const statusOptions: GlassSelectOption<FilterType>[] = [
    { value: 'All', label: `All Statuses (${totalCount})` },
    { value: 'Learning', label: `In Progress (${learningCount})` },
    { value: 'Mastered', label: `Mastered (${masteredCount})` },
    { value: 'On Hold', label: `On Hold (${onHoldCount})` }
  ];

  const sortOptions: GlassSelectOption<SortType>[] = [
    { value: 'default', label: 'Curriculum (CH01 →)' },
    { value: 'mastery-desc', label: 'Highest Mastery (%)' },
    { value: 'mastery-asc', label: 'Lowest Mastery (%)' },
    { value: 'priority', label: 'JEE Weightage / Priority' },
    { value: 'time-asc', label: 'Time Remaining (Shortest)' },
    { value: 'name-asc', label: 'Alphabetical (A → Z)' }
  ];

  return (
    <div className="space-y-6 pb-12 text-left">
      {/* STREAMLINED HEADER CONTAINER */}
      <div className="p-5 md:p-6 lg:p-7 rounded-2xl border border-zinc-850/80 bg-zinc-950/90 space-y-5 shadow-2xl">
        
        {/* Title & Header Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${theme.bg} ${theme.border}`}>
              <Icon name={subjectIcon as any} className={`w-6 h-6 ${theme.text}`} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                  {subjectTitle}
                </h1>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${theme.badge}`}>
                  {masteredCount}/{totalCount} Mastered ({subjectProgressPercent}%)
                </span>
              </div>
              <p className="text-xs text-zinc-400 max-w-2xl">
                {subjectSubtitle}
              </p>
            </div>
          </div>

          {/* Quick Actions (Add Chapter + View Mode Glider) */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              onClick={() => setIsAddChapterOpen(true)}
              title="Add Custom Chapter"
              className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add Chapter</span>
            </motion.button>

            {/* View Mode Toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950/80 border border-zinc-850 rounded-xl relative select-none">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors cursor-pointer select-none z-10 flex items-center justify-center gap-1.5 ${
                  viewMode === 'list' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {viewMode === 'list' && (
                  <motion.div
                    layoutId={`subjectViewMode_${subjectId}`}
                    className="absolute inset-0 bg-indigo-600/30 border border-indigo-500/40 rounded-lg shadow-sm -z-10"
                    transition={springs.snappy}
                  />
                )}
                <ListFilter className="w-3.5 h-3.5" />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('rpg')}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors cursor-pointer select-none z-10 flex items-center justify-center gap-1.5 ${
                  viewMode === 'rpg' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {viewMode === 'rpg' && (
                  <motion.div
                    layoutId={`subjectViewMode_${subjectId}`}
                    className="absolute inset-0 bg-indigo-600/30 border border-indigo-500/40 rounded-lg shadow-sm -z-10"
                    transition={springs.snappy}
                  />
                )}
                <Network className="w-3.5 h-3.5" />
                <span>Tree</span>
              </button>
            </div>
          </div>
        </div>

        {/* SINGLE CLEAN TOOLBAR: Search + Unit Tabs + Glass Dropdowns */}
        <div className="pt-4 border-t border-zinc-850/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Live Search with Hotkey Glider */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder={`Search ${subjectTitle} chapters or units... (Press '/' or 'F')`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-850 rounded-xl pl-9 pr-10 py-2 text-xs font-mono text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-zinc-500 shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950/80 border border-zinc-800 px-1.5 py-0.5 rounded shadow-sm">/</span>
            </div>
          </div>

          {/* Unit Category Pills */}
          {unitCategories.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar py-0.5 relative">
              {unitCategories.map(unit => {
                const isActive = activeUnit === unit;
                return (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setActiveUnit(unit)}
                    className={`relative px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-colors cursor-pointer select-none z-10 ${
                      isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId={`activeUnitPill_${subjectId}`}
                        className="absolute inset-0 bg-indigo-600/30 border border-indigo-500/40 rounded-xl shadow-sm -z-10"
                        transition={springs.snappy}
                      />
                    )}
                    {unit}
                  </button>
                );
              })}
            </div>
          )}

          {/* Status & Sort Controls with GlassSelect */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Status Dropdown */}
            <GlassSelect
              value={activeFilter}
              onChange={(val) => setActiveFilter(val as FilterType)}
              options={statusOptions}
              icon={<Filter className="w-3.5 h-3.5" />}
            />

            {/* Sort Dropdown */}
            <GlassSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as SortType)}
              options={sortOptions}
              icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {viewMode === 'rpg' ? (
        <AnimatePresence mode="wait">
          <motion.div
            key="rpg-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.16 }}
          >
            <RpgKnowledgeTreeWidget 
              chapters={filteredChapters} 
              allChapters={subjectChapters} 
              subjectId={subjectId} 
              onChapterClick={(id) => actions.openChapterEditModal(id)}
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 text-left items-start">
          
          {/* LEFT COLUMN: 65% width — Chapter Cards */}
          <div className="lg:col-span-8 space-y-3">
            {filteredChapters.length === 0 ? (
              <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-zinc-400 space-y-3 border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/20 text-center">
                <Icon name="SearchX" className="w-8 h-8 sm:w-10 sm:h-10 opacity-30 text-zinc-400" />
                <p className="text-xs font-mono text-zinc-400">No chapters match active filters.</p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveFilter('All'); setActiveUnit('All'); setSortBy('default'); }}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-indigo-400 border border-zinc-850 rounded-xl text-xs font-mono transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div 
                  key={`${activeUnit}_${activeFilter}_${sortBy}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-3"
                >
                  {filteredChapters.map(chapter => (
                    <ChapterCommandCard
                      key={chapter.id}
                      chapter={chapter}
                      data={chapter}
                      onExpand={() => actions.openChapterEditModal(chapter.id)}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* RIGHT COLUMN: 35% width — Strategic Operations Hub */}
          <div className="lg:col-span-4 self-start sticky top-20 space-y-4">
            
            {/* 1. Recommended Next Module Card */}
            {recommendedChapter && (
              <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-xl space-y-3 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-400 uppercase flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    RECOMMENDED NEXT FOCUS
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full font-bold">
                    {recommendedChapter.serialNumber || 'TOP PRIORITY'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-display font-bold text-white tracking-tight leading-snug">
                    {recommendedChapter.name}
                  </h4>
                  <p className="text-xs font-mono text-zinc-400">
                    {recommendedChapter.unit} • Est. {recommendedChapter.estimatedRemainingTime || 4}h remaining
                  </p>
                </div>

                <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-indigo-900/50">
                  <div 
                    className="bg-indigo-500 h-full rounded-full" 
                    style={{ width: `${recommendedChapter.completion || 5}%` }} 
                  />
                </div>

                <div className="pt-1 flex gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    transition={springs.snappy}
                    onClick={() => actions.openChapterEditModal(recommendedChapter.id)}
                    className="flex-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <span>Launch Chapter</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            )}

            {/* 2. Subject Telemetry Radar */}
            <div className="p-5 rounded-2xl border border-zinc-850/80 bg-zinc-950/90 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-850/80 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                    SUBJECT TELEMETRY
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                  {subjectTitle}
                </span>
              </div>

              {/* Mastery Breakdown */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Mastered
                  </span>
                  <span className="text-emerald-400 font-bold">{masteredCount} of {totalCount} ({subjectProgressPercent}%)</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" /> In Progress
                  </span>
                  <span className="text-indigo-400 font-bold">{learningCount} Modules</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-600" /> Unstarted
                  </span>
                  <span className="text-zinc-400 font-bold">{unstartedCount} Modules</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1 border-t border-zinc-850/80">
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden flex border border-zinc-800 p-0.5">
                  <div 
                    style={{ width: `${(masteredCount / (totalCount || 1)) * 100}%` }} 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                  />
                  <div 
                    style={{ width: `${(learningCount / (totalCount || 1)) * 100}%` }} 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" 
                  />
                </div>
              </div>
            </div>

            {/* 3. Quick Action Filter Shortcuts */}
            <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/90 space-y-2.5 shadow-xl">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">
                Quick Shortcuts
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveFilter('Learning')}
                  className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                    activeFilter === 'Learning'
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span className="text-[10px] uppercase text-zinc-500">Active</span>
                  <span className="font-bold text-white mt-0.5">{learningCount} Studying</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('Mastered')}
                  className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                    activeFilter === 'Mastered'
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span className="text-[10px] uppercase text-zinc-500">Locked</span>
                  <span className="font-bold text-white mt-0.5">{masteredCount} Mastered</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      <AddCustomChapterModal
        isOpen={isAddChapterOpen}
        onClose={() => setIsAddChapterOpen(false)}
        defaultSubject={subjectId}
        defaultUnit={activeUnit !== 'All' ? activeUnit : undefined}
      />
    </div>
  );
}
