import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, RotateCcw, ArrowRight, Printer, Target, Plus,
  Sparkles, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { MistakesAutopsyHero } from './components/MistakesAutopsyHero';
import { MistakeStudioView } from './components/MistakeStudioView';
import { MistakeRemediationLab } from './components/MistakeRemediationLab';
import { MistakesCbtTestArena } from './components/MistakesCbtTestArena';
import { LogMistakeModal } from './components/LogMistakeModal';
import { AiInterrogationModal } from './components/AiInterrogationModal';
import { PrintableWorksheetModal } from '../revision/components/PrintableWorksheetModal';
import { useMistakesState } from './hooks/useMistakesState';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { Mistake } from '@/types/index';

export const MISTAKE_CATEGORIES = [
  'Conceptual Gap',
  'Calculation Slip',
  'Formula Recall',
  'Sign / Negative Error',
  'Units / Dimension Error',
  'Misread Question',
  'Trap Option Selected',
  'Time Pressure Rush',
  'Incomplete Derivation',
  'Diagram Misinterpretation'
];

export function MistakesPage() {
  const { state, handlers, actions } = useMistakesState();
  const chapters = useStudyBrainStore(s => s.chapters) || [];

  // Active question selected for remediation
  const [remediationTarget, setRemediationTarget] = useState<Mistake | null>(null);
  const [cbtSubset, setCbtSubset] = useState<Mistake[] | null>(null);

  const handleStartCbtRetest = (subset?: Mistake[]) => {
    setCbtSubset(subset || null);
    handlers.setActiveView('cbt_retest');
  };

  const handleStartRemediation = (mistake: Mistake) => {
    setRemediationTarget(mistake);
    handlers.setActiveView('remediation_lab');
  };

  const activeCbtQueue = cbtSubset || state.filteredMistakes;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left relative pb-32 sm:pb-36 font-sans">
      
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: MISTAKE STUDIO (DEFAULT HUB & TRIAGE COCKPIT) */}
        {state.activeView === 'studio' && (
          <motion.div
            key="studio-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="space-y-6"
          >
            {/* Autopsy Hero & Precision Metrics */}
            <MistakesAutopsyHero
              totalMistakes={state.totalMistakes}
              unresolvedCount={state.unresolvedCount}
              resolvedCount={state.resolvedCount}
              resolutionRate={state.resolutionRate}
              onOpenLogModal={() => handlers.setIsLogModalOpen(true)}
            />

            {/* Main Studio View: Search, Filters, Leitner Cadence & Cards Matrix */}
            <MistakeStudioView
              mistakes={state.mistakes}
              filteredMistakes={state.filteredMistakes}
              activeSubject={state.activeSubject}
              setActiveSubject={handlers.setActiveSubject}
              statusFilter={state.statusFilter}
              setStatusFilter={handlers.setStatusFilter}
              searchQuery={state.searchQuery}
              setSearchQuery={handlers.setSearchQuery}
              selectedTag={state.selectedTag}
              setSelectedTag={handlers.setSelectedTag}
              selectedDifficulty={state.selectedDifficulty}
              setSelectedDifficulty={handlers.setSelectedDifficulty}
              selectedSource={state.selectedSource}
              setSelectedSource={handlers.setSelectedSource}
              availableSources={state.availableSources}
              dueCount={state.dueCount}
              leitnerBoxes={state.leitnerBoxes}
              selectedIds={state.selectedIds}
              toggleSelectId={handlers.toggleSelectId}
              selectAllFiltered={handlers.selectAllFiltered}
              clearSelection={handlers.clearSelection}
              onOpenLogModal={() => handlers.setIsLogModalOpen(true)}
              onOpenPrintModal={() => handlers.setIsPrintModalOpen(true)}
              onStartCbtRetest={handleStartCbtRetest}
              onStartRemediation={handleStartRemediation}
              onStartInterrogation={(m) => handlers.setInterrogationMistake(m)}
              onUpdateStatus={(id, status) => actions.updateMistakeStatus(id, status)}
              onDeleteMistake={(id) => actions.deleteMistake(id)}
              onDeleteMistakesBatch={(ids) => actions.deleteMistakesBatch(ids)}
              getSubjectColor={handlers.getSubjectColor}
              getStatusBadge={handlers.getStatusBadge}
            />
          </motion.div>
        )}

        {/* VIEW 2: STEP-BY-STEP REMEDIATION LAB */}
        {state.activeView === 'remediation_lab' && (
          <motion.div
            key="remediation-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
          >
            <MistakeRemediationLab
              initialMistake={remediationTarget || state.filteredMistakes[0] || state.mistakes[0]}
              queue={state.filteredMistakes.length > 0 ? state.filteredMistakes : state.mistakes}
              onExit={() => {
                handlers.setActiveView('studio');
                setRemediationTarget(null);
              }}
              onAdvanceStatus={handlers.advanceLeitnerStatus}
              onStartInterrogation={(m) => handlers.setInterrogationMistake(m)}
              getSubjectColor={handlers.getSubjectColor}
            />
          </motion.div>
        )}

      </AnimatePresence>

      {/* VIEW 3: TIMED CBT RETEST ARENA OVERLAY */}
      {state.activeView === 'cbt_retest' && (
        <MistakesCbtTestArena
          isOpen={true}
          onClose={() => {
            handlers.setActiveView('studio');
            setCbtSubset(null);
          }}
          mistakes={activeCbtQueue.length > 0 ? activeCbtQueue : state.mistakes}
          onUpdateStatus={actions.updateMistakeStatus}
          getSubjectColor={handlers.getSubjectColor}
        />
      )}

      {/* MODAL 1: LOG ERROR MODAL */}
      <LogMistakeModal
        isOpen={state.isLogModalOpen}
        onClose={() => handlers.setIsLogModalOpen(false)}
        categories={MISTAKE_CATEGORIES}
      />

      {/* MODAL 2: SOCRATIC AI ERROR AUTOPSY INTERROGATOR */}
      <AiInterrogationModal
        isOpen={!!state.interrogationMistake}
        onClose={() => handlers.setInterrogationMistake(null)}
        mistake={state.interrogationMistake}
      />

      {/* MODAL 3: DESK WORKPRINT MODAL */}
      <PrintableWorksheetModal
        isOpen={state.isPrintModalOpen}
        onClose={() => handlers.setIsPrintModalOpen(false)}
        mistakes={state.filteredMistakes.length > 0 ? state.filteredMistakes : state.mistakes}
        chapters={chapters}
        initialType="mistakes"
      />

    </div>
  );
}
