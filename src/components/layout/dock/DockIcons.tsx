
import { motion, AnimatePresence } from 'motion/react';
import { springs, easings } from '@/constants/motion';
import { Icon } from '@/components/ui/Icon';

export function DockTooltip({
  label,
  shortcut,
  isAiCoach,
  isVisible
}: {
  label: string;
  shortcut?: string;
  isAiCoach: boolean;
  isVisible: boolean;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.88, ...(isAiCoach ? { x: 8 } : { y: 8 }) }}
          animate={{ opacity: 1, scale: 1, ...(isAiCoach ? { x: 0 } : { y: 0 }) }}
          exit={{ opacity: 0, scale: 0.88, ...(isAiCoach ? { x: 8 } : { y: 8 }) }}
          transition={springs.snappy}
          className={`absolute ${
            isAiCoach ? 'right-full mr-3.5 top-1/2 -translate-y-1/2' : 'bottom-full mb-3.5 left-1/2 -translate-x-1/2'
          } px-2.5 py-1 rounded-xl bg-zinc-950/95 backdrop-blur-2xl border border-white/20 text-white font-sans text-xs whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-[70] pointer-events-none flex items-center gap-1.5`}
        >
          <span className="font-semibold tracking-wide">{label}</span>
          {shortcut && (
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px] text-zinc-300 font-mono font-bold border border-white/10">
              {shortcut}
            </kbd>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AnimatedDashboardIcon({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative w-4.5 h-4.5 flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <motion.rect
          x="3" y="3" width="7" height="9" rx="1.5"
          animate={isHovered ? { scale: [1, 1.25, 1], y: [0, -1.5, 0] } : { scale: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0 }}
        />
        <motion.rect
          x="14" y="3" width="7" height="5" rx="1.5"
          animate={isHovered ? { scale: [1, 1.28, 1], x: [0, 1.5, 0] } : { scale: 1, x: 0 }}
          transition={{ duration: 0.38, delay: 0.06 }}
        />
        <motion.rect
          x="14" y="12" width="7" height="9" rx="1.5"
          animate={isHovered ? { scale: [1, 1.25, 1], y: [0, 1.5, 0] } : { scale: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.12 }}
        />
        <motion.rect
          x="3" y="16" width="7" height="5" rx="1.5"
          animate={isHovered ? { scale: [1, 1.28, 1], x: [0, -1.5, 0] } : { scale: 1, x: 0 }}
          transition={{ duration: 0.38, delay: 0.18 }}
        />
      </svg>
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.6, 0.3], scale: [0.5, 1.35, 1.15] }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-indigo-500/25 blur-xs rounded-full -z-10 pointer-events-none"
        />
      )}
    </div>
  );
}

export function AnimatedPlannerIcon({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative w-4 h-4 flex items-center justify-center">
      <motion.div
        animate={isHovered ? { y: [0, -3, 0], scale: [1, 1.2, 1.15] } : { y: 0, scale: 1 }}
        transition={springs.bouncy}
        className="flex items-center justify-center"
      >
        <Icon name="Calendar" className="w-4 h-4" />
      </motion.div>
      {isHovered && (
        <>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 1] }}
            transition={{ duration: 0.25 }}
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8] pointer-events-none"
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.3, 1], opacity: [0, 0.6, 0.2] }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 bg-indigo-500/25 blur-xs rounded-full pointer-events-none"
          />
        </>
      )}
    </div>
  );
}

export function AnimatedMockTestsIcon({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative w-4 h-4 flex items-center justify-center text-cyan-400">
      <motion.div
        animate={isHovered ? { scale: [1, 1.2, 1.15], y: [0, -1.5, 0] } : { scale: 1, y: 0 }}
        transition={springs.bouncy}
        className="flex items-center justify-center"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <motion.path
            d="m9 14 2 2 4-4"
            initial={false}
            animate={isHovered ? { pathLength: [0.4, 1], strokeWidth: [2, 2.5, 2] } : { pathLength: 1 }}
            transition={{ duration: 0.35 }}
          />
        </svg>
      </motion.div>
      {isHovered && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.3, 1.1], opacity: [0, 0.4, 0.1] }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 bg-cyan-500/20 blur-xs rounded-full pointer-events-none -z-10"
        />
      )}
    </div>
  );
}

