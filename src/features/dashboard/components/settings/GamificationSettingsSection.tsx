import React from 'react';
import { Sparkles } from 'lucide-react';
import { SpringToggle } from './SettingsInputs';

interface GamificationSettingsSectionProps {
  enableGodMode: boolean;
  enablePomodoroCasino: boolean;
  onChange: (key: string, value: any) => void;
}

export const GamificationSettingsSection: React.FC<GamificationSettingsSectionProps> = ({
  enableGodMode,
  enablePomodoroCasino,
  onChange
}) => {
  return (
    <div className="bg-zinc-900/90 border border-amber-500/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden text-left">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
          <Sparkles className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-base font-display font-bold text-white tracking-tight">
            Gamification & God Mode
          </h3>
          <p className="text-xs text-zinc-400 font-sans">
            Unlock God Mode themes and XP multipliers for maintaining high study streaks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* God Mode Toggle Switch */}
        <div className="flex items-center justify-between p-4.5 rounded-2xl bg-zinc-850/60 border border-white/10 gap-4 shadow-sm">
          <div className="space-y-1 pr-2">
            <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <span>Enable God Mode</span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-md">1.5x XP</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Maintaining a 7-day streak activates God Mode, applying a radiant amber theme and 1.5x XP bonus.
            </p>
          </div>
          <SpringToggle 
            checked={enableGodMode} 
            onChange={(v) => onChange('enableGodMode', v)} 
            activeColor="bg-amber-500"
          />
        </div>

        {/* Pomodoro Casino Toggle Switch */}
        <div className="flex items-center justify-between p-4.5 rounded-2xl bg-zinc-850/60 border border-white/10 gap-4 shadow-sm">
          <div className="space-y-1 pr-2">
            <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <span>Pomodoro Casino (XP Wager)</span>
              <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-md">2.5x Payout</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Wager XP on study sessions. Submit Proof-of-Work to earn a 2.5x payout, or forfeit your wager on premature exit.
            </p>
          </div>
          <SpringToggle 
            checked={enablePomodoroCasino} 
            onChange={(v) => onChange('enablePomodoroCasino', v)} 
            activeColor="bg-rose-500"
          />
        </div>
      </div>
    </div>
  );
};
