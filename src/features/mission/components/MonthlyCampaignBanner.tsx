import React, { useMemo } from 'react';
import { Target, Skull, Ghost, Zap, Crosshair } from 'lucide-react';
import { useStudyBrain } from '../../../context/StudyBrainContext';

export function MonthlyCampaignBanner() {
  const { state } = useStudyBrain();
  const mentorProfile = state.mentorProfile;

  // Derive "Boss" info dynamically from lowest confidence chapters if objective is empty
  const boss = useMemo(() => {
    let targetChap = state.chapters.reduce((lowest, c) => 
      (c.retentionScore || 100) < (lowest.retentionScore || 100) ? c : lowest
    , state.chapters[0]);

    const title = mentorProfile?.monthlyObjective?.category 
      || (targetChap ? `The ${targetChap.name} Titan` : 'The Mechanics Beast');
      
    const desc = mentorProfile?.monthlyObjective?.description 
      || `Defeat the boss by restoring retention above 85% in weak subjects.`;

    // Calculate boss health (inverse of user's overall progress this month)
    const baseHealth = 1000;
    const currentHealth = Math.max(0, baseHealth - ((state.xp?.total || 0) % 1000));
    const healthPercent = (currentHealth / baseHealth) * 100;

    return { title, desc, healthPercent, currentHealth, baseHealth };
  }, [state.chapters, mentorProfile?.monthlyObjective, state.xp]);

  // Derive "Ghost Racer" pace
  const ghost = useMemo(() => {
    const today = new Date();
    const daysPassed = today.getDate();
    // Ghost targets 120 XP per day
    const ghostXp = daysPassed * 120;
    const userXp = state.xp?.total || 0;
    
    // Monthly total cap for visualization (e.g., 3000 XP)
    const monthlyMax = 3000;
    
    const ghostPercent = Math.min(100, (ghostXp / monthlyMax) * 100);
    const userPercent = Math.min(100, (userXp / monthlyMax) * 100);
    
    const isAhead = userPercent >= ghostPercent;

    return { ghostXp, userXp, ghostPercent, userPercent, monthlyMax, isAhead };
  }, [state.xp]);

  return (
    <div className="p-5 rounded-2xl border border-red-900/40 bg-red-950/10 flex flex-col gap-6 relative overflow-hidden">
      
      {/* Background styling for gaming feel */}
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Skull className="w-48 h-48 text-red-500" />
      </div>

      {/* Header Info */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider flex-wrap">
            <Target className="w-4 h-4" />
            <span>30-Day Campaign Boss</span>
            <span className="text-[10px] font-mono text-red-300 bg-red-950/60 border border-red-800/60 px-2.5 py-0.5 rounded-full uppercase">
              Lv. {state.xp?.level || 1} Encounter
            </span>
          </div>
          <h3 className="text-xl font-display font-bold text-white drop-shadow-sm">
            {boss.title}
          </h3>
          <p className="text-xs text-zinc-400 max-w-lg">
            {boss.desc}
          </p>
        </div>
        
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold mb-1">
            Boss Health
          </div>
          <div className="text-2xl font-display font-bold text-red-400">
            {boss.currentHealth} / {boss.baseHealth}
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="relative z-10 space-y-5">
        
        {/* Boss Health Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-wider">
            <span className="text-red-400 flex items-center gap-1.5"><Skull className="w-3.5 h-3.5" /> Boss HP</span>
            <span className="text-zinc-500">{Math.round(boss.healthPercent)}% Remaining</span>
          </div>
          <div className="h-3 rounded-full bg-red-950/50 border border-red-900/50 overflow-hidden flex justify-end">
            <div 
              className="h-full bg-gradient-to-l from-red-600 to-red-500 transition-all duration-1000 ease-out"
              style={{ width: `${boss.healthPercent}%` }}
            />
          </div>
        </div>

        {/* Ghost Racing Bar */}
        <div className="p-4 rounded-xl bg-black/40 border border-zinc-800/50 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">Monthly XP Race</span>
            </div>
            <div className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              {ghost.isAhead ? 'You are pulling ahead!' : `Ghost is +${ghost.ghostXp - ghost.userXp} XP ahead`}
            </div>
          </div>

          <div className="relative pt-2 pb-6">
            
            {/* Base track */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className={`absolute inset-y-0 left-0 ${ghost.isAhead ? 'bg-emerald-500/30' : 'bg-amber-500/30'}`} 
                style={{ width: `${ghost.userPercent}%` }} 
              />
            </div>
            
            {/* Ghost Marker */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 -ml-3 w-6 h-6 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.1)] z-10 transition-all duration-1000"
              style={{ left: `${ghost.ghostPercent}%` }}
            >
              <Ghost className="w-3 h-3 text-zinc-400" />
            </div>

            {/* User Marker */}
            <div 
              className={`absolute top-1/2 -translate-y-1/2 -ml-4 w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-20 transition-all duration-1000 ${
                ghost.isAhead 
                  ? 'bg-emerald-950 border-2 border-emerald-500 shadow-emerald-500/20' 
                  : 'bg-amber-950 border-2 border-amber-500 shadow-amber-500/20'
              }`}
              style={{ left: `${ghost.userPercent}%` }}
            >
              <Zap className={`w-4 h-4 ${ghost.isAhead ? 'text-emerald-400' : 'text-amber-400'}`} />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
