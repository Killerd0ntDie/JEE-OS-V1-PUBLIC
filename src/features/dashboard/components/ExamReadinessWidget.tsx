import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { motion } from 'motion/react';
import { StudyBrainService } from '@/services/studyBrainService';

import { AlertTriangle, Clock, Skull, Zap } from 'lucide-react';

interface ExamReadinessWidgetProps {
  targetYear: string;
  syllabusProgress: any; // We can use proper type if available, but for now matching the existing usage
}

export function ExamReadinessWidget({ targetYear, syllabusProgress }: ExamReadinessWidgetProps) {
  const [selectedExamTab, setSelectedExamTab] = useState<'main' | 'adv'>('main');

  // Exam Countdown calculation
  const daysMainJan = StudyBrainService.getDaysUntilExam(targetYear, 'JEE Main');
  const daysAdvMay = StudyBrainService.getDaysUntilExam(targetYear, 'JEE Advanced');
  const daysRemaining = selectedExamTab === 'main' ? daysMainJan : daysAdvMay;

  // Doomsday Engine Calculations
  const totalChapters = syllabusProgress.physics.totalCount + syllabusProgress.chemistry.totalCount + syllabusProgress.maths.totalCount;
  const masteredChapters = syllabusProgress.physics.masteredCount + syllabusProgress.chemistry.masteredCount + syllabusProgress.maths.masteredCount;
  const remainingChapters = totalChapters - masteredChapters;
  
  // For V1 Prototype, we assume a baseline of 30 days of study time elapsed to calculate historical velocity.
  const studyDaysElapsed = 30; 
  const currentVelocity = masteredChapters / studyDaysElapsed; // Chapters per day
  const requiredVelocity = daysRemaining > 0 ? remainingChapters / daysRemaining : 0;
  
  const isDoomsday = currentVelocity < requiredVelocity && daysRemaining > 0;
  
  const projectedFinishedChapters = currentVelocity * daysRemaining;
  const missedChapters = Math.max(0, remainingChapters - projectedFinishedChapters);
  const maxPossiblePercent = totalChapters > 0 ? Math.min(100, Math.round(((masteredChapters + projectedFinishedChapters) / totalChapters) * 100)) : 0;

  return (
    <div className={`rounded-2xl p-6 relative overflow-hidden border transition-all duration-500 shadow-2xl ${
      isDoomsday 
        ? 'bg-red-950/40 border-red-900/80 shadow-[0_0_50px_rgba(220,38,38,0.1)]' 
        : 'bg-zinc-950/40 border-zinc-800/80 glass-card backdrop-blur-xl'
    }`}>
      {/* Doomsday Background FX */}
      {isDoomsday && (
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none mix-blend-screen">
          <Skull className="w-64 h-64 text-red-500 animate-pulse" />
        </div>
      )}

      <div className="flex items-center justify-between relative z-10">
        <span className={`text-[11px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 ${isDoomsday ? 'text-red-500' : 'text-indigo-400'}`}>
          {isDoomsday ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          {isDoomsday ? 'DOOMSDAY VELOCITY WARNING' : 'EXAM READINESS & TRAJECTORY'}
        </span>
        <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setSelectedExamTab('main')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
              selectedExamTab === 'main' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            JEE Main (Jan)
          </button>
          <button
            type="button"
            onClick={() => setSelectedExamTab('adv')}
            className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
              selectedExamTab === 'adv' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            JEE Advanced (May)
          </button>
        </div>
      </div>

      {/* Big Countdown Number & Syllabus Stats */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 relative z-10 mt-4 ${isDoomsday ? 'border-red-900/30' : 'border-zinc-900/60'}`}>
        <div className="space-y-0.5">
          <span className={`text-5xl md:text-6xl font-black tracking-tighter font-display leading-none block ${isDoomsday ? 'text-red-500' : 'text-gradient-indigo'}`}>
            <AnimatedCounter value={daysRemaining} />
          </span>
          <span className={`text-[10px] font-mono font-bold tracking-wider uppercase block ${isDoomsday ? 'text-red-400' : 'text-indigo-400'}`}>
            DAYS REMAINING
          </span>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          {/* Velocity Stats */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-lg border flex flex-col items-end ${isDoomsday ? 'bg-red-950/50 border-red-900/50' : 'bg-zinc-900/80 border-zinc-800'}`}>
              <span className={`text-[11px] font-mono uppercase ${isDoomsday ? 'text-red-400/70' : 'text-zinc-400'}`}>Your Speed</span>
              <div className="flex items-center gap-1">
                <Zap className={`w-3 h-3 ${isDoomsday ? 'text-red-400' : 'text-amber-400'}`} />
                <span className={`font-mono font-bold text-xs ${isDoomsday ? 'text-red-300' : 'text-white'}`}>{currentVelocity.toFixed(2)} ch/day</span>
              </div>
            </div>
            
            <div className={`px-3 py-1.5 rounded-lg border flex flex-col items-end ${isDoomsday ? 'bg-red-950/80 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-indigo-950/30 border-indigo-900/50'}`}>
              <span className={`text-[11px] font-mono uppercase ${isDoomsday ? 'text-red-400' : 'text-indigo-400/70'}`}>Required Speed</span>
              <span className={`font-mono font-bold text-xs ${isDoomsday ? 'text-white animate-pulse' : 'text-indigo-300'}`}>{requiredVelocity.toFixed(2)} ch/day</span>
            </div>
          </div>
        </div>
      </div>

      {isDoomsday && (
        <div className="bg-red-950/80 border border-red-500/30 rounded-xl p-4 relative z-10 mt-4 shadow-inner">
          <p className="text-red-200 text-xs font-mono leading-relaxed">
            <strong className="text-white font-sans text-sm block mb-1">CRITICAL ALERT: Target Unreachable</strong>
            At your current velocity, you will miss <strong className="text-red-400 font-bold">{Math.ceil(missedChapters)} chapters</strong>. 
            You must increase your speed by <strong className="text-white">{(requiredVelocity / (currentVelocity || 1)).toFixed(1)}x</strong> immediately.
            If you do not change your trajectory, your maximum syllabus coverage will be capped at <strong className="text-white">{maxPossiblePercent}%</strong>.
          </p>
        </div>
      )}

      {/* Syllabus Coverage Bars */}
      <div className="space-y-3 pt-4 relative z-10">
        {/* Physics */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-[11px] font-semibold">
            <span className="text-zinc-300">Physics <span className="text-[11px] text-zinc-400 font-normal ml-1.5">{syllabusProgress.physics.masteredCount}/{syllabusProgress.physics.totalCount} Mastered</span></span>
            <span className="font-mono text-sky-400 font-bold">{syllabusProgress.physics.percentage}%</span>
          </div>
          <div className="w-full bg-zinc-900/80 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${syllabusProgress.physics.percentage}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-gradient-to-r from-sky-500 to-sky-400 h-full rounded-full shadow-[0_0_12px_rgba(56,189,248,0.5)]" 
            />
          </div>
        </div>

        {/* Chemistry */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-[11px] font-semibold">
            <span className="text-zinc-300">Chemistry <span className="text-[11px] text-zinc-400 font-normal ml-1.5">{syllabusProgress.chemistry.masteredCount}/{syllabusProgress.chemistry.totalCount} Mastered</span></span>
            <span className="font-mono text-emerald-400 font-bold">{syllabusProgress.chemistry.percentage}%</span>
          </div>
          <div className="w-full bg-zinc-900/80 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${syllabusProgress.chemistry.percentage}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full shadow-[0_0_12px_rgba(52,211,153,0.5)]" 
            />
          </div>
        </div>

        {/* Mathematics */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-[11px] font-semibold">
            <span className="text-zinc-300">Mathematics <span className="text-[11px] text-zinc-400 font-normal ml-1.5">{syllabusProgress.maths.masteredCount}/{syllabusProgress.maths.totalCount} Mastered</span></span>
            <span className="font-mono text-indigo-400 font-bold">{syllabusProgress.maths.percentage}%</span>
          </div>
          <div className="w-full bg-zinc-900/80 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${syllabusProgress.maths.percentage}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
