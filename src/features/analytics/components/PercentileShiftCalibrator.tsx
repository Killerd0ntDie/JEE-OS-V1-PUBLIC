import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Target, Award, TrendingUp, Sparkles, 
  Layers, CheckCircle2, ChevronRight, School 
} from 'lucide-react';
import { audioEngine } from '@/utils/audioEngine';

export type TargetPercentile = 95 | 97 | 98 | 99 | 99.5 | 99.9;

export interface ShiftTargetData {
  percentile: number;
  airEstimate: number;
  colleges: string;
  easyShiftMarks: { total: number; chem: number; phys: number; math: number };
  moderateShiftMarks: { total: number; chem: number; phys: number; math: number };
  toughShiftMarks: { total: number; chem: number; phys: number; math: number };
}

export const PERCENTILE_MATRIX: Record<string, ShiftTargetData> = {
  '99.9': {
    percentile: 99.9,
    airEstimate: 1200,
    colleges: 'Top 3 NITs (Trichy/Surathkal/Warangal) CSE • Top IIIT-H • Full JEE Adv Qualification',
    easyShiftMarks: { total: 245, chem: 90, phys: 85, math: 70 },
    moderateShiftMarks: { total: 225, chem: 82, phys: 78, math: 65 },
    toughShiftMarks: { total: 200, chem: 74, phys: 70, math: 56 }
  },
  '99.5': {
    percentile: 99.5,
    airEstimate: 6000,
    colleges: 'Top 5 NITs (Calicut/Rourkela/Allahabad) CSE/ECE • MNNIT • DTU/NSUT',
    easyShiftMarks: { total: 228, chem: 84, phys: 80, math: 64 },
    moderateShiftMarks: { total: 205, chem: 76, phys: 72, math: 57 },
    toughShiftMarks: { total: 180, chem: 68, phys: 64, math: 48 }
  },
  '99': {
    percentile: 99.0,
    airEstimate: 12000,
    colleges: 'Top 10 NITs (Jaipur/Nagpur/Kurukshetra) Core Branches • Top IIITs ECE',
    easyShiftMarks: { total: 212, chem: 80, phys: 76, math: 56 },
    moderateShiftMarks: { total: 185, chem: 72, phys: 68, math: 45 },
    toughShiftMarks: { total: 160, chem: 62, phys: 58, math: 40 }
  },
  '98': {
    percentile: 98.0,
    airEstimate: 24000,
    colleges: 'All NITs Core Engineering • IIIT Jabalpur/Kancheepuram • Top State Colleges',
    easyShiftMarks: { total: 190, chem: 72, phys: 68, math: 50 },
    moderateShiftMarks: { total: 165, chem: 64, phys: 60, math: 41 },
    toughShiftMarks: { total: 140, chem: 55, phys: 50, math: 35 }
  },
  '97': {
    percentile: 97.0,
    airEstimate: 36000,
    colleges: 'NIT Mech/Civil/Chemical • IIITs • Tier-1 State Univs (COEP, VJTI, PEC)',
    easyShiftMarks: { total: 175, chem: 66, phys: 62, math: 47 },
    moderateShiftMarks: { total: 150, chem: 58, phys: 54, math: 38 },
    toughShiftMarks: { total: 125, chem: 48, phys: 44, math: 33 }
  },
  '95': {
    percentile: 95.0,
    airEstimate: 60000,
    colleges: 'JEE Advanced Qualifier • State Govt Top Colleges • Home State NITs',
    easyShiftMarks: { total: 150, chem: 58, phys: 52, math: 40 },
    moderateShiftMarks: { total: 128, chem: 50, phys: 44, math: 34 },
    toughShiftMarks: { total: 105, chem: 40, phys: 37, math: 28 }
  }
};

