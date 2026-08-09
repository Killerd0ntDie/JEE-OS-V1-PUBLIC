import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useAuth } from '@/features/auth';
import { Icon } from '@/components/ui/Icon';
import { soundSystem } from '@/utils/audioEffects';
import { SubjectId } from '@/types';
import { 
  Target, Clock, Volume2, VolumeX, Bell, BellOff, ShieldCheck, 
  Sparkles, CheckCircle2, RotateCcw, AlertTriangle, User, LogOut, Lock, SlidersHorizontal
} from 'lucide-react';

import { normalizeTwoDaySplitConfig } from '@jee-os/engines';
import { AcademicSettingsSection } from './components/AcademicSettingsSection';
import { AudioSettingsSection } from './components/AudioSettingsSection';
import { DangerZoneSection } from './components/DangerZoneSection';

export function SettingsPage() {
  const actions = useStudyBrainStore(state => state.actions);
  const settings = useStudyBrainStore(state => state.settings);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const xp = useStudyBrainStore(state => state.xp);
  const deletedMissionIds = useStudyBrainStore(state => state.deletedMissionIds);
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
  });

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const {
    targetYear, dreamIit, targetBranch, dailyQuota, subjectSplitStrategy,
    dayStartTime, dayEndTime, twoDaySplitConfig, soundEffects, desktopNotifications,
    volume, pauseOnTabChange, enableGodMode, minStreakHours, enablePomodoroCasino
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

  // Auth Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
    });
  }, [settings, mentorProfile]);

    const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      // Sound test click
    if (soundEffects) {
      soundSystem.playSuccess(true, volume);
    }

    // Desktop notification permission check
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
      enablePomodoroCasino
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-left relative pb-12 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            <Icon name="Settings" className="w-3.5 h-3.5" />
            <span>System Control & Configuration Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
            Workspace Settings
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Manage target college goals, daily study capacity, subject split strategy, audio feedback, and cloud synchronization.
          </p>
        </div>

        {/* Save Notification Toast */}
        {isSaved && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-2 shadow-lg animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Settings Saved & Synced!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* SECTION 1: ACADEMIC GOALS & TARGET HORIZON */}
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl space-y-6 shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-zinc-900 pb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white tracking-tight">
                Academic Targets & Exam Horizon
              </h3>
              <p className="text-[11px] text-zinc-400">
                Defines target year metrics, dream IIT benchmark, and branch priority.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Target Year */}
            <div className="space-y-2">
              <label htmlFor="targetYear" className="text-xs font-mono font-medium text-zinc-300 block">
                Target Exam Year
              </label>
              <select id="targetYear"
                value={targetYear}
                onChange={(e) => handleChange('targetYear', e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 text-zinc-100 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer"
              >
                <option value="2026">JEE 2026 (Class 12 / Dropper)</option>
                <option value="2027">JEE 2027 (Class 11 / Target)</option>
                <option value="2028">JEE 2028 (Foundation)</option>
              </select>
            </div>

            {/* Dream IIT */}
            <div className="space-y-2">
              <label htmlFor="dreamIit" className="text-xs font-mono font-medium text-zinc-300 block">
                Dream IIT / Target Institute
              </label>
              <select id="dreamIit"
                value={dreamIit}
                onChange={(e) => handleChange('dreamIit', e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 text-zinc-100 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer"
              >
                <option value="IIT Bombay">IIT Bombay</option>
                <option value="IIT Delhi">IIT Delhi</option>
                <option value="IIT Madras">IIT Madras</option>
                <option value="IIT Kharagpur">IIT Kharagpur</option>
                <option value="IIT Kanpur">IIT Kanpur</option>
                <option value="IIT Roorkee">IIT Roorkee</option>
                <option value="IIT Guwahati">IIT Guwahati</option>
                <option value="IISc Bangalore">IISc Bangalore</option>
              </select>
            </div>

            {/* Target Branch */}
            <div className="space-y-2">
              <label htmlFor="targetBranch" className="text-xs font-mono font-medium text-zinc-300 block">
                Target Engineering Branch
              </label>
              <select id="targetBranch"
                value={targetBranch}
                onChange={(e) => handleChange('targetBranch', e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 text-zinc-100 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer"
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Data Science & Artificial Intelligence">Data Science & AI</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Aerospace Engineering">Aerospace Engineering</option>
                <option value="Chemical Engineering">Chemical Engineering</option>
                <option value="Engineering Physics">Engineering Physics</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: DAILY STUDY CAPACITY & SUBJECT SPLIT STRATEGY */}
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl space-y-6 shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-zinc-900 pb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white tracking-tight">
                Daily Study Budget & Split Strategy
              </h3>
              <p className="text-[11px] text-zinc-400">
                Determines how many hours the Planner Engine schedules per day across subjects.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Quota Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-medium text-zinc-300">
                  Daily Available Study Capacity
                </label>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-0.5 rounded-lg">
                  {dailyQuota} Hours / Day
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="14"
                step="1"
                value={dailyQuota}
                onChange={(e) => handleChange('dailyQuota', Number(e.target.value))}
                className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-zinc-800"
              />
              <p className="text-[10px] text-zinc-400 font-mono">
                Allocates time across Physics, Chemistry, and Maths in the Daily Execution Cockpit.
              </p>
            </div>

            {/* Subject Split Strategy */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-medium text-zinc-300 block">
                Subject Rotation Strategy
              </label>
              <select
                value={subjectSplitStrategy}
                onChange={(e) => handleChange('subjectSplitStrategy', e.target.value as any)}
                className="w-full bg-zinc-900/90 border border-zinc-800 text-zinc-100 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer"
              >
                <option value="3_a_day">3 Subjects Daily (Balanced Coverage)</option>
                <option value="2_a_day_alternating">2 Subjects Alternating (Deeper Focus)</option>
                <option value="1_a_day_alternating">1 Subject Focus (Immersive Deep-Dive)</option>
              </select>
              <p className="text-[10px] text-zinc-400 font-mono">
                Configures the 7-day Weekly Master Matrix layout in the Planner.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Day Start Time */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-medium text-zinc-300 block">
                Day Start Time
              </label>
              <input
                type="time"
                value={dayStartTime}
                onChange={(e) => handleChange('dayStartTime', e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 text-zinc-100 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400 font-mono">
                When does your study day begin?
              </p>
            </div>

            {/* Day End Time */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-medium text-zinc-300 block">
                Day End Time (Cutoff)
              </label>
              <input
                type="time"
                value={dayEndTime}
                onChange={(e) => handleChange('dayEndTime', e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 text-zinc-100 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400 font-mono">
                Tasks that cross this limit are pushed to tomorrow.
              </p>
            </div>

            {/* Minimum Study Hours for Streak */}
            <div className="space-y-2 col-span-1 md:col-span-2 pt-3 border-t border-zinc-900">
              <label htmlFor="minStreakHours" className="text-xs font-mono font-medium text-zinc-300 flex items-center justify-between">
                <span>Minimum Daily Study Time for Streak (Threshold)</span>
                <span className="text-amber-400 font-bold bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-lg text-[11px]">
                  ⚡ {minStreakHours ?? 0.5} Hours / Day
                </span>
              </label>
              <select id="minStreakHours"
                value={minStreakHours ?? 0.5}
                onChange={(e) => handleChange('minStreakHours', parseFloat(e.target.value))}
                className="w-full bg-zinc-900/90 border border-zinc-800 text-zinc-100 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus:border-amber-500 cursor-pointer"
              >
                <option value={0.25}>0.25 Hours (15 Mins) - Casual</option>
                <option value={0.5}>0.5 Hours (30 Mins) - Default</option>
                <option value={1.0}>1.0 Hour (60 Mins) - Disciplined</option>
                <option value={1.5}>1.5 Hours (90 Mins) - Hardcore</option>
                <option value={2.0}>2.0 Hours (120 Mins) - Intensive</option>
                <option value={3.0}>3.0 Hours (180 Mins) - Beast Mode</option>
                <option value={4.0}>4.0 Hours (240 Mins) - JEE Top 100 AIR</option>
              </select>
              <p className="text-[10px] text-zinc-400 font-mono">
                A daily streak is ONLY maintained if your total study duration for that day meets or exceeds this threshold.
              </p>
            </div>
          </div>

          {/* Customize 2-Subject Daily Pairs - Full Width Container */}
          {subjectSplitStrategy === '2_a_day_alternating' && (
            <div className="mt-4 p-4.5 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-3 font-mono text-xs text-left w-full shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  Customize 2-Subject Daily Pairs
                </span>
                <span className="text-[10px] text-zinc-400">3-Day Rotation Cycle</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([0, 1, 2] as const).map((idx) => {
                  const defaultPairs: [SubjectId, SubjectId][] = [
                    ['physics', 'chemistry'],
                    ['physics', 'maths'],
                    ['chemistry', 'maths']
                  ];
                  const pair = twoDaySplitConfig[idx] || defaultPairs[idx];
                  return (
                    <div key={idx} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-2">
                      <span className="text-[10px] text-zinc-400 font-bold block uppercase">
                        Day {idx + 1} Pair
                      </span>
                      <div className="space-y-1 text-[11px]">
                        <div>
                          <span className="text-zinc-400 text-[10px] block">Subject 1:</span>
                          <select
                            value={pair[0]}
                            onChange={(e) => {
                              const newConfig: [SubjectId[], SubjectId[], SubjectId[]] = [
                                [...twoDaySplitConfig[0]],
                                [...twoDaySplitConfig[1]],
                                [...twoDaySplitConfig[2]]
                              ];
                              newConfig[idx][0] = e.target.value as SubjectId;
                              handleChange('twoDaySplitConfig', newConfig);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono"
                          >
                            <option value="physics">Physics</option>
                            <option value="chemistry">Chemistry</option>
                            <option value="maths">Maths</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-zinc-400 text-[10px] block">Subject 2:</span>
                          <select
                            value={pair[1]}
                            onChange={(e) => {
                              const newConfig: [SubjectId[], SubjectId[], SubjectId[]] = [
                                [...twoDaySplitConfig[0]],
                                [...twoDaySplitConfig[1]],
                                [...twoDaySplitConfig[2]]
                              ];
                              newConfig[idx][1] = e.target.value as SubjectId;
                              handleChange('twoDaySplitConfig', newConfig);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white font-mono"
                          >
                            <option value="physics">Physics</option>
                            <option value="chemistry">Chemistry</option>
                            <option value="maths">Maths</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: GAMIFICATION & GOD MODE */}
        <div className="p-6 rounded-2xl border border-amber-500/20 bg-zinc-950/60 backdrop-blur-xl space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center gap-2.5 border-b border-zinc-900 pb-3 relative">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white tracking-tight">
                Gamification & God Mode
              </h3>
              <p className="text-[11px] text-zinc-400">
                Unlock God Mode themes and XP multipliers for maintaining high study streaks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 relative">
            {/* God Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-850 bg-zinc-900/40 gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <Sparkles className={`w-3 h-3 ${enableGodMode ? 'text-amber-400' : 'text-zinc-400'}`} />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-mono font-bold text-white">Enable God Mode</div>
                  <div className="text-[11px] text-zinc-400 mt-1 max-w-xl leading-relaxed">
                    When enabled, maintaining a <span className="text-white font-bold">7-day streak</span> activates God Mode. This coats the entire app in a divine amber theme and grants a <span className="text-amber-400 font-bold border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 rounded">1.5x XP Multiplier</span> on all completed tasks until the streak is broken.
                  </div>
                </div>
              </div>
              <input id="enableGodMode" type="checkbox" checked={enableGodMode}
                onChange={(e) => handleChange('enableGodMode', e.target.checked)}
                className="w-5 h-5 accent-amber-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Pomodoro Casino Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-850 bg-zinc-900/40 gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <Sparkles className={`w-3 h-3 ${enablePomodoroCasino ? 'text-red-500' : 'text-zinc-400'}`} />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-mono font-bold text-white">Pomodoro Casino (XP Wager)</div>
                  <div className="text-[11px] text-zinc-400 mt-1 max-w-xl leading-relaxed">
                    When enabled, opening the Cockpit will require you to <span className="text-white font-bold">wager your XP</span>. Upon completion, you must provide a "Proof of Work" summary to earn a <span className="text-red-400 font-bold border border-red-500/30 bg-red-500/10 px-1 py-0.5 rounded">2.5x Payout</span>. If you fail or quit early, the Casino takes your wager.
                  </div>
                </div>
              </div>
              <input id="enablePomodoroCasino" type="checkbox" checked={enablePomodoroCasino}
                onChange={(e) => handleChange('enablePomodoroCasino', e.target.checked)}
                className="w-5 h-5 accent-red-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Minimum Streak Requirement */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-850 bg-zinc-900/40 gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <Icon name="Flame" className="w-3 h-3 text-amber-500" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-mono font-bold text-white">Minimum Streak Requirement</div>
                  <div className="text-[11px] text-zinc-400 mt-1 max-w-xl leading-relaxed">
                    Minimum hours of study required per day to earn a streak fire ⚡. Prevents 5-minute sessions from artificially inflating streaks.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={minStreakHours || 0.5}
                  onChange={(e) => handleChange('minStreakHours', parseFloat(e.target.value) || 0.5)}
                  className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm text-center focus:outline-none focus:border-amber-500/50"
                />
                <span className="text-xs font-mono text-zinc-400">hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: AUDIO & DESKTOP ALERTS */}
        <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl space-y-6 shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-zinc-900 pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white tracking-tight">
                Audio & Web Desktop Alerts
              </h3>
              <p className="text-[11px] text-zinc-400">
                Configure browser sound chimes and desktop system alerts for study sessions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sound Effects Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-850 bg-zinc-900/40">
                <div className="flex items-center gap-2.5">
                  {soundEffects ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
                  <div>
                    <div className="text-xs font-mono font-semibold text-white">Web Audio Sound Chimes</div>
                    <div className="text-[10px] text-zinc-400">Play audio chimes on task completion</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => handleChange('soundEffects', e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Volume Slider */}
              {soundEffects && (
                <div className="space-y-1.5 pl-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Volume</span>
                    <span>{volume}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={volume}
                      onChange={(e) => handleChange('volume', Number(e.target.value))}
                      className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-zinc-800"
                    />
                    <button
                      type="button"
                      onClick={() => soundSystem.playSuccess(true, volume)}
                      className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2 py-1 rounded cursor-pointer shrink-0"
                    >
                      Test Chime
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Notifications Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-850 bg-zinc-900/40">
              <div className="flex items-center gap-2.5">
                {desktopNotifications ? <Bell className="w-4 h-4 text-indigo-400" /> : <BellOff className="w-4 h-4 text-zinc-400" />}
                <div>
                  <div className="text-xs font-mono font-semibold text-white">Browser Desktop Notifications</div>
                  <div className="text-[10px] text-zinc-400">Receive system popups for revision alerts</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={desktopNotifications}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  handleChange('desktopNotifications', checked);
                  if (checked) {
                    await soundSystem.requestNotificationPermission();
                  }
                }}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Pause on Tab Change Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-850 bg-zinc-900/40">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-mono font-semibold text-white">Pause on Tab Change</div>
                  <div className="text-[10px] text-zinc-400">Auto-pause the cockpit when you switch tabs or leave the page</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={pauseOnTabChange}
                onChange={(e) => handleChange('pauseOnTabChange', e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="submit"
            className={`px-6 py-3 rounded-xl text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              isSaved
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 border border-emerald-400/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 border border-indigo-400/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaved ? 'Saved Successfully!' : 'Save Workspace Configuration'}
          </button>
        </div>

      </form>

      {/* SECTION 4: CLOUD SYNC & ACCOUNT DATA */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white tracking-tight">
                Cloud Sync & Authentication Status
              </h3>
              <p className="text-[11px] text-zinc-400">
                Manage Firebase Auth account and cross-device cloud synchronization.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {user && !user.isAnonymous ? (
            <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-bold font-mono">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-white">{user.displayName || user.email}</div>
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Cloud Sync Active • {user.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-amber-300">Guest / Local Storage Mode</div>
                  <div className="text-[10px] text-zinc-400">Sign in to enable cloud sync across devices.</div>
                </div>
                <button
                  type="button"
                  onClick={() => loginWithGoogle()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors shadow-lg"
                >
                  Sign In with Google
                </button>
              </div>

              {/* Email Login/Register Toggle Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-3 border-t border-zinc-800 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {isRegistering && (
                    <input
                      type="text"
                      placeholder="Display Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
                    />
                  )}
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
                  />
                </div>

                {authError && (
                  <div className="text-[10px] font-mono text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/40">
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
                    className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
                  >
                    {isRegistering ? "Register Account" : "Sign In with Email"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* DANGER ZONE: WORKSPACE RESET */}
      <DangerZoneSection
        onOpenResetXP={() => setShowXpResetConfirm(true)}
        onOpenResetMissions={() => setShowCustomMissionsConfirm(true)}
        onOpenResetHidden={() => setShowHiddenMissionsConfirm(true)}
        onOpenPurgeWorkspace={() => setShowResetConfirm(true)}
      />

        {/* XP Reset Confirmation Modal */}
        <Modal
          isOpen={showXpResetConfirm}
          onClose={() => setShowXpResetConfirm(false)}
          zIndex={9999}
          backdropClassName="bg-black/80 backdrop-blur-md"
          className="bg-zinc-950 border border-amber-900/50 p-6 rounded-2xl max-w-md w-full space-y-4 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        >
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="text-base font-display font-bold text-white">Reset XP &amp; Level?</h4>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                This will set your XP, level, and streak back to zero. All chapter progress, missions, and study data will be kept. The change will be saved to the cloud immediately.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowXpResetConfirm(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetXp}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 border border-amber-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
                >
                  Yes, Reset XP
                </button>
              </div>
        </Modal>

        {/* Hidden Missions Confirmation Modal */}
        <Modal
          isOpen={showHiddenMissionsConfirm}
          onClose={() => setShowHiddenMissionsConfirm(false)}
          zIndex={9999}
          backdropClassName="bg-black/80 backdrop-blur-md"
          className="bg-zinc-950 border border-amber-900/50 p-6 rounded-2xl max-w-md w-full space-y-4 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        >
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="text-base font-display font-bold text-white">Reset Hidden Missions?</h4>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                This will unhide all missions that you previously deleted. The planner will be able to reschedule them if they are still relevant.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHiddenMissionsConfirm(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await actions.resetHiddenMissions();
                    setShowHiddenMissionsConfirm(false);
                    setShowHiddenMissionsSuccess(true);
                    setTimeout(() => setShowHiddenMissionsSuccess(false), 3000);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 border border-amber-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
                >
                  Yes, Reset Hidden
                </button>
              </div>
        </Modal>

        {/* Reset Custom Missions Modal */}
        <Modal
          isOpen={showCustomMissionsConfirm}
          onClose={() => setShowCustomMissionsConfirm(false)}
          zIndex={9999}
          backdropClassName="bg-black/80 backdrop-blur-md"
          className="bg-zinc-950 border border-amber-900/50 p-6 rounded-2xl max-w-md w-full space-y-4 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        >
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="text-base font-display font-bold text-white">Reset Custom Missions?</h4>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                This will clear all your custom daily tasks and any manually scheduled missions for today. The AI Planner will then generate a brand new daily schedule for you based on your goals.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomMissionsConfirm(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await actions.resetCustomMissions();
                    setShowCustomMissionsConfirm(false);
                    setShowCustomMissionsSuccess(true);
                    setTimeout(() => setShowCustomMissionsSuccess(false), 3000);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 border border-amber-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
                >
                  Yes, Reset Schedule
                </button>
              </div>
        </Modal>
        {/* Universal Confirmation Modal */}
        <Modal
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          zIndex={9999}
          backdropClassName="bg-black/80 backdrop-blur-md"
          className="bg-zinc-950 border border-red-900/50 p-6 rounded-2xl max-w-md w-full space-y-4 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        >
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="text-base font-display font-bold text-white">Reset Entire Workspace?</h4>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                This action will delete all chapters progress, logged mistakes, test results, and reset your prep workspace to initial defaults. This cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetWorkspace}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 border border-red-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
                >
                  Yes, Reset Everything
                </button>
              </div>
        </Modal>

        {showResetSuccess && (
          <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/40 text-center">
            Workspace reset successfully! Reloading...
          </div>
        )}

    </div>
  );
}
