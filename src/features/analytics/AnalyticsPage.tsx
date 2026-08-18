import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { calculateLevelFromXP, getTitleAndColor } from '@/utils/levelingCalculations';
import { ChapterTelemetry } from '@jee-os/engines';
import { calculateCurrentStreak } from '@/utils/streakCalculations';
import { springs } from '@/constants/motion';
import { 
  Activity, Target, PieChart, TrendingUp, AlertTriangle, 
  Clock, Zap, Award, Flame, CheckCircle2, ChevronRight, ShieldAlert,
  Sparkles, RefreshCw, Calendar, Info, HelpCircle
} from 'lucide-react';
import { SyllabusCompletionProjector } from './components/SyllabusCompletionProjector';
import { SolvingVelocityTracker } from './components/SolvingVelocityTracker';
import { StudyActivityTelemetry } from './components/StudyActivityTelemetry';
import { NegativeMarksAudit } from './components/NegativeMarksAudit';
import { TimePerMarkMatrix } from './components/TimePerMarkMatrix';
import { PercentileShiftCalibrator } from './components/PercentileShiftCalibrator';
import { ForgettingCurveHeatmap } from '@/features/revision/components/ForgettingCurveHeatmap';

export function AnalyticsPage() {
  const actions = useStudyBrainStore(state => state.actions);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);
  const studySessions = useStudyBrainStore(state => state.studySessions) || [];
  const xp = useStudyBrainStore(state => state.xp);
  const analytics = useStudyBrainStore(state => state.analytics);
  const chapters = useStudyBrainStore(state => state.chapters);
  const settings = useStudyBrainStore(state => state.settings);

  const [activeSubject, setActiveSubject] = useState<'all' | 'physics' | 'chemistry' | 'maths'>('all');
  const [velocityView, setVelocityView] = useState<'time' | 'accuracy' | 'missions'>('time');
  const [activeVelocityBar, setActiveVelocityBar] = useState<number | null>(null);
  const [showCurveGuide, setShowCurveGuide] = useState(true);
  const [hoveredDecayChapter, setHoveredDecayChapter] = useState<{
    id: string;
    name: string;
    subject: string;
    confidence: number;
    daysAgo: number;
    x: number;
    y: number;
  } | null>(null);

  // Compute live analytics metrics from StudyBrainState
  const chapterTelemetryList = (Object.values(chapterTelemetryMap || {}) as ChapterTelemetry[]);

  // Filter chapters by active subject
  const filteredTelemetry = useMemo(() => {
    if (activeSubject === 'all') return chapterTelemetryList;
    return chapterTelemetryList.filter(t => t.subject === activeSubject);
  }, [chapterTelemetryList, activeSubject]);

  // Top 5 Highest Risk / Vulnerability Chapters
  const highestRiskChapters = useMemo(() => {
    return [...filteredTelemetry]
      .sort((a, b) => {
        const riskA = (a.isBottleneck ? 50 : 0) + (100 - a.masteryScore);
        const riskB = (b.isBottleneck ? 50 : 0) + (100 - b.masteryScore);
        return riskB - riskA; // Sort descending (highest risk first)
      })
      .slice(0, 5);
  }, [filteredTelemetry]);

  // Decaying Chapters List
  const decayingChapters = useMemo(() => {
    return chapters
      .filter(c => (c.lastRevisionDaysAgo ?? 0) > 7 || c.retentionStatus === 'Fading' || c.retentionStatus === 'Forgotten')
      .sort((a, b) => (b.lastRevisionDaysAgo ?? 0) - (a.lastRevisionDaysAgo ?? 0))
      .slice(0, 4);
  }, [chapters]);

  // Subject Mastery Percentages
  const subjectMastery = useMemo(() => {
    const calc = (sub: string) => {
      const list = chapterTelemetryList.filter(t => t.subject === sub);
      if (list.length === 0) return 0;
      return Math.round(list.reduce((acc, t) => acc + t.masteryScore, 0) / list.length);
    };

    return {
      physics: calc('physics'),
      chemistry: calc('chemistry'),
      maths: calc('maths')
    };
  }, [chapterTelemetryList]);

  // Level & XP Title
  const totalXP = xp?.total || 0;
  const { level, progressPercent } = calculateLevelFromXP(totalXP);
  const { title } = getTitleAndColor(level);

  // Overall Accuracy & Questions
  const totalQuestions = analytics.questionsSolved || 0;
  const studyHours = (analytics.studyTime / 60).toFixed(1);

  // True Accuracy Computation
  const trueAccuracy = useMemo(() => {
    const sessionsWithAccuracy = studySessions.filter(s => s.accuracy !== undefined);
    if (sessionsWithAccuracy.length === 0) return analytics.accuracy || 85;
    const sum = sessionsWithAccuracy.reduce((acc, s) => acc + (s.accuracy || 0), 0);
    return Math.round(sum / sessionsWithAccuracy.length);
  }, [studySessions, analytics.accuracy]);
  const accuracyPct = trueAccuracy;

  // Time Distribution by Subject
  const subjectTimeDistribution = useMemo(() => {
    let physics = 0, chemistry = 0, maths = 0;
    studySessions.forEach(s => {
      if (s.subjectId === 'physics') physics += s.duration;
      if (s.subjectId === 'chemistry') chemistry += s.duration;
      if (s.subjectId === 'maths') maths += s.duration;
    });
    const total = physics + chemistry + maths || 1;
    return {
      physics: { mins: physics, pct: Math.round((physics / total) * 100) },
      chemistry: { mins: chemistry, pct: Math.round((chemistry / total) * 100) },
      maths: { mins: maths, pct: Math.round((maths / total) * 100) },
      total
    };
  }, [studySessions]);

  // 7-Day Velocity Aggregation
  const sevenDayVelocity = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startOfToday = now.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const dayBuckets = Array.from({ length: 7 }, () => ({
      minutes: 0,
      missions: 0,
      accuracySum: 0,
      accuracyCount: 0
    }));

    studySessions.forEach(s => {
      const sTime = new Date(s.startTime).getTime();
      let daysAgo = -1;
      if (sTime >= startOfToday) {
        daysAgo = 0;
      } else {
        const diffMs = startOfToday - sTime;
        daysAgo = Math.floor(diffMs / dayMs) + 1;
      }

      if (daysAgo >= 0 && daysAgo < 7) {
        const bucket = dayBuckets[daysAgo];
        bucket.minutes += (s.duration || 0);
        bucket.missions += 1;
        if (s.accuracy !== undefined) {
          bucket.accuracySum += s.accuracy;
          bucket.accuracyCount += 1;
        }
      }
    });

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const bucket = dayBuckets[i];
      const accuracy = bucket.accuracyCount > 0 
        ? Math.round(bucket.accuracySum / bucket.accuracyCount)
        : 0;

      days.push({
        label: i === 0 ? 'Today' : `D-${i}`,
        minutes: bucket.minutes,
        accuracy,
        missions: bucket.missions
      });
    }

    return days;
  }, [studySessions]);

  const maxVelocity = useMemo(() => {
    return {
      time: Math.max(...sevenDayVelocity.map(d => d.minutes), 120),
      accuracy: 100,
      missions: Math.max(...sevenDayVelocity.map(d => d.missions), 5)
    };
  }, [sevenDayVelocity]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left relative pb-12 font-sans select-none">
      
      {/* 1. HEADER BANNER WITH LEVEL CARD */}
      <div className="bg-zinc-900/90 border border-white/15 p-5 md:p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Telemetry & Performance Intelligence</span>
          </div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
            Preparation Analytics & Velocity
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
            Real-time telemetry aggregated from <strong className="text-white">AnalyticsEngine</strong>. Track study velocity, accuracy trends, and high-risk chapter bottlenecks.
          </p>
        </div>

        {/* Level Badge Card */}
        <div className="bg-indigo-950/60 border border-indigo-500/40 p-3.5 rounded-2xl shrink-0 font-mono text-left space-y-1.5 shadow-lg shadow-indigo-600/10">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-indigo-200">Level {level} • {title}</span>
            <span className="text-zinc-300 text-[10px]">{Math.round(progressPercent)}% to Lv.{level + 1}</span>
          </div>
          <div className="h-1.5 w-44 bg-zinc-950 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* 2. 4 CORE STAT CARDS (LIGHTER FROSTED GLASS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900/70 border border-emerald-500/30 backdrop-blur-xl p-4 rounded-2xl space-y-1 shadow-xl">
          <span className="text-[10px] text-emerald-400 uppercase font-bold block tracking-wider">Overall Accuracy</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 font-display">{accuracyPct}%</span>
            <span className="text-[10px] text-zinc-400">({totalQuestions} solved)</span>
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-indigo-500/30 backdrop-blur-xl p-4 rounded-2xl space-y-1 shadow-xl">
          <span className="text-[10px] text-indigo-300 uppercase font-bold block tracking-wider">Cumulative Study Time</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-300 font-display">{studyHours}h</span>
            <span className="text-[10px] text-zinc-400">Logged</span>
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-amber-500/30 backdrop-blur-xl p-4 rounded-2xl space-y-1 shadow-xl">
          <span className="text-[10px] text-amber-300 uppercase font-bold block tracking-wider">Active Daily Streak</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 font-display">{calculateCurrentStreak(studySessions || [], Math.round((settings?.minStreakHours ?? 0.5) * 60))} Days</span>
            <span className="text-[10px] text-zinc-400">⚡ Streak</span>
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-white/15 backdrop-blur-xl p-4 rounded-2xl space-y-1 shadow-xl">
          <span className="text-[10px] text-zinc-300 uppercase font-bold block tracking-wider">Total Preparation XP</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-display">{totalXP}</span>
            <span className="text-[10px] text-indigo-400 font-bold">XP</span>
          </div>
        </div>
      </div>

      {/* 3. POMODORO & DEEP WORK SESSION VITALS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono">
        <div className="bg-zinc-900/70 border border-white/15 backdrop-blur-xl p-4 rounded-2xl space-y-2 shadow-xl">
          <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Deep Focus Ratio</span>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-indigo-300 font-display">
              {analytics.studyTime > 0 ? Math.round((analytics.focusTime / analytics.studyTime) * 100) : 0}%
            </span>
            <span className="text-[10px] text-zinc-400">{analytics.focusTime}m pure focus</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${analytics.studyTime > 0 ? (analytics.focusTime / analytics.studyTime) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-white/15 backdrop-blur-xl p-4 rounded-2xl space-y-2 shadow-xl">
          <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Interruptions & Idle</span>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-amber-400 font-display">
              {analytics.idleTime}m
            </span>
            <span className="text-[10px] text-zinc-400">Wasted time</span>
          </div>
        </div>

        <div className="bg-zinc-900/70 border border-white/15 backdrop-blur-xl p-4 rounded-2xl space-y-2 shadow-xl">
          <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Recovery & Break Time</span>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-emerald-400 font-display">
              {analytics.breakTime}m
            </span>
            <span className="text-[10px] text-zinc-400">Total breaks taken</span>
          </div>
        </div>
      </div>

      {/* 4. 3-COLUMN CHARTS: RADAR, TIME DONUT, 7-DAY VELOCITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* A. Subject Mastery Distribution (Radar Chart) */}
        <div className="bg-zinc-900/70 border border-white/15 rounded-3xl p-5 space-y-3.5 text-left flex flex-col shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                Subject Accuracy Radar
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">3-Axis Matrix</span>
          </div>

          <div className="flex-1 flex items-center justify-center relative min-h-[220px]">
            <svg role="img" aria-label={`Radar chart showing subject mastery: Physics ${subjectMastery.physics}%, Chemistry ${subjectMastery.chemistry}%, Maths ${subjectMastery.maths}%`} viewBox="-125 -125 250 250" className="w-full h-full max-w-[220px] overflow-visible">
              <defs>
                <radialGradient id="radarRadial" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
                </radialGradient>
                <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Concentric Web Rings */}
              {[25, 50, 75, 100].map(r => (
                <polygon
                  key={r}
                  points={`0,${-r} ${r * 0.866},${r * 0.5} ${-r * 0.866},${r * 0.5}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
              ))}

              {/* Axis Spoke Lines */}
              <line x1="0" y1="0" x2="0" y2="-100" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="0" x2="86.6" y2="50" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="0" x2="-86.6" y2="50" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
              
              {/* Vertex Labels */}
              <text x="0" y="-112" fill="#38bdf8" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">PHY ({subjectMastery.physics}%)</text>
              <text x="105" y="68" fill="#34d399" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">CHEM ({subjectMastery.chemistry}%)</text>
              <text x="-105" y="68" fill="#818cf8" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">MATH ({subjectMastery.maths}%)</text>

              {/* Dynamic Radar Polygon */}
              {(() => {
                const p = subjectMastery.physics || 0;
                const c = subjectMastery.chemistry || 0;
                const m = subjectMastery.maths || 0;
                const p1 = `0,${-p}`;
                const p2 = `${c * 0.866},${c * 0.5}`;
                const p3 = `${-m * 0.866},${m * 0.5}`;

                return p === 0 && c === 0 && m === 0 ? (
                  <text x="0" y="0" fill="#a1a1aa" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">NO DATA YET</text>
                ) : (
                  <>
                    <polygon
                      points={`${p1} ${p2} ${p3}`}
                      fill="url(#radarRadial)"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      filter="url(#glowFilter)"
                    />
                    {/* Vertex Markers */}
                    <circle cx={0} cy={-p} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={c * 0.866} cy={c * 0.5} r="4" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx={-m * 0.866} cy={m * 0.5} r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="1.5" />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* B. Subject Time Distribution Donut Chart */}
        <div className="bg-zinc-900/70 border border-white/15 rounded-3xl p-5 space-y-3.5 text-left flex flex-col shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                Time Allocation
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">Total: {studyHours}h</span>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center gap-5">
            <div 
              className="w-36 h-36 rounded-full border-4 border-black/40 shadow-[0_0_30px_rgba(0,0,0,0.6)] flex items-center justify-center relative transition-transform hover:scale-105"
              style={{
                background: `conic-gradient(
                  #38bdf8 0% ${subjectTimeDistribution.physics.pct}%, 
                  #34d399 ${subjectTimeDistribution.physics.pct}% ${subjectTimeDistribution.physics.pct + subjectTimeDistribution.chemistry.pct}%, 
                  #818cf8 ${subjectTimeDistribution.physics.pct + subjectTimeDistribution.chemistry.pct}% 100%
                )`
              }}
            >
              {/* Inner cutout for frosted donut core */}
              <div className="w-24 h-24 bg-zinc-950/90 backdrop-blur-md rounded-full flex items-center justify-center flex-col shadow-inner border border-white/15">
                <span className="text-[9px] text-zinc-400 font-mono font-bold">TOTAL</span>
                <span className="text-base text-white font-bold font-display">{studyHours}h</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono w-full">
              <div className="p-2 rounded-xl bg-sky-950/40 border border-sky-500/30">
                <div className="text-sky-400 font-bold text-sm">{subjectTimeDistribution.physics.pct}%</div>
                <div className="text-zinc-300 text-[10px] uppercase font-bold">PHY</div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <div className="text-emerald-400 font-bold text-sm">{subjectTimeDistribution.chemistry.pct}%</div>
                <div className="text-zinc-300 text-[10px] uppercase font-bold">CHEM</div>
              </div>
              <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                <div className="text-indigo-400 font-bold text-sm">{subjectTimeDistribution.maths.pct}%</div>
                <div className="text-zinc-300 text-[10px] uppercase font-bold">MATH</div>
              </div>
            </div>
          </div>
        </div>

        {/* C. 7-Day Velocity Chart with Fluid Sliding Spring Glider */}
        <div className="bg-zinc-900/70 border border-white/15 rounded-3xl p-5 space-y-3.5 text-left flex flex-col shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                7-Day Velocity
              </h3>
            </div>
            
            {/* Sliding Spring Glider Tabs */}
            <div className="flex gap-0.5 bg-black/40 border border-white/10 p-0.5 rounded-xl text-[10px] font-mono relative select-none">
              {(['time', 'accuracy', 'missions'] as const).map(mode => {
                const isActive = velocityView === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setVelocityView(mode)}
                    className={`relative px-2 py-1 rounded-lg uppercase font-bold transition-colors cursor-pointer select-none z-10 ${
                      isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="velocityTabGlider"
                        className={`absolute inset-0 rounded-lg shadow-sm -z-10 ${
                          mode === 'time' ? 'bg-indigo-600' :
                          mode === 'accuracy' ? 'bg-emerald-600' :
                          'bg-amber-600'
                        }`}
                        transition={springs.fluid}
                      />
                    )}
                    <span>{mode === 'time' ? 'Time' : mode === 'accuracy' ? 'Acc' : 'Tasks'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 h-36 pt-4 flex-1">
            {sevenDayVelocity.map((day, idx) => {
              const val = velocityView === 'time' ? day.minutes : velocityView === 'accuracy' ? day.accuracy : day.missions;
              const max = maxVelocity[velocityView];
              const pct = max > 0 ? (val / max) * 100 : 0;
              const color = velocityView === 'time' ? 'bg-indigo-500 shadow-indigo-500/30' : velocityView === 'accuracy' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-amber-500 shadow-amber-500/30';
              const isSelected = activeVelocityBar === idx;

              return (
                <div
                  key={idx}
                  onClick={() => setActiveVelocityBar(prev => prev === idx ? null : idx)}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative cursor-pointer"
                >
                  <div className={`absolute -top-7 bg-zinc-900 border border-white/20 text-white text-[10px] font-mono px-2 py-0.5 rounded-md pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-lg ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    {val} {velocityView === 'time' ? 'm' : velocityView === 'accuracy' ? '%' : 'done'}
                  </div>
                  
                  <div className="w-full bg-black/40 rounded-full h-full flex items-end p-0.5 overflow-hidden border border-white/10">
                    <motion.div 
                      layout
                      className={`w-full ${color} rounded-full transition-all duration-300 shadow-md ${isSelected ? 'ring-2 ring-white/80' : 'hover:brightness-125'}`}
                      style={{ height: `${Math.max(6, pct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-300 font-bold">{day.label.replace('D-', '')}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 5. CHAPTER RISK & BOTTLENECK HEATMAP WITH SLIDING GLIDER */}
      <div className="bg-zinc-900/70 border border-white/15 rounded-3xl p-5 md:p-6 space-y-4 text-left shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
              Top 5 Vulnerability & Bottleneck Chapters
            </h3>
          </div>

          {/* Subject Filter Glider */}
          <div className="flex gap-0.5 bg-black/40 border border-white/10 p-0.5 rounded-xl font-mono text-[10px] relative select-none">
            {(['all', 'physics', 'chemistry', 'maths'] as const).map(sub => {
              const isActive = activeSubject === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setActiveSubject(sub)}
                  className={`relative px-3 py-1 rounded-lg uppercase font-bold transition-colors cursor-pointer select-none z-10 ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="analyticsRiskSubjectGlider"
                      className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                      transition={springs.fluid}
                    />
                  )}
                  <span>{sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {highestRiskChapters.map((t, idx) => (
            <motion.div
              key={t.chapterId}
              whileTap={{ scale: 0.99 }}
              onClick={() => actions.openChapterEditModal(t.chapterId)}
              className="p-3.5 rounded-2xl bg-zinc-950/50 border border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.03] transition-all flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs font-bold text-rose-400 w-5">#{idx + 1}</span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white group-hover:text-indigo-300 truncate block">
                    {t.chapterName}
                  </span>
                  <div className="text-[10px] font-mono text-zinc-400 uppercase flex items-center gap-2 mt-0.5">
                    <span>{t.subject}</span>
                    <span>•</span>
                    <span>{t.strategyRadar?.jeeWeightageRank || 'Tier 2'}</span>
                    <span>•</span>
                    <span>{t.syllabusStage}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                {t.isBottleneck && (
                  <span className="text-[10px] font-mono font-bold bg-rose-950/70 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded-md hidden sm:inline-flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    Bottleneck
                  </span>
                )}
                <span className="font-bold text-amber-300 bg-amber-950/50 border border-amber-800/40 px-2.5 py-0.5 rounded-lg">
                  {t.masteryScore}% Mastery
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 6. ADVANCED RETENTION DECAY & SPACED REPETITION SIMULATOR (LIGHTER FROSTED GLASS HUD) */}
      <div className="bg-zinc-900/70 border border-white/15 rounded-3xl p-5 md:p-6 space-y-4 text-left shadow-2xl relative overflow-hidden">
        
        {/* Header & Status Chips */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                Retention Decay & Spaced Repetition Simulator
              </h3>
            </div>
            <p className="text-[11px] text-zinc-300 mt-0.5">
              SuperMemo-2 (SM-2) memory half-life modeling vs. natural Ebbinghaus forgetting curve.
            </p>
          </div>

          {/* Vitals Ribbon & Guide Toggle */}
          <div className="flex items-center gap-2 font-mono text-[10px] flex-wrap">
            <div className="px-2.5 py-1 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Active Memory: <strong>{accuracyPct}%</strong></span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-indigo-950/50 border border-indigo-500/40 text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>SM-2 Half-Life: <strong>14 Days</strong></span>
            </div>
            <button
              onClick={() => setShowCurveGuide(prev => !prev)}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3 h-3 text-indigo-400" />
              <span>{showCurveGuide ? 'Hide Guide' : 'How to Read'}</span>
            </button>
          </div>
        </div>

        {/* PROMINENT VISUAL LEGEND BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-white/10 font-mono text-[11px]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-0.5 bg-gradient-to-r from-emerald-400 via-sky-400 to-rose-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-zinc-200 font-bold">Natural Forgetting Curve</span>
            <span className="text-zinc-400 text-[10px] hidden xl:inline">(Decays without review)</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            <span className="text-zinc-200 font-bold">Spaced Repetition (SM-2)</span>
            <span className="text-zinc-400 text-[10px] hidden xl:inline">(Day 3 & 7 review spikes)</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-white" />
            <span className="text-zinc-200 font-bold">Your Chapter Nodes</span>
            <span className="text-zinc-400 text-[10px]">(Hover to inspect)</span>
          </div>
        </div>

        {/* COLLAPSIBLE INTELLIGENCE EXPLAINER GUIDE */}
        <AnimatePresence>
          {showCurveGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={springs.fluid}
              className="overflow-hidden"
            >
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-zinc-300 font-sans space-y-1.5">
                <div className="flex items-center gap-2 font-mono font-bold text-indigo-300 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span>How Memory Retention Works for JEE</span>
                </div>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  • <strong>Solid Line (Without Revision):</strong> Newly learned concepts naturally drop from 100% to under 30% retention within 30 days if left untouched.
                </p>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  • <strong>Dashed Line (With Spaced Drills):</strong> Quick 15-min reviews at <strong>Day 3</strong> and <strong>Day 7</strong> instantly reset memory back to 100% while permanently flattening the rate of forgetting.
                </p>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  • <strong>Chapter Dots:</strong> Plotted along the graph at their exact days since last revision. If a chapter dot falls into the amber or rose zone, review its formulas to bounce it back up.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic High-Fidelity SVG Curve Stage */}
        <div className="relative w-full h-64 bg-zinc-950/80 rounded-2xl border border-white/10 p-4 flex flex-col justify-between shadow-inner">
          
          {/* Background Threshold Bands */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
            {/* Optimal Zone (>75%) */}
            <div className="h-[25%] bg-emerald-500/[0.04] border-b border-emerald-500/15 flex items-center justify-end px-3">
              <span className="text-[9px] font-mono font-bold text-emerald-400/60 uppercase tracking-wider">Optimal Retention Zone (&gt;75%)</span>
            </div>
            {/* Review Zone (40-75%) */}
            <div className="h-[35%] bg-amber-500/[0.03] border-b border-amber-500/15 flex items-center justify-end px-3">
              <span className="text-[9px] font-mono font-bold text-amber-400/60 uppercase tracking-wider">Reinforcement Threshold (40-75%)</span>
            </div>
            {/* Critical Decay Zone (<40%) */}
            <div className="h-[40%] bg-rose-500/[0.03] flex items-center justify-end px-3">
              <span className="text-[9px] font-mono font-bold text-rose-400/60 uppercase tracking-wider">Synaptic Amnesia Zone (&lt;40%)</span>
            </div>
          </div>

          {/* SVG Multi-Layer Laser Curves */}
          <div className="relative w-full h-full">
            <svg 
              role="img" 
              aria-label="Retention decay curve showing SM-2 spaced repetition vs forgetting curve"
              className="w-full h-full overflow-visible" 
              preserveAspectRatio="none" 
              viewBox="0 0 1000 200"
            >
              <defs>
                <linearGradient id="laserDecay" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>

                <linearGradient id="laserArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="spacedLaser" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>

                <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="50" x2="1000" y2="50" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="120" x2="1000" y2="120" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
              
              {/* Curve 1: Spaced Repetition Reinforcement Path (SM-2 Wave with Spikes at Day 3 & Day 7) */}
              <path 
                d="M 0,20 Q 80,65 140,80 L 140,20 Q 240,45 320,55 L 320,15 Q 650,30 1000,40"
                fill="none" 
                stroke="url(#spacedLaser)" 
                strokeWidth="2.5" 
                strokeDasharray="6 6"
                opacity="0.9"
              />

              {/* Curve 2: Unspaced Ebbinghaus Decay Area & Neon Line */}
              <path 
                d="M 0,20 Q 250,110 500,140 T 1000,175 L 1000,200 L 0,200 Z"
                fill="url(#laserArea)" 
              />
              <path 
                d="M 0,20 Q 250,110 500,140 T 1000,175"
                fill="none" 
                stroke="url(#laserDecay)" 
                strokeWidth="3" 
                filter="url(#laserGlow)"
              />

              {/* Real Chapter Telemetry Data Points (Clean Static Glow Rings) */}
              {chapters
                .filter(c => (c.lastRevisionDaysAgo ?? 0) >= 0)
                .map(c => {
                  const days = c.lastRevisionDaysAgo ?? 0;
                  const x = Math.min(970, Math.max(30, (days / 30) * 940 + 30));
                  const conf = c.confidence || (100 - Math.min(80, days * 3));
                  const y = Math.min(185, Math.max(15, 200 - (conf / 100) * 185));

                  const isDecaying = days > 14 || conf < 50;
                  const isHovered = hoveredDecayChapter?.id === c.id;

                  return (
                    <g 
                      key={c.id}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredDecayChapter({
                          id: c.id,
                          name: c.name,
                          subject: c.subject,
                          confidence: conf,
                          daysAgo: days,
                          x: rect.left,
                          y: rect.top
                        });
                      }}
                      onMouseLeave={() => setHoveredDecayChapter(null)}
                      onClick={() => actions.openChapterEditModal(c.id)}
                      className="cursor-pointer"
                    >
                      {/* Subtle static halo for decaying/hovered nodes */}
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={isHovered ? 10 : 6} 
                        fill={isDecaying ? '#f43f5e' : '#38bdf8'} 
                        opacity={isHovered ? 0.45 : 0.25}
                      />
                      {/* Main Node */}
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={isHovered ? 6 : 4.5} 
                        fill={isDecaying ? '#f43f5e' : '#38bdf8'} 
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2 : 1.5}
                        className="transition-all duration-200 shadow-md"
                      />
                    </g>
                  );
                })}
            </svg>

            {/* Hover Tooltip Card */}
            <AnimatePresence>
              {hoveredDecayChapter && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={springs.snappy}
                  className="absolute top-2 left-1/2 -translate-x-1/2 bg-zinc-900/95 bg-zinc-950/98 border border-zinc-800 p-3 rounded-2xl shadow-2xl font-mono text-xs pointer-events-none z-30 space-y-1 min-w-[240px]"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                    <span className="font-bold text-white font-sans text-xs truncate">
                      {hoveredDecayChapter.name}
                    </span>
                    <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                      {hoveredDecayChapter.subject}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Retention Score:</span>
                    <span className={`font-bold ${hoveredDecayChapter.confidence >= 70 ? 'text-emerald-400' : hoveredDecayChapter.confidence >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {hoveredDecayChapter.confidence}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Last Revised:</span>
                    <span className="font-bold text-zinc-200">
                      {hoveredDecayChapter.daysAgo === 0 ? 'Today' : `${hoveredDecayChapter.daysAgo} days ago`}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Time Axis Labels */}
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-300 pt-2 border-t border-white/10">
            <span className="font-bold text-emerald-400">Day 0 (Initial Learn)</span>
            <span>Day 3 (1st Recall)</span>
            <span>Day 7 (2nd Recall)</span>
            <span>Day 14 (SM-2 Peak)</span>
            <span className="font-bold text-zinc-400">Day 30 (Mastery)</span>
          </div>
        </div>

        {/* Micro-Ribbon: High-Priority Revision Queue */}
        {decayingChapters.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Recommended Memory Restoration Drills</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
              {decayingChapters.map(chap => (
                <div 
                  key={chap.id}
                  onClick={() => actions.openChapterEditModal(chap.id)}
                  className="p-3 rounded-2xl bg-zinc-950/60 border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-2 cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">{chap.subject}</span>
                      <span className="text-[9px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-800/40">
                        {chap.lastRevisionDaysAgo}d overdue
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white font-sans truncate block group-hover:text-indigo-300">
                      {chap.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/10">
                    <span className="text-zinc-400">Retention: {chap.confidence}%</span>
                    <span className="text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Review <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* 6. PERCENTILE TO SHIFT MARKS NORMALIZATION CALIBRATOR */}
      <PercentileShiftCalibrator />

      {/* 7. TIME-PER-MARK EFFICIENCY MATRIX & SECTION PACING */}
      <TimePerMarkMatrix studySessions={studySessions} />

      {/* 8. NEGATIVE MARKS LEAKAGE & GUESSING PENALTY AUDIT */}
      <NegativeMarksAudit />

      {/* 9. SPATIAL REPETITION MEMORY DECAY & FORGETTING CURVE */}
      <ForgettingCurveHeatmap chapters={chapters} />

      {/* 10. QUANTITATIVE ACTIVITY TYPE & FOCUS QUALITY TELEMETRY */}
      <StudyActivityTelemetry studySessions={studySessions} />

      {/* 11. QUANTITATIVE SOLVING VELOCITY & PACING TRACKER */}
      <SolvingVelocityTracker studySessions={studySessions} />

      {/* 12. SYLLABUS COMPLETION DATE PROJECTOR & "WHAT-IF" SCENARIO MODELER */}
      <SyllabusCompletionProjector chapters={chapters} studySessions={studySessions} />

    </div>
  );
}
