import { useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { OfflineQueue } from '../utils/offlineQueue';

interface MutationOptions {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onQueued?: () => void;
}

export function useOfflineSafeMutation() {
  const [isLoading, setIsLoading] = useState(false);
  const { isOnline } = useNetworkStatus();

  const mutate = async (body: any, options: MutationOptions) => {
    setIsLoading(true);

    if (!isOnline) {
      // Offline: Queue it for background re-sync
      OfflineQueue.enqueue({
        url: options.url,
        method: options.method || 'POST',
        headers: options.headers || { 'Content-Type': 'application/json' },
        body
      });
      setIsLoading(false);
      
      if (options.onQueued) {
        options.onQueued();
      }
      return; // Return early, treating as optimistic success or queued state
    }

    // Online: Execute normally
    try {
      const res = await fetch(options.url, {
        method: options.method || 'POST',
        headers: options.headers || { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        throw new Error(`Request failed with status: ${res.status}`);
      }
      
      const data = await res.json();
      setIsLoading(false);
      
      if (options.onSuccess) {
        options.onSuccess(data);
      }
      return data;
    } catch (err: any) {
      setIsLoading(false);
      if (options.onError) {
        options.onError(err);
      } else {
        console.error("Mutation failed:", err);
      }
    }
  };

  return { mutate, isLoading };
}
