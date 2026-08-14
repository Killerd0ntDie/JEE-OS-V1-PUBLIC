import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, RotateCcw, ArrowRight
} from 'lucide-react';
import { MistakesAutopsyHero } from './components/MistakesAutopsyHero';
import { MistakePracticeView } from './components/MistakePracticeView';
import { MistakesCbtTestArena } from './components/MistakesCbtTestArena';
import { LogMistakeModal } from './components/LogMistakeModal';
import { AiInterrogationModal } from './components/AiInterrogationModal';
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
  const [activePage, setActivePage] = useState<'vault' | 'practice'>('vault');
  const [isCbtArenaOpen, setIsCbtArenaOpen] = useState(false);

  const vaultUnresolvedMistakes = state.mistakes.filter(
    m => m.revisionStatus !== 'Solved Again' && m.revisionStatus !== 'Mastered'
  );

  const retestQueue = vaultUnresolvedMistakes.length > 0 ? vaultUnresolvedMistakes : state.mistakes;

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left relative pb-12 font-sans">
      
      <AnimatePresence mode="wait">
        
        {/* VIEW A: MAIN VAULT HUB PAGE */}
        {activePage === 'vault' && (
          <motion.div
            key="vault-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* 1. AUTOPSY HERO & PRECISION RADAR */}
            <MistakesAutopsyHero
              totalMistakes={state.totalMistakes}
              unresolvedCount={state.unresolvedCount}
              resolvedCount={state.resolvedCount}
              resolutionRate={state.resolutionRate}
              onOpenLogModal={() => handlers.setIsLogModalOpen(true)}
            />

            {/* 2. PRIMARY ACTION HUBS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: Practice & Step-by-Step Derivations */}
              <div className="bg-[#121318] border border-zinc-800 hover:border-indigo-500/40 rounded-3xl p-6 relative overflow-hidden transition-all shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">
                    Practice Your Mistakes
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Step through all logged errors with the horizontal question palette, identified misconceptions, and full step-by-step analytical LaTeX derivations.
                  </p>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setActivePage('practice')}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-colors cursor-pointer"
                >
                  <span>Practice Mistakes ({state.filteredMistakes.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Card 2: Timed CBT Retest Arena */}
              <div className="bg-[#121318] border border-zinc-800 hover:border-red-500/40 rounded-3xl p-6 relative overflow-hidden transition-all shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">
                    Timed CBT Retest Arena
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Take an actual strict timed test on your {vaultUnresolvedMistakes.length} pending mistakes. Zero solutions or answers revealed until final submission.
                  </p>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setIsCbtArenaOpen(true)}
                  disabled={retestQueue.length === 0}
                  className="w-full py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 disabled:opacity-40 border border-red-500/40 text-red-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Start Timed Retest ({retestQueue.length} Qs)</span>
                </motion.button>
              </div>

            </div>

            {/* 3. LOGGED MISTAKES QUICK DIRECTORY */}
            <div className="space-y-3 pt-2 text-left">
              <div className="flex items-center justify-between font-mono text-xs text-zinc-400 px-1">
                <span>Logged Mistakes Quick Directory ({state.filteredMistakes.length})</span>
                <button
                  onClick={() => setActivePage('practice')}
                  className="text-indigo-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <span>Open Full Stage</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {state.filteredMistakes.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-850 bg-zinc-950/40 space-y-3">
                  <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-mono font-bold text-zinc-300">No Logged Mistakes Found</p>
                    <p className="text-[11px] text-zinc-500 font-sans">
                      Click "Log Mistake" above to document your conceptual and tactical prep errors.
                    </p>
                  </div>
                  <button
                    onClick={() => handlers.setIsLogModalOpen(true)}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Log First Error</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {state.filteredMistakes.slice(0, 5).map((m, idx) => {
                    const subColor = handlers.getSubjectColor(m.subject);
                    const isSolved = m.revisionStatus === 'Solved Again' || m.revisionStatus === 'Mastered';

                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl bg-[#121318] border border-zinc-800/80 hover:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-white shrink-0">
                            Q{idx + 1}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${subColor.badge}`}>
                            {m.subject.toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-display font-bold text-white truncate">
                              {m.chapter} {m.topic && m.topic !== m.chapter ? `• ${m.topic}` : ''}
                            </h4>
                            <p className="text-xs text-zinc-400 truncate max-w-md font-sans">
                              {m.questionText}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                            isSolved
                              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                              : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                          }`}>
                            {isSolved ? 'Solved' : 'Needs Review'}
                          </span>
                          
                          <button
                            onClick={() => {
                              setActivePage('practice');
                            }}
                            className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-mono text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Practice
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW B: DEDICATED PRACTICE & DERIVATIONS PAGE */}
        {activePage === 'practice' && (
          <motion.div
            key="practice-page"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <MistakePracticeView
              mistakes={state.filteredMistakes}
              activeSubject={state.activeSubject}
              setActiveSubject={handlers.setActiveSubject}
              statusFilter={state.statusFilter}
              setStatusFilter={handlers.setStatusFilter}
              searchQuery={state.searchQuery}
              setSearchQuery={handlers.setSearchQuery}
              selectedTag={state.selectedTag}
              setSelectedTag={handlers.setSelectedTag}
              onUpdateStatus={(id, status) => actions.updateMistakeStatus(id, status)}
              onPinToPlanner={async (item) => {
                await actions.addCustomMission({
                  taskName: `Review Mistakes: ${item.chapter}`,
                  subject: item.subject,
                  chapter: item.chapter,
                  type: 'Review Mistakes',
                  duration: 45,
                  xp: 50,
                });
              }}
              onDelete={(id) => actions.deleteMistake(id)}
              onStartRetest={() => setIsCbtArenaOpen(true)}
              onBackToVault={() => setActivePage('vault')}
              getSubjectColor={handlers.getSubjectColor}
              getStatusBadge={handlers.getStatusBadge}
            />
          </motion.div>
        )}

      </AnimatePresence>

      {/* STRICT TIMED CBT MISTAKES RETEST ARENA */}
      <MistakesCbtTestArena
        isOpen={isCbtArenaOpen}
        onClose={() => setIsCbtArenaOpen(false)}
        mistakes={retestQueue}
        onUpdateStatus={(id, status) => actions.updateMistakeStatus(id, status)}
        getSubjectColor={handlers.getSubjectColor}
      />

      {/* LOG MISTAKE MODAL */}
      <LogMistakeModal
        isOpen={state.isLogModalOpen}
        onClose={() => handlers.setIsLogModalOpen(false)}
        categories={MISTAKE_CATEGORIES}
      />

      {/* AI INTERROGATION MODAL */}
      {state.interrogationMistake && (
        <AiInterrogationModal
          isOpen={!!state.interrogationMistake}
          onClose={() => handlers.setInterrogationMistake(null)}
          mistake={state.interrogationMistake}
        />
      )}
    </div>
  );
}
