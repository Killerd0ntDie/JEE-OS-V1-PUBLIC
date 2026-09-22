export type QuestionType = 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'NUMERICAL';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'JEE_MAIN' | 'JEE_ADVANCED';

export interface Option {
  id: string; // e.g., "A", "B", "C", "D"
  text: string; // The text or LaTeX for the option
}

export interface Solution {
  text: string; // Step-by-step LaTeX solution
  correctOptionIds?: string[]; // For MCQs
  correctNumericalValue?: number; // For NUMERICAL
  numericalTolerance?: number; // Optional tolerance for numerical answers
}

export interface Question {
  id: string;
  subject: 'physics' | 'chemistry' | 'maths';
  chapterId: string;
  topic?: string;
  type: QuestionType;
  difficulty: Difficulty;
  content: string; // The question text (can include LaTeX)
  options?: Option[]; // Required for MCQs
  solution: Solution;
  source?: string; // e.g., "JEE Advanced 2019 Paper 1"
}

export interface PYQBank {
  version: string;
  lastUpdated: string;
  questions: Question[];
}
