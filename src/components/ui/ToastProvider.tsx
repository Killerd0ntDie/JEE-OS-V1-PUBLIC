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
      audioEngine.playAlertPop();
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
      
      {/* Background Blur Overlay */}
      {toasts.length > 0 && (
        <div 
          className="fixed inset-x-0 top-0 z-[90] pointer-events-none h-64 bg-black/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10"
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          }}
        />
      )}

      {/* Modern Dynamic Island Style Toast UI Container */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none max-w-md w-full px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -40, scale: 0.8, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] p-3 pr-11 rounded-2xl flex items-center gap-3.5 pointer-events-auto relative overflow-hidden group w-auto border bg-[#09090b] border-white/5"
            >
              {/* Subtle Glass Highlights */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-px bg-white/10 pointer-events-none" />
              
              <div className="shrink-0 flex items-center justify-center relative z-10">
                {t.type === 'success' && <div className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-300 flex items-center justify-center border border-white/10 shadow-inner"><Icon name="Check" className="w-4 h-4 stroke-[3]" /></div>}
                {t.type === 'error' && <div className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-300 flex items-center justify-center border border-white/10 shadow-inner"><Icon name="X" className="w-4 h-4 stroke-[3]" /></div>}
                {t.type === 'warning' && <div className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-300 flex items-center justify-center border border-white/10 shadow-inner"><Icon name="AlertTriangle" className="w-4 h-4 stroke-[2]" /></div>}
                {(!t.type || t.type === 'info') && <div className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-300 flex items-center justify-center border border-white/10 shadow-inner"><Icon name="Bell" className="w-4 h-4 stroke-[2]" /></div>}
              </div>
              
              <div className="flex-1 relative z-10 py-0.5 min-w-[200px]">
                <h4 className="text-sm font-semibold text-white tracking-tight">{t.title}</h4>
                {t.message && <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{t.message}</p>}
              </div>
              
              <button 
                onClick={() => removeToast(t.id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-800/50 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors z-10"
              >
                <Icon name="X" className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
