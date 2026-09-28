import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square, Headphones, RefreshCw, Volume2, VolumeX, CheckCircle2 } from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '@/features/auth';
import { SubjectId } from '@/types/index';
import { storageAdapter } from '@/services/StorageAdapter';

const DEFAULT_MINUTES = 50;

const LOFI_STATIONS = [
  { id: '5qap5aO4i9A', title: 'Lofi Girl Radio', subtitle: 'beats to relax/study to' },
  { id: '4xDzrJKXOOY', title: 'Synthwave Radio', subtitle: 'chill synthwave beats' },
  { id: '7NOSDKb0HlU', title: 'Chillhop Radio', subtitle: 'jazzy & lofi hip hop' },
];

export function FocusVaultPage() {
  const { actions, chapters, todayMissions } = useStudyBrainStore(
    useShallow(state => ({
      actions: state.actions,
      chapters: state.chapters,
      todayMissions: state.todayMissions
    }))
  );
  const { user } = useAuth();
  
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>('physics');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
  const [inputMinutes, setInputMinutes] = useState<number | ''>(DEFAULT_MINUTES);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0); // tracks total time spent this session
  const [stationIndex, setStationIndex] = useState(0);

  const subjectChapters = useMemo(() => {
    return (chapters || []).filter(c => c.subject === selectedSubject);
  }, [chapters, selectedSubject]);

  const subjectMissions = useMemo(() => {
    return (todayMissions || []).filter(m => !m.completed && (m.subject === selectedSubject || (m as any).subjectId === selectedSubject));
  }, [todayMissions, selectedSubject]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickTime = useRef<number>(Date.now());
  const youtubeRef = useRef<HTMLIFrameElement>(null);

  // Persist session state to sessionStorage for crash recovery
  const SESSION_STORAGE_KEY = 'jeeos_focus_vault_state';

  const activeStateRef = useRef({ isActive, timeLeft, sessionDuration, isCompleted });

  useEffect(() => {
    activeStateRef.current = { isActive, timeLeft, sessionDuration, isCompleted };
  }, [isActive, timeLeft, sessionDuration, isCompleted]);

  // Periodically persist session state to sessionStorage for refresh recovery
  useEffect(() => {
    if (isActive && sessionDuration > 0) {
      storageAdapter.setSession(SESSION_STORAGE_KEY, {
        timeLeft, sessionDuration, selectedSubject, isActive, timestamp: Date.now()
      });
    }
  }, [isActive, timeLeft, sessionDuration, selectedSubject]);

  // Recover state from sessionStorage on mount
  useEffect(() => {
    const parsed = storageAdapter.getSession<any>(SESSION_STORAGE_KEY);
    if (parsed) {
      const FIVE_HOURS = 5 * 60 * 60 * 1000;
      if (parsed.timestamp && (Date.now() - parsed.timestamp) < FIVE_HOURS && parsed.sessionDuration > 0) {
        setTimeLeft(parsed.timeLeft ?? 0);
        setSessionDuration(parsed.sessionDuration ?? 0);
        setSelectedSubject(parsed.selectedSubject ?? 'physics');
        // Don't auto-resume; let user click play
      } else {
        storageAdapter.removeSession(SESSION_STORAGE_KEY);
      }
    }
  }, []);

  // Sync active state to session storage to block navigation in App.tsx
  useEffect(() => {
    const isVaultActive = isActive || (timeLeft > 0 && sessionDuration > 0 && !isCompleted);
    if (isVaultActive) {
      storageAdapter.setSession('jeeos_vault_active', 'true');
    } else {
      storageAdapter.removeSession('jeeos_vault_active');
    }
  }, [isActive, timeLeft, sessionDuration, isCompleted]);

  // Use native beforeunload to prevent accidental tab closing/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const state = activeStateRef.current;
      const isVaultActive = state.isActive || (state.timeLeft > 0 && state.sessionDuration > 0 && !state.isCompleted);
      if (isVaultActive) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Run once on mount

  // Check for completion in a dedicated effect to avoid stale closures in setInterval
  useEffect(() => {
    if (timeLeft <= 0 && isActive && !isCompleted) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleComplete();
    }
  }, [timeLeft, isActive, isCompleted]);

  // Timer tick logic
  useEffect(() => {
    if (isActive) {
      lastTickTime.current = Date.now();
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const deltaMs = now - lastTickTime.current;
        const deltaSecs = Math.floor(deltaMs / 1000);
        
        if (deltaSecs > 0) {
          lastTickTime.current += deltaSecs * 1000;
          setTimeLeft(prev => {
            const nextTime = Math.max(0, prev - deltaSecs);
            return nextTime;
          });
          setSessionDuration(prev => prev + Math.min(deltaSecs, Math.max(0, activeStateRef.current.timeLeft)));
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const handleStartPause = () => {
    if (!isActive) {
      const finalMins = typeof inputMinutes === 'number' ? Math.max(1, inputMinutes) : 1;
      setInputMinutes(finalMins);
      if (timeLeft <= 0) setTimeLeft(finalMins * 60);
    }
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    const finalMins = typeof inputMinutes === 'number' ? Math.max(1, inputMinutes) : DEFAULT_MINUTES;
    setInputMinutes(finalMins);
    setTimeLeft(finalMins * 60);
    setSessionDuration(0);
    setIsCompleted(false);
    storageAdapter.removeSession(SESSION_STORAGE_KEY);
  };

  const handleComplete = () => {
    setIsActive(false);
    setIsCompleted(true);
    storageAdapter.removeSession(SESSION_STORAGE_KEY);
    
    // Log the session via the actions dispatcher
    const minutesFocused = Math.max(1, Math.floor(sessionDuration / 60));
    actions.completeStudySession({
      duration: minutesFocused,
      focusTime: minutesFocused,
      questions: 0,
      correct: 0,
      type: 'Practice',
      subjectId: selectedSubject,
      chapterId: selectedChapterId || undefined,
      idleTime: 0,
      focusInterruptions: 0,
      focusScore: 100
    });

    // If linked to a chapter, advance study progress
    if (selectedChapterId) {
      actions.updateChapterProgress(selectedChapterId, {
        currentLecture: 1
      });
    }

    // If linked to a daily mission, mark it completed
    if (selectedMissionId) {
      actions.completeTask(selectedMissionId);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate breathing scale for ambient orb (only active when timer is running)
  const breathingScale = isActive ? [1, 1.15, 1] : 1;
  const breathingOpacity = isActive ? [0.4, 0.8, 0.4] : 0.5;

  return (
    <div className="relative w-full h-full min-h-[calc(100dvh-4rem)] lg:min-h-[100dvh] overflow-hidden flex flex-col items-center justify-center bg-[#050505] font-sans">
      
      {/* Ambient Animated Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden vault-ambient-bg">
        {/* Breathing Orb */}
        <motion.div 
          animate={{ scale: breathingScale, opacity: breathingOpacity }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[600px] aspect-square bg-indigo-900/20 rounded-full blur-[120px]"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <div className="z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center justify-center space-y-12 h-full">
        
        {/* Header */}
        <div className="text-center space-y-2 opacity-80">
          <div className="flex items-center justify-center gap-2 text-indigo-400 mb-4">
            <Headphones className="w-5 h-5 animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-[0.3em] uppercase">Focus Vault</span>
          </div>
          <h1 className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
            A minimalist deep-work zone. Select target subject and focus duration.
          </h1>

          {/* Subject Selector */}
          {!isActive && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {(['physics', 'chemistry', 'maths'] as SubjectId[]).map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSelectedSubject(subj)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                    selectedSubject === subj
                      ? subj === 'physics'
                        ? 'bg-sky-950/80 border border-sky-500/50 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                        : subj === 'chemistry'
                        ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : 'bg-purple-950/80 border border-purple-500/50 text-purple-300 shadow-[0_0_12px_rgba(192,132,252,0.3)]'
                      : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          )}

          {/* Chapter & Mission Linking */}
          {!isActive && sessionDuration === 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3 max-w-lg mx-auto">
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="bg-zinc-900/80 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-1.5 font-mono outline-none focus:border-indigo-500 max-w-[220px] truncate"
                aria-label="Select target chapter"
              >
                <option value="">General Focus (No Chapter)</option>
                {subjectChapters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {subjectMissions.length > 0 && (
                <select
                  value={selectedMissionId}
                  onChange={(e) => setSelectedMissionId(e.target.value)}
                  className="bg-zinc-900/80 border border-indigo-900/60 text-indigo-300 text-xs rounded-xl px-3 py-1.5 font-mono outline-none focus:border-indigo-400 max-w-[220px] truncate"
                  aria-label="Link to daily mission"
                >
                  <option value="">Link Mission (Optional)</option>
                  {subjectMissions.map(m => (
                    <option key={m.id} value={m.id}>{m.taskName || m.chapterName || m.chapter || 'Daily Mission'}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Central Timer Display */}
        <div className="relative flex flex-col items-center justify-center py-12 w-full">
          <AnimatePresence mode="wait">
            {!isCompleted ? (
              <motion.div
                key="timer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                className="flex flex-col items-center"
              >
                {!isActive && sessionDuration === 0 ? (
                  <div className="flex items-baseline text-[6rem] md:text-[9rem] font-black tracking-tighter tabular-nums leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    <input 
                      type="number" 
                      value={inputMinutes === 0 ? '' : inputMinutes} placeholder="0"
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setInputMinutes('');
                          setTimeLeft(0);
                          return;
                        }
                        const val = Math.min(300, parseInt(e.target.value, 10) || 0);
                        setInputMinutes(val);
                        setTimeLeft(val * 60);
                      }}
                      className="bg-transparent outline-none w-[3ch] text-center"
                      aria-label="Custom session duration in minutes"
                    />
                    <span className="text-zinc-400">:00</span>
                  </div>
                ) : (
                  <div className="text-[6rem] md:text-[9rem] font-black tracking-tighter tabular-nums leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(timeLeft)}
                  </div>
                )}
                
                {!isActive && sessionDuration === 0 && (
                  <div className="text-zinc-400 font-mono text-xs mt-4">Click the minutes to edit custom duration (max 300)</div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-black text-white mb-2">Deep Work Logged</h2>
                  <p className="text-zinc-400 font-mono">+{Math.floor(sessionDuration / 60)} minutes added to your Analytics.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {!isCompleted ? (
          <div className="flex items-center gap-6">
            <button
              onClick={handleReset}
              className="p-4 rounded-full bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800"
              title="Reset Timer"
              aria-label="Reset Timer"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleStartPause}
              aria-label={isActive ? "Pause Session" : "Start Session"}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                isActive 
                  ? 'bg-zinc-800/80 text-white border border-zinc-700 hover:bg-zinc-700' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 hover:shadow-indigo-500/25 border border-indigo-500/50'
              }`}
            >
              {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
            
            <button
              onClick={handleComplete}
              disabled={sessionDuration < 60}
              className="p-4 rounded-full bg-zinc-900/50 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors border border-zinc-800 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-zinc-900/50"
              title="End & Log Session Early (Requires 1 min)"
              aria-label="End & Log Session Early"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleReset}
            className="px-8 py-4 rounded-xl bg-zinc-900 text-white font-mono font-bold hover:bg-zinc-800 transition-colors border border-zinc-700"
          >
            Start New Session
          </button>
        )}

      </div>

      {/* Floating Lo-Fi Player (YouTube Embed) */}
      <div className="absolute bottom-24 sm:bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-8 w-[90vw] max-w-[350px] min-h-[80px] surface-elevated rounded-2xl overflow-hidden shadow-2xl flex items-center p-3 gap-4 group transition-all duration-300 hover:border-indigo-500/40">
        <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 bg-black">
          {/* Lofi Girl YouTube Stream - Invisible click overlay to prevent navigating out */}
          <div className="absolute inset-0 z-10"></div>
          {/* Using highly stable Synthwave VOD instead of live stream */}
          <iframe 
            key={LOFI_STATIONS[stationIndex].id}
            ref={youtubeRef}
            onLoad={() => {
              if (youtubeRef.current && youtubeRef.current.contentWindow) {
                youtubeRef.current.contentWindow.postMessage(`{"event":"command","func":"${isMuted ? 'mute' : 'unMute'}","args":""}`, '*');
              }
            }}
            src={`https://www.youtube.com/embed/${LOFI_STATIONS[stationIndex].id}?autoplay=1&enablejsapi=1&controls=0&disablekb=1&fs=0&loop=1&playlist=${LOFI_STATIONS[stationIndex].id}&modestbranding=1&playsinline=1&iv_load_policy=3`} 
            title="Lofi Stream" 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] pointer-events-none opacity-80"
            allow="autoplay; encrypted-media"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white truncate">{LOFI_STATIONS[stationIndex].title}</h4>
          <p className="text-[10px] text-zinc-400 truncate font-mono">{LOFI_STATIONS[stationIndex].subtitle}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setStationIndex(prev => (prev + 1) % LOFI_STATIONS.length)}
            className="p-2 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Next Station"
            aria-label="Next Station"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              if (youtubeRef.current && youtubeRef.current.contentWindow) {
                youtubeRef.current.contentWindow.postMessage(`{"event":"command","func":"${newMuted ? 'mute' : 'unMute'}","args":""}`, '*');
              }
            }}
            className="p-2 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            aria-label={isMuted ? "Unmute Lofi Audio" : "Mute Lofi Audio"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

    </div>
  );
}
