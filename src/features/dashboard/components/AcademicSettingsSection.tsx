import React from 'react';
import { Target, Award, Calendar, BookOpen } from 'lucide-react';
import { MentorProfile } from '@/types/index';

interface AcademicSettingsSectionProps {
  targetExam: string;
  targetYear: string;
  targetCollege: string;
  targetBranch: string;
  classLevel: string;
  coachingType: string;
  onUpdateMentor: (updates: Partial<MentorProfile>) => void;
  onUpdateSettings: (key: string, value: any) => void;
}

export const AcademicSettingsSection: React.FC<AcademicSettingsSectionProps> = ({
  targetExam,
  targetYear,
  targetCollege,
  targetBranch,
  classLevel,
  coachingType,
  onUpdateMentor,
  onUpdateSettings
}) => {
  return (
    <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-5">
      <div className="flex items-center gap-3 border-b border-zinc-800/60 pb-4">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Target className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold font-display text-white tracking-tight">Academic Targets & Blueprint</h2>
          <p className="text-[11px] text-zinc-400 font-mono">Target exam, year, dream college, and class level</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            Target Exam
          </label>
          <select
            value={targetExam}
            onChange={(e) => onUpdateMentor({ targetExams: [e.target.value as any] })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="JEE Main">JEE Main</option>
            <option value="JEE Advanced">JEE Advanced</option>
            <option value="Both">Both (Main + Advanced)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Target Year
          </label>
          <select
            value={targetYear}
            onChange={(e) => {
              onUpdateMentor({ targetYear: e.target.value });
              onUpdateSettings('targetYear', e.target.value);
            }}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            Class Level
          </label>
          <select
            value={classLevel}
            onChange={(e) => onUpdateMentor({ currentClass: e.target.value as any })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="11th">Class 11 (11th)</option>
            <option value="12th">Class 12 (12th)</option>
            <option value="Dropper">Dropper</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5">Dream College</label>
          <input
            type="text"
            value={targetCollege}
            onChange={(e) => {
              onUpdateMentor({ targetCollege: e.target.value });
              onUpdateSettings('dreamIit', e.target.value);
            }}
            placeholder="e.g. IIT Bombay, IIT Delhi"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5">Target Branch / Discipline</label>
          <input
            type="text"
            value={targetBranch}
            onChange={(e) => {
              onUpdateMentor({ targetBranch: e.target.value });
              onUpdateSettings('targetBranch', e.target.value);
            }}
            placeholder="e.g. Computer Science & Engineering"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
