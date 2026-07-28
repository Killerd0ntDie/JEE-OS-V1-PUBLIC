import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { AnimatedCounter } from '../../../components/ui/AnimatedCounter';
import { motion } from 'motion/react';
import { StudyBrainService } from '../../../services/studyBrainService';

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

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl space-y-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-indigo-400 font-bold tracking-widest uppercase block">
          EXAM READINESS & TRAJECTORY
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
      <div className="flex items-center justify-between gap-4 border-b border-zinc-900/60 pb-4">
        <div className="space-y-0.5">
          <span className="text-5xl md:text-6xl font-black tracking-tighter text-gradient-indigo font-display leading-none block">
            <AnimatedCounter value={daysRemaining} />
          </span>
          <span className="text-[10px] font-mono text-indigo-400 font-bold tracking-wider uppercase block">
            DAYS REMAINING
          </span>
        </div>

        <div className="text-right space-y-1 font-mono text-xs">
          <p className="text-zinc-300">
            Target Year: <strong className="text-indigo-400">{targetYear}</strong>
          </p>
          <p className="text-[11px] text-zinc-500">
            {selectedExamTab === 'main' ? 'Jan 24 Session 1 Benchmark' : 'May 30 Advanced Target'}
          </p>
        </div>
      </div>

      {/* Syllabus Coverage Bars */}
      <div className="space-y-3 pt-1">
        {/* Physics */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-[11px] font-semibold">
            <span className="text-zinc-300">Physics <span className="text-[9px] text-zinc-500 font-normal ml-1.5">{syllabusProgress.physics.masteredCount}/{syllabusProgress.physics.totalCount} Mastered</span></span>
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
            <span className="text-zinc-300">Chemistry <span className="text-[9px] text-zinc-500 font-normal ml-1.5">{syllabusProgress.chemistry.masteredCount}/{syllabusProgress.chemistry.totalCount} Mastered</span></span>
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
            <span className="text-zinc-300">Mathematics <span className="text-[9px] text-zinc-500 font-normal ml-1.5">{syllabusProgress.maths.masteredCount}/{syllabusProgress.maths.totalCount} Mastered</span></span>
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
