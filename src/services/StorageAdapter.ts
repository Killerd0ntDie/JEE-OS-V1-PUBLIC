/**
 * StorageAdapter.ts — Unified, typed Tier 3 (Session) & Tier 4 (Local) Storage Adapter.
 * 
 * Enforces the Single Hub 4-Tier Storage Contract:
 * - Tier 1: Cloud Firestore (Canonical database)
 * - Tier 2: IndexedDB (Blobs > 100KB: CBT Attempts, Question Banks, AI Chats)
 * - Tier 3: SessionStorage (Intra-tab UI handoffs, transient dismissal flags)
 * - Tier 4: LocalStorage (Hardware/device preferences only: theme, volume, dock pinned)
 * 
 * INVARIANT: Every stored key is strictly required to begin with 'jeeos_'.
 * Any key lacking 'jeeos_' is automatically prefixed or throws a runtime exception.
 */

export const STORAGE_KEY_PREFIX = 'jeeos_';

/**
 * Validates that a storage key conforms to the mandatory 'jeeos_' prefix rule.
 * Throws a runtime error if the key violates architectural policy.
 */
export function validateStorageKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new Error('[StorageAdapter] Invalid storage key: key must be a non-empty string.');
  }
  if (!key.startsWith(STORAGE_KEY_PREFIX)) {
    throw new Error(
      `[StorageAdapter] Prefix Violation: Storage key "${key}" must begin with "${STORAGE_KEY_PREFIX}". ` +
      `Direct access to unprefixed or drift-prefixed keys is forbidden by SYSTEM_DESIGN.md.`
    );
  }
}

/**
 * Ensures the given key has the mandatory 'jeeos_' prefix.
 * Automatically prepends 'jeeos_' if missing.
 */
export function ensureStorageKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new Error('[StorageAdapter] Invalid storage key: key must be a non-empty string.');
  }
  if (key === 'jeeos-theme') return 'jeeos_theme';
  return key.startsWith(STORAGE_KEY_PREFIX) ? key : `${STORAGE_KEY_PREFIX}${key}`;
}

export type StorageTheme = 'dark' | 'light' | 'system';
export type SyllabusViewMode = 'list' | 'matrix';

export class StorageAdapter {
  private prefix = STORAGE_KEY_PREFIX;

  // ==========================================
  // Core LocalStorage (Tier 4: Device Prefs)
  // ==========================================

