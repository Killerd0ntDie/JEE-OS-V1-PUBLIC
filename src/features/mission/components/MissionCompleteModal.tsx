import React from 'react';
import { motion } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { Flame, Zap, Clock, ArrowRight, Activity, Award } from 'lucide-react';
import { SubjectDetail } from './MissionSubjectSwitcherWidget';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

export interface MissionCompleteModalProps {
  isCompleted: boolean;
  activeDetails: SubjectDetail;
  seconds: number;
  streak: number;
  idleTime: number;
  focusInterruptions: number;
  focusScore: number;
  onComplete: (data: { duration: number; questions: number; xp: number; streak: number; idleTime: number; focusInterruptions: number; focusScore: number; }) => void;
  onNextSubject: () => void;
}

export function MissionCompleteModal({
  isCompleted,
  activeDetails,
  seconds,
  streak,
  idleTime,
  focusInterruptions,
  focusScore,
  onComplete,
  onNextSubject
}: MissionCompleteModalProps) {
  useLockBodyScroll(true);

  // Berserk Overdrive bonus (>95% focus for 45+ mins)
  const isBerserk = (seconds >= 2700 && focusScore >= 95);
  const baseXP = Math.floor(seconds / 60) * 5;
  const finalXP = isBerserk ? Math.floor(baseXP * 1.5) : baseXP;

  return (
    <Modal 
      isOpen={isCompleted} 
      onClose={onNextSubject} 
      zIndex={10001} 
      backdropClassName="bg-black/35 backdrop-blur-md"
      className="max-w-xl w-full p-6 sm:p-8 space-y-6 text-center rounded-3xl relative overflow-hidden"
      style={{
        background: 'rgba(10, 14, 23, 0.90)',
        backdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
        border: '1.5px solid rgba(239, 68, 68, 0.45)',
        borderTop: '2px solid rgba(239, 68, 68, 0.75)',
        boxShadow: '0 30px 90px rgba(0, 0, 0, 0.85), 0 0 70px rgba(239, 68, 68, 0.2)'
      }}
    >
      {/* Top Hazard Warning Tape Ribbon */}
      <div 
        className="absolute top-0 inset-x-0 h-1.5 opacity-70"
        style={{
          background: 'repeating-linear-gradient(-45deg, #ef4444 0px, #ef4444 8px, transparent 8px, transparent 16px)'
        }}
      />

      {/* Micro Corner Caliper Accents */}
      <div className="absolute top-2.5 left-3 text-[10px] font-mono text-red-500/60 font-bold select-none">+</div>
      <div className="absolute top-2.5 right-3 text-[10px] font-mono text-red-500/60 font-bold select-none">+</div>
      <div className="absolute bottom-2.5 left-3 text-[10px] font-mono text-red-500/60 font-bold select-none">+</div>
      <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-red-500/60 font-bold select-none">+</div>

      {/* 1. CINEMATIC EVANGELION MAGI OPERATION COMPLETE STAMP */}
      <div className="relative space-y-3 z-10 pt-1">
        
        {/* MAGI Consensus Decision Badges */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          {[
            { name: 'MELCHIOR-1', status: 'AGREE' },
            { name: 'BALTHASAR-2', status: 'AGREE' },
            { name: 'CASPER-3', status: 'AGREE' }
          ].map(magi => (
            <span 
              key={magi.name} 
              className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/50 text-emerald-400 text-[8.5px] font-mono font-bold tracking-wider uppercase shadow-sm"
            >
              {magi.name} [{magi.status}]
            </span>
          ))}
        </div>

        {/* Angled High-Impact Red-and-Gold Evangelion Banner */}
        <motion.div 
          initial={{ scale: 0.85, y: -10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={springs.snappy}
          className="relative inline-block px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-950/90 via-red-900/90 to-red-950/90 border-2 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.4)]"
        >
          <div className="text-[9px] font-mono tracking-[0.3em] text-red-300 font-bold uppercase">
            極秘 // 作戦完了 • CLASSIFIED
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white uppercase drop-shadow-md">
            殲滅 : OPERATION COMPLETE
          </h1>
          <div className="text-[8.5px] font-mono tracking-[0.25em] text-amber-400 font-extrabold uppercase">
            [ TARGET OBJECTIVE DESTROYED // DATA LOGGED ]
          </div>
        </motion.div>

        <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
          Memory cells and focus checkpoints for <span className="text-white font-bold">{activeDetails.chapter}</span> have been synchronized and logged in JEE OS.
        </p>
      </div>

      {/* 2. CORE PERFORMANCE ANALYTICS SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-left relative z-10 p-3.5 rounded-2xl bg-zinc-950/70 border border-white/10 shadow-inner">
        
        {/* Stat 1: Study duration */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[8.5px] font-mono text-zinc-500 uppercase font-bold">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>活動時間</span>
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-white">
            {Math.floor(seconds / 3600) > 0 ? `${Math.floor(seconds / 3600)}h ` : ''}
            {Math.floor((seconds % 3600) / 60)}m
          </div>
          <span className="text-[8px] font-mono text-zinc-500 block">Logged Time</span>
        </div>

        {/* Stat 2: Focus Score */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[8.5px] font-mono text-zinc-500 uppercase font-bold">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>集中度</span>
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-white">
            {focusScore}%
          </div>
          <span className="text-[8px] font-mono text-emerald-400 block font-semibold">
            {focusInterruptions === 0 ? 'Zero Pauses' : `${focusInterruptions} Pauses`}
          </span>
        </div>

        {/* Stat 3: Earned XP */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[8.5px] font-mono text-zinc-500 uppercase font-bold">
            <Zap className={`w-3 h-3 ${isBerserk ? 'text-amber-400 animate-pulse' : 'text-indigo-400'}`} />
            <span>獲得XP</span>
          </div>
          <div className={`text-sm sm:text-base font-black font-mono ${isBerserk ? 'text-amber-400' : 'text-indigo-300'}`}>
            +{finalXP} XP
          </div>
          <span className={`text-[8px] font-mono block font-semibold ${isBerserk ? 'text-amber-300 font-bold' : 'text-zinc-500'}`}>
            {isBerserk ? '⚡ 1.5x Berserk' : 'Standard'}
          </span>
        </div>

        {/* Stat 4: Daily Streak */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[8.5px] font-mono text-zinc-500 uppercase font-bold">
            <Flame className="w-3 h-3 text-orange-400" />
            <span>連続記録</span>
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-white">
            {streak} Days
          </div>
          <span className="text-[8px] font-mono text-orange-400 block font-semibold">+1 Extended</span>
        </div>

      </div>

      {/* 3. PRIMARY ACTION CTAs */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 relative z-10">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={springs.snappy}
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            onComplete({
              duration: seconds,
              questions: 0,
              xp: finalXP,
              streak,
              idleTime,
              focusInterruptions,
              focusScore
            });
          }}
          className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 cursor-pointer border border-emerald-400/40"
        >
          <span>Log & Review Debrief</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={springs.snappy}
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            onNextSubject();
          }}
          className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-white/10 text-zinc-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer"
        >
          Return to Deck
        </motion.button>
      </div>

    </Modal>
  );
}
