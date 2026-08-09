import React, { useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Mistake } from '@/types/index';
import { MISTAKE_CATEGORIES } from '@/features/mistakes/MistakesPage';

export interface ErrorHeatmapWidgetProps {
  mistakes: Mistake[];
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
}

export function ErrorHeatmapWidget({
  mistakes,
  selectedTag,
  setSelectedTag
}: ErrorHeatmapWidgetProps) {
  // Error Cause Breakdown Statistics
  const causeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    MISTAKE_CATEGORIES.forEach(cat => { counts[cat] = 0; });

    mistakes.forEach(m => {
      (m.mistakeTypes || []).forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    const totalTags = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const sorted = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    return { counts, totalTags, sorted };
  }, [mistakes]);

  return (
    <div className="bg-zinc-950/60 border border-zinc-850/80 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
        <div className="flex items-center gap-2">
          <Icon name="Activity" className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
            Top Error Root-Cause Heatmap
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">
          Categorized by Tag Type
        </span>
      </div>

      {causeStats.sorted.length === 0 ? (
        <p className="text-xs text-zinc-400 font-mono py-2 text-center">
          No categorized mistakes logged yet. Click 'Log New Mistake' to tag your errors.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1 font-mono text-[10px]">
          {causeStats.sorted.map(([cat, count]) => {
            const pct = Math.round((count / causeStats.totalTags) * 100);
            return (
              <div 
                key={cat}
                onClick={() => setSelectedTag(cat === selectedTag ? 'all' : cat)}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedTag === cat 
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-750 text-zinc-300'
                }`}
              >
                <span className="truncate block font-semibold">{cat}</span>
                <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
                  <span className="font-bold text-indigo-400">{count} errors</span>
                  <span>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
