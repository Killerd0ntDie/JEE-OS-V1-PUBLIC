import React, { useState } from 'react';
import { Target, X, Volume2, VolumeX, Sparkles, RotateCcw, Shield, Sliders, Check, Maximize2, Minimize2, Timer, Zap, Hourglass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioEngine } from '@/utils/audioEngine';
import { springs } from '@/constants/motion';
import { CockpitAnimMode, ANIM_MODES_META } from '../CockpitTransitionEngine';

export type FocusPresetMode = 'deep60' | 'pomodoro' | 'speedDrill';

interface MissionHeaderProps {
  onExit: () => void;
  animMode?: CockpitAnimMode;
  onAnimModeChange?: (mode: CockpitAnimMode) => void;
  speedMultiplier?: number;
  onSpeedChange?: (speed: number) => void;
  onReplay?: () => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  focusPreset?: FocusPresetMode;
  onSelectFocusPreset?: (preset: FocusPresetMode) => void;
  targetDurationMins?: number;
}

export function MissionHeader({ 
  onExit,
  animMode = 'positronSparkle',
  onAnimModeChange,
  speedMultiplier = 0.25,
  onSpeedChange,
  onReplay,
  isZenMode = false,
  onToggleZenMode,
  focusPreset = 'deep60',
  onSelectFocusPreset,
  targetDurationMins = 60
}: MissionHeaderProps) {
  const [isMuted, setIsMuted] = useState(audioEngine.getVolume() === 0);
  const [isFxMenuOpen, setIsFxMenuOpen] = useState(false);

  const toggleMute = () => {
    if (isMuted) {
      audioEngine.setVolume(0.6);
      setIsMuted(false);
    } else {
      audioEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  return (
    <header className="absolute top-0 left-0 w-full z-50 flex justify-between items-center px-4 sm:px-6 py-3 pointer-events-auto bg-gradient-to-b from-zinc-950/90 via-zinc-950/40 to-transparent backdrop-blur-sm">
      {/* Left: Branding & Status */}
      <div className="flex items-center gap-3">
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          transition={springs.snappy}
          style={{
            background: 'rgba(10, 14, 23, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderTop: '1.5px solid rgba(255, 255, 255, 0.22)',
          }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl shadow-md flex items-center justify-center shrink-0 cursor-default"
        >
          <Target className="w-4.5 h-4.5 text-indigo-400" />
        </motion.div>
        <div>
          <h2 className="text-xs sm:text-sm font-extrabold tracking-wider font-mono uppercase text-white leading-tight flex items-center gap-1.5">
            <span>MISSION</span>
            <span className="text-indigo-400 font-black">CONTROL</span>
          </h2>
          <div className="text-[9.5px] text-zinc-400 font-mono flex items-center gap-2 mt-0.5 uppercase tracking-widest font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              作戦指令 // FOCUS ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Center: Mission Focus Mode Presets (Liquid Glass Pill) */}
      <div 
        style={{
          background: 'rgba(10, 14, 23, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          borderTop: '1.5px solid rgba(255, 255, 255, 0.20)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
        }}
        className="hidden md:flex items-center gap-1 p-1 rounded-2xl"
      >
        {[
          { id: 'deep60' as FocusPresetMode, label: `Deep ${targetDurationMins}m`, icon: Timer },
          { id: 'pomodoro' as FocusPresetMode, label: 'Pomodoro 25/5', icon: Hourglass },
          { id: 'speedDrill' as FocusPresetMode, label: 'Speed Drill', icon: Zap }
        ].map(p => {
          const Icon = p.icon;
          const isActive = focusPreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                audioEngine.playRadioRelayClick().catch(() => {});
                onSelectFocusPreset?.(p.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/40 border border-indigo-500/60 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Controls & Synchro Popover */}
      <div className="flex items-center gap-2 sm:gap-2.5 relative">
        
        {/* Zen Stealth Focus Mode Toggle */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={springs.snappy}
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            onToggleZenMode?.();
          }}
          style={{
            background: isZenMode ? 'rgba(245, 158, 11, 0.18)' : 'rgba(10, 14, 23, 0.75)',
            backdropFilter: 'blur(20px)',
            border: isZenMode ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.10)',
            borderTop: isZenMode ? '1.5px solid rgba(245, 158, 11, 0.7)' : '1.5px solid rgba(255, 255, 255, 0.20)',
          }}
          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm ${
            isZenMode ? 'text-amber-300' : 'text-zinc-300 hover:text-white'
          }`}
          title="Toggle Zen Stealth Mode (Z)"
        >
          {isZenMode ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isZenMode ? 'Deck Hidden' : 'Zen Focus'}</span>
        </motion.button>

        {/* Synchro FX Settings Popover Button */}
        <div className="relative">
          <motion.button 
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={springs.snappy}
            onClick={() => setIsFxMenuOpen(!isFxMenuOpen)}
            style={{
              background: isFxMenuOpen ? 'rgba(79, 70, 229, 0.35)' : 'rgba(10, 14, 23, 0.75)',
              backdropFilter: 'blur(20px)',
              border: isFxMenuOpen ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid rgba(255, 255, 255, 0.10)',
              borderTop: isFxMenuOpen ? '1.5px solid rgba(99, 102, 241, 0.8)' : '1.5px solid rgba(255, 255, 255, 0.20)',
            }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm ${
              isFxMenuOpen ? 'text-white' : 'text-zinc-300 hover:text-white'
            }`}
            title="Configure Focus Synchro Entrance Animation"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Synchro FX</span>
          </motion.button>

          <AnimatePresence>
            {isFxMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={springs.snappy}
                className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl border border-zinc-700/80 p-4 shadow-2xl z-50 space-y-3.5"
                style={{
                  background: 'rgba(10, 14, 23, 0.95)',
                  backdropFilter: 'blur(28px) saturate(200%)',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.15)'
                }}
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">Synchro Transitions</span>
                  </div>
                  {onReplay && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsFxMenuOpen(false);
                        onReplay();
                      }}
                      className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Replay
                    </button>
                  )}
                </div>

                {/* Animation Modes Grid */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {Object.keys(ANIM_MODES_META).map((key) => {
                    const meta = ANIM_MODES_META[key as CockpitAnimMode];
                    const isSelected = animMode === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          onAnimModeChange?.(key as CockpitAnimMode);
                          try {
                            localStorage.setItem('jeeos_cockpit_anim_pref', key);
                          } catch { /* ignore */ }
                        }}
                        className={`w-full text-left p-2 rounded-xl border text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm' 
                            : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-850 text-zinc-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{(meta as any).title || (meta as any).label}</span>
                            {(meta as any).subjectTag && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase font-semibold">
                                {(meta as any).subjectTag}
                              </span>
                            )}
                          </div>
                          <div className="text-[9.5px] text-zinc-400 truncate">{meta.desc}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>

                {/* Speed Multiplier Controls */}
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 font-mono">Speed Dilation:</span>
                  <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                    {[
                      { label: '0.25x (Default)', val: 0.25 },
                      { label: '0.5x', val: 0.5 },
                      { label: '1x', val: 1 }
                    ].map(spd => (
                      <button
                        key={spd.val}
                        type="button"
                        onClick={() => {
                          onSpeedChange?.(spd.val);
                          try {
                            localStorage.setItem('jeeos_cockpit_speed_pref', String(spd.val));
                          } catch { /* ignore */ }
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          speedMultiplier === spd.val 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {spd.label}
                      </button>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Audio Mute/Unmute */}
        <motion.button 
          type="button"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          transition={springs.snappy}
          onClick={toggleMute}
          style={{
            background: 'rgba(10, 14, 23, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderTop: '1.5px solid rgba(255, 255, 255, 0.20)',
          }}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-sm"
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-zinc-300" />}
        </motion.button>

        {/* Exit Session Button */}
        <motion.button 
          type="button"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          transition={springs.snappy}
          onClick={onExit}
          style={{
            background: 'rgba(10, 14, 23, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderTop: '1.5px solid rgba(255, 255, 255, 0.20)',
          }}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-red-500/20 hover:border-red-500/40 text-zinc-400 hover:text-red-400 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
          title="Exit Session (ESC)"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  );
}
