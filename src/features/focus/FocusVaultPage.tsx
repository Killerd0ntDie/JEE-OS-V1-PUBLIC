import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Square, Headphones, RefreshCw, Volume2, VolumeX, CheckCircle2 } from 'lucide-react';
import { useStudyBrain } from '@/context/StudyBrainContext';
import { useAuth } from '@/features/auth';

const DEFAULT_MINUTES = 50;

export function FocusVaultPage() {
  const { actions } = useStudyBrain();
  const { user } = useAuth();
  
  const [inputMinutes, setInputMinutes] = useState(DEFAULT_MINUTES);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0); // tracks total time spent this session

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const youtubeRef = useRef<HTMLIFrameElement>(null);

  // Sync active state to session storage to block navigation in App.tsx
  // And use native beforeunload to prevent accidental tab closing/refresh
  useEffect(() => {
    const isVaultActive = isActive || (timeLeft > 0 && sessionDuration > 0 && !isCompleted);
    
    if (isVaultActive) {
      sessionStorage.setItem('vault-active', 'true');
    } else {
      sessionStorage.removeItem('vault-active');
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isVaultActive) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive, timeLeft, sessionDuration, isCompleted]);


  // Timer tick logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(inputMinutes * 60);
    setSessionDuration(0);
    setIsCompleted(false);
  };

  const handleComplete = () => {
    setIsActive(false);
    setIsCompleted(true);
    
    // Log the session via the actions dispatcher
    const minutesFocused = Math.max(1, Math.floor(sessionDuration / 60));
    actions.completeStudySession({
      duration: minutesFocused,
      focusTime: minutesFocused,
      questions: 0,
      correct: 0,
      type: 'Practice', // or treat as generic focus
      subjectId: 'physics', // fallback since focus vault is subject-agnostic
      idleTime: 0,
      focusInterruptions: 0,
      focusScore: 100
    });
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
    <div className="relative w-full h-full min-h-[calc(100vh-4rem)] lg:min-h-screen overflow-hidden flex flex-col items-center justify-center bg-[#050505] font-sans">
      
      {/* Ambient Animated Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden vault-ambient-bg">
        {/* Breathing Orb */}
        <motion.div 
          animate={{ scale: breathingScale, opacity: breathingOpacity }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px]"
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
          <h1 className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
            A minimalist deep-work zone. Keep this tab active to keep the music playing.
          </h1>
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
                      value={inputMinutes}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(300, parseInt(e.target.value) || 0));
                        setInputMinutes(val);
                        setTimeLeft(val * 60);
                      }}
                      className="bg-transparent outline-none w-[1.5em] text-center"
                    />
                    <span className="text-zinc-500">:00</span>
                  </div>
                ) : (
                  <div className="text-[6rem] md:text-[9rem] font-black tracking-tighter tabular-nums leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(timeLeft)}
                  </div>
                )}
                
                {!isActive && sessionDuration === 0 && (
                  <div className="text-zinc-500 font-mono text-xs mt-4">Click the minutes to edit custom duration (max 300)</div>
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
              className="p-4 rounded-full bg-zinc-900/50 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800"
              title="Reset Timer"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            <button
              onClick={toggleTimer}
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
              className="p-4 rounded-full bg-zinc-900/50 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors border border-zinc-800 disabled:opacity-30 disabled:hover:text-zinc-500 disabled:hover:bg-zinc-900/50"
              title="End & Log Session Early (Requires 1 min)"
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
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-8 w-[320px] h-[80px] bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl flex items-center p-3 gap-4 group transition-all duration-300 hover:border-indigo-500/30 hover:bg-zinc-900">
        <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 bg-black">
          {/* Lofi Girl YouTube Stream - Invisible click overlay to prevent navigating out */}
          <div className="absolute inset-0 z-10"></div>
          {/* Using highly stable Synthwave VOD instead of live stream */}
          <iframe 
            ref={youtubeRef}
            src={`https://www.youtube.com/embed/5qap5aO4i9A?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&disablekb=1&fs=0&loop=1&playlist=5qap5aO4i9A&modestbranding=1&playsinline=1&iv_load_policy=3`} 
            title="Lofi Stream" 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] pointer-events-none opacity-80"
            allow="autoplay; encrypted-media"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white truncate">Lofi Girl Radio</h4>
          <p className="text-[10px] text-zinc-500 truncate font-mono">beats to relax/study to</p>
        </div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2.5 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

    </div>
  );
}
