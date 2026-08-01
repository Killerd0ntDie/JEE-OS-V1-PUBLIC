export function safelyParseJSON<T>(jsonStr: string | null, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    console.error('Data corruption detected during JSON parse. Falling back to default state.', err);
    return fallback;
  }
}
