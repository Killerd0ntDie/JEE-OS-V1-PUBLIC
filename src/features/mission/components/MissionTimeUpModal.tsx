
import { Modal } from '@/components/ui/Modal';
import { Clock, Plus, CheckCircle2 } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export interface MissionTimeUpModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onAddExtraTime: (minutes: number) => void;
}

export function MissionTimeUpModal({
  isOpen,
  onComplete,
  onAddExtraTime
}: MissionTimeUpModalProps) {
  useLockBodyScroll(isOpen || false);
  useEscapeKey(() => onComplete(), isOpen);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onComplete} 
      zIndex={10000} 
      className="max-w-md w-full border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-left glass-panel"
    >
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>

        <div className="space-y-2">
          <h1 id="mission-time-up-modal-title" className="text-2xl font-black font-display text-white tracking-tight leading-none">
            Time's Up!
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans">
            You've reached the planned duration for this mission. Do you want to wrap up now, or add extra time to finish your objectives?
          </p>
        </div>

        <div className="space-y-3 pt-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onAddExtraTime(15)}
              className="flex-1 py-3 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              15 Mins
            </button>
            <button
              type="button"
              onClick={() => onAddExtraTime(30)}
              className="flex-1 py-3 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              30 Mins
            </button>
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="w-full bg-white hover:bg-zinc-200 text-zinc-950 py-3.5 px-4 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-white/5 cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Session
          </button>
        </div>
      </div>
    </Modal>
  );
}
