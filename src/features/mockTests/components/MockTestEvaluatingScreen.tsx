import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Loader2, 
  Award, 
  Cpu, 
  ShieldCheck, 
  FileSpreadsheet, 
  Activity, 
  Check 
} from 'lucide-react';
import { MockTest } from '@/types/mockTest';
import { springs } from '@/constants/motion';

interface MockTestEvaluatingScreenProps {
  test: MockTest | null;
  statusMessage?: string;
  progressPercent?: number;
  isDone?: boolean;
}

interface EvaluationStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  threshold: number;
}

const EVALUATION_STEPS: EvaluationStep[] = [
  {
    id: 'seal',
    label: 'Saving candidate responses',
    icon: ShieldCheck,
    threshold: 20
  },
  {
    id: 'score',
    label: 'Evaluating answers & scoring sections',
    icon: Cpu,
    threshold: 50
  },
  {
    id: 'analytics',
    label: 'Recording mistakes and chapter progress',
    icon: FileSpreadsheet,
    threshold: 80
  },
  {
    id: 'finalize',
    label: 'Generating scorecard and solutions',
    icon: Award,
    threshold: 100
  }
];

export function MockTestEvaluatingScreen({
  test,
  statusMessage,
  progressPercent,
  isDone
}: MockTestEvaluatingScreenProps) {
  const [progress, setProgress] = useState(() => isDone ? 100 : (progressPercent ?? 20));

  useEffect(() => {
    if (isDone) {
      setProgress(100);
      return;
    }
    if (typeof progressPercent === 'number') {
      setProgress(progressPercent);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 96) return 96;
        const jump = Math.floor(Math.random() * 8) + 4;
        return Math.min(96, prev + jump);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isDone, progressPercent]);

  if (!test || typeof document === 'undefined') return null;

  const totalQuestions = test.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100050] bg-[#07070a]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 font-sans select-none overflow-hidden"
    >
      {/* Subtle ambient background glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-emerald-600/10 blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-md w-full mx-auto text-center space-y-5 relative z-10">
        
        {/* Spinner Icon */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute inset-0 rounded-2xl border-2 border-dashed border-indigo-400/40"
          />

          <div className="relative w-14 h-14 rounded-2xl bg-zinc-900 border border-indigo-500/50 shadow-xl shadow-indigo-600/20 flex items-center justify-center text-indigo-400">
            <Activity className="w-7 h-7 animate-pulse text-indigo-400" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-[10px] font-mono font-semibold text-indigo-300 uppercase tracking-wider">
            <Check className="w-3 h-3 text-indigo-400" />
            <span>Test Submitted</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
            Evaluating Test Responses
          </h2>

          <p className="text-xs text-zinc-400 font-mono">
            {statusMessage || 'Calculating scores and preparing test results...'}
          </p>
        </div>

        {/* Test Details Card */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-3.5 text-left space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="truncate font-semibold text-zinc-200">{test.name}</span>
            <span className="shrink-0 text-indigo-400 font-bold ml-2">
              {totalQuestions} Qs • {test.durationMinutes}m
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Progress</span>
              <span className="text-indigo-300 font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 rounded-full"
                initial={{ width: '15%' }}
                animate={{ width: `${progress}%` }}
                transition={springs.snappy}
              />
            </div>
          </div>
        </div>

        {/* Real-time Checklist */}
        <div className="space-y-2 text-left bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3 sm:p-3.5">
          {EVALUATION_STEPS.map((step) => {
            const isCompleted = progress >= step.threshold;
            const isCurrent = !isCompleted && (progress >= step.threshold - 30 || step.threshold === 20);
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-2.5 text-xs transition-colors duration-200 ${
                  isCompleted 
                    ? 'text-emerald-400' 
                    : isCurrent 
                    ? 'text-indigo-300' 
                    : 'text-zinc-500'
                }`}
              >
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  ) : (
                    <StepIcon className="w-4 h-4 text-zinc-600" />
                  )}
                </div>

                <span className={`text-[11px] font-mono leading-tight ${isCurrent ? 'font-semibold text-zinc-200' : ''}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-[10px] font-mono text-zinc-500">
          Please wait while your scorecard is being prepared...
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
