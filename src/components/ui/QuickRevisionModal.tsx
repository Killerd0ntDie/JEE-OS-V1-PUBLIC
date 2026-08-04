import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';
import { Button } from './Button';
import { Card } from './Card';
import { RevisionCard } from '@/services/revisionEngineService';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Modal } from '@/components/ui/Modal';

interface QuickRevisionModalProps {
  revision: RevisionCard;
  isOpen: boolean;
  onClose: () => void;
  onAction: (
    chapterId: string,
    outcome: 'complete' | 'difficult' | 'needs_another' | 'skip',
    notes?: string
  ) => void;
}

const LIFECYCLE_STAGES: ('Theory Complete' | 'DPP Complete' | 'Revision 1' | 'Revision 2' | 'Revision 3' | 'PYQs' | 'Mock Test' | 'Mastered')[] = [
  'Theory Complete',
  'DPP Complete',
  'Revision 1',
  'Revision 2',
  'Revision 3',
  'PYQs',
  'Mock Test',
  'Mastered'
];

export function QuickRevisionModal({ revision, isOpen, onClose, onAction }: QuickRevisionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [outcome, setOutcome] = useState<'complete' | 'difficult' | 'needs_another' | 'skip' | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);
  useFocusTrap(modalRef, isOpen);



  const currentStageIndex = LIFECYCLE_STAGES.indexOf(revision.currentStage as any);

  const handleSubmit = () => {
    if (!outcome) return;
    onAction(revision.chapterId, outcome, feedbackNotes);
    onClose();
    setFeedbackNotes('');
    setOutcome(null);
  };

  // Color mapping based on retention status
  const getRetentionColor = (status: string) => {
    switch (status) {
      case 'Fresh':
        return 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20';
      case 'Stable':
        return 'text-indigo-400 border-indigo-500/20 bg-indigo-950/20';
      case 'Fading':
        return 'text-amber-400 border-amber-500/20 bg-amber-950/20';
      default:
        return 'text-red-400 border-red-500/20 bg-red-950/20';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={50}
      backdropClassName="bg-black/80 backdrop-blur-sm"
      className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-850 rounded-2xl shadow-2xl shadow-indigo-500/5 overflow-hidden flex flex-col z-10 my-6 focus:outline-none"
    >
          {/* Header */}
          <div className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/10">
            <div className="space-y-1 text-left">
              <span className="text-xs font-mono tracking-[0.2em] text-indigo-400 font-bold uppercase block">
                JEE OS COCKPIT • QUICK REVISION ENGINE
              </span>
              <h3 id="quick-revision-modal-title" className="text-base font-display font-bold text-white tracking-tight">
                Active Recall Checklist: {revision.chapterName}
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close Quick Revision Modal"
              className="text-zinc-500 hover:text-zinc-300 h-8 w-8 rounded-lg border border-zinc-900 hover:bg-zinc-900 flex items-center justify-center transition-all cursor-pointer"
            >
              <Icon name="X" className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
            
            {/* Metadata Badges Deck */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3 border-zinc-900 text-left bg-zinc-950/40">
                <span className="text-xs font-mono text-zinc-500 uppercase block mb-1">
                  Memory Retention
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border inline-block ${getRetentionColor(revision.retentionStatus)}`}>
                  {revision.retentionScore}% • {revision.retentionStatus.toUpperCase()}
                </span>
              </Card>

              <Card className="p-3 border-zinc-900 text-left bg-zinc-950/40">
                <span className="text-xs font-mono text-zinc-500 uppercase block mb-1">
                  Confidence Score
                </span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Icon name="Target" className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    {revision.confidence}%
                  </span>
                </div>
              </Card>

              <Card className="p-3 border-zinc-900 text-left bg-zinc-950/40">
                <span className="text-xs font-mono text-zinc-500 uppercase block mb-1">
                  Health Index
                </span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${revision.healthScore >= 80 ? 'bg-emerald-400' : revision.healthScore >= 60 ? 'bg-amber-400' : 'bg-red-500'}`} />
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    {revision.healthScore}%
                  </span>
                </div>
              </Card>

              <Card className="p-3 border-zinc-900 text-left bg-zinc-950/40">
                <span className="text-[8px] font-mono text-zinc-500 uppercase block mb-1">
                  Time Budget
                </span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Icon name="Clock" className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    {revision.estimatedTime}m
                  </span>
                </div>
              </Card>
            </div>

            {/* Spaced Repetition Lifecycle Stage */}
            <div className="space-y-3.5">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block text-left tracking-wider">
                JEE SYLLABUS REVISION LIFECYCLE PROGRESSION
              </span>
              
              <div className="relative pt-4 pb-2">
                {/* Connector line */}
                <div className="absolute top-7 left-3 right-3 h-0.5 bg-zinc-900" />
                <div 
                  className="absolute top-7 left-3 h-0.5 bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${(currentStageIndex / (LIFECYCLE_STAGES.length - 1)) * 100}%` }}
                />

                <div className="flex justify-between items-center relative z-10">
                  {LIFECYCLE_STAGES.map((stage, idx) => {
                    const isPassed = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    return (
                      <div key={stage} className="flex flex-col items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center border transition-all duration-300 text-[10px] font-mono font-bold ${
                          isPassed 
                            ? 'bg-indigo-950 border-indigo-500 text-indigo-400' 
                            : isCurrent 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-110' 
                            : 'bg-zinc-950 border-zinc-850 text-zinc-600'
                        }`}>
                          {isPassed ? '✓' : idx + 1}
                        </div>
                        {/* Compact display names on hover/small or just first word */}
                        <span className={`text-[8px] font-mono tracking-tighter mt-2 text-center max-w-[65px] leading-tight transition-colors duration-300 ${
                          isCurrent ? 'text-indigo-400 font-bold' : isPassed ? 'text-zinc-400' : 'text-zinc-600'
                        }`}>
                          {stage.replace(' Complete', '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick action buttons selection */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block text-left tracking-wider">
                SELECT REVISION OUTCOME STATUS
              </span>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setOutcome('complete')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center gap-2 cursor-pointer ${
                    outcome === 'complete'
                      ? 'bg-emerald-950/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  <Icon name="CheckCircle" className={`w-5 h-5 ${outcome === 'complete' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  <span className="text-xs font-mono font-bold">Mark Complete</span>
                  <span className="text-[8px] text-zinc-500 leading-none font-medium">Stage Up (+80 XP)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutcome('difficult')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center gap-2 cursor-pointer ${
                    outcome === 'difficult'
                      ? 'bg-red-950/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  <Icon name="SlidersHorizontal" className={`w-5 h-5 ${outcome === 'difficult' ? 'text-red-400' : 'text-zinc-500'}`} />
                  <span className="text-xs font-mono font-bold">Mark Difficult</span>
                  <span className="text-[8px] text-zinc-500 leading-none font-medium">Queue for review</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutcome('needs_another')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center gap-2 cursor-pointer ${
                    outcome === 'needs_another'
                      ? 'bg-amber-950/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  <Icon name="Clock" className={`w-5 h-5 ${outcome === 'needs_another' ? 'text-amber-400' : 'text-zinc-500'}`} />
                  <span className="text-xs font-mono font-bold">Needs Another</span>
                  <span className="text-[8px] text-zinc-500 leading-none font-medium">Flag for tomorrow</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutcome('skip')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center gap-2 cursor-pointer ${
                    outcome === 'skip'
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  <Icon name="X" className={`w-5 h-5 ${outcome === 'skip' ? 'text-zinc-200' : 'text-zinc-500'}`} />
                  <span className="text-xs font-mono font-bold">Skip / Snooze</span>
                  <span className="text-[8px] text-zinc-500 leading-none font-medium">Delay due priority</span>
                </button>
              </div>
            </div>

            {/* Notes Section with visual prompts */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">
                WRITE DOWN REVISION LOG / ACTIVE RECALL NOTES
              </label>
              <textarea
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
                placeholder="Write down any derived formulas, weak points, memorization tips, or concept insights from this session..."
                className="w-full min-h-[100px] bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
              />
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-xs font-mono font-bold text-zinc-500 hover:text-zinc-300"
            >
              CANCEL
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!outcome}
              className={`px-5 py-2.5 text-xs font-bold font-mono tracking-wider uppercase ${
                outcome 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                  : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border-zinc-850'
              }`}
            >
              SUBMIT DECISION
            </Button>
          </div>
    </Modal>
  );
}
