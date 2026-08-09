import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { ExamOption } from '../hooks/useMentorInterviewForm';

interface Props {
  setStep: (step: number) => void;
  selectedExams: ExamOption[];
  toggleExam: (exam: ExamOption) => void;
  targetYear: string;
  setTargetYear: (year: string) => void;
  targetRank: string;
  setTargetRank: (rank: string) => void;
  targetCollege: string;
  setTargetCollege: (college: string) => void;
  targetBranch: string;
  setTargetBranch: (branch: string) => void;
}

export const AcademicTargetsStep: React.FC<Props> = ({
  setStep,
  selectedExams,
  toggleExam,
  targetYear,
  setTargetYear,
  targetRank,
  setTargetRank,
  targetCollege,
  setTargetCollege,
  targetBranch,
  setTargetBranch,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h3 className="text-lg font-display font-bold text-white">Target Exams & Ambition Goals</h3>
        <p className="text-xs text-zinc-400">Select your target exams and define your target metrics.</p>
      </div>

      {/* Exam selection */}
      <div className="space-y-2.5">
        <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Target Exams</label>
        <div className="flex flex-wrap gap-2.5">
          {(['JEE Main', 'JEE Advanced', 'Boards', 'MHT CET', 'BITSAT', 'Others'] as ExamOption[]).map(exam => {
            const isSelected = selectedExams.includes(exam);
            return (
              <button
                key={exam}
                type="button"
                onClick={() => toggleExam(exam)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  isSelected 
                    ? 'border-indigo-500/60 bg-indigo-950/50 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.15)] font-bold' 
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-zinc-700 bg-zinc-950'}`}>
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>{exam}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Year */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Target Exam Year</label>
        <div className="grid grid-cols-4 gap-3">
          {['2025', '2026', '2027', '2028'].map(yr => (
            <button
              key={yr}
              type="button"
              onClick={() => setTargetYear(yr)}
              className={`py-3 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                targetYear === yr
                  ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Target Rank & Chips */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Target Rank Goal</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {['AIR < 100', 'AIR < 500', 'AIR < 1000', 'AIR < 5000', 'AIR < 10000'].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => setTargetRank(chip)}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                targetRank === chip
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-300 font-bold'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={targetRank}
          onChange={(e) => setTargetRank(e.target.value)}
          placeholder="Custom target rank, e.g. AIR < 500"
          className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 font-mono placeholder:text-zinc-600"
        />
      </div>

      {/* Target College & Branch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Target College</label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {['IIT Bombay', 'IIT Delhi', 'IIT Madras', 'BITS Pilani'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setTargetCollege(c)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer ${
                  targetCollege === c
                    ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300 font-bold'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={targetCollege}
            onChange={(e) => setTargetCollege(e.target.value)}
            placeholder="e.g. IIT Bombay"
            className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 placeholder:text-zinc-600"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Target Branch</label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {['Computer Science', 'Electrical', 'Mechanical', 'Aerospace'].map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setTargetBranch(b)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer ${
                  targetBranch === b
                    ? 'border-purple-500/60 bg-purple-500/10 text-purple-300 font-bold'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-300'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={targetBranch}
            onChange={(e) => setTargetBranch(e.target.value)}
            placeholder="e.g. Computer Science & Engineering"
            className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 placeholder:text-zinc-600"
          />
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={() => setStep(1)}
          className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
        >
          Next: Class & Setup
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
