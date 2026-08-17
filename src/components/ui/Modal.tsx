import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { modalVariants, backdropVariants } from '@/constants/motion';

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
  ariaLabelledBy?: string;
  style?: React.CSSProperties;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  hideBackdrop = false,
  backdropClassName = 'bg-black/40 backdrop-blur-sm',
  zIndex = 999,
  center = true,
  fullScreen = false,
  ariaLabelledBy,
  style
}: ModalProps) {
  // Prevent scrolling on body when modal is open and handle ESC key
  const modalRef = React.useRef<HTMLDivElement>(null);
  useLockBodyScroll(isOpen);
  useEscapeKey(() => {
    if (onClose) onClose();
  }, isOpen);
  useFocusTrap(modalRef, isOpen);

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div 
          className={`fixed inset-0 flex ${center ? 'items-center justify-center' : 'items-start justify-center pt-[10vh]'} ${fullScreen ? 'p-0' : 'p-4'}`}
          style={{ zIndex }}
        >
          {/* Backdrop with Physics-Based Entrance & Blur Dynamics */}
          {!hideBackdrop && (
            <motion.div
              variants={backdropVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`absolute inset-0 ${backdropClassName}`}
              onClick={onClose}
              aria-label="Close modal overlay"
            />
          )}

          {/* Modal Dialog with Spring Physics Scale & Filter Transition */}
          <motion.div
            ref={modalRef}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={style}
            className={`relative flex flex-col overflow-hidden shadow-2xl ${fullScreen ? 'w-full h-full rounded-none' : 'rounded-2xl'} ${className}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledBy}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? ReactDOM.createPortal(modalContent, document.body) : null;
}

