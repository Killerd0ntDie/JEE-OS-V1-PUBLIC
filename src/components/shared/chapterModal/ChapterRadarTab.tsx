import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { ChapterTelemetry } from '@jee-os/engines';

export interface ChapterRadarTabProps {
  telemetry?: ChapterTelemetry;
}

export const ChapterRadarTab: React.FC<ChapterRadarTabProps> = ({ telemetry }) => {
  return (
    <motion.div
      key="radar"
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4 font-mono text-xs"
    >
      <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-3">
        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Strategy Radar Engine Metrics</span>
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">Theory Completion</span>
            <strong className="text-indigo-400 text-base">{telemetry?.strategyRadar.theoryCompletionPercent ?? 0}%</strong>
          </div>
          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">DPP Practice</span>
            <strong className="text-emerald-400 text-base">{telemetry?.strategyRadar.dppCompletionPercent ?? 0}%</strong>
          </div>
          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">PYQ Completion</span>
            <strong className="text-purple-400 text-base">{telemetry?.strategyRadar.pyqCompletionPercent ?? 0}%</strong>
          </div>
          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">Retention Score</span>
            <strong className="text-sky-400 text-base">{telemetry?.strategyRadar.retentionConfidenceScore ?? 70}</strong>
          </div>
        </div>
        <div className="pt-2.5 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400">
          <span>JEE Weightage Rank: <strong className="text-amber-400">{telemetry?.strategyRadar.jeeWeightageRank || 'Tier 2'}</strong></span>
          <span>Bottleneck Severity: <strong className={telemetry?.strategyRadar.bottleneckSeverity === 'Critical' ? 'text-amber-400' : 'text-emerald-400'}>{telemetry?.strategyRadar.bottleneckSeverity || 'None'}</strong></span>
        </div>
      </div>

      {telemetry?.isBottleneck && (
        <div className="p-4 rounded-2xl border border-amber-900/50 bg-amber-950/30 text-amber-300 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1.5 text-amber-400">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Active Bottleneck Detected
          </span>
          <p className="text-xs text-zinc-300 leading-normal">{telemetry.bottleneckReason}</p>
        </div>
      )}
    </motion.div>
  );
};
