import { Question } from '../types/curriculum';
import { v4 as uuidv4 } from 'uuid';
import { CoachEngine } from '../engines/coach/CoachEngine';

export class PyqGeneratorEngine {
  private static async getAuthToken(): Promise<string> {
    const { auth } = await import('../firebase');
    const user = auth.currentUser;
    if (!user) throw new Error("User must be logged in to generate questions.");
    return await user.getIdToken();
  }

  /**
   * Generates a batch of high-quality JEE questions for a specific chapter
   */
  static async generateQuestions(chapterId: string, subject: string, count: number = 3): Promise<Question[]> {
    const questionSchema = {
      type: "ARRAY",
      description: "A list of generated JEE Advanced questions",
      items: {
        type: "OBJECT",
        properties: {
          topic: {
            type: "STRING",
            description: "The specific sub-topic within the chapter"
          },
          type: {
            type: "STRING",
            description: "Must be exactly 'MCQ_SINGLE' or 'MCQ_MULTIPLE'"
          },
          difficulty: {
            type: "STRING",
            description: "Must be exactly 'JEE_ADVANCED' or 'JEE_MAIN'"
          },
          content: {
            type: "STRING",
            description: "The question text, including LaTeX"
          },
          options: {
            type: "ARRAY",
            description: "Exactly 4 options (A, B, C, D)",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING", description: "A, B, C, or D" },
                text: { type: "STRING", description: "Option text, including LaTeX" }
              },
              required: ["id", "text"]
            }
          },
          solution: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING", description: "Detailed step-by-step solution in LaTeX" },
              correctOptionIds: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Array containing the correct option IDs, e.g. ['A'] or ['A', 'C']"
              }
            },
            required: ["text", "correctOptionIds"]
          }
        },
        required: ["topic", "type", "difficulty", "content", "options", "solution"]
      }
    };

    const prompt = `
      You are an expert IIT-JEE professor. 
      Generate exactly ${count} highly realistic, challenging JEE Advanced level questions for the subject: ${subject} and chapter/topic ID: ${chapterId}.
      
      Requirements:
      1. Use LaTeX heavily for any math or chemical formulas (wrap inline with $ and block with $$).
      2. Ensure exactly 4 options per question.
      3. The solution must be extremely detailed and step-by-step.
      4. Make sure questions are at the actual difficulty level of JEE Advanced.

      OUTPUT FORMAT:
      You MUST respond ONLY with a raw JSON array of objects. Do not include markdown codeblocks like \`\`\`json.
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
    try {
      const token = await this.getAuthToken();
      const response = await fetch('/api/practice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ chapterId, subject, count })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const rawQuestions: any[] = data.questions || [];

        // Map raw generated JSON into our internal Question schema
        const formattedQuestions: Question[] = rawQuestions.map(rq => ({
          id: `PYQ-AI-${uuidv4().split('-')[0].toUpperCase()}`,
          subject: subject as 'physics' | 'chemistry' | 'maths',
          chapterId: chapterId,
          topic: rq.topic,
          type: rq.type,
          difficulty: rq.difficulty,
          content: rq.content,
          options: rq.options,
          solution: {
            text: rq.solution.text,
            correctOptionIds: rq.solution.correctOptionIds
          },
          source: 'AI Generated'
        }));

      return formattedQuestions;

    } catch (error: any) {
      console.error("PyqGeneratorEngine Error:", error);
      throw error;
    }
  }
}
