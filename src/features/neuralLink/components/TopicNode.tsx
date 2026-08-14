import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'motion/react';
import { Brain, Sparkles, CheckCircle2, AlertTriangle, Zap, Flame, Award } from 'lucide-react';
import { NeuralNodeData } from '@jee-os/engines';

export const TopicNode = ({ data, selected }: { data: NeuralNodeData; selected?: boolean }) => {
  const isMastered = data.status === 'Mastered';
  const isCompleted = data.status === 'Completed';
  const isInProgress = data.status === 'In Progress';
  const isDecaying = data.isDecaying;
  const isSelected = selected || data.isSelected;

  // Dynamic styling based on Graph Mode (Flow, Decay, Weightage)
  let modeBadge = null;
  let modeBorder = 'border-zinc-800/80';
  let modeGlow = '';

  if (data.graphMode === 'decay' && isDecaying) {
    modeBadge = (
      <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60 flex items-center gap-1 shrink-0 animate-pulse">
        <Flame className="w-2.5 h-2.5" />
        Decaying ({data.lastRevisedDaysAgo}d)
      </span>
    );
    modeBorder = 'border-amber-500/80';
    modeGlow = 'shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/50';
  } else if (data.graphMode === 'weightage' && data.isHighWeightage) {
    modeBadge = (
      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1 shrink-0">
        <Award className="w-2.5 h-2.5" />
        High Yield ({data.weightage}%)
      </span>
    );
    modeBorder = 'border-emerald-500/80';
    modeGlow = 'shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50';
  }

  // Base subject color mapping
  const subjectThemes: Record<string, { border: string; glow: string; text: string; bg: string }> = {
    physics: {
      border: 'hover:border-sky-500/60',
      glow: 'shadow-[0_0_25px_rgba(56,189,248,0.2)]',
      text: 'text-sky-400',
      bg: 'bg-sky-500/10'
    },
    chemistry: {
      border: 'hover:border-emerald-500/60',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.2)]',
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    maths: {
      border: 'hover:border-violet-500/60',
      glow: 'shadow-[0_0_25px_rgba(139,92,246,0.2)]',
      text: 'text-violet-400',
      bg: 'bg-violet-500/10'
    },
  };

  const theme = subjectThemes[data.subject] || subjectThemes.physics;

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`relative w-64 glass-panel bg-zinc-950/90 backdrop-blur-2xl rounded-2xl p-3.5 border transition-all duration-200 cursor-pointer select-none text-left ${
        isSelected
          ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] ring-2 ring-indigo-400/80'
          : modeGlow ? `${modeBorder} ${modeGlow}` : `border-zinc-800 ${theme.border} hover:shadow-xl`
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-zinc-900" />
      
      <div className="flex flex-col gap-2 relative z-10">
        {/* Unit & Status Line */}
        <div className="flex items-center justify-between gap-1.5">
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[120px] ${theme.bg} ${theme.text}`}>
            {data.unit}
          </span>
          
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
            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded shrink-0">
              Not Started
            </span>
          )}
        </div>
        
        {/* Chapter Title */}
        <h3 className="text-xs font-display font-bold text-white leading-snug line-clamp-2">
          {data.label}
        </h3>
        
        {/* Progress Bar & Telemetry */}
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>Mastery: <strong className="text-white font-bold">{data.masteryScore}%</strong></span>
            <span>{data.completedLectures}/{data.totalLectures} Lec</span>
          </div>
          
          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                isMastered ? 'bg-emerald-500' : isInProgress ? 'bg-indigo-500' : isCompleted ? 'bg-sky-500' : 'bg-zinc-700'
              }`}
              style={{ width: `${Math.max(4, data.masteryScore)}%` }}
            />
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-zinc-900" />
    </motion.div>
  );
};
