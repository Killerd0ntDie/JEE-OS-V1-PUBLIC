import { useEffect, useRef } from 'react';

// Global stack of callbacks
const escapeHandlers: (() => void)[] = [];

// Attach a single global listener
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && escapeHandlers.length > 0) {
      // Execute only the top-most modal callback.
      const handler = escapeHandlers[escapeHandlers.length - 1];
      handler();
    }
  });
}

/**
 * Hook to execute a callback when the Escape key is pressed.
 * Maintains a stack so only the top-most active modal is closed.
 * 
 * @param callback Function to call when Escape is pressed
 * @param isActive Boolean indicating if the modal/component is currently active
 */
export function useEscapeKey(callback: () => void, isActive: boolean = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isActive) return;
    
    const handler = () => savedCallback.current();
    escapeHandlers.push(handler);
    
    return () => {
      const index = escapeHandlers.lastIndexOf(handler);
      if (index > -1) {
        escapeHandlers.splice(index, 1);
      }
    };
  }, [isActive]);
}
