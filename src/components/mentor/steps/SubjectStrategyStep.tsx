import React from 'react';
import { ArrowRight, Check } from 'lucide-react';

interface Props {
  setStep: (step: number) => void;
  subjectSplitStrategy: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating';
  setSubjectSplitStrategy: (val: '3_a_day' | '2_a_day_alternating' | '1_a_day_alternating') => void;
}

export const SubjectStrategyStep: React.FC<Props> = ({
  setStep,
  subjectSplitStrategy,
  setSubjectSplitStrategy,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h3 className="text-lg font-display font-bold text-white">Subject Split Strategy</h3>
        <p className="text-xs text-zinc-400">Choose how you want to distribute your daily study focus across subjects.</p>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
          Subject Allocation Preference
        </label>
        <div className="grid grid-cols-1 gap-3.5">
          {[
            { 
              id: '3_a_day', 
              title: '3 Subjects Daily', 
              desc: 'Study Physics, Chemistry, and Mathematics every day.' 
            },
            { 
              id: '2_a_day_alternating', 
              title: '2 Subjects Alternating', 
              desc: 'Study 2 subjects per day with alternating rotation (Phys+Chem -> Chem+Maths -> Maths+Phys).' 
            },
            { 
              id: '1_a_day_alternating', 
              title: '1 Subject Focus', 
              desc: 'Study 1 subject per day with daily rotation (Physics -> Chemistry -> Maths).' 
            }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSubjectSplitStrategy(opt.id as any)}
              className={`p-4 rounded-2xl border text-left space-y-1 transition-all cursor-pointer ${
                subjectSplitStrategy === opt.id
                  ? 'border-indigo-500/80 bg-indigo-950/50 text-indigo-300 font-bold shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                  : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-mono font-bold text-white">{opt.title}</div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  subjectSplitStrategy === opt.id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-zinc-700 bg-zinc-950'
                }`}>
                  {subjectSplitStrategy === opt.id && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <div className="text-xs font-mono text-zinc-400 leading-relaxed">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={() => setStep(3)}
          className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={() => setStep(5)}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
        >
          Next: Reality Audit
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
