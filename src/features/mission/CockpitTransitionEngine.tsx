import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SubjectId } from '@/types';
import { audioEngine } from '@/utils/audioEngine';

export type CockpitAnimMode = 
  | 'positronSparkle'
  | 'missileLock'
  | 'lclFluid' 
  | 'neuralSynapse' 
  | 'hexArray' 
  | 'tachoSpin' 
  | 'spearPiercing' 
  | 'hexIris' 
  | 'chronoColliders' 
  | 'awakened' 
  | 'cross';

export interface CockpitTransitionEngineProps {
  activeSubject?: SubjectId | string;
  animMode?: CockpitAnimMode;
  speedMultiplier?: number;
  originCoords: { x: number; y: number; pctX: number; pctY: number };
  stage: 'standby' | 'magi' | 'active' | 'revealed';
  onStageChange: (stage: 'standby' | 'magi' | 'active' | 'revealed') => void;
  onComplete?: () => void;
}

export const ANIM_MODES_META: Record<CockpitAnimMode, { label: string; desc: string }> = {
  positronSparkle: { label: 'Anime Pulse Sparkle', desc: 'Expand -> Implode -> Mega-Expand Singularity' },
  missileLock: { label: 'Missile Lock-On', desc: 'Fighter Jet HUD reticle snap, lead crosshairs & FOX-3 launch' },
  lclFluid: { label: 'LCL Fluid Immersion', desc: 'Rising golden liquid & effervescent bubbles' },
  neuralSynapse: { label: 'Neural Synapse Arc', desc: 'Dual brainwave spark nodes & fractal perimeter lightning' },
  hexArray: { label: 'Hex Honeycomb Array', desc: '7-tile honeycomb rosette assembly & matrix lock' },
  tachoSpin: { label: 'Quantum Tachometer', desc: '12,000 RPM chronometer needle spin-up' },
  spearPiercing: { label: 'Spear of Longinus', desc: 'Double-helix spiral lance & refractive glass shatter' },
  hexIris: { label: 'Hex Iris Aperture', desc: '6-blade mechanical iris spiral unlock' },
  chronoColliders: { label: 'Chrono Collider', desc: 'Dual rim particle colliders meeting at 6 oclock' },
  awakened: { label: 'MAGI Awakened', desc: '3/3 consensus handshake & telemetry compass' },
  cross: { label: 'AT-Field Cross', desc: 'Concentric octagonal AT-Field resonance' }
};

