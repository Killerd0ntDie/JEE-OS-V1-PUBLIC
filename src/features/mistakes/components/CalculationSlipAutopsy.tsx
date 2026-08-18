import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  AlertCircle, ShieldCheck, CheckSquare, 
  HelpCircle, Sparkles, ChevronRight, Zap, Target 
} from 'lucide-react';
import { MathRenderer } from '@/components/MathRenderer';
import { audioEngine } from '@/utils/audioEngine';

export type CalculationSlipType = 
  | 'sign_trap'
  | 'unit_mismatch'
  | 'question_misread'
  | 'arithmetic_decimal'
  | 'formula_misapply';

export interface CalculationSlipMeta {
  type: CalculationSlipType;
  title: string;
  badgeClass: string;
  iconBg: string;
  example: string;
  preventionGuard: string;
  frequencyEstimate: string;
}

export const CALCULATION_SLIPS: Record<CalculationSlipType, CalculationSlipMeta> = {
  sign_trap: {
    type: 'sign_trap',
    title: 'Sign & Direction Trap (±)',
    badgeClass: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
    iconBg: 'text-rose-400',
    example: 'Forgetting minus sign in work done by conservative force $W = -\\Delta U$, or lens focal length signs.',
    preventionGuard: 'Explicitly establish a coordinate sign convention (+ve right / upwards) before substituting numbers.',
    frequencyEstimate: '35% of all silly errors'
  },
  unit_mismatch: {
    type: 'unit_mismatch',
    title: 'Unit & Dimensional Mismatch',
    badgeClass: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
    iconBg: 'text-amber-400',
    example: 'Using $\\text{cm}$ instead of $\\text{m}$, $\\text{eV}$ instead of $\\text{J}$ ($1\\text{ eV} = 1.6\\times 10^{-19}\\text{ J}$), or degrees instead of radians.',
    preventionGuard: 'Underline all units in the problem statement and convert to standard SI units in the very first line of scratch work.',
    frequencyEstimate: '28% of all silly errors'
  },
  question_misread: {
    type: 'question_misread',
    title: 'Question Statement Misread',
    badgeClass: 'bg-purple-950/80 border-purple-500/40 text-purple-300',
    iconBg: 'text-purple-400',
    example: 'Asked for INCORRECT statement (marked correct), or asked for diameter $2R$ (marked radius $R$).',
    preventionGuard: 'Re-read the final question prompt line: "What is specifically being asked?" before bubbling option.',
    frequencyEstimate: '22% of all silly errors'
  },
  arithmetic_decimal: {
    type: 'arithmetic_decimal',
    title: 'Arithmetic & Power of 10 Slip',
    badgeClass: 'bg-sky-950/80 border-sky-500/40 text-sky-300',
    iconBg: 'text-sky-400',
    example: 'Decimal point shift, division by fractions, or power exponent addition error ($10^{-6} \\times 10^{-3} = 10^{-9}$).',
    preventionGuard: 'Separate mantissa arithmetic and powers of 10 into two distinct calculation lines on rough paper.',
    frequencyEstimate: '15% of all silly errors'
  },
  formula_misapply: {
    type: 'formula_misapply',
    title: 'Approximation / Boundary Violation',
    badgeClass: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
    iconBg: 'text-emerald-400',
    example: 'Using small-angle approximation $\\sin\\theta \\approx \\theta$ when $\\theta = 45^\\circ$, or thin lens formula for thick lens.',
    preventionGuard: 'Check condition of validity (e.g. $x \\ll L$, monoatomic vs diatomic $\\gamma$, ideal gas assumption).',
    frequencyEstimate: '10% of all silly errors'
  }
};

export function CalculationSlipAutopsy() {
  const [activeSlip, setActiveSlip] = useState<CalculationSlipType>('sign_trap');
  const [checkedGuards, setCheckedGuards] = useState<Record<string, boolean>>({});

  const toggleGuard = (key: string) => {
    audioEngine.playMechanicalKey('click').catch(() => {});
    setCheckedGuards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedMeta = CALCULATION_SLIPS[activeSlip];

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-6 text-left relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              PRECISION & SILLY MISTAKE NEUTRALIZER
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Calculation Slip Autopsy & Pre-Submission Guard
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            Eliminates the 25–40 marks routinely lost in JEE to avoidable sign flips, unit mismatches, and question misreads.
          </p>
        </div>

        {/* Avoidable Mark Recovery Estimate */}
        <div className="px-4 py-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Recoverable Buffer</div>
            <div className="text-sm font-mono font-bold text-emerald-300">+28 to +36 Marks</div>
          </div>
        </div>
      </div>

      {/* Slip Archetype Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        {(Object.keys(CALCULATION_SLIPS) as CalculationSlipType[]).slice(0, 4).map((type) => {
          const item = CALCULATION_SLIPS[type];
          const isSelected = activeSlip === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                audioEngine.playMechanicalKey('click').catch(() => {});
                setActiveSlip(type);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                isSelected
                  ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-600/20'
                  : 'bg-zinc-950/60 border-white/5 hover:border-white/15'
              }`}
            >
              <span className="text-[9px] uppercase font-bold text-zinc-400 block">
                {item.frequencyEstimate}
              </span>
              <h4 className="text-xs font-bold text-white font-sans truncate">
                {item.title}
              </h4>
            </button>
          );
        })}
      </div>

      {/* Active Archetype Diagnostic Showcase */}
      <div className="p-5 rounded-2xl bg-[#121318] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md border ${selectedMeta.badgeClass}`}>
            {selectedMeta.title}
          </span>
          <span className="text-xs font-mono text-zinc-400">Impact: {selectedMeta.frequencyEstimate}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Example Slip */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-rose-400">Frequent JEE Trap Pattern:</span>
            <div className="text-xs font-serif text-zinc-300 leading-relaxed">
              <MathRenderer text={selectedMeta.example} />
            </div>
          </div>

          {/* Prevention Strategy */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Mental Guard & Rough Sheet Action:</span>
            <p className="text-xs font-sans text-emerald-200 leading-relaxed font-medium">
              {selectedMeta.preventionGuard}
            </p>
          </div>
        </div>
      </div>

      {/* 5-POINT PRE-SUBMISSION CHECKLIST (CBT Exam Arena Guard) */}
      <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-400" />
            5-Second Pre-Submission Verification Guard (Before Clicking 'Save & Next')
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">Practice Muscle Memory</span>
        </div>

        <div className="space-y-2 font-mono text-xs">
          {[
            { id: 'g1', text: 'Target Check: Did they ask for radius or diameter? Frequency or angular frequency ($\omega$ vs $f$)?' },
            { id: 'g2', text: 'Sign Check: Is work positive/negative? Is charge sign ($\pm q$) properly carried in potential energy?' },
            { id: 'g3', text: 'Unit Check: Are units in SI? (cm to m, minutes to seconds, g to kg, eV to Joules).' },
            { id: 'g4', text: 'Boundary Check: Does the answer hold at extreme edge values (e.g. $t = 0, \theta = 0, R \rightarrow \infty$)?' },
            { id: 'g5', text: 'Option Match: Did I select the option corresponding to my rough sheet without mis-clicking?' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleGuard(item.id)}
              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                checkedGuards[item.id]
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                checkedGuards[item.id] ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-zinc-700'
              }`}>
                {checkedGuards[item.id] && <CheckSquare className="w-3 h-3" />}
              </div>
              <span className="text-xs font-sans font-medium">{item.text}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
