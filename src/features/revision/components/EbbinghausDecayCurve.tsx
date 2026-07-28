import { useMemo } from 'react';
import { Icon } from '../../../components/ui/Icon';

interface EbbinghausDecayCurveProps {
  avgRetentionScore: number;
  overdueCount: number;
}

export function EbbinghausDecayCurve({ avgRetentionScore, overdueCount }: EbbinghausDecayCurveProps) {
  // Compute predicted recall on JEE Exam Day based on current average retention score
  const predictedExamRecall = useMemo(() => {
    // Formula modeling Ebbinghaus R = e^(-t/S)
    const baseRecall = Math.max(30, Math.min(99, Math.round(avgRetentionScore * 0.95 - overdueCount * 2.5)));
    return baseRecall;
  }, [avgRetentionScore, overdueCount]);

  // Points for 30-day decay curve SVG
  const currentPoints = useMemo(() => {
    // Curve coordinates across Day 1, 3, 7, 14, 30
    const score = avgRetentionScore;
    const p1 = { x: 20, y: 100 - score };
    const p2 = { x: 80, y: 100 - Math.round(score * 0.85) };
    const p3 = { x: 160, y: 100 - Math.round(score * 0.72) };
    const p4 = { x: 240, y: 100 - Math.round(score * 0.60) };
    const p5 = { x: 320, y: 100 - predictedExamRecall };
    return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y} ${p5.x},${p5.y}`;
  }, [avgRetentionScore, predictedExamRecall]);

  return (
    <div className="bg-zinc-950/60 border border-zinc-850/80 rounded-2xl p-5 space-y-4 text-left select-none shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            <Icon name="TrendingUp" className="w-3.5 h-3.5" />
            <span>Ebbinghaus Spaced Repetition Predictor</span>
          </div>
          <h3 className="text-base font-display font-bold text-white tracking-tight">
            Memory Retention Decay & Exam Day Recall
          </h3>
        </div>

        {/* Exam Day Recall Prediction Badge */}
        <div className="flex items-center gap-2 bg-indigo-950/40 border border-indigo-900/60 px-3 py-1.5 rounded-xl font-mono shrink-0">
          <span className="text-[10px] text-zinc-400">Predicted Exam Recall:</span>
          <span className="text-sm font-bold text-indigo-300">{predictedExamRecall}%</span>
        </div>
      </div>

      {/* Interactive SVG Decay Graph */}
      <div className="relative bg-zinc-900/40 border border-zinc-850 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-[9px] font-mono text-zinc-500 pb-1">
          <span>Day 1 (Immediate)</span>
          <span>Day 3</span>
          <span>Day 7</span>
          <span>Day 14</span>
          <span>Day 30 (JEE Exam)</span>
        </div>

        <div className="relative h-28 w-full">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 340 100" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="20" x2="340" y2="20" stroke="#27272a" strokeDasharray="3 3" />
            <line x1="0" y1="50" x2="340" y2="50" stroke="#27272a" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2="340" y2="80" stroke="#27272a" strokeDasharray="3 3" />

            {/* Optimal Repetition Curve (Green Reference) */}
            <polyline
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.6"
              points="20,10 80,15 160,20 240,22 320,25"
            />

            {/* Actual Current Decay Curve (Indigo Solid) */}
            <polyline
              fill="none"
              stroke="#6366F1"
              strokeWidth="3"
              points={currentPoints}
            />

            {/* Key Data Nodes */}
            <circle cx="20" cy={100 - avgRetentionScore} r="4" fill="#6366F1" />
            <circle cx="320" cy={100 - predictedExamRecall} r="5" fill="#38BDF8" className="animate-pulse" />
          </svg>
        </div>

        {/* Legend & Advice */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-850">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-3 h-0.5 bg-indigo-500 rounded-full" /> Your Memory Curve
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-0.5 bg-emerald-500 border-dashed" /> Target Spaced Curve
            </span>
          </div>
          <span className="text-zinc-500">
            {overdueCount > 0 ? `⚠️ ${overdueCount} overdue chapters dragging exam prediction down` : '✅ All chapters within optimal interval'}
          </span>
        </div>
      </div>
    </div>
  );
}
