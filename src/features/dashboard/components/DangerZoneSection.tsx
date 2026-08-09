import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface DangerZoneSectionProps {
  onOpenResetXP: () => void;
  onOpenResetMissions: () => void;
  onOpenResetHidden: () => void;
  onOpenPurgeWorkspace: () => void;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
  onOpenResetXP,
  onOpenResetMissions,
  onOpenResetHidden,
  onOpenPurgeWorkspace,
}) => {
  return (
    <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex items-center gap-3 border-b border-red-900/40 pb-4">
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold font-display text-white tracking-tight">Danger Zone & Workspace Maintenance</h2>
          <p className="text-[11px] text-red-300/70 font-mono">Irreversible reset actions for student progress</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
        <button
          type="button"
          onClick={onOpenResetXP}
          className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-red-800/50 hover:bg-red-950/30 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-white group-hover:text-red-300">Reset XP & Streak</span>
            <RefreshCw className="w-4 h-4 text-zinc-400 group-hover:text-red-400 transition-colors" />
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed">Reset your daily streak counter and level progression to zero.</p>
        </button>

        <button
          type="button"
          onClick={onOpenResetMissions}
          className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-red-800/50 hover:bg-red-950/30 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-white group-hover:text-red-300">Reset Custom Missions</span>
            <RefreshCw className="w-4 h-4 text-zinc-400 group-hover:text-red-400 transition-colors" />
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed">Clear all custom missions and regenerate a fresh daily schedule.</p>
        </button>

        <button
          type="button"
          onClick={onOpenResetHidden}
          className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-red-800/50 hover:bg-red-950/30 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-white group-hover:text-red-300">Reset Hidden Missions</span>
            <RefreshCw className="w-4 h-4 text-zinc-400 group-hover:text-red-400 transition-colors" />
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed">Clear the deleted/dismissed tasks blocklist and unhide all missions.</p>
        </button>

        <button
          type="button"
          onClick={onOpenPurgeWorkspace}
          className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 hover:bg-red-900/50 text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-red-300">Purge Workspace</span>
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-[10px] text-red-300/70 leading-relaxed">Nuclear option: Wipe all local cache, telemetry, and reset workspace.</p>
        </button>
      </div>
    </div>
  );
};
