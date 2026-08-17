import React from 'react';
import { Volume2, Bell, Moon, Sparkles } from 'lucide-react';
import { audioEngine } from '@/utils/audioEngine';

interface AudioSettingsSectionProps {
  soundEffects: boolean;
  desktopNotifications: boolean;
  pauseOnTabChange: boolean;
  volume: number;
  cockpitVolume?: number;
  onUpdateSettings: (key: string, value: any) => void;
}

export const AudioSettingsSection: React.FC<AudioSettingsSectionProps> = ({
  soundEffects,
  desktopNotifications,
  pauseOnTabChange,
  volume,
  cockpitVolume = 0.75,
  onUpdateSettings,
}) => {
  return (
    <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-5">
      <div className="flex items-center gap-3 border-b border-zinc-800/60 pb-4">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Volume2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold font-display text-white tracking-tight">Audio & Notification Preferences</h2>
          <p className="text-[11px] text-zinc-400 font-mono">Sound effects, notifications, and audio volume</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-mono font-bold text-white block">Sound Effects</span>
                <span className="text-[10px] text-zinc-400 block">UI feedback and timer chimes</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundEffects}
              onChange={(e) => onUpdateSettings('soundEffects', e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-mono font-bold text-white block">Desktop Notifications</span>
                <span className="text-[10px] text-zinc-400 block">System alerts for upcoming missions</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={desktopNotifications}
              onChange={(e) => onUpdateSettings('desktopNotifications', e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-mono font-bold text-white block">Pause Audio on Tab Switch</span>
                <span className="text-[10px] text-zinc-400 block">Auto-pause ambient audio when hidden</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pauseOnTabChange}
              onChange={(e) => onUpdateSettings('pauseOnTabChange', e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950"
            />
          </label>
        </div>

        <div className="space-y-4">
          <div className="space-y-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-bold">Master Volume</span>
              <span className="text-emerald-400 font-bold">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateSettings('volume', val);
                audioEngine.setVolume(val);
              }}
              aria-label="Master Volume"
              className="w-full accent-emerald-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-3 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-zinc-300 font-bold">Cockpit Start Sound & Theme Volume</span>
              </div>
              <span className="text-amber-400 font-bold">{Math.round(cockpitVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={cockpitVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdateSettings('cockpitVolume', val);
                audioEngine.setCockpitVolume(val);
              }}
              aria-label="Cockpit Start Sound & Theme Volume"
              className="w-full accent-amber-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
