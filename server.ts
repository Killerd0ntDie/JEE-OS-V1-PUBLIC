import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { registerMockTestParserRoutes } from "./server/mockTestParser";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { verifyAuth } from "./server/firebaseAdmin.js";
import rateLimit from "express-rate-limit";
import { LRUCache } from "lru-cache";
import crypto from "crypto";
import { z } from "zod";
import { createServer as createNetServer } from "node:net";
import http from "http";

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

const findAvailablePort = async (preferredPort: number, host: string) => {
  const isPortFree = (port: number) =>
    new Promise<boolean>((resolve) => {
      const tester = createNetServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, host);
    });

  let portToTry = preferredPort;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await isPortFree(portToTry)) {
      return portToTry;
    }
    portToTry += 1;
  }

  throw new Error(`Unable to find an available port starting from ${preferredPort}`);
};

export async function createServerApp() {
  const app = express();
  const host = process.env.HOST || "0.0.0.0";
  const requestedPort = process.env.PORT ? Number(process.env.PORT) : 3000;
  const preferredPort = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 3000;
  const port = await findAvailablePort(preferredPort, host);

  // Render (and most PaaS hosts) run this app behind a reverse proxy.
  // Using 'loopback, linklocal, uniquelocal' instead of '1' ensures we don't blindly
  // trust X-Forwarded-For if not proxied correctly.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  app.use(helmet({
    contentSecurityPolicy: false // disable if using Vite HMR or inline scripts, configure appropriately for production
  }));
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.VITE_APP_URL || '*' : '*'
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Rate Limiters
  const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // Limit each user/IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
    keyGenerator: (req: any) => {
      return req.user?.uid || req.ip || req.headers['x-forwarded-for'] || 'unknown';
    }
  });

  const healthLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute for health checks
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }
  });

  // LRU Cache (In-Memory)
  const aiCache = new LRUCache<string, string>({
    max: 500,
    ttl: 1000 * 60 * 60, // 1 hour
  });

  const generateCacheKey = (body: any, prefix: string) => {
    return prefix + '_v2_' + crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
  };

  const safeGetText = (response: any, fallback: string): string => {
    try {
      return response.text ?? fallback;
    } catch {
      console.warn('[Gemini API] Response text blocked by safety filters.');
      return fallback;
    }
  };

  let globalKeyRoundRobinIndex = 0;

  const getGeminiApiKeys = (req?: any): string[] => {
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

  const resolveGeminiApiKey = (req: any): string => {
    const all = getGeminiApiKeys(req);
    return all.length > 0 ? all[0] : '';
  };

  const preEscapeJsonLatex = (str: string): string => {
    if (!str) return str;
    return str
      // Double single backslashes in front of common LaTeX commands inside JSON strings
      .replace(/(?<!\\)\\(text|frac|dfrac|cfrac|times|theta|tau|tilde|tan|to|top|triangle|beta|bar|bullet|bmod|bf|rho|right|rangle|nu|neq|nabla|not|neg|nearrow|forall|flat|from)\b/g, '\\\\$1');
  };

  const repairTruncatedJson = (jsonStr: string): any => {
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

  const generateWithFallback = async (ai: any, contents: any, config: any) => {
    const availableKeys = getGeminiApiKeys(config?.req);
    if (availableKeys.length === 0 && (!ai || !process.env.GEMINI_API_KEY)) {
      throw new Error('No GEMINI_API_KEY configured. Please provide at least one Gemini API key.');
    }

    // Top quality and highest limit Gemini models in optimal order
    const baseCandidates = [
      'gemini-3.8-flash',      // Google's flagship frontier Flash (Sept 2026), highest vision & math reasoning quality
      'gemini-3.5-flash',      // Stable fast multimodal Flash with proven high throughput
      'gemini-3.5-flash-lite',  // Ultra-fast, minimal latency, generous rate limits
      'gemini-2.5-flash',      // Ultra-reliable production flash with 1M token context
      'gemini-2.5-flash-lite',  // Stable lightweight Flash
      'gemini-3.1-flash-lite'   // Frontier performance at lightweight cost
    ];

    const candidateModels = config?.preferredModel
      ? [config.preferredModel, ...baseCandidates.filter(m => m !== config.preferredModel)]
      : baseCandidates;

    // Distribute incoming requests across all keys in pool using round-robin load balancing
    const startKeyIdx = availableKeys.length > 0
      ? (globalKeyRoundRobinIndex++) % availableKeys.length
      : 0;

    // Ordered keys starting with the round-robin key, followed by all remaining pool keys
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
            console.warn(`[Gemini API] Model ${model} rejected thinkingConfig (${msg}). Retrying without thinkingConfig...`);
            modelConfig = { ...modelConfig, thinkingConfig: undefined };
            continue;
          }

          const isDailyQuotaExhausted = msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
          const isRateLimited = error.status === 429 || isDailyQuotaExhausted;
          const isOverloaded = error.status === 503 || msg.includes('high demand') || msg.includes('UNAVAILABLE');
          const isTimeout = error.status === 504 || error.status === 408 || msg.includes('DEADLINE_EXCEEDED') || msg.includes('Deadline expired');
          const isModelUnavailable = error.status === 404 || msg.includes('NOT_FOUND') || msg.includes('no longer available');

          // If rate limited or quota exhausted on this key, rotate immediately to the next key in the pool!
          if (isRateLimited && orderedKeys.length > 1 && activeKeyIndex + 1 < orderedKeys.length) {
            activeKeyIndex++;
            const nextKey = orderedKeys[activeKeyIndex];
            console.warn(`[Gemini Pool] Key ${activeKeyIndex}/${orderedKeys.length} hit 429/quota on ${model}. Rotating to key ${activeKeyIndex + 1}/${orderedKeys.length}...`);
            activeAi = new GoogleGenAI({
              apiKey: nextKey,
              httpOptions: { timeout: 60000, headers: { 'User-Agent': 'aistudio-build' } }
            });
            continue;
          }

          if (!isRateLimited && (isOverloaded || isTimeout) && attempt < maxRetries) {
            const delay = Math.min((attempt + 1) * 2000, 6000);
            console.warn(`[Gemini API] Model ${model} returned ${error.status || 'overload'}. Retrying attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            continue;
          }

          if (isRateLimited || isOverloaded || isTimeout || isModelUnavailable) {
            console.warn(`[Gemini API] Model ${model} exhausted across all keys (${error.status || 'rate limit/quota'}). Trying next candidate model...`);
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

  const CoachSchema = z.object({
    mission: z.array(z.any()).optional(),
    weakTopics: z.array(z.any()).optional(),
    revisionQueue: z.array(z.string()).optional(),
    plannerDecisions: z.array(z.any()).optional(),
    analyticsSummary: z.any().optional(),
    chapters: z.array(z.any()).optional(),
    remainingDays: z.number().optional(),
    question: z.string().max(1000).optional(),
    targetYear: z.string().optional(),
    targetCollege: z.string().optional(),
    coachingType: z.string().optional(),
    mockHistory: z.array(z.any()).optional()
  });

  const validateCoach = (req: any, res: any, next: any) => {
    const parsedBody = CoachSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };

  // API route for Health Check (Uptime Monitors)
  app.get("/api/health", healthLimiter, (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API route for Coach Engine
  app.post("/api/coach/analyze", verifyAuth, apiLimiter, validateCoach, async (req: any, res: any) => {
    try {
      if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
        return res.status(503).json({ error: "AI service is currently unavailable." });
      }
      const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { timeout: 45000,
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      }) : null;
      const { 
        mission, 
        weakTopics, 
        revisionQueue, 
        plannerDecisions, 
        analyticsSummary,
        chapters,
        remainingDays,
        question,
        targetYear,
        targetCollege,
        mockHistory
      } = req.validatedBody;

      const prompt = `
You are an expert, highly encouraging AI Coach for a student preparing for the JEE exam.
Your goal is to help the student understand their current study schedule and provide actionable, data-driven advice.

STUDENT TELEMETRY:
- Target: ${targetCollege} (${targetYear})
- Remaining Days for Exam: ${remainingDays}
- Today's Scheduled Mission: ${JSON.stringify(mission, null, 2)}
- Active Unresolved Mistakes: ${JSON.stringify(weakTopics?.slice(0, 5) || [], null, 2)}
- Revision Backlog / Due Queue: ${JSON.stringify(revisionQueue?.slice(0, 5).map(r => ({ name: r.chapterName, daysOverdue: r.daysOverdue })) || [], null, 2)}
- Planner Engine Outputs: ${JSON.stringify(plannerDecisions?.slice(0, 5).map(p => ({ task: p.taskName, chapter: p.chapterName, priority: p.priorityScore })) || [], null, 2)}
- Filtered Active Chapters: ${JSON.stringify(chapters?.filter(c => c.completion > 0 && c.completion < 100).map(c => ({ name: c.name, subject: c.subject, completion: c.completion, priority: c.priorityScore })) || [], null, 2)}
- Mock Test History: ${JSON.stringify(mockHistory?.slice(0, 3) || [], null, 2)}
- Recent Performance Analytics: ${JSON.stringify(analyticsSummary, null, 2)}

${question ? `
STUDENT QUESTION:
"${question}"

Provide a direct, helpful, and motivating answer to the student's question based on their data.
Keep it strictly under 150 words.
` : `
Provide a brief, encouraging summary of today's study plan.
Highlight the most important task, any urgent revisions, and give a brief word of encouragement.
Keep it strictly under 100 words.
`}

FORMATTING RULES (apply to every response, always):
- Keep your analysis/reply clean, friendly, and strictly under 100 words.
- Do not include unnecessary info that wasn't asked for.
- STRICT NO-MARKDOWN RULE: Do not use markdown syntax in your analysis (no **bold**, no # headers, no ==== banners, no code fences around prose).

If applicable, suggest up to 2 actionable quick-actions for the user in the actions array.
(use an empty array \`[]\` if there are no relevant actions).
Valid Action examples (as payload):
- { "type": "ADD_MISSION", "payload": { "subject": "physics", "title": "Mechanics Practice", "duration": 60 } }
- { "type": "UPDATE_TARGET", "payload": { "targetYear": "2025", "targetCollege": "IIT Bombay" } }
- { "type": "UPDATE_CHAPTER", "payload": { "chapterId": "physics-1", "status": "Learning" } }
- { "type": "CLEAR_MISSIONS", "payload": {} }
`;

      const cacheKey = generateCacheKey(req.body, 'coach');
      const cachedResponse = aiCache.get(cacheKey);
      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        return res.json({ analysis: parsed.analysis, cached: true, actions: parsed.actions });
      }

      const response = await generateWithFallback(ai, prompt, {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis: { type: Type.STRING, description: "Highly specific, personalized text answer or summary. No markdown allowed." },
              actions: {
                type: Type.ARRAY,
                description: "Up to 2 actionable quick-actions for the UI to execute. Empty array if none.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    payload: { 
                      type: Type.OBJECT,
                      properties: {
                        subject: { type: Type.STRING, description: "Required for ADD_MISSION. E.g. physics, chemistry, maths" },
                        title: { type: Type.STRING, description: "Required for ADD_MISSION. Task title" },
                        duration: { type: Type.NUMBER, description: "Required for ADD_MISSION. Duration in minutes" },
                        chapterId: { type: Type.STRING, description: "Required for UPDATE_CHAPTER" },
                        status: { type: Type.STRING, description: "Required for UPDATE_CHAPTER" },
                        targetYear: { type: Type.NUMBER, description: "Required for UPDATE_TARGET" },
                        targetCollege: { type: Type.STRING, description: "Required for UPDATE_TARGET" }
                      }
                    }
                  },
                  required: ["type", "payload"]
                }
              }
            },
            required: ["analysis", "actions"]
          }
        });

      let cleanText = safeGetText(response, "{}");
      // Strip any residual thinking tags if they leak into the response (they shouldn't with Schema)
      cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      let parsedResult;
      try {
        parsedResult = JSON.parse(cleanText);
      } catch (e) {
        console.error("Failed to parse Structured Output from Gemini:", e);
        parsedResult = { analysis: "I encountered an error analyzing your data. Please try again.", actions: [] };
      }

      const { analysis, actions } = parsedResult;

      aiCache.set(cacheKey, JSON.stringify({ analysis, actions }));
      res.json({ analysis, actions });
    } catch (error: any) {
      console.error("Coach API error:", error);
      res.status(500).json({ error: "Internal server error during analysis" });
    }
  });

  const PracticeSchema = z.object({
    chapterId: z.string().min(1),
    subject: z.string().min(1),
    count: z.number().optional()
  });

  const validatePractice = (req: any, res: any, next: any) => {
    const parsedBody = PracticeSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };

  // API route for PyqGenerator
  app.post("/api/practice/generate", verifyAuth, apiLimiter, validatePractice, async (req: any, res: any) => {
    try {
      if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
        return res.status(503).json({ error: "AI service is currently unavailable." });
      }
      
      const { chapterId, subject, count } = req.validatedBody;
      
      const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
      }) : null;
      
      const prompt = `
      You are an expert IIT-JEE professor. 
      Generate exactly ${count || 3} highly realistic, challenging JEE Advanced level questions for the subject: ${subject} and chapter/topic ID: ${chapterId}.
      
      Requirements:
      1. Use LaTeX heavily for any math or chemical formulas (wrap inline with $ and block with $$).
      2. Ensure exactly 4 options per question.
      3. The solution must be extremely detailed and step-by-step.
      4. Make sure questions are at the actual difficulty level of JEE Advanced.

      OUTPUT FORMAT:
      Wrap your JSON array in a markdown codeblock \`\`\`json
      Schema per object:
      {
        "topic": "string",
        "type": "MCQ_SINGLE",
        "difficulty": "JEE_ADVANCED",
        "content": "Question text",
        "options": [
          {"id": "A", "text": "Option A"},
          {"id": "B", "text": "Option B"},
          {"id": "C", "text": "Option C"},
          {"id": "D", "text": "Option D"}
        ],
        "solution": {
          "text": "Detailed solution text",
          "correctOptionIds": ["A"]
        }
      }
      `;
      
      const cacheKey = generateCacheKey(req.body, 'practice');
      const cachedResponse = aiCache.get(cacheKey);
      if (cachedResponse) {
        return res.json({ questions: JSON.parse(cachedResponse), cached: true });
      }
      
      const response = await generateWithFallback(ai, prompt, {
            responseMimeType: "application/json",
            temperature: 0.7
        });


      let text = safeGetText(response, "[]").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      let jsonStr = "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      aiCache.set(cacheKey, jsonStr);
      res.json({ questions: JSON.parse(jsonStr) });
    } catch (error: any) {
      console.error("Practice API error:", error);
      res.status(500).json({ error: "Internal server error during practice generation" });
    }
  });

  const MocktestSchema = z.object({
    chapterId: z.string().min(1),
    chapterName: z.string().optional(),
    subject: z.string().min(1),
    count: z.number().optional(),
    difficulty: z.string().optional()
  });

  const validateMocktest = (req: any, res: any, next: any) => {
    const parsedBody = MocktestSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };

  const handleMocktestGenerate = async (req: any, res: any) => {
    try {
      if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
        return res.status(503).json({ error: "AI service is currently unavailable." });
      }
      
      const { chapterId, chapterName, subject, count, difficulty } = req.validatedBody;
      const numQuestions = count || 10;
      const diffStr = difficulty || "JEE_MAIN";
      
      const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
      }) : null;
      
      const prompt = `
      You are an expert IIT-JEE professor. 
      Generate exactly ${numQuestions} highly realistic, challenging JEE level questions for the subject: ${subject} and chapter/topic: ${chapterName || chapterId}.
      Difficulty level: ${diffStr}.
      
      Requirements:
      1. Use LaTeX heavily for any math or chemical formulas (wrap inline with $ and block with $$).
      2. Ensure exactly 4 options per question.
      3. The solution must be extremely detailed and step-by-step.
      4. Make sure questions are at the actual difficulty level of ${diffStr}.

      OUTPUT FORMAT:
      Return ONLY a JSON array.
      Schema per object:
      {
        "topic": "string",
        "type": "MCQ_SINGLE",
        "difficulty": "${diffStr}",
        "content": "Question text with LaTeX",
        "options": [
          {"id": "A", "text": "Option A"},
          {"id": "B", "text": "Option B"},
          {"id": "C", "text": "Option C"},
          {"id": "D", "text": "Option D"}
        ],
        "solution": {
          "text": "Detailed step by step solution",
          "correctOptionIds": ["A"]
        }
      }
      `;
      
      const cacheKey = generateCacheKey(req.body, 'mocktest');
      const cachedResponse = aiCache.get(cacheKey);
      if (cachedResponse) {
        return res.json({ questions: JSON.parse(cachedResponse), cached: true });
      }
      
      const response = await generateWithFallback(ai, prompt, {
            responseMimeType: "application/json",
            temperature: 0.7
        });

      let text = safeGetText(response, "[]");
      text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      let jsonStr = "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      let parsed = [];
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse JSON from AI:", e);
        throw new Error("AI generated malformed JSON. Please try again.");
      }

      aiCache.set(cacheKey, JSON.stringify(parsed));
      res.json({ questions: parsed });
    } catch (error: any) {
      console.error("Mocktest API error:", error);
      res.status(500).json({ error: "Internal server error during mock test generation" });
    }
  };

  app.post("/api/mocktest/generate", verifyAuth, apiLimiter, validateMocktest, handleMocktestGenerate);
  app.post("/api/generate-chapter-mock", verifyAuth, apiLimiter, validateMocktest, handleMocktestGenerate);

  const ScorecardSchema = z.object({
    rawText: z.string().min(10, "Text must be at least 10 characters long").max(100000, "Text exceeds maximum limit"),
  });

  const validateScorecard = (req: any, res: any, next: any) => {
    const parsedBody = ScorecardSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };

  app.post("/api/mocktest/parse-scorecard", verifyAuth, apiLimiter, validateScorecard, async (req: any, res: any) => {
    try {
      if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
        return res.status(503).json({ error: "AI service is currently unavailable." });
      }

      const { rawText } = req.validatedBody;
      const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
      }) : null;

      const prompt = `
      You are an expert AI tutor parsing a student's JEE Mock Test results from a raw PDF extraction.
      Analyze the following text and extract the overall score, correct/incorrect counts, and a detailed list of every mistake the student made.
      Raw Text:
      """
      ${rawText.substring(0, 30000)}
      """
      `;

      const cacheKey = generateCacheKey(req.body, 'scorecard_parse');
      const cachedResponse = aiCache.get(cacheKey);
      if (cachedResponse) {
        return res.json({ ...JSON.parse(cachedResponse), cached: true });
      }

      const response = await generateWithFallback(ai, prompt, {
        responseMimeType: "application/json",
        temperature: 0.1,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalQuestions: { type: Type.NUMBER },
            attempted: { type: Type.NUMBER },
            correct: { type: Type.NUMBER },
            incorrect: { type: Type.NUMBER },
            score: { type: Type.NUMBER },
            mistakes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.NUMBER },
                  subject: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  studentAnswer: { type: Type.STRING },
                  correctAnswer: { type: Type.STRING },
                  reasoning: { type: Type.STRING }
                },
                required: ["questionNumber", "subject", "topic", "studentAnswer", "correctAnswer"]
              }
            }
          },
          required: ["totalQuestions", "attempted", "correct", "incorrect", "score", "mistakes"]
        }
      });

      let text = safeGetText(response, "{}").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const parsed = JSON.parse(text);
      aiCache.set(cacheKey, JSON.stringify(parsed));
      res.json(parsed);
    } catch (error: any) {
      console.error("Scorecard Parse API error:", error);
      res.status(500).json({ error: "Internal server error during scorecard parsing" });
    }
  });

  const ExplanationSchema = z.object({
    questionContent: z.string().min(1),
    options: z.array(z.any()).optional(),
    correctAnswer: z.string().optional(),
    subject: z.string().optional(),
    topic: z.string().optional()
  });

  const validateExplanation = (req: any, res: any, next: any) => {
    const parsedBody = ExplanationSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };

  app.post("/api/mocktest/generate-explanation", verifyAuth, apiLimiter, validateExplanation, async (req: any, res: any) => {
    try {
      const apiKey = resolveGeminiApiKey(req);
      if (!apiKey && !process.env.GROQ_API_KEY) {
        return res.status(503).json({ error: "AI service is currently unavailable. GEMINI_API_KEY is not configured." });
      }

      const { questionContent, options, correctAnswer, subject, topic } = req.validatedBody;
      const ai = apiKey ? new GoogleGenAI({
        apiKey,
        httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
      }) : null;

      const prompt = `
      Provide a rigorous, step-by-step JEE derivation and explanation for this question:
      Question: ${questionContent}
      Options: ${JSON.stringify(options || [])}
      Correct Answer: ${correctAnswer || 'Unknown'}
      Subject: ${subject || 'General'}
      Topic: ${topic || 'General'}

      Include:
      **Key Concept & Formula**
      **Step 1: Detailed Derivation**
      **Conclusion & Correct Option**
      `;

      const response = await generateWithFallback(ai, prompt, {
        temperature: 0.2,
        maxOutputTokens: 2048
      });

      const text = safeGetText(response, "").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      res.json({ explanation: text });
    } catch (error: any) {
      console.error("Generate Explanation API error:", error);
      res.status(500).json({ error: "Internal server error during explanation generation" });
    }
  });

  const RevisionPlanSchema = z.object({
    days: z.number().min(1).max(30).optional(),
    dailyAvailableHours: z.number().min(1).max(18).optional(),
    bottlenecks: z.array(z.any()).optional(),
    lowRetentionChapters: z.array(z.any()).optional(),
    targetCollege: z.string().optional(),
    targetYear: z.string().optional()
  });

  const validateRevisionPlan = (req: any, res: any, next: any) => {
    const parsedBody = RevisionPlanSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };

  // API route for AI Deep Revision & Study Plan Generator
  app.post("/api/planner/generate-plan", verifyAuth, apiLimiter, validateRevisionPlan, async (req: any, res: any) => {
    try {
      if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
        return res.status(503).json({ error: "AI service is currently unavailable." });
      }

      const { days, dailyAvailableHours, bottlenecks, lowRetentionChapters, targetCollege, targetYear } = req.validatedBody;
      const planDays = days || 3;
      const hours = dailyAvailableHours || 6.5;

      const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
      }) : null;

      const prompt = `
      You are a master IIT-JEE Rank-1 Strategist.
      Synthesize an ultra-optimized, realistic ${planDays}-day study and revision sprint for a student aiming for ${targetCollege || 'IIT Bombay'} (${targetYear || '2026'}).

      STUDENT TELEMETRY:
      - Available Daily Capacity: ${hours} hours/day
      - Active Backlog Bottlenecks: ${JSON.stringify(bottlenecks || [])}
      - Overdue Retention Decay Chapters: ${JSON.stringify(lowRetentionChapters || [])}

      REQUIREMENTS:
      1. Distribute tasks realistically across ${planDays} days, staying within ${hours} hours per day.
      2. Ensure a healthy subject balance across Physics, Chemistry, and Maths.
      3. Focus on resolving active bottlenecks and reviewing overdue retention decay topics first.
      4. Each task must have a clear subject, title, chapter, type ("Solve PYQs", "Theory Review", "DPP Practice", "Mock Test"), duration in minutes, and priority ("High", "Medium").

      OUTPUT FORMAT:
      Wrap your JSON response in a markdown codeblock \`\`\`json
      Schema:
      {
        "summary": "Brief 1-2 sentence strategic overview of the plan",
        "days": [
          {
            "dayNumber": 1,
            "title": "Day 1 Focus Title",
            "focusSubject": "physics",
            "tasks": [
              {
                "title": "Task title",
                "subject": "physics",
                "chapter": "Chapter Name",
                "type": "Solve PYQs",
                "durationMinutes": 90,
                "priority": "High"
              }
            ]
          }
        ]
      }
      `;

      const cacheKey = generateCacheKey(req.body, 'revision_plan');
      const cachedResponse = aiCache.get(cacheKey);
      if (cachedResponse) {
        return res.json({ plan: JSON.parse(cachedResponse), cached: true });
      }

      const response = await generateWithFallback(ai, prompt, {
          responseMimeType: "application/json",
          temperature: 0.7
        });

      let text = safeGetText(response, "{}").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      let jsonStr = "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      aiCache.set(cacheKey, jsonStr);
      res.json({ plan: JSON.parse(jsonStr) });
    } catch (error: any) {
      console.error("Revision Plan API error:", error);
      res.status(500).json({ error: "Internal server error during revision plan generation" });
    }
  });

  registerMockTestParserRoutes(app, {
    verifyAuth,
    apiLimiter,
    resolveGeminiApiKey,
    aiCache,
    repairTruncatedJson,
    safeGetText,
    generateWithFallback
  });

  return app;
}

async function startServer() {
  const host = process.env.HOST || "0.0.0.0";
  const requestedPort = process.env.PORT ? Number(process.env.PORT) : 3000;
  const preferredPort = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 3000;
  const port = await findAvailablePort(preferredPort, host);

  const app = await createServerApp();
  const httpServer = http.createServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
        port,
        strictPort: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // Return 404 for missing static assets instead of serving index.html
    // This prevents MIME type errors ("Expected a JavaScript module... responded with a MIME type of text/html")
    app.use('/assets', (req, res) => {
      res.status(404).send('Asset not found');
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(port, host, () => {
    const fallbackMessage = port !== preferredPort ? ` (fallback from ${preferredPort})` : "";
    console.log(`Server running on http://localhost:${port}${fallbackMessage}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
