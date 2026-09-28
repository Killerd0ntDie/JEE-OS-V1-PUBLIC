import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { springs, easings } from '@/constants/motion';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useShallow } from 'zustand/react/shallow';
import { JeeOsLogo } from '@/components/shared/JeeOsLogo';
import { ChapterTelemetry } from '@jee-os/engines';
import { useToast } from '@/components/ui/ToastProvider';
import { storageAdapter } from '@/services/StorageAdapter';
import { getTodayStudyMinutes } from '@/utils/streakCalculations';
import { calculateLevelFromXP, getTitleAndColor } from '@/utils/levelingCalculations';

function DockTooltip({
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

// Creative Tactical HUD Animated Icons - Primary Hierarchy Tier
function AnimatedDashboardIcon({ isHovered }: { isHovered: boolean }) {
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

function AnimatedPlannerIcon({ isHovered }: { isHovered: boolean }) {
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

function AnimatedMockTestsIcon({ isHovered }: { isHovered: boolean }) {
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

function AnimatedPracticeIcon({ isHovered }: { isHovered: boolean }) {
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

function AnimatedCoachIcon({ isHovered }: { isHovered: boolean }) {
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

function AnimatedSearchIcon({ isHovered }: { isHovered: boolean }) {
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
          {/* Optical Glint Reflection Arc inside lens */}
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

function AnimatedStreakIcon({ 
  streak, 
  isHovered: _isHovered, 
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
        <Icon name="Flame" className="w-3.5 h-3.5" />
      </div>
    );
  }

  return (
    <div className="relative w-4 h-4 flex items-center justify-center">
      {/* 1. Ambient Thermal Inferno Glow */}
      <motion.div
        animate={{ 
          scale: [1, 1.35, 1.05, 1.28, 1], 
          opacity: [0.5, 0.85, 0.55, 0.8, 0.5] 
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

      {/* 3. Layer 1: Roaring Outer Fire Tongue (Crimson / Deep Red-Orange) */}
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

      {/* 4. Layer 2: Wild Mid Blaze Tongue (Vibrant Gold-Amber) */}
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
    </div>
  );
}

function AnimatedCalendarDayFire({ day = 1, isToday = false }: { day?: number; isToday?: boolean }) {
  // Phase offset so each day's flame dances with organic variation
  const phaseDelay = (day % 5) * 0.12;

  return (
    <div className="relative w-5 h-5 flex items-center justify-center pointer-events-none select-none">
      {/* 1. Underlying Heat Glow / Thermal Aura */}
      <motion.div
        animate={{
          scale: [0.9, 1.35, 0.95, 1.25, 0.9],
          opacity: isToday ? [0.6, 0.95, 0.6, 0.9, 0.6] : [0.35, 0.75, 0.4, 0.7, 0.35]
        }}
        transition={{ duration: 0.85, delay: phaseDelay, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-[-2px] bg-gradient-to-t from-red-600/40 via-amber-500/35 to-yellow-300/20 blur-xs rounded-full pointer-events-none -z-10"
      />

      {/* 2. Micro Floating Ember Spark */}
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

      {/* 3. Outer Flame Layer (Deep Orange-Red Flicker & Dance) */}
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

      {/* 4. Core Flame Layer (Bright Amber-Gold Dance) */}
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

      {/* 5. White-Hot Plasma Heart Core */}
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

function AnimatedClockIcon({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative w-3.5 h-3.5 flex items-center justify-center text-indigo-400">
      {/* Custom Chronometer SVG with Sweeping Internal Hand (No pulsing sonar radar rings) */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-3.5 h-3.5"
      >
        {/* Stationary Clock Rim */}
        <circle cx="12" cy="12" r="9" />
        
        {/* Hour hand (stationary pointing up to 12) */}
        <line x1="12" y1="12" x2="12" y2="7.5" strokeWidth="2.2" />

        {/* Sweeping Minute Hand */}
        <motion.g
          style={{ transformOrigin: '12px 12px' }}
          animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
          transition={isHovered ? { duration: 1.2, ease: 'linear', repeat: Infinity } : springs.snappy}
        >
          <line x1="12" y1="12" x2="16.5" y2="12" strokeWidth="2" stroke="currentColor" />
        </motion.g>

        {/* Central Pivot Pip */}
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}

function AnimatedBellIcon({ 
  isHovered, 
  unreadCount 
}: { 
  isHovered: boolean; 
  unreadCount: number; 
}) {
  const hasUnread = unreadCount > 0;
  return (
    <div className="relative w-4 h-4 flex items-center justify-center">
      {/* Acoustic Wavefront Rings on Hover */}
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

      {/* Realistic Pendulum Sway from Top Suspension */}
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

      {/* Unread Ping Pips */}
      {hasUnread && (
        <>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full animate-ping pointer-events-none" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-400 rounded-full pointer-events-none" />
        </>
      )}
    </div>
  );
}

function AnimatedProfileAvatar({ 
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
      {/* Avatar Headshot / Initial */}
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

interface FloatingDynamicDockProps {
  onOpenCommandPalette: () => void;
  onOpenShortcutGuide?: () => void;
}

export function FloatingDynamicDock({
  onOpenCommandPalette,
  onOpenShortcutGuide
}: FloatingDynamicDockProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const isStandalone = location.pathname.startsWith('/cockpit') || 
                       location.pathname.startsWith('/dev-cockpit') || 
                       location.pathname.startsWith('/mission') || 
                       location.pathname.startsWith('/diagnostic') ||
                       location.pathname.startsWith('/mock-tests/result') ||
                       location.pathname.startsWith('/result') ||
                       location.pathname.startsWith('/mock-test/result');

  const {
    chapterTelemetryMap,
    todayMissions,
    settings,
    xp,
    analytics,
    studySessions
  } = useStudyBrainStore(useShallow(s => ({
    chapterTelemetryMap: s.chapterTelemetryMap,
    todayMissions: s.todayMissions,
    settings: s.settings,
    xp: s.xp,
    analytics: s.analytics,
    studySessions: s.studySessions || [],
    actions: s.actions
  })));

  // Telemetry Calculations - Canonical Single Source of Truth
  const effectiveStreak = xp?.streak ?? 0;
  const minStreakMins = Math.round((settings?.minStreakHours ?? 0.5) * 60);
  const todayStudyMins = useMemo(() => getTodayStudyMinutes(studySessions), [studySessions]);
  
  const formatStudyTime = (hours: number): string => {
    if (!hours) return '0m';
    const totalMins = Math.round(hours * 60);
    if (totalMins < 60) return `${totalMins}m`;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  const todayHoursStr = formatStudyTime(todayStudyMins / 60);

  // Active popover menu state (telemetry & system)
  const [activeMenu, setActiveMenu] = useState<'streak' | 'time' | 'notifications' | 'profile' | null>(null);
  const [isDockPinned, setIsDockPinned] = useState(() => {
    return storageAdapter.getDockPinned();
  });

  const [isDockHidden, setIsDockHidden] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const dockRef = useRef<HTMLDivElement>(null);

  // Notifications logic
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    return storageAdapter.getReadNotifications();
  });

  useEffect(() => {
    storageAdapter.setReadNotifications(readNotificationIds);
  }, [readNotificationIds]);

  // Compute System Notifications
  const notifications = useMemo(() => {
    const telemetryList = (Object.values(chapterTelemetryMap || {}) as ChapterTelemetry[]);
    const lowRetentionChaps = telemetryList.filter(t => t && t.retentionConfidence === 'Low' && t.syllabusStage !== 'Not Started');
    const bottleneckChaps = telemetryList.filter(t => t && t.isBottleneck);
    const pendingMissionsCount = todayMissions.filter(m => !m.completed).length;

    return [
      ...(lowRetentionChaps.length > 0 ? [{
        id: `notif-retention-${lowRetentionChaps[0]?.chapterId}`,
        type: 'warning' as const,
        tag: 'RETENTION DECAY',
        title: `${lowRetentionChaps.length} Chapter${lowRetentionChaps.length > 1 ? 's' : ''} Need Revision`,
        desc: `High-yield retention drop detected in ${lowRetentionChaps[0]?.chapterName}. Practice spaced review now.`,
        targetPath: '/revision',
        time: 'Real-time'
      }] : []),
      ...(bottleneckChaps.length > 0 ? [{
        id: `notif-bottleneck-${bottleneckChaps[0]?.chapterId}`,
        type: 'alert' as const,
        tag: 'BOTTLENECK ALERT',
        title: `Backlog Bottleneck Detected`,
        desc: bottleneckChaps[0]?.bottleneckReason || 'Lecture or DPP backlog requires execution priority.',
        targetPath: '/planner',
        time: 'Real-time'
      }] : []),
      ...(pendingMissionsCount > 0 ? [{
        id: 'notif-audit-daily',
        type: 'info' as const,
        tag: 'DAILY COCKPIT',
        title: 'Daily Execution Queue Active',
        desc: `You have ${pendingMissionsCount} pending missions remaining for today.`,
        targetPath: '/cockpit',
        time: 'Real-time'
      }] : []),
      {
        id: 'notif-streak-current',
        type: 'success' as const,
        tag: 'SYSTEM STREAK',
        title: `${effectiveStreak}-Day Consistency Streak`,
        desc: `XP Level ${xp?.level || 1} • Total XP: ${xp?.total || 0}. Keep momentum going!`,
        targetPath: '/analytics',
        time: 'Active'
      }
    ];
  }, [chapterTelemetryMap, todayMissions, effectiveStreak, xp]);

  const unreadNotifications = notifications.filter(n => !readNotificationIds.includes(n.id));

  // Auto-hide dock on scroll down, show on scroll up or mouse hover near bottom
  useEffect(() => {
    if (isDockPinned) {
      setIsDockHidden(false);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current + 50 && currentScrollY > 120) {
        setIsDockHidden(true);
        setActiveMenu(null);
      } else if (currentScrollY < lastScrollY.current - 20) {
        setIsDockHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isAiCoach) {
        if (e.clientX > window.innerWidth - 80) {
          setIsDockHidden(false);
        }
      } else {
        if (e.clientY > window.innerHeight - 80) {
          setIsDockHidden(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDockPinned, location.pathname]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isInMockTest, setIsInMockTest] = useState(() => {
    return typeof document !== 'undefined' && document.body.classList.contains('in-mock-test');
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsInMockTest(document.body.classList.contains('in-mock-test'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (isStandalone || isInMockTest) return null;

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Test Aspirant');
  const userInitial = displayName.charAt(0).toUpperCase();
  const isCloudSynced = user && !user.isAnonymous;
  const isGodModeStreak = effectiveStreak >= 7;
  const { level, progressPercent } = calculateLevelFromXP(xp?.total || 0);
  const { title, color } = getTitleAndColor(level);

  const toggleMenu = (menu: typeof activeMenu) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  const handleItemHover = (id: string | null) => {
    setHoveredItem(id);
    if (id && activeMenu && id !== activeMenu) {
      // Immediately dismiss other open menus so the hovered icon's title/tooltip is completely clear and unobscured
      setActiveMenu(null);
    }
  };

  const isAiCoach = location.pathname.startsWith('/ai-coach');
  const isDashboardActive = location.pathname === '/dashboard' || location.pathname === '/';
  const isMockTestsActive = location.pathname.startsWith('/mock-tests');
  const isPlannerActive = location.pathname.startsWith('/planner');
  const isPracticeActive = location.pathname.startsWith('/revision') || 
                           location.pathname.startsWith('/mistakes') || 
                           location.pathname.startsWith('/formulas');
  const isCoachActive = location.pathname.startsWith('/ai-coach') || 
                        location.pathname.startsWith('/coach-history') || 
                        location.pathname.startsWith('/analytics') || 
                        location.pathname.startsWith('/neural-link');

  const activePillLayoutId = isAiCoach ? "dockActivePillVertical" : "dockActivePillHorizontal";

  // Reusable Dock Content Renderer
  const renderDockItems = (isVertical: boolean) => (
    <>
      {/* 1. App Logo / Home */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
        whileTap={{ scale: 0.9 }}
        transition={springs.snappy}
        onClick={() => {
          navigate('/dashboard');
          setActiveMenu(null);
        }}
        onMouseEnter={() => handleItemHover('home')}
        onMouseLeave={() => handleItemHover(null)}
        aria-label="Go to Dashboard"
        className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer shrink-0"
      >
        <motion.div
          animate={hoveredItem === 'home' ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 0.6, ease: easings.expoOut }}
          className="relative z-10"
        >
          <JeeOsLogo size="sm" />
        </motion.div>
        <DockTooltip label="JEE OS Home" isAiCoach={isVertical} isVisible={hoveredItem === 'home'} />
      </motion.button>

      {/* Major Group Separator: ~16px Breathing Room between CORE and Main Navigation */}
      <div className={`${isVertical ? 'w-5 h-px my-2' : 'h-4 w-px mx-2 sm:mx-2.5'} bg-white/10 shrink-0`} aria-hidden="true" />

      {/* 2. Main Navigation Cluster (Top 5 High-Yield Pillars): [Dashboard] [Mock Tests] [Planner] [Practice] [AI Coach] */}
      
      {/* Pillar 1: Dashboard */}
      <NavLink
        to="/dashboard"
        aria-label="Dashboard"
        onClick={() => setActiveMenu(null)}
        onMouseEnter={() => handleItemHover('dashboard')}
        onMouseLeave={() => handleItemHover(null)}
        className="relative"
      >
        {({ isActive: isNavActive }) => {
          const isActive = isNavActive || isDashboardActive;
          return (
            <motion.div
              whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
              whileTap={{ scale: 0.9 }}
              transition={springs.snappy}
              className={`relative w-9 h-9 rounded-xl sm:rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-zinc-300 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={activePillLayoutId}
                  transition={springs.fluid}
                  className="absolute inset-0 rounded-xl sm:rounded-full bg-indigo-500/18 shadow-[0_0_12px_rgba(99,102,241,0.36)] -z-0 pointer-events-none"
                />
              )}
              <AnimatedDashboardIcon isHovered={hoveredItem === 'dashboard'} />
              <DockTooltip label="Dashboard" shortcut="D" isAiCoach={isVertical} isVisible={hoveredItem === 'dashboard'} />
            </motion.div>
          );
        }}
      </NavLink>

      {/* Pillar 2: Mock Tests */}
      <NavLink
        to="/mock-tests"
        aria-label="Mock Tests"
        onClick={() => setActiveMenu(null)}
        onMouseEnter={() => handleItemHover('mock-tests')}
        onMouseLeave={() => handleItemHover(null)}
        className="relative"
      >
        {({ isActive: isNavActive }) => {
          const isActive = isNavActive || isMockTestsActive;
          return (
            <motion.div
              whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
              whileTap={{ scale: 0.9 }}
              transition={springs.snappy}
              className={`relative w-9 h-9 rounded-xl sm:rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'text-cyan-400 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={activePillLayoutId}
                  transition={springs.fluid}
                  className="absolute inset-0 rounded-xl sm:rounded-full bg-cyan-500/18 shadow-[0_0_12px_rgba(6,182,212,0.36)] -z-0 pointer-events-none"
                />
              )}
              <AnimatedMockTestsIcon isHovered={hoveredItem === 'mock-tests'} />
              <DockTooltip label="Mock Tests" shortcut="T" isAiCoach={isVertical} isVisible={hoveredItem === 'mock-tests'} />
            </motion.div>
          );
        }}
      </NavLink>

      {/* Pillar 3: Daily Planner */}
      <NavLink
        to="/planner"
        aria-label="Daily Planner"
        onClick={() => setActiveMenu(null)}
        onMouseEnter={() => handleItemHover('planner')}
        onMouseLeave={() => handleItemHover(null)}
        className="relative"
      >
        {({ isActive: isNavActive }) => {
          const isActive = isNavActive || isPlannerActive;
          return (
            <motion.div
              whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
              whileTap={{ scale: 0.9 }}
              transition={springs.snappy}
              className={`relative w-9 h-9 rounded-xl sm:rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={activePillLayoutId}
                  transition={springs.fluid}
                  className="absolute inset-0 rounded-xl sm:rounded-full bg-indigo-500/18 shadow-[0_0_12px_rgba(99,102,241,0.36)] -z-0 pointer-events-none"
                />
              )}
              <AnimatedPlannerIcon isHovered={hoveredItem === 'planner'} />
              <DockTooltip label="Weekly Planner Grid" shortcut="P" isAiCoach={isVertical} isVisible={hoveredItem === 'planner'} />
            </motion.div>
          );
        }}
      </NavLink>

      {/* Pillar 4: Practice & Revision */}
      <NavLink
        to="/revision"
        aria-label="Practice & Revision"
        onClick={() => setActiveMenu(null)}
        onMouseEnter={() => handleItemHover('practice')}
        onMouseLeave={() => handleItemHover(null)}
        className="relative"
      >
        {({ isActive: isNavActive }) => {
          const isActive = isNavActive || isPracticeActive;
          return (
            <motion.div
              whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
              whileTap={{ scale: 0.9 }}
              transition={springs.snappy}
              className={`relative w-9 h-9 rounded-xl sm:rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={activePillLayoutId}
                  transition={springs.fluid}
                  className="absolute inset-0 rounded-xl sm:rounded-full bg-emerald-500/18 shadow-[0_0_12px_rgba(16,185,129,0.36)] -z-0 pointer-events-none"
                />
              )}
              <AnimatedPracticeIcon isHovered={hoveredItem === 'practice'} />
              <DockTooltip label="Practice & Revision" shortcut="R" isAiCoach={isVertical} isVisible={hoveredItem === 'practice'} />
            </motion.div>
          );
        }}
      </NavLink>

      {/* Pillar 5: AI Coach */}
      <NavLink
        to="/ai-coach"
        aria-label="AI Coach"
        onClick={() => setActiveMenu(null)}
        onMouseEnter={() => handleItemHover('ai-coach')}
        onMouseLeave={() => handleItemHover(null)}
        className="relative"
      >
        {({ isActive: isNavActive }) => {
          const isActive = isNavActive || isCoachActive;
          return (
            <motion.div
              whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
              whileTap={{ scale: 0.9 }}
              transition={springs.snappy}
              className={`relative w-9 h-9 rounded-xl sm:rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'text-purple-400 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={activePillLayoutId}
                  transition={springs.fluid}
                  className="absolute inset-0 rounded-xl sm:rounded-full bg-purple-500/18 shadow-[0_0_12px_rgba(168,85,247,0.36)] -z-0 pointer-events-none"
                />
              )}
              <AnimatedCoachIcon isHovered={hoveredItem === 'ai-coach'} />
              <DockTooltip label="AI Coach" shortcut="C" isAiCoach={isVertical} isVisible={hoveredItem === 'ai-coach'} />
            </motion.div>
          );
        }}
      </NavLink>

      {/* Major Group Separator: ~16px Breathing Room between Main Navigation and Utilities/Status */}
      <div className={`${isVertical ? 'w-5 h-px my-2' : 'h-4 w-px mx-2 sm:mx-2.5'} bg-white/10 shrink-0`} aria-hidden="true" />

      {/* 4. Utility & Status Cluster: [Search] [Streak] [Timer] [Bell] [Profile] */}
      {/* Command Search Button (⌘K) - Revamped Optical Fluid Capsule */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08, x: isVertical ? -3 : 0, y: isVertical ? 0 : -2 }}
        whileTap={{ scale: 0.95 }}
        transition={springs.snappy}
        onClick={onOpenCommandPalette}
        onMouseEnter={() => handleItemHover('search')}
        onMouseLeave={() => handleItemHover(null)}
        aria-label="Search commands (Cmd+K)"
        className={`relative group overflow-hidden ${
          isVertical ? 'w-9 h-9' : 'h-8 px-2.5 sm:px-3 hover:px-3.5'
        } rounded-xl sm:rounded-full bg-zinc-900/80 hover:bg-zinc-850/90 border border-zinc-750/70 hover:border-cyan-500/50 text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 text-xs transition-all duration-300 cursor-pointer shadow-inner hover:shadow-[0_0_18px_rgba(6,182,212,0.25)]`}
      >
        {/* Shimmer laser sweep across search capsule on hover */}
        {hoveredItem === 'search' && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '180%' }}
            transition={{ duration: 0.85, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.3 }}
            className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent skew-x-12 pointer-events-none"
          />
        )}

        <div className="relative z-10 flex items-center gap-1.5">
          <AnimatedSearchIcon isHovered={hoveredItem === 'search'} />
          {!isVertical && (
            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-zinc-800/80 border border-white/5 text-zinc-400 group-hover:text-cyan-300 group-hover:border-cyan-500/40 group-hover:bg-cyan-950/40 hidden sm:inline transition-all duration-200">
              ⌘K
            </span>
          )}
        </div>
        <DockTooltip label="Command Palette" shortcut="⌘K" isAiCoach={isVertical} isVisible={hoveredItem === 'search'} />
      </motion.button>

      {/* 5. Status: Streak Counter (Raging Inferno on Active Streak) */}
      <div className="relative">
        <motion.button
          type="button"
          whileHover={{ scale: 1.14, x: isVertical ? -3 : 0, y: isVertical ? 0 : -2 }}
          whileTap={{ scale: 0.92 }}
          transition={springs.snappy}
          onClick={() => toggleMenu('streak')}
          onMouseEnter={() => handleItemHover('streak')}
          onMouseLeave={() => handleItemHover(null)}
          aria-label="Consistency Streak"
          aria-expanded={activeMenu === 'streak'}
          className={`${isVertical ? 'w-9 h-9 p-0' : 'h-8 px-2.5'} rounded-xl sm:rounded-full flex items-center justify-center gap-1 text-xs font-mono transition-all cursor-pointer ${
            effectiveStreak > 0 
              ? isGodModeStreak
                ? 'bg-gradient-to-r from-orange-600/30 via-amber-500/25 to-red-600/25 border border-amber-500/50 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.45)]'
                : 'bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-red-500/15 border border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
              : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <div className="relative z-10 flex items-center justify-center">
            {isVertical ? (
              <div className="flex flex-col items-center justify-center leading-none">
                <AnimatedStreakIcon streak={effectiveStreak} isHovered={hoveredItem === 'streak'} isGodMode={isGodModeStreak} />
                <span className={`font-bold text-[8px] mt-0.5 ${effectiveStreak > 0 ? 'text-amber-300' : 'text-zinc-400'}`}>
                  {effectiveStreak}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <AnimatedStreakIcon streak={effectiveStreak} isHovered={hoveredItem === 'streak'} isGodMode={isGodModeStreak} />
                <motion.span 
                  animate={
                    effectiveStreak > 0
                      ? { scale: [1, 1.08, 1], textShadow: ['0 0 4px rgba(245,158,11,0.4)', '0 0 10px rgba(249,115,22,0.8)', '0 0 4px rgba(245,158,11,0.4)'] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className={`font-bold ${effectiveStreak > 0 ? 'text-amber-300' : 'text-zinc-400'}`}
                >
                  {effectiveStreak}
                </motion.span>
              </div>
            )}
          </div>
          {activeMenu !== 'streak' && (
            <DockTooltip label={`${effectiveStreak}-Day Streak`} isAiCoach={isVertical} isVisible={hoveredItem === 'streak'} />
          )}
        </motion.button>

        {/* Streak Popover - Monthly Heatmap & Fire Grid */}
        <AnimatePresence>
          {activeMenu === 'streak' && (
            <motion.div
              onMouseEnter={() => handleItemHover('streak')}
              initial={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              animate={{ opacity: 1, ...(isVertical ? { x: 0 } : { y: 0 }), scale: 1 }}
              exit={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              transition={springs.snappy}
              className={`absolute ${isVertical ? 'right-full mr-3.5 top-1/2 -translate-y-1/2' : 'bottom-full mb-3.5 right-0 sm:left-1/2 sm:-translate-x-1/2'} p-4 bg-zinc-950/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-50 text-left select-none w-[248px]`}
            >
              {(() => {
                const now = new Date();
                const currentMonthStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const todayDate = now.getDate();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
                const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

                const monthlyHours = new Array(daysInMonth).fill(0);
                const activeDaysSet = new Set<number>();

                studySessions.forEach((s) => {
                  if (!s.startTime) return;
                  const d = new Date(s.startTime);
                  if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    const dayIndex = d.getDate() - 1;
                    if (dayIndex >= 0 && dayIndex < daysInMonth) {
                      monthlyHours[dayIndex] += (s.duration || 0) / 60;
                    }
                  }
                });

                (analytics?.dailyAnalytics || []).forEach((da) => {
                  if (!da.date) return;
                  const d = new Date(da.date);
                  if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    const dayIndex = d.getDate() - 1;
                    if (dayIndex >= 0 && dayIndex < daysInMonth) {
                      if ((da.studyTime || 0) >= minStreakMins || (da.xpEarned || 0) > 0) {
                        activeDaysSet.add(dayIndex);
                      }
                      if ((da.studyTime || 0) > 0 && monthlyHours[dayIndex] === 0) {
                        monthlyHours[dayIndex] = (da.studyTime || 0) / 60;
                      }
                    }
                  }
                });

                if (effectiveStreak > 0) {
                  const todayMet = todayStudyMins >= minStreakMins;
                  const startIndex = todayMet ? todayDate - 1 : todayDate - 2;
                  for (let k = 0; k < effectiveStreak; k++) {
                    const dayIdx = startIndex - k;
                    if (dayIdx >= 0 && dayIdx < daysInMonth) {
                      activeDaysSet.add(dayIdx);
                      if (monthlyHours[dayIdx] === 0) {
                        monthlyHours[dayIdx] = minStreakMins / 60;
                      }
                    }
                  }
                }

                return (
                  <div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center justify-between font-mono">
                      <span>{currentMonthStr} Streak</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Icon name="Flame" className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {effectiveStreak} Day Fire
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1.5 text-center font-mono text-[10px] font-bold text-zinc-500">
                      {weekDays.map((d, i) => <span key={i}>{d}</span>)}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-7 h-7" />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const isFuture = day > todayDate;
                        const hours = monthlyHours[i] || 0;
                        const minStreakHours = settings?.minStreakHours ?? 0.5;
                        const active = (hours >= minStreakHours || activeDaysSet.has(i)) && !isFuture;
                        const isToday = day === todayDate;

                        return (
                          <div 
                            key={day} 
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono relative transition-all ${
                              isFuture 
                                ? 'bg-zinc-900/30 border border-zinc-800/40 text-zinc-700' 
                                : active 
                                  ? 'bg-amber-950/60 border border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                                  : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500'
                            } ${isToday ? 'ring-1.5 ring-amber-400/80 ring-offset-1 ring-offset-zinc-950' : ''}`}
                            title={isFuture ? `${currentMonthStr} ${day}` : `${currentMonthStr} ${day} — ${hours > 0 ? formatStudyTime(hours) : (active ? 'Active' : 'Missed')}`}
                          >
                            {active ? (
                              <AnimatedCalendarDayFire day={day} isToday={isToday} />
                            ) : (
                              <span>{day}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>Daily Quota: <strong className="text-zinc-200">{minStreakMins}m</strong></span>
                      <span className={todayStudyMins >= minStreakMins ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {todayStudyMins >= minStreakMins ? '✓ Quota Met' : `${Math.max(0, minStreakMins - todayStudyMins)}m Left`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6. Utility: Study Time Pill */}
      <div className="relative hidden md:block">
        <motion.button
          type="button"
          whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
          whileTap={{ scale: 0.9 }}
          transition={springs.snappy}
          onClick={() => toggleMenu('time')}
          onMouseEnter={() => handleItemHover('time')}
          onMouseLeave={() => handleItemHover(null)}
          aria-label="Today's Study Time"
          aria-expanded={activeMenu === 'time'}
          className={`${isVertical ? 'w-9 h-9 p-0' : 'h-8 px-2.5'} rounded-xl sm:rounded-full flex items-center justify-center gap-1.5 text-xs font-mono transition-colors cursor-pointer ${
            activeMenu === 'time'
              ? 'bg-indigo-500/18 shadow-[0_0_12px_rgba(99,102,241,0.36)] text-indigo-300'
              : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300'
          }`}
        >
          <div className="relative z-10 flex items-center justify-center">
            {isVertical ? (
              <div className="flex flex-col items-center justify-center leading-none">
                <AnimatedClockIcon isHovered={hoveredItem === 'time'} />
                <span className="font-bold text-indigo-400 text-[8px] mt-0.5">{todayHoursStr}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AnimatedClockIcon isHovered={hoveredItem === 'time'} />
                <span className={`font-bold text-indigo-400 transition-all ${hoveredItem === 'time' ? 'drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]' : ''}`}>
                  {todayHoursStr}
                </span>
              </div>
            )}
          </div>
          {activeMenu !== 'time' && (
            <DockTooltip label="Today's Study Time" isAiCoach={isVertical} isVisible={hoveredItem === 'time'} />
          )}
        </motion.button>

        {/* Time Popover - Monthly Log Grid */}
        <AnimatePresence>
          {activeMenu === 'time' && (
            <motion.div
              onMouseEnter={() => handleItemHover('time')}
              initial={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              animate={{ opacity: 1, ...(isVertical ? { x: 0 } : { y: 0 }), scale: 1 }}
              exit={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              transition={springs.snappy}
              className={`absolute ${isVertical ? 'right-full mr-3.5 top-1/2 -translate-y-1/2' : 'bottom-full mb-3.5 right-0 sm:left-1/2 sm:-translate-x-1/2'} p-4 bg-zinc-950/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-50 text-left select-none w-[320px] max-w-[calc(100vw-2rem)]`}
            >
              {(() => {
                const now = new Date();
                const currentMonthStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const todayDate = now.getDate();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
                const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

                const monthlyHours = new Array(daysInMonth).fill(0);
                studySessions.forEach((s) => {
                  if (!s.startTime) return;
                  const d = new Date(s.startTime);
                  if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    const dayIndex = d.getDate() - 1;
                    if (dayIndex >= 0 && dayIndex < daysInMonth) {
                      monthlyHours[dayIndex] += (s.duration || 0) / 60;
                    }
                  }
                });

                (analytics?.dailyAnalytics || []).forEach((da) => {
                  if (!da.date) return;
                  const d = new Date(da.date);
                  if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    const dayIndex = d.getDate() - 1;
                    if (dayIndex >= 0 && dayIndex < daysInMonth) {
                      if ((da.studyTime || 0) > 0 && monthlyHours[dayIndex] === 0) {
                        monthlyHours[dayIndex] = (da.studyTime || 0) / 60;
                      }
                    }
                  }
                });

                const totalMonthHours = monthlyHours.reduce((a, b) => a + b, 0);

                const formatCompactTime = (h: number): string => {
                  if (!h) return '';
                  const totalM = Math.round(h * 60);
                  if (totalM < 60) return `${totalM}m`;
                  const hrs = Math.floor(totalM / 60);
                  const remM = totalM % 60;
                  return remM === 0 ? `${hrs}h` : `${hrs}.${Math.round(remM / 6)}h`;
                };

                return (
                  <div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center justify-between font-mono">
                      <span>{currentMonthStr} Log</span>
                      <span className="text-indigo-400 font-bold">{formatStudyTime(totalMonthHours)} Total</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1.5 text-center font-mono text-[10px] font-bold text-zinc-500">
                      {weekDays.map((d, i) => <span key={i}>{d}</span>)}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-full h-7" />
                      ))}
                      {monthlyHours.map((hours, i) => {
                        const day = i + 1;
                        const isFuture = day > todayDate;
                        const active = hours > 0;
                        const isToday = day === todayDate;

                        return (
                          <div 
                            key={day} 
                            className={`w-full h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold relative transition-colors ${
                              isFuture 
                                ? 'bg-zinc-900/30 border border-zinc-800/40 text-transparent' 
                                : active 
                                  ? 'bg-indigo-950/60 border border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                                  : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500'
                            } ${isToday ? 'ring-1.5 ring-indigo-400/80 ring-offset-1 ring-offset-zinc-950' : ''}`}
                            title={isFuture ? `${currentMonthStr} ${day}` : `${currentMonthStr} ${day} — ${hours > 0 ? formatStudyTime(hours) : 'No time logged'}`}
                          >
                            {active ? formatCompactTime(hours) : (!isFuture ? '·' : '')}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>Today: <strong className="text-indigo-300">{todayHoursStr}</strong></span>
                      <span className="text-zinc-500">Cockpit Sessions</span>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 7. Utility: Notifications Bell */}
      <div className="relative">
        <motion.button
          type="button"
          whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
          whileTap={{ scale: 0.9 }}
          transition={springs.snappy}
          onClick={() => toggleMenu('notifications')}
          onMouseEnter={() => handleItemHover('notifications')}
          onMouseLeave={() => handleItemHover(null)}
          aria-label="System Notifications"
          aria-expanded={activeMenu === 'notifications'}
          className={`relative ${isVertical ? 'w-9 h-9' : 'w-8 h-8 sm:w-8.5 sm:h-8.5'} rounded-xl sm:rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            activeMenu === 'notifications'
              ? 'text-indigo-300 bg-indigo-500/18 shadow-[0_0_12px_rgba(99,102,241,0.36)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <div className="relative z-10 flex items-center justify-center">
            <AnimatedBellIcon isHovered={hoveredItem === 'notifications'} unreadCount={unreadNotifications.length} />
          </div>
          {activeMenu !== 'notifications' && (
            <DockTooltip label="Intelligence Alerts" isAiCoach={isVertical} isVisible={hoveredItem === 'notifications'} />
          )}
        </motion.button>

        {/* Notifications Popover */}
        <AnimatePresence>
          {activeMenu === 'notifications' && (
            <motion.div
              onMouseEnter={() => handleItemHover('notifications')}
              initial={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              animate={{ opacity: 1, ...(isVertical ? { x: 0 } : { y: 0 }), scale: 1 }}
              exit={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              transition={springs.snappy}
              className={`absolute ${isVertical ? 'right-full mr-3 bottom-0' : 'bottom-full mb-3 right-0 sm:left-1/2 sm:-translate-x-1/2'} w-80 max-w-[calc(100vw-5rem)] bg-zinc-950/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl z-50 text-left space-y-2.5`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                  <Icon name="Bell" className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Intelligence Alerts</span>
                </span>
                {unreadNotifications.length > 0 && (
                  <button
                    onClick={() => setReadNotificationIds(notifications.map(n => n.id))}
                    className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar pr-1">
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { navigate(n.targetPath); setActiveMenu(null); }}
                    className="w-full p-2.5 rounded-xl border border-white/5 hover:border-indigo-500/40 bg-zinc-900/60 hover:bg-zinc-850 transition-all text-left space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">{n.tag}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{n.time}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-white">{n.title}</h4>
                    <p className="text-[10.5px] text-zinc-400 leading-tight">{n.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 8. User Profile Avatar & Menu */}
      <div className="relative">
        <motion.button
          type="button"
          whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
          whileTap={{ scale: 0.9 }}
          transition={springs.snappy}
          onClick={() => toggleMenu('profile')}
          onMouseEnter={() => handleItemHover('profile')}
          onMouseLeave={() => handleItemHover(null)}
          aria-label="User Profile"
          aria-expanded={activeMenu === 'profile'}
          className="p-0.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <AnimatedProfileAvatar
            isHovered={hoveredItem === 'profile'}
            userInitial={userInitial}
            photoURL={user?.photoURL}
            displayName={displayName}
            level={level}
          />
          {activeMenu !== 'profile' && (
            <DockTooltip label={`${displayName} (Lv. ${level})`} isAiCoach={isVertical} isVisible={hoveredItem === 'profile'} />
          )}
        </motion.button>

        {/* Profile Popover */}
        <AnimatePresence>
          {activeMenu === 'profile' && (
            <motion.div
              onMouseEnter={() => handleItemHover('profile')}
              initial={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              animate={{ opacity: 1, ...(isVertical ? { x: 0 } : { y: 0 }), scale: 1 }}
              exit={{ opacity: 0, ...(isVertical ? { x: 8 } : { y: 8 }), scale: 0.95 }}
              transition={springs.snappy}
              className={`absolute ${isVertical ? 'right-full mr-3 bottom-0' : 'bottom-full mb-3 right-0'} w-60 bg-zinc-950/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-3 shadow-2xl z-50 text-left space-y-2`}
            >
              <div className="pb-2 border-b border-zinc-850">
                <p className="text-xs font-bold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-zinc-400 truncate">{user?.email || 'Guest Account'}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                  <span className={`font-bold ${color}`}>Lv. {level} {title}</span>
                  <span className="text-zinc-400">{Math.round(progressPercent)}%</span>
                </div>
              </div>

              <button
                onClick={() => { navigate('/settings'); setActiveMenu(null); }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Icon name="SlidersHorizontal" className="w-4 h-4 text-zinc-400" />
                <span>System Settings</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    const { StudyBrainRuntime } = await import('@/runtime/StudyBrainRuntime');
                    await StudyBrainRuntime.getInstance().refresh('INIT');
                    toast({ title: 'Sync Complete', message: 'Data refreshed with cloud.', type: 'success' });
                  } catch (e) {
                    toast({ title: 'Sync Error', message: String(e), type: 'error' });
                  }
                  setActiveMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-950/30 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Icon name="RefreshCw" className="w-4 h-4" />
                <span>Force Cloud Sync</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    await logout();
                    navigate('/login');
                  } catch (e) {
                    console.error('Logout failed', e);
                  }
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/30 flex items-center gap-2 border-t border-zinc-850/60 pt-2 cursor-pointer transition-colors"
              >
                <Icon name="LogOut" className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <>
      {/* Invisible Hover Edge Detector for Quick Reveal */}
      <div 
        className={isAiCoach ? "fixed right-0 inset-y-0 w-4 z-40 pointer-events-auto" : "fixed bottom-0 inset-x-0 h-4 z-40 pointer-events-auto"}
        onMouseEnter={() => setIsDockHidden(false)}
      />

      {/* Dynamic Dock Presentation with Butter-Smooth Orientation Transitions */}
      <AnimatePresence mode="wait">
        {isAiCoach ? (
          <motion.div
            key="vertical-dock-wand"
            ref={dockRef}
            initial={{ opacity: 0, x: 30 }}
            animate={{ 
              opacity: isDockHidden ? 0 : 1, 
              x: isDockHidden ? 80 : 0 
            }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.22, ease: easings.expoOut }}
            className="fixed right-3.5 top-1/2 -translate-y-1/2 z-50 pointer-events-auto"
          >
            <div 
              onMouseLeave={() => handleItemHover(null)}
              className="relative w-12 py-3 px-1.5 flex flex-col items-center gap-2 rounded-3xl surface-elevated ring-1 ring-white/10 select-none"
            >
              {renderDockItems(true)}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="horizontal-dock-capsule"
            ref={dockRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ 
              opacity: isDockHidden ? 0 : 1, 
              y: isDockHidden ? 80 : 0 
            }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.22, ease: easings.expoOut }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[calc(100vw-1.5rem)]"
          >
            <div 
              onMouseLeave={() => handleItemHover(null)}
              className="relative surface-elevated rounded-2xl sm:rounded-full p-1.5 ring-1 ring-white/10 flex flex-row items-center gap-1 sm:gap-1.5 select-none"
            >
              {renderDockItems(false)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
