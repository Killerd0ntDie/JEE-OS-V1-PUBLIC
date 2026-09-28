import { storageAdapter } from './StorageAdapter';

export function clearAppStorage(): void {
  storageAdapter.clearAppStorage();
}
