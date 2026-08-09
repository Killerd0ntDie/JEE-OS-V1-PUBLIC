/**
 * Simple obfuscation utilities for client-side storage.
 * Note: This is NOT true encryption, as the client holds the decoding logic.
 * It is solely meant to prevent plaintext leakage in browser extensions or DevTools.
 */

export const encodeSecret = (text: string): string => {
  try {
    // Basic base64 obfuscation with URI encoding for unicode safety
    return btoa(encodeURIComponent(text));
  } catch (e) {
    return text;
  }
};

export const decodeSecret = (encoded: string): string => {
  try {
    return decodeURIComponent(atob(encoded));
  } catch (e) {
    // Fallback if not encoded or corrupted
    return encoded;
  }
};