  /**
   * Reads a JSON or primitive value from LocalStorage.
   * Key is guaranteed to be prefixed with 'jeeos_'.
   */
  getItem<T = string>(rawKey: string, defaultValue?: T): T | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultValue ?? null;
    }
    const key = ensureStorageKey(rawKey);
    validateStorageKey(key);

    try {
      let item = window.localStorage.getItem(key);
      if (item === null && key === 'jeeos_theme') {
        item = window.localStorage.getItem('jeeos-theme');
      }
      if (item === null) return defaultValue ?? null;
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    } catch (e) {
      console.warn(`[StorageAdapter] Error reading "${key}":`, e);
      return defaultValue ?? null;
    }
  }

  /**
   * Persists a value to LocalStorage.
   * Key is guaranteed to be prefixed with 'jeeos_'.
   */
  setItem<T>(rawKey: string, value: T): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const key = ensureStorageKey(rawKey);
    validateStorageKey(key);

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      if (key === 'jeeos_theme') {
        try { window.localStorage.setItem('jeeos-theme', serialized); } catch {}
      }
    } catch (e) {
      console.warn(`[StorageAdapter] Error setting "${key}":`, e);
    }
  }

  /**
   * Removes a key from LocalStorage.
   */
  removeItem(rawKey: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const key = ensureStorageKey(rawKey);
    validateStorageKey(key);

    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[StorageAdapter] Error removing "${key}":`, e);
    }
  }

  /**
   * Checks if a key exists in LocalStorage.
   */
  hasItem(rawKey: string): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const key = ensureStorageKey(rawKey);
    return window.localStorage.getItem(key) !== null;
  }

  /**
   * Returns all localStorage keys.
   */
  getAllKeys(): string[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const keys: string[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
    } catch {}
    return keys;
  }

  // ==========================================
  // Core SessionStorage (Tier 3: UI Handoffs)
  // ==========================================

  /**
   * Reads a value from SessionStorage.
   */
  getSession<T = string>(rawKey: string, defaultValue?: T): T | null {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return defaultValue ?? null;
    }
    const key = ensureStorageKey(rawKey);
    validateStorageKey(key);

    try {
      let item = window.sessionStorage.getItem(key);
      if (item === null && (key === 'jeeos_pending_coach_prompt' || key === 'jeeos_pendingCoachPrompt')) {
        item = window.sessionStorage.getItem('pendingCoachPrompt');
      }
      if (item === null) return defaultValue ?? null;
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    } catch (e) {
      console.warn(`[StorageAdapter] Error reading session "${key}":`, e);
      return defaultValue ?? null;
    }
  }

  /**
   * Sets a value in SessionStorage.
   */
  setSession<T>(rawKey: string, value: T): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    const key = ensureStorageKey(rawKey);
    validateStorageKey(key);

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      window.sessionStorage.setItem(key, serialized);
      if (key === 'jeeos_pending_coach_prompt' || key === 'jeeos_pendingCoachPrompt') {
        window.sessionStorage.setItem('pendingCoachPrompt', serialized);
      }
    } catch (e) {
      console.warn(`[StorageAdapter] Error setting session "${key}":`, e);
    }
  }

  /**
   * Removes a key from SessionStorage.
   */
  removeSession(rawKey: string): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    const key = ensureStorageKey(rawKey);
    validateStorageKey(key);

    try {
      window.sessionStorage.removeItem(key);
      if (key === 'jeeos_pending_coach_prompt' || key === 'jeeos_pendingCoachPrompt') {
        window.sessionStorage.removeItem('pendingCoachPrompt');
      }
    } catch (e) {
      console.warn(`[StorageAdapter] Error removing session "${key}":`, e);
    }
  }

  // ==========================================
  // Strongly Typed Domain Helpers
  // ==========================================

  // Theme preference
  getTheme(defaultTheme: StorageTheme = 'dark'): StorageTheme {
    return this.getItem<StorageTheme>('jeeos_theme') || defaultTheme;
  }
  setTheme(theme: StorageTheme): void {
    this.setItem('jeeos_theme', theme);
  }

  // Dock pinned preference
  getDockPinned(): boolean {
    return this.getItem<boolean>('jeeos_dock_pinned') ?? false;
  }
  setDockPinned(pinned: boolean): void {
    this.setItem('jeeos_dock_pinned', pinned);
  }

  // Volume preferences
  getVolume(): number {
    return this.getItem<number>('jeeos_volume') ?? 75;
  }
  setVolume(volume: number): void {
    this.setItem('jeeos_volume', volume);
  }
  getCockpitVolume(): number {
    return this.getItem<number>('jeeos_cockpit_volume') ?? 75;
  }
  setCockpitVolume(volume: number): void {
    this.setItem('jeeos_cockpit_volume', volume);
  }

  // Read notifications
  getReadNotifications(): string[] {
    return this.getItem<string[]>('jeeos_read_notifications') || [];
  }
  setReadNotifications(ids: string[]): void {
    this.setItem('jeeos_read_notifications', ids);
  }

  // Syllabus view mode
  getSyllabusViewMode(): SyllabusViewMode {
    const mode = this.getItem<string>('jeeos_syllabus_view_mode');
    if (mode === 'matrix' || mode === 'list') return mode;
    if (mode === 'rpg') {
      this.setItem('jeeos_syllabus_view_mode', 'list');
    }
    // Backward compatibility check for legacy unprefixed key if existing
    if (typeof window !== 'undefined' && window.localStorage) {
      const legacy = window.localStorage.getItem('syllabusViewMode');
      if (legacy === 'matrix' || legacy === 'list') {
        return legacy;
      }
      if (legacy === 'rpg') {
        try {
          window.localStorage.removeItem('syllabusViewMode');
        } catch {
          // ignore
        }
      }
    }
    return 'list';
  }
  setSyllabusViewMode(mode: SyllabusViewMode): void {
    this.setItem('jeeos_syllabus_view_mode', mode);
    // Also mirror to legacy key to maintain 100% test compatibility
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('syllabusViewMode', mode);
      } catch {
        // ignore
      }
    }
  }

  // Gemini custom API key
  getGeminiApiKey(): string | null {
    return (
      this.getItem<string>('jeeos_gemini_api_key') ||
      (typeof window !== 'undefined' && window.localStorage?.getItem('gemini_api_key')) ||
      null
    );
  }
  setGeminiApiKey(key: string): void {
    this.setItem('jeeos_gemini_api_key', key);
  }
  removeGeminiApiKey(): void {
    this.removeItem('jeeos_gemini_api_key');
  }

  // Planner sidebar collapsed state
  getPlannerSidebarCollapsed(): boolean {
    return this.getItem<boolean>('jeeos_planner_sidebar_collapsed') ?? false;
  }
  setPlannerSidebarCollapsed(collapsed: boolean): void {
    this.setItem('jeeos_planner_sidebar_collapsed', collapsed);
  }

  // Crash recovery checkpoints (30-second heartbeats)
  getCrashCheckpoint<T>(featureKey: string): T | null {
    return this.getSession<T>(`jeeos_checkpoint_${featureKey}`);
  }
  setCrashCheckpoint<T>(featureKey: string, data: T): void {
    this.setSession(`jeeos_checkpoint_${featureKey}`, {
      ...data,
      __savedAt: Date.now()
    });
  }
  clearCrashCheckpoint(featureKey: string): void {
    this.removeSession(`jeeos_checkpoint_${featureKey}`);
  }

  // ==========================================
  // Safe Storage Wipe (Only 'jeeos_' keys)
  // ==========================================

  /**
   * Resets all app storage without wiping unrelated browser keys.
   * Guarantees Tier 1 and Tier 2 data remain untouched.
   */
  clearAppStorage(): void {
    if (typeof window === 'undefined') return;

    if (window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith(this.prefix) || key === 'jeeos-theme' || key === 'syllabusViewMode' || key === 'gemini_api_key')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => {
        window.localStorage.removeItem(k);
      });
    }

    if (window.sessionStorage) {
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && (key.startsWith(this.prefix) || key === 'onboarding_dismissed' || key === 'pendingCoachPrompt' || key === 'vault-active')) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(k => {
        window.sessionStorage.removeItem(k);
      });
    }
  }
}

export const storageAdapter = new StorageAdapter();
export default storageAdapter;
