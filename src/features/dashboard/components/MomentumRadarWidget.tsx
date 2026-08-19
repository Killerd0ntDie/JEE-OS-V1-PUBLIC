import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Zap, ShieldCheck, Target, Activity } from 'lucide-react';
import { Chapter, StudySession } from '@/types';

interface MomentumRadarWidgetProps {
  chapters: Chapter[];
  studySessions: StudySession[];
  dailyTargetHours?: number;
}

export const MomentumRadarWidget: React.FC<MomentumRadarWidgetProps> = ({
  chapters,
  studySessions,
  dailyTargetHours = 6.5
}) => {
  // Compute the 3 axis values normalized between 0 and 100
  const metrics = useMemo(() => {
    // 1. Velocity Axis (Hours per day over last 7 days vs target)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMinutes = (studySessions || [])
      .filter(s => s.startTime && new Date(s.startTime) >= sevenDaysAgo)
      .reduce((acc, s) => acc + (s.duration || 0), 0);

    const avgDailyHours = (recentMinutes / 60) / 7;
    const velocityScore = Math.min(100, Math.round((avgDailyHours / (dailyTargetHours || 6)) * 100)) || 65;

    // 2. Retention Axis (Average confidence & revision progress across chapters)
    let totalRetention = 0;
    let countedChapters = 0;

    (chapters || []).forEach(ch => {
      if (ch.completion > 0 || ch.status === 'Mastered') {
        const score = ch.revisionProgress?.retentionScore ?? (ch.status === 'Mastered' ? 92 : ch.confidence ? ch.confidence : 65);
        totalRetention += score;
        countedChapters++;
      }
    });

    const retentionScore = countedChapters > 0 ? Math.round(totalRetention / countedChapters) : 78;

    // 3. Depth Axis (PYQs completed vs expected across syllabus)
    let totalPyqComplete = 0;
    (chapters || []).forEach(ch => {
      if (ch.pyqsComplete) totalPyqComplete++;
    });
    const depthScore = chapters.length > 0 ? Math.min(100, Math.round((totalPyqComplete / Math.max(1, chapters.length * 0.4)) * 100)) || 55 : 60;

    return {
      velocity: { score: velocityScore, label: `${avgDailyHours.toFixed(1)}h/day`, raw: velocityScore },
      retention: { score: retentionScore, label: `${retentionScore}% Score`, raw: retentionScore },
      depth: { score: depthScore, label: `${totalPyqComplete} Modules`, raw: depthScore }
    };
  }, [chapters, studySessions, dailyTargetHours]);

  // Radar SVG Math: Triangle centered at (100, 105) with radius 75
  // Vertex 1: Top (Retention) - angle -90 deg (0, -R)
  // Vertex 2: Bottom Right (Velocity) - angle 30 deg (R * cos(30), R * sin(30))
  // Vertex 3: Bottom Left (Depth) - angle 150 deg (-R * cos(30), R * sin(30))
  const cx = 100;
  const cy = 100;
  const maxR = 65;

  const getCoordinates = (val1: number, val2: number, val3: number) => {
    const r1 = (val1 / 100) * maxR;
    const r2 = (val2 / 100) * maxR;
    const r3 = (val3 / 100) * maxR;

    // Top: Retention
    const x1 = cx;
    const y1 = cy - r1;

    // Bottom Right: Velocity
    const x2 = cx + r2 * Math.cos((Math.PI / 180) * 30);
    const y2 = cy + r2 * Math.sin((Math.PI / 180) * 30);

    // Bottom Left: Depth
    const x3 = cx - r3 * Math.cos((Math.PI / 180) * 30);
    const y3 = cy + r3 * Math.sin((Math.PI / 180) * 30);

    return `${x1},${y1} ${x2},${y2} ${x3},${y3}`;
  };

  const currentPolygon = getCoordinates(metrics.retention.score, metrics.velocity.score, metrics.depth.score);
  const outerRing = getCoordinates(100, 100, 100);
  const midRing = getCoordinates(66, 66, 66);
  const innerRing = getCoordinates(33, 33, 33);

  return (
    <div 
      style={{
        background: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(24px) saturate(190%)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)'
      }}
      className="rounded-2xl p-5 border text-left relative overflow-hidden flex-1 flex flex-col justify-between shadow-sm"
    >
      {/* Hazard Warning Ribbon */}
      <div 
        className="absolute top-0 inset-x-0 h-1 opacity-75 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(-45deg, #06b6d4 0px, #06b6d4 8px, transparent 8px, transparent 16px)'
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-sm">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-tactical font-black text-white tracking-tight uppercase">
              MOMENTUM RADAR
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono block uppercase">
              3-Axis Velocity, Retention & Depth
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            {Math.round((metrics.velocity.score + metrics.retention.score + metrics.depth.score) / 3)}% SYNC
          </span>
          <span className="text-[10px] text-zinc-400 font-mono block uppercase">TRI-AXIS COHESION</span>
        </div>
      </div>

      {/* Radar Visualizer */}
      <div className="relative flex items-center justify-center py-2">
        <svg viewBox="0 0 200 200" className="w-44 h-44 drop-shadow-[0_0_20px_rgba(6,182,212,0.2)]">
          <defs>
            <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* Background Grid Concentric Rings */}
          <polygon points={outerRing} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
          <polygon points={midRing} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
          <polygon points={innerRing} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Radial Axis Spokes */}
          <line x1={cx} y1={cy} x2={cx} y2={cy - maxR} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <line x1={cx} y1={cy} x2={cx + maxR * Math.cos((Math.PI / 180) * 30)} y2={cy + maxR * Math.sin((Math.PI / 180) * 30)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <line x1={cx} y1={cy} x2={cx - maxR * Math.cos((Math.PI / 180) * 30)} y2={cy + maxR * Math.sin((Math.PI / 180) * 30)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

          {/* Dynamic Radar Area Polygon */}
          <motion.polygon
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            points={currentPolygon}
            fill="url(#radarFillGrad)"
            stroke="#06b6d4"
            strokeWidth="2"
          />

          {/* Vertex Anchor Dots */}
          <circle cx={cx} cy={cy - (metrics.retention.score / 100) * maxR} r="3" fill="#a855f7" className="shadow-lg" />
          <circle cx={cx + (metrics.velocity.score / 100) * maxR * Math.cos((Math.PI / 180) * 30)} cy={cy + (metrics.velocity.score / 100) * maxR * Math.sin((Math.PI / 180) * 30)} r="3" fill="#06b6d4" />
          <circle cx={cx - (metrics.depth.score / 100) * maxR * Math.cos((Math.PI / 180) * 30)} cy={cy + (metrics.depth.score / 100) * maxR * Math.sin((Math.PI / 180) * 30)} r="3" fill="#10b981" />
        </svg>

        {/* Floating Axis Labels */}
        <div className="absolute top-1 text-center font-mono text-[10px] text-purple-300 font-bold bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-md">
          Retention: {metrics.retention.score}%
        </div>
        <div className="absolute bottom-1 right-2 text-right font-mono text-[10px] text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md">
          Velocity: {metrics.velocity.score}%
        </div>
        <div className="absolute bottom-1 left-2 text-left font-mono text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
          Depth: {metrics.depth.score}%
        </div>
      </div>

      {/* Footer Metrics Breakdown */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-850/80 font-mono text-xs text-center">
        <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
          <span className="text-[9px] text-zinc-500 block uppercase">RETENTION</span>
          <span className="text-purple-300 font-bold">{metrics.retention.label}</span>
        </div>
        <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
          <span className="text-[9px] text-zinc-500 block uppercase">VELOCITY</span>
          <span className="text-cyan-300 font-bold">{metrics.velocity.label}</span>
        </div>
        <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5">
          <span className="text-[9px] text-zinc-500 block uppercase">DEPTH</span>
          <span className="text-emerald-300 font-bold">{metrics.depth.label}</span>
        </div>
      </div>
    </div>
  );
};
