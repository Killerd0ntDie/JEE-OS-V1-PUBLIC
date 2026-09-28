import { log } from "../middleware/logger";

interface SecretCacheEntry {
  value: string;
  expiresAt: number;
}

const secretCache = new Map<string, SecretCacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Enterprise Secret Manager utility.
 * In GCP Cloud Run / GKE environments, dynamically pulls secret versions from GCP Secret Manager.
 * In local development or CI, falls back cleanly to process.env.
 */
export async function getSecret(secretName: string, defaultValue: string = ''): Promise<string> {
  // 1. Check local in-memory cache first
  const cached = secretCache.get(secretName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // 2. Check local process.env fallback (standard for local dev)
  if (process.env[secretName]) {
    const val = process.env[secretName]!;
    secretCache.set(secretName, { value: val, expiresAt: Date.now() + CACHE_TTL_MS });
    return val;
  }

  // 3. If running in GCP production with project ID, attempt to pull from GCP Secret Manager
  const gcpProjectId = process.env.GCP_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID;
  if (process.env.NODE_ENV === 'production' && gcpProjectId) {
    try {
      // Optional GCP production dependency
      // @ts-ignore
      const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
      const client = new SecretManagerServiceClient();
      const name = `projects/${gcpProjectId}/secrets/${secretName}/versions/latest`;
      
      const [version] = await client.accessSecretVersion({ name });
      const payload = version.payload?.data?.toString();

      if (payload) {
        log('info', `[SecretManager] Retrieved secret "${secretName}" from GCP Secret Manager.`);
        secretCache.set(secretName, { value: payload, expiresAt: Date.now() + CACHE_TTL_MS });
        return payload;
      }
    } catch (err: any) {
      log('warn', `[SecretManager] Could not retrieve secret "${secretName}" from GCP: ${err.message}. Using default.`);
    }
  }

  return defaultValue;
}
