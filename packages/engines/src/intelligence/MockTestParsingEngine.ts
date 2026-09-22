import { GoogleGenAI } from '@google/genai';

export interface ParsedMockTestResult {
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  mistakes: {
    questionNumber: number;
    subject: 'Physics' | 'Chemistry' | 'Maths';
    topic: string;
    studentAnswer: string;
    correctAnswer: string;
    reasoning?: string;
  }[];
}

export class MockTestParsingEngine {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    // We instantiate the new GoogleGenAI SDK with the user-provided key.
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Sends raw PDF text to Gemini to extract structured mock test results
   * @param rawText Extracted text from a mock test PDF or answer key
   */
  public async parseMockTestResults(rawText: string): Promise<ParsedMockTestResult> {
    const prompt = `
      You are an expert AI tutor parsing a student's JEE Mock Test results from a raw PDF extraction.
      Analyze the following text and extract the overall score, correct/incorrect counts, and a detailed list of every mistake the student made.
      For every mistake, identify the subject (Physics, Chemistry, or Maths), the underlying topic/chapter, the student's incorrect answer, and the correct answer. 
      If reasoning is provided in the answer key, include a brief reasoning.

      Raw Text:
      """
      ${rawText.substring(0, 30000)} // truncate to prevent massive token overload just in case
      """

      Return the data strictly as a JSON object matching this schema (do not include markdown wrapping or extra text):
      {
        "totalQuestions": number,
        "attempted": number,
        "correct": number,
        "incorrect": number,
        "score": number,
        "mistakes": [
          {
            "questionNumber": number,
            "subject": "Physics" | "Chemistry" | "Maths",
            "topic": string,
            "studentAnswer": string,
            "correctAnswer": string,
            "reasoning": string
          }
        ]
      }
    `;

    try {
      let response;
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite'
      ];
      let lastErr: any;
      for (const model of candidateModels) {
        try {
          response = await this.ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1, // Keep it deterministic
            }
          });
          break;
        } catch (error: any) {
          lastErr = error;
          const msg = String(error?.message || '');
          const isUnavailable = error.status === 404 || error.status === 429 || error.status === 503 ||
            msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('not available');
          if (isUnavailable) {
            console.warn(`[MockTestParsingEngine] Model ${model} unavailable. Falling back...`);
            continue;
          }
          throw error;
        }
      }
      if (!response && lastErr) throw lastErr;

      const text = response.text ? response.text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() : '';
      if (!text) {
        throw new Error("AI returned empty response");
      }

      // The new SDK returns text directly, which we configured as JSON
      const parsedData = JSON.parse(text) as ParsedMockTestResult;
      
      return parsedData;

    } catch (error) {
      console.error("Failed to parse mock test:", error);
      throw new Error("Failed to parse the mock test PDF. Ensure the PDF contains a valid answer key or scorecard.");
    }
  }
}
