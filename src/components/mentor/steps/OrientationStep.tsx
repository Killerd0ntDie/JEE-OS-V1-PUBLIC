import React from 'react';
import { GraduationCap, ShieldCheck, Clock, Target, ArrowRight } from 'lucide-react';

interface Props {
  setStep: (step: number) => void;
}

export const OrientationStep: React.FC<Props> = ({ setStep }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-zinc-950/50 to-purple-950/20 flex items-start gap-4 shadow-inner">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="space-y-2 text-xs text-zinc-300 leading-relaxed">
          <h3 className="font-display font-bold text-white text-base">
            "Welcome to your AI Diagnostic Interview."
          </h3>
          <p className="text-zinc-400 leading-relaxed">
            I build study roadmaps directly from your actual current standing. No template schedules, no assumed progress. Together, we'll calibrate your exact starting line so every daily mission takes you closer to your rank goal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 space-y-2.5 hover:border-emerald-500/30 transition-all">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white font-display">Zero Assumptions</h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Plans are built strictly on what you specify. Unstarted chapters remain unstarted.
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 space-y-2.5 hover:border-indigo-500/30 transition-all">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white font-display">Reality Audit</h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            We log your exact available study hours to set achievable daily execution velocity.
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 space-y-2.5 hover:border-purple-500/30 transition-all">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Target className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white font-display">Adaptive Roadmap</h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Generates weekly milestones tailored precisely to your target exam year & rank.
          </p>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={() => setStep(2)}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
        >
          Start Diagnostic Interview
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
