import { PageId } from '../types';

const VALID_PAGE_IDS: Set<string> = new Set([
  'dashboard', 'physics', 'chemistry', 'mathematics', 'planner',
  'revision', 'mistakes', 'analytics', 'ai-coach', 'coach-history',
  'mock-tests', 'settings'
]);

export function isPageId(value: unknown): value is PageId {
  return typeof value === 'string' && VALID_PAGE_IDS.has(value);
}

/**
 * Extracts the PageId from the current URL hash.
 * e.g., "#/physics" -> "physics", "#/mistakes?subject=physics" -> "mistakes"
 * Default fallback is "dashboard".
 */
export function getInitialPageIdFromUrl(): PageId {
  if (typeof window === 'undefined') return 'dashboard';
  
  const hash = window.location.hash.replace(/^#\/?/, '');
  const pageIdCandidate = hash.split('?')[0];
  
  if (isPageId(pageIdCandidate)) {
    return pageIdCandidate;
  }
  
  return 'dashboard';
}

/**
 * Updates the URL hash to reflect the current PageId without forcing a full re-render/reload.
 */
export function updateUrlForPage(pageId: PageId): void {
  if (typeof window === 'undefined') return;
  const targetHash = `#/${pageId}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
}
