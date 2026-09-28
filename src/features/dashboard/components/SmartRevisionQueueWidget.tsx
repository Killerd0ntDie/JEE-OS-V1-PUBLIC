import React, { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { RevisionCard, RevisionEngineService } from '@/services/revisionEngineService';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Sparkles, Brain, Clock, Layers, Play, FlaskConical, Atom, Calculator, Calendar, ArrowRight, Zap, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

interface SmartRevisionQueueWidgetProps {
  revisionQueue: RevisionCard[];
  onLaunchRevision: (rev: RevisionCard | null) => void;
}

export function SmartRevisionQueueWidget({
  revisionQueue = [],
  onLaunchRevision
}: SmartRevisionQueueWidgetProps) {
  const navigate = useNavigate();
  const dayStartTime = useStudyBrainStore(state => state.settings?.dayStartTime) || '07:00';
  const chapters = useStudyBrainStore(state => state.chapters) || [];
  const queue = revisionQueue || [];

  // Calculate Memory Vault stats from candidate's studied syllabus
  const vaultChapters = useMemo(() => {
    return chapters.filter(c => 
      !c.chapterOnHold &&
      (c.status === 'Mastered' || c.status === 'Revision Due' || c.status === 'Theory Complete' || c.syllabusStage === 'Revision' || c.theoryComplete || c.dppComplete || (c.completion && c.completion >= 50))
    );
  }, [chapters]);

  const avgRetention = useMemo(() => {
    if (vaultChapters.length === 0) return 100;
    const total = vaultChapters.reduce((acc, c) => {
      const { retention } = RevisionEngineService.estimateRetention(c);
      return acc + retention;
    }, 0);
    return Math.round(total / vaultChapters.length);
  }, [vaultChapters]);

  const formatScheduleTime = (timeStr: string) => {
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10) || 7;
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

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
      className="rounded-2xl p-5 md:p-6 h-full flex flex-col justify-between shadow-sm relative overflow-hidden text-left font-mono"
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

      <div className="space-y-3.5 relative z-10">
        {/* Header with Glowing Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white tracking-tight uppercase">
                <span className="eva-japanese-badge">記憶同期 // </span>REVISION QUEUE
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono">
                SM-2 Spaced Repetition Engine
              </p>
            </div>
          </div>
          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border shadow-sm uppercase ${
            queue.length > 0
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 animate-pulse'
              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
          }`}>
            {queue.length} DUE
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-zinc-950/60 text-center space-y-3 flex flex-col items-center justify-center my-auto font-mono">
            <motion.div 
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-sm"
            >
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </motion.div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white tracking-tight uppercase">MEMORY VAULT SECURE</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-sm">
                All studied chapters are retainable and locked in long-term memory. Spaced repetition engine schedules the next recall cycle for tomorrow.
              </p>
            </div>

            {/* Live Vault Telemetry */}
            <div className="grid grid-cols-2 gap-2 w-full pt-1">
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-white/10 text-left">
                <span className="text-[10px] text-zinc-400 font-medium block">Vault Health</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5 font-mono">
                  <Sparkles className="w-3 h-3" /> {avgRetention}% Retained ({vaultChapters.length} locked)
                </span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-white/10 text-left">
                <span className="text-[10px] text-zinc-400 font-medium block">Next Recall</span>
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1 mt-0.5 font-mono">
                  <Clock className="w-3 h-3" /> {formatScheduleTime(dayStartTime)}
                </span>
              </div>
            </div>

            {/* DOOMSDAY PACE SAFEGUARD CALLOUT */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-cyan-950/30 border border-emerald-500/20 text-left font-mono text-[11px] space-y-1 w-full">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px] uppercase">
                  <Zap className="w-3 h-3 text-emerald-400" /> DOOMSDAY VELOCITY SAFEGUARD
                </span>
                <span className="text-[10px] text-zinc-400 font-mono font-semibold">{vaultChapters.length} in Vault</span>
              </div>
              <p className="text-zinc-300 font-sans leading-relaxed text-[11px]">
                SM-2 consolidation protects your {vaultChapters.length} studied chapters against Ebbinghaus decay. Preventing knowledge loss saves ~{Math.max(1, vaultChapters.length * 3)}h of relearning, keeping your daily pace on target.
              </p>
            </div>

            {/* PROACTIVE DRILL CTA */}
            <button
              type="button"
              onClick={() => {
                audioEngine.playPowerUp().catch(() => {});
                navigate('/revision');
              }}
              className="w-full py-2 px-3 bg-cyan-600/20 hover:bg-cyan-600/35 text-cyan-300 hover:text-white border border-cyan-500/40 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Proactive Speed Recall Drill</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 font-mono">
            {/* Decay Alert Callout linking to Doomsday Pace */}
            <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-left text-xs font-mono flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2 text-rose-300 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 animate-pulse" />
                <span>{queue.length} Chapter{queue.length > 1 ? 's' : ''} in Decay Risk</span>
              </div>
              <span className="text-[10px] text-rose-400/80 font-bold uppercase">Protect Velocity</span>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
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
                        {rev.healthScore !== undefined && (
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            rev.healthScore >= 75 ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20' :
                            rev.healthScore >= 50 ? 'text-amber-400 bg-amber-950/40 border border-amber-500/20' :
                            'text-red-400 bg-red-950/40 border border-red-500/20'
                          }`}>
                            Health: {rev.healthScore}%
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate" title={rev.chapterName}>
                        {rev.chapterName}
                      </h4>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                        <span className="text-cyan-300 font-medium">{rev.reason || 'Recall Due'}</span>
                        {rev.estimatedTime && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            {rev.estimatedTime}m
                          </span>
                        )}
                      </div>
                    </div>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      transition={springs.snappy}
                      onClick={() => {
                        audioEngine.playRadioRelayClick().catch(() => {});
                        onLaunchRevision(rev);
                      }}
                      className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-indigo-400/40 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white transition-all shrink-0 rounded-xl cursor-pointer shadow-md shadow-indigo-600/25 flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Revise</span>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation links at bottom */}
      <div className="pt-3 border-t border-white/10 flex justify-between gap-3 mt-3 relative z-10 font-mono">
        <motion.button 
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={springs.snappy}
          className="flex-1 text-xs font-mono font-bold h-9 border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 hover:text-white hover:bg-cyan-900/50 rounded-xl transition-colors select-none cursor-pointer flex items-center justify-center gap-1.5 shadow-sm uppercase tracking-wider"
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            navigate('/revision');
          }}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Revision Hub</span>
        </motion.button>
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
      </div>
    </div>
  );
}
