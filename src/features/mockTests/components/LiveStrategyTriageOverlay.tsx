import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, Target, Zap, Clock, 
  ChevronRight, CheckCircle2, AlertTriangle, X 
} from 'lucide-react';
import { audioEngine } from '@/utils/audioEngine';

export type TriageCategory = 'instant-kill' | 'second-pass' | 'trap-skip';

interface LiveStrategyTriageOverlayProps {
  timeLeftSeconds: number;
  totalDurationMinutes: number;
  currentQuestionId: string;
  triageMap: Record<string, TriageCategory>;
  onSetTriage: (qId: string, cat: TriageCategory) => void;
}

export function LiveStrategyTriageOverlay({
  timeLeftSeconds,
  totalDurationMinutes,
  currentQuestionId,
  triageMap,
  onSetTriage
}: LiveStrategyTriageOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Compute current strategic exam round based on time remaining
  const elapsedMinutes = Math.max(0, totalDurationMinutes - Math.floor(timeLeftSeconds / 60));
  
  const currentRound = 
    elapsedMinutes <= 55 
      ? { round: 1, title: 'Round 1: Rapid Fire Scan', advice: 'Solve direct formulas & fact questions (<75s each). Skip all heavy calculations.', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-950/60' }
      : elapsedMinutes <= 135
      ? { round: 2, title: 'Round 2: Standard Numericals', advice: 'Tackle standard 2-step calculations (90-150s). Return to all 🟡 Second-Pass questions.', color: 'text-sky-400', border: 'border-sky-500/40', bg: 'bg-sky-950/60' }
      : { round: 3, title: 'Round 3: High-Yield Sprints', advice: 'Review multi-concept problems and check calculation signs. Protect negative marks!', color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-950/60' };

  // Current question's triage state
  const activeTriage = triageMap[currentQuestionId];

  // Count total in each triage bucket
  const triageCounts = Object.values(triageMap).reduce(
    (acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    },
    { 'instant-kill': 0, 'second-pass': 0, 'trap-skip': 0 } as Record<TriageCategory, number>
  );

  const handleSelectTriage = (cat: TriageCategory) => {
    audioEngine.playMechanicalKey('click').catch(() => {});
    onSetTriage(currentQuestionId, cat);
  };

  return (
    <div className="bg-zinc-950/90 border border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-xl space-y-2 text-left font-mono text-xs">
      
      {/* Top Banner: Current Exam Round Phase */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${currentRound.bg} ${currentRound.border} ${currentRound.color}`}>
            {currentRound.title}
          </span>
          <span className="text-[10px] text-zinc-400">({elapsedMinutes}m elapsed)</span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
        >
          {isExpanded ? 'Hide Strategy' : 'Strategy Guide'}
        </button>
      </div>

      {/* Expandable Strategy Advice */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-[11px] text-zinc-300 font-sans p-2 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1"
          >
            <p>{currentRound.advice}</p>
            <div className="text-[10px] font-mono text-zinc-400 pt-1 border-t border-white/5 flex gap-4">
              <span>Instant Kills: <strong className="text-emerald-400">{triageCounts['instant-kill']}</strong></span>
              <span>2nd Pass: <strong className="text-sky-400">{triageCounts['second-pass']}</strong></span>
              <span>Traps Avoided: <strong className="text-rose-400">{triageCounts['trap-skip']}</strong></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Question Triage Action Pills */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
        <span className="text-[10px] uppercase text-zinc-400 font-bold shrink-0">
          Question Triage:
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 1. Instant Kill */}
          <button
            type="button"
            onClick={() => handleSelectTriage('instant-kill')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              activeTriage === 'instant-kill'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                : 'bg-zinc-900/80 border-zinc-800 text-emerald-400 hover:bg-emerald-950/40'
            }`}
            title="100% Confident - Bank +4 Marks"
          >
            <span>🟢 Instant Kill</span>
          </button>

          {/* 2. Round 2 Pass */}
          <button
            type="button"
            onClick={() => handleSelectTriage('second-pass')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              activeTriage === 'second-pass'
                ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/30'
                : 'bg-zinc-900/80 border-zinc-800 text-sky-400 hover:bg-sky-950/40'
            }`}
            title="Familiar concept, return in Round 2 for calculation"
          >
            <span>🟡 2nd Pass</span>
          </button>

          {/* 3. Trap / Skip */}
          <button
            type="button"
            onClick={() => handleSelectTriage('trap-skip')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              activeTriage === 'trap-skip'
                ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/30'
                : 'bg-zinc-900/80 border-zinc-800 text-rose-400 hover:bg-rose-950/40'
            }`}
            title="Time-sink trap. Move on immediately to protect marks."
          >
            <span>🔴 Trap / Skip</span>
          </button>
        </div>
      </div>

    </div>
  );
}
