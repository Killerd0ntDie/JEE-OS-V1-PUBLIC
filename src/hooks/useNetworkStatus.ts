import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const checkStatus = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return;
    }
    try {
      // Ping the health endpoint to check actual connectivity
      const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
      setIsOnline(res.ok);
    } catch (e) {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial check
    checkStatus();

    const handleOnline = () => checkStatus();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic heartbeat (every 30 seconds)
    const interval = setInterval(checkStatus, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkStatus]);

  return { isOnline, isOffline: !isOnline };
}
