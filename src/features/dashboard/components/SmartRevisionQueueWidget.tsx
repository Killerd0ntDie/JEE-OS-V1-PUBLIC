import React from 'react';
import { Button } from '@/components/ui/Button';
import { RevisionCard } from '@/services/revisionEngineService';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Sparkles, Brain, Clock, Layers, Play, FlaskConical, Atom, Calculator, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

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

  const getSubjectBadge = (subjName?: string) => {
    const s = (subjName || '').toLowerCase();
    if (s.includes('chem') || s.includes('organic') || s.includes('bonding') || s.includes('block') || s.includes('acid') || s.includes('equilibrium')) {
      return {
        label: 'Chemistry',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        icon: FlaskConical,
        iconColor: 'text-emerald-400'
      };
    }
    if (s.includes('math') || s.includes('calculus') || s.includes('algebra') || s.includes('trig') || s.includes('vector') || s.includes('coordinate')) {
      return {
        label: 'Maths',
        badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        icon: Calculator,
        iconColor: 'text-purple-400'
      };
    }
    return {
      label: 'Physics',
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      icon: Atom,
      iconColor: 'text-sky-400'
    };
  };

  return (
    <div 
      style={{
        background: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(24px) saturate(190%)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)'
      }}
      className="rounded-2xl p-5 md:p-6 h-full flex flex-col justify-between shadow-sm relative overflow-hidden text-left"
    >
      {/* Top Hazard Warning Tape Ribbon */}
      <div 
        className="absolute top-0 inset-x-0 h-1 opacity-75 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(-45deg, #06b6d4 0px, #06b6d4 8px, transparent 8px, transparent 16px)'
        }}
      />

      {/* Caliper Crosshairs */}
      <span className="absolute top-2.5 left-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute top-2.5 right-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>
      <span className="absolute bottom-2.5 right-2.5 text-[9px] font-mono text-zinc-600 select-none pointer-events-none">+</span>

      <div className="space-y-4 relative z-10">
        {/* Header with Glowing Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white tracking-tight uppercase">
                記憶同期 // REVISION QUEUE
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono">
                SM-2 Active Recall Engine
              </p>
            </div>
          </div>
          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border shadow-sm uppercase ${
            queue.length > 0
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
          }`}>
            {queue.length} DUE
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="p-6 rounded-2xl border border-white/10 bg-zinc-950/60 text-center space-y-3 flex flex-col items-center justify-center my-auto font-mono">
            <motion.div 
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-sm"
            >
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </motion.div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white tracking-tight uppercase">MEMORY VAULT SECURE</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-sm">
                All studied chapters are retainable and locked in long-term memory. Spaced repetition engine schedules the next recall cycle for tomorrow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-left">
                <span className="text-[11px] text-zinc-400 font-medium block">SM-2 Algorithm</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5 font-mono">
                  <Sparkles className="w-3 h-3" /> OPTIMIZED
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-left">
                <span className="text-[11px] text-zinc-400 font-medium block">Next Schedule</span>
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1 mt-0.5 font-mono">
                  <Clock className="w-3 h-3" /> 08:00 AM
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[310px] overflow-y-auto custom-scrollbar pr-1 font-mono">
            {queue.map((rev, idx) => {
              const subj = getSubjectBadge(rev.chapterName);
              const SubjIcon = subj.icon;

              return (
                <motion.div
                  key={rev.chapterId || idx}
                  whileHover={{ x: 2 }}
                  transition={springs.snappy}
                  className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/10 hover:border-indigo-500/40 transition-colors flex items-center justify-between gap-3 shadow-sm group"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border flex items-center gap-1 ${subj.badgeClass}`}>
                        <SubjIcon className={`w-3 h-3 ${subj.iconColor}`} />
                        {subj.label}
                      </span>
                      
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border shadow-sm uppercase ${
                        rev.retentionStatus === 'Fresh' 
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' 
                          : rev.retentionStatus === 'Stable' 
                          ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40' 
                          : rev.retentionStatus === 'Fading'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-500/40' 
                          : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                      }`}>
                        {rev.retentionStatus}
                      </span>
                      
                      {rev.isCritical && (
                        <span className="text-[10px] text-rose-300 font-mono font-bold bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-lg shadow-sm uppercase">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                      {rev.chapterName}
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={springs.snappy}
                    onClick={() => {
                      audioEngine.playRadioRelayClick().catch(() => {});
                      onLaunchRevision(rev);
                    }}
                    className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider border border-indigo-400/40 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white transition-all shrink-0 rounded-xl cursor-pointer shadow-md shadow-indigo-600/25 flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Revise</span>
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation links at bottom */}
      <div className="pt-3.5 border-t border-white/10 flex justify-between gap-3 mt-3 relative z-10 font-mono">
        <motion.button 
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={springs.snappy}
          className="flex-1 text-xs font-mono font-bold h-9 border border-white/10 bg-zinc-950/60 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors select-none cursor-pointer flex items-center justify-center gap-1.5 shadow-sm uppercase tracking-wider"
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            navigate('/planner');
          }}
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span>Planner</span>
        </motion.button>
        <motion.button 
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={springs.snappy}
          className="flex-1 text-xs font-mono font-bold h-9 border border-white/10 bg-zinc-950/60 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors select-none cursor-pointer flex items-center justify-center gap-1.5 shadow-sm uppercase tracking-wider"
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            navigate('/ai-coach');
          }}
        >
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span>AI Coach</span>
        </motion.button>
      </div>
    </div>
  );
}
