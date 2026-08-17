import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  Zap, 
  ArrowLeft, 
  Check, 
  Volume2, 
  X, 
  Target, 
  Layers, 
  FlaskConical, 
  Atom, 
  Calculator,
  ShieldAlert,
  Activity,
  Radio,
  Crosshair,
  Sparkles,
  Sword,
  Aperture,
  Orbit,
  Droplets,
  Network,
  Shield,
  Gauge,
  Flame
} from 'lucide-react';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';
import { SubjectId } from '@/types';

// Evangelion Unit Themes
const EVA_THEMES = {
  physics: {
    unit: 'EVA UNIT-00',
    pilot: 'REI // PHYSICS',
    name: 'Physics',
    icon: Atom,
    primary: '#38bdf8', // Sky / Cyan
    secondary: '#ffffff',
    glow: 'rgba(56, 189, 248, 0.4)',
    ambientGlow: 'rgba(56, 189, 248, 0.1)',
    atFieldColor: '#38bdf8',
    text: 'text-sky-400',
    border: 'border-sky-500/40',
    bgBadge: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    accentRing: 'stroke-sky-400'
  },
  chemistry: {
    unit: 'EVA UNIT-02',
    pilot: 'ASUKA // CHEMISTRY',
    name: 'Chemistry',
    icon: FlaskConical,
    primary: '#10b981', // Emerald / Neon Green
    secondary: '#f59e0b', // Amber
    glow: 'rgba(16, 185, 129, 0.4)',
    ambientGlow: 'rgba(16, 185, 129, 0.1)',
    atFieldColor: '#10b981',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bgBadge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    accentRing: 'stroke-emerald-400'
  },
  maths: {
    unit: 'EVA UNIT-01',
    pilot: 'SHINJI // MATHEMATICS',
    name: 'Mathematics',
    icon: Calculator,
    primary: '#c084fc', // Purple
    secondary: '#4ade80', // Eva-01 Neon Green Accent
    glow: 'rgba(192, 132, 252, 0.4)',
    ambientGlow: 'rgba(192, 132, 252, 0.1)',
    atFieldColor: '#c084fc',
    text: 'text-purple-400',
    border: 'border-purple-500/40',
    bgBadge: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    accentRing: 'stroke-purple-400'
  }
};

type EvaMode = 
  | 'positronSparkle'
  | 'lclFluid' 
  | 'neuralSynapse' 
  | 'hexArray' 
  | 'tachoSpin' 
  | 'spearPiercing' 
  | 'hexIris' 
  | 'chronoColliders' 
  | 'awakened' 
  | 'cross';

