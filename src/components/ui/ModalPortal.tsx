import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portals modal content directly into `document.body`.
 *
 * BUGFIX: every page in this app is rendered inside a `motion.div` in App.tsx that
 * animates `filter` (`filter: 'blur(0px)'` at rest). A CSS `filter` value other than
 * `none` — even a zero-strength blur — creates a new containing block for any
 * descendant with `position: fixed`. That meant modals rendered inline inside a page
 * were never actually fixed to the browser viewport; they were fixed relative to
 * that `motion.div`, which itself sits inside `<main className="overflow-y-auto">`
 * — the real scrolling element (not `document.body`). Scrolling `<main>` scrolled
 * the "fixed" modal right along with it, which is why locking body scroll alone
 * didn't fix anything on pages like the Planner page.
 *
 * Rendering through this portal moves the modal's DOM node to be a direct child of
 * `<body>`, outside the motion/filter wrapper and outside `<main>`'s scroll area, so
 * `fixed inset-0` finally means the actual viewport.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
