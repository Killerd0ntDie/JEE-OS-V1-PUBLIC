
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Play } from 'lucide-react';
import { MockTest } from '@/types/mockTest';

export interface ActiveSessionData {
  testId: string;
  test: MockTest;
  remainingSeconds: number;
}

interface InterruptedSessionBannerProps {
  activeSession: ActiveSessionData | null;
  onDiscard: (testId: string) => void;
  onResume: (test: MockTest) => void;
}

export function InterruptedSessionBanner({ activeSession, onDiscard, onResume }: InterruptedSessionBannerProps) {
  return (
    <AnimatePresence>
      {activeSession && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="surface-2 rounded-2xl p-4 sm:p-5 border border-amber-500/40 bg-amber-500/[0.04] shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans"
        >
          {/* Subtle ambient accent */}
          <div className="absolute top-0 right-0 w-72 h-36 bg-amber-500/10 rounded-full filter blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3.5 min-w-0 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-950/70 px-2.5 py-0.5 rounded-lg border border-amber-500/40">
                  Active Test In Progress
                </span>
                <span className="text-xs font-mono text-amber-300 font-bold">
                  ⏱️ {Math.floor(activeSession.remainingSeconds / 60)}m {activeSession.remainingSeconds % 60}s remaining
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white truncate font-display mt-0.5">
                {activeSession.test.name}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0 relative z-10">
            <button
              type="button"
              onClick={() => onDiscard(activeSession.testId)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold text-zinc-400 hover:text-rose-300 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800/40 transition-colors cursor-pointer shadow-xs"
            >
              Discard Attempt
            </button>
            <button
              type="button"
              onClick={() => onResume(activeSession.test)}
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-98 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume CBT</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
