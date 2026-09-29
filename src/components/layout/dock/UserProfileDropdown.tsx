import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '@/constants/motion';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/features/auth';
import { useToast } from '@/components/ui/ToastProvider';
import { AnimatedProfileAvatar, DockTooltip } from './DockIcons';

export interface UserProfileDropdownProps {
  displayName: string;
  userInitial: string;
  photoURL?: string | null;
  email?: string | null;
  level: number;
  progressPercent: number;
  title: string;
  color: string;
  isVertical: boolean;
  activeMenu: string | null;
  toggleMenu: (menu: 'profile') => void;
  hoveredItem: string | null;
  handleItemHover: (id: string | null) => void;
  onCloseMenu: () => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  displayName,
  userInitial,
  photoURL,
  email,
  level,
  progressPercent,
  title,
  color,
  isVertical,
  activeMenu,
  toggleMenu,
  hoveredItem,
  handleItemHover,
  onCloseMenu,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();

  return (
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
          photoURL={photoURL}
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
              <p className="text-[10px] text-zinc-400 truncate">{email || 'Guest Account'}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                <span className={`font-bold ${color}`}>Lv. {level} {title}</span>
                <span className="text-zinc-400">{Math.round(progressPercent)}%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { navigate('/settings'); onCloseMenu(); }}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Icon name="SlidersHorizontal" className="w-4 h-4 text-zinc-400" />
              <span>System Settings</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  const { StudyBrainRuntime } = await import('@/runtime/StudyBrainRuntime');
                  await StudyBrainRuntime.getInstance().refresh('INIT');
                  toast({ title: 'Sync Complete', message: 'Data refreshed with cloud.', type: 'success' });
                } catch (e) {
                  toast({ title: 'Sync Error', message: String(e), type: 'error' });
                }
                onCloseMenu();
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-950/30 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Icon name="RefreshCw" className="w-4 h-4" />
              <span>Force Cloud Sync</span>
            </button>

            <button
              type="button"
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
  );
};
