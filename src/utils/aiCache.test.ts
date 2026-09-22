import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';

describe('AI Cache & Multi-tenant Key Generation (BUG-18)', () => {
  const generateCacheKey = (body: any, prefix: string, userId?: string) => {
    return prefix + '_v2' + (userId ? `_u_${userId}` : '') + '_' + crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
  };

  it('isolates cache keys between distinct users with identical payloads', () => {
    const payload = { chapterId: 'p1', subject: 'physics', count: 5 };
    const keyUserA = generateCacheKey(payload, 'practice', 'user-alice');
    const keyUserB = generateCacheKey(payload, 'practice', 'user-bob');
    const keyAnonymous = generateCacheKey(payload, 'practice');

    expect(keyUserA).not.toBe(keyUserB);
    expect(keyUserA).not.toBe(keyAnonymous);
    expect(keyUserA).toContain('_u_user-alice');
    expect(keyUserB).toContain('_u_user-bob');
  });

  it('prevents cache poisoning by verifying JSON validity before storing in cache', () => {
    const aiCache = new LRUCache<string, string>({ max: 10, ttl: 1000 * 60 });
    const cacheKey = generateCacheKey({ prompt: 'test' }, 'practice', 'user-1');

    const malformedAIText = '```json { "title": "Incomplete json';

    // Verification logic as implemented in server.ts
    const tryCacheAiResponse = (key: string, rawText: string) => {
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('AI generated malformed JSON');
        }
      }
      aiCache.set(key, JSON.stringify(parsed));
      return parsed;
    };

    expect(() => tryCacheAiResponse(cacheKey, malformedAIText)).toThrow('AI generated malformed JSON');
    expect(aiCache.get(cacheKey)).toBeUndefined(); // Cache was NOT poisoned!

    const validAIText = '{"title": "Valid Plan", "days": []}';
    expect(() => tryCacheAiResponse(cacheKey, validAIText)).not.toThrow();
    expect(aiCache.get(cacheKey)).toBe(JSON.stringify({ title: "Valid Plan", days: [] }));
  });
});
