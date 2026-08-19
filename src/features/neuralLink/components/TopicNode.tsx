import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'motion/react';
import { Sparkles, CheckCircle2, Zap, Flame, Award } from 'lucide-react';
import { NeuralNodeData } from '@jee-os/engines';

export const TopicNode = ({ data, selected }: { data: NeuralNodeData; selected?: boolean }) => {
  const isMastered = data.status === 'Mastered';
  const isCompleted = data.status === 'Completed';
  const isInProgress = data.status === 'In Progress';
  const isDecaying = data.isDecaying;
  const isSelected = selected || data.isSelected;

  // Extract index/serial for Japanese Stamp
  const serialMatch = (data.id || '').match(/\d+/);
  const chapterNumber = serialMatch ? serialMatch[0].padStart(2, '0') : '01';

  // Dynamic styling based on Graph Mode (Flow, Decay, Weightage)
  let modeBadge = null;
  let modeBorder = 'border-white/10';
  let modeGlow = '';

  if (data.graphMode === 'decay' && isDecaying) {
    modeBadge = (
      <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60 flex items-center gap-1 shrink-0 animate-pulse">
        <Flame className="w-2.5 h-2.5" />
        Decaying ({data.lastRevisedDaysAgo}d)
      </span>
    );
    modeBorder = 'border-amber-500/80';
    modeGlow = 'shadow-[0_0_35px_rgba(245,158,11,0.45)] ring-1 ring-amber-500/70 animate-pulse';
  } else if (data.graphMode === 'weightage' && data.isHighWeightage) {
    modeBadge = (
      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1 shrink-0">
        <Award className="w-2.5 h-2.5" />
        High Yield ({data.weightage}%)
      </span>
    );
    modeBorder = 'border-emerald-500/80';
    modeGlow = 'shadow-[0_0_30px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/50';
  } else if (isMastered) {
    modeBorder = 'border-emerald-400/70';
    modeGlow = 'shadow-[0_0_35px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/50';
  } else if (isDecaying) {
    modeBorder = 'border-amber-500/70';
    modeGlow = 'shadow-[0_0_30px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/60 animate-pulse';
  }

  // Base subject color mapping
  const subjectThemes: Record<string, { ribbon: string; border: string; glow: string; text: string; bg: string; dot: string }> = {
    physics: {
      ribbon: 'repeating-linear-gradient(-45deg, #0ea5e9 0px, #0ea5e9 8px, transparent 8px, transparent 16px)',
      border: 'hover:border-sky-500/60',
      glow: 'shadow-[0_0_25px_rgba(14,165,233,0.25)]',
      text: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
      dot: '#0ea5e9'
    },
    chemistry: {
      ribbon: 'repeating-linear-gradient(-45deg, #10b981 0px, #10b981 8px, transparent 8px, transparent 16px)',
      border: 'hover:border-emerald-500/60',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.25)]',
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      dot: '#10b981'
    },
    maths: {
      ribbon: 'repeating-linear-gradient(-45deg, #a855f7 0px, #a855f7 8px, transparent 8px, transparent 16px)',
      border: 'hover:border-violet-500/60',
      glow: 'shadow-[0_0_25px_rgba(168,85,247,0.25)]',
      text: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      dot: '#a855f7'
    },
  };

  const theme = subjectThemes[data.subject] || subjectThemes.physics;

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      style={{
        background: 'rgba(12, 16, 26, 0.94)',
        backdropFilter: 'blur(20px) saturate(180%)',
      }}
      className={`relative w-[270px] rounded-2xl p-3.5 border transition-all duration-200 cursor-pointer select-none text-left overflow-hidden ${
        isSelected
          ? 'border-indigo-500 shadow-[0_0_35px_rgba(99,102,241,0.5)] ring-2 ring-indigo-400/80'
          : modeGlow ? `${modeBorder} ${modeGlow}` : `border-zinc-800/80 ${theme.border} hover:shadow-xl hover:border-zinc-700`
      }`}
    >
      {/* Top Subject Hazard Caution Stripes Ribbon */}
      <div 
        className="absolute top-0 inset-x-0 h-0.5 opacity-80 pointer-events-none"
        style={{ background: theme.ribbon }}
      />

      {/* Multi-directional handles for clean serpentine circuit flow */}
      <Handle 
        id="target-left"
        type="target" 
        position={Position.Left} 
        className="!w-2 !h-2 !bg-indigo-400 !border !border-zinc-950 shadow-[0_0_6px_rgba(99,102,241,0.8)]" 
      />
      <Handle 
        id="source-left"
        type="source" 
        position={Position.Left} 
        className="!w-2 !h-2 !bg-indigo-400 !border !border-zinc-950 shadow-[0_0_6px_rgba(99,102,241,0.8)]" 
      />
      <Handle 
        id="target-top"
        type="target" 
        position={Position.Top} 
        className="!w-2 !h-2 !bg-indigo-400 !border !border-zinc-950 shadow-[0_0_6px_rgba(99,102,241,0.8)]" 
      />
      <Handle 
        id="source-bottom"
        type="source" 
        position={Position.Bottom} 
        className="!w-2 !h-2 !bg-indigo-400 !border !border-zinc-950 shadow-[0_0_6px_rgba(99,102,241,0.8)]" 
      />
      <Handle 
        id="target-right"
        type="target" 
        position={Position.Right} 
        className="!w-2 !h-2 !bg-indigo-400 !border !border-zinc-950 shadow-[0_0_6px_rgba(99,102,241,0.8)]" 
      />
      <Handle 
        id="source-right"
        type="source" 
        position={Position.Right} 
        className="!w-2 !h-2 !bg-indigo-400 !border !border-zinc-950 shadow-[0_0_6px_rgba(99,102,241,0.8)]" 
      />
      
      <div className="flex flex-col gap-2 relative z-10">
        {/* Header: Node Stamp & Status Badge */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 uppercase shrink-0">
              CH.{chapterNumber}
            </span>
            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border truncate max-w-[110px] ${theme.bg} ${theme.text}`}>
              {data.unit}
            </span>
          </div>
          
          {modeBadge ? modeBadge : isMastered ? (
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Mastered
            </span>
          ) : isInProgress ? (
            <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/60 flex items-center gap-1 shrink-0">
              <Sparkles className="w-2.5 h-2.5 animate-pulse" />
              In Flight
            </span>
          ) : isCompleted ? (
            <span className="text-[9px] font-mono font-bold text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/60 flex items-center gap-1 shrink-0">
              <Zap className="w-2.5 h-2.5" />
              Practiced
            </span>
          ) : (
            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900/80 px-1.5 py-0.5 rounded border border-white/5 shrink-0">
              Not Started
            </span>
          )}
        </div>
        
        {/* Chapter Title in Tactical Typography */}
        <h3 className="text-xs font-bold text-white leading-snug line-clamp-2 tracking-tight">
          {data.label}
        </h3>
        
        {/* Progress Bar & Telemetry */}
        <div className="space-y-1 pt-0.5 font-mono">
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>MASTERY: <strong className="text-white font-bold">{data.masteryScore}%</strong></span>
            <span className="text-zinc-400">{data.completedLectures}/{data.totalLectures} LEC</span>
          </div>
          
          <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/10 p-0.25">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                isMastered 
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                  : isInProgress 
                  ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' 
                  : isCompleted 
                  ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]' 
                  : 'bg-zinc-700'
              }`}
              style={{ width: `${Math.max(4, data.masteryScore)}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
