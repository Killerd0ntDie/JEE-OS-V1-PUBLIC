import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { verifyAuth } from "./server/firebaseAdmin.js";
import rateLimit from "express-rate-limit";
import { LRUCache } from "lru-cache";
import crypto from "crypto";
import { z } from "zod";
import { createServer as createNetServer } from "node:net";

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

// Fix for Google GenAI SDK conflict with Firebase ADC
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

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

  // Render (and most PaaS hosts) run this app behind a reverse proxy that sets
  // X-Forwarded-For. Trusting exactly 1 hop lets express-rate-limit identify
  // real client IPs correctly instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '5mb' }));

  // Rate Limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per window
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

  const CoachSchema = z.object({
    mission: z.any().optional(),
    weakTopics: z.array(z.any()).optional(),
    revisionQueue: z.array(z.any()).optional(),
    plannerDecisions: z.any().optional(),
    analyticsSummary: z.any().optional(),
    plannerOutput: z.any().optional(),
    chapters: z.array(z.any()).optional(),
    studyHistory: z.array(z.any()).optional(),
    remainingDays: z.number().optional(),
    question: z.string().optional()
  });

  const validateCoach = (req: any, res: any, next: any) => {
    const parsedBody = CoachSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };

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
        plannerOutput,
        chapters,
        studyHistory,
        remainingDays,
        question
      } = req.validatedBody;

      const prompt = `
You are an expert, highly encouraging AI Coach for a student preparing for the JEE exam.
Your goal is to help the student understand their current study schedule and provide actionable, data-driven advice.

STUDYBRAIN CONTEXT:
- Today's Scheduled Mission: ${JSON.stringify(mission, null, 2)}
- Active Unresolved Mistakes: ${JSON.stringify(weakTopics, null, 2)}
- Revision Backlog / Due Queue: ${JSON.stringify(revisionQueue, null, 2)}
- Planner Engine Outputs: ${JSON.stringify(plannerOutput, null, 2)}
- Full Chapter Syllabus Master State: ${JSON.stringify(chapters, null, 2)}
- Study History / Past Sessions: ${JSON.stringify(studyHistory, null, 2)}
- Remaining Days for Exam: ${remainingDays}
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
- Keep it clean, friendly, and strictly under 100 words.
- Do not include unnecessary info that wasn't asked for.
- STRICT NO-MARKDOWN RULE: Do not use markdown syntax of any kind (no **bold**, no # headers, no ==== banners, no code fences around prose) because the chat UI renders plain text.

If applicable, suggest up to 2 actionable quick-actions for the user.
You MUST output these actions at the very end of your response, wrapped in a markdown json block
(use an empty array \`[]\` if there are no relevant actions — never describe actions in plain text):
\`\`\`json
[
  { "type": "ADD_MISSION", "payload": { "subject": "physics", "title": "Mechanics Practice", "duration": 60 } },
  { "type": "UPDATE_TARGET", "payload": { "targetYear": "2025", "targetCollege": "IIT Bombay" } },
  { "type": "UPDATE_CHAPTER", "payload": { "chapterId": "physics-1", "status": "Learning" } },
  { "type": "CLEAR_MISSIONS", "payload": {} }
]
\`\`\`
`;

      const cacheKey = generateCacheKey(req.body, 'coach');
      const cachedResponse = aiCache.get(cacheKey);
      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        return res.json({ analysis: parsed.analysis, cached: true, actions: parsed.actions });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });

      let cleanText = (response.text || "").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      let actions: any[] = [];

      // Matches ```json [ ... ] ``` where [...] may be empty (`[]`) or contain one+ objects.
      const jsonMatch = cleanText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/i);
      if (jsonMatch && jsonMatch[1]) {
        try {
          actions = JSON.parse(jsonMatch[1]);
          cleanText = cleanText.replace(jsonMatch[0], '').trim();
        } catch (e) {
          console.error("Failed to parse Coach actions JSON:", e);
          cleanText = cleanText.replace(jsonMatch[0], '').trim();
        }
      } else {
        const arrayMatch = cleanText.match(/(\[[\s\S]*?\])$/);
        if (arrayMatch && arrayMatch[1]) {
          try {
            actions = JSON.parse(arrayMatch[1]);
            cleanText = cleanText.replace(arrayMatch[0], '').trim();
          } catch(e) {}
        }
      }

      cleanText = cleanText.replace(/```[a-z]*\n?/gi, '').trim();

      aiCache.set(cacheKey, JSON.stringify({ analysis: cleanText, actions }));
      res.json({ analysis: cleanText, actions });
    } catch (error: any) {
      console.error("Coach API error:", error);
      res.status(500).json({ error: error.message });
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
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.7
        }
      });


      let text = (response.text || "[]").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      let jsonStr = "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      aiCache.set(cacheKey, jsonStr);
      res.json({ questions: JSON.parse(jsonStr) });
    } catch (error: any) {
      console.error("Practice API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const MocktestSchema = z.object({
    chapterId: z.string().min(1),
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
      
      const { chapterId, subject, count, difficulty } = req.validatedBody;
      const numQuestions = count || 10;
      const diffStr = difficulty || "JEE_MAIN";
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      
      const prompt = `
      You are an expert IIT-JEE professor. 
      Generate exactly ${numQuestions} highly realistic, challenging JEE level questions for the subject: ${subject} and chapter/topic ID: ${chapterId}.
      Difficulty level: ${diffStr}.
      
      Requirements:
      1. Use LaTeX heavily for any math or chemical formulas (wrap inline with $ and block with $$).
      2. Ensure exactly 4 options per question.
      3. The solution must be extremely detailed and step-by-step.
      4. Make sure questions are at the actual difficulty level of ${diffStr}.

      OUTPUT FORMAT:
      Wrap your JSON array in a markdown codeblock \`\`\`json
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
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.7
        }
      });

      let text = (response.text || "[]").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      let jsonStr = "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      aiCache.set(cacheKey, jsonStr);
      res.json({ questions: JSON.parse(jsonStr) });
    } catch (error: any) {
      console.error("Mocktest API error:", error);
      res.status(500).json({ error: error.message });
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });

      let text = (response.text || "{}").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      let jsonStr = "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      aiCache.set(cacheKey, jsonStr);
      res.json({ plan: JSON.parse(jsonStr) });
    } catch (error: any) {
      console.error("Revision Plan API error:", error);
      res.status(500).json({ error: error.message });
    }
  });


  const httpServer = app.listen(port, host, () => {
    const fallbackMessage = port !== preferredPort ? ` (fallback from ${preferredPort})` : "";
    console.log(`Server running on http://localhost:${port}${fallbackMessage}`);
  });

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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
