import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { audioEngine } from '@/utils/audioEngine';
import { Icon } from './Icon';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const settings = useStudyBrainStore(state => state.settings);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { ...options, id };
    
    setToasts((prev) => [...prev, newToast]);

    // 1. Play Sound
    if (settings.soundEffects) {
      audioEngine.playAlertPop(settings.volume / 100);
    }

    // 2. Dispatch Desktop Push Notification
    if (settings.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(options.title, {
          body: options.message,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.error('Failed to trigger desktop notification', e);
      }
    }

    // 3. Auto dismiss
    const duration = options.duration || 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, [settings]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  React.useEffect(() => {
    const handleGlobalToast = (e: CustomEvent<Omit<Toast, 'id'>>) => {
      toast(e.detail);
    };
    window.addEventListener('global-toast', handleGlobalToast as EventListener);
    return () => window.removeEventListener('global-toast', handleGlobalToast as EventListener);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast UI Container */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-[#0c0c0e] border border-zinc-800 shadow-2xl p-4 rounded-xl flex items-start gap-3 pointer-events-auto"
            >
              <div className="mt-0.5 shrink-0">
                {t.type === 'success' && <Icon name="CheckCircle2" className="w-5 h-5 text-emerald-400" />}
                {t.type === 'warning' && <Icon name="AlertTriangle" className="w-5 h-5 text-amber-400" />}
                {t.type === 'error' && <Icon name="XCircle" className="w-5 h-5 text-red-400" />}
                {(!t.type || t.type === 'info') && <Icon name="Bell" className="w-5 h-5 text-indigo-400" />}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-zinc-100">{t.title}</h4>
                {t.message && <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{t.message}</p>}
              </div>
              <button 
                onClick={() => removeToast(t.id)}
                className="text-zinc-400 hover:text-white transition-colors p-1"
              >
                <Icon name="X" className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
