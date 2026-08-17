import React from 'react';
import { Target, Award, Calendar, BookOpen } from 'lucide-react';
import { MentorProfile } from '@/types/index';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface AcademicSettingsSectionProps {
  targetExam: string;
  targetYear: string;
  targetCollege: string;
  targetBranch: string;
  classLevel: string;
  coachingType: string;
  onUpdateMentor: (updates: Partial<MentorProfile>) => void;
  onUpdateSettings: (key: string, value: any) => void;
  dayStartTime: string;
  dayEndTime: string;
}

export const AcademicSettingsSection: React.FC<AcademicSettingsSectionProps> = ({
  targetExam,
  targetYear,
  targetCollege,
  targetBranch,
  classLevel,
  coachingType: _coachingType,
  onUpdateMentor,
  onUpdateSettings,
  dayStartTime,
  dayEndTime
}) => {
  const targetExamOptions = [
    { value: 'JEE Main', label: 'JEE Main' },
    { value: 'JEE Advanced', label: 'JEE Advanced' },
    { value: 'Both', label: 'Both (Main + Advanced)' },
  ];

  const targetYearOptions = [
    { value: '2025', label: 'JEE 2025' },
    { value: '2026', label: 'JEE 2026' },
    { value: '2027', label: 'JEE 2027' },
    { value: '2028', label: 'JEE 2028' },
  ];

  const classLevelOptions = [
    { value: '11th', label: 'Class 11 (11th)' },
    { value: '12th', label: 'Class 12 (12th)' },
    { value: 'Dropper', label: 'Dropper' },
  ];

  return (
    <div className="rounded-3xl p-6 md:p-8 shadow-xl space-y-5 text-left relative z-20 overflow-visible">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
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
          <CustomSelect
            value={targetExam}
            options={targetExamOptions}
            onChange={(val) => onUpdateMentor({ targetExams: [val as any] })}
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Target Year
          </label>
          <CustomSelect
            value={targetYear}
            options={targetYearOptions}
            onChange={(val) => {
              onUpdateMentor({ targetYear: String(val) });
              onUpdateSettings('targetYear', String(val));
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            Class Level
          </label>
          <CustomSelect
            value={classLevel}
            options={classLevelOptions}
            onChange={(val) => onUpdateMentor({ currentClass: val as any })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Day Start Time
          </label>
          <input
            type="time"
            value={dayStartTime}
            onChange={(e) => onUpdateSettings('dayStartTime', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Day End Time (Cutoff)
          </label>
          <input
            type="time"
            value={dayEndTime}
            onChange={(e) => onUpdateSettings('dayEndTime', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
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
