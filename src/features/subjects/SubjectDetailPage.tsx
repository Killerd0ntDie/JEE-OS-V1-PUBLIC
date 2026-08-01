import React from 'react';
import { SubjectId } from '@/types/index';
import { SubjectCommandCenter } from './components/SubjectCommandCenter';

interface SubjectDetailPageProps {
  subjectId: SubjectId;
  subjectTitle: string;
  subjectSubtitle: string;
  subjectIcon: string;
  unitCategories: string[];
}

export function SubjectDetailPage({
  subjectId,
  subjectTitle,
  subjectSubtitle,
  subjectIcon,
  unitCategories
}: SubjectDetailPageProps) {
  return (
    <SubjectCommandCenter 
      subjectId={subjectId} 
      subjectTitle={subjectTitle} 
      subjectSubtitle={subjectSubtitle} 
      subjectIcon={subjectIcon} 
      unitCategories={unitCategories}
    />
  );
}
