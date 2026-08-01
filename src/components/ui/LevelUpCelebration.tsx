import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Zap } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { getTitleAndColor } from '@/utils/levelingCalculations';

interface LevelUpCelebrationProps {
  isOpen: boolean;
  oldLevel: number;
  newLevel: number;
  onClose: () => void;
}

export function LevelUpCelebration({ isOpen, oldLevel, newLevel, onClose }: LevelUpCelebrationProps) {
  const [confettiActive, setConfettiActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfettiActive(true);

      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const { title: newTitle, color: titleColor } = getTitleAndColor(newLevel);
  const { title: oldTitle } = getTitleAndColor(oldLevel);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ 
                type: "spring", 
                damping: 20, 
                stiffness: 300 
              }}
              className="glass-card border border-indigo-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl shadow-indigo-500/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Confetti particles */}
              {confettiActive && (
                <>
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        x: 0, 
                        y: 0, 
                        scale: 0,
                        opacity: 1
                      }}
                      animate={{
                        x: (Math.random() - 0.5) * 300,
                        y: (Math.random() - 0.5) * 300,
                        scale: Math.random() * 0.8 + 0.4,
                        opacity: 0,
                        rotate: Math.random() * 360
                      }}
                      transition={{
                        duration: 1.2,
                        delay: Math.random() * 0.3,
                        ease: "easeOut"
                      }}
                      className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: ['#FCD34D', '#A78BFA', '#34D399', '#60A5FA', '#F472B6'][i % 5]
                      }}
                    />
                  ))}
                </>
              )}

              <div className="relative z-10 text-center space-y-4">
                {/* Trophy Icon */}
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-400/10 blur-xl rounded-full" />
                    <Trophy className="w-16 h-16 text-amber-400 relative z-10" />
                  </div>
                </motion.div>

                {/* Level Up Text */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="space-y-2"
                >
                  <h2 className="text-2xl font-display font-bold text-white tracking-tight">
                    LEVEL UP!
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-4xl font-mono font-bold">
                    <span className="text-zinc-500">{oldLevel}</span>
                    <Zap className="w-6 h-6 text-amber-400" />
                    <span className="text-amber-400">{newLevel}</span>
                  </div>
                </motion.div>

                {/* Title Change */}
                {oldTitle !== newTitle && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="pt-3 border-t border-zinc-800/50"
                  >
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">New Title</p>
                    <p className={`text-lg font-bold ${titleColor}`}>
                      {newTitle}
                    </p>
                  </motion.div>
                )}

                {/* Sparkles decoration */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center gap-1.5 pt-2"
                >
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.15, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                    >
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
