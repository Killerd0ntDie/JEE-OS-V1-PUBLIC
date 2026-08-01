import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@/components/ui/Icon';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { OfflineQueue } from '@/utils/offlineQueue';

export function OfflineBanner() {
  const { isOffline, isOnline } = useNetworkStatus();
  const [isFlushing, setIsFlushing] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (isOnline) {
      const queue = OfflineQueue.getQueue();
      if (queue.length > 0) {
        setIsFlushing(true);
        OfflineQueue.flushAll().then(() => {
          setIsFlushing(false);
          setShowRestored(true);
          setTimeout(() => setShowRestored(false), 3000);
        });
      }
    }
  }, [isOnline]);

  return (
    <AnimatePresence>
      {(isOffline || isFlushing || showRestored) && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none mt-2"
        >
          <div className={`pointer-events-auto shadow-lg rounded-full px-4 py-2 flex items-center gap-3 backdrop-blur-md border ${
            isOffline ? 'bg-amber-500/20 border-amber-500/30 text-amber-200' :
            isFlushing ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-200' :
            'bg-emerald-500/20 border-emerald-500/30 text-emerald-200'
          }`}>
            {isOffline ? (
              <>
                <Icon name="WifiOff" className="w-4 h-4" />
                <span className="text-xs font-mono font-bold tracking-wide">YOU ARE OFFLINE - CHANGES QUEUED</span>
              </>
            ) : isFlushing ? (
              <>
                <Icon name="RefreshCw" className="w-4 h-4 animate-spin" />
                <span className="text-xs font-mono font-bold tracking-wide">SYNCING OFFLINE DATA...</span>
              </>
            ) : (
              <>
                <Icon name="CheckCircle2" className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold tracking-wide text-emerald-100">SYNC COMPLETE</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
