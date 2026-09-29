import { Chapter } from '../../types/index';
import { StudyBrainService } from '@/services/studyBrainService';

export interface SubjectProgress {
  percentage: number;
  masteredCount?: number;
  totalCount?: number;
  completed: number;
  total: number;
}

export interface SyllabusProgress {
  physics: SubjectProgress;
  chemistry: SubjectProgress;
  maths: SubjectProgress;
}

/**
 * Pure calculator for syllabus progress with subject completion and mastered count tracking.
 */
export function calculateSyllabusProgress(chapters: Chapter[]): SyllabusProgress {
  return {
    physics: {
      ...StudyBrainService.calculateSubjectCompletion(chapters, 'physics'),
      masteredCount: chapters.filter(c => c.subject === 'physics' && (c.status === 'Mastered' || (typeof c.completion === 'number' && c.completion >= 100))).length,
      totalCount: chapters.filter(c => c.subject === 'physics').length,
    },
    chemistry: {
      ...StudyBrainService.calculateSubjectCompletion(chapters, 'chemistry'),
      masteredCount: chapters.filter(c => c.subject === 'chemistry' && (c.status === 'Mastered' || (typeof c.completion === 'number' && c.completion >= 100))).length,
      totalCount: chapters.filter(c => c.subject === 'chemistry').length,
    },
    maths: {
      ...StudyBrainService.calculateSubjectCompletion(chapters, 'maths'),
      masteredCount: chapters.filter(c => c.subject === 'maths' && (c.status === 'Mastered' || (typeof c.completion === 'number' && c.completion >= 100))).length,
      totalCount: chapters.filter(c => c.subject === 'maths').length,
    },
  };
}
