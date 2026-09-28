/**
 * @deprecated Superseded by FloatingDynamicDock. Maintained for backward compatibility and test fixtures.
 */
import React from 'react';
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

  // Streamlined modern categories
  const categories = {
    focus: PAGES.filter(p => p.category === 'core'),
    subjects: PAGES.filter(p => p.category === 'subjects'),
    vaults: PAGES.filter(p => p.category === 'utilities'),
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

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Test Aspirant');
  const userInitial = displayName.charAt(0).toUpperCase();

  const renderNavGroup = (title: string, items: PageDefinition[], collapsed: boolean) => (
    <div className="space-y-0.5 py-1">
      {/* Category Section Header in Expanded Mode */}
      {!collapsed && (
        <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold tracking-wider px-3 h-4 flex items-center whitespace-nowrap">
          {title}
        </span>
      )}

      <div className="space-y-0.5 px-1.5">
        {items.map(item => {
          const toPath = `/${item.id}`;
          return (
            <div key={item.id} className="relative group/item">
              <NavLink
                to={toPath}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={({ isActive }) => `w-full h-9 rounded-xl text-xs font-semibold flex items-center transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] select-none relative z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActivePill"
                        className="absolute inset-0 bg-indigo-600/20 border border-indigo-500/35 rounded-xl shadow-sm -z-10"
                        transition={springs.fluid}
                      />
                    )}
                    
                    {/* Centered Icon Slot */}
                    <div className="w-11 h-full flex items-center justify-center shrink-0">
                      <Icon
                        name={item.icon}
                        aria-hidden="true"
                        className={`w-4 h-4 transition-transform group-hover/item:scale-110 ${
                          isActive ? 'text-indigo-400' : 'text-zinc-400 group-hover/item:text-zinc-200'
                        }`}
                      />
                    </div>

                    {/* Label & Badge (Expanded Mode) */}
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0 pr-2.5 overflow-hidden">
                        <span className="truncate text-xs">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant={getBadgeVariant(item.badgeStyle)}
                            className="text-[9.5px] font-mono px-1 py-0.5 shrink-0 ml-1.5"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    )}
                  </>
                )}
              </NavLink>

              {/* Floating Tooltip in Collapsed Mode */}
              {collapsed && (
                <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 text-white rounded-lg text-xs font-medium whitespace-nowrap shadow-2xl opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto transition-all duration-150 z-[70] flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge variant={getBadgeVariant(item.badgeStyle)} className="text-[9px] font-mono px-1 py-0">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSidebarContent = (collapsed: boolean) => (
    <div
      className={`h-full flex flex-col justify-between select-none transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Sidebar Header / Brand */}
      <div className="h-12 border-b border-white/10 flex items-center justify-between shrink-0 px-2">
        <button 
          onClick={() => {
            navigate('/dashboard');
            onCloseMobile();
          }}
          className="flex items-center h-9 min-w-0 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-xl"
          title="Go to Dashboard"
          aria-label="Go to Dashboard"
        >
          <div className="w-10 h-full flex items-center justify-center shrink-0">
            <JeeOsLogo size="sm" />
          </div>
          {!collapsed && (
            <div className="text-left leading-none whitespace-nowrap overflow-hidden pl-1 flex-1">
              <h1 className="text-xs font-display font-black text-white tracking-tight flex items-center gap-1.5">
                <span>JEE OS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </h1>
              <span className="text-[9.5px] font-mono text-zinc-500 font-medium tracking-wider">FOUNDATION PREP</span>
            </div>
          )}
        </button>
        
        {onToggleCollapse && !collapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            aria-label="Collapse Sidebar"
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Collapse Sidebar (⌘B)"
          >
            <Icon name="PanelLeftClose" aria-hidden="true" className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Body */}
      <nav aria-label="Main Navigation" className="flex-1 overflow-y-auto overflow-x-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1 space-y-1 bg-transparent">
        {categories.focus.length > 0 && renderNavGroup('Focus', categories.focus, collapsed)}
        {categories.subjects.length > 0 && renderNavGroup('Subjects', categories.subjects, collapsed)}
        {categories.vaults.length > 0 && renderNavGroup('Vaults', categories.vaults, collapsed)}
        {categories.intelligence.length > 0 && renderNavGroup('Intelligence', categories.intelligence, collapsed)}
        {categories.system.length > 0 && renderNavGroup('System', categories.system, collapsed)}
      </nav>

      {/* Footer / Leveling & User Profile */}
      <div className="shrink-0 border-t border-white/10 bg-transparent p-1.5 space-y-1">
        {/* Level Progress Bar (Expanded Mode) */}
        {!collapsed && (
          <div className="px-1.5 py-1">
            <LevelProgress totalXP={xp?.total || 0} />
          </div>
        )}

        {/* User Profile Bar */}
        <div className="relative group/profile">
          <button
            onClick={() => {
              navigate('/settings');
              onCloseMobile();
            }}
            aria-label="Go to Settings"
            className={`w-full flex items-center h-10 hover:bg-white/5 rounded-xl transition-all cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
              collapsed ? 'justify-center' : 'px-1'
            }`}
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full border border-indigo-500/30 overflow-hidden flex items-center justify-center bg-indigo-600/20 shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-indigo-400 font-bold text-xs">{userInitial}</span>
              )}
            </div>

            {/* Profile Info (Expanded Mode) */}
            {!collapsed && (
              <div className="flex-1 overflow-hidden text-left leading-tight pl-2">
                <p className="text-xs text-zinc-200 font-semibold truncate">{displayName}</p>
                <p className="text-[10px] font-mono text-zinc-500 truncate">JEE {settings?.targetYear || '2026'} Aspirant</p>
              </div>
            )}
          </button>

          {/* Profile Tooltip (Collapsed Mode) */}
          {collapsed && (
            <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 text-white rounded-lg text-xs font-medium whitespace-nowrap shadow-2xl opacity-0 pointer-events-none group-hover/profile:opacity-100 group-hover/profile:pointer-events-auto transition-all duration-150 z-40">
              <p className="font-semibold text-white">{displayName}</p>
              <p className="text-[10px] text-zinc-400 font-mono">JEE {settings?.targetYear || '2026'} Aspirant</p>
            </div>
          )}
        </div>

        {/* Collapsed Mode Unpin / Expand Trigger */}
        {collapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label="Expand Sidebar"
            className="w-full h-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center cursor-pointer"
            title="Expand Sidebar (⌘B)"
          >
            <Icon name="PanelLeftOpen" className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Floating Zen Rail */}
      <aside className={`hidden md:block shrink-0 sticky top-0 h-screen z-30 transition-all duration-200 ease-in-out ${
        isCollapsed ? 'w-18 p-2' : 'w-60 p-2'
      }`}>
        <div className="h-[calc(100vh-1rem)] glass-panel border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
          {renderSidebarContent(isCollapsed)}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] md:hidden transition-all"
          onClick={onCloseMobile}
        >
          <div
            className="w-64 h-full bg-zinc-950 border-r border-white/10 shadow-2xl"
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
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className={`font-bold ${color} truncate max-w-[90px] text-[11px]`}>Lv. {level} {title}</span>
        <span className="text-[10px] text-zinc-400 shrink-0">{Math.round(progressPercent)}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/60">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