export function PercentileShiftCalibrator() {
  const [selectedPercentile, setSelectedPercentile] = useState<string>('99');
  const [activeShiftMode, setActiveShiftMode] = useState<'easy' | 'moderate' | 'tough'>('moderate');

  const currentData = PERCENTILE_MATRIX[selectedPercentile] || PERCENTILE_MATRIX['99'];

  const shiftMarks = 
    activeShiftMode === 'easy' ? currentData.easyShiftMarks :
    activeShiftMode === 'tough' ? currentData.toughShiftMarks :
    currentData.moderateShiftMarks;

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-6 text-left relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-400" />
              JEE MAIN 2021–2025 NORMALIZATION MATRIX
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Percentile ↔ Shift Normalization Calibrator
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            Calibrate your target score split across Easy, Moderate, and Tough paper shifts to guarantee your target percentile.
          </p>
        </div>

        {/* Target Percentile Selector */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10 font-mono text-xs shrink-0">
          {(['95', '97', '98', '99', '99.5', '99.9'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => {
                audioEngine.playMechanicalKey('click').catch(() => {});
                setSelectedPercentile(p);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                selectedPercentile === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p}%ile
            </button>
          ))}
        </div>
      </div>

      {/* 1. SHIFT DIFFICULTY SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveShiftMode('tough')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeShiftMode === 'tough' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tough Shift (Low Cutoff)
          </button>
          <button
            type="button"
            onClick={() => setActiveShiftMode('moderate')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeShiftMode === 'moderate' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Moderate Shift (Standard)
          </button>
          <button
            type="button"
            onClick={() => setActiveShiftMode('easy')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeShiftMode === 'easy' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Easy Shift (High Cutoff)
          </button>
        </div>

        <span className="text-zinc-400">
          Predicted AIR: <strong className="text-white">~{currentData.airEstimate.toLocaleString()}</strong>
        </span>
      </div>

      {/* 2. SUBJECT TARGET SCORE SPLIT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 font-mono text-xs">
        
        {/* Total Marks */}
        <div className="p-4 rounded-2xl bg-[#121318] border border-indigo-500/40 space-y-1">
          <span className="text-[10px] uppercase font-bold text-indigo-400">Target Total</span>
          <div className="text-3xl font-display font-bold text-white">
            {shiftMarks.total} <span className="text-sm text-zinc-500 font-mono">/ 300</span>
          </div>
          <span className="text-[10px] text-zinc-400">{Math.round((shiftMarks.total / 300) * 100)}% Paper Accuracy</span>
        </div>

        {/* Chemistry Target */}
        <div className="p-4 rounded-2xl bg-zinc-950/70 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-400">Chemistry (Speed Pillar)</span>
          <div className="text-2xl font-bold text-emerald-300">
            {shiftMarks.chem} <span className="text-xs text-zinc-500 font-mono">/ 100</span>
          </div>
          <span className="text-[10px] text-zinc-400">~{Math.round(shiftMarks.chem / 4)} Correct Qs (35 mins)</span>
        </div>

        {/* Physics Target */}
        <div className="p-4 rounded-2xl bg-zinc-950/70 border border-sky-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-sky-400">Physics (Core Engine)</span>
          <div className="text-2xl font-bold text-sky-300">
            {shiftMarks.phys} <span className="text-xs text-zinc-500 font-mono">/ 100</span>
          </div>
          <span className="text-[10px] text-zinc-400">~{Math.round(shiftMarks.phys / 4)} Correct Qs (55 mins)</span>
        </div>

        {/* Mathematics Target */}
        <div className="p-4 rounded-2xl bg-zinc-950/70 border border-purple-500/30 space-y-1">
          <span className="text-[10px] uppercase font-bold text-purple-400">Maths (Selective Marks)</span>
          <div className="text-2xl font-bold text-purple-300">
            {shiftMarks.math} <span className="text-xs text-zinc-500 font-mono">/ 100</span>
          </div>
          <span className="text-[10px] text-zinc-400">~{Math.round(shiftMarks.math / 4)} Correct Qs (80 mins)</span>
        </div>

      </div>

      {/* College & Branch Benchmark Card */}
      <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex items-center gap-3 text-xs font-mono">
        <School className="w-5 h-5 text-indigo-400 shrink-0" />
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Target College Tier:</span>
          <div className="text-zinc-200 font-sans text-xs font-medium truncate">
            {currentData.colleges}
          </div>
        </div>
      </div>

    </div>
  );
}
