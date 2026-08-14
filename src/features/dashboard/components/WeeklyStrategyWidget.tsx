import React, { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Chapter, MentorProfile } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowRight, Activity, Target, Zap, Clock } from 'lucide-react';

import { motion } from 'motion/react';
import { springs } from '@/constants/motion';

interface WeeklyStrategyWidgetProps {
  chapters: Chapter[];
  mentorProfile?: MentorProfile;
  projectedReadiness: number;
}

export function WeeklyStrategyWidget({ chapters, mentorProfile, projectedReadiness }: WeeklyStrategyWidgetProps) {
  const navigate = useNavigate();

  // Calculate real subject distribution and mastery from chapters
  const subjectDistribution = useMemo(() => {
    let pCount = 0, cCount = 0, mCount = 0;
    let pMastered = 0, cMastered = 0, mMastered = 0;

    (chapters || []).forEach(ch => {
      if (ch.subject === 'physics') {
        pCount++;
        if (ch.completion >= 80) pMastered++;
      } else if (ch.subject === 'chemistry') {
        cCount++;
        if (ch.completion >= 80) cMastered++;
      } else if (ch.subject === 'maths') {
        mCount++;
        if (ch.completion >= 80) mMastered++;
      }
    });

    const total = pCount + cCount + mCount || 1;
    const pPct = Math.round((pCount / total) * 100);
    const cPct = Math.round((cCount / total) * 100);
    const mPct = 100 - pPct - cPct;

    const pMasteryPct = pCount > 0 ? Math.round((pMastered / pCount) * 100) : 0;
    const cMasteryPct = cCount > 0 ? Math.round((cMastered / cCount) * 100) : 0;
    const mMasteryPct = mCount > 0 ? Math.round((mMastered / mCount) * 100) : 0;

    return {
      physics: { total: pCount, mastered: pMastered, pct: pPct, masteryPct: pMasteryPct },
      chemistry: { total: cCount, mastered: cMastered, pct: cPct, masteryPct: cMasteryPct },
      maths: { total: mCount, mastered: mMastered, pct: mPct, masteryPct: mMasteryPct }
    };
  }, [chapters]);

  // Derived milestones for the sprint
  const activeFocus = mentorProfile?.monthlyObjective?.category || 'Finish Mechanics & GOC';
  const dailyHours = mentorProfile?.dailyAvailableHours || 6.5;

  return (
    <div className="flex flex-col gap-4 h-full justify-between text-left">
      {/* 1. Core Weekly Strategy Focus Card */}
      <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <span className="text-[11px] font-mono text-indigo-400 font-bold tracking-widest uppercase">
              WEEKLY STRATEGY FOCUS
            </span>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.03 }}
            transition={springs.snappy}
            onClick={() => navigate('/planner')}
            className="px-2.5 py-1 text-xs font-mono font-bold text-indigo-300 bg-indigo-950/40 hover:bg-indigo-600/30 hover:text-white border border-indigo-500/30 rounded-xl flex items-center gap-1.5 cursor-pointer select-none transition-colors shadow-sm"
          >
            <span>Open Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* Roomy Full-Width Monthly Objective Banner */}
        <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-850/80 space-y-1 my-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            <span>Current Monthly Target</span>
            <span className="text-indigo-400 font-bold">Active Sprint</span>
          </div>
          <h4 className="text-sm font-display font-bold text-white tracking-tight leading-snug">
            {activeFocus}
          </h4>
        </div>

        {/* 2 Telemetry Columns (Readiness & Daily Budget) */}
        <div className="grid grid-cols-2 gap-3 pt-0.5">
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-850/80 flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Target Readiness</span>
              <span className="text-sm font-bold font-mono text-sky-400">{projectedReadiness}% Projected</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-sky-400" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-850/80 flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Daily Study Budget</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{dailyHours} hrs / day</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tri-Subject Velocity Balance Card */}
      <div className="glass-card rounded-2xl p-5 border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-mono text-emerald-400 font-bold tracking-widest uppercase">
              TRI-SUBJECT VELOCITY BALANCE
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full font-bold">
            Optimal Distribution
          </span>
        </div>

        {/* Multi-Segmented Progress Bar */}
        <div className="space-y-1.5 my-1">
          <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden flex border border-zinc-800 p-0.5">
            <div 
              style={{ width: `${subjectDistribution.physics.pct}%` }} 
              className="bg-cyan-500 h-full rounded-l-full shadow-[0_0_8px_rgba(6,182,212,0.4)] transition-all duration-500" 
              title={`Physics: ${subjectDistribution.physics.pct}%`}
            />
            <div 
              style={{ width: `${subjectDistribution.chemistry.pct}%` }} 
              className="bg-emerald-500 h-full shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-500" 
              title={`Chemistry: ${subjectDistribution.chemistry.pct}%`}
            />
            <div 
              style={{ width: `${subjectDistribution.maths.pct}%` }} 
              className="bg-purple-500 h-full rounded-r-full shadow-[0_0_8px_rgba(168,85,247,0.4)] transition-all duration-500" 
              title={`Mathematics: ${subjectDistribution.maths.pct}%`}
            />
          </div>
        </div>

        {/* Roomy 3 Subject Mastery Breakdown Tiles */}
        <div className="grid grid-cols-3 gap-3 font-mono">
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/30 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">Physics</span>
              <span className="text-[10px] text-cyan-300/80 font-bold">{subjectDistribution.physics.masteryPct}%</span>
            </div>
            <div>
              <div className="w-full bg-cyan-950/60 rounded-full h-1.5 overflow-hidden border border-cyan-900/50 mb-1">
                <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${subjectDistribution.physics.masteryPct}%` }} />
              </div>
              <span className="text-[10px] text-zinc-400 block">{subjectDistribution.physics.mastered} of {subjectDistribution.physics.total} Mastered</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">Chemistry</span>
              <span className="text-[10px] text-emerald-300/80 font-bold">{subjectDistribution.chemistry.masteryPct}%</span>
            </div>
            <div>
              <div className="w-full bg-emerald-950/60 rounded-full h-1.5 overflow-hidden border border-emerald-900/50 mb-1">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${subjectDistribution.chemistry.masteryPct}%` }} />
              </div>
              <span className="text-[10px] text-zinc-400 block">{subjectDistribution.chemistry.mastered} of {subjectDistribution.chemistry.total} Mastered</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/30 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400">Mathematics</span>
              <span className="text-[10px] text-purple-300/80 font-bold">{subjectDistribution.maths.masteryPct}%</span>
            </div>
            <div>
              <div className="w-full bg-purple-950/60 rounded-full h-1.5 overflow-hidden border border-purple-900/50 mb-1">
                <div className="bg-purple-400 h-full rounded-full" style={{ width: `${subjectDistribution.maths.masteryPct}%` }} />
              </div>
              <span className="text-[10px] text-zinc-400 block">{subjectDistribution.maths.mastered} of {subjectDistribution.maths.total} Mastered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