export function CockpitTransitionEngine({
  activeSubject = 'physics',
  animMode = 'positronSparkle',
  speedMultiplier = 0.25,
  originCoords,
  stage,
  onStageChange,
  onComplete
}: CockpitTransitionEngineProps) {
  const radius = 115;

  const getTheme = () => {
    const s = (activeSubject || '').toLowerCase();
    if (s.includes('chem')) {
      return {
        unit: 'EVA UNIT-02',
        primary: '#10b981',
        secondary: '#f59e0b',
        glow: 'rgba(16, 185, 129, 0.4)',
        atFieldColor: '#10b981'
      };
    }
    if (s.includes('math')) {
      return {
        unit: 'EVA UNIT-01',
        primary: '#c084fc',
        secondary: '#4ade80',
        glow: 'rgba(192, 132, 252, 0.4)',
        atFieldColor: '#c084fc'
      };
    }
    return {
      unit: 'EVA UNIT-00',
      primary: '#38bdf8',
      secondary: '#ffffff',
      glow: 'rgba(56, 189, 248, 0.4)',
      atFieldColor: '#38bdf8'
    };
  };

  const currentTheme = getTheme();

  useEffect(() => {
    onStageChange('standby');
    // Tactical Evangelion Entry Stinger & AT-Field Resonance Glint
    audioEngine.playAnimeLaserCharge(activeSubject, animMode).catch(() => {});

    let magiTimer: ReturnType<typeof setTimeout> | undefined;
    let activeTimer: ReturnType<typeof setTimeout> | undefined;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;

    if (animMode === 'awakened') {
      magiTimer = setTimeout(() => {
        onStageChange('magi');

        activeTimer = setTimeout(() => {
          onStageChange('active');
          audioEngine.playCruelAngelsThesisEntrance(activeSubject).catch(() => {});

          revealTimer = setTimeout(() => {
            onStageChange('revealed');
            onComplete?.();
          }, 450 / speedMultiplier);
        }, 300 / speedMultiplier);
      }, 80 / speedMultiplier);
    } else {
      activeTimer = setTimeout(() => {
        onStageChange('active');
        audioEngine.playCruelAngelsThesisEntrance(activeSubject).catch(() => {});

        const duration = (
          animMode === 'positronSparkle' ? 520 :
          animMode === 'missileLock' ? 480 :
          animMode === 'lclFluid' ? 440 :
          animMode === 'neuralSynapse' ? 400 :
          animMode === 'hexArray' ? 420 :
          animMode === 'tachoSpin' ? 420 :
          animMode === 'spearPiercing' ? 420 :
          animMode === 'hexIris' ? 400 : 380
        ) / speedMultiplier;

        revealTimer = setTimeout(() => {
          onStageChange('revealed');
          onComplete?.();
        }, duration);
      }, 360 / speedMultiplier);
    }

    return () => {
      if (magiTimer) clearTimeout(magiTimer);
      if (activeTimer) clearTimeout(activeTimer);
      if (revealTimer) clearTimeout(revealTimer);
      audioEngine.stopEntrancePlayback();
    };
  }, [animMode, activeSubject, speedMultiplier]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      
      {/* MAGI 3/3 CONSENSUS HANDSHAKE (Awakened Mode) */}
      <AnimatePresence>
        {animMode === 'awakened' && stage === 'magi' && (
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
            {/* Status Telemetry Badge */}
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
                {animMode === 'positronSparkle'
                  ? '[ ANIME SINGULARITY // EXPAND-SHRINK-EXPAND ]'
                  : animMode === 'missileLock'
                  ? '[ TACTICAL MISSILE LOCK // FOX 3 ARMED ]'
                  : animMode === 'lclFluid'
                  ? '[ LCL LIQUID INJECTION : 100% // IMMERSION ]'
                  : animMode === 'neuralSynapse'
                  ? '[ NEURAL SYNAPSE // BRAINWAVE HARMONY: 99.8% ]'
                  : animMode === 'hexArray'
                  ? '[ AT-FIELD HEX-ARRAY // MATRIX LOCKED ]'
                  : animMode === 'tachoSpin'
                  ? '[ CHRONO OVERDRIVE // 12,000 RPM ]'
                  : animMode === 'spearPiercing' 
                  ? '[ SPEAR OF LONGINUS // TARGET LOCK: 100% ]'
                  : animMode === 'hexIris'
                  ? '[ APERTURE INTERLOCK : UNLOCKING ]'
                  : animMode === 'chronoColliders'
                  ? '[ CHRONO-CORE : ARMED // 400Hz ]'
                  : animMode === 'awakened'
                  ? '[ S² SUPERNOVA CORE : AWAKENED ]'
                  : '[ AT FIELD : STABILIZING ]'}
              </span>
            </motion.div>

            {/* 1. ANIME EXPAND -> SHRINK -> EXPAND SPARKLE (Default Flagship) */}
            {animMode === 'positronSparkle' && (
              <div className="absolute flex items-center justify-center pointer-events-none">
                {/* Gravitational Energy Inflow */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 360) / 12;
                  const rad = (angle * Math.PI) / 180;
                  const dist = 95;
                  return (
                    <motion.div
                      key={`inflow-spark-${i}`}
                      initial={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 0, opacity: 0 }}
                      animate={{ 
                        x: [Math.cos(rad) * dist, 0, Math.cos(rad) * (dist * 1.5)], 
                        y: [Math.sin(rad) * dist, 0, Math.sin(rad) * (dist * 1.5)],
                        scale: [0, 1.2, 0],
                        opacity: [0, 0.9, 0]
                      }}
                      transition={{ 
                        duration: 0.5 / speedMultiplier, 
                        times: [0, 0.45, 1],
                        delay: (i * 0.01) / speedMultiplier, 
                        ease: "easeInOut" 
                      }}
                      className="absolute w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8]"
                    />
                  );
                })}

                {/* Outer Pulsing Compression Rings */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 1.4, 0.25, 2.8, 4.0], 
                    opacity: [0, 0.9, 0.4, 0.95, 0] 
                  }}
                  transition={{ duration: 0.5 / speedMultiplier, times: [0, 0.28, 0.55, 0.85, 1], ease: "easeInOut" }}
                  className="absolute w-36 h-36 rounded-full border-2 border-cyan-400/80 shadow-[0_0_24px_rgba(56,189,248,0.6)]"
                />

                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 1.1, 0.18, 2.2, 3.4], 
                    opacity: [0, 0.8, 0.3, 0.85, 0] 
                  }}
                  transition={{ duration: 0.5 / speedMultiplier, times: [0, 0.28, 0.55, 0.85, 1], ease: "easeInOut" }}
                  className="absolute w-28 h-28 rounded-full border border-indigo-400/90 shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                />

                {/* 4 Concentric Cardinal Energy Blades */}
                {[0, 90, 180, 270].map((deg, i) => (
                  <motion.div
                    key={`cardinal-blade-${i}`}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ 
                      scaleY: [0, 1.5, 0.1, 3.2, 0], 
                      opacity: [0, 0.9, 0.4, 1, 0] 
                    }}
                    transition={{ 
                      duration: 0.5 / speedMultiplier, 
                      times: [0, 0.28, 0.55, 0.85, 1], 
                      ease: "easeInOut" 
                    }}
                    style={{ transform: `rotate(${deg}deg)` }}
                    className="absolute w-1 h-32 bg-gradient-to-t from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_#38bdf8]"
                  />
                ))}

                {/* 4 Diagonal Kinetic Prongs */}
                {[45, 135, 225, 315].map((deg, i) => (
                  <motion.div
                    key={`diag-blade-${i}`}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ 
                      scaleY: [0, 1.2, 0.08, 2.6, 0], 
                      opacity: [0, 0.7, 0.3, 0.85, 0] 
                    }}
                    transition={{ 
                      duration: 0.5 / speedMultiplier, 
                      times: [0, 0.28, 0.55, 0.85, 1], 
                      ease: "easeInOut" 
                    }}
                    style={{ transform: `rotate(${deg}deg)` }}
                    className="absolute w-0.5 h-24 bg-gradient-to-t from-transparent via-indigo-300 to-transparent"
                  />
                ))}

                {/* Rotating High-Tech Reticle */}
                <motion.div
                  initial={{ rotate: 0, scale: 0, opacity: 0 }}
                  animate={{ 
                    rotate: [0, 90, 270, 450], 
                    scale: [0, 1.3, 0.2, 2.4, 0],
                    opacity: [0, 0.8, 0.3, 0.9, 0]
                  }}
                  transition={{ 
                    duration: 0.5 / speedMultiplier, 
                    times: [0, 0.28, 0.55, 0.85, 1],
                    ease: "easeInOut" 
                  }}
                  className="absolute w-24 h-24 rounded-full border border-dashed border-cyan-300/80"
                />

                {/* Dynamic Center Anime Star Singularity */}
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

            {/* 2. TACTICAL FIGHTER JET MISSILE LOCK-ON HUD */}
            {animMode === 'missileLock' && (
              <div className="absolute flex items-center justify-center pointer-events-none">
                {/* Tactical Circular Seeker Gimbal Reticle */}
                <motion.div
                  initial={{ scale: 2.4, opacity: 0, rotate: -45 }}
                  animate={{ 
                    scale: [2.4, 1.2, 0.95, 1.05, 3.2], 
                    opacity: [0, 0.85, 1, 1, 0], 
                    rotate: [-45, 0, 90, 180, 270] 
                  }}
                  transition={{ 
                    duration: 0.48 / speedMultiplier, 
                    times: [0, 0.25, 0.6, 0.85, 1], 
                    ease: "easeInOut" 
                  }}
                  className="absolute rounded-full border border-dashed border-emerald-400/80 flex items-center justify-center"
                  style={{
                    width: 200,
                    height: 200,
                    boxShadow: `0 0 30px rgba(16, 185, 129, 0.35)`,
                  }}
                >
                  {/* 4 Cardinal Seeker Brackets */}
                  {['top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2', 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2'].map((pos, i) => (
                    <div key={`bracket-${i}`} className={`absolute w-3 h-3 border-2 border-emerald-400 ${pos}`} />
                  ))}
                </motion.div>

                {/* Target Acquisition Diamond & Fast Converging Box */}
                <motion.div
                  initial={{ scale: 3, opacity: 0 }}
                  animate={{ 
                    scale: [3, 1.3, 0.8, 1, 0], 
                    opacity: [0, 1, 1, 1, 0] 
                  }}
                  transition={{ 
                    duration: 0.45 / speedMultiplier, 
                    times: [0, 0.3, 0.65, 0.85, 1], 
                    ease: [0.16, 1, 0.3, 1] 
                  }}
                  className="absolute flex items-center justify-center"
                >
                  {/* Corner Brackets for Lock Box */}
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400" />
                    <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400" />
                    <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400" />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400" />
                    
                    {/* Flashing Target Diamond */}
                    <motion.div
                      animate={{ rotate: 45, scale: [0.8, 1.1, 0.9, 1.2] }}
                      transition={{ repeat: Infinity, duration: 0.15 / speedMultiplier }}
                      className="w-8 h-8 border-2 border-rose-500 bg-rose-500/15 shadow-[0_0_15px_rgba(244,63,94,0.7)]"
                    />
                  </div>
                </motion.div>

                {/* Lead Computing Crosshairs & Precision Center Pip */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1.2, 0] }}
                  transition={{ duration: 0.45 / speedMultiplier, times: [0, 0.2, 0.85, 1] }}
                  className="absolute flex items-center justify-center"
                >
                  <div className="w-16 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <div className="h-16 w-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] absolute" />
                  <div className="w-2.5 h-2.5 rounded-full border border-emerald-300 absolute animate-ping" />
                </motion.div>

                {/* Fighter Jet HUD Flight Data Readout Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.45 / speedMultiplier, times: [0, 0.2, 0.85, 1] }}
                  className="absolute font-mono text-[9px] font-black tracking-widest text-emerald-400 flex flex-col gap-1 pointer-events-none"
                  style={{
                    transform: 'translate(70px, -55px)',
                    textShadow: '0 0 8px rgba(16, 185, 129, 0.8)'
                  }}
                >
                  <div className="flex items-center gap-1.5 text-rose-400 animate-pulse font-extrabold text-[10px]">
                    <span>LOCK-ON</span>
                    <span className="bg-rose-500 text-black px-1 rounded-xs">FOX-3</span>
                  </div>
                  <div>RNG: 8.4 NM</div>
                  <div>MACH: 2.65</div>
                  <div>G-LOAD: 8.2G</div>
                  <div>AIM-120D ARMED</div>
                </motion.div>

                {/* Left Azimuth Pitch Ladder */}
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: [0, 0.85, 0.85, 0], x: [-15, 0, 0, -10] }}
                  transition={{ duration: 0.45 / speedMultiplier, times: [0, 0.2, 0.85, 1] }}
                  className="absolute font-mono text-[8px] text-emerald-500/80 flex flex-col gap-1.5 pointer-events-none"
                  style={{ transform: 'translate(-115px, -35px)' }}
                >
                  <div>── 20 ──</div>
                  <div>── 10 ──</div>
                  <div className="text-emerald-300 font-bold">──  0 ──</div>
                  <div>── -10 ──</div>
                </motion.div>

                {/* 5. Perfectly Centered Kinetic Missile Launch Radial Streak Rays & Mach Cones */}
                <div className="absolute w-0 h-0 flex items-center justify-center pointer-events-none">
                  {/* Concentric Mach Shockwave Expansion Rings */}
                  <motion.div
                    initial={{ scale: 0.1, opacity: 0 }}
                    animate={{ 
                      scale: [0.1, 1.8, 4.5], 
                      opacity: [0, 1, 0] 
                    }}
                    transition={{ 
                      duration: 0.45 / speedMultiplier, 
                      delay: 0.15 / speedMultiplier,
                      ease: "easeOut" 
                    }}
                    className="absolute w-28 h-28 rounded-full border-2 border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.8)]"
                  />
                  <motion.div
                    initial={{ scale: 0.1, opacity: 0 }}
                    animate={{ 
                      scale: [0.1, 2.2, 5.5], 
                      opacity: [0, 0.7, 0] 
                    }}
                    transition={{ 
                      duration: 0.48 / speedMultiplier, 
                      delay: 0.20 / speedMultiplier,
                      ease: "easeOut" 
                    }}
                    className="absolute w-36 h-36 rounded-full border border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
                  />

                  {/* 8-Axis Centered Laser Streak Beams */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={`missile-ray-${i}`}
                      initial={{ scaleX: 0.05, opacity: 0 }}
                      animate={{ 
                        scaleX: [0.05, 1.4, 3.8], 
                        opacity: [0, 0.95, 0]
                      }}
                      transition={{ 
                        duration: 0.42 / speedMultiplier, 
                        delay: (0.16 + (i % 4) * 0.02) / speedMultiplier,
                        ease: "easeOut" 
                      }}
                      style={{
                        position: 'absolute',
                        width: 220,
                        height: 2,
                        left: -110,
                        top: -1,
                        transformOrigin: 'center center',
                        transform: `rotate(${i * 45}deg)`,
                        background: 'linear-gradient(90deg, transparent, rgba(244, 63, 94, 0.95), #ffffff, rgba(251, 191, 36, 0.95), transparent)',
                        boxShadow: '0 0 12px rgba(244, 63, 94, 0.85)'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 2. LCL FLUID IMMERSION */}
            {animMode === 'lclFluid' && (
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

            {/* 3. NEURAL SYNAPSE */}
            {animMode === 'neuralSynapse' && (
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
                  className="absolute rounded-full border-2 border-dashed border-sky-400"
                  style={{ 
                    width: `${radius * 2}px`, 
                    height: `${radius * 2}px`,
                    boxShadow: `0 0 20px ${currentTheme.primary}` 
                  }}
                />
              </div>
            )}

            {/* 4. HEX HONEYCOMB ARRAY */}
            {animMode === 'hexArray' && (
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

            {/* 5. QUANTUM TACHOMETER */}
            {animMode === 'tachoSpin' && (
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

            {/* 6. SPEAR OF LONGINUS */}
            {animMode === 'spearPiercing' && (
              <>
                <motion.div
                  initial={{ scale: 0.1, rotate: 0, opacity: 0 }}
                  animate={{ scale: [0.1, 1.8, 1], rotate: [0, 540], opacity: [0, 1, 0.9] }}
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

            {/* 7. HEX IRIS APERTURE */}
            {animMode === 'hexIris' && (
              <div style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }} className="absolute flex items-center justify-center pointer-events-none">
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                  <motion.div
                    key={`iris-blade-${deg}`}
                    initial={{ rotate: deg, scale: 0.2, opacity: 0 }}
                    animate={{ rotate: [deg, deg + 45, deg + 90], scale: [0.2, 1, 1.2], opacity: [0, 1, 0.8] }}
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

            {/* 8. CHRONO COLLIDERS */}
            {animMode === 'chronoColliders' && (
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

            {/* 9. AWAKENED SUPERNOVA */}
            {animMode === 'awakened' && (
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
                      className="absolute w-2 h-0.5"
                      style={{ 
                        transform: `rotate(${deg}deg) translate(68px)`,
                        backgroundColor: currentTheme.primary 
                      }}
                    />
                  ))}
                </motion.div>
                <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
              </>
            )}

            {/* 10. AT-FIELD CROSS */}
            {animMode === 'cross' && (
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
  );
}
