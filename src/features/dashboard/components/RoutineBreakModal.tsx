import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { toLocalDateString } from '@/utils/dateUtils';
import { springs } from '@/constants/motion';

interface RoutineBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BREAK_OPTIONS = [
  { id: 'lunch', label: 'Lunch Break', icon: 'Utensils', defaultDuration: 30, desc: 'Recharge glucose and energy for afternoon sessions' },
  { id: 'dinner', label: 'Dinner Break', icon: 'Utensils', defaultDuration: 45, desc: 'Evening meal and relaxation break' },
  { id: 'breakfast', label: 'Breakfast & Morning Reset', icon: 'Coffee', defaultDuration: 25, desc: 'Fuel up for the morning study block' },
  { id: 'exercise', label: 'Physical Activity & Workout', icon: 'Activity', defaultDuration: 45, desc: 'Running, outdoor walk, or gym workout' },
  { id: 'nap', label: 'Power Nap / Rest', icon: 'Moon', defaultDuration: 20, desc: '20-minute alertness restoration nap' },
  { id: 'custom', label: 'Mindset Reset Break', icon: 'Zap', defaultDuration: 15, desc: 'Short cognitive recovery break' },
];

const DURATIONS = [15, 25, 30, 45, 60];

export function RoutineBreakModal({ isOpen, onClose }: RoutineBreakModalProps) {
  const actions = useStudyBrainStore(s => s.actions);
  const [selectedBreakId, setSelectedBreakId] = useState<string>('lunch');
  const [duration, setDuration] = useState<number>(30);

  const selectedOpt = BREAK_OPTIONS.find(b => b.id === selectedBreakId) || BREAK_OPTIONS[0];

  const handleConfirmBreak = async () => {
    const now = new Date();
    const startH = String(now.getHours()).padStart(2, '0');
    const startM = String(now.getMinutes()).padStart(2, '0');
    const startStr = `${startH}:${startM}`;

    const endMs = now.getTime() + duration * 60 * 1000;
    const endDate = new Date(endMs);
    const endH = String(endDate.getHours()).padStart(2, '0');
    const endM = String(endDate.getMinutes()).padStart(2, '0');
    const endStr = `${endH}:${endM}`;

    const timeSlotStr = `${startStr} - ${endStr}`;
    const todayDateStr = toLocalDateString(now);

    const breakMission = {
      chapter: selectedOpt.label,
      chapterName: selectedOpt.label,
      chapterId: `break-${selectedBreakId}`,
      subject: 'break' as any,
      taskName: `${duration}m ${selectedOpt.label}`,
      type: 'Break' as any,
      duration,
      completed: false,
      scheduledTime: startStr,
      timeSlot: timeSlotStr,
      date: todayDateStr,
      scheduledDate: todayDateStr,
      isManualOverride: true,
      xp: 10,
      unlocked: true,
      reasoning: {
        whySelected: `User-triggered ${duration}m ${selectedOpt.label}.`,
        dependentChapters: [],
        rankingRationale: `User requested routine break.`,
        longTermImpact: `Sustains physical energy and cognitive alertness.`,
        postponeRisk: `Skipping routine rest causes exhaustion.`,
        targetAccuracy: `100% Refresh`
      }
    };

    try {
      await actions.addCustomMission(breakMission as any);
      onClose();
    } catch (err) {
      console.error('Failed to add break mission:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} zIndex={100} className="max-w-md w-full p-6 rounded-2xl border border-zinc-800 text-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Icon name="Coffee" className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-white leading-tight">Take Routine Break</h2>
            <p className="text-xs text-zinc-400 font-mono">Pushes upcoming missions ahead automatically</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Icon name="X" className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* BREAK TYPE SELECTION */}
        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Select Routine Activity
          </label>
          <div className="grid grid-cols-2 gap-2">
            {BREAK_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedBreakId(opt.id);
                  setDuration(opt.defaultDuration);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedBreakId === opt.id
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300 ring-1 ring-amber-400/40 shadow-lg'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={opt.icon as any} className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold truncate">{opt.label}</span>
                </div>
                <span className="text-[10px] text-zinc-400 line-clamp-1">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* DURATION SELECTION */}
        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Break Duration (Minutes)
          </label>
          <div className="flex gap-2 relative bg-zinc-950/80 border border-zinc-850 p-1 rounded-xl">
            {DURATIONS.map((d) => {
              const isActive = duration === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`relative flex-1 py-2 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer select-none z-10 ${
                    isActive
                      ? 'text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="routineBreakDurationPill"
                      className="absolute inset-0 bg-amber-500 rounded-lg shadow-md shadow-amber-500/30 -z-10"
                      transition={springs.fluid}
                    />
                  )}
                  {d}m
                </button>
              );
            })}
          </div>
        </div>

        {/* SUMMARY NOTICE */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-300 font-mono flex items-start gap-2.5">
          <Icon name="Info" className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            Starting <strong className="text-amber-300">{duration}m {selectedOpt.label}</strong> right now. All uncompleted missions will automatically slide forward by {duration} minutes!
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 font-mono text-xs font-semibold transition-colors cursor-pointer"
          >
            Skip / Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmBreak}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Icon name="Coffee" className="w-4 h-4 stroke-[2.5]" />
            <span>Confirm Break</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
