import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@/components/ui/Icon';
import { PAGES } from '@/types/index';
import { springs } from '@/constants/motion';
import { useAuth } from '@/features/auth';

const PRIMARY_TABS = [
  { id: 'dashboard', label: 'Home', icon: 'LayoutDashboard', path: '/dashboard' },
  { id: 'mission', label: 'Missions', icon: 'Target', path: '/cockpit' },
  { id: 'planner', label: 'Planner', icon: 'Calendar', path: '/planner' },
  { id: 'ai-coach', label: 'AI Coach', icon: 'Bot', path: '/ai-coach' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  // Hidden on cockpit/standalone pages to give full focus
  const isStandalone = location.pathname.startsWith('/cockpit') || 
                       location.pathname.startsWith('/dev-cockpit') || 
                       location.pathname.startsWith('/mission') || 
                       location.pathname.startsWith('/diagnostic');

  if (isStandalone) return null;

  const currentPath = location.pathname;
  const isMoreActive = !PRIMARY_TABS.some(t => currentPath.startsWith(t.path));

  // Secondary pages for the "More" slide-up drawer
  const subjectPages = PAGES.filter(p => p.category === 'subjects');
  const vaultPages = PAGES.filter(p => p.category === 'utilities');
  const intelligencePages = PAGES.filter(p => p.category === 'intelligence' && p.id !== 'ai-coach');

  return (
    <>
      {/* Floating Bottom Nav Capsule */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-3 inset-x-3 z-50 md:hidden pointer-events-auto"
      >
        <div className="bg-zinc-950/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-2 py-1.5 flex items-center justify-around">
          {PRIMARY_TABS.map(tab => {
            const isActive = currentPath.startsWith(tab.path);
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-medium transition-all duration-150 active:scale-95 ${
                  isActive ? 'text-indigo-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileNavActivePill"
                    className="absolute inset-0 bg-indigo-600/15 border border-indigo-500/30 rounded-xl -z-10"
                    transition={springs.fluid}
                  />
                )}
                <Icon name={tab.icon} className="w-4 h-4 mb-0.5" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}

          {/* More Action Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreSheetOpen(true)}
            aria-label="More navigation options"
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-medium transition-all duration-150 active:scale-95 cursor-pointer ${
              isMoreActive ? 'text-indigo-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {isMoreActive && (
              <motion.div
                layoutId="mobileNavActivePill"
                className="absolute inset-0 bg-indigo-600/15 border border-indigo-500/30 rounded-xl -z-10"
                transition={springs.fluid}
              />
            )}
            <Icon name="MoreHorizontal" className="w-4 h-4 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* "More" Slide-up Bottom Sheet */}
      <AnimatePresence>
        {isMoreSheetOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreSheetOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sheet Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={springs.fluid}
              className="absolute bottom-0 inset-x-0 bg-zinc-950/95 border-t border-white/10 rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              {/* Grab Bar */}
              <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-4" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-850 mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
                  Navigation & Features
                </span>
                <button
                  type="button"
                  onClick={() => setIsMoreSheetOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg"
                >
                  <Icon name="X" className="w-4 h-4" />
                </button>
              </div>

              {/* Subject Trackers */}
              <div className="mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block mb-2">
                  Subjects
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {subjectPages.map(page => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => {
                        navigate(`/${page.id}`);
                        setIsMoreSheetOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/40 text-left flex flex-col items-center justify-center gap-1.5 transition-all"
                    >
                      <Icon name={page.icon} className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-medium text-zinc-200">{page.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Practice Vault */}
              <div className="mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block mb-2">
                  Practice Vault
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {vaultPages.map(page => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => {
                        navigate(`/${page.id}`);
                        setIsMoreSheetOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/40 text-left flex items-center gap-2.5 transition-all"
                    >
                      <Icon name={page.icon} className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-medium text-zinc-200 truncate">{page.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Intelligence & Analytics */}
              <div className="mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block mb-2">
                  Intelligence
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {intelligencePages.map(page => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => {
                        navigate(`/${page.id}`);
                        setIsMoreSheetOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-indigo-500/40 text-left flex items-center gap-2.5 transition-all"
                    >
                      <Icon name={page.icon} className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="text-xs font-medium text-zinc-200 truncate">{page.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* System & Profile Actions */}
              <div className="pt-3 border-t border-zinc-850 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/settings');
                    setIsMoreSheetOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white bg-zinc-900/70 border border-zinc-800"
                >
                  <Icon name="SlidersHorizontal" className="w-4 h-4 text-zinc-400" />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsMoreSheetOpen(false);
                    try {
                      await logout();
                      navigate('/login');
                    } catch (e) {
                      console.error('Logout failed', e);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/40"
                >
                  <Icon name="LogOut" className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
