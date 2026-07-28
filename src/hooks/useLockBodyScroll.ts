import { useEffect } from 'react';

/**
 * Locks page scroll while a modal is open.
 *
 * BUGFIX: every modal in this app renders a `fixed inset-0` overlay, which visually
 * covers the page — but none of them ever stopped the underlying page itself from
 * scrolling. A `fixed` element does not create a scroll boundary on its own: mouse
 * wheel / trackpad / touch scroll events over the overlay still bubble to
 * `document.body`, so the page content behind the modal keeps moving. Combined with
 * some modals not being scrollable themselves (missing `overflow-y-auto` on the
 * outer wrapper), this produces exactly the reported bug — the modal reads as "just
 * a layer on top of the page" that you can scroll straight past, with its content
 * clipped/misaligned once it's taller than the viewport.
 *
 * Call this with the modal's `isOpen` boolean. It sets `overflow: hidden` on
 * `<body>` while open and restores the previous value on close/unmount, so nested
 * modals (or other consumers) don't clobber each other.
 */
export function useLockBodyScroll(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    // Prevent layout shift from the scrollbar disappearing.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);
}
