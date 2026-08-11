import { describe, expect, it } from 'vitest';
import { sanitizeForFirestore } from './firestoreSanitizer';

describe('sanitizeForFirestore', () => {
  it('replaces non-finite numeric values with safe zeroes while preserving valid data', () => {
    const input = {
      score: Number.NaN,
      total: Number.POSITIVE_INFINITY,
      nested: {
        ratio: Number.NEGATIVE_INFINITY,
        ok: 42,
      },
      list: [1, Number.NaN, { value: Number.POSITIVE_INFINITY }],
      optional: undefined,
    };

    expect(sanitizeForFirestore(input)).toEqual({
      score: 0,
      total: 0,
      nested: {
        ratio: 0,
        ok: 42,
      },
      list: [1, 0, { value: 0 }],
    });
  });
});
