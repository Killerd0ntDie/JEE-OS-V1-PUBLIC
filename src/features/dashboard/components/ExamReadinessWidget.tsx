import React, { useState } from 'react';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { motion } from 'motion/react';
import { StudyBrainService } from '@/services/studyBrainService';
import { calculateRealisticDailyChapterVelocity } from '@/utils/chapterVelocity';
import { springs } from '@/constants/motion';
import { AlertTriangle, Clock, Skull, Zap, Target, Compass, Sparkles } from 'lucide-react';

interface ExamReadinessWidgetProps {
  targetYear: string;
  syllabusProgress: any;
  studySessions?: { startTime: string; duration?: number; type?: string }[];
}

export function ExamReadinessWidget({ targetYear, syllabusProgress, studySessions = [] }: ExamReadinessWidgetProps) {
  const [selectedExamTab, setSelectedExamTab] = useState<'main' | 'adv'>('main');

  // Exam Countdown calculation
  const daysMainJan = StudyBrainService.getDaysUntilExam(targetYear, 'JEE Main');
  const daysAdvMay = StudyBrainService.getDaysUntilExam(targetYear, 'JEE Advanced');
  const daysRemaining = selectedExamTab === 'main' ? daysMainJan : daysAdvMay;

  // Doomsday Engine Calculations (Memoized for performance)
  const { earliestSessionMs, actualStudyMinutes, hasRealStudyHistory } = React.useMemo(() => {
    if (!studySessions || studySessions.length === 0) {
      return { earliestSessionMs: null, actualStudyMinutes: 0, hasRealStudyHistory: false };
    }
    let earliest: number | null = null;
    let totalMins = 0;
    let hasRealHistory = false;

    for (let i = 0; i < studySessions.length; i++) {
      const s = studySessions[i];
      const duration = typeof s.duration === 'number' ? s.duration : 0;
      const isBreak = (s.type as any) === 'Break';
      
      if (!isBreak) totalMins += duration;
      
      if (s.startTime) {
        const t = new Date(s.startTime).getTime();
        if (!isNaN(t)) {
          if (earliest === null || t < earliest) earliest = t;
          if (duration > 0) hasRealHistory = true;
        }
      }
    }
    return { earliestSessionMs: earliest, actualStudyMinutes: totalMins, hasRealStudyHistory: hasRealHistory };
  }, [studySessions]);

  const totalChapters = syllabusProgress.physics.totalCount + syllabusProgress.chemistry.totalCount + syllabusProgress.maths.totalCount;
  const masteredChapters = syllabusProgress.physics.masteredCount + syllabusProgress.chemistry.masteredCount + syllabusProgress.maths.masteredCount;
  const remainingChapters = totalChapters - masteredChapters;
  
  const studyDaysElapsed = earliestSessionMs
    ? Math.max(1, Math.ceil((Date.now() - earliestSessionMs) / 86400000))
    : 1;

  const currentVelocity = calculateRealisticDailyChapterVelocity({
    masteredChapters,
    studyDaysElapsed,
    cap: 1.5,
    hasRealStudyHistory,
    actualStudyMinutes,
    minimumStudyMinutes: 30,
  });
  const requiredVelocity = daysRemaining > 0 ? remainingChapters / daysRemaining : 0;
  
  const isCalibrating = !hasRealStudyHistory || actualStudyMinutes < 60 || studyDaysElapsed < 3;
  const isDoomsday = !isCalibrating && currentVelocity < requiredVelocity && daysRemaining > 0;
  
  const projectedFinishedChapters = currentVelocity * daysRemaining;
  const missedChapters = Math.max(0, remainingChapters - projectedFinishedChapters);

  return (
    <div className={`premium-card rounded-2xl p-5 md:p-6 relative overflow-hidden border border-zinc-800 transition-all duration-300 shadow-sm h-full flex flex-col justify-between bg-gradient-to-br from-zinc-900/70 via-zinc-950/80 to-zinc-950 ${
      isDoomsday 
        ? 'bg-red-950/20 !border-rose-900/60' 
        : ''
    }`}>
      {/* Doomsday Background FX */}
      {isDoomsday && (
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none mix-blend-screen">
          <Skull className="w-64 h-64 text-red-500 animate-pulse" />
        </div>
      )}

      {/* Header with Glowing Icon & Target Switcher */}
      <div className="flex items-center justify-between relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border ${
            isDoomsday 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
              : isCalibrating 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
          }`}>
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>{isDoomsday ? 'Doomsday Pace Warning' : isCalibrating ? 'Exam Readiness' : 'Exam Readiness & Trajectory'}</span>
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono">
              {isCalibrating ? 'Calibrating Study Pace' : 'Target Velocity Engine'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-xl p-1 relative select-none shadow-inner">
          {[
            { id: 'main', label: 'JEE Main (Jan)' },
            { id: 'adv', label: 'JEE Advanced (May)' }
          ].map(tab => {
            const isActive = selectedExamTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedExamTab(tab.id as any)}
                className={`relative px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer select-none z-10 flex items-center justify-center text-center ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="examTargetPill"
                    className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                    transition={springs.snappy}
                  />
                )}
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Big Countdown Number & Velocity Stats */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 relative z-10 mt-4 ${isDoomsday ? 'border-red-900/30' : 'border-zinc-800/80'}`}>
        <div className="space-y-0.5">
          <span className={`text-5xl md:text-6xl font-black font-mono tracking-tight leading-none block ${isDoomsday ? 'text-rose-500' : 'text-white'}`}>
            <AnimatedCounter value={daysRemaining} />
          </span>
          <span className="text-xs font-mono font-semibold text-zinc-400 block pt-1">
            Days remaining until exam
          </span>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          {/* Velocity Stats */}
          <div className="flex items-center gap-2.5">
            <div className={`px-3 py-2 rounded-xl border flex flex-col items-start md:items-end shadow-sm ${isDoomsday ? 'bg-red-950/50 border-red-900/50' : 'bg-zinc-900/80 border-zinc-800'}`}>
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">Your Speed</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Zap className={`w-3.5 h-3.5 ${isDoomsday ? 'text-red-400' : 'text-amber-400'}`} />
                <span className={`font-mono font-bold text-xs ${isDoomsday ? 'text-red-300' : 'text-white'}`}>{currentVelocity.toFixed(2)} ch/day</span>
              </div>
            </div>
            
            <div className={`px-3 py-2 rounded-xl border flex flex-col items-start md:items-end shadow-sm ${isDoomsday ? 'bg-red-950/80 border-red-500/50' : 'bg-zinc-900/80 border-zinc-800'}`}>
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">Required Speed</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span className={`font-mono font-bold text-xs ${isDoomsday ? 'text-white animate-pulse' : 'text-indigo-300'}`}>{requiredVelocity.toFixed(2)} ch/day</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDoomsday && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3.5 relative z-10 mt-3 text-left">
          <p className="text-red-200 text-xs font-sans leading-relaxed">
            <strong className="text-white font-semibold block mb-0.5">Target Unreachable at Current Pace</strong>
            You will miss <strong className="text-red-300 font-bold">{Math.ceil(missedChapters)} chapters</strong>. 
            {currentVelocity > 0 ? (
              <> Increase pace by <strong className="text-white font-bold">{(requiredVelocity / currentVelocity).toFixed(1)}x</strong>.</>
            ) : (
              <> Target speed: <strong className="text-white font-bold">{requiredVelocity.toFixed(2)} ch/day</strong>.</>
            )}
          </p>
        </div>
      )}

      {isCalibrating && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 relative z-10 mt-3 text-left">
          <p className="text-amber-200 text-xs font-sans leading-relaxed">
            <strong className="text-amber-300 font-semibold block mb-0.5">Velocity Engine Calibrating</strong>
            Log study sessions in the Cockpit to lock in your true chapter velocity. Target pace: <strong className="text-white font-bold">{requiredVelocity.toFixed(2)} ch/day</strong>.
          </p>
        </div>
      )}

      {/* Syllabus Coverage Bars with Glowing Tips */}
      <div className="space-y-3 pt-3 relative z-10">
        {/* Physics */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-xs font-medium">
            <span className="text-zinc-200 font-bold">Physics <span className="text-zinc-500 font-normal font-mono ml-1">({syllabusProgress.physics.masteredCount}/{syllabusProgress.physics.totalCount} Mastered)</span></span>
            <span className="font-mono text-sky-400 font-bold">{syllabusProgress.physics.percentage}%</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${syllabusProgress.physics.percentage}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-sky-400 h-full rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" 
            />
          </div>
        </div>

        {/* Chemistry */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-xs font-medium">
            <span className="text-zinc-200 font-bold">Chemistry <span className="text-zinc-500 font-normal font-mono ml-1">({syllabusProgress.chemistry.masteredCount}/{syllabusProgress.chemistry.totalCount} Mastered)</span></span>
            <span className="font-mono text-emerald-400 font-bold">{syllabusProgress.chemistry.percentage}%</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${syllabusProgress.chemistry.percentage}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-emerald-400 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
            />
          </div>
        </div>

        {/* Mathematics */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-xs font-medium">
            <span className="text-zinc-200 font-bold">Mathematics <span className="text-zinc-500 font-normal font-mono ml-1">({syllabusProgress.maths.masteredCount}/{syllabusProgress.maths.totalCount} Mastered)</span></span>
            <span className="font-mono text-purple-400 font-bold">{syllabusProgress.maths.percentage}%</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${syllabusProgress.maths.percentage}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-purple-400 h-full rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
