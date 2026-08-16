import { useEffect, useRef } from 'react';

// Global stack of callbacks with unique IDs for reliable cleanup
const escapeHandlers: Array<{ handler: () => void; id: number }> = [];
let nextHandlerId = 0;
let globalListenerAttached = false;

// Attach a single global listener (lazily)
function attachGlobalListener() {
  if (typeof document === 'undefined' || globalListenerAttached) return;
  
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && escapeHandlers.length > 0) {
      e.stopPropagation();
      // Execute only the top-most modal callback.
      const { handler } = escapeHandlers[escapeHandlers.length - 1];
      handler();
    }
  });
  globalListenerAttached = true;
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
  const handlerIdRef = useRef<number | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isActive) return;
    
    attachGlobalListener();
    
    const handler = () => savedCallback.current();
    const id = nextHandlerId++;
    handlerIdRef.current = id;
    escapeHandlers.push({ handler, id });
    
    return () => {
      const index = escapeHandlers.findIndex(h => h.id === id);
      if (index > -1) {
        escapeHandlers.splice(index, 1);
      }
      handlerIdRef.current = null;
    };
  }, [isActive]);
}
