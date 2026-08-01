import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title = "Remove Mission from Schedule?",
  message = "Are you sure you want to remove this mission? This action will remove it from your execution queue.",
  confirmLabel = "Delete Mission",
  cancelLabel = "Cancel",
  onConfirm,
  onClose
}: ConfirmDeleteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(isOpen || false);
  useEscapeKey(onClose, isOpen);
  useFocusTrap(modalRef, isOpen || false);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            role="presentation"
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Icon Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                <Trash2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="confirm-modal-title" className="text-base font-display font-bold text-white tracking-tight">
                  {title}
                </h3>
                <span className="text-[10px] font-mono text-red-400/90 uppercase tracking-widest font-semibold">
                  CONFIRM DELETION
                </span>
              </div>
            </div>

            {/* Message Body */}
            <p className="text-xs text-zinc-300 leading-relaxed font-sans border-l-2 border-red-500/40 pl-3 py-0.5">
              {message}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-white bg-red-600 hover:bg-red-500 border border-red-500/50 transition-colors shadow-lg shadow-red-600/20 cursor-pointer flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </ModalPortal>
  );
}
