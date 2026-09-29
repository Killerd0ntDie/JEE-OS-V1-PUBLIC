import { z } from 'zod';
import { Type } from '@google/genai';

export const PyqPaperSchema = z.object({
  rawText: z.string().max(500000).optional().default(''),
  pdfBase64: z.string().max(10000000).optional(),
  paperTitle: z.string().optional(),
  targetSubject: z.string().optional(),
  isDpp: z.boolean().optional(),
  chapterName: z.string().optional()
});

export const PageVisionSchema = z.object({
  pageImages: z.array(z.object({
    pageNumber: z.number(),
    imageBase64: z.string().max(25000000)
  })),
  paperTitle: z.string().optional(),
  targetSubject: z.string().optional()
});

export const AnalyzeDppMetadataSchema = z.object({
  rawText: z.string().optional(),
  fileName: z.string().optional(),
  pdfBase64: z.string().optional(),
  chapterNames: z.array(z.string()).optional()
});

export const ReverifyQuestionSchema = z.object({
  questionContent: z.string(),
  options: z.array(z.any()).optional().default([]),
  questionType: z.string().optional().default('MCQ'),
  subject: z.string().optional().default('chemistry'),
  topic: z.string().optional().default('General'),
  currentAnswer: z.string().optional(),
  imageUrl: z.string().optional()
});

export const Stage1SkeletonResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    skeleton: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          qIndex: { type: Type.INTEGER },
          localQuestionNumber: { type: Type.INTEGER },
          sectionName: { type: Type.STRING },
          subject: { type: Type.STRING },
          type: { type: Type.STRING },
          hasDiagram: { type: Type.BOOLEAN },
          diagramPage: { type: Type.INTEGER },
          diagramBbox: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER }
          },
          diagramDescription: { type: Type.STRING },
          rawSnippet: { type: Type.STRING }
        },
        required: ["qIndex", "subject", "type", "hasDiagram"]
      }
    }
  },
  required: ["skeleton"]
};

export const QuestionsListResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          subject: { type: Type.STRING },
          type: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          content: { type: Type.STRING },
          hasDiagram: { type: Type.BOOLEAN },
          diagramPage: { type: Type.INTEGER },
          diagramBbox: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "Normalized 0-1000 bounding box [ymin, xmin, ymax, xmax] of diagram on diagramPage"
          },
          diagramDescription: { type: Type.STRING },
          localQuestionNumber: { type: Type.INTEGER },
          sectionName: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING }, text: { type: Type.STRING } },
              required: ["id", "text"]
            }
          },
          correctAnswer: { type: Type.STRING },
          solution: {
            type: Type.OBJECT,
            properties: { text: { type: Type.STRING } },
            required: ["text"]
          }
        },
        required: ["topic", "subject", "type", "content", "solution", "hasDiagram"]
      }
    }
  },
  required: ["title", "questions"]
};

export const SectionQuestionsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          subject: { type: Type.STRING },
          type: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          content: { type: Type.STRING },
          hasDiagram: { type: Type.BOOLEAN },
          diagramPage: { type: Type.INTEGER },
          diagramBbox: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "Normalized 0-1000 bounding box [ymin, xmin, ymax, xmax] of diagram on diagramPage"
          },
          diagramDescription: { type: Type.STRING },
          localQuestionNumber: { type: Type.INTEGER },
          sectionName: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING }, text: { type: Type.STRING } },
              required: ["id", "text"]
            }
          },
          correctAnswer: { type: Type.STRING },
          solution: {
            type: Type.OBJECT,
            properties: { text: { type: Type.STRING } },
            required: ["text"]
          }
        },
        required: ["topic", "subject", "type", "content", "solution", "hasDiagram"]
      }
    }
  },
  required: ["questions"]
};
