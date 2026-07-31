import React, { useState, useMemo, useEffect } from 'react';
import { SubjectId } from '../../../types/index';
import { useStudyBrain } from '../../../context/StudyBrainContext';
import { ChapterTelemetry } from '../../../engines/chapterInfo';
import { ChapterCommandCard } from './ChapterCommandCard';
import { Icon } from '../../../components/ui/Icon';
import { Search, Sparkles, Play, Filter, CheckCircle2 } from 'lucide-react';
import { SubjectExpandedView } from './SubjectExpandedView';
import { AddCustomChapterModal } from './AddCustomChapterModal';
import { RpgKnowledgeTreeWidget } from './RpgKnowledgeTreeWidget';
import { Network } from 'lucide-react';

interface SubjectCommandCenterProps {
  subjectId: SubjectId;
  subjectTitle: string;
  subjectSubtitle: string;
  subjectIcon: string;
  unitCategories?: string[];
  onNavigate?: (page: string) => void;
}

type FilterType = 'All' | 'Learning' | 'Revision Due' | 'Mastered';

export function SubjectCommandCenter({
  subjectId,
  subjectTitle,
  subjectSubtitle,
  subjectIcon,
  unitCategories = ['All'],
  onNavigate
}: SubjectCommandCenterProps) {
  const { state, actions } = useStudyBrain();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [activeUnit, setActiveUnit] = useState<string>('All');
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'rpg'>(() => {
    return (localStorage.getItem('syllabusViewMode') as 'list' | 'rpg') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('syllabusViewMode', viewMode);
  }, [viewMode]);

  // Subject specific chapters
  const subjectChapters = useMemo(() => {
    return state.chapters.filter(c => c.subject === subjectId);
  }, [state.chapters, subjectId]);

  // Sort chapters by serial number if available, otherwise by ID numerical value
  const sortedSubjectChapters = useMemo(() => {
    return [...subjectChapters].sort((a, b) => {
      // If both have serial numbers, sort by numeric part of serial number
      if (a.serialNumber && b.serialNumber) {
        const numA = parseInt(a.serialNumber.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.serialNumber.replace(/\D/g, ''), 10) || 0;
        // Pad with leading zeros for proper string comparison
        const strA = numA.toString().padStart(2, '0');
        const strB = numB.toString().padStart(2, '0');
        return strA.localeCompare(strB);
      }
      // If only one has serial number, prioritize it
      if (a.serialNumber) return -1;
      if (b.serialNumber) return 1;
      // Otherwise, fall back to numerical ID sorting
      const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [subjectChapters]);

  // Filter & Search Logic
  const filteredChapters = useMemo(() => {
    let result = sortedSubjectChapters;

    // Unit filter
    if (activeUnit !== 'All' && activeUnit !== 'All Units') {
      result = result.filter(c => c.unit === activeUnit);
    }

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.unit.toLowerCase().includes(q));
    }

    // Status filter chips
    if (activeFilter !== 'All') {
      switch (activeFilter) {
        case 'Learning':
          result = result.filter(c => c.completion > 0 && c.completion < 100);
          break;
        case 'Revision Due':
          result = result.filter(c => c.status === 'Revision Due');
          break;
        case 'Mastered':
          result = result.filter(c => c.status === 'Mastered' || c.completion >= 100);
          break;
      }
    }

    return result;
  }, [sortedSubjectChapters, searchQuery, activeFilter, activeUnit]);

  // Subject Stats Computation via state.chapterTelemetryMap
  const subjectTelemetryList = useMemo(() => {
    return (Object.values(state.chapterTelemetryMap || {}) as ChapterTelemetry[]).filter(t => t && t.subject === subjectId);
  }, [state.chapterTelemetryMap, subjectId]);

  const totalCount = subjectTelemetryList.length || subjectChapters.length;
  const masteredCount = subjectTelemetryList.filter(t => t.syllabusStage === 'Mastered').length;
  const learningCount = subjectTelemetryList.filter(t => t.syllabusStage === 'In Progress').length;
  const unstartedCount = subjectTelemetryList.filter(t => t.syllabusStage === 'Not Started').length;
  const subjectProgressPercent = totalCount > 0 
    ? Math.round(subjectTelemetryList.reduce((acc, t) => acc + (t.strategyRadar.theoryCompletionPercent || 0), 0) / totalCount) 
    : 0;

  // Focus chapter
  const focusChapter = useMemo(() => {
    const learningChaps = subjectChapters.filter(c => c.completion > 0 && c.completion < 100);
    if (learningChaps.length > 0) return learningChaps[0];
    return subjectChapters.find(c => c.completion < 100) || subjectChapters[0];
  }, [subjectChapters]);

  const handleLaunchFocusCockpit = () => {
    if (focusChapter) {
      actions.setRadarFocusedChapter(focusChapter.id);
      actions.setActiveSubject(focusChapter.subject);
      actions.setMissionModeActive(true);
      if (onNavigate) {
        onNavigate('dashboard');
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* STREAMLINED HEADER & SEARCH BAR CONTAINER */}
      {!expandedChapterId && (
        <div className="p-4 md:p-6 lg:p-7 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl space-y-4 md:space-y-5 text-left">
          
          {/* Title & Stats Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Icon name={subjectIcon as any} className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-white tracking-tight">
                    {subjectTitle}
                  </h1>
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                    {masteredCount}/{totalCount} Mastered ({subjectProgressPercent}%)
                  </span>
                </div>
                <p className="text-xs text-zinc-400 max-w-xl truncate">
                  {subjectSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* SINGLE CLEAN TOOLBAR: Search + Unit Tabs + Status Dropdown */}
          <div className="pt-3 border-t border-zinc-900/80 flex flex-col gap-3">
            
            {/* Live Search */}
            <div className="relative w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder={`Search ${subjectTitle}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsAddChapterOpen(true)}
                title="Add Custom Chapter"
                className="flex-shrink-0 flex items-center gap-1 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-xl px-3 py-2 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                <Icon name="Plus" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Chapter</span>
              </button>
            </div>

            {/* Unit Pills and Status Filter */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {unitCategories.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar py-0.5">
                  {unitCategories.map(unit => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setActiveUnit(unit)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        activeUnit === unit
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-zinc-900/60 text-zinc-400 border border-zinc-850 hover:text-zinc-200'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              )}

              {/* Status Dropdown Filter */}
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as FilterType)}
                  className="bg-[#0d0e12] border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                </select>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-900/50">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Layout View:</span>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-md transition-all ${
                    viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('rpg')}
                  className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-md transition-all flex items-center gap-1.5 ${
                    viewMode === 'rpg' ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.3)]' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Network className="w-3 h-3" />
                  Knowledge Tree
                </button>
              </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {viewMode === 'rpg' && !expandedChapterId ? (
        <RpgKnowledgeTreeWidget 
          chapters={filteredChapters} 
          allChapters={subjectChapters} 
          subjectId={subjectId} 
          onChapterClick={(id) => setExpandedChapterId(id)}
        />
      ) : expandedChapterId ? (
        <div className="flex-grow overflow-hidden flex flex-col">
          <SubjectExpandedView 
            chapterId={expandedChapterId} 
            onClose={() => setExpandedChapterId(null)} 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 text-left items-start">
          
          {/* LEFT COLUMN: 65% width — Chapter Cards */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-3">
            {filteredChapters.length === 0 ? (
              <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-zinc-500 space-y-3 border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/20 text-center">
                <Icon name="SearchX" className="w-8 h-8 sm:w-10 sm:h-10 opacity-30 text-zinc-400" />
                <p className="text-xs font-mono text-zinc-400">No chapters match active filters.</p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveFilter('All'); setActiveUnit('All'); }}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-indigo-400 border border-zinc-800 rounded-xl text-xs font-mono transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredChapters.map(chapter => (
                <ChapterCommandCard
                  key={chapter.id}
                  chapter={chapter}
                  data={chapter}
                  onExpand={() => setExpandedChapterId(chapter.id)}
                  onNavigate={onNavigate}
                />
              ))
            )}
          </div>

          {/* RIGHT COLUMN: 35% width — Telemetry Sidebar */}
          <div className="lg:col-span-5 xl:col-span-5 self-start sticky top-6 space-y-4">
            
            <div className="p-4 md:p-5 lg:p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl space-y-4">
              
              <div className="flex items-center justify-between border-b border-zinc-900/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase">
                    SUBJECT TELEMETRY RADAR
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  {subjectTitle.toUpperCase()}
                </span>
              </div>

              {/* Mastery Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Mastered Modules</span>
                  <span className="text-emerald-400 font-bold">{masteredCount} ({Math.round((masteredCount / (totalCount || 1)) * 100)}%)</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">In-Progress Modules</span>
                  <span className="text-indigo-400 font-bold">{learningCount} ({Math.round((learningCount / (totalCount || 1)) * 100)}%)</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Unstarted Modules</span>
                  <span className="text-zinc-500 font-bold">{unstartedCount} ({Math.round((unstartedCount / (totalCount || 1)) * 100)}%)</span>
                </div>
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
