import React from 'react';
import { Flame, Skull } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface CasinoSetupOverlayProps {
  isSettingUp: boolean;
  xpTotal: number;
  xpWager: number;
  setXpWager: (val: number) => void;
  onAccept: () => void;
}

export function CasinoSetupOverlay({
  isSettingUp,
  xpTotal,
  xpWager,
  setXpWager,
  onAccept
}: CasinoSetupOverlayProps) {
  return (
    <Modal
      isOpen={isSettingUp}
      zIndex={10001}
      backdropClassName="bg-zinc-950/90 backdrop-blur-md"
      className="w-full max-w-md border border-red-900/50 rounded-3xl p-8 shadow-[0_0_80px_rgba(220,38,38,0.15)] flex flex-col items-center text-center space-y-6"
    >
      <div className="w-20 h-20 rounded-full bg-red-950/50 border border-red-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.3)]">
        <Flame className="w-10 h-10 text-red-500" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-3xl font-display font-black text-white tracking-tight uppercase">The Pomodoro Casino</h2>
        <p className="text-sm text-zinc-400 font-mono">
          Wager your XP on your own discipline. When the timer ends, you must write a 50+ character summary of what you studied within 5 minutes. Pass the Proof of Work to save your wager and earn a <strong className="text-red-400">2.5x payout</strong>.
        </p>
      </div>

      <div className="w-full space-y-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase">Wager Amount</span>
          <span className="text-2xl font-display font-bold text-amber-400">{xpWager} XP</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max={Math.max(100, xpTotal)} 
          step="10" 
          value={xpWager} 
          onChange={(e) => setXpWager(Number(e.target.value))}
          className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer"
        />
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>Safe</span>
          <span className="text-amber-500/50">All In</span>
        </div>
      </div>

      <button 
        onClick={onAccept}
        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-mono text-lg font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
      >
        Accept Wager & Start
      </button>
    </Modal>
  );
}

interface CasinoFailureOverlayProps {
  missionFailed: boolean;
  xpWager: number;
  onExit: () => void;
}

export function CasinoFailureOverlay({
  missionFailed,
  xpWager,
  onExit
}: CasinoFailureOverlayProps) {
  return (
    <Modal
      isOpen={missionFailed}
      zIndex={10001}
      backdropClassName="bg-red-950/90 backdrop-blur-md"
      className="w-full max-w-md border border-red-500 rounded-3xl p-8 shadow-[0_0_100px_rgba(220,38,38,0.4)] flex flex-col items-center text-center space-y-6"
    >
      <div className="w-24 h-24 rounded-full bg-red-900/50 border border-red-500 flex items-center justify-center">
        <Skull className="w-12 h-12 text-red-500 animate-pulse" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-4xl font-display font-black text-red-500 tracking-tight uppercase">Focus Broken</h2>
        <p className="text-sm text-red-200/70 font-mono">
          You abandoned the mission. Your wager of <strong className="text-white">{xpWager} XP</strong> has been forfeited to the Casino.
        </p>
      </div>

      <button 
        onClick={onExit}
        className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 border border-red-900/50 text-white rounded-xl font-mono text-sm font-bold uppercase tracking-widest transition-all mt-4"
      >
        Flee in Disgrace
      </button>
    </Modal>
  );
}
