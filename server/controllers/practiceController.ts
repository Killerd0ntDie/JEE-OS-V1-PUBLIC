import { Response } from "express";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { 
  aiCache, 
  generateCacheKey, 
  generateWithFallback, 
  safeGetText 
} from "../services/aiService";
import { sanitizePromptInput } from "../services/sanitizer";
import { log } from "../middleware/logger";

export const PracticeSchema = z.object({
  chapterId: z.string().min(1).max(200),
  subject: z.string().min(1).max(100),
  count: z.number().int().min(1).max(20).optional().default(3)
});

export const validatePractice = (req: any, res: Response, next: any) => {
  const parsedBody = PracticeSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
  }
  req.validatedBody = parsedBody.data;
  next();
};

export const handlePracticeGenerate = async (req: any, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "AI service is currently unavailable." });
    }
    
    const { chapterId, subject, count } = req.validatedBody;
    const cleanChapterId = sanitizePromptInput(chapterId, 200);
    const cleanSubject = sanitizePromptInput(subject, 100);
    
    const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
    }) : null;
    
    const prompt = `
You are an expert IIT-JEE professor. 
Generate exactly ${count || 3} highly realistic, challenging JEE Advanced level questions for the subject: ${cleanSubject} and chapter/topic ID: ${cleanChapterId}.

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
      req,
      responseMimeType: "application/json",
      temperature: 0.7
    });

    const text = safeGetText(response, "[]").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    let jsonStr = "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    aiCache.set(cacheKey, jsonStr);
    res.json({ questions: JSON.parse(jsonStr) });
  } catch (error: any) {
    log('error', "Practice API error", { error: error?.message });
    res.status(500).json({ error: "Internal server error during practice generation" });
  }
};
