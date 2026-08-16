import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Zap, X, SlidersHorizontal } from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { DailyCheckin } from '@/types';
import { toLocalDateString } from '@/utils/dateUtils';

export function DailyCheckinCard() {
  const actions = useStudyBrainStore(state => state.actions);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const settings = useStudyBrainStore(state => state.settings);
  const [isDismissed, setIsDismissed] = useState(true); // default to hidden until checked
  const [showCustomizer, setShowCustomizer] = useState(false);

  const todayStr = toLocalDateString();

  const previousCheckin = mentorProfile?.dailyCheckins?.[mentorProfile.dailyCheckins.length - 1];
  const defaultHours = mentorProfile?.dailyAvailableHours ?? settings?.dailyQuota ?? previousCheckin?.actualHoursAvailable ?? 4.0;
  const defaultEnergy = previousCheckin?.energyLevel || 'Medium';

  const [hours, setHours] = useState<number>(defaultHours);
  const [energy, setEnergy] = useState<'Low' | 'Medium' | 'High'>(defaultEnergy);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const lastCheckin = localStorage.getItem('jeeos_last_daily_checkin_date');
    const dismissedToday = localStorage.getItem('jeeos_last_daily_checkin_dismissed');
    const alreadyDone = lastCheckin === todayStr || dismissedToday === todayStr;
    setIsDismissed(alreadyDone);
  }, [todayStr]);

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem('jeeos_last_daily_checkin_dismissed', todayStr);
    setIsDismissed(true);
  };

  const handleQuickSubmit = async () => {
    const moodForEnergy: Record<'Low' | 'Medium' | 'High', 'Tired' | 'Focused' | 'Energetic'> = {
      Low: 'Tired',
      Medium: 'Focused',
      High: 'Energetic'
    };

    const checkin: DailyCheckin = {
      date: todayStr,
      actualHoursAvailable: hours,
      mood: moodForEnergy[energy],
      energyLevel: energy,
      sleepQualityHours: 7,
      unexpectedWork: ''
    };

    setIsSaving(true);
    try {
      await actions.submitDailyCheckin(checkin);
      localStorage.setItem('jeeos_last_daily_checkin_date', todayStr);
      setIsDismissed(true);
    } catch {
      // Gracefully dismiss on failure to not block user
      setIsDismissed(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="w-full bg-zinc-900/70 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/60 rounded-xl px-4 py-2.5 shadow-sm text-left transition-all duration-200"
      >
        <div className="flex items-center justify-between gap-3 text-xs">
          {/* Left: Info Chip & Summary */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-semibold text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
              <Zap className="w-2.5 h-2.5 text-indigo-400" />
              Daily Check-in
            </span>
            <span className="text-zinc-400 font-sans truncate">
              Target: <strong className="text-zinc-200 font-mono">{hours}h</strong> • Energy: <strong className="text-indigo-300 font-mono">{energy}</strong>
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 font-mono">
            <button
              type="button"
              onClick={() => setShowCustomizer(!showCustomizer)}
              className="px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Adjust check-in"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden sm:inline">{showCustomizer ? 'Close' : 'Adjust'}</span>
            </button>

            <button
              type="button"
              onClick={handleQuickSubmit}
              disabled={isSaving}
              className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{isSaving ? '...' : 'Confirm'}</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Dismiss for today"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Customizer */}
        {showCustomizer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono"
          >
            <div className="flex items-center justify-between gap-3 bg-zinc-950/40 px-3 py-2 rounded-lg border border-zinc-850">
              <span className="text-zinc-400">Study Hours:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="0.5"
                  value={hours}
                  onChange={e => setHours(parseFloat(e.target.value))}
                  className="w-24 accent-indigo-500 cursor-pointer"
                />
                <span className="text-indigo-400 font-bold w-10 text-right">{hours}h</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 bg-zinc-950/40 px-3 py-2 rounded-lg border border-zinc-850">
              <span className="text-zinc-400">Energy:</span>
              <div className="flex items-center gap-1">
                {(['Low', 'Medium', 'High'] as const).map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setEnergy(l)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      energy === l
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
