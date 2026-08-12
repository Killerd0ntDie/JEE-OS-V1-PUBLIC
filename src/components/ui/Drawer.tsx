import React, { ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export interface DrawerProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  position?: 'left' | 'right' | 'bottom';
  hideBackdrop?: boolean;
  backdropClassName?: string;
  zIndex?: number;
}

export function Drawer({
  isOpen,
  onClose,
  children,
  className = '',
  position = 'right',
  hideBackdrop = false,
  backdropClassName = 'bg-black/60 backdrop-blur-sm',
  zIndex = 110,
}: DrawerProps) {
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

  const slideVariants = {
    left: { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } },
    right: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } },
    bottom: { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } },
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'left': return 'top-0 left-0 bottom-0 h-full';
      case 'right': return 'top-0 right-0 bottom-0 h-full';
      case 'bottom': return 'bottom-0 left-0 right-0 w-full rounded-t-2xl';
    }
  };

  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0" style={{ zIndex }}>
          {/* Backdrop */}
          {!hideBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`absolute inset-0 ${backdropClassName}`}
              onClick={onClose}
              aria-label="Close drawer overlay"
            />
          )}

          {/* Drawer Content */}
          <motion.div
            initial={slideVariants[position].initial}
            animate={slideVariants[position].animate}
            exit={slideVariants[position].exit}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute ${getPositionClasses()} flex flex-col shadow-2xl will-change-transform transform-gpu ${className}`}
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

  return typeof document !== 'undefined' ? ReactDOM.createPortal(drawerContent, document.body) : null;
}
