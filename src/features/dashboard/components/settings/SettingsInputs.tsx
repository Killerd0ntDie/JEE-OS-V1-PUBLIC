import React from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { springs } from '@/constants/motion';

export function SpringToggle({ 
  checked, 
  onChange, 
  activeColor = 'bg-indigo-600' 
}: { 
  checked: boolean; 
  onChange: (v: boolean) => void; 
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
        checked ? activeColor : 'bg-zinc-800 border border-white/10'
      }`}
    >
      <motion.div
        layout
        transition={springs.snappy}
        className={`w-5.5 h-5.5 rounded-full bg-white shadow-md ${checked ? 'ml-auto' : 'mr-auto'}`}
      />
    </button>
  );
}

export function ModernTimeInput({
  id,
  label,
  value,
  onChange,
  presets
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  presets?: string[];
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-mono font-medium text-zinc-300 block">{label}</label>
      <div className="relative flex items-center">
        <Clock className="w-4 h-4 text-white pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
        <input
          id={id}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zinc-900/90 hover:bg-zinc-850 border border-white/15 hover:border-white/30 text-white rounded-2xl pl-10 pr-4 py-3 text-xs font-mono focus:outline-none focus:border-indigo-500 cursor-pointer shadow-inner [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden [&::-ms-clear]:hidden"
        />
      </div>
      {presets && (
        <div className="flex gap-1.5 flex-wrap pt-1">
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                value === p 
                  ? 'bg-indigo-600/40 border-indigo-400 text-white font-bold' 
                  : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
