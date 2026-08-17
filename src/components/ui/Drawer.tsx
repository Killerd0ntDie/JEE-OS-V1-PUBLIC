import React, { ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { drawerVariants, backdropVariants } from '@/constants/motion';

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
  backdropClassName = 'bg-black/10 backdrop-blur-sm',
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

  const getPositionClasses = () => {
    switch (position) {
      case 'left': return 'top-0 left-0 bottom-0 h-full';
      case 'right': return 'top-0 right-0 bottom-0 h-full';
      case 'bottom': return 'bottom-0 left-0 right-0 w-full rounded-t-2xl';
    }
  };

  const drawerContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0" style={{ zIndex }}>
          {/* Backdrop */}
          {!hideBackdrop && (
            <motion.div
              variants={backdropVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`absolute inset-0 ${backdropClassName}`}
              onClick={onClose}
              aria-label="Close drawer overlay"
            />
          )}

          {/* Drawer Content with Spring Physics */}
          <motion.div
            variants={drawerVariants[position]}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`absolute ${getPositionClasses()} flex flex-col shadow-2xl ${className}`}
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

