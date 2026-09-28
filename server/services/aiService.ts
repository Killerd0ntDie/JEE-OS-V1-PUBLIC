import { GoogleGenAI } from "@google/genai";
import { LRUCache } from "lru-cache";
import crypto from "crypto";
import { log } from "../middleware/logger";

// LRU Cache (In-Memory)
export const aiCache = new LRUCache<string, string>({
  max: 500,
  ttl: 1000 * 60 * 60, // 1 hour
});

export const generateCacheKey = (body: any, prefix: string): string => {
  return prefix + '_v2_' + crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
};

export const safeGetText = (response: any, fallback: string): string => {
  try {
    return response.text ?? fallback;
  } catch {
    log('warn', '[Gemini API] Response text blocked by safety filters.');
    return fallback;
  }
};

let globalKeyRoundRobinIndex = 0;

export const getGeminiApiKeys = (req?: any): string[] => {
  const keys: string[] = [];
  const clientProvidedKey = req?.headers?.['x-gemini-api-key'];
  if (typeof clientProvidedKey === 'string' && clientProvidedKey.trim().length > 10) {
    keys.push(clientProvidedKey.trim());
  }

  const envSources: string[] = [
    process.env.GEMINI_API_KEY || '',
    process.env.GEMINI_API_KEYS || ''
  ];

  // Automatically detect numbered keys GEMINI_API_KEY_1 through GEMINI_API_KEY_20
  for (let i = 1; i <= 20; i++) {
    const numberedKey = process.env[`GEMINI_API_KEY_${i}`];
    if (numberedKey) envSources.push(numberedKey);
  }

  envSources.forEach(source => {
    if (!source) return;
    source.split(/[\r\n,;\s]+/).forEach(k => {
      const trimmed = k.trim().replace(/^["']|["']$/g, '');
      if (trimmed.length > 10) keys.push(trimmed);
    });
  });

  return Array.from(new Set(keys));
};

export const resolveGeminiApiKey = (req: any): string => {
  const all = getGeminiApiKeys(req);
  return all.length > 0 ? all[0] : '';
};

export const preEscapeJsonLatex = (str: string): string => {
  if (!str) return str;
  return str.replace(
    /(?<!\\)\\(text|frac|dfrac|cfrac|times|theta|tau|tilde|tan|to|top|triangle|beta|bar|bullet|bmod|bf|rho|right|rangle|nu|neq|nabla|not|neg|nearrow|forall|flat|from)\b/g,
    '\\\\$1'
  );
};

export const repairTruncatedJson = (jsonStr: string): any => {
  if (!jsonStr) return null;
  const sanitizedInput = preEscapeJsonLatex(jsonStr);
  try {
    return JSON.parse(sanitizedInput);
  } catch (initialErr) {
    let clean = sanitizedInput.trim();
    const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
    if (codeBlockMatch) {
      clean = codeBlockMatch[1].trim();
    }
    try {
      return JSON.parse(clean);
    } catch (_) {}

    const questionsIndex = clean.indexOf('"questions"');
    if (questionsIndex === -1) {
      const skeletonIndex = clean.indexOf('"skeleton"');
      if (skeletonIndex === -1) throw initialErr;
    }

    let lastBrace = clean.lastIndexOf('}');
    while (lastBrace > 0) {
      for (const ending of [']}', '}]}', '}}']) {
        try {
          const candidate = clean.substring(0, lastBrace + 1) + ending;
          const parsed = JSON.parse(candidate);
          if ((parsed.questions && Array.isArray(parsed.questions)) || (parsed.skeleton && Array.isArray(parsed.skeleton))) {
            return parsed;
          }
        } catch (_) {}
      }
      lastBrace = clean.lastIndexOf('}', lastBrace - 1);
    }
    throw initialErr;
  }
};

export const generateWithFallback = async (ai: any, contents: any, config: any): Promise<any> => {
  const availableKeys = getGeminiApiKeys(config?.req);
  if (availableKeys.length === 0 && (!ai || !process.env.GEMINI_API_KEY)) {
    throw new Error('No GEMINI_API_KEY configured. Please provide at least one Gemini API key.');
  }

  const baseCandidates = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-2.0-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  const candidateModels = config?.preferredModel
    ? [config.preferredModel, ...baseCandidates.filter(m => m !== config.preferredModel)]
    : baseCandidates;

  const startKeyIdx = availableKeys.length > 0
    ? (globalKeyRoundRobinIndex++) % availableKeys.length
    : 0;

  const orderedKeys = availableKeys.length > 0
    ? [...availableKeys.slice(startKeyIdx), ...availableKeys.slice(0, startKeyIdx)]
    : [];

  let lastError: any = null;
  const maxRetries = process.env.NODE_ENV === 'test' ? 0 : 2;

  for (const model of candidateModels) {
    let modelConfig = config;
    if (config?.thinkingConfig) {
      if (model.includes('3.') || model.includes('3-')) {
        const rawLevel = config.thinkingConfig.thinkingLevel ? String(config.thinkingConfig.thinkingLevel).toLowerCase() : 'low';
        const level = rawLevel === 'minimal' ? 'low' : rawLevel;
        modelConfig = { ...config, thinkingConfig: { thinkingLevel: level } };
      } else if (model.includes('2.0') || model.includes('2.5') || model.includes('flash-latest') || model.includes('1.5')) {
        const budget = config.thinkingConfig.thinkingBudget !== undefined 
          ? config.thinkingConfig.thinkingBudget 
          : 2048;
        modelConfig = { ...config, thinkingConfig: { thinkingBudget: budget } };
      } else {
        modelConfig = { ...config, thinkingConfig: undefined };
      }
    }

    let activeKeyIndex = 0;
    let activeAi = orderedKeys.length > 0
      ? new GoogleGenAI({
          apiKey: orderedKeys[0],
          httpOptions: { timeout: 60000, headers: { 'User-Agent': 'aistudio-build' } }
        })
      : ai;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await activeAi.models.generateContent({
          model,
          contents,
          config: modelConfig
        });
      } catch (error: any) {
        lastError = error;
        const msg = String(error?.message || '');

        const isThinkingUnsupported = (error.status === 400 || msg.includes('INVALID_ARGUMENT')) &&
          (msg.includes('Thinking level') || msg.includes('thinking_level') || msg.includes('thinking level') || msg.includes('thinkingConfig') || msg.includes('thinking'));
        if (isThinkingUnsupported && modelConfig?.thinkingConfig) {
          log('warn', `[Gemini API] Model ${model} rejected thinkingConfig (${msg}). Retrying without thinkingConfig...`);
          modelConfig = { ...modelConfig, thinkingConfig: undefined };
          continue;
        }

        const isDailyQuotaExhausted = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
        const isRateLimited = error.status === 429 || isDailyQuotaExhausted;
        const isOverloaded = error.status === 503 || msg.includes('high demand') || msg.includes('UNAVAILABLE');
        const isTimeout = error.status === 504 || error.status === 408 || msg.includes('DEADLINE_EXCEEDED') || msg.includes('Deadline expired');
        const isModelUnavailable = error.status === 404 || msg.includes('NOT_FOUND') || msg.includes('no longer available');

        if (isRateLimited && orderedKeys.length > 1 && activeKeyIndex + 1 < orderedKeys.length) {
          activeKeyIndex++;
          const nextKey = orderedKeys[activeKeyIndex];
          log('warn', `[Gemini Pool] Key ${activeKeyIndex}/${orderedKeys.length} hit 429/quota on ${model}. Rotating to key ${activeKeyIndex + 1}/${orderedKeys.length}...`);
          activeAi = new GoogleGenAI({
            apiKey: nextKey,
            httpOptions: { timeout: 60000, headers: { 'User-Agent': 'aistudio-build' } }
          });
          continue;
        }

        if (isOverloaded) {
          log('warn', `[Gemini API] Model ${model} is experiencing high demand (503). Fast-falling back to next candidate model...`);
          break;
        }

        if (!isRateLimited && isTimeout && attempt < maxRetries) {
          const delay = Math.min((attempt + 1) * 2000, 6000);
          log('warn', `[Gemini API] Model ${model} returned ${error.status || 'timeout'}. Retrying attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }

        if (isRateLimited || isOverloaded || isTimeout || isModelUnavailable) {
          log('warn', `[Gemini API] Model ${model} exhausted across all keys (${error.status || 'rate limit/quota'}). Trying next candidate model...`);
          if (isRateLimited && process.env.NODE_ENV !== 'test') {
            await new Promise(res => setTimeout(res, 1000));
          }
          break;
        }
        throw error;
      }
    }
  }

  throw lastError || new Error("All Gemini models and pooled keys exhausted.");
};
