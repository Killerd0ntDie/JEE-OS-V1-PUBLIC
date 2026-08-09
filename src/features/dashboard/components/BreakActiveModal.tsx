import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { TodayMission } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

interface BreakActiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakMission: TodayMission | null;
}

const RELAXATION_TIPS = [
  { icon: 'Coffee', title: 'Hydrate & Refuel', text: 'Drink a glass of water to keep your brain hydrated and alert.' },
  { icon: 'Eye', title: '20-20-20 Eye Relief', text: 'Look at something 20 feet away for 20 seconds to prevent digital eye strain.' },
  { icon: 'Activity', title: 'Posture & Stretch', text: 'Roll your shoulders back, stretch your spine, and un-hunch your shoulders.' },
  { icon: 'Zap', title: 'Cognitive Reset', text: 'Close your eyes and breathe deeply. Let your working memory consolidate.' },
];

export function BreakActiveModal({ isOpen, onClose, breakMission }: BreakActiveModalProps) {
  const actions = useStudyBrainStore(s => s.actions);
  const totalSeconds = (breakMission?.duration || 15) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSecondsRemaining((breakMission?.duration || 15) * 60);
      setIsPaused(false);
    }
  }, [isOpen, breakMission]);

  useEffect(() => {
    if (!isOpen || isPaused) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isPaused]);

  // Rotate relaxation tip every 15 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % RELAXATION_TIPS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleFinishBreak = () => {
    if (breakMission) {
      actions.completeTask(breakMission.id);
    }
    onClose();
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formatTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;
  const activeTip = RELAXATION_TIPS[tipIndex];

  return (
    <Modal isOpen={isOpen} zIndex={120} className="max-w-lg w-full p-8 rounded-3xl bg-[#090a10] border border-amber-500/30 text-white shadow-[0_0_50px_rgba(245,158,11,0.15)] text-center relative overflow-hidden">
      {/* Background Ambient Aura */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Icon name="Coffee" className="w-5 h-5 animate-bounce" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-display font-bold text-white leading-tight">
              {breakMission?.taskName || 'Routine Break in Progress'}
            </h2>
            <p className="text-xs text-amber-400/80 font-mono">Rest & Recovery Mode</p>
          </div>
        </div>
        {/* Close button removed intentionally to enforce break completion/pause */}
      </div>

      {/* Soothing Radial Timer */}
      <div className="relative my-6 flex flex-col items-center justify-center">
        <div className="relative w-48 h-48 flex items-center justify-center rounded-full border-4 border-zinc-850 bg-zinc-950/80 shadow-2xl">
          {/* Circular Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-zinc-850 stroke-current"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-amber-400 stroke-current transition-all duration-1000"
              strokeWidth="6"
              strokeDasharray="276"
              strokeDashoffset={276 - (276 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="text-center space-y-1 relative z-10">
            <div className="text-4xl font-mono font-extrabold text-white tracking-wider font-display">
              {formatTime}
            </div>
            <span className="text-[10px] font-mono text-amber-400/90 uppercase tracking-widest block font-bold">
              {isPaused ? 'PAUSED' : 'RECHARGING'}
            </span>
          </div>
        </div>
      </div>

      {/* Rotating Relaxation Tip */}
      <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 text-left space-y-1.5 my-6">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
          <Icon name={activeTip.icon as any} className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{activeTip.title}</span>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed font-sans">
          {activeTip.text}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2 relative z-10">
        <button
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          className="flex-1 py-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-200 font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Icon name={isPaused ? 'Play' : 'Pause'} className="w-4 h-4" />
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          type="button"
          onClick={handleFinishBreak}
          className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Icon name="Check" className="w-4 h-4 stroke-[3]" />
          <span>Finish Break Early</span>
        </button>
      </div>
    </Modal>
  );
}
