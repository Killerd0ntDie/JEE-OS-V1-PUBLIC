import React from 'react';
import { Mistake } from '@/types/index';
import { MistakesStatsWidget } from './MistakesStatsWidget';
import { ErrorHeatmapWidget } from './ErrorHeatmapWidget';
import { Brain, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

export interface MistakeAnalyticsStageProps {
  mistakes: Mistake[];
  totalMistakes: number;
  unresolvedCount: number;
  resolvedCount: number;
  resolutionRate: number;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
}

export const MistakeAnalyticsStage: React.FC<MistakeAnalyticsStageProps> = ({
  mistakes,
  totalMistakes,
  unresolvedCount,
  resolvedCount,
  resolutionRate,
  selectedTag,
  setSelectedTag,
}) => {
  // Count by subject
  const physicsCount = mistakes.filter(m => m.subject === 'physics').length;
  const chemistryCount = mistakes.filter(m => m.subject === 'chemistry').length;
  const mathsCount = mistakes.filter(m => m.subject === 'maths').length;

  return (
    <div className="space-y-6">
      {/* Top 3 Stat Cards */}
      <MistakesStatsWidget
        totalMistakes={totalMistakes}
        unresolvedCount={unresolvedCount}
        resolvedCount={resolvedCount}
        resolutionRate={resolutionRate}
      />

      {/* Subject Distribution Bar */}
      <div className="p-5 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 backdrop-blur-xl shadow-xl space-y-3 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-indigo-400" />
            Subject Error Distribution
          </span>
          <span className="text-xs font-mono text-zinc-400">{totalMistakes} Total Errors Logged</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40">
            <span className="text-[10px] text-blue-400 block uppercase font-bold">Physics Errors</span>
            <span className="text-lg font-bold text-blue-200">{physicsCount}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/40">
            <span className="text-[10px] text-amber-400 block uppercase font-bold">Chemistry Errors</span>
            <span className="text-lg font-bold text-amber-200">{chemistryCount}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
            <span className="text-[10px] text-emerald-400 block uppercase font-bold">Mathematics Errors</span>
            <span className="text-lg font-bold text-emerald-200">{mathsCount}</span>
          </div>
        </div>
      </div>

      {/* Error Root Cause Heatmap */}
      <ErrorHeatmapWidget
        mistakes={mistakes}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
      />
    </div>
  );
};
