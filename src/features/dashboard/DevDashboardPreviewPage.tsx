export function DevDashboardPreviewPage() { return null; }
/*
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Check, 
  Clock, 
  Target, 
  Flame, 
  Sparkles, 
  Brain, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  Coffee, 
  Layers, 
  ArrowRight, 
  Plus,
  SlidersHorizontal,
  Moon,
  Compass,
  X,
  MoreHorizontal,
  FastForward,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useAuth } from '@/features/auth';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';
import { CustomMissionModal } from '@/features/mission/components/CustomMissionModal';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { RoutineBreakModal } from './components/RoutineBreakModal';
import { BreakActiveModal } from './components/BreakActiveModal';
import { Modal } from '@/components/ui/Modal';
import { toLocalDateString } from '@/utils/dateUtils';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { calculateRealisticDailyChapterVelocity } from '@/utils/chapterVelocity';

export function DevDashboardPreviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const actions = useStudyBrainStore(s => s.actions);
  const todayMissions = useStudyBrainStore(s => s.todayMissions);
  const chapters = useStudyBrainStore(s => s.chapters);
  const chapterTelemetryMap = useStudyBrainStore(s => s.chapterTelemetryMap);
  const mentorProfile = useStudyBrainStore(s => s.mentorProfile);
  const energyLevel = useStudyBrainStore(s => s.energyLevel);
  const revisionQueue = useStudyBrainStore(s => s.revisionQueue);
  const projectedReadiness = useStudyBrainStore(s => s.projectedReadiness);
  const studySessions = useStudyBrainStore(s => s.studySessions);
  const syllabusProgress = useStudyBrainStore(s => s.syllabusProgress);
  const xp = useStudyBrainStore(s => s.xp);
  const settings = useStudyBrainStore(s => s.settings);

  // UI States
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'physics' | 'chemistry' | 'maths'>('all');
  const [isDeepSystemsOpen, setIsDeepSystemsOpen] = useState(false);
  const [selectedExamTab, setSelectedExamTab] = useState<'main' | 'adv'>('main');
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);
  const [isCustomMissionModalOpen, setIsCustomMissionModalOpen] = useState(false);
  const [isRoutineBreakModalOpen, setIsRoutineBreakModalOpen] = useState(false);
  const [activeBreakMissionId, setActiveBreakMissionId] = useState<string | null>(null);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [vitalsChapterId, setVitalsChapterId] = useState<string | null>(null);
  const [isHeroActionMenuOpen, setIsHeroActionMenuOpen] = useState(false);
  const heroActionMenuRef = useRef<HTMLDivElement>(null);

  // Close hero action menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (heroActionMenuRef.current && !heroActionMenuRef.current.contains(event.target as Node)) {
        setIsHeroActionMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // User Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  };
  const userName = user?.displayName?.split(' ')[0] || (mentorProfile as any)?.name || (mentorProfile as any)?.userName || 'Aspirant';

  // Mission Calculations
  const incompleteTasks = todayMissions.filter(m => !m.completed && !m.dismissed);
  const completedMissions = todayMissions.filter(m => m.completed && !m.dismissed);
  const totalMissions = todayMissions.filter(m => !m.dismissed);
  const progressPercent = totalMissions.length > 0 ? Math.round((completedMissions.length / totalMissions.length) * 100) : 0;
  
  const totalPlannedMinutes = todayMissions.reduce((sum, m) => sum + (m.duration || 60), 0);
  const completedMinutes = completedMissions.reduce((sum, m) => sum + (m.duration || 60), 0);
  const remainingMinutes = Math.max(0, totalPlannedMinutes - completedMinutes);
  const remainingHoursStr = (remainingMinutes / 60).toFixed(1);

  // Active in-flight session check
  const activeSession = useMemo(() => {
    return (studySessions || []).find(s => s.status === 'in-progress' || (s as any).isActive === true);
  }, [studySessions]);

  // Level 1: Hero Active Mission (The 1 thing to do NOW)
  const heroMission = incompleteTasks[0] || todayMissions[0] || null;
  const isHeroRunning = !!activeSession && heroMission?.id === activeSession.missionId;
  const isHeroPaused = !!activeSession && activeSession.status === 'paused' && heroMission?.id === activeSession.missionId;
  const isHeroStarted = !isHeroRunning && !isHeroPaused && heroMission && ((heroMission as any).progressMinutes > 0 || (heroMission as any).isStarted);
  const isAllMissionsDone = incompleteTasks.length === 0 && totalMissions.length > 0;

  // Chapter info for hero mission
  const heroChap = heroMission ? chapters.find(c => 
    c.name.toLowerCase() === (heroMission.chapter || heroMission.chapterName || '').toLowerCase() || 
    (heroMission.chapterId && c.id === heroMission.chapterId)
  ) : null;

  const heroTelemetry = heroChap && chapterTelemetryMap ? chapterTelemetryMap[heroChap.id] : null;
  const heroStrategy = {
    weightageGain: heroTelemetry?.strategyRadar?.weightageGain || heroTelemetry?.strategyRadar?.examWeightagePercent || (heroMission?.subject === 'chemistry' ? 18 : heroMission?.subject === 'physics' ? 16 : 14),
    pitfall: heroTelemetry?.strategyRadar?.pitfalls || 'Verify calculation steps carefully to avoid silly sign and unit mistakes.',
    focusPoint: heroTelemetry?.strategyRadar?.formulas?.[0] || 'Core concept derivations & standard problem patterns.'
  };

  // Filtered Queue
  const filteredMissions = useMemo(() => {
    return todayMissions.filter(m => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'pending') return !m.completed && !m.dismissed;
      return m.subject === activeFilter;
    });
  }, [todayMissions, activeFilter]);

  // Exam Trajectory & Velocity Calculations
  const targetYear = settings?.targetYear || '2026';
  const examDate = useMemo(() => {
    const yr = parseInt(targetYear, 10) || new Date().getFullYear();
    return selectedExamTab === 'main'
      ? new Date(yr, 0, 24, 9, 0, 0)
      : new Date(yr, 4, 25, 9, 0, 0);
  }, [targetYear, selectedExamTab]);

  const daysRemaining = useMemo(() => {
    const diff = examDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [examDate]);

  const totalChapters = syllabusProgress.physics.totalCount + syllabusProgress.chemistry.totalCount + syllabusProgress.maths.totalCount;
  const masteredChapters = syllabusProgress.physics.masteredCount + syllabusProgress.chemistry.masteredCount + syllabusProgress.maths.masteredCount;
  const remainingChapters = Math.max(0, totalChapters - masteredChapters);

  const earliestSessionMs = (studySessions || []).reduce<number | null>((earliest, s) => {
    const t = new Date(s.startTime).getTime();
    if (isNaN(t)) return earliest;
    return earliest === null ? t : Math.min(earliest, t);
  }, null);
  const actualStudyMinutes = (studySessions || []).reduce((sum, s) => sum + (typeof s.duration === 'number' && (s.type as any) !== 'Break' ? s.duration : 0), 0);
  const hasRealStudyHistory = (studySessions || []).some(s => {
    const t = new Date(s.startTime).getTime();
    return !isNaN(t) && (s.duration ?? 0) > 0;
  });
  const studyDaysElapsed = earliestSessionMs ? Math.max(1, Math.ceil((Date.now() - earliestSessionMs) / 86400000)) : 1;

  const currentVelocity = calculateRealisticDailyChapterVelocity({
    masteredChapters,
    studyDaysElapsed,
    cap: 1.5,
    hasRealStudyHistory,
    actualStudyMinutes,
    minimumStudyMinutes: 30,
  });
  const requiredVelocity = daysRemaining > 0 ? remainingChapters / daysRemaining : 0;
  const isCalibrating = !hasRealStudyHistory || actualStudyMinutes < 60 || studyDaysElapsed < 3;
  const isAheadOfTarget = !isCalibrating && currentVelocity >= requiredVelocity * 1.15;
  const isOnTrack = !isCalibrating && currentVelocity >= requiredVelocity * 0.9 && !isAheadOfTarget;
  const isBelowTarget = !isCalibrating && currentVelocity < requiredVelocity * 0.9 && daysRemaining > 0;

  // Next due revision item
  const nextRevision = revisionQueue[0] || null;

  const getSubjectIndicator = (subj: string) => {
    switch (subj) {
      case 'physics':
        return { name: 'Physics', color: 'text-sky-400', dot: 'bg-sky-400', badge: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
      case 'chemistry':
        return { name: 'Chemistry', color: 'text-emerald-400', dot: 'bg-emerald-400', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'maths':
        return { name: 'Maths', color: 'text-indigo-400', dot: 'bg-indigo-400', badge: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      default:
        return { name: 'Core', color: 'text-zinc-400', dot: 'bg-zinc-400', badge: 'text-zinc-300 bg-zinc-800 border-zinc-700' };
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 px-4 sm:px-6 font-sans text-zinc-300 relative pb-28 text-left select-none animate-fade-in">
      
      {/* ── TOP STATUS HUD (Quiet, Non-competing) ────────────────── */}
      <header className="flex items-center justify-between gap-3 text-xs font-mono border-b border-zinc-850 pb-3 flex-wrap">
        
        {/* Left: Date & Countdown Context */}
        <div className="flex items-center gap-2.5 text-zinc-400">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-200 font-semibold">{toLocalDateString(new Date())}</span>
          <span className="text-zinc-600">•</span>
          <span>{daysRemaining} days to JEE {targetYear}</span>
        </div>

        {/* Right: Energy Pill + Routine Break */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-0.5 rounded-xl">
            {(['Low', 'Medium', 'High'] as const).map((level) => {
              const isActive = energyLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => actions.setEnergyLevel(level)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    isActive ? 'text-white bg-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {level.toUpperCase()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsRoutineBreakModalOpen(true)}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>Break</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-2.5 py-1 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
          >
            Live Dashboard →
          </button>
        </div>
      </header>

      {/* ── GREETING & DAY SUMMARY (Clean, Concise, High Clarity) ── */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>{getGreeting()},</span>
          <span className="text-zinc-100 font-extrabold">{userName}.</span>
        </h1>
        <p className="text-xs text-zinc-400 font-sans">
          You have <strong className="text-white font-semibold">{incompleteTasks.length} missions remaining</strong> · {remainingHoursStr} hrs planned today
        </p>
      </div>

      {/* ── LEVEL 1: HERO ACTIVE MISSION (The Spotlight · What to do NOW) ── */}
      {heroMission && !isAllMissionsDone ? (
        <section className="w-full">
          <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/35 bg-gradient-to-b from-zinc-900/90 via-zinc-950/95 to-zinc-950 shadow-[0_0_30px_rgba(16,185,129,0.08)] relative overflow-hidden">
            
            {/* Subtle Green Ambient Accent */}
            <div className="absolute top-0 right-0 w-80 h-36 bg-emerald-500/5 blur-3xl pointer-events-none" />

            <div className="flex flex-col gap-3.5 relative z-10">
              
              {/* Internal Grid Row 1: State Semantics (Left) | Subject & Duration (Right) */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {isHeroRunning 
                      ? 'ACTIVE NOW' 
                      : isHeroPaused 
                      ? 'PAUSED' 
                      : isHeroStarted 
                      ? 'ACTIVE MISSION' 
                      : 'NEXT MISSION'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded-lg border font-bold uppercase ${getSubjectIndicator(heroMission.subject).badge}`}>
                    {getSubjectIndicator(heroMission.subject).name}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-300 font-semibold">{heroMission.duration} MIN</span>
                </div>
              </div>

              {/* Internal Grid Row 2: Mission Title & Chapter Vitals */}
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-white tracking-tight leading-snug">
                  {heroMission.taskName}
                </h2>
                
                {heroChap ? (
                  <p className="text-xs text-zinc-400 font-sans">
                    {heroChap.name} · Lecture {heroChap.currentLecture}/{heroChap.totalLectures} · {heroChap.confidence}% Confidence
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 font-sans">
                    {heroMission.type} · Target preparation module
                  </p>
                )}
              </div>

              {/* Internal Grid Row 3: Focus Snippet */}
              <div className="px-3.5 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-zinc-300 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span><strong className="text-zinc-100">Focus:</strong> {heroStrategy.focusPoint}</span>
                </div>
                <div className="text-amber-400/90 text-[11px] font-mono flex items-center gap-1 shrink-0">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>{heroStrategy.pitfall}</span>
                </div>
              </div>

              {/* Internal Grid Row 4: Action Controls & Target PYQs */}
              <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                
                {/* Primary CTA + Secondary Action Menu */}
                <div className="flex items-center gap-2 relative" ref={heroActionMenuRef}>
                  <button
                    type="button"
                    onClick={() => navigate(`/cockpit/${heroMission.id}`)}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>
                      {isHeroRunning 
                        ? 'OPEN COCKPIT' 
                        : isHeroPaused 
                        ? 'CONTINUE MISSION' 
                        : isHeroStarted 
                        ? 'RESUME MISSION' 
                        : 'START MISSION'}
                    </span>
                  </button>

                  {/* Secondary Action Dropdown Trigger [ ⋯ ] */}
                  <button
                    type="button"
                    onClick={() => setIsHeroActionMenuOpen(!isHeroActionMenuOpen)}
                    className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title="More actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Secondary Contextual Menu */}
                  <AnimatePresence>
                    {isHeroActionMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 top-full mt-2 w-48 rounded-xl bg-zinc-900 border border-zinc-750 shadow-2xl z-30 py-1 font-mono text-xs overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            actions.completeTask(heroMission.id);
                            audioEngine.playSuccess();
                            setIsHeroActionMenuOpen(false);
                          }}
                          className="w-full px-3.5 py-2 text-left text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Mark Complete</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            actions.dismissTask(heroMission.id);
                            setIsHeroActionMenuOpen(false);
                          }}
                          className="w-full px-3.5 py-2 text-left text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <FastForward className="w-3.5 h-3.5 text-amber-400" />
                          <span>Skip Mission</span>
                        </button>

                        {heroChap && (
                          <button
                            type="button"
                            onClick={() => {
                              setVitalsChapterId(heroChap.id);
                              setIsVitalsModalOpen(true);
                              setIsHeroActionMenuOpen(false);
                            }}
                            className="w-full px-3.5 py-2 text-left text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 cursor-pointer transition-colors border-t border-zinc-800"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Chapter Vitals</span>
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="text-xs font-mono text-zinc-500">
                  Target: <strong className="text-zinc-300 font-normal">{heroMission.targetPYQs || 15} PYQs</strong> · <span className="text-amber-400/90 font-medium">+{heroStrategy.weightageGain}M</span>
                </div>
              </div>

            </div>
          </div>
        </section>
      ) : isAllMissionsDone ? (
        <section className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
          <h2 className="text-base font-bold text-white">✓ ALL MISSIONS COMPLETED TODAY</h2>
          <p className="text-xs text-zinc-400 font-sans">
            You have executed today's full syllabus targets. Review formula cards or log a custom session.
          </p>
        </section>
      ) : null}

      {/* ── LEVEL 2 & 3: TODAY'S EXECUTION QUEUE (Time → Mission → Duration → Action) ── */}
      <section className="space-y-3">
        
        {/* Section Heading & Filter Chips */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-zinc-850 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
              TODAY'S QUEUE
            </span>
            <span className="text-xs font-mono text-zinc-500">
              ({completedMissions.length}/{totalMissions.length} done)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'physics', label: 'Physics' },
              { id: 'chemistry', label: 'Chemistry' },
              { id: 'maths', label: 'Maths' }
            ].map(f => {
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`px-2.5 py-0.5 rounded-lg font-mono text-[11px] transition-colors cursor-pointer ${
                    isActive 
                      ? 'bg-zinc-800 text-white font-bold' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsCustomMissionModalOpen(true)}
              className="ml-2 px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3 text-indigo-400" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* The Clean Queue Rows */}
        <div className="space-y-2">
          {filteredMissions.map((mission, idx) => {
            const isLive = heroMission?.id === mission.id && !mission.completed;
            const indicator = getSubjectIndicator(mission.subject);

            return (
              <div
                key={mission.id}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                  isLive 
                    ? 'border-emerald-500/35 bg-zinc-900/80 shadow-[0_0_20px_rgba(16,185,129,0.06)]' 
                    : mission.completed 
                    ? 'border-zinc-900 bg-zinc-950/30 opacity-50' 
                    : 'border-zinc-850/80 bg-zinc-950/50 hover:bg-zinc-900/40 hover:border-zinc-800'
                }`}
              >
                {/* Left: Time + Subject Dot + Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-mono text-[11px] text-zinc-500 shrink-0 w-24 hidden sm:inline">
                    {mission.timeSlot || `Slot ${idx + 1}`}
                  </span>

                  <span className={`w-2 h-2 rounded-full ${indicator.dot} shrink-0`} />

                  <div className="min-w-0 flex-1">
                    <p className={`font-medium truncate ${
                      isLive 
                        ? 'text-white font-semibold' 
                        : mission.completed 
                        ? 'text-zinc-500 line-through' 
                        : 'text-zinc-200'
                    }`}>
                      {mission.taskName}
                    </p>
                  </div>
                </div>

                {/* Right: Duration + Status/Action */}
                <div className="flex items-center gap-3 shrink-0 font-mono">
                  <span className="text-zinc-500 text-[11px]">{mission.duration} min</span>

                  {mission.completed ? (
                    <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/cockpit/${mission.id}`)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isLive 
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold shadow-sm' 
                          : 'bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {isLive ? 'RESUME' : 'START'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setMissionToDelete(mission.id)}
                    className="p-1 text-zinc-600 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── LEVEL 4: TRAJECTORY & ACTIONABLE REVISION (2 Concise Cards) ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-1">
        
        {/* Concise Smart Revision Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/60 border border-zinc-850/90 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                SMART REVISION
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {revisionQueue.length} due today
              </span>
            </div>

            {revisionQueue.length > 0 ? (
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-zinc-500 block">{revisionQueue.length} reviews due today.</span>
                <p className="text-sm font-bold text-white truncate">Priority: {nextRevision?.chapterName}</p>
                <span className="text-[11px] font-mono text-amber-300/90">{nextRevision?.retentionStatus} · Spaced Recall Cycle</span>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-zinc-500 block">Nothing due today.</span>
                <p className="text-sm font-bold text-white truncate">Next: {chapters[0]?.name || 'Thermodynamics'}</p>
                <span className="text-[11px] font-mono text-emerald-400/90">Memory vault secure · Tomorrow 08:00 AM</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/revision')}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>VIEW REVISION QUEUE</span>
            <ArrowRight className="w-3 h-3 text-indigo-400" />
          </button>
        </div>

        {/* Concise Exam Trajectory Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/60 border border-zinc-850/90 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                EXAM TRAJECTORY
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                JEE {targetYear}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-display font-black text-white leading-none">
                  {daysRemaining}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase ml-1.5 font-bold">DAYS LEFT</span>
              </div>

              <div className="text-right font-mono text-xs space-y-0.5">
                <div className="text-zinc-400">Current pace: <strong className="text-white">{currentVelocity.toFixed(2)}</strong> ch/day</div>
                <div className="text-zinc-500 text-[11px]">Required pace: {requiredVelocity.toFixed(2)} ch/day</div>
              </div>
            </div>

            <div>
              {isCalibrating ? (
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg inline-block">
                    ● CALIBRATING
                  </span>
                  <p className="text-[11px] text-zinc-400 font-sans mt-1">Building your baseline from recent study sessions.</p>
                </div>
              ) : isAheadOfTarget ? (
                <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg inline-block">
                  ● AHEAD OF TARGET
                </span>
              ) : isOnTrack ? (
                <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg inline-block">
                  ● ON TRACK
                </span>
              ) : (
                <span className="text-[10px] font-mono text-rose-300 font-bold bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded-lg inline-block">
                  ● BELOW TARGET
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/planner')}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>ADJUST PLANNER SCHEDULE</span>
            <ArrowRight className="w-3 h-3 text-indigo-400" />
          </button>
        </div>

      </section>

      {/* ── LEVEL 5: DEEPER SYSTEMS (Collapsed Clean Accordion) ──── */}
      <section className="pt-1">
        <button
          type="button"
          onClick={() => setIsDeepSystemsOpen(!isDeepSystemsOpen)}
          className="w-full p-3.5 rounded-xl bg-zinc-950/40 hover:bg-zinc-900/50 border border-zinc-850 text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-between text-xs font-mono cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold uppercase tracking-wider">
              Secondary Systems · Academic Strategy · Analytics · Heatmap
            </span>
          </div>
          <div className="flex items-center gap-1 text-indigo-400 font-semibold">
            <span>{isDeepSystemsOpen ? 'Collapse Systems' : 'Expand Systems'}</span>
            {isDeepSystemsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        <AnimatePresence>
          {isDeepSystemsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-3 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                
                {/* 1. Tri-Subject Mastery */}
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2.5 font-mono text-xs">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase block">Subject Mastery</span>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-300">
                      <span>Physics</span>
                      <span className="text-sky-400">{syllabusProgress.physics.percentage}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${syllabusProgress.physics.percentage}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-300">
                      <span>Chemistry</span>
                      <span className="text-emerald-400">{syllabusProgress.chemistry.percentage}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${syllabusProgress.chemistry.percentage}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-300">
                      <span>Maths</span>
                      <span className="text-indigo-400">{syllabusProgress.maths.percentage}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${syllabusProgress.maths.percentage}%` }} />
                    </div>
                  </div>
                </div>

                {/* 2. 14-Day Focus Flow */}
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2 font-mono text-xs">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase block">14-Day Focus Heatmap</span>
                  <div className="grid grid-cols-7 gap-1.5 pt-1">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-6 rounded border text-[9px] flex items-center justify-center ${
                          i % 3 === 0 ? 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-500 block pt-1">Logged: {Math.round(actualStudyMinutes / 60)} hrs total</span>
                </div>

                {/* 3. Boss Objective Campaign */}
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2 font-mono text-xs">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase block">Monthly Objective</span>
                  <p className="text-xs text-white font-bold truncate">{mentorProfile?.monthlyObjective?.category || 'Complete Mechanics & GOC'}</p>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">{mentorProfile?.monthlyObjective?.description || 'Earn 3000 XP this month to secure subject mastery.'}</p>
                  <button onClick={() => navigate('/analytics')} className="text-[11px] text-indigo-400 hover:underline pt-1 block font-bold">Open Full Analytics →</button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── MODALS (Cleanly decoupled) ─────────────────────────── */}
      <ConfirmDeleteModal
        isOpen={!!missionToDelete}
        onConfirm={() => {
          if (missionToDelete) {
            actions.deleteMission(missionToDelete);
            setMissionToDelete(null);
          }
        }}
        onClose={() => setMissionToDelete(null)}
      />

      <CustomMissionModal
        isOpen={isCustomMissionModalOpen}
        onClose={() => setIsCustomMissionModalOpen(false)}
      />

      <RoutineBreakModal
        isOpen={isRoutineBreakModalOpen}
        onClose={() => setIsRoutineBreakModalOpen(false)}
      />

      <BreakActiveModal
        isOpen={!!activeBreakMissionId}
        onClose={() => setActiveBreakMissionId(null)}
        breakMission={todayMissions.find(m => m.id === activeBreakMissionId) || null}
      />

      {/* Chapter Vitals Modal */}
      <Modal
        isOpen={isVitalsModalOpen}
        onClose={() => setIsVitalsModalOpen(false)}
        zIndex={100}
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-left"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <h3 className="text-base font-bold text-white font-display">Chapter Vitals & Telemetry</h3>
          <button onClick={() => setIsVitalsModalOpen(false)} className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {heroChap ? (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between">
              <span className="text-zinc-400">Chapter</span>
              <span className="text-white font-bold">{heroChap.name}</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between">
              <span className="text-zinc-400">Completion</span>
              <span className="text-white font-bold">{heroChap.completion}%</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between">
              <span className="text-zinc-400">Confidence</span>
              <span className="text-emerald-400 font-bold">{heroChap.confidence}%</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between">
              <span className="text-zinc-400">Difficulty</span>
              <span className="text-amber-400 font-bold">{heroChap.difficulty}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => setIsVitalsModalOpen(false)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-mono"
          >
            Close
          </button>
        </div>
      </Modal>

    </div>
  );
}
*/
