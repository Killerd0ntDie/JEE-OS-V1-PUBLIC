import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { RevisionCard } from '../../../services/revisionEngineService';

interface SmartRevisionQueueWidgetProps {
  revisionQueue: RevisionCard[];
  onNavigate: (page: string) => void;
  setSelectedRevision: (rev: RevisionCard | null) => void;
}

export function SmartRevisionQueueWidget({
  revisionQueue,
  onNavigate,
  setSelectedRevision
}: SmartRevisionQueueWidgetProps) {
  return (
    <Card className="p-5 border-zinc-800/80 bg-zinc-950/40 space-y-4 flex-1 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono tracking-wider text-indigo-400 font-bold uppercase block">
            SMART REVISION QUEUE
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            {revisionQueue.length} Due
          </span>
        </div>

        {revisionQueue.length === 0 ? (
          <div className="p-6 rounded-xl border border-zinc-900 bg-[#0c0c0e]/40 text-center space-y-2">
            <Icon name="CheckCircle" className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-zinc-200">Memory Vault Secure</p>
            <p className="text-[11px] text-zinc-500 leading-normal">
              All studied chapters are retainable and locked. Spaced repetition engine schedules next recall tomorrow!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {revisionQueue.slice(0, 4).map(rev => (
              <div
                key={rev.chapterId}
                className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-850/80 hover:border-zinc-800 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      rev.retentionStatus === 'Fresh' 
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60' 
                        : rev.retentionStatus === 'Stable' 
                        ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/60' 
                        : rev.retentionStatus === 'Fading'
                        ? 'bg-amber-950/40 text-amber-400 border border-amber-900/60'
                        : 'bg-red-950/40 text-red-400 border border-red-900/60'
                    }`}>
                      {rev.retentionStatus}
                    </span>
                    {rev.isCritical && (
                      <span className="text-[8px] font-mono text-red-400 font-bold bg-red-950/30 border border-red-900 px-1 py-0.2 rounded">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-400 transition-colors truncate">
                    {rev.chapterName}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => setSelectedRevision(rev)}
                  className="px-3 py-1 text-[9px] font-mono font-bold border border-indigo-900/60 bg-indigo-950/50 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shrink-0 uppercase tracking-wider"
                >
                  REV
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation links at bottom */}
      <div className="pt-3 border-t border-zinc-900/60 flex justify-between gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-[10px] font-mono uppercase tracking-widest h-8 border-zinc-800 text-zinc-300 hover:bg-zinc-900/60"
          onClick={() => onNavigate('planner')}
        >
          Planner
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-[10px] font-mono uppercase tracking-widest h-8 border-zinc-800 text-zinc-300 hover:bg-zinc-900/60"
          onClick={() => onNavigate('ai-coach')}
        >
          AI Coach
        </Button>
      </div>
    </Card>
  );
}
