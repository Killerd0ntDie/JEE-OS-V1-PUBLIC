import React from 'react';
import { Clock } from 'lucide-react';
import { SubjectId } from '../../../types/index';

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
    <div className="w-full max-w-md text-center space-y-3">
      <div className="space-y-1.5">
        {/* Active Subject Switcher Row */}
        <div className="flex justify-center gap-2 mb-2">
          {(['physics', 'chemistry', 'maths'] as const).map(subj => (
            <button
              key={subj}
              onClick={() => onChangeSubject(subj)}
              className={`text-[9px] font-mono px-3 py-1 rounded-full border tracking-wider transition-all uppercase ${
                activeSubject === subj
                  ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-400 font-bold'
                  : 'bg-transparent border-zinc-900 text-zinc-500 hover:text-zinc-400 hover:border-zinc-800'
              }`}
            >
              {subjectsDetails[subj].name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-indigo-500 animate-pulse`} />
          <span className="text-3xs font-mono font-bold tracking-[0.2em] text-indigo-400 uppercase">
            {activeDetails.name} // CHAPTER FOCUS
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-black font-display text-white tracking-tight leading-tight mt-1">
          {activeDetails.chapter}
        </h1>
        <p className="text-xs text-zinc-400 tracking-wide font-mono opacity-80">
          {activeDetails.lecture}
        </p>
        <div className="flex justify-center items-center gap-4 text-[10px] font-mono text-zinc-500 pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Est: {activeDetails.duration}
          </span>
          <span>•</span>
          <span>Target Weight: Tier 1 ROI</span>
        </div>
      </div>
    </div>
  );
}
