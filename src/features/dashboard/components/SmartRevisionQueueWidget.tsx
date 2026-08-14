import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { RevisionCard } from '@/services/revisionEngineService';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Sparkles, Brain, Clock } from 'lucide-react';

interface SmartRevisionQueueWidgetProps {
  revisionQueue: RevisionCard[];
  onLaunchRevision: (rev: RevisionCard | null) => void;
}

export function SmartRevisionQueueWidget({
  revisionQueue = [],
  onLaunchRevision
}: SmartRevisionQueueWidgetProps) {
  const navigate = useNavigate();
  const queue = revisionQueue || [];

  return (
    <Card className="p-6 border-zinc-800/80 bg-zinc-950/40 glass-card backdrop-blur-xl h-full flex flex-col justify-between shadow-2xl relative overflow-hidden text-left">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono tracking-widest text-indigo-400 font-bold uppercase flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            SMART REVISION QUEUE
          </span>
          <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full">
            {queue.length} Due
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="p-6 rounded-2xl border border-zinc-850/80 bg-zinc-900/30 text-center space-y-3.5 flex flex-col items-center justify-center my-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white tracking-tight">Memory Vault Secure</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-sm">
                All studied chapters are retainable and locked in long-term memory. Spaced repetition engine schedules the next recall cycle for tomorrow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850 text-left">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">SM-2 Algorithm</span>
                <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3" /> Active & Optimized
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850 text-left">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Next Schedule</span>
                <span className="text-xs font-bold text-indigo-300 font-mono flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> Tomorrow 08:00 AM
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {queue.slice(0, 4).map(rev => (
              <div
                key={rev.chapterId}
                className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-850 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border shadow-sm ${
                      rev.retentionStatus === 'Fresh' 
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' 
                        : rev.retentionStatus === 'Stable' 
                        ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30' 
                        : rev.retentionStatus === 'Fading'
                        ? 'bg-amber-950/40 text-amber-300 border-amber-500/30' 
                        : 'bg-red-950/40 text-red-300 border-red-500/30'
                    }`}>
                      {rev.retentionStatus}
                    </span>
                    {rev.isCritical && (
                      <span className="text-[10px] font-mono text-rose-300 font-bold bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded-lg shadow-sm">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors truncate">
                    {rev.chapterName}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => onLaunchRevision(rev)}
                  className="px-3.5 py-1 text-xs font-mono font-bold border border-indigo-500/30 bg-indigo-600/20 text-indigo-200 hover:bg-indigo-600 hover:text-white transition-all shrink-0 uppercase tracking-wider rounded-xl cursor-pointer active:scale-95"
                >
                  Revise
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation links at bottom */}
      <div className="pt-4 border-t border-zinc-850/80 flex justify-between gap-3 mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs font-mono font-bold uppercase tracking-wider h-9 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-all duration-150 active:scale-[0.96] select-none cursor-pointer"
          onClick={() => navigate('/planner')}
        >
          Planner
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs font-mono font-bold uppercase tracking-wider h-9 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-all duration-150 active:scale-[0.96] select-none cursor-pointer"
          onClick={() => navigate('/ai-coach')}
        >
          AI Coach
        </Button>
      </div>
    </Card>
  );
}
