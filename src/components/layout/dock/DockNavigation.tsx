import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { springs, easings } from '@/constants/motion';
import { JeeOsLogo } from '@/components/shared/JeeOsLogo';
import {
  AnimatedDashboardIcon,
  AnimatedMockTestsIcon,
  AnimatedPlannerIcon,
  AnimatedPracticeIcon,
  AnimatedCoachIcon,
  AnimatedSearchIcon,
  DockTooltip
} from './DockIcons';

export interface DockNavigationProps {
  isVertical: boolean;
  isAiCoach: boolean;
  isDashboardActive: boolean;
  isMockTestsActive: boolean;
  isPlannerActive: boolean;
  isPracticeActive: boolean;
  isCoachActive: boolean;
  activePillLayoutId: string;
  hoveredItem: string | null;
  handleItemHover: (id: string | null) => void;
  onOpenCommandPalette: () => void;
  onNavigateHome: () => void;
  onSelectNav: () => void;
}

export const DockNavigation: React.FC<DockNavigationProps> = ({
  isVertical,
  isAiCoach: _isAiCoach,
  isDashboardActive,
  isMockTestsActive,
  isPlannerActive,
  isPracticeActive,
  isCoachActive,
  activePillLayoutId,
  hoveredItem,
  handleItemHover,
  onOpenCommandPalette,
  onNavigateHome,
  onSelectNav,
}) => {
  return (
    <>
      {/* 1. App Logo / Home */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.18, x: isVertical ? -3 : 0, y: isVertical ? 0 : -3 }}
        whileTap={{ scale: 0.9 }}
        transition={springs.snappy}
        onClick={onNavigateHome}
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
        onClick={onSelectNav}
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
        onClick={onSelectNav}
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
        onClick={onSelectNav}
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
        onClick={onSelectNav}
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
        onClick={onSelectNav}
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
    </>
  );
};
