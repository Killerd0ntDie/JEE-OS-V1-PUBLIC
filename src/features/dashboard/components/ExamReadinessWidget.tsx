import React, { useState } from 'react';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { motion } from 'motion/react';
import { StudyBrainService } from '@/services/studyBrainService';
import { calculateRealisticDailyChapterVelocity } from '@/utils/chapterVelocity';
import { springs } from '@/constants/motion';
import { AlertTriangle, Clock, Zap, Target, Compass, ShieldCheck } from 'lucide-react';
import { audioEngine } from '@/utils/audioEngine';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

interface ExamReadinessWidgetProps {
  targetYear: string;
  syllabusProgress: any;
  studySessions?: { startTime: string; duration?: number; type?: string }[];
}

export function ExamReadinessWidget({ targetYear, syllabusProgress, studySessions = [] }: ExamReadinessWidgetProps) {
  const [selectedExamTab, setSelectedExamTab] = useState<'main' | 'adv'>('main');

  const revisionQueue = useStudyBrainStore(s => s.revisionQueue) || [];
  const chapters = useStudyBrainStore(s => s.chapters) || [];
  const revisionDueCount = revisionQueue.length;
  const vaultChaptersCount = React.useMemo(() => {
    return chapters.filter(c => 
      !c.chapterOnHold &&
      (c.status === 'Mastered' || c.status === 'Revision Due' || c.status === 'Theory Complete' || c.syllabusStage === 'Revision' || c.theoryComplete || c.dppComplete || (c.completion && c.completion >= 50))
    ).length;
  }, [chapters]);

  // Exam Countdown calculation
  const daysMainJan = StudyBrainService.getDaysUntilExam(targetYear, 'JEE Main');
  const daysAdvMay = StudyBrainService.getDaysUntilExam(targetYear, 'JEE Advanced');
  const daysRemaining = selectedExamTab === 'main' ? daysMainJan : daysAdvMay;

  // Velocity Calculations (Memoized for performance)
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
        if (!Number.isNaN(t)) {
          if (earliest === null || t < earliest) earliest = t;
          if (duration > 0) hasRealHistory = true;
        }
      }
    }
    return { earliestSessionMs: earliest, actualStudyMinutes: totalMins, hasRealStudyHistory: hasRealHistory };
  }, [studySessions]);

  const totalChapters = (syllabusProgress?.physics?.totalCount || 0) + (syllabusProgress?.chemistry?.totalCount || 0) + (syllabusProgress?.maths?.totalCount || 0);
  const masteredChapters = (syllabusProgress?.physics?.masteredCount || 0) + (syllabusProgress?.chemistry?.masteredCount || 0) + (syllabusProgress?.maths?.masteredCount || 0);
  const remainingChapters = Math.max(0, totalChapters - masteredChapters);
  
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
  const _missedChapters = Math.max(0, remainingChapters - projectedFinishedChapters);

  return (
    <div 
      className="rounded-2xl p-5 md:p-6 relative overflow-hidden transition-all duration-300 shadow-xl h-full flex flex-col justify-between bg-surface-1 border border-border-subtle hover:border-border-muted"
    >
      {/* Header with Glowing Icon & Target Switcher */}
      <div className="flex items-center justify-between relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border bg-indigo-500/15 border-indigo-500/30 text-indigo-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-white tracking-tight flex items-center gap-1.5 uppercase">
              <span className="eva-japanese-badge">到達弾道 // </span>
              <span>EXAM TRAJECTORY</span>
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              {isCalibrating ? 'Calibrating Study Pace' : 'Target Velocity Engine'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 css-glass-subtle rounded-xl p-1 relative select-none">
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
                onClick={() => {
                  audioEngine.playRadioRelayClick().catch(() => {});
                  setSelectedExamTab(tab.id as any);
                }}
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

      {/* Big Countdown Number with Static Progress Ring & Velocity Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4 relative z-10 mt-4">
        <div className="flex items-center gap-4">
          {/* Static Circular Progress Meter */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0 rounded-2xl bg-surface-2 border border-border-subtle shadow-sm">
            <svg viewBox="0 0 60 60" className="w-14 h-14 absolute inset-1">
              <circle cx="30" cy="30" r="24" className="stroke-zinc-800 fill-none" strokeWidth="2.5" />
              <circle 
                cx="30" 
                cy="30" 
                r="24" 
                className="stroke-indigo-400 fill-none transition-all duration-500"
                strokeWidth="2.5" 
                strokeDasharray="150.8"
                strokeDashoffset={Math.max(0, 150.8 - (masteredChapters / Math.max(1, totalChapters)) * 150.8)}
                strokeLinecap="round"
                transform="rotate(-90 30 30)"
              />
            </svg>
            <Clock className="w-5 h-5 text-indigo-400 relative z-10" />
          </div>

          <div className="space-y-0.5">
            <span className="text-5xl md:text-6xl font-black font-tactical tracking-wider leading-none block text-white">
              <AnimatedCounter value={daysRemaining} />
            </span>
            <span className="text-xs font-mono font-bold text-zinc-400 block pt-1 uppercase tracking-wider">
              Days remaining until exam
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end font-mono">
          {/* Velocity Stats */}
          <div className="flex items-center gap-2.5">
            <div className="px-3 py-2 rounded-xl border border-border-subtle bg-surface-2 flex flex-col items-start md:items-end shadow-sm">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">Your Speed</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono font-bold text-xs text-white">{currentVelocity.toFixed(2)} ch/day</span>
              </div>
            </div>
            
            <div className="px-3 py-2 rounded-xl border border-border-subtle bg-surface-2 flex flex-col items-start md:items-end shadow-sm">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">Required Speed</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-mono font-bold text-xs text-indigo-300">{requiredVelocity.toFixed(2)} ch/day</span>
              </div>
            </div>
          </div>

          {/* Retention Guard Telemetry Pill */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 bg-surface-2 border border-border-subtle rounded-full px-2.5 py-1">
            <ShieldCheck className={`w-3 h-3 ${revisionDueCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span>Vault Shield: <strong className="text-zinc-200">{vaultChaptersCount} Safe</strong></span>
            {revisionDueCount > 0 ? (
              <span className="text-amber-400 font-bold">({revisionDueCount} decay risk)</span>
            ) : (
              <span className="text-emerald-400 font-bold">(0 decay)</span>
            )}
          </div>
        </div>
      </div>

      {isDoomsday && (
        <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-3.5 relative z-10 mt-3 text-left">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Velocity Delta: +{(requiredVelocity - currentVelocity).toFixed(2)} ch/day Needed</span>
          </div>
          <p className="text-zinc-300 text-xs font-mono leading-relaxed">
            Target pace is <strong className="text-white font-bold">{requiredVelocity.toFixed(2)} ch/day</strong>. Focus on high-yield chapters and daily DPP practice in the Cockpit to bridge the gap.
          </p>
          {revisionDueCount > 0 && (
            <div className="text-[11px] text-amber-300/90 font-mono mt-2 pt-2 border-t border-amber-500/20 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{revisionDueCount} chapter{revisionDueCount > 1 ? 's' : ''} due for review in the Vault. Prioritize flashcards to lock retention.</span>
            </div>
          )}
        </div>
      )}

      {isCalibrating && (
        <div 
          className="rounded-xl p-3.5 relative z-10 mt-3 text-left bg-surface-2 border border-border-subtle shadow-sm"
        >
          <p className="text-zinc-300 text-xs font-mono leading-relaxed">
            <strong className="text-amber-300 font-bold block mb-0.5 uppercase tracking-wider">VELOCITY ENGINE CALIBRATING</strong>
            Log study sessions in the Cockpit to lock in your true chapter velocity. Target pace: <strong className="text-white font-bold">{requiredVelocity.toFixed(2)} ch/day</strong>.
          </p>
        </div>
      )}

      {/* Syllabus Coverage Bars with Glowing Tips */}
      <div className="space-y-3 pt-3 relative z-10 font-mono">
        {/* Physics */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-xs font-medium">
            <span className="text-zinc-200 font-tactical font-bold uppercase tracking-wider">Physics <span className="text-zinc-400 font-normal font-mono ml-1">({syllabusProgress?.physics?.masteredCount || 0}/{syllabusProgress?.physics?.totalCount || 0} Mastered)</span></span>
            <span className="font-hud text-sky-400 font-bold">{Number.isFinite(syllabusProgress?.physics?.percentage) ? syllabusProgress.physics.percentage : 0}%</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Number.isFinite(syllabusProgress?.physics?.percentage) ? syllabusProgress.physics.percentage : 0}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-sky-400 h-full rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" 
            />
          </div>
        </div>

        {/* Chemistry */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-xs font-medium">
            <span className="text-zinc-200 font-tactical font-bold uppercase tracking-wider">Chemistry <span className="text-zinc-400 font-normal font-mono ml-1">({syllabusProgress?.chemistry?.masteredCount || 0}/{syllabusProgress?.chemistry?.totalCount || 0} Mastered)</span></span>
            <span className="font-hud text-emerald-400 font-bold">{Number.isFinite(syllabusProgress?.chemistry?.percentage) ? syllabusProgress.chemistry.percentage : 0}%</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Number.isFinite(syllabusProgress?.chemistry?.percentage) ? syllabusProgress.chemistry.percentage : 0}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-emerald-400 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
            />
          </div>
        </div>

        {/* Maths */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline text-xs font-medium">
            <span className="text-zinc-200 font-tactical font-bold uppercase tracking-wider">Mathematics <span className="text-zinc-400 font-normal font-mono ml-1">({syllabusProgress?.maths?.masteredCount || 0}/{syllabusProgress?.maths?.totalCount || 0} Mastered)</span></span>
            <span className="font-hud text-purple-400 font-bold">{Number.isFinite(syllabusProgress?.maths?.percentage) ? syllabusProgress.maths.percentage : 0}%</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Number.isFinite(syllabusProgress?.maths?.percentage) ? syllabusProgress.maths.percentage : 0}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-purple-400 h-full rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
