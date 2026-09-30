
import { Chapter } from '@/types';

export interface RpgKnowledgeTreeWidgetProps {
  chapters?: Chapter[];
  allChapters?: Chapter[];
  subjectId?: string;
  onChapterClick?: (id: string) => void;
}

/**
 * @deprecated The RPG skill tree widget has been deprecated in favor of the Chapter List and ROI Weightage Matrix.
 */
export function RpgKnowledgeTreeWidget(_props: RpgKnowledgeTreeWidgetProps) {
  return null;
}
