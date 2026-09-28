import { Response } from "express";
import { z } from "zod";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  aiCache, 
  generateCacheKey, 
  generateWithFallback, 
  resolveGeminiApiKey,
  safeGetText 
} from "../services/aiService";
import { sanitizePromptInput, sanitizeContextObject } from "../services/sanitizer";
import { log } from "../middleware/logger";

export const MocktestSchema = z.object({
  chapterId: z.string().min(1).max(200),
  chapterName: z.string().max(200).optional(),
  subject: z.string().min(1).max(100),
  count: z.number().int().min(1).max(30).optional().default(10),
  difficulty: z.string().max(50).optional().default("JEE_MAIN")
});

export const validateMocktest = (req: any, res: Response, next: any) => {
  const parsedBody = MocktestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
  }
  req.validatedBody = parsedBody.data;
  next();
};

export const handleMocktestGenerate = async (req: any, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "AI service is currently unavailable." });
    }
    
    const { chapterId, chapterName, subject, count, difficulty } = req.validatedBody;
    const cleanChapter = sanitizePromptInput(chapterName || chapterId, 200);
    const cleanSubject = sanitizePromptInput(subject, 100);
    const cleanDiff = sanitizePromptInput(difficulty || "JEE_MAIN", 50);
    const numQuestions = count || 10;
    
    const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
    }) : null;
    
    const prompt = `
You are an expert IIT-JEE professor. 
Generate exactly ${numQuestions} highly realistic, challenging JEE level questions for the subject: ${cleanSubject} and chapter/topic: ${cleanChapter}.
Difficulty level: ${cleanDiff}.

Requirements:
1. Use LaTeX heavily for any math or chemical formulas (wrap inline with $ and block with $$).
2. Ensure exactly 4 options per question.
3. The solution must be extremely detailed and step-by-step.
4. Make sure questions are at the actual difficulty level of ${cleanDiff}.

OUTPUT FORMAT:
Return ONLY a JSON array.
Schema per object:
{
  "topic": "string",
  "type": "MCQ_SINGLE",
  "difficulty": "${cleanDiff}",
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
      req,
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
      log('error', "Failed to parse JSON from AI", { error: e });
      throw new Error("AI generated malformed JSON. Please try again.");
    }

    aiCache.set(cacheKey, JSON.stringify(parsed));
    res.json({ questions: parsed });
  } catch (error: any) {
    log('error', "Mocktest API error", { error: error?.message });
    res.status(500).json({ error: "Internal server error during mock test generation" });
  }
};

export const ScorecardSchema = z.object({
  rawText: z.string().min(10, "Text must be at least 10 characters long").max(100000, "Text exceeds maximum limit"),
});

export const validateScorecard = (req: any, res: Response, next: any) => {
  const parsedBody = ScorecardSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
  }
  req.validatedBody = parsedBody.data;
  next();
};

export const handleScorecardParse = async (req: any, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "AI service is currently unavailable." });
    }

    const { rawText } = req.validatedBody;
    const cleanText = sanitizePromptInput(rawText.substring(0, 30000), 30000);

    const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
    }) : null;

    const prompt = `
You are an expert AI tutor parsing a student's JEE Mock Test results from a raw PDF extraction.
Analyze the following text and extract the overall score, correct/incorrect counts, and a detailed list of every mistake the student made.
Raw Text:
"""
${cleanText}
"""
`;

    const cacheKey = generateCacheKey(req.body, 'scorecard_parse');
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      return res.json({ ...JSON.parse(cachedResponse), cached: true });
    }

    const response = await generateWithFallback(ai, prompt, {
      req,
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

    const respText = safeGetText(response, "{}").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const parsed = JSON.parse(respText);
    aiCache.set(cacheKey, JSON.stringify(parsed));
    res.json(parsed);
  } catch (error: any) {
    log('error', "Scorecard Parse API error", { error: error?.message });
    res.status(500).json({ error: "Internal server error during scorecard parsing" });
  }
};

export const ExplanationSchema = z.object({
  questionContent: z.string().min(1).max(5000),
  options: z.array(z.any()).optional(),
  correctAnswer: z.string().max(200).optional(),
  subject: z.string().max(100).optional(),
  topic: z.string().max(200).optional()
});

export const validateExplanation = (req: any, res: Response, next: any) => {
  const parsedBody = ExplanationSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
  }
  req.validatedBody = parsedBody.data;
  next();
};

export const handleGenerateExplanation = async (req: any, res: Response) => {
  try {
    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey && !process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "AI service is currently unavailable. GEMINI_API_KEY is not configured." });
    }

    const { questionContent, options, correctAnswer, subject, topic } = req.validatedBody;
    const cleanContent = sanitizePromptInput(questionContent, 5000);
    const cleanSubject = sanitizePromptInput(subject || 'General', 100);
    const cleanTopic = sanitizePromptInput(topic || 'General', 200);
    const safeOptions = sanitizeContextObject(options || []);

    const ai = apiKey ? new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 45000, headers: { 'User-Agent': 'aistudio-build' } }
    }) : null;

    const prompt = `
