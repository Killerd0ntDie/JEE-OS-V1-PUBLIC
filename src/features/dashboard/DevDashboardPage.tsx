import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useDashboardState } from './hooks/useDashboardState';
import { calculateCurrentStreak, getTodayStudyMinutes } from '@/utils/streakCalculations';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';
import { 
  Zap, 
  Flame, 
  Target, 
  Clock, 
  Award, 
  Shield, 
  ChevronRight, 
  Activity, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  RotateCcw,
  Sliders,
  Compass,
  Cpu,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export function DevDashboardPage() {
  const navigate = useNavigate();
  const { state, handlers } = useDashboardState();
  const todayMissions = useStudyBrainStore(s => s.todayMissions);
  const studySessions = useStudyBrainStore(s => s.studySessions || []);
  const settings = useStudyBrainStore(s => s.settings);
  const xp = useStudyBrainStore(s => s.xp);
  const chapters = useStudyBrainStore(s => s.chapters);
  const mistakes = useStudyBrainStore(s => (s as any).mistakes || []);

  const minStreakMins = Math.round((settings?.minStreakHours ?? 0.5) * 60);
  const computedStreak = useMemo(() => calculateCurrentStreak(studySessions, minStreakMins), [studySessions, minStreakMins]);
  const todayStudyMins = useMemo(() => getTodayStudyMinutes(studySessions), [studySessions]);

  // Plasma reactor rotation pulse
  const [reactorPower, setReactorPower] = useState(1);
  const [activeMagiCore, setActiveMagiCore] = useState<'melchior' | 'balthasar' | 'casper'>('melchior');

  // Math, Physics, Chem Chapters Breakdown
  const mathChaps = useMemo(() => chapters.filter(c => c.subject === 'maths'), [chapters]);
  const physChaps = useMemo(() => chapters.filter(c => c.subject === 'physics'), [chapters]);
  const chemChaps = useMemo(() => chapters.filter(c => c.subject === 'chemistry'), [chapters]);

  const calcMastery = (chaps: any[]) => {
    if (!chaps.length) return 0;
    const sum = chaps.reduce((acc, c) => acc + (c.completion || 0), 0);
    return Math.round(sum / chaps.length);
  };

  const mathMastery = calcMastery(mathChaps);
  const physMastery = calcMastery(physChaps);
  const chemMastery = calcMastery(chemChaps);

  // Active missions per subject
  const mathMission = todayMissions.find(m => m.subject === 'maths' && !m.completed);
  const physMission = todayMissions.find(m => m.subject === 'physics' && !m.completed);
  const chemMission = todayMissions.find(m => m.subject === 'chemistry' && !m.completed);

  // XP Progress Calculation
  const currentXP = xp?.total || 0;
  const level = xp?.level || 1;
  const nextLevelXP = level * 500;
  const xpProgress = Math.min(100, Math.round((currentXP % 500) / 5));

  const handleLaunchSubject = (missionId?: string, fallbackSubject?: string) => {
    audioEngine.playAnimeLaserCharge().catch(() => {});
    if (missionId) {
      navigate(`/cockpit/${missionId}`);
    } else {
      navigate(`/cockpit`);
    }
  };

  return (
    <div className="w-full min-h-full pb-16 space-y-6 text-zinc-100 font-sans select-none animate-fade-in">
      
      {/* 1. TOP TACTICAL HUD HEADER & S² ENGINE STATUS */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.snappy}
        style={{
          background: 'rgba(10, 14, 23, 0.88)',
          backdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)'
        }}
        className="p-5 sm:p-6 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        {/* Top Hazard Warning Tape Ribbon */}
        <div 
          className="absolute top-0 inset-x-0 h-1 opacity-70"
          style={{
            background: 'repeating-linear-gradient(-45deg, #6366f1 0px, #6366f1 8px, transparent 8px, transparent 16px)'
          }}
        />

        {/* Left: Tactical Command Title & Pilot Badges */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.25)] shrink-0">
            <Target className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-[9px] font-mono font-bold tracking-widest uppercase">
                極秘 // GEO-FRONT CENTRAL COMMAND
              </span>
              <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                MAGI 3/3 SYNC
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white uppercase flex items-center gap-2">
              <span>TACTICAL COMMAND DECK</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono">
                DEV PREVIEW
              </span>
            </h1>

            <p className="text-xs text-zinc-400 font-mono flex items-center gap-2">
              <span>PILOT: <strong className="text-white">{state.userName}</strong></span>
              <span>•</span>
              <span>S² REACTOR: <strong className="text-emerald-400">100% NOMINAL</strong></span>
            </p>
          </div>
        </div>

        {/* Right: Quick Switch to Standard Dashboard */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              audioEngine.playRadioRelayClick().catch(() => {});
              navigate('/dashboard');
            }}
            className="px-4 py-2.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Standard Deck</span>
          </button>

          <button
            onClick={() => handleLaunchSubject()}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-900/40 flex items-center gap-2 cursor-pointer border border-indigo-400/40"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Launch Cockpit</span>
          </button>
        </div>
      </motion.div>

      {/* 2. CORE ROW: S² PLASMA REACTOR & DAILY METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WIDGET 1: S² ENGINE PLASMA REACTOR (STREAK & XP CORE) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springs.snappy}
          style={{
            background: 'rgba(10, 14, 23, 0.88)',
            backdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
            border: '1.5px solid rgba(245, 158, 11, 0.4)',
            borderTop: '2px solid rgba(245, 158, 11, 0.7)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 45px rgba(245, 158, 11, 0.12)'
          }}
          className="p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between"
        >
          {/* Reactor Top Tag */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                S² ENGINE PLASMA CORE
              </span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold uppercase">
              {computedStreak > 0 ? `${computedStreak}-DAY IGNITION` : 'STANDBY'}
            </span>
          </div>

          {/* Central Animated Rotating Reactor Graphic */}
          <div className="relative py-6 flex items-center justify-center">
            {/* Ambient Background Aura */}
            <motion.div 
              animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-44 h-44 rounded-full bg-amber-500/20 blur-3xl"
            />

            {/* SVG Concentric Rotating Kinetic Rings */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="eva-kinetic-ring w-full h-full absolute inset-0 animate-[spin_20s_linear_infinite]">
                <circle 
                  cx="80" 
                  cy="80" 
                  r="72" 
                  className="stroke-amber-500/30 fill-none" 
                  strokeWidth="1.5" 
                  strokeDasharray="6 8"
                />
              </svg>

              <svg viewBox="0 0 160 160" className="eva-kinetic-ring w-full h-full absolute inset-0 animate-[spin_12s_linear_infinite_reverse]">
                <circle 
                  cx="80" 
                  cy="80" 
                  r="62" 
                  className="stroke-orange-500/40 fill-none" 
                  strokeWidth="2" 
                  strokeDasharray="14 10"
                />
              </svg>

              <svg viewBox="0 0 160 160" className="eva-kinetic-ring w-full h-full absolute inset-0 animate-[spin_6s_linear_infinite]">
                <circle 
                  cx="80" 
                  cy="80" 
                  r="52" 
                  className="stroke-amber-400 fill-none" 
                  strokeWidth="2.5" 
                  strokeDasharray="4 6"
                />
              </svg>

              {/* Center Core Info */}
              <div className="relative z-10 text-center space-y-0.5">
                <span className="text-3xl font-black font-mono text-white block tracking-tight">
                  {computedStreak}
                </span>
                <span className="text-[9.5px] font-mono uppercase font-bold text-amber-300 tracking-wider block">
                  DAY STREAK
                </span>
                <span className="text-[8.5px] font-mono text-zinc-500 block">
                  {todayStudyMins}m today
                </span>
              </div>
            </div>
          </div>

          {/* Reactor Energy Output Bar */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex justify-between text-[10.5px] font-mono">
              <span className="text-zinc-400">XP PROGRESSION (LVL {level})</span>
              <span className="text-amber-300 font-bold">+{currentXP} XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-900 border border-white/10 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* WIDGET 2: MAGI TRI-CORE NEURAL READINESS RADAR */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springs.snappy, delay: 0.05 }}
          style={{
            background: 'rgba(10, 14, 23, 0.88)',
            backdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
            border: '1.5px solid rgba(99, 102, 241, 0.4)',
            borderTop: '2px solid rgba(99, 102, 241, 0.7)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 45px rgba(99, 102, 241, 0.12)'
          }}
          className="p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between lg:col-span-2"
        >
          {/* Top MAGI Core Selectors */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-300 uppercase">
                MAGI TRI-CORE NEURAL SYNCHRONIZATION
              </span>
            </div>

            {/* 3 MAGI Consensus Badges */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'melchior' as const, name: 'MELCHIOR-1', subj: 'PHYSICS', mastery: physMastery, color: 'sky' },
                { id: 'balthasar' as const, name: 'BALTHASAR-2', subj: 'MATHS', mastery: mathMastery, color: 'purple' },
                { id: 'casper' as const, name: 'CASPER-3', subj: 'CHEMISTRY', mastery: chemMastery, color: 'emerald' }
              ].map(core => (
                <button
                  key={core.id}
                  onClick={() => {
                    audioEngine.playRadioRelayClick().catch(() => {});
                    setActiveMagiCore(core.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border ${
                    activeMagiCore === core.id
                      ? 'bg-indigo-600/40 border-indigo-400 text-white shadow-sm'
                      : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {core.name}
                </button>
              ))}
            </div>
          </div>

          {/* Central 3-Core Visual Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 py-4">
            
            {/* Core 1: Melchior (Physics) */}
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-sky-500/30 space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-center text-[9.5px] font-mono font-bold text-sky-400">
                <span>MELCHIOR // PHYSICS</span>
                <span>{physMastery}%</span>
              </div>
              <div className="text-xl font-black font-mono text-white">
                {physChaps.length} Chapters
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full" style={{ width: `${physMastery}%` }} />
              </div>
              <span className="text-[8.5px] font-mono text-zinc-500 block">Active Unit-00</span>
            </div>

            {/* Core 2: Balthasar (Maths) */}
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-purple-500/30 space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-center text-[9.5px] font-mono font-bold text-purple-400">
                <span>BALTHASAR // MATHS</span>
                <span>{mathMastery}%</span>
              </div>
              <div className="text-xl font-black font-mono text-white">
                {mathChaps.length} Chapters
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${mathMastery}%` }} />
              </div>
              <span className="text-[8.5px] font-mono text-zinc-500 block">Active Unit-01</span>
            </div>

            {/* Core 3: Casper (Chemistry) */}
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-emerald-500/30 space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-center text-[9.5px] font-mono font-bold text-emerald-400">
                <span>CASPER // CHEMISTRY</span>
                <span>{chemMastery}%</span>
              </div>
              <div className="text-xl font-black font-mono text-white">
                {chemChaps.length} Chapters
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${chemMastery}%` }} />
              </div>
              <span className="text-[8.5px] font-mono text-zinc-500 block">Active Unit-02</span>
            </div>

          </div>

          {/* Bottom Consensus Status */}
          <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/10">
            <span className="text-zinc-400">SYLLABUS READINESS STATUS:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CONSENSUS REACHED (READY FOR COMBAT)</span>
            </span>
          </div>
        </motion.div>

      </div>

      {/* 3. EVANGELION EVA UNIT TACTICAL MISSION PODS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-mono font-bold tracking-widest text-white uppercase">
              EVA UNIT TACTICAL SORTIE PODS // 稼働状況
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            Click pod to initiate Focus Cockpit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* POD 1: UNIT-01 [MATHS] */}
          <motion.div
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
            onClick={() => handleLaunchSubject(mathMission?.id, 'maths')}
            style={{
              background: 'rgba(20, 10, 30, 0.88)',
              backdropFilter: 'blur(28px)',
              border: '1.5px solid rgba(168, 85, 247, 0.45)',
              borderTop: '2px solid rgba(168, 85, 247, 0.8)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(168, 85, 247, 0.15)'
            }}
            className="p-5 sm:p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-4 cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-purple-400 font-bold uppercase block">
                  初号機 // EVA UNIT-01
                </span>
                <h3 className="text-lg font-black font-mono text-white uppercase mt-0.5">
                  MATHEMATICS
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[9px] font-mono font-bold">
                {mathMastery}% SYNC
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-[8.5px] font-mono text-zinc-400 uppercase font-semibold block">ACTIVE TARGET</span>
              <p className="text-xs font-mono font-bold text-white truncate">
                {mathMission?.chapterName || mathMission?.taskName || 'Matrices & Determinants'}
              </p>
              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1">
                <span>Duration: {mathMission?.duration || 75}m</span>
                <span className="text-purple-400 font-bold">+50 XP</span>
              </div>
            </div>

            <button className="w-full py-2.5 rounded-xl bg-purple-600/30 group-hover:bg-purple-600 border border-purple-500/50 group-hover:border-purple-400 text-purple-200 group-hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md">
              <Play className="w-3 h-3 fill-current" />
              <span>Launch Unit-01</span>
            </button>
          </motion.div>

          {/* POD 2: UNIT-00 [PHYSICS] */}
          <motion.div
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
            onClick={() => handleLaunchSubject(physMission?.id, 'physics')}
            style={{
              background: 'rgba(10, 20, 35, 0.88)',
              backdropFilter: 'blur(28px)',
              border: '1.5px solid rgba(56, 189, 248, 0.45)',
              borderTop: '2px solid rgba(56, 189, 248, 0.8)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.15)'
            }}
            className="p-5 sm:p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-4 cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-sky-400 font-bold uppercase block">
                  零号機 // EVA UNIT-00
                </span>
                <h3 className="text-lg font-black font-mono text-white uppercase mt-0.5">
                  PHYSICS
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-500/40 text-sky-300 text-[9px] font-mono font-bold">
                {physMastery}% SYNC
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-[8.5px] font-mono text-zinc-400 uppercase font-semibold block">ACTIVE TARGET</span>
              <p className="text-xs font-mono font-bold text-white truncate">
                {physMission?.chapterName || physMission?.taskName || 'Rotational Motion & Inertia'}
              </p>
              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1">
                <span>Duration: {physMission?.duration || 60}m</span>
                <span className="text-sky-400 font-bold">+50 XP</span>
              </div>
            </div>

            <button className="w-full py-2.5 rounded-xl bg-sky-600/30 group-hover:bg-sky-600 border border-sky-500/50 group-hover:border-sky-400 text-sky-200 group-hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md">
              <Play className="w-3 h-3 fill-current" />
              <span>Launch Unit-00</span>
            </button>
          </motion.div>

          {/* POD 3: UNIT-02 [CHEMISTRY] */}
          <motion.div
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
            onClick={() => handleLaunchSubject(chemMission?.id, 'chemistry')}
            style={{
              background: 'rgba(25, 12, 18, 0.88)',
              backdropFilter: 'blur(28px)',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              borderTop: '2px solid rgba(239, 68, 68, 0.8)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.15)'
            }}
            className="p-5 sm:p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-4 cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-red-400 font-bold uppercase block">
                  弐号機 // EVA UNIT-02
                </span>
                <h3 className="text-lg font-black font-mono text-white uppercase mt-0.5">
                  CHEMISTRY
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-[9px] font-mono font-bold">
                {chemMastery}% SYNC
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-[8.5px] font-mono text-zinc-400 uppercase font-semibold block">ACTIVE TARGET</span>
              <p className="text-xs font-mono font-bold text-white truncate">
                {chemMission?.chapterName || chemMission?.taskName || 'Chemical Bonding & Hybridization'}
              </p>
              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1">
                <span>Duration: {chemMission?.duration || 75}m</span>
                <span className="text-red-400 font-bold">+50 XP</span>
              </div>
            </div>

            <button className="w-full py-2.5 rounded-xl bg-red-600/30 group-hover:bg-red-600 border border-red-500/50 group-hover:border-red-400 text-red-200 group-hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md">
              <Play className="w-3 h-3 fill-current" />
              <span>Launch Unit-02</span>
            </button>
          </motion.div>

        </div>
      </div>

      {/* 4. BOTTOM ROW: ANGEL THREAT AUTOPSY & TODAY'S TACTICAL FLIGHT DECK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DIRECTIVES TIMELINE */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.snappy}
          style={{
            background: 'rgba(10, 14, 23, 0.88)',
            backdropFilter: 'blur(28px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)'
          }}
          className="p-6 rounded-3xl space-y-4"
        >
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono font-bold tracking-widest text-white uppercase">
                TODAY'S SORTIE DIRECTIVES ({todayMissions.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {todayMissions.filter(m => m.completed).length} / {todayMissions.length} Cleared
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {todayMissions.length > 0 ? (
              todayMissions.map((m, idx) => (
                <div 
                  key={m.id || idx}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    m.completed 
                      ? 'bg-emerald-950/20 border-emerald-500/30 opacity-60' 
                      : 'bg-zinc-950/60 border-white/10 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        m.subject === 'maths' ? 'bg-purple-950 text-purple-300 border border-purple-500/40' :
                        m.subject === 'chemistry' ? 'bg-red-950 text-red-300 border border-red-500/40' :
                        'bg-sky-950 text-sky-300 border border-sky-500/40'
                      }`}>
                        {m.subject}
                      </span>
                      <span className="text-xs font-mono font-bold text-white truncate">
                        {m.taskName || m.chapterName}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-zinc-500 block mt-0.5">
                      Target: {m.duration || 60}m • Planned Focus
                    </span>
                  </div>

                  <button
                    onClick={() => handleLaunchSubject(m.id)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-mono font-bold transition-all shrink-0 cursor-pointer"
                  >
                    {m.completed ? 'Review' : 'Engage'}
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                No active directives scheduled for today.
              </div>
            )}
          </div>
        </motion.div>

        {/* ANGEL THREAT AUTOPSY (MISTAKE VAULT) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.snappy, delay: 0.05 }}
          style={{
            background: 'rgba(10, 14, 23, 0.88)',
            backdropFilter: 'blur(28px)',
            border: '1.5px solid rgba(239, 68, 68, 0.4)',
            borderTop: '2px solid rgba(239, 68, 68, 0.7)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.1)'
          }}
          className="p-6 rounded-3xl space-y-4"
        >
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-mono font-bold tracking-widest text-red-300 uppercase">
                ANGEL THREAT AUTOPSY // 弱点分析
              </span>
            </div>
            <button 
              onClick={() => navigate('/mistakes')}
              className="text-[10px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Vault</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {mistakes.length > 0 ? (
              mistakes.slice(0, 4).map((mistake: any, idx: number) => (
                <div 
                  key={mistake.id || idx}
                  className="p-3.5 rounded-2xl bg-zinc-950/70 border border-red-500/30 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 font-bold uppercase">
                      PATTERN BLUE: CONCEPT LEAK
                    </span>
                    <p className="text-xs font-mono font-bold text-white truncate mt-1">
                      {mistake.questionText || mistake.title || mistake.chapter || 'Thermodynamics Carnot Cycle'}
                    </p>
                    <span className="text-[9.5px] font-mono text-zinc-500 block">
                      Subject: {mistake.subject || 'Physics'}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate('/mistakes')}
                    className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white text-xs font-mono font-bold transition-all shrink-0 cursor-pointer"
                  >
                    Neutralize
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-mono text-zinc-400">
                  ALL IDENTIFIED THREATS NEUTRALIZED
                </p>
                <span className="text-[10px] font-mono text-zinc-500 block">
                  Zero active bottlenecks recorded in memory bank.
                </span>
              </div>
            )}
          </div>
        </motion.div>

      </div>

    </div>
  );
}
