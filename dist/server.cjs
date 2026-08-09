var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_fs2 = __toESM(require("fs"), 1);

// server/firebaseAdmin.ts
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
import_dotenv.default.config();
try {
  if (!(0, import_app.getApps)().length) {
    let credentialOptions = {};
    const keyPath = import_path.default.resolve(process.cwd(), "firebase-admin-key.json");
    const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    console.log(
      `[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_KEY present: ${!!keyJson}, length: ${keyJson ? keyJson.length : 0}`
    );
    if (keyJson) {
      const serviceAccount = JSON.parse(keyJson);
      credentialOptions = { credential: (0, import_app.cert)(serviceAccount) };
      console.log(
        `[firebaseAdmin] Initialized from env var. project_id in key: ${serviceAccount.project_id}`
      );
    } else if (import_fs.default.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(import_fs.default.readFileSync(keyPath, "utf8"));
      credentialOptions = { credential: (0, import_app.cert)(serviceAccount) };
      console.log("[firebaseAdmin] Initialized with local key file.");
    } else {
      console.log("[firebaseAdmin] No key found \u2014 falling back to default credentials (will fail on Render).");
    }
    (0, import_app.initializeApp)(credentialOptions);
  }
} catch (error) {
  console.error("[firebaseAdmin] Initialization error:", error);
}
var adminAuth = (0, import_app.getApps)().length > 0 ? (0, import_auth.getAuth)() : null;
var adminDb = (0, import_app.getApps)().length > 0 ? (0, import_firestore.getFirestore)() : null;
var verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid Authorization header" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    if (!adminAuth) throw new Error("Firebase Admin Auth is not initialized.");
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying auth token", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// server.ts
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_lru_cache = require("lru-cache");
var import_crypto = __toESM(require("crypto"), 1);
var import_zod = require("zod");
var import_node_net = require("node:net");
var import_http = __toESM(require("http"), 1);
if (import_fs2.default.existsSync(".env.local")) {
  import_dotenv2.default.config({ path: ".env.local" });
}
import_dotenv2.default.config();
var findAvailablePort = async (preferredPort, host) => {
  const isPortFree = (port) => new Promise((resolve) => {
    const tester = (0, import_node_net.createServer)();
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
  const app = (0, import_express.default)();
  const host = process.env.HOST || "0.0.0.0";
  const requestedPort = process.env.PORT ? Number(process.env.PORT) : 3e3;
  const preferredPort = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 3e3;
  const port = await findAvailablePort(preferredPort, host);
  app.set("trust proxy", 1);
  app.use(import_express.default.json({ limit: "5mb" }));
  const apiLimiter = (0, import_express_rate_limit.default)({
    windowMs: 5 * 60 * 1e3,
    // 5 minutes
    max: 100,
    // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false
  });
  const aiCache = new import_lru_cache.LRUCache({
    max: 500,
    ttl: 1e3 * 60 * 60
    // 1 hour
  });
  const generateCacheKey = (body, prefix) => {
    return prefix + "_v2_" + import_crypto.default.createHash("sha256").update(JSON.stringify(body)).digest("hex");
  };
  const CoachSchema = import_zod.z.object({
    mission: import_zod.z.array(import_zod.z.any()).optional(),
    weakTopics: import_zod.z.array(import_zod.z.any()).optional(),
    revisionQueue: import_zod.z.array(import_zod.z.string()).optional(),
    plannerDecisions: import_zod.z.array(import_zod.z.any()).optional(),
    analyticsSummary: import_zod.z.any().optional(),
    chapters: import_zod.z.array(import_zod.z.any()).optional(),
    remainingDays: import_zod.z.number().optional(),
    question: import_zod.z.string().max(1e3).optional(),
    targetYear: import_zod.z.string().optional(),
    targetCollege: import_zod.z.string().optional(),
    coachingType: import_zod.z.string().optional(),
    mockHistory: import_zod.z.array(import_zod.z.any()).optional()
  }).strict();
  const validateCoach = (req, res, next) => {
    const parsedBody = CoachSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/coach/analyze", apiLimiter, validateCoach, verifyAuth, async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured. Create a .env file with GEMINI_API_KEY=your_key" });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
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
- Active Unresolved Mistakes: ${JSON.stringify(weakTopics, null, 2)}
- Revision Backlog / Due Queue: ${JSON.stringify(revisionQueue, null, 2)}
- Planner Engine Outputs: ${JSON.stringify(plannerDecisions, null, 2)}
- Filtered Active Chapters: ${JSON.stringify(chapters, null, 2)}
- Mock Test History: ${JSON.stringify(mockHistory, null, 2)}
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
      const cacheKey = generateCacheKey(req.body, "coach");
      const cachedResponse = aiCache.get(cacheKey);
      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        return res.json({ analysis: parsed.analysis, cached: true, actions: parsed.actions });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              analysis: { type: import_genai.Type.STRING, description: "Highly specific, personalized text answer or summary. No markdown allowed." },
              actions: {
                type: import_genai.Type.ARRAY,
                description: "Up to 2 actionable quick-actions for the UI to execute. Empty array if none.",
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    type: { type: import_genai.Type.STRING },
                    payload: { type: import_genai.Type.OBJECT }
                  },
                  required: ["type", "payload"]
                }
              }
            },
            required: ["analysis", "actions"]
          }
        }
      });
      let cleanText = response.text || "{}";
      cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
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
    } catch (error) {
      console.error("Coach API error:", error);
      res.status(500).json({ error: "Internal server error during analysis." });
    }
  });
  const PracticeSchema = import_zod.z.object({
    chapterId: import_zod.z.string().min(1),
    subject: import_zod.z.string().min(1),
    count: import_zod.z.number().optional()
  });
  const validatePractice = (req, res, next) => {
    const parsedBody = PracticeSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };
  app.post("/api/practice/generate", apiLimiter, validatePractice, verifyAuth, async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured." });
      }
      const { chapterId, subject, count } = req.validatedBody;
      const ai = new import_genai.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
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
      const cacheKey = generateCacheKey(req.body, "practice");
      const cachedResponse = aiCache.get(cacheKey);
      if (cachedResponse) {
        return res.json({ questions: JSON.parse(cachedResponse), cached: true });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });
      let text = (response.text || "[]").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      let jsonStr = "[]";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      aiCache.set(cacheKey, jsonStr);
      res.json({ questions: JSON.parse(jsonStr) });
    } catch (error) {
      console.error("Practice API error:", error);
      res.status(500).json({ error: "Internal server error during practice generation." });
    }
  });
  const MocktestSchema = import_zod.z.object({
    chapterId: import_zod.z.string().min(1),
    chapterName: import_zod.z.string().optional(),
    subject: import_zod.z.string().min(1),
    count: import_zod.z.number().optional(),
    difficulty: import_zod.z.string().optional()
  });
  const validateMocktest = (req, res, next) => {
    const parsedBody = MocktestSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };
  app.post("/api/mocktest/generate", apiLimiter, validateMocktest, verifyAuth, async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured." });
      }
      const { chapterId, chapterName, subject, count, difficulty } = req.validatedBody;
      const numQuestions = count || 10;
      const diffStr = difficulty || "JEE_MAIN";
      const ai = new import_genai.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
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
      const cacheKey = generateCacheKey(req.body, "mocktest");
      const cachedResponse = aiCache.get(cacheKey);
      if (cachedResponse) {
        return res.json({ questions: JSON.parse(cachedResponse), cached: true });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });
      let text = response.text || "[]";
      text = text.replace(/```json/gi, "").replace(/```/gi, "").trim();
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
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
    } catch (error) {
      console.error("Mocktest API error:", error);
      res.status(500).json({ error: "Internal server error during mock test generation." });
    }
  });
  const RevisionPlanSchema = import_zod.z.object({
    days: import_zod.z.number().optional(),
    dailyAvailableHours: import_zod.z.number().optional(),
    bottlenecks: import_zod.z.array(import_zod.z.any()).optional(),
    lowRetentionChapters: import_zod.z.array(import_zod.z.any()).optional(),
    targetCollege: import_zod.z.string().optional(),
    targetYear: import_zod.z.string().optional()
  });
  const validateRevisionPlan = (req, res, next) => {
    const parsedBody = RevisionPlanSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
    }
    req.validatedBody = parsedBody.data;
    next();
  };
  app.post("/api/planner/generate-plan", apiLimiter, validateRevisionPlan, verifyAuth, async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY not configured." });
      }
      const { days, dailyAvailableHours, bottlenecks, lowRetentionChapters, targetCollege, targetYear } = req.validatedBody;
      const planDays = days || 3;
      const hours = dailyAvailableHours || 6.5;
      const ai = new import_genai.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const prompt = `
      You are a master IIT-JEE Rank-1 Strategist.
      Synthesize an ultra-optimized, realistic ${planDays}-day study and revision sprint for a student aiming for ${targetCollege || "IIT Bombay"} (${targetYear || "2026"}).

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
      const cacheKey = generateCacheKey(req.body, "revision_plan");
      const cachedResponse = aiCache.get(cacheKey);
      if (cachedResponse) {
        return res.json({ plan: JSON.parse(cachedResponse), cached: true });
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });
      let text = (response.text || "{}").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      let jsonStr = "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      aiCache.set(cacheKey, jsonStr);
      res.json({ plan: JSON.parse(jsonStr) });
    } catch (error) {
      console.error("Revision Plan API error:", error);
      res.status(500).json({ error: "Internal server error during revision plan generation." });
    }
  });
  const httpServer = import_http.default.createServer(app);
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
        port,
        strictPort: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(port, host, () => {
    const fallbackMessage = port !== preferredPort ? ` (fallback from ${preferredPort})` : "";
    console.log(`Server running on http://localhost:${port}${fallbackMessage}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
