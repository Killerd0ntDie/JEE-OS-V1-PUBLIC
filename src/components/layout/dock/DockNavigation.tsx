import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { springs, } from '@/constants/motion';
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
        whileHover={{ scale: 1.06, y: isVertical ? 0 : -2 }}
        whileTap={{ scale: 0.94 }}
        transition={springs.snappy}
        onClick={onNavigateHome}
        onMouseEnter={() => handleItemHover('home')}
        onMouseLeave={() => handleItemHover(null)}
        aria-label="Go to Dashboard"
        className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer shrink-0"
      >
        <div className="relative z-10">
          <JeeOsLogo size="sm" />
        </div>
        <DockTooltip label="JEE OS Home" isAiCoach={isVertical} isVisible={hoveredItem === 'home'} />
      </motion.button>

      {/* Major Group Separator: ~16px Breathing Room between CORE and Main Navigation */}
      <div className={`${isVertical ? 'w-5 h-px my-2' : 'h-4 w-px mx-1 sm:mx-2.5'} bg-white/10 shrink-0`} aria-hidden="true" />

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
              whileHover={{ scale: 1.06, y: isVertical ? 0 : -2 }}
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-zinc-300 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={activePillLayoutId}
                  transition={springs.fluid}
                  className="absolute inset-0 rounded-xl sm:rounded-full bg-indigo-500/18 -z-0 pointer-events-none"
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
              whileHover={{ scale: 1.06, y: isVertical ? 0 : -2 }}
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'text-cyan-400 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={activePillLayoutId}
                  transition={springs.fluid}
                  className="absolute inset-0 rounded-xl sm:rounded-full bg-cyan-500/18 -z-0 pointer-events-none"
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
              whileHover={{ scale: 1.06, y: isVertical ? 0 : -2 }}
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={activePillLayoutId}
                  transition={springs.fluid}
                  className="absolute inset-0 rounded-xl sm:rounded-full bg-indigo-500/18 -z-0 pointer-events-none"
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
              whileHover={{ scale: 1.06, y: isVertical ? 0 : -2 }}
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={activePillLayoutId}
                  transition={springs.fluid}
                  className="absolute inset-0 rounded-xl sm:rounded-full bg-emerald-500/18 -z-0 pointer-events-none"
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
              whileHover={{ scale: 1.06, y: isVertical ? 0 : -2 }}
              whileTap={{ scale: 0.94 }}
              transition={springs.snappy}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-full flex items-center justify-center transition-colors ${
                isActive ? 'text-purple-400 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={activePillLayoutId}
                  transition={springs.fluid}
                  className="absolute inset-0 rounded-xl sm:rounded-full bg-purple-500/18 -z-0 pointer-events-none"
                />
              )}
              <AnimatedCoachIcon isHovered={hoveredItem === 'ai-coach'} />
              <DockTooltip label="AI Coach" shortcut="C" isAiCoach={isVertical} isVisible={hoveredItem === 'ai-coach'} />
            </motion.div>
          );
        }}
      </NavLink>

      {/* Major Group Separator: ~16px Breathing Room between Main Navigation and Utilities/Status */}
      <div className={`${isVertical ? 'w-5 h-px my-2' : 'h-4 w-px mx-1 sm:mx-2.5'} bg-white/10 shrink-0`} aria-hidden="true" />

      {/* Command Search Button (⌘K) - Revamped Optical Fluid Capsule */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.06, y: isVertical ? 0 : -2 }}
        whileTap={{ scale: 0.94 }}
        transition={springs.snappy}
        onClick={onOpenCommandPalette}
        onMouseEnter={() => handleItemHover('search')}
        onMouseLeave={() => handleItemHover(null)}
        aria-label="Search commands (Cmd+K)"
        className={`relative group ${
          isVertical ? 'w-9 h-9' : 'h-8 px-2.5 sm:px-3'
        } rounded-xl sm:rounded-full bg-surface-2 hover:bg-surface-elevated border border-border-subtle hover:border-cyan-500/50 text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer shadow-xs`}
      >
        <div className="relative z-10 flex items-center gap-1.5">
          <AnimatedSearchIcon isHovered={hoveredItem === 'search'} />
          {!isVertical && (
            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-surface-elevated border border-white/5 text-zinc-400 group-hover:text-cyan-300 group-hover:border-cyan-500/40 hidden sm:inline transition-colors">
              ⌘K
            </span>
          )}
        </div>
        <DockTooltip label="Command Palette" shortcut="⌘K" isAiCoach={isVertical} isVisible={hoveredItem === 'search'} />
      </motion.button>
    </>
  );
};
