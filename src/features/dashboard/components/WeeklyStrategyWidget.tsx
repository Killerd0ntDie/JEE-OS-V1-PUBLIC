import { useMemo } from 'react';
import { Chapter, MentorProfile } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowRight, Activity, Target, Clock, } from 'lucide-react';
import { motion } from 'motion/react';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { calculateWeeklyStrategyDistribution } from '@jee-os/engines';

interface WeeklyStrategyWidgetProps {
  chapters: Chapter[];
  mentorProfile?: MentorProfile;
  projectedReadiness: number;
}

export function WeeklyStrategyWidget({ chapters, mentorProfile, projectedReadiness }: WeeklyStrategyWidgetProps) {
  const navigate = useNavigate();
  const settings = useStudyBrainStore(s => s.settings);

  // Authoritative subject distribution calculated via engines
  const subjectDistribution = useMemo(() => {
    return calculateWeeklyStrategyDistribution(chapters || []);
  }, [chapters]);

  // Derived milestones for the sprint
  const activeFocus = mentorProfile?.monthlyObjective?.category || 'Finish Mechanics & GOC';
  // Canonical Authority (Guardrail Rule 5): strictly settings.dailyQuota
  const dailyHours = (settings?.dailyQuota && settings.dailyQuota <= 14 ? settings.dailyQuota : 6) || 6.5;

  return (
    <div className="flex flex-col gap-4 h-full justify-between text-left">
      
      {/* 1. Core Weekly Strategy Focus Card */}
      <div className="rounded-2xl p-5 shadow-xl relative overflow-hidden flex-1 flex flex-col justify-between bg-surface-1 border border-border-subtle hover:border-border-muted">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white tracking-tight uppercase">
                WEEKLY STRATEGY
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono">
                Active Tactical Roadmap
              </p>
            </div>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={springs.snappy}
            onClick={() => {
              audioEngine.playRadioRelayClick().catch(() => {});
              navigate('/planner');
            }}
            className="px-2.5 py-1 text-xs font-mono font-bold text-indigo-300 bg-indigo-950/50 hover:bg-indigo-600/40 hover:text-white border border-indigo-500/40 rounded-xl flex items-center gap-1.5 cursor-pointer select-none transition-colors shadow-sm uppercase tracking-wider"
          >
            <span>Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* Roomy Full-Width Monthly Objective Banner */}
        <div className="p-3.5 rounded-xl css-glass-subtle space-y-1 my-1 relative z-10">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
            <span>Monthly Target</span>
            <span className="text-indigo-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              Active Sprint
            </span>
          </div>
          <h4 className="text-sm font-bold text-white tracking-tight leading-snug font-mono">
            {activeFocus}
          </h4>
        </div>

        {/* 2 Telemetry Columns (Readiness & Daily Budget) */}
        <div className="grid grid-cols-2 gap-3 pt-0.5 relative z-10 font-mono">
          <div className="p-3 rounded-xl css-glass-subtle flex items-center justify-between gap-2 shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase block">Target Readiness</span>
              <span className="text-sm font-bold font-mono text-sky-400">{typeof projectedReadiness === 'number' && !Number.isNaN(projectedReadiness) ? projectedReadiness : 0}% Projected</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-sky-400" />
            </div>
          </div>

          <div className="p-3 rounded-xl css-glass-subtle flex items-center justify-between gap-2 shadow-sm">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase block">Study Budget</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{dailyHours} hrs / day</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tri-Subject Velocity Balance Card */}
      <div className="rounded-2xl p-5 shadow-xl relative overflow-hidden flex-1 flex flex-col justify-between bg-surface-1 border border-border-subtle hover:border-border-muted">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-sm shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white tracking-tight uppercase">
                MASTERY BALANCE
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono">
                Syllabus Proportions & Momentum
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl shadow-sm uppercase">
            OPTIMAL SYNC
          </span>
        </div>

        {/* Multi-Segmented Progress Bar */}
        <div className="space-y-1.5 my-1 relative z-10">
          <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden flex border border-white/10 p-0.5">
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
        <div className="grid grid-cols-3 gap-3 font-mono relative z-10">
          <div className="p-3 rounded-xl css-glass-subtle border-cyan-400/30 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">Physics</span>
              <span className="text-[10px] text-cyan-300 font-bold">{subjectDistribution.physics.masteryPct}%</span>
            </div>
            <div>
              <div className="w-full bg-cyan-950/60 rounded-full h-1.5 overflow-hidden border border-cyan-900/50 mb-1">
                <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${subjectDistribution.physics.masteryPct}%` }} />
              </div>
              <span className="text-[10px] text-zinc-400 block">{subjectDistribution.physics.mastered} of {subjectDistribution.physics.total} Mastered</span>
            </div>
          </div>

          <div className="p-3 rounded-xl css-glass-subtle border-emerald-400/30 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">Chemistry</span>
              <span className="text-[10px] text-emerald-300 font-bold">{subjectDistribution.chemistry.masteryPct}%</span>
            </div>
            <div>
              <div className="w-full bg-emerald-950/60 rounded-full h-1.5 overflow-hidden border border-emerald-900/50 mb-1">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${subjectDistribution.chemistry.masteryPct}%` }} />
              </div>
              <span className="text-[10px] text-zinc-400 block">{subjectDistribution.chemistry.mastered} of {subjectDistribution.chemistry.total} Mastered</span>
            </div>
          </div>

          <div className="p-3 rounded-xl css-glass-subtle border-purple-400/30 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400">Mathematics</span>
              <span className="text-[10px] text-purple-300 font-bold">{subjectDistribution.maths.masteryPct}%</span>
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
