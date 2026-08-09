import React, { useMemo } from 'react';
import { Target, Skull, Ghost, Zap, Crosshair } from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

export function MonthlyCampaignBanner() {
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const chapters = useStudyBrainStore(state => state.chapters);
  const xp = useStudyBrainStore(state => state.xp);

  // Derive "Boss" info dynamically from active or lowest confidence chapters if objective is empty
  const boss = useMemo(() => {
    // Exclude fully completed/mastered chapters from candidate pool if there are active/uncompleted ones
    const uncompleted = chapters.filter(c => c.completion < 100 && c.status !== 'Mastered' && c.status !== 'Theory Complete');
    const revisionDue = chapters.filter(c => c.status === 'Revision Due' || (c.retentionScore && c.retentionScore < 70));
    const candidatePool = uncompleted.length > 0 ? uncompleted : (revisionDue.length > 0 ? revisionDue : chapters);

    let targetChap = candidatePool.reduce((lowest, c) => 
      (c.retentionScore || 100) < (lowest.retentionScore || 100) ? c : lowest
    , candidatePool[0]);

    const title = mentorProfile?.monthlyObjective?.category 
      || (targetChap ? `The ${targetChap.name} Titan` : 'The Mechanics Beast');
      
    const desc = mentorProfile?.monthlyObjective?.description 
      || `Defeat the boss by earning 3000 XP this month to secure your mastery.`;

    // Calculate boss health (based on true Monthly XP, not an arbitrary modulo)
    const baseHealth = 3000;
    const currentHealth = Math.max(0, baseHealth - (xp?.monthly || 0));
    const healthPercent = (currentHealth / baseHealth) * 100;

    return { title, desc, healthPercent, currentHealth, baseHealth };
  }, [chapters, mentorProfile?.monthlyObjective, xp?.monthly]);

  // Derive "Ghost Racer" pace
  const ghost = useMemo(() => {
    const today = new Date();
    const daysPassed = today.getDate();
    // Ghost targets 100 XP per day for a realistic 3000/month goal
    const ghostXp = daysPassed * 100;
    const userXp = xp?.monthly || 0;
    
    // Monthly total cap for visualization (e.g., 3000 XP)
    const monthlyMax = 3000;
    
    const ghostPercent = Math.min(100, (ghostXp / monthlyMax) * 100);
    const userPercent = Math.min(100, (userXp / monthlyMax) * 100);
    
    const isAhead = userPercent >= ghostPercent;

    return { ghostXp, userXp, ghostPercent, userPercent, monthlyMax, isAhead };
  }, [xp?.monthly]);

  return (
    <div className="px-4 py-3 rounded-xl border border-red-900/40 bg-red-950/10 flex flex-col md:flex-row gap-4 relative overflow-hidden items-center shadow-sm">
      
      {/* Background styling for gaming feel */}
      <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
        <Skull className="w-24 h-24 text-red-500" />
      </div>

      {/* Left: Info */}
      <div className="w-full md:w-1/3 space-y-1 z-10">
        <div className="flex items-center gap-1.5 text-red-400 font-mono text-[10px] font-bold uppercase tracking-wider">
          <Target className="w-3.5 h-3.5" />
          <span>Campaign Boss: Lv. {xp?.level || 1}</span>
        </div>
        <h3 className="text-sm font-display font-bold text-white truncate" title={boss.desc}>
          {boss.title}
        </h3>
      </div>
      
      {/* Middle: Boss HP */}
      <div className="w-full md:w-1/3 space-y-1.5 z-10">
        <div className="flex justify-between text-[11px] font-mono font-bold uppercase tracking-wider">
          <span className="text-red-400 flex items-center gap-1"><Skull className="w-3 h-3" /> BOSS HP</span>
          <span className="text-zinc-400">{boss.currentHealth} / {boss.baseHealth} ({Math.round(boss.healthPercent)}%)</span>
        </div>
        <div className="h-1.5 rounded-full bg-red-950/50 border border-red-900/50 overflow-hidden flex justify-end">
          <div 
            className="h-full bg-gradient-to-l from-red-600 to-red-500 transition-all duration-1000 ease-out"
            style={{ width: `${boss.healthPercent}%` }}
          />
        </div>
      </div>

      {/* Right: Ghost Race */}
      <div className="w-full md:w-1/3 bg-black/30 rounded-lg p-2 px-3 border border-zinc-800/50 z-10">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5">
            <Crosshair className="w-3 h-3 text-zinc-400" />
            <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider">XP Race</span>
          </div>
          <div className="text-[8.5px] font-mono font-bold text-zinc-400">
            {ghost.isAhead ? <span className="text-emerald-400">Winning</span> : `Ghost +${ghost.ghostXp - ghost.userXp}`}
          </div>
        </div>

        <div className="relative pt-1 pb-1">
          {/* Base track */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 ${ghost.isAhead ? 'bg-emerald-500/30' : 'bg-amber-500/30'}`} 
              style={{ width: `${ghost.userPercent}%` }} 
            />
          </div>
          
          {/* Ghost Marker */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center z-10 transition-all duration-1000"
            style={{ left: `${ghost.ghostPercent}%` }}
            title={`Ghost XP: ${ghost.ghostXp}`}
          >
            <Ghost className="w-2 h-2 text-zinc-400" />
          </div>

          {/* User Marker */}
          <div 
            className={`absolute top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md z-20 transition-all duration-1000 ${
              ghost.isAhead 
                ? 'bg-emerald-950 border border-emerald-500' 
                : 'bg-amber-950 border border-amber-500'
            }`}
            style={{ left: `${ghost.userPercent}%` }}
            title={`Your XP: ${ghost.userXp}`}
          >
            <Zap className={`w-2.5 h-2.5 ${ghost.isAhead ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
        </div>
      </div>

    </div>
  );
}
