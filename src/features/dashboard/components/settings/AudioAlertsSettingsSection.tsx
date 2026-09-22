import React from 'react';
import { Volume2, Bell, Sparkles, Laptop } from 'lucide-react';
import { SpringToggle } from './SettingsInputs';
import { audioEngine as soundSystem } from '@/utils/audioEngine';

interface AudioAlertsSettingsSectionProps {
  soundEffects: boolean;
  volume: number;
  desktopNotifications: boolean;
  cockpitVolume: number;
  pauseOnTabChange: boolean;
  onChange: (key: string, value: any) => void;
}

export const AudioAlertsSettingsSection: React.FC<AudioAlertsSettingsSectionProps> = ({
  soundEffects,
  volume,
  desktopNotifications,
  cockpitVolume,
  pauseOnTabChange,
  onChange
}) => {
  return (
    <div className="bg-zinc-900/90 border border-white/15 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl text-left">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
          <Volume2 className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-base font-display font-bold text-white tracking-tight">
            Audio & Web Desktop Alerts
          </h3>
          <p className="text-xs text-zinc-400 font-sans">
            Configure browser sound chimes and desktop system alerts for study sessions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sound Chimes */}
        <div className="p-4.5 rounded-2xl bg-zinc-850/60 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-mono font-bold text-white block">Web Audio Chimes</span>
                <span className="text-[10px] text-zinc-400">Play chime upon mission completion</span>
              </div>
            </div>
            <SpringToggle 
              checked={soundEffects} 
              onChange={(v) => onChange('soundEffects', v)} 
              activeColor="bg-emerald-500"
            />
          </div>

          {soundEffects && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
              <input
                type="range"
                min="10"
                max="100"
                value={volume}
                onChange={(e) => onChange('volume', Number(e.target.value))}
                className="flex-1 h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <button
                type="button"
                onClick={() => soundSystem.playSuccess()}
                className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-850 border border-white/10 text-zinc-200 px-2.5 py-1 rounded-xl cursor-pointer shrink-0"
              >
                Test Chime
              </button>
            </div>
          )}
        </div>

        {/* Desktop Notifications */}
        <div className="flex items-center justify-between p-4.5 rounded-2xl bg-zinc-850/60 border border-white/10 gap-3">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="text-xs font-mono font-bold text-white block">Desktop Alerts</span>
              <span className="text-[10px] text-zinc-400">Receive browser popups for missions</span>
            </div>
          </div>
          <SpringToggle 
            checked={desktopNotifications} 
            onChange={async (v) => {
              onChange('desktopNotifications', v);
              if (v) await soundSystem.requestNotificationPermission();
            }} 
            activeColor="bg-indigo-600"
          />
        </div>

        {/* Cockpit Themes & Start Sound Volume */}
        <div className="p-4.5 rounded-2xl bg-zinc-850/60 border border-white/10 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-xs font-mono font-bold text-white block">Cockpit Start Sound & Theme Songs Volume</span>
                <span className="text-[10px] text-zinc-400">Adjust the volume of the laser start stinger and Evangelion theme melodies (Entrance & Exit)</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
              {cockpitVolume}%
            </span>
          </div>

          <div className="pt-2 border-t border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={cockpitVolume}
              onChange={(e) => onChange('cockpitVolume', Number(e.target.value))}
              className="flex-1 min-w-[160px] h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => soundSystem.playAnimeLaserCharge('maths')}
                className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-850 border border-white/10 text-zinc-200 px-2.5 py-1 rounded-xl cursor-pointer hover:border-amber-500/30 transition-colors"
              >
                Test Start Sound
              </button>
              <button
                type="button"
                onClick={() => soundSystem.playCruelAngelsThesisEntrance('maths')}
                className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-850 border border-white/10 text-zinc-200 px-2.5 py-1 rounded-xl cursor-pointer hover:border-indigo-500/30 transition-colors"
              >
                Test Theme Song
              </button>
            </div>
          </div>
        </div>

        {/* Pause on Tab Change */}
        <div className="flex items-center justify-between p-4.5 rounded-2xl bg-zinc-850/60 border border-white/10 gap-3 md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Laptop className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-xs font-mono font-bold text-white block">Pause on Tab Change</span>
              <span className="text-[10px] text-zinc-400">Auto-pause study timer when switching browser tabs</span>
            </div>
          </div>
          <SpringToggle 
            checked={pauseOnTabChange} 
            onChange={(v) => onChange('pauseOnTabChange', v)} 
            activeColor="bg-amber-500"
          />
        </div>
      </div>
    </div>
  );
};
