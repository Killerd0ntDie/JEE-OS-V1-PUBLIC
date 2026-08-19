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
  Sparkles, RefreshCw, Calendar, Info, HelpCircle, Brain
} from 'lucide-react';
import { SyllabusCompletionProjector } from './components/SyllabusCompletionProjector';
import { SolvingVelocityTracker } from './components/SolvingVelocityTracker';
import { StudyActivityTelemetry } from './components/StudyActivityTelemetry';
import { NegativeMarksAudit } from './components/NegativeMarksAudit';
import { TimePerMarkMatrix } from './components/TimePerMarkMatrix';
import { PercentileShiftCalibrator } from './components/PercentileShiftCalibrator';
import { EbbinghausDecayCurve } from '@/features/revision/components/EbbinghausDecayCurve';
import { RevisionCalendarHeatmap } from '@/features/revision/components/RevisionCalendarHeatmap';
import { ChapterRoiWeightageMatrix } from '@/features/subjects/components/ChapterRoiWeightageMatrix';

type AnalyticsTab = 'velocity' | 'strategy' | 'retention' | 'macro';

const TABS = [
  { id: 'velocity' as const, label: 'Velocity & Habits', icon: Zap },
  { id: 'strategy' as const, label: 'Exam Strategy', icon: Target },
  { id: 'retention' as const, label: 'Memory & Decay', icon: Brain },
  { id: 'macro' as const, label: 'Macro & ROI', icon: TrendingUp },
];

