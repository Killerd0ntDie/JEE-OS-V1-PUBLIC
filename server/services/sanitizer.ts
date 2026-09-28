/**
 * Defense-in-depth sanitization for user-provided text before interpolation into LLM prompts.
 */

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|commands)/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/gi,
  /you\s+are\s+now\s+(unrestricted|in\s+developer\s+mode|dan|jailbroken)/gi,
  /system\s*:\s*you\s+are/gi,
  /repeat\s+(everything|the\s+instructions|the\s+prompt)\s+above/gi,
  /output\s+your\s+initial\s+(instructions|system\s+prompt)/gi,
  /<\|(?:im_start|im_end|endoftext)\|>/gi,
  /\[\/?(?:inst|sys)\]/gi,
  /<<\/?(?:sys)>>/gi,
  /<\/?system>/gi,
  /<\/?instructions>/gi,
];

/**
 * Sanitizes user input text to neutralize prompt injection attempts and strip malicious delimiters.
 */
export function sanitizePromptInput(input: unknown, maxLength: number = 2000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // 1. Enforce length boundary
  let sanitized = input.slice(0, maxLength);

  // 2. Strip NULL bytes, zero-width characters, and non-printable control characters (except newline, carriage return, tab)
  sanitized = sanitized
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    .trim();

  // 3. Neutralize known prompt injection triggers by defanging them
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[filtered]');
  }

  // 4. Defang fake markdown/fencing delimiter breakouts that attempt to close outer instructions
  sanitized = sanitized
    .replace(/```(?:json|markdown|system|prompt)?/gi, '` ` `')
    .replace(/={4,}\s*(?:SYSTEM|PROMPT|INSTRUCTIONS)\s*={4,}/gi, '===');

  return sanitized;
}

/**
 * Sanitizes an object deeply so any string values within are cleaned for AI prompt context.
 */
export function sanitizeContextObject<T>(obj: T, maxLengthPerField: number = 1000): T {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizePromptInput(obj, maxLengthPerField) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeContextObject(item, maxLengthPerField)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      result[key] = sanitizePromptInput(val, maxLengthPerField);
    } else if (typeof val === 'object' && val !== null) {
      result[key] = sanitizeContextObject(val, maxLengthPerField);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}
