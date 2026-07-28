import { SubjectId } from '../../types/index';

export interface SyllabusNode {
  id: string;
  name: string;
  subject: SubjectId;
  module: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  weightage: number; 
  estimatedHours: number;
  lectureCount: number;
  dppCount: number;
  pyqCount: number;
  prerequisites: string[]; 
  unlockedChapters: string[]; 
  revisionPriority: 'High' | 'Medium' | 'Low';
  
  // legacy backward compat
  category?: string;
  importance?: 'High' | 'Medium' | 'Low';
  estimatedStudyHours?: number;
  estimatedLectures?: number;
  revisionDefaults?: {
    intervals: number[];
  };
  tags?: string[];
}

export interface ProgressState {
  chapterId: string;
  completion: number; // 0-100
  isMastered: boolean;
  
  // legacy backward compat
  currentLecture?: number;
  totalLectures?: number;
  theoryComplete?: boolean;
  dppComplete?: boolean;
  pyqsComplete?: boolean;
}