export function AnalyticsPage() {
  const actions = useStudyBrainStore(state => state.actions);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);
  const studySessions = useStudyBrainStore(state => state.studySessions) || [];
  const xp = useStudyBrainStore(state => state.xp);
  const analytics = useStudyBrainStore(state => state.analytics);
  const chapters = useStudyBrainStore(state => state.chapters);
  const settings = useStudyBrainStore(state => state.settings);
  const revisionTelemetry = useStudyBrainStore(state => state.revisionTelemetry);

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('velocity');
  const [activeSubject, setActiveSubject] = useState<'all' | 'physics' | 'chemistry' | 'maths'>('all');
  const [velocityView, setVelocityView] = useState<'time' | 'accuracy' | 'missions'>('time');
  const [activeVelocityBar, setActiveVelocityBar] = useState<number | null>(null);

  const overdueChapters = revisionTelemetry?.overdueChapters || [];
  const upcomingChapters = revisionTelemetry?.upcomingChapters || [];
  const masteredChapters = revisionTelemetry?.masteredChapters || [];
  const stats = revisionTelemetry?.stats || {
    totalOverdue: 0,
    totalUpcoming: 0,
    totalMastered: 0,
    totalNotStarted: 0,
    avgRetentionScore: 75,
    reviewedTodayCount: 0
  };

  const chapterTelemetryList = (Object.values(chapterTelemetryMap || {}) as ChapterTelemetry[]);

  const filteredTelemetry = useMemo(() => {
    if (activeSubject === 'all') return chapterTelemetryList;
    return chapterTelemetryList.filter(t => t.subject === activeSubject);
  }, [chapterTelemetryList, activeSubject]);

  const highestRiskChapters = useMemo(() => {
    return [...filteredTelemetry]
      .sort((a, b) => {
        const riskA = (a.isBottleneck ? 50 : 0) + (100 - a.masteryScore);
        const riskB = (b.isBottleneck ? 50 : 0) + (100 - b.masteryScore);
        return riskB - riskA;
      })
      .slice(0, 5);
  }, [filteredTelemetry]);

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

  const totalXP = xp?.total || 0;
  const { level, progressPercent } = calculateLevelFromXP(totalXP);
  const { title } = getTitleAndColor(level);

  const totalQuestions = analytics.questionsSolved || 0;
  const studyHours = (analytics.studyTime / 60).toFixed(1);

  const trueAccuracy = useMemo(() => {
    const sessionsWithAccuracy = studySessions.filter(s => s.accuracy !== undefined);
    if (sessionsWithAccuracy.length === 0) return analytics.accuracy || 85;
    const sum = sessionsWithAccuracy.reduce((acc, s) => acc + (s.accuracy || 0), 0);
    return Math.round(sum / sessionsWithAccuracy.length);
  }, [studySessions, analytics.accuracy]);
  
  const accuracyPct = analytics.questionsSolved > 0 
    ? Math.round((analytics.correctAnswers / analytics.questionsSolved) * 100)
    : trueAccuracy;

  const subjectTimeDistribution = useMemo(() => {
    const dist = { physics: 0, chemistry: 0, maths: 0 };
    studySessions.forEach(s => {
      const sub = (s.subjectId || 'physics').toLowerCase();
      if (sub.includes('phys')) dist.physics += s.duration || 0;
      else if (sub.includes('chem')) dist.chemistry += s.duration || 0;
      else if (sub.includes('math')) dist.maths += s.duration || 0;
    });

    const total = dist.physics + dist.chemistry + dist.maths || 1;
    return {
      physics: { minutes: dist.physics, pct: Math.round((dist.physics / total) * 100) },
      chemistry: { minutes: dist.chemistry, pct: Math.round((dist.chemistry / total) * 100) },
      maths: { minutes: dist.maths, pct: Math.round((dist.maths / total) * 100) }
    };
  }, [studySessions]);

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

      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900/90 border border-white/15 backdrop-blur-xl shadow-xl overflow-x-auto no-scrollbar font-mono text-xs select-none">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 rounded-xl font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0 select-none ${
                isActive ? 'text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="analyticsMainTabGlider"
                  className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30 -z-10"
                  transition={springs.fluid}
                />
              )}
              <IconComp className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        
        {activeTab === 'velocity' && (
          <motion.div
            key="tab-velocity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

                    {[25, 50, 75, 100].map(r => (
                      <polygon
                        key={r}
                        points={`0,${-r} ${r * 0.866},${r * 0.5} ${-r * 0.866},${r * 0.5}`}
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                      />
                    ))}

                    <line x1="0" y1="0" x2="0" y2="-100" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="0" x2="86.6" y2="50" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="0" x2="-86.6" y2="50" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
                    
                    <text x="0" y="-112" fill="#38bdf8" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">PHY ({subjectMastery.physics}%)</text>
                    <text x="105" y="68" fill="#34d399" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">CHEM ({subjectMastery.chemistry}%)</text>
                    <text x="-105" y="68" fill="#818cf8" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">MATH ({subjectMastery.maths}%)</text>

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
                          <circle cx={0} cy={-p} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                          <circle cx={c * 0.866} cy={c * 0.5} r="4" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
                          <circle cx={-m * 0.866} cy={m * 0.5} r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="1.5" />
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

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

              <div className="bg-zinc-900/70 border border-white/15 rounded-3xl p-5 space-y-3.5 text-left flex flex-col shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                      7-Day Velocity
                    </h3>
                  </div>
                  
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

            <StudyActivityTelemetry studySessions={studySessions} />
            <SolvingVelocityTracker studySessions={studySessions} />

            <div className="bg-zinc-900/70 border border-white/15 rounded-3xl p-5 md:p-6 space-y-4 text-left shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                    Top 5 Vulnerability & Bottleneck Chapters
                  </h3>
                </div>

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
          </motion.div>
        )}

        {activeTab === 'strategy' && (
          <motion.div
            key="tab-strategy"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            <NegativeMarksAudit />
            <TimePerMarkMatrix studySessions={studySessions} />
            <PercentileShiftCalibrator />
          </motion.div>
        )}

        {activeTab === 'retention' && (
          <motion.div
            key="tab-retention"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            <EbbinghausDecayCurve 
              avgRetentionScore={stats.avgRetentionScore}
              overdueCount={stats.totalOverdue}
              overdueChapters={overdueChapters}
              upcomingChapters={upcomingChapters}
              masteredChapters={masteredChapters}
              onInspectChapter={(id) => actions.openChapterEditModal(id)}
              onLaunchArena={() => {}}
            />
            <RevisionCalendarHeatmap sessions={studySessions} />
          </motion.div>
        )}

        {activeTab === 'macro' && (
          <motion.div
            key="tab-macro"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            <ChapterRoiWeightageMatrix onSelectChapter={(id) => actions.openChapterEditModal(id)} />
            <SyllabusCompletionProjector chapters={chapters} studySessions={studySessions} />
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
