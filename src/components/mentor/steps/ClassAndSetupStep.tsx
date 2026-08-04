import React from 'react';
import { ArrowRight, Flame } from 'lucide-react';

interface Props {
  setStep: (step: number) => void;
  currentClass: '11th' | '12th' | 'Dropper';
  setCurrentClass: (val: '11th' | '12th' | 'Dropper') => void;
  coachingType: 'Online Coaching' | 'Offline Coaching' | 'Self Study' | 'School + Coaching';
  setCoachingType: (val: 'Online Coaching' | 'Offline Coaching' | 'Self Study' | 'School + Coaching') => void;
  coachingName: string;
  setCoachingName: (val: string) => void;
  dailyHours: number;
  setDailyHours: (val: number) => void;
}

export const ClassAndSetupStep: React.FC<Props> = ({
  setStep,
  currentClass,
  setCurrentClass,
  coachingType,
  setCoachingType,
  coachingName,
  setCoachingName,
  dailyHours,
  setDailyHours,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h3 className="text-lg font-display font-bold text-white">Class & Learning Environment</h3>
        <p className="text-xs text-zinc-400">Tell us your study setup to calibrate daily workloads accurately.</p>
      </div>

      {/* Current Class */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Current Academic Standard</label>
        <div className="grid grid-cols-3 gap-3">
          {(['11th', '12th', 'Dropper'] as const).map(cls => (
            <button
              key={cls}
              type="button"
              onClick={() => setCurrentClass(cls)}
              className={`p-3.5 rounded-xl border text-center font-mono text-xs font-bold transition-all cursor-pointer ${
                currentClass === cls
                  ? 'border-indigo-500/80 bg-indigo-950/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Coaching Setup */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Learning / Coaching Model</label>
        <div className="grid grid-cols-2 gap-3">
          {(['Online Coaching', 'Offline Coaching', 'Self Study', 'School + Coaching'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setCoachingType(type)}
              className={`p-3.5 rounded-xl border text-left font-mono text-xs transition-all cursor-pointer ${
                coachingType === type
                  ? 'border-indigo-500/80 bg-indigo-950/50 text-indigo-300 font-bold shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Coaching Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">Coaching / Platform Name (Optional)</label>
        <input
          type="text"
          value={coachingName}
          onChange={(e) => setCoachingName(e.target.value)}
          placeholder="e.g. Allen, Unacademy, PW, FIITJEE, Self"
          className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 placeholder:text-zinc-600"
        />
      </div>

      {/* Daily available study hours */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900/60 to-indigo-950/20 border border-zinc-800/80 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            Daily Available Self-Study Hours
          </label>
          <span className="text-sm font-mono text-indigo-300 font-bold px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
            {dailyHours} Hours / Day
          </span>
        </div>
        
        <input
          type="range"
          min="2"
          max="14"
          step="0.5"
          value={dailyHours}
          onChange={(e) => setDailyHours(parseFloat(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer"
        />

        <div className="flex justify-between gap-2 pt-1">
          {[4, 6, 8, 10, 12].map(hr => (
            <button
              key={hr}
              type="button"
              onClick={() => setDailyHours(hr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                dailyHours === hr
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {hr}h
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={() => setStep(2)}
          className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={() => setStep(4)}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
        >
          Next: Subject Strategy
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
