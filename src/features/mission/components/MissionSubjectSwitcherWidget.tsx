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
      {/* Compact Muted Subject Switcher Row */}
      <div className="flex justify-center items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity">
        {(['physics', 'chemistry', 'maths'] as const).map(subj => (
          <button
            key={subj}
            onClick={() => onChangeSubject(subj)}
            className={`text-[9px] font-mono px-2.5 py-0.5 rounded-full border tracking-wider transition-all uppercase cursor-pointer ${
              activeSubject === subj
                ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 font-bold'
                : 'bg-zinc-900/40 border-zinc-850 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {subjectsDetails[subj].name}
          </button>
        ))}
      </div>

      {/* Prominent Chapter Title & Compact Meta Subtext */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-display font-extrabold text-white tracking-tight leading-tight">
          {activeDetails.chapter}
        </h1>
        <p className="text-xs text-zinc-400 font-mono">
          {activeDetails.lecture} <span className="text-zinc-600">•</span> Est: {activeDetails.duration}
        </p>
      </div>
    </div>
  );
}
