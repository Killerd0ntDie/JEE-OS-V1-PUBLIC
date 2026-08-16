import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles } from 'lucide-react';
import { springs } from '@/constants/motion';

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
  const getSubjectBadge = (subj: string) => {
    switch (subj) {
      case 'physics':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'chemistry':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'maths':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.snappy}
      className="w-full max-w-lg text-center space-y-2 py-3"
    >
      {/* Prominent Chapter Title & Compact Meta Subtext */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border shadow-sm ${getSubjectBadge(activeSubject)}`}>
            {activeSubject.toUpperCase()}
          </span>
          <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900/60 border border-zinc-800 px-2 py-0.5 rounded-lg">
            Est: {activeDetails.duration}
          </span>
        </div>

        <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight px-4">
          {activeDetails.lecture}
        </h1>

        <p className="text-xs text-zinc-400 font-sans">
          Unit: <strong className="text-zinc-300 font-medium">{activeDetails.chapter}</strong>
        </p>
      </div>
    </motion.div>
  );
}
