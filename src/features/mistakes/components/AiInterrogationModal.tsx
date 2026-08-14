import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { QuestionViewerWidget } from '@/features/mission/components/QuestionViewerWidget';
import { CheckCircle2, Skull, ArrowRight } from 'lucide-react';
import { Mistake } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { audioEngine } from '@/utils/audioEngine';

interface AiInterrogationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mistake: Mistake | null;
}

export const AiInterrogationModal: React.FC<AiInterrogationModalProps> = ({
  isOpen,
  onClose,
  mistake
}) => {
  const actions = useStudyBrainStore(state => state.actions);
  const [exorcised, setExorcised] = useState(false);

  useEscapeKey(onClose, isOpen);

  if (!mistake) return null;

  const handleCorrectAnswer = () => {
    setExorcised(true);
    audioEngine.playSuccessChime();
    actions.updateMistakeStatus(mistake.id, 'Mastered');
  };

  const handleClose = () => {
    setExorcised(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen && !!mistake} onClose={handleClose} className="w-full h-[90vh] max-w-5xl rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(220,38,38,0.15)] flex flex-col bg-[#09090b] border border-red-900/50">
          {/* Header */}
          <div className="px-6 py-4 border-b border-red-950/50 bg-red-950/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Skull className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-sm font-display font-bold text-red-400 uppercase tracking-widest">
                  The Interrogation Room
                </h3>
                <p className="text-[10px] font-mono text-red-500/70">
                  Target: {mistake?.chapter || 'Unknown'} • {mistake?.topic || 'General'}
                </p>
              </div>
            </div>
            {!exorcised && (
              <button 
                onClick={handleClose}
                className="text-[10px] font-mono text-zinc-400 hover:text-white uppercase tracking-wider transition-colors"
              >
                Flee Room
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden relative">
            {exorcised ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 animate-in fade-in zoom-in-95 duration-500 space-y-6">
                <div className="w-24 h-24 rounded-full bg-emerald-950/50 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-display font-bold text-white tracking-tight">Mistake Exorcised</h2>
                  <p className="text-sm text-zinc-400 font-mono">
                    "{mistake?.topic || mistake?.chapter}" has been permanently marked as Mastered.
                  </p>
                </div>
                <button 
                  onClick={handleClose}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 mt-4"
                >
                  Return to Vault <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <QuestionViewerWidget
                chapterId={mistake?.chapterId || mistake?.chapter || ''}
                chapterName={mistake?.chapter || ''}
                subject={mistake?.subject || 'physics'}
                onExitPractice={handleClose}
                onCorrectAnswer={handleCorrectAnswer}
              />
            )}
          </div>
    </Modal>
  );
};
