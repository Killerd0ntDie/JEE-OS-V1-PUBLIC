import { Chapter, Mistake } from '@/types/index';
import { PHYSICS_CHAPTERS, CHEMISTRY_CHAPTERS, MATH_CHAPTERS } from './seeds';

export * from './seeds';

// Initial Database Seeding Chapters
export const INITIAL_CHAPTERS: Chapter[] = [
  ...PHYSICS_CHAPTERS,
  ...CHEMISTRY_CHAPTERS,
  ...MATH_CHAPTERS,
];

// Fallback initial coach briefing message before AI Coach analysis is generated
export const DEFAULT_COACH_BRIEFING = [
  "Welcome to JEE OS. Complete your first study session to generate insights."
];

export const INITIAL_MISTAKES: Mistake[] = [];
