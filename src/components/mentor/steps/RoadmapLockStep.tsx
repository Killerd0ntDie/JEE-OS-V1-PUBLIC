import React from 'react';
import { Sparkles, CheckCircle, RefreshCw } from 'lucide-react';

interface Props {
  setStep: (step: number) => void;
  selectedExams: string[];
  targetYear: string;
  targetCollege: string;
  targetBranch: string;
  targetRank: string;
  dailyHours: number;
  currentClass: string;
  subjectSplitStrategy: string;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  isSubmitting: boolean;
  handleFinishInterview: () => void;
}

export const RoadmapLockStep: React.FC<Props> = ({
  setStep,
  selectedExams,
  targetYear,
  targetCollege,
  targetBranch,
  targetRank,
  dailyHours,
  currentClass,
  subjectSplitStrategy,
  completedCount,
  inProgressCount,
  notStartedCount,
  isSubmitting,
  handleFinishInterview,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-5 rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-zinc-950/50 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold">
            <Sparkles className="w-4 h-4 animate-pulse" />
            AI Mentor Analysis Complete
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 font-bold">
            Ready to Launch
          </span>
        </div>

        <div>
          <h3 className="text-base font-display font-bold text-white">
            Strategic JEE Master Plan Calibrated
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed mt-1">
            Targeting <strong className="text-indigo-300">{selectedExams.join(', ')} ({targetYear})</strong> for <strong className="text-indigo-300">{targetCollege}</strong> ({targetBranch}) with goal <strong className="text-indigo-300">{targetRank}</strong>.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 font-mono text-[11px]">
          <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
            <span className="text-[9px] text-zinc-500 uppercase block font-bold">Daily Hours</span>
            <span className="text-indigo-300 font-bold text-sm">{dailyHours} hrs/day</span>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
            <span className="text-[9px] text-zinc-500 uppercase block font-bold">Class</span>
            <span className="text-white font-bold text-sm">{currentClass}</span>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
            <span className="text-[9px] text-zinc-500 uppercase block font-bold">Subject Strategy</span>
            <span className="text-purple-300 font-bold text-sm truncate block">
              {subjectSplitStrategy === '1_a_day_alternating' ? '1 Focus' : subjectSplitStrategy === '2_a_day_alternating' ? '2 Alternating' : '3 Daily'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
            <span className="text-[9px] text-zinc-500 uppercase block font-bold">Completed</span>
            <span className="text-emerald-400 font-bold text-sm">{completedCount} Chapters</span>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
            <span className="text-[9px] text-zinc-500 uppercase block font-bold">Pending</span>
            <span className="text-indigo-400 font-bold text-sm">{inProgressCount + notStartedCount} Chapters</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">Activated Engine Modules</h4>
        <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 space-y-2.5 text-xs text-zinc-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>User reality profile & targets synchronized to database.</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Dynamic Execution Queue unlocked with personalized micro-missions.</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Continuous AI Mentor study strategy engine active.</span>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-between items-center">
        <button
          onClick={() => setStep(5)}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={handleFinishInterview}
          disabled={isSubmitting}
          className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.35)] transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Calibrating Engine...
            </>
          ) : (
            <>
              Lock Roadmap & Launch
              <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