export function AnimatedPracticeIcon({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative w-4 h-4 flex items-center justify-center text-emerald-400">
      <motion.div
        animate={isHovered ? { rotate: -360, scale: 1.22 } : { rotate: 0, scale: 1 }}
        transition={isHovered ? { duration: 0.7, ease: easings.expoOut } : springs.snappy}
        className="flex items-center justify-center"
      >
        <Icon name="RotateCcw" className="w-4 h-4 text-emerald-400" />
      </motion.div>
      {isHovered && (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.4, 1.2], opacity: [0, 0.6, 0.2] }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-emerald-500/25 blur-xs rounded-full pointer-events-none"
        />
      )}
    </div>
  );
}

export function AnimatedCoachIcon({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative w-4 h-4 flex items-center justify-center text-purple-400">
      <motion.div
        animate={isHovered ? { scale: [1, 1.2, 1.15], y: [0, -1.5, 0] } : { scale: 1, y: 0 }}
        transition={springs.bouncy}
        className="flex items-center justify-center"
      >
        <Icon name="Bot" className="w-4 h-4 text-purple-400" />
      </motion.div>
    </div>
  );
}

export function AnimatedSearchIcon({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative w-4 h-4 flex items-center justify-center">
      <motion.div
        animate={isHovered ? { scale: 1.15, rotate: [0, -10, 0] } : { scale: 1, rotate: 0 }}
        transition={springs.snappy}
        className="relative flex items-center justify-center text-zinc-400 group-hover:text-cyan-300 transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <motion.path
            d="M8 8a4.5 4.5 0 0 1 4-1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-cyan-200"
            initial={{ opacity: 0.2 }}
            animate={isHovered ? { opacity: [0.2, 1, 0.4] } : { opacity: 0.2 }}
            transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0, repeatDelay: 0.6 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

export function AnimatedStreakIcon({ 
  streak, 
  isHovered, 
  isGodMode: _isGodMode 
}: { 
  streak: number; 
  isHovered: boolean; 
  isGodMode: boolean; 
}) {
  const hasStreak = streak > 0;

  if (!hasStreak) {
    return (
      <div className="relative flex items-center justify-center text-zinc-500">
        <motion.div
          animate={isHovered ? { scale: 1.2, y: -1 } : { scale: 1, y: 0 }}
          transition={springs.snappy}
          className="flex items-center justify-center"
        >
          <Icon name="Flame" className="w-3.5 h-3.5" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      animate={isHovered ? { scale: 1.15, y: -1 } : { scale: 1, y: 0 }}
      transition={springs.snappy}
      className="relative w-4 h-4 flex items-center justify-center"
    >
      {/* 1. Ambient Thermal Inferno Glow */}
      <motion.div
        animate={{ 
          scale: isHovered ? [1.1, 1.45, 1.15, 1.4, 1.1] : [1, 1.35, 1.05, 1.28, 1], 
          opacity: isHovered ? [0.65, 0.95, 0.7, 0.9, 0.65] : [0.5, 0.85, 0.55, 0.8, 0.5] 
        }}
        transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-[-4px] bg-gradient-to-t from-red-600/50 via-orange-500/40 to-amber-300/20 blur-xs rounded-full pointer-events-none -z-10"
      />

      {/* 2. Embers & Fiery Sparks Shooting Upward */}
      <motion.span
        animate={{
          opacity: [0, 1, 0],
          y: [0, -12, -18],
          x: [-1, -3, -5],
          scale: [0.6, 1, 0.2]
        }}
        transition={{ duration: 0.65, repeat: Infinity, ease: 'easeOut' }}
        className="absolute w-1 h-1 rounded-full bg-yellow-300 shadow-[0_0_6px_#fde047] pointer-events-none -top-0.5"
      />
      <motion.span
        animate={{
          opacity: [0, 1, 0],
          y: [0, -15, -22],
          x: [0, 2, 4],
          scale: [0.7, 1.1, 0.2]
        }}
        transition={{ duration: 0.8, delay: 0.15, repeat: Infinity, ease: 'easeOut' }}
        className="absolute w-1 h-1 rounded-full bg-orange-400 shadow-[0_0_6px_#f97316] pointer-events-none -top-1"
      />
      <motion.span
        animate={{
          opacity: [0, 0.9, 0],
          y: [0, -10, -15],
          x: [1, 3, 2],
          scale: [0.5, 0.9, 0.1]
        }}
        transition={{ duration: 0.55, delay: 0.35, repeat: Infinity, ease: 'easeOut' }}
        className="absolute w-1 h-1 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444] pointer-events-none -top-0.5"
      />

      {/* 3. Layer 1: Roaring Outer Fire Tongue */}
      <motion.div
        style={{ transformOrigin: 'bottom center' }}
        animate={{
          scaleY: [1, 1.3, 0.92, 1.25, 1],
          scaleX: [1, 0.92, 1.08, 0.96, 1],
          skewX: [-4, 5, -3, 4, 0],
          rotate: [-3, 4, -2, 3, 0]
        }}
        transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center justify-center text-red-500 fill-red-600 opacity-90 drop-shadow-[0_0_8px_rgba(239,68,68,0.75)]"
      >
        <Icon name="Flame" className="w-4 h-4" />
      </motion.div>

      {/* 4. Layer 2: Wild Mid Blaze Tongue */}
      <motion.div
        style={{ transformOrigin: 'bottom center' }}
        animate={{
          scaleY: [1, 1.2, 0.96, 1.16, 1],
          scaleX: [1, 1.04, 0.96, 1.02, 1],
          skewX: [3, -4, 2, -3, 0]
        }}
        transition={{ duration: 0.35, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 flex items-center justify-center text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.85)]"
      >
        <Icon name="Flame" className="w-3.5 h-3.5" />
      </motion.div>

      {/* 5. Layer 3: White-Hot Plasma Heart Core */}
      <motion.div
        style={{ transformOrigin: 'bottom center' }}
        animate={{
          scale: [0.9, 1.25, 0.88, 1.18, 0.9],
          opacity: [0.85, 1, 0.8, 1, 0.85]
        }}
        transition={{ duration: 0.28, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0 z-20 flex items-center justify-center text-yellow-200 fill-yellow-100"
      >
        <svg viewBox="0 0 16 16" className="w-2 h-2.5" fill="currentColor">
          <path d="M8 1.5c-.6 1.8-2 3.2-2 5a2 2 0 0 0 4 0c0-1.8-1.4-3.2-2-5z" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

export function AnimatedCalendarDayFire({ day = 1, isToday = false }: { day?: number; isToday?: boolean }) {
  const phaseDelay = (day % 5) * 0.12;

  return (
    <div className="relative w-5 h-5 flex items-center justify-center pointer-events-none select-none">
      <motion.div
        animate={{
          scale: [0.9, 1.35, 0.95, 1.25, 0.9],
          opacity: isToday ? [0.6, 0.95, 0.6, 0.9, 0.6] : [0.35, 0.75, 0.4, 0.7, 0.35]
        }}
        transition={{ duration: 0.85, delay: phaseDelay, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-[-2px] bg-gradient-to-t from-red-600/40 via-amber-500/35 to-yellow-300/20 blur-xs rounded-full pointer-events-none -z-10"
      />

      <motion.span
        animate={{
          opacity: [0, 1, 0],
          y: [0, -6, -10],
          x: [-0.5, 1, -0.5],
          scale: [0.5, 1, 0.2]
        }}
        transition={{ duration: 0.75, delay: phaseDelay, repeat: Infinity, ease: 'easeOut' }}
        className="absolute w-0.5 h-0.5 rounded-full bg-yellow-300 shadow-[0_0_4px_#fde047] pointer-events-none -top-0.5"
      />
      <motion.span
        animate={{
          opacity: [0, 0.85, 0],
          y: [0, -8, -12],
          x: [0.5, -1, 1],
          scale: [0.6, 0.9, 0.2]
        }}
        transition={{ duration: 0.9, delay: phaseDelay + 0.25, repeat: Infinity, ease: 'easeOut' }}
        className="absolute w-0.5 h-0.5 rounded-full bg-orange-400 shadow-[0_0_4px_#f97316] pointer-events-none -top-1"
      />

      <motion.div
        style={{ transformOrigin: 'bottom center' }}
        animate={{
          scaleY: [1, 1.28, 0.92, 1.22, 1],
          scaleX: [1, 0.9, 1.08, 0.94, 1],
          skewX: [-3, 4, -2, 3, 0],
          rotate: [-2, 3, -1, 2, 0]
        }}
        transition={{ duration: 0.52, delay: phaseDelay, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center justify-center text-red-500 fill-red-500/80 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]"
      >
        <Icon name="Flame" className="w-3.5 h-3.5" />
      </motion.div>

      <motion.div
        style={{ transformOrigin: 'bottom center' }}
        animate={{
          scaleY: [1, 1.18, 0.96, 1.15, 1],
          scaleX: [1, 1.04, 0.96, 1.02, 1],
          skewX: [2, -3, 1, -2, 0]
        }}
        transition={{ duration: 0.4, delay: phaseDelay + 0.05, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 flex items-center justify-center text-amber-400 fill-amber-300 drop-shadow-[0_0_4px_rgba(245,158,11,0.9)]"
      >
        <Icon name="Flame" className="w-3 h-3" />
      </motion.div>

      <motion.div
        style={{ transformOrigin: 'bottom center' }}
        animate={{
          scale: [0.85, 1.25, 0.85, 1.18, 0.85],
          opacity: [0.8, 1, 0.75, 1, 0.8]
        }}
        transition={{ duration: 0.3, delay: phaseDelay, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0.5 z-20 flex items-center justify-center text-yellow-100 fill-yellow-100"
      >
        <svg viewBox="0 0 16 16" className="w-1.5 h-2" fill="currentColor">
          <path d="M8 1.5c-.6 1.8-2 3.2-2 5a2 2 0 0 0 4 0c0-1.8-1.4-3.2-2-5z" />
        </svg>
      </motion.div>
    </div>
  );
}

export function AnimatedClockIcon({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative w-3.5 h-3.5 flex items-center justify-center text-indigo-400">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-3.5 h-3.5"
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="12" x2="12" y2="7.5" strokeWidth="2.2" />
        <motion.g
          style={{ transformOrigin: '12px 12px' }}
          animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
          transition={isHovered ? { duration: 1.2, ease: 'linear', repeat: Infinity } : springs.snappy}
        >
          <line x1="12" y1="12" x2="16.5" y2="12" strokeWidth="2" stroke="currentColor" />
        </motion.g>
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}

export function AnimatedBellIcon({ 
  isHovered, 
  unreadCount 
}: { 
  isHovered: boolean; 
  unreadCount: number; 
}) {
  const hasUnread = unreadCount > 0;
  return (
    <div className="relative w-4 h-4 flex items-center justify-center">
      {isHovered && (
        <>
          <motion.span
            initial={{ opacity: 0, x: 0, scaleY: 0.5 }}
            animate={{ opacity: [0, 0.9, 0], x: -4, scaleY: [0.5, 1.2, 0.8] }}
            transition={{ duration: 0.45, repeat: Infinity, repeatDelay: 0.08 }}
            className="absolute left-0 w-1.5 h-3 border-l-2 border-indigo-400 rounded-l-full pointer-events-none"
          />
          <motion.span
            initial={{ opacity: 0, x: 0, scaleY: 0.5 }}
            animate={{ opacity: [0, 0.9, 0], x: 4, scaleY: [0.5, 1.2, 0.8] }}
            transition={{ duration: 0.45, repeat: Infinity, repeatDelay: 0.08 }}
            className="absolute right-0 w-1.5 h-3 border-r-2 border-indigo-400 rounded-r-full pointer-events-none"
          />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.4, 1.1], opacity: [0, 0.6, 0.2] }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 bg-indigo-500/30 blur-xs rounded-full pointer-events-none -z-10"
          />
        </>
      )}

      <motion.div
        style={{ transformOrigin: 'top center' }}
        animate={
          isHovered
            ? { rotate: [0, -22, 20, -14, 12, -6, 0] }
            : hasUnread
            ? { rotate: [0, -14, 14, -8, 8, 0] }
            : { rotate: 0 }
        }
        transition={
          isHovered
            ? { duration: 0.65, ease: 'easeInOut' }
            : hasUnread
            ? { repeat: Infinity, repeatDelay: 3.5, duration: 0.6 }
            : springs.snappy
        }
        className="flex items-center justify-center text-zinc-400 group-hover:text-white"
      >
        <Icon name="Bell" className="w-4 h-4" />
      </motion.div>

      {hasUnread && (
        <>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full animate-ping pointer-events-none" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-400 rounded-full pointer-events-none" />
        </>
      )}
    </div>
  );
}

export function AnimatedProfileAvatar({ 
  isHovered, 
  userInitial, 
  photoURL, 
  displayName,
  level: _level
}: { 
  isHovered: boolean; 
  userInitial: string; 
  photoURL?: string | null; 
  displayName: string;
  level: number;
}) {
  return (
    <div className="relative w-7 h-7 flex items-center justify-center">
      <motion.div
        animate={isHovered ? { scale: 1.08 } : { scale: 1 }}
        transition={springs.snappy}
        className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-mono text-xs font-bold text-indigo-300 overflow-hidden ring-1 ring-white/10 hover:ring-indigo-400/50 relative z-10"
      >
        {photoURL ? (
          <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          userInitial
        )}
      </motion.div>
    </div>
  );
}
