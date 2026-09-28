/**
 * Utility for encoding and decoding stored secrets (e.g. user-provided API keys in localStorage).
 * Handles Base64 encoding/decoding and graceful fallback if raw strings are stored.
 */

export function encodeSecret(secret: string): string {
  if (!secret) return '';
  try {
    if (typeof btoa !== 'undefined') {
      return btoa(unescape(encodeURIComponent(secret)));
    }
    return Buffer.from(secret, 'utf-8').toString('base64');
  } catch {
    return secret;
  }
}

export function decodeSecret(encoded: string): string {
  if (!encoded) return '';
  try {
    if (typeof atob !== 'undefined') {
      return decodeURIComponent(escape(atob(encoded)));
    }
    return Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    // If not base64 encoded or decode fails, return raw string
    return encoded;
  }
}
