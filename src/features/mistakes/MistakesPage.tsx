import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { MistakeFilterToolbar } from './components/MistakeFilterToolbar';
import { MistakeCard } from './components/MistakeCard';
import { LogMistakeModal } from './components/LogMistakeModal';
import { BatchReviewModal } from './components/BatchReviewModal';
import { MistakesStatsWidget } from './components/MistakesStatsWidget';
import { ErrorHeatmapWidget } from './components/ErrorHeatmapWidget';
import { AiInterrogationModal } from './components/AiInterrogationModal';
import { MistakeTestModal } from './components/MistakeTestModal';
import { useMistakesState } from './hooks/useMistakesState';

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
  const { state, handlers, actions } = useMistakesState();

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
            onClick={() => handlers.setIsBatchReviewOpen(true)}
            disabled={state.unresolvedCount === 0}
            className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-zinc-200 py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold"
          >
            <Icon name="RotateCcw" className="w-3.5 h-3.5 text-indigo-400" />
            <span>Batch Retest ({state.unresolvedCount})</span>
          </button>
          
          <button
            onClick={() => handlers.setIsTestModalOpen(true)}
            disabled={state.unresolvedCount === 0}
            className="bg-indigo-900/40 hover:bg-indigo-800/60 disabled:opacity-40 border border-indigo-500/30 text-indigo-200 py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold"
          >
            <Icon name="Target" className="w-3.5 h-3.5 text-indigo-400" />
            <span>Test My Mistakes</span>
          </button>

          <button
            onClick={() => handlers.setIsLogModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold shadow-lg shadow-indigo-600/30"
          >
            <Icon name="Plus" className="w-4 h-4" />
            <span>Log New Mistake</span>
          </button>
        </div>
      </div>

      {/* Top 3 Stat Cards */}
      <MistakesStatsWidget
        totalMistakes={state.totalMistakes}
        unresolvedCount={state.unresolvedCount}
        resolvedCount={state.resolvedCount}
        resolutionRate={state.resolutionRate}
      />

      {/* ERROR ROOT CAUSE HEATMAP */}
      <ErrorHeatmapWidget
        mistakes={state.mistakes}
        selectedTag={state.selectedTag}
        setSelectedTag={handlers.setSelectedTag}
      />

      {/* FILTER TOOLBAR */}
      <MistakeFilterToolbar
        activeSubject={state.activeSubject}
        setActiveSubject={handlers.setActiveSubject}
        statusFilter={state.statusFilter}
        setStatusFilter={handlers.setStatusFilter}
        searchQuery={state.searchQuery}
        setSearchQuery={handlers.setSearchQuery}
      />

      {/* MISTAKES GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>Showing {state.filteredMistakes.length} mistakes</span>
          {state.selectedTag !== 'all' && (
            <button onClick={() => handlers.setSelectedTag('all')} className="text-indigo-400 hover:underline cursor-pointer">
              Clear tag filter ({state.selectedTag})
            </button>
          )}
        </div>

        {state.filteredMistakes.length === 0 ? (
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
            {state.filteredMistakes.map(m => (
              <MistakeCard
                key={m.id}
                item={m}
                isExpanded={state.expandedId === m.id}
                onToggleExpand={handlers.setExpandedId}
                getSubjectColor={handlers.getSubjectColor}
                getStatusBadge={handlers.getStatusBadge}
                onUpdateStatus={(id, status) => actions.updateMistakeStatus(id, status)}
                onPinToPlanner={async (item) => {
                  await actions.addCustomMission({
                    subject: item.subject,
                    chapter: item.chapter,
                    type: 'Review Mistakes',
                    taskName: `Fix Mistake: ${item.topic || item.chapter}`,
                    duration: 25,
                    xp: 50,
                    priorityScore: 90
                  });
                  window.dispatchEvent(new CustomEvent('global-toast', {
                    detail: { message: `Pinned mistake revision for "${item.chapter}" to daily planner!`, type: 'success' }
                  }));
                }}
                onDelete={(id) => actions.deleteMistake(id)}
                onPracticeWithAI={() => {
                  handlers.setInterrogationMistake(m);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <LogMistakeModal
        isOpen={state.isLogModalOpen}
        onClose={() => handlers.setIsLogModalOpen(false)}
        categories={MISTAKE_CATEGORIES}
      />

      <BatchReviewModal
        isOpen={state.isBatchReviewOpen}
        activeMistakes={state.filteredMistakes.filter(m => m.revisionStatus !== 'Mastered')}
        onClose={() => handlers.setIsBatchReviewOpen(false)}
        getSubjectColor={handlers.getSubjectColor}
        triggerToast={(msg) => console.log(msg)}
        onUpdateStatus={(id, status) => actions.updateMistakeStatus(id, status)}
      />

      <AiInterrogationModal
        isOpen={!!state.interrogationMistake}
        onClose={() => handlers.setInterrogationMistake(null)}
        mistake={state.interrogationMistake}
      />

      <MistakeTestModal
        isOpen={state.isTestModalOpen}
        onClose={() => handlers.setIsTestModalOpen(false)}
        mistakes={state.mistakes}
      />

    </div>
  );
}
