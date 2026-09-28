import { Response } from "express";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { 
  aiCache, 
  generateCacheKey, 
  generateWithFallback, 
  safeGetText 
} from "../services/aiService";
import { sanitizePromptInput, sanitizeContextObject } from "../services/sanitizer";
import { log } from "../middleware/logger";

export const RevisionPlanSchema = z.object({
  days: z.number().int().min(1).max(30).optional().default(3),
  dailyAvailableHours: z.number().min(1).max(18).optional().default(6.5),
  bottlenecks: z.array(z.any()).optional(),
  lowRetentionChapters: z.array(z.any()).optional(),
  targetCollege: z.string().max(100).optional(),
  targetYear: z.string().max(10).optional()
});

export const validateRevisionPlan = (req: any, res: Response, next: any) => {
  const parsedBody = RevisionPlanSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
  }
  req.validatedBody = parsedBody.data;
  next();
};

export const handleGenerateRevisionPlan = async (req: any, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "AI service is currently unavailable." });
    }

    const { days, dailyAvailableHours, bottlenecks, lowRetentionChapters, targetCollege, targetYear } = req.validatedBody;
    const planDays = days || 3;
    const hours = dailyAvailableHours || 6.5;
    const cleanCollege = sanitizePromptInput(targetCollege || 'IIT Bombay', 100);
    const cleanYear = sanitizePromptInput(targetYear || '2026', 10);
    const safeBottlenecks = sanitizeContextObject(bottlenecks || []);
    const safeLowRetention = sanitizeContextObject(lowRetentionChapters || []);

    const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
    }) : null;

    const prompt = `
You are a master IIT-JEE Rank-1 Strategist.
Synthesize an ultra-optimized, realistic ${planDays}-day study and revision sprint for a student aiming for ${cleanCollege} (${cleanYear}).

STUDENT TELEMETRY:
- Available Daily Capacity: ${hours} hours/day
- Active Backlog Bottlenecks: ${JSON.stringify(safeBottlenecks)}
- Overdue Retention Decay Chapters: ${JSON.stringify(safeLowRetention)}

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
      req,
      responseMimeType: "application/json",
      temperature: 0.7
    });

    const text = safeGetText(response, "{}").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    let jsonStr = "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    aiCache.set(cacheKey, jsonStr);
    res.json({ plan: JSON.parse(jsonStr) });
  } catch (error: any) {
    log('error', "Revision Plan API error", { error: error?.message });
    res.status(500).json({ error: "Internal server error during revision plan generation" });
  }
};