export function DevCockpitRipplePage() {
  const navigate = useNavigate();

  // Animation Modes (Strictly timer-anchored with Anime Expand-Shrink-Expand Sparkle & Pure Liquid Glass):
  // 1. 'positronSparkle' (Anime Pulse Sparkle: Expands -> Squeezes/Implodes -> Mega Expands)
  // 2. 'lclFluid' (Iter 6: LCL Fluid Rising & Effervescent Oxygenation)
  // 3. 'neuralSynapse' (Iter 7: Synaptic Lightning Arcs)
  // 4. 'hexArray' (Iter 8: 7-Hex Honeycomb Rosette Assembly)
  // 5. 'tachoSpin' (Iter 9: 12,000 RPM Chrono Needle Spin-Up)
  // 6. 'spearPiercing' (Iter 4: Spear of Longinus Double-Helix Drill)
  // 7. 'hexIris' (Iter 5: 6-Blade Mechanical Aperture Iris Spiral Unlock)
  // 8. 'chronoColliders' (Iter 3: Dual Rim Collider Particles meeting at 6 o'clock)
  // 9. 'awakened' (Iter 2: MAGI Consensus Handshake + Hex-Lock Compass)
  // 10. 'cross' (Iter 1: AT-Field Octagons Resonance)
  const [evaMode, setEvaMode] = useState<EvaMode>('positronSparkle');
  const [stage, setStage] = useState<'standby' | 'magi' | 'active' | 'revealed'>('standby');
  const [subject, setSubject] = useState<SubjectId>('maths');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(0.25);
  const [seconds, setSeconds] = useState(1485);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    'LCL Pressure Nominal: Watch core theory': true,
    'Neural Link 99.8%: Derive rotational inertia': true,
    'Target Lock: Solve 15 Advanced PYQs': false,
    'Sync Diagnostic: Mark doubts & error traps': false,
    'Emergency Overdrive: Speed recall test': false
  });

  const timerRef = useRef<HTMLDivElement | null>(null);
  const [originCoords, setOriginCoords] = useState<{ x: number; y: number; pctX: number; pctY: number }>({
    x: 0,
    y: 0,
    pctX: 28,
    pctY: 50
  });

  const currentTheme = EVA_THEMES[subject] || EVA_THEMES.maths;

  // Always anchor motion directly to the Timer Circle
  const updateOriginCoords = () => {
    if (!timerRef.current) {
      setOriginCoords({
        x: window.innerWidth * 0.28,
        y: window.innerHeight * 0.5,
        pctX: 28,
        pctY: 50
      });
      return;
    }

    const rect = timerRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const pctX = (x / window.innerWidth) * 100;
    const pctY = (y / window.innerHeight) * 100;

    setOriginCoords({ x, y, pctX, pctY });
  };

  useEffect(() => {
    updateOriginCoords();
    window.addEventListener('resize', updateOriginCoords);
    return () => window.removeEventListener('resize', updateOriginCoords);
  }, []);

  // Master sequence orchestration
  const runSequence = () => {
    setStage('standby');
    updateOriginCoords();
    // Kinetic Laser Charge Glint ("shiiing!") on Expand -> Squeeze
    audioEngine.playAnimeLaserCharge().catch(() => {});

    if (evaMode === 'awakened') {
      const magiTimer = setTimeout(() => {
        setStage('magi');

        const activeTimer = setTimeout(() => {
          setStage('active');
          audioEngine.playCruelAngelsThesisEntrance(subject).catch(() => {});

          const revealTimer = setTimeout(() => {
            setStage('revealed');
          }, 450 / speedMultiplier);

          return () => clearTimeout(revealTimer);
        }, 300 / speedMultiplier);

        return () => clearTimeout(activeTimer);
      }, 80 / speedMultiplier);

      return () => clearTimeout(magiTimer);
    } else {
      const activeTimer = setTimeout(() => {
        setStage('active');
        audioEngine.playCruelAngelsThesisEntrance(subject).catch(() => {});

        const duration = (
          evaMode === 'positronSparkle' ? 520 :
          evaMode === 'lclFluid' ? 440 :
          evaMode === 'neuralSynapse' ? 400 :
          evaMode === 'hexArray' ? 420 :
          evaMode === 'tachoSpin' ? 420 :
          evaMode === 'spearPiercing' ? 420 :
          evaMode === 'hexIris' ? 400 : 380
        ) / speedMultiplier;

        const revealTimer = setTimeout(() => {
          setStage('revealed');
        }, duration);

        return () => clearTimeout(revealTimer);
      }, 360 / speedMultiplier);

      return () => clearTimeout(activeTimer);
    }
  };

  // Run on mount & when mode or subject changes
  useEffect(() => {
    runSequence();
  }, [evaMode, subject]);

  // Keyboard shortcut: Space to replay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target === document.body || e.target === document.documentElement)) {
        e.preventDefault();
        runSequence();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [speedMultiplier, evaMode, subject]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const radius = 115;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = 68;
  const targetOffset = circumference - (progressPercent / 100) * circumference;

  const isRevealed = stage === 'revealed';

  return (
    <div className="fixed inset-0 z-50 bg-[#020306] text-zinc-100 font-sans overflow-hidden select-none flex flex-col">
      
      {/* 1. DYNAMIC EVANGELION ANIMATION SYSTEM */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        
        {/* ITERATION 2 ONLY: MAGI 3/3 CONSENSUS HANDSHAKE */}
        <AnimatePresence>
          {evaMode === 'awakened' && stage === 'magi' && (
            <div
              style={{
                position: 'absolute',
                left: `${originCoords.pctX}%`,
                top: `${originCoords.pctY}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="w-0 h-0 flex items-center justify-center pointer-events-none"
            >
              {[
                { name: 'MELCHIOR-1', angle: -30, color: '#f59e0b' },
                { name: 'BALTHASAR-2', angle: 90, color: '#10b981' },
                { name: 'CASPER-3', angle: 210, color: '#38bdf8' }
              ].map((magi, i) => {
                const rad = (magi.angle * Math.PI) / 180;
                const dist = 70;
                return (
                  <motion.div
                    key={magi.name}
                    initial={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.9] }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.25 / speedMultiplier, delay: (i * 0.05) / speedMultiplier }}
                    className="absolute flex flex-col items-center justify-center"
                    style={{ transform: `translate(${Math.cos(rad) * dist}px, ${Math.sin(rad) * dist}px)` }}
                  >
                    <div 
                      className="px-2 py-0.5 rounded text-[8px] font-mono font-black tracking-widest border"
                      style={{ 
                        backgroundColor: `${magi.color}15`, 
                        borderColor: `${magi.color}60`, 
                        color: magi.color,
                        boxShadow: `0 0 10px ${magi.color}40`
                      }}
                    >
                      {magi.name} // OK
                    </div>
                  </motion.div>
                );
              })}

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[9px] font-mono font-bold text-amber-400 tracking-[0.2em] -mt-10"
              >
                [ MAGI CONSENSUS: 3/3 // SYNC APPROVED ]
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ACTIVE STAGE: TIMER-ANCHORED ANIME VISUALS */}
        <AnimatePresence>
          {stage === 'active' && (
            <div
              style={{
                position: 'absolute',
                left: `${originCoords.pctX}%`,
                top: `${originCoords.pctY}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="w-0 h-0 flex items-center justify-center pointer-events-none"
            >
              {/* Telemetry Status Label */}
              <motion.div
                initial={{ opacity: 0, y: -45 }}
                animate={{ opacity: [0, 1, 0.85], y: -45 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.35 / speedMultiplier }}
                className="absolute whitespace-nowrap text-[10px] font-mono font-bold tracking-[0.25em] text-white flex items-center gap-2"
                style={{ textShadow: `0 0 10px ${currentTheme.primary}` }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: currentTheme.primary }} />
                <span>
                  {evaMode === 'positronSparkle'
                    ? '[ ANIME SINGULARITY // EXPAND-SHRINK-EXPAND PULSE ]'
                    : evaMode === 'lclFluid'
                    ? '[ LCL LIQUID INJECTION : 100% // IMMERSION ]'
                    : evaMode === 'neuralSynapse'
                    ? '[ NEURAL SYNAPSE // BRAINWAVE HARMONY: 99.8% ]'
                    : evaMode === 'hexArray'
                    ? '[ AT-FIELD HEX-ARRAY // MATRIX LOCKED ]'
                    : evaMode === 'tachoSpin'
                    ? '[ CHRONO OVERDRIVE // 12,000 RPM ]'
                    : evaMode === 'spearPiercing' 
                    ? '[ SPEAR OF LONGINUS // TARGET LOCK: 100% ]'
                    : evaMode === 'hexIris'
                    ? '[ APERTURE INTERLOCK : UNLOCKING ]'
                    : evaMode === 'chronoColliders'
                    ? '[ CHRONO-CORE : ARMED // 400Hz ]'
                    : evaMode === 'awakened'
                    ? '[ S² SUPERNOVA CORE : AWAKENED ]'
                    : '[ AT FIELD : STABILIZING ]'}
                </span>
              </motion.div>

              {/* ------------------------------------------------------------------ */}
              {/* ITERATION 10: ANIME EXPAND -> SHRINK -> EXPAND SPARKLE */}
              {/* ------------------------------------------------------------------ */}
              {evaMode === 'positronSparkle' && (
                <div className="absolute flex items-center justify-center pointer-events-none">
                  
                  {/* 1. Gravitational Inflow Filaments: Sucks into the core during the Shrink/Implode Phase */}
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 360) / 12;
                    const rad = (angle * Math.PI) / 180;
                    const dist = 95;
                    return (
                      <motion.div
                        key={`inflow-spark-${i}`}
                        initial={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 0, opacity: 0 }}
                        animate={{ 
                          x: [Math.cos(rad) * dist, Math.cos(rad) * (dist * 0.7), 0, 0], 
                          y: [Math.sin(rad) * dist, Math.sin(rad) * (dist * 0.7), 0, 0], 
                          scale: [0, 1.2, 0.3, 0], 
                          opacity: [0, 0.9, 1, 0] 
                        }}
                        transition={{ 
                          duration: 0.5 / speedMultiplier, 
                          times: [0, 0.28, 0.58, 1],
                          delay: (i * 0.01) / speedMultiplier, 
                          ease: [0.16, 1, 0.3, 1] 
                        }}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: i % 2 === 0 ? '#38bdf8' : '#c084fc',
                          boxShadow: `0 0 10px ${i % 2 === 0 ? '#38bdf8' : '#c084fc'}`
                        }}
                      />
                    );
                  })}

                  {/* 2. Concentric Caliper Charging Rings (Expands -> Squeezes -> Mega Expands) */}
                  <motion.div
                    initial={{ scale: 0, rotate: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.4, 0.2, 2.2, 0], 
                      rotate: [0, 45, 180, 360, 420], 
                      opacity: [0, 0.85, 0.3, 0.9, 0] 
                    }}
                    transition={{ duration: 0.5 / speedMultiplier, times: [0, 0.28, 0.55, 0.85, 1], ease: "easeInOut" }}
                    style={{ width: `${radius * 1.5}px`, height: `${radius * 1.5}px` }}
                    className="absolute rounded-full border border-dashed border-sky-400/60"
                  />
                  <motion.div
                    initial={{ scale: 0, rotate: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.1, 0.15, 1.8, 0], 
                      rotate: [0, -45, -180, -360, -420], 
                      opacity: [0, 0.9, 0.4, 1, 0] 
                    }}
                    transition={{ duration: 0.5 / speedMultiplier, times: [0, 0.28, 0.55, 0.85, 1], ease: "easeInOut" }}
                    style={{ width: `${radius}px`, height: `${radius}px` }}
                    className="absolute rounded-full border border-purple-400/70"
                  />

                  {/* 3. Razor-Sharp Anamorphic Horizontal Spike (EXPAND -> SHRINK/SQUEEZE -> MEGA EXPAND) */}
                  <motion.div
                    initial={{ width: 0, height: '2px', opacity: 0 }}
                    animate={{ 
                      width: ['0px', '160px', '12px', '320px', '0px'],
                      height: ['2px', '3px', '1px', '4px', '0px'],
                      opacity: [0, 0.95, 0.6, 1, 0] 
                    }}
                    transition={{ 
                      duration: 0.5 / speedMultiplier, 
                      times: [0, 0.28, 0.55, 0.85, 1],
                      ease: [0.16, 1, 0.3, 1] 
                    }}
                    className="absolute rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent, #38bdf8, #ffffff, #c084fc, transparent)',
                      boxShadow: '0 0 15px rgba(56, 189, 248, 0.8), 0 0 30px rgba(192, 132, 252, 0.6)'
                    }}
                  />

                  {/* 4. Razor-Sharp Vertical Spike (EXPAND -> SHRINK/SQUEEZE -> MEGA EXPAND) */}
                  <motion.div
                    initial={{ height: 0, width: '2px', opacity: 0 }}
                    animate={{ 
                      height: ['0px', '110px', '8px', '220px', '0px'],
                      width: ['2px', '3px', '1px', '4px', '0px'],
                      opacity: [0, 0.95, 0.6, 1, 0] 
                    }}
                    transition={{ 
                      duration: 0.5 / speedMultiplier, 
                      times: [0, 0.28, 0.55, 0.85, 1],
                      ease: [0.16, 1, 0.3, 1] 
                    }}
                    className="absolute rounded-full"
                    style={{
                      background: 'linear-gradient(180deg, transparent, #38bdf8, #ffffff, #c084fc, transparent)',
                      boxShadow: '0 0 12px rgba(56, 189, 248, 0.8)'
                    }}
                  />

                  {/* 5. 45° Diagonal Cross Rays (EXPAND -> SHRINK -> MEGA EXPAND) */}
                  <motion.div
                    initial={{ scale: 0, rotate: 45, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.4, 0.1, 2.8, 0], 
                      rotate: [45, 90, 225, 360, 405],
                      opacity: [0, 0.85, 0.5, 0.95, 0] 
                    }}
                    transition={{ 
                      duration: 0.5 / speedMultiplier, 
                      times: [0, 0.28, 0.55, 0.85, 1],
                      ease: "easeInOut" 
                    }}
                    className="absolute w-28 h-28 flex items-center justify-center"
                  >
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white to-transparent" />
                    <div className="h-full w-0.5 bg-gradient-to-b from-transparent via-white to-transparent absolute" />
                  </motion.div>

                  {/* 6. High-Frequency Central Diamond Star (EXPAND -> SHRINK -> MEGA EXPAND) */}
                  <motion.div
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ 
                      scale: [0, 1.8, 0.15, 3.5, 0], 
                      rotate: [0, 45, 180, 360, 450] 
                    }}
                    transition={{ 
                      duration: 0.5 / speedMultiplier, 
                      times: [0, 0.28, 0.55, 0.85, 1],
                      ease: "easeInOut" 
                    }}
                    className="w-5 h-5 bg-white relative z-30"
                    style={{
                      clipPath: 'polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%)',
                      boxShadow: '0 0 16px 4px #ffffff, 0 0 28px 8px #38bdf8'
                    }}
                  />

                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* ITERATION 6: LCL FLUID IMMERSION (Liquid Level Rise & Bubbles) */}
              {/* ------------------------------------------------------------- */}
              {evaMode === 'lclFluid' && (
                <div 
                  style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }} 
                  className="absolute rounded-full overflow-hidden border border-amber-400/40 flex items-center justify-center pointer-events-none"
                >
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: ['100%', '20%', '0%'] }}
                    transition={{ duration: 0.42 / speedMultiplier, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `linear-gradient(180deg, rgba(245,158,11,0.25) 0%, rgba(245,158,11,0.6) 100%)`,
                      boxShadow: `0 0 30px rgba(245,158,11,0.6)`
                    }}
                  />
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={`bubble-${i}`}
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: -80, opacity: [0, 0.9, 0] }}
                      transition={{ duration: 0.4 / speedMultiplier, delay: (i * 0.05) / speedMultiplier, ease: "easeOut" }}
                      style={{ left: `${25 + i * 10}%` }}
                      className="absolute w-2 h-2 rounded-full bg-amber-200 shadow-[0_0_8px_#fde68a]"
                    />
                  ))}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* ITERATION 7: NEURAL SYNAPSE (Fractal Lightning Arc Ring) */}
              {/* ------------------------------------------------------------- */}
              {evaMode === 'neuralSynapse' && (
                <div style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }} className="absolute flex items-center justify-center pointer-events-none">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.9] }}
                    className="absolute -left-3 w-4 h-4 rounded-full bg-sky-300 shadow-[0_0_15px_#38bdf8]"
                  />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.9] }}
                    className="absolute -right-3 w-4 h-4 rounded-full bg-purple-300 shadow-[0_0_15px_#c084fc]"
                  />

                    <motion.div
                      initial={{ rotate: 0, opacity: 0 }}
                      animate={{ rotate: 360, opacity: [0, 1, 0.8, 1] }}
                      transition={{ duration: 0.38 / speedMultiplier, ease: "linear" }}
                      style={{ 
                        width: `${radius * 2}px`, 
                        height: `${radius * 2}px`,
                        boxShadow: `0 0 20px ${currentTheme.primary}` 
                      }}
                      className="absolute rounded-full border-2 border-dashed border-sky-400"
                    />
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* ITERATION 8: HEX HONEYCOMB ARRAY (7-Tile Rosette Assembly) */}
              {/* ------------------------------------------------------------- */}
              {evaMode === 'hexArray' && (
                <div style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }} className="absolute flex items-center justify-center pointer-events-none">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.9] }}
                    transition={{ duration: 0.3 / speedMultiplier }}
                    className="w-12 h-12 border border-emerald-400/80 flex items-center justify-center"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      backgroundColor: `${currentTheme.atFieldColor}20`,
                      boxShadow: `0 0 15px ${currentTheme.glow}`
                    }}
                  />
                  {[0, 60, 120, 180, 240, 300].map((deg, i) => {
                    const rad = (deg * Math.PI) / 180;
                    const dist = 55;
                    return (
                      <motion.div
                        key={`hex-tile-${deg}`}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                        animate={{ 
                          x: Math.cos(rad) * dist, 
                          y: Math.sin(rad) * dist, 
                          scale: [0, 1.1, 1], 
                          opacity: [0, 0.9, 0.7] 
                        }}
                        transition={{ duration: 0.38 / speedMultiplier, delay: (i * 0.02) / speedMultiplier, ease: "easeOut" }}
                        className="absolute w-10 h-10 border border-emerald-400/60"
                        style={{
                          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                          backgroundColor: `${currentTheme.atFieldColor}15`
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* ITERATION 9: QUANTUM TACHOMETER (12,000 RPM Needle Spin-Up) */}
              {/* ------------------------------------------------------------- */}
              {evaMode === 'tachoSpin' && (
                <div style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }} className="absolute flex items-center justify-center pointer-events-none">
                  <motion.div
                    initial={{ rotate: 0, opacity: 0 }}
                    animate={{ rotate: -180, opacity: 1 }}
                    transition={{ duration: 0.4 / speedMultiplier, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-dashed border-zinc-500/50"
                  />
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 720 }}
                    transition={{ duration: 0.4 / speedMultiplier, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }}
                    className="absolute flex items-center justify-start pointer-events-none"
                  >
                    <div 
                      className="w-28 h-1 rounded-r-full bg-gradient-to-r from-transparent via-rose-400 to-white ml-2"
                      style={{ boxShadow: `0 0 10px #f43f5e` }}
                    />
                  </motion.div>
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* ITERATION 4: SPEAR OF LONGINUS (Double-Helix Drill & Glass Shards) */}
              {/* ------------------------------------------------------------- */}
              {evaMode === 'spearPiercing' && (
                <>
                  <motion.div
                    initial={{ scale: 0.1, rotate: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0.1, 1.8, 1], 
                      rotate: [0, 540],
                      opacity: [0, 1, 0.9] 
                    }}
                    exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.4 / speedMultiplier, ease: "easeOut" }}
                    className="absolute w-36 h-36 flex items-center justify-center pointer-events-none"
                  >
                    <div 
                      className="absolute w-full h-8 rounded-[100%] border border-rose-500/80"
                      style={{ boxShadow: `0 0 15px rgba(244,63,94,0.6)` }}
                    />
                    <div 
                      className="absolute w-8 h-full rounded-[100%] border border-rose-500/80"
                      style={{ boxShadow: `0 0 15px rgba(244,63,94,0.6)` }}
                    />
                    <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
                  </motion.div>

                  {[...Array(8)].map((_, i) => {
                    const angle = (i * 360) / 8;
                    const rad = (angle * Math.PI) / 180;
                    const dist = 110;
                    return (
                      <motion.div
                        key={`shard-${i}`}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                        animate={{ 
                          x: Math.cos(rad) * dist, 
                          y: Math.sin(rad) * dist, 
                          scale: [0, 1.2, 0.4],
                          opacity: [0, 0.85, 0] 
                        }}
                        transition={{ duration: 0.38 / speedMultiplier, delay: 0.12 / speedMultiplier, ease: "easeOut" }}
                        className="absolute w-4 h-4"
                        style={{
                          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                          backgroundColor: `${currentTheme.atFieldColor}60`,
                          boxShadow: `0 0 10px ${currentTheme.glow}`
                        }}
                      />
                    );
                  })}
                </>
              )}

              {/* ------------------------------------------------------------- */}
              {/* ITERATION 5: HEX IRIS APERTURE (6-Blade Mechanical Spiral Unlock) */}
              {/* ------------------------------------------------------------- */}
              {evaMode === 'hexIris' && (
                <div style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }} className="absolute flex items-center justify-center pointer-events-none">
                  {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                    <motion.div
                      key={`iris-blade-${deg}`}
                      initial={{ rotate: deg, scale: 0.2, opacity: 0 }}
                      animate={{ 
                        rotate: [deg, deg + 45, deg + 90], 
                        scale: [0.2, 1, 1.2],
                        opacity: [0, 1, 0.8] 
                      }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.38 / speedMultiplier, ease: "easeInOut", delay: (i * 0.02) / speedMultiplier }}
                      style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }}
                      className="absolute flex items-center justify-start pointer-events-none"
                    >
                      <div 
                        className="w-14 h-1.5 rounded-r-full"
                        style={{
                          background: `linear-gradient(90deg, ${currentTheme.primary}, #ffffff, transparent)`,
                          boxShadow: `0 0 10px ${currentTheme.primary}`
                        }}
                      />
                    </motion.div>
                  ))}
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_15px_#ffffff]" />
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* ITERATION 3: CHRONO COLLIDERS (Dual Beads Racing along Rim) */}
              {/* ------------------------------------------------------------- */}
              {evaMode === 'chronoColliders' && (
                <div style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }} className="absolute flex items-center justify-center pointer-events-none">
                  <motion.div
                    initial={{ rotate: -90 }}
                    animate={{ rotate: 90 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.35 / speedMultiplier, ease: "easeInOut" }}
                    style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }}
                    className="absolute flex items-center justify-start pointer-events-none"
                  >
                    <div 
                      className="w-3.5 h-3.5 rounded-full bg-white -ml-1.5"
                      style={{ boxShadow: `0 0 14px 3px ${currentTheme.primary}` }}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ rotate: -90 }}
                    animate={{ rotate: -270 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.35 / speedMultiplier, ease: "easeInOut" }}
                    style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }}
                    className="absolute flex items-center justify-start pointer-events-none"
                  >
                    <div 
                      className="w-3.5 h-3.5 rounded-full bg-white -ml-1.5"
                      style={{ boxShadow: `0 0 14px 3px ${currentTheme.secondary || currentTheme.primary}` }}
                    />
                  </motion.div>

                  <div className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-[0_0_8px_#ffffff]" />
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* ITERATION 2: AWAKENED SUPERNOVA (Hex-Lock Telemetry Compass) */}
              {/* ------------------------------------------------------------- */}
              {evaMode === 'awakened' && (
                <>
                  <motion.div
                    initial={{ rotate: 0, scale: 0.4, opacity: 0 }}
                    animate={{ rotate: 360, scale: [0.4, 1.2, 1], opacity: [0, 1, 0.85] }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.4 / speedMultiplier, ease: "easeInOut" }}
                    className="absolute w-36 h-36 rounded-full border border-dashed flex items-center justify-center pointer-events-none"
                    style={{ borderColor: currentTheme.primary, boxShadow: `0 0 15px ${currentTheme.glow}` }}
                  >
                    {[0, 60, 120, 180, 240, 300].map(deg => (
                      <div
                        key={deg}
                        style={{ 
                          transform: `rotate(${deg}deg) translate(68px)`,
                          backgroundColor: currentTheme.primary 
                        }}
                        className="absolute w-2 h-0.5"
                      />
                    ))}
                  </motion.div>
                  <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
                </>
              )}

              {/* ------------------------------------------------------------- */}
              {/* ITERATION 1: AT-FIELD CROSS (Concentric Octagonal Facets) */}
              {/* ------------------------------------------------------------- */}
              {evaMode === 'cross' && (
                <>
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={`at-field-oct-${i}`}
                      initial={{ scale: 0.2, rotate: i * 22.5, opacity: 0 }}
                      animate={{ 
                        scale: [0.2, 1 + i * 0.4, 1.4 + i * 0.5], 
                        rotate: [i * 22.5, i * 22.5 + 45],
                        opacity: [0, 0.85, 0.6] 
                      }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      transition={{ 
                        duration: 0.45 / speedMultiplier, 
                        ease: "easeInOut",
                        delay: (i * 0.04) / speedMultiplier 
                      }}
                      className="absolute pointer-events-none"
                      style={{
                        width: `${60 + i * 36}px`,
                        height: `${60 + i * 36}px`,
                        clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                        backgroundColor: `${currentTheme.atFieldColor}15`,
                        border: `1.5px solid ${currentTheme.atFieldColor}`,
                        boxShadow: `0 0 15px ${currentTheme.glow}`
                      }}
                    />
                  ))}
                  <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
                </>
              )}

            </div>
          )}
        </AnimatePresence>

      </div>

      {/* 2. THE EVANGELION COCKPIT HUD (CLEAN LIQUID GLASS CLARITY DISSOLVE) */}
      <motion.div
        style={{
          clipPath: stage === 'standby' || stage === 'magi' || stage === 'active'
            ? `circle(0% at ${originCoords.pctX}% ${originCoords.pctY}%)`
            : 'circle(180% at 50% 50%)',
          transition: stage === 'revealed' 
            ? `clip-path ${0.75 / speedMultiplier}s cubic-bezier(0.16, 1, 0.3, 1)` 
            : 'none'
        }}
        className="w-full h-full flex flex-col relative z-10"
      >
        {/* NERV Ambient Grid Backdrop */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-0 opacity-40">
          <div 
            className="absolute top-1/4 left-1/4 w-[540px] h-[540px] rounded-full blur-[150px] transition-all duration-1000"
            style={{ backgroundColor: currentTheme.ambientGlow }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-[480px] h-[480px] rounded-full blur-[170px] transition-all duration-1000"
            style={{ backgroundColor: currentTheme.ambientGlow }}
          />
        </div>

        {/* HEADER: NERV // MISSION CONTROL */}
        <header className="absolute top-0 left-0 w-full z-30 flex justify-between items-center px-6 py-4 pointer-events-auto bg-gradient-to-b from-zinc-950/95 via-zinc-950/50 to-transparent backdrop-blur-md border-b border-zinc-800/40">
          <motion.div 
            animate={{ 
              y: isRevealed ? 0 : -14, 
              opacity: isRevealed ? 1 : 0 
            }}
            transition={{ duration: 0.5 / speedMultiplier, ease: "easeOut" }}
            className="flex items-center gap-3.5"
          >
            <div className={`w-10 h-10 rounded-xl bg-zinc-900/90 border flex items-center justify-center shrink-0 shadow-lg ${currentTheme.border}`}>
              <ShieldAlert className={`w-5 h-5 ${currentTheme.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black text-rose-500 tracking-widest bg-rose-950/60 border border-rose-500/40 px-1.5 py-0.2 rounded">
                  NERV
                </span>
                <h2 className="text-sm font-extrabold tracking-widest font-mono uppercase text-white leading-tight flex items-center gap-1.5">
                  <span>COCKPIT</span>
                  <span className={`${currentTheme.text} font-black`}>[ {currentTheme.unit} ]</span>
                </h2>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2 mt-0.5 uppercase tracking-wider font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  SYNC RATIO: 99.8%
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">{currentTheme.pilot}</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            animate={{ 
              y: isRevealed ? 0 : -14, 
              opacity: isRevealed ? 1 : 0 
            }}
            transition={{ duration: 0.5 / speedMultiplier, ease: "easeOut" }}
            className="flex items-center gap-2.5 font-mono text-xs"
          >
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300">
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>ENTRY PLUG DEPTH: NOMINAL</span>
            </div>

            <button 
              type="button"
              className="w-10 h-10 rounded-xl border border-zinc-800/80 hover:bg-zinc-850/80 text-zinc-400 hover:text-white transition-colors flex items-center justify-center bg-zinc-900/80 cursor-pointer shadow-sm"
              title="Mute Audio"
            >
              <Volume2 className="w-4 h-4 text-zinc-300" />
            </button>
            <button 
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-xl border border-zinc-800/80 hover:bg-red-500/20 hover:border-red-500/40 text-zinc-400 hover:text-red-400 transition-colors flex items-center justify-center bg-zinc-900/80 cursor-pointer shadow-sm"
              title="Eject / Exit to Dashboard"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </motion.div>
        </header>

        {/* MAIN WORKSPACE: 2-COLUMN SPLIT (SYNCHRO CHRONOMETER + TACTICAL DIRECTIVES) */}
        <main className="flex-1 min-h-0 relative z-10 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden w-full max-w-5xl mx-auto px-4 sm:px-6 py-2 gap-6 justify-center items-center pt-16 md:pt-20 my-auto max-h-[calc(100vh-4rem)]">
          
          {/* LEFT COLUMN: EVA SYNCHRO CHRONOMETER (PURE LIQUID GLASS) */}
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto md:mx-0 h-full min-h-0 space-y-3">
            
            {/* CIRCULAR TIMER CHASSIS WITH LIQUID GLASS SURFACE */}
            <motion.div 
              ref={timerRef}
              animate={{
                scale: isRevealed ? 1 : 0.94,
                opacity: isRevealed ? 1 : 0
              }}
              transition={{ duration: 0.6 / speedMultiplier, ease: [0.16, 1, 0.3, 1] }}
              style={{ 
                boxShadow: isRevealed 
                  ? `0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 0 50px ${currentTheme.ambientGlow}` 
                  : 'none',
                background: 'rgba(10, 14, 23, 0.75)',
                backdropFilter: 'blur(24px) saturate(190%) contrast(105%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderTop: '1.5px solid rgba(255, 255, 255, 0.25)'
              }}
              className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 flex items-center justify-center rounded-full shrink-0 group select-none transition-all duration-700 overflow-hidden"
            >
              {/* Liquid Glass Specular Highlight Sheen */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-40 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)'
                }}
              />

              {/* Eva Crosshair Marks */}
              <div className="absolute inset-2 pointer-events-none opacity-30 flex items-center justify-center">
                <div className="w-full h-px bg-white/40" />
                <div className="h-full w-px bg-white/40 absolute" />
              </div>

              {/* Reset Button */}
              <button
                type="button"
                onClick={() => setSeconds(0)}
                title="Reset Chronometer"
                className="absolute top-3 right-3 z-20 p-2.5 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-zinc-400 shadow-xl hover:text-red-400 hover:border-red-500/50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Concentric Futuristic EVA Tachometer SVG Rings */}
              <svg viewBox="0 0 288 288" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle 
                  cx="144" 
                  cy="144" 
                  r="134" 
                  className="stroke-zinc-800/60 fill-none" 
                  strokeWidth="2"
                  strokeDasharray="6 12"
                />

                <circle 
                  cx="144" 
                  cy="144" 
                  r={radius} 
                  className="stroke-zinc-800/40 fill-none" 
                  strokeWidth="7"
                />

                <motion.circle 
                  cx="144" 
                  cy="144" 
                  r={radius} 
                  className={`${currentTheme.accentRing} fill-none`}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: isRevealed ? targetOffset : circumference }}
                  transition={{ 
                    duration: 0.85 / speedMultiplier, 
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.05 / speedMultiplier
                  }}
                  style={{
                    filter: `drop-shadow(0 0 10px ${currentTheme.primary})`
                  }}
                />
              </svg>

              {/* Inner Stats & Time Display */}
              <div className="flex flex-col items-center justify-center text-center z-10 px-4">
                
                {/* Synchro Pilot Badge */}
                <motion.div 
                  animate={{ scale: isRevealed ? 1 : 0.85, opacity: isRevealed ? 1 : 0 }}
                  transition={{ duration: 0.4 / speedMultiplier, delay: 0.08 / speedMultiplier }}
                  className={`px-3 py-0.5 rounded-full border text-[10px] font-mono font-extrabold uppercase tracking-widest mb-1 flex items-center gap-1.5 ${currentTheme.bgBadge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentTheme.text} bg-current animate-pulse`} />
                  <span>{currentTheme.name} Synchro</span>
                </motion.div>

                {/* Big Chronometer Digits */}
                <motion.div 
                  animate={{ scale: isRevealed ? 1 : 0.92, opacity: isRevealed ? 1 : 0 }}
                  transition={{ duration: 0.5 / speedMultiplier, delay: 0.12 / speedMultiplier }}
                  className="text-3xl sm:text-4xl lg:text-[42px] font-mono font-black tracking-tight text-white drop-shadow-md"
                >
                  {formatTimer(seconds)}
                </motion.div>

                {/* Focus Score Metric */}
                <motion.div 
                  animate={{ y: isRevealed ? 0 : 6, opacity: isRevealed ? 1 : 0 }}
                  transition={{ duration: 0.4 / speedMultiplier, delay: 0.16 / speedMultiplier }}
                  className="flex items-center gap-1.5 text-xs font-mono mt-1 text-zinc-400"
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sync: <strong className="text-emerald-400 font-bold">98%</strong></span>
                  <span className="text-zinc-600">•</span>
                  <span>Target: <strong className="text-zinc-300">45m</strong></span>
                </motion.div>
              </div>
            </motion.div>

            {/* Tactical Unit Telemetry Card (Liquid Glass) */}
            <motion.div 
              animate={{ y: isRevealed ? 0 : 8, opacity: isRevealed ? 1 : 0 }}
              transition={{ duration: 0.45 / speedMultiplier, delay: 0.15 / speedMultiplier }}
              style={{
                background: 'rgba(10, 14, 23, 0.7)',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)'
              }}
              className="w-full max-w-xs p-3 rounded-2xl flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${currentTheme.bgBadge}`}>
                  {React.createElement(currentTheme.icon, { className: `w-4 h-4 ${currentTheme.text}` })}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-tight">{currentTheme.unit}</h4>
                  <p className="text-[10px] text-zinc-400 font-mono">Rotational Dynamics • Lec 4/8</p>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${currentTheme.bgBadge}`}>
                +16M Weight
              </span>
            </motion.div>

          </div>

          {/* RIGHT COLUMN: NERV MISSION DIRECTIVES DECK (PURE LIQUID GLASS) */}
          <motion.div 
            animate={{
              x: isRevealed ? 0 : 16,
              opacity: isRevealed ? 1 : 0
            }}
            transition={{ duration: 0.6 / speedMultiplier, delay: 0.1 / speedMultiplier, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'rgba(10, 14, 23, 0.78)',
              backdropFilter: 'blur(24px) saturate(190%) contrast(105%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderTop: '1.5px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
            }}
            className="flex-1 w-full max-w-xl mx-auto flex flex-col h-full rounded-3xl overflow-hidden shadow-2xl relative p-5 justify-between"
          >
            {/* Glass Surface Sheen */}
            <div 
              className="absolute top-0 left-0 right-0 h-28 pointer-events-none opacity-25"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)'
              }}
            />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${currentTheme.bgBadge}`}>
                    <Crosshair className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wider uppercase font-mono">Mission Directives // Tactical Phase</h3>
                    <p className="text-[10px] text-zinc-400 font-mono">2 of 5 Tasks Completed</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                  40% Synced
                </span>
              </div>

              {/* Staggered Checklist Items */}
              <div className="space-y-2">
                {Object.entries(checklist).map(([task, done], idx) => (
                  <motion.div
                    key={task}
                    animate={{
                      y: isRevealed ? 0 : 6,
                      opacity: isRevealed ? 1 : 0
                    }}
                    transition={{
                      duration: 0.35 / speedMultiplier,
                      delay: (0.12 + idx * 0.035) / speedMultiplier
                    }}
                    whileHover={{ x: 2 }}
                    onClick={() => setChecklist(prev => ({ ...prev, [task]: !prev[task] }))}
                    style={{
                      background: done ? 'rgba(15, 20, 30, 0.4)' : 'rgba(20, 26, 40, 0.65)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      done ? 'opacity-70' : 'hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        done ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-zinc-700 bg-zinc-950/50'
                      }`}>
                        {done && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className={`text-xs font-medium truncate font-mono ${done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                        {task}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      SYS 0{idx + 1}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-zinc-800/80 flex items-center gap-3 font-mono relative z-10">
              <button
                type="button"
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Execute Mission Complete</span>
              </button>
              <button
                type="button"
                className="py-2.5 px-4 bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer"
              >
                PYQ Arena
              </button>
            </div>

          </motion.div>

        </main>
      </motion.div>

      {/* 3. DEV PLAYGROUND CONTROLLER TOOLBAR */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
        <div className="bg-zinc-900/95 border border-zinc-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center gap-2 sm:gap-2.5 flex-wrap max-w-6xl text-xs font-mono">
          
          {/* Replay Sequence Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={springs.snappy}
            onClick={runSequence}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer uppercase tracking-wider"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay</span>
            <span className="text-[10px] opacity-75 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-400/30">Space</span>
          </motion.button>

          <div className="h-6 w-px bg-zinc-700" />

          {/* Iteration Mode Selector: 10 Distinct Styles */}
          <div className="flex items-center gap-1 bg-zinc-950/70 p-1 rounded-xl border border-zinc-800 overflow-x-auto max-w-md sm:max-w-xl">
            {[
              { id: 'positronSparkle', label: 'Anime Pulse Sparkle (Iter 10)', icon: Flame },
              { id: 'lclFluid', label: 'LCL Fluid (Iter 6)', icon: Droplets },
              { id: 'neuralSynapse', label: 'Neural Synapse (Iter 7)', icon: Network },
              { id: 'hexArray', label: 'Hex Array (Iter 8)', icon: Shield },
              { id: 'tachoSpin', label: 'Chrono Spin (Iter 9)', icon: Gauge },
              { id: 'spearPiercing', label: 'Spear (Iter 4)', icon: Sword },
              { id: 'hexIris', label: 'Hex Iris (Iter 5)', icon: Aperture },
              { id: 'chronoColliders', label: 'Colliders (Iter 3)', icon: Orbit },
              { id: 'awakened', label: 'Awakened (Iter 2)', icon: Sparkles },
              { id: 'cross', label: 'AT-Cross (Iter 1)', icon: Crosshair }
            ].map(m => {
              const isSelected = evaMode === m.id;
              const IconComp = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setEvaMode(m.id as EvaMode)}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <IconComp className="w-3 h-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-zinc-700 hidden lg:block" />

          {/* Eva Unit Theme Selector */}
          <div className="flex items-center gap-1 bg-zinc-950/70 p-1 rounded-xl border border-zinc-800">
            {(['maths', 'physics', 'chemistry'] as const).map(s => {
              const theme = EVA_THEMES[s];
              const isSelected = subject === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected ? `${theme.bgBadge} font-extrabold shadow-sm` : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                  <span>{theme.unit}</span>
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-zinc-700 hidden sm:block" />

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-zinc-950/70 p-1 rounded-xl border border-zinc-800">
            {[
              { label: '1x', val: 1 },
              { label: '0.5x', val: 0.5 },
              { label: '0.25x', val: 0.25 }
            ].map(spd => (
              <button
                key={spd.val}
                type="button"
                onClick={() => setSpeedMultiplier(spd.val)}
                className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  speedMultiplier === spd.val 
                    ? 'bg-zinc-800 text-white border border-zinc-700' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>

          {/* Back to Dashboard */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-2.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer ml-auto flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>

        </div>
      </div>

    </div>
  );
}
