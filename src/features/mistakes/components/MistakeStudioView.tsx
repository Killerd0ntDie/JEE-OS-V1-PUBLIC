import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, BookOpen, RotateCcw, Sparkles, Printer, Plus,
  CheckCircle2, XCircle, ChevronRight, Clock, AlertTriangle,
  Brain, Trash2, Check, ArrowRight, Eye, Calendar, Tag, ShieldAlert,
  Layers, ChevronDown, CheckSquare, Square
} from 'lucide-react';
import { Mistake, SubjectId } from '@/types/index';
import { RichTextRenderer } from '@/components/MathRenderer';
import { springs } from '@/constants/motion';
import { MISTAKE_CATEGORIES } from '../MistakesPage';
import { Modal } from '@/components/ui/Modal';

export interface MistakeStudioViewProps {
  mistakes: Mistake[];
  filteredMistakes: Mistake[];
  activeSubject: SubjectId | 'all';
  setActiveSubject: (sub: SubjectId | 'all') => void;
  statusFilter: 'all' | 'unresolved' | 'due' | 'mastered';
  setStatusFilter: (st: 'all' | 'unresolved' | 'due' | 'mastered') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
  selectedDifficulty: string;
  setSelectedDifficulty: (diff: string) => void;
  selectedSource: string;
  setSelectedSource: (src: string) => void;
  availableSources: string[];
  dueCount: number;
  leitnerBoxes: { box1: number; box2: number; box3: number; mastered: number };
  selectedIds: Set<string>;
  toggleSelectId: (id: string) => void;
  selectAllFiltered: () => void;
  clearSelection: () => void;
  onOpenLogModal: () => void;
  onOpenPrintModal: () => void;
  onStartCbtRetest: (subset?: Mistake[]) => void;
  onStartRemediation: (mistake: Mistake) => void;
  onStartInterrogation: (mistake: Mistake) => void;
  onUpdateStatus: (id: string, status: Mistake['revisionStatus']) => void;
  onDeleteMistake: (id: string) => void;
  getSubjectColor: (sub: SubjectId) => { text: string; bg: string; border: string; badge: string };
  getStatusBadge: (status: Mistake['revisionStatus']) => { label: string; style: 'destructive' | 'accent' | 'default' | 'success' };
}

