/**
 * Strips active scripting tags, iframes, object/embed payloads, and inline DOM event handlers.
 * Protects parsed examination questions and options from stored XSS vectors.
 */
export function sanitizeHtmlContent(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/<\/?(?:object|embed|applet|form|link|meta)\b[^>]*>/gi, '')
    .replace(/javascript:[^\s"'>]+/gi, '')
    .replace(/vbscript:[^\s"'>]+/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
}
