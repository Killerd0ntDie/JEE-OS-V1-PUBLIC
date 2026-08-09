import React from 'react';
import { Clock } from 'lucide-react';
import { SubjectId } from '@/types/index';

export interface SubjectDetail {
  name: string;
  chapter: string;
  lecture: string;
  duration: string;
}

export interface MissionSubjectSwitcherWidgetProps {
  activeSubject: 'physics' | 'chemistry' | 'maths';
  activeDetails: SubjectDetail;
  subjectsDetails: Record<'physics' | 'chemistry' | 'maths', SubjectDetail>;
  onChangeSubject: (subject: 'physics' | 'chemistry' | 'maths') => void;
}

export function MissionSubjectSwitcherWidget({
  activeSubject,
  activeDetails,
  subjectsDetails,
  onChangeSubject
}: MissionSubjectSwitcherWidgetProps) {
  return (
    <div className="w-full max-w-md text-center space-y-2 py-2">
      {/* Compact Muted Subject Switcher Row (Removed as requested) */}

      {/* Prominent Chapter Title & Compact Meta Subtext */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-display font-extrabold text-white tracking-tight leading-tight">
          {activeDetails.lecture}
        </h1>
        <p className="text-xs text-zinc-400 font-mono">
          {activeDetails.chapter} <span className="text-zinc-600">•</span> Est: {activeDetails.duration}
        </p>
      </div>
    </div>
  );
}
