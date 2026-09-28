import { Response } from "express";
import { z } from "zod";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  aiCache, 
  generateCacheKey, 
  generateWithFallback, 
  safeGetText 
} from "../services/aiService";
import { sanitizePromptInput, sanitizeContextObject } from "../services/sanitizer";
import { log } from "../middleware/logger";

export const CoachSchema = z.object({
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

export const validateCoach = (req: any, res: Response, next: any) => {
  const parsedBody = CoachSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
  }
  req.validatedBody = parsedBody.data;
  next();
};

export const handleCoachAnalyze = async (req: any, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "AI service is currently unavailable." });
    }

    const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
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

    // Defense-in-depth: sanitize all user inputs against prompt injection
    const cleanQuestion = sanitizePromptInput(question, 1000);
    const cleanCollege = sanitizePromptInput(targetCollege || 'IIT Bombay', 100);
    const cleanYear = sanitizePromptInput(targetYear || '2026', 10);
    const safeMission = sanitizeContextObject(mission || []);
    const safeWeakTopics = sanitizeContextObject((weakTopics || []).slice(0, 5));

    const prompt = `
You are an expert, highly encouraging AI Coach for a student preparing for the JEE exam.
Your goal is to help the student understand their current study schedule and provide actionable, data-driven advice.

STUDENT TELEMETRY:
- Target: ${cleanCollege} (${cleanYear})
- Remaining Days for Exam: ${remainingDays}
- Today's Scheduled Mission: ${JSON.stringify(safeMission, null, 2)}
- Active Unresolved Mistakes: ${JSON.stringify(safeWeakTopics, null, 2)}
- Revision Backlog / Due Queue: ${JSON.stringify((revisionQueue || []).slice(0, 5).map((r: any) => ({ name: r.chapterName, daysOverdue: r.daysOverdue })), null, 2)}
- Planner Engine Outputs: ${JSON.stringify((plannerDecisions || []).slice(0, 5).map((p: any) => ({ task: p.taskName, chapter: p.chapterName, priority: p.priorityScore })), null, 2)}
- Filtered Active Chapters: ${JSON.stringify((chapters || []).filter((c: any) => c.completion > 0 && c.completion < 100).map((c: any) => ({ name: c.name, subject: c.subject, completion: c.completion, priority: c.priorityScore })), null, 2)}
- Mock Test History: ${JSON.stringify((mockHistory || []).slice(0, 3), null, 2)}
- Recent Performance Analytics: ${JSON.stringify(analyticsSummary || {}, null, 2)}

${cleanQuestion ? `
STUDENT QUESTION:
"${cleanQuestion}"

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
      req,
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
    cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(cleanText);
    } catch (e) {
      log('error', "Failed to parse Structured Output from Gemini:", { error: e });
      parsedResult = { analysis: "I encountered an error analyzing your data. Please try again.", actions: [] };
    }

    const { analysis, actions } = parsedResult;
    aiCache.set(cacheKey, JSON.stringify({ analysis, actions }));
    res.json({ analysis, actions });
  } catch (error: any) {
    log('error', "Coach API error", { error: error?.message });
    res.status(500).json({ error: "Internal server error during analysis" });
  }
};