export const MistakeStudioView: React.FC<MistakeStudioViewProps> = ({
  mistakes,
  filteredMistakes,
  activeSubject,
  setActiveSubject,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  selectedTag,
  setSelectedTag,
  selectedDifficulty,
  setSelectedDifficulty,
  selectedSource,
  setSelectedSource,
  availableSources,
  dueCount,
  leitnerBoxes,
  selectedIds,
  toggleSelectId,
  selectAllFiltered,
  clearSelection,
  onOpenLogModal,
  onOpenPrintModal,
  onStartCbtRetest,
  onStartRemediation,
  onStartInterrogation,
  onUpdateStatus,
  onDeleteMistake,
  getSubjectColor,
  getStatusBadge
}) => {
  const [inspectedMistake, setInspectedMistake] = useState<Mistake | null>(null);

  const selectedSubset = mistakes.filter(m => selectedIds.has(m.id));

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* 1. LEITNER SPACED RETENTION PROGRESSION BAR */}
      <div className="bg-[#101116] border border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              Leitner Spaced Repetition Cadence
            </span>
          </div>

          <div className="flex items-center gap-2">
            {dueCount > 0 && (
              <button
                onClick={() => setStatusFilter(statusFilter === 'due' ? 'all' : 'due')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  statusFilter === 'due'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{dueCount} Due For Re-Solve Today</span>
              </button>
            )}
            
            <button
              onClick={() => onStartCbtRetest()}
              disabled={filteredMistakes.length === 0}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-40 text-red-300 border border-red-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
              <span>Retest All Filtered ({filteredMistakes.length})</span>
            </button>
          </div>
        </div>

        {/* 4 Leitner Boxes Visual Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div 
            onClick={() => setStatusFilter('all')}
            className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">Box 1 (Day 1)</span>
            <div className="text-xl font-mono font-bold text-rose-400">{leitnerBoxes.box1}</div>
            <span className="text-[10px] text-zinc-500 font-mono">Immediate Errors</span>
          </div>

          <div 
            onClick={() => setStatusFilter('all')}
            className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">Box 2 (Day 3)</span>
            <div className="text-xl font-mono font-bold text-amber-400">{leitnerBoxes.box2}</div>
            <span className="text-[10px] text-zinc-500 font-mono">Short Retention</span>
          </div>

          <div 
            onClick={() => setStatusFilter('all')}
            className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">Box 3 (Day 7)</span>
            <div className="text-xl font-mono font-bold text-indigo-400">{leitnerBoxes.box3}</div>
            <span className="text-[10px] text-zinc-500 font-mono">Consolidating</span>
          </div>

          <div 
            onClick={() => setStatusFilter('mastered')}
            className="p-3 rounded-xl bg-zinc-950/60 border border-emerald-900/40 hover:border-emerald-800 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-mono text-emerald-400 block uppercase">Mastered</span>
            <div className="text-xl font-mono font-bold text-emerald-400">{leitnerBoxes.mastered}</div>
            <span className="text-[10px] text-emerald-600 font-mono">Permanent Recall</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH COMMAND CONTROL BAR */}
      <div className="space-y-3 bg-[#101116] border border-zinc-800/90 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Subject Switcher */}
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-1 bg-zinc-900/90 border border-zinc-800/90 p-1 rounded-xl text-xs font-mono shrink-0">
            {(['all', 'physics', 'chemistry', 'maths'] as const).map(sub => {
              const isActive = activeSubject === sub;
              const count = sub === 'all' 
                ? mistakes.length 
                : mistakes.filter(m => m.subject === sub).length;

              return (
                <button
                  key={sub}
                  onClick={() => setActiveSubject(sub)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer select-none text-[11px] capitalize shrink-0 ${
                    isActive
                      ? sub === 'physics' ? 'bg-sky-600 text-white shadow-sm' :
                        sub === 'chemistry' ? 'bg-emerald-600 text-white shadow-sm' :
                        sub === 'maths' ? 'bg-amber-600 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <span>{sub}</span>
                  <span className="ml-1 text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenLogModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Error</span>
            </button>

            <button
              onClick={onOpenPrintModal}
              disabled={filteredMistakes.length === 0}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print Authentic A4 Worksheet"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>Desk Worksheet</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search + Filter Pills */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question, chapter, topic, or source..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 font-mono"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 font-mono cursor-pointer"
            >
              <option value="all">Status: All Errors ({mistakes.length})</option>
              <option value="due">Status: Due for Re-Solve ({dueCount})</option>
              <option value="unresolved">Status: Unresolved Only</option>
              <option value="mastered">Status: Mastered Only ({leitnerBoxes.mastered})</option>
            </select>
          </div>

          {/* Trap / Error Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 font-mono cursor-pointer"
            >
              <option value="all">Trap Type: All Categories</option>
              {MISTAKE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Exam Source Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 font-mono cursor-pointer truncate"
            >
              <option value="all">Source: All Mocks</option>
              {availableSources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Selection Bar (when items selected) */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-xs font-mono"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-indigo-300">{selectedIds.size} Selected</span>
              <button
                onClick={clearSelection}
                className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onStartCbtRetest(selectedSubset)}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
              >
                Retest Selected ({selectedIds.size})
              </button>
              <button
                onClick={() => {
                  selectedIds.forEach(id => onUpdateStatus(id, 'Mastered'));
                  clearSelection();
                }}
                className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold cursor-pointer"
              >
                Mark Mastered
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* 3. MAIN CARDS DIRECTORY & INSPECTION SPLIT */}
      <div className="space-y-4">
        <div className="flex items-center justify-between font-mono text-xs text-zinc-400 px-1">
          <div className="flex items-center gap-2">
            <span>Showing {filteredMistakes.length} errors</span>
            {filteredMistakes.length > 0 && (
              <button
                onClick={selectedIds.size === filteredMistakes.length ? clearSelection : selectAllFiltered}
                className="text-[11px] text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                {selectedIds.size === filteredMistakes.length ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                <span>{selectedIds.size === filteredMistakes.length ? 'Deselect All' : 'Select All'}</span>
              </button>
            )}
          </div>
        </div>

        {filteredMistakes.length === 0 ? (
          <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-16 text-center space-y-4 shadow-xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-display font-bold text-white">No Errors Found in Current View</h3>
              <p className="text-xs font-mono text-zinc-400 max-w-md mx-auto">
                All questions matching your filter have been mastered, or no mistakes have been recorded yet.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setActiveSubject('all');
                  setSearchQuery('');
                  setSelectedTag('all');
                  setSelectedSource('all');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                onClick={onOpenLogModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold cursor-pointer shadow-md"
              >
                Log New Error
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredMistakes.map((mistake, idx) => {
              const subTheme = getSubjectColor(mistake.subject);
              const statusBadge = getStatusBadge(mistake.revisionStatus);
              const isSelected = selectedIds.has(mistake.id);
              const isMastered = mistake.revisionStatus === 'Mastered';

              return (
                <div
                  key={mistake.id}
                  className={`bg-[#101116] border transition-all rounded-2xl p-4 sm:p-5 space-y-3.5 relative overflow-hidden shadow-md ${
                    isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/30 bg-indigo-950/10' :
                    isMastered ? 'border-emerald-950/80 opacity-75 hover:opacity-100 hover:border-emerald-800/50' :
                    'border-zinc-800/90 hover:border-zinc-700/90'
                  }`}
                >
                  {/* Card Header: Checkbox + Badges + Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <button
                        onClick={() => toggleSelectId(mistake.id)}
                        className="text-zinc-500 hover:text-white cursor-pointer"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
                      </button>

                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${subTheme.badge}`}>
                        {mistake.subject}
                      </span>

                      <span className="text-xs font-display font-bold text-white truncate max-w-[200px]">
                        {mistake.chapter}
                      </span>

                      {mistake.topic && mistake.topic !== mistake.chapter && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[150px]">
                            {mistake.topic}
                          </span>
                        </>
                      )}

                      {mistake.source && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md truncate max-w-[160px]">
                          {mistake.source}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                        statusBadge.style === 'destructive' ? 'bg-rose-950/40 border-rose-800/40 text-rose-300' :
                        statusBadge.style === 'accent' ? 'bg-amber-950/40 border-amber-800/40 text-amber-300' :
                        statusBadge.style === 'success' ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300' :
                        'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}>
                        {statusBadge.label}
                      </span>

                      {mistake.mistakeTypes && mistake.mistakeTypes.length > 0 && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {mistake.mistakeTypes[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Statement Preview with Math */}
                  <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed max-h-24 overflow-hidden relative font-sans">
                    <RichTextRenderer content={mistake.questionText} />
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#101116] to-transparent pointer-events-none" />
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-2 border-t border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>Logged: {new Date(mistake.dateLogged).toLocaleDateString()}</span>
                      {mistake.timeTaken > 0 && (
                        <>
                          <span>•</span>
                          <span>Time: {mistake.timeTaken}m</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onStartInterrogation(mistake)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Start Socratic AI Interrogation"
                      >
                        <Brain className="w-3 h-3 text-indigo-400" />
                        <span>AI Autopsy</span>
                      </button>

                      <button
                        onClick={() => onStartRemediation(mistake)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Step-by-Step Remediation Lab"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Remediate</span>
                      </button>

                      <button
                        onClick={() => setInspectedMistake(mistake)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-zinc-400" />
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => onDeleteMistake(mistake.id)}
                        className="p-1 rounded-lg bg-zinc-900 hover:bg-rose-950/50 hover:text-rose-400 text-zinc-600 border border-zinc-800 transition-all cursor-pointer"
                        title="Delete Mistake"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SLIDE-OUT INSPECTION DRAWER MODAL */}
      <Modal
        isOpen={!!inspectedMistake}
        onClose={() => setInspectedMistake(null)}
        zIndex={100010}
        backdropClassName="bg-black/35 backdrop-blur-sm"
        className="w-full max-w-3xl bg-[#0e0f14] border border-zinc-800 rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-left my-auto"
      >
        {inspectedMistake && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/90 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${getSubjectColor(inspectedMistake.subject).badge}`}>
                  {inspectedMistake.subject}
                </span>
                <h3 className="text-sm font-display font-bold text-white truncate max-w-md">
                  {inspectedMistake.chapter} • {inspectedMistake.topic || 'General'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setInspectedMistake(null)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-zinc-200 text-xs sm:text-sm font-sans custom-scrollbar flex-1">
              
              {/* Question Statement */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-zinc-400">Problem Statement</span>
                <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-850 leading-relaxed overflow-x-auto">
                  <RichTextRenderer content={inspectedMistake.questionText} />
                </div>
              </div>

              {/* Comparison: Student Submission vs Official Key */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 space-y-1.5">
                  <span className="text-[11px] font-mono font-bold uppercase text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    <span>Your Submission / Method</span>
                  </span>
                  <div className="text-xs font-mono text-rose-200 break-words leading-relaxed">
                    <RichTextRenderer content={inspectedMistake.studentMethod || 'No submission recorded'} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 space-y-1.5">
                  <span className="text-[11px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Official Solution / Key</span>
                  </span>
                  <div className="text-xs font-mono text-emerald-200 break-words leading-relaxed">
                    <RichTextRenderer content={inspectedMistake.correctSolution || 'See explanation below'} />
                  </div>
                </div>
              </div>

              {/* Step-by-Step Derivation */}
              {inspectedMistake.correctMethod && (
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase text-zinc-400">Analytical Solution Derivation</span>
                  <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-850 leading-relaxed overflow-x-auto font-mono text-xs">
                    <RichTextRenderer content={inspectedMistake.correctMethod} />
                  </div>
                </div>
              )}

              {/* Personal / Teacher Notes */}
              {(inspectedMistake.personalNotes || inspectedMistake.teacherNotes) && (
                <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 space-y-1.5">
                  <span className="text-[11px] font-mono font-bold uppercase text-indigo-400">Diagnostic Notes</span>
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    <RichTextRenderer content={inspectedMistake.personalNotes || inspectedMistake.teacherNotes} />
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-zinc-400">Set Cadence:</span>
                {(['New', 'Reviewed', 'Solved Again', 'Mastered'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      onUpdateStatus(inspectedMistake.id, st);
                      setInspectedMistake(prev => prev ? { ...prev, revisionStatus: st } : null);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      inspectedMistake.revisionStatus === st
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const m = inspectedMistake;
                    setInspectedMistake(null);
                    onStartInterrogation(m);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>AI Socratic Autopsy</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const m = inspectedMistake;
                    setInspectedMistake(null);
                    onStartRemediation(m);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Remediation Lab</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
