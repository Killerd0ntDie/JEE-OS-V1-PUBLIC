import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Zap, Sparkles, Hexagon, ArrowUpRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { getTitleAndColor } from '@/utils/levelingCalculations';
import { audioEngine } from '@/utils/audioEngine';

interface LevelUpCelebrationProps {
  isOpen: boolean;
  oldLevel: number;
  newLevel: number;
  onClose: () => void;
}

// Pre-calculated 24 hexagonal burst angles and distances
const HEX_BURST_PARTICLES = Array.from({ length: 24 }).map((_, i) => {
  const angle = (i / 24) * 360;
  const rad = (angle * Math.PI) / 180;
  const distance = 120 + (i % 3) * 50;
  return {
    id: i,
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
    size: 14 + (i % 4) * 6,
    color: ['#06b6d4', '#6366f1', '#10b981', '#fbbf24', '#f43f5e'][i % 5],
    delay: (i % 6) * 0.05,
    rotation: angle + 90,
  };
});

export function LevelUpCelebration({ isOpen, oldLevel, newLevel, onClose }: LevelUpCelebrationProps) {
  const [confettiActive, setConfettiActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfettiActive(true);
      audioEngine.playVictoryFanfare().catch(() => {});

      // Auto-close after 3.5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const { title: newTitle, color: titleColor } = getTitleAndColor(newLevel);
  const { title: oldTitle } = getTitleAndColor(oldLevel);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={200}
      backdropClassName="bg-black/60 backdrop-blur-md"
      className="glass-card border border-indigo-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-4 shadow-[0_0_50px_rgba(99,102,241,0.25)] relative overflow-hidden glass-panel"
    >
      {/* Background Holographic Radar Ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-72 h-72 rounded-full border border-indigo-500/20 animate-ping opacity-25" />
        <div className="w-52 h-52 rounded-full border border-cyan-500/20 animate-pulse opacity-40" />
      </div>

      {/* Cybernetic Hexagonal Particle Bursts */}
      {confettiActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          {HEX_BURST_PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0,
                opacity: 1,
                rotate: 0
              }}
              animate={{
                x: p.x,
                y: p.y,
                scale: [0, 1.2, 0.9],
                opacity: [1, 0.9, 0],
                rotate: p.rotation + 180
              }}
              transition={{
                duration: 1.4,
                delay: p.delay,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="absolute flex items-center justify-center"
              style={{ width: p.size, height: p.size }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_currentColor]" style={{ color: p.color }}>
                <polygon 
                  points="50 3, 90 25, 90 75, 50 97, 10 75, 10 25" 
                  fill={p.color} 
                  fillOpacity="0.25"
                  stroke={p.color} 
                  strokeWidth="6" 
                />
              </svg>
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative z-10 text-center space-y-4">
        {/* Japanese Header Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
          <span>レベル昇格 // SYNAPSE OVERCLOCK</span>
        </div>

        {/* Central Hexagonal Core Badge */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 15 }}
          className="flex justify-center"
        >
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
            <svg viewBox="0 0 100 100" className="w-20 h-20 text-indigo-400 drop-shadow-[0_0_20px_rgba(99,102,241,0.6)] animate-spin-slow">
              <polygon 
                points="50 3, 90 25, 90 75, 50 97, 10 75, 10 25" 
                fill="rgba(99, 102, 241, 0.15)" 
                stroke="#818cf8" 
                strokeWidth="4" 
                strokeDasharray="12 4"
              />
            </svg>
            <Trophy className="w-9 h-9 text-amber-400 absolute drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
          </div>
        </motion.div>

        {/* Level Up Indicator */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="space-y-1.5"
        >
          <h2 className="text-2xl font-display font-black text-white tracking-tight">
            LEVEL UP!
          </h2>
          <div className="flex items-center justify-center gap-3 text-4xl font-mono font-black">
            <span className="text-zinc-500">{oldLevel}</span>
            <ArrowUpRight className="w-6 h-6 text-emerald-400" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
              {newLevel}
            </span>
          </div>
        </motion.div>

        {/* New Tactical Title */}
        {oldTitle !== newTitle && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-3 border-t border-white/10"
          >
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1">UNLOCKED DESIGNATION</p>
            <p className={`text-base font-bold font-display ${titleColor}`}>
              {newTitle}
            </p>
          </motion.div>
        )}

        {/* Footer Subtext */}
        <div className="pt-2 text-[10px] font-mono text-zinc-500">
          Daily Study Velocity & XP Multiplier Increased
        </div>
      </div>
    </Modal>
  );
}
