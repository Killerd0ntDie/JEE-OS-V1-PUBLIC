export function sanitizeForFirestore(obj: any, inArray = false): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj) || Number.isNaN(obj)) return 0;
    return obj;
  }
  if (Array.isArray(obj)) {
    if (inArray) {
      // Firebase Firestore does NOT support nested arrays (arrays directly inside arrays).
      // Convert nested array into an object: { '0': item0, '1': item1, ... }
      const arrObj: Record<string, any> = {};
      obj.forEach((item, index) => {
        const sanitized = sanitizeForFirestore(item, false);
        if (sanitized !== undefined) {
          arrObj[index.toString()] = sanitized;
        }
      });
      return arrObj;
    }
    return obj.map(item => sanitizeForFirestore(item, true));
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value, false);
      }
    }
    return cleaned;
  }
  return obj;
}