Provide a rigorous, step-by-step JEE derivation and explanation for this question:
Question: ${cleanContent}
Options: ${JSON.stringify(safeOptions)}
Correct Answer: ${sanitizePromptInput(correctAnswer || 'Unknown', 100)}
Subject: ${cleanSubject}
Topic: ${cleanTopic}

Include:
**Key Concept & Formula**
**Step 1: Detailed Derivation**
**Conclusion & Correct Option**
`;

    const response = await generateWithFallback(ai, prompt, {
      req,
      temperature: 0.2,
      maxOutputTokens: 2048
    });

    const text = safeGetText(response, "").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    res.json({ explanation: text });
  } catch (error: any) {
    log('error', "Generate Explanation API error", { error: error?.message });
    res.status(500).json({ error: "Internal server error during explanation generation" });
  }
};

export const MentorChatSchema = z.object({
  query: z.string().max(2000).optional(),
  message: z.string().max(2000).optional(),
  context: z.record(z.string(), z.any()).optional(),
  questionContext: z.record(z.string(), z.any()).optional(),
  examContext: z.record(z.string(), z.any()).optional(),
  history: z.array(z.any()).optional()
}).refine(data => !!(data.query || data.message), {
  message: "Either 'query' or 'message' must be provided"
});

export const validateMentorChat = (req: any, res: Response, next: any) => {
  const parsedBody = MentorChatSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid request payload", details: parsedBody.error.format() });
  }
  req.validatedBody = parsedBody.data;
  next();
};

export const handleMentorChat = async (req: any, res: Response) => {
  try {
    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey && !process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "AI service is currently unavailable. GEMINI_API_KEY is not configured." });
    }

    const { query, message, context = {}, questionContext } = req.validatedBody;
    const rawPrompt = (query || message || '').trim();
    const cleanUserPrompt = sanitizePromptInput(rawPrompt, 2000);
    const ctx = sanitizeContextObject(questionContext || context);

    const ai = apiKey ? new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 60000, headers: { 'User-Agent': 'aistudio-build' } }
    }) : null;

    const qDetails = [
      ctx.subject ? `Subject: ${ctx.subject}` : '',
      ctx.chapter ? `Chapter: ${ctx.chapter}` : '',
      ctx.topic ? `Topic: ${ctx.topic}` : '',
      ctx.questionNumber ? `Question Number: #${ctx.questionNumber}` : '',
      ctx.questionContent ? `Question Statement:\n${ctx.questionContent}` : '',
      Array.isArray(ctx.options) && ctx.options.length > 0 ? `Options:\n${ctx.options.map((o: any, i: number) => {
        const label = String.fromCharCode(65 + i);
        const txt = typeof o === 'string' ? o : (o.text || JSON.stringify(o));
        return `(${label}) ${txt}`;
      }).join('\n')}` : '',
      ctx.correctAnswer ? `Official Correct Answer: ${ctx.correctAnswer}` : '',
      ctx.studentAnswer ? `Student's Chosen Answer: ${ctx.studentAnswer}` : '',
      ctx.explanation ? `Reference Solution / Explanation:\n${ctx.explanation}` : '',
      ctx.accuracy !== undefined ? `Test Accuracy: ${ctx.accuracy}%` : '',
      ctx.score !== undefined && ctx.totalMarks !== undefined ? `Test Score: ${ctx.score}/${ctx.totalMarks}` : ''
    ].filter(Boolean).join('\n\n');

    const systemPrompt = `You are the JEE OS Senior Academic Mentor & Master IIT-JEE Coach.
You are helping an IIT-JEE aspirant dissect and learn from their mock test performance.
You have the full context of the question and exam metrics:

=== QUESTION & ATTEMPT CONTEXT ===
${qDetails || 'No specific question context provided.'}
==================================

CORE MENTOR GUIDELINES:
1. Address the student's query with IITian-level clarity, precision, and pedagogical depth.
2. If they ask why their option was wrong, diagnose the exact misconception, arithmetic trap, or edge condition.
3. If they ask for shortcuts, explain intuitive dimensional analysis, symmetry arguments, extreme value checks, or option elimination.
4. Format all math and chemical formulas with clean LaTeX ($...$ for inline, $$...$$ for display blocks).
5. Be concise, encouraging, and razor-sharp (aim for 120-250 words unless detailed derivation is requested).`;

    const prompt = `${systemPrompt}\n\nStudent Query: "${cleanUserPrompt}"\n\nMentor Answer:`;

    const cacheKey = generateCacheKey(req.body, 'mentor_chat');
    const cached = aiCache.get(cacheKey);
    if (cached) {
      return res.json({ reply: cached, cached: true });
    }

    const response = await generateWithFallback(ai, prompt, {
      req,
      temperature: 0.3,
      maxOutputTokens: 4096
    });

    const reply = safeGetText(response, "I've reviewed this question. Remember to verify boundary conditions and check for symmetry properties.")
      .replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    aiCache.set(cacheKey, reply);
    res.json({ reply });
  } catch (error: any) {
    log('error', "[Mentor Chat API Error]", { error: error?.message });
    res.status(500).json({ error: "Internal server error during mentor chat consultation" });
  }
};
