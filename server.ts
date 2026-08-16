import express from "express";
import path from "path";
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

async function startServer() {
  const app = express();
  const host = process.env.HOST || "0.0.0.0";
  const requestedPort = process.env.PORT ? Number(process.env.PORT) : 3000;
  const preferredPort = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 3000;
  const port = await findAvailablePort(preferredPort, host);

  // Render (and most PaaS hosts) run this app behind a reverse proxy.
  // Using 'loopback, linklocal, uniquelocal' instead of '1' ensures we don't blindly
  // trust X-Forwarded-For if not proxied correctly.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  app.use(express.json({ limit: '5mb' }));

  // Rate Limiter
  const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
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

  const generateWithFallback = async (ai: any, prompt: string, config: any) => {
    try {
      return await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config
      });
    } catch (error: any) {
      if (error.status === 503 || String(error.message).includes('high demand') || String(error.message).includes('UNAVAILABLE')) {
        console.warn("[Gemini API] gemini-3.6-flash is overloaded (503). Falling back to gemini-3.1-pro...");
        return await ai.models.generateContent({
          model: 'gemini-3.1-pro',
          contents: prompt,
          config
        });
      }
      throw error;
    }
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
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API route for Coach Engine
  app.post("/api/coach/analyze", apiLimiter, validateCoach, verifyAuth, async (req: any, res: any) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured. Create a .env file with GEMINI_API_KEY=your_key" });
      }
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
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
      res.status(500).json({ error: "Internal server error during analysis: " + error.message });
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
  app.post("/api/practice/generate", apiLimiter, validatePractice, verifyAuth, async (req: any, res: any) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured." });
      }
      
      const { chapterId, subject, count } = req.validatedBody;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      
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
      res.status(500).json({ error: "Internal server error during practice generation: " + error.message });
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

  // API route for Mock Test Generator
  app.post("/api/mocktest/generate", apiLimiter, validateMocktest, verifyAuth, async (req: any, res: any) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured." });
      }
      
      const { chapterId, chapterName, subject, count, difficulty } = req.validatedBody;
      const numQuestions = count || 10;
      const diffStr = difficulty || "JEE_MAIN";
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      
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
      // Clean up any potential markdown if the model hallucinated it despite application/json
      text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      // Remove think blocks
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // Ensure we extract the array if there is trailing/leading text
      let jsonStr = "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      let parsed = [];
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        // If strict parsing fails, fallback to raw text or a safer parse
        console.error("Failed to parse JSON from AI:", e);
        throw new Error("AI generated malformed JSON. Please try again.");
      }

      aiCache.set(cacheKey, JSON.stringify(parsed));
      res.json({ questions: parsed });
    } catch (error: any) {
      console.error("Mocktest API error:", error);
      res.status(500).json({ error: "Internal server error during mock test generation: " + error.message });
    }
  });

  const RevisionPlanSchema = z.object({
    days: z.number().optional(),
    dailyAvailableHours: z.number().optional(),
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
  app.post("/api/planner/generate-plan", apiLimiter, validateRevisionPlan, verifyAuth, async (req: any, res: any) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured." });
      }

      const { days, dailyAvailableHours, bottlenecks, lowRetentionChapters, targetCollege, targetYear } = req.validatedBody;
      const planDays = days || 3;
      const hours = dailyAvailableHours || 6.5;

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

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
      res.status(500).json({ error: "Internal server error during revision plan generation: " + error.message });
    }
  });

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

startServer();
