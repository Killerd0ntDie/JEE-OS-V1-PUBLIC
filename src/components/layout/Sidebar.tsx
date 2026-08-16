import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { springs } from '@/constants/motion';
import { PAGES, PageDefinition } from '@/types/index';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { calculateLevelFromXP, getTitleAndColor } from '@/utils/levelingCalculations';
import { JeeOsLogo } from '@/components/shared/JeeOsLogo';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const { user } = useAuth();
  const xp = useStudyBrainStore(s => s.xp);
  const settings = useStudyBrainStore(s => s.settings);
  const navigate = useNavigate();

  // Group PAGES by category
  const categories = {
    core: PAGES.filter(p => p.category === 'core'),
    subjects: PAGES.filter(p => p.category === 'subjects'),
    utilities: PAGES.filter(p => p.category === 'utilities'),
    intelligence: PAGES.filter(p => p.category === 'intelligence'),
    system: PAGES.filter(p => p.category === 'system'),
  };

  const getBadgeVariant = (style?: string) => {
    switch (style) {
      case 'accent': return 'accent';
      case 'success': return 'success';
      default: return 'default';
    }
  };

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Guest Aspirant');
  const userInitial = displayName.charAt(0).toUpperCase();

  // Helper class for delayed fade-in after width expansion finishes (CSS driven via group-hover)
  const getTextFadeClass = (collapsed: boolean) => `transition-opacity ease-out ${
    collapsed 
      ? 'opacity-0 pointer-events-none duration-75 delay-0 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:duration-200 group-hover:delay-150' 
      : 'opacity-100 duration-200 delay-150'
  }`;

  const renderNavGroup = (title: string, items: PageDefinition[], collapsed: boolean) => (
    <div className="space-y-1 py-1">
      {/* Category Section Header */}
      <span className={`text-xs font-mono uppercase text-zinc-400 font-bold tracking-widest px-4 h-5 flex items-center whitespace-nowrap ${getTextFadeClass(collapsed)}`}>
        {title}
      </span>

      <div className="space-y-1 px-2">
        {items.map(item => {
          const toPath = `/${item.id}`;
          return (
            <NavLink
              key={item.id}
              to={toPath}
              onClick={onCloseMobile}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `w-full h-10 rounded-xl text-xs font-semibold flex items-center transition-[color,transform] duration-150 ease-out active:scale-[0.97] select-none relative z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-zinc-400 hover:bg-zinc-850/60 hover:text-zinc-200'
              }`}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      className="absolute inset-0 bg-indigo-600/15 border border-indigo-500/30 rounded-xl shadow-sm -z-10"
                      transition={springs.fluid}
                    />
                  )}
                  {/* STATIC 48px ICON SLOT MATHEMETICALLY CENTERING THE 20px ICON AT PIXEL 32 */}
                  <div className="w-12 h-full flex items-center justify-center shrink-0">
                    <Icon
                      name={item.icon}
                      aria-hidden="true"
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                  </div>

                  {/* FADING LABEL & BADGE WRAPPER */}
                  <div className={`flex-1 flex items-center justify-between min-w-0 pr-3 ${getTextFadeClass(collapsed)}`}>
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant={getBadgeVariant(item.badgeStyle)}
                        className="text-[10px] font-mono px-1.5 py-0.5 shrink-0 ml-2"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  const renderSidebarContent = (collapsed: boolean) => (
    <div
      className={`h-full glass-panel border-r-0 flex flex-col justify-between select-none transition-[width] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        collapsed ? 'w-16 group-hover:w-64 shadow-2xl z-50' : 'w-64'
      }`}
    >
      {/* Sidebar Header / Brand */}
      <div
        className={`h-14 border-b border-zinc-850/30 flex items-center justify-between shrink-0 bg-transparent transition-colors group/brand overflow-hidden px-2`}
      >
        <button 
          onClick={() => {
            navigate('/dashboard');
            onCloseMobile();
          }}
          className="flex items-center h-10 w-full min-w-0 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-xl"
          title="Click to go to Dashboard"
          aria-label="Go to Dashboard"
        >
          <div className="w-12 h-full flex items-center justify-center shrink-0">
            <JeeOsLogo size="md" />
          </div>
          <div className={`text-left leading-none whitespace-nowrap transition-opacity duration-250 ease-out overflow-hidden ${collapsed ? 'w-0 opacity-0 group-hover:w-auto group-hover:opacity-100' : 'flex-1 opacity-100'}`}>
            <h1 className="text-sm font-display font-black text-white tracking-tight truncate group-hover/brand:text-indigo-300 transition-colors flex items-center gap-1.5">
              <span>JEE OS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </h1>
            <span className="text-[11px] font-mono text-zinc-400 font-medium tracking-wider">FOUNDATION PREP</span>
          </div>
        </button>
        
        {onToggleCollapse && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            aria-label={collapsed ? "Pin Sidebar Navigation" : "Unpin Sidebar Navigation"}
            className={`rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:ring-2 focus:ring-zinc-500/50 flex items-center justify-center ${collapsed ? 'opacity-0 w-0 p-0 overflow-hidden pointer-events-none group-hover:opacity-100 group-hover:w-8 group-hover:p-1.5 group-hover:pointer-events-auto group-hover:ml-1' : 'opacity-100 w-8 p-1.5 ml-1'}`}
            title={collapsed ? "Pin Sidebar" : "Unpin Sidebar (Auto-collapse)"}
          >
            <Icon name={collapsed ? "Menu" : "PanelLeftClose"} aria-hidden="true" className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Body */}
      <nav aria-label="Main Navigation" className="flex-1 overflow-y-auto overflow-x-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-0 py-1 flex flex-col justify-between bg-transparent">
        {categories.core.length > 0 && renderNavGroup('Core Console', categories.core, collapsed)}
        {categories.subjects.length > 0 && renderNavGroup('Subject Trackers', categories.subjects, collapsed)}
        {categories.utilities.length > 0 && renderNavGroup('Practice Vault', categories.utilities, collapsed)}
        {categories.intelligence.length > 0 && renderNavGroup('Analytics & AI', categories.intelligence, collapsed)}
        {categories.system.length > 0 && renderNavGroup('System', categories.system, collapsed)}
      </nav>

      {/* Footer / Leveling & User Profile */}
      <div className={`shrink-0 border-t border-zinc-850/30 bg-transparent px-2 py-2 space-y-1.5`}>
        {/* Level Progress Bar */}
        <div className={`transition-all duration-300 overflow-hidden ${collapsed ? 'h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 group-hover:mb-1.5' : 'h-auto opacity-100 mb-1.5'}`}>
          <LevelProgress totalXP={xp?.total || 0} />
        </div>

        {/* User Profile Bar */}
        <button
          onClick={() => navigate('/settings')}
          aria-label="Go to Settings"
          className="w-full flex items-center h-12 hover:bg-zinc-850/60 rounded-xl transition-all cursor-pointer group/profile whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          {/* Avatar slot mathematically centered in w-12 matching icons */}
          <div className="w-12 h-full flex items-center justify-center shrink-0">
            <div className="w-10 h-10 rounded-full border border-indigo-500/30 overflow-hidden flex items-center justify-center bg-indigo-600/20">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-indigo-400 font-bold text-sm">{userInitial}</span>
              )}
            </div>
          </div>

          <div className={`flex-1 overflow-hidden text-left leading-tight transition-all duration-300 ${collapsed ? 'max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100' : 'max-w-xs opacity-100'}`}>
            <p className="text-xs text-zinc-200 font-semibold truncate">{displayName}</p>
            <p className="text-xs font-mono text-zinc-400 truncate">JEE {settings?.targetYear || '2025'} Aspirant</p>
          </div>
          <Icon name="ChevronUp" aria-hidden="true" className={`mr-2 w-3.5 h-3.5 text-zinc-600 shrink-0 group-hover/profile:text-zinc-300 transition-colors ${collapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100 w-auto'}`} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`group hidden md:block h-screen shrink-0 sticky top-0 z-[60] transition-[width] duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <div className={`h-full ${isCollapsed ? 'absolute top-0 left-0 h-screen z-[60]' : ''}`}>
          {renderSidebarContent(isCollapsed)}
        </div>
      </aside>

      {/* Mobile sidebar overlay backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[60] md:hidden transition-all group"
          onClick={onCloseMobile}
        >
          <div
            className="w-72 h-full"
            onClick={e => e.stopPropagation()}
          >
            {renderSidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
}

function LevelProgress({ totalXP }: { totalXP: number }) {
  const { level, progressPercent } = calculateLevelFromXP(totalXP);
  const { title, color } = getTitleAndColor(level);

  return (
    <div className="pt-0.5 space-y-1">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className={`font-bold ${color} truncate max-w-[80px]`}>Lv. {level} {title}</span>
          <span className="text-[10px] text-zinc-300 shrink-0">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/60">
          <div
            className="h-full bg-zinc-300 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
