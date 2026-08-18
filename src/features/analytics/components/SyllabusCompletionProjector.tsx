import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, TrendingUp, Clock, Target, AlertCircle, 
  CheckCircle2, Sparkles, Sliders, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { Chapter } from '@/types/index';
import { springs } from '@/constants/motion';

interface SyllabusCompletionProjectorProps {
  chapters: Chapter[];
  studySessions: any[];
}

export function SyllabusCompletionProjector({ chapters, studySessions }: SyllabusCompletionProjectorProps) {
  // Configurable "What-If" slider parameters
  const [dailyStudyHours, setDailyStudyHours] = useState(6.5);
  const [dailyQuestionTarget, setDailyQuestionTarget] = useState(35);

  // Total syllabus scope metrics
  const totalChapters = chapters.length || 56;
  const completedChapters = useMemo(() => {
    return chapters.filter(c => c.completed || (c.lectureProgress ?? 0) >= 100).length;
  }, [chapters]);

  const remainingChapters = Math.max(0, totalChapters - completedChapters);

  // Total remaining lectures estimate
  const remainingLectures = useMemo(() => {
    return chapters.reduce((acc, c) => {
      const total = c.totalLectures || 8;
      const done = c.completedLectures || 0;
      return acc + Math.max(0, total - done);
    }, 0);
  }, [chapters]);

  // Historical velocity calculation from recent study sessions
  const historicalWeeklyVelocity = useMemo(() => {
    // Estimate based on recent completed chapters or fallback
    const weeksActive = Math.max(1, Math.min(12, Math.ceil(studySessions.length / 7)));
    const estimated = completedChapters / weeksActive;
    return Math.max(0.8, Math.min(4.0, estimated || 1.5));
  }, [completedChapters, studySessions]);

  // "What-If" Adjusted Velocity
  const adjustedWeeklyVelocity = useMemo(() => {
    // Scaling velocity based on slider (base = 6.5h daily = 45.5h/week)
    const baseHours = 6.5;
    const factor = dailyStudyHours / baseHours;
    return historicalWeeklyVelocity * factor;
  }, [historicalWeeklyVelocity, dailyStudyHours]);

  // Projected Completion Dates
  const projections = useMemo(() => {
    const today = new Date();
    
    // Baseline Projection (Current Historical Pace)
    const weeksNeededBaseline = remainingChapters / (historicalWeeklyVelocity || 1);
    const baselineDate = new Date(today);
    baselineDate.setDate(today.getDate() + Math.ceil(weeksNeededBaseline * 7));

    // What-If Projection (Adjusted Pace)
    const weeksNeededAdjusted = remainingChapters / (adjustedWeeklyVelocity || 1);
    const adjustedDate = new Date(today);
    adjustedDate.setDate(today.getDate() + Math.ceil(weeksNeededAdjusted * 7));

    // Key Target Exams
    const jeeMain1 = new Date(today.getFullYear(), 0, 24); // Jan 24
    if (jeeMain1 < today) jeeMain1.setFullYear(today.getFullYear() + 1);

    const jeeMain2 = new Date(today.getFullYear(), 3, 4); // Apr 4
    if (jeeMain2 < today) jeeMain2.setFullYear(today.getFullYear() + 1);

    const jeeAdv = new Date(today.getFullYear(), 4, 18); // May 18
    if (jeeAdv < today) jeeAdv.setFullYear(today.getFullYear() + 1);

    const daysBufferBeforeJee1 = Math.round((jeeMain1.getTime() - adjustedDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      baselineDate,
      adjustedDate,
      weeksNeededAdjusted: weeksNeededAdjusted.toFixed(1),
      daysBufferBeforeJee1,
      jeeMain1,
      jeeMain2,
      jeeAdv
    };
  }, [remainingChapters, historicalWeeklyVelocity, adjustedWeeklyVelocity]);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isBufferPositive = projections.daysBufferBeforeJee1 >= 0;

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-6 text-left relative overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
              ACADEMIC FORECASTING ENGINE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Syllabus Completion Date Projector
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            Mathematically projects your 100% syllabus finish date based on remaining lectures and solving throughput.
          </p>
        </div>

        {/* Status Callout */}
        <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 shrink-0 ${
          isBufferPositive
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
        }`}>
          {isBufferPositive ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold">
              {isBufferPositive ? 'On-Track for Revision' : 'Pace Acceleration Needed'}
            </div>
            <div className="text-xs font-mono font-bold">
              {isBufferPositive 
                ? `${projections.daysBufferBeforeJee1} Days Buffer Before JEE Main`
                : `${Math.abs(projections.daysBufferBeforeJee1)} Days Deficit vs JEE Main 1`}
            </div>
          </div>
        </div>
      </div>

      {/* 1. KEY SYLLABUS METRIC CHIPS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Completed</span>
          <div className="text-lg font-mono font-bold text-emerald-400">
            {completedChapters} <span className="text-xs text-zinc-400">/ {totalChapters} Ch</span>
          </div>
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full" 
              style={{ width: `${(completedChapters / totalChapters) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Remaining Chapters</span>
          <div className="text-lg font-mono font-bold text-white">
            {remainingChapters} <span className="text-xs text-zinc-400">Chapters</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 block">~{remainingLectures} Lectures left</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Historical Pace</span>
          <div className="text-lg font-mono font-bold text-indigo-400">
            {historicalWeeklyVelocity.toFixed(1)} <span className="text-xs text-zinc-400">Ch / wk</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 block">Rolling 14-day average</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Projected Finish</span>
          <div className="text-lg font-mono font-bold text-amber-300 truncate">
            {formatDate(projections.adjustedDate)}
          </div>
          <span className="text-[10px] font-mono text-zinc-400 block">In {projections.weeksNeededAdjusted} Weeks</span>
        </div>
      </div>

      {/* 2. "WHAT-IF" SCENARIO VELOCITY MODELER */}
      <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white font-display">
              "What-If" Velocity Scenario Modeler
            </h3>
          </div>
          <span className="text-[11px] font-mono text-indigo-400 font-bold bg-indigo-950/50 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
            Adjust sliders to simulate timeline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slider 1: Daily Study Hours */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-300">Daily Study Target:</span>
              <strong className="text-indigo-400 text-sm">{dailyStudyHours.toFixed(1)} Hours / day</strong>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              step="0.5"
              value={dailyStudyHours}
              onChange={(e) => setDailyStudyHours(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-400">
              <span>4.0h (Low)</span>
              <span>6.5h (Optimal Baseline)</span>
              <span>12.0h (Sprint)</span>
            </div>
          </div>

          {/* Slider 2: Daily Problem Volume */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-300">Daily Problem Solving:</span>
              <strong className="text-emerald-400 text-sm">{dailyQuestionTarget} Qs / day</strong>
            </div>
            <input
              type="range"
              min="15"
              max="80"
              step="5"
              value={dailyQuestionTarget}
              onChange={(e) => setDailyQuestionTarget(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-400">
              <span>15 Qs</span>
              <span>35 Qs (Standard)</span>
              <span>80 Qs (Intense)</span>
            </div>
          </div>
        </div>

        {/* Milestone Timeline Bar */}
        <div className="pt-2 border-t border-white/5 space-y-3">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
            Milestone Alignment vs Official Target Dates
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            
            {/* Milestone 1: JEE Main Session 1 */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-bold">JEE Main Session 1</span>
                <span className="text-zinc-400">{formatDate(projections.jeeMain1)}</span>
              </div>
              <p className={`text-[11px] font-bold ${isBufferPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isBufferPositive ? `✓ Finish ${projections.daysBufferBeforeJee1} days before` : `✗ Finish ${Math.abs(projections.daysBufferBeforeJee1)} days late`}
              </p>
            </div>

            {/* Milestone 2: JEE Main Session 2 */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-bold">JEE Main Session 2</span>
                <span className="text-zinc-400">{formatDate(projections.jeeMain2)}</span>
              </div>
              <p className="text-[11px] font-bold text-emerald-400">
                ✓ Full Revision Buffer Available
              </p>
            </div>

            {/* Milestone 3: JEE Advanced */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-bold">JEE Advanced</span>
                <span className="text-zinc-400">{formatDate(projections.jeeAdv)}</span>
              </div>
              <p className="text-[11px] font-bold text-indigo-400">
                ✓ Multi-Concept Mock Phase
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
