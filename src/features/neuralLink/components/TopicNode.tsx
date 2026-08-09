import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'motion/react';
import { Brain, Sparkles, CheckCircle2 } from 'lucide-react';

export const TopicNode = ({ data }: { data: any }) => {
  const isMastered = data.status === 'Mastered';
  const isCompleted = data.status === 'Completed';
  const isInProgress = data.status === 'In Progress';

  const subjectColors: Record<string, string> = {
    physics: 'from-sky-500/20 to-sky-900/40 border-sky-500/50 text-sky-400',
    chemistry: 'from-emerald-500/20 to-emerald-900/40 border-emerald-500/50 text-emerald-400',
    maths: 'from-indigo-500/20 to-indigo-900/40 border-indigo-500/50 text-indigo-400',
  };

  const subjectGlows: Record<string, string> = {
    physics: 'shadow-[0_0_30px_rgba(56,189,248,0.3)]',
    chemistry: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    maths: 'shadow-[0_0_30px_rgba(99,102,241,0.3)]',
  };

  const colorClass = subjectColors[data.subject] || 'from-zinc-800 to-zinc-900 border-zinc-700 text-zinc-400';
  
  let stateClass = '';
  let glowClass = '';

  if (isMastered) {
    stateClass = `bg-gradient-to-br ${colorClass}`;
    glowClass = subjectGlows[data.subject] || '';
  } else if (isCompleted) {
    stateClass = `bg-zinc-900 border ${colorClass.split(' ')[2]}`;
  } else if (isInProgress) {
    stateClass = `bg-zinc-900 border-dashed border-2 ${colorClass.split(' ')[2]}`;
  } else {
    stateClass = 'bg-zinc-950/80 border border-zinc-800 text-zinc-400';
  }

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative w-48 rounded-xl p-3 backdrop-blur-md transition-all duration-300 ${stateClass} ${glowClass}`}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-zinc-400 !border-none" />
      
      <div className="flex flex-col gap-2 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest opacity-80">
            {data.subject}
          </span>
          {isMastered && <CheckCircle2 className="w-3.5 h-3.5 opacity-80" />}
          {isInProgress && <Sparkles className="w-3.5 h-3.5 animate-pulse opacity-80" />}
          {!isMastered && !isInProgress && !isCompleted && <Brain className="w-3.5 h-3.5 opacity-40" />}
        </div>
        
        <h3 className={`text-xs font-display font-bold leading-tight ${isMastered ? 'text-white' : ''}`}>
          {data.label}
        </h3>
        
        <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden mt-1">
          <div 
            className="h-full bg-current transition-all duration-1000"
            style={{ width: `${data.masteryScore}%` }}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-zinc-400 !border-none" />
    </motion.div>
  );
};
