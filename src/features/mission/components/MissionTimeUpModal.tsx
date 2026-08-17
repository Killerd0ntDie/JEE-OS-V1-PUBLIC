import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Clock, Plus, CheckCircle2, ShieldAlert, Target } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export interface MissionTimeUpModalProps {
  isOpen: boolean;
  xpWager?: number;
  onFail?: () => void;
  onComplete: () => void;
  onAddExtraTime: (minutes: number) => void;
}

export function MissionTimeUpModal({
  isOpen,
  xpWager = 0,
  onFail,
  onComplete,
  onAddExtraTime
}: MissionTimeUpModalProps) {
  useLockBodyScroll(isOpen || false);

  useEscapeKey(onComplete, isOpen);
  
  const [summary, setSummary] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    if (isOpen && xpWager > 0) {
      setSummary('');
      setTimeLeft(300);
    }
  }, [isOpen, xpWager]);

  useEffect(() => {
    let interval: any;
    if (isOpen && xpWager > 0 && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            if (onFail) onFail();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, xpWager, timeLeft, onFail]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;

  const isCasinoActive = xpWager > 0;
  const charsLeft = Math.max(0, 50 - summary.length);
  const canSubmitProof = summary.length >= 50;

  return (
    <Modal isOpen={isOpen} onClose={onComplete} zIndex={10000} className="max-w-md w-full border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-left">
            
            {isCasinoActive ? (
              // CASINO PROOF OF WORK UI
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-mono font-bold text-amber-500">{timeString}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Time to prove</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h1 id="mission-time-up-modal-title" className="text-2xl font-black font-display text-white tracking-tight leading-none">
                    Proof of Work
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    You waged <strong className="text-amber-400">{xpWager} XP</strong>! To claim your reward and save your wager, write a short summary of what you studied.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="I learned about..."
                    className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-amber-500/50 resize-none font-sans"
                  />
                  <div className="flex justify-between text-xs font-mono">
                    <span className={charsLeft > 0 ? "text-rose-400" : "text-emerald-400"}>
                      {charsLeft > 0 ? `${charsLeft} chars remaining` : 'Ready to submit!'}
                    </span>
                    <span className="text-zinc-400">{summary.length} chars</span>
                  </div>
                </div>

                <button
                  onClick={onComplete}
                  disabled={!canSubmitProof}
                  className="w-full mt-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-amber-950 py-3.5 px-4 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Target className="w-4 h-4" />
                  Submit & Claim XP
                </button>
              </div>
            ) : (
              // STANDARD UI
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>

                <div className="space-y-2">
                  <h1 id="mission-time-up-modal-title" className="text-2xl font-black font-display text-white tracking-tight leading-none">
                    Time's Up!
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    You've reached the allocated time for this session. Do you want to wrap up now, or add some extra time to finish your tasks?
                  </p>
                </div>

                <div className="space-y-3 pt-6">
                  <div className="flex gap-3">
                    <button
                      onClick={() => onAddExtraTime(15)}
                      className="flex-1 py-3 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      15 Mins
                    </button>
                    <button
                      onClick={() => onAddExtraTime(30)}
                      className="flex-1 py-3 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      30 Mins
                    </button>
                  </div>

                  <button
                    onClick={onComplete}
                    className="w-full bg-white hover:bg-zinc-200 text-zinc-950 py-3.5 px-4 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-white/5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Session
                  </button>
                </div>
              </div>
            )}
    </Modal>
  );
}
