import { idbGet, idbSet, idbRemove } from '@/utils/idb';
import { storageAdapter } from '@/services/StorageAdapter';
import { safelyParseJSON } from '@/utils/jsonParser';
import type { ChatSession } from '../hooks/useChatSessions';

const CHATS_IDB_KEY = 'jeeos_chats';

let inMemoryCache: Record<string, ChatSession> | null = null;

export async function loadSavedChats(): Promise<Record<string, ChatSession>> {
  if (inMemoryCache !== null) {
    return inMemoryCache;
  }

  // 1. Try reading from Tier 2 IndexedDB
  try {
    const idbChats = await idbGet<Record<string, ChatSession>>(CHATS_IDB_KEY);
    if (idbChats && typeof idbChats === 'object' && Object.keys(idbChats).length > 0) {
      inMemoryCache = idbChats;
      // Clean up legacy localStorage if still present
      storageAdapter.removeItem(CHATS_IDB_KEY);
      return idbChats;
    }
  } catch (err) {
    console.warn('[chatStorage] Error reading from IndexedDB:', err);
  }

  // 2. Fallback & One-time Migration from Tier 4 LocalStorage
  const legacyRaw = storageAdapter.getItem<Record<string, ChatSession> | string>(CHATS_IDB_KEY);
  if (legacyRaw) {
    const parsed = typeof legacyRaw === 'string'
      ? safelyParseJSON<Record<string, ChatSession>>(legacyRaw, {})
      : (legacyRaw as Record<string, ChatSession>);
    inMemoryCache = parsed;
    // Migrate to IndexedDB
    try {
      await idbSet(CHATS_IDB_KEY, parsed);
      storageAdapter.removeItem(CHATS_IDB_KEY);
    } catch (err) {
      console.warn('[chatStorage] Error migrating chats to IndexedDB:', err);
    }
    return parsed;
  }

  inMemoryCache = {};
  return {};
}

export function getCachedChats(): Record<string, ChatSession> {
  if (inMemoryCache !== null) return inMemoryCache;
  // If not yet loaded asynchronously, do a quick sync check on legacy storage
  const legacyRaw = storageAdapter.getItem<Record<string, ChatSession> | string>(CHATS_IDB_KEY);
  if (legacyRaw) {
    const parsed = typeof legacyRaw === 'string'
      ? safelyParseJSON<Record<string, ChatSession>>(legacyRaw, {})
      : (legacyRaw as Record<string, ChatSession>);
    inMemoryCache = parsed;
    return parsed;
  }
  return {};
}

export async function persistSavedChats(chats: Record<string, ChatSession>): Promise<void> {
  inMemoryCache = chats;
  try {
    await idbSet(CHATS_IDB_KEY, chats);
    // Ensure localStorage is cleared to adhere to Tier 4 policy
    storageAdapter.removeItem(CHATS_IDB_KEY);
  } catch (err) {
    console.error('[chatStorage] Failed to persist chats to IndexedDB:', err);
  }
}

export async function clearAllSavedChats(): Promise<void> {
  inMemoryCache = {};
  try {
    await idbRemove(CHATS_IDB_KEY);
  } catch (err) {
    console.warn('[chatStorage] Failed to clear chats from IndexedDB:', err);
  }
  storageAdapter.removeItem(CHATS_IDB_KEY);
}
