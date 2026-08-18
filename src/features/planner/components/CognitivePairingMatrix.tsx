import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Brain, Sparkles, Flame, CheckCircle2, 
  ArrowRight, ShieldCheck, Clock, Layers 
} from 'lucide-react';
import { Chapter } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { audioEngine } from '@/utils/audioEngine';

export interface CognitivePair {
  id: string;
  title: string;
  heavyChapter: { name: string; subject: string; cognitiveLoad: 'Heavy Derivation' | 'Complex Algebra' };
  lightChapter: { name: string; subject: string; cognitiveLoad: 'High-Yield Memory' | 'Formula Speed' };
  ratioRecommendation: string;
  rationale: string;
}

export const COGNITIVE_PAIRS: CognitivePair[] = [
  {
    id: 'cp-1',
    title: 'The Kinetic Momentum Pair',
    heavyChapter: { name: 'Rotational Dynamics', subject: 'Physics', cognitiveLoad: 'Heavy Derivation' },
    lightChapter: { name: 'Modern Physics & Dual Nature', subject: 'Physics', cognitiveLoad: 'Formula Speed' },
    ratioRecommendation: '70% Morning (Rotational Problem Solving) + 30% Evening (de Broglie / Photoelectric Recall)',
    rationale: 'Rotational dynamics drains spatial reasoning. Modern Physics resets cognitive momentum with high-yield direct formula recall.'
  },
  {
    id: 'cp-2',
    title: 'The Equilibrium Synthesis Pair',
    heavyChapter: { name: 'Thermodynamics & KTG', subject: 'Physics', cognitiveLoad: 'Heavy Derivation' },
    lightChapter: { name: 'Coordination Compounds', subject: 'Chemistry', cognitiveLoad: 'High-Yield Memory' },
    ratioRecommendation: '65% Day Block (PV indicator diagrams & heat engines) + 35% Night Block (CFT splitting & IUPAC nomenclature)',
    rationale: 'Shifts brain activity from physical thermodynamic work integrals to structural inorganic chemistry crystal field theory.'
  },
  {
    id: 'cp-3',
    title: 'The Analytical Calculus Buffer',
    heavyChapter: { name: 'Definite Integrals & Diff. Eq.', subject: 'Maths', cognitiveLoad: 'Complex Algebra' },
    lightChapter: { name: 'Matrices & Determinants', subject: 'Maths', cognitiveLoad: 'Formula Speed' },
    ratioRecommendation: '70% Deep Block (Integration by parts / King rule) + 30% Rapid Block (Cramer rule & matrix adjoints)',
    rationale: 'Avoids burnout during lengthy calculus proofs by concluding with deterministic linear algebra matrix properties.'
  },
  {
    id: 'cp-4',
    title: 'The Wave & Organic Logic Pair',
    heavyChapter: { name: 'Electromagnetic Induction & AC', subject: 'Physics', cognitiveLoad: 'Heavy Derivation' },
    lightChapter: { name: 'Biomolecules & Everyday Chem', subject: 'Chemistry', cognitiveLoad: 'High-Yield Memory' },
    ratioRecommendation: '75% Focus Block (Lenz law / Phasor diagrams) + 25% Wind-down Block (Amino acid structures & polymer bonds)',
    rationale: 'Prevents mental fatigue after differential phasor analysis by switching to pure factual NCERT biology-chemistry recall.'
  }
];

export function CognitivePairingMatrix() {
  const [activePairId, setActivePairId] = useState<string>(COGNITIVE_PAIRS[0].id);

  const selectedPair = COGNITIVE_PAIRS.find(p => p.id === activePairId) || COGNITIVE_PAIRS[0];

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-6 text-left relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 flex items-center gap-1">
              <Brain className="w-3 h-3 text-purple-400" />
              ANTI-BURNOUT COGNITIVE LOAD BALANCER
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Cognitive Chapter Pairing Synergy Matrix
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            Combines high-derivation heavy topics with high-yield memory buffers to maintain peak DPP speed without cognitive saturation.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-2xl bg-zinc-950/70 border border-white/10 flex items-center gap-3 shrink-0 font-mono text-xs">
          <div>
            <div className="text-[10px] uppercase text-zinc-400 font-bold">Golden Daily Ratio</div>
            <div className="text-xs font-bold text-indigo-300">70% Heavy Core + 30% Buffer</div>
          </div>
        </div>
      </div>

      {/* Pairing Preset Directory */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        {COGNITIVE_PAIRS.map(pair => {
          const isSelected = activePairId === pair.id;

          return (
            <button
              key={pair.id}
              type="button"
              onClick={() => {
                audioEngine.playMechanicalKey('click').catch(() => {});
                setActivePairId(pair.id);
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 ${
                isSelected
                  ? 'bg-indigo-950/60 border-indigo-500/60 shadow-lg shadow-indigo-600/20'
                  : 'bg-zinc-950/60 border-white/5 hover:border-white/15'
              }`}
            >
              <span className="text-[9px] uppercase font-bold text-indigo-400 block">
                Synergy Combination
              </span>
              <h4 className="text-xs font-bold text-white font-sans truncate">
                {pair.title}
              </h4>
              <div className="text-[10px] text-zinc-400 space-y-0.5 pt-1">
                <div className="truncate text-rose-300 font-medium">🔴 {pair.heavyChapter.name}</div>
                <div className="truncate text-emerald-300 font-medium">🟢 {pair.lightChapter.name}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Synergy Breakdown Card */}
      <div className="p-5 rounded-2xl bg-[#121318] border border-white/10 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <h3 className="text-base font-bold text-white font-display">
            {selectedPair.title}
          </h3>
          <span className="text-xs font-mono text-indigo-300 font-bold">
            {selectedPair.ratioRecommendation}
          </span>
        </div>

        {/* 2-Pillar Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          
          {/* Heavy Pillar */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-rose-400">Pillar A: Deep Analytical Core</span>
              <span className="text-rose-300 font-bold">{selectedPair.heavyChapter.subject}</span>
            </div>
            <h4 className="text-sm font-bold text-white font-sans">{selectedPair.heavyChapter.name}</h4>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Load: <strong className="text-rose-300">{selectedPair.heavyChapter.cognitiveLoad}</strong>. Best scheduled during peak morning hours (9:00 AM – 1:00 PM).
            </p>
          </div>

          {/* Buffer Pillar */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Pillar B: Cognitive Reset Buffer</span>
              <span className="text-emerald-300 font-bold">{selectedPair.lightChapter.subject}</span>
            </div>
            <h4 className="text-sm font-bold text-white font-sans">{selectedPair.lightChapter.name}</h4>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Load: <strong className="text-emerald-300">{selectedPair.lightChapter.cognitiveLoad}</strong>. Best scheduled for evening wind-down blocks (7:00 PM – 9:30 PM).
            </p>
          </div>

        </div>

        {/* Pedagogical Rationale */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 text-xs text-zinc-300 font-sans leading-relaxed">
          <strong className="text-indigo-400 font-mono">Cognitive Rationale: </strong>
          {selectedPair.rationale}
        </div>

      </div>

    </div>
  );
}
