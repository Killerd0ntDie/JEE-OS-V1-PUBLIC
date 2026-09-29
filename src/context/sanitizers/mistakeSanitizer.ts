import { Mistake } from '@/types/index';

/**
 * Validates and sanitizes raw mistake records from Firestore or local storage.
 * Ensures consistent typing and fallbacks for mistake analytics and spaced repetition.
 */
export const validateAndSanitizeMistakes = (msts: any[]): Mistake[] => {
  if (!Array.isArray(msts)) {
    throw new Error("Mistakes database corruption: Mistakes data is not an array");
  }
  return msts.map((m, index) => {
    if (!m || typeof m !== 'object') {
      throw new Error(`Mistakes database corruption: Mistake entry at index ${index} is invalid`);
    }
    if (!m.id || typeof m.id !== 'string') {
      throw new Error(`Mistakes database corruption: Mistake entry at index ${index} is missing a valid string ID`);
    }
    return {
      id: m.id,
      subject: m.subject || 'physics',
      chapter: m.chapter || 'General',
      topic: m.topic || 'General Topic',
      subtopic: m.subtopic || '',
      difficulty: m.difficulty || 'Medium',
      source: m.source || 'Other',
      timeTaken: typeof m.timeTaken === 'number' ? m.timeTaken : 5,
      correctMethod: m.correctMethod || '',
      studentMethod: m.studentMethod || '',
      mistakeTypes: Array.isArray(m.mistakeTypes) ? m.mistakeTypes : ['Silly Mistake'],
      confidence: typeof m.confidence === 'number' ? m.confidence : 0,
      revisionSchedule: m.revisionSchedule || 'Standard',
      masteryImpact: m.masteryImpact || 'Medium',
      attemptNumber: typeof m.attemptNumber === 'number' ? m.attemptNumber : 1,
      revisionStatus: m.revisionStatus || 'New',
      recoveryScore: typeof m.recoveryScore === 'number' ? m.recoveryScore : 0,
      teacherNotes: m.teacherNotes || '',
      personalNotes: m.personalNotes || '',
      aiAdvice: m.aiAdvice || '',
      priority: m.priority || 'Medium',
      dateLogged: m.dateLogged || new Date().toISOString(),
      questionText: m.questionText || '',
      correctSolution: m.correctSolution || '',
    };
  });
};
