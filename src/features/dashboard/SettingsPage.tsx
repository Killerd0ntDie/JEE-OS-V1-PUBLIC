import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useAuth } from '@/features/auth';
import { Icon } from '@/components/ui/Icon';
import { audioEngine as soundSystem } from '@/utils/audioEngine';
import { getValidTargetYears } from '@/utils/dateUtils';
import { SubjectId } from '@/types';
import { springs } from '@/constants/motion';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { 
  Target, Clock, Volume2, VolumeX, Bell, BellOff, ShieldCheck, 
  Sparkles, CheckCircle2, RotateCcw, AlertTriangle, User, LogOut, Lock, 
  SlidersHorizontal, Flame, Zap, Shield, Laptop
} from 'lucide-react';

import { normalizeTwoDaySplitConfig } from '@jee-os/engines';
import { DangerZoneSection } from './components/DangerZoneSection';
import { UserRepository } from '@/repositories/userRepository';
import { StudySessionRepository } from '@/repositories/studySessionRepository';

// Reusable Framer Motion Toggle Switch
function SpringToggle({ checked, onChange, activeColor = 'bg-indigo-600' }: { checked: boolean; onChange: (v: boolean) => void; activeColor?: string }) {
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

// Modern Time Input with White Clock Indicator & Presets
function ModernTimeInput({
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

export function SettingsPage() {
  const actions = useStudyBrainStore(state => state.actions);
  const settings = useStudyBrainStore(state => state.settings);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const xp = useStudyBrainStore(state => state.xp);
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, logout } = useAuth();
  
  // Settings Form States
  const [formData, setFormData] = useState({
    targetYear: settings.targetYear || '2027',
    dreamIit: settings.dreamIit || 'IIT Bombay',
    targetBranch: settings.targetBranch || 'Computer Science & Engineering',
    dailyQuota: settings.dailyQuota || 6,
    subjectSplitStrategy: mentorProfile?.subjectSplitStrategy || '3_a_day',
    dayStartTime: settings.dayStartTime || '07:00',
    dayEndTime: settings.dayEndTime || '23:00',
    twoDaySplitConfig: normalizeTwoDaySplitConfig(mentorProfile?.twoDaySplitConfig),
    soundEffects: settings.soundEffects ?? false,
    desktopNotifications: settings.desktopNotifications ?? false,
    volume: settings.volume ?? 75,
    pauseOnTabChange: settings.pauseOnTabChange ?? true,
    enableGodMode: settings.enableGodMode ?? true,
    minStreakHours: settings.minStreakHours ?? 0.5,
    enablePomodoroCasino: settings.enablePomodoroCasino ?? false,
    prerequisiteEnforcementStrategy: settings.prerequisiteEnforcementStrategy || 'parallel',
  });

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const {
    targetYear, dreamIit, targetBranch, dailyQuota, subjectSplitStrategy,
    dayStartTime, dayEndTime, twoDaySplitConfig, soundEffects, desktopNotifications,
    volume, pauseOnTabChange, enableGodMode, minStreakHours, enablePomodoroCasino,
    prerequisiteEnforcementStrategy
  } = formData;

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [showXpResetConfirm, setShowXpResetConfirm] = useState(false);
  const [showXpResetSuccess, setShowXpResetSuccess] = useState(false);
  const [showHiddenMissionsConfirm, setShowHiddenMissionsConfirm] = useState(false);
  const [showHiddenMissionsSuccess, setShowHiddenMissionsSuccess] = useState(false);
  const [showCustomMissionsConfirm, setShowCustomMissionsConfirm] = useState(false);
  const [showCustomMissionsSuccess, setShowCustomMissionsSuccess] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);

  // Auth Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleUndoMissionBug = async () => {
    try {
      const currentXp = xp;
      const newXp = {
        ...currentXp,
        daily: Math.max(0, currentXp.daily - 50),
        weekly: Math.max(0, currentXp.weekly - 50),
        monthly: Math.max(0, (currentXp.monthly || 0) - 50),
        total: Math.max(0, currentXp.total - 50)
      };
      
      const sessions = useStudyBrainStore.getState().studySessions || [];
      const latestSession = sessions[0];
      
      if (latestSession) {
         await actions.safeDbCall(() => StudySessionRepository.deleteStudySession(actions.userId, latestSession.id), 'deleteStudySession');
      }
      
      await actions.safeDbCall(() => UserRepository.updateUserProfile(actions.userId, { xp: newXp }), 'updateUserProfile');
      
      const newSessions = sessions.filter(s => s.id !== latestSession?.id);
      actions.runtime.updateStateOptimistic({ xp: newXp, studySessions: newSessions });
      await actions.runtime.refresh('INIT');
      
      actions.triggerToast('Bug Fixed', 'Decreased 75m and 1 mission score', 'success');
      setShowUndoConfirm(false);
    } catch (e) {
      console.error(e);
      actions.triggerToast('Error', 'Failed to undo mission', 'error');
    }
  };

  useEffect(() => {
    setFormData({
      targetYear: settings.targetYear || '2027',
      dreamIit: settings.dreamIit || 'IIT Bombay',
      targetBranch: settings.targetBranch || 'Computer Science & Engineering',
      dailyQuota: settings.dailyQuota || 6,
      subjectSplitStrategy: mentorProfile?.subjectSplitStrategy || '3_a_day',
      dayStartTime: settings.dayStartTime || '07:00',
      dayEndTime: settings.dayEndTime || '23:00',
      twoDaySplitConfig: normalizeTwoDaySplitConfig(mentorProfile?.twoDaySplitConfig),
      soundEffects: settings.soundEffects ?? false,
      desktopNotifications: settings.desktopNotifications ?? false,
      volume: settings.volume ?? 75,
      pauseOnTabChange: settings.pauseOnTabChange ?? true,
      enableGodMode: settings.enableGodMode ?? true,
      minStreakHours: settings.minStreakHours ?? 0.5,
      enablePomodoroCasino: settings.enablePomodoroCasino ?? false,
      prerequisiteEnforcementStrategy: settings.prerequisiteEnforcementStrategy || 'parallel',
    });
  }, [settings, mentorProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      if (soundEffects) {
        soundSystem.playSuccess();
      }

      if (desktopNotifications) {
        const granted = await soundSystem.requestNotificationPermission();
        if (granted) {
          soundSystem.sendDesktopNotification("JEE OS Settings Saved", "Desktop notifications are active for daily mission alerts.", true);
        }
      }

      await actions.setSettings({
        targetYear,
        dreamIit,
        targetBranch,
        dailyQuota,
        soundEffects,
        desktopNotifications,
        volume,
        pauseOnTabChange,
        enableGodMode,
        dayStartTime,
        dayEndTime,
        minStreakHours,
        enablePomodoroCasino,
        prerequisiteEnforcementStrategy
      });

      if (mentorProfile) {
        await actions.updateMentorProfile({
          ...mentorProfile,
          dailyAvailableHours: dailyQuota,
          targetYear,
          targetCollege: dreamIit,
          targetBranch,
          subjectSplitStrategy,
          twoDaySplitConfig
        });
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    }
  };

  const handleResetWorkspace = async () => {
    try {
      await actions.purgeUserData();
      localStorage.clear();
      sessionStorage.clear();
      setShowResetConfirm(false);
      setShowResetSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error("Failed to reset workspace:", err);
    }
  };

  const handleResetXp = async () => {
    try {
      await actions.resetXpAndLevel();
      setShowXpResetConfirm(false);
      setShowXpResetSuccess(true);
      setTimeout(() => setShowXpResetSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to reset XP:", err);
    }
  };

  // Dropdown Options
  const targetYearOptions = getValidTargetYears(4).map((yr, index) => {
    let label = `JEE ${yr}`;
    if (index === 0) label += " (Class 12 / Dropper)";
    else if (index === 1) label += " (Class 11 / Target)";
    else label += " (Foundation)";
    return { value: yr, label };
  });

  const targetInstituteOptions = [
    { value: 'IIT Bombay', label: 'IIT Bombay' },
    { value: 'IIT Delhi', label: 'IIT Delhi' },
    { value: 'IIT Madras', label: 'IIT Madras' },
    { value: 'IIT Kanpur', label: 'IIT Kanpur' },
    { value: 'IIT Kharagpur', label: 'IIT Kharagpur' },
    { value: 'IIT Roorkee', label: 'IIT Roorkee' },
    { value: 'IIT Guwahati', label: 'IIT Guwahati' },
    { value: 'IISc Bangalore', label: 'IISc Bangalore' },
    { value: 'IISER', label: 'IISER (Pure Sciences / BS-MS)' },
    { value: 'NISER / CEBS', label: 'NISER / CEBS' },
    { value: 'BITS Pilani', label: 'BITS Pilani' },
    { value: 'Top NIT', label: 'Top NIT (Trichy / Surathkal / Warangal)' }
  ];

  const targetBranchOptions = [
    { value: 'Computer Science & Engineering', label: 'Computer Science & Engineering' },
    { value: 'Data Science & Artificial Intelligence', label: 'Data Science & AI' },
    { value: 'Pure Science & Research', label: 'Pure Science / Research (BS-MS)' },
    { value: 'Electrical Engineering', label: 'Electrical Engineering' },
    { value: 'Mechanical Engineering', label: 'Mechanical Engineering' },
    { value: 'Aerospace Engineering', label: 'Aerospace Engineering' },
    { value: 'Chemical Engineering', label: 'Chemical Engineering' },
    { value: 'Engineering Physics', label: 'Engineering Physics' }
  ];

  const minStreakOptions = [
    { value: 0.25, label: '0.25h (15m) - Casual' },
    { value: 0.5, label: '0.5h (30m) - Standard' },
    { value: 1.0, label: '1.0h (60m) - Disciplined' },
    { value: 1.5, label: '1.5h (90m) - Hardcore' },
    { value: 2.0, label: '2.0h (120m) - Intensive' },
    { value: 3.0, label: '3.0h (180m) - Beast Mode' }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-left relative pb-16 font-sans select-none">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            <Icon name="Settings" className="w-3.5 h-3.5" />
            <span>System Control & Configuration Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
            Workspace Settings
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed font-sans">
            Manage target college goals, daily study capacity, subject split strategy, audio feedback, and cloud synchronization.
          </p>
        </div>

        {/* Save Notification Toast */}
        <AnimatePresence>
          {isSaved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={springs.snappy}
              className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-2xl text-xs font-mono flex items-center gap-2 shadow-xl shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Settings Saved & Synced!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* SECTION 1: ACADEMIC GOALS & TARGET HORIZON */}
        <div className="glass-panel bg-zinc-900/70 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl text-left relative z-30 overflow-visible">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              <Target className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white tracking-tight">
                Academic Targets & Exam Horizon
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                Defines target year metrics, dream IIT benchmark, and branch priority.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Target Year Custom Dropdown */}
            <CustomSelect
              id="targetYear"
              label="Target Exam Year"
              value={targetYear}
              options={targetYearOptions}
              onChange={(val) => handleChange('targetYear', val)}
            />

            {/* Target Institute Custom Dropdown */}
            <CustomSelect
              id="dreamIit"
              label="Dream Institute / Goal"
              value={dreamIit}
              options={targetInstituteOptions}
              onChange={(val) => handleChange('dreamIit', val)}
            />

            {/* Target Branch Custom Dropdown */}
            <CustomSelect
              id="targetBranch"
              label="Target Branch / Focus"
              value={targetBranch}
              options={targetBranchOptions}
              onChange={(val) => handleChange('targetBranch', val)}
            />
          </div>
        </div>

        {/* SECTION 2: DAILY STUDY BUDGET & SPLIT STRATEGY */}
        <div className="glass-panel bg-zinc-900/70 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl text-left relative z-20 overflow-visible">
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
            <div className="glass-panel bg-zinc-850/60 border border-white/10 rounded-2xl p-5 space-y-3 shadow-inner">
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
                  onChange={(e) => handleChange('dailyQuota', Number(e.target.value))}
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
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 rounded-2xl bg-zinc-950/70 border border-white/10">
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
                      onClick={() => handleChange('subjectSplitStrategy', tab.id)}
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1.5 rounded-2xl bg-zinc-950/70 border border-white/10">
                {[
                  { id: 'parallel', title: 'Parallel Execution', desc: 'Bypass & Learn Foundations Simultaneously' },
                  { id: 'strict', title: 'Strict Hierarchy', desc: 'Enforce Foundations Before Advancing' }
                ].map((tab) => {
                  const isSelected = prerequisiteEnforcementStrategy === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleChange('prerequisiteEnforcementStrategy', tab.id)}
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
                onChange={(val) => handleChange('dayStartTime', val)}
                presets={['06:00', '07:00', '08:00']}
              />

              <ModernTimeInput
                id="dayEndTime"
                label="Day End Cutoff"
                value={dayEndTime}
                onChange={(val) => handleChange('dayEndTime', val)}
                presets={['22:00', '23:00', '00:00', '01:00']}
              />

              <CustomSelect
                id="minStreakHours"
                label="Min Streak Threshold"
                value={minStreakHours ?? 0.5}
                options={minStreakOptions}
                onChange={(val) => handleChange('minStreakHours', parseFloat(val))}
              />
            </div>

          </div>
        </div>

        {/* SECTION 3: GAMIFICATION & GOD MODE */}
        <div className="glass-panel bg-zinc-900/70 backdrop-blur-2xl border border-amber-500/20 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden text-left">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white tracking-tight">
                Gamification & God Mode
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                Unlock God Mode themes and XP multipliers for maintaining high study streaks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* God Mode Toggle Switch */}
            <div className="flex items-center justify-between p-4.5 rounded-2xl bg-zinc-850/60 border border-white/10 gap-4 shadow-sm">
              <div className="space-y-1 pr-2">
                <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <span>Enable God Mode</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-md">1.5x XP</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Maintaining a 7-day streak activates God Mode, applying a radiant amber theme and 1.5x XP bonus.
                </p>
              </div>
              <SpringToggle 
                checked={enableGodMode} 
                onChange={(v) => handleChange('enableGodMode', v)} 
                activeColor="bg-amber-500"
              />
            </div>

            {/* Pomodoro Casino Toggle Switch */}
            <div className="flex items-center justify-between p-4.5 rounded-2xl bg-zinc-850/60 border border-white/10 gap-4 shadow-sm">
              <div className="space-y-1 pr-2">
                <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <span>Pomodoro Casino (XP Wager)</span>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-md">2.5x Payout</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Wager XP on study sessions. Submit Proof-of-Work to earn a 2.5x payout, or forfeit your wager on premature exit.
                </p>
              </div>
              <SpringToggle 
                checked={enablePomodoroCasino} 
                onChange={(v) => handleChange('enablePomodoroCasino', v)} 
                activeColor="bg-rose-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: AUDIO & DESKTOP ALERTS */}
        <div className="glass-panel bg-zinc-900/70 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl text-left">
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
                  onChange={(v) => handleChange('soundEffects', v)} 
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
                    onChange={(e) => handleChange('volume', Number(e.target.value))}
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
                  handleChange('desktopNotifications', v);
                  if (v) await soundSystem.requestNotificationPermission();
                }} 
                activeColor="bg-indigo-600"
              />
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
                onChange={(v) => handleChange('pauseOnTabChange', v)} 
                activeColor="bg-amber-500"
              />
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
            type="submit"
            className={`px-8 py-3.5 rounded-2xl text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xl ${
              isSaved
                ? 'bg-emerald-600 shadow-emerald-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaved ? 'Saved & Synced!' : 'Save Workspace Configuration'}</span>
          </motion.button>
        </div>

      </form>

      {/* SECTION 5: CLOUD SYNC & AUTHENTICATION (FEATURING USER PROFILE AVATAR) */}
      <div className="glass-panel bg-zinc-900/70 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl text-left">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white tracking-tight">
                Cloud Sync & Authentication Status
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                Manage Firebase Auth account and cross-device cloud synchronization.
              </p>
            </div>
          </div>
        </div>

        <div>
          {user && !user.isAnonymous ? (
            <div className="flex items-center justify-between p-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-3.5">
                {/* User Avatar Image Matching Sidebar / Profile */}
                <div className="w-12 h-12 rounded-full border border-emerald-400/40 overflow-hidden flex items-center justify-center bg-emerald-500/20 shadow-md shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || user.email || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-emerald-300 font-bold font-mono text-base">
                      {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-mono font-bold text-white">{user.displayName || user.email}</div>
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Cloud Sync Active • {user.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-mono cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-zinc-850/60 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono font-bold text-amber-300">Guest / Local Storage Mode</div>
                  <div className="text-[10px] text-zinc-400">Sign in to enable cloud sync across devices.</div>
                </div>
                <button
                  type="button"
                  onClick={() => loginWithGoogle()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-mono font-bold cursor-pointer transition-colors shadow-lg"
                >
                  Sign In with Google
                </button>
              </div>

              {/* Email Auth Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-3 border-t border-white/10 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {isRegistering && (
                    <input
                      type="text"
                      placeholder="Display Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="bg-zinc-950 border border-white/10 text-zinc-200 px-4 py-2.5 rounded-2xl text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  )}
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-zinc-950 border border-white/10 text-zinc-200 px-4 py-2.5 rounded-2xl text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-zinc-950 border border-white/10 text-zinc-200 px-4 py-2.5 rounded-2xl text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {authError && (
                  <div className="text-[10px] font-mono text-red-400 bg-red-950/40 p-2.5 rounded-xl border border-red-900/40">
                    {authError}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-[10px] font-mono text-zinc-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    {isRegistering ? "Already have an account? Sign In" : "Need an account? Register"}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
                  >
                    {isRegistering ? "Register Account" : "Sign In with Email"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6: DANGER ZONE */}
      <DangerZoneSection
        onOpenResetXP={() => setShowXpResetConfirm(true)}
        onOpenResetMissions={() => setShowCustomMissionsConfirm(true)}
        onOpenResetHidden={() => setShowHiddenMissionsConfirm(true)}
        onOpenPurgeWorkspace={() => setShowResetConfirm(true)}
        onUndoMissionBug={() => setShowUndoConfirm(true)}
      />

      {/* Modals with Softened Backdrops */}
      <Modal
        isOpen={showUndoConfirm}
        onClose={() => setShowUndoConfirm(false)}
        zIndex={9999}
        backdropClassName="bg-black/40 backdrop-blur-md"
        className="glass-panel bg-zinc-900/90 border border-orange-500/30 p-6 rounded-3xl max-w-md w-full space-y-4 text-left shadow-2xl"
      >
        <div className="flex items-center gap-3 text-orange-400">
          <RotateCcw className="w-6 h-6 shrink-0" />
          <h4 className="text-base font-display font-bold text-white">Fix Time/Score Bug?</h4>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed font-mono">
          This will delete your most recent study session to deduct 75 minutes of total time and decrease your score by 50 XP (1 standard mission).
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowUndoConfirm(false)}
            className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUndoMissionBug}
            className="px-4 py-2 rounded-xl text-xs font-bold font-mono bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20 transition-all cursor-pointer"
          >
            Fix Time/Score
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showXpResetConfirm}
        onClose={() => setShowXpResetConfirm(false)}
        zIndex={9999}
        backdropClassName="bg-black/40 backdrop-blur-md"
        className="glass-panel bg-zinc-900/90 border border-amber-500/30 p-6 rounded-3xl max-w-md w-full space-y-4 text-left shadow-2xl"
      >
        <div className="flex items-center gap-3 text-amber-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h4 className="text-base font-display font-bold text-white">Reset XP & Level?</h4>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed font-mono">
          This will set your XP, level, and streak back to zero. All chapter progress, missions, and study data will be kept.
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowXpResetConfirm(false)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-mono cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleResetXp}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer shadow-lg"
          >
            Yes, Reset XP
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        zIndex={9999}
        backdropClassName="bg-black/40 backdrop-blur-md"
        className="glass-panel bg-zinc-900/90 border border-rose-500/30 p-6 rounded-3xl max-w-md w-full space-y-4 text-left shadow-2xl"
      >
        <div className="flex items-center gap-3 text-rose-400">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h4 className="text-base font-display font-bold text-white">Reset Entire Workspace?</h4>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed font-mono">
          This action will delete all chapters progress, logged mistakes, test results, and reset your workspace to initial defaults.
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowResetConfirm(false)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-mono cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleResetWorkspace}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer shadow-lg"
          >
            Yes, Reset Everything
          </button>
        </div>
      </Modal>

    </div>
  );
}
