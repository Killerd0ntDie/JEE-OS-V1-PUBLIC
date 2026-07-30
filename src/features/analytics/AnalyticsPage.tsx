import { useState, useMemo } from 'react';
import { useStudyBrain } from '../../context/StudyBrainContext';
import { Icon } from '../../components/ui/Icon';
import { Badge } from '../../components/ui/Badge';
import { calculateLevelFromXP, getTitleAndColor } from '../../utils/levelingCalculations';
import { ChapterTelemetry } from '../../engines/chapterInfo';

export function AnalyticsPage() {
  const { state, actions } = useStudyBrain();
  const [activeSubject, setActiveSubject] = useState<'all' | 'physics' | 'chemistry' | 'maths'>('all');
  const [velocityView, setVelocityView] = useState<'time' | 'accuracy' | 'missions'>('time');

  // Compute live analytics metrics from StudyBrainState
  const analyticsSummary = state.analyticsSummary;
  const chapterTelemetryList = (Object.values(state.chapterTelemetryMap || {}) as ChapterTelemetry[]);
  const studySessions = state.studySessions || [];

  // Filter chapters by active subject
  const filteredTelemetry = useMemo(() => {
    if (activeSubject === 'all') return chapterTelemetryList;
    return chapterTelemetryList.filter(t => t.subject === activeSubject);
  }, [chapterTelemetryList, activeSubject]);

  // Top 5 Highest Risk / Vulnerability Chapters
  const highestRiskChapters = useMemo(() => {
    return [...filteredTelemetry]
      .sort((a, b) => (b.isBottleneck ? 50 : 0) + (100 - a.masteryScore) - ((100 - b.masteryScore)))
      .slice(0, 5);
  }, [filteredTelemetry]);

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
  const totalXP = state.xp?.total || 0;
  const { level, progressPercent } = calculateLevelFromXP(totalXP);
  const { title } = getTitleAndColor(level);

  // Overall Accuracy & Questions
  const totalQuestions = state.analytics.questionsSolved || 0;
  const studyHours = (state.analytics.studyTime / 60).toFixed(1);

  // True Accuracy Computation
  const trueAccuracy = useMemo(() => {
    const sessionsWithAccuracy = studySessions.filter(s => s.accuracy !== undefined);
    if (sessionsWithAccuracy.length === 0) return state.analytics.accuracy || 85;
    const sum = sessionsWithAccuracy.reduce((acc, s) => acc + (s.accuracy || 0), 0);
    return Math.round(sum / sessionsWithAccuracy.length);
  }, [studySessions, state.analytics.accuracy]);
  const accuracyPct = trueAccuracy;

  // Time Distribution by Subject
  const subjectTimeDistribution = useMemo(() => {
    let physics = 0, chemistry = 0, maths = 0;
    studySessions.forEach(s => {
      if (s.subjectId === 'physics') physics += s.duration;
      if (s.subjectId === 'chemistry') chemistry += s.duration;
      if (s.subjectId === 'maths') maths += s.duration;
    });
    const total = physics + chemistry + maths || 1; // avoid div by 0
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

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const startOfDay = d.getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

      const sessionsForDay = studySessions.filter(s => {
        const sTime = new Date(s.startTime).getTime();
        return sTime >= startOfDay && sTime < endOfDay;
      });

      const minutes = sessionsForDay.reduce((acc, s) => acc + s.duration, 0);
      const accSessions = sessionsForDay.filter(s => s.accuracy !== undefined);
      const accuracy = accSessions.length > 0 
        ? Math.round(accSessions.reduce((acc, s) => acc + (s.accuracy || 0), 0) / accSessions.length)
        : 0;

      days.push({
        label: i === 0 ? 'Today' : `D-${i}`,
        minutes,
        accuracy,
        missions: sessionsForDay.length
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
    <div className="space-y-8 max-w-6xl mx-auto text-left relative pb-12 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest">
            <Icon name="Activity" className="w-3.5 h-3.5" />
            <span>Telemetry & Performance Intelligence</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
            Preparation Analytics & Velocity
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Real-time telemetry aggregated from <strong className="text-zinc-200">AnalyticsEngine</strong>. Track study velocity, accuracy trends, and high-risk chapter bottlenecks.
          </p>
        </div>

        {/* Level Badge */}
        <div className="bg-indigo-950/30 border border-indigo-900/50 p-3 rounded-2xl shrink-0 font-mono text-left space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-indigo-300">Level {level} • {title}</span>
            <span className="text-zinc-400 text-[10px]">{Math.round(progressPercent)}% to Lv.{level + 1}</span>
          </div>
          <div className="h-1.5 w-44 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-xl space-y-1 shadow-lg">
          <span className="text-[10px] text-emerald-300 uppercase font-semibold block tracking-wider">Overall Problem Accuracy</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-display">{accuracyPct}%</span>
            <span className="text-[10px] text-zinc-400">({totalQuestions} solved)</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-xl space-y-1 shadow-lg">
          <span className="text-[10px] text-indigo-300 uppercase font-semibold block tracking-wider">Cumulative Study Time</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gradient-indigo font-display">{studyHours}h</span>
            <span className="text-[10px] text-zinc-400">Logged</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-amber-950/20 backdrop-blur-xl space-y-1 shadow-lg">
          <span className="text-[10px] text-amber-300 uppercase font-semibold block tracking-wider">Active Daily Streak</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-display">{state.xp?.streak || 0} Days</span>
            <span className="text-[10px] text-zinc-400">⚡ Streak</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl space-y-1 shadow-lg">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block tracking-wider">Total Preparation XP</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-display">{totalXP}</span>
            <span className="text-[10px] text-indigo-400 font-bold">XP</span>
          </div>
        </div>
      </div>

      {/* 3-Column Grid: Mastery, Time Dist, 7-Day Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Subject Mastery Distribution */}
        <div className="bg-zinc-950/60 border border-zinc-850/80 rounded-2xl p-5 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <Icon name="Target" className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                Subject Mastery Distribution
              </h3>
            </div>
          </div>

          <div className="space-y-4 font-mono text-xs pt-1">
            {/* Physics */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-sky-400 font-bold">Physics</span>
                <span className="text-zinc-300 font-bold">{subjectMastery.physics}% Mastery</span>
              </div>
              <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${subjectMastery.physics}%` }} />
              </div>
            </div>

            {/* Chemistry */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-emerald-400 font-bold">Chemistry</span>
                <span className="text-zinc-300 font-bold">{subjectMastery.chemistry}% Mastery</span>
              </div>
              <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${subjectMastery.chemistry}%` }} />
              </div>
            </div>

            {/* Mathematics */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-indigo-400 font-bold">Mathematics</span>
                <span className="text-zinc-300 font-bold">{subjectMastery.maths}% Mastery</span>
              </div>
              <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${subjectMastery.maths}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Subject Time Allocation */}
        <div className="bg-zinc-950/60 border border-zinc-850/80 rounded-2xl p-5 space-y-4 text-left flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <Icon name="PieChart" className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                Time Distribution
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Total Logged</span>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="flex h-4 w-full rounded-full overflow-hidden bg-zinc-900 border border-zinc-850">
              <div className="bg-sky-500 h-full transition-all duration-500" style={{ width: `${subjectTimeDistribution.physics.pct}%` }} title={`Physics: ${subjectTimeDistribution.physics.mins}m`} />
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${subjectTimeDistribution.chemistry.pct}%` }} title={`Chemistry: ${subjectTimeDistribution.chemistry.mins}m`} />
              <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${subjectTimeDistribution.maths.pct}%` }} title={`Maths: ${subjectTimeDistribution.maths.mins}m`} />
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div>
                <div className="text-sky-400 font-bold">{subjectTimeDistribution.physics.pct}%</div>
                <div className="text-zinc-500 text-[9px]">PHY</div>
              </div>
              <div>
                <div className="text-emerald-400 font-bold">{subjectTimeDistribution.chemistry.pct}%</div>
                <div className="text-zinc-500 text-[9px]">CHEM</div>
              </div>
              <div>
                <div className="text-indigo-400 font-bold">{subjectTimeDistribution.maths.pct}%</div>
                <div className="text-zinc-500 text-[9px]">MATH</div>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Velocity Graph */}
        <div className="bg-zinc-950/60 border border-zinc-850/80 rounded-2xl p-5 space-y-4 text-left flex flex-col">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-zinc-900 pb-3 gap-3">
            <div className="flex items-center gap-2">
              <Icon name="TrendingUp" className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                7-Day Velocity
              </h3>
            </div>
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-[9px] font-mono">
              <button onClick={() => setVelocityView('time')} className={`px-2 py-1 rounded-lg uppercase font-bold transition-all ${velocityView === 'time' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Time</button>
              <button onClick={() => setVelocityView('accuracy')} className={`px-2 py-1 rounded-lg uppercase font-bold transition-all ${velocityView === 'accuracy' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Acc</button>
              <button onClick={() => setVelocityView('missions')} className={`px-2 py-1 rounded-lg uppercase font-bold transition-all ${velocityView === 'missions' ? 'bg-amber-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Task</button>
            </div>
          </div>

          <div className="flex items-end justify-between gap-1.5 h-28 pt-2 flex-1">
            {sevenDayVelocity.map((day, idx) => {
              const val = velocityView === 'time' ? day.minutes : velocityView === 'accuracy' ? day.accuracy : day.missions;
              const max = maxVelocity[velocityView];
              const pct = max > 0 ? (val / max) * 100 : 0;
              const color = velocityView === 'time' ? 'bg-indigo-500' : velocityView === 'accuracy' ? 'bg-emerald-500' : 'bg-amber-500';
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative cursor-crosshair">
                  <div className="absolute -top-6 bg-zinc-800 text-white text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
                    {val} {velocityView === 'time' ? 'mins' : velocityView === 'accuracy' ? '%' : 'done'}
                  </div>
                  <div 
                    className={`w-full ${color} opacity-80 hover:opacity-100 rounded-t-lg transition-all`}
                    style={{ height: `${pct}%`, minHeight: val > 0 ? '4px' : '0' }}
                  />
                  <span className="text-[9px] font-mono text-zinc-500">{day.label.replace('D-', '')}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* CHAPTER RISK & BOTTLENECK HEATMAP */}
      <div className="bg-zinc-950/60 border border-zinc-850/80 rounded-2xl p-5 space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <Icon name="AlertTriangle" className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
              Top 5 Highest Vulnerability / Risk Chapters
            </h3>
          </div>

          {/* Subject Filter Pills */}
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl font-mono text-[10px]">
            {(['all', 'physics', 'chemistry', 'maths'] as const).map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubject(sub)}
                className={`px-3 py-1 rounded-lg uppercase font-bold transition-all cursor-pointer ${
                  activeSubject === sub ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {highestRiskChapters.map((t, idx) => (
            <div
              key={t.chapterId}
              onClick={() => actions.openChapterEditModal(t.chapterId)}
              className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-850 hover:border-zinc-700 transition-all flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs font-bold text-red-400 w-5">#{idx + 1}</span>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white group-hover:text-indigo-300 truncate block">
                    {t.chapterName}
                  </span>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-2 mt-1">
                    {t.subject} • {t.strategyRadar?.jeeWeightageRank || 'Tier 2'} • {t.syllabusStage}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                {t.isBottleneck && (
                  <Badge variant="secondary" className="text-[9px] bg-red-950/40 text-red-400 border-red-900/60 hidden sm:inline-flex">
                    Bottleneck
                  </Badge>
                )}
                <span className="font-bold text-amber-400">{t.masteryScore}% Mastery</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
