import React from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { springs } from '@/constants/motion';
import { ModernTimeInput } from './SettingsInputs';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface ScheduleCapacitySettingsSectionProps {
  dailyQuota: number;
  subjectSplitStrategy: string;
  prerequisiteEnforcementStrategy: string;
  dayStartTime: string;
  dayEndTime: string;
  minStreakHours?: number;
  minStreakOptions: { value: number; label: string }[];
  onChange: (key: string, value: any) => void;
}

export const ScheduleCapacitySettingsSection: React.FC<ScheduleCapacitySettingsSectionProps> = ({
  dailyQuota,
  subjectSplitStrategy,
  prerequisiteEnforcementStrategy,
  dayStartTime,
  dayEndTime,
  minStreakHours,
  minStreakOptions,
  onChange
}) => {
  return (
    <div className="css-glass rounded-3xl p-6 md:p-8 space-y-6 shadow-xl text-left relative z-20 overflow-visible">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
          <Clock className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-base font-display font-bold text-white tracking-tight">
            Daily Study Budget & Split Strategy
          </h3>
          <p className="text-xs text-zinc-400 font-sans">
            Determines how many hours the Planner Engine schedules per day across subjects.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Daily Quota Slider with Fluid Progress */}
        <div className="css-glass-subtle rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold text-zinc-200">
              Daily Available Study Capacity
            </label>
            <motion.span 
              key={dailyQuota}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={springs.snappy}
              className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-xl shadow-sm"
            >
              {dailyQuota} Hours / Day
            </motion.span>
          </div>

          {/* Range Slider Track */}
          <div className="relative flex items-center py-2">
            <input
              type="range"
              min="2"
              max="14"
              step="1"
              value={dailyQuota}
              onChange={(e) => onChange('dailyQuota', Number(e.target.value))}
              className="w-full h-2.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-white/10"
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>2 hrs (Light)</span>
            <span>8 hrs (Standard)</span>
            <span>14 hrs (Hardcore)</span>
          </div>
        </div>

        {/* Subject Split Strategy (Sliding Spring Glider Tabs) */}
        <div className="space-y-2.5">
          <label className="text-xs font-mono font-bold text-zinc-300 block">
            Subject Rotation Strategy
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 rounded-2xl css-glass-subtle">
            {[
              { id: '3_a_day', title: '3 Subjects Daily', desc: 'Balanced Coverage' },
              { id: '2_a_day_alternating', title: '2 Subjects Alternating', desc: 'Deeper Focus' },
              { id: '1_a_day_alternating', title: '1 Subject Focus', desc: 'Deep-Dive' }
            ].map((tab) => {
              const isSelected = subjectSplitStrategy === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChange('subjectSplitStrategy', tab.id)}
                  className={`relative px-4 py-3 rounded-xl text-left transition-colors cursor-pointer z-10 flex flex-col justify-center ${
                    isSelected ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="subjectStrategyGlider"
                      className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md -z-10"
                      transition={springs.fluid}
                    />
                  )}
                  <span className="text-xs font-mono font-bold block">{tab.title}</span>
                  <span className="text-[10px] opacity-80 block">{tab.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prerequisite Enforcement Strategy (Sliding Spring Glider Tabs) */}
        <div className="space-y-2.5">
          <label className="text-xs font-mono font-bold text-zinc-300 block">
            Prerequisite Enforcement
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1.5 rounded-2xl css-glass-subtle">
            {[
              { id: 'parallel', title: 'Parallel Execution', desc: 'Bypass & Learn Foundations Simultaneously' },
              { id: 'strict', title: 'Strict Hierarchy', desc: 'Enforce Foundations Before Advancing' }
            ].map((tab) => {
              const isSelected = prerequisiteEnforcementStrategy === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChange('prerequisiteEnforcementStrategy', tab.id)}
                  className={`relative px-4 py-3 rounded-xl text-left transition-colors cursor-pointer z-10 flex flex-col justify-center ${
                    isSelected ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="prereqStrategyGlider"
                      className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md -z-10"
                      transition={springs.fluid}
                    />
                  )}
                  <span className="text-xs font-mono font-bold block">{tab.title}</span>
                  <span className="text-[10px] opacity-80 block">{tab.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modern Time Boundaries & Minimum Streak Threshold */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <ModernTimeInput
            id="dayStartTime"
            label="Day Start Time"
            value={dayStartTime}
            onChange={(val) => onChange('dayStartTime', val)}
            presets={['06:00', '07:00', '08:00']}
          />

          <ModernTimeInput
            id="dayEndTime"
            label="Day End Cutoff"
            value={dayEndTime}
            onChange={(val) => onChange('dayEndTime', val)}
            presets={['22:00', '23:00', '00:00', '01:00']}
          />

          <CustomSelect
            id="minStreakHours"
            label="Min Streak Threshold"
            value={minStreakHours ?? 0.5}
            options={minStreakOptions}
            onChange={(val) => onChange('minStreakHours', parseFloat(val))}
          />
        </div>

      </div>
    </div>
  );
};
