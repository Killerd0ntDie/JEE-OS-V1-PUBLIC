import React, { ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  hideBackdrop?: boolean;
  backdropClassName?: string;
  zIndex?: number;
  center?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  hideBackdrop = false,
  backdropClassName = 'bg-black/80 backdrop-blur-md',
  zIndex = 50,
  center = true
}: ModalProps) {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div 
          className={`fixed inset-0 flex ${center ? 'items-center justify-center' : 'items-start justify-center pt-[10vh]'} p-4`}
          style={{ zIndex }}
        >
          {/* Backdrop */}
          {!hideBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`absolute inset-0 ${backdropClassName}`}
              onClick={onClose}
              aria-label="Close modal overlay"
            />
          )}

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: center ? 0 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: center ? 0 : -10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`relative flex flex-col will-change-transform transform-gpu ${className}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? ReactDOM.createPortal(modalContent, document.body) : null;
}
