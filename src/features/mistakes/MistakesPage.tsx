import React, { useState, useMemo } from 'react';
import { useStudyBrain } from '@/context/StudyBrainContext';
import { SubjectId, Mistake } from '@/types/index';
import { Icon } from '@/components/ui/Icon';
import { MistakeFilterToolbar } from './components/MistakeFilterToolbar';
import { MistakeCard } from './components/MistakeCard';
import { LogMistakeModal } from './components/LogMistakeModal';
import { BatchReviewModal } from './components/BatchReviewModal';
import { MistakesStatsWidget } from './components/MistakesStatsWidget';
import { ErrorHeatmapWidget } from './components/ErrorHeatmapWidget';
import { AiInterrogationModal } from './components/AiInterrogationModal';
import { MistakeTestModal } from './components/MistakeTestModal';

export const MISTAKE_CATEGORIES = [
  'Conceptual Error',
  'Formula Recall',
  'Calculation Error',
  'Sign Mistake',
  'Units Error',
  'Diagram Interpretation',
  'Misread Question',
  'Time Pressure',
  'Guess',
  'Silly Mistake',
  'Incomplete Knowledge',
  'Wrong Approach',
  'Incorrect Assumption'
];

export function MistakesPage() {
  const { state, actions } = useStudyBrain();

  // Filters & State
  const [activeSubject, setActiveSubject] = useState<SubjectId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isBatchReviewOpen, setIsBatchReviewOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [reSolvingMistake, setReSolvingMistake] = useState<Mistake | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interrogationMistake, setInterrogationMistake] = useState<Mistake | null>(null);

  const getSubjectColor = (sub: SubjectId) => {
    switch (sub) {
      case 'physics': return { text: 'text-blue-400', bg: 'bg-blue-950/30', border: 'border-blue-900/50', badge: 'bg-blue-950 text-blue-400 border-blue-900' };
      case 'chemistry': return { text: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-900/50', badge: 'bg-amber-950 text-amber-400 border-amber-900' };
      case 'maths': return { text: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-900/50', badge: 'bg-emerald-950 text-emerald-400 border-emerald-900' };
      default: return { text: 'text-zinc-400', bg: 'bg-zinc-900/50', border: 'border-zinc-800', badge: 'bg-zinc-900 text-zinc-400 border-zinc-800' };
    }
  };

  const getStatusBadge = (status: Mistake['revisionStatus']): { label: string; style: 'destructive' | 'accent' | 'default' | 'success' } => {
    switch (status) {
      case 'New': return { label: 'Needs Review', style: 'destructive' };
      case 'Reviewed': return { label: 'Reviewed', style: 'accent' };
      case 'Solved Again': return { label: 'Solved Again', style: 'default' };
      case 'Mastered': return { label: 'Mastered', style: 'success' };
      default: return { label: status, style: 'default' };
    }
  };

  const mistakes = state.mistakes || [];

  // Filtered Mistakes
  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      if (activeSubject !== 'all' && m.subject !== activeSubject) return false;
      if (selectedTag !== 'all' && !m.mistakeTypes?.includes(selectedTag)) return false;
      if (selectedDifficulty !== 'all' && m.difficulty !== selectedDifficulty) return false;
      if (statusFilter === 'unresolved' && m.revisionStatus === 'Mastered') return false;
      if (statusFilter === 'resolved' && m.revisionStatus !== 'Mastered') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inQuestion = m.questionText?.toLowerCase().includes(q);
        const inChapter = m.chapter?.toLowerCase().includes(q);
        const inTopic = m.topic?.toLowerCase().includes(q);
        if (!inQuestion && !inChapter && !inTopic) return false;
      }
      return true;
    });
  }, [mistakes, activeSubject, selectedTag, selectedDifficulty, statusFilter, searchQuery]);

  const totalMistakes = mistakes.length;
  const unresolvedCount = mistakes.filter(m => m.revisionStatus !== 'Mastered').length;
  const resolvedCount = mistakes.filter(m => m.revisionStatus === 'Mastered').length;
  const resolutionRate = totalMistakes > 0 ? Math.round((resolvedCount / totalMistakes) * 100) : 100;

  return (
    <div className="space-y-8 max-w-6xl mx-auto text-left relative pb-12 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            <Icon name="AlertTriangle" className="w-3.5 h-3.5" />
            <span>Mistake Intelligence & Error Vault</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
            Error Log & Root-Cause Cockpit
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Classify silly mistakes vs conceptual gaps. Re-solve logged errors to raise your JEE precision and eliminate repeat mistakes in tests.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2.5 shrink-0 font-mono text-xs">
          <button
            onClick={() => setIsBatchReviewOpen(true)}
            disabled={unresolvedCount === 0}
            className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-zinc-200 py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold"
          >
            <Icon name="RotateCcw" className="w-3.5 h-3.5 text-indigo-400" />
            <span>Batch Retest ({unresolvedCount})</span>
          </button>
          
          <button
            onClick={() => setIsTestModalOpen(true)}
            disabled={unresolvedCount === 0}
            className="bg-indigo-900/40 hover:bg-indigo-800/60 disabled:opacity-40 border border-indigo-500/30 text-indigo-200 py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold"
          >
            <Icon name="Target" className="w-3.5 h-3.5 text-indigo-400" />
            <span>Test My Mistakes</span>
          </button>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold shadow-lg shadow-indigo-600/30"
          >
            <Icon name="Plus" className="w-4 h-4" />
            <span>Log New Mistake</span>
          </button>
        </div>
      </div>

      {/* Top 3 Stat Cards */}
      <MistakesStatsWidget
        totalMistakes={totalMistakes}
        unresolvedCount={unresolvedCount}
        resolvedCount={resolvedCount}
        resolutionRate={resolutionRate}
      />

      {/* ERROR ROOT CAUSE HEATMAP */}
      <ErrorHeatmapWidget
        mistakes={mistakes}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
      />

      {/* FILTER TOOLBAR */}
      <MistakeFilterToolbar
        activeSubject={activeSubject}
        setActiveSubject={setActiveSubject}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* MISTAKES GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>Showing {filteredMistakes.length} mistakes</span>
          {selectedTag !== 'all' && (
            <button onClick={() => setSelectedTag('all')} className="text-indigo-400 hover:underline cursor-pointer">
              Clear tag filter ({selectedTag})
            </button>
          )}
        </div>

        {filteredMistakes.length === 0 ? (
          <div className="p-12 text-center bg-zinc-950/40 border border-zinc-850 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <Icon name="CheckCircle" className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-display font-bold text-white">No Mistakes Found</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              No logged errors match the selected filters. Click 'Log New Mistake' to record a new problem.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMistakes.map(m => (
              <MistakeCard
                key={m.id}
                item={m}
                isExpanded={expandedId === m.id}
                onToggleExpand={setExpandedId}
                getSubjectColor={getSubjectColor}
                getStatusBadge={getStatusBadge}
                onUpdateStatus={(id, status) => actions.updateMistakeStatus(id, status)}
                onPinToPlanner={(item) => console.log('Pin to planner', item)}
                onDelete={(id) => actions.deleteMistake(id)}
                onPracticeWithAI={() => {
                  setInterrogationMistake(m);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <LogMistakeModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        categories={MISTAKE_CATEGORIES}
      />

      <BatchReviewModal
        isOpen={isBatchReviewOpen}
        activeMistakes={filteredMistakes.filter(m => m.revisionStatus !== 'Mastered')}
        onClose={() => setIsBatchReviewOpen(false)}
        getSubjectColor={getSubjectColor}
        triggerToast={(msg) => console.log(msg)}
        onUpdateStatus={(id, status) => actions.updateMistakeStatus(id, status)}
      />

      <AiInterrogationModal
        isOpen={!!interrogationMistake}
        onClose={() => setInterrogationMistake(null)}
        mistake={interrogationMistake}
      />

      <MistakeTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        mistakes={mistakes}
      />

    </div>
  );
}
