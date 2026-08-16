import { useEffect, useRef, RefObject } from 'react';

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contentEditable=true]',
  'details > summary',
].join(', ');

export function useFocusTrap(ref: RefObject<HTMLElement | null>, isActive: boolean) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Save previous focus
    if (document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }

    const element = ref.current;
    if (!element) return;

    const timeoutIds = new Set<NodeJS.Timeout>();

    const getFocusableElements = () => {
      const focusableEls = Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)).filter(
        (el) =>
          !el.hasAttribute('hidden') &&
          el.getAttribute('aria-hidden') !== 'true' &&
          window.getComputedStyle(el).display !== 'none' &&
          window.getComputedStyle(el).visibility !== 'hidden'
      );
      return focusableEls;
    };

    // Auto-focus first element on mount
    const focusableEls = getFocusableElements();
    const firstFocusable = focusableEls[0];

    if (firstFocusable) {
      const id = setTimeout(() => { firstFocusable.focus(); timeoutIds.delete(id); }, 50);
      timeoutIds.add(id);
    } else {
      const id = setTimeout(() => { element.focus(); timeoutIds.delete(id); }, 50);
      timeoutIds.add(id);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const els = getFocusableElements();
      if (els.length === 0) return;
      
      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      timeoutIds.forEach(id => clearTimeout(id));
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, ref]);
}
