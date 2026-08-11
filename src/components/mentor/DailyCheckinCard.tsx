import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Zap, Target, Sliders, ArrowRight } from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { DailyCheckin } from '@/types';
import { toLocalDateString } from '@/utils/dateUtils';

export function DailyCheckinCard() {
  const actions = useStudyBrainStore(state => state.actions);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const todayStr = toLocalDateString();

  // Retrieve yesterday's checkin or fallback defaults
  const previousCheckin = mentorProfile?.dailyCheckins?.[mentorProfile.dailyCheckins.length - 1];
  
  const defaultHours = previousCheckin?.actualHoursAvailable || 3.0;
  const defaultPyqs = 25; // Not yet a tracked field on DailyCheckin — see note below.
  const defaultEnergy = previousCheckin?.energyLevel || 'Medium';

  const [hours, setHours] = useState<number>(defaultHours);
  const [pyqCount, setPyqCount] = useState<number>(defaultPyqs);
  const [energy, setEnergy] = useState<'Low' | 'Medium' | 'High'>(defaultEnergy);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const lastCheckin = localStorage.getItem('jeeos_last_daily_checkin_date');
    const completedToday = lastCheckin === todayStr;
    if (completedToday) {
      setIsSubmitted(true);
    }
  }, [todayStr]);

  if (isSubmitted) {
    return null;
  }

  const handleQuickSubmit = async (targetHours: number, targetPyqs: number, targetEnergy: 'Low' | 'Medium' | 'High') => {
    const moodForEnergy: Record<'Low' | 'Medium' | 'High', 'Tired' | 'Focused' | 'Energetic'> = {
      Low: 'Tired',
      Medium: 'Focused',
      High: 'Energetic'
    };

    const checkin: DailyCheckin = {
      date: todayStr,
      actualHoursAvailable: targetHours,
      mood: moodForEnergy[targetEnergy],
      energyLevel: targetEnergy,
      sleepQualityHours: 7,
      unexpectedWork: ''
    };

    setSaveError(null);
    setIsSaving(true);
    try {
      await actions.submitDailyCheckin(checkin);
      localStorage.setItem('jeeos_last_daily_checkin_date', todayStr);
      setIsSubmitted(true);
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save your check-in. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full bg-gradient-to-r from-indigo-950/60 via-zinc-900/90 to-purple-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-xl text-left font-sans relative overflow-hidden"
      >
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          
          {/* Left Title & Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-indigo-400" /> Daily Alignment
              </span>
              <span className="text-xs font-mono text-zinc-400">1-Tap Preset</span>
            </div>

            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Confirm Today's Study Target
            </h3>

            <p className="text-xs text-zinc-400">
              Prefilled from your schedule: <strong className="text-zinc-200">{hours}h study time</strong> • <strong className="text-zinc-200">{pyqCount} PYQs</strong> • <strong className="text-indigo-300">{energy} Energy</strong>
            </p>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Adjustments Toggle */}
            <button
              type="button"
              onClick={() => setShowCustomizer(!showCustomizer)}
              className="px-3 py-2 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showCustomizer ? 'Close Edit' : 'Edit Target'}</span>
            </button>

            {/* 1-TAP HERO SUBMIT BUTTON */}
            <button
              type="button"
              onClick={() => handleQuickSubmit(hours, pyqCount, energy)}
              disabled={isSaving}
              className="px-4 py-2.5 text-xs font-bold font-mono text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-600/25 border border-indigo-400/30 transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isSaving ? 'Saving...' : `Confirm ${hours}h Target`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {saveError && (
          <p className="mt-2 text-xs font-mono text-red-400 relative z-10">
            {saveError}
          </p>
        )}

        {/* CUSTOMIZER PANEL (EXPOSES ADJUSTMENT SLIDERS WHEN TOGGLED) */}
        {showCustomizer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs"
          >
            {/* Hours Slider */}
            <div className="space-y-1 bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
              <div className="flex justify-between text-zinc-400 text-xs">
                <span>Planned Hours</span>
                <span className="text-indigo-400 font-bold">{hours} hrs</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={hours}
                onChange={e => setHours(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* PYQ Target Slider */}
            <div className="space-y-1 bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
              <div className="flex justify-between text-zinc-400 text-xs">
                <span>PYQ Quota</span>
                <span className="text-purple-400 font-bold">{pyqCount} Qs</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={pyqCount}
                onChange={e => setPyqCount(parseInt(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Energy Level Toggle */}
            <div className="space-y-1 bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
              <div className="flex justify-between text-zinc-400 text-xs mb-1">
                <span>Energy State</span>
                <span className="text-emerald-400 font-bold">{energy}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                {(['Low', 'Medium', 'High'] as const).map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setEnergy(l)}
                    className={`py-1 rounded-lg font-bold border transition-colors ${
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
