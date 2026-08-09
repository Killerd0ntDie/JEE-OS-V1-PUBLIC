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
  fullScreen?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  hideBackdrop = false,
  backdropClassName = 'bg-black/80 backdrop-blur-md',
  zIndex = 999,
  center = true,
  fullScreen = false
}: ModalProps) {
  // Prevent scrolling on body when modal is open and handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 flex ${center ? 'items-center justify-center' : 'items-start justify-center pt-[10vh]'} ${fullScreen ? 'p-0' : 'p-4'}`}
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
            initial={{ opacity: 0, scale: fullScreen ? 1 : 0.95, y: center ? 0 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: fullScreen ? 1 : 0.95, y: center ? 0 : -10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`relative flex flex-col will-change-transform transform-gpu ${fullScreen ? 'w-full h-full' : ''} ${className}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? ReactDOM.createPortal(modalContent, document.body) : null;
}
