import React from 'react';
import { PauseCircle, CheckCircle, X } from 'lucide-react';
import { Chapter } from '@/types';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface HoldNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter;
  holdType: 'chapter' | 'dpp' | 'pyq';
  onRemoveHoldAndProceed: () => void;
}

export const HoldNotificationModal: React.FC<HoldNotificationModalProps> = ({
  isOpen,
  onClose,
  chapter,
  holdType,
  onRemoveHoldAndProceed,
}) => {
  if (!isOpen || !chapter) return null;

  const holdTitle =
    holdType === 'chapter'
      ? 'Entire Chapter is ON HOLD'
      : holdType === 'dpp'
      ? 'DPP Practice is ON HOLD'
      : 'PYQ Drill is ON HOLD';

  const holdDescription =
    holdType === 'chapter'
      ? `The entire chapter "${chapter.name}" is currently on hold and cannot be scheduled.`
      : holdType === 'dpp'
      ? `DPP practice for "${chapter.name}" is currently on hold and cannot be scheduled.`
      : `PYQ drills for "${chapter.name}" are currently on hold and cannot be scheduled.`;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div 
          role="dialog"
          aria-modal="true"
          className="relative bg-[#09090b] border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl z-50 text-left space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <PauseCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                  Action Blocked • Chapter On Hold
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {holdTitle}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-xs font-mono space-y-2 text-zinc-300">
            <p className="font-semibold text-amber-200">
              {holdDescription}
            </p>
            <p className="text-[11px] text-zinc-400">
              To schedule or select this chapter for today's study split, please remove the hold.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 font-mono text-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onRemoveHoldAndProceed}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              Remove Hold & Schedule
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
