import React from 'react';
import { SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { SpringToggle } from './SettingsInputs';

interface ThemeVisualSettingsSectionProps {
  themeMode: 'evangelion' | 'modern';
  onToggleThemeMode: (mode: 'evangelion' | 'modern') => void;
}

export const ThemeVisualSettingsSection: React.FC<ThemeVisualSettingsSectionProps> = ({
  themeMode,
  onToggleThemeMode
}) => {
  return (
    <div className="css-glass rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden text-left">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
          <SlidersHorizontal className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-base font-display font-bold text-white tracking-tight">
            Visual Theme & Aesthetics
          </h3>
          <p className="text-xs text-zinc-400 font-sans">
            Choose between the Tactical Evangelion (Neo-Tokyo HUD) theme and the Modern Minimalist interface.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option A: Tactical Evangelion */}
        <div 
          onClick={() => onToggleThemeMode('evangelion')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden flex flex-col justify-between space-y-3 ${
            themeMode !== 'modern'
              ? 'bg-indigo-950/40 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] ring-1 ring-indigo-400'
              : 'css-glass-subtle hover:border-white/30'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/60">
                NERV HUD // CYBERNETIC
              </span>
              {themeMode !== 'modern' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
            </div>
            <h4 className="text-sm font-bold text-white pt-1">Tactical Evangelion (Neo-Tokyo)</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Dynamic subject hazard ribbons, 4-corner caliper crosshairs, telemetry badges, and high-contrast tabular HUD typography.
            </p>
          </div>

          <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>MAGI-01 Synaptic Map & Tactical HUD Active</span>
          </div>
        </div>

        {/* Option B: Modern Minimalist */}
        <div 
          onClick={() => onToggleThemeMode('modern')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden flex flex-col justify-between space-y-3 ${
            themeMode === 'modern'
              ? 'bg-zinc-900 border-white/40 shadow-[0_0_25px_rgba(255,255,255,0.15)] ring-1 ring-white/60'
              : 'css-glass-subtle hover:border-white/30'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                DEFAULT // MODERN
              </span>
              {themeMode === 'modern' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <h4 className="text-sm font-bold text-white pt-1">Modern Minimalist (Clean Glass)</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Reverts all Evangelion theming back to sleek, minimalist modern dark glassmorphism without hazard stripes or anime telemetry.
            </p>
          </div>

          <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Distraction-Free Minimal Glass Aesthetic</span>
          </div>
        </div>
      </div>

      {/* Quick Toggle Switch Bar */}
      <div className="flex items-center justify-between p-4.5 rounded-2xl css-glass-subtle gap-4 shadow-sm">
        <div className="space-y-0.5">
          <span className="text-sm font-mono font-bold text-white block">
            {themeMode === 'modern' ? 'Modern Minimalist Theme Active' : 'Tactical Evangelion Theme Active'}
          </span>
          <span className="text-xs text-zinc-400 font-sans block">
            Toggle to instantly switch between Tactical Evangelion HUD and Modern Minimalist theme across the entire application.
          </span>
        </div>
        <SpringToggle 
          checked={themeMode !== 'modern'} 
          onChange={(v) => onToggleThemeMode(v ? 'evangelion' : 'modern')} 
          activeColor="bg-indigo-600"
        />
      </div>
    </div>
  );
};
